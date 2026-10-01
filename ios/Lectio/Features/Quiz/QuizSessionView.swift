import LectioCore
import SwiftUI

nonisolated struct QuizSession: Identifiable, Sendable {
    let id = UUID()
    let questions: [Question]
    let isReview: Bool
}

/// One set, question by question, then the results.
struct QuizSessionView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.dismiss) private var dismiss

    let session: QuizSession

    @State private var index = 0
    @State private var chosen: String?
    @State private var results: [Bool] = []
    @State private var startedAt = Date()

    var body: some View {
        NavigationStack {
            Group {
                if index < session.questions.count {
                    QuestionView(
                        question: session.questions[index],
                        number: index + 1,
                        total: session.questions.count,
                        chosen: chosen,
                        onChoose: choose,
                        onNext: next
                    )
                    .id(index)
                    .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
                } else {
                    QuizResultsView(session: session, results: results) { dismiss() }
                }
            }
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(index < session.questions.count ? "End set" : "Done", systemImage: "xmark") { dismiss() }
                }
            }
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
        }
        .onAppear {
            startedAt = Date()
            model.update { $0.markStudied() }
        }
    }

    private func choose(_ optionId: String) {
        guard chosen == nil else { return }
        let q = session.questions[index]
        let correct = optionId == q.answerId
        chosen = optionId
        results.append(correct)
        model.recordQuiz(q, chosenId: optionId, seconds: Date().timeIntervalSince(startedAt).rounded())
    }

    private func next() {
        withAnimation(.spring(duration: 0.4)) {
            chosen = nil
            index += 1
            startedAt = Date()
        }
    }
}

/* ------------------------------------------------------------------ */
/* A question                                                          */
/* ------------------------------------------------------------------ */

private struct QuestionView: View {
    @Environment(\.library) private var library
    let question: Question
    let number: Int
    let total: Int
    let chosen: String?
    let onChoose: (String) -> Void
    let onNext: () -> Void

    private var revealed: Bool { chosen != nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                stimulus
                Text(question.prompt)
                    .font(.system(.title3, design: .serif).weight(.semibold))
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                options
                if revealed { explanation }
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            if revealed {
                Button(action: onNext) {
                    Text(number < total ? "Next question" : "See results")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .glassButton(prominent: true)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.35), value: revealed)
        .sensoryFeedback(trigger: chosen) { _, new in
            guard let new else { return nil }
            return new == question.answerId ? .success : .error
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Text("\(number) of \(total)").rubricLabel().monospacedDigit()
                Text(library?.meta.questionTypeLabels[question.type] ?? question.type).quietLabel()
                Text("Skill \(question.skill)").quietLabel()
            }
            ProgressView(value: Double(number - 1), total: Double(total))
                .tint(Palette.rubric)
        }
    }

    @ViewBuilder
    private var stimulus: some View {
        let passage = question.passageId.flatMap { library?.passage($0) }
        let lines: [PassageLine] = {
            guard let passage, let range = question.lineRange, range.count == 2 else { return [] }
            return passage.lines.filter { $0.n >= range[0] && $0.n <= range[1] }
        }()
        if !lines.isEmpty || question.stimulus != nil {
            VStack(alignment: .leading, spacing: 6) {
                Text(question.stimulus?.citation ?? passage?.citation ?? "").rubricLabel()
                if !lines.isEmpty {
                    ForEach(lines) { line in
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text("\(line.n)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkFaint).frame(width: 28, alignment: .trailing)
                            Text(line.latin).font(.latin(20)).foregroundStyle(Palette.ink)
                        }
                    }
                } else if let stimulus = question.stimulus {
                    Text(stimulus.latin).font(.latin(20)).foregroundStyle(Palette.ink)
                    if let gloss = stimulus.gloss, !gloss.isEmpty {
                        Hairline(color: Palette.redLine).padding(.vertical, 6)
                        ForEach(gloss, id: \.word) { g in
                            Text("\(Text(g.word).fontWeight(.semibold)) — \(g.meaning)")
                                .font(.latin(16))
                                .foregroundStyle(Palette.ink2)
                        }
                    }
                }
            }
            .padding(.leading, 14)
            .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }
        }
    }

    private var options: some View {
        VStack(spacing: 10) {
            ForEach(Array(question.options.enumerated()), id: \.element.id) { i, option in
                let isAnswer = option.id == question.answerId
                let isChosen = option.id == chosen
                Button {
                    onChoose(option.id)
                } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text("\(i + 1)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                        Text(option.text).font(.latin(18)).foregroundStyle(Palette.ink).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        if revealed, isAnswer {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.correct)
                        } else if revealed, isChosen {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(Palette.incorrect)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(background(isAnswer: isAnswer, isChosen: isChosen), in: .rect(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(border(isAnswer: isAnswer, isChosen: isChosen), lineWidth: 1))
                    .opacity(revealed && !isAnswer && !isChosen ? 0.5 : 1)
                }
                .buttonStyle(PressStyle())
                .disabled(revealed)
                .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")), modifiers: [])
                .accessibilityLabel(option.text)
                .accessibilityValue(revealed ? (isAnswer ? "Correct answer" : isChosen ? "Your answer, incorrect" : "") : "")
            }
        }
    }

    private func background(isAnswer: Bool, isChosen: Bool) -> Color {
        guard revealed else { return Palette.slip }
        if isAnswer { return Palette.correctWash }
        if isChosen { return Palette.incorrectWash }
        return Palette.slip
    }

    private func border(isAnswer: Bool, isChosen: Bool) -> Color {
        guard revealed else { return Palette.ruleStrong }
        if isAnswer { return Palette.correct }
        if isChosen { return Palette.incorrect }
        return Palette.rule
    }

    private var explanation: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Why").rubricLabel()
            Text(question.explanation)
                .font(.prose())
                .foregroundStyle(Palette.ink2)
                .fixedSize(horizontal: false, vertical: true)
            if let id = question.passageId, let passage = library?.passage(id) {
                NavigationLink(value: passage) {
                    Text("Read \(passage.citation) in full →").foregroundStyle(Palette.rubric)
                }
            }
        }
        .padding(16)
        .background(Palette.slip, in: .rect(cornerRadius: 14))
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}

/// Gives slightly under the finger, like the web's `.squish`.
struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

private struct QuizResultsView: View {
    let session: QuizSession
    let results: [Bool]
    let onDone: () -> Void

    var body: some View {
        let correct = results.filter { $0 }.count
        let pct = results.isEmpty ? 0 : Int((Double(correct) / Double(results.count) * 100).rounded())
        let missed = results.count - correct
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text("Set complete").rubricLabel()
                Text("\(pct)%")
                    .font(.system(size: 64, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text("\(correct) of \(results.count) correct. " + (missed > 0
                     ? "\(missed) question\(missed == 1 ? "" : "s") went to your review queue."
                     : "Nothing added to the review queue — clean set."))
                    .font(.prose())
                    .foregroundStyle(Palette.ink2)
                Hairline()
                ForEach(Array(session.questions.enumerated()), id: \.element.id) { i, q in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Circle().fill(i < results.count && results[i] ? Palette.correct : Palette.rubric).frame(width: 7, height: 7)
                        Text(q.prompt).font(.latin(16)).foregroundStyle(Palette.ink2).lineLimit(2)
                    }
                }
                Button(action: onDone) {
                    Text("Done").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassButton(prominent: true)
                .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}
