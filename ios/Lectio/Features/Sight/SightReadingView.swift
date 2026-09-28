import LectioCore
import SwiftUI

/// One sight passage ready to attempt — a vetted one from the course, or one
/// the website's generator just selected.
nonisolated struct SightItem: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let subtitle: String
    let genre: String
    let latin: String
    let gloss: [GlossNote]
    let summary: String
    let source: String
    let questions: [Question]
    let machineSelected: Bool
    let confidence: String?
    let cached: Bool
}

/// Timed unseen passages — src/app/sight/SightReading.tsx. Half of the
/// exam's multiple choice is sight reading.
struct SightReadingView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    @State private var author = "Nepos"
    @State private var genre = "prose"
    @State private var variant = 0
    @State private var generating = false
    @State private var generateError: String?
    @State private var generated: SightItem?

    var body: some View {
        SectionStack {
            List {
                Section {
                    Text("Unseen passages from the authors the CED names for sight practice. Read it cold, answer the questions, then check the summary.")
                        .font(.prose(.callout)).foregroundStyle(Palette.ink2)
                        .listRowBackground(Color.clear)
                }
                if let library {
                    Section {
                        ForEach(library.sightPassages) { p in
                            NavigationLink(value: item(for: p, library: library)) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(p.citation).font(.latin(20, relativeTo: .headline)).foregroundStyle(Palette.ink)
                                    Text("\(p.author), \(p.work)").font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted)
                                    Text("\(p.genre) · \(p.latin.split(whereSeparator: \.isWhitespace).count) words · \(p.questionIds.count) questions").quietLabel()
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(Color.clear)
                        }
                    } header: { Text("Vetted passages").rubricLabel() }

                    Section {
                        generator(library)
                            .listRowBackground(Color.clear)
                    } header: { Text("Generate a new passage").rubricLabel() }
                }
            }
            .listStyle(.plain)
            .readableColumn()
            .pageBackground()
            .navigationTitle("Sight Reading")
            .navigationDestination(for: SightItem.self) { SightAttemptView(item: $0) }
            .navigationDestination(item: $generated) { SightAttemptView(item: $0) }
            .task { await model.checkAI() }
        }
    }

    @ViewBuilder
    private func generator(_ library: ContentLibrary) -> some View {
        if model.aiAvailable == false {
            Text("No AI provider is configured, so passage generation is off. The vetted passages above work exactly the same.")
                .font(.prose(.callout)).foregroundStyle(Palette.ink2)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("The model selects a genuine public-domain passage rather than composing Latin, with glosses and AP-style questions. Generated passages are always labelled machine-selected — nobody has checked them against a printed text.")
                    .font(.footnote).foregroundStyle(Palette.inkMuted)
                Picker("Author", selection: $author) {
                    ForEach(library.sightAuthors, id: \.self) { Text($0).tag($0) }
                }
                .tint(Palette.rubric)
                Picker("Genre", selection: $genre) {
                    Text("Prose").tag("prose")
                    Text("Poetry").tag("poetry")
                }
                .pickerStyle(.segmented)
                Button {
                    Task { await generate() }
                } label: {
                    HStack {
                        if generating { ProgressView() }
                        Text(generating ? "Selecting…" : "Generate").font(.headline)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 4)
                }
                .buttonStyle(.glassProminent)
                .disabled(generating)
                if let generateError {
                    Text(generateError).font(.footnote).foregroundStyle(Palette.ink2)
                }
            }
        }
    }

    private func item(for p: SightPassage, library: ContentLibrary) -> SightItem {
        SightItem(id: p.id, title: p.citation, subtitle: "\(p.author), \(p.work)", genre: p.genre, latin: p.latin,
                  gloss: p.gloss, summary: p.summary, source: p.source,
                  questions: p.questionIds.compactMap(library.question), machineSelected: p.machineSelected ?? false,
                  confidence: nil, cached: false)
    }

    private func generate() async {
        generating = true
        generateError = nil
        defer { generating = false }
        do {
            let g = try await model.ai.post("generate-sight", [
                "author": .string(author), "genre": .string(genre), "variant": .number(Double(variant)), "questionCount": 4,
            ])
            model.update { $0.recordAiCall(route: "generate-sight") }
            variant += 1
            let questions = (g["questions"]?.arrayValue ?? []).enumerated().map { i, q in
                Question(id: "gen-\(i)", type: q["type"]?.stringValue ?? "inference", skill: "1.B", skillCategory: "1",
                         prompt: q["prompt"]?.stringValue ?? "",
                         options: (q["options"]?.arrayValue ?? []).map {
                             QuestionOption(id: $0["id"]?.stringValue ?? "", text: $0["text"]?.stringValue ?? "")
                         },
                         answerId: q["answerId"]?.stringValue ?? "", explanation: q["explanation"]?.stringValue ?? "",
                         unit: "1", difficulty: 2)
            }
            generated = SightItem(
                id: "generated-\(variant)",
                title: g["citation"]?.stringValue ?? "Sight passage",
                subtitle: "\(g["author"]?.stringValue ?? author), \(g["work"]?.stringValue ?? "")",
                genre: g["genre"]?.stringValue ?? genre,
                latin: g["latin"]?.stringValue ?? "",
                gloss: (g["gloss"]?.arrayValue ?? []).map { GlossNote(word: $0["word"]?.stringValue ?? "", meaning: $0["meaning"]?.stringValue ?? "") },
                summary: g["summary"]?.stringValue ?? "",
                source: "Machine-selected — not vetted",
                questions: questions,
                machineSelected: true,
                confidence: g["confidence"]?.stringValue,
                cached: g["_meta"]?["cached"]?.boolValue ?? false
            )
        } catch let failure as AIClient.Failure {
            generateError = failure.message
        } catch {
            generateError = "Couldn't reach the generator. The vetted passages still work."
        }
    }
}

/// Read cold against the clock, answer, then check.
struct SightAttemptView: View {
    @Environment(AppModel.self) private var model
    let item: SightItem

    @State private var startedAt: Date?
    @State private var finishedAt: Date?
    @State private var answers: [String: String] = [:]
    @State private var showSummary = false

    private var submitted: Bool { finishedAt != nil }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(item.subtitle).rubricLabel()
                if item.machineSelected { machineWarning }

                VStack(alignment: .leading, spacing: 10) {
                    Text(item.latin).font(.latin(21)).foregroundStyle(Palette.ink).textSelection(.enabled)
                    if !item.gloss.isEmpty {
                        Hairline(color: Palette.redLine)
                        ForEach(item.gloss, id: \.word) { g in
                            Text("\(Text(g.word).fontWeight(.semibold)) — \(g.meaning)").font(.latin(16)).foregroundStyle(Palette.ink2)
                        }
                    }
                    Text(item.source).font(.caption).foregroundStyle(Palette.inkFaint)
                }
                .padding(.leading, 14)
                .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }

                ForEach(Array(item.questions.enumerated()), id: \.element.id) { i, q in
                    SightQuestionView(number: i + 1, question: q, chosen: answers[q.id], submitted: submitted) {
                        answers[q.id] = $0
                    }
                }

                if submitted {
                    results
                } else {
                    Button {
                        submit()
                    } label: {
                        Text("Check answers").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(answers.isEmpty)
                }
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle(item.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if let startedAt {
                    TimelineView(.periodic(from: startedAt, by: 1)) { context in
                        Text(Duration.seconds((finishedAt ?? context.date).timeIntervalSince(startedAt)),
                             format: .time(pattern: .minuteSecond))
                            .monospacedDigit()
                            .foregroundStyle(Palette.rubric)
                    }
                } else {
                    Button("Start the clock", systemImage: "timer") { startedAt = Date() }
                }
            }
        }
    }

    private var machineWarning: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Machine-selected")
                .font(.caption.weight(.semibold)).tracking(1.4).textCase(.uppercase)
                .foregroundStyle(Palette.gilt)
            Text("A model chose and reproduced this passage; nobody has checked it against a printed text. Verify the Latin before trusting it, and treat the questions as practice."
                 + (item.confidence.map { " The model rated its own confidence \($0)." } ?? "")
                 + (item.cached ? " Served from cache — no quota was used." : ""))
                .font(.footnote).foregroundStyle(Palette.ink2)
        }
        .padding(12)
        .background(Palette.partialWash, in: .rect(cornerRadius: 10))
    }

    private var results: some View {
        let correct = item.questions.filter { answers[$0.id] == $0.answerId }.count
        return VStack(alignment: .leading, spacing: 12) {
            Text("\(correct) of \(item.questions.count) correct")
                .font(.system(.title2, design: .serif).weight(.semibold))
            if showSummary {
                Text("Summary").rubricLabel()
                Text(item.summary).font(.prose()).foregroundStyle(Palette.ink)
            } else {
                Button("Reveal the English summary") { withAnimation { showSummary = true } }
                    .buttonStyle(.glass)
            }
        }
    }

    private func submit() {
        if startedAt == nil { startedAt = Date() }
        finishedAt = Date()
        model.update { $0.markStudied() }
        for q in item.questions {
            guard let chosen = answers[q.id] else { continue }
            model.recordQuiz(q, chosenId: chosen, seconds: 0)
        }
    }
}

private struct SightQuestionView: View {
    let number: Int
    let question: Question
    let chosen: String?
    let submitted: Bool
    let onChoose: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Hairline()
            Text("\(number). \(question.prompt)")
                .font(.system(.body, design: .serif).weight(.semibold))
                .foregroundStyle(Palette.ink)
            ForEach(question.options) { option in
                let isAnswer = option.id == question.answerId
                let isChosen = option.id == chosen
                Button { onChoose(option.id) } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Image(systemName: isChosen ? "largecircle.fill.circle" : "circle")
                            .foregroundStyle(isChosen ? Palette.rubric : Palette.inkFaint)
                        Text(option.text).font(.latin(17)).foregroundStyle(Palette.ink).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        if submitted, isAnswer { Image(systemName: "checkmark").foregroundStyle(Palette.correct) }
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .background(submitted && isAnswer ? Palette.correctWash : submitted && isChosen ? Palette.incorrectWash : .clear,
                                in: .rect(cornerRadius: 10))
                }
                .buttonStyle(PressStyle())
                .disabled(submitted)
            }
            if submitted {
                Text(question.explanation).font(.prose(.callout)).foregroundStyle(Palette.ink2)
            }
        }
    }
}
