import LectioCore
import Observation
import SwiftUI
import WatchConnectivity
import WatchKit
import WidgetKit

/// Lectio on the wrist: the vocabulary cards due today, flipped and graded
/// with the same two answers as the phone. The iPhone owns the schedule —
/// it sends the due cards here and applies each grade sent back — so the
/// watch works offline and nothing is ever scheduled twice.
@main
struct LectioWatchApp: App {
    @State private var store = WatchStore()

    var body: some Scene {
        WindowGroup {
            WatchHome()
                .environment(store)
        }
    }
}

@Observable
final class WatchStore {
    private(set) var deck: WatchDeck?
    /// Card ids still to go this session, in order.
    var queue: [String] = []
    var reviewed = 0

    @ObservationIgnored private var link: WatchLink?

    init() {
        if UserDefaults.standard.bool(forKey: "seedDemo") {
            // Screenshots (`-seedDemo YES`): a morning's cards, no phone needed.
            receive(Self.sampleDeck)
        } else if let data = UserDefaults.standard.data(forKey: "deck"), let saved = try? JSONDecoder().decode(WatchDeck.self, from: data) {
            receive(saved)
        }
        link = WatchLink { [weak self] deck in
            Task { @MainActor in self?.receive(deck) }
        }
    }

    /// What the screenshots show: a few AP words, a streak, the exam ahead.
    static let sampleDeck = WatchDeck(
        cards: [
            .init(id: "amor", headword: "amor", lemma: "amor, amōris", pos: "noun, m.", definition: "love"),
            .init(id: "arma", headword: "arma", lemma: "arma, armōrum", pos: "noun, n. pl.", definition: "arms, weapons"),
            .init(id: "urbs", headword: "urbs", lemma: "urbs, urbis", pos: "noun, f.", definition: "city"),
            .init(id: "fātum", headword: "fātum", lemma: "fātum, fātī", pos: "noun, n.", definition: "fate, destiny"),
            .init(id: "pius", headword: "pius", lemma: "pius, pia, pium", pos: "adjective", definition: "dutiful, devoted"),
        ],
        dueCount: 12, streak: 5, daysUntilExam: 214
    )

    /// Cards missed this session. The phone reschedules a miss for tomorrow
    /// and drops it from the next deck it sends, but it still comes back once
    /// more before this session ends, so it's kept here until answered.
    @ObservationIgnored private var retry: [String: WatchDeck.Card] = [:]

    func card(_ id: String) -> WatchDeck.Card? { deck?.cards.first { $0.id == id } ?? retry[id] }

    func receive(_ deck: WatchDeck) {
        self.deck = deck
        if let data = try? JSONEncoder().encode(deck) { UserDefaults.standard.set(data, forKey: "deck") }
        // Keep the current session's order; add anything new at the end.
        let ids = deck.cards.map(\.id)
        queue = queue.filter { ids.contains($0) || retry[$0] != nil } + ids.filter { !queue.contains($0) }
        publish()
    }

    /// Tells the complications what's left.
    private func publish() {
        guard let deck else { return }
        WatchGlance(cardsLeft: queue.count, streak: deck.streak, daysUntilExam: deck.daysUntilExam, deckSentAt: deck.sentAt).save()
        WidgetCenter.shared.reloadAllTimelines()
    }

    func grade(_ id: String, quality: Int) {
        link?.send(WatchReview(cardId: id, quality: quality))
        reviewed += 1
        let graded = card(id)
        queue.removeAll { $0 == id }
        retry[id] = nil
        // A miss comes back at the end of this session, as on the phone.
        if quality < 3, let graded {
            retry[id] = graded
            queue.append(id)
        }
        publish()
    }
}

/// The watch's end of the phone link.
nonisolated final class WatchLink: NSObject, WCSessionDelegate, @unchecked Sendable {
    private let onDeck: @Sendable (WatchDeck) -> Void

    init(onDeck: @escaping @Sendable (WatchDeck) -> Void) {
        self.onDeck = onDeck
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Queued and delivered even if the phone is out of reach right now.
    func send(_ review: WatchReview) {
        guard WCSession.isSupported() else { return }
        WCSession.default.transferUserInfo(review.userInfo)
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: (any Error)?) {
        if let deck = WatchDeck(context: session.receivedApplicationContext) { onDeck(deck) }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        if let deck = WatchDeck(context: context) { onDeck(deck) }
    }
}

/* ------------------------------------------------------------------ */

struct WatchHome: View {
    @Environment(WatchStore.self) private var store
    /// `-watchScreen review` opens straight on a card (screenshots).
    @State private var reviewing = UserDefaults.standard.string(forKey: "watchScreen") == "review"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    if let deck = store.deck {
                        Text("\(deck.daysUntilExam)")
                            .font(.system(size: 40, weight: .semibold, design: .serif))
                            .foregroundStyle(.red)
                        Text("DAYS TO THE EXAM").font(.system(size: 10, weight: .semibold)).foregroundStyle(.secondary)
                        HStack {
                            Label("\(store.queue.count)", systemImage: "rectangle.on.rectangle.angled")
                            Spacer()
                            Label("\(deck.streak)", systemImage: "flame")
                        }
                        .font(.headline)
                        NavigationLink {
                            WatchReviewView()
                        } label: {
                            Text(store.queue.isEmpty ? "All caught up" : "Review").frame(maxWidth: .infinity)
                        }
                        .watchGlass(prominent: true)
                        .disabled(store.queue.isEmpty)
                    } else {
                        Text("Open Lectio on your iPhone to send today's cards.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Lectio")
            .navigationDestination(isPresented: $reviewing) { WatchReviewView() }
        }
    }
}

struct WatchReviewView: View {
    @Environment(WatchStore.self) private var store
    @State private var flipped = false

    var body: some View {
        if let id = store.queue.first, let card = store.card(id) {
            VStack(spacing: 8) {
                Spacer(minLength: 0)
                if flipped {
                    Text(card.lemma).font(.system(.headline, design: .serif)).italic().multilineTextAlignment(.center)
                    Text(card.definition).font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
                } else {
                    Text(card.headword).font(.system(.title2, design: .serif)).multilineTextAlignment(.center)
                    Text(card.pos).font(.caption2).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                if flipped {
                    HStack {
                        Button { grade(id, 0) } label: { Image(systemName: "arrow.counterclockwise") }
                            .watchGlass()
                            .accessibilityLabel("Practice again")
                        Button { grade(id, 4) } label: { Image(systemName: "checkmark") }
                            .watchGlass(prominent: true)
                            .accessibilityLabel("Got it")
                    }
                } else {
                    Button("Show") { withAnimation { flipped = true } }.watchGlass()
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { withAnimation { flipped.toggle() } }
            .navigationTitle("\(store.queue.count) left")
        } else {
            VStack(spacing: 6) {
                Image(systemName: "checkmark.seal").font(.largeTitle).foregroundStyle(.green)
                Text("\(store.reviewed) reviewed").font(.headline)
                Text("Synced to your iPhone.").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }

    private func grade(_ id: String, _ quality: Int) {
        store.grade(id, quality: quality)
        WKInterfaceDeviceFeedback.play(quality >= 3 ? .success : .retry)
        flipped = false
    }
}

/// Haptics, kept to one call site.
enum WKInterfaceDeviceFeedback {
    static func play(_ type: WKHapticType) { WKInterfaceDevice.current().play(type) }
}

private extension View {
    /// Glass buttons on watchOS 26 and later, the plain bordered ones before.
    @ViewBuilder
    func watchGlass(prominent: Bool = false) -> some View {
        if #available(watchOS 26.0, *) {
            if prominent { buttonStyle(.glassProminent) } else { buttonStyle(.glass) }
        } else {
            if prominent { buttonStyle(.borderedProminent) } else { buttonStyle(.bordered) }
        }
    }
}
