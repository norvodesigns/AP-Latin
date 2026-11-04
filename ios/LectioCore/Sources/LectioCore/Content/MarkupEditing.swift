import Foundation

/*
 * Selecting words in the Reader and doing things to them — the state
 * machine and the edits behind the web Reader's mark-up bar (Reader.tsx's
 * `markupTap`, `applyPigment`, `applyRole`, `removeSelected`), kept here so
 * the iPhone and iPad Reader runs exactly the same rules and they are
 * tested.
 */

/// The words selected in the Reader, and how a tap changes them.
public struct MarkupSelection: Equatable, Sendable {
    /// From one word to another, across lines if need be.
    public private(set) var range: TokenRange?
    /// The word the selection started from, which a tap extends it from.
    public private(set) var anchor: TokenPoint?
    /// True once something has been done to the selection, or it was an
    /// existing highlight selected whole: a tap outside then starts afresh
    /// rather than stretching it.
    public private(set) var settled = false

    public init() {}

    public var isEmpty: Bool { range == nil }

    public mutating func select(_ r: TokenRange, settled: Bool, anchor: TokenPoint? = nil) {
        range = r
        self.settled = settled
        self.anchor = anchor
    }

    /// Something was done to the words (a colour, a mark, a note).
    public mutating func settle() {
        if range != nil { settled = true }
    }

    public mutating func clear() {
        range = nil
        anchor = nil
        settled = false
    }

    /// Selects at a word afresh. A highlight there is selected whole, to
    /// recolour it, note it or take it off; then a sentence mark; otherwise
    /// the one word, ready to be extended.
    public mutating func selectFresh(at p: TokenPoint, in passage: Passage, state: PassageState) {
        if let hit = state.annotations.last(where: { $0.color != nil && covers($0, p) }) {
            select(passage.rangeOfGroup(hit, in: state.annotations), settled: true)
        } else if let hit = state.allMarks.first(where: { covers($0, p) }) {
            select(passage.rangeOfGroup(hit, in: state.allMarks), settled: true)
        } else {
            select(TokenRange(p), settled: false, anchor: p)
        }
    }

    /// A tap in mark-up mode: select, extend, narrow or let go.
    public mutating func tap(at p: TokenPoint, in passage: Passage, state: PassageState) {
        guard let range else { return selectFresh(at: p, in: passage, state: state) }
        let inside = passage.contains(range, p)
        if settled {
            if !inside { return selectFresh(at: p, in: passage, state: state) }
            if range.isSingleWord { return clear() }
            // Narrow a selected highlight to the one word, to work on it alone.
            return select(TokenRange(p), settled: false, anchor: p)
        }
        if range.isSingleWord && inside { return clear() }
        let from = anchor ?? range.start
        select(passage.range(from: from, to: p), settled: false, anchor: from)
    }
}

/// Is the word inside a record's span?
public func covers(_ x: some LineAnchored, _ p: TokenPoint) -> Bool {
    x.lineN == p.lineN && p.tok >= x.startTok && p.tok <= x.endTok
}

/// A selection's pieces, one per line, and whatever is stored on exactly
/// each of them.
public struct SelectionContents: Sendable {
    public let pieces: [RangePiece]
    public let annotations: [Annotation?]
    public let marks: [SyntaxMark?]

    public init(range: TokenRange?, in passage: Passage, state: PassageState) {
        let pieces = range.map { passage.pieces(of: $0) } ?? []
        self.pieces = pieces
        annotations = matchPieces(pieces, in: state.annotations)
        marks = matchPieces(pieces, in: state.allMarks)
    }

    public var isEmpty: Bool { pieces.isEmpty }
    public var text: String { piecesText(pieces) }

    /// The colour every piece shares, if it is one highlight already.
    public var pigment: Pigment? {
        guard !pieces.isEmpty, annotations.allSatisfy({ $0?.color != nil }) else { return nil }
        let shown = Set(annotations.compactMap { $0?.shownPigment })
        return shown.count == 1 ? shown.first : nil
    }

    /// The sentence part every piece is marked as, if they all are one.
    public var role: SyntaxRole? {
        guard !pieces.isEmpty, marks.allSatisfy({ $0 != nil }) else { return nil }
        let roles = Set(marks.compactMap { $0?.roleValue })
        return roles.count == 1 ? roles.first : nil
    }

    /// The highlight holding a note on these words, the last if several.
    public var noted: Annotation? { annotations.reversed().compactMap { $0 }.first { $0.hasNote } }

    /// Anything stored on exactly these words, so Remove has something to take.
    public var hasExisting: Bool { annotations.contains { $0 != nil } || marks.contains { $0 != nil } }

    /// The group the pieces share, for a new piece to join.
    var annotationGroup: String? { annotations.compactMap { $0?.group }.first }
    var markGroup: String? { marks.compactMap { $0?.group }.first }
}

extension ProgressDocument {
    /// Colours the selected words, one highlight per line sharing a group;
    /// choosing the colour they already have takes it off (a note on them
    /// stays).
    public mutating func applyPigment(_ p: Pigment, to s: SelectionContents, passageId: String, now: Date = Date()) {
        guard !s.isEmpty else { return }
        if s.pigment == p {
            for a in s.annotations.compactMap({ $0 }) {
                setHighlight(passageId: passageId, lineN: a.lineN, startTok: a.startTok, endTok: a.endTok, text: a.text,
                             color: nil, now: now)
            }
        } else {
            let group = s.pieces.count > 1 ? (s.annotationGroup ?? newGroupId(now: now)) : nil
            for piece in s.pieces {
                setHighlight(passageId: passageId, lineN: piece.lineN, startTok: piece.startTok, endTok: piece.endTok,
                             text: piece.text, color: p, group: group, now: now)
            }
        }
        markStudied(now: now)
    }

    /// Marks the selected words as a part of the sentence; choosing the part
    /// they are already marked as takes the mark off.
    public mutating func applyRole(_ r: SyntaxRole, to s: SelectionContents, passageId: String, now: Date = Date()) {
        guard !s.isEmpty else { return }
        let off = s.role == r
        let group = s.pieces.count > 1 ? (s.markGroup ?? newGroupId(now: now)) : nil
        for piece in s.pieces {
            setMark(passageId: passageId, lineN: piece.lineN, startTok: piece.startTok, endTok: piece.endTok,
                    text: piece.text, role: off ? nil : r, group: group, now: now)
        }
        markStudied(now: now)
    }

    /// Takes everything stored on exactly the selected words off the page.
    public mutating func removeEverything(on s: SelectionContents, passageId: String, now: Date = Date()) {
        for a in s.annotations.compactMap({ $0 }) { removeAnnotation(passageId: passageId, annotationId: a.id, now: now) }
        for m in s.marks.compactMap({ $0 }) { removeMark(passageId: passageId, markId: m.id, now: now) }
    }
}
