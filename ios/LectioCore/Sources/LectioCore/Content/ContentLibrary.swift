import Foundation

/// Everything the app teaches, decoded from the exported JSON bundle, with
/// the lookups the screens need built once up front.
///
/// Immutable and `Sendable`: load it once off the main thread at launch and
/// hand the same instance to every screen.
public struct ContentLibrary: Sendable {
    /// The newest bundle layout this build understands. A bundle with a
    /// higher `schemaVersion` (e.g. downloaded content from a newer web
    /// deploy) is refused rather than half-decoded.
    public static let supportedSchemaVersion = 1

    public let manifest: ContentManifest
    public let meta: ContentMeta
    public let passages: [Passage]
    public let coreVocabulary: [VocabEntry]
    public let supplementaryVocabulary: [VocabEntry]
    public let questions: [Question]
    public let questionSets: [QuestionSet]
    public let sightQuestions: [Question]
    public let grammarTopics: [GrammarTopic]
    public let deviceCards: [DeviceCard]
    public let contextCards: [ContextCard]
    public let frqPrompts: [FrqPrompt]
    public let frqRubrics: FrqRubrics
    public let sightPassages: [SightPassage]
    public let sightAuthors: [String]
    public let translationDrills: [TranslationDrill]
    public let scansionLines: [ScansionLine]

    private let passageIndex: [String: Int]
    private let vocabIndex: [String: VocabEntry]
    private let questionIndex: [String: Question]

    public enum LoadError: Error, CustomStringConvertible {
        case unsupportedSchema(Int)
        case file(String, any Error)

        public var description: String {
            switch self {
            case .unsupportedSchema(let v): "Content schema \(v) is newer than this app supports (\(ContentLibrary.supportedSchemaVersion))."
            case .file(let name, let error): "Could not load \(name): \(error)"
            }
        }
    }

    /// Loads the bundle from a directory holding the files
    /// scripts/export-content.ts writes.
    public init(directory: URL) throws {
        func load<T: Decodable>(_ name: String, as: T.Type = T.self) throws -> T {
            do {
                let data = try Data(contentsOf: directory.appendingPathComponent(name))
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                throw LoadError.file(name, error)
            }
        }

        manifest = try load("manifest.json")
        guard manifest.schemaVersion <= Self.supportedSchemaVersion else {
            throw LoadError.unsupportedSchema(manifest.schemaVersion)
        }
        meta = try load("meta.json")
        passages = try load("passages.json")
        let vocab: VocabularyFile = try load("vocabulary.json")
        coreVocabulary = vocab.core
        supplementaryVocabulary = vocab.supplementary
        let q: QuestionsFile = try load("questions.json")
        questions = q.questions
        questionSets = q.sets
        grammarTopics = try load("grammar.json")
        deviceCards = try load("devices.json")
        contextCards = try load("context.json")
        let frq: FrqFile = try load("frq.json")
        frqPrompts = frq.prompts
        frqRubrics = frq.rubrics
        let sight: SightFile = try load("sight.json")
        sightPassages = sight.passages
        sightQuestions = sight.questions
        sightAuthors = sight.authors
        translationDrills = try load("translation.json")
        scansionLines = try load("scansion.json")

        passageIndex = Dictionary(passages.enumerated().map { ($1.id, $0) }, uniquingKeysWith: { a, _ in a })
        // Core entries win over a supplementary entry that happens to share an id.
        vocabIndex = Dictionary((supplementaryVocabulary + coreVocabulary).map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
        questionIndex = Dictionary((questions + sightQuestions).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    }

    public func passage(_ id: String) -> Passage? { passageIndex[id].map { passages[$0] } }
    public func vocab(_ id: String) -> VocabEntry? { vocabIndex[id] }
    public func question(_ id: String) -> Question? { questionIndex[id] }

    public var requiredPassages: [Passage] { passages.filter(\.required) }

    /// Passages grouped by CED unit, in unit order.
    public var passagesByUnit: [UnitGroup] {
        Dictionary(grouping: passages, by: \.unit)
            .sorted { $0.key.localizedStandardCompare($1.key) == .orderedAscending }
            .map { UnitGroup(unit: $0.key, title: meta.unitTitles[$0.key] ?? "Unit \($0.key)", passages: $0.value) }
    }
}

public struct UnitGroup: Sendable, Hashable, Identifiable {
    public let unit: String
    public let title: String
    public let passages: [Passage]
    public var id: String { unit }
}
