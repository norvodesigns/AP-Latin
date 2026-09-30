import Foundation

/// A declension or conjugation table for Forms Forge: the web's
/// `src/data/forms`, exported as `forms.json`.
///
/// Cells use the course's markup: `puell|ae` marks the ending, and a cell
/// may hold alternatives, `eī / iī`.
public struct Paradigm: Decodable, Sendable, Hashable, Identifiable {
    public enum Kind: String, Sendable, CaseIterable {
        case noun, adjective, pronoun, verb

        public var label: String {
            switch self {
            case .noun: "Nouns"
            case .adjective: "Adjectives"
            case .pronoun: "Pronouns"
            case .verb: "Verbs"
            }
        }
    }

    public let id: String
    /// Kept as text so a kind added on the website never fails the decode.
    public let kindName: String
    public let lemma: String
    public let gloss: String
    public let title: String
    /// The course lesson that teaches this table.
    public let lesson: String?
    public let cols: [String]
    public let rows: [ParadigmTable.Row]
    /// What each cell is, in words: `names[row][col]` = "genitive plural".
    public let names: [[String]]

    public var kind: Kind? { Kind(rawValue: kindName) }
    /// "rēx" from "rēx, rēgis, m.".
    public var headword: String { lemma.split(separator: ",").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? lemma }
    /// As a course table, for the same chart view the lessons use.
    public var table: ParadigmTable { ParadigmTable(caption: nil, cols: cols, rows: rows) }
    public var cellCount: Int { rows.count * cols.count }

    private enum CodingKeys: String, CodingKey { case id, kind, lemma, gloss, title, lesson, cols, rows, names }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        kindName = try c.decode(String.self, forKey: .kind)
        lemma = try c.decode(String.self, forKey: .lemma)
        gloss = try c.decode(String.self, forKey: .gloss)
        title = try c.decode(String.self, forKey: .title)
        lesson = try c.decodeIfPresent(String.self, forKey: .lesson)
        cols = try c.decode([String].self, forKey: .cols)
        rows = try c.decode([ParadigmTable.Row].self, forKey: .rows)
        names = try c.decode([[String]].self, forKey: .names)
    }
}

struct FormsFile: Decodable {
    let paradigms: [Paradigm]
}

/// Forms Forge's three kinds of question, made from the tables. The same
/// rules as the web's `src/lib/forge.ts`.
public enum Forge {
    public enum Mode: String, Sendable, CaseIterable, Identifiable {
        case make, name, chart
        public var id: String { rawValue }
    }

    public struct Cell: Hashable, Sendable {
        public let row: Int
        public let col: Int
        public init(row: Int, col: Int) { self.row = row; self.col = col }
    }

    public enum Question: Sendable, Hashable {
        /// Type the form: "the genitive plural of rēx".
        case make(paradigm: Paradigm, cell: Cell, asked: String, answers: [String])
        /// Pick what the form is; `answer` indexes `options`.
        case name(paradigm: Paradigm, cell: Cell, form: String, options: [String], answer: Int)
        /// Fill the blanks in the table.
        case chart(paradigm: Paradigm, blanks: [Cell])

        public var paradigm: Paradigm {
            switch self {
            case .make(let p, _, _, _), .name(let p, _, _, _, _), .chart(let p, _): p
            }
        }
    }

    /// The forms a cell accepts, without the ending marker.
    public static func cellForms(_ cell: String) -> [String] {
        cell.components(separatedBy: " / ")
            .map { $0.replacingOccurrences(of: "|", with: "").trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    /// The tables in play: some kinds, and optionally only lessons already done.
    public static func scope(_ all: [Paradigm], kinds: Set<Paradigm.Kind>, learned: Set<String>?) -> [Paradigm] {
        all.filter { p in
            guard let kind = p.kind, kinds.contains(kind) else { return false }
            guard let learned, let lesson = p.lesson else { return true }
            return learned.contains(lesson)
        }
    }

    static func cells(_ p: Paradigm) -> [Cell] {
        p.rows.indices.flatMap { r in p.rows[r].cells.indices.map { Cell(row: r, col: $0) } }
    }

    public static func make<G: RandomNumberGenerator>(_ p: Paradigm, using rng: inout G) -> Question {
        let cell = cells(p).randomElement(using: &rng)!
        return .make(paradigm: p, cell: cell, asked: p.names[cell.row][cell.col], answers: cellForms(p.rows[cell.row].cells[cell.col]))
    }

    public static func name<G: RandomNumberGenerator>(_ p: Paradigm, using rng: inout G) -> Question {
        let all = cells(p)
        let cell = all.randomElement(using: &rng)!
        let shown = p.rows[cell.row].cells[cell.col].components(separatedBy: " / ")[0].trimmingCharacters(in: .whitespaces)
        let plain = shown.replacingOccurrences(of: "|", with: "")
        // Every name this exact form could have, so none is offered as wrong.
        let fits = Set(all.filter { cellForms(p.rows[$0.row].cells[$0.col]).contains(plain) }.map { p.names[$0.row][$0.col] })
        var seen = Set<String>()
        let others = p.names.flatMap { $0 }.filter { !fits.contains($0) && seen.insert($0).inserted }
        let right = p.names[cell.row][cell.col]
        let options = ([right] + Array(others.shuffled(using: &rng).prefix(3))).shuffled(using: &rng)
        return .name(paradigm: p, cell: cell, form: shown, options: options, answer: options.firstIndex(of: right) ?? 0)
    }

    public static func chart<G: RandomNumberGenerator>(_ p: Paradigm, blanks: Int = 5, using rng: inout G) -> Question {
        let chosen = cells(p).shuffled(using: &rng).prefix(min(blanks, p.cellCount))
            .sorted { ($0.row, $0.col) < ($1.row, $1.col) }
        return .chart(paradigm: p, blanks: chosen)
    }

    /// A round of questions, never the same table twice running when there's a choice.
    public static func round<G: RandomNumberGenerator>(_ scope: [Paradigm], mode: Mode, length: Int, using rng: inout G) -> [Question] {
        guard !scope.isEmpty else { return [] }
        var out: [Question] = []
        var last: String?
        for _ in 0..<length {
            let pool = scope.count > 1 ? scope.filter { $0.id != last } : scope
            let p = pool.randomElement(using: &rng)!
            last = p.id
            switch mode {
            case .make: out.append(make(p, using: &rng))
            case .name: out.append(name(p, using: &rng))
            case .chart: out.append(chart(p, using: &rng))
            }
        }
        return out
    }
}
