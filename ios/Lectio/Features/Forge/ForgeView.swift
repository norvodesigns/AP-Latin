import LectioCore
import SwiftUI

/// Forms Forge — the web's /forge. Declension and conjugation drills made
/// from the tables in `forms.json`: make the form, name the form, fill the
/// chart. A round opens over everything, like a lesson.
struct ForgeView: View {
    var body: some View {
        SectionStack { ForgeHome() }
    }
}

/// One round in play.
private struct ForgeRound: Identifiable {
    let id = UUID()
    let mode: Forge.Mode
    let scope: [Paradigm]
    var questions: [Forge.Question]
}

private extension Forge.Mode {
    var title: String {
        switch self {
        case .make: "Make the form"
        case .name: "Name the form"
        case .chart: "Fill the chart"
        }
    }

    var blurb: String {
        switch self {
        case .make: "Given a word and what is wanted, type the form."
        case .name: "Given a form, say what it is."
        case .chart: "Complete a table with some cells left blank."
        }
    }

    var systemImage: String {
        switch self {
        case .make: "character.cursor.ibeam"
        case .name: "questionmark.text.page"
        case .chart: "tablecells"
        }
    }
}

private struct ForgeHome: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var mode: Forge.Mode = .make
    @State private var kinds: Set<Paradigm.Kind> = Set(Paradigm.Kind.allCases)
    @State private var learnedOnly = true
    @State private var round: ForgeRound?

    private static let roundLength = 10

    var body: some View {
        let all = library?.paradigms ?? []
        let done = model.courseDone
        let scope = Forge.scope(all, kinds: kinds, learned: !done.isEmpty && learnedOnly ? done : nil)
        let forms = scope.reduce(0) { $0 + $1.cellCount }

        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Every ending, hammered until it is automatic")
                        .font(.system(.title2, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("Choose a way to practise and which tables to use. A round is ten questions.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.inkMuted)
                }
                .padding(.top, 8)

                VStack(alignment: .leading, spacing: 10) {
                    Text("How").rubricLabel()
                    ForEach(Forge.Mode.allCases) { m in
                        OptionCard(state: m == mode ? .selected : .idle, action: { mode = m }) {
                            HStack(spacing: 14) {
                                Image(systemName: m.systemImage)
                                    .font(.title3)
                                    .foregroundStyle(m == mode ? Palette.rubric : Palette.inkMuted)
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(m.title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                                    Text(m.blurb).font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted)
                                }
                            }
                        }
                        .accessibilityAddTraits(m == mode ? .isSelected : [])
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Which tables").rubricLabel()
                    GlassEffectContainer(spacing: 8) {
                        HStack(spacing: 8) {
                            ForEach(Paradigm.Kind.allCases, id: \.self) { k in
                                let on = kinds.contains(k)
                                Button(k.label) { toggle(k) }
                                    .font(.subheadline)
                                    .buttonStyle(.glass)
                                    .tint(on ? Palette.rubric : nil)
                                    .accessibilityAddTraits(on ? .isSelected : [])
                            }
                        }
                    }
                    if !done.isEmpty {
                        Toggle("Only tables from lessons I've finished", isOn: $learnedOnly)
                            .font(.prose(.callout))
                            .tint(Palette.rubric)
                    }
                    Text(scope.isEmpty
                         ? "Nothing in play yet: finish a course lesson with a table, or include every table."
                         : "\(scope.count) table\(scope.count == 1 ? "" : "s"), \(forms) forms.")
                        .font(.prose(.footnote))
                        .foregroundStyle(Palette.inkMuted)
                    Button {
                        var rng = SystemRandomNumberGenerator()
                        round = ForgeRound(mode: mode, scope: scope, questions: Forge.round(scope, mode: mode, length: Self.roundLength, using: &rng))
                    } label: {
                        Label("Start · \(Self.roundLength) questions", systemImage: "hammer")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(scope.isEmpty)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("The tables").rubricLabel()
                    ForEach(Paradigm.Kind.allCases, id: \.self) { k in
                        let tables = all.filter { $0.kind == k }
                        if !tables.isEmpty {
                            Text(k.label).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink).padding(.top, 6)
                            ForEach(tables) { p in
                                DisclosureGroup {
                                    ParadigmChartView(table: p.table).padding(.vertical, 6)
                                } label: {
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(p.lemma).font(.latin(18, relativeTo: .body)).foregroundStyle(Palette.ink)
                                        Text("\(p.gloss) · \(p.title)").font(.caption).foregroundStyle(Palette.inkMuted)
                                    }
                                }
                                .tint(Palette.inkMuted)
                                Hairline(color: Palette.hair)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle("Forms Forge")
        .fullScreenCover(item: $round) { r in
            ForgeRoundView(round: r) { round = nil }
        }
    }

    private func toggle(_ k: Paradigm.Kind) {
        if kinds.contains(k) {
            if kinds.count > 1 { kinds.remove(k) }
        } else {
            kinds.insert(k)
        }
    }
}

/* ------------------------------------------------------------------ */
/* A round                                                             */
/* ------------------------------------------------------------------ */

private struct ForgeRoundView: View {
    @State var round: ForgeRound
    let onClose: () -> Void
    @State private var index = 0
    @State private var results: [Bool] = []
    @State private var verdict: Bool?

    var body: some View {
        NavigationStack {
            Group {
                if index < round.questions.count {
                    question(round.questions[index])
                } else {
                    summary
                }
            }
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close", systemImage: "xmark", action: onClose)
                }
                ToolbarItem(placement: .principal) {
                    if index < round.questions.count {
                        ProgressView(value: Double(index), total: Double(round.questions.count))
                            .tint(Palette.rubric)
                            .frame(maxWidth: 220)
                            .accessibilityLabel("Question \(index + 1) of \(round.questions.count)")
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .sensoryFeedback(trigger: verdict) { _, new in
            guard let new else { return nil }
            return new ? .success : .error
        }
    }

    @ViewBuilder
    private func question(_ q: Forge.Question) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(q.paradigm.title).quietLabel()
                    Text("\(Text(q.paradigm.lemma).font(.latin(22, relativeTo: .title3)).foregroundStyle(Palette.ink))  \(Text(q.paradigm.gloss).font(.prose(.callout)).foregroundStyle(Palette.inkMuted))")
                }
                switch q {
                case .make(let p, let cell, let asked, let answers):
                    MakeQuestion(paradigm: p, cell: cell, asked: asked, answers: answers, verdict: verdict, answer: answer)
                case .name(_, _, let form, let options, let right):
                    NameQuestion(form: form, options: options, right: right, verdict: verdict, answer: answer)
                case .chart(let p, let blanks):
                    ChartQuestion(paradigm: p, blanks: blanks, verdict: verdict, answer: answer)
                }
            }
            .padding(20)
            .padding(.bottom, 180)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
            .id(index)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            if let verdict {
                Verdict(right: verdict, answer: correctAnswer(q)) { next() }
            }
        }
        .animation(.spring(duration: 0.35), value: verdict)
    }

    private var summary: some View {
        let right = results.filter { $0 }.count
        return VStack(spacing: 16) {
            Text(right == results.count ? "Every one right." : "\(right) of \(results.count) right")
                .font(.system(.largeTitle, design: .serif))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
            Text(right == results.count
                 ? "Clean work. Try a harder mode, or widen the tables in play."
                 : "The ones you missed are the ones to come back to. Another round mixes them in again.")
                .font(.prose(.body))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 12) {
                    Button {
                        var rng = SystemRandomNumberGenerator()
                        round.questions = Forge.round(round.scope, mode: round.mode, length: round.questions.count, using: &rng)
                        results = []
                        verdict = nil
                        index = 0
                    } label: {
                        Text("Another round").font(.headline).frame(maxWidth: 300).padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    Button(action: onClose) {
                        Text("Done").frame(maxWidth: 300).padding(.vertical, 4)
                    }
                    .buttonStyle(.glass)
                }
            }
            .padding(.top, 10)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func answer(_ right: Bool) {
        guard verdict == nil else { return }
        verdict = right
    }

    private func next() {
        results.append(verdict ?? false)
        verdict = nil
        index += 1
    }

    private func correctAnswer(_ q: Forge.Question) -> String? {
        switch q {
        case .make(let p, let cell, _, _): p.rows[cell.row].cells[cell.col]
        case .name(_, _, _, let options, let right): options[right]
        case .chart: nil
        }
    }
}

private struct Verdict: View {
    let right: Bool
    let answer: String?
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(right ? "Rēctē — right" : "Not quite", systemImage: right ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.headline)
                .foregroundStyle(right ? Palette.correct : Palette.incorrect)
            if !right, let answer {
                Text("\(Text("Answer  ").font(.caption.weight(.semibold)).foregroundStyle(Palette.inkMuted))\(Text(rich: answer, endings: true).font(.latin(20, relativeTo: .body)).foregroundStyle(Palette.ink))")
            }
            Button(action: onContinue) {
                Text("Continue").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .keyboardShortcut(.return, modifiers: [])
            .padding(.top, 4)
        }
        .padding(18)
        .frame(maxWidth: 560, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 26))
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

/* ------------------------------------------------------------------ */
/* The three questions                                                 */
/* ------------------------------------------------------------------ */

private struct MakeQuestion: View {
    let paradigm: Paradigm
    let cell: Forge.Cell
    let asked: String
    let answers: [String]
    let verdict: Bool?
    let answer: (Bool) -> Void
    @State private var text = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Give the \(Text(asked).bold()) of \(Text(paradigm.headword).italic()).")
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Palette.ink)
            FormField(text: $text, focused: $focused, disabled: verdict != nil, onSubmit: check)
            Text("Macrons are optional when you type.").font(.caption2).foregroundStyle(Palette.inkFaint)
            if verdict == nil {
                Button("Check", action: check)
                    .buttonStyle(.glassProminent)
                    .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .onAppear { focused = true }
    }

    private func check() {
        guard verdict == nil, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        focused = false
        answer(LessonCheck.checkTyped(text, accepted: answers))
    }
}

private struct NameQuestion: View {
    let form: String
    let options: [String]
    let right: Int
    let verdict: Bool?
    let answer: (Bool) -> Void
    @State private var chosen: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("What is this form?").font(.system(.title3, design: .serif)).foregroundStyle(Palette.ink)
            Text(rich: form, endings: true)
                .font(.latin(36, relativeTo: .largeTitle))
                .foregroundStyle(Palette.ink)
                .padding(.vertical, 4)
            ForEach(Array(options.enumerated()), id: \.offset) { i, option in
                OptionCard(state: state(i)) {
                    guard verdict == nil else { return }
                    chosen = i
                    answer(i == right)
                } label: {
                    Text(option).font(.prose(.body)).foregroundStyle(Palette.ink)
                }
                .disabled(verdict != nil)
            }
        }
    }

    private func state(_ i: Int) -> OptionState {
        guard verdict != nil else { return .idle }
        if i == right { return .right }
        return i == chosen ? .wrong : .faded
    }
}

private struct ChartQuestion: View {
    let paradigm: Paradigm
    let blanks: [Forge.Cell]
    let verdict: Bool?
    let answer: (Bool) -> Void
    @State private var values: [Forge.Cell: String] = [:]
    @FocusState private var focus: Forge.Cell?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Fill in the blanks.").font(.system(.title3, design: .serif)).foregroundStyle(Palette.ink)
            ScrollView(.horizontal, showsIndicators: false) {
                Grid(alignment: .leading, horizontalSpacing: 14, verticalSpacing: 8) {
                    GridRow {
                        Text("")
                        ForEach(paradigm.cols, id: \.self) { Text($0).quietLabel() }
                    }
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(Array(paradigm.rows.enumerated()), id: \.offset) { r, row in
                        GridRow(alignment: .firstTextBaseline) {
                            Text(row.label).font(.caption).foregroundStyle(Palette.inkMuted)
                            ForEach(Array(row.cells.enumerated()), id: \.offset) { c, cellText in
                                let cell = Forge.Cell(row: r, col: c)
                                if blanks.contains(cell) {
                                    blank(cell, cellText)
                                } else {
                                    Text(rich: cellText, endings: true).font(.latin(19, relativeTo: .body)).foregroundStyle(Palette.ink)
                                }
                            }
                        }
                    }
                }
                .padding(.vertical, 4)
            }
            Text("Macrons are optional when you type.").font(.caption2).foregroundStyle(Palette.inkFaint)
            if verdict == nil {
                Button("Check", action: check)
                    .buttonStyle(.glassProminent)
                    .disabled(!filled)
            }
        }
        .onAppear { focus = blanks.first }
    }

    @ViewBuilder
    private func blank(_ cell: Forge.Cell, _ cellText: String) -> some View {
        let ok = isRight(cell)
        VStack(alignment: .leading, spacing: 2) {
            TextField("", text: Binding(get: { values[cell] ?? "" }, set: { values[cell] = $0 }))
                .font(.latin(18, relativeTo: .body))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focus, equals: cell)
                .submitLabel(cell == blanks.last ? .done : .next)
                .onSubmit { advance(from: cell) }
                .disabled(verdict != nil)
                .frame(minWidth: 96)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Palette.slip, in: .rect(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(
                    verdict == nil ? (focus == cell ? Palette.ink : Palette.ruleStrong) : (ok ? Palette.correct : Palette.incorrect),
                    lineWidth: verdict == nil && focus != cell ? 0.75 : 1.25))
                .accessibilityLabel(paradigm.names[cell.row][cell.col])
            if verdict != nil, !ok {
                Text(rich: cellText, endings: true).font(.latin(15, relativeTo: .footnote)).foregroundStyle(Palette.ink2)
            }
        }
    }

    private var filled: Bool {
        blanks.allSatisfy { !(values[$0] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
    }

    private func isRight(_ cell: Forge.Cell) -> Bool {
        LessonCheck.checkTyped(values[cell] ?? "", accepted: Forge.cellForms(paradigm.rows[cell.row].cells[cell.col]))
    }

    private func advance(from cell: Forge.Cell) {
        if let i = blanks.firstIndex(of: cell), i + 1 < blanks.count {
            focus = blanks[i + 1]
        } else if filled {
            check()
        }
    }

    private func check() {
        guard verdict == nil, filled else { return }
        focus = nil
        answer(blanks.allSatisfy(isRight))
    }
}

/// The text field for a typed form, styled like the lesson player's.
private struct FormField: View {
    @Binding var text: String
    var focused: FocusState<Bool>.Binding
    let disabled: Bool
    let onSubmit: () -> Void

    var body: some View {
        TextField("Type the form", text: $text)
            .font(.latin(26, relativeTo: .title2))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .submitLabel(.done)
            .focused(focused)
            .onSubmit(onSubmit)
            .disabled(disabled)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Palette.slip, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(focused.wrappedValue ? Palette.ink : Palette.ruleStrong, lineWidth: focused.wrappedValue ? 1.25 : 0.75))
    }
}
