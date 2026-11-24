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

    @Test func historyMatchesTheWebApp() throws {
        let fixture = try Paths.fixture("scansion.json")
        for c in try #require(fixture["results"]?.arrayValue) {
            let name = c["name"]?.stringValue ?? ""
            let packed: ScansionCorpus.PackedLine = try #require(c["packed"]).decode()
            let line = ScansionCorpus.unpack(book: try #require(c["book"]?.intValue), packed)
            let given = try #require(c["work"])
            let marks: [String?] = try #require(given["marks"]).decode()
            let draft = ScansionDraft(marks: marks, divisions: try #require(given["divisions"]).decode(), checked: true,
                                      elisions: try #require(given["elisions"]).decode())
            let work = ScansionWork(line: line, draft: draft)
            // What an attempt keeps.
            let stored = try #require(c["stored"])
            #expect(ScansionHistory.packMarks(work.marks) == stored["marks"]?.stringValue, "\(name): packed marks")
            #expect(ScansionHistory.unpackMarks(ScansionHistory.packMarks(work.marks)) == work.marks, "\(name): round trip")
            // The score.
            let score = try #require(c["score"])
            let s = work.score
            #expect([s.syllables, s.syllablesTotal, s.boundaries, s.boundariesTotal, s.elisions, s.elisionsTotal, s.correct, s.total]
                == ["syllables", "syllablesTotal", "boundaries", "boundariesTotal", "elisions", "elisionsTotal", "correct", "total"]
                .map { score[$0]?.intValue ?? -1 }, "\(name): score")
            let results = try #require(c["syllables"]?.arrayValue).compactMap(\.stringValue)
            #expect(line.syllables.indices.map { i -> String in
                switch work.result(i) { case .ok: "ok"; case .wrong: "wrong"; case .blank: "blank"; case .wrongElision: "wrong-elision" }
            } == results, "\(name): per syllable")
            // The answer.
            let answer = ScansionWork.answer(for: line)
            let expected = try #require(c["answer"])
            #expect(answer.marks == (try #require(expected["marks"]).decode() as [String?]), "\(name): answer marks")
            #expect(answer.divisions == (try #require(expected["divisions"]).decode() as [Int]), "\(name): answer feet")
            #expect(answer.elisions.sorted() == (try #require(expected["elisions"]).decode() as [Int]), "\(name): answer elisions")
            #expect(answer.score.correct == answer.score.total, "\(name): the answer scores full marks")
            #expect(line.syllables.indices.map(work.explainQuantity)
                == (try #require(c["explanations"]).decode() as [String]), "\(name): explanations")
        }
        for c in try #require(fixture["recovery"]?.arrayValue) {
            let name = c["name"]?.stringValue ?? ""
            let packed: ScansionCorpus.PackedLine = try #require(c["packed"]).decode()
            let line = ScansionCorpus.unpack(book: try #require(c["book"]?.intValue), packed)
            let attempt: ScansionAttempt = try #require(c["attempt"]).decode()
            let draft: ScansionDraft? = try c["draft"].map { try $0.decode() }
            let got = ScansionWork.reviewed(attempt, line: line, latestOnLine: c["latestOnLine"]?.boolValue ?? false, draft: draft)
            if let expected = c["expected"], expected != .null {
                let work = try #require(got, "\(name): expected the work")
                #expect(work.checked)
                #expect(work.marks == (try #require(expected["marks"]).decode() as [String?]), "\(name)")
                #expect(work.divisions == (try #require(expected["divisions"]).decode() as [Int]), "\(name)")
                #expect(work.elisions.sorted() == (try #require(expected["elisions"]).decode() as [Int]), "\(name)")
            } else {
                #expect(got == nil, "\(name): expected nothing")
            }
        }
    }

    @Test func attemptsKeepTheirWork() throws {
        var doc = ProgressDocument.blank()
        let packed: ScansionCorpus.PackedLine = try #require(Paths.fixture("scansion.json")["recovery"]?.arrayValue?.first?["packed"]).decode()
        let line = ScansionCorpus.unpack(book: 1, packed)
        let answer = ScansionWork.answer(for: line)
        doc.recordScansion(lineId: line.id, correct: 3, total: 4, work: answer)
        doc.recordScansion(lineId: line.id, correct: 1, total: 4)
        let attempts = doc.scansionAttempts
        #expect(attempts.count == 2)
        #expect(attempts[0].marks == ScansionHistory.packMarks(answer.marks))
        #expect(attempts[0].divisions == answer.divisions)
        #expect(attempts[0].elisions == answer.elisions.sorted())
        #expect(attempts[1].marks == nil)
        // Without the work, nothing about it is written.
        #expect(doc.raw.array("scansionAttempts")[1]["marks"] == nil)
        // A field in some other shape costs only that field.
        let odd: ScansionAttempt = try JSONValue.object(JSONObject([("id", "x"), ("lineId", "l"), ("at", "t"), ("correct", 1),
                                                                    ("total", 2), ("marks", [])])).decode()
        #expect(odd.marks == nil && odd.total == 2)
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
