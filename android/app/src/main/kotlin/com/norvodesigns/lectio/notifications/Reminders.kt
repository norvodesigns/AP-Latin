package com.norvodesigns.lectio.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.norvodesigns.lectio.MainActivity
import com.norvodesigns.lectio.R
import java.util.concurrent.TimeUnit

/** One day's reminder, with the words already worked out: its number of days ahead, when it fires, and what it says. */
class ReminderItem(val n: Int, val fireAtMillis: Long, val title: String, val body: String)

/**
 * The daily reminder. Each of the next [DAYS] days gets its own notification so
 * it can quote that day's Sententia and say how many cards are due; they are
 * replaced whenever the app goes to the background. WorkManager keeps them
 * across a restart of the phone, and Android may deliver one a little late when
 * the phone is idle, which a daily nudge can live with.
 */
object Reminders {
    const val DAYS = 28
    private const val TAG = "reminder"
    private const val CHANNEL = "reminders"
    const val ID_BASE = 6100

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
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
        val work = runCatching { WorkManager.getInstance(context) }.getOrNull() ?: return
        work.cancelAllWorkByTag(TAG)
        ensureChannel(context)
        val now = System.currentTimeMillis()
        for (item in items) {
            val delay = item.fireAtMillis - now
            if (delay <= 0) continue
            val request = OneTimeWorkRequestBuilder<ReminderWorker>()
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .addTag(TAG)
                .setInputData(Data.Builder().putInt("n", item.n).putString("title", item.title).putString("body", item.body).build())
                .build()
            work.enqueueUniqueWork("$TAG.${item.n}", ExistingWorkPolicy.REPLACE, request)
        }
    }

    internal fun show(context: Context, n: Int, title: String, body: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        ensureChannel(context)
        // Tapping it opens today's study, where the Today screen already says what is due.
        val open = PendingIntent.getActivity(
            context, ID_BASE + n, Intent(Intent.ACTION_VIEW, Uri.parse("lectio://today"), context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
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
        runCatching { NotificationManagerCompat.from(context).notify(ID_BASE + n, notification) }
    }
}

class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        Reminders.show(
            applicationContext, inputData.getInt("n", 0), inputData.getString("title") ?: "Time for Latin", inputData.getString("body") ?: "",
        )
        return Result.success()
    }
}
