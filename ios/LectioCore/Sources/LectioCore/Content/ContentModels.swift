import Foundation

// Codable mirrors of src/data/types.ts, decoded from the JSON that
// scripts/export-content.ts writes to ios/Content.
//
// Taxonomies (author, unit, question type, grammar category…) are kept as
// plain strings rather than Swift enums on purpose: the curriculum will keep
// growing on the web side, and an enum would make a build that predates a new
// category fail to decode the whole file instead of just not special-casing
// the new value.

/* ------------------------------------------------------------------ */
/* Passages                                                            */
/* ------------------------------------------------------------------ */

/// A glossary candidate for one word, resolved at export time by the web
/// app's own `lookup()` + `disambiguateInContext()`.
public struct Gloss: Codable, Sendable, Hashable {
    /// Vocabulary entry id (core or supplementary).
    public let id: String
    /// "e" for an exact dictionary match, "s" for a stem-based guess.
    public let m: String
    public var isExact: Bool { m == "e" }
}

/// One token of a line exactly as `tokenize()` splits it — a word, or the
/// punctuation and spaces between words. Annotation anchors (`startTok`,
/// `endTok`) index into this array, so it must never be re-split in Swift.
public struct Token: Codable, Sendable, Hashable {
    public let t: String
    public let w: Int?
    public let g: [Gloss]?

    public var text: String { t }
    public var isWord: Bool { w == 1 }
    public var glosses: [Gloss] { g ?? [] }
}

public struct PassageLine: Codable, Sendable, Hashable, Identifiable {
    public let n: Int
    public let latin: String
    public let tokens: [Token]
    public var id: Int { n }
}

public struct Passage: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let author: String
    public let genre: String
    public let work: String
    public let book: Int
    public let letter: Int?
    public let salutation: String?
    public let citation: String
    public let title: String
    /// On the official 2025 CED required reading list.
    public let required: Bool
    public let cedReading: String?
    public let unit: String
    public let macronized: Bool
    public let wordCount: Int
    public let themes: [String]
    public let summary: String
    public let context: String
    public let lines: [PassageLine]
    /// Core vocabulary ids this passage introduces — `passageVocabIds()`.
    public let vocabIds: [String]

    public var isPoetry: Bool { genre == "poetry" }
}

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

public struct VocabEntry: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    /// Full dictionary entry with principal parts, e.g. "fero, ferre, tuli, latum".
    public let lemma: String
    public let headword: String
    public let pos: String
    public let definition: String
    public let readings: [String]
    public let units: [String]
    public let supplementary: Bool?

    public var isSupplementary: Bool { supplementary ?? false }
}

struct VocabularyFile: Codable, Sendable {
    let core: [VocabEntry]
    let supplementary: [VocabEntry]
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

public struct QuestionOption: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let text: String
}

public struct GlossNote: Codable, Sendable, Hashable {
    public let word: String
    public let meaning: String
}

public struct Stimulus: Codable, Sendable, Hashable {
    public let latin: String
    public let citation: String
    public let genre: String
    public let gloss: [GlossNote]?
}

public struct Question: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let type: String
    public let skill: String
    public let skillCategory: String
    public let passageId: String?
    public let lineRange: [Int]?
    public let stimulus: Stimulus?
    public let prompt: String
    public let options: [QuestionOption]
    public let answerId: String
    public let explanation: String
    public let unit: String
    public let difficulty: Int
}

public struct QuestionSet: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let title: String
    public let stimulusType: String
    public let length: String
    public let passageId: String?
    public let questionIds: [String]
}

struct QuestionsFile: Codable, Sendable {
    let questions: [Question]
    let sets: [QuestionSet]
}

/* ------------------------------------------------------------------ */
/* Grammar, devices, culture                                           */
/* ------------------------------------------------------------------ */

public struct GrammarExample: Codable, Sendable, Hashable {
    public let latin: String
    public let citation: String
    public let passageId: String?
    public let analysis: String
}

public struct GrammarChart: Codable, Sendable, Hashable {
    public struct Row: Codable, Sendable, Hashable {
        public let label: String
        public let cells: [String]
    }
    public let title: String
    public let cols: [String]
    public let rows: [Row]
    public let note: String?
}

public struct GrammarTopic: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let name: String
    public let category: String
    /// "foundational", "ap" (the default) or "advanced".
    public let level: String?
    public let summary: String
    public let recognition: [String]
    public let translation: [String]
    public let examples: [GrammarExample]
    public let charts: [GrammarChart]?

    public var courseLevel: String { level ?? "ap" }
}

public struct DeviceCard: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let name: String
    public let definition: String
    public let effect: String
    public let examples: [GrammarExample]
}

public struct ContextCard: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let topic: String
    public let title: String
    public let body: String
    public let keyFacts: [String]
    public let required: Bool?

    public var isRequired: Bool { required ?? true }
}

/* ------------------------------------------------------------------ */
/* Translation, FRQ, sight, scansion                                   */
/* ------------------------------------------------------------------ */

public struct TranslationSegment: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let latin: String
    public let literal: String
    public let requirement: String
    public let pitfalls: [String]
    public let tags: [String]
}

public struct TranslationDrill: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let passageId: String
    public let citation: String
    public let lineRange: [Int]
    public let latin: String
    public let segments: [TranslationSegment]
    public let modelTranslation: String
    public let notes: String?
}

public struct RubricRow: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    public let maxPoints: Int
    public let criteria: String
    public let decisionRules: [String]
}

public struct FrqSubquestion: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    public let prompt: String
    public let points: Int
}

public struct FrqPrompt: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let type: String
    public let title: String
    public let passageId: String?
    public let latin: String?
    public let citation: String?
    public let minutes: Int
    public let subquestions: [FrqSubquestion]
    public let rubric: [RubricRow]
    public let sampleResponse: String
    public let scoringNotes: String
}

public struct FrqRubrics: Codable, Sendable, Hashable {
    public let shortEssay: [RubricRow]
    public let projectEssay: [RubricRow]
    public let shortAnswer: [RubricRow]
    public let checkpoint1: [RubricRow]
    public let checkpoint2: [RubricRow]
}

struct FrqFile: Codable, Sendable {
    let prompts: [FrqPrompt]
    let rubrics: FrqRubrics
}

public struct SightPassage: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let author: String
    public let work: String
    public let citation: String
    public let genre: String
    public let latin: String
    public let gloss: [GlossNote]
    public let summary: String
    public let questionIds: [String]
    public let machineSelected: Bool?
    public let source: String
}

struct SightFile: Codable, Sendable {
    let passages: [SightPassage]
    let questions: [Question]
    let authors: [String]
}

public struct ScannedSyllable: Codable, Sendable, Hashable {
    public let text: String
    public let quantity: String
    public let elides: Bool?
    public let startsWord: Bool?
    public let anceps: Bool?
    public let reason: String?
}

public struct Caesura: Codable, Sendable, Hashable {
    public let afterSyllable: Int
    public let type: String
}

public struct ScansionLine: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let passageId: String
    public let citation: String
    public let latin: String
    public let feet: [String]
    public let syllables: [ScannedSyllable]
    public let caesurae: [Caesura]
    public let notes: String
}

/* ------------------------------------------------------------------ */
/* Meta and manifest                                                   */
/* ------------------------------------------------------------------ */

public struct ContentMeta: Codable, Sendable, Hashable {
    /// Plain local date of the exam, "YYYY-MM-DD".
    public let examDate: String
    public let storeVersion: Int
    public let unitTitles: [String: String]
    public let questionTypeLabels: [String: String]
    public let skillLabels: [String: String]
    public let contextTopicLabels: [String: String]
    public let frqTypeLabels: [String: String]
}

public struct ContentManifest: Codable, Sendable, Hashable {
    public let schemaVersion: Int
    public let contentHash: String
    public let files: [String: String]
}
