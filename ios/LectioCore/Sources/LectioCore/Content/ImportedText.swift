import Foundation

// A text the reader imported into the Reading Room (typed, pasted or read off
// a photo) — the web's `ImportedText` (src/lib/imports.ts), kept in the
// progress document under `importedTexts` and synced like everything else.
//
// The website's /api/ai/gloss-text route glossed it when it came in: Lectio's
// own dictionary first, then the AI for each word the dictionary has no exact
// entry for. What it found is stored with the text, keyed by the word exactly
// as `tokenize()` splits it, so this app (which has no dictionary engine of
// its own) shows the same glosses, offline.

/// The AI's gloss for a word the dictionary lacks, written for its place in
/// this text.
public struct AiGloss: Codable, Sendable, Hashable {
    /// The dictionary entry: "Cicero, Ciceronis m.", "fallo, fallere, fefelli, falsum".
    public let lemma: String
    public let pos: String
    /// A short English meaning that fits this text.
    public let meaning: String
    /// What this form is: "abl. sg. fem.", "3rd pl. perf. act. ind.".
    public let form: String?

    public init(lemma: String, pos: String, meaning: String, form: String? = nil) {
        self.lemma = lemma
        self.pos = pos
        self.meaning = meaning
        self.form = form
    }
}

/// Everything known about one word of an imported text.
public struct ImportedWord: Codable, Sendable, Hashable {
    /// Lectio's dictionary, best first: vocabulary ids, exact or stem guesses.
    public var g: [Gloss]?
    /// The AI's gloss, for a word with no exact dictionary match.
    public var ai: AiGloss?

    public init(g: [Gloss]? = nil, ai: AiGloss? = nil) {
        self.g = g
        self.ai = ai
    }

    /// A gloss the reader can trust at a glance: an exact dictionary match,
    /// or the AI's.
    public var isGlossed: Bool { ai != nil || (g ?? []).contains { $0.isExact } }
}

public struct ImportedLine: Codable, Sendable, Hashable {
    public let n: Int
    public let latin: String

    public init(n: Int, latin: String) {
        self.n = n
        self.latin = latin
    }
}

public struct ImportedText: Codable, Sendable, Hashable, Identifiable {
    /// `mine-` and a random id. Its highlights, notes and flags are kept under
    /// this id in `passages`, as a syllabus passage's are.
    public let id: String
    public var title: String
    /// Who wrote it, if the reader said; may be empty.
    public var author: String
    /// Where it is from; may be empty.
    public var source: String
    /// "prose" or "poetry".
    public let genre: String
    /// "lines": a line of the text per row. "sentences": prose, a sentence per row.
    public let layout: String
    public let lines: [ImportedLine]
    /// Word (as `tokenize()` splits it) -> its gloss.
    public var words: [String: ImportedWord]
    public let createdAt: String
    /// The last change; on a merge, the later copy wins.
    public var at: String
    /// Deleted on some device: a stub with no text, so no copy brings it back.
    public var deleted: Bool?

    public init(id: String, title: String, author: String, source: String, genre: String, layout: String,
                lines: [ImportedLine], words: [String: ImportedWord], createdAt: String, at: String,
                deleted: Bool? = nil) {
        self.id = id
        self.title = title
        self.author = author
        self.source = source
        self.genre = genre
        self.layout = layout
        self.lines = lines
        self.words = words
        self.createdAt = createdAt
        self.at = at
        self.deleted = deleted
    }

    public static let idPrefix = "mine-"
    public static func isImported(_ id: String) -> Bool { id.hasPrefix(idPrefix) }

    public var isDeleted: Bool { deleted ?? false }

    /// The distinct words still without a gloss, in the order they appear.
    public var unglossedWords: [String] {
        var seen = Set<String>()
        var out: [String] = []
        for line in lines {
            for token in LatinTokenizer.tokenize(line.latin) where token.isWord && seen.insert(token.text).inserted {
                if !(words[token.text]?.isGlossed ?? false) { out.append(token.text) }
            }
        }
        return out
    }

    /// Words in the text, counting repeats, and how many have a gloss.
    public var glossCoverage: (glossed: Int, total: Int) {
        var glossed = 0
        var total = 0
        for line in lines {
            for token in LatinTokenizer.tokenize(line.latin) where token.isWord {
                total += 1
                if words[token.text]?.isGlossed ?? false { glossed += 1 }
            }
        }
        return (glossed, total)
    }
}

/// The web's `tokenize()` (src/lib/tokenize.ts): runs of letters, and runs of
/// everything else between them. Highlights and marks on an imported text are
/// anchored to these token indices on every platform, so this must split
/// exactly as the TypeScript does: the same letter ranges, by UTF-16 code
/// unit, which for these ranges is the same as by Unicode scalar.
public enum LatinTokenizer {
    public static func isLetter(_ s: Unicode.Scalar) -> Bool {
        switch s.value {
        case 0x41...0x5A, 0x61...0x7A, 0xC0...0xFF, 0x100...0x17F: true
        default: false
        }
    }

    public static func tokenize(_ line: String) -> [(text: String, isWord: Bool)] {
        var out: [(text: String, isWord: Bool)] = []
        var current = String.UnicodeScalarView()
        var currentIsWord = false
        for scalar in line.unicodeScalars {
            let word = isLetter(scalar)
            if !current.isEmpty && word != currentIsWord {
                out.append((String(current), currentIsWord))
                current = String.UnicodeScalarView()
            }
            currentIsWord = word
            current.append(scalar)
        }
        if !current.isEmpty { out.append((String(current), currentIsWord)) }
        return out
    }
}

public extension Passage {
    /// An imported text as a passage, so the Reader opens it like any other:
    /// tokens split as the web splits them, each word carrying the dictionary
    /// matches stored with the text.
    init(imported t: ImportedText) {
        let lines = t.lines.map { line in
            PassageLine(
                n: line.n,
                latin: line.latin,
                tokens: LatinTokenizer.tokenize(line.latin).map { tok in
                    Token(t: tok.text, w: tok.isWord ? 1 : nil, g: tok.isWord ? t.words[tok.text]?.g : nil)
                },
                english: nil
            )
        }
        let wordCount = lines.reduce(0) { $0 + $1.tokens.filter(\.isWord).count }
        let author = t.author.trimmingCharacters(in: .whitespaces)
        let source = t.source.trimmingCharacters(in: .whitespaces)
        var vocabIds: [String] = []
        var seen = Set<String>()
        for word in t.words.values {
            if let top = word.g?.first, top.isExact, !top.id.hasPrefix("sup-"), seen.insert(top.id).inserted { vocabIds.append(top.id) }
        }
        self.init(
            id: t.id, author: "other", genre: t.genre, work: "Your texts", book: 0, letter: nil, salutation: nil,
            authorName: author.isEmpty ? nil : author, project: nil, citation: source.isEmpty ? t.title : source,
            title: t.title, required: false, cedReading: nil, unit: "1",
            macronized: t.lines.contains { $0.latin.unicodeScalars.contains { "āēīōūȳĀĒĪŌŪȲ".unicodeScalars.contains($0) } },
            wordCount: wordCount, themes: [], summary: "", context: "", lines: lines, vocabIds: vocabIds.sorted(),
            importedLayout: t.layout
        )
    }

    /// A text the reader imported, rather than one of the app's own.
    var isImported: Bool { importedLayout != nil }
}

public extension ProgressMerge {
    /// Two devices' imported texts: every text on either side, and for one on
    /// both, the copy changed last (a deletion included, which is why a
    /// deleted text stays as a stub). The web's `mergeImportedTexts`.
    static func mergeImportedTexts(_ a: JSONObject, _ b: JSONObject) -> JSONObject {
        var out = a
        for (id, tb) in b {
            let atB = tb["at"]?.stringValue ?? ""
            if let ta = out[id] {
                if atB > (ta["at"]?.stringValue ?? "") { out[id] = tb }
            } else {
                out[id] = tb
            }
        }
        return out
    }
}
