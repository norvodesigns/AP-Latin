import Foundation

/// English words from Latin ones — the web's `src/lib/derivatives.ts`: the
/// derivatives the course lists with its words, shown on vocabulary cards
/// and drilled in a ten-question round played in the lesson player.
public struct RootWord: Sendable, Hashable {
    /// The dictionary form's first word, e.g. "pugnō".
    public let head: String
    public let english: String
    public let derivatives: [String]
    public let vocabId: String?
    public let lessonId: String
}

extension Course {
    public static let derivativesPrefix = "roots-"
    public static let derivativesLength = 10

    public static func isDerivatives(_ id: String) -> Bool { id.hasPrefix(derivativesPrefix) }

    /// Letters only, no macrons, lower case: for telling look-alike roots apart.
    static func fold(_ s: String) -> String {
        String(s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased().unicodeScalars
            .filter { ("a"..."z").contains($0) }.map(Character.init))
    }

    /// Every course word with English derivatives, first appearance only.
    public var rootWords: [RootWord] {
        var seen = Set<String>()
        var out: [RootWord] = []
        for place in lessons {
            for w in place.lesson.words {
                guard let derivatives = w.derivatives, !derivatives.isEmpty else { continue }
                let head = String(w.latin.split(separator: ",", maxSplits: 1, omittingEmptySubsequences: false).first ?? "")
                    .replacing(/\s*\(.*\)/, with: "")
                    .trimmingCharacters(in: .whitespaces)
                guard seen.insert(Self.fold(head)).inserted else { continue }
                out.append(RootWord(head: head, english: w.english, derivatives: derivatives, vocabId: w.vocabId, lessonId: place.lesson.id))
            }
        }
        return out
    }

    /// AP vocabulary id -> its English derivatives, for the flashcards.
    public var derivativesByVocab: [String: [String]] {
        Dictionary(rootWords.compactMap { w in w.vocabId.map { ($0, w.derivatives) } }, uniquingKeysWith: { a, _ in a })
    }

    /// Two words too alike to set against each other (regō, rēx).
    static func alike(_ a: String, _ b: String) -> Bool { fold(a).prefix(3) == fold(b).prefix(3) }

    /// Whether an English word could also be traced to this Latin word: it
    /// holds the root's stem or the start of one of its derivatives.
    static func traces(_ english: String, _ w: RootWord) -> Bool {
        let e = fold(english)
        return ([w.head] + w.derivatives).contains { x in
            let stem = String(fold(x).prefix(4))
            return stem.count == 4 && e.contains(stem)
        }
    }

    /// A round of derivatives questions, from the words of finished lessons
    /// when there are enough of them, otherwise from the whole course.
    public func derivativesLesson<G: RandomNumberGenerator>(
        done: [String: LessonProgress],
        length: Int = Course.derivativesLength,
        using rng: inout G
    ) -> LessonPlace {
        let all = rootWords
        let known = all.filter { done[$0.lessonId] != nil }
        let pool = known.count >= 8 ? known : all
        let words = Array(pool.shuffled(using: &rng).prefix(length))
        var steps: [LessonStep] = []
        for (i, w) in words.enumerated() {
            let derivative = w.derivatives.randomElement(using: &rng) ?? w.derivatives[0]
            let others = w.derivatives.filter { $0 != derivative }
            let capitalized = derivative.prefix(1).uppercased() + derivative.dropFirst()
            let explain = "*\(capitalized)* comes from *\(w.head)*, “\(w.english)”."
                + (others.isEmpty ? "" : " So \(others.count == 1 ? "does" : "do") \(others.joined(separator: " and ")).")
            let rest = all.filter { $0 != w && !Self.alike($0.head, w.head) }.shuffled(using: &rng)
            var wrong: [String] = []
            let prompt: String
            let right: String
            if i % 2 == 0 {
                prompt = "Which English word comes from *\(w.head)*, “\(w.english)”?"
                right = derivative
                for o in rest {
                    let d = o.derivatives.randomElement(using: &rng) ?? o.derivatives[0]
                    if Self.alike(d, derivative) || Self.alike(d, w.head) || Self.traces(d, w) || wrong.contains(where: { Self.alike($0, d) }) { continue }
                    wrong.append(d)
                    if wrong.count == 3 { break }
                }
            } else {
                prompt = "*\(capitalized)* comes from which Latin word?"
                right = w.head
                for o in rest {
                    if Self.alike(o.head, derivative) || Self.traces(derivative, o) || wrong.contains(where: { Self.alike($0, o.head) }) { continue }
                    wrong.append(o.head)
                    if wrong.count == 3 { break }
                }
            }
            let at = Int.random(in: 0...wrong.count, using: &rng)
            var options = wrong
            options.insert(right, at: at)
            steps.append(.choice(ChoiceStep(prompt: prompt, latin: nil, options: options, answer: at, explain: explain)))
        }
        let lesson = Lesson(
            id: "\(Self.derivativesPrefix)\(UInt32.random(in: 0...UInt32.max, using: &rng))",
            title: "Derivatives",
            summary: "Ten questions on the English words that come from Latin ones.",
            minutes: 4,
            objectives: ["See the Latin inside English words", "Use English you know to remember Latin, and the other way round"],
            words: [],
            steps: steps
        )
        let unit = CurriculumUnit(id: "roots", n: 0, title: "Derivatives", blurb: "", lessons: [lesson])
        let level = CurriculumLevel(id: "roots", numeral: "", title: "Derivatives", subtitle: "", blurb: "", units: [unit])
        return LessonPlace(lesson: lesson, unit: unit, level: level, index: -1)
    }
}
