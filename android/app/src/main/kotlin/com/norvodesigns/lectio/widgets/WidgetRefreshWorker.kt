package com.norvodesigns.lectio.widgets

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Redraws the widgets every few hours from the last snapshot, so the countdown, the due cards, the streak and the day's line roll over overnight even if the app isn't opened. */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        WidgetBridge.redraw(applicationContext)
        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            // Best effort: a widget that redraws late is no reason to stop the app from opening.
            runCatching {
                val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(3, TimeUnit.HOURS).build()
                WorkManager.getInstance(context).enqueueUniquePeriodicWork("widget-refresh", ExistingPeriodicWorkPolicy.KEEP, request)
            }
        }
    }
}
