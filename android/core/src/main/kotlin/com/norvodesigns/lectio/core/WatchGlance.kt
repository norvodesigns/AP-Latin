package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * What the watch face shows: the cards still to review, the streak and the
 * days to the exam. The watch app writes it whenever its deck changes; the
 * complication reads it. The Kotlin twin of the iOS `WatchGlance`.
 */
@Serializable
data class WatchGlance(
    val cardsLeft: Int,
    val streak: Int,
    val daysUntilExam: Int,
    /** When the phone sent the deck these numbers come from, as epoch milliseconds. */
    val deckSentAt: Long,
) {
    /** A deck from an earlier day: today's cards haven't arrived from the phone yet, so yesterday's count would mislead. */
    fun isStale(now: Instant = Instant.now(), zone: ZoneId = ZoneId.systemDefault()): Boolean =
        sentDay(zone) != now.atZone(zone).toLocalDate()

    /** Days to the exam as of [now], counting down from when the deck was sent. */
    fun daysUntilExam(now: Instant, zone: ZoneId = ZoneId.systemDefault()): Int {
        val passed = ChronoUnit.DAYS.between(sentDay(zone), now.atZone(zone).toLocalDate()).toInt()
        return maxOf(0, daysUntilExam - maxOf(0, passed))
    }

    private fun sentDay(zone: ZoneId) = Instant.ofEpochMilli(deckSentAt).atZone(zone).toLocalDate()

    fun toJson(): String = LectioJson.encodeToString(serializer(), this)

    companion object {
        fun placeholder(now: Instant = Instant.now()) = WatchGlance(cardsLeft = 12, streak = 5, daysUntilExam = 200, deckSentAt = now.toEpochMilli())

        fun fromJson(text: String): WatchGlance? = runCatching { LectioJson.decodeFromString(serializer(), text) }.getOrNull()
    }
}
