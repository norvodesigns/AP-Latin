package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneId
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * SM-2 scheduling record for one vocabulary item: `VocabCard` in
 * src/store/useStore.ts, field for field.
 */
@Serializable
data class VocabCard(
    val id: String,
    /** Ease factor, SM-2 default 2.5, floor 1.3. */
    val ef: Double,
    /** Current inter-repetition interval in days. */
    val interval: Int,
    /** Consecutive successful recalls. */
    val repetitions: Int,
    /** ISO date (UTC, see [StudyDates]) the card is next due. */
    val due: String,
    val lapses: Int,
    val reviews: Int,
    val lastQuality: Int? = null,
    val lastReviewed: String? = null,
) {
    companion object {
        /** Reads a card straight from the synced document, the hot path. */
        fun fromJson(json: JSONValue): VocabCard? {
            val o = json.objectValue ?: return null
            val id = o["id"]?.stringValue ?: return null
            val due = o["due"]?.stringValue ?: return null
            return VocabCard(
                id = id,
                ef = o["ef"]?.doubleValue ?: 2.5,
                interval = o["interval"]?.intValue ?: 0,
                repetitions = o["repetitions"]?.intValue ?: 0,
                due = due,
                lapses = o["lapses"]?.intValue ?: 0,
                reviews = o["reviews"]?.intValue ?: 0,
                lastQuality = o["lastQuality"]?.intValue,
                lastReviewed = o["lastReviewed"]?.stringValue,
            )
        }

        /** A card never reviewed, due today: the web's `newCard`. */
        fun new(id: String, now: Instant = Instant.now()): VocabCard =
            VocabCard(id, 2.5, 0, 0, StudyDates.today(now), 0, 0)
    }
}

object SpacedRepetition {
    /**
     * SM-2 (Piotr Wozniak). [quality] is 0-5; below 3 counts as a lapse and
     * restarts the interval while keeping a reduced ease factor. A line-for-
     * line port of the web's `sm2`, checked against it by the parity fixtures.
     */
    fun review(card: VocabCard, quality: Int, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): VocabCard {
        val q = max(0, min(5, quality))
        var ef = card.ef
        var interval = card.interval
        var repetitions = card.repetitions
        var lapses = card.lapses

        val miss = (5 - q).toDouble()
        ef += 0.1 - miss * (0.08 + miss * 0.02)
        if (ef < 1.3) ef = 1.3

        if (q < 3) {
            repetitions = 0
            interval = 1
            lapses += 1
        } else {
            repetitions += 1
            interval = when (repetitions) {
                1 -> 1
                2 -> 6
                // Math.round: halves round up.
                else -> floor(interval * ef + 0.5).toInt()
            }
        }
        return card.copy(
            ef = ef,
            interval = interval,
            repetitions = repetitions,
            lapses = lapses,
            due = StudyDates.isoDay(StudyDates.adding(interval, now, zone)),
            reviews = card.reviews + 1,
            lastQuality = q,
            lastReviewed = StudyDates.today(now),
        )
    }

    /** Cards due on or before [day], most overdue first, hardest first within a day. */
    fun due(cards: Collection<VocabCard>, day: String): List<VocabCard> =
        cards.filter { it.due <= day }.sortedWith { a, b -> if (a.due != b.due) a.due.compareTo(b.due) else a.ef.compareTo(b.ef) }
}

/** Streak and countdown maths: ports of `currentStreak`, `longestStreak` and `daysUntilExam`. */
object Streaks {
    /** Current consecutive-day study streak, counting today or yesterday as live. */
    fun current(studyDays: List<String>, now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): Int {
        if (studyDays.isEmpty()) return 0
        val days = studyDays.toSet()
        var d = now
        if (StudyDates.isoDay(d) !in days) {
            d = StudyDates.adding(-1, d, zone)
            if (StudyDates.isoDay(d) !in days) return 0
        }
        var n = 0
        while (StudyDates.isoDay(d) in days) {
            n++
            d = StudyDates.adding(-1, d, zone)
        }
        return n
    }

    /** The longest unbroken run anywhere in the history. */
    fun longest(studyDays: List<String>): Int {
        val sorted = studyDays.toSet().mapNotNull { StudyDates.dayNumber(it) }.sorted()
        if (sorted.isEmpty()) return 0
        var best = 1
        var run = 1
        for (i in 1 until sorted.size) {
            run = if (sorted[i] - sorted[i - 1] == 1) run + 1 else 1
            best = max(best, run)
        }
        return best
    }

    /** Whole days from the start of [from]'s local day to the exam's local midnight, never negative. */
    fun daysUntilExam(examDate: String, from: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): Int {
        val parts = examDate.split('-').mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return 0
        val exam = runCatching { java.time.LocalDate.of(parts[0], parts[1], parts[2]) }.getOrNull() ?: return 0
        val start = java.time.ZonedDateTime.ofInstant(from, zone).toLocalDate()
        return max(0, java.time.temporal.ChronoUnit.DAYS.between(start, exam).toInt())
    }
}
