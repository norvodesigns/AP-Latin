package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable
import java.time.Instant

/**
 * What the phone sends the watch: the vocabulary cards due today, and the few
 * numbers the watch shows beside them. The phone owns the schedule: it sends the
 * due cards and applies every grade the watch sends back, so the watch works
 * offline and nothing is ever scheduled twice. The Kotlin twin of the iOS
 * `WatchDeck`; both ends of the Android link share this one class.
 */
@Serializable
data class WatchDeck(
    val cards: List<Card>,
    val dueCount: Int,
    val streak: Int,
    val daysUntilExam: Int,
    /** When the phone sent it, as epoch milliseconds, so a resend after a reconnect is a new item even if nothing else changed. */
    val sentAt: Long = Instant.now().toEpochMilli(),
) {
    @Serializable
    data class Card(val id: String, val headword: String, val lemma: String, val pos: String, val definition: String)

    fun toJson(): String = LectioJson.encodeToString(serializer(), this)

    companion object {
        /** The most a single deck carries. */
        const val MAX_CARDS = 60

        fun fromJson(text: String): WatchDeck? = runCatching { LectioJson.decodeFromString(serializer(), text) }.getOrNull()
    }
}

/** A grade made on the watch, sent back to the phone to apply with SM-2 at the moment it was made. */
@Serializable
data class WatchReview(val cardId: String, val quality: Int, val at: Long = Instant.now().toEpochMilli()) {
    fun toJson(): String = LectioJson.encodeToString(serializer(), this)

    companion object {
        fun fromJson(text: String): WatchReview? = runCatching { LectioJson.decodeFromString(serializer(), text) }.getOrNull()
    }
}

/** The data-layer paths both ends agree on. */
object WatchPaths {
    const val DECK = "/lectio/deck"
    const val REVIEW_PREFIX = "/lectio/review/"
}
