import Foundation
import Testing
@testable import LectioCore

@Suite struct JSONTests {
    @Test func roundTripsKeepingKeyOrder() throws {
        let text = #"{"z":1,"a":[true,false,null],"m":{"y":"é\n\"q\"","b":2.5,"c":-3e-7}}"#
        let value = try JSONValue.parse(text)
        #expect(value.objectValue?.keys == ["z", "a", "m"])
        #expect(value["m"]?.objectValue?.keys == ["y", "b", "c"])
        #expect(try JSONValue.parse(value.serialized()) == value)
        #expect(value["m"]?["y"]?.stringValue == "é\n\"q\"")
    }

    @Test func formatsNumbersLikeJavaScript() {
        #expect(JSONValue.number(6).serialized() == "6")
        #expect(JSONValue.number(-2).serialized() == "-2")
        #expect(JSONValue.number(2.36).serialized() == "2.36")
        #expect(JSONValue.number(2.1399999999999997).serialized() == "2.1399999999999997")
    }

    @Test func decodesSurrogatePairs() throws {
        #expect(try JSONValue.parse(#""🏛""#).stringValue == "🏛")
    }

    @Test func rejectsMalformedInput() {
        #expect(throws: JSONParseError.self) { try JSONValue.parse(#"{"a":1,}"#) }
        #expect(throws: JSONParseError.self) { try JSONValue.parse("[1 2]") }
        #expect(throws: JSONParseError.self) { try JSONValue.parse("tru") }
    }

    @Test func objectAssignmentBehavesLikeJavaScript() {
        var o = JSONObject()
        o["a"] = 1
        o["b"] = 2
        o["a"] = 3
        #expect(o.keys == ["a", "b"])
        o["a"] = nil
        o["a"] = 4
        #expect(o.keys == ["b", "a"])
        o.removeFirst(1)
        #expect(o.keys == ["a"])
    }
}

@Suite struct ProgressDocumentTests {
    let now = parseISO("2026-10-15T12:00:00.000Z")

    @Test func editsKeepFieldsThisBuildDoesNotKnow() throws {
        var raw = ProgressDocument.blank(now: now).raw
        raw["vocab"] = ["arma": ["id": "arma", "ef": 2.5, "interval": 0, "repetitions": 0, "due": "2026-10-15",
                                  "lapses": 0, "reviews": 0, "futureField": "keep me"]]
        raw["passages"] = ["p1": ["notes": "", "bookmarked": false, "flaggedLines": [], "coldReads": 0,
                                   "annotations": [], "futurePassageField": 7]]
        var doc = ProgressDocument(raw: raw, now: now)
        doc.reviewVocab("arma", quality: 5, now: now, calendar: utc)
        doc.toggleBookmark("p1")
        #expect(doc.raw.object("vocab")["arma"]?["futureField"] == "keep me")
        #expect(doc.raw.object("vocab")["arma"]?["reviews"] == 1)
        #expect(doc.raw.object("passages")["p1"]?["futurePassageField"] == 7)
        #expect(doc.passage("p1").bookmarked)
    }

    @Test func quizUpdatesReviewQueueLikeTheWeb() {
        var doc = ProgressDocument.blank(now: now)
        doc.recordQuiz(questionId: "q1", correct: false, chosenId: "b", type: "meter", skillCategory: "1", unit: "4", now: now)
        doc.recordQuiz(questionId: "q1", correct: false, chosenId: "c", type: "meter", skillCategory: "1", unit: "4", now: now)
        #expect(doc.reviewQueue == ["q1"])
        doc.recordQuiz(questionId: "q1", correct: true, chosenId: "a", type: "meter", skillCategory: "1", unit: "4", now: now)
        #expect(doc.reviewQueue.isEmpty)
        #expect(doc.quizAttempts.count == 3)
        #expect(doc.quizAttempts.last?.at == "2026-10-15T12:00:00.000Z")
    }

    @Test func encounteringAWordSeedsIt() {
        var doc = ProgressDocument.blank(now: now)
        doc.encounterWord("arma", passageId: "vergil-1-1", now: now)
        doc.encounterWord("arma", passageId: "vergil-1-1", now: now)
        doc.encounterWord("arma", passageId: "vergil-4-305", now: now)
        #expect(doc.card("arma")?.due == "2026-10-15")
        #expect(doc.wordEncounters["arma"] == WordEncounter(count: 3, lastSeen: "2026-10-15", passageIds: ["vergil-1-1", "vergil-4-305"]))
    }

    @Test func exportImportRoundTrips() throws {
        var doc = ProgressDocument.blank(now: now)
        doc.markStudied(now: now)
        doc.setTheme(.dark)
        let restored = try ProgressDocument.importJSON(doc.exportJSON(now: now), now: now)
        #expect(restored == doc)
        #expect(throws: ProgressDocument.ImportError.notAnExport) { try ProgressDocument.importJSON(#"{"app":"other","data":{}}"#) }
    }

    @Test func blankFillsMissingFields() {
        let doc = ProgressDocument(raw: JSONObject([("theme", "dark")]), now: now)
        #expect(doc.theme == .dark)
        #expect(doc.studyPlan.minutesPerDay == 30)
        #expect(doc.raw.keys.count == ProgressMerge.knownKeys.count)
    }

    @Test func daysUntilExamCountsLocalDays() {
        #expect(Streaks.daysUntilExam("2027-05-14", from: now, calendar: utc) == 211)
        #expect(Streaks.daysUntilExam("2020-01-01", from: now, calendar: utc) == 0)
    }
}

@Suite struct ContentTests {
    let library: ContentLibrary

    init() throws {
        library = try ContentLibrary(directory: Paths.content)
    }

    @Test func loadsEveryFile() {
        #expect(library.passages.count > 40)
        #expect(library.coreVocabulary.count >= 990)
        #expect(!library.questions.isEmpty)
        #expect(!library.grammarTopics.isEmpty)
        #expect(!library.translationDrills.isEmpty)
        #expect(library.meta.examDate == "2027-05-14")
    }

    @Test func everyGlossResolves() {
        var unresolved: [String] = []
        for passage in library.passages {
            for line in passage.lines {
                for token in line.tokens where token.isWord {
                    for gloss in token.glosses where library.vocab(gloss.id) == nil {
                        unresolved.append("\(passage.id) \(line.n) \(token.text) -> \(gloss.id)")
                    }
                }
                // Tokens reassemble the line exactly, so annotation anchors line up with the web.
                #expect(line.tokens.map(\.text).joined() == line.latin, "\(passage.id) \(line.n)")
            }
        }
        #expect(unresolved.isEmpty, "\(unresolved.prefix(5))")
    }

    @Test func everyAnswerKeyIsAnOption() {
        for q in library.questions + library.sightQuestions {
            #expect(q.options.contains { $0.id == q.answerId }, "\(q.id)")
        }
    }
}
