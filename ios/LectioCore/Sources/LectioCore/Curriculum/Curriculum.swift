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

    /// The AP-list words it teaches, which join the deck when it's finished.
    public var vocabIds: [String] { words.compactMap(\.vocabId) }
    public var exerciseCount: Int { steps.filter(\.isExercise).count }
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
    public let levels: [CurriculumLevel]
    public let lessons: [LessonPlace]
    private let index: [String: Int]

    public init(levels: [CurriculumLevel]) {
        self.levels = levels
        var places: [LessonPlace] = []
        for level in levels {
            for unit in level.units {
                for lesson in unit.lessons {
                    places.append(LessonPlace(lesson: lesson, unit: unit, level: level, index: places.count))
                }
            }
        }
        lessons = places
        index = Dictionary(places.map { ($0.lesson.id, $0.index) }, uniquingKeysWith: { a, _ in a })
    }

    public func place(_ id: String) -> LessonPlace? { index[id].map { lessons[$0] } }

    /// The first lesson not yet finished, from the student's starting point
    /// if they chose one; nil when every lesson written so far is done. Same
    /// as the web's `nextLesson`.
    public func next(done: Set<String>, startingAt start: String? = nil) -> LessonPlace? {
        let from = start.flatMap { index[$0] } ?? 0
        return lessons[from...].first { !done.contains($0.lesson.id) } ?? lessons.first { !done.contains($0.lesson.id) }
    }

    public func after(_ id: String) -> LessonPlace? {
        guard let i = index[id], i + 1 < lessons.count else { return nil }
        return lessons[i + 1]
    }

    public static func unitProgress(_ unit: CurriculumUnit, done: Set<String>) -> Double {
        guard !unit.lessons.isEmpty else { return 0 }
        return Double(unit.lessons.filter { done.contains($0.id) }.count) / Double(unit.lessons.count)
    }
}

struct CurriculumFile: Decodable {
    let levels: [CurriculumLevel]
}
