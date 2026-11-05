import Foundation

// Typed views of records inside the progress document — mirrors of the
// record shapes in src/store/useStore.ts. Screens decode these from the
// document; edits are written back with `JSONObject.overlaid(with:)` so any
// field this build doesn't know about survives.

/// The four original highlighter colours — the only values `color` ever
/// holds, because the 1.0 and 1.1 apps decode it as a closed set of four.
public enum HighlightColor: String, Codable, Sendable, CaseIterable {
    case gilt, verdigris, woad, rubric
}

/// Every pigment the highlighter offers since 1.2, in the toolbar's order.
/// A newer one is stored in `Annotation.pigment`, with `color` set to the
/// nearest original, so an older app still shows a close colour.
public enum Pigment: String, Codable, Sendable, CaseIterable {
    case gilt, minium, rubric, madder, murex, woad, azurite, verdigris

    public init(_ color: HighlightColor) { self = Pigment(rawValue: color.rawValue) ?? .gilt }

    /// The original colour this falls back to on a 1.0 or 1.1 app — the web's `LEGACY_COLOR`.
    public var legacy: HighlightColor {
        switch self {
        case .gilt, .minium: .gilt
        case .rubric, .madder, .murex: .rubric
        case .woad, .azurite: .woad
        case .verdigris: .verdigris
        }
    }

    /// The everyday name, since few readers know what minium is.
    public var plainName: String {
        switch self {
        case .gilt: "gold"
        case .minium: "orange"
        case .rubric: "red"
        case .madder: "pink"
        case .murex: "purple"
        case .woad: "blue"
        case .azurite: "sky blue"
        case .verdigris: "green"
        }
    }
}

public struct Annotation: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var lineN: Int
    /// Inclusive token indices into the line's exported `tokens`.
    public var startTok: Int
    public var endTok: Int
    public var text: String
    public var color: HighlightColor?
    /// Since 1.2: the pigment chosen when it is one of the newer four. Kept as
    /// the raw string so a pigment a later version adds still round-trips.
    public var pigment: String?
    public var note: String
    public var createdAt: String
    /// Since 1.2: the last change, so the later edit wins a merge.
    public var updatedAt: String?
    /// Since 1.2: shared by the per-line pieces of one selection.
    public var group: String?

    public init(id: String, lineN: Int, startTok: Int, endTok: Int, text: String, color: HighlightColor?,
                note: String, createdAt: String, pigment: String? = nil, updatedAt: String? = nil, group: String? = nil) {
        self.id = id
        self.lineN = lineN
        self.startTok = startTok
        self.endTok = endTok
        self.text = text
        self.color = color
        self.pigment = pigment
        self.note = note
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.group = group
    }

    /// The pigment the highlight shows, or nil for a note with no colour.
    public var shownPigment: Pigment? {
        guard let color else { return nil }
        return pigment.flatMap(Pigment.init(rawValue:)) ?? Pigment(color)
    }

    public var hasNote: Bool { !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    enum CodingKeys: String, CodingKey {
        case id, lineN, startTok, endTok, text, color, pigment, note, createdAt, updatedAt, group
    }

    /// Tolerant of a colour this build doesn't know: shown as gilt rather
    /// than failing the whole passage, which is what hid every highlight on
    /// a passage in 1.1 when one record didn't decode.
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        lineN = try c.decode(Int.self, forKey: .lineN)
        startTok = try c.decode(Int.self, forKey: .startTok)
        endTok = try c.decode(Int.self, forKey: .endTok)
        text = try c.decodeIfPresent(String.self, forKey: .text) ?? ""
        color = try c.decodeIfPresent(String.self, forKey: .color).map { HighlightColor(rawValue: $0) ?? .gilt }
        pigment = try c.decodeIfPresent(String.self, forKey: .pigment)
        note = try c.decodeIfPresent(String.self, forKey: .note) ?? ""
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)
        group = try c.decodeIfPresent(String.self, forKey: .group)
    }

    // `color` is written as an explicit null, as the web does, rather than omitted.
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(lineN, forKey: .lineN)
        try c.encode(startTok, forKey: .startTok)
        try c.encode(endTok, forKey: .endTok)
        try c.encode(text, forKey: .text)
        try c.encode(color, forKey: .color)
        try c.encode(note, forKey: .note)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encodeIfPresent(updatedAt, forKey: .updatedAt)
        try c.encodeIfPresent(pigment, forKey: .pigment)
        try c.encodeIfPresent(group, forKey: .group)
    }
}

/// The parts of a sentence a reader can mark — the web's `SyntaxRole`.
public enum SyntaxRole: String, Codable, Sendable, CaseIterable {
    case subject, verb, object, indirect
    case nominative, genitive, dative, accusative, ablative, vocative
    case participle, infinitive, ablAbs, prep, clause

    public enum Group: String, Sendable, CaseIterable { case sentence, `case`, construction }

    /// What prints under the words: S, V, DO, abl… — the web's `ROLE_INFO`.
    public var short: String {
        switch self {
        case .subject: "S"
        case .verb: "V"
        case .object: "DO"
        case .indirect: "IO"
        case .nominative: "nom"
        case .genitive: "gen"
        case .dative: "dat"
        case .accusative: "acc"
        case .ablative: "abl"
        case .vocative: "voc"
        case .participle: "ptc"
        case .infinitive: "inf"
        case .ablAbs: "abl abs"
        case .prep: "prep"
        case .clause: "[ ]"
        }
    }

    public var label: String {
        switch self {
        case .subject: "Subject"
        case .verb: "Verb"
        case .object: "Direct object"
        case .indirect: "Indirect object"
        case .nominative: "Nominative"
        case .genitive: "Genitive"
        case .dative: "Dative"
        case .accusative: "Accusative"
        case .ablative: "Ablative"
        case .vocative: "Vocative"
        case .participle: "Participle"
        case .infinitive: "Infinitive"
        case .ablAbs: "Ablative absolute"
        case .prep: "Prepositional phrase"
        case .clause: "Subordinate clause"
        }
    }

    public var hint: String {
        switch self {
        case .subject: "Who or what does the action; nominative"
        case .verb: "The main verb of the clause"
        case .object: "Receives the action; accusative"
        case .indirect: "To or for whom; dative"
        case .nominative: "Subject, or predicate after sum"
        case .genitive: "of; possession, part of a whole"
        case .dative: "to, for; also with compounds and special verbs"
        case .accusative: "Object, extent, place to which, subject of an infinitive"
        case .ablative: "by, with, from, in, on; means, manner, place where"
        case .vocative: "Someone addressed directly"
        case .participle: "A verbal adjective; find the noun it agrees with"
        case .infinitive: "Complementary, or indirect statement"
        case .ablAbs: "Noun and participle in the ablative, apart from the sentence"
        case .prep: "A preposition and its object"
        case .clause: "cum, ut, quī, sī, dum… to its verb"
        }
    }

    public var group: Group {
        switch self {
        case .subject, .verb, .object, .indirect: .sentence
        case .nominative, .genitive, .dative, .accusative, .ablative, .vocative: .case
        case .participle, .infinitive, .ablAbs, .prep, .clause: .construction
        }
    }
}

/// A sentence-part mark on a run of tokens — the web's `SyntaxMark`.
public struct SyntaxMark: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var lineN: Int
    public var startTok: Int
    public var endTok: Int
    public var text: String
    /// Raw, so a role a later version adds still round-trips; see `roleValue`.
    public var role: String
    public var createdAt: String
    public var updatedAt: String?
    public var group: String?

    public init(id: String, lineN: Int, startTok: Int, endTok: Int, text: String, role: SyntaxRole,
                createdAt: String, updatedAt: String? = nil, group: String? = nil) {
        self.id = id
        self.lineN = lineN
        self.startTok = startTok
        self.endTok = endTok
        self.text = text
        self.role = role.rawValue
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.group = group
    }

    public var roleValue: SyntaxRole? { SyntaxRole(rawValue: role) }
}

public struct PassageState: Codable, Sendable, Hashable {
    public var notes: String = ""
    public var bookmarked: Bool = false
    public var flaggedLines: [Int] = []
    public var lastOpened: String?
    public var coldReads: Int = 0
    public var annotations: [Annotation] = []
    /// Since 1.2. Nil (and so never written) on a passage that has had none.
    /// The `removed` records are kept in the raw document, in order — see
    /// `ProgressDocument.recordRemoved`.
    public var marks: [SyntaxMark]?

    public init() {}

    /// Tolerant of missing fields — an entry the web created with
    /// `updatePassage` may predate a field — filling each from the web's
    /// `emptyPassage()` defaults. A highlight or mark that can't be read is
    /// skipped rather than failing the whole passage.
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        notes = try c.decodeIfPresent(String.self, forKey: .notes) ?? ""
        bookmarked = try c.decodeIfPresent(Bool.self, forKey: .bookmarked) ?? false
        flaggedLines = try c.decodeIfPresent([Int].self, forKey: .flaggedLines) ?? []
        lastOpened = try c.decodeIfPresent(String.self, forKey: .lastOpened)
        coldReads = try c.decodeIfPresent(Int.self, forKey: .coldReads) ?? 0
        annotations = (try c.decodeIfPresent([Lossy<Annotation>].self, forKey: .annotations) ?? []).compactMap(\.value)
        marks = try c.decodeIfPresent([Lossy<SyntaxMark>].self, forKey: .marks)?.compactMap(\.value)
    }

    /// Marks on this passage, or none.
    public var allMarks: [SyntaxMark] { marks ?? [] }

    /// How many things of the reader's own the passage carries: each
    /// highlight or note, each sentence mark (a phrase marked across lines
    /// counts once), and the notes on the passage as a whole. A cold read
    /// hides them all and says how many it is keeping. The web's
    /// `markupCount` in src/lib/annotations.ts.
    public var markupCount: Int {
        let highlights = Set(annotations.filter { $0.color != nil || $0.hasNote }.map { $0.group ?? $0.id })
        let marked = Set(allMarks.map { $0.group ?? $0.id })
        let passageNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0 : 1
        return highlights.count + marked.count + passageNotes
    }
}

/// Decodes one element of an array, or nil if it can't be read, without
/// failing the array.
struct Lossy<T: Decodable>: Decodable {
    let value: T?
    init(from decoder: any Decoder) throws { value = try? T(from: decoder) }
}

public struct QuizAttempt: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var questionId: String
    public var correct: Bool
    public var chosenId: String
    public var at: String
    public var type: String
    public var skillCategory: String
    public var unit: String
    public var passageId: String?
    public var seconds: Double?

    public init(id: String, questionId: String, correct: Bool, chosenId: String, at: String, type: String,
                skillCategory: String, unit: String, passageId: String?, seconds: Double?) {
        self.id = id
        self.questionId = questionId
        self.correct = correct
        self.chosenId = chosenId
        self.at = at
        self.type = type
        self.skillCategory = skillCategory
        self.unit = unit
        self.passageId = passageId
        self.seconds = seconds
    }
}

public struct StudyPlanSettings: Codable, Sendable, Hashable {
    public var minutesPerDay: Int
    /// 0 = Sunday.
    public var activeDays: [Int]
    public var startedAt: String
}

public struct WordEncounter: Codable, Sendable, Hashable {
    public var count: Int
    public var lastSeen: String
    public var passageIds: [String]
}

public enum Theme: String, Codable, Sendable {
    case light, dark
}

public struct TranslationAttempt: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var drillId: String
    public var at: String
    /// Segment id -> "correct" | "partial" | "incorrect".
    public var segmentResults: [String: String]
    public var text: String
    public var score: Double
    public var maxScore: Int
    public var missedTags: [String]
    /// "self" or "ai".
    public var gradedBy: String
}

public struct FrqResponse: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var promptId: String
    public var at: String
    /// Subquestion id -> the typed answer.
    public var answers: [String: String]
    /// Rubric row id -> points awarded.
    public var selfScore: [String: Double]
    public var secondsSpent: Double
    public var submitted: Bool

    public init(id: String, promptId: String, at: String, answers: [String: String], selfScore: [String: Double],
                secondsSpent: Double, submitted: Bool) {
        self.id = id
        self.promptId = promptId
        self.at = at
        self.answers = answers
        self.selfScore = selfScore
        self.secondsSpent = secondsSpent
        self.submitted = submitted
    }
}

public struct Tally: Codable, Sendable, Hashable {
    public var correct: Int
    public var total: Int
    public init(correct: Int, total: Int) {
        self.correct = correct
        self.total = total
    }
}

public struct ExamResult: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var at: String
    public var mcqCorrect: Int
    public var mcqTotal: Int
    public var frqPoints: Double
    public var frqMax: Double
    public var bySkill: [String: Tally]
    public var byType: [String: Tally]
    public var mcqSeconds: Double
    public var frqSeconds: Double
}

public struct ProjectPassage: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var title: String
    public var author: String
    public var citation: String
    /// "prose" or "poetry".
    public var genre: String
    public var latin: String
    public var notes: String
    public var checkpoint1: String
    public var checkpoint2: String

    public init(id: String, title: String, author: String, citation: String, genre: String, latin: String,
                notes: String, checkpoint1: String, checkpoint2: String) {
        self.id = id
        self.title = title
        self.author = author
        self.citation = citation
        self.genre = genre
        self.latin = latin
        self.notes = notes
        self.checkpoint1 = checkpoint1
        self.checkpoint2 = checkpoint2
    }
}

extension ProjectPassage {
    /// A Course Project passage from the Reading Room, as a project passage
    /// the student keeps checkpoint drafts on. The id is fixed ("set-" and
    /// the passage's own), so the drafts find it again, and the Latin keeps
    /// College Board's line numbers, which an essay cites. The website does
    /// the same (FrqWorkshop.tsx `fromSet`).
    public static func fromSet(_ p: Passage) -> ProjectPassage {
        ProjectPassage(id: "set-\(p.id)", title: p.title, author: p.authorLabel, citation: p.citation, genre: p.genre,
                       latin: p.lines.map { "\($0.n)  \($0.latin)" }.joined(separator: "\n"),
                       notes: "", checkpoint1: "", checkpoint2: "")
    }
}

public struct ScansionDraft: Codable, Sendable, Hashable {
    /// One per syllable, elided ones included: "long", "short" or null.
    public var marks: [String?]
    /// Metrical indices after which the student placed a foot boundary.
    public var divisions: [Int]
    public var checked: Bool?
    /// Syllable indices the student claims elide.
    public var elisions: [Int]?

    public init(marks: [String?], divisions: [Int], checked: Bool? = nil, elisions: [Int]? = nil) {
        self.marks = marks
        self.divisions = divisions
        self.checked = checked
        self.elisions = elisions
    }

    // Unmarked syllables are written as explicit nulls, as the web writes them.
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        var marksContainer = c.nestedUnkeyedContainer(forKey: .marks)
        for m in marks { if let m { try marksContainer.encode(m) } else { try marksContainer.encodeNil() } }
        try c.encode(divisions, forKey: .divisions)
        try c.encodeIfPresent(checked, forKey: .checked)
        try c.encodeIfPresent(elisions, forKey: .elisions)
    }
}

public struct ScansionAttempt: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var lineId: String
    public var at: String
    public var correct: Int
    public var total: Int
}

/* ------------------------------------------------------------------ */
/* The course                                                          */
/* ------------------------------------------------------------------ */

/// One finished lesson of the course (web: `LessonProgress`).
public struct LessonProgress: Codable, Sendable, Hashable {
    public var completedAt: String
    public var lastAt: String
    /// Best score, 0–1.
    public var best: Double
    public var attempts: Int

    public init(completedAt: String, lastAt: String, best: Double, attempts: Int) {
        self.completedAt = completedAt
        self.lastAt = lastAt
        self.best = best
        self.attempts = attempts
    }
}

/// One day's Sententia (web: `DailyResult`), keyed by local date.
public struct DailyResult: Codable, Sendable, Hashable {
    /// Which line it was.
    public var id: String
    /// Best score that day, 0–1.
    public var score: Double
    /// When it was first done.
    public var at: String

    public init(id: String, score: Double, at: String) {
        self.id = id
        self.score = score
        self.at = at
    }
}

/// The first-run answers (web: `LearnerProfile`).
public struct LearnerProfile: Codable, Sendable, Hashable {
    public enum Track: String, Codable, Sendable, CaseIterable {
        case new, some, ap, teacher
    }

    public var track: Track
    public var startLessonId: String?
    public var onboardedAt: String
    /// Vocabulary units (e.g. "verba-2") the level check found probably
    /// known, offered as unit tests first (`Path.nextWords`).
    public var knownVocabUnits: [String]?

    public init(track: Track, startLessonId: String?, onboardedAt: String, knownVocabUnits: [String]? = nil) {
        self.track = track
        self.startLessonId = startLessonId
        self.onboardedAt = onboardedAt
        self.knownVocabUnits = knownVocabUnits
    }

    // `startLessonId` is written as null, not left out, as the web writes it;
    // `knownVocabUnits` only when there are some, as the web leaves it out.
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(track, forKey: .track)
        try c.encode(startLessonId, forKey: .startLessonId)
        try c.encode(onboardedAt, forKey: .onboardedAt)
        try c.encodeIfPresent(knownVocabUnits, forKey: .knownVocabUnits)
    }
}
