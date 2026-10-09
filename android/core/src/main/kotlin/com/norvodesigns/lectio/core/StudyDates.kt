package com.norvodesigns.lectio.core

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Date conventions shared with the web app.
 *
 * The web store writes every "day" (`studyDays`, a card's `due` and
 * `lastReviewed`, `lastSeen`) as `new Date().toISOString().slice(0, 10)`: the
 * UTC calendar date, not the local one. Both platforms write into the same
 * synced document and compare those strings against each other, so this app
 * uses exactly the same convention even where a local date would read more
 * naturally.
 */
object StudyDates {
    private val timestampFormat: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    /** `YYYY-MM-DD` of [date] in UTC: the web's `toISOString().slice(0, 10)`. */
    fun isoDay(date: Instant): String = LocalDate.ofInstant(date, ZoneOffset.UTC).toString()

    /** The web's `today()`. */
    fun today(now: Instant = Instant.now()): String = isoDay(now)

    /** Full ISO 8601 timestamp with milliseconds, as `toISOString()` writes it. */
    fun isoTimestamp(date: Instant): String = timestampFormat.format(date)

    /** Parses what [isoTimestamp] writes (and the same with any offset). */
    fun parseTimestamp(s: String): Instant? = runCatching { Instant.parse(s) }.getOrNull()
        ?: runCatching { java.time.OffsetDateTime.parse(s).toInstant() }.getOrNull()

    /**
     * [date] moved by whole days on the [zone]'s calendar: the web's
     * `d.setDate(d.getDate() + n)`, which steps the local calendar so a DST
     * change never skips a day.
     */
    fun adding(days: Int, to: Instant, zone: ZoneId = ZoneId.systemDefault()): Instant =
        ZonedDateTime.ofInstant(to, zone).plusDays(days.toLong()).toInstant()

    /**
     * Days since 1970-01-01 for a `YYYY-MM-DD` string, or null if it isn't
     * one. Exact day arithmetic, free of time zones and daylight saving
     * (Howard Hinnant's days-from-civil).
     */
    fun dayNumber(iso: String): Int? {
        val parts = iso.split('-')
        if (parts.size != 3) return null
        val y = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        val d = parts[2].toIntOrNull() ?: return null
        val yy = if (m <= 2) y - 1 else y
        val era = (if (yy >= 0) yy else yy - 399) / 400
        val yoe = yy - era * 400
        val mp = (m + 9) % 12
        val doy = (153 * mp + 2) / 5 + d - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146_097 + doe - 719_468
    }
}
