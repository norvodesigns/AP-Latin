import LectioCore
import SwiftUI

/// Every line checked in the Scansion Lab, newest first — src/app/scansion/history/ScansionHistory.tsx.
struct ScansionHistoryView: View {
    @Environment(AppModel.self) private var model
    let corpus: ScansionCorpus
    /// Back to the lab, to scan a line again.
    let scanAgain: (String) -> Void

    nonisolated enum Filter: String, CaseIterable, Identifiable, Sendable {
        case all = "All", missed = "Not perfect", perfect = "Perfect"
        var id: String { rawValue }
    }

    @State private var filter = Filter.all
    @State private var shown = 40
    @State private var lines = ScansionLineCache()

    /// The scans the "where the points go" breakdown reads.
    private static let recentCount = 40

    var body: some View {
        let attempts = model.progress.scansionAttempts
        let newestFirst = Array(attempts.reversed())
        let filtered = newestFirst.filter {
            switch filter {
            case .all: true
            case .perfect: $0.isPerfect
            case .missed: !$0.isPerfect
            }
        }
        let visible = Array(filtered.prefix(shown))
        let tries = ScansionHistory.tryNumbers(attempts)
        let wanted = Set((visible + newestFirst.prefix(Self.recentCount)).compactMap { ScansionCorpus.parseLineId($0.lineId)?.book })
            .sorted()

        return List {
            if attempts.isEmpty {
                ContentUnavailableView {
                    Label("No scans yet", systemImage: "waveform.path")
                } description: {
                    Text("Check a line in the Scansion Lab and it appears here, with the marks you made and what was right.")
                }
                .listRowBackground(Color.clear)
            } else {
                Section {
                    summary(attempts)
                        .listRowBackground(Color.clear)
                    breakdown(Array(newestFirst.prefix(Self.recentCount)), latest: ScansionHistory.latestIds(attempts))
                        .listRowBackground(Color.clear)
                    Picker("Show", selection: $filter) {
                        ForEach(Filter.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .onChange(of: filter) { shown = 40 }
                }
                if visible.isEmpty {
                    Text(filter == .perfect ? "No perfect scans yet." : "Every scan so far is perfect.")
                        .font(.prose(.callout)).foregroundStyle(Palette.inkMuted)
                        .listRowBackground(Color.clear)
                }
                ForEach(Self.days(visible), id: \.day) { group in
                    Section {
                        ForEach(group.items) { a in
                            NavigationLink {
                                ScansionResultView(attemptId: a.id, corpus: corpus, lines: lines, scanAgain: scanAgain)
                            } label: {
                                row(a, tryNumber: tries[a.id] ?? 1)
                            }
                            .listRowBackground(Color.clear)
                        }
                    } header: {
                        Text(Self.dayLabel(group.day)).quietLabel()
                    }
                }
                if filtered.count > visible.count {
                    Button("Show \(min(40, filtered.count - visible.count)) more") { shown += 40 }
                        .listRowBackground(Color.clear)
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .pageBackground()
        .navigationTitle("Your scans")
        .task(id: wanted) { await lines.load(books: wanted, from: corpus) }
    }

    /* -------------------------------------------------------------- */

    private func summary(_ attempts: [ScansionAttempt]) -> some View {
        let stats = ScansionStats.byLine(attempts)
        let recent = attempts.suffix(20)
        let right = recent.reduce(0) { $0 + $1.correct }
        let total = recent.reduce(0) { $0 + $1.total }
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), alignment: .leading)], alignment: .leading, spacing: 16) {
            Figure(value: "\(attempts.count)", caption: attempts.count == 1 ? "scan" : "scans")
            Figure(value: "\(stats.count)", caption: stats.count == 1 ? "line" : "different lines")
            Figure(value: "\(stats.values.filter(\.mastered).count)", caption: "mastered")
            Figure(value: total > 0 ? "\(Int((Double(right) / Double(total) * 100).rounded()))%" : "—",
                   caption: "right, last \(recent.count)")
        }
        .padding(.vertical, 6)
    }

    /// Which of the three halves of scanning costs the most, over recent scans
    /// whose marks were kept.
    @ViewBuilder
    private func breakdown(_ recent: [ScansionAttempt], latest: Set<String>) -> some View {
        let scores = recent.compactMap { a -> ScansionWork.Score? in
            guard let line = lines[a.lineId] else { return nil }
            return ScansionWork.reviewed(a, line: line, latestOnLine: latest.contains(a.id),
                                         draft: model.progress.scansionDraft(a.lineId))?.score
        }
        if !scores.isEmpty {
            let pct = { (a: Int, b: Int) in b > 0 ? Int((Double(a) / Double(b) * 100).rounded()) : 100 }
            let rows = [
                ("Syllables", pct(scores.reduce(0) { $0 + $1.syllables }, scores.reduce(0) { $0 + $1.syllablesTotal })),
                ("Feet", pct(scores.reduce(0) { $0 + $1.boundaries }, scores.reduce(0) { $0 + $1.boundariesTotal })),
                ("Elisions", pct(scores.reduce(0) { $0 + $1.elisions }, scores.reduce(0) { $0 + $1.elisionsTotal })),
            ]
            let weakest = rows.map { $0.1 }.min() ?? 100
            VStack(alignment: .leading, spacing: 10) {
                Text("Where the points go").rubricLabel()
                FigureRow(spacing: 24) {
                    ForEach(rows.indices, id: \.self) { i in
                        Figure(value: "\(rows[i].1)%", caption: rows[i].0,
                               tint: rows[i].1 == weakest && rows[i].1 < 90 ? Palette.rubric : Palette.ink)
                    }
                }
                Text("Across your last \(scores.count) scan\(scores.count == 1 ? "" : "s") with marks kept")
                    .font(.footnote).foregroundStyle(Palette.inkFaint)
            }
            .padding(.vertical, 6)
        }
    }

    private func row(_ a: ScansionAttempt, tryNumber: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(lines[a.lineId]?.citation ?? Self.citation(a.lineId))
                    .font(.latin(20, relativeTo: .headline)).foregroundStyle(Palette.ink)
                Text(lines[a.lineId]?.latin ?? " ")
                    .font(.latinItalic(16, relativeTo: .subheadline)).foregroundStyle(Palette.inkMuted)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 4) {
                    if a.isPerfect { Image(systemName: "star.fill").font(.caption).accessibilityLabel("Perfect") }
                    Text("\(a.correct) / \(a.total)").monospacedDigit()
                }
                .font(.latin(19, relativeTo: .headline))
                .foregroundStyle(a.isPerfect ? Palette.gilt : Palette.ink)
                Text(Self.time(a.at) + (tryNumber > 1 ? " · \(Self.ordinal(tryNumber)) try" : ""))
                    .quietLabel()
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    /* -------------------------------------------------------------- */

    nonisolated struct Day: Sendable {
        let day: Date
        var items: [ScansionAttempt]
    }

    /// Attempts grouped by the day they were made, on the student's own clock.
    static func days(_ attempts: [ScansionAttempt]) -> [Day] {
        var out: [Day] = []
        for a in attempts {
            let day = Calendar.current.startOfDay(for: CloudSync.parseTimestamp(a.at) ?? .distantPast)
            if out.last?.day == day { out[out.count - 1].items.append(a) } else { out.append(Day(day: day, items: [a])) }
        }
        return out
    }

    static func dayLabel(_ day: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(day) { return "Today" }
        if cal.isDateInYesterday(day) { return "Yesterday" }
        return day.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }

    static func time(_ at: String) -> String {
        CloudSync.parseTimestamp(at)?.formatted(date: .omitted, time: .shortened) ?? ""
    }

    static func citation(_ lineId: String) -> String {
        ScansionCorpus.parseLineId(lineId).map { "Aeneid \($0.book).\($0.line)" } ?? lineId
    }

    static func ordinal(_ n: Int) -> String {
        let v = n % 100
        let suffix = (11...13).contains(v) ? "th" : [1: "st", 2: "nd", 3: "rd"][n % 10] ?? "th"
        return "\(n)\(suffix)"
    }
}

/// Lines from the corpus, loaded a book at a time off the main thread and
/// shared between the history and the scans it opens.
@Observable @MainActor
final class ScansionLineCache {
    private var byId: [String: ScansionLine] = [:]
    private var loaded: Set<Int> = []

    subscript(id: String) -> ScansionLine? { byId[id] }

    func load(books: [Int], from corpus: ScansionCorpus) async {
        for book in books where !loaded.contains(book) {
            guard let lines = try? await Task.detached(operation: { try corpus.loadBook(book) }).value else { continue }
            loaded.insert(book)
            for line in lines { byId[line.id] = line }
        }
    }
}

extension ScansionAttempt {
    var isPerfect: Bool { total > 0 && correct == total }
}

/* ------------------------------------------------------------------ */
/* One scan                                                            */
/* ------------------------------------------------------------------ */

/// One checked line again: the student's marks, coloured right and wrong,
/// above the right scansion, and what to look at.
struct ScansionResultView: View {
    @Environment(AppModel.self) private var model
    @State var attemptId: String
    let corpus: ScansionCorpus
    let lines: ScansionLineCache
    let scanAgain: (String) -> Void

    var body: some View {
        let attempts = model.progress.scansionAttempts
        let attempt = attempts.first { $0.id == attemptId }
        Group {
            if let attempt {
                content(attempt, attempts: attempts)
            } else {
                ContentUnavailableView("That scan isn't in your history", systemImage: "clock.arrow.circlepath",
                                       description: Text("It may have been made on another device that hasn't synced yet."))
            }
        }
        .pageBackground()
        .navigationTitle(attempt.map { lines[$0.lineId]?.citation ?? ScansionHistoryView.citation($0.lineId) } ?? "Scan")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: attempt?.lineId) {
            guard let book = attempt.flatMap({ ScansionCorpus.parseLineId($0.lineId)?.book }) else { return }
            await lines.load(books: [book], from: corpus)
        }
    }

    private func content(_ attempt: ScansionAttempt, attempts: [ScansionAttempt]) -> some View {
        let line = lines[attempt.lineId]
        let latest = ScansionHistory.latestIds(attempts)
        let work = line.flatMap {
            ScansionWork.reviewed(attempt, line: $0, latestOnLine: latest.contains(attempt.id),
                                  draft: model.progress.scansionDraft(attempt.lineId))
        }
        let sameLine = attempts.filter { $0.lineId == attempt.lineId }
        let tryNumber = (sameLine.firstIndex { $0.id == attempt.id } ?? 0) + 1
        let when = CloudSync.parseTimestamp(attempt.at)?.formatted(.dateTime.weekday().day().month().hour().minute()) ?? ""

        return ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Scanned \(when)" + (tryNumber > 1 ? " · \(ScansionHistoryView.ordinal(tryNumber)) try" : ""))
                        .rubricLabel()
                    if let line {
                        Text(line.latin).font(.latinItalic(20)).foregroundStyle(Palette.ink2)
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("\(attempt.correct) of \(attempt.total)")
                            .font(.system(.largeTitle, design: .serif).weight(.semibold))
                            .foregroundStyle(attempt.isPerfect ? Palette.gilt : Palette.ink)
                        Text(attempt.isPerfect ? "perfect" : "\(Int((Double(attempt.correct) / Double(max(1, attempt.total)) * 100).rounded()))% right")
                            .quietLabel()
                    }
                    if let s = work?.score {
                        Text("Syllables \(s.syllables)/\(s.syllablesTotal) · Feet \(s.boundaries)/\(s.boundariesTotal) · Elisions \(s.elisions)/\(s.elisionsTotal)")
                            .font(.subheadline.monospacedDigit()).foregroundStyle(Palette.ink2)
                    }
                }

                if let line {
                    if let work {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your scansion").rubricLabel()
                            LineScansion(work: work, tool: .quantity, readOnly: true) { _ in }
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    } else {
                        Text("Lectio didn't keep the marks for scans made before the history was added, so only the score is shown for this one. The right scansion is below.")
                            .font(.prose(.callout)).foregroundStyle(Palette.inkMuted)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("The scansion").rubricLabel()
                        LineScansion(work: ScansionWork.answer(for: line), tool: .quantity, isAnswer: true, readOnly: true) { _ in }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(line.feet.map { $0 == "dactyl" ? "D" : "S" }.joined(separator: " ")
                             + (line.caesurae.isEmpty ? "" : " · caesurae: " + line.caesurae.map(\.type).joined(separator: ", ")))
                            .font(.footnote).foregroundStyle(Palette.inkMuted)
                    }

                    if let work { mistakes(work) }
                } else {
                    ProgressView()
                }

                if sameLine.count > 1 {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Every scan of this line").rubricLabel()
                        FlowLayout(lineSpacing: 8) {
                            ForEach(Array(sameLine.enumerated()), id: \.element.id) { i, a in
                                Button("\(ScansionHistoryView.ordinal(i + 1)) · \(a.correct)/\(a.total)") { attemptId = a.id }
                                    .font(.footnote.monospacedDigit())
                                    .foregroundStyle(a.id == attempt.id ? Palette.rubric : a.isPerfect ? Palette.gilt : Palette.ink)
                                    .glassButton()
                                    .padding(.trailing, 6)
                                    .accessibilityAddTraits(a.id == attempt.id ? .isSelected : [])
                            }
                        }
                    }
                }

                Button {
                    scanAgain(attempt.lineId)
                } label: {
                    Text("Scan it again").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .glassButton(prominent: true)
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    /// What went wrong, a sentence each: quantities, boundaries, elisions.
    private func mistakes(_ work: ScansionWork) -> some View {
        let sentences = Self.mistakeSentences(work)
        return VStack(alignment: .leading, spacing: 10) {
            if sentences.isEmpty {
                Text("Every quantity, every foot boundary and every elision right.")
                    .font(.prose(.body)).foregroundStyle(Palette.ink2)
            } else {
                Text("What to look at").rubricLabel()
                ForEach(sentences.indices, id: \.self) { i in
                    Text(sentences[i]).font(.prose(.body)).foregroundStyle(Palette.ink)
                }
            }
        }
    }

    static func mistakeSentences(_ work: ScansionWork) -> [String] {
        let line = work.line
        let metrical = work.metricalIndices
        var out: [String] = []
        for i in metrical where work.result(i) != .ok {
            let syl = line.syllables[i]
            let given: String
            if let mark = work.marks[i] { given = "you marked it \(mark)" } else { given = "you left it unmarked" }
            out.append("\(syl.text) is \(syl.quantity) — \(given). \(work.explainQuantity(i))")
        }
        for d in work.divisions where !work.boundaryCorrect(after: d) {
            out.append("No foot ends after \(line.syllables[d].text), but you ruled a boundary there.")
        }
        for m in work.correctDivisions where m < metrical.count && !work.divisions.contains(metrical[m]) {
            out.append("A foot ends after \(line.syllables[metrical[m]].text).")
        }
        for i in work.elidableIndices where !work.elisionCorrect(i) {
            let text = line.syllables[i].text
            out.append(line.syllables[i].isElided
                ? "\(text) elides into the next word — you left it unmarked."
                : "\(text) does not elide — you marked it as eliding.")
        }
        return out
    }
}
