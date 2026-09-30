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

    @Test func linesTurnOverByLocalDay() throws {
        let line = { (day: String) in WidgetSnapshot.DayLine(day: day, latin: "L\(day)", english: "", source: "") }
        let snap = WidgetSnapshot(examDate: "2027-05-14", dueDates: [], studyDays: [], goalMinutes: 30, studySeconds: 0, studyDay: "",
                                  lines: [line("2026-10-15"), line("2026-10-16")], dailyDone: ["2026-10-15"],
                                  nextLesson: .init(id: "prima-2-3", place: "Prīma 2.3", title: "Of, to, with"))
        let now = parseISO("2026-10-15T12:00:00.000Z")
        #expect(snap.line(on: now, calendar: utc)?.latin == "L2026-10-15")
        #expect(snap.line(on: now.addingTimeInterval(86_400), calendar: utc)?.latin == "L2026-10-16")
        #expect(snap.line(on: now.addingTimeInterval(3 * 86_400), calendar: utc) == nil)
        #expect(snap.dailyDone(on: now, calendar: utc))
        #expect(!snap.dailyDone(on: now.addingTimeInterval(86_400), calendar: utc))
        // A snapshot written before these fields decodes with them empty.
        let old = #"{"examDate":"2027-05-14","dueDates":[],"studyDays":[],"goalMinutes":30,"studySeconds":0,"studyDay":""}"#
        let decoded = try JSONDecoder().decode(WidgetSnapshot.self, from: Data(old.utf8))
        #expect(decoded.lines == nil && decoded.nextLesson == nil)
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

@Suite struct CourseTests {
    @Test func theBundledCourseDecodesAndHangsTogether() throws {
        let course = try ContentLibrary(directory: Paths.content).course
        #expect(!course.levels.isEmpty)
        #expect(course.lessons.count >= 8)
        #expect(course.lessons.first?.lesson.id == "prima-1-1")
        let decodedSteps = course.lessons.flatMap(\.lesson.steps)
        #expect(!decodedSteps.contains(.unknown))
        for place in course.lessons {
            #expect(place.lesson.exerciseCount >= 3, "\(place.lesson.id)")
            for case .choice(let c) in place.lesson.steps { #expect(c.options.indices.contains(c.answer)) }
            for case .match(let m) in place.lesson.steps { #expect(m.pairs.allSatisfy { $0.count == 2 }) }
        }
    }

    @Test func nextLessonMatchesTheWeb() throws {
        let course = try ContentLibrary(directory: Paths.content).course
        let ids = course.lessons.map(\.lesson.id)
        #expect(course.next(done: [])?.lesson.id == ids[0])
        #expect(course.next(done: [ids[0], ids[1]])?.lesson.id == ids[2])
        // From a chosen starting point, then wrapping back to what was skipped.
        #expect(course.next(done: [], startingAt: ids[3])?.lesson.id == ids[3])
        #expect(course.next(done: Set(ids[3...]), startingAt: ids[3])?.lesson.id == ids[0])
        #expect(course.next(done: Set(ids)) == nil)
        #expect(course.after(ids[0])?.lesson.id == ids[1])
        #expect(course.after(ids.last!) == nil)
    }
}

@Suite struct ReviewTests {
    func done(_ ids: [String], best: Double = 0.8, at: String = "2026-09-01T12:00:00.000Z") -> [String: LessonProgress] {
        Dictionary(uniqueKeysWithValues: ids.map { ($0, LessonProgress(completedAt: at, lastAt: at, best: best, attempts: 1)) })
    }

    @Test func drawsOnlyFromFinishedLessonsWithoutRepeats() throws {
        let course = try ContentLibrary(directory: Paths.content).course
        var rng = ForgeTests.Seeded(state: 7)
        #expect(course.review(done: [:], using: &rng) == nil)

        let ids = Array(course.lessons.prefix(4).map(\.lesson.id))
        let finished = done(ids)
        let allowed = Set(course.reviewable(done: finished).flatMap { $0.lesson.steps.filter(\.isExercise) })
        for _ in 0..<20 {
            let review = try #require(course.review(done: finished, using: &rng))
            #expect(Course.isReview(review.lesson.id))
            #expect(!Course.isReview(ids[0]))
            #expect(review.lesson.steps.count == min(Course.reviewLength, allowed.count))
            #expect(review.lesson.steps.allSatisfy { allowed.contains($0) })
            #expect(course.place(review.lesson.id) == nil)
        }
    }

    @Test func leavesOutReadingsAndLeansOnWeakLessons() throws {
        let course = try ContentLibrary(directory: Paths.content).course
        let readings = course.lessons.filter { $0.lesson.steps.contains { if case .read = $0 { true } else { false } } }
        let reading = try #require(readings.first)
        #expect(course.reviewable(done: done([reading.lesson.id])).isEmpty)

        let now = ISO8601DateFormatter().date(from: "2026-09-30T12:00:00Z")!
        let weakOld = LessonProgress(completedAt: "2026-08-01T12:00:00.000Z", lastAt: "2026-08-01T12:00:00.000Z", best: 0.4, attempts: 1)
        let strongNew = LessonProgress(completedAt: "2026-09-30T11:00:00.000Z", lastAt: "2026-09-30T11:00:00.000Z", best: 1, attempts: 1)
        #expect(Course.reviewWeight(weakOld, now: now) > Course.reviewWeight(strongNew, now: now) * 5)
    }
}

@Suite struct DailyTests {
    @Test func everyLineDecodesAndTodayIsStable() throws {
        let list = try ContentLibrary(directory: Paths.content).sententiae
        #expect(list.count >= 40)
        #expect(Set(list.map(\.id)).count == list.count)
        for s in list {
            #expect(s.steps.filter(\.isExercise).count == 3, "\(s.id)")
            #expect(!s.steps.contains(.unknown), "\(s.id)")
        }
        // Consecutive days walk through the list; the same day is always the same line.
        let a = try #require(Daily.sententia(for: "2026-10-01", in: list))
        let b = try #require(Daily.sententia(for: "2026-10-02", in: list))
        let i = try #require(list.firstIndex(of: a))
        #expect(list[(i + 1) % list.count] == b)
        #expect(Daily.sententia(for: "2026-10-01", in: list) == a)
        #expect(Daily.sententia(for: Daily.shift("2026-10-01", by: list.count), in: list) == a)
    }

    @Test func theLessonWrapsTheQuestions() throws {
        let s = try #require(ContentLibrary(directory: Paths.content).sententiae.first)
        let place = Daily.lesson(s, day: "2026-10-01")
        #expect(place.lesson.id == "daily-2026-10-01")
        #expect(Daily.isDaily(place.lesson.id) && !Course.isReview(place.lesson.id))
        #expect(Daily.day(ofLesson: place.lesson.id) == "2026-10-01")
        #expect(place.lesson.exerciseCount == 3)
        #expect(place.lesson.steps.count == 5)
    }

    @Test func streakCountsBackFromTodayOrYesterday() {
        let r = DailyResult(id: "x", score: 1, at: "")
        let days = ["2026-02-27", "2026-02-28", "2026-03-01"]
        let done = Dictionary(uniqueKeysWithValues: days.map { ($0, r) })
        #expect(Daily.shift("2026-03-01", by: -1) == "2026-02-28")
        #expect(Daily.shift("2024-02-28", by: 1) == "2024-02-29")
        #expect(Daily.streak(done, today: "2026-03-01") == 3)
        #expect(Daily.streak(done, today: "2026-03-02") == 3)
        #expect(Daily.streak(done, today: "2026-03-03") == 0)
        #expect(Daily.streak([:], today: "2026-03-03") == 0)
    }

    @Test func aSecondGoKeepsTheBetterScore() {
        var doc = ProgressDocument.blank()
        doc.completeDaily(day: "2026-10-01", id: "carpe-diem", score: 0.33)
        doc.completeDaily(day: "2026-10-01", id: "carpe-diem", score: 1)
        doc.completeDaily(day: "2026-10-01", id: "carpe-diem", score: 0.67)
        #expect(doc.daily["2026-10-01"]?.score == 1)
        #expect(doc.daily.count == 1)
        #expect(!doc.studyDays.isEmpty)
    }
}

@Suite struct SpeedRoundTests {
    struct Fixture: Decodable {
        struct Gloss: Decodable { let input: String; let output: String }
        struct Entry: Decodable { let id: String; let headword: String; let definition: String }
        struct Words: Decodable { let entries: [Entry]; let ids: [String] }
        let gloss: [Gloss]
        let words: Words
    }

    @Test func glossesAndWordsMatchTheWeb() throws {
        let data = try Data(contentsOf: Paths.fixtures.appendingPathComponent("speed.json"))
        let f = try JSONDecoder().decode(Fixture.self, from: data)
        for g in f.gloss { #expect(SpeedRound.shortGloss(g.input) == g.output, "\(g.input)") }
        let entries = f.words.entries.map {
            VocabEntry(id: $0.id, lemma: $0.headword, headword: $0.headword, pos: "", definition: $0.definition, readings: [], units: [], supplementary: nil)
        }
        #expect(SpeedRound.words(entries).map(\.id) == f.words.ids)
    }

    @Test func boardsHoldDistinctPairsInAnotherOrder() throws {
        let pool = SpeedRound.words(try ContentLibrary(directory: Paths.content).coreVocabulary)
        #expect(pool.count > 500)
        var rng = ForgeTests.Seeded(state: 11)
        for _ in 0..<50 {
            let board = SpeedRound.deal(pool, using: &rng)
            #expect(board.left.count == SpeedRound.boardSize)
            #expect(Set(board.left) == Set(board.right))
            #expect(board.left != board.right)
            #expect(Set(board.left.map(\.english)).count == board.left.count)
        }
    }
}

@Suite struct DerivativesTests {
    @Test func everyRoundHasOneRightAnswerPerQuestion() throws {
        let library = try ContentLibrary(directory: Paths.content)
        let course = library.course
        let words = course.rootWords
        #expect(words.count > 150)
        #expect(library.derivatives["multus"]?.contains("multitude") == true)
        var rng = ForgeTests.Seeded(state: 5)
        for _ in 0..<40 {
            let place = course.derivativesLesson(done: [:], using: &rng)
            #expect(Course.isDerivatives(place.lesson.id))
            #expect(place.lesson.steps.count == Course.derivativesLength)
            for case .choice(let c) in place.lesson.steps {
                #expect(c.options.count == 4, "\(c.prompt)")
                #expect(Set(c.options).count == c.options.count, "\(c.prompt)")
                #expect(c.options.indices.contains(c.answer))
                // "X comes from which Latin word?": no wrong option lists X among its derivatives.
                if c.prompt.hasSuffix("comes from which Latin word?") {
                    let derivative = c.prompt.split(separator: "*")[0].lowercased()
                    for (i, o) in c.options.enumerated() where i != c.answer {
                        let root = try #require(words.first { $0.head == o })
                        #expect(!root.derivatives.map { $0.lowercased() }.contains(derivative), "\(o) also gives \(derivative)")
                    }
                }
            }
        }
    }
}

@Suite struct LessonCheckParityTests {
    struct Fixture: Decodable {
        struct Fold: Decodable { let input: String; let output: String }
        struct Check: Decodable { let answer: String; let accepted: [String]; let right: Bool }
        struct Build: Decodable { let placed: [String]; let answer: [String]; let lang: BuildStep.Language; let anyOrder: Bool; let right: Bool }
        struct Score: Decodable { let right: Int; let total: Int; let score: Double }
        let foldLatin: [Fold]
        let foldEnglish: [Fold]
        let typed: [Check]
        let translation: [Check]
        let build: [Build]
        let score: [Score]
    }

    @Test func checkingMatchesTheWebApp() throws {
        let data = try Data(contentsOf: Paths.fixtures.appendingPathComponent("lessonCheck.json"))
        let f = try JSONDecoder().decode(Fixture.self, from: data)
        for c in f.foldLatin { #expect(LessonCheck.foldLatin(c.input) == c.output, "foldLatin(\(c.input))") }
        for c in f.foldEnglish { #expect(LessonCheck.foldEnglish(c.input) == c.output, "foldEnglish(\(c.input))") }
        for c in f.typed { #expect(LessonCheck.checkTyped(c.answer, accepted: c.accepted) == c.right, "typed \(c.answer)") }
        for c in f.translation { #expect(LessonCheck.checkTranslation(c.answer, accepted: c.accepted) == c.right, "translation \(c.answer)") }
        for c in f.build {
            let step = BuildStep(lang: c.lang, answer: c.answer, anyOrder: c.anyOrder)
            #expect(LessonCheck.checkBuild(c.placed, step: step) == c.right, "build \(c.placed)")
        }
        for c in f.score { #expect(LessonCheck.score(right: c.right, of: c.total) == c.score) }
    }
}

@Suite struct PlacementTests {
    @Test func placesAtTheFirstMissAndStopsAfterThree() throws {
        let course = try ContentLibrary(directory: Paths.content).course
        #expect(course.placement.count >= 10)
        typealias A = Placement.Answer
        var answers = [A(unit: "prima-1", right: true), A(unit: "prima-1", right: true), A(unit: "prima-2", right: false)]
        #expect(Placement.continues(answers, total: 16))
        answers += [A(unit: "prima-2", right: false), A(unit: "prima-3", right: false)]
        #expect(!Placement.continues(answers, total: 16))
        #expect(Placement.start(answers) == "prima-2")
        #expect(course.firstLesson(ofUnit: "prima-2")?.lesson.id == "prima-2-1")
        #expect(Placement.start([A(unit: "prima-1", right: true)]) == nil)
        #expect(!Placement.continues(Array(repeating: A(unit: "prima-1", right: true), count: 16), total: 16))
    }
}

@Suite struct ForgeTests {
    /// A fixed generator, so a failure repeats.
    struct Seeded: RandomNumberGenerator {
        var state: UInt64
        mutating func next() -> UInt64 {
            state = state &* 6364136223846793005 &+ 1442695040888963407
            return state
        }
    }

    @Test func theTablesDecodeAndHangTogether() throws {
        let library = try ContentLibrary(directory: Paths.content)
        let lessons = Set(library.course.lessons.map(\.lesson.id))
        #expect(library.paradigms.count >= 40)
        for p in library.paradigms {
            #expect(p.kind != nil, "\(p.id)")
            #expect(p.names.count == p.rows.count, "\(p.id)")
            #expect(p.rows.allSatisfy { $0.cells.count == p.cols.count }, "\(p.id)")
            if let lesson = p.lesson { #expect(lessons.contains(lesson), "\(p.id)") }
        }
        let dies = try #require(library.paradigms.first { $0.id == "dies" })
        #expect(Forge.cellForms(dies.rows[1].cells[0]) == ["diēī"])
        let isEaId = try #require(library.paradigms.first { $0.id == "is" })
        #expect(Forge.cellForms(isEaId.rows[5].cells[0]) == ["eī", "iī"])
    }

    @Test func namingNeverOffersAnotherRightAnswer() throws {
        let library = try ContentLibrary(directory: Paths.content)
        var rng = Seeded(state: 7)
        for p in library.paradigms {
            for _ in 0..<5 {
                guard case .name(_, let cell, let form, let options, let answer) = Forge.name(p, using: &rng) else {
                    Issue.record("not a naming question"); continue
                }
                #expect(options[answer] == p.names[cell.row][cell.col])
                #expect(Set(options).count == options.count, "\(p.id)")
                let plain = form.replacingOccurrences(of: "|", with: "")
                // No wrong option may name a cell that holds the same form.
                for (i, o) in options.enumerated() where i != answer {
                    for r in p.rows.indices {
                        for c in p.cols.indices where p.names[r][c] == o {
                            #expect(!Forge.cellForms(p.rows[r].cells[c]).contains(plain), "\(p.id): \(o) also fits \(plain)")
                        }
                    }
                }
            }
        }
    }

    @Test func roundsFollowTheScope() throws {
        let library = try ContentLibrary(directory: Paths.content)
        var rng = Seeded(state: 11)
        let nouns = Forge.scope(library.paradigms, kinds: [.noun], learned: nil)
        #expect(!nouns.isEmpty && nouns.allSatisfy { $0.kind == .noun })
        let early = Forge.scope(library.paradigms, kinds: Set(Paradigm.Kind.allCases), learned: ["prima-2-3"])
        #expect(early.map(\.id) == ["puella"])
        let round = Forge.round(nouns, mode: .chart, length: 10, using: &rng)
        #expect(round.count == 10)
        for case .chart(let p, let blanks) in round {
            #expect(blanks.count == min(5, p.cellCount))
            #expect(Set(blanks).count == blanks.count)
        }
        #expect(Forge.round([], mode: .make, length: 10, using: &rng).isEmpty)
    }
}
