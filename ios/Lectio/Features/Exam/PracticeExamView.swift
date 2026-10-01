import LectioCore
import SwiftUI

/// The real thing, end to end — src/app/exam/PracticeExam.tsx: 52 multiple
/// choice in 65 minutes, then five free responses in 115, then a report.
struct PracticeExamView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var sitting: ExamPaper?

    var body: some View {
        SectionStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text("52 multiple-choice questions in 65 minutes, then five free-response questions in 115. Section timers, typed responses, and a scored report broken down by skill and question type.")
                        .font(.prose(.callout)).foregroundStyle(Palette.ink2)
                    Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
                        GridRow {
                            Text("Section I — Multiple Choice").font(.subheadline.weight(.semibold))
                            Text("52 questions"); Text("65 min"); Text("50%")
                        }
                        Divider().gridCellUnsizedAxes(.horizontal)
                        GridRow {
                            Text("Section II — Free Response").font(.subheadline.weight(.semibold))
                            Text("5 questions"); Text("115 min"); Text("50%")
                        }
                    }
                    .font(.subheadline)
                    .padding(16)
                    .background(Palette.slip, in: .rect(cornerRadius: 14))

                    if let library {
                        let pool = library.questions.count + library.sightQuestions.count
                        if pool < 52 {
                            Text("The question bank holds \(pool) items, so some of the 52 slots repeat a question. The timing rehearsal is still realistic; the accuracy figure less so.")
                                .font(.footnote).foregroundStyle(Palette.inkMuted)
                        }
                        Button {
                            sitting = ExamPaper.build(library)
                        } label: {
                            Text("Begin Section I").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                        }
                        .buttonStyle(.glassProminent)
                    }

                    let past = model.progress.examResults.suffix(5).reversed()
                    if !past.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Previous exams").rubricLabel()
                            ForEach(Array(past)) { r in
                                HStack {
                                    Text(CloudSync.parseTimestamp(r.at)?.formatted(.dateTime.day().month().year()) ?? "").foregroundStyle(Palette.inkFaint)
                                    Spacer()
                                    Text("MCQ \(r.mcqCorrect)/\(r.mcqTotal) · FRQ \(r.frqPoints.formatted())/\(r.frqMax.formatted())").monospacedDigit()
                                }
                                .font(.subheadline)
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .navigationTitle("Practice Exam")
            .fullScreenCover(item: $sitting) { ExamSessionView(paper: $0) }
        }
    }
}

nonisolated struct ExamPaper: Identifiable, Sendable {
    let id = UUID()
    let mcq: [Question]
    let frqs: [FrqPrompt]

    static let mcqCount = 52
    static let mcqSeconds: Double = 65 * 60
    static let frqSeconds: Double = 115 * 60

    static func build(_ library: ContentLibrary) -> ExamPaper {
        let pool = (library.questions + library.sightQuestions).shuffled()
        var paper: [Question] = []
        while paper.count < mcqCount, !pool.isEmpty { paper += pool.prefix(mcqCount - paper.count) }
        // One short-essay slot: the bank holds alternates for it (Pliny, Vergil).
        let essays = library.frqPrompts.filter { $0.type == "short-essay" }
        let chosen = essays.randomElement()?.id
        let frqs = library.frqPrompts.filter { $0.type != "short-essay" || $0.id == chosen }
        return ExamPaper(mcq: Array(paper.prefix(mcqCount)), frqs: frqs)
    }
}

/// One sitting: Section I, a break, Section II, the report.
struct ExamSessionView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss
    let paper: ExamPaper

    enum Stage { case mcq, rest, frq, report }

    @State private var stage = Stage.mcq
    @State private var cursor = 0
    @State private var answers: [Int: String] = [:]
    @State private var flagged: Set<Int> = []
    @State private var mcqStart = Date()
    @State private var mcqUsed: Double = 0
    @State private var frqStart = Date()
    @State private var frqUsed: Double = 0
    @State private var frqAnswers: [String: String] = [:]
    @State private var frqScores: [String: Double] = [:]
    @State private var saved = false
    @State private var confirmQuit = false

    var body: some View {
        NavigationStack {
            Group {
                switch stage {
                case .mcq: mcqStage
                case .rest: restStage
                case .frq: frqStage
                case .report: reportStage
                }
            }
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(stage == .report ? "Done" : "Leave", systemImage: "xmark") {
                        if stage == .report { saveIfNeeded(); dismiss() } else { confirmQuit = true }
                    }
                }
                ToolbarItem(placement: .principal) { clock }
            }
            .confirmationDialog("Leave the exam?", isPresented: $confirmQuit, titleVisibility: .visible) {
                Button("Score what I've done") { finish() }
                Button("Leave without scoring", role: .destructive) { dismiss() }
            }
        }
        .onAppear {
            mcqStart = Date()
            model.update { $0.markStudied() }
            ExamLiveActivity.start(.init(section: "Section I", detail: "Multiple choice", startedAt: mcqStart,
                                         endsAt: mcqStart.addingTimeInterval(ExamPaper.mcqSeconds), done: 0, total: paper.mcq.count))
        }
        .onChange(of: answers.count) { _, n in
            if stage == .mcq { ExamLiveActivity.update(done: n) }
        }
        .onChange(of: frqDone) { _, n in
            if stage == .frq { ExamLiveActivity.update(done: n) }
        }
        .onDisappear { ExamLiveActivity.end() }
    }

    /// Free-response questions with anything written in them.
    private var frqDone: Int {
        paper.frqs.filter { p in
            p.subquestions.contains { !(frqAnswers["\(p.id):\($0.id)"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        }.count
    }

    @ViewBuilder
    private var clock: some View {
        switch stage {
        case .mcq:
            countdown(from: mcqStart, total: ExamPaper.mcqSeconds, label: "Section I") { endSectionI() }
        case .frq:
            countdown(from: frqStart, total: ExamPaper.frqSeconds, label: "Section II") { finish() }
        default:
            EmptyView()
        }
    }

    private func countdown(from start: Date, total: Double, label: String, onZero: @escaping () -> Void) -> some View {
        TimelineView(.periodic(from: start, by: 1)) { context in
            let left = max(0, total - context.date.timeIntervalSince(start))
            VStack(spacing: 0) {
                Text(label).font(.caption2).foregroundStyle(Palette.inkMuted)
                Text(Duration.seconds(left), format: .time(pattern: .minuteSecond))
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(left < 600 ? Palette.incorrect : Palette.ink)
            }
            .onChange(of: left == 0) { _, done in if done { onZero() } }
        }
    }

    /* -------------------------------------------------------------- */
    /* Section I                                                        */
    /* -------------------------------------------------------------- */

    private var mcqStage: some View {
        let q = paper.mcq[cursor]
        return VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(paper.mcq.indices, id: \.self) { i in
                        Button("\(i + 1)") { cursor = i }
                            .font(.caption.monospacedDigit())
                            .frame(width: 30, height: 30)
                            .foregroundStyle(i == cursor ? Palette.onRubric : Palette.ink)
                            .background(i == cursor ? Palette.rubric : answers[i] != nil ? Palette.sunk : .clear, in: .circle)
                            .overlay(alignment: .topTrailing) {
                                if flagged.contains(i) { Circle().fill(Palette.gilt).frame(width: 7, height: 7) }
                            }
                            .accessibilityLabel("Question \(i + 1)\(answers[i] != nil ? ", answered" : "")\(flagged.contains(i) ? ", flagged" : "")")
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 8)
            }
            Hairline()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    ExamStimulus(question: q)
                    HStack(alignment: .firstTextBaseline) {
                        Text("\(cursor + 1). \(q.prompt)").font(.system(.title3, design: .serif).weight(.semibold))
                        Spacer()
                        Button(flagged.contains(cursor) ? "Unflag" : "Flag", systemImage: flagged.contains(cursor) ? "flag.fill" : "flag") {
                            if flagged.contains(cursor) { flagged.remove(cursor) } else { flagged.insert(cursor) }
                        }
                        .labelStyle(.iconOnly)
                        .tint(Palette.gilt)
                    }
                    ForEach(Array(q.options.enumerated()), id: \.element.id) { i, o in
                        let chosen = answers[cursor] == o.id
                        Button { answers[cursor] = o.id } label: {
                            HStack(alignment: .firstTextBaseline, spacing: 12) {
                                Text("\(i + 1)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                                Text(o.text).font(.latin(18)).foregroundStyle(Palette.ink).multilineTextAlignment(.leading)
                                Spacer(minLength: 0)
                                if chosen { Image(systemName: "largecircle.fill.circle").foregroundStyle(Palette.rubric) }
                            }
                            .padding(14)
                            .background(chosen ? Palette.sunk : Palette.slip, in: .rect(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(chosen ? Palette.rubric : Palette.ruleStrong, lineWidth: chosen ? 1 : 0.5))
                        }
                        .buttonStyle(PressStyle())
                        .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")), modifiers: [])
                        .accessibilityLabel(o.text)
                        .accessibilityAddTraits(chosen ? .isSelected : [])
                    }
                }
                .padding(20)
                .frame(maxWidth: 760, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .safeAreaInset(edge: .bottom) {
                HStack {
                    Button("Previous") { cursor -= 1 }.buttonStyle(.glass).disabled(cursor == 0)
                    Spacer()
                    Text("\(answers.count) of \(paper.mcq.count) answered").quietLabel()
                    Spacer()
                    if cursor < paper.mcq.count - 1 {
                        Button("Next") { cursor += 1 }.buttonStyle(.glassProminent)
                    } else {
                        Button("End Section I") { endSectionI() }.buttonStyle(.glassProminent)
                    }
                }
                .padding(.horizontal, 20).padding(.bottom, 8)
            }
        }
    }

    private func endSectionI() {
        guard stage == .mcq else { return }
        mcqUsed = min(ExamPaper.mcqSeconds, Date().timeIntervalSince(mcqStart))
        stage = .rest
        ExamLiveActivity.end()
    }

    private var restStage: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Section I complete").rubricLabel()
            Text("Take a breath").font(.system(.largeTitle, design: .serif))
            Text("You answered \(answers.count) of \(paper.mcq.count) questions. Section II is five free-response questions in 115 minutes. Scores aren't shown until the whole exam is finished — that's how the real one feels.")
                .font(.prose()).foregroundStyle(Palette.ink2)
            Button {
                frqStart = Date()
                stage = .frq
                ExamLiveActivity.start(.init(section: "Section II", detail: "Free response", startedAt: frqStart,
                                             endsAt: frqStart.addingTimeInterval(ExamPaper.frqSeconds), done: 0, total: paper.frqs.count))
            } label: {
                Text("Begin Section II").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            Button("Skip Section II and score now") { finish() }
        }
        .padding(24)
        .frame(maxWidth: 640)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /* -------------------------------------------------------------- */
    /* Section II                                                       */
    /* -------------------------------------------------------------- */

    private var frqStage: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                ForEach(paper.frqs) { p in
                    VStack(alignment: .leading, spacing: 10) {
                        Hairline()
                        Text(library?.meta.frqTypeLabels[p.type] ?? p.type).quietLabel()
                        HStack {
                            Text(p.title).font(.system(.headline, design: .serif))
                            Spacer()
                            Text("~\(p.minutes) min").font(.caption).foregroundStyle(Palette.inkMuted)
                        }
                        if let id = p.passageId, let passage = library?.passage(id) {
                            VStack(alignment: .leading, spacing: 3) {
                                ForEach(passage.lines.prefix(12)) { line in
                                    Text(line.latin).font(.latin(17)).foregroundStyle(Palette.ink)
                                }
                            }
                            .padding(12).background(Palette.sunk, in: .rect(cornerRadius: 10))
                        }
                        ForEach(p.subquestions) { sq in
                            Text("\(Text(sq.label).foregroundStyle(Palette.inkFaint)) \(sq.prompt)").font(.subheadline.weight(.semibold))
                            TextEditor(text: Binding(get: { frqAnswers["\(p.id):\(sq.id)"] ?? "" },
                                                     set: { frqAnswers["\(p.id):\(sq.id)"] = $0 }))
                                .font(.prose())
                                .frame(minHeight: sq.points > 3 ? 180 : 80)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                                .background(Palette.slip, in: .rect(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.rule, lineWidth: 0.5))
                        }
                    }
                }
                Button { finish() } label: {
                    Text("Finish and score").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
            }
            .padding(20)
            .frame(maxWidth: 820, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func finish() {
        guard stage != .report else { return }
        if stage == .mcq { mcqUsed = min(ExamPaper.mcqSeconds, Date().timeIntervalSince(mcqStart)) }
        if stage == .frq { frqUsed = min(ExamPaper.frqSeconds, Date().timeIntervalSince(frqStart)) }
        stage = .report
        ExamLiveActivity.end()
    }

    /* -------------------------------------------------------------- */
    /* Report                                                           */
    /* -------------------------------------------------------------- */

    private var tallies: (correct: Int, bySkill: [String: Tally], byType: [String: Tally]) {
        var correct = 0
        var bySkill: [String: Tally] = ["1": Tally(correct: 0, total: 0), "2": Tally(correct: 0, total: 0), "3": Tally(correct: 0, total: 0)]
        var byType: [String: Tally] = [:]
        for (i, q) in paper.mcq.enumerated() {
            let ok = answers[i] == q.answerId
            if ok { correct += 1 }
            bySkill[q.skillCategory, default: Tally(correct: 0, total: 0)].total += 1
            if ok { bySkill[q.skillCategory]?.correct += 1 }
            byType[q.type, default: Tally(correct: 0, total: 0)].total += 1
            if ok { byType[q.type]?.correct += 1 }
        }
        return (correct, bySkill, byType)
    }

    private var frqMax: Double { Double(paper.frqs.reduce(0) { $0 + $1.rubric.reduce(0) { $0 + $1.maxPoints } }) }
    private var frqPoints: Double { frqScores.values.reduce(0, +) }

    private var reportStage: some View {
        let t = tallies
        let pct = paper.mcq.isEmpty ? 0 : Int((Double(t.correct) / Double(paper.mcq.count) * 100).rounded())
        return ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                Text("Scored report").rubricLabel()
                FigureRow(spacing: 30) {
                    Figure(value: "\(t.correct)/\(paper.mcq.count)", caption: "Section I · \(pct)%", tint: Palette.rubric)
                    Figure(value: "\(frqPoints.formatted())/\(frqMax.formatted())", caption: "Section II · self-scored")
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("By skill category").rubricLabel()
                    ForEach(["1", "2", "3"], id: \.self) { k in
                        let s = t.bySkill[k] ?? Tally(correct: 0, total: 0)
                        HStack {
                            Text("Skill category \(k)")
                            Spacer()
                            Text("\(s.correct)/\(s.total)").monospacedDigit()
                        }
                        ProgressView(value: Double(s.correct), total: Double(max(1, s.total))).tint(Palette.rubric)
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("By question type").rubricLabel()
                    ForEach(t.byType.sorted { Double($0.value.correct) / Double($0.value.total) < Double($1.value.correct) / Double($1.value.total) }, id: \.key) { type, s in
                        HStack {
                            Text(library?.meta.questionTypeLabels[type] ?? type).foregroundStyle(Palette.ink2)
                            Spacer()
                            Text("\(s.correct)/\(s.total)").monospacedDigit()
                        }
                        .font(.subheadline)
                    }
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text("Score Section II against the rubric").rubricLabel()
                    Text("Free response can't be scored from an answer key. Work through the rubric rows here, or take each question into the FRQ Workshop for the full guidelines and a sample.")
                        .font(.footnote).foregroundStyle(Palette.inkMuted)
                    ForEach(paper.frqs) { p in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(p.title).font(.subheadline.weight(.semibold))
                            ForEach(p.rubric) { row in
                                HStack {
                                    Text(row.label).font(.caption).foregroundStyle(Palette.inkMuted)
                                    Spacer()
                                    Picker(row.label, selection: Binding(get: { frqScores["\(p.id):\(row.id)"] ?? 0 },
                                                                        set: { frqScores["\(p.id):\(row.id)"] = $0; saved = false })) {
                                        ForEach(0...row.maxPoints, id: \.self) { Text("\($0)").tag(Double($0)) }
                                    }
                                    .pickerStyle(.menu)
                                    .tint(Palette.rubric)
                                }
                            }
                        }
                    }
                }
                Button {
                    saveIfNeeded()
                } label: {
                    Text(saved ? "Saved to your history" : "Save results").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
                .disabled(saved)

                DisclosureGroup("Review every multiple-choice question") {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(Array(paper.mcq.enumerated()), id: \.offset) { i, q in
                            let chosen = answers[i]
                            let ok = chosen == q.answerId
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(i + 1). \(ok ? "Correct" : chosen == nil ? "Skipped" : "Wrong")").rubricLabel()
                                Text(q.prompt).font(.subheadline.weight(.semibold))
                                Text(q.options.first { $0.id == q.answerId }?.text ?? "").font(.latin(16)).foregroundStyle(Palette.correct)
                                Text(q.explanation).font(.footnote).foregroundStyle(Palette.inkMuted)
                            }
                            Hairline(color: Palette.hair)
                        }
                    }
                    .padding(.top, 8)
                }
                .tint(Palette.rubric)
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .onDisappear { saveIfNeeded() }
    }

    /// Records the sitting once — with Section II's scores if they've been
    /// entered — so leaving the report never loses the multiple-choice result.
    private func saveIfNeeded() {
        guard !saved else { return }
        let t = tallies
        model.update {
            $0.recordExam(mcqCorrect: t.correct, mcqTotal: paper.mcq.count, frqPoints: frqPoints, frqMax: frqMax,
                          bySkill: t.bySkill, byType: t.byType, mcqSeconds: mcqUsed.rounded(), frqSeconds: frqUsed.rounded())
            $0.markStudied()
        }
        model.reportActivity(source: "auto", correct: Double(t.correct), total: Double(paper.mcq.count))
        saved = true
    }
}

private struct ExamStimulus: View {
    @Environment(\.library) private var library
    let question: Question

    var body: some View {
        let passage = question.passageId.flatMap { library?.passage($0) }
        let lines: [PassageLine] = {
            guard let passage, let r = question.lineRange, r.count == 2 else { return [] }
            return passage.lines.filter { $0.n >= r[0] && $0.n <= r[1] }
        }()
        if !lines.isEmpty || question.stimulus != nil {
            VStack(alignment: .leading, spacing: 4) {
                Text(question.stimulus?.citation ?? passage?.citation ?? "").quietLabel()
                if !lines.isEmpty {
                    ForEach(lines) { Text($0.latin).font(.latin(19)).foregroundStyle(Palette.ink) }
                } else if let s = question.stimulus {
                    Text(s.latin).font(.latin(19)).foregroundStyle(Palette.ink)
                }
            }
            .padding(.leading, 12)
            .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }
        }
    }
}
