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
