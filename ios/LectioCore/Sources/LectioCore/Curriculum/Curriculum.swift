import Foundation

/// The course: Latin from the first day to the AP syllabus — the web's
/// `src/data/curriculum`, exported as `curriculum.json`.
///
///     Level → Unit → Lesson → Steps
///
/// Text markup, as on the web: `*word*` is italic, `**word**` bold, and in a
/// table cell or an example `puell|ae` marks the ending after the bar.
public struct CurriculumLevel: Decodable, Sendable, Hashable, Identifiable {
    public let id: String
    /// "vocabulary" for Verba, the AP list by letter; absent for grammar.
    public var track: String? = nil
    public let numeral: String
    public let title: String
    public let subtitle: String
    public let blurb: String
    public let units: [CurriculumUnit]
}

public struct CurriculumUnit: Decodable, Sendable, Hashable, Identifiable {
    public let id: String
    public let n: Int
    public let title: String
    public let blurb: String
    public let lessons: [Lesson]
}

public struct Lesson: Decodable, Sendable, Hashable, Identifiable {
    public let id: String
    public let title: String
    public let summary: String
    public let minutes: Int
    public let objectives: [String]
    public let words: [LessonWord]
    public let steps: [LessonStep]
    /// A unit test: passed, it counts its whole unit as done (`Path`).
    public var test: Bool? = nil

    public var isTest: Bool { test ?? false }

    /// The AP-list words it teaches, which join the deck when it's finished.
    public var vocabIds: [String] { words.compactMap(\.vocabId) }
    public var exerciseCount: Int { steps.filter(\.isExercise).count }

    /// The exercises a review can use. A reading lesson's questions mostly
    /// point back at its passage, so only those carrying their own Latin
    /// come along: translations, and choices that quote their line. The
    /// web's `reviewExercises` (src/data/curriculum/reviewable.ts).
    public var reviewExercises: [LessonStep] {
        let reading = steps.contains { if case .read = $0 { true } else { false } }
        return steps.filter { step in
            guard step.isExercise else { return false }
            guard reading, case .choice(let choice) = step else { return true }
            return !(choice.latin ?? "").isEmpty
        }
    }
}

public struct LessonWord: Decodable, Sendable, Hashable {
    public let latin: String
    public let english: String
    public let vocabId: String?
    public let derivatives: [String]?
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

public enum LessonStep: Decodable, Sendable, Hashable {
    case teach(TeachStep)
    case read(ReadStep)
    case choice(ChoiceStep)
    case type(TypeStep)
    case translate(TranslateStep)
    case build(BuildStep)
    case match(MatchStep)
    /// A kind this build doesn't know (content from a newer website). Shown
    /// as nothing and skipped, never a decode failure.
    case unknown

    public var isExercise: Bool {
        switch self {
        case .choice, .type, .translate, .build, .match: true
        case .teach, .read, .unknown: false
        }
    }

    private enum CodingKeys: String, CodingKey { case kind }

    public init(from decoder: any Decoder) throws {
        let kind = try decoder.container(keyedBy: CodingKeys.self).decode(String.self, forKey: .kind)
        switch kind {
        case "teach": self = .teach(try TeachStep(from: decoder))
        case "read": self = .read(try ReadStep(from: decoder))
        case "choice": self = .choice(try ChoiceStep(from: decoder))
        case "type": self = .type(try TypeStep(from: decoder))
        case "translate": self = .translate(try TranslateStep(from: decoder))
        case "build": self = .build(try BuildStep(from: decoder))
        case "match": self = .match(try MatchStep(from: decoder))
        default: self = .unknown
        }
    }
}

public struct TeachStep: Decodable, Sendable, Hashable {
    public let title: String
    public let body: [String]
    public let table: ParadigmTable?
    public let examples: [Example]?
    public let tip: String?

    public struct Example: Decodable, Sendable, Hashable {
        public let la: String
        public let en: String
        public let note: String?
    }
}

public struct ParadigmTable: Decodable, Sendable, Hashable {
    public let caption: String?
    public let cols: [String]
    public let rows: [Row]

    public struct Row: Decodable, Sendable, Hashable {
        public let label: String
        public let cells: [String]
    }
}

public struct ReadStep: Decodable, Sendable, Hashable {
    public let title: String
    public let intro: String?
    public let lines: [Line]
    public let gloss: [Gloss]?

    public struct Line: Decodable, Sendable, Hashable {
        public let la: String
        public let en: String
    }

    public struct Gloss: Decodable, Sendable, Hashable {
        public let word: String
        public let meaning: String
    }
}

public struct ChoiceStep: Decodable, Sendable, Hashable {
    public let prompt: String
    public let latin: String?
    public let options: [String]
    public let answer: Int
    public let explain: String
}

public struct TypeStep: Decodable, Sendable, Hashable {
    public let prompt: String
    public let latin: String?
    public let answers: [String]
    public let explain: String
    public let hint: String?
}

public struct TranslateStep: Decodable, Sendable, Hashable {
    public let latin: String
    public let answers: [String]
    public let explain: String?
}

public struct BuildStep: Decodable, Sendable, Hashable {
    public enum Language: String, Decodable, Sendable { case la, en }

    public let prompt: String
    public let source: String
    public let lang: Language
    public let answer: [String]
    public let extra: [String]
    public let anyOrder: Bool?
    public let explain: String?

    public init(prompt: String = "", source: String = "", lang: Language, answer: [String], extra: [String] = [], anyOrder: Bool? = nil, explain: String? = nil) {
        self.prompt = prompt
        self.source = source
        self.lang = lang
        self.answer = answer
        self.extra = extra
        self.anyOrder = anyOrder
        self.explain = explain
    }
}

public struct MatchStep: Decodable, Sendable, Hashable {
    public let prompt: String
    /// [left, right]
    public let pairs: [[String]]
}

/* ------------------------------------------------------------------ */
/* Finding your way                                                    */
/* ------------------------------------------------------------------ */

/// A lesson with where it sits in the course.
public struct LessonPlace: Sendable, Hashable, Identifiable {
    public let lesson: Lesson
    public let unit: CurriculumUnit
    public let level: CurriculumLevel
    /// 0-based position in the whole course.
    public let index: Int
    public var id: String { lesson.id }
    /// 1-based position within its unit.
    public var number: Int { (unit.lessons.firstIndex { $0.id == lesson.id } ?? 0) + 1 }
}

public struct Course: Sendable {
    /// Every level, both tracks: the grammar levels in order, then Verba.
    public let levels: [CurriculumLevel]
    /// Every lesson of both tracks.
    public let lessons: [LessonPlace]
    /// The grammar lessons, in order.
    public let grammarLessons: [LessonPlace]
    /// The vocabulary lessons (Verba), in order, unit tests included.
    public let vocabLessons: [LessonPlace]
    /// The placement check, in course order.
    public let placement: [PlacementQuestion]
    /// The level check's vocabulary questions: two from each Verba unit.
    public let vocabPlacement: [PlacementQuestion]
    private let index: [String: Int]

    public init(levels: [CurriculumLevel], placement: [PlacementQuestion] = [], vocabPlacement: [PlacementQuestion] = []) {
        self.levels = levels
        self.placement = placement
        self.vocabPlacement = vocabPlacement
        var places: [LessonPlace] = []
        for level in levels {
            for unit in level.units {
                for lesson in unit.lessons {
                    places.append(LessonPlace(lesson: lesson, unit: unit, level: level, index: places.count))
                }
            }
        }
        lessons = places
        grammarLessons = places.filter { !$0.level.isVocabulary }
        vocabLessons = places.filter(\.level.isVocabulary)
        index = Dictionary(places.map { ($0.lesson.id, $0.index) }, uniquingKeysWith: { a, _ in a })
    }

    public func place(_ id: String) -> LessonPlace? { index[id].map { lessons[$0] } }

    /// The grammar levels, in order.
    public var grammarLevels: [CurriculumLevel] { levels.filter { !$0.isVocabulary } }
    /// Verba, the AP list by letter, when the content has it.
    public var vocabLevel: CurriculumLevel? { levels.first(where: \.isVocabulary) }

    /// Every grammar unit's id, in course order.
    public var unitIds: [String] { grammarLevels.flatMap { $0.units.map(\.id) } }

    /// The first lesson of a unit, by unit id.
    public func firstLesson(ofUnit unitId: String) -> LessonPlace? { lessons.first { $0.unit.id == unitId } }

    /// The first grammar lesson not yet finished, from the student's starting
    /// point if they chose one; nil when every grammar lesson written so far
    /// is done. Same as the web's `nextLesson`. The vocabulary track has its
    /// own (`nextWords`).
    public func next(done: Set<String>, startingAt start: String? = nil) -> LessonPlace? {
        // A unit test is never "next": it's there for whoever wants to skip.
        let open = { (p: LessonPlace) in !done.contains(p.lesson.id) && !p.lesson.isTest }
        let from = start.flatMap { id in grammarLessons.firstIndex { $0.lesson.id == id } } ?? 0
        return grammarLessons[from...].first(where: open) ?? grammarLessons.first(where: open)
    }

    /// The lesson after this one in its own track, unit tests aside.
    public func after(_ id: String) -> LessonPlace? {
        guard let place = place(id) else { return nil }
        let track = place.level.isVocabulary ? vocabLessons : grammarLessons
        guard let i = track.firstIndex(where: { $0.lesson.id == id }) else { return nil }
        return track[(i + 1)...].first { !$0.lesson.isTest }
    }

    /// A unit's lessons as `Path` reads them.
    public func pathLessons(ofUnit unitId: String) -> [PathLesson] {
        lessons.filter { $0.unit.id == unitId }.map { PathLesson(id: $0.lesson.id, unitId: unitId, vocabIds: $0.lesson.vocabIds, test: $0.lesson.isTest) }
    }

    /// The vocabulary track as `Path` reads it.
    public var vocabPath: [PathLesson] {
        vocabLessons.map { PathLesson(id: $0.lesson.id, unitId: $0.unit.id, vocabIds: $0.lesson.vocabIds, test: $0.lesson.isTest) }
    }

    /// The vocabulary lesson to do next (the web's `nextWords`).
    public func nextWords(done: Set<String>, vocab: [String: VocabCard], knownUnits: [String] = []) -> LessonPlace? {
        let doneMap = Dictionary(uniqueKeysWithValues: done.map { ($0, true) })
        return Path.nextWords(vocabPath, done: doneMap, intervals: vocab.mapValues(\.interval), knownUnits: knownUnits).flatMap { place($0.id) }
    }

    /// Share of a unit's lessons done. A unit test is a way past the
    /// lessons, not one of them.
    public static func unitProgress(_ unit: CurriculumUnit, done: Set<String>) -> Double {
        let lessons = unit.lessons.filter { !$0.isTest }
        guard !lessons.isEmpty else { return 0 }
        return Double(lessons.filter { done.contains($0.id) }.count) / Double(lessons.count)
    }
}

extension CurriculumLevel {
    /// Verba, the AP list by letter: a track of its own beside the grammar.
    public var isVocabulary: Bool { track == "vocabulary" }
}

struct CurriculumFile: Decodable {
    let levels: [CurriculumLevel]
    let placement: [PlacementQuestion]?
    let vocabPlacement: [PlacementQuestion]?
}
