package com.norvodesigns.lectio.core

import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.ZoneId

/**
 * What the Home Screen widgets show, written by the app whenever progress
 * changes.
 *
 * It stores the raw ingredients (every card's due date, recent study days)
 * rather than finished numbers, so a widget drawn tomorrow morning counts
 * tomorrow's due cards and streak correctly without the app having run.
 */
@Serializable
data class WidgetSnapshot(
    val examDate: String,
    /** Every vocabulary card's `due` date (UTC ISO day, as the web writes it). */
    val dueDates: List<String>,
    /** Recent study days, newest last. */
    val studyDays: List<String>,
    val goalMinutes: Int,
    /** Today's study seconds, and the day they belong to. */
    val studySeconds: Double,
    val studyDay: String,
    /** The Sententia of the day for today and the next few days, so the widget turns over at midnight on its own. */
    val lines: List<DayLine>? = null,
    /** The days the Sententia was done, recent ones only. */
    val dailyDone: List<String>? = null,
    /** The course lesson to do next, if there is one. */
    val nextLesson: NextLesson? = null,
) {
    /** One day's Sententia, as plain text. */
    @Serializable
    data class DayLine(val day: String, val latin: String, val english: String, val source: String)

    @Serializable
    data class NextLesson(
        val id: String,
        /** Where it sits, e.g. "Prīma 2.3". */
        val place: String,
        val title: String,
    )

    fun daysUntilExam(on: Instant, zone: ZoneId = ZoneId.systemDefault()): Int = Streaks.daysUntilExam(examDate, on, zone)

    fun cardsDue(on: Instant): Int {
        val day = StudyDates.isoDay(on)
        return dueDates.count { it <= day }
    }

    fun streak(on: Instant, zone: ZoneId = ZoneId.systemDefault()): Int = Streaks.current(studyDays, on, zone)

    fun minutesToday(on: Instant): Int = if (studyDay == StudyDates.isoDay(on)) (studySeconds / 60).toInt() else 0

    /** The Sententia for the local day of [on], if the app wrote it. */
    fun line(on: Instant, zone: ZoneId = ZoneId.systemDefault()): DayLine? {
        val day = Daily.localDay(on, zone)
        return lines?.firstOrNull { it.day == day }
    }

    /** Whether the Sententia of the local day of [on] has been done. */
    fun dailyDone(on: Instant, zone: ZoneId = ZoneId.systemDefault()): Boolean = dailyDone?.contains(Daily.localDay(on, zone)) ?: false

    fun toJson(): String = LectioJson.encodeToString(serializer(), this)

    companion object {
        val placeholder = WidgetSnapshot("2027-05-14", List(12) { "2000-01-01" }, emptyList(), 30, 900.0, "")

        fun fromJson(text: String): WidgetSnapshot? = runCatching { LectioJson.decodeFromString(serializer(), text) }.getOrNull()
    }
}
