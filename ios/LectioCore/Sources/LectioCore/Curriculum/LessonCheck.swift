import Foundation

/// Checking an answer to a lesson exercise — a port of the web's
/// `src/lib/lessonCheck.ts`, held to it by `Fixtures/lessonCheck.json`, so
/// an answer is right or wrong the same way on both.
public enum LessonCheck {
    /// Latin as typed, folded for comparison: ligatures spelled out, no
    /// macrons or other accents, lower case, u for v and i for j, no
    /// punctuation, single spaces.
    public static func foldLatin(_ s: String) -> String {
        var spelled = ""
        for ch in s {
            switch ch {
            case "æ", "Æ": spelled += "ae"
            case "œ", "Œ": spelled += "oe"
            default: spelled.append(ch)
            }
        }
        var stripped = String.UnicodeScalarView()
        for u in spelled.decomposedStringWithCanonicalMapping.unicodeScalars where !(0x300...0x36F).contains(u.value) {
            stripped.append(u)
        }
        var out = ""
        for ch in String(stripped).lowercased() {
            switch ch {
            case "v": out.append("u")
            case "j": out.append("i")
            case "a"..."z": out.append(ch)
            default: out.append(" ")
            }
        }
        return collapse(out)
    }

    private static let articles: Set<String> = ["a", "an", "the"]

    /// English as typed, folded for comparison: lower case, contractions
    /// opened out, no punctuation, no articles.
    public static func foldEnglish(_ s: String) -> String {
        let lowered = s.lowercased().replacingOccurrences(of: "’", with: "'").replacingOccurrences(of: "‘", with: "'")
        // Words, keeping apostrophes, so contractions can be opened out whole.
        var words: [String] = []
        var current = ""
        for ch in lowered {
            if isAsciiAlnum(ch) || ch == "'" {
                current.append(ch)
            } else {
                if !current.isEmpty { words.append(current) }
                current = ""
            }
        }
        if !current.isEmpty { words.append(current) }

        var opened: [String] = []
        for word in words {
            var w = word
            if w == "can't" { w = "cannot" } else if w == "won't" { w = "will not" }
            else if w.hasSuffix("n't") { w = String(w.dropLast(3)) + " not" }
            else if w.hasSuffix("'re") { w = String(w.dropLast(3)) + " are" }
            else if w.hasSuffix("'m") { w = String(w.dropLast(2)) + " am" }
            opened.append(w)
        }
        // Anything left that isn't a letter or digit — a possessive's
        // apostrophe — splits the word, as on the web.
        var out: [String] = []
        for piece in opened.joined(separator: " ").map({ isAsciiAlnum($0) ? $0 : " " }).split(separator: " ") {
            let w = String(piece)
            if !articles.contains(w) { out.append(w) }
        }
        return out.joined(separator: " ")
    }

    public static func checkTyped(_ answer: String, accepted: [String]) -> Bool {
        let a = foldLatin(answer)
        return !a.isEmpty && accepted.contains { foldLatin($0) == a }
    }

    public static func checkTranslation(_ answer: String, accepted: [String]) -> Bool {
        let a = foldEnglish(answer)
        return !a.isEmpty && accepted.contains { foldEnglish($0) == a }
    }

    /// The tiles placed, in order, against a build step.
    public static func checkBuild(_ placed: [String], step: BuildStep) -> Bool {
        let isLatin = step.lang == BuildStep.Language.la
        let got = placed.map { isLatin ? foldLatin($0) : foldTile($0) }
        let want = step.answer.map { isLatin ? foldLatin($0) : foldTile($0) }
        guard got.count == want.count else { return false }
        if step.anyOrder == true { return got.sorted() == want.sorted() }
        return got == want
    }

    /// Exercises right the first time out of all of them, to two places;
    /// 1 for a lesson with no exercises.
    public static func score(right: Int, of exercises: Int) -> Double {
        guard exercises > 0 else { return 1 }
        return (Double(right) / Double(exercises) * 100).rounded() / 100
    }

    /// An English tile: lower case, letters, digits and apostrophes only.
    static func foldTile(_ s: String) -> String {
        var out = ""
        for ch in s.lowercased() where isAsciiAlnum(ch) || ch == "'" { out.append(ch) }
        return out
    }

    private static func isAsciiAlnum(_ ch: Character) -> Bool {
        ("a"..."z").contains(ch) || ("0"..."9").contains(ch)
    }

    private static func collapse(_ s: String) -> String {
        s.split(whereSeparator: { $0 == " " }).joined(separator: " ")
    }
}
