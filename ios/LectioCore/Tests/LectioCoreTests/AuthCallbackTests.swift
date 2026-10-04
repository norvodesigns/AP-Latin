import Foundation
import Testing
@testable import LectioCore

/// The sign-up confirmation link, as Supabase sends it back to the app.
@Suite struct AuthCallbackTests {
    @Test func aConfirmedLinkCarriesItsRefreshToken() throws {
        let url = try #require(URL(string: "lectio://auth-callback#access_token=eyJ.a.b&expires_at=1791000000&expires_in=3600&refresh_token=r3fr35h&token_type=bearer&type=signup"))
        #expect(AuthCallback(url: url) == .session(refreshToken: "r3fr35h"))
    }

    @Test func anExpiredLinkSaysWhy() throws {
        let url = try #require(URL(string: "lectio://auth-callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"))
        #expect(AuthCallback(url: url) == .failed("Email link is invalid or has expired"))
    }

    @Test func theQueryWorksToo() throws {
        let url = try #require(URL(string: "lectio://auth-callback?error=server_error&error_description=Something%20broke"))
        #expect(AuthCallback(url: url) == .failed("Something broke"))
    }

    @Test func theWebsiteSaysTheAddressIsConfirmed() throws {
        #expect(AuthCallback(url: try #require(URL(string: "lectio://auth-callback?confirmed=1"))) == .confirmed)
    }

    @Test func otherLinksAreNotCallbacks() throws {
        #expect(AuthCallback(url: try #require(URL(string: "lectio://vocab"))) == nil)
        #expect(AuthCallback(url: try #require(URL(string: "https://lectio.norvodesigns.com/auth-callback#refresh_token=x"))) == nil)
    }
}
