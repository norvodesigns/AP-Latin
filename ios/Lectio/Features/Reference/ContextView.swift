import LectioCore
import SwiftUI

/// Skill 2.B, historical and cultural context — src/app/context/ContextCards.tsx:
/// the cards, a study deck over them, and the context-culture questions.
struct ContextView: View {
    @Environment(\.library) private var library
    @State private var mode = Mode.cards
    @State private var quiz: QuizSession?

    nonisolated enum Mode: String, CaseIterable, Identifiable, Sendable {
        case cards = "Cards", study = "Study", quiz = "Quiz"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if let library {
                        switch mode {
                        case .cards: cards(library)
                        case .study:
                            StudyDeck(items: library.contextCards, noun: "card") { c in
                                VStack(spacing: 12) {
                                    Text(library.meta.contextTopicLabels[c.topic] ?? "").quietLabel()
                                    Text(c.title).font(.system(.title, design: .serif)).multilineTextAlignment(.center)
                                }
                            } back: { c in
                                ContextBody(card: c)
                            }
                        case .quiz: quizStart(library)
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 760, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .navigationTitle("Context & Culture")
            .fullScreenCover(item: $quiz) { QuizSessionView(session: $0) }
        }
    }

    @ViewBuilder
    private func cards(_ library: ContentLibrary) -> some View {
        let syllabus = library.contextCards.filter(\.isRequired)
        let background = library.contextCards.filter { !$0.isRequired }
        Text("The syllabus").rubricLabel()
        ForEach(syllabus) { ContextEntry(card: $0, topic: library.meta.contextTopicLabels[$0.topic]) }
        if !background.isEmpty {
            Text("Roman background").rubricLabel().padding(.top, 12)
            Text("Not required by the exam, but assumed by every author on it.")
                .font(.footnote).foregroundStyle(Palette.inkMuted)
            ForEach(background) { ContextEntry(card: $0, topic: library.meta.contextTopicLabels[$0.topic]) }
        }
    }

    private func quizStart(_ library: ContentLibrary) -> some View {
        let pool = library.questions.filter { $0.type == "context-culture" }
        return VStack(alignment: .leading, spacing: 14) {
            Text("\(pool.count) questions on context and culture, drawn from the Quiz Engine's pool. Misses go to your review queue.")
                .font(.prose(.callout)).foregroundStyle(Palette.ink2)
            Button {
                quiz = QuizSession(questions: pool.shuffled(), isReview: false)
            } label: {
                Text("Start").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .disabled(pool.isEmpty)
        }
    }
}

private struct ContextEntry: View {
    let card: ContextCard
    let topic: String?
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.spring(duration: 0.3)) { open.toggle() }
            } label: {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let topic { Text(topic).quietLabel() }
                        Text(card.title).font(.system(.title3, design: .serif)).foregroundStyle(Palette.ink)
                    }
                    Spacer()
                    Image(systemName: "chevron.down").rotationEffect(.degrees(open ? 180 : 0)).foregroundStyle(Palette.inkFaint)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if open { ContextBody(card: card).transition(.opacity) }
            Hairline(color: Palette.hair).padding(.top, 6)
        }
    }
}

private struct ContextBody: View {
    let card: ContextCard

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(card.body).font(.prose()).foregroundStyle(Palette.ink)
            VStack(alignment: .leading, spacing: 6) {
                Text("Worth knowing cold").rubricLabel()
                ForEach(card.keyFacts, id: \.self) { fact in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("·").foregroundStyle(Palette.rubric)
                        Text(fact).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                    }
                }
            }
        }
    }
}
