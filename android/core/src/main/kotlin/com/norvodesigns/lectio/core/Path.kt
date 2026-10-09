package com.norvodesigns.lectio.core

import java.time.LocalDate

/**
 * The adaptive part of the course: what to study next in the vocabulary
 * track, and what a passed unit test does. A line-for-line port of the web's
 * `src/lib/path.ts`, checked against fixtures its functions produce.
 *
 * The vocabulary track adapts to what the student already knows: a lesson
 * whose every word is already well known is passed over; a unit the level
 * check found probably known is offered as its unit test first; and a passed
 * unit test counts the unit's lessons as done and puts their words in the
 * deck as known, spread over three weeks.
 */
object Path {
    /** A card at least this many days between reviews counts as well known. */
    const val knownInterval = 21

    /** How many days a passed test's known words are spread over. */
    const val knownSpreadDays = 21

    /** The share of a unit test to get right to pass it (the web's `VERBA_TEST_PASS`). */
    const val testPass = 0.85

    /** Below this best score, a lesson is worth another go. */
    const val shakyBest = 0.6

    /** Whether every word a lesson teaches is already well known. A lesson with no words (a unit test) never is. */
    fun lessonKnown(vocabIds: List<String>, intervals: Map<String, Int>): Boolean =
        vocabIds.isNotEmpty() && vocabIds.all { (intervals[it] ?: 0) >= knownInterval }

    /**
     * The vocabulary lesson to do next, or null when there's nothing left.
     * The first lesson not done and not already known, except that in a unit
     * the level check found probably known, the unit test comes first while
     * it hasn't been taken. Unit tests are otherwise never next.
     */
    fun nextWords(lessons: List<PathLesson>, done: Map<String, Boolean>, intervals: Map<String, Int>, knownUnits: List<String> = emptyList()): PathLesson? {
        for (lesson in lessons) {
            if (done[lesson.id] == true || lesson.test) continue
            if (lesson.unitId in knownUnits) {
                val test = lessons.firstOrNull { it.unitId == lesson.unitId && it.test }
                if (test != null && done[test.id] != true) return test
            }
            if (lessonKnown(lesson.vocabIds, intervals)) continue
            return lesson
        }
        return null
    }

    /** Whether a unit-test score passes. */
    fun testPassed(score: Double, pass: Double = testPass): Boolean = score >= pass

    data class TestOut(val lessonIds: List<String>, val vocabIds: List<String>)

    /** What passing a unit test does: the unit's lessons not yet done, to count as done, and its words not yet in the deck, to add as known. */
    fun testOut(unitLessons: List<PathLesson>, done: Set<String>, inDeck: Set<String>): TestOut {
        val lessonIds = unitLessons.filter { !it.test && it.id !in done }.map { it.id }
        val seen = HashSet<String>()
        val vocabIds = ArrayList<String>()
        for (lesson in unitLessons) for (id in lesson.vocabIds) {
            if (id !in inDeck && seen.add(id)) vocabIds.add(id)
        }
        return TestOut(lessonIds, vocabIds)
    }

    /** The ISO day [n] days after [iso] (both YYYY-MM-DD, counted in UTC). */
    fun addDays(iso: String, n: Int): String {
        val parts = iso.split('-').mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return iso
        val date = runCatching { LocalDate.of(parts[0], parts[1], parts[2]) }.getOrNull() ?: return iso
        return date.plusDays(n.toLong()).toString()
    }

    /** A word shown to be known: a card ten days into its schedule, the [index]-th of the batch due on day 1 + index mod 21. */
    fun knownCard(id: String, index: Int, today: String): VocabCard =
        VocabCard(id, 2.5, 10, 2, addDays(today, 1 + index % knownSpreadDays), 0, 0)

    /**
     * The lesson most worth another go (the web's `shakyLesson`): of the
     * lessons actually tried (a passed unit test counts lessons with no
     * attempts of their own; those don't count) whose best score is under
     * [shakyBest], the one tried most recently, the later in [ids] on a tie.
     */
    fun shakyLesson(ids: List<String>, records: Map<String, LessonProgress>): String? {
        var pick: String? = null
        var at = ""
        for (id in ids) {
            val r = records[id] ?: continue
            if (r.attempts < 1 || r.best >= shakyBest) continue
            if (r.lastAt >= at) {
                pick = id
                at = r.lastAt
            }
        }
        return pick
    }

    /** The level check's vocabulary questions, answered: the units whose two words were both known, in the order they were first asked. */
    fun knownVocabUnits(answers: List<Placement.Answer>): List<String> {
        val order = ArrayList<String>()
        val rights = HashMap<String, MutableList<Boolean>>()
        for (a in answers) {
            if (rights[a.unit] == null) order.add(a.unit)
            rights.getOrPut(a.unit) { mutableListOf() }.add(a.right)
        }
        return order.filter { unit ->
            val r = rights[unit] ?: emptyList()
            r.isNotEmpty() && r.all { it }
        }
    }
}

/** Where the placement check puts a student: the web's `src/lib/placement.ts`, exactly. */
object Placement {
    data class Answer(val unit: String, val right: Boolean)

    const val stopAfterMisses = 3

    /** Whether to ask another question, given the answers so far. */
    fun continues(answers: List<Answer>, total: Int): Boolean =
        answers.size < total && answers.count { !it.right } < stopAfterMisses

    /** The unit to start at, or null when every question was answered right. */
    fun start(answers: List<Answer>): String? = answers.firstOrNull { !it.right }?.unit

    /**
     * Where a student who gets every question right begins: the first unit
     * past all the ones the check asks about (Level IV, which reads the AP
     * texts themselves), or null when the course has nothing beyond them yet.
     */
    fun unitBeyond(units: List<String>, probed: List<String>): String? {
        val last = probed.mapNotNull { p -> units.indexOf(p).takeIf { it >= 0 } }.maxOrNull() ?: -1
        return if (last + 1 < units.size) units[last + 1] else null
    }
}
