import Foundation
import Testing
@testable import LectioCore

/// Imported texts: the tokenizer must split exactly as the web's, since
/// highlights on an imported text are anchored to token indices on every
/// platform; and the progress document must add, change and delete them as
/// the web's store does.
@Suite struct ImportedTextTests {
    @Test func tokenizerMatchesTheWebApp() throws {
        let cases = try #require(Paths.fixture("tokenize.json")["cases"]?.arrayValue)
        #expect(cases.count >= 5)
        for c in cases {
            let line = try #require(c["line"]?.stringValue)
            let expected = try #require(c["tokens"]?.arrayValue).map { pair -> (String, Bool) in
                let p = pair.arrayValue ?? []
                return (p.first?.stringValue ?? "", p.last?.intValue == 1)
            }
            let got = LatinTokenizer.tokenize(line)
            #expect(got.count == expected.count, "\(line): \(got.count) tokens vs \(expected.count)")
            for (g, e) in zip(got, expected) {
                #expect(g.text == e.0 && g.isWord == e.1, "\(line): \(g.text)/\(g.isWord) vs \(e.0)/\(e.1)")
            }
            // Tokens always cover the line exactly.
            #expect(got.map(\.text).joined() == line)
        }
    }

    private func sample(at: String = "2026-11-24T10:00:00.000Z") -> ImportedText {
        ImportedText(
            id: "mine-test", title: "First Catilinarian", author: "Cicero", source: "In Cat. 1.1",
            genre: "prose", layout: "sentences",
            lines: [
                ImportedLine(n: 1, latin: "Quo usque tandem abutere, Catilina, patientia nostra?"),
                ImportedLine(n: 2, latin: "Quam diu etiam furor iste tuus nos eludet?"),
            ],
            words: [
                "tandem": ImportedWord(g: [Gloss(id: "v-tandem", m: "e")]),
                "nostra": ImportedWord(g: [Gloss(id: "v-noster", m: "s")]),
                "Catilina": ImportedWord(ai: AiGloss(lemma: "Catilina, Catilinae m.", pos: "proper noun", meaning: "Catiline", form: "voc. sg.")),
                "furor": ImportedWord(g: [Gloss(id: "sup-12", m: "e")]),
            ],
            createdAt: at, at: at
        )
    }

    @Test func importedTextOpensAsAPassage() {
        let t = sample()
        let p = Passage(imported: t)
        #expect(p.id == "mine-test")
        #expect(p.isImported)
        #expect(!p.setsOutLines)
        #expect(p.citation == "In Cat. 1.1")
        #expect(p.authorName == "Cicero")
        #expect(p.lines.count == 2)
        let tokens = p.lines[0].tokens
        #expect(tokens.map(\.text).joined() == t.lines[0].latin)
        #expect(tokens.first { $0.text == "tandem" }?.g?.first?.id == "v-tandem")
        #expect(tokens.first { $0.text == ", " }?.isWord == false)
        #expect(p.wordCount == 15)
        // Exact matches from the core lists only; supplementary ids and stem
        // guesses stay out of the passage's vocabulary.
        #expect(p.vocabIds == ["v-tandem"])
    }

    @Test func coverageCountsAiAndExactMatches() {
        let t = sample()
        // tandem (exact), Catilina (AI), furor (exact sup) of 15 words.
        #expect(t.glossCoverage == (3, 15))
        #expect(t.unglossedWords.first == "Quo")
        #expect(t.unglossedWords.contains("nostra")) // a stem guess is not a gloss
        #expect(!t.unglossedWords.contains("Catilina"))
    }

    @Test func progressDocumentAddsUpdatesAndDeletes() throws {
        var doc = ProgressDocument.blank()
        let t = sample()
        let now = parseISO("2026-11-24T10:00:00.000Z")
        let id = doc.addImportedText(title: t.title, author: t.author, source: t.source, genre: t.genre,
                                     layout: t.layout, lines: t.lines, words: t.words, now: now)
        #expect(ImportedText.isImported(id))
        #expect(doc.importedTexts.map(\.id) == [id])
        #expect(doc.studyDays.contains("2026-11-24"))
        let added = try #require(doc.importedText(id))
        #expect(added.words == t.words)
        #expect(added.createdAt == added.at)

        let later = parseISO("2026-11-24T11:00:00.000Z")
        doc.updateImportedText(id, title: "Quo usque tandem", now: later)
        let updated = try #require(doc.importedText(id))
        #expect(updated.title == "Quo usque tandem")
        #expect(updated.lines == t.lines)
        #expect(updated.at > added.at)

        doc.setPassageNotes(id, notes: "check abutere")
        #expect(doc.raw.object("passages")[id] != nil)
        doc.deleteImportedText(id, now: parseISO("2026-11-24T12:00:00.000Z"))
        #expect(doc.importedTexts.isEmpty)
        #expect(doc.importedText(id) == nil)
        #expect(doc.raw.object("passages")[id] == nil)
        let stub = try #require(doc.raw.object("importedTexts")[id])
        #expect(stub["deleted"]?.boolValue == true)
        #expect(stub["lines"]?.arrayValue?.isEmpty == true)
    }

    @Test func aDeletionSurvivesAMergeWithAnOlderCopy() throws {
        var deleted = ProgressDocument.blank()
        let id = deleted.addImportedText(title: "t", author: "", source: "", genre: "poetry", layout: "lines",
                                         lines: [ImportedLine(n: 1, latin: "arma virumque cano")], words: [:],
                                         now: parseISO("2026-11-24T10:00:00.000Z"))
        let other = deleted
        deleted.deleteImportedText(id, now: parseISO("2026-11-24T12:00:00.000Z"))
        let merged = ProgressMerge.merge(local: other.raw, cloud: deleted.raw, cloudIsNewer: false)
        #expect(ProgressDocument(raw: merged).importedTexts.isEmpty)
        let back = ProgressMerge.merge(local: deleted.raw, cloud: other.raw, cloudIsNewer: true)
        #expect(ProgressDocument(raw: back).importedTexts.isEmpty)
    }
}
