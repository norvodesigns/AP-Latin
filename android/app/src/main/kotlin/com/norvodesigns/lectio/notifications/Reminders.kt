package com.norvodesigns.lectio.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.net.toUri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.norvodesigns.lectio.LectioApplication
import com.norvodesigns.lectio.MainActivity
import com.norvodesigns.lectio.R
import com.norvodesigns.lectio.widgets.MidnightRedraw
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/** One day's reminder, with the words already worked out: its number of days ahead, when it fires, and what it says. */
class ReminderItem(val n: Int, val fireAtMillis: Long, val title: String, val body: String)

/**
 * The daily reminder. Each of the next [DAYS] days gets its own wording, so it
 * can quote that day's Sententia and say how many cards are due; the list is
 * replaced whenever the app goes to the background, and kept on disk.
 *
 * One alarm is set at a time, for the next reminder to come, and each one sets
 * the next as it fires (iOS hands its 28 calendar triggers to the system; an
 * alarm is the Android equivalent that fires at the chosen time rather than
 * whenever a background job is next allowed to run). Alarms don't survive a
 * restart or follow a time-zone change, so [RescheduleReceiver] sets them again
 * then, from the student's chosen time of day.
 */
object Reminders {
    const val DAYS = 28
    private const val CHANNEL = "reminders"
    const val ID_BASE = 6100
    private const val PREFS = "reminders"
    private const val KEY_ITEMS = "items"
    private const val ALARM_REQUEST = 6099

    /** A reminder this late (the phone was off, or deep asleep) is dropped rather than shown out of time. */
    private const val STALE_MS = 2 * 60 * 60 * 1000L

    /** How far after its time a reminder may fire when exact alarms aren't available. */
    private const val WINDOW_MS = 10 * 60 * 1000L

    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, context.getString(R.string.channel_reminders), NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = context.getString(R.string.channel_reminders_description)
            },
        )
    }

    /** Replaces every pending reminder with [items]; with none (reminders off), just clears them. */
    fun reschedule(context: Context, items: List<ReminderItem>) {
        save(context, items)
        scheduleNext(context)
        // Builds before this one queued reminders as background jobs.
        runCatching { androidx.work.WorkManager.getInstance(context).cancelAllWorkByTag("reminder") }
    }

    /** Sets the alarm for the next reminder still to come, replacing any set before. */
    fun scheduleNext(context: Context) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val intent = alarmIntent(context)
        alarms.cancel(intent)
        val now = System.currentTimeMillis()
        val next = load(context).firstOrNull { it.fireAtMillis > now } ?: return
        runCatching {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.fireAtMillis, intent)
            } else {
                alarms.setWindow(AlarmManager.RTC_WAKEUP, next.fireAtMillis, WINDOW_MS, intent)
            }
        }
    }

    /** The alarm went off: show the reminder that's due, unless it's stale or the student is already studying, then set the next. */
    internal fun fire(context: Context) {
        val now = System.currentTimeMillis()
        val due = load(context).lastOrNull { it.fireAtMillis <= now + 60_000 }
        val studying = ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
        if (due != null && now - due.fireAtMillis < STALE_MS && !studying) show(context, due.n, due.title, due.body)
        scheduleNext(context)
    }

    internal fun show(context: Context, n: Int, title: String, body: String) {
        if (!notificationsAllowed(context)) return
        ensureChannel(context)
        // Tapping it opens today's study, where the Today screen already says what is due.
        val open = PendingIntent.getActivity(
            context, ID_BASE + n, Intent(Intent.ACTION_VIEW, "lectio://today".toUri(), context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_lectio)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(open)
            .build()
        // One id for every day: a reminder replaces yesterday's unread one rather than stacking beside it.
        try {
            NotificationManagerCompat.from(context).notify(ID_BASE, notification)
        } catch (_: SecurityException) {
            // The permission went between the check and the post.
        }
    }

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context, ALARM_REQUEST, Intent(context, ReminderReceiver::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun save(context: Context, items: List<ReminderItem>) {
        val array = JSONArray()
        for (item in items) array.put(JSONObject().put("n", item.n).put("at", item.fireAtMillis).put("title", item.title).put("body", item.body))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_ITEMS, array.toString()).apply()
    }

    internal fun load(context: Context): List<ReminderItem> = runCatching {
        val array = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_ITEMS, "[]"))
        (0 until array.length()).map { i ->
            val o = array.getJSONObject(i)
            ReminderItem(o.getInt("n"), o.getLong("at"), o.optString("title", "Time for Latin"), o.optString("body", ""))
        }.sortedBy { it.fireAtMillis }
    }.getOrDefault(emptyList())
}

/** The reminder alarm. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Reminders.fire(context)
    }
}

/**
 * Sets the reminders and the widgets' midnight redraw again after the phone
 * restarts, the clock or time zone changes, or the app is updated: alarms don't
 * survive the first, and a reminder at 4 pm should still come at 4 pm in a new
 * time zone. The wording is rebuilt from the student's progress and the course.
 */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in ACTIONS) return
        val pending = goAsync()
        val model = (context.applicationContext as LectioApplication).model
        model.scope.launch {
            try {
                model.loadContent()
                model.rescheduleReminder()
                MidnightRedraw.schedule(context)
                com.norvodesigns.lectio.widgets.WidgetBridge.redraw(context)
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        val ACTIONS = setOf(
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_MY_PACKAGE_REPLACED,
            AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED,
        )
    }
}
