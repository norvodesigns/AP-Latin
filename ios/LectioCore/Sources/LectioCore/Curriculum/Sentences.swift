import Foundation

/// Sentence builder — the web's `src/lib/sentences.ts`: sentences from the
/// course's translate exercises, built from tiles. Where Forms Forge knows
/// other forms of at least two of a sentence's words, the student builds the
/// Latin from its English, in any order, with those forms as decoys;
/// otherwise the English from the Latin, with near misses (sailor for
/// sailors) as decoys.
public struct SentenceBuilder: Sendable {
    public static let prefix = "sentences-"
    public static let length = 8

    struct Source: Sendable, Equatable {
        let lessonId: String
        let latin: String
        let english: String
    }

    let sources: [Source]
    /// Each form (folded) -> the other one-word forms of its tables.
    let otherFormsIndex: [String: [String]]
    /// Every English word the course's translations use.
    let englishWords: Set<String>

    public static func isSentences(_ id: String) -> Bool { id.hasPrefix(prefix) }

    public init(course: Course, paradigms: [Paradigm]) {
        sources = course.lessons.flatMap { place in
            place.lesson.steps.compactMap { step -> Source? in
                guard case .translate(let t) = step, let english = t.answers.first else { return nil }
                return Source(lessonId: place.lesson.id, latin: t.latin, english: english)
            }
        }
        var index: [String: [String]] = [:]
        for p in paradigms {
            let forms = p.rows.flatMap { $0.cells.flatMap(Forge.cellForms) }.filter { !$0.contains(" ") }
            for f in forms {
                let key = LessonCheck.foldLatin(f)
                var list = index[key] ?? []
                for g in forms where LessonCheck.foldLatin(g) != key && !list.contains(g) { list.append(g) }
                index[key] = list
            }
        }
        otherFormsIndex = index
        englishWords = Set(sources.flatMap { Self.words($0.english).map { $0.lowercased() } })
    }

    private static let punctuation = Set(".,;:!?“”\"‘’()—–")

    /// A sentence's words, without punctuation.
    public static func words(_ text: String) -> [String] {
        text.split(whereSeparator: \.isWhitespace)
            .map { String($0.filter { !punctuation.contains($0) }) }
            .filter { !$0.isEmpty }
    }

    /// Other forms Forms Forge knows for a word, capitalised like it.
    public func otherForms(_ word: String) -> [String] {
        let forms = otherFormsIndex[LessonCheck.foldLatin(word)] ?? []
        let cap = word.first.map { String($0) != String($0).lowercased() } ?? false
        return forms.map { cap ? $0.prefix(1).uppercased() + $0.dropFirst() : $0 }
    }

    static let plain: Set<String> = [
        "the", "a", "an", "is", "are", "was", "were", "am", "be", "been", "do", "does", "did", "have", "has", "had", "will", "would",
        "can", "could", "and", "or", "of", "to", "in", "on", "at", "by", "with", "from", "not", "but", "i", "you", "we", "he", "she",
        "it", "they", "me", "us", "him", "them", "his", "her", "its", "our", "your", "their", "this", "that", "these", "those",
    ]

    /// An English word one ending away (sailors / sailor, sees / see,
    /// city / cities), and only one the course's own English uses.
    public func nearMiss(_ word: String) -> String? {
        let w = word.lowercased()
        guard w == word, w.count >= 3, !Self.plain.contains(w), w.wholeMatch(of: /[a-z]+/) != nil else { return nil }
        let m: String?
        if w.contains(/[^aeiou]ies$/) { m = String(w.dropLast(3)) + "y" }
        else if w.contains(/(ches|shes|xes|oes)$/) { m = String(w.dropLast(2)) }
        else if w.contains(/(ss|us|is|os)$/) { m = nil }
        else if w.hasSuffix("s") { m = String(w.dropLast()) }
        else if w.contains(/[^aeiou]y$/) { m = String(w.dropLast()) + "ies" }
        else if w.contains(/(ch|sh|x|o)$/) { m = w + "es" }
        else { m = w + "s" }
        return m.flatMap { englishWords.contains($0) ? $0 : nil }
    }

    func latinTestable(_ s: Source) -> Bool {
        Self.words(s.latin).filter { !otherForms($0).isEmpty }.count >= 2
    }

    /// One sentence as a build step: the Latin if its endings can be tested, else the English.
    func step<G: RandomNumberGenerator>(_ s: Source, using rng: inout G) -> BuildStep {
        let latin = Self.words(s.latin)
        let english = Self.words(s.english)
        var taken = Set(latin.map(LessonCheck.foldLatin))
        var decoys: [String] = []
        for w in latin.shuffled(using: &rng) {
            let options = otherForms(w).filter { !taken.contains(LessonCheck.foldLatin($0)) }
            guard let d = options.randomElement(using: &rng) else { continue }
            taken.insert(LessonCheck.foldLatin(d))
            decoys.append(d)
            if decoys.count == 3 { break }
        }
        if decoys.count >= 2 {
            return BuildStep(prompt: "Build the Latin, in any order.", source: s.english, lang: .la, answer: latin, extra: decoys,
                             anyOrder: true, explain: "*\(s.latin)* Any order is good Latin, so long as the endings are right.")
        }
        var have = Set(english.map(LessonCheck.foldTile))
        var extra: [String] = []
        // Near misses first (sailor for sailors), then a word from elsewhere.
        for w in english.shuffled(using: &rng) {
            guard let m = nearMiss(w), !have.contains(LessonCheck.foldTile(m)) else { continue }
            have.insert(LessonCheck.foldTile(m))
            extra.append(m)
            if extra.count == 2 { break }
        }
        let pool = sources.filter { $0 != s }.flatMap { Self.words($0.english) }
            .filter { !Self.plain.contains(LessonCheck.foldTile($0)) }
            .shuffled(using: &rng)
        for w in pool {
            let k = LessonCheck.foldTile(w)
            guard !k.isEmpty, !have.contains(k) else { continue }
            have.insert(k)
            extra.append(w.lowercased())
            if extra.count == 3 { break }
        }
        return BuildStep(prompt: "Build the English.", source: s.latin, lang: .en, answer: english, extra: extra,
                         anyOrder: nil, explain: "*\(s.latin)* \(s.english)")
    }

    /// A round of sentences from finished lessons; with too few, the first
    /// lessons of the course fill it up. Half builds Latin where it can.
    public func lesson<G: RandomNumberGenerator>(done: [String: LessonProgress], length: Int = SentenceBuilder.length, using rng: inout G) -> LessonPlace {
        let short = sources.filter { Self.words($0.latin).count <= 8 }
        let known = short.filter { done[$0.lessonId] != nil }
        let pool = known.count >= length ? known : known + short.filter { done[$0.lessonId] == nil }.prefix(30)
        let mixed = pool.shuffled(using: &rng)
        let latin = Array(mixed.filter(latinTestable).prefix(length / 2))
        let chosen = Array((latin + mixed.filter { !latin.contains($0) }).prefix(length)).shuffled(using: &rng)
        let steps = chosen.map { LessonStep.build(step($0, using: &rng)) }
        let lesson = Lesson(
            id: "\(Self.prefix)\(UInt32.random(in: 0...UInt32.max, using: &rng))",
            title: "Sentence builder",
            summary: "Eight sentences from the course, built from tiles: the Latin from its English, or the English from its Latin.",
            minutes: 5,
            objectives: ["Put endings to work: the right form of each word", "Read a Latin sentence as a whole"],
            words: [],
            steps: steps
        )
        let unit = CurriculumUnit(id: "sentences", n: 0, title: "Sentence builder", blurb: "", lessons: [lesson])
        let level = CurriculumLevel(id: "sentences", numeral: "", title: "Sentence builder", subtitle: "", blurb: "", units: [unit])
        return LessonPlace(lesson: lesson, unit: unit, level: level, index: -1)
    }
}
