package com.norvodesigns.lectio.core

import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The Kotlin ports must agree with the web app exactly, or two devices syncing
 * one student's history would disagree about it. Every expected value here was
 * produced by running the real TypeScript (scripts/export-merge-fixtures.ts),
 * the same fixtures the Swift ports are held to.
 */
class ParityTests {
    @Test
    fun mergeMatchesTheWebApp() {
        val cases = Paths.fixture("merge.json")["cases"]!!.arrayValue!!
        assertTrue(cases.size >= 5)
        for (c in cases) {
            val name = c["name"]?.stringValue ?: "?"
            val local = c["local"]!!.objectValue!!
            val cloud = c["cloud"]!!.objectValue!!
            val cloudIsNewer = c["cloudIsNewer"]?.boolValue == true
            val expected = c["expected"]!!

            val merged = ProgressMerge.merge(local, cloud, cloudIsNewer)
            val diff = firstDifference(JSONValue.Obj(merged), expected)
            assertNull(diff, "$name: $diff")

            // Order is part of the contract where the web relies on it: the drafts cap evicts by insertion order.
            assertEquals(expected["scansionDrafts"]?.objectValue?.keys, merged.obj("scansionDrafts").keys, "$name: draft order")
            assertEquals(expected["vocab"]?.objectValue?.keys, merged.obj("vocab").keys, "$name: vocab order")
        }
    }

    @Test
    fun sm2MatchesTheWebApp() {
        val fixture = Paths.fixture("sm2.json")
        val now = parseISO(fixture["now"]!!.stringValue!!)
        for (c in fixture["cases"]!!.arrayValue!!) {
            var card: VocabCard = c["start"]!!.decode()
            for (step in c["steps"]!!.arrayValue!!) {
                card = SpacedRepetition.review(card, step["quality"]!!.intValue!!, now, utc)
                val diff = firstDifference(JSONValue.encoding(serializer<VocabCard>(), card), step["card"]!!)
                assertNull(diff, diff)
            }
        }
    }

    @Test
    fun streaksMatchTheWebApp() {
        val fixture = Paths.fixture("streaks.json")
        val now = parseISO(fixture["now"]!!.stringValue!!)
        for (c in fixture["cases"]!!.arrayValue!!) {
            val days = c["studyDays"]!!.arrayValue!!.mapNotNull { it.stringValue }
            assertEquals(c["current"]?.intValue, Streaks.current(days, now, utc), "current $days")
            assertEquals(c["longest"]?.intValue, Streaks.longest(days), "longest $days")
        }
    }

    @Test
    fun mergeIsIdempotent() {
        val c = Paths.fixture("merge.json")["cases"]!!.arrayValue!!.first()
        val local = c["local"]!!.objectValue!!
        val cloud = c["cloud"]!!.objectValue!!
        val once = ProgressMerge.merge(local, cloud, true)
        val twice = ProgressMerge.merge(once, cloud, true)
        assertNull(firstDifference(JSONValue.Obj(once), JSONValue.Obj(twice)))
    }

    @Test
    fun mergeCarriesFieldsThisBuildDoesNotKnow() {
        val local = ProgressDocument.blank().raw.copy()
        val cloud = ProgressDocument.blank().raw.copy()
        local["futureLocalOnly"] = JSONValue.Str("kept")
        cloud["futureFeature"] = jobj("a" to 1)
        val merged = ProgressMerge.merge(local, cloud, cloudIsNewer = false)
        assertEquals(jobj("a" to 1), merged["futureFeature"])
        assertEquals(JSONValue.Str("kept"), merged["futureLocalOnly"])
    }

    @Test
    fun scansionUnpackingMatchesTheWebApp() {
        val fixture = Paths.fixture("scansion.json")
        for (c in fixture["lines"]!!.arrayValue!!) {
            val book = c["book"]!!.intValue!!
            val packed: ScansionCorpus.PackedLine = c["packed"]!!.decode()
            val line = ScansionCorpus.unpack(book, packed)
            val diff = firstDifference(JSONValue.encoding(serializer<ScansionLine>(), line), c["expected"]!!)
            assertNull(diff, "${line.id}: $diff")
        }
    }

    @Test
    fun scansionStatsAndBadgesMatchTheWebApp() {
        val fixture = Paths.fixture("scansion.json")
        val attempts: List<ScansionAttempt> = fixture["attempts"]!!.decode()
        val stats = ScansionStats.byLine(attempts)
        for ((id, expected) in fixture["stats"]!!.objectValue!!) {
            val s = assertNotNull(stats[id])
            assertEquals(expected["attempts"]?.intValue, s.attempts)
            assertEquals(expected["bestAccuracy"]?.doubleValue, s.bestAccuracy)
            assertEquals(expected["lastAccuracy"]?.doubleValue, s.lastAccuracy)
            assertEquals(expected["mastered"]?.boolValue, s.mastered)
        }
        for (c in fixture["badgeCases"]!!.arrayValue!!) {
            val a: List<ScansionAttempt> = c["attempts"]!!.decode()
            val badges = ScansionStats.badges(a, c["poolSize"]!!.intValue!!)
            val expected = c["badges"]!!.arrayValue!!
            assertEquals(expected.mapNotNull { it["id"]?.stringValue }, badges.map { it.id })
            assertEquals(expected.mapNotNull { it["earned"]?.boolValue }, badges.map { it.earned })
            assertEquals(expected.mapNotNull { it["detail"]?.stringValue }, badges.map { it.detail })
        }
    }

    @Test
    fun corpusLoadsFromTheWebsitesFiles() {
        val corpus = ScansionCorpus(DirectorySource(Paths.scansion))
        assertTrue(corpus.index.total > 6000)
        val book1 = corpus.loadBook(1)
        assertEquals(corpus.index.books.first { it.book == 1 }.count, book1.size)
        assertEquals(1, ScansionCorpus.parseLineId(book1[0].id)?.first)
    }

    @Test
    fun scansionGradingFollowsTheWebRules() {
        val line = ScansionCorpus(DirectorySource(Paths.scansion)).loadBook(1).first { l -> l.syllables.none { it.isElided } }
        val work = ScansionWork(line, null)
        // Mark every syllable correctly and rule the real boundaries.
        line.syllables.forEachIndexed { i, s -> work.setMark(i, s.quantity) }
        val metrical = work.metricalIndices
        for (d in work.correctDivisions) work.toggleDivision(metrical[d])
        assertTrue(work.isReady)
        assertEquals(line.feet.map { if (it == "dactyl") "Dactyl" else "Spondee" }, work.groups.mapNotNull { work.footName(it) })
        val score = work.score
        assertEquals(score.total, score.correct)
        // The last syllable is anceps: short is right there too.
        work.setMark(line.syllables.size - 1, "short")
        assertEquals(score.total, work.score.correct)
        // Claiming a false elision costs that junction and clears its mark.
        val junction = work.elidableIndices.first()
        work.toggleElision(junction)
        assertNull(work.marks[junction])
        assertTrue(work.score.correct < score.total)
    }

    @Test
    fun lessonChecksMatchTheWebApp() {
        val f = Paths.fixture("lessonCheck.json")
        for (c in f["foldLatin"]!!.arrayValue!!) assertEquals(c["output"]?.stringValue, LessonCheck.foldLatin(c["input"]!!.stringValue!!), "foldLatin(${c["input"]})")
        for (c in f["foldEnglish"]!!.arrayValue!!) assertEquals(c["output"]?.stringValue, LessonCheck.foldEnglish(c["input"]!!.stringValue!!), "foldEnglish(${c["input"]})")
        for (c in f["typed"]!!.arrayValue!!) {
            val accepted = c["accepted"]!!.arrayValue!!.mapNotNull { it.stringValue }
            assertEquals(c["right"]?.boolValue, LessonCheck.checkTyped(c["answer"]!!.stringValue!!, accepted), "typed ${c["answer"]}")
        }
        for (c in f["translation"]!!.arrayValue!!) {
            val accepted = c["accepted"]!!.arrayValue!!.mapNotNull { it.stringValue }
            assertEquals(c["right"]?.boolValue, LessonCheck.checkTranslation(c["answer"]!!.stringValue!!, accepted), "translation ${c["answer"]}")
        }
        for (c in f["build"]!!.arrayValue!!) {
            val step = BuildStep(lang = c["lang"]!!.stringValue!!, answer = c["answer"]!!.arrayValue!!.mapNotNull { it.stringValue }, anyOrder = c["anyOrder"]?.boolValue)
            val placed = c["placed"]!!.arrayValue!!.mapNotNull { it.stringValue }
            assertEquals(c["right"]?.boolValue, LessonCheck.checkBuild(placed, step), "build $placed")
        }
        for (c in f["score"]!!.arrayValue!!) assertEquals(c["score"]?.doubleValue, LessonCheck.score(c["right"]!!.intValue!!, c["total"]!!.intValue!!))
    }

    @Test
    fun laurelsMatchTheWeb() {
        val course = Paths.library.course
        val fixture = Paths.fixture("laurels.json")
        val specs = fixture["specs"]!!.arrayValue!!
        assertEquals(Laurels.specs.size, specs.size)
        Laurels.specs.zip(specs).forEach { (s, e) ->
            assertEquals(e["id"]?.stringValue, s.id)
            assertEquals(e["latin"]?.stringValue, s.latin)
            assertEquals(e["title"]?.stringValue, s.title)
            assertEquals(e["detail"]?.stringValue, s.detail)
            assertEquals(e["target"]?.intValue, s.target)
        }
        for (c in fixture["cases"]!!.arrayValue!!) {
            val name = c["name"]?.stringValue ?: ""
            val doc = ProgressDocument(c["data"]!!.objectValue!!)
            val got = Laurels.all(doc, course)
            for ((g, e) in got.zip(c["expected"]!!.arrayValue!!)) {
                assertEquals(e["id"]?.stringValue, g.id, name)
                assertEquals(e["have"]?.intValue, g.have, "$name ${g.id}")
                assertEquals(e["earned"]?.boolValue, g.earned, "$name ${g.id}")
            }
            assertEquals(c["next"]?.stringValue, Laurels.next(got)?.id, "$name next")
        }
    }

    @Test
    fun recapMatchesTheWeb() {
        val fixture = Paths.fixture("recap.json")
        for (c in fixture["cases"]!!.arrayValue!!) {
            val name = c["name"]?.stringValue ?: ""
            val doc = ProgressDocument(c["data"]!!.objectValue!!)
            val r = Recap.of(doc, c["today"]!!.stringValue!!)
            val e = c["expected"]!!
            assertEquals(e["from"]?.stringValue, r.from, name)
            assertEquals(e["to"]?.stringValue, r.to, name)
            for ((label, got) in listOf("week" to r.week, "before" to r.before)) {
                val x = e[label]!!
                fun n(k: String) = x[k]?.doubleValue?.toInt() ?: -1
                val want = RecapCounts(n("days"), n("lessons"), n("quiz"), n("quizRight"), n("cards"), n("sententiae"), n("scansion"), n("translations"))
                assertEquals(want, got, "$name $label")
            }
        }
    }

    @Test
    fun speedGlossesAndWordsMatchTheWeb() {
        val f = Paths.fixture("speed.json")
        for (g in f["gloss"]!!.arrayValue!!) assertEquals(g["output"]?.stringValue, SpeedRound.shortGloss(g["input"]!!.stringValue!!), "${g["input"]}")
        val entries = f["words"]!!["entries"]!!.arrayValue!!.map {
            VocabEntry(it["id"]!!.stringValue!!, it["headword"]!!.stringValue!!, it["headword"]!!.stringValue!!, "", it["definition"]!!.stringValue!!)
        }
        assertEquals(f["words"]!!["ids"]!!.arrayValue!!.mapNotNull { it.stringValue }, SpeedRound.words(entries).map { it.id })
    }

    @Test
    fun sentenceFormsAndNearMissesMatchTheWeb() {
        val f = Paths.fixture("sentences.json")
        val builder = Paths.library.sentences
        assertEquals(f["sentences"]?.intValue, builder.sources.size)
        for (c in f["otherForms"]!!.arrayValue!!) {
            val word = c["word"]!!.stringValue!!
            assertEquals(c["forms"]!!.arrayValue!!.mapNotNull { it.stringValue }, builder.otherForms(word).sorted(), word)
        }
        for (c in f["nearMiss"]!!.arrayValue!!) {
            val word = c["word"]!!.stringValue!!
            assertEquals(c["out"]?.stringValue, builder.nearMiss(word), word)
        }
    }
}
