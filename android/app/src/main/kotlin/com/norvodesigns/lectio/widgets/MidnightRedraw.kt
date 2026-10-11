package com.norvodesigns.lectio.widgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

/**
 * Redraws the widgets just after midnight, so the countdown, the cards due, the
 * streak and the day's line roll over with the day (iOS gives each widget a
 * timeline entry at every midnight). A non-waking alarm: a sleeping phone shows
 * no widgets, and the redraw happens the moment it wakes.
 */
object MidnightRedraw {
    private const val REQUEST = 6098

    fun schedule(context: Context) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val zone = ZoneId.systemDefault()
        val midnight = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli() + 30_000
        val intent = PendingIntent.getBroadcast(
            context, REQUEST, Intent(context, MidnightReceiver::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        runCatching { alarms.setWindow(AlarmManager.RTC, midnight, 10 * 60 * 1000L, intent) }
    }
}

class MidnightReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        val app = context.applicationContext
        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                WidgetBridge.redraw(app)
                MidnightRedraw.schedule(app)
            } finally {
                pending.finish()
            }
        }
    }
}
