import LectioCore
import SwiftUI

/// One lesson, full screen: what it teaches, its steps one at a time, then a
/// result — the web's LessonPlayer. An exercise answered wrong comes back
/// once at the end; only the first try counts toward the score.
///
/// The page is parchment; the controls that float over it (close, Continue,
/// the feedback panel) are glass.
struct LessonView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let place: LessonPlace

    private enum Phase { case intro, steps, done }

    @State private var phase: Phase = .intro
    @State private var queue: [Int] = []
    @State private var pos = 0
    @State private var firstTry: [Int: Bool] = [:]
    @State private var requeued: Set<Int> = []
    @State private var result: Bool?
    @State private var score = 0.0

    private var lesson: Lesson { place.lesson }
    /// Steps this build can show (content from a newer website may have kinds it doesn't know).
    private var playable: [Int] { lesson.steps.indices.filter { lesson.steps[$0] != .unknown } }
    private var exerciseCount: Int { playable.filter { lesson.steps[$0].isExercise }.count }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .intro: intro
                case .steps: stepsView
                case .done: done
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                }
                if phase == .steps {
                    ToolbarItem(placement: .principal) {
                        ProgressView(value: Double(pos), total: Double(max(queue.count, 1)))
                            .tint(Palette.rubric)
                            .frame(width: 180)
                            .accessibilityLabel("Step \(pos + 1) of \(queue.count)")
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Text("\(pos + 1) / \(queue.count)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .sensoryFeedback(trigger: result) { _, new in
            switch new {
            case .some(true): .success
            case .some(false): .error
            case .none: nil
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Intro                                                            */
    /* -------------------------------------------------------------- */

    private var intro: some View {
        let previous = model.progress.lessons[lesson.id]
        return ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(place.level.title) · Unit \(place.unit.n) · Lesson \(place.number)").rubricLabel()
                    Text(rich: lesson.title)
                        .font(.system(.largeTitle, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text(rich: lesson.summary)
                        .font(.prose(.title3))
                        .foregroundStyle(Palette.ink2)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("You will be able to").quietLabel()
                    ForEach(lesson.objectives, id: \.self) { o in
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            Text("·").foregroundStyle(Palette.rubric)
                            Text(rich: o).font(.prose(.body)).foregroundStyle(Palette.ink)
                        }
                    }
                }

                if !lesson.words.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("New words").quietLabel().padding(.bottom, 8)
                        ForEach(lesson.words, id: \.latin) { w in
                            Hairline(color: Palette.hair)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(Text(w.latin).font(.latinItalic(19, relativeTo: .body)).foregroundStyle(Palette.ink))  \(Text(w.english).foregroundStyle(Palette.ink2))")
                                    .font(.prose(.body))
                                if let d = w.derivatives, !d.isEmpty {
                                    Text("English: \(d.joined(separator: ", "))").font(.footnote).foregroundStyle(Palette.inkMuted)
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }

                if let previous {
                    Label("Finished · best \(Int((previous.best * 100).rounded()))%", systemImage: "checkmark.seal")
                        .font(.subheadline)
                        .foregroundStyle(Palette.correct)
                }
            }
            .padding(20)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                start()
            } label: {
                Text(previous == nil ? "Begin · \(lesson.minutes) min" : "Do it again · \(lesson.minutes) min")
                    .font(.headline)
                    .frame(maxWidth: 520)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.glassProminent)
            .keyboardShortcut(.return, modifiers: [])
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
    }

    private func start() {
        queue = playable
        pos = 0
        firstTry = [:]
        requeued = []
        result = nil
        withAnimation(.spring(duration: 0.4)) { phase = queue.isEmpty ? .done : .steps }
    }

    /* -------------------------------------------------------------- */
    /* Steps                                                            */
    /* -------------------------------------------------------------- */

    private var stepsView: some View {
        let index = queue.isEmpty ? 0 : queue[min(pos, queue.count - 1)]
        let step = lesson.steps[index]
        return ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if pos >= playable.count { Text("Once more").rubricLabel() }
                StepContent(step: step, result: result, answer: { answered(index, right: $0) })
            }
            .padding(20)
            .padding(.bottom, 20)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
            .id(pos)
            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            if !step.isExercise {
                ContinueBar(action: advance)
            } else if let result {
                FeedbackPanel(right: result, step: step, onContinue: advance)
            }
        }
        .animation(.spring(duration: 0.35), value: result)
    }

    private func answered(_ index: Int, right: Bool) {
        result = right
        if firstTry[index] == nil { firstTry[index] = right }
        if !right && !requeued.contains(index) {
            requeued.insert(index)
            queue.append(index)
        }
    }

    private func advance() {
        if pos + 1 < queue.count {
            withAnimation(.spring(duration: 0.4)) {
                result = nil
                pos += 1
            }
            return
        }
        let right = firstTry.values.filter { $0 }.count
        score = LessonCheck.score(right: right, of: exerciseCount)
        model.completeLesson(lesson, score: score)
        withAnimation(.spring(duration: 0.45)) {
            result = nil
            phase = .done
        }
    }

    /* -------------------------------------------------------------- */
    /* Result                                                           */
    /* -------------------------------------------------------------- */

    private var done: some View {
        let right = firstTry.values.filter { $0 }.count
        let deck = lesson.words.filter { $0.vocabId != nil }
        let next = model.content?.course.after(lesson.id)
        let (verdict, gloss) = score >= 0.9 ? ("Optimē!", "Excellent.") : score >= 0.7 ? ("Bene!", "Well done.") : ("Satis.", "Enough for now. It's worth another go.")
        return ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Lesson complete").rubricLabel()
                VStack(alignment: .leading, spacing: 4) {
                    Text(verdict).font(.latinItalic(52, relativeTo: .largeTitle)).foregroundStyle(Palette.rubric)
                    Text(gloss).font(.prose(.title3)).foregroundStyle(Palette.inkMuted)
                }
                HStack(alignment: .top, spacing: 32) {
                    Figure(value: "\(Int((score * 100).rounded()))%", caption: "score", tint: Palette.rubric)
                    Figure(value: "\(right) / \(exerciseCount)", caption: "right first time")
                    if !deck.isEmpty { Figure(value: "\(deck.count)", caption: deck.count == 1 ? "word to your deck" : "words to your deck") }
                }
                if !deck.isEmpty {
                    Text("\(deck.map { $0.latin.components(separatedBy: ",")[0] }.joined(separator: ", ")) \(deck.count == 1 ? "is" : "are") now in your flashcards, due today. Reviewing them tomorrow is what makes them stick.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.ink2)
                }
            }
            .padding(20)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 10) {
                    if let next {
                        Button {
                            model.activeLesson = next
                        } label: {
                            Text("Next: \(RichText.plain(next.lesson.title))").font(.headline).lineLimit(1).frame(maxWidth: 520).padding(.vertical, 8)
                        }
                        .buttonStyle(.glassProminent)
                        .keyboardShortcut(.return, modifiers: [])
                    }
                    HStack(spacing: 10) {
                        Button { start() } label: { Text("Do it again").frame(maxWidth: .infinity).padding(.vertical, 4) }
                            .buttonStyle(.glass)
                        if next == nil {
                            Button { dismiss() } label: { Text("Done").frame(maxWidth: .infinity).padding(.vertical, 4) }
                                .buttonStyle(.glassProminent)
                                .keyboardShortcut(.return, modifiers: [])
                        } else {
                            Button { dismiss() } label: { Text("Done").frame(maxWidth: .infinity).padding(.vertical, 4) }
                                .buttonStyle(.glass)
                        }
                    }
                    .frame(maxWidth: 520)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
    }
}

/* ------------------------------------------------------------------ */
/* The bars at the bottom                                              */
/* ------------------------------------------------------------------ */

private struct ContinueBar: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("Continue").font(.headline).frame(maxWidth: 520).padding(.vertical, 8)
        }
        .buttonStyle(.glassProminent)
        .keyboardShortcut(.return, modifiers: [])
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }
}

/// Right or not, the answer when it was wrong, why, and Continue — glass,
/// floating over the page.
private struct FeedbackPanel: View {
    let right: Bool
    let step: LessonStep
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(right ? "Rēctē — right" : "Not quite", systemImage: right ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.headline)
                .foregroundStyle(right ? Palette.correct : Palette.incorrect)
            if !right, let correct = correctAnswer {
                Text("\(Text("Answer  ").font(.caption.weight(.semibold)).foregroundStyle(Palette.inkMuted))\(Text(correct).font(.latin(19, relativeTo: .body)).foregroundStyle(Palette.ink))")
            }
            if let explain {
                Text(rich: explain).font(.prose(.callout)).foregroundStyle(Palette.ink2)
            }
            if !right {
                Text("This one comes back at the end.").font(.caption).foregroundStyle(Palette.inkMuted)
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

    private var correctAnswer: String? {
        switch step {
        case .choice(let s): RichText.plain(s.options[s.answer])
        case .type(let s): s.answers.first
        case .translate(let s): s.answers.first
        case .build(let s): s.answer.joined(separator: " ")
        default: nil
        }
    }

    private var explain: String? {
        switch step {
        case .choice(let s): s.explain
        case .type(let s): s.explain
        case .translate(let s): s.explain
        case .build(let s): s.explain ?? (s.anyOrder == true && right ? "Any order of these words is good Latin." : nil)
        case .match: right ? nil : "All matched in the end. The pairs you missed are worth a second look."
        default: nil
        }
    }
}
