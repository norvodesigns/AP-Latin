package com.norvodesigns.lectio.wear

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.norvodesigns.lectio.core.WatchGlance
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Cards left and days to the exam on the watch face: the Wear OS counterpart to
 * the iOS complications. Before any deck has arrived, or when the deck is only
 * yesterday's, it says so rather than showing a count that would mislead; it is
 * redrawn at midnight for that, and tapping it opens the watch app.
 */
class CardsComplicationService : SuspendingComplicationDataSourceService() {
    override fun getPreviewData(type: ComplicationType): ComplicationData? = build(type, WatchGlance.placeholder(), Instant.now(), null)

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        scheduleMidnight(this)
        return build(request.complicationType, WatchStore.glance(this), Instant.now(), openApp(this))
    }

    private fun build(type: ComplicationType, glance: WatchGlance?, now: Instant, tap: PendingIntent?): ComplicationData? {
        // Null before any deck has arrived, or when it's only yesterday's.
        val left = glance?.takeUnless { it.isStale(now) }?.cardsLeft
        val sentence = when (left) {
            null -> "Open Lectio on your phone"
            0 -> "All caught up"
            else -> "$left card${if (left == 1) "" else "s"} to review"
        }
        val description = PlainComplicationText.Builder(sentence).build()
        val data = when (type) {
            ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(PlainComplicationText.Builder(left?.toString() ?: "–").build(), description)
                .setTitle(PlainComplicationText.Builder("Lectio").build())
                .setTapAction(tap).build()
            ComplicationType.RANGED_VALUE -> RangedValueComplicationData.Builder(
                value = (left ?: 0).coerceAtMost(100).toFloat(), min = 0f, max = 100f, contentDescription = description,
            ).setText(PlainComplicationText.Builder(left?.toString() ?: "–").build()).setTapAction(tap).build()
            ComplicationType.LONG_TEXT -> LongTextComplicationData.Builder(PlainComplicationText.Builder(sentence).build(), description)
                .setTitle(PlainComplicationText.Builder(glance?.let { "${it.daysUntilExam(now)} days to the exam" } ?: "Lectio").build())
                .setTapAction(tap).build()
            else -> null
        }
        return data
    }

    companion object {
        private const val MIDNIGHT_REQUEST = 7001

        /** Asks every watch face showing the complication to draw it again. */
        fun refresh(context: Context) {
            runCatching {
                ComplicationDataSourceUpdateRequester.create(context, ComponentName(context, CardsComplicationService::class.java)).requestUpdateAll()
            }
        }

        private fun openApp(context: Context): PendingIntent = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        /** A redraw just after midnight, when the count goes stale until the phone sends the new day's cards. Non-waking: a dark screen shows nothing. */
        fun scheduleMidnight(context: Context) {
            val alarms = context.getSystemService(AlarmManager::class.java) ?: return
            val zone = ZoneId.systemDefault()
            val midnight = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli() + 30_000
            val intent = PendingIntent.getBroadcast(
                context, MIDNIGHT_REQUEST, Intent(context, ComplicationMidnightReceiver::class.java).setAction(ComplicationMidnightReceiver.MIDNIGHT),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            runCatching { alarms.setWindow(AlarmManager.RTC, midnight, 10 * 60 * 1000L, intent) }
        }
    }
}

/** Midnight, a changed clock or time zone: the face redraws with the count marked stale (or the new day's, if it has come). */
class ComplicationMidnightReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in setOf(MIDNIGHT, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED)) return
        CardsComplicationService.refresh(context)
        CardsComplicationService.scheduleMidnight(context)
    }

    companion object {
        const val MIDNIGHT = "com.norvodesigns.lectio.wear.MIDNIGHT"
    }
}
