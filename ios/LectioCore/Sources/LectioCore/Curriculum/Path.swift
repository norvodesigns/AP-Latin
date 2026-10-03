import Foundation

/// A vocabulary lesson as `Path` reads it (the web's `PathLesson`).
public struct PathLesson: Sendable, Hashable, Decodable {
    public let id: String
    public let unitId: String
    /// The AP-list words it teaches.
    public let vocabIds: [String]
    /// A unit test.
    public let test: Bool

    public init(id: String, unitId: String, vocabIds: [String], test: Bool) {
        self.id = id
        self.unitId = unitId
        self.vocabIds = vocabIds
        self.test = test
    }
}

/// The adaptive part of the course: what to study next in the vocabulary
/// track, and what a passed unit test does. A line-for-line port of the web's
/// `src/lib/path.ts`, checked against fixtures its functions produce.
///
/// The vocabulary track adapts to what the student already knows: a lesson
/// whose every word is already well known is passed over; a unit the level
/// check found probably known is offered as its unit test first; and a
/// passed unit test counts the unit's lessons as done and puts their words in
/// the deck as known, spread over three weeks.
public enum Path {
    /// A card at least this many days between reviews counts as well known.
    public static let knownInterval = 21
    /// How many days a passed test's known words are spread over.
    public static let knownSpreadDays = 21

    /// Whether every word a lesson teaches is already well known. A lesson
    /// with no words (a unit test) never is.
    public static func lessonKnown(_ vocabIds: [String], intervals: [String: Int]) -> Bool {
        !vocabIds.isEmpty && vocabIds.allSatisfy { (intervals[$0] ?? 0) >= knownInterval }
    }

    /// The vocabulary lesson to do next, or nil when there's nothing left.
    /// The first lesson not done and not already known, except that in a
    /// unit the level check found probably known, the unit test comes first
    /// while it hasn't been taken. Unit tests are otherwise never next.
    public static func nextWords(_ lessons: [PathLesson], done: [String: Bool], intervals: [String: Int], knownUnits: [String] = []) -> PathLesson? {
        for lesson in lessons {
            if done[lesson.id] == true || lesson.test { continue }
            if knownUnits.contains(lesson.unitId),
               let test = lessons.first(where: { $0.unitId == lesson.unitId && $0.test }),
               done[test.id] != true {
                return test
            }
            if lessonKnown(lesson.vocabIds, intervals: intervals) { continue }
            return lesson
        }
        return nil
    }

    /// Whether a unit-test score passes.
    public static func testPassed(_ score: Double, pass: Double = testPass) -> Bool { score >= pass }

    /// The share of a unit test to get right to pass it (the web's
    /// `VERBA_TEST_PASS`).
    public static let testPass = 0.85

    /// What passing a unit test does: the unit's lessons not yet done, to
    /// count as done, and its words not yet in the deck, to add as known.
    public static func testOut(_ unitLessons: [PathLesson], done: Set<String>, inDeck: Set<String>) -> (lessonIds: [String], vocabIds: [String]) {
        let lessonIds = unitLessons.filter { !$0.test && !done.contains($0.id) }.map(\.id)
        var seen = Set<String>()
        var vocabIds: [String] = []
        for lesson in unitLessons {
            for id in lesson.vocabIds where !inDeck.contains(id) && !seen.contains(id) {
                seen.insert(id)
                vocabIds.append(id)
            }
        }
        return (lessonIds, vocabIds)
    }

    /// The ISO day `n` days after `iso` (both YYYY-MM-DD, counted in UTC).
    public static func addDays(_ iso: String, _ n: Int) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let date = calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])),
              let moved = calendar.date(byAdding: .day, value: n, to: date) else { return iso }
        let c = calendar.dateComponents([.year, .month, .day], from: moved)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// A word shown to be known: a card ten days into its schedule, the
    /// `index`-th of the batch due on day 1 + index mod 21.
    public static func knownCard(id: String, index: Int, today: String) -> VocabCard {
        VocabCard(id: id, ef: 2.5, interval: 10, repetitions: 2, due: addDays(today, 1 + index % knownSpreadDays), lapses: 0, reviews: 0)
    }

    /// The level check's vocabulary questions, answered: the units whose
    /// two words were both known, in the order they were first asked.
    public static func knownVocabUnits(_ answers: [Placement.Answer]) -> [String] {
        var order: [String] = []
        var rights: [String: [Bool]] = [:]
        for a in answers {
            if rights[a.unit] == nil { order.append(a.unit) }
            rights[a.unit, default: []].append(a.right)
        }
        return order.filter { unit in
            let r = rights[unit] ?? []
            return !r.isEmpty && r.allSatisfy { $0 }
        }
    }
}
