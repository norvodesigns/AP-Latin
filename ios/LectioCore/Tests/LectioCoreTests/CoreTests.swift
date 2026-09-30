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

@Suite struct AnnotationTests {
    let now = parseISO("2026-10-15T12:00:00.000Z")

    @Test func highlightingOverMarksAbsorbsThemButKeepsNotes() {
        var doc = ProgressDocument.blank(now: now)
        doc.setHighlight(passageId: "p", lineN: 3, startTok: 2, endTok: 2, text: "a", color: .woad, now: now)
        let noted = doc.setHighlight(passageId: "p", lineN: 3, startTok: 4, endTok: 4, text: "b", color: .gilt, now: now)
        doc.setAnnotationNote(passageId: "p", annotationId: noted.id, note: "keep me")
        doc.setHighlight(passageId: "p", lineN: 3, startTok: 0, endTok: 6, text: "a b c", color: .rubric, now: now)
        let spans = doc.passage("p").annotations.map { "\($0.startTok)-\($0.endTok)" }
        #expect(spans == ["4-4", "0-6"])
    }

    @Test func clearingTheColorOfAnUnnotedMarkRemovesIt() {
        var doc = ProgressDocument.blank(now: now)
        doc.setHighlight(passageId: "p", lineN: 1, startTok: 0, endTok: 2, text: "x", color: .gilt, now: now)
        doc.setHighlight(passageId: "p", lineN: 1, startTok: 0, endTok: 2, text: "x", color: nil, now: now)
        #expect(doc.passage("p").annotations.isEmpty)
    }

    @Test func aNoteCanLiveWithoutAColor() {
        var doc = ProgressDocument.blank(now: now)
        let a = doc.setHighlight(passageId: "p", lineN: 1, startTok: 0, endTok: 0, text: "x", color: nil, now: now)
        #expect(doc.passage("p").annotations.count == 1)
        doc.setAnnotationNote(passageId: "p", annotationId: a.id, note: "a thought")
        #expect(doc.passage("p").annotations.first?.note == "a thought")
        doc.setAnnotationNote(passageId: "p", annotationId: a.id, note: "  ")
        #expect(doc.passage("p").annotations.isEmpty)
    }

    @Test func colorIsWrittenAsExplicitNull() {
        var doc = ProgressDocument.blank(now: now)
        doc.setHighlight(passageId: "p", lineN: 1, startTok: 0, endTok: 0, text: "x", color: nil, now: now)
        let stored = doc.raw.object("passages")["p"]?["annotations"]?.arrayValue?.first
        #expect(stored?["color"] == .null)
    }

    @Test func aiUsageCountsPerDayAndRoute() {
        var doc = ProgressDocument.blank(now: now)
        doc.recordAiCall(route: "ask", now: now)
        doc.recordAiCall(route: "ask", now: now)
        doc.recordAiCall(route: "grade-translation", now: now)
        let day = doc.raw.array("aiUsage").first
        #expect(day?["calls"] == 3)
        #expect(day?["byRoute"]?["ask"] == 2)
    }
}

@Suite struct RecordingTests {
    let now = parseISO("2026-10-15T12:00:00.000Z")

    @Test func translationAttemptsAreCappedAndDecodable() {
        var doc = ProgressDocument.blank(now: now)
        for _ in 0..<505 {
            doc.recordTranslation(drillId: "d", segmentResults: ["s1": "partial"], text: "t", score: 7.5, maxScore: 15,
                                  missedTags: ["ablative"], gradedBy: "self", now: now)
        }
        #expect(doc.translationAttempts.count == 500)
        #expect(doc.translationAttempts.first?.score == 7.5)
    }

    @Test func frqSavesReplaceTheSameResponse() {
        var doc = ProgressDocument.blank(now: now)
        let id = doc.saveFrq(id: nil, promptId: "p", answers: ["a": "draft"], selfScore: [:], secondsSpent: 10, submitted: false, now: now)
        doc.saveFrq(id: id, promptId: "p", answers: ["a": "final"], selfScore: ["r1": 2], secondsSpent: 60, submitted: true, now: now)
        #expect(doc.frqResponses.count == 1)
        #expect(doc.frqResponses.first?.answers["a"] == "final")
    }

    @Test func draftsEvictTheOldestFirst() {
        var doc = ProgressDocument.blank(now: now)
        for i in 0..<305 { doc.saveScansionDraft(lineId: "aen1-\(i)", draft: ScansionDraft(marks: ["long", nil], divisions: [])) }
        let keys = doc.raw.object("scansionDrafts").keys
        #expect(keys.count == 300)
        #expect(keys.first == "aen1-5")
        #expect(doc.raw.object("scansionDrafts")["aen1-5"]?["marks"] == ["long", .null])
        #expect(doc.scansionDraft("aen1-304")?.marks == ["long", nil])
    }

    @Test func examAndProjectPassagesRoundTrip() {
        var doc = ProgressDocument.blank(now: now)
        doc.recordExam(mcqCorrect: 40, mcqTotal: 52, frqPoints: 20, frqMax: 30,
                       bySkill: ["1": Tally(correct: 10, total: 12)], byType: [:], mcqSeconds: 3600, frqSeconds: 6000, now: now)
        #expect(doc.examResults.first?.bySkill["1"]?.total == 12)
        let p = ProjectPassage(id: "pp", title: "t", author: "Ovid", citation: "Met. 1", genre: "poetry", latin: "in nova",
                               notes: "", checkpoint1: "", checkpoint2: "")
        doc.upsertProjectPassage(p)
        var edited = p
        edited.notes = "edited"
        doc.upsertProjectPassage(edited)
        #expect(doc.projectPassages.map(\.notes) == ["edited"])
        doc.removeProjectPassage("pp")
        #expect(doc.projectPassages.isEmpty)
    }
}

@Suite struct WidgetSnapshotTests {
    @Test func countsFromRawIngredients() {
        let now = parseISO("2026-10-15T12:00:00.000Z")
        let snap = WidgetSnapshot(examDate: "2027-05-14", dueDates: ["2026-10-14", "2026-10-15", "2026-10-16"],
                                  studyDays: ["2026-10-14", "2026-10-15"], goalMinutes: 30, studySeconds: 600, studyDay: "2026-10-15")
        #expect(snap.cardsDue(on: now) == 2)
        #expect(snap.cardsDue(on: now.addingTimeInterval(86_400)) == 3)
        #expect(snap.streak(on: now, calendar: utc) == 2)
        #expect(snap.minutesToday(on: now) == 10)
        #expect(snap.minutesToday(on: now.addingTimeInterval(86_400)) == 0)
        #expect(snap.daysUntilExam(on: now, calendar: utc) == 211)
        let defaults = UserDefaults(suiteName: "lectio-tests")!
        snap.save(to: defaults)
        #expect(WidgetSnapshot.load(from: defaults) == snap)
    }
}

@Suite struct WatchMessageTests {
    @Test func deckAndReviewRoundTrip() {
        let deck = WatchDeck(cards: [WatchDeck.Card(id: "arma", headword: "arma", lemma: "arma, -orum (n. pl.)", pos: "noun", definition: "arms")],
                             dueCount: 7, streak: 3, daysUntilExam: 211, sentAt: Date(timeIntervalSince1970: 1_800_000_000))
        #expect(WatchDeck(context: deck.context) == deck)
        let review = WatchReview(cardId: "arma", quality: 4, at: Date(timeIntervalSince1970: 1_800_000_100))
        #expect(WatchReview(userInfo: review.userInfo) == review)
        #expect(WatchDeck(context: ["nope": 1]) == nil)
    }
}

@Suite struct InsightsTests {
    let now = parseISO("2026-10-15T12:00:00.000Z")

    func quiz(_ type: String, _ correct: Bool, skill: String = "1") -> QuizAttempt {
        QuizAttempt(id: UUID().uuidString, questionId: "q", correct: correct, chosenId: "a", at: "2026-10-15T00:00:00.000Z",
                    type: type, skillCategory: skill, unit: "4", passageId: nil, seconds: nil)
    }

    @Test func weakSpotsNeedASampleAndRankByUrgency() {
        let attempts = (0..<6).map { quiz("meter", $0 < 2) } + (0..<5).map { _ in quiz("inference", false) }
            + (0..<10).map { quiz("grammar-syntax", $0 < 9) }
        let spots = Insights.weakSpots(quizAttempts: attempts, translationAttempts: [], scansionAttempts: [], vocab: [:],
                                       typeLabels: ["meter": "Metre"])
        #expect(spots.map(\.id) == ["type-meter"])
        #expect(spots.first?.pct == 33)
        #expect(spots.first?.label == "Metre")
    }

    @Test func forecastBucketsTheWeek() {
        var vocab: [String: VocabCard] = [:]
        for (i, due) in ["2026-10-10", "2026-10-15", "2026-10-16", "2026-10-21", "2026-10-22"].enumerated() {
            vocab["w\(i)"] = VocabCard(id: "w\(i)", ef: 2.5, interval: i * 10, repetitions: 1, due: due, lapses: 0, reviews: 1)
        }
        let f = Insights.forecast(vocab, today: now)
        #expect(f.week == [2, 1, 0, 0, 0, 0, 1])
        #expect(f.mature == 2)
    }

    @Test func masteryTalliesBySkill() {
        let m = Insights.mastery([quiz("meter", true, skill: "2"), quiz("meter", false, skill: "2")])
        #expect(m["2"] == Tally(correct: 1, total: 2))
        #expect(m["1"] == Tally(correct: 0, total: 0))
    }
}

@Suite struct ContentUpdateTests {
    private let a = String(repeating: "a", count: 64)
    private let b = String(repeating: "b", count: 64)

    /// A manifest; any hash but h1 supersedes h1, as a newer export would.
    private func manifest(_ hash: String, schema: Int = 1, _ files: [String: String]) -> ContentManifest {
        ContentManifest(schemaVersion: schema, contentHash: hash, supersedes: hash == "h1" ? [] : ["h1"], files: files)
    }

    @Test func downloadsOnlyWhatChanged() {
        let current = manifest("h1", ["passages.json": a, "vocabulary.json": a])
        let remote = manifest("h2", ["passages.json": a, "vocabulary.json": b, "lessons.json": b])
        #expect(ContentUpdate.shouldUpdate(current: current, remote: remote))
        #expect(ContentUpdate.changedFiles(current: current, remote: remote) == ["lessons.json", "vocabulary.json"])
    }

    @Test func neverGoesBackwards() {
        // The app was built after the website last deployed: its content is
        // newer, so the website's older content isn't an update.
        let app = ContentManifest(schemaVersion: 1, contentHash: "h2", supersedes: ["h1"], files: ["passages.json": b])
        let website = manifest("h1", ["passages.json": a])
        #expect(!ContentUpdate.shouldUpdate(current: app, remote: website))
        // Unrelated content (not in the history) isn't taken either.
        let other = ContentManifest(schemaVersion: 1, contentHash: "h9", supersedes: ["h8"], files: ["passages.json": a])
        #expect(!ContentUpdate.shouldUpdate(current: app, remote: other))
    }

    @Test func readsManifestsWrittenBeforeTheHistoryExisted() throws {
        let json = #"{"schemaVersion":1,"contentHash":"h1","files":{"passages.json":"\#(a)"}}"#
        let m = try JSONDecoder().decode(ContentManifest.self, from: Data(json.utf8))
        #expect(m.supersedes.isEmpty)
    }

    @Test func leavesSameOrUnreadableContentAlone() {
        let current = manifest("h1", ["passages.json": a])
        #expect(!ContentUpdate.shouldUpdate(current: current, remote: manifest("h1", ["passages.json": a])))
        #expect(!ContentUpdate.shouldUpdate(current: current, remote: manifest("h2", schema: 2, ["passages.json": b])))
        #expect(!ContentUpdate.shouldUpdate(current: current, remote: manifest("h2", [:])))
        #expect(!ContentUpdate.shouldUpdate(current: current, remote: manifest("h2", ["passages.json": "nothex"])))
    }

    @Test func refusesPaths() {
        let current = manifest("h1", ["passages.json": a])
        for name in ["../progress.json", "/etc/x.json", "sub/passages.json", ".json", ".hidden.json", "manifest.json", "Passages.json", "passages.txt"] {
            #expect(!ContentUpdate.isSafeFileName(name), "\(name)")
            #expect(!ContentUpdate.shouldUpdate(current: current, remote: manifest("h2", [name: b])))
        }
        #expect(ContentUpdate.isSafeFileName("lesson-plans_2.json"))
    }

    @Test func theBundledManifestPassesItsOwnChecks() throws {
        let library = try ContentLibrary(directory: Paths.content)
        let empty = ContentManifest(schemaVersion: 1, contentHash: "", files: [:])
        let newer = ContentManifest(schemaVersion: library.manifest.schemaVersion, contentHash: library.manifest.contentHash,
                                       supersedes: [""], files: library.manifest.files)
        #expect(ContentUpdate.shouldUpdate(current: empty, remote: newer))
        #expect(!ContentUpdate.shouldUpdate(current: library.manifest, remote: library.manifest))
        #expect(ContentUpdate.changedFiles(current: empty, remote: library.manifest).count == library.manifest.files.count)
    }
}

@Suite struct LessonProgressTests {
    @Test func completingALessonRecordsItSeedsWordsAndCountsTheDay() throws {
        var doc = ProgressDocument.blank()
        let first = parseISO("2026-10-01T09:00:00.000Z")
        let second = parseISO("2026-10-03T09:00:00.000Z")
        doc.completeLesson("prima-1-1", score: 0.75, vocabIds: ["puella", "sum"], now: first)
        doc.completeLesson("prima-1-1", score: 0.5, vocabIds: ["puella"], now: second)
        let p = try #require(doc.lessons["prima-1-1"])
        #expect(p.completedAt == "2026-10-01T09:00:00.000Z")
        #expect(p.lastAt == "2026-10-03T09:00:00.000Z")
        #expect(p.best == 0.75)
        #expect(p.attempts == 2)
        #expect(doc.vocab.keys.sorted() == ["puella", "sum"])
        #expect(doc.studyDays == ["2026-10-01", "2026-10-03"])
    }

    @Test func learnerRoundTripsWithAnExplicitNull() throws {
        var doc = ProgressDocument.blank()
        #expect(doc.learner == nil)
        doc.setLearner(LearnerProfile(track: .new, startLessonId: nil, onboardedAt: "2026-10-01T00:00:00.000Z"))
        #expect(doc.learner?.track == .new)
        #expect(doc.raw["learner"]?["startLessonId"] == .null)
        doc.setLearner(nil)
        #expect(doc.raw["learner"] == .null)
    }
}
