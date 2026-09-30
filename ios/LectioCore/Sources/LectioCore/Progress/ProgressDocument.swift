import Foundation

/// A student's progress — the web's `SyncableData` — held as the same JSON
/// document the web app syncs through the `user_progress` table and writes
/// to its Settings export file.
///
/// The raw document is the source of truth. Reads decode typed records from
/// it; each edit is a port of the matching web store action
/// (src/store/useStore.ts) and changes only what that action changes, so a
/// document round-trips through this app without losing a field.
public struct ProgressDocument: Sendable, Equatable {
    public private(set) var raw: JSONObject

    /// Wraps a document (from disk, the cloud, or an import), filling in any
    /// missing field with the web's initial value.
    public init(raw: JSONObject, now: Date = Date()) {
        var filled = raw
        for (key, value) in Self.blankRaw(now: now) where !filled.contains(key) { filled[key] = value }
        self.raw = filled
    }

    /// What a brand-new student's progress looks like — `blankSyncableData()`.
    public static func blank(now: Date = Date(), prefersDark: Bool = false) -> ProgressDocument {
        var raw = blankRaw(now: now)
        raw["theme"] = .string(prefersDark ? "dark" : "light")
        return ProgressDocument(raw: raw, now: now)
    }

    static func blankRaw(now: Date) -> JSONObject {
        JSONObject([
            ("theme", "light"),
            ("glossaryEnabled", true),
            ("showMacrons", true),
            ("passages", .object(JSONObject())),
            ("vocab", .object(JSONObject())),
            ("quizAttempts", []),
            ("reviewQueue", []),
            ("translationAttempts", []),
            ("frqResponses", []),
            ("examResults", []),
            ("projectPassages", []),
            ("studyPlan", ["minutesPerDay": 30, "activeDays": [0, 1, 2, 3, 4, 5, 6], "startedAt": .string(StudyDates.today(now))]),
            ("studyDays", []),
            ("aiUsage", []),
            ("scansionAttempts", []),
            ("scansionDrafts", .object(JSONObject())),
            ("wordEncounters", .object(JSONObject())),
            ("lessons", .object(JSONObject())),
            ("learner", .null),
        ])
    }

    /* -------------------------------------------------------------- */
    /* Reads                                                            */
    /* -------------------------------------------------------------- */

    public var theme: Theme { raw["theme"]?.stringValue.flatMap(Theme.init(rawValue:)) ?? .light }
    public var glossaryEnabled: Bool { raw["glossaryEnabled"]?.boolValue ?? true }
    public var showMacrons: Bool { raw["showMacrons"]?.boolValue ?? true }

    public var studyPlan: StudyPlanSettings {
        (try? raw["studyPlan"]?.decode()) ?? StudyPlanSettings(minutesPerDay: 30, activeDays: Array(0...6), startedAt: StudyDates.today())
    }

    public var studyDays: [String] { raw.array("studyDays").compactMap(\.stringValue) }
    public var reviewQueue: [String] { raw.array("reviewQueue").compactMap(\.stringValue) }

    /// Every vocabulary card in rotation, keyed by vocab id.
    public var vocab: [String: VocabCard] {
        var out: [String: VocabCard] = [:]
        for (id, value) in raw.object("vocab") {
            if let card = VocabCard(json: value) { out[id] = card }
        }
        return out
    }

    public func card(_ id: String) -> VocabCard? { raw.object("vocab")[id].flatMap(VocabCard.init(json:)) }

    public func passage(_ id: String) -> PassageState {
        (try? raw.object("passages")[id]?.decode()) ?? PassageState()
    }

    public var quizAttempts: [QuizAttempt] { raw.array("quizAttempts").compactMap { try? $0.decode() } }

    /// Course lessons finished, by lesson id.
    public var lessons: [String: LessonProgress] {
        var out: [String: LessonProgress] = [:]
        for (id, value) in raw.object("lessons") {
            if let p: LessonProgress = try? value.decode() { out[id] = p }
        }
        return out
    }

    /// The first-run answers, or nil before they've been given.
    public var learner: LearnerProfile? {
        guard let value = raw["learner"], value != .null else { return nil }
        return try? value.decode()
    }

    public var wordEncounters: [String: WordEncounter] {
        var out: [String: WordEncounter] = [:]
        for (id, value) in raw.object("wordEncounters") {
            if let e: WordEncounter = try? value.decode() { out[id] = e }
        }
        return out
    }

    /* -------------------------------------------------------------- */
    /* Edits — each a port of the web store action of the same name     */
    /* -------------------------------------------------------------- */

    public mutating func setTheme(_ theme: Theme) { raw["theme"] = .string(theme.rawValue) }
    public mutating func toggleGlossary() { raw["glossaryEnabled"] = .bool(!glossaryEnabled) }

    public mutating func setStudyPlan(minutesPerDay: Int? = nil, activeDays: [Int]? = nil) {
        var plan = raw.object("studyPlan")
        if let minutesPerDay { plan["minutesPerDay"] = .number(Double(minutesPerDay)) }
        if let activeDays { plan["activeDays"] = .array(activeDays.map { .number(Double($0)) }) }
        raw["studyPlan"] = .object(plan)
    }

    /// Grades one card with SM-2, creating it first if it isn't in rotation yet.
    public mutating func reviewVocab(_ id: String, quality: Int, now: Date = Date(), calendar: Calendar = .current) {
        let card = self.card(id) ?? .new(id: id, now: now)
        updateRecord(in: "vocab", key: id, with: SpacedRepetition.review(card, quality: quality, now: now, calendar: calendar))
    }

    /// Adds any of `ids` not already in rotation as new cards.
    public mutating func seedVocab(_ ids: [String], now: Date = Date()) {
        var vocab = raw.object("vocab")
        for id in ids where !vocab.contains(id) {
            vocab[id] = try? JSONValue(encoding: VocabCard.new(id: id, now: now))
        }
        raw["vocab"] = .object(vocab)
    }

    /// A word looked up while reading resolved to `vocabId`: seed it into
    /// rotation and record where it was seen.
    public mutating func encounterWord(_ vocabId: String, passageId: String, now: Date = Date()) {
        seedVocab([vocabId], now: now)
        var encounters = raw.object("wordEncounters")
        let current: WordEncounter? = try? encounters[vocabId]?.decode()
        var passageIds = current?.passageIds ?? []
        if !passageIds.contains(passageId) { passageIds.append(passageId) }
        let next = WordEncounter(count: (current?.count ?? 0) + 1, lastSeen: StudyDates.today(now), passageIds: passageIds)
        encounters[vocabId] = Self.overlay(encounters[vocabId], next)
        raw["wordEncounters"] = .object(encounters)
    }

    /// Records a multiple-choice answer and keeps the review queue in step:
    /// a miss queues the question, a correct answer clears it.
    public mutating func recordQuiz(questionId: String, correct: Bool, chosenId: String, type: String,
                                    skillCategory: String, unit: String, passageId: String? = nil,
                                    seconds: Double? = nil, now: Date = Date()) {
        let attempt = QuizAttempt(id: Self.uid(now: now), questionId: questionId, correct: correct, chosenId: chosenId,
                                  at: StudyDates.isoTimestamp(now), type: type, skillCategory: skillCategory,
                                  unit: unit, passageId: passageId, seconds: seconds)
        var attempts = raw.array("quizAttempts")
        if let value = try? JSONValue(encoding: attempt) { attempts.append(value) }
        raw["quizAttempts"] = .array(Array(attempts.suffix(ProgressMerge.Caps.quizAttempts)))

        var queue = raw.array("reviewQueue")
        if correct {
            queue.removeAll { $0.stringValue == questionId }
        } else if !queue.contains(where: { $0.stringValue == questionId }) {
            queue.append(.string(questionId))
        }
        raw["reviewQueue"] = .array(queue)
    }

    public mutating func removeFromReviewQueue(_ questionId: String) {
        raw["reviewQueue"] = .array(raw.array("reviewQueue").filter { $0.stringValue != questionId })
    }

    public mutating func toggleBookmark(_ passageId: String) {
        var p = passage(passageId)
        p.bookmarked.toggle()
        updateRecord(in: "passages", key: passageId, with: p)
    }

    public mutating func toggleFlaggedLine(_ passageId: String, line: Int) {
        var p = passage(passageId)
        if let i = p.flaggedLines.firstIndex(of: line) { p.flaggedLines.remove(at: i) } else { p.flaggedLines.append(line) }
        p.flaggedLines.sort()
        updateRecord(in: "passages", key: passageId, with: p)
    }

    public mutating func markOpened(_ passageId: String, now: Date = Date()) {
        var p = passage(passageId)
        p.lastOpened = StudyDates.isoTimestamp(now)
        updateRecord(in: "passages", key: passageId, with: p)
    }

    /* -------------------------------------------------------------- */
    /* Highlights and notes — ports of setHighlight / setAnnotationNote   */
    /* / removeAnnotation                                               */
    /* -------------------------------------------------------------- */

    /// Creates or recolors the highlight spanning exactly this token range on
    /// one line, and returns it. A colorless highlight with no note is
    /// dropped (unless it's brand new — the note flow creates one just to
    /// have an id to attach the note to). Marks drawn wholly inside a new
    /// colored one are absorbed by it, unless they carry a note: a note is
    /// the reader's own writing and is never discarded as a side effect.
    @discardableResult
    public mutating func setHighlight(passageId: String, lineN: Int, startTok: Int, endTok: Int, text: String,
                                      color: HighlightColor?, now: Date = Date()) -> Annotation {
        var p = passage(passageId)
        let existing = p.annotations.first { $0.lineN == lineN && $0.startTok == startTok && $0.endTok == endTok }
        var next = existing ?? Annotation(id: Self.uid(now: now), lineN: lineN, startTok: startTok, endTok: endTok,
                                          text: text, color: color, note: "", createdAt: StudyDates.isoTimestamp(now))
        next.color = color
        next.text = text
        let drop = existing != nil && next.color == nil && next.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        func subsumed(_ a: Annotation) -> Bool {
            a.id != next.id && a.lineN == lineN && a.startTok >= startTok && a.endTok <= endTok
                && a.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        let kept = p.annotations.filter { !(next.color != nil && subsumed($0)) }
        if drop {
            p.annotations = kept.filter { $0.id != next.id }
        } else if existing != nil {
            p.annotations = kept.map { $0.id == next.id ? next : $0 }
        } else {
            p.annotations = kept + [next]
        }
        updateRecord(in: "passages", key: passageId, with: p)
        return next
    }

    public mutating func setAnnotationNote(passageId: String, annotationId: String, note: String) {
        var p = passage(passageId)
        p.annotations = p.annotations
            .map { a in
                var a = a
                if a.id == annotationId { a.note = note }
                return a
            }
            // A colorless annotation with no note carries nothing worth keeping.
            .filter { $0.color != nil || !$0.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        updateRecord(in: "passages", key: passageId, with: p)
    }

    public mutating func removeAnnotation(passageId: String, annotationId: String) {
        var p = passage(passageId)
        p.annotations.removeAll { $0.id == annotationId }
        updateRecord(in: "passages", key: passageId, with: p)
    }

    /// Counts an AI call against today's usage meter — the web's `recordAiCall`.
    public mutating func recordAiCall(route: String, now: Date = Date()) {
        let today = StudyDates.today(now)
        var days = raw.array("aiUsage")
        if let i = days.firstIndex(where: { $0["date"]?.stringValue == today }), var day = days[i].objectValue {
            day["calls"] = .number((day["calls"]?.doubleValue ?? 0) + 1)
            var byRoute = day["byRoute"]?.objectValue ?? JSONObject()
            byRoute[route] = .number((byRoute[route]?.doubleValue ?? 0) + 1)
            day["byRoute"] = .object(byRoute)
            days[i] = .object(day)
        } else {
            days.append(["date": .string(today), "calls": 1, "byRoute": .object(JSONObject([(route, 1)]))])
        }
        raw["aiUsage"] = .array(Array(days.suffix(ProgressMerge.Caps.aiUsage)))
    }

    /* -------------------------------------------------------------- */
    /* Graded work — ports of recordTranslation, saveFrq, recordExam,    */
    /* upsertProjectPassage, recordScansion, saveScansionDraft           */
    /* -------------------------------------------------------------- */

    public var translationAttempts: [TranslationAttempt] { raw.array("translationAttempts").compactMap { try? $0.decode() } }
    public var frqResponses: [FrqResponse] { raw.array("frqResponses").compactMap { try? $0.decode() } }
    public var examResults: [ExamResult] { raw.array("examResults").compactMap { try? $0.decode() } }
    public var projectPassages: [ProjectPassage] { raw.array("projectPassages").compactMap { try? $0.decode() } }
    public var scansionAttempts: [ScansionAttempt] { raw.array("scansionAttempts").compactMap { try? $0.decode() } }

    public func scansionDraft(_ lineId: String) -> ScansionDraft? { try? raw.object("scansionDrafts")[lineId]?.decode() }

    public mutating func recordTranslation(drillId: String, segmentResults: [String: String], text: String, score: Double,
                                           maxScore: Int, missedTags: [String], gradedBy: String, now: Date = Date()) {
        let attempt = TranslationAttempt(id: Self.uid(now: now), drillId: drillId, at: StudyDates.isoTimestamp(now),
                                         segmentResults: segmentResults, text: text, score: score, maxScore: maxScore,
                                         missedTags: missedTags, gradedBy: gradedBy)
        append(attempt, to: "translationAttempts", cap: ProgressMerge.Caps.translationAttempts)
    }

    /// Saves an FRQ response, replacing the one with the same id if it exists
    /// (an in-progress answer being updated), and returns its id.
    @discardableResult
    public mutating func saveFrq(id: String?, promptId: String, answers: [String: String], selfScore: [String: Double],
                                 secondsSpent: Double, submitted: Bool, now: Date = Date()) -> String {
        let id = id ?? Self.uid(now: now)
        let record = FrqResponse(id: id, promptId: promptId, at: StudyDates.isoTimestamp(now), answers: answers,
                                 selfScore: selfScore, secondsSpent: secondsSpent, submitted: submitted)
        guard let value = try? JSONValue(encoding: record) else { return id }
        var list = raw.array("frqResponses")
        if let i = list.firstIndex(where: { $0["id"]?.stringValue == id }) { list[i] = value } else { list.append(value) }
        raw["frqResponses"] = .array(Array(list.suffix(ProgressMerge.Caps.frqResponses)))
        return id
    }

    public mutating func recordExam(mcqCorrect: Int, mcqTotal: Int, frqPoints: Double, frqMax: Double,
                                    bySkill: [String: Tally], byType: [String: Tally], mcqSeconds: Double,
                                    frqSeconds: Double, now: Date = Date()) {
        let result = ExamResult(id: Self.uid(now: now), at: StudyDates.isoTimestamp(now), mcqCorrect: mcqCorrect,
                                mcqTotal: mcqTotal, frqPoints: frqPoints, frqMax: frqMax, bySkill: bySkill, byType: byType,
                                mcqSeconds: mcqSeconds, frqSeconds: frqSeconds)
        append(result, to: "examResults", cap: nil)
    }

    public mutating func upsertProjectPassage(_ passage: ProjectPassage) {
        guard let value = try? JSONValue(encoding: passage) else { return }
        var list = raw.array("projectPassages")
        if let i = list.firstIndex(where: { $0["id"]?.stringValue == passage.id }) {
            list[i] = .object((list[i].objectValue ?? JSONObject()).overlaid(with: value.objectValue ?? JSONObject()))
        } else {
            list.append(value)
        }
        raw["projectPassages"] = .array(list)
    }

    public mutating func removeProjectPassage(_ id: String) {
        raw["projectPassages"] = .array(raw.array("projectPassages").filter { $0["id"]?.stringValue != id })
    }

    public mutating func recordScansion(lineId: String, correct: Int, total: Int, now: Date = Date()) {
        let attempt = ScansionAttempt(id: Self.uid(now: now), lineId: lineId, at: StudyDates.isoTimestamp(now),
                                      correct: correct, total: total)
        append(attempt, to: "scansionAttempts", cap: ProgressMerge.Caps.scansionAttempts)
    }

    /// Keeps a line's in-progress marks. Bounded to the 300 most recently
    /// added lines, evicting in insertion order exactly as the web store does.
    public mutating func saveScansionDraft(lineId: String, draft: ScansionDraft) {
        guard let value = try? JSONValue(encoding: draft) else { return }
        var drafts = raw.object("scansionDrafts")
        drafts[lineId] = value
        if drafts.count > ProgressMerge.Caps.scansionDrafts { drafts.removeFirst(drafts.count - ProgressMerge.Caps.scansionDrafts) }
        raw["scansionDrafts"] = .object(drafts)
    }

    private mutating func append<T: Encodable>(_ record: T, to key: String, cap: Int?) {
        guard let value = try? JSONValue(encoding: record) else { return }
        let list = raw.array(key) + [value]
        raw[key] = .array(cap.map { Array(list.suffix($0)) } ?? list)
    }

    /// Adds today to the streak calendar.
    /// A lesson finished: its score (0–1) and the AP-list words it taught,
    /// which join the deck. Counts as a study day. Same as the web's
    /// `completeLesson`.
    public mutating func completeLesson(_ lessonId: String, score: Double, vocabIds: [String], now: Date = Date()) {
        let stamp = StudyDates.isoTimestamp(now)
        let prev = lessons[lessonId]
        let progress = LessonProgress(
            completedAt: prev?.completedAt ?? stamp,
            lastAt: stamp,
            best: Swift.max(prev?.best ?? 0, Swift.min(1, Swift.max(0, score))),
            attempts: (prev?.attempts ?? 0) + 1
        )
        var all = raw.object("lessons")
        all[lessonId] = try? JSONValue(encoding: progress)
        raw["lessons"] = .object(all)
        seedVocab(vocabIds, now: now)
        markStudied(now: now)
    }

    public mutating func setLearner(_ profile: LearnerProfile?) {
        raw["learner"] = profile.flatMap { try? JSONValue(encoding: $0) } ?? .null
    }

    public mutating func markStudied(now: Date = Date()) {
        let today = StudyDates.today(now)
        guard !studyDays.contains(today) else { return }
        raw["studyDays"] = .array(Array((raw.array("studyDays") + [.string(today)]).suffix(ProgressMerge.Caps.studyDays)))
    }

    /* -------------------------------------------------------------- */
    /* Export / import — the Settings backup file, same format as web   */
    /* -------------------------------------------------------------- */

    /// The JSON the web's Settings export writes, so a backup moves between
    /// the website and this app in either direction.
    public func exportJSON(now: Date = Date(), storeVersion: Int = 1) -> String {
        let payload: JSONValue = .object(JSONObject([
            ("app", "ap-latin"),
            ("version", .number(Double(storeVersion))),
            ("exportedAt", .string(StudyDates.isoTimestamp(now))),
            ("data", .object(raw)),
        ]))
        return payload.serialized()
    }

    public enum ImportError: Error, Equatable { case notAnExport, unreadable }

    /// Reads a Settings export file. Like the web import, the file's fields
    /// replace this document's — it's a restore, not a merge.
    public static func importJSON(_ text: String, now: Date = Date()) throws(ImportError) -> ProgressDocument {
        guard let parsed = try? JSONValue.parse(text) else { throw .unreadable }
        guard parsed["app"]?.stringValue == "ap-latin", let data = parsed["data"]?.objectValue else { throw .notAnExport }
        return ProgressDocument(raw: data, now: now)
    }

    /* -------------------------------------------------------------- */
    /* Helpers                                                          */
    /* -------------------------------------------------------------- */

    /// Writes a typed record into a keyed collection, keeping any fields of
    /// the stored record the typed model doesn't know about.
    mutating func updateRecord<T: Encodable>(in collection: String, key: String, with value: T) {
        var records = raw.object(collection)
        records[key] = Self.overlay(records[key], value)
        raw[collection] = .object(records)
    }

    static func overlay<T: Encodable>(_ existing: JSONValue?, _ value: T) -> JSONValue? {
        guard let encoded = try? JSONValue(encoding: value).objectValue else { return existing }
        return .object((existing?.objectValue ?? JSONObject()).overlaid(with: encoded))
    }

    /// The web store's `uid()`: random base-36 plus the time in base 36.
    static func uid(now: Date) -> String {
        let alphabet = Array("0123456789abcdefghijklmnopqrstuvwxyz")
        let random = String((0..<8).map { _ in alphabet.randomElement()! })
        return random + String(Int64(now.timeIntervalSince1970 * 1000), radix: 36)
    }
}
