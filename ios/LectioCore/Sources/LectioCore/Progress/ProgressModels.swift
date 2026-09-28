import Foundation

// Typed views of records inside the progress document — mirrors of the
// record shapes in src/store/useStore.ts. Screens decode these from the
// document; edits are written back with `JSONObject.overlaid(with:)` so any
// field this build doesn't know about survives.

public enum HighlightColor: String, Codable, Sendable, CaseIterable {
    case gilt, verdigris, woad, rubric
}

public struct Annotation: Codable, Sendable, Hashable, Identifiable {
    public var id: String
    public var lineN: Int
    /// Inclusive token indices into the line's exported `tokens`.
    public var startTok: Int
    public var endTok: Int
    public var text: String
    public var color: HighlightColor?
    public var note: String
    public var createdAt: String

    public init(id: String, lineN: Int, startTok: Int, endTok: Int, text: String, color: HighlightColor?,
                note: String, createdAt: String) {
        self.id = id
        self.lineN = lineN
        self.startTok = startTok
        self.endTok = endTok
        self.text = text
        self.color = color
        self.note = note
        self.createdAt = createdAt
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
    }
}

public struct PassageState: Codable, Sendable, Hashable {
    public var notes: String = ""
    public var bookmarked: Bool = false
    public var flaggedLines: [Int] = []
    public var lastOpened: String?
    public var coldReads: Int = 0
    public var annotations: [Annotation] = []

    public init() {}

    /// Tolerant of missing fields — an entry the web created with
    /// `updatePassage` may predate a field — filling each from the web's
    /// `emptyPassage()` defaults.
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        notes = try c.decodeIfPresent(String.self, forKey: .notes) ?? ""
        bookmarked = try c.decodeIfPresent(Bool.self, forKey: .bookmarked) ?? false
        flaggedLines = try c.decodeIfPresent([Int].self, forKey: .flaggedLines) ?? []
        lastOpened = try c.decodeIfPresent(String.self, forKey: .lastOpened)
        coldReads = try c.decodeIfPresent(Int.self, forKey: .coldReads) ?? 0
        annotations = try c.decodeIfPresent([Annotation].self, forKey: .annotations) ?? []
    }
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
