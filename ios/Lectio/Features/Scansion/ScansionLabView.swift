import LectioCore
import SwiftUI

/// Dactylic hexameter across the whole Aeneid — src/app/scansion/ScansionLab.tsx.
///
/// Scanning a line by hand is three judgments, and all three are asked, never
/// shown: each syllable's quantity, where the five foot boundaries fall, and
/// where words elide. On a touchscreen they're three tools, picked from the
/// glass bar at the bottom: tap a syllable to mark it long or short, to rule a
/// boundary after it, or to claim an elision.
struct ScansionLabView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    /// A set passage to open on, as when the Reader sends a student here.
    var startPassageId: String? = nil

    nonisolated enum Tool: String, CaseIterable, Identifiable, Sendable {
        case quantity = "Quantity", feet = "Feet", elision = "Elision"
        var id: String { rawValue }
        var systemImage: String {
            switch self {
            case .quantity: "minus"
            case .feet: "rectangle.split.3x1"
            case .elision: "arrow.right.to.line"
            }
        }
        var hint: String {
            switch self {
            case .quantity: "Tap a syllable: long, short, then clear."
            case .feet: "Tap the last syllable of a foot to rule a boundary after it. Five boundaries make six feet."
            case .elision: "Tap a word's last syllable to claim it elides into the next word."
            }
        }
    }

    @State private var corpus: ScansionCorpus?
    @State private var books: [Int: [ScansionLine]] = [:]
    @State private var work: ScansionWork?
    @State private var tool = Tool.quantity
    @State private var loadError: String?
    @State private var showRules = false
    @State private var revisitMastered = false
    @State private var saveTask: Task<Void, Never>?
    /// The set passage being worked through in order, and its scannable lines.
    @State private var setPassage: Passage?
    @State private var passageLines: [ScansionLine] = []

    var body: some View {
        SectionStack {
            Group {
                if let work, let corpus {
                    lab(work: work, corpus: corpus)
                } else if let loadError {
                    ContentUnavailableView("Couldn't load the corpus", systemImage: "exclamationmark.triangle", description: Text(loadError))
                } else {
                    ProgressView("Loading the Aeneid…")
                }
            }
            .pageBackground()
            .navigationTitle("Scansion Lab")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button("Rules", systemImage: "book") { showRules = true }
                    Menu("More", systemImage: "ellipsis") {
                        Menu("Set passages", systemImage: "text.book.closed") {
                            ForEach(setPassages) { p in
                                Button("\(p.citation) · \(p.title)") { _ = openPassage(p) }
                            }
                        }
                        if setPassage != nil {
                            Button("Random lines", systemImage: "shuffle") { leavePassage() }
                        }
                        Button("Weakest line", systemImage: "bolt") { weakest() }
                        Toggle("Include mastered lines", isOn: $revisitMastered)
                    }
                }
            }
            .sheet(isPresented: $showRules) { ScansionRules() }
            .task { await load() }
        }
    }

    /* -------------------------------------------------------------- */

    private func lab(work: ScansionWork, corpus: ScansionCorpus) -> some View {
        let attempts = model.progress.scansionAttempts
        let stats = ScansionStats.byLine(attempts)
        let masteredCount = stats.values.filter(\.mastered).count
        let lineStats = stats[work.line.id]
        return ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Dactylic hexameter · \(work.line.citation)").rubricLabel()
                    if let setPassage {
                        let at = (passageLines.firstIndex { $0.id == work.line.id } ?? 0) + 1
                        let done = passageLines.filter { stats[$0.id]?.mastered == true }.count
                        Text("Set passage: \(setPassage.citation), \(setPassage.title). Line \(at) of the \(passageLines.count) the corpus can scan here; \(done) mastered.")
                            .font(.footnote).foregroundStyle(Palette.inkMuted)
                    } else {
                        Text("Drawn at random from \(corpus.index.total.formatted()) of the \(corpus.index.sourceTotal.formatted()) lines of the Aeneid with an unambiguous scansion. Lines you've mastered don't come back.")
                            .font(.footnote).foregroundStyle(Palette.inkMuted)
                    }
                }

                LineScansion(work: work, tool: tool) { i in edit(i) }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)

                if work.checked {
                    review(work)
                } else {
                    Text(tool.hint).font(.footnote).foregroundStyle(Palette.inkMuted)
                    Button {
                        check()
                    } label: {
                        Text(work.isReady ? "Check the line" : "Mark every syllable and rule five boundaries")
                            .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .glassButton(prominent: true)
                    .disabled(!work.isReady)
                }

                FigureRow(spacing: 24) {
                    Figure(value: "\(masteredCount)", caption: "lines mastered")
                    Figure(value: "\(attempts.count)", caption: "scans")
                    if let lineStats {
                        Figure(value: "\(Int(lineStats.bestAccuracy * 100))%", caption: "best on this line")
                    }
                }
                badges(attempts, pool: corpus.index.total)
            }
            .padding(20)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            if !work.checked {
                Picker("Tool", selection: $tool) {
                    ForEach(Tool.allCases) { Label($0.rawValue, systemImage: $0.systemImage).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(8)
                .lectioGlass(in: .capsule)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)
            }
        }
    }

    private func review(_ work: ScansionWork) -> some View {
        let s = work.score
        return VStack(alignment: .leading, spacing: 12) {
            Text("\(s.correct) of \(s.total)").font(.system(.largeTitle, design: .serif).weight(.semibold))
            Text("Syllables \(s.syllables)/\(s.syllablesTotal) · Feet \(s.boundaries)/\(s.boundariesTotal) · Elisions \(s.elisions)/\(s.elisionsTotal)")
                .font(.subheadline.monospacedDigit()).foregroundStyle(Palette.ink2)
            Text("The metre: " + work.line.feet.map { $0 == "dactyl" ? "D" : "S" }.joined(separator: " "))
                .font(.latin(18)).foregroundStyle(Palette.ink)
            if !work.line.caesurae.isEmpty {
                Text("Caesurae: " + work.line.caesurae.map(\.type).joined(separator: ", ")).font(.footnote).foregroundStyle(Palette.inkMuted)
            }
            HStack {
                Button("Try it again") { retry() }.glassButton()
                Button("Next line") { next() }.glassButton(prominent: true)
            }
        }
    }

    private func badges(_ attempts: [ScansionAttempt], pool: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Badges").rubricLabel()
            FlowLayout(lineSpacing: 8) {
                ForEach(ScansionStats.badges(attempts, poolSize: max(1, pool))) { badge in
                    Label(badge.label, systemImage: badge.earned ? "seal.fill" : "seal")
                        .font(.footnote)
                        .foregroundStyle(badge.earned ? Palette.gilt : Palette.inkFaint)
                        .padding(.trailing, 12)
                        .accessibilityHint(badge.detail)
                }
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Actions                                                          */
    /* -------------------------------------------------------------- */

    private func edit(_ i: Int) {
        guard var w = work, !w.checked else { return }
        switch tool {
        case .quantity: w.cycleMark(i)
        case .feet: w.toggleDivision(after: i)
        case .elision: w.toggleElision(i)
        }
        work = w
        scheduleDraftSave()
    }

    private func check() {
        guard var w = work else { return }
        w.checked = true
        let s = w.score
        work = w
        model.update {
            $0.recordScansion(lineId: w.line.id, correct: s.correct, total: s.total)
            $0.saveScansionDraft(lineId: w.line.id, draft: w.draft)
            $0.markStudied()
        }
    }

    private func retry() {
        guard let w = work else { return }
        work = ScansionWork(line: w.line, draft: nil)
    }

    private func scheduleDraftSave() {
        saveTask?.cancel()
        guard let w = work, !w.checked, !w.isBlank else { return }
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            model.update { $0.saveScansionDraft(lineId: w.line.id, draft: w.draft) }
        }
    }

    private func load() async {
        guard corpus == nil else { return }
        guard let dir = Bundle.main.url(forResource: "scansion", withExtension: nil) else {
            loadError = "The scansion corpus is missing from the app bundle."
            return
        }
        do {
            let c = try await Task.detached { try ScansionCorpus(directory: dir) }.value
            corpus = c
            if let id = startPassageId, let p = library?.passage(id), openPassage(p) { return }
            next()
        } catch {
            loadError = String(describing: error)
        }
    }

    private func lines(for book: Int) -> [ScansionLine] {
        if let cached = books[book] { return cached }
        guard let corpus, let loaded = try? corpus.loadBook(book) else { return [] }
        books[book] = loaded
        return loaded
    }

    /// The required Aeneid passages, for working through one in order.
    private var setPassages: [Passage] {
        (library?.passages ?? []).filter { $0.required && $0.isPoetry && $0.author == "vergil" }
    }

    /// Open a set passage on its first line not yet mastered. Corpus line
    /// numbers follow the OCT, as the passages do. False if none can be scanned.
    @discardableResult
    private func openPassage(_ p: Passage) -> Bool {
        guard let from = p.lines.first?.n, let to = p.lines.last?.n else { return false }
        let ls = lines(for: p.book).filter {
            guard let n = ScansionCorpus.parseLineId($0.id)?.line else { return false }
            return n >= from && n <= to
        }
        guard !ls.isEmpty else { return false }
        let mastered = ScansionStats.mastered(model.progress.scansionAttempts)
        setPassage = p
        passageLines = ls
        open(ls.first { !mastered.contains($0.id) } ?? ls[0])
        return true
    }

    private func leavePassage() {
        setPassage = nil
        passageLines = []
        next()
    }

    /// The next line: in order through a set passage, else at random.
    private func next() {
        if setPassage != nil, !passageLines.isEmpty {
            let mastered = revisitMastered ? [] : ScansionStats.mastered(model.progress.scansionAttempts)
            let at = passageLines.firstIndex { $0.id == work?.line.id } ?? -1
            for step in 1...passageLines.count {
                let line = passageLines[(at + step + passageLines.count) % passageLines.count]
                if !mastered.contains(line.id) || step == passageLines.count { return open(line) }
            }
            return
        }
        randomLine()
    }

    /// A random line from the whole corpus that isn't mastered (unless asked).
    private func randomLine() {
        guard let corpus else { return }
        let mastered = revisitMastered ? [] : ScansionStats.mastered(model.progress.scansionAttempts)
        let exclude = work?.line.id
        for _ in 0..<6 {
            let candidates = lines(for: corpus.randomBook()).filter { $0.id != exclude && !mastered.contains($0.id) }
            if let line = candidates.randomElement() { return open(line) }
        }
        for info in corpus.index.books {
            if let line = lines(for: info.book).first(where: { $0.id != exclude && !mastered.contains($0.id) }) { return open(line) }
        }
    }

    private func weakest() {
        setPassage = nil
        passageLines = []
        guard let id = ScansionStats.weakest(model.progress.scansionAttempts),
              let parsed = ScansionCorpus.parseLineId(id),
              let line = lines(for: parsed.book).first(where: { $0.id == id })
        else { return randomLine() }
        open(line)
    }

    private func open(_ line: ScansionLine) {
        work = ScansionWork(line: line, draft: model.progress.scansionDraft(line.id))
        tool = .quantity
    }
}

/* ------------------------------------------------------------------ */
/* The line itself                                                     */
/* ------------------------------------------------------------------ */

private struct LineScansion: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    let work: ScansionWork
    let tool: ScansionLabView.Tool
    let onTap: (Int) -> Void

    /// Where each syllable sits among the student's feet.
    private struct Place {
        let group: ScansionWork.Group
        let isFoot: Bool
        let startsGroup: Bool
        let endsGroup: Bool
    }

    var body: some View {
        let groups = work.groups
        var places: [Int: Place] = [:]
        for (gi, group) in groups.enumerated() {
            let isFoot = group.closed || (gi == groups.count - 1 && work.divisions.count == 5)
            for i in group.syllables {
                places[i] = Place(group: group, isFoot: isFoot, startsGroup: i == group.syllables.first,
                                  endsGroup: i == group.syllables.last)
            }
        }
        let placeOf = places
        // The line wraps between words, never inside one, and a word is never
        // squeezed: each is laid out at its own size.
        return FlowLayout(lineSpacing: 18) {
            ForEach(words, id: \.self) { word in
                HStack(alignment: .top, spacing: 0) {
                    ForEach(word, id: \.self) { i in
                        if let place = placeOf[i] { syllable(i, place: place) }
                    }
                }
                .fixedSize()
            }
        }
    }

    /// Syllable indices grouped into words.
    private var words: [[Int]] {
        var out: [[Int]] = []
        for (i, syl) in work.line.syllables.enumerated() {
            if i == 0 || syl.startsWord != false || out.isEmpty { out.append([i]) } else { out[out.count - 1].append(i) }
        }
        return out
    }

    @ViewBuilder
    private func syllable(_ i: Int, place: Place) -> some View {
        let syl = work.line.syllables[i]
        let showElided = work.checked ? syl.isElided : work.elisions.contains(i)
        let mark = work.marks[i]
        let elidable = work.elidableIndices.contains(i)
        let lead: CGFloat = i != 0 && syl.startsWord != false ? 10 : 0
        let trail: CGFloat = place.endsGroup && place.group.closed ? 10 : 0
        VStack(alignment: .leading, spacing: 4) {
            VStack(spacing: 2) {
                Text(mark == "long" ? "–" : mark == "short" ? "⏑" : " ")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(markColor(i))
                    .frame(height: 22)
                HStack(spacing: 0) {
                    Text(syl.text)
                        .font(.latin(sizeClass == .regular ? 32 : 26))
                        .strikethrough(showElided, color: Palette.inkFaint)
                        .foregroundStyle(textColor(i, elided: showElided))
                    if caesuraAfter(i) {
                        Text(" ‖").font(.latin(sizeClass == .regular ? 27 : 22)).foregroundStyle(Palette.rubric)
                    }
                }
                .fixedSize()
                // The elision target: shown on every word-final syllable,
                // whether or not it really elides, so its presence gives
                // nothing away.
                Circle()
                    .fill(elisionColor(i, elidable: elidable))
                    .frame(width: 7, height: 7)
                    .opacity(elidable ? 1 : 0)
            }
            .padding(.leading, lead)
            .padding(.trailing, trail)
            .overlay(alignment: .trailing) {
                // The student's own boundary after a foot.
                if place.endsGroup && place.group.closed {
                    Rectangle().fill(boundaryColor(place.group)).frame(width: 2).padding(.vertical, 4).offset(x: -3)
                }
            }
            .padding(.bottom, 6)
            .overlay(alignment: .bottom) {
                // A ruled bracket under each foot the student has divided,
                // named from their own marks, never from the answer. It runs
                // on across the gap between words inside a foot.
                HStack(spacing: 0) {
                    Color.clear.frame(width: place.startsGroup ? lead : 0)
                    Rectangle().fill(place.isFoot ? bracketColor(place.group) : .clear)
                    Color.clear.frame(width: trail)
                }
                .frame(height: 1)
            }
            Text(" ")
                .font(.caption2)
                .overlay(alignment: .topLeading) {
                    if place.isFoot, place.startsGroup {
                        Text(work.footName(place.group) ?? " ")
                            .font(.caption2.weight(.medium)).tracking(1).textCase(.uppercase)
                            .foregroundStyle(Palette.inkMuted)
                            .fixedSize()
                            .padding(.leading, lead)
                    }
                }
        }
        .contentShape(Rectangle())
        .onTapGesture { onTap(i) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(syl.text)
        .accessibilityValue([mark.map { $0 == "long" ? "long" : "short" }, showElided ? "elided" : nil,
                             work.divisions.contains(i) ? "foot ends here" : nil].compactMap { $0 }.joined(separator: ", "))
        .accessibilityAddTraits(.isButton)
        .sensoryFeedback(.selection, trigger: mark)
    }

    private func caesuraAfter(_ i: Int) -> Bool {
        let shown = work.checked ? work.line.caesurae : work.mainCaesura.map { [$0] } ?? []
        let metrical = work.metricalIndices
        return shown.contains { $0.afterSyllable < metrical.count && metrical[$0.afterSyllable] == i }
    }

    private func textColor(_ i: Int, elided: Bool) -> Color {
        guard work.checked, !elided else { return elided ? Palette.inkFaint : Palette.ink }
        switch work.result(i) {
        case .ok: return Palette.correct
        case .blank: return Palette.inkFaint
        case .wrong, .wrongElision: return Palette.incorrect
        }
    }

    private func markColor(_ i: Int) -> Color {
        guard work.checked else { return Palette.rubric }
        return work.isCorrect(i) ? Palette.correct : Palette.incorrect
    }

    private func elisionColor(_ i: Int, elidable: Bool) -> Color {
        guard elidable else { return .clear }
        if work.checked { return work.elisionCorrect(i) ? Palette.correct : Palette.incorrect }
        if work.elisions.contains(i) { return Palette.rubric }
        return tool == .elision ? Palette.ruleStrong : Palette.hair
    }

    private func bracketColor(_ group: ScansionWork.Group) -> Color {
        guard work.checked else { return Palette.ruleStrong }
        return group.closed && !work.boundaryCorrect(after: group.endsAt) ? Palette.incorrect : Palette.ruleStrong
    }

    private func boundaryColor(_ group: ScansionWork.Group) -> Color {
        guard work.checked else { return Palette.rubric }
        return work.boundaryCorrect(after: group.endsAt) ? Palette.correct : Palette.incorrect
    }
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

private struct ScansionRules: View {
    @Environment(\.dismiss) private var dismiss

    private let rules: [(String, String)] = [
        ("The line", "Six feet. The first four are dactyls (– ⏑ ⏑) or spondees (– –); the fifth is almost always a dactyl; the sixth is two syllables, the last of which may be short (anceps)."),
        ("Long by nature", "A long vowel or a diphthong (ae, au, ei, eu, oe, ui) makes its syllable long."),
        ("Long by position", "A vowel followed by two consonants — in the same word or across a word break — makes its syllable long. x and z count as two; qu and h don't count."),
        ("Mute and liquid", "A mute (p, b, t, d, c, g) followed by a liquid (l, r) may leave the syllable short — the poet's choice."),
        ("Elision", "A word ending in a vowel, a diphthong or -m elides before a word beginning with a vowel or h: the final syllable is swallowed and doesn't count."),
        ("Caesura", "A word break inside a foot. The main one usually falls in the third foot (penthemimeral), otherwise the fourth (hephthemimeral)."),
        ("Working method", "Mark what you know first: the fifth foot (– ⏑ ⏑ | – x), every diphthong, every syllable long by position. The rest usually falls into place."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(rules, id: \.0) { title, body in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(title).rubricLabel()
                            Text(body).font(.prose()).foregroundStyle(Palette.ink)
                        }
                    }
                }
                .padding(20)
            }
            .background(Palette.parchment.ignoresSafeArea())
            .navigationTitle("Rules of the hexameter")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}
