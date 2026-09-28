import Foundation
import LectioCore
import WatchConnectivity

/// The iPhone's end of the Apple Watch link. Sends the watch the cards that
/// are due, and hands every grade the watch sends back to the app, which
/// applies it with the same SM-2 port as everything else.
///
/// WatchConnectivity calls its delegate on a background queue, so this class
/// is nonisolated and hops to the main actor for anything touching the model.
nonisolated final class WatchBridge: NSObject, WCSessionDelegate, @unchecked Sendable {
    private let onReview: @Sendable (WatchReview) -> Void
    private let onActivate: @Sendable () -> Void

    init(onReview: @escaping @Sendable (WatchReview) -> Void, onActivate: @escaping @Sendable () -> Void) {
        self.onReview = onReview
        self.onActivate = onActivate
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Replaces the watch's deck. A newer context supersedes an undelivered older one.
    func send(_ deck: WatchDeck) {
        let session = WCSession.default
        guard WCSession.isSupported(), session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
        try? session.updateApplicationContext(deck.context)
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: (any Error)?) {
        if state == .activated { onActivate() }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        // Switching to a different watch: reactivate for the new one.
        session.activate()
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        if let review = WatchReview(userInfo: userInfo) { onReview(review) }
    }
}

extension AppModel {
    /// Starts the watch link. Called once at launch.
    func startWatchBridge() {
        guard watchBridge == nil else { return }
        watchBridge = WatchBridge(
            onReview: { [weak self] review in
                Task { @MainActor in self?.applyWatchReview(review) }
            },
            onActivate: { [weak self] in
                Task { @MainActor in self?.sendWatchDeck(force: true) }
            }
        )
    }

    /// A grade from the wrist, applied as of when it was made.
    func applyWatchReview(_ review: WatchReview) {
        update {
            $0.reviewVocab(review.cardId, quality: review.quality, now: review.at)
            $0.markStudied(now: review.at)
        }
    }

    /// Sends the current due cards to the watch when they've changed.
    func sendWatchDeck(force: Bool = false) {
        guard let bridge = watchBridge, let library = content else { return }
        let due = SpacedRepetition.due(vocab.values, on: StudyDates.today())
        let cards = due.prefix(WatchDeck.maxCards).compactMap { card -> WatchDeck.Card? in
            guard let entry = library.vocab(card.id) else { return nil }
            return WatchDeck.Card(id: entry.id, headword: entry.headword, lemma: entry.lemma, pos: entry.pos, definition: entry.definition)
        }
        let deck = WatchDeck(cards: cards, dueCount: due.count, streak: Streaks.current(progress.studyDays),
                             daysUntilExam: Streaks.daysUntilExam(library.meta.examDate))
        var comparable = deck
        comparable.sentAt = lastWatchDeck?.sentAt ?? deck.sentAt
        guard force || comparable != lastWatchDeck else { return }
        lastWatchDeck = deck
        bridge.send(deck)
    }
}
