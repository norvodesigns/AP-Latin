import Foundation

/// What the watch face shows: the cards still to review, the streak and
/// the days to the exam. The watch app writes it to its app group whenever
/// its deck changes; the complications read it.
public struct WatchGlance: Codable, Sendable, Equatable {
    public var cardsLeft: Int
    public var streak: Int
    public var daysUntilExam: Int
    /// When the phone sent the deck these numbers come from.
    public var deckSentAt: Date

    public init(cardsLeft: Int, streak: Int, daysUntilExam: Int, deckSentAt: Date) {
        self.cardsLeft = cardsLeft
        self.streak = streak
        self.daysUntilExam = daysUntilExam
        self.deckSentAt = deckSentAt
    }

    public static let appGroup = "group.com.norvodesigns.lectio"
    static let key = "watchGlance"

    public static let placeholder = WatchGlance(cardsLeft: 12, streak: 5, daysUntilExam: 200, deckSentAt: Date())

    /// A deck from an earlier day: today's cards haven't arrived from the
    /// phone yet, so yesterday's count would mislead.
    public func isStale(now: Date = Date(), calendar: Calendar = .current) -> Bool {
        !calendar.isDate(deckSentAt, inSameDayAs: now)
    }

    /// Days to the exam as of `now`, counting down from when the deck was sent.
    public func daysUntilExam(now: Date = Date(), calendar: Calendar = .current) -> Int {
        let passed = calendar.dateComponents([.day], from: calendar.startOfDay(for: deckSentAt), to: calendar.startOfDay(for: now)).day ?? 0
        return max(0, daysUntilExam - max(0, passed))
    }

    public static func load(from defaults: UserDefaults? = UserDefaults(suiteName: appGroup)) -> WatchGlance? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(WatchGlance.self, from: data)
    }

    public func save(to defaults: UserDefaults? = UserDefaults(suiteName: WatchGlance.appGroup)) {
        if let data = try? JSONEncoder().encode(self) { defaults?.set(data, forKey: WatchGlance.key) }
    }
}
