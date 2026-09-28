import Foundation

/// Where the signed-in session is kept between launches. The app stores it
/// in the Keychain; tests keep it in memory.
public protocol SessionStorage: Sendable {
    func load() -> AuthSession?
    func save(_ session: AuthSession?)
}

public final class InMemorySessionStorage: SessionStorage, @unchecked Sendable {
    private let lock = NSLock()
    private var session: AuthSession?
    public init(_ session: AuthSession? = nil) { self.session = session }
    public func load() -> AuthSession? { lock.withLock { session } }
    public func save(_ session: AuthSession?) { lock.withLock { self.session = session } }
}

/// Owns the session: signs in and out, persists the session, and hands out an
/// access token that is refreshed before it expires.
public actor AuthManager {
    public nonisolated let api: SupabaseAPI
    private let storage: any SessionStorage
    public private(set) var session: AuthSession?
    private var refreshing: Task<AuthSession, any Error>?

    public init(api: SupabaseAPI, storage: any SessionStorage) {
        self.api = api
        self.storage = storage
        self.session = storage.load()
    }

    public var userId: String? { session?.userId }

    /// A currently valid access token, refreshing first when it's within a
    /// minute of expiring. A refresh the server refuses (the account was
    /// deleted, or signed out everywhere) ends the session here too.
    public func accessToken(now: Date = Date()) async throws -> String {
        guard let current = session else { throw SupabaseError(status: 401, code: "signed_out", message: "Not signed in.") }
        if current.expiresAt.timeIntervalSince(now) > 60 { return current.accessToken }

        if let refreshing { return try await refreshing.value.accessToken }
        let task = Task { [api] in try await api.refresh(current.refreshToken) }
        refreshing = task
        defer { refreshing = nil }
        do {
            let fresh = try await task.value
            setSession(fresh)
            return fresh.accessToken
        } catch let error as SupabaseError where error.isAuthFailure || error.status == 400 {
            setSession(nil)
            throw error
        }
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        let session = try await api.signIn(email: Self.normalize(email), password: password)
        setSession(session)
        return session
    }

    public func signUp(email: String, password: String, displayName: String, role: String,
                       redirectTo: URL?) async throws -> SupabaseAPI.SignUpResult {
        let result = try await api.signUp(email: Self.normalize(email), password: password,
                                          displayName: displayName, role: role, redirectTo: redirectTo)
        if case .signedIn(let session) = result { setSession(session) }
        return result
    }

    /// Signs out on the server (best effort) and forgets the session locally
    /// either way — being signed out must never depend on the network.
    public func signOut() async {
        if let token = session?.accessToken { try? await api.signOut(accessToken: token) }
        setSession(nil)
    }

    /// Forgets the session without telling the server — after the account
    /// itself has been deleted.
    public func forget() { setSession(nil) }

    private func setSession(_ session: AuthSession?) {
        self.session = session
        storage.save(session)
    }

    static func normalize(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// The web signup form's validation, so both reject the same input.
    public static func validate(email: String, password: String) -> String? {
        let e = normalize(email)
        let parts = e.split(separator: "@", omittingEmptySubsequences: false)
        if e.isEmpty || e.contains(" ") || parts.count != 2 || parts[0].isEmpty || !parts[1].contains(".")
            || parts[1].hasPrefix(".") || parts[1].hasSuffix(".") {
            return "Enter a valid email address."
        }
        if password.count < 8 { return "Your password must be at least 8 characters." }
        if password.count > 200 { return "That password is too long." }
        return nil
    }
}
