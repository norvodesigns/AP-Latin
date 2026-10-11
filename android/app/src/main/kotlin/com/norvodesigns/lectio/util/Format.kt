package com.norvodesigns.lectio.util

import com.norvodesigns.lectio.core.CloudSync
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** A score as the app prints it: 7 not 7.0, but 7.5 stays 7.5. */
fun Double.clean(): String = if (this == Math.rint(this)) toLong().toString() else "%.1f".format(Locale.US, this).trimEnd('0').trimEnd('.')

private fun dayMonth() = DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()).withZone(ZoneId.systemDefault())
private fun dayMonthYear() = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.getDefault()).withZone(ZoneId.systemDefault())

/** "14 Oct" for an ISO timestamp from the progress document, or "" if it can't be read. */
fun shortDate(timestamp: String): String = CloudSync.parseTimestamp(timestamp)?.let { dayMonth().format(it) } ?: ""

fun longDate(timestamp: String): String = CloudSync.parseTimestamp(timestamp)?.let { dayMonthYear().format(it) } ?: ""

/** Words in a Latin or English string, split on whitespace. */
fun wordCount(text: String): Int = text.split(Regex("\\s+")).count { it.isNotEmpty() }

/** A time of day, given in minutes after midnight, in the device's own clock style (4:00 PM, or 16:00). */
fun formatClock(context: android.content.Context, minutes: Int): String {
    val cal = java.util.Calendar.getInstance().apply {
        set(java.util.Calendar.HOUR_OF_DAY, minutes / 60)
        set(java.util.Calendar.MINUTE, minutes % 60)
    }
    return android.text.format.DateFormat.getTimeFormat(context).format(cal.time)
}
