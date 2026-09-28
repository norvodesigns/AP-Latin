import Foundation
import Testing
@testable import LectioCore

/// The Swift ports must agree with the web app exactly, or two devices syncing
/// one student's history would disagree about it. Every expected value here
/// was produced by running the real TypeScript (scripts/export-merge-fixtures.ts).
@Suite struct ParityTests {
    @Test func mergeMatchesTheWebApp() throws {
        let cases = try #require(Paths.fixture("merge.json")["cases"]?.arrayValue)
        #expect(cases.count >= 5)
        for c in cases {
            let name = c["name"]?.stringValue ?? "?"
            let local = try #require(c["local"]?.objectValue)
            let cloud = try #require(c["cloud"]?.objectValue)
            let cloudIsNewer = c["cloudIsNewer"]?.boolValue == true
            let expected = try #require(c["expected"])

            let merged = ProgressMerge.merge(local: local, cloud: cloud, cloudIsNewer: cloudIsNewer)
            let diff = firstDifference(.object(merged), expected)
            #expect(diff == nil, "\(name): \(diff ?? "")")

            // Order is part of the contract where the web relies on it: the
            // drafts cap evicts by insertion order, so the surviving keys must
            // come out in the same order too.
            #expect(merged.object("scansionDrafts").keys == expected["scansionDrafts"]?.objectValue?.keys, "\(name): draft order")
            #expect(merged.object("vocab").keys == expected["vocab"]?.objectValue?.keys, "\(name): vocab order")
        }
    }

    @Test func sm2MatchesTheWebApp() throws {
        let fixture = try Paths.fixture("sm2.json")
        let now = parseISO(try #require(fixture["now"]?.stringValue))
        for c in try #require(fixture["cases"]?.arrayValue) {
            var card: VocabCard = try #require(c["start"]).decode()
            for step in try #require(c["steps"]?.arrayValue) {
                card = SpacedRepetition.review(card, quality: try #require(step["quality"]?.intValue), now: now, calendar: utc)
                let expected = try #require(step["card"])
                let diff = firstDifference(try JSONValue(encoding: card), expected)
                #expect(diff == nil, "\(diff ?? "")")
            }
        }
    }

    @Test func streaksMatchTheWebApp() throws {
        let fixture = try Paths.fixture("streaks.json")
        let now = parseISO(try #require(fixture["now"]?.stringValue))
        for c in try #require(fixture["cases"]?.arrayValue) {
            let days = try #require(c["studyDays"]?.arrayValue).compactMap(\.stringValue)
            #expect(Streaks.current(days, now: now, calendar: utc) == c["current"]?.intValue, "current \(days)")
            #expect(Streaks.longest(days) == c["longest"]?.intValue, "longest \(days)")
        }
    }

    @Test func mergeIsIdempotent() throws {
        let c = try #require(Paths.fixture("merge.json")["cases"]?.arrayValue?.first)
        let local = try #require(c["local"]?.objectValue)
        let cloud = try #require(c["cloud"]?.objectValue)
        let once = ProgressMerge.merge(local: local, cloud: cloud, cloudIsNewer: true)
        let twice = ProgressMerge.merge(local: once, cloud: cloud, cloudIsNewer: true)
        #expect(firstDifference(.object(once), .object(twice)) == nil)
    }

    @Test func mergeCarriesFieldsThisBuildDoesNotKnow() {
        var local = ProgressDocument.blank().raw
        var cloud = ProgressDocument.blank().raw
        local["futureLocalOnly"] = "kept"
        cloud["futureFeature"] = ["a": 1]
        let merged = ProgressMerge.merge(local: local, cloud: cloud, cloudIsNewer: false)
        #expect(merged["futureFeature"] == ["a": 1])
        #expect(merged["futureLocalOnly"] == "kept")
    }
}
