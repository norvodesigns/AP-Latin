import Foundation
import Testing
// Deliberately not `@testable`: this file sees LectioCore exactly as the app
// does, so anything the app constructs or calls that isn't public fails
// here, on Linux, instead of only in the Xcode build.
import LectioCore

@Suite struct PublicAPITests {
    @Test func theAppCanBuildEverythingItNeeds() throws {
        _ = Profile(id: "u", role: "student", displayName: "Sam")
        _ = SupabaseError(status: 400, code: nil, message: "x")
        _ = SyncBookkeeping(lastSyncedUserId: "u", lastSyncedAt: nil)
        _ = CloudProgress(data: JSONObject(), updatedAt: "2026-01-01T00:00:00Z")
        _ = AuthSession(accessToken: "a", refreshToken: "r", expiresAt: Date(), userId: "u", email: nil, displayName: nil, role: nil)
        _ = Annotation(id: "a", lineN: 1, startTok: 0, endTok: 0, text: "x", color: .gilt, note: "", createdAt: "")
        _ = VocabCard.new(id: "arma")
        _ = PassageState()
        _ = SupabaseAPI(baseURL: URL(string: "https://example.org")!, anonKey: "k")
        _ = InMemorySessionStorage()
        var doc = ProgressDocument.blank()
        doc.setHighlight(passageId: "p", lineN: 1, startTok: 0, endTok: 0, text: "x", color: .woad)
        doc.recordAiCall(route: "ask")
        _ = ProgressMerge.merge(local: doc.raw, cloud: doc.raw, cloudIsNewer: true)
        _ = CloudSync.reconcile(userId: "u", local: doc, bookkeeping: SyncBookkeeping(), cloud: nil)
        _ = try JSONValue.parse("{}").serialized()
        _ = Question(id: "g", type: "inference", skill: "1.B", skillCategory: "1", prompt: "?",
                     options: [QuestionOption(id: "a", text: "A")], answerId: "a", explanation: "", unit: "1", difficulty: 2)
        _ = GlossNote(word: "w", meaning: "m")
        _ = ScansionDraft(marks: [nil], divisions: [])
        _ = Tally(correct: 1, total: 2)
    }
}
