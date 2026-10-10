import Foundation
import LectioCore
import Observation
import os
import SwiftUI

/// The app's single source of state: the content library, the student's
/// progress document, their account, and a few device-only preferences.
///
/// Progress is written to Application Support after every edit (debounced),
/// the way the web app writes localStorage — local first, always, so nothing
/// waits on a network. When signed in, cloud sync (AppModel+Sync.swift)
/// keeps a copy in step with the website's.
@Observable
final class AppModel {
    enum ContentState {
        case loading
        case ready(ContentLibrary)
        case failed(String)
    }

    nonisolated enum Appearance: String, CaseIterable, Identifiable, Sendable {
        case system, light, dark
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
        var colorScheme: ColorScheme? {
            switch self {
            case .system: nil
            case .light: .light
            case .dark: .dark
            }
        }
    }

    struct Account: Equatable {
        var userId: String
        var email: String?
        var profile: Profile?
        var displayName: String { profile?.displayName ?? email ?? "Your account" }
        var isTeacher: Bool { profile?.isTeacher ?? false }
    }

    enum SyncStatus: Equatable {
        case idle
        case syncing
        case synced(Date)
        case offline(String)
    }

    private(set) var contentState: ContentState = .loading
    var progress: ProgressDocument {
        didSet { vocab = progress.vocab }
    }
    /// The decoded vocabulary deck, kept in step with `progress` so screens
    /// that read it several times per render don't re-decode it each time.
    private(set) var vocab: [String: VocabCard] = [:]
    /// Set by a dashboard "Drill it" link; the Quiz Engine narrows to it.
    var quizPresetType: String? = nil
    /// The Reading Room's navigation stack, so a link can open a passage.
    var readPath: [Passage] = []
    /// Today's navigation stack. On iPhone, sections outside the tab bar are
    /// pushed here (see PhoneTabs in RootView.swift).
    var todayPath = NavigationPath()
    /// The course lesson open over everything else, if any.
    var activeLesson: LessonPlace? = nil {
        didSet { if (oldValue == nil) != (activeLesson == nil) { studySectionChanged() } }
    }
    /// The first-run screens (Features/Onboarding), over everything.
    var showOnboarding = false
    /// What a sign-up confirmation link did when it opened the app, shown
    /// once as an alert (`completeEmailLink`).
    var authNotice: String? = nil
    var selectedTab: AppTab = .today {
        didSet { if oldValue != selectedTab { studySectionChanged() } }
    }

    /// Device-only: whether this device follows the system appearance. Kept
    /// out of the synced document on purpose — a phone following the system's
    /// dark mode shouldn't flip the student's laptop.
    var appearance: Appearance {
        didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "appearance") }
    }

    /// Multiplier on the Latin type size, like the web's `--ls`.
    var latinScale: Double {
        didSet { UserDefaults.standard.set(latinScale, forKey: "latinScale") }
    }

    /* Account and sync — see AppModel+Sync.swift. */
    var account: Account? = nil
    var syncStatus: SyncStatus = .idle
    @ObservationIgnored let auth: AuthManager
    @ObservationIgnored var bookkeeping: SyncBookkeeping {
        didSet { Self.storeBookkeeping(bookkeeping) }
    }
    @ObservationIgnored var pushTask: Task<Void, Never>? = nil
    @ObservationIgnored var pullLoop: Task<Void, Never>? = nil
    /// Set while a sync write replaces `progress`, so it isn't pushed straight back.
    @ObservationIgnored var applyingSync = false

    /* Widgets and the watch — see AppModel+Widgets.swift, WatchBridge.swift. */
    @ObservationIgnored var lastWidgetSnapshot: WidgetSnapshot? = nil
    @ObservationIgnored var watchBridge: WatchBridge? = nil
    @ObservationIgnored var lastWatchDeck: WatchDeck? = nil

    /* Content updates from the website — see ContentStore.swift. */
    @ObservationIgnored var contentDirectory: URL? = nil
    @ObservationIgnored var contentUpdate: Task<Void, Never>? = nil

    /* AI — the website's routes. Nil until checked. */
    var aiAvailable: Bool? = nil
    @ObservationIgnored let ai = AIClient()

    /* Study time — see AppModel+StudyTime.swift. Device-local, like the
       web's `studySecondsToday`: today's live tally is never synced. */
    var studySecondsToday: Double = 0
    var goalJustReached = false
    @ObservationIgnored var studyGoalDate: String = ""
    @ObservationIgnored var goalCelebratedDate: String? = nil
    @ObservationIgnored var pendingStudySeconds: Double = 0
    @ObservationIgnored var pendingStudySection: String? = nil
    @ObservationIgnored var studyTicker: Task<Void, Never>? = nil
    @ObservationIgnored var sceneActive = false

    private let progressURL = URL.applicationSupportDirectory.appending(path: "progress.json")
    @ObservationIgnored private var saveTask: Task<Void, Never>? = nil

    init() {
        let stored = Self.readProgress(from: progressURL) ?? .blank()
        progress = stored
        vocab = stored.vocab
        appearance = Appearance(rawValue: UserDefaults.standard.string(forKey: "appearance") ?? "") ?? .system
        let scale = UserDefaults.standard.double(forKey: "latinScale")
        latinScale = scale > 0 ? scale : 1

        let api = SupabaseAPI(baseURL: AppConfig.supabaseURL, anonKey: AppConfig.supabaseAnonKey)
        auth = AuthManager(api: api, storage: KeychainSessionStorage())
        bookkeeping = Self.loadBookkeeping()
        restoreStudyDay()
    }

    var content: ContentLibrary? {
        if case .ready(let library) = contentState { library } else { nil }
    }

    /* -------------------------------------------------------------- */
    /* Content                                                          */
    /* -------------------------------------------------------------- */

    /// Asks the server whether AI is configured. A yes is kept for the
    /// session; a no, or no answer at all (offline, a slow network), is asked
    /// again the next time a screen needs it, so one failed check can't
    /// switch AI off until the app is restarted.
    func checkAI() async {
        guard aiAvailable != true else { return }
        if let configured = await ai.isConfigured() { aiAvailable = configured }
    }

    func loadContent() async {
        guard case .loading = contentState else { return }
        let started = ContinuousClock.now
        do {
            let (library, directory) = try await Task.detached(priority: .userInitiated) { () throws -> (ContentLibrary, URL) in
                guard let url = ContentStore.activeDirectory(), let bundled = ContentStore.bundled else {
                    throw CocoaError(.fileNoSuchFile)
                }
                do {
                    return (try ContentLibrary(directory: url), url)
                } catch where url != bundled {
                    // A download that no longer decodes: back to the bundle.
                    ContentStore.discardDownload()
                    return (try ContentLibrary(directory: bundled), bundled)
                }
            }.value
            contentState = .ready(library)
            contentDirectory = directory
            // How long launch waited for content, for Console on a real device.
            let elapsed = ContinuousClock.now - started
            Logger(subsystem: "com.norvodesigns.lectio", category: "content")
                .info("Content loaded in \(String(describing: elapsed), privacy: .public)")
            // The sentence builder is built on first use; build it now, in the
            // background, so opening it later doesn't wait.
            Task.detached(priority: .background) { _ = library.sentences }
            seedDemoIfRequested()
            // A saved session (the keychain outlives a reinstall) means a
            // returning student whose work is about to sync down.
            let hasSession = await auth.session != nil
            if needsOnboarding, !hasSession || UserDefaults.standard.bool(forKey: "showOnboarding") {
                showOnboarding = true
            }
            refreshWidgets()
            startWatchBridge()
            checkForContentUpdate()
        } catch {
            contentState = .failed(String(describing: error))
        }
    }

    /// Picks up content the website has that this copy doesn't — a new
    /// lesson, a corrected gloss — at most every few hours. See ContentStore.
    func checkForContentUpdate() {
        let key = "contentCheckedAt"
        let last = UserDefaults.standard.double(forKey: key)
        guard contentUpdate == nil, let library = content, let directory = contentDirectory,
              Date.now.timeIntervalSince1970 - last > 6 * 3600 else { return }
        let manifest = library.manifest
        contentUpdate = Task {
            defer { contentUpdate = nil }
            do {
                let updated = try await Task.detached(priority: .utility) { () async throws -> ContentLibrary? in
                    try await ContentStore.update(current: manifest, currentDirectory: directory)
                }.value
                UserDefaults.standard.set(Date.now.timeIntervalSince1970, forKey: key)
                guard let updated else { return }
                contentState = .ready(updated)
                contentDirectory = ContentStore.downloaded
                refreshWidgets()
                sendWatchDeck()
            } catch {
                // Offline or mid-deploy; the next foreground tries again.
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Progress                                                         */
    /* -------------------------------------------------------------- */

    /// Applies an edit to the progress document, saves it, and — when signed
    /// in — schedules a push to the cloud.
    func update(_ edit: (inout ProgressDocument) -> Void) {
        edit(&progress)
        progressChanged()
    }

    /// Replaces the whole document — a restore from a backup file.
    func replaceProgress(with document: ProgressDocument) {
        progress = document
        progressChanged()
    }

    func progressChanged() {
        scheduleSave()
        refreshWidgets()
        if !applyingSync { schedulePush() }
    }

    /// Writes immediately — called when the app leaves the foreground.
    func saveNow() {
        saveTask?.cancel()
        Self.write(progress, to: progressURL)
    }

    private func scheduleSave() {
        saveTask?.cancel()
        let snapshot = progress
        let url = progressURL
        saveTask = Task.detached(priority: .utility) {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            AppModel.write(snapshot, to: url)
        }
    }

    /* -------------------------------------------------------------- */
    /* Scene lifecycle                                                   */
    /* -------------------------------------------------------------- */

    func sceneBecameActive() {
        sceneActive = true
        startStudyTicker()
        Task { await syncOnForeground() }
        checkForContentUpdate()
    }

    func sceneResignedActive() {
        sceneActive = false
        stopStudyTicker()
        saveNow()
        flushStudyTime()
        pushNowIfPending()
        refreshWidgets()
        Task { await rescheduleReminder() }
    }

    /* -------------------------------------------------------------- */
    /* Persistence                                                       */
    /* -------------------------------------------------------------- */

    nonisolated private static func readProgress(from url: URL) -> ProgressDocument? {
        guard let data = try? Data(contentsOf: url),
              let object = try? JSONValue.parse(data).objectValue
        else { return nil }
        return ProgressDocument(raw: object)
    }

    nonisolated private static func write(_ document: ProgressDocument, to url: URL) {
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(JSONValue.object(document.raw).serialized().utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } catch {
            print("[progress] save failed: \(error)")
        }
    }

    private static func loadBookkeeping() -> SyncBookkeeping {
        guard let data = UserDefaults.standard.data(forKey: "syncBookkeeping"),
              let value = try? JSONDecoder().decode(SyncBookkeeping.self, from: data)
        else { return SyncBookkeeping() }
        return value
    }

    private static func storeBookkeeping(_ value: SyncBookkeeping) {
        if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: "syncBookkeeping") }
    }
}
