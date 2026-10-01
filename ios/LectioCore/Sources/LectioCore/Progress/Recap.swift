import Foundation

/// The week in review — the web's `src/lib/recap.ts`: what a student did in
/// the last seven days beside the seven before, counted from progress that
/// already syncs. Days follow the store's convention (the UTC date, see
/// `StudyDates`), as study days and streaks do. Held to the web by a parity
/// fixture. Study time is left out: minutes are kept per device, not synced.
public struct RecapCounts: Sendable, Equatable {
    /// Days with any study.
    public var days = 0
    /// Course lessons finished for the first time.
    public var lessons = 0
    /// Quiz questions answered, and how many right.
    public var quiz = 0
    public var quizRight = 0
    /// Flashcards last reviewed in the window.
    public var cards = 0
    public var sententiae = 0
    public var scansion = 0
    public var translations = 0

    /// Nothing at all happened.
    public var isQuiet: Bool {
        [days, lessons, quiz, quizRight, cards, sententiae, scansion, translations].allSatisfy { $0 == 0 }
    }
}

public struct Recap: Sendable, Equatable {
    /// First and last day of the week, inclusive.
    public let from: String
    public let to: String
    public let week: RecapCounts
    /// The seven days before.
    public let before: RecapCounts

    public static func of(_ doc: ProgressDocument, today: String = StudyDates.today()) -> Recap {
        let from = Daily.shift(today, by: -6)
        return Recap(
            from: from,
            to: today,
            week: counts(doc, from: from, to: today),
            before: counts(doc, from: Daily.shift(today, by: -13), to: Daily.shift(today, by: -7))
        )
    }

    /// Reads the raw JSON rather than decoding every record, like `Laurels`.
    static func counts(_ doc: ProgressDocument, from: String, to: String) -> RecapCounts {
        func inside(_ at: String?) -> Bool {
            guard let at, at.count >= 10 else { return false }
            let day = String(at.prefix(10))
            return day >= from && day <= to
        }
        let quiz = doc.raw.array("quizAttempts").filter { inside($0["at"]?.stringValue) }
        var c = RecapCounts()
        c.days = Set(doc.studyDays.filter { inside($0) }).count
        c.lessons = doc.lessons.values.filter { inside($0.completedAt) }.count
        c.quiz = quiz.count
        c.quizRight = quiz.filter { $0["correct"]?.boolValue == true }.count
        c.cards = doc.raw.object("vocab").filter { inside($0.value["lastReviewed"]?.stringValue) }.count
        c.sententiae = doc.daily.keys.filter { inside($0) }.count
        c.scansion = doc.raw.array("scansionAttempts").filter { inside($0["at"]?.stringValue) }.count
        c.translations = doc.raw.array("translationAttempts").filter { inside($0["at"]?.stringValue) }.count
        return c
    }
}
