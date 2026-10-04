import Foundation

/// What a Supabase email link hands back when it opens the app: the sign-up
/// confirmation redirects to lectio://auth-callback with the new session in
/// the fragment (`#access_token=…&refresh_token=…&type=signup`), or with
/// `#error=…&error_description=…` when the link has expired or was already
/// used. Nil for any other URL.
public enum AuthCallback: Equatable, Sendable {
    /// The link worked; the refresh token gets a full session (and the user).
    case session(refreshToken: String)
    /// The link didn't, and Supabase said why.
    case failed(String)

    public init?(url: URL) {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme == "lectio", parts.host == "auth-callback"
        else { return nil }
        var params: [String: String] = [:]
        for encoded in [parts.percentEncodedQuery, parts.percentEncodedFragment].compactMap({ $0 }) {
            var form = URLComponents()
            // A form encoding: "+" is a space (Supabase writes its error
            // descriptions that way); tokens never contain one.
            form.percentEncodedQuery = encoded.replacingOccurrences(of: "+", with: "%20")
            for item in form.queryItems ?? [] { params[item.name] = item.value }
        }
        if let token = params["refresh_token"], !token.isEmpty {
            self = .session(refreshToken: token)
        } else if let message = params["error_description"] ?? params["error"], !message.isEmpty {
            self = .failed(message)
        } else {
            self = .failed("The link didn’t include a sign-in")
        }
    }
}
