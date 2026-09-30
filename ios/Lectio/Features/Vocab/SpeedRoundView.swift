import LectioCore
import SwiftUI

/// Speed round — the web's /vocab/speed: a minute to match as many Latin
/// words to their meanings as possible, five pairs to a board. A wrong pair
/// costs two seconds and lists the word at the end, with a button to put
/// the missed words into the flashcards.
struct SpeedRoundView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss

    private enum Phase { case ready, play, done }
    nonisolated enum Scope: Hashable { case deck, all, unit(String) }

    @State private var phase = Phase.ready
    @State private var scope: Scope?
    @State private var left: [SpeedRound.Word] = []
    @State private var right: [SpeedRound.Word] = []
    @State private var matched: Set<String> = []
    @State private var pickL: String?
    @State private var pickR: String?
    @State private var flash: (ids: [String], ok: Bool)?
    @State private var score = 0
    @State private var misses = 0
    @State private var missed: [SpeedRound.Word] = []
    @State private var deadline = Date()
    @State private var now = Date()
    @State private var newBest = false
    @State private var added = false

    /// Fewer words than this and a round keeps dealing the same boards.
    private static let minPool = 10

    private var chosen: Scope { scope ?? (model.vocab.count >= Self.minPool * 2 ? .deck : .all) }

    private var pool: [SpeedRound.Word] {
        guard let library else { return [] }
        switch chosen {
        case .deck:
            let ids = Set(model.vocab.keys)
            return SpeedRound.words((library.coreVocabulary + library.supplementaryVocabulary).filter { ids.contains($0.id) })
        case .all:
            return SpeedRound.words(library.coreVocabulary)
        case .unit(let u):
            return SpeedRound.words(library.coreVocabulary.filter { $0.units.contains(u) })
        }
    }

    private var bestKey: String {
        switch chosen {
        case .deck: "speedBest.deck"
        case .all: "speedBest.all"
        case .unit(let u): "speedBest.unit\(u)"
        }
    }

    private var remaining: TimeInterval { max(0, deadline.timeIntervalSince(now)) }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .ready: ready
                case .play: board
                case .done: done
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .sensoryFeedback(.success, trigger: score)
        .sensoryFeedback(.error, trigger: misses)
        .task(id: phase == .play) {
            guard phase == .play else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(100))
                now = .now
                if remaining <= 0 {
                    finish()
                    break
                }
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Before                                                           */
    /* -------------------------------------------------------------- */

    private var ready: some View {
        let words = pool
        let best = UserDefaults.standard.integer(forKey: bestKey)
        return ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Vocabulary · against the clock").rubricLabel()
                    Text("Speed round")
                        .font(.system(.largeTitle, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("A minute to match as many Latin words to their meanings as you can, five at a time. A wrong pair costs \(SpeedRound.missPenalty) seconds, and the words you mix up are listed at the end.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.ink2)
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text("Which words").quietLabel()
                    Picker("Which words", selection: Binding(get: { chosen }, set: { scope = $0 })) {
                        if model.vocab.count >= Self.minPool { Text("My deck · \(model.vocab.count)").tag(Scope.deck) }
                        Text("The whole AP list").tag(Scope.all)
                        ForEach(["1", "2", "3", "4", "5", "6"], id: \.self) { Text("Unit \($0)").tag(Scope.unit($0)) }
                    }
                    .pickerStyle(.menu)
                    .tint(Palette.rubric)
                    Text("\(words.count) words" + (best > 0 ? " · best \(best)" : ""))
                        .font(.prose(.footnote))
                        .foregroundStyle(Palette.inkMuted)
                }
            }
            .padding(20)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            Button { start() } label: {
                Label("Start · \(SpeedRound.seconds) seconds", systemImage: "timer")
                    .font(.headline)
                    .frame(maxWidth: 520)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.glassProminent)
            .disabled(words.count < Self.minPool)
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
    }

    private func start() {
        var rng = SystemRandomNumberGenerator()
        (left, right) = SpeedRound.deal(pool, using: &rng)
        matched = []
        pickL = nil
        pickR = nil
        flash = nil
        score = 0
        misses = 0
        missed = []
        newBest = false
        added = false
        now = .now
        deadline = now.addingTimeInterval(TimeInterval(SpeedRound.seconds))
        withAnimation(.spring(duration: 0.35)) { phase = .play }
    }

    /* -------------------------------------------------------------- */
    /* Playing                                                          */
    /* -------------------------------------------------------------- */

    private var board: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                ProgressView(value: remaining, total: TimeInterval(SpeedRound.seconds))
                    .tint(remaining < 10 ? Palette.rubric : Palette.ink2)
                    .accessibilityLabel("\(Int(remaining.rounded(.up))) seconds left")
                Text("\(score)")
                    .font(.system(.title, design: .serif).weight(.medium))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .foregroundStyle(Palette.ink)
                    .accessibilityLabel("\(score) matched")
            }
            Text("Tap a word, then its meaning. A wrong pair costs \(SpeedRound.missPenalty) seconds.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 10) { ForEach(left) { tile($0, side: .left) } }
                VStack(spacing: 10) { ForEach(right) { tile($0, side: .right) } }
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(maxWidth: 680)
        .frame(maxWidth: .infinity)
    }

    private enum Side { case left, right }

    private func tile(_ word: SpeedRound.Word, side: Side) -> some View {
        let done = matched.contains(word.id)
        let picked = side == .left ? pickL == word.id : pickR == word.id
        let flashing = flash.map { $0.ids[side == .left ? 0 : 1] == word.id } ?? false
        let edge: Color = flashing ? (flash?.ok == true ? Palette.correct : Palette.rubric) : picked ? Palette.ink : Palette.rule
        return Button {
            choose(side, word.id)
        } label: {
            Text(side == .left ? word.latin : word.english)
                .font(side == .left ? Font.latin(20, relativeTo: .body) : Font.prose(.callout))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Palette.slip, in: .rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(edge, lineWidth: picked || flashing ? 2 : 0.5))
        }
        .buttonStyle(.plain)
        .disabled(done)
        .opacity(done ? 0.25 : 1)
        .animation(.easeOut(duration: 0.15), value: done)
        .accessibilityAddTraits(picked ? .isSelected : [])
    }

    private func choose(_ side: Side, _ id: String) {
        let l = side == .left ? (pickL == id ? nil : id) : pickL
        let r = side == .right ? (pickR == id ? nil : id) : pickR
        guard let l, let r else {
            pickL = l
            pickR = r
            return
        }
        pickL = nil
        pickR = nil
        let ok = l == r
        flash = (ids: [l, r], ok: ok)
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(ok ? 220 : 420))
            if flash?.ids == [l, r] { flash = nil }
        }
        if ok {
            withAnimation(.snappy) { score += 1 }
            matched.insert(l)
            if matched.count == left.count {
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(200))
                    guard phase == .play else { return }
                    var rng = SystemRandomNumberGenerator()
                    (left, right) = SpeedRound.deal(pool, using: &rng)
                    matched = []
                }
            }
        } else {
            misses += 1
            deadline = deadline.addingTimeInterval(-TimeInterval(SpeedRound.missPenalty))
            if let word = left.first(where: { $0.id == l }), !missed.contains(word) { missed.append(word) }
        }
    }

    private func finish() {
        let best = UserDefaults.standard.integer(forKey: bestKey)
        if score > best {
            UserDefaults.standard.set(score, forKey: bestKey)
            newBest = score > 0
        }
        model.update { $0.markStudied() }
        withAnimation(.spring(duration: 0.4)) { phase = .done }
    }

    /* -------------------------------------------------------------- */
    /* After                                                            */
    /* -------------------------------------------------------------- */

    private var done: some View {
        let toAdd = missed.filter { model.vocab[$0.id] == nil }
        return ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text("Time").rubricLabel()
                Text("\(Text("\(score)").font(.system(size: 52, weight: .medium, design: .serif)).foregroundStyle(Palette.rubric)) \(Text(score == 1 ? "pair in a minute" : "pairs in a minute").foregroundStyle(Palette.inkMuted))")
                    .font(.prose(.title3))
                Text(newBest ? "Your best yet." : "Best here: \(UserDefaults.standard.integer(forKey: bestKey)).")
                    .font(.prose(.body))
                    .foregroundStyle(Palette.ink2)
                if !missed.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Worth another look").quietLabel().padding(.bottom, 8)
                        ForEach(missed) { w in
                            Hairline(color: Palette.hair)
                            Text("\(Text(w.latin).font(.latinItalic(19, relativeTo: .body)).foregroundStyle(Palette.ink))  \(Text(w.english).foregroundStyle(Palette.ink2))")
                                .font(.prose(.body))
                                .padding(.vertical, 8)
                        }
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 10) {
                    Button { start() } label: {
                        Text("Again").font(.headline).frame(maxWidth: 520).padding(.vertical, 8)
                    }
                    .buttonStyle(.glassProminent)
                    HStack(spacing: 10) {
                        if !toAdd.isEmpty && !added {
                            Button {
                                model.update { $0.seedVocab(toAdd.map(\.id)) }
                                added = true
                            } label: {
                                Text("Add \(toAdd.count) to flashcards").frame(maxWidth: .infinity).padding(.vertical, 4)
                            }
                            .buttonStyle(.glass)
                        }
                        Button { dismiss() } label: { Text("Done").frame(maxWidth: .infinity).padding(.vertical, 4) }
                            .buttonStyle(.glass)
                    }
                    .frame(maxWidth: 520)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
    }
}
