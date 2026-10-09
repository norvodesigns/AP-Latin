package com.norvodesigns.lectio.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** The adaptive path against the web's src/lib/path.ts, through the fixtures `npm run export:fixtures` writes. */
class PathTests {
    private fun lessons(): List<PathLesson> = Paths.fixture("path.json")["lessons"]!!.decode()

    private fun intervals(o: JSONObject?): Map<String, Int> {
        val out = HashMap<String, Int>()
        for ((id, value) in o ?: JSONObject()) out[id] = value["interval"]?.intValue ?: 0
        return out
    }

    @Test
    fun nextWordsMatchesTheWebApp() {
        val fixture = Paths.fixture("path.json")
        assertEquals(Path.knownInterval, fixture["knownInterval"]?.intValue)
        val lessons = lessons()
        for (c in fixture["nextCases"]!!.arrayValue!!) {
            val done = HashMap<String, Boolean>()
            for ((id, value) in c["done"]?.objectValue ?: JSONObject()) done[id] = value.boolValue ?: true
            val known = (c["knownUnits"]?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }
            val next = Path.nextWords(lessons, done, intervals(c["vocab"]?.objectValue), known)
            assertEquals(c["expected"]?.stringValue, next?.id, c["name"]?.stringValue ?: "")
        }
    }

    @Test
    fun lessonKnownMatchesTheWebApp() {
        for (c in Paths.fixture("path.json")["knownCases"]!!.arrayValue!!) {
            val ids = (c["vocabIds"]?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }
            assertEquals(c["expected"]?.boolValue, Path.lessonKnown(ids, intervals(c["vocab"]?.objectValue)))
        }
    }

    @Test
    fun testOutMatchesTheWebApp() {
        val unit = lessons().filter { it.unitId == "v-1" }
        for (c in Paths.fixture("path.json")["testOutCases"]!!.arrayValue!!) {
            val done = (c["done"]?.objectValue ?: JSONObject()).map { it.first }.toSet()
            val deck = (c["vocab"]?.objectValue ?: JSONObject()).map { it.first }.toSet()
            val out = Path.testOut(unit, done, deck)
            assertEquals((c["expected"]?.get("lessonIds")?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }, out.lessonIds)
            assertEquals((c["expected"]?.get("vocabIds")?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }, out.vocabIds)
        }
    }

    @Test
    fun datesAndKnownCardsMatchTheWebApp() {
        val fixture = Paths.fixture("path.json")
        for (c in fixture["dayCases"]!!.arrayValue!!) {
            val iso = c["iso"]!!.stringValue!!
            val n = c["n"]!!.intValue!!
            assertEquals(c["expected"]?.stringValue, Path.addDays(iso, n), "$iso + $n")
        }
        for (c in fixture["cardCases"]!!.arrayValue!!) {
            val index = c["index"]!!.intValue!!
            val card = Path.knownCard("w$index", index, c["today"]!!.stringValue!!)
            val e = c["expected"]!!
            assertEquals(e["id"]?.stringValue, card.id)
            assertEquals(e["ef"]?.doubleValue, card.ef)
            assertEquals(e["interval"]?.intValue, card.interval)
            assertEquals(e["repetitions"]?.intValue, card.repetitions)
            assertEquals(e["due"]?.stringValue, card.due)
            assertEquals(e["lapses"]?.intValue, card.lapses)
            assertEquals(e["reviews"]?.intValue, card.reviews)
        }
    }

    @Test
    fun knownUnitsMatchTheWebApp() {
        for (c in Paths.fixture("path.json")["probeCases"]!!.arrayValue!!) {
            val answers = (c["answers"]?.arrayValue ?: emptyList()).mapNotNull { a ->
                val unit = a["unit"]?.stringValue ?: return@mapNotNull null
                val right = a["right"]?.boolValue ?: return@mapNotNull null
                Placement.Answer(unit, right)
            }
            assertEquals((c["expected"]?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }, Path.knownVocabUnits(answers))
        }
    }

    @Test
    fun shakyLessonMatchesTheWebApp() {
        for (c in Paths.fixture("path.json")["shakyCases"]!!.arrayValue!!) {
            val ids = (c["ids"]?.arrayValue ?: emptyList()).mapNotNull { it.stringValue }
            val records = HashMap<String, LessonProgress>()
            for ((id, r) in c["records"]?.objectValue ?: JSONObject()) {
                records[id] = LessonProgress("", r["lastAt"]?.stringValue ?: "", r["best"]?.doubleValue ?: 0.0, r["attempts"]?.intValue ?: 0)
            }
            assertEquals(c["expected"]?.stringValue, Path.shakyLesson(ids, records))
        }
    }

    @Test
    fun aPassedTestCountsTheUnitAndSpreadsItsWords() {
        val now = parseISO("2026-10-15T12:00:00Z")
        val doc = ProgressDocument.blank(now)
        doc.completeLesson("v-1-1", 0.8, listOf("a", "b", "c"), now)
        doc.passUnitTest(lessons().filter { it.unitId == "v-1" }, 0.9, now)
        // The lesson already done keeps its own record; the other is counted, untried.
        assertEquals(1, doc.lessons["v-1-1"]?.attempts)
        assertEquals(0, doc.lessons["v-1-2"]?.attempts)
        assertEquals(0.9, doc.lessons["v-1-2"]?.best)
        assertNull(doc.lessons["v-1-3"])
        // Words already in the deck are left alone; the new ones are known, spread out.
        assertEquals(0, doc.vocab["a"]?.interval)
        assertEquals(10, doc.vocab["d"]?.interval)
        assertEquals("2026-10-16", doc.vocab["d"]?.due)
        assertEquals("2026-10-17", doc.vocab["e"]?.due)
    }
}
