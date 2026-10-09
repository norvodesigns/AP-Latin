package com.norvodesigns.lectio.util

import com.norvodesigns.lectio.core.CloudSync
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** A score as the app prints it: 7 not 7.0, but 7.5 stays 7.5. */
fun Double.clean(): String = if (this == Math.rint(this)) toLong().toString() else "%.1f".format(Locale.US, this).trimEnd('0').trimEnd('.')

private val dayMonth = DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()).withZone(ZoneId.systemDefault())
private val dayMonthYear = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.getDefault()).withZone(ZoneId.systemDefault())

/** "14 Oct" for an ISO timestamp from the progress document, or "" if it can't be read. */
fun shortDate(timestamp: String): String = CloudSync.parseTimestamp(timestamp)?.let { dayMonth.format(it) } ?: ""

fun longDate(timestamp: String): String = CloudSync.parseTimestamp(timestamp)?.let { dayMonthYear.format(it) } ?: ""

/** Words in a Latin or English string, split on whitespace. */
fun wordCount(text: String): Int = text.split(Regex("\\s+")).count { it.isNotEmpty() }
