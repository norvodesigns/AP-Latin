import LectioCore
import SwiftUI

/// One review session over the cards due today.
///
/// Same two answers as the web: "Practice again" (SM-2 quality 0 — the card
/// comes back later this session and tomorrow) and "Got it" (quality 4).
/// Asking a student to split hairs between Hard and Good the instant they
/// see a word measured their mood more than their memory.
struct FlashcardSessionView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss

    @State private var queue: [String] = []
    @State private var reviewed = 0
    @State private var flipped = false
    @State private var started = false
    @Namespace private var glass

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                if let id = queue.first, let entry = library?.vocab(id) {
                    Text("\(queue.count) to go").quietLabel()
                    Spacer(minLength: 0)
                    CardFace(entry: entry, flipped: flipped)
                        .onTapGesture { withAnimation(.spring(duration: 0.45)) { flipped.toggle() } }
                        .id(id)
                        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                                removal: .move(edge: .leading).combined(with: .opacity)))
                    Spacer(minLength: 0)
                    controls(for: id)
                } else if started {
                    finished
                }
            }
            .padding(20)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done", systemImage: "xmark") { dismiss() }
                }
            }
        }
        .onAppear {
            guard !started else { return }
            queue = SpacedRepetition.due(model.vocab.values, on: StudyDates.today()).map(\.id)
            started = true
        }
    }

    @ViewBuilder
    private func controls(for id: String) -> some View {
        GlassEffectContainer(spacing: 16) {
            if flipped {
                HStack(spacing: 16) {
                    Button { grade(id, quality: 0) } label: {
                        Label("Practice again", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.glass)
                    .glassEffectID("again", in: glass)

                    Button { grade(id, quality: 4) } label: {
                        Label("Got it", systemImage: "checkmark")
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .glassEffectID("got", in: glass)
                }
            } else {
                Button {
                    withAnimation(.spring(duration: 0.45)) { flipped = true }
                } label: {
                    Label("Show meaning", systemImage: "eye")
                        .frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glass)
                .glassEffectID("got", in: glass)
            }
        }
        .font(.headline)
        .sensoryFeedback(.impact(weight: .light), trigger: reviewed)
    }

    private var finished: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.seal")
                .font(.system(size: 56))
                .foregroundStyle(Palette.correct)
            Text(reviewed == 0 ? "Nothing due right now" : "Session complete")
                .font(.system(.title, design: .serif))
            Text(reviewed == 0 ? "Look words up in the Reading Room, or add a unit, and they'll appear here."
                               : "\(reviewed) review\(reviewed == 1 ? "" : "s"). The next ones are scheduled.")
                .font(.prose(.callout))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
            Button("Done") { dismiss() }
                .buttonStyle(.glassProminent)
                .padding(.top, 8)
        }
        .frame(maxHeight: .infinity)
    }

    private func grade(_ id: String, quality: Int) {
        model.update {
            $0.reviewVocab(id, quality: quality)
            $0.markStudied()
        }
        reviewed += 1
        withAnimation(.spring(duration: 0.4)) {
            flipped = false
            queue.removeFirst()
            // A miss comes back at the end of this session, as on the web.
            if quality < 3 { queue.append(id) }
        }
    }
}

/// A card is content — a slip of parchment, not glass.
private struct CardFace: View {
    let entry: VocabEntry
    let flipped: Bool

    var body: some View {
        ZStack {
            front.opacity(flipped ? 0 : 1)
            back.opacity(flipped ? 1 : 0).rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
        }
        .frame(maxWidth: .infinity, minHeight: 300)
        .padding(28)
        .background(Palette.slip, in: .rect(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(Palette.rule, lineWidth: 0.5))
        .shadow(color: .black.opacity(0.08), radius: 18, y: 8)
        .rotation3DEffect(.degrees(flipped ? 180 : 0), axis: (x: 0, y: 1, z: 0), perspective: 0.6)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(flipped ? "\(entry.lemma). \(entry.definition)" : entry.headword)
        .accessibilityHint(flipped ? "" : "Double-tap to show the meaning")
        .accessibilityAddTraits(.isButton)
    }

    private var front: some View {
        VStack(spacing: 10) {
            Text(entry.headword)
                .font(.latin(44, relativeTo: .largeTitle))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
            Text(entry.pos).quietLabel()
        }
    }

    private var back: some View {
        VStack(spacing: 14) {
            Text(entry.lemma)
                .font(.latinItalic(24, relativeTo: .title2))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
            Hairline(color: Palette.redLine).frame(width: 60)
            Text(entry.definition)
                .font(.prose(.title3))
                .foregroundStyle(Palette.ink2)
                .multilineTextAlignment(.center)
        }
    }
}
