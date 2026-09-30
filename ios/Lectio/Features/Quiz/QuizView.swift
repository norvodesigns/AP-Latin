import LectioCore
import SwiftUI

/// Filters for a practice set — the web Quiz Engine's, one for one.
nonisolated struct QuizFilters: Equatable, Sendable {
    nonisolated enum Author: String, CaseIterable, Identifiable, Sendable {
        case all, vergil, pliny, sight
        var id: String { rawValue }
        var label: String {
            switch self {
            case .all: "All authors"
            case .vergil: "Vergil"
            case .pliny: "Pliny"
            case .sight: "Sight (no syllabus passage)"
            }
        }
    }

    var author: Author = .all
    var passageId: String? = nil
    var unit: String? = nil
    var skill: String? = nil
    var types: Set<String>
    var count = 10

    func matches(_ q: Question, passage: (String) -> Passage?) -> Bool {
        guard types.contains(q.type) else { return false }
        if let skill, q.skillCategory != skill { return false }
        if let unit, q.unit != unit { return false }
        if let passageId, q.passageId != passageId { return false }
        switch author {
        case .all: return true
        case .sight: return q.passageId == nil
        case .vergil, .pliny:
            guard let id = q.passageId, let p = passage(id) else { return false }
            return p.author == author.rawValue
        }
    }
}

/// Configurable AP-style multiple choice: build a set, answer it with an
/// explanation after every question, and anything missed goes to a review
/// queue that clears as you get each one right.
struct QuizView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    @State private var filters = QuizFilters(types: [])
    @State private var session: QuizSession?

    var body: some View {
        SectionStack {
            if let library {
                setup(library)
                    .fullScreenCover(item: $session) { QuizSessionView(session: $0) }
                    .onAppear {
                        if filters.types.isEmpty { filters.types = Set(library.meta.questionTypeLabels.keys) }
                        applyPreset()
                    }
                    .onChange(of: model.quizPresetType) { applyPreset() }
            }
        }
    }

    /// A weak spot on Today opens the Quiz narrowed to that question type.
    private func applyPreset() {
        guard let type = model.quizPresetType else { return }
        filters = QuizFilters(types: [type])
        model.quizPresetType = nil
    }

    private func setup(_ library: ContentLibrary) -> some View {
        let pool = library.questions.filter { filters.matches($0, passage: library.passage) }
        let reviewPool = model.progress.reviewQueue.compactMap(library.question)
        let passagesWithQuestions = library.passages.filter { p in library.questions.contains { $0.passageId == p.id } }
            .filter { filters.author == .all || filters.author == .sight ? true : $0.author == filters.author.rawValue }

        return ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                Text("Build a set filtered by author, passage, unit, skill or question type. Every question explains its answer, and missed ones go to your review queue.")
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.ink2)

                if !reviewPool.isEmpty {
                    Button {
                        session = QuizSession(questions: reviewPool, isReview: true)
                    } label: {
                        Label("Review what you missed (\(reviewPool.count))", systemImage: "arrow.uturn.backward")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                    }
                    .buttonStyle(.glass)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Source").rubricLabel().padding(.bottom, 6)
                    FilterRow(title: "Author") {
                        Picker("Author", selection: $filters.author) {
                            ForEach(QuizFilters.Author.allCases) { Text($0.label).tag($0) }
                        }
                    }
                    FilterRow(title: "Passage") {
                        Picker("Passage", selection: $filters.passageId) {
                            Text("Any passage").tag(String?.none)
                            ForEach(passagesWithQuestions) { Text($0.citation).tag(Optional($0.id)) }
                        }
                    }
                    Text("Scope").rubricLabel().padding(.top, 16).padding(.bottom, 6)
                    FilterRow(title: "Unit") {
                        Picker("Unit", selection: $filters.unit) {
                            Text("All units").tag(String?.none)
                            ForEach(library.meta.unitTitles.keys.sorted(), id: \.self) { Text("Unit \($0)").tag(Optional($0)) }
                        }
                    }
                    FilterRow(title: "Skill") {
                        Picker("Skill", selection: $filters.skill) {
                            Text("All skills").tag(String?.none)
                            Text("1 — Read and comprehend").tag(Optional("1"))
                            Text("2 — Style and context").tag(Optional("2"))
                            Text("3 — Analyse with evidence").tag(Optional("3"))
                        }
                    }
                }
                .onChange(of: filters.author) { filters.passageId = nil }

                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Question types").rubricLabel()
                        Spacer()
                        Button("All") { filters.types = Set(library.meta.questionTypeLabels.keys) }
                        Button("None") { filters.types = [] }
                    }
                    .font(.subheadline)
                    FlowLayout(lineSpacing: 8) {
                        ForEach(library.meta.questionTypeLabels.sorted { $0.value < $1.value }, id: \.key) { type, label in
                            let on = filters.types.contains(type)
                            let n = library.questions.filter { $0.type == type }.count
                            Button {
                                if on { filters.types.remove(type) } else { filters.types.insert(type) }
                            } label: {
                                Text("\(label)  \(n)").font(.subheadline)
                            }
                            .buttonStyle(ChipStyle(on: on))
                            .padding(.trailing, 8)
                            .accessibilityAddTraits(on ? .isSelected : [])
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Set length").rubricLabel()
                    Picker("Set length", selection: $filters.count) {
                        Text("5").tag(5)
                        Text("10").tag(10)
                        Text("20").tag(20)
                        Text("52 · full").tag(52)
                    }
                    .pickerStyle(.segmented)
                }

                VStack(spacing: 10) {
                    Button {
                        session = QuizSession(questions: Array(pool.shuffled().prefix(filters.count)), isReview: false)
                    } label: {
                        Text(pool.isEmpty ? "No matching questions" : "Start set")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(pool.isEmpty)
                    Text(pool.isEmpty ? "Widen the type or scope selection." : "\(pool.count) question\(pool.count == 1 ? "" : "s") match")
                        .quietLabel()
                }
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle("Quiz Engine")
    }
}

/// A labelled row holding a menu picker.
private struct FilterRow<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        HStack {
            Text(title).foregroundStyle(Palette.ink)
            Spacer()
            content.pickerStyle(.menu).tint(Palette.rubric)
        }
        .padding(.vertical, 6)
        .overlay(alignment: .bottom) { Hairline(color: Palette.hair) }
    }
}

/// A toggle chip — rounded and pressable like the web's `.chip`, rubric-filled when on.
struct ChipStyle: ButtonStyle {
    let on: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .foregroundStyle(on ? Palette.onRubric : Palette.ink)
            .background(on ? Palette.rubric : Palette.slip, in: .capsule)
            .overlay(Capsule().strokeBorder(on ? Color.clear : Palette.ruleStrong, lineWidth: 0.5))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}
