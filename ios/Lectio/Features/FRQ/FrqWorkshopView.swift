import LectioCore
import SwiftUI

/// Section II: five questions, 115 minutes, half the score —
/// src/app/frq/FrqWorkshop.tsx. Draft under a timer, then score yourself
/// against the official rubric rows with a strong sample beside you, or have
/// the website's grader read it against the same rows.
struct FrqWorkshopView: View {
    @Environment(\.library) private var library
    @State private var mode = Mode.prompts

    nonisolated enum Mode: String, CaseIterable, Identifiable, Sendable {
        case prompts = "Prompts", project = "Course Project"
        var id: String { rawValue }
    }

    var body: some View {
        SectionStack {
            List {
                Section {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                }
                if let library {
                    switch mode {
                    case .prompts:
                        ForEach(library.frqPrompts) { p in
                            NavigationLink(value: p) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(library.meta.frqTypeLabels[p.type] ?? p.type).quietLabel()
                                    Text(p.title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                                    if let c = p.citation { Text(c).font(.latin(16)).foregroundStyle(Palette.inkMuted) }
                                    Text("\(p.rubric.reduce(0) { $0 + $1.maxPoints }) points · ~\(p.minutes) min · \(p.subquestions.count) part\(p.subquestions.count == 1 ? "" : "s")")
                                        .font(.caption).foregroundStyle(Palette.inkFaint)
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(Color.clear)
                        }
                    case .project:
                        CourseProjectSection(rubrics: library.frqRubrics)
                    }
                }
            }
            .listStyle(.plain)
            .pageBackground()
            .navigationTitle("FRQ Workshop")
            .navigationDestination(for: FrqPrompt.self) { FrqWorkspaceView(prompt: $0) }
        }
    }
}

/* ------------------------------------------------------------------ */
/* One prompt                                                          */
/* ------------------------------------------------------------------ */

struct FrqWorkspaceView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    let prompt: FrqPrompt

    @State private var answers: [String: String] = [:]
    @State private var selfScore: [String: Double] = [:]
    @State private var elapsed: TimeInterval = 0
    @State private var runningSince: Date?
    @State private var showSample = false
    @State private var saved = false
    @State private var projectId: String?
    @State private var grading = false
    @State private var gradeError: String?
    @State private var feedback: JSONValue?

    private var isProject: Bool { prompt.type == "project-prose" || prompt.type == "project-poetry" }
    private var wantedGenre: String { prompt.type == "project-poetry" ? "poetry" : "prose" }
    private var totalPoints: Int { prompt.rubric.reduce(0) { $0 + $1.maxPoints } }
    private var earned: Double { selfScore.values.reduce(0, +) }

    var body: some View {
        let candidates = model.progress.projectPassages.filter { $0.genre == wantedGenre }
        let project = candidates.first { $0.id == projectId } ?? candidates.first
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(library?.meta.frqTypeLabels[prompt.type] ?? "").rubricLabel()
                Text(prompt.title).font(.system(.title2, design: .serif).weight(.semibold))

                passageSection(candidates: candidates, project: project)

                ForEach(prompt.subquestions) { sq in
                    VStack(alignment: .leading, spacing: 8) {
                        Hairline()
                        HStack(alignment: .firstTextBaseline) {
                            Text("\(Text(sq.label).foregroundStyle(Palette.inkFaint)) \(sq.prompt)").font(.headline)
                            Spacer()
                            Text("\(sq.points) pt\(sq.points == 1 ? "" : "s")").quietLabel()
                        }
                        TextEditor(text: Binding(get: { answers[sq.id] ?? "" }, set: { answers[sq.id] = $0; saved = false }))
                            .font(.prose())
                            .frame(minHeight: prompt.type == "short-answer" ? 90 : 220)
                            .scrollContentBackground(.hidden)
                            .padding(10)
                            .background(Palette.slip, in: .rect(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.rule, lineWidth: 0.5))
                    }
                }

                aiSection(project: project)
                rubricSection
                sampleSection

                Button {
                    model.update {
                        $0.saveFrq(id: nil, promptId: prompt.id, answers: answers, selfScore: selfScore,
                                   secondsSpent: currentElapsed(Date()).rounded(), submitted: true)
                        $0.markStudied()
                    }
                    model.reportActivity(source: "self", correct: earned, total: Double(totalPoints))
                    saved = true
                } label: {
                    Text(saved ? "Saved" : "Log this attempt (\(earned.formatted())/\(totalPoints))")
                        .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent)
                .disabled(saved || selfScore.isEmpty)

                priorAttempts
            }
            .padding(20)
            .frame(maxWidth: 820, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .pageBackground()
        .navigationTitle(prompt.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { timerToolbar }
        .task { await model.checkAI() }
    }

    /* -------------------------------------------------------------- */

    private func currentElapsed(_ now: Date) -> TimeInterval {
        elapsed + (runningSince.map { now.timeIntervalSince($0) } ?? 0)
    }

    @ToolbarContentBuilder
    private var timerToolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let t = currentElapsed(context.date)
                Text(Duration.seconds(t), format: .time(pattern: .minuteSecond))
                    .monospacedDigit()
                    .foregroundStyle(t > Double(prompt.minutes * 60) ? Palette.incorrect : Palette.ink)
                    .accessibilityLabel("Time elapsed")
            }
            Button(runningSince != nil ? "Pause" : elapsed == 0 ? "Start (\(prompt.minutes) min)" : "Resume",
                   systemImage: runningSince != nil ? "pause" : "play") {
                if let since = runningSince {
                    elapsed += Date().timeIntervalSince(since)
                    runningSince = nil
                } else {
                    runningSince = Date()
                }
            }
        }
    }

    @ViewBuilder
    private func passageSection(candidates: [ProjectPassage], project: ProjectPassage?) -> some View {
        if isProject {
            if candidates.isEmpty {
                Text("FRQ \(prompt.type == "project-prose" ? "4" : "5") is always set on one of the passages you choose for the course project. Add your \(wantedGenre) passage under Course Project first.")
                    .font(.prose(.callout)).foregroundStyle(Palette.ink2)
                    .padding(14).background(Palette.partialWash, in: .rect(cornerRadius: 12))
            } else if let project {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Your \(wantedGenre) project passage").quietLabel()
                        Spacer()
                        if candidates.count > 1 {
                            Picker("Passage", selection: Binding(get: { project.id }, set: { projectId = $0 })) {
                                ForEach(candidates) { Text($0.title.isEmpty ? $0.citation : $0.title).tag($0.id) }
                            }
                        }
                    }
                    Text("\(project.author) — \(project.citation)").font(.footnote).foregroundStyle(Palette.inkMuted)
                    Text(project.latin).font(.latin(20)).foregroundStyle(Palette.ink)
                    Text("On FRQ 4 and 5, words outside the core vocabulary list are not glossed.").font(.caption).foregroundStyle(Palette.inkFaint)
                }
                .padding(16).background(Palette.slip, in: .rect(cornerRadius: 14))
            }
        } else if let id = prompt.passageId, let passage = library?.passage(id) {
            VStack(alignment: .leading, spacing: 4) {
                Text(prompt.citation ?? passage.citation).quietLabel()
                ForEach(passage.lines) { line in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("\(line.n)").font(.caption2.monospacedDigit()).foregroundStyle(Palette.inkFaint).frame(width: 28, alignment: .trailing)
                        Text(line.latin).font(.latin(19)).foregroundStyle(Palette.ink)
                    }
                }
            }
            .padding(.leading, 12)
            .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }
        } else if let latin = prompt.latin {
            Text(latin).font(.latin(20)).foregroundStyle(Palette.ink)
        }
    }

    @ViewBuilder
    private func aiSection(project: ProjectPassage?) -> some View {
        if model.aiAvailable == true {
            let combined = prompt.subquestions.map { "\($0.label.isEmpty ? "" : "\($0.label). ")\(answers[$0.id] ?? "")" }
                .joined(separator: "\n\n").trimmingCharacters(in: .whitespacesAndNewlines)
            Button {
                Task { await grade(combined: combined, project: project) }
            } label: {
                HStack {
                    if grading { ProgressView() }
                    Text(grading ? "Grading…" : prompt.type == "short-answer" ? "Grade the set with AI" : "Grade against the rubric with AI")
                }
                .frame(maxWidth: .infinity).padding(.vertical, 4)
            }
            .buttonStyle(.glass)
            .disabled(grading || (prompt.type == "short-answer" ? answers.values.allSatisfy { $0.isEmpty } : combined.count < 20 || (isProject && project == nil)))
        }
        if let gradeError {
            Text(gradeError + " Self-scoring below works exactly the same.")
                .font(.footnote).padding(12).frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.partialWash, in: .rect(cornerRadius: 10))
        }
        if let feedback {
            if prompt.type == "short-answer" { ShortAnswerFeedback(data: feedback) } else { EssayFeedback(data: feedback) }
        }
    }

    private var rubricSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Official scoring guidelines").font(.system(.headline, design: .serif))
                    Text("From the CED. Score yourself honestly, row by row.").font(.footnote).foregroundStyle(Palette.inkMuted)
                }
                Spacer()
                Text("\(earned.formatted()) / \(totalPoints)").font(.system(.title2, design: .serif).weight(.semibold)).monospacedDigit()
            }
            ForEach(prompt.rubric) { row in
                VStack(alignment: .leading, spacing: 6) {
                    Hairline(color: Palette.hair)
                    Text(row.label).font(.subheadline.weight(.semibold))
                    Text(row.criteria).font(.footnote).foregroundStyle(Palette.inkMuted)
                    ForEach(row.decisionRules, id: \.self) { Text("• \($0)").font(.caption).foregroundStyle(Palette.inkFaint) }
                    HStack(spacing: 6) {
                        ForEach(0...row.maxPoints, id: \.self) { n in
                            Button("\(n)") { selfScore[row.id] = Double(n); saved = false }
                                .buttonStyle(ChipStyle(on: selfScore[row.id] == Double(n)))
                                .accessibilityLabel("\(n) point\(n == 1 ? "" : "s") for \(row.label)")
                        }
                    }
                }
            }
        }
    }

    private var sampleSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation { showSample.toggle() }
            } label: {
                HStack {
                    Text("A strong sample response").rubricLabel()
                    Spacer()
                    Text(showSample ? "Hide" : "Show").font(.footnote)
                }
            }
            .buttonStyle(.plain)
            if showSample {
                Text(prompt.sampleResponse).font(.prose(.callout)).foregroundStyle(Palette.ink).textSelection(.enabled)
                Hairline(color: Palette.hair)
                Text(prompt.scoringNotes).font(.footnote).foregroundStyle(Palette.inkMuted)
            }
        }
        .padding(16)
        .background(Palette.slip, in: .rect(cornerRadius: 14))
    }

    @ViewBuilder
    private var priorAttempts: some View {
        let prior = model.progress.frqResponses.filter { $0.promptId == prompt.id }.suffix(5).reversed()
        if !prior.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text("Previous attempts").rubricLabel()
                ForEach(Array(prior)) { r in
                    HStack {
                        Text(CloudSync.parseTimestamp(r.at)?.formatted(.dateTime.day().month()) ?? "").foregroundStyle(Palette.inkFaint)
                        Text("\(r.selfScore.values.reduce(0, +).formatted())/\(totalPoints)").monospacedDigit()
                        Spacer()
                        Text("\(Int((r.secondsSpent / 60).rounded())) min").foregroundStyle(Palette.inkFaint)
                    }
                    .font(.subheadline)
                }
            }
        }
    }

    private func grade(combined: String, project: ProjectPassage?) async {
        grading = true
        gradeError = nil
        defer { grading = false }
        do {
            if prompt.type == "short-answer" {
                feedback = try await model.ai.post("grade-short-answer", [
                    "promptId": .string(prompt.id),
                    "answers": .object(JSONObject(answers.sorted { $0.key < $1.key }.map { ($0.key, JSONValue.string($0.value)) })),
                ])
                model.update { $0.recordAiCall(route: "grade-short-answer") }
            } else {
                var body = JSONObject([("promptId", .string(prompt.id)), ("essay", .string(combined))])
                if isProject, let project {
                    body["customPassage"] = ["citation": .string(project.citation), "latin": .string(project.latin)]
                }
                feedback = try await model.ai.post("grade-essay", .object(body))
                model.update { $0.recordAiCall(route: "grade-essay") }
            }
        } catch let failure as AIClient.Failure {
            gradeError = failure.message
        } catch {
            gradeError = "Couldn't reach the grader."
        }
    }
}

/* ------------------------------------------------------------------ */
/* AI feedback                                                          */
/* ------------------------------------------------------------------ */

private struct EssayFeedback: View {
    let data: JSONValue

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("AI feedback").font(.system(.headline, design: .serif))
            let uncited = data["uncitedClaims"]?.arrayValue ?? []
            if !uncited.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Claims with no Latin behind them — the commonest way points are lost")
                        .font(.caption.weight(.semibold)).foregroundStyle(Palette.incorrect)
                    ForEach(Array(uncited.enumerated()), id: \.offset) { _, c in
                        VStack(alignment: .leading, spacing: 3) {
                            Text("“\(c["claim"]?.stringValue ?? "")”").italic().font(.callout)
                            Text(c["why"]?.stringValue ?? "").font(.footnote).foregroundStyle(Palette.inkMuted)
                            Text("Try: \(Text(c["suggestedEvidence"]?.stringValue ?? "").font(.latin(16)))").font(.footnote)
                        }
                    }
                }
            }
            let citations = data["citationCheck"]?.arrayValue ?? []
            if !citations.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Your citations, checked against the passage").quietLabel()
                    ForEach(Array(citations.enumerated()), id: \.offset) { _, c in
                        let accurate = c["accurate"]?.boolValue ?? false
                        HStack(alignment: .firstTextBaseline) {
                            Text(c["quoted"]?.stringValue ?? "").font(.latin(16))
                            Text(c["citedAs"]?.stringValue ?? "").font(.caption)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(accurate ? Palette.partialWash : Palette.incorrectWash, in: .capsule)
                            if !accurate { Text(c["note"]?.stringValue ?? "").font(.caption).foregroundStyle(Palette.inkMuted) }
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Per dimension").quietLabel()
                ForEach(Array((data["dimensions"]?.arrayValue ?? []).enumerated()), id: \.offset) { _, d in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(d["name"]?.stringValue ?? "").font(.subheadline.weight(.semibold))
                            Spacer()
                            Text("\(d["earned"]?.doubleValue?.formatted() ?? "0")/\(d["possible"]?.doubleValue?.formatted() ?? "0")").monospacedDigit()
                        }
                        Text(d["justification"]?.stringValue ?? "").font(.footnote).foregroundStyle(Palette.inkMuted)
                    }
                }
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Two revisions").quietLabel()
                ForEach(Array((data["revisions"]?.arrayValue ?? []).enumerated()), id: \.offset) { i, r in
                    Text("\(i + 1). \(r.stringValue ?? "")").font(.footnote).foregroundStyle(Palette.ink2)
                }
                if let overall = data["overall"]?.stringValue {
                    Text(overall).font(.prose(.callout)).foregroundStyle(Palette.ink2).padding(.top, 4)
                }
            }
        }
        .padding(16)
        .background(Palette.sunk, in: .rect(cornerRadius: 14))
    }
}

private struct ShortAnswerFeedback: View {
    let data: JSONValue

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("AI feedback").font(.system(.headline, design: .serif))
                Spacer()
                Text("\(data["totalEarned"]?.doubleValue?.formatted() ?? "0")/\(data["totalPossible"]?.doubleValue?.formatted() ?? "0")")
                    .font(.system(.title3, design: .serif).weight(.semibold)).monospacedDigit()
            }
            ForEach(Array((data["items"]?.arrayValue ?? []).enumerated()), id: \.offset) { _, it in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(it["prompt"]?.stringValue ?? "").font(.subheadline.weight(.semibold))
                        Spacer()
                        Text("\(it["earned"]?.doubleValue?.formatted() ?? "0")/\(it["possible"]?.doubleValue?.formatted() ?? "0")").monospacedDigit()
                    }
                    Text(it["feedback"]?.stringValue ?? "").font(.footnote).foregroundStyle(Palette.inkMuted)
                    Text("Full credit looks like: \(it["modelAnswer"]?.stringValue ?? "")").font(.footnote)
                }
                Hairline(color: Palette.hair)
            }
            let patterns = data["patterns"]?.arrayValue ?? []
            if !patterns.isEmpty {
                Text("Patterns across the set").quietLabel()
                ForEach(Array(patterns.enumerated()), id: \.offset) { _, p in
                    Text("• \(p.stringValue ?? "")").font(.footnote).foregroundStyle(Palette.ink2)
                }
            }
        }
        .padding(16)
        .background(Palette.sunk, in: .rect(cornerRadius: 14))
    }
}

/* ------------------------------------------------------------------ */
/* Course project                                                       */
/* ------------------------------------------------------------------ */

/// The four passages a student chooses for the course project — two prose,
/// two poetry. They become the passages FRQ 4 and 5 are set on here.
private struct CourseProjectSection: View {
    @Environment(AppModel.self) private var model
    let rubrics: FrqRubrics
    @State private var editing: ProjectPassage?

    var body: some View {
        Section {
            Text("The course project is four passages you choose with your teacher — two prose, two poetry. Two are assessed on the exam as FRQ 4 and 5. Add them here and they become available in those workspaces.")
                .font(.prose(.callout)).foregroundStyle(Palette.ink2)
                .listRowBackground(Color.clear)
            ForEach(model.progress.projectPassages) { p in
                Button { editing = p } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(p.title.isEmpty ? "Untitled" : p.title).font(.headline).foregroundStyle(Palette.ink)
                            Spacer()
                            Text(p.genre).quietLabel()
                        }
                        Text([p.author, p.citation].filter { !$0.isEmpty }.joined(separator: ", ")).font(.subheadline).foregroundStyle(Palette.inkMuted)
                        Text(p.latin).font(.latin(16)).foregroundStyle(Palette.ink2).lineLimit(2)
                        HStack(spacing: 8) {
                            Label("CP1", systemImage: p.checkpoint1.isEmpty ? "circle" : "checkmark.circle.fill")
                            Label("CP2", systemImage: p.checkpoint2.isEmpty ? "circle" : "checkmark.circle.fill")
                        }
                        .font(.caption).foregroundStyle(Palette.gilt)
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(Color.clear)
                .swipeActions {
                    Button("Remove", role: .destructive) { model.update { $0.removeProjectPassage(p.id) } }
                }
            }
            Button("Add a passage", systemImage: "plus") {
                editing = ProjectPassage(id: UUID().uuidString.lowercased().prefix(8).description, title: "", author: "", citation: "",
                                         genre: "prose", latin: "", notes: "", checkpoint1: "", checkpoint2: "")
            }
            .listRowBackground(Color.clear)
        }
        .sheet(item: $editing) { ProjectEditor(passage: $0, rubrics: rubrics) }
    }
}

private struct ProjectEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var passage: ProjectPassage
    let rubrics: FrqRubrics

    var body: some View {
        NavigationStack {
            Form {
                Section("Passage") {
                    TextField("Title", text: $passage.title)
                    TextField("Author", text: $passage.author)
                    TextField("Citation", text: $passage.citation)
                    Picker("Genre", selection: $passage.genre) {
                        Text("Prose").tag("prose")
                        Text("Poetry").tag("poetry")
                    }
                    .pickerStyle(.segmented)
                }
                Section("Latin") {
                    TextEditor(text: $passage.latin).font(.latin(18)).frame(minHeight: 140)
                }
                Section("Notes") {
                    TextEditor(text: $passage.notes).frame(minHeight: 80)
                }
                Section {
                    TextEditor(text: $passage.checkpoint1).frame(minHeight: 120)
                } header: {
                    Text("Checkpoint 1 — summary · 2 pts")
                } footer: {
                    Text(rubrics.checkpoint1.first?.criteria ?? "")
                }
                Section {
                    TextEditor(text: $passage.checkpoint2).frame(minHeight: 120)
                } header: {
                    Text("Checkpoint 2 — interpretation · 3 pts")
                } footer: {
                    Text(rubrics.checkpoint2.first?.criteria ?? "")
                }
            }
            .navigationTitle(passage.title.isEmpty ? "Project passage" : passage.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        model.update { $0.upsertProjectPassage(passage) }
                        dismiss()
                    }
                    .disabled(passage.latin.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
