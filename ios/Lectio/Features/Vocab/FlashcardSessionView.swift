import LectioCore
import SwiftUI

/// One review session.
///
/// Same two answers as the web: "Practice again" (SM-2 quality 0 — the card
/// comes back later this session and tomorrow) and "Got it" (quality 4).
/// Asking a student to split hairs between Hard and Good the instant they
/// see a word measured their mood more than their memory.
struct FlashcardSessionView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss
    let session: VocabSession

    @State private var queue: [String] = []
    @State private var reviewed = 0
    @State private var flipped = false
    @State private var started = false
    @Namespace private var glass

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if let id = queue.first, let entry = library?.vocab(id) {
                    HStack {
                        Text("\(queue.count) to go").quietLabel()
                        Spacer()
                        if let card = model.vocab[id] {
                            Text(card.reviews > 0 ? "Seen \(card.reviews)× · EF \(card.ef.formatted(.number.precision(.fractionLength(2))))" : "New card")
                                .quietLabel()
                        }
                    }
                    Spacer(minLength: 0)
                    CardFace(entry: entry, direction: session.direction, context: contextLine(for: entry), derivatives: library?.derivatives[entry.id] ?? [], flipped: flipped)
                        .onTapGesture { withAnimation(.spring(duration: 0.45)) { flipped.toggle() } }
                        .id(id + "\(reviewed)")
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
            queue = session.queue
            started = true
            model.update { $0.markStudied() }
        }
    }

    @ViewBuilder
    private func controls(for id: String) -> some View {
        GlassGroup(spacing: 16) {
            if flipped {
                HStack(spacing: 16) {
                    Button { grade(id, quality: 0) } label: {
                        Label("Practice again", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton()
                    .lectioGlassID("again", in: glass)
                    .keyboardShortcut("1", modifiers: [])

                    Button { grade(id, quality: 4) } label: {
                        Label("Got it", systemImage: "checkmark")
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton(prominent: true)
                    .lectioGlassID("got", in: glass)
                    .keyboardShortcut("2", modifiers: [])
                }
            } else {
                Button {
                    withAnimation(.spring(duration: 0.45)) { flipped = true }
                } label: {
                    Label("Show answer", systemImage: "eye")
                        .frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassButton()
                .lectioGlassID("got", in: glass)
                .keyboardShortcut(.space, modifiers: [])
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
            Text("Session complete").font(.system(.title, design: .serif))
            Text("\(reviewed) review\(reviewed == 1 ? "" : "s"). The next ones are scheduled.")
                .font(.prose(.callout))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
            Button("Done") { dismiss() }
                .glassButton(prominent: true)
                .padding(.top, 8)
        }
        .frame(maxHeight: .infinity)
    }

    private func grade(_ id: String, quality: Int) {
        model.update { $0.reviewVocab(id, quality: quality) }
        reviewed += 1
        withAnimation(.spring(duration: 0.4)) {
            flipped = false
            queue.removeFirst()
            // A miss comes back at the end of this session, as on the web.
            if quality < 3 { queue.append(id) }
        }
    }

    /// A line from the readings where this very word occurs — found through
    /// the pre-resolved glossary, so it's the word itself, not a lookalike.
    private func contextLine(for entry: VocabEntry) -> (latin: String, citation: String)? {
        guard session.direction == .context, let library else { return nil }
        for passage in library.passages {
            for line in passage.lines where line.tokens.contains(where: { $0.glosses.first?.id == entry.id && $0.glosses.first?.isExact == true }) {
                return (line.latin, passage.isPoetry ? "\(passage.citation) (\(line.n))" : "\(passage.citation).\(line.n)")
            }
        }
        return nil
    }
}

/// A card is content — a slip of parchment, not glass.
private struct CardFace: View {
    let entry: VocabEntry
    let direction: VocabDirection
    let context: (latin: String, citation: String)?
    /// English words from this one, from the course.
    let derivatives: [String]
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
        .accessibilityLabel(flipped ? "\(entry.lemma). \(entry.definition)" + (derivatives.isEmpty ? "" : ". English: \(derivatives.joined(separator: ", "))") : frontLabel)
        .accessibilityHint(flipped ? "" : "Double-tap to show the answer")
        .accessibilityAddTraits(.isButton)
    }

    private var frontLabel: String {
        switch direction {
        case .laEn: entry.headword
        case .enLa: entry.definition
        case .context: context.map { "\($0.latin). Which meaning of \(entry.headword) fits?" } ?? entry.headword
        }
    }

    @ViewBuilder
    private var front: some View {
        VStack(spacing: 12) {
            switch direction {
            case .laEn:
                Text(entry.headword).font(.latin(44, relativeTo: .largeTitle)).multilineTextAlignment(.center)
                Text(entry.pos).quietLabel()
            case .enLa:
                Text(entry.definition).font(.prose(.title2)).multilineTextAlignment(.center)
                Text(entry.pos).quietLabel()
            case .context:
                if let context {
                    Text(context.citation).quietLabel()
                    Text(context.latin).font(.latin(22)).multilineTextAlignment(.center)
                    Text("Which meaning of \(Text(entry.headword).italic().foregroundStyle(Palette.rubric)) fits this line?")
                        .font(.footnote).foregroundStyle(Palette.inkMuted)
                } else {
                    Text(entry.headword).font(.latin(44, relativeTo: .largeTitle))
                    Text(entry.pos).quietLabel()
                }
            }
        }
        .foregroundStyle(Palette.ink)
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
            if !derivatives.isEmpty {
                Text("English: \(derivatives.joined(separator: ", "))")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
                    .multilineTextAlignment(.center)
            }
        }
    }
}
