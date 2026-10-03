import Foundation
import Testing
@testable import LectioCore

/// The adaptive path (Path.swift) against the web's src/lib/path.ts, through
/// the fixtures `npm run export:fixtures` writes.
@Suite struct PathParityTests {
    private func lessons() throws -> [PathLesson] {
        try #require(try Paths.fixture("path.json")["lessons"]).decode()
    }

    @Test func nextWordsMatchesTheWebApp() throws {
        let fixture = try Paths.fixture("path.json")
        #expect(fixture["knownInterval"]?.intValue == Path.knownInterval)
        let lessons = try lessons()
        for c in try #require(fixture["nextCases"]?.arrayValue) {
            var done: [String: Bool] = [:]
            for (id, value) in c["done"]?.objectValue ?? JSONObject() { done[id] = value.boolValue ?? true }
            var intervals: [String: Int] = [:]
            for (id, value) in c["vocab"]?.objectValue ?? JSONObject() { intervals[id] = value["interval"]?.intValue }
            let known = (c["knownUnits"]?.arrayValue ?? []).compactMap(\.stringValue)
            let next = Path.nextWords(lessons, done: done, intervals: intervals, knownUnits: known)
            #expect(next?.id == c["expected"]?.stringValue, "\(c["name"]?.stringValue ?? "")")
        }
    }

    @Test func lessonKnownMatchesTheWebApp() throws {
        for c in try #require(try Paths.fixture("path.json")["knownCases"]?.arrayValue) {
            let ids = (c["vocabIds"]?.arrayValue ?? []).compactMap(\.stringValue)
            var intervals: [String: Int] = [:]
            for (id, value) in c["vocab"]?.objectValue ?? JSONObject() { intervals[id] = value["interval"]?.intValue }
            #expect(Path.lessonKnown(ids, intervals: intervals) == c["expected"]?.boolValue)
        }
    }

    @Test func testOutMatchesTheWebApp() throws {
        let unit = try lessons().filter { $0.unitId == "v-1" }
        for c in try #require(try Paths.fixture("path.json")["testOutCases"]?.arrayValue) {
            let done = Set((c["done"]?.objectValue ?? JSONObject()).map(\.0))
            let deck = Set((c["vocab"]?.objectValue ?? JSONObject()).map(\.0))
            let out = Path.testOut(unit, done: done, inDeck: deck)
            #expect(out.lessonIds == (c["expected"]?["lessonIds"]?.arrayValue ?? []).compactMap(\.stringValue))
            #expect(out.vocabIds == (c["expected"]?["vocabIds"]?.arrayValue ?? []).compactMap(\.stringValue))
        }
    }

    @Test func datesAndKnownCardsMatchTheWebApp() throws {
        let fixture = try Paths.fixture("path.json")
        for c in try #require(fixture["dayCases"]?.arrayValue) {
            let iso = try #require(c["iso"]?.stringValue)
            let n = try #require(c["n"]?.intValue)
            #expect(Path.addDays(iso, n) == c["expected"]?.stringValue, "\(iso) + \(n)")
        }
        for c in try #require(fixture["cardCases"]?.arrayValue) {
            let index = try #require(c["index"]?.intValue)
            let card = Path.knownCard(id: "w\(index)", index: index, today: try #require(c["today"]?.stringValue))
            let expected = try #require(c["expected"])
            #expect(card.id == expected["id"]?.stringValue)
            #expect(card.ef == expected["ef"]?.doubleValue)
            #expect(card.interval == expected["interval"]?.intValue)
            #expect(card.repetitions == expected["repetitions"]?.intValue)
            #expect(card.due == expected["due"]?.stringValue)
            #expect(card.lapses == expected["lapses"]?.intValue)
            #expect(card.reviews == expected["reviews"]?.intValue)
        }
    }

    @Test func knownUnitsMatchTheWebApp() throws {
        for c in try #require(try Paths.fixture("path.json")["probeCases"]?.arrayValue) {
            let answers = (c["answers"]?.arrayValue ?? []).compactMap { a -> Placement.Answer? in
                guard let unit = a["unit"]?.stringValue, let right = a["right"]?.boolValue else { return nil }
                return Placement.Answer(unit: unit, right: right)
            }
            #expect(Path.knownVocabUnits(answers) == (c["expected"]?.arrayValue ?? []).compactMap(\.stringValue))
        }
    }

    @Test func aPassedTestCountsTheUnitAndSpreadsItsWords() throws {
        let now = try #require(ISO8601DateFormatter().date(from: "2026-10-15T12:00:00Z"))
        var doc = ProgressDocument.blank(now: now)
        doc.completeLesson("v-1-1", score: 0.8, vocabIds: ["a", "b", "c"], now: now)
        doc.passUnitTest(try lessons().filter { $0.unitId == "v-1" }, score: 0.9, now: now)
        // The lesson already done keeps its own record; the other is counted, untried.
        #expect(doc.lessons["v-1-1"]?.attempts == 1)
        #expect(doc.lessons["v-1-2"]?.attempts == 0)
        #expect(doc.lessons["v-1-2"]?.best == 0.9)
        #expect(doc.lessons["v-1-3"] == nil)
        // Words already in the deck are left alone; the new ones are known, spread out.
        #expect(doc.vocab["a"]?.interval == 0)
        #expect(doc.vocab["d"]?.interval == 10)
        #expect(doc.vocab["d"]?.due == "2026-10-16")
        #expect(doc.vocab["e"]?.due == "2026-10-17")
    }
}
