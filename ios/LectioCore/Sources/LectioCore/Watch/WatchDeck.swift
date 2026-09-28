import Foundation

/// What the iPhone sends the Apple Watch: the cards due now, enough of each
/// to show both faces, and the headline numbers. Plain property-list values
/// so it travels as a WatchConnectivity application context.
public struct WatchDeck: Codable, Sendable, Equatable {
    public struct Card: Codable, Sendable, Equatable, Identifiable {
        public let id: String
        public let headword: String
        public let lemma: String
        public let pos: String
        public let definition: String

        public init(id: String, headword: String, lemma: String, pos: String, definition: String) {
            self.id = id
            self.headword = headword
            self.lemma = lemma
            self.pos = pos
            self.definition = definition
        }
    }

    public var cards: [Card]
    public var dueCount: Int
    public var streak: Int
    public var daysUntilExam: Int
    public var sentAt: Date

    public init(cards: [Card], dueCount: Int, streak: Int, daysUntilExam: Int, sentAt: Date = Date()) {
        self.cards = cards
        self.dueCount = dueCount
        self.streak = streak
        self.daysUntilExam = daysUntilExam
        self.sentAt = sentAt
    }

    /// The most a single context carries; the watch asks for more by finishing these.
    public static let maxCards = 60

    public var context: [String: Any] {
        guard let data = try? JSONEncoder().encode(self) else { return [:] }
        return ["deck": data]
    }

    public init?(context: [String: Any]) {
        guard let data = context["deck"] as? Data, let deck = try? JSONDecoder().decode(WatchDeck.self, from: data) else { return nil }
        self = deck
    }
}

/// A grade made on the watch, sent back to the phone to apply with SM-2 at
/// the moment it was made.
public struct WatchReview: Codable, Sendable, Equatable {
    public let cardId: String
    public let quality: Int
    public let at: Date

    public init(cardId: String, quality: Int, at: Date = Date()) {
        self.cardId = cardId
        self.quality = quality
        self.at = at
    }

    public var userInfo: [String: Any] {
        guard let data = try? JSONEncoder().encode(self) else { return [:] }
        return ["review": data]
    }

    public init?(userInfo: [String: Any]) {
        guard let data = userInfo["review"] as? Data, let r = try? JSONDecoder().decode(WatchReview.self, from: data) else { return nil }
        self = r
    }
}
