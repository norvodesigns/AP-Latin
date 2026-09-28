import Foundation

/// What a student has done to one line so far, and how it scores — the
/// rules of src/app/scansion/ScansionLab.tsx, kept out of the UI so they can
/// be tested.
///
/// Three things count, not one: every syllable's quantity, the five foot
/// divisions, and every elision judgment. All quantities right but the feet
/// wrongly divided, or an elision missed, is not a scanned line.
public struct ScansionWork: Sendable, Equatable {
    public let line: ScansionLine
    /// One per syllable: "long", "short" or nil.
    public var marks: [String?]
    /// Raw syllable indices after which the student ruled a boundary.
    public var divisions: [Int]
    /// Syllable indices the student claims elide into the next word.
    public var elisions: Set<Int>
    public var checked: Bool

    public init(line: ScansionLine, draft: ScansionDraft?) {
        self.line = line
        if let draft, draft.marks.count == line.syllables.count {
            marks = draft.marks
            divisions = draft.divisions
            elisions = Set(draft.elisions ?? [])
            checked = draft.checked ?? false
        } else {
            marks = Array(repeating: nil, count: line.syllables.count)
            divisions = []
            elisions = []
            checked = false
        }
    }

    public var draft: ScansionDraft {
        ScansionDraft(marks: marks, divisions: divisions, checked: checked ? true : nil, elisions: elisions.sorted())
    }

    public var isBlank: Bool { marks.allSatisfy { $0 == nil } && divisions.isEmpty && elisions.isEmpty }

    /* -------------------------------------------------------------- */
    /* Views of the line                                                 */
    /* -------------------------------------------------------------- */

    /// Whether syllable `i` currently counts as elided: the real answer once
    /// checked, but before that only what the student has claimed. A syllable
    /// that truly elides but hasn't been claimed must look and behave exactly
    /// like any other, or the foot maths would give the answer away.
    public func elidesAt(_ i: Int) -> Bool {
        checked ? line.syllables[i].isElided : elisions.contains(i)
    }

    /// Syllables that count metrically, per the real answer.
    public var metricalIndices: [Int] { line.syllables.indices.filter { !line.syllables[$0].isElided } }

    /// Syllables that count metrically from the student's own current view.
    public var studentMetricalIndices: [Int] { line.syllables.indices.filter { !elidesAt($0) } }

    /// Word-final syllables with a word after them: every junction where
    /// elision is a live question.
    public var elidableIndices: [Int] {
        line.syllables.indices.filter { $0 < line.syllables.count - 1 && Self.isWordFinal(line.syllables, $0) }
    }

    static func isWordFinal(_ s: [ScannedSyllable], _ i: Int) -> Bool {
        i + 1 >= s.count || s[i + 1].startsWord != false
    }

    /// The divisions the metre requires, in metrical-index terms.
    public var correctDivisions: [Int] {
        var out: [Int] = []
        var acc = -1
        for f in line.feet.dropLast() {
            acc += f == "dactyl" ? 3 : 2
            out.append(acc)
        }
        return out
    }

    public struct Group: Sendable, Equatable {
        public let syllables: [Int]
        /// The last syllable in it that counts.
        public let endsAt: Int
        /// Whether the student ruled a boundary after it.
        public let closed: Bool
    }

    /// The line split at the student's own boundaries. An elided syllable is
    /// carried with the foot it sits inside and never fills it.
    public var groups: [Group] {
        let cuts = Set(divisions)
        var out: [Group] = []
        var current: [Int] = []
        var lastCounted = -1
        var i = 0
        while i < line.syllables.count {
            current.append(i)
            if !elidesAt(i) {
                lastCounted = i
                if cuts.contains(i) {
                    while i + 1 < line.syllables.count, elidesAt(i + 1) {
                        i += 1
                        current.append(i)
                    }
                    out.append(Group(syllables: current, endsAt: lastCounted, closed: true))
                    current = []
                }
            }
            i += 1
        }
        if !current.isEmpty { out.append(Group(syllables: current, endsAt: lastCounted, closed: false)) }
        return out
    }

    /// "Dactyl" or "Spondee" when the student's own marks make the group one.
    public func footName(_ group: Group) -> String? {
        let metrical = group.syllables.filter { !elidesAt($0) }
        let shape = metrical.map { marks[$0] }
        if shape.contains(where: { $0 == nil }) { return nil }
        if shape == ["long", "short", "short"] { return "Dactyl" }
        if shape == ["long", "long"] { return "Spondee" }
        return nil
    }

    /// Everything the student sees still needs a mark, and all five boundaries are in.
    public var isReady: Bool {
        studentMetricalIndices.allSatisfy { marks[$0] != nil } && divisions.count == 5
    }

    /* -------------------------------------------------------------- */
    /* Editing                                                          */
    /* -------------------------------------------------------------- */

    /// Blank → long → short → blank.
    public mutating func cycleMark(_ i: Int) {
        guard !checked, !elidesAt(i) else { return }
        marks[i] = switch marks[i] { case nil: "long"; case "long": "short"; default: nil }
    }

    public mutating func setMark(_ i: Int, _ mark: String?) {
        guard !checked else { return }
        marks[i] = mark
    }

    /// A boundary can go after any syllable the student's view counts, except the last.
    public func canDivide(after i: Int) -> Bool {
        !checked && !elidesAt(i) && (studentMetricalIndices.firstIndex(of: i).map { $0 < studentMetricalIndices.count - 1 } ?? false)
    }

    public mutating func toggleDivision(after i: Int) {
        guard canDivide(after: i) else { return }
        if let k = divisions.firstIndex(of: i) { divisions.remove(at: k) } else { divisions = (divisions + [i]).sorted() }
    }

    /// Claiming an elision clears that syllable's mark and any boundary
    /// anchored to it; un-claiming leaves marks alone.
    public mutating func toggleElision(_ i: Int) {
        guard !checked, elidableIndices.contains(i) else { return }
        if elisions.contains(i) {
            elisions.remove(i)
        } else {
            elisions.insert(i)
            marks[i] = nil
            divisions.removeAll { $0 == i }
        }
    }

    /* -------------------------------------------------------------- */
    /* Scoring                                                          */
    /* -------------------------------------------------------------- */

    /// The final syllable is anceps: either mark is right there.
    public func isCorrect(_ i: Int) -> Bool {
        guard let mark = marks[i] else { return false }
        if line.syllables[i].isAnceps { return true }
        return mark == line.syllables[i].quantity
    }

    public func elisionCorrect(_ i: Int) -> Bool {
        elisions.contains(i) == line.syllables[i].isElided
    }

    /// Whether the student's boundary after raw syllable `i` is one the metre has.
    public func boundaryCorrect(after i: Int) -> Bool {
        metricalIndices.firstIndex(of: i).map { correctDivisions.contains($0) } ?? false
    }

    public enum SyllableResult: Sendable { case ok, wrong, blank, wrongElision }

    public func result(_ i: Int) -> SyllableResult {
        if line.syllables[i].isElided { return marks[i] == nil ? .ok : .wrongElision }
        if isCorrect(i) { return .ok }
        return marks[i] == nil ? .blank : .wrong
    }

    public struct Score: Sendable, Equatable {
        public let syllables: Int
        public let syllablesTotal: Int
        public let boundaries: Int
        public let boundariesTotal: Int
        public let elisions: Int
        public let elisionsTotal: Int
        public var correct: Int { syllables + boundaries + elisions }
        public var total: Int { syllablesTotal + boundariesTotal + elisionsTotal }
    }

    public var score: Score {
        let metrical = metricalIndices
        let asMetrical = divisions.map { metrical.firstIndex(of: $0) ?? -1 }
        let correctDivs = correctDivisions
        let elidable = elidableIndices
        return Score(syllables: metrical.filter(isCorrect).count, syllablesTotal: metrical.count,
                     boundaries: asMetrical.filter { correctDivs.contains($0) }.count, boundariesTotal: correctDivs.count,
                     elisions: elidable.filter(elisionCorrect).count, elisionsTotal: elidable.count)
    }

    /// The principal break — penthemimeral where there is one, else the first.
    public var mainCaesura: Caesura? {
        line.caesurae.first { $0.type == "penthemimeral" } ?? line.caesurae.first
    }
}

/// Per-line progress and badges — ports of `scansionStatsByLine`,
/// `masteredLineIds` and `scansionBadges` from src/store/useStore.ts.
public enum ScansionStats {
    public struct Line: Sendable, Equatable {
        public let lineId: String
        public var attempts: Int
        public var bestAccuracy: Double
        public var lastAccuracy: Double
        public var mastered: Bool
    }

    public static func byLine(_ attempts: [ScansionAttempt]) -> [String: Line] {
        var map: [String: Line] = [:]
        for a in attempts {
            let acc = a.total > 0 ? Double(a.correct) / Double(a.total) : 0
            if var cur = map[a.lineId] {
                cur.attempts += 1
                cur.bestAccuracy = max(cur.bestAccuracy, acc)
                cur.lastAccuracy = acc
                cur.mastered = cur.mastered || acc == 1
                map[a.lineId] = cur
            } else {
                map[a.lineId] = Line(lineId: a.lineId, attempts: 1, bestAccuracy: acc, lastAccuracy: acc, mastered: acc == 1)
            }
        }
        return map
    }

    public static func mastered(_ attempts: [ScansionAttempt]) -> Set<String> {
        Set(byLine(attempts).values.filter(\.mastered).map(\.lineId))
    }

    /// The unmastered line the student is weakest on, if any.
    public static func weakest(_ attempts: [ScansionAttempt]) -> String? {
        byLine(attempts).values.filter { !$0.mastered }.min { $0.bestAccuracy < $1.bestAccuracy }?.lineId
    }

    public struct Badge: Sendable, Identifiable, Equatable {
        public let id: String
        public let label: String
        public let detail: String
        public let earned: Bool
    }

    public static func badges(_ attempts: [ScansionAttempt], poolSize: Int) -> [Badge] {
        let masteredCount = byLine(attempts).values.filter(\.mastered).count
        var streak = 0
        var best = 0
        for a in attempts {
            if a.total > 0, a.correct == a.total { streak += 1; best = max(best, streak) } else { streak = 0 }
        }
        let half = Int((Double(poolSize) / 2).rounded(.up))
        return [
            Badge(id: "first-line", label: "First scan", detail: "Scan a line for the first time.", earned: !attempts.isEmpty),
            Badge(id: "streak-5", label: "Five in a row", detail: "Score a perfect line five attempts in a row.", earned: best >= 5),
            Badge(id: "half-mastered", label: "Halfway there", detail: "Master half of the loaded lines (\(half) of \(poolSize)).",
                  earned: poolSize > 0 && masteredCount >= half),
            Badge(id: "all-mastered", label: "Full mastery", detail: "Score a perfect scansion on every one of the \(poolSize) loaded lines.",
                  earned: poolSize > 0 && masteredCount >= poolSize),
            Badge(id: "veteran", label: "Fifty scans", detail: "Complete fifty scansion attempts in total.", earned: attempts.count >= 50),
        ]
    }
}
