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

    /// Adds today to the streak calendar.
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
