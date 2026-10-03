import LectioCore
import SwiftUI

/// One placement question: the prompt, the Latin, the options, and a way to
/// say "I don't know". A choice shows right and wrong for a moment, then
/// reports. Shared by the first run and the level check; give each question
/// its own `.id` so the choice resets.
struct PlacementCard: View {
    let question: PlacementQuestion
    let number: Int
    let total: Int
    let onAnswer: (Bool) -> Void
    @State private var chosen: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Question \(number) of \(total)").rubricLabel()
            ProgressView(value: Double(number - 1), total: Double(max(1, total))).tint(Palette.rubric)
            Text(rich: question.step.prompt)
                .font(.system(.title3, design: .serif).weight(.semibold))
                .foregroundStyle(Palette.ink)
            if let latin = question.step.latin {
                Text(latin).font(.latin(28, relativeTo: .title)).foregroundStyle(Palette.ink)
            }
            ForEach(Array(question.step.options.enumerated()), id: \.offset) { i, option in
                Button { pick(i) } label: {
                    Text(rich: option)
                        .font(.prose(.body))
                        .foregroundStyle(Palette.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 13)
                        .background(background(i), in: .rect(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(border(i), lineWidth: chosen == nil ? 0.75 : 1.5))
                }
                .buttonStyle(PressStyle())
                .disabled(chosen != nil)
                .accessibilityValue(chosen == nil ? "" : i == question.step.answer ? "Correct answer" : i == chosen ? "Your answer, incorrect" : "")
            }
            Button("I don’t know this yet") { onAnswer(false) }
                .font(.subheadline)
                .tint(Palette.inkMuted)
                .disabled(chosen != nil)
        }
        .sensoryFeedback(.selection, trigger: chosen)
    }

    private func pick(_ i: Int) {
        guard chosen == nil else { return }
        chosen = i
        Task {
            try? await Task.sleep(for: .milliseconds(650))
            onAnswer(i == question.step.answer)
        }
    }

    private func background(_ i: Int) -> Color {
        guard chosen != nil else { return Palette.slip }
        if i == question.step.answer { return Palette.correctWash }
        return i == chosen ? Palette.incorrectWash : Palette.slip
    }

    private func border(_ i: Int) -> Color {
        guard chosen != nil else { return Palette.ruleStrong }
        if i == question.step.answer { return Palette.correct }
        return i == chosen ? Palette.incorrect : Palette.ruleStrong
    }
}

/// The level check, any time (the course's "Find my level"): the grammar
/// placement, easiest first, stopping once it has found your level; then two
/// words from each unit of the AP list. Nothing is scored. It decides where
/// the grammar track starts and which vocabulary units are offered as unit
/// tests first (LectioCore `Path`), and the student says whether to use it.
struct LevelCheckView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss

    private enum Stage { case intro, grammar, vocabulary, result }

    @State private var stage: Stage = .intro
    @State private var withGrammar = true
    @State private var grammar: [Placement.Answer] = []
    @State private var vocabulary: [Placement.Answer] = []

    private var grammarQuestions: [PlacementQuestion] { library?.course.placement ?? [] }
    private var vocabQuestions: [PlacementQuestion] { library?.course.vocabPlacement ?? [] }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    switch stage {
                    case .intro: intro
                    case .grammar: grammarQuestion
                    case .vocabulary: vocabQuestion
                    case .result: result
                    }
                }
                .padding(24)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
                .animation(.spring(duration: 0.4), value: stage)
            }
            .ambientBackground()
            .navigationTitle("Find my level")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    /* -------------------------------------------------------------- */

    private var intro: some View {
        VStack(spacing: 16) {
            Image(systemName: "scope")
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(Palette.rubric)
                .padding(.top, 20)
            Text("Two short parts")
                .font(.system(.title, design: .serif))
                .foregroundStyle(Palette.ink)
            GlassPanel {
                part("Grammar", "Up to \(grammarQuestions.count) questions, easiest first. It stops as soon as it finds your level, usually well before the end.", "text.book.closed", Palette.rubric)
                Hairline(color: Palette.hair)
                part("Vocabulary", "\(vocabQuestions.count) words, two from each part of the AP list. Where you know both, that part’s unit test comes first, so you can skip what you know.", "character.book.closed", Palette.woad)
            }
            Text("Nothing is scored, and you choose whether to use the result.")
                .font(.prose(.callout))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
            GlassGroup(spacing: 12) {
                VStack(spacing: 12) {
                    Button {
                        withGrammar = true
                        stage = grammarQuestions.isEmpty ? .vocabulary : .grammar
                    } label: {
                        Text("Start").font(.headline).frame(maxWidth: 300).padding(.vertical, 6)
                    }
                    .glassButton(prominent: true)
                    if !vocabQuestions.isEmpty {
                        Button {
                            withGrammar = false
                            stage = .vocabulary
                        } label: {
                            Text("Just the vocabulary").frame(maxWidth: 300).padding(.vertical, 4)
                        }
                        .glassButton()
                    }
                }
            }
        }
    }

    private func part(_ title: String, _ detail: String, _ symbol: String, _ tint: Color) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(tint)
                .frame(width: 40, height: 40)
                .background(tint.opacity(0.14), in: .circle)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text(detail).font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var grammarQuestion: some View {
        if grammar.count < grammarQuestions.count {
            VStack(alignment: .leading, spacing: 8) {
                Text("Grammar").quietLabel()
                PlacementCard(question: grammarQuestions[grammar.count], number: grammar.count + 1, total: grammarQuestions.count) { right in
                    grammar.append(Placement.Answer(unit: grammarQuestions[grammar.count].unit, right: right))
                    if !Placement.continues(grammar, total: grammarQuestions.count) {
                        stage = vocabQuestions.isEmpty ? .result : .vocabulary
                    }
                }
                .id("g\(grammar.count)")
            }
        }
    }

    @ViewBuilder
    private var vocabQuestion: some View {
        if vocabulary.count < vocabQuestions.count {
            VStack(alignment: .leading, spacing: 8) {
                Text("Vocabulary").quietLabel()
                PlacementCard(question: vocabQuestions[vocabulary.count], number: vocabulary.count + 1, total: vocabQuestions.count) { right in
                    vocabulary.append(Placement.Answer(unit: vocabQuestions[vocabulary.count].unit, right: right))
                    if vocabulary.count >= vocabQuestions.count { stage = .result }
                }
                .id("v\(vocabulary.count)")
            }
        }
    }

    /* -------------------------------------------------------------- */

    /// Where the grammar starts: the first unit with a slip, or past every
    /// unit the check asked about.
    private var grammarStart: LessonPlace? {
        guard withGrammar, let course = library?.course, !grammar.isEmpty else { return nil }
        let unit = Placement.start(grammar) ?? Placement.unitBeyond(course.unitIds, probed: grammarQuestions.map(\.unit))
        return unit.flatMap { course.firstLesson(ofUnit: $0) }
    }

    private var knownUnits: [String] { Path.knownVocabUnits(vocabulary) }

    private var result: some View {
        let start = grammarStart
        let known = knownUnits
        let units = library?.course.vocabLevel?.units ?? []
        return VStack(spacing: 16) {
            Image(systemName: "checkmark.seal")
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(Palette.correct)
                .padding(.top, 20)
            Text("Your path")
                .font(.system(.title, design: .serif))
                .foregroundStyle(Palette.ink)
            GlassPanel {
                if withGrammar {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Grammar").quietLabel()
                        if let start {
                            Text("Start at \(start.level.title), Unit \(start.unit.n): \(Text(RichText.plain(start.unit.title)).italic()).")
                                .font(.prose(.body)).foregroundStyle(Palette.ink)
                            Text("The units before it stay open, for review whenever you like.")
                                .font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted)
                        } else {
                            Text("You answered everything right: start with the AP texts, and use the grammar for review.")
                                .font(.prose(.body)).foregroundStyle(Palette.ink)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Hairline(color: Palette.hair)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Vocabulary").quietLabel()
                    let right = vocabulary.filter(\.right).count
                    Text("\(right) of \(vocabulary.count) words known.")
                        .font(.prose(.body)).foregroundStyle(Palette.ink)
                    ForEach(units) { unit in
                        let isKnown = known.contains(unit.id)
                        Label {
                            Text("\(unit.title): \(isKnown ? "start with the unit test" : "start with the lessons")")
                                .font(.prose(.subheadline))
                                .foregroundStyle(isKnown ? Palette.ink : Palette.inkMuted)
                        } icon: {
                            Image(systemName: isKnown ? "checkmark.seal.fill" : "circle")
                                .foregroundStyle(isKnown ? Palette.woad : Palette.inkFaint)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            GlassGroup(spacing: 12) {
                VStack(spacing: 12) {
                    Button {
                        model.applyLevelCheck(startLessonId: withGrammar ? start?.lesson.id : nil, knownVocabUnits: known)
                        dismiss()
                    } label: {
                        Text("Use this path").font(.headline).frame(maxWidth: 300).padding(.vertical, 6)
                    }
                    .glassButton(prominent: true)
                    Button { dismiss() } label: {
                        Text("Keep my current path").frame(maxWidth: 300).padding(.vertical, 4)
                    }
                    .glassButton()
                }
            }
        }
    }
}
