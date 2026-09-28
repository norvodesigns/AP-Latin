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

@Suite struct ScansionParityTests {
    @Test func unpackingMatchesTheWebApp() throws {
        let fixture = try Paths.fixture("scansion.json")
        for c in try #require(fixture["lines"]?.arrayValue) {
            let book = try #require(c["book"]?.intValue)
            let packed: ScansionCorpus.PackedLine = try #require(c["packed"]).decode()
            let line = ScansionCorpus.unpack(book: book, packed)
            let diff = firstDifference(try JSONValue(encoding: line), try #require(c["expected"]))
            #expect(diff == nil, "\(line.id): \(diff ?? "")")
        }
    }

    @Test func statsAndBadgesMatchTheWebApp() throws {
        let fixture = try Paths.fixture("scansion.json")
        let attempts: [ScansionAttempt] = try #require(fixture["attempts"]).decode()
        let stats = ScansionStats.byLine(attempts)
        for (id, expected) in try #require(fixture["stats"]?.objectValue) {
            let s = try #require(stats[id])
            #expect(s.attempts == expected["attempts"]?.intValue)
            #expect(s.bestAccuracy == expected["bestAccuracy"]?.doubleValue)
            #expect(s.lastAccuracy == expected["lastAccuracy"]?.doubleValue)
            #expect(s.mastered == expected["mastered"]?.boolValue)
        }
        for c in try #require(fixture["badgeCases"]?.arrayValue) {
            let a: [ScansionAttempt] = try #require(c["attempts"]).decode()
            let badges = ScansionStats.badges(a, poolSize: try #require(c["poolSize"]?.intValue))
            let expected = try #require(c["badges"]?.arrayValue)
            #expect(badges.map(\.id) == expected.compactMap { $0["id"]?.stringValue })
            #expect(badges.map(\.earned) == expected.compactMap { $0["earned"]?.boolValue })
            #expect(badges.map(\.detail) == expected.compactMap { $0["detail"]?.stringValue })
        }
    }

    @Test func corpusLoadsFromTheWebsitesFiles() throws {
        let dir = Paths.testsDir.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().appendingPathComponent("public/scansion")
        let corpus = try ScansionCorpus(directory: dir)
        #expect(corpus.index.total > 6000)
        let book1 = try corpus.loadBook(1)
        #expect(book1.count == corpus.index.books.first { $0.book == 1 }?.count)
        #expect(ScansionCorpus.parseLineId(book1[0].id)?.book == 1)
    }

    @Test func gradingFollowsTheWebRules() throws {
        let dir = Paths.testsDir.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().appendingPathComponent("public/scansion")
        let line = try #require(try ScansionCorpus(directory: dir).loadBook(1).first { !$0.syllables.contains(where: \.isElided) })
        var work = ScansionWork(line: line, draft: nil)
        // Mark every syllable correctly and rule the real boundaries.
        for (i, s) in line.syllables.enumerated() { work.setMark(i, s.quantity) }
        let metrical = work.metricalIndices
        for d in work.correctDivisions { work.toggleDivision(after: metrical[d]) }
        #expect(work.isReady)
        #expect(work.groups.compactMap(work.footName) == line.feet.map { $0 == "dactyl" ? "Dactyl" : "Spondee" })
        let score = work.score
        #expect(score.correct == score.total)
        // The last syllable is anceps: short is right there too.
        work.setMark(line.syllables.count - 1, "short")
        #expect(work.score.correct == score.total)
        // Claiming a false elision costs that junction and clears its mark.
        let junction = try #require(work.elidableIndices.first)
        work.toggleElision(junction)
        #expect(work.marks[junction] == nil)
        #expect(work.score.correct < score.total)
    }
}
