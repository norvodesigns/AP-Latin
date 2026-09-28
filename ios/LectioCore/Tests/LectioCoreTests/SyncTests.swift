import Foundation
import Testing
@testable import LectioCore
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// The three sign-in cases from src/hooks/useCloudSync.ts, and the mid-session pull.
@Suite struct CloudSyncTests {
    let now = parseISO("2026-10-15T12:00:00.000Z")

    func doc(studied day: String, theme: Theme = .light) -> ProgressDocument {
        var d = ProgressDocument.blank(now: now)
        d.markStudied(now: parseISO(day + "T12:00:00.000Z"))
        d.setTheme(theme)
        return d
    }

    @Test func firstSignInAdoptsLocalWhenNoCloudRow() {
        let local = doc(studied: "2026-10-14")
        let r = CloudSync.reconcile(userId: "u1", local: local, bookkeeping: SyncBookkeeping(), cloud: nil, now: now)
        #expect(r.local == local)
        #expect(r.push == local)
    }

    @Test func firstSignInMergesAndCloudWinsSettings() {
        let local = doc(studied: "2026-10-14", theme: .light)
        let cloud = CloudProgress(data: doc(studied: "2026-10-10", theme: .dark).raw, updatedAt: "2026-10-12T00:00:00.000+00:00")
        let r = CloudSync.reconcile(userId: "u1", local: local, bookkeeping: SyncBookkeeping(), cloud: cloud, now: now)
        #expect(r.local.studyDays == ["2026-10-10", "2026-10-14"])
        #expect(r.local.theme == .dark)
        #expect(r.push == r.local)
        #expect(r.fallbackSyncedAt == cloud.updatedAt)
    }

    @Test func sameAccountKeepsLocalSettingsWhenCloudIsNotNewer() {
        let local = doc(studied: "2026-10-14", theme: .light)
        let cloud = CloudProgress(data: doc(studied: "2026-10-10", theme: .dark).raw, updatedAt: "2026-10-12T00:00:00.000+00:00")
        let book = SyncBookkeeping(lastSyncedUserId: "u1", lastSyncedAt: "2026-10-12T00:00:00.000Z")
        let r = CloudSync.reconcile(userId: "u1", local: local, bookkeeping: book, cloud: cloud, now: now)
        #expect(r.local.theme == .light)
        #expect(r.local.studyDays == ["2026-10-10", "2026-10-14"])
    }

    @Test func differentAccountNeverMergesTheOldLocalData() {
        let someoneElses = doc(studied: "2026-10-14")
        let book = SyncBookkeeping(lastSyncedUserId: "previous", lastSyncedAt: "2026-10-13T00:00:00.000Z")

        let cloud = CloudProgress(data: doc(studied: "2026-09-01").raw, updatedAt: "2026-10-01T00:00:00+00:00")
        let withCloud = CloudSync.reconcile(userId: "u2", local: someoneElses, bookkeeping: book, cloud: cloud, now: now)
        #expect(withCloud.local.studyDays == ["2026-09-01"])
        #expect(withCloud.push == nil)

        let fresh = CloudSync.reconcile(userId: "u2", local: someoneElses, bookkeeping: book, cloud: nil, now: now)
        #expect(fresh.local.studyDays.isEmpty)
        #expect(fresh.push == fresh.local)
    }

    @Test func pullOnlyMergesGenuinelyNewRows() {
        let local = doc(studied: "2026-10-14")
        let cloud = CloudProgress(data: doc(studied: "2026-10-15").raw, updatedAt: "2026-10-15T09:00:00.123456+00:00")
        let seen = SyncBookkeeping(lastSyncedUserId: "u1", lastSyncedAt: "2026-10-15T09:00:00.123Z")
        #expect(CloudSync.mergePulled(userId: "u1", local: local, bookkeeping: seen, cloud: cloud, now: now) == nil)

        let older = SyncBookkeeping(lastSyncedUserId: "u1", lastSyncedAt: "2026-10-15T08:00:00.000Z")
        let merged = CloudSync.mergePulled(userId: "u1", local: local, bookkeeping: older, cloud: cloud, now: now)
        #expect(merged?.studyDays == ["2026-10-14", "2026-10-15"])

        let otherUser = SyncBookkeeping(lastSyncedUserId: "u9", lastSyncedAt: nil)
        #expect(CloudSync.mergePulled(userId: "u1", local: local, bookkeeping: otherUser, cloud: cloud, now: now) == nil)
    }

    @Test func timestampsCompareAcrossFormats() {
        #expect(!CloudSync.isLater("2026-09-28T05:15:29.123+00:00", than: "2026-09-28T05:15:29.123Z"))
        #expect(!CloudSync.isLater("2026-09-28T05:15:29.1234+00:00", than: "2026-09-28T05:15:29.123Z"))
        #expect(CloudSync.isLater("2026-09-28T05:15:29.124+00:00", than: "2026-09-28T05:15:29.123Z"))
        #expect(CloudSync.isLater("2026-09-28T06:15:29+01:00", than: "2026-09-28T05:15:28Z"))
    }
}

@Suite struct SupabaseAPITests {
    @Test func parsesASession() throws {
        let json = try JSONValue.parse(#"""
        {"access_token":"a","token_type":"bearer","expires_in":3600,"expires_at":1790000000,"refresh_token":"r",
         "user":{"id":"u1","email":"s@x.org","user_metadata":{"display_name":"Sam","role":"student"}}}
        """#)
        let s = try SupabaseAPI.session(from: json)
        #expect(s.userId == "u1")
        #expect(s.expiresAt == Date(timeIntervalSince1970: 1_790_000_000))
        #expect(s.displayName == "Sam")
    }

    @Test func readsBothErrorShapes() throws {
        let gotrue = SupabaseAPI.error(status: 400, body: try JSONValue.parse(#"{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}"#))
        #expect(gotrue.code == "invalid_credentials")
        #expect(gotrue.message == "Invalid login credentials")
        let postgrest = SupabaseAPI.error(status: 409, body: try JSONValue.parse(#"{"code":"23505","message":"duplicate key"}"#))
        #expect(postgrest.code == "23505")
    }

    @Test func validatesLikeTheWebForm() {
        #expect(AuthManager.validate(email: "student@school.org", password: "longenough") == nil)
        #expect(AuthManager.validate(email: "not-an-email", password: "longenough") != nil)
        #expect(AuthManager.validate(email: "a@b.co", password: "short") != nil)
    }

    @Test func pullKeepsTheDocumentsKeyOrder() async throws {
        StubProtocol.handler = { request in
            #expect(request.value(forHTTPHeaderField: "apikey") == "anon")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer token")
            return (200, #"[{"data":{"zeta":1,"alpha":{"b":1,"a":2}},"updated_at":"2026-10-15T09:00:00+00:00"}]"#)
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let api = SupabaseAPI(baseURL: URL(string: "https://example.supabase.co")!, anonKey: "anon", session: URLSession(configuration: config))
        let cloud = try #require(try await api.pullProgress(accessToken: "token"))
        #expect(cloud.data.keys == ["zeta", "alpha"])
        #expect(cloud.data["alpha"]?.objectValue?.keys == ["b", "a"])
    }
}

/// Answers every request from `handler` instead of the network.
final class StubProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) -> (Int, String))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        let (status, body) = Self.handler?(request) ?? (500, "")
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
}
