import LectioCore
import SwiftUI

/// FRQ 2 practice — src/app/translate/Translate.tsx. About 35 words of Vergil
/// or 40 of Pliny, translated literally and scored in the exam's 15 segments:
/// graded by the website's AI grader when it's available, or against the
/// segment requirements by the student.
struct TranslateView: View {
    @Environment(\.library) private var library

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("The exam gives you about 35 words of Vergil or 40 of Pliny and scores your literal translation in 15 segments. Type your translation, then grade it against the actual scoring criteria.")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.ink2)
                        .listRowBackground(Color.clear)
                }
                if let library {
                    ForEach(library.translationDrills) { drill in
                        NavigationLink(value: drill) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(drill.citation).font(.latin(20, relativeTo: .headline)).foregroundStyle(Palette.ink)
                                if let passage = library.passage(drill.passageId) {
                                    Text(passage.title).font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted)
                                }
                                Text("\(drill.segments.count) segments · \(drill.latin.split(whereSeparator: \.isWhitespace).count) words").quietLabel()
                            }
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Color.clear)
                    }
                }
            }
            .listStyle(.plain)
            .pageBackground()
            .navigationTitle("Translate")
            .navigationDestination(for: TranslationDrill.self) { TranslationDrillView(drill: $0) }
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
        }
    }
}

/// A segment's grade.
nonisolated enum Verdict: String, CaseIterable, Sendable {
    case correct, partial, incorrect

    var label: String {
        switch self {
        case .correct: "Correct"
        case .partial: "Partial"
        case .incorrect: "Missed"
        }
    }
    var points: Double {
        switch self {
        case .correct: 1
        case .partial: 0.5
        case .incorrect: 0
        }
    }
}

/// The AI grader's reading of one segment (translationGradeSchema).
nonisolated struct AISegment: Sendable {
    let verdict: Verdict
    let studentRendering: String
    let reason: String
    let correctedLiteral: String
}

struct TranslationDrillView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    let drill: TranslationDrill

    @State private var text = ""
    @State private var revealed = false
    @State private var scores: [String: Verdict] = [:]
    @State private var aiSegments: [String: AISegment] = [:]
    @State private var aiCorrected: String?
    @State private var aiAdvice: String?
    @State private var grading = false
    @State private var gradeError: String?
    @State private var saved = false
    @FocusState private var editing: Bool

    private var score: Double { drill.segments.reduce(0) { $0 + (scores[$1.id]?.points ?? 0) } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("FRQ 2 · \(drill.segments.count) segments · 15 minutes on the exam").rubricLabel()
                    if let passage = library?.passage(drill.passageId) {
                        NavigationLink(value: passage) {
                            Text("\(passage.title) — read in context →").font(.subheadline).foregroundStyle(Palette.rubric)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Translate as literally as possible").quietLabel()
                    Text(drill.latin).font(.latin(22)).foregroundStyle(Palette.ink).textSelection(.enabled)
                }
                .padding(.leading, 14)
                .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Your translation").rubricLabel()
                    TextEditor(text: $text)
                        .focused($editing)
                        .font(.prose())
                        .frame(minHeight: 180)
                        .scrollContentBackground(.hidden)
                        .padding(10)
                        .background(Palette.slip, in: .rect(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.rule, lineWidth: 0.5))
                        .disabled(revealed)
                        .onChange(of: text) { _, new in if new.count > 4000 { text = String(new.prefix(4000)) } }
                    Text("Account for every Latin word. Keep the tenses, cases and constructions the Latin actually uses.")
                        .font(.footnote).foregroundStyle(Palette.inkFaint)
                }

                if !revealed { gradeButtons }
                if let gradeError {
                    Text(gradeError + " Self-scoring below works exactly the same.")
                        .font(.footnote).foregroundStyle(Palette.ink2)
                        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.partialWash, in: .rect(cornerRadius: 10))
                }
                if revealed { segments }
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .pageBackground()
        .navigationTitle(drill.citation)
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.checkAI() }
        .onAppear { model.update { $0.markStudied() } }
    }

    /* -------------------------------------------------------------- */

    private var gradeButtons: some View {
        let empty = text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return VStack(alignment: .leading, spacing: 10) {
            Button {
                Task { await grade() }
            } label: {
                HStack {
                    if grading { ProgressView().tint(.white) }
                    Text(grading ? "Grading…" : model.aiAvailable == true ? "Grade with AI" : "Reveal the model and self-score")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .disabled(empty || grading)
            if model.aiAvailable == true {
                Button("or self-score instead") { reveal() }
                    .font(.subheadline)
                    .disabled(empty || grading)
            }
        }
    }

    private var segments: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Scoring segments").font(.system(.title3, design: .serif).weight(.semibold))
                    Text("Mark each segment honestly against what you wrote.").font(.footnote).foregroundStyle(Palette.inkMuted)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("\(score.formatted()) / \(drill.segments.count)")
                        .font(.system(.title, design: .serif).weight(.semibold)).monospacedDigit()
                    Text("\(scores.count) of \(drill.segments.count) marked").quietLabel()
                }
            }

            if let aiAdvice {
                VStack(alignment: .leading, spacing: 6) {
                    Text("One thing to work on").rubricLabel()
                    Text(aiAdvice).font(.prose()).foregroundStyle(Palette.ink)
                }
                .padding(.leading, 14)
                .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }
            }

            ForEach(Array(drill.segments.enumerated()), id: \.element.id) { i, seg in
                SegmentCard(index: i + 1, segment: seg, verdict: scores[seg.id], ai: aiSegments[seg.id]) { v in
                    scores[seg.id] = v
                    saved = false
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Continuous literal model").rubricLabel()
                Text(aiCorrected ?? drill.modelTranslation).font(.prose()).foregroundStyle(Palette.ink)
                if let notes = drill.notes {
                    Hairline(color: Palette.hair)
                    Text(notes).font(.footnote).foregroundStyle(Palette.inkMuted)
                }
            }
            .padding(16)
            .background(Palette.slip, in: .rect(cornerRadius: 14))

            Button {
                save()
            } label: {
                Text(saved ? "Saved" : "Log this attempt (\(score.formatted())/\(drill.segments.count))")
                    .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .disabled(scores.isEmpty || saved)
            if scores.count < drill.segments.count && !saved {
                Text("\(drill.segments.count - scores.count) segment\(drill.segments.count - scores.count == 1 ? "" : "s") still unmarked.")
                    .font(.footnote).foregroundStyle(Palette.inkFaint)
            }

            previousAttempts
        }
        .transition(.opacity)
    }

    @ViewBuilder
    private var previousAttempts: some View {
        let prior = model.progress.translationAttempts.filter { $0.drillId == drill.id }.suffix(5).reversed()
        if !prior.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Previous attempts").rubricLabel().padding(.top, 12)
                ForEach(Array(prior)) { a in
                    HStack {
                        Text(CloudSync.parseTimestamp(a.at)?.formatted(.dateTime.day().month()) ?? "")
                            .foregroundStyle(Palette.inkFaint)
                        Text("\(a.score.formatted())/\(a.maxScore)").font(.latin(18)).monospacedDigit()
                        Spacer()
                        Text(a.gradedBy == "ai" ? "AI graded" : "Self-scored").quietLabel()
                    }
                    Hairline(color: Palette.hair)
                }
            }
        }
    }

    /* -------------------------------------------------------------- */

    private func reveal() {
        editing = false
        withAnimation { revealed = true }
    }

    private func grade() async {
        editing = false
        guard model.aiAvailable == true else { return reveal() }
        grading = true
        gradeError = nil
        defer { grading = false }
        do {
            let result = try await model.ai.post("grade-translation", ["drillId": .string(drill.id), "translation": .string(text)])
            model.update { $0.recordAiCall(route: "grade-translation") }
            var next: [String: Verdict] = [:]
            var ai: [String: AISegment] = [:]
            for seg in result["segments"]?.arrayValue ?? [] {
                guard let id = seg["segmentId"]?.stringValue, let v = seg["verdict"]?.stringValue.flatMap(Verdict.init(rawValue:)) else { continue }
                next[id] = v
                ai[id] = AISegment(verdict: v, studentRendering: seg["studentRendering"]?.stringValue ?? "",
                                   reason: seg["reason"]?.stringValue ?? "", correctedLiteral: seg["correctedLiteral"]?.stringValue ?? "")
            }
            scores = next
            aiSegments = ai
            aiCorrected = result["correctedTranslation"]?.stringValue
            aiAdvice = result["oneThingToWorkOn"]?.stringValue
            reveal()
        } catch let failure as AIClient.Failure {
            gradeError = failure.message
            reveal()
        } catch {
            gradeError = "Couldn't reach the grader."
            reveal()
        }
    }

    private func save() {
        let missedTags = drill.segments.filter { scores[$0.id] != nil && scores[$0.id] != .correct }.flatMap(\.tags)
        let gradedBy = aiSegments.isEmpty ? "self" : "ai"
        model.recordTranslation(drill: drill, results: scores.mapValues(\.rawValue), text: text, score: score,
                                missedTags: missedTags, gradedBy: gradedBy)
        saved = true
    }
}

private struct SegmentCard: View {
    let index: Int
    let segment: TranslationSegment
    let verdict: Verdict?
    let ai: AISegment?
    let onVerdict: (Verdict) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(index)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkFaint)
                Text(segment.latin).font(.latin(19).weight(.semibold)).foregroundStyle(Palette.ink)
                Spacer()
                if let verdict {
                    Text(verdict.label)
                        .font(.caption.weight(.semibold))
                        .tracking(1.4)
                        .textCase(.uppercase)
                        .foregroundStyle(color(verdict))
                }
            }
            labelled("Literal", segment.literal)
            labelled("To earn it", segment.requirement)
            ForEach(segment.pitfalls, id: \.self) { p in
                Text("· \(p)").font(.footnote).foregroundStyle(Palette.inkMuted)
            }
            if let ai {
                VStack(alignment: .leading, spacing: 4) {
                    Text("AI reading of your answer").rubricLabel()
                    Text(ai.studentRendering.isEmpty ? "Nothing corresponded to this segment." : "“\(ai.studentRendering)”")
                        .italic().font(.prose(.callout))
                    Text(ai.reason).font(.callout).foregroundStyle(Palette.ink2)
                    if ai.verdict != .correct, !ai.correctedLiteral.isEmpty {
                        labelled("Should read", ai.correctedLiteral)
                    }
                }
                .padding(12)
                .background(Palette.sunk, in: .rect(cornerRadius: 10))
            }
            HStack(spacing: 8) {
                ForEach(Verdict.allCases, id: \.self) { v in
                    Button(v.label) { onVerdict(v) }
                        .font(.subheadline)
                        .buttonStyle(ChipStyle(on: verdict == v))
                }
                Spacer()
            }
            .sensoryFeedback(.selection, trigger: verdict)
            if !segment.tags.isEmpty {
                Text(segment.tags.map { $0.replacingOccurrences(of: "-", with: " ") }.joined(separator: " · ")).quietLabel()
            }
        }
        .padding(.top, 10)
        .overlay(alignment: .top) { Rectangle().fill(verdict.map(color) ?? Palette.rule).frame(height: verdict == nil ? 0.5 : 2) }
    }

    private func labelled(_ label: String, _ text: String) -> some View {
        Text("\(Text(label.uppercased() + " — ").font(.caption2.weight(.medium)).foregroundStyle(Palette.inkMuted))\(text)")
            .font(.prose(.callout))
            .foregroundStyle(Palette.ink)
    }

    private func color(_ v: Verdict) -> Color {
        switch v {
        case .correct: Palette.correct
        case .partial: Palette.partial
        case .incorrect: Palette.incorrect
        }
    }
}
