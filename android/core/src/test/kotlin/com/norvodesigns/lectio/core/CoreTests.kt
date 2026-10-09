package com.norvodesigns.lectio.core

import kotlinx.coroutines.runBlocking
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class JSONTests {
    @Test
    fun roundTripsKeepingKeyOrder() {
        val text = """{"z":1,"a":[true,false,null],"m":{"y":"é\n\"q\"","b":2.5,"c":-3e-7}}"""
        val value = JSONValue.parse(text)
        assertEquals(listOf("z", "a", "m"), value.objectValue?.keys)
        assertEquals(listOf("y", "b", "c"), value["m"]?.objectValue?.keys)
        assertEquals(value, JSONValue.parse(value.serialized()))
        assertEquals("é\n\"q\"", value["m"]?.get("y")?.stringValue)
    }

    @Test
    fun formatsNumbersLikeJavaScript() {
        assertEquals("6", JSONValue.Num(6.0).serialized())
        assertEquals("-2", JSONValue.Num(-2.0).serialized())
        assertEquals("2.36", JSONValue.Num(2.36).serialized())
        assertEquals("2.1399999999999997", JSONValue.Num(2.1399999999999997).serialized())
        assertEquals("1e-7", JSONValue.Num(1e-7).serialized())
        assertEquals("0.0000015", JSONValue.Num(1.5e-6).serialized())
        assertEquals("12345678.5", JSONValue.Num(12345678.5).serialized())
        assertEquals("null", JSONValue.Num(Double.NaN).serialized())
    }

    @Test
    fun decodesSurrogatePairs() {
        assertEquals("🏛", JSONValue.parse("\"🏛\"").stringValue)
        assertEquals("🏛", JSONValue.parse("\"\\ud83c\\udfdb\"").stringValue)
    }

    @Test
    fun rejectsMalformedInput() {
        assertFailsWith<JSONParseError> { JSONValue.parse("""{"a":1,}""") }
        assertFailsWith<JSONParseError> { JSONValue.parse("[1 2]") }
        assertFailsWith<JSONParseError> { JSONValue.parse("tru") }
    }

    @Test
    fun objectAssignmentBehavesLikeJavaScript() {
        val o = JSONObject()
        o["a"] = JSONValue.Num(1.0)
        o["b"] = JSONValue.Num(2.0)
        o["a"] = JSONValue.Num(3.0)
        assertEquals(listOf("a", "b"), o.keys)
        o["a"] = null
        o["a"] = JSONValue.Num(4.0)
        assertEquals(listOf("b", "a"), o.keys)
        o.removeFirst(1)
        assertEquals(listOf("a"), o.keys)
    }
}

class ProgressDocumentTests {
    private val now = parseISO("2026-10-15T12:00:00.000Z")

    @Test
    fun editsKeepFieldsThisBuildDoesNotKnow() {
        val raw = ProgressDocument.blank(now).raw.copy()
        raw["vocab"] = jobj("arma" to jobj("id" to "arma", "ef" to 2.5, "interval" to 0, "repetitions" to 0, "due" to "2026-10-15", "lapses" to 0, "reviews" to 0, "futureField" to "keep me"))
        raw["passages"] = jobj("p1" to jobj("notes" to "", "bookmarked" to false, "flaggedLines" to jarr(), "coldReads" to 0, "annotations" to jarr(), "futurePassageField" to 7))
        val doc = ProgressDocument(raw, now)
        doc.reviewVocab("arma", 5, now, utc)
        doc.toggleBookmark("p1")
        assertEquals(JSONValue.Str("keep me"), doc.raw.obj("vocab")["arma"]?.get("futureField"))
        assertEquals(JSONValue.Num(1.0), doc.raw.obj("vocab")["arma"]?.get("reviews"))
        assertEquals(JSONValue.Num(7.0), doc.raw.obj("passages")["p1"]?.get("futurePassageField"))
        assertTrue(doc.passage("p1").bookmarked)
    }

    @Test
    fun quizUpdatesReviewQueueLikeTheWeb() {
        val doc = ProgressDocument.blank(now)
        doc.recordQuiz("q1", false, "b", "meter", "1", "4", now = now)
        doc.recordQuiz("q1", false, "c", "meter", "1", "4", now = now)
        assertEquals(listOf("q1"), doc.reviewQueue)
        doc.recordQuiz("q1", true, "a", "meter", "1", "4", now = now)
        assertTrue(doc.reviewQueue.isEmpty())
        assertEquals(3, doc.quizAttempts.size)
        assertEquals("2026-10-15T12:00:00.000Z", doc.quizAttempts.last().at)
    }

    @Test
    fun encounteringAWordSeedsIt() {
        val doc = ProgressDocument.blank(now)
        doc.encounterWord("arma", "vergil-1-1", now)
        doc.encounterWord("arma", "vergil-1-1", now)
        doc.encounterWord("arma", "vergil-4-305", now)
        assertEquals("2026-10-15", doc.card("arma")?.due)
        assertEquals(WordEncounter(3, "2026-10-15", listOf("vergil-1-1", "vergil-4-305")), doc.wordEncounters["arma"])
    }

    @Test
    fun exportImportRoundTrips() {
        val doc = ProgressDocument.blank(now)
        doc.markStudied(now)
        doc.setTheme("dark")
        val restored = ProgressDocument.importJson(doc.exportJson(now), now)
        assertEquals(doc.raw, restored.raw)
        val e = assertFailsWith<ProgressDocument.ImportException> { ProgressDocument.importJson("""{"app":"other","data":{}}""") }
        assertEquals(ProgressDocument.ImportException.Reason.NotAnExport, e.reason)
    }

    @Test
    fun blankFillsMissingFields() {
        val doc = ProgressDocument(JSONObject("theme" to JSONValue.Str("dark")), now)
        assertEquals("dark", doc.theme)
        assertEquals(30, doc.studyPlan.minutesPerDay)
        assertEquals(ProgressMerge.knownKeys.size, doc.raw.keys.size)
    }

    @Test
    fun daysUntilExamCountsLocalDays() {
        assertEquals(211, Streaks.daysUntilExam("2027-05-14", now, utc))
        assertEquals(0, Streaks.daysUntilExam("2020-01-01", now, utc))
    }

    @Test
    fun highlightingOverMarksAbsorbsThemButKeepsNotes() {
        val doc = ProgressDocument.blank(now)
        doc.setHighlight("p", 3, 2, 2, "a", HighlightColor.WOAD, now)
        val noted = doc.setHighlight("p", 3, 4, 4, "b", HighlightColor.GILT, now)
        doc.setAnnotationNote("p", noted.id, "keep me")
        doc.setHighlight("p", 3, 0, 6, "a b c", HighlightColor.RUBRIC, now)
        assertEquals(listOf("4-4", "0-6"), doc.passage("p").annotations.map { "${it.startTok}-${it.endTok}" })
    }

    @Test
    fun clearingTheColorOfAnUnnotedMarkRemovesIt() {
        val doc = ProgressDocument.blank(now)
        doc.setHighlight("p", 1, 0, 2, "x", HighlightColor.GILT, now)
        doc.setHighlight("p", 1, 0, 2, "x", null, now)
        assertTrue(doc.passage("p").annotations.isEmpty())
    }

    @Test
    fun aNoteCanLiveWithoutAColor() {
        val doc = ProgressDocument.blank(now)
        val a = doc.setHighlight("p", 1, 0, 0, "x", null, now)
        assertEquals(1, doc.passage("p").annotations.size)
        doc.setAnnotationNote("p", a.id, "a thought")
        assertEquals("a thought", doc.passage("p").annotations.first().note)
        doc.setAnnotationNote("p", a.id, "  ")
        assertTrue(doc.passage("p").annotations.isEmpty())
    }

    @Test
    fun colorIsWrittenAsExplicitNull() {
        val doc = ProgressDocument.blank(now)
        doc.setHighlight("p", 1, 0, 0, "x", null, now)
        val stored = doc.raw.obj("passages")["p"]?.get("annotations")?.arrayValue?.first()
        assertEquals(JSONValue.Null, stored?.get("color"))
    }

    @Test
    fun aiUsageCountsPerDayAndRoute() {
        val doc = ProgressDocument.blank(now)
        doc.recordAiCall("ask", now)
        doc.recordAiCall("ask", now)
        doc.recordAiCall("grade-translation", now)
        val day = doc.raw.array("aiUsage").first()
        assertEquals(JSONValue.Num(3.0), day["calls"])
        assertEquals(JSONValue.Num(2.0), day["byRoute"]?.get("ask"))
    }

    @Test
    fun translationAttemptsAreCappedAndDecodable() {
        val doc = ProgressDocument.blank(now)
        repeat(505) { doc.recordTranslation("d", mapOf("s1" to "partial"), "t", 7.5, 15, listOf("ablative"), "self", now) }
        assertEquals(500, doc.translationAttempts.size)
        assertEquals(7.5, doc.translationAttempts.first().score)
    }

    @Test
    fun frqSavesReplaceTheSameResponse() {
        val doc = ProgressDocument.blank(now)
        val id = doc.saveFrq(null, "p", mapOf("a" to "draft"), emptyMap(), 10.0, false, now)
        doc.saveFrq(id, "p", mapOf("a" to "final"), mapOf("r1" to 2.0), 60.0, true, now)
        assertEquals(1, doc.frqResponses.size)
        assertEquals("final", doc.frqResponses.first().answers["a"])
    }

    @Test
    fun draftsEvictTheOldestFirst() {
        val doc = ProgressDocument.blank(now)
        for (i in 0 until 305) doc.saveScansionDraft("aen1-$i", ScansionDraft(listOf("long", null), emptyList()))
        val keys = doc.raw.obj("scansionDrafts").keys
        assertEquals(300, keys.size)
        assertEquals("aen1-5", keys.first())
        assertEquals(jarr("long", null), doc.raw.obj("scansionDrafts")["aen1-5"]?.get("marks"))
        assertEquals(listOf("long", null), doc.scansionDraft("aen1-304")?.marks)
    }

    @Test
    fun examAndProjectPassagesRoundTrip() {
        val doc = ProgressDocument.blank(now)
        doc.recordExam(40, 52, 20.0, 30.0, mapOf("1" to Tally(10, 12)), emptyMap(), 3600.0, 6000.0, now)
        assertEquals(12, doc.examResults.first().bySkill["1"]?.total)
        val p = ProjectPassage("pp", "t", "Ovid", "Met. 1", "poetry", "in nova", "", "", "")
        doc.upsertProjectPassage(p)
        doc.upsertProjectPassage(p.copy(notes = "edited"))
        assertEquals(listOf("edited"), doc.projectPassages.map { it.notes })
        doc.removeProjectPassage("pp")
        assertTrue(doc.projectPassages.isEmpty())
    }

    @Test
    fun completingALessonRecordsItSeedsWordsAndCountsTheDay() {
        val doc = ProgressDocument.blank()
        val first = parseISO("2026-10-01T09:00:00.000Z")
        val second = parseISO("2026-10-03T09:00:00.000Z")
        doc.completeLesson("prima-1-1", 0.75, listOf("puella", "sum"), first)
        doc.completeLesson("prima-1-1", 0.5, listOf("puella"), second)
        val p = assertNotNull(doc.lessons["prima-1-1"])
        assertEquals("2026-10-01T09:00:00.000Z", p.completedAt)
        assertEquals("2026-10-03T09:00:00.000Z", p.lastAt)
        assertEquals(0.75, p.best)
        assertEquals(2, p.attempts)
        assertEquals(listOf("puella", "sum"), doc.vocab.keys.sorted())
        assertEquals(listOf("2026-10-01", "2026-10-03"), doc.studyDays)
    }

    @Test
    fun learnerRoundTripsWithAnExplicitNull() {
        val doc = ProgressDocument.blank()
        assertNull(doc.learner)
        doc.setLearner(LearnerProfile("new", null, "2026-10-01T00:00:00.000Z"))
        assertEquals("new", doc.learner?.track)
        assertEquals(JSONValue.Null, doc.raw["learner"]?.get("startLessonId"))
        doc.setLearner(null)
        assertEquals(JSONValue.Null, doc.raw["learner"])
    }

    @Test
    fun aSecondGoKeepsTheBetterScore() {
        val doc = ProgressDocument.blank()
        doc.completeDaily("2026-10-01", "carpe-diem", 0.33)
        doc.completeDaily("2026-10-01", "carpe-diem", 1.0)
        doc.completeDaily("2026-10-01", "carpe-diem", 0.67)
        assertEquals(1.0, doc.daily["2026-10-01"]?.score)
        assertEquals(1, doc.daily.size)
        assertTrue(doc.studyDays.isNotEmpty())
    }
}

class ContentTests {
    private val library get() = Paths.library

    @Test
    fun loadsEveryFile() {
        assertTrue(library.passages.size > 40)
        assertTrue(library.coreVocabulary.size >= 990)
        assertTrue(library.questions.isNotEmpty())
        assertTrue(library.grammarTopics.isNotEmpty())
        assertTrue(library.translationDrills.isNotEmpty())
        assertEquals("2027-05-14", library.meta.examDate)
    }

    @Test
    fun everyGlossResolvesAndTokensReassembleTheLine() {
        val unresolved = ArrayList<String>()
        for (passage in library.passages) for (line in passage.lines) {
            for (token in line.tokens) if (token.isWord) for (g in token.glosses) {
                if (library.vocab(g.id) == null) unresolved.add("${passage.id} ${line.n} ${token.text} -> ${g.id}")
            }
            assertEquals(line.latin, line.tokens.joinToString("") { it.text }, "${passage.id} ${line.n}")
        }
        assertTrue(unresolved.isEmpty(), unresolved.take(5).toString())
    }

    @Test
    fun everyAnswerKeyIsAnOption() {
        for (q in library.questions + library.sightQuestions) assertTrue(q.options.any { it.id == q.answerId }, q.id)
    }

    @Test
    fun theBundledCourseDecodesAndHangsTogether() {
        val course = library.course
        assertTrue(course.levels.isNotEmpty())
        assertTrue(course.lessons.size >= 8)
        assertEquals("prima-1-1", course.lessons.first().lesson.id)
        assertFalse(course.lessons.flatMap { it.lesson.steps }.any { it is UnknownStep })
        for (place in course.lessons) {
            assertTrue(place.lesson.exerciseCount >= 3 || place.lesson.isTest || place.level.isVocabulary, place.lesson.id)
            for (s in place.lesson.steps) {
                if (s is ChoiceStep) assertTrue(s.answer in s.options.indices)
                if (s is MatchStep) assertTrue(s.pairs.all { it.size == 2 })
            }
        }
    }

    @Test
    fun nextLessonMatchesTheWeb() {
        val course = library.course
        val ids = course.grammarLessons.map { it.lesson.id }
        assertEquals(ids[0], course.next(emptySet())?.lesson?.id)
        assertEquals(ids[2], course.next(setOf(ids[0], ids[1]))?.lesson?.id)
        assertEquals(ids[3], course.next(emptySet(), ids[3])?.lesson?.id)
        assertEquals(ids[0], course.next(ids.drop(3).toSet(), ids[3])?.lesson?.id)
        assertNull(course.next(ids.toSet()))
        assertEquals(ids[1], course.after(ids[0])?.lesson?.id)
    }

    @Test
    fun placement() {
        val course = library.course
        assertTrue(course.placement.size >= 10)
        val answers = mutableListOf(Placement.Answer("prima-1", true), Placement.Answer("prima-1", true), Placement.Answer("prima-2", false))
        assertTrue(Placement.continues(answers, 16))
        answers += listOf(Placement.Answer("prima-2", false), Placement.Answer("prima-3", false))
        assertFalse(Placement.continues(answers, 16))
        assertEquals("prima-2", Placement.start(answers))
        assertEquals("prima-2-1", course.firstLesson("prima-2")?.lesson?.id)
        assertNull(Placement.start(listOf(Placement.Answer("prima-1", true))))
        assertEquals("c", Placement.unitBeyond(listOf("a", "b", "c", "d"), listOf("a", "b", "b")))
        assertNull(Placement.unitBeyond(listOf("a", "b"), listOf("a", "b")))
        assertEquals("a", Placement.unitBeyond(listOf("a", "b"), emptyList()))
        // A perfect score lands on the level that reads the AP texts.
        assertEquals("quarta-1", Placement.unitBeyond(course.unitIds, course.placement.map { it.unit }))
    }

    @Test
    fun reviewDrawsOnlyFromFinishedLessonsWithoutRepeats() {
        val course = library.course
        val rng = Random(7)
        assertNull(course.review(emptyMap(), rng = rng))
        val ids = course.lessons.take(4).map { it.lesson.id }
        val at = "2026-09-01T12:00:00.000Z"
        val finished = ids.associateWith { LessonProgress(at, at, 0.8, 1) }
        val allowed = course.reviewable(finished).flatMap { it.lesson.reviewExercises }.toSet()
        repeat(20) {
            val review = assertNotNull(course.review(finished, rng = rng))
            assertTrue(CourseIds.isReview(review.lesson.id))
            assertEquals(minOf(CourseIds.reviewLength, allowed.size), review.lesson.steps.size)
            assertTrue(review.lesson.steps.all { it in allowed })
            assertNull(course.place(review.lesson.id))
        }
    }

    @Test
    fun readingLessonsKeepOnlySelfContainedQuestionsForReview() {
        val course = library.course
        val readings = course.lessons.filter { p -> p.lesson.steps.any { it is ReadStep } }
        val reading = readings.first { p -> p.lesson.steps.any { it is ChoiceStep && it.latin == null } }
        val kept = reading.lesson.reviewExercises
        assertTrue(kept.size < reading.lesson.exerciseCount)
        assertFalse(kept.any { it is ChoiceStep && it.latin == null })
        val plain = course.lessons.first { it !in readings && it.lesson.exerciseCount > 0 }
        assertEquals(plain.lesson.exerciseCount, plain.lesson.reviewExercises.size)

        val now = parseISO("2026-09-30T12:00:00Z")
        val weakOld = LessonProgress("2026-08-01T12:00:00.000Z", "2026-08-01T12:00:00.000Z", 0.4, 1)
        val strongNew = LessonProgress("2026-09-30T11:00:00.000Z", "2026-09-30T11:00:00.000Z", 1.0, 1)
        assertTrue(course.reviewWeight(weakOld, now) > course.reviewWeight(strongNew, now) * 5)
    }

    @Test
    fun dailyLinesDecodeAndTodayIsStable() {
        val list = library.sententiae
        assertTrue(list.size >= 40)
        assertEquals(list.size, list.map { it.id }.toSet().size)
        for (s in list) {
            assertEquals(3, s.steps.count { it.isExercise }, s.id)
            assertFalse(s.steps.any { it is UnknownStep }, s.id)
        }
        val a = assertNotNull(Daily.sententia("2026-10-01", list))
        val b = assertNotNull(Daily.sententia("2026-10-02", list))
        val i = list.indexOf(a)
        assertEquals(list[(i + 1) % list.size], b)
        assertEquals(a, Daily.sententia(Daily.shift("2026-10-01", list.size), list))
        val place = Daily.lesson(list.first(), "2026-10-01")
        assertEquals("daily-2026-10-01", place.lesson.id)
        assertEquals("2026-10-01", Daily.day(place.lesson.id))
        assertEquals(3, place.lesson.exerciseCount)
        assertEquals(5, place.lesson.steps.size)
    }

    @Test
    fun dailyStreakCountsBackFromTodayOrYesterday() {
        val r = DailyResult("x", 1.0, "")
        val done = listOf("2026-02-27", "2026-02-28", "2026-03-01").associateWith { r }
        assertEquals("2026-02-28", Daily.shift("2026-03-01", -1))
        assertEquals("2024-02-29", Daily.shift("2024-02-28", 1))
        assertEquals(3, Daily.streak(done, "2026-03-01"))
        assertEquals(3, Daily.streak(done, "2026-03-02"))
        assertEquals(0, Daily.streak(done, "2026-03-03"))
        assertEquals(0, Daily.streak(emptyMap(), "2026-03-03"))
    }

    @Test
    fun speedBoardsHoldDistinctPairsInAnotherOrder() {
        val pool = SpeedRound.words(library.coreVocabulary)
        assertTrue(pool.size > 500)
        val rng = Random(11)
        repeat(50) {
            val (left, right) = SpeedRound.deal(pool, rng = rng)
            assertEquals(SpeedRound.boardSize, left.size)
            assertEquals(left.toSet(), right.toSet())
            assertTrue(left != right)
            assertEquals(left.size, left.map { it.english }.toSet().size)
        }
    }

    @Test
    fun derivativesRoundsHaveOneRightAnswerPerQuestion() {
        val course = library.course
        val words = course.rootWords()
        assertTrue(words.size > 150)
        assertTrue(library.derivatives["multus"]?.contains("multitude") == true)
        val rng = Random(5)
        repeat(40) {
            val place = course.derivativesLesson(emptyMap(), rng = rng)
            assertTrue(CourseIds.isDerivatives(place.lesson.id))
            assertEquals(CourseIds.derivativesLength, place.lesson.steps.size)
            for (c in place.lesson.steps.filterIsInstance<ChoiceStep>()) {
                assertEquals(4, c.options.size, c.prompt)
                assertEquals(c.options.size, c.options.toSet().size, c.prompt)
                assertTrue(c.answer in c.options.indices)
                if (c.prompt.endsWith("comes from which Latin word?")) {
                    val derivative = c.prompt.split("*")[1].lowercase()
                    c.options.forEachIndexed { i, o ->
                        if (i == c.answer) return@forEachIndexed
                        val root = words.first { it.head == o }
                        assertFalse(root.derivatives.map { it.lowercase() }.contains(derivative), "$o also gives $derivative")
                    }
                }
            }
        }
    }

    @Test
    fun sentenceRoundsAreAnswerable() {
        val builder = library.sentences
        val rng = Random(9)
        var latin = 0
        for (i in 0 until 60) {
            val done = if (i % 2 == 0) emptyMap() else mapOf("prima-5-2" to LessonProgress("", "", 1.0, 1))
            val place = builder.lesson(done, rng = rng)
            assertTrue(SentenceBuilder.isSentences(place.lesson.id))
            assertEquals(SentenceBuilder.length, place.lesson.steps.size)
            for (b in place.lesson.steps.filterIsInstance<BuildStep>()) {
                assertTrue(LessonCheck.checkBuild(b.answer, b), b.source)
                val fold = { w: String -> if (b.isLatin) LessonCheck.foldLatin(w) else LessonCheck.foldTile(w) }
                val need = b.answer.map(fold).toSet()
                assertFalse(b.extra.any { fold(it) in need }, b.source)
                if (b.isLatin) latin++
            }
        }
        assertTrue(latin > 60)
    }

    @Test
    fun forgeTablesDecodeAndHangTogether() {
        val lessons = library.course.lessons.map { it.lesson.id }.toSet()
        assertTrue(library.paradigms.size >= 40)
        for (p in library.paradigms) {
            assertNotNull(p.kind, p.id)
            assertEquals(p.rows.size, p.names.size, p.id)
            assertTrue(p.rows.all { it.cells.size == p.cols.size }, p.id)
            p.lesson?.let { assertTrue(it in lessons, p.id) }
        }
        val dies = library.paradigms.first { it.id == "dies" }
        assertEquals(listOf("diēī"), Forge.cellForms(dies.rows[1].cells[0]))
        val isEaId = library.paradigms.first { it.id == "is" }
        assertEquals(listOf("eī", "iī"), Forge.cellForms(isEaId.rows[5].cells[0]))
    }

    @Test
    fun forgeNamingNeverOffersAnotherRightAnswer() {
        val rng = Random(7)
        for (p in library.paradigms) repeat(5) {
            val q = Forge.name(p, rng) as Forge.ForgeQuestion.Name
            assertEquals(p.names[q.cell.row][q.cell.col], q.options[q.answer])
            assertEquals(q.options.size, q.options.toSet().size, p.id)
            val plain = q.form.replace("|", "")
            q.options.forEachIndexed { i, o ->
                if (i == q.answer) return@forEachIndexed
                for (r in p.rows.indices) for (c in p.cols.indices) if (p.names[r][c] == o) {
                    assertFalse(Forge.cellForms(p.rows[r].cells[c]).contains(plain), "${p.id}: $o also fits $plain")
                }
            }
        }
    }

    @Test
    fun forgeRoundsFollowTheScope() {
        val rng = Random(11)
        val nouns = Forge.scope(library.paradigms, setOf(Paradigm.Kind.Noun), null)
        assertTrue(nouns.isNotEmpty() && nouns.all { it.kind == Paradigm.Kind.Noun })
        val early = Forge.scope(library.paradigms, Paradigm.Kind.entries.toSet(), setOf("prima-2-3"))
        assertEquals(listOf("puella"), early.map { it.id })
        val round = Forge.round(nouns, Forge.Mode.Chart, 10, rng)
        assertEquals(10, round.size)
        for (q in round) {
            q as Forge.ForgeQuestion.Chart
            assertEquals(minOf(5, q.paradigm.cellCount), q.blanks.size)
            assertEquals(q.blanks.size, q.blanks.toSet().size)
        }
        assertTrue(Forge.round(emptyList(), Forge.Mode.Make, 10, rng).isEmpty())
    }

    @Test
    fun examPapersHaveOneOfEachTypeAndTheRightLines() {
        assertEquals(library.translationDrills.size, library.examTranslationPrompts.size)
        repeat(20) {
            val paper = library.examPrompts()
            assertEquals(listOf("short-answer", "translation", "short-essay", "project-prose", "project-poetry"), paper.map { it.type })
            assertTrue(paper[1].latin?.isNotEmpty() == true)
        }
        for (prompt in library.frqPrompts) {
            val passage = prompt.passageId?.let { library.passage(it) } ?: continue
            val lines = prompt.lines(passage)
            assertTrue(lines.isNotEmpty())
            assertTrue(lines.size <= passage.lines.size)
            prompt.lineRange?.let { r -> assertTrue(lines.all { it.n >= r[0] && it.n <= r[1] }) }
        }
    }

    @Test
    fun theBundledManifestPassesItsOwnChecks() {
        val m = library.manifest
        val empty = ContentManifest(1, "", emptyList(), emptyMap())
        val newer = ContentManifest(m.schemaVersion, m.contentHash, listOf(""), m.files)
        assertTrue(ContentUpdate.shouldUpdate(empty, newer))
        assertFalse(ContentUpdate.shouldUpdate(m, m))
        assertEquals(m.files.size, ContentUpdate.changedFiles(empty, m).size)
    }
}

class InsightsTests {
    private val now = parseISO("2026-10-15T12:00:00.000Z")

    private fun quiz(type: String, correct: Boolean, skill: String = "1") =
        QuizAttempt("id", "q", correct, "a", "2026-10-15T00:00:00.000Z", type, skill, "4")

    @Test
    fun weakSpotsNeedASampleAndRankByUrgency() {
        val attempts = (0 until 6).map { quiz("meter", it < 2) } + (0 until 5).map { quiz("inference", false) } + (0 until 10).map { quiz("grammar-syntax", it < 9) }
        val spots = Insights.weakSpots(attempts, emptyList(), emptyList(), emptyMap(), mapOf("meter" to "Metre"))
        assertEquals(listOf("type-meter"), spots.map { it.id })
        assertEquals(33, spots.first().pct)
        assertEquals("Metre", spots.first().label)
    }

    @Test
    fun forecastBucketsTheWeek() {
        val vocab = listOf("2026-10-10", "2026-10-15", "2026-10-16", "2026-10-21", "2026-10-22").withIndex().associate { (i, due) ->
            "w$i" to VocabCard("w$i", 2.5, i * 10, 1, due, 0, 1)
        }
        val f = Insights.forecast(vocab, now)
        assertEquals(listOf(2, 1, 0, 0, 0, 0, 1), f.week)
        assertEquals(2, f.mature)
    }

    @Test
    fun masteryTalliesBySkill() {
        val m = Insights.mastery(listOf(quiz("meter", true, "2"), quiz("meter", false, "2")))
        assertEquals(Tally(1, 2), m["2"])
        assertEquals(Tally(0, 0), m["1"])
    }
}

class ContentUpdateTests {
    private val a = "a".repeat(64)
    private val b = "b".repeat(64)

    private fun manifest(hash: String, schema: Int = 1, files: Map<String, String>) =
        ContentManifest(schema, hash, if (hash == "h1") emptyList() else listOf("h1"), files)

    @Test
    fun downloadsOnlyWhatChanged() {
        val current = manifest("h1", files = mapOf("passages.json" to a, "vocabulary.json" to a))
        val remote = manifest("h2", files = mapOf("passages.json" to a, "vocabulary.json" to b, "lessons.json" to b))
        assertTrue(ContentUpdate.shouldUpdate(current, remote))
        assertEquals(listOf("lessons.json", "vocabulary.json"), ContentUpdate.changedFiles(current, remote))
    }

    @Test
    fun neverGoesBackwards() {
        val app = ContentManifest(1, "h2", listOf("h1"), mapOf("passages.json" to b))
        val website = manifest("h1", files = mapOf("passages.json" to a))
        assertFalse(ContentUpdate.shouldUpdate(app, website))
        val other = ContentManifest(1, "h9", listOf("h8"), mapOf("passages.json" to a))
        assertFalse(ContentUpdate.shouldUpdate(app, other))
    }

    @Test
    fun leavesSameOrUnreadableContentAlone() {
        val current = manifest("h1", files = mapOf("passages.json" to a))
        assertFalse(ContentUpdate.shouldUpdate(current, manifest("h1", files = mapOf("passages.json" to a))))
        assertFalse(ContentUpdate.shouldUpdate(current, manifest("h2", schema = 2, files = mapOf("passages.json" to b))))
        assertFalse(ContentUpdate.shouldUpdate(current, manifest("h2", files = emptyMap())))
        assertFalse(ContentUpdate.shouldUpdate(current, manifest("h2", files = mapOf("passages.json" to "nothex"))))
    }

    @Test
    fun refusesPaths() {
        val current = manifest("h1", files = mapOf("passages.json" to a))
        for (name in listOf("../progress.json", "/etc/x.json", "sub/passages.json", ".json", ".hidden.json", "manifest.json", "Passages.json", "passages.txt")) {
            assertFalse(ContentUpdate.isSafeFileName(name), name)
            assertFalse(ContentUpdate.shouldUpdate(current, manifest("h2", files = mapOf(name to b))))
        }
        assertTrue(ContentUpdate.isSafeFileName("lesson-plans_2.json"))
    }
}

class CloudSyncTests {
    private val now = parseISO("2026-10-15T12:00:00.000Z")

    private fun doc(studied: String, theme: String = "light"): ProgressDocument {
        val d = ProgressDocument.blank(now)
        d.markStudied(parseISO("${studied}T12:00:00.000Z"))
        d.setTheme(theme)
        return d
    }

    @Test
    fun firstSignInAdoptsLocalWhenNoCloudRow() {
        val local = doc("2026-10-14")
        val r = CloudSync.reconcile("u1", local, SyncBookkeeping(), null, now)
        assertEquals(local.raw, r.local.raw)
        assertEquals(local.raw, r.push?.raw)
    }

    @Test
    fun firstSignInMergesAndCloudWinsSettings() {
        val local = doc("2026-10-14", "light")
        val cloud = CloudProgress(doc("2026-10-10", "dark").raw, "2026-10-12T00:00:00.000+00:00")
        val r = CloudSync.reconcile("u1", local, SyncBookkeeping(), cloud, now)
        assertEquals(listOf("2026-10-10", "2026-10-14"), r.local.studyDays)
        assertEquals("dark", r.local.theme)
        assertEquals(r.local.raw, r.push?.raw)
        assertEquals(cloud.updatedAt, r.fallbackSyncedAt)
    }

    @Test
    fun sameAccountKeepsLocalSettingsWhenCloudIsNotNewer() {
        val local = doc("2026-10-14", "light")
        val cloud = CloudProgress(doc("2026-10-10", "dark").raw, "2026-10-12T00:00:00.000+00:00")
        val book = SyncBookkeeping("u1", "2026-10-12T00:00:00.000Z")
        val r = CloudSync.reconcile("u1", local, book, cloud, now)
        assertEquals("light", r.local.theme)
        assertEquals(listOf("2026-10-10", "2026-10-14"), r.local.studyDays)
    }

    @Test
    fun differentAccountNeverMergesTheOldLocalData() {
        val someoneElses = doc("2026-10-14")
        val book = SyncBookkeeping("previous", "2026-10-13T00:00:00.000Z")
        val cloud = CloudProgress(doc("2026-09-01").raw, "2026-10-01T00:00:00+00:00")
        val withCloud = CloudSync.reconcile("u2", someoneElses, book, cloud, now)
        assertEquals(listOf("2026-09-01"), withCloud.local.studyDays)
        assertNull(withCloud.push)
        val fresh = CloudSync.reconcile("u2", someoneElses, book, null, now)
        assertTrue(fresh.local.studyDays.isEmpty())
        assertEquals(fresh.local.raw, fresh.push?.raw)
    }

    @Test
    fun pullOnlyMergesGenuinelyNewRows() {
        val local = doc("2026-10-14")
        val cloud = CloudProgress(doc("2026-10-15").raw, "2026-10-15T09:00:00.123456+00:00")
        val seen = SyncBookkeeping("u1", "2026-10-15T09:00:00.123Z")
        assertNull(CloudSync.mergePulled("u1", local, seen, cloud, now))
        val older = SyncBookkeeping("u1", "2026-10-15T08:00:00.000Z")
        assertEquals(listOf("2026-10-14", "2026-10-15"), CloudSync.mergePulled("u1", local, older, cloud, now)?.studyDays)
        val otherUser = SyncBookkeeping("u9", null)
        assertNull(CloudSync.mergePulled("u1", local, otherUser, cloud, now))
    }

    @Test
    fun timestampsCompareAcrossFormats() {
        assertFalse(CloudSync.isLater("2026-09-28T05:15:29.123+00:00", "2026-09-28T05:15:29.123Z"))
        assertFalse(CloudSync.isLater("2026-09-28T05:15:29.1234+00:00", "2026-09-28T05:15:29.123Z"))
        assertTrue(CloudSync.isLater("2026-09-28T05:15:29.124+00:00", "2026-09-28T05:15:29.123Z"))
        assertTrue(CloudSync.isLater("2026-09-28T06:15:29+01:00", "2026-09-28T05:15:28Z"))
    }
}

class SupabaseTests {
    @Test
    fun parsesASession() {
        val json = JSONValue.parse(
            """{"access_token":"a","token_type":"bearer","expires_in":3600,"expires_at":1790000000,"refresh_token":"r",
            "user":{"id":"u1","email":"s@x.org","user_metadata":{"display_name":"Sam","role":"student"}}}""",
        )
        val s = SupabaseAPI.sessionFrom(json)
        assertEquals("u1", s.userId)
        assertEquals(1_790_000_000_000L, s.expiresAtMillis)
        assertEquals("Sam", s.displayName)
    }

    @Test
    fun readsBothErrorShapes() {
        val gotrue = SupabaseAPI.error(400, JSONValue.parse("""{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}"""))
        assertEquals("invalid_credentials", gotrue.code)
        assertEquals("Invalid login credentials", gotrue.message)
        val postgrest = SupabaseAPI.error(409, JSONValue.parse("""{"code":"23505","message":"duplicate key"}"""))
        assertEquals("23505", postgrest.code)
    }

    @Test
    fun validatesLikeTheWebForm() {
        assertNull(AuthManager.validate("student@school.org", "longenough"))
        assertNotNull(AuthManager.validate("not-an-email", "longenough"))
        assertNotNull(AuthManager.validate("a@b.co", "short"))
    }

    @Test
    fun pullKeepsTheDocumentsKeyOrderAndSendsTheHeaders() = runBlocking {
        val transport = HttpTransport { req ->
            assertEquals("anon", req.headers["apikey"])
            assertEquals("Bearer token", req.headers["Authorization"])
            assertTrue(req.url.startsWith("https://example.supabase.co/rest/v1/user_progress?select=data%2Cupdated_at"), req.url)
            HttpResponse(200, """[{"data":{"zeta":1,"alpha":{"b":1,"a":2}},"updated_at":"2026-10-15T09:00:00+00:00"}]""".toByteArray())
        }
        val api = SupabaseAPI("https://example.supabase.co", "anon", transport)
        val cloud = assertNotNull(api.pullProgress("token"))
        assertEquals(listOf("zeta", "alpha"), cloud.data.keys)
        assertEquals(listOf("b", "a"), cloud.data["alpha"]?.objectValue?.keys)
    }

    @Test
    fun authManagerRefreshesAnExpiringTokenOnce() = runBlocking {
        var refreshes = 0
        val transport = HttpTransport { req ->
            refreshes++
            assertTrue(req.url.contains("grant_type=refresh_token"))
            HttpResponse(200, """{"access_token":"new","refresh_token":"r2","expires_in":3600,"user":{"id":"u1"}}""".toByteArray())
        }
        val old = AuthSession("old", "r1", System.currentTimeMillis() + 10_000, "u1")
        val auth = AuthManager(SupabaseAPI("https://x", "anon", transport), InMemorySessionStorage(old))
        assertEquals("new", auth.accessToken())
        assertEquals("new", auth.accessToken())
        assertEquals(1, refreshes)
    }

    @Test
    fun authCallbacks() {
        assertEquals(AuthCallback.Session("rt"), AuthCallback.parse("lectio://auth-callback#access_token=a&refresh_token=rt&type=signup"))
        assertEquals(AuthCallback.Confirmed, AuthCallback.parse("lectio://auth-callback?confirmed=1"))
        assertEquals(AuthCallback.PasswordReset, AuthCallback.parse("lectio://auth-callback?reset=1"))
        assertEquals(AuthCallback.Failed("Email link is invalid or has expired"), AuthCallback.parse("lectio://auth-callback#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"))
        assertTrue(AuthCallback.parse("lectio://auth-callback") is AuthCallback.Failed)
        assertNull(AuthCallback.parse("https://lectio.norvodesigns.com/learn"))
        assertNull(AuthCallback.parse("lectio://learn/daily"))
    }
}
