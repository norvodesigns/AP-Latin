import Foundation
import Testing
@testable import LectioCore

/// The Reader's selection helpers, held to what the web's readerSelection.ts does.
@Suite struct SelectionTests {
    let passage: Passage

    init() throws {
        let library = try ContentLibrary(directory: Paths.content)
        passage = try #require(library.passages.first { $0.id == "aen-1-1-33" })
    }

    private func firstWord(_ n: Int) -> Int { passage.lines.first { $0.n == n }!.tokens.firstIndex(where: \.isWord)! }
    private func lastWord(_ n: Int) -> Int { passage.lines.first { $0.n == n }!.tokens.lastIndex(where: \.isWord)! }

    @Test func rangeIsOrderedWhicheverWayItWasPicked() {
        let a = TokenPoint(lineN: 2, tok: 0)
        let b = TokenPoint(lineN: 1, tok: 4)
        let r = passage.range(from: a, to: b)
        #expect(r.start == b)
        #expect(r.end == a)
        #expect(passage.range(from: b, to: a) == r)
    }

    @Test func piecesAreOnePerLineAndTrimmedToWords() {
        // From the second word of line 1 to the first word of line 3.
        let line1 = passage.lines[0]
        let second = line1.tokens.indices.filter { line1.tokens[$0].isWord }[1]
        let r = passage.range(from: TokenPoint(lineN: 1, tok: second), to: TokenPoint(lineN: 3, tok: firstWord(3)))
        let pieces = passage.pieces(of: r)
        #expect(pieces.map(\.lineN) == [1, 2, 3])
        #expect(pieces[0].startTok == second)
        #expect(pieces[0].endTok == lastWord(1))
        #expect(pieces[1].startTok == firstWord(2))
        #expect(pieces[1].endTok == lastWord(2))
        #expect(pieces[2].startTok == firstWord(3) && pieces[2].endTok == firstWord(3))
        #expect(pieces[0].text.hasPrefix("virumque"))
        #expect(!pieces[1].text.hasSuffix(" "))
        #expect(piecesText(pieces).contains("Ītaliam"))
    }

    @Test func aSpaceAloneSelectsNothing() {
        let line1 = passage.lines[0]
        let space = line1.tokens.firstIndex { !$0.isWord }!
        #expect(passage.pieces(of: TokenRange(TokenPoint(lineN: 1, tok: space))).isEmpty)
    }

    @Test func containsFollowsReadingOrder() {
        let r = passage.range(from: TokenPoint(lineN: 1, tok: 4), to: TokenPoint(lineN: 3, tok: 2))
        #expect(passage.contains(r, TokenPoint(lineN: 2, tok: 0)))
        #expect(passage.contains(r, TokenPoint(lineN: 1, tok: 4)))
        #expect(!passage.contains(r, TokenPoint(lineN: 1, tok: 2)))
        #expect(!passage.contains(r, TokenPoint(lineN: 3, tok: 4)))
    }

    @Test func aGroupSelectsWholeAndMatchesItsPieces() {
        let r = passage.range(from: TokenPoint(lineN: 1, tok: lastWord(1)), to: TokenPoint(lineN: 2, tok: firstWord(2)))
        let pieces = passage.pieces(of: r)
        let group = newGroupId()
        let anns = pieces.enumerated().map { i, p in
            Annotation(id: "a\(i)", lineN: p.lineN, startTok: p.startTok, endTok: p.endTok, text: p.text,
                       color: .gilt, note: "", createdAt: "2026-11-04T00:00:00.000Z", group: group)
        }
        let other = Annotation(id: "x", lineN: 5, startTok: 0, endTok: 0, text: "multa", color: .woad, note: "",
                               createdAt: "2026-11-04T00:00:00.000Z")
        let all = anns + [other]
        #expect(groupOf(anns[1], in: all).map(\.id) == ["a0", "a1"])
        #expect(groupOf(other, in: all).map(\.id) == ["x"])
        #expect(passage.rangeOfGroup(anns[1], in: all) == r)
        #expect(matchPieces(pieces, in: all).map { $0?.id } == ["a0", "a1"])
    }
}

@Suite struct StudySheetTests {
    let passage: Passage

    init() throws {
        let library = try ContentLibrary(directory: Paths.content)
        passage = try #require(library.passages.first { $0.id == "aen-1-1-33" })
    }

    private func marked() -> PassageState {
        var state = PassageState()
        state.annotations = [
            Annotation(id: "a1", lineN: 1, startTok: 0, endTok: 2, text: "Arma virumque", color: .gilt, note: "",
                       createdAt: "2026-11-04T00:00:00.000Z", pigment: nil),
            Annotation(id: "a2", lineN: 3, startTok: 0, endTok: 0, text: "lītora", color: .rubric,
                       note: "Object of vēnit <b>", createdAt: "2026-11-04T00:00:00.000Z", pigment: "murex"),
        ]
        state.marks = [
            SyntaxMark(id: "m1", lineN: 2, startTok: 0, endTok: 0, text: "Ītaliam", role: .accusative,
                       createdAt: "2026-11-04T00:00:00.000Z"),
        ]
        state.notes = "Proem: arma / virum."
        state.flaggedLines = [4]
        return state
    }

    @Test func studySheetCarriesEveryMark() {
        let html = StudySheet.html(passage: passage, state: marked(), kind: .study, withEnglish: true)
        #expect(html.contains("background:#e3d3a6"))     // gilt
        #expect(html.contains("background:#d6c4df"))     // murex, from the 1.2 pigment field
        #expect(html.contains("class=\"lbl\">acc</span>"))
        #expect(html.contains("<sup>1</sup>"))
        #expect(html.contains("Object of vēnit &lt;b&gt;"))  // escaped
        #expect(html.contains("Notes on the passage"))
        #expect(html.contains("Flagged as hard:</b> line 4"))
        #expect(html.contains("I sing of arms"))
        // The English sits beside the Latin, and the notes start a new page.
        #expect(html.contains("<td class=\"english\">"))
        #expect(html.contains("<section class=\"back new-page\">"))
        #expect(html.contains("<h2>Notes</h2>"))
        #expect(!html.contains("class=\"line-notes\""))
    }

    @Test func notesOnlySheetPutsEachNoteBesideItsLine() {
        let html = StudySheet.html(passage: passage, state: marked(), kind: .study, withEnglish: false)
        #expect(html.contains("<td class=\"line-notes\"><p><b>1</b><i>lītora</i> — Object of vēnit &lt;b&gt;</p></td>"))
        #expect(!html.contains("<h2>Notes</h2>"))           // no endnote list
        #expect(!html.contains("class=\"back new-page\""))
        #expect(!html.contains("I sing of arms"))
        #expect(html.contains("Notes on the passage"))      // the passage note still follows the text
    }

    @Test func cleanHandoutLeavesTheMarksOff() {
        let html = StudySheet.html(passage: passage, state: marked(), kind: .clean)
        #expect(!html.contains("class=\"hl\""))
        #expect(!html.contains("<sup>"))
        #expect(!html.contains("Notes on the passage"))
        #expect(!html.contains("I sing of arms"))
        #expect(html.contains("Arma"))
    }
}

/// The mark-up bar's rules: how taps select, and what the bar's buttons do.
@Suite struct MarkupEditingTests {
    let passage: Passage
    let now = Date(timeIntervalSince1970: 1_793_750_400)

    init() throws {
        let library = try ContentLibrary(directory: Paths.content)
        passage = try #require(library.passages.first { $0.id == "aen-1-1-33" })
    }

    private func word(_ line: Int, _ k: Int) -> TokenPoint {
        let tokens = passage.lines.first { $0.n == line }!.tokens
        return TokenPoint(lineN: line, tok: tokens.indices.filter { tokens[$0].isWord }[k])
    }

    private var empty: ProgressDocument { ProgressDocument(raw: JSONObject(), now: now) }

    @Test func aTapSelectsThenATapElsewhereStretchesAcrossLines() {
        var sel = MarkupSelection()
        let state = PassageState()
        sel.tap(at: word(1, 1), in: passage, state: state)
        #expect(sel.range == TokenRange(word(1, 1)))
        #expect(!sel.settled)
        // The last word of the phrase, two lines on, takes in everything between.
        sel.tap(at: word(3, 0), in: passage, state: state)
        #expect(sel.range == TokenRange(start: word(1, 1), end: word(3, 0)))
        // Back before the anchor: still measured from where it started.
        sel.tap(at: word(1, 0), in: passage, state: state)
        #expect(sel.range == TokenRange(start: word(1, 0), end: word(1, 1)))
        #expect(sel.anchor == word(1, 1))
    }

    @Test func tappingTheOneSelectedWordAgainLetsGo() {
        var sel = MarkupSelection()
        sel.tap(at: word(2, 0), in: passage, state: PassageState())
        sel.tap(at: word(2, 0), in: passage, state: PassageState())
        #expect(sel.isEmpty)
    }

    @Test func aHighlightIsSelectedWholeAndCanBeNarrowed() {
        var doc = empty
        let r = TokenRange(start: word(1, 0), end: word(2, 0))
        doc.applyPigment(.murex, to: SelectionContents(range: r, in: passage, state: doc.passage(passage.id)),
                         passageId: passage.id, now: now)
        let state = doc.passage(passage.id)
        #expect(state.annotations.count == 2)
        #expect(Set(state.annotations.compactMap(\.group)).count == 1)

        var sel = MarkupSelection()
        sel.tap(at: word(2, 0), in: passage, state: state)
        #expect(sel.range == r)
        #expect(sel.settled)
        #expect(SelectionContents(range: sel.range, in: passage, state: state).pigment == .murex)
        // Inside a settled selection: down to the one word.
        sel.tap(at: word(1, 1), in: passage, state: state)
        #expect(sel.range == TokenRange(word(1, 1)))
        #expect(!sel.settled)
        // Holding (or tapping fresh) outside it starts afresh.
        sel.settle()
        sel.tap(at: word(5, 0), in: passage, state: state)
        #expect(sel.range == TokenRange(word(5, 0)))
    }

    @Test func theSameColourAgainTakesItOffAndKeepsTheNote() {
        var doc = empty
        let r = TokenRange(start: word(1, 0), end: word(1, 1))
        doc.applyPigment(.gilt, to: SelectionContents(range: r, in: passage, state: doc.passage(passage.id)),
                         passageId: passage.id, now: now)
        let a = doc.passage(passage.id).annotations[0]
        doc.setAnnotationNote(passageId: passage.id, annotationId: a.id, note: "Hendiadys?", now: now)
        doc.applyPigment(.gilt, to: SelectionContents(range: r, in: passage, state: doc.passage(passage.id)),
                         passageId: passage.id, now: now)
        let after = doc.passage(passage.id).annotations
        #expect(after.count == 1)
        #expect(after[0].color == nil)
        #expect(after[0].note == "Hendiadys?")
    }

    @Test func aRoleMarksEveryPieceAndTogglesOff() {
        var doc = empty
        let r = TokenRange(start: word(1, 2), end: word(2, 0))
        doc.applyRole(.object, to: SelectionContents(range: r, in: passage, state: doc.passage(passage.id)),
                      passageId: passage.id, now: now)
        let contents = SelectionContents(range: r, in: passage, state: doc.passage(passage.id))
        #expect(contents.role == .object)
        #expect(doc.passage(passage.id).allMarks.count == 2)
        doc.applyRole(.object, to: contents, passageId: passage.id, now: now)
        #expect(doc.passage(passage.id).allMarks.isEmpty)
    }

    @Test func removeTakesEverythingOnTheWords() {
        var doc = empty
        let r = TokenRange(word(4, 0))
        let id = passage.id
        doc.applyPigment(.woad, to: SelectionContents(range: r, in: passage, state: doc.passage(id)), passageId: id, now: now)
        doc.applyRole(.verb, to: SelectionContents(range: r, in: passage, state: doc.passage(id)), passageId: id, now: now)
        let contents = SelectionContents(range: r, in: passage, state: doc.passage(id))
        #expect(contents.hasExisting)
        doc.removeEverything(on: contents, passageId: id, now: now)
        #expect(doc.passage(id).annotations.isEmpty)
        #expect(doc.passage(id).allMarks.isEmpty)
        #expect(!SelectionContents(range: r, in: passage, state: doc.passage(id)).hasExisting)
    }
}
