import LectioCore
import SwiftUI

/// The body of one lesson step. Exercises call `answer` once, when the
/// student commits; the container then shows the feedback panel.
struct StepContent: View {
    let step: LessonStep
    let result: Bool?
    let answer: (Bool) -> Void

    var body: some View {
        switch step {
        case .teach(let s): TeachCard(step: s)
        case .read(let s): ReadCard(step: s)
        case .choice(let s): ChoiceExercise(step: s, result: result, answer: answer)
        case .type(let s): TypeExercise(step: s, result: result, answer: answer)
        case .translate(let s): TranslateExercise(step: s, result: result, answer: answer)
        case .build(let s): BuildExercise(step: s, result: result, answer: answer)
        case .match(let s): MatchExercise(step: s, result: result, answer: answer)
        case .unknown: EmptyView()
        }
    }
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

private struct Prompt: View {
    let text: String
    var body: some View {
        Text(rich: text)
            .font(.system(.title3, design: .serif).weight(.semibold))
            .foregroundStyle(Palette.ink)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// Latin the question is about, set large.
private struct Stimulus: View {
    let text: String?
    var body: some View {
        if let text {
            Text(rich: text, endings: true)
                .font(.latin(28, relativeTo: .title))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, 4)
        }
    }
}

enum OptionState { case idle, selected, right, wrong, faded }

/// A tappable card on the page — content, so parchment and a hairline, not glass.
struct OptionCard<Label: View>: View {
    let state: OptionState
    let action: () -> Void
    @ViewBuilder let label: Label

    var body: some View {
        Button(action: action) {
            label
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.vertical, 13)
                .background(background, in: .rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(border, lineWidth: state == .idle ? 0.75 : 1.5))
                .opacity(state == .faded ? 0.45 : 1)
                .contentShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(PressStyle())
        // The colours say right and wrong; VoiceOver needs it in words.
        .accessibilityValue(state == .right ? "Correct answer" : state == .wrong ? "Your answer, incorrect" : "")
        .accessibilityAddTraits(state == .selected ? .isSelected : [])
    }

    private var background: Color {
        switch state {
        case .right: Palette.correctWash
        case .wrong: Palette.incorrectWash
        default: Palette.slip
        }
    }

    private var border: Color {
        switch state {
        case .right: Palette.correct
        case .wrong: Palette.incorrect
        case .selected: Palette.ink
        default: Palette.ruleStrong
        }
    }
}

/* ------------------------------------------------------------------ */
/* Teaching and reading                                                */
/* ------------------------------------------------------------------ */

private struct TeachCard: View {
    let step: TeachStep

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(rich: step.title)
                .font(.system(.title, design: .serif))
                .foregroundStyle(Palette.ink)
            ForEach(step.body, id: \.self) { p in
                Text(rich: p).font(.prose(.body)).foregroundStyle(Palette.ink2).fixedSize(horizontal: false, vertical: true)
            }
            if let table = step.table { ParadigmChartView(table: table) }
            if let examples = step.examples, !examples.isEmpty {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(examples, id: \.self) { e in
                        HStack(alignment: .top, spacing: 12) {
                            Rectangle().fill(Palette.redLine).frame(width: 2)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(rich: e.la, endings: true).font(.latin(22, relativeTo: .title3)).foregroundStyle(Palette.ink)
                                Text(e.en).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                                if let note = e.note {
                                    Text(rich: note).font(.footnote).foregroundStyle(Palette.inkMuted)
                                }
                            }
                        }
                        .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.vertical, 4)
            }
            if let tip = step.tip {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Note").rubricLabel()
                    Text(rich: tip).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.redLine, lineWidth: 1))
            }
        }
    }
}

/// A declension or conjugation, ruled like a manuscript table, endings in red.
struct ParadigmChartView: View {
    let table: ParadigmTable

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let caption = table.caption {
                Text(caption).quietLabel()
            }
            ScrollView(.horizontal, showsIndicators: false) {
                Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 9) {
                    GridRow {
                        Text("")
                        ForEach(table.cols, id: \.self) { Text($0).quietLabel() }
                    }
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(table.rows, id: \.self) { row in
                        GridRow(alignment: .firstTextBaseline) {
                            Text(row.label).font(.caption).foregroundStyle(Palette.inkMuted)
                            ForEach(Array(row.cells.enumerated()), id: \.offset) { _, cell in
                                Text(rich: cell, endings: true).font(.latin(20, relativeTo: .body)).foregroundStyle(Palette.ink)
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .background(Palette.slip, in: .rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.rule, lineWidth: 0.5))
    }
}

private struct ReadCard: View {
    let step: ReadStep
    @State private var shown: Set<Int> = []

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Reading").rubricLabel()
            Text(step.title).font(.latinItalic(30, relativeTo: .title)).foregroundStyle(Palette.ink)
            if let intro = step.intro {
                Text(rich: intro).font(.prose(.callout)).foregroundStyle(Palette.ink2)
            }
            ForEach(Array(step.lines.enumerated()), id: \.offset) { i, line in
                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        if shown.contains(i) { shown.remove(i) } else { shown.insert(i) }
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(line.la).font(.latin(22, relativeTo: .title3)).foregroundStyle(Palette.ink)
                        if shown.contains(i) {
                            Text(line.en).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        } else {
                            Text("Tap for the translation").font(.caption2).foregroundStyle(Palette.inkFaint)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHint(shown.contains(i) ? "" : "Shows the translation")
            }
            if let gloss = step.gloss, !gloss.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Hairline()
                    ForEach(gloss, id: \.self) { g in
                        Text("\(Text(g.word).italic()) · \(g.meaning)").font(.prose(.footnote)).foregroundStyle(Palette.ink2)
                    }
                }
            }
            Button(shown.count == step.lines.count ? "Hide the translations" : "Show all translations") {
                withAnimation { shown = shown.count == step.lines.count ? [] : Set(step.lines.indices) }
            }
            .font(.subheadline)
            .tint(Palette.rubric)
        }
    }
}

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

private struct ChoiceExercise: View {
    let step: ChoiceStep
    let result: Bool?
    let answer: (Bool) -> Void
    @State private var chosen: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Prompt(text: step.prompt)
            Stimulus(text: step.latin)
            ForEach(Array(step.options.enumerated()), id: \.offset) { i, option in
                OptionCard(state: state(i), action: { choose(i) }) {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text("\(i + 1)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkFaint)
                        Text(rich: option).font(.prose(.body)).foregroundStyle(Palette.ink)
                    }
                }
                .disabled(result != nil)
                .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")), modifiers: [])
            }
        }
    }

    private func state(_ i: Int) -> OptionState {
        guard result != nil else { return .idle }
        if i == step.answer { return .right }
        if i == chosen { return .wrong }
        return .faded
    }

    private func choose(_ i: Int) {
        guard result == nil else { return }
        chosen = i
        answer(i == step.answer)
    }
}

private struct TypeExercise: View {
    let step: TypeStep
    let result: Bool?
    let answer: (Bool) -> Void
    @State private var text = ""
    @State private var showHint = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Prompt(text: step.prompt)
            Stimulus(text: step.latin)
            TextField("Type here", text: $text)
                .font(.latin(26, relativeTo: .title2))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .focused($focused)
                .onSubmit(check)
                .disabled(result != nil)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Palette.slip, in: .rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(focused ? Palette.ink : Palette.ruleStrong, lineWidth: focused ? 1.25 : 0.75))
            Text("Macrons are optional when you type.").font(.caption2).foregroundStyle(Palette.inkFaint)
            if result == nil {
                HStack(spacing: 10) {
                    Button("Check", action: check)
                        .buttonStyle(.glassProminent)
                        .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
                    if let hint = step.hint, !showHint {
                        Button("Hint") { withAnimation { showHint = true } }.buttonStyle(.glass)
                            .accessibilityHint(RichText.plain(hint))
                    }
                }
                if showHint, let hint = step.hint {
                    Text(rich: hint).font(.prose(.callout)).foregroundStyle(Palette.ink2).transition(.opacity)
                }
            }
        }
        .onAppear { focused = true }
    }

    private func check() {
        guard result == nil, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        focused = false
        answer(LessonCheck.checkTyped(text, accepted: step.answers))
    }
}

private struct TranslateExercise: View {
    let step: TranslateStep
    let result: Bool?
    let answer: (Bool) -> Void
    @State private var text = ""
    @State private var judging = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Prompt(text: "Translate into English")
            Stimulus(text: step.latin)
            TextField("Your translation", text: $text, axis: .vertical)
                .font(.prose(.title3))
                .lineLimit(2...5)
                .focused($focused)
                .disabled(result != nil || judging)
                .onSubmit(check)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Palette.slip, in: .rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(focused ? Palette.ink : Palette.ruleStrong, lineWidth: focused ? 1.25 : 0.75))
            if result == nil && !judging {
                HStack(spacing: 10) {
                    Button("Check", action: check)
                        .buttonStyle(.glassProminent)
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Button("I don’t know") { answer(false) }.buttonStyle(.glass)
                }
            }
            if judging && result == nil {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Compare").rubricLabel()
                    Text(step.answers.first ?? "").font(.prose(.title3)).foregroundStyle(Palette.ink)
                    Text("English has many right answers. Does yours say the same thing?")
                        .font(.prose(.footnote)).foregroundStyle(Palette.inkMuted)
                    GlassEffectContainer(spacing: 10) {
                        HStack(spacing: 10) {
                            Button("Mine means the same") { answer(true) }.buttonStyle(.glassProminent)
                            Button("I had it wrong") { answer(false) }.buttonStyle(.glass)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.slip, in: .rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.rule, lineWidth: 0.5))
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.spring(duration: 0.3), value: judging)
        .onAppear { focused = true }
    }

    private func check() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard result == nil, !judging, !trimmed.isEmpty else { return }
        focused = false
        if LessonCheck.checkTranslation(trimmed, accepted: step.answers) { answer(true) } else { judging = true }
    }
}

/// Word tiles into a sentence. Tiles move between the bank and the line.
private struct BuildExercise: View {
    let step: BuildStep
    let result: Bool?
    let answer: (Bool) -> Void

    private struct Tile: Identifiable, Hashable {
        let id: Int
        let text: String
    }

    @State private var tiles: [Tile] = []
    @State private var placed: [Int] = []
    @Namespace private var space

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Prompt(text: step.prompt)
            Text(step.source)
                .font(step.lang == .la ? .prose(.title2) : .latin(26, relativeTo: .title2))
                .foregroundStyle(Palette.ink)

            VStack(alignment: .leading, spacing: 8) {
                FlowLayout(lineSpacing: 8) {
                    ForEach(placed, id: \.self) { id in
                        if let tile = tiles.first(where: { $0.id == id }) {
                            tileButton(tile, placed: true)
                        }
                    }
                }
                .frame(minHeight: 44, alignment: .topLeading)
                if placed.isEmpty {
                    Text(step.anyOrder == true ? "Tap the words, in any order" : "Tap the words in order").font(.caption).foregroundStyle(Palette.inkFaint)
                }
                Hairline(color: Palette.ruleStrong)
            }

            FlowLayout(lineSpacing: 8) {
                ForEach(tiles) { tile in
                    if !placed.contains(tile.id) {
                        tileButton(tile, placed: false)
                    } else {
                        tileLabel(tile).opacity(0.18).padding(.trailing, 6).accessibilityHidden(true)
                    }
                }
            }

            if result == nil {
                HStack(spacing: 10) {
                    Button("Check") {
                        answer(LessonCheck.checkBuild(placed.compactMap { id in tiles.first { $0.id == id }?.text }, step: step))
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(placed.isEmpty)
                    if !placed.isEmpty {
                        Button("Clear") { withAnimation(.spring(duration: 0.3)) { placed = [] } }.buttonStyle(.glass)
                    }
                }
            }
        }
        .onAppear {
            guard tiles.isEmpty else { return }
            tiles = (step.answer + step.extra).enumerated().map { Tile(id: $0.offset, text: $0.element) }.shuffled()
        }
        .sensoryFeedback(.selection, trigger: placed)
    }

    private func tileButton(_ tile: Tile, placed isPlaced: Bool) -> some View {
        Button {
            withAnimation(.spring(duration: 0.3)) {
                if isPlaced { placed.removeAll { $0 == tile.id } } else { placed.append(tile.id) }
            }
        } label: {
            tileLabel(tile)
        }
        .buttonStyle(PressStyle())
        .disabled(result != nil)
        .matchedGeometryEffect(id: tile.id, in: space)
        .padding(.trailing, 6)
        .accessibilityHint(isPlaced ? "Removes it from your sentence" : "Adds it to your sentence")
    }

    private func tileLabel(_ tile: Tile) -> some View {
        Text(tile.text)
            .font(step.lang == .la ? .latinItalic(20, relativeTo: .body) : .prose(.body))
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Palette.slip, in: .capsule)
            .overlay(Capsule().strokeBorder(Palette.ruleStrong, lineWidth: 0.75))
    }
}

/// Tap one side, then its partner on the other.
private struct MatchExercise: View {
    let step: MatchStep
    let result: Bool?
    let answer: (Bool) -> Void

    private enum Side { case left, right }
    @State private var rights: [Int] = []
    @State private var selected: (side: Side, index: Int)?
    @State private var matched: Set<Int> = []
    @State private var wrong: (left: Int, right: Int)?
    @State private var mistakes = false
    @State private var misses = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Prompt(text: step.prompt)
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 10) {
                    ForEach(step.pairs.indices, id: \.self) { i in cell(.left, i) }
                }
                VStack(spacing: 10) {
                    ForEach(rights, id: \.self) { i in cell(.right, i) }
                }
            }
        }
        .onAppear { if rights.isEmpty { rights = Array(step.pairs.indices).shuffled() } }
        .sensoryFeedback(.error, trigger: misses)
        .sensoryFeedback(.selection, trigger: matched.count)
    }

    private func cell(_ side: Side, _ i: Int) -> some View {
        let text = step.pairs[i].count == 2 ? step.pairs[i][side == .left ? 0 : 1] : ""
        let isMatched = matched.contains(i)
        let isSelected = selected?.side == side && selected?.index == i
        let isWrong = wrong.map { side == .left ? $0.left == i : $0.right == i } ?? false
        let state: OptionState = isMatched ? .right : isWrong ? .wrong : isSelected ? .selected : .idle
        return OptionCard(state: state, action: { tap(side, i) }) {
            Text(text)
                .font(side == .left ? .latinItalic(19, relativeTo: .body) : .prose(.callout))
                .foregroundStyle(Palette.ink)
        }
        .disabled(isMatched || result != nil)
        .opacity(isMatched ? 0.65 : 1)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func tap(_ side: Side, _ i: Int) {
        guard result == nil, !matched.contains(i) else { return }
        guard let current = selected, current.side != side else {
            selected = (side: side, index: i)
            return
        }
        let left = side == .left ? i : current.index
        let right = side == .right ? i : current.index
        selected = nil
        if left == right {
            withAnimation(.spring(duration: 0.3)) { _ = matched.insert(left) }
            if matched.count == step.pairs.count { answer(!mistakes) }
        } else {
            mistakes = true
            misses += 1
            withAnimation(.easeInOut(duration: 0.15)) { wrong = (left: left, right: right) }
            Task {
                try? await Task.sleep(for: .milliseconds(550))
                withAnimation(.easeInOut(duration: 0.2)) { wrong = nil }
            }
        }
    }
}
