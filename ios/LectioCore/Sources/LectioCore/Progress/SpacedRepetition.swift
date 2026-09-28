import Foundation

/// SM-2 scheduling record for one vocabulary item — `VocabCard` in
/// src/store/useStore.ts, field for field.
public struct VocabCard: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    /// Ease factor, SM-2 default 2.5, floor 1.3.
    public var ef: Double
    /// Current inter-repetition interval in days.
    public var interval: Int
    /// Consecutive successful recalls.
    public var repetitions: Int
    /// ISO date (UTC, see `StudyDates`) the card is next due.
    public var due: String
    public var lapses: Int
    public var reviews: Int
    public var lastQuality: Int?
    public var lastReviewed: String?

    public init(id: String, ef: Double, interval: Int, repetitions: Int, due: String, lapses: Int, reviews: Int,
                lastQuality: Int? = nil, lastReviewed: String? = nil) {
        self.id = id
        self.ef = ef
        self.interval = interval
        self.repetitions = repetitions
        self.due = due
        self.lapses = lapses
        self.reviews = reviews
        self.lastQuality = lastQuality
        self.lastReviewed = lastReviewed
    }

    /// Reads a card straight from the synced document — the hot path, run for
    /// every card whenever the deck is shown, so it skips `JSONDecoder`.
    public init?(json: JSONValue) {
        guard let o = json.objectValue,
              let id = o["id"]?.stringValue,
              let due = o["due"]?.stringValue
        else { return nil }
        self.init(
            id: id,
            ef: o["ef"]?.doubleValue ?? 2.5,
            interval: o["interval"]?.intValue ?? 0,
            repetitions: o["repetitions"]?.intValue ?? 0,
            due: due,
            lapses: o["lapses"]?.intValue ?? 0,
            reviews: o["reviews"]?.intValue ?? 0,
            lastQuality: o["lastQuality"]?.intValue,
            lastReviewed: o["lastReviewed"]?.stringValue
        )
    }

    /// A card never reviewed, due today — the web's `newCard`.
    public static func new(id: String, now: Date = Date()) -> VocabCard {
        VocabCard(id: id, ef: 2.5, interval: 0, repetitions: 0, due: StudyDates.today(now), lapses: 0, reviews: 0)
    }
}

public enum SpacedRepetition {
    /// SM-2 (Piotr Wozniak). `quality` is 0–5; below 3 counts as a lapse and
    /// restarts the interval while keeping a reduced ease factor. A line-for-
    /// line port of the web's `sm2`, checked against it by the parity fixtures.
    public static func review(_ card: VocabCard, quality: Int, now: Date = Date(), calendar: Calendar = .current) -> VocabCard {
        let q = max(0, min(5, quality))
        var ef = card.ef
        var interval = card.interval
        var repetitions = card.repetitions
        var lapses = card.lapses

        let miss = Double(5 - q)
        ef = ef + (0.1 - miss * (0.08 + miss * 0.02))
        if ef < 1.3 { ef = 1.3 }

        if q < 3 {
            repetitions = 0
            interval = 1
            lapses += 1
        } else {
            repetitions += 1
            if repetitions == 1 {
                interval = 1
            } else if repetitions == 2 {
                interval = 6
            } else {
                // Math.round: halves round up, which for a positive product is
                // the same as rounding away from zero.
                interval = Int((Double(interval) * ef).rounded(.toNearestOrAwayFromZero))
            }
        }

        var next = card
        next.ef = ef
        next.interval = interval
        next.repetitions = repetitions
        next.lapses = lapses
        next.due = StudyDates.isoDay(StudyDates.adding(days: interval, to: now, calendar: calendar))
        next.reviews = card.reviews + 1
        next.lastQuality = q
        next.lastReviewed = StudyDates.today(now)
        return next
    }

    /// Cards due on or before `day`, most overdue first, hardest first within a
    /// day — the web's `dueVocab`.
    public static func due(_ cards: some Sequence<VocabCard>, on day: String) -> [VocabCard] {
        cards.filter { $0.due <= day }.sorted { a, b in
            a.due != b.due ? a.due < b.due : a.ef < b.ef
        }
    }
}
