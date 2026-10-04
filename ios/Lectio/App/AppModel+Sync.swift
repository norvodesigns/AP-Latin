import Foundation
import LectioCore

/// Accounts and cross-device sync — the app's `useCloudSync` (src/hooks/useCloudSync.ts).
///
/// Local progress is the source of truth at every instant; nothing waits on
/// the network. On top of it:
///   - on sign-in, a one-time reconcile (`CloudSync.reconcile`) decides
///     whether local data is merged into the account, or replaced because it
///     belongs to someone else who used this device;
///   - every local edit schedules a debounced push;
///   - coming to the foreground, and every 90 seconds while open, a pull
///     folds in whatever another device (the website included) pushed.
extension AppModel {
    static let pushDebounce: Duration = .milliseconds(2500)
    static let pullInterval: Duration = .seconds(90)

    var isSignedIn: Bool { account != nil }

    /* -------------------------------------------------------------- */
    /* Sign in / up / out                                               */
    /* -------------------------------------------------------------- */

    /// Restores a saved session at launch.
    func restoreSession() async {
        guard let session = await auth.session else { return }
        account = Account(userId: session.userId, email: session.email, profile: nil)
        await loadProfile(backfillFrom: session)
        await reconcile()
        startPullLoop()
    }

    func signIn(email: String, password: String) async throws {
        let session: AuthSession
        do {
            session = try await auth.signIn(email: email, password: password)
        } catch let error as SupabaseError where error.status == 400 || error.status == 401 {
            // Deliberately vague, as on the web: which half was wrong is
            // information about which emails have accounts.
            throw SupabaseError(status: error.status, code: error.code, message: "That email and password do not match an account.")
        }
        account = Account(userId: session.userId, email: session.email, profile: nil)
        await loadProfile(backfillFrom: session)
        await reconcile()
        startPullLoop()
    }

    enum SignUpOutcome { case signedIn, checkEmail }

    func signUp(email: String, password: String, displayName: String, role: String) async throws -> SignUpOutcome {
        let result = try await auth.signUp(email: email, password: password, displayName: displayName, role: role,
                                           redirectTo: AppConfig.authCallbackURL)
        guard case .signedIn(let session) = result else { return .checkEmail }
        account = Account(userId: session.userId, email: session.email, profile: nil)
        await loadProfile(backfillFrom: session)
        await reconcile()
        startPullLoop()
        return .signedIn
    }

    /// The sign-up confirmation link, opened on this device: it carries a
    /// session, so the student is signed in without typing the password
    /// again. Otherwise, says why not and where to sign in.
    func completeEmailLink(_ callback: AuthCallback) async {
        if account != nil {
            authNotice = "Your email is confirmed."
            return
        }
        switch callback {
        case .session(let refreshToken):
            do {
                let session = try await auth.signIn(refreshToken: refreshToken)
                account = Account(userId: session.userId, email: session.email, profile: nil)
                await loadProfile(backfillFrom: session)
                await reconcile()
                startPullLoop()
                authNotice = "Your email is confirmed and you’re signed in. Your progress now syncs with the website."
            } catch {
                authNotice = "Your email is confirmed. Sign in with your email and password in Settings › Account."
            }
        case .failed(let reason):
            authNotice = "\(reason). If you’ve already confirmed your email, sign in with your password in Settings › Account."
        }
    }

    /// Signs out. This device's progress stays, as on the web — and stays
    /// marked as the previous account's, so a *different* account signing in
    /// next replaces it rather than merging someone else's history in.
    func signOut() async {
        pushNowIfPending()
        stopPullLoop()
        await auth.signOut()
        account = nil
        syncStatus = .idle
    }

    /// Permanently deletes the account on the server (the `delete_own_account`
    /// function cascades through every table), then signs out here.
    func deleteAccount() async throws {
        let token = try await auth.accessToken()
        try await auth.api.rpc("delete_own_account", JSONObject(), accessToken: token)
        stopPullLoop()
        pushTask?.cancel()
        await auth.forget()
        account = nil
        syncStatus = .idle
        // The cloud copy is gone; this device's copy is no longer tied to it.
        bookkeeping = SyncBookkeeping()
    }

    /// Reads the profile, creating it from signup metadata if the row is
    /// missing — the same backfill the web's sign-in does.
    private func loadProfile(backfillFrom session: AuthSession) async {
        do {
            let token = try await auth.accessToken()
            if let profile = try await auth.api.profile(userId: session.userId, accessToken: token) {
                account?.profile = profile
                return
            }
            let role = session.role == "teacher" ? "teacher" : "student"
            let name = String((session.displayName ?? session.email?.split(separator: "@").first.map(String.init) ?? "Student").prefix(60))
            let profile = Profile(id: session.userId, role: role, displayName: name)
            try await auth.api.insertProfile(profile, accessToken: token)
            account?.profile = profile
        } catch {
            if let e = error as? SupabaseError, e.isAuthFailure { await sessionExpired() }
        }
    }

    /* -------------------------------------------------------------- */
    /* Reconcile, push, pull                                             */
    /* -------------------------------------------------------------- */

    func reconcile() async {
        guard let userId = account?.userId else { return }
        syncStatus = .syncing
        do {
            let token = try await auth.accessToken()
            // A failed pull aborts: treating "couldn't reach the server" as "no
            // cloud row" would push this device's copy over the real one.
            let cloud = try await auth.api.pullProgress(accessToken: token)
            let plan = CloudSync.reconcile(userId: userId, local: progress, bookkeeping: bookkeeping, cloud: cloud)
            applySynced(plan.local)
            var syncedAt = plan.fallbackSyncedAt
            if let push = plan.push, let pushedAt = await upload(push, token: token) { syncedAt = pushedAt }
            bookkeeping = SyncBookkeeping(lastSyncedUserId: userId, lastSyncedAt: syncedAt)
            syncStatus = .synced(Date())
        } catch {
            await handleSyncError(error)
        }
    }

    /// Debounced push after a local edit — only once reconcile has confirmed
    /// the local data belongs to this account.
    func schedulePush() {
        guard let userId = account?.userId, bookkeeping.lastSyncedUserId == userId else { return }
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(for: Self.pushDebounce)
            guard !Task.isCancelled else { return }
            await self?.pushNow()
        }
    }

    func pushNowIfPending() {
        guard pushTask != nil else { return }
        pushTask?.cancel()
        pushTask = Task { [weak self] in await self?.pushNow() }
    }

    private func pushNow() async {
        pushTask = nil
        guard let userId = account?.userId, bookkeeping.lastSyncedUserId == userId else { return }
        do {
            let token = try await auth.accessToken()
            syncStatus = .syncing
            if let pushedAt = await upload(progress, token: token) {
                bookkeeping.lastSyncedAt = pushedAt
                syncStatus = .synced(Date())
            } else {
                syncStatus = .offline("Couldn't reach the server — your progress is saved on this device.")
            }
        } catch {
            await handleSyncError(error)
        }
    }

    /// Uploads and returns the `updated_at` written, or nil on failure.
    private func upload(_ document: ProgressDocument, token: String) async -> String? {
        let updatedAt = StudyDates.isoTimestamp(Date())
        do {
            try await auth.api.pushProgress(document.raw, updatedAt: updatedAt, accessToken: token)
            return updatedAt
        } catch {
            return nil
        }
    }

    func pull() async {
        guard let userId = account?.userId, bookkeeping.lastSyncedUserId == userId else { return }
        do {
            let token = try await auth.accessToken()
            guard let cloud = try await auth.api.pullProgress(accessToken: token) else { return }
            guard let merged = CloudSync.mergePulled(userId: userId, local: progress, bookkeeping: bookkeeping, cloud: cloud) else {
                syncStatus = .synced(Date())
                return
            }
            applySynced(merged)
            bookkeeping.lastSyncedAt = cloud.updatedAt
            syncStatus = .synced(Date())
            // Local held something the cloud didn't: send the union back.
            if merged.raw != ProgressDocument(raw: cloud.data).raw { schedulePush() }
        } catch {
            await handleSyncError(error)
        }
    }

    func syncOnForeground() async {
        if account == nil {
            await restoreSession()
        } else if bookkeeping.lastSyncedUserId != account?.userId {
            await reconcile()
        } else {
            await pull()
        }
    }

    private func startPullLoop() {
        pullLoop?.cancel()
        pullLoop = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: Self.pullInterval)
                guard let self, !Task.isCancelled else { return }
                if self.sceneActive { await self.pull() }
            }
        }
    }

    private func stopPullLoop() {
        pullLoop?.cancel()
        pullLoop = nil
    }

    /// Replaces local progress with a sync result without echoing it back up.
    private func applySynced(_ document: ProgressDocument) {
        guard document != progress else { return }
        applyingSync = true
        progress = document
        progressChanged()
        applyingSync = false
    }

    private func handleSyncError(_ error: any Error) async {
        if let e = error as? SupabaseError, e.isAuthFailure {
            await sessionExpired()
        } else {
            syncStatus = .offline("Couldn't reach the server — your progress is saved on this device.")
        }
    }

    /// The server no longer accepts this session (password changed, account
    /// deleted elsewhere). Sign out locally and say so.
    private func sessionExpired() async {
        stopPullLoop()
        await auth.forget()
        account = nil
        syncStatus = .offline("You've been signed out. Sign in again to keep syncing.")
    }

    /* -------------------------------------------------------------- */
    /* Classroom stats                                                   */
    /* -------------------------------------------------------------- */

    /// A graded result for the teacher's roster (`bump_activity_stats`). Best
    /// effort; never blocks or fails the local recording.
    func reportActivity(source: String, correct: Double, total: Double) {
        guard account != nil, total > 0 else { return }
        Task { [auth] in
            guard let token = try? await auth.accessToken() else { return }
            try? await auth.api.rpc("bump_activity_stats", JSONObject([
                ("p_day", .string(StudyDates.today())),
                ("p_source", .string(source)),
                ("p_correct", .number(correct)),
                ("p_total", .number(total)),
            ]), accessToken: token)
        }
    }
}
