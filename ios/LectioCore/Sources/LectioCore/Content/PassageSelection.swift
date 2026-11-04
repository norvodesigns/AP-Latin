import Foundation

/*
 * What the reader has selected on a passage, and how a selection becomes the
 * one-line anchors highlights and marks are stored as — the web's
 * src/lib/readerSelection.ts.
 *
 * A selection runs from one word to another anywhere in the passage, across
 * line breaks if need be (a Vergilian phrase very often runs on). It is
 * stored as one piece per line, the pieces sharing a `group`, each an
 * ordinary line number and token range.
 */

/// A word in a passage: its line number and token index on that line.
public struct TokenPoint: Equatable, Hashable, Sendable {
    public let lineN: Int
    public let tok: Int

    public init(lineN: Int, tok: Int) {
        self.lineN = lineN
        self.tok = tok
    }
}

/// From one word to another, inclusive; `start` is never after `end` in
/// reading order (build one with `Passage.range(from:to:)`).
public struct TokenRange: Equatable, Hashable, Sendable {
    public let start: TokenPoint
    public let end: TokenPoint

    public init(start: TokenPoint, end: TokenPoint) {
        self.start = start
        self.end = end
    }

    /// One word.
    public init(_ point: TokenPoint) {
        self.init(start: point, end: point)
    }

    public var isSingleWord: Bool { start == end }
}

/// One line's share of a selection: what gets stored.
public struct RangePiece: Equatable, Hashable, Sendable {
    public let lineN: Int
    public let startTok: Int
    public let endTok: Int
    public let text: String
}

/// Anything stored against a token range on one line.
public protocol LineAnchored {
    var lineN: Int { get }
    var startTok: Int { get }
    var endTok: Int { get }
    var group: String? { get }
}

extension Annotation: LineAnchored {}
extension SyntaxMark: LineAnchored {}

extension Passage {
    func lineIndex(of n: Int) -> Int? { lines.firstIndex { $0.n == n } }

    /// Is `a` before `b` in reading order?
    public func isBefore(_ a: TokenPoint, _ b: TokenPoint) -> Bool {
        let ia = lineIndex(of: a.lineN) ?? 0
        let ib = lineIndex(of: b.lineN) ?? 0
        return ia < ib || (ia == ib && a.tok < b.tok)
    }

    /// The range between two words, whichever order they were picked in.
    public func range(from a: TokenPoint, to b: TokenPoint) -> TokenRange {
        isBefore(b, a) ? TokenRange(start: b, end: a) : TokenRange(start: a, end: b)
    }

    /// Is this word inside the range?
    public func contains(_ range: TokenRange, _ p: TokenPoint) -> Bool {
        !isBefore(p, range.start) && !isBefore(range.end, p)
    }

    /// The selection's pieces, one per line, each trimmed to start and end on
    /// a word, so a stray space or comma at either end is never part of a mark.
    public func pieces(of range: TokenRange) -> [RangePiece] {
        guard let from = lineIndex(of: range.start.lineN), let to = lineIndex(of: range.end.lineN), from <= to else {
            return []
        }
        var out: [RangePiece] = []
        for i in from...to {
            let line = lines[i]
            let tokens = line.tokens
            guard !tokens.isEmpty else { continue }
            var s = i == from ? range.start.tok : 0
            var e = i == to ? range.end.tok : tokens.count - 1
            s = max(0, min(s, tokens.count - 1))
            e = max(0, min(e, tokens.count - 1))
            while s <= e && !tokens[s].isWord { s += 1 }
            while e >= s && !tokens[e].isWord { e -= 1 }
            guard s <= e else { continue }
            out.append(RangePiece(lineN: line.n, startTok: s, endTok: e,
                                  text: tokens[s...e].map(\.text).joined()))
        }
        return out
    }

    /// The range that selects `x` and the rest of its group.
    public func rangeOfGroup<T: LineAnchored>(_ x: T, in items: [T]) -> TokenRange {
        let all = groupOf(x, in: items).sorted {
            let a = lineIndex(of: $0.lineN) ?? 0, b = lineIndex(of: $1.lineN) ?? 0
            return a < b || (a == b && $0.startTok < $1.startTok)
        }
        let first = all.first ?? x
        let last = all.last ?? x
        return TokenRange(start: TokenPoint(lineN: first.lineN, tok: first.startTok),
                          end: TokenPoint(lineN: last.lineN, tok: last.endTok))
    }
}

/// The pieces' words as one string, lines joined by a space.
public func piecesText(_ pieces: [RangePiece]) -> String {
    pieces.map(\.text).joined(separator: " ")
}

/// For each piece, the stored record on exactly that span, if any.
public func matchPieces<T: LineAnchored>(_ pieces: [RangePiece], in items: [T]) -> [T?] {
    pieces.map { p in items.first { $0.lineN == p.lineN && $0.startTok == p.startTok && $0.endTok == p.endTok } }
}

/// Every record in the same group as `x` (just `x` when it has none), in
/// line order.
public func groupOf<T: LineAnchored>(_ x: T, in items: [T]) -> [T] {
    guard let group = x.group else { return [x] }
    return items.filter { $0.group == group }.sorted { ($0.lineN, $0.startTok) < ($1.lineN, $1.startTok) }
}

/// A fresh id for a group of pieces.
public func newGroupId(now: Date = Date()) -> String {
    "g" + ProgressDocument.uid(now: now)
}
