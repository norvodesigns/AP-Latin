package com.norvodesigns.lectio.wear

import android.content.Context
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService

/** Cards left and days to the exam on the watch face: the Wear OS counterpart to the iOS complications. */
class CardsComplicationService : SuspendingComplicationDataSourceService() {
    override fun getPreviewData(type: ComplicationType): ComplicationData? = build(type, cardsLeft = 12, streak = 5, days = 214)

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val prefs = getSharedPreferences("watch", Context.MODE_PRIVATE)
        return build(request.complicationType, prefs.getInt("cardsLeft", 0), prefs.getInt("streak", 0), prefs.getInt("days", 0))
    }

    private fun build(type: ComplicationType, cardsLeft: Int, streak: Int, days: Int): ComplicationData? = when (type) {
        ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(
            PlainComplicationText.Builder("$cardsLeft").build(), PlainComplicationText.Builder("$cardsLeft cards left").build(),
        ).build()
        ComplicationType.RANGED_VALUE -> RangedValueComplicationData.Builder(
            value = cardsLeft.coerceAtMost(100).toFloat(), min = 0f, max = 100f, contentDescription = PlainComplicationText.Builder("$cardsLeft cards left").build(),
        ).setText(PlainComplicationText.Builder("$cardsLeft").build()).build()
        ComplicationType.LONG_TEXT -> LongTextComplicationData.Builder(
            PlainComplicationText.Builder("$days days to AP Latin").build(), PlainComplicationText.Builder("$cardsLeft cards left, $streak-day streak").build(),
        ).setTitle(PlainComplicationText.Builder("$cardsLeft cards · $streak-day streak").build()).build()
        else -> null
    }
}
