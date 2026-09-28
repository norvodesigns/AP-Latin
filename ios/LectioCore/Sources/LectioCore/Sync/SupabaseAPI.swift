import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// A signed-in Supabase session.
public struct AuthSession: Codable, Sendable, Equatable {
    public var accessToken: String
    public var refreshToken: String
    /// When `accessToken` stops being accepted.
    public var expiresAt: Date
    public var userId: String
    public var email: String?
    /// `user_metadata` from signup — carries `display_name` and `role` for
    /// backfilling a missing profile, exactly as the web's sign-in does.
    public var displayName: String?
    public var role: String?

    public init(accessToken: String, refreshToken: String, expiresAt: Date, userId: String, email: String?,
                displayName: String?, role: String?) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.userId = userId
        self.email = email
        self.displayName = displayName
        self.role = role
    }
}

public struct Profile: Sendable, Equatable {
    public var id: String
    public var role: String
    public var displayName: String
    public var isTeacher: Bool { role == "teacher" }

    public init(id: String, role: String, displayName: String) {
        self.id = id
        self.role = role
        self.displayName = displayName
    }
}

public struct SupabaseError: Error, Sendable, Equatable, CustomStringConvertible {
    public let status: Int
    public let code: String?
    public let message: String
    public var description: String { message }

    public init(status: Int, code: String?, message: String) {
        self.status = status
        self.code = code
        self.message = message
    }

    /// The session is no longer usable (expired refresh token, deleted user).
    public var isAuthFailure: Bool { status == 401 || code == "invalid_grant" || code == "refresh_token_not_found" }
}

/// The handful of Supabase endpoints the app uses — auth (GoTrue) and the
/// database REST API (PostgREST) — spoken directly over HTTPS.
///
/// Written by hand rather than pulling in the full SDK: the app needs a dozen
/// calls, and every body goes through `JSONValue` so the progress document
/// keeps its key order on the way to and from the `user_progress` row, the
/// same guarantee the rest of the sync layer depends on.
///
/// Mirrors what the web app does through supabase-js: see
/// src/app/(auth)/actions.ts, src/lib/supabase/progressSync.ts and sync.ts.
public struct SupabaseAPI: Sendable {
    public let baseURL: URL
    public let anonKey: String
    let session: URLSession

    public init(baseURL: URL, anonKey: String, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.anonKey = anonKey
        self.session = session
    }

    /* -------------------------------------------------------------- */
    /* Auth                                                             */
    /* -------------------------------------------------------------- */

    public enum SignUpResult: Sendable, Equatable {
        case signedIn(AuthSession)
        /// Email confirmation is on: the account exists but can't sign in
        /// until the link in the confirmation email is followed.
        case confirmationRequired
    }

    public func signUp(email: String, password: String, displayName: String, role: String, redirectTo: URL?) async throws -> SignUpResult {
        var query: [URLQueryItem] = []
        if let redirectTo { query.append(URLQueryItem(name: "redirect_to", value: redirectTo.absoluteString)) }
        let body: JSONValue = [
            "email": .string(email),
            "password": .string(password),
            "data": ["display_name": .string(displayName), "role": .string(role)],
        ]
        let response = try await send("auth/v1/signup", query: query, body: body)
        if response["access_token"] != nil { return .signedIn(try Self.session(from: response)) }
        return .confirmationRequired
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        let body: JSONValue = ["email": .string(email), "password": .string(password)]
        let response = try await send("auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "password")], body: body)
        return try Self.session(from: response)
    }

    public func refresh(_ refreshToken: String) async throws -> AuthSession {
        let response = try await send("auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
                                      body: ["refresh_token": .string(refreshToken)])
        return try Self.session(from: response)
    }

    public func signOut(accessToken: String) async throws {
        _ = try await send("auth/v1/logout", body: [:], accessToken: accessToken)
    }

    /* -------------------------------------------------------------- */
    /* Database                                                         */
    /* -------------------------------------------------------------- */

    /// The signed-in user's `user_progress` row, or nil when there isn't one
    /// yet. Row-level security scopes the select to the caller's own row.
    public func pullProgress(accessToken: String) async throws -> CloudProgress? {
        let rows = try await send("rest/v1/user_progress", method: "GET",
                                  query: [URLQueryItem(name: "select", value: "data,updated_at")], accessToken: accessToken)
        guard let row = rows.arrayValue?.first,
              let data = row["data"]?.objectValue,
              let updatedAt = row["updated_at"]?.stringValue
        else { return nil }
        return CloudProgress(data: data, updatedAt: updatedAt)
    }

    /// Upserts the progress row and returns the `updated_at` it was written
    /// with. `user_id` is never sent: the column defaults to `auth.uid()`.
    public func pushProgress(_ data: JSONObject, updatedAt: String, accessToken: String) async throws {
        _ = try await send("rest/v1/user_progress", query: [URLQueryItem(name: "on_conflict", value: "user_id")],
                           body: ["data": .object(data), "updated_at": .string(updatedAt)],
                           accessToken: accessToken, prefer: "resolution=merge-duplicates,return=minimal")
    }

    public func profile(userId: String, accessToken: String) async throws -> Profile? {
        let rows = try await send("rest/v1/profiles", method: "GET", query: [
            URLQueryItem(name: "id", value: "eq.\(userId)"),
            URLQueryItem(name: "select", value: "id,role,display_name"),
        ], accessToken: accessToken)
        guard let row = rows.arrayValue?.first,
              let id = row["id"]?.stringValue,
              let role = row["role"]?.stringValue,
              let name = row["display_name"]?.stringValue
        else { return nil }
        return Profile(id: id, role: role, displayName: name)
    }

    /// Creates the profile row. A duplicate (someone got there first) is fine.
    public func insertProfile(_ profile: Profile, accessToken: String) async throws {
        do {
            _ = try await send("rest/v1/profiles", body: [
                "id": .string(profile.id), "role": .string(profile.role), "display_name": .string(profile.displayName),
            ], accessToken: accessToken, prefer: "return=minimal")
        } catch let error as SupabaseError where error.code == "23505" || error.status == 409 {
            return
        }
    }

    /// Calls a database function. Every one the app uses returns nothing.
    public func rpc(_ name: String, _ params: JSONObject, accessToken: String) async throws {
        _ = try await send("rest/v1/rpc/\(name)", body: .object(params), accessToken: accessToken, prefer: "return=minimal")
    }

    /// Calls a database function that returns rows.
    public func rpcRows(_ name: String, _ params: JSONObject, accessToken: String) async throws -> [JSONValue] {
        try await send("rest/v1/rpc/\(name)", body: .object(params), accessToken: accessToken).arrayValue ?? []
    }

    /// A plain PostgREST select, for the classroom screens.
    public func select(_ table: String, query: [URLQueryItem], accessToken: String) async throws -> [JSONValue] {
        try await send("rest/v1/\(table)", method: "GET", query: query, accessToken: accessToken).arrayValue ?? []
    }

    public func delete(_ table: String, query: [URLQueryItem], accessToken: String) async throws {
        _ = try await send("rest/v1/\(table)", method: "DELETE", query: query, accessToken: accessToken, prefer: "return=minimal")
    }

    /* -------------------------------------------------------------- */
    /* Transport                                                        */
    /* -------------------------------------------------------------- */

    func send(_ path: String, method: String = "POST", query: [URLQueryItem] = [], body: JSONValue? = nil,
              accessToken: String? = nil, prefer: String? = nil) async throws -> JSONValue {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = Data(body.serialized().utf8)
        }

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let json = data.isEmpty ? JSONValue.null : ((try? JSONValue.parse(data)) ?? .null)
        guard (200..<300).contains(status) else { throw Self.error(status: status, body: json) }
        return json
    }

    static func error(status: Int, body: JSONValue) -> SupabaseError {
        let code = body["error_code"]?.stringValue ?? body["code"]?.stringValue ?? body["error"]?.stringValue
        let message = body["msg"]?.stringValue
            ?? body["error_description"]?.stringValue
            ?? body["message"]?.stringValue
            ?? "The server answered \(status)."
        return SupabaseError(status: status, code: code, message: message)
    }

    static func session(from json: JSONValue, now: Date = Date()) throws -> AuthSession {
        guard let access = json["access_token"]?.stringValue,
              let refresh = json["refresh_token"]?.stringValue,
              let user = json["user"],
              let userId = user["id"]?.stringValue
        else { throw SupabaseError(status: 0, code: "malformed", message: "The sign-in response was incomplete.") }
        let expiresAt = json["expires_at"]?.doubleValue.map { Date(timeIntervalSince1970: $0) }
            ?? now.addingTimeInterval(json["expires_in"]?.doubleValue ?? 3600)
        let meta = user["user_metadata"]
        return AuthSession(accessToken: access, refreshToken: refresh, expiresAt: expiresAt, userId: userId,
                           email: user["email"]?.stringValue, displayName: meta?["display_name"]?.stringValue,
                           role: meta?["role"]?.stringValue)
    }
}
