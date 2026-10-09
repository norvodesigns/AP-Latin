package com.norvodesigns.lectio.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.norvodesigns.lectio.MainActivity
import com.norvodesigns.lectio.R

/**
 * The practice exam's countdown on the lock screen and in the shade while a
 * timed section runs: the Android counterpart to the iOS Live Activity. The
 * system draws the chronometer itself, so it keeps counting without the app
 * running. Posting is best effort; without the notification permission the exam
 * runs exactly the same.
 */
object ExamNotification {
    private const val CHANNEL = "exam"
    private const val ID = 4207

    private var section = ""
    private var detail = ""
    private var endsAt = 0L
    private var total = 0

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, context.getString(R.string.channel_exam), NotificationManager.IMPORTANCE_LOW).apply {
                description = context.getString(R.string.channel_exam_description)
                setShowBadge(false)
            },
        )
    }

    fun start(context: Context, section: String, detail: String, endsAtMillis: Long, total: Int) {
        this.section = section
        this.detail = detail
        this.endsAt = endsAtMillis
        this.total = total
        post(context, 0)
    }

    fun update(context: Context, done: Int) {
        if (endsAt == 0L) return
        post(context, done)
    }

    fun end(context: Context) {
        endsAt = 0L
        runCatching { NotificationManagerCompat.from(context).cancel(ID) }
    }

    private fun post(context: Context, done: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        ensureChannel(context)
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_lectio)
            .setContentTitle("$section · $detail")
            .setContentText("$done of $total answered")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setWhen(endsAt)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setTimeoutAfter((endsAt - System.currentTimeMillis()).coerceAtLeast(1_000L) + 60_000L)
            .setContentIntent(open)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(ID, notification) }
    }
}
