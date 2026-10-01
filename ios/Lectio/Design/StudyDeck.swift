import SwiftUI

/// A one-at-a-time flip-and-rate study session over reference cards — the
/// web's FlashcardDeck, shared by Grammar, Context & Culture and Literary
/// Devices. No spaced repetition here (that's Vocabulary's): "Practice
/// again" just sends the card to the back of this session's queue.
struct StudyDeck<Item: Identifiable, Front: View, Back: View>: View where Item.ID == String {
    @Environment(AppModel.self) private var model
    let items: [Item]
    let noun: String
    @ViewBuilder let front: (Item) -> Front
    @ViewBuilder let back: (Item) -> Back

    @State private var queue: [String] = []
    @State private var cursor = 0
    @State private var shown = false
    @State private var done = 0

    var body: some View {
        let byId = Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        VStack(spacing: 20) {
            if cursor < queue.count, let item = byId[queue[cursor]] {
                HStack {
                    Text("\(queue.count - cursor) left · \(done) done").quietLabel()
                    Spacer()
                    Button("Reshuffle", systemImage: "shuffle", action: reset).font(.subheadline)
                }
                card(item)
                    .id(queue[cursor] + "\(cursor)")
                    .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
                controls
            } else if !queue.isEmpty {
                VStack(spacing: 14) {
                    Image(systemName: "checkmark.seal").font(.system(size: 48)).foregroundStyle(Palette.correct)
                    Text("Every \(noun) done").font(.system(.title2, design: .serif))
                    Button("Go again", action: reset).glassButton(prominent: true)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            }
        }
        .onAppear { if queue.isEmpty { reset() } }
    }

    private func card(_ item: Item) -> some View {
        ScrollView {
            Group {
                if shown { back(item) } else { front(item) }
            }
            .frame(maxWidth: .infinity, alignment: shown ? .leading : .center)
            .padding(24)
        }
        .frame(minHeight: 260, maxHeight: 520)
        .background(Palette.slip, in: .rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Palette.rule, lineWidth: 0.5))
        .shadow(color: .black.opacity(0.07), radius: 16, y: 6)
        .contentShape(Rectangle())
        .onTapGesture { withAnimation(.spring(duration: 0.35)) { shown.toggle() } }
        .accessibilityAddTraits(.isButton)
        .accessibilityHint(shown ? "" : "Double-tap to turn the card over")
    }

    private var controls: some View {
        GlassGroup(spacing: 14) {
            if shown {
                HStack(spacing: 14) {
                    Button { grade(again: true) } label: {
                        Label("Practice again", systemImage: "arrow.counterclockwise").frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton()
                    Button { grade(again: false) } label: {
                        Label("Got it", systemImage: "checkmark").frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton(prominent: true)
                }
            } else {
                Button { withAnimation(.spring(duration: 0.35)) { shown = true } } label: {
                    Label("Turn over", systemImage: "arrow.turn.up.right").frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassButton()
            }
        }
        .font(.headline)
        .sensoryFeedback(.impact(weight: .light), trigger: done)
    }

    private func grade(again: Bool) {
        let id = queue[cursor]
        done += 1
        if done == 1 { model.update { $0.markStudied() } }
        withAnimation(.spring(duration: 0.4)) {
            if again { queue.append(id) }
            cursor += 1
            shown = false
        }
    }

    private func reset() {
        queue = items.map(\.id).shuffled()
        cursor = 0
        shown = false
        done = 0
    }
}
