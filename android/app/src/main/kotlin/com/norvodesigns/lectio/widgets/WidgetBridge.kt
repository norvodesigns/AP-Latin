package com.norvodesigns.lectio.widgets

import android.content.Context
import androidx.glance.appwidget.updateAll
import com.norvodesigns.lectio.core.WidgetSnapshot
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File

/**
 * Hands the widgets what they need to draw. The app writes a [WidgetSnapshot]
 * (the raw ingredients: every card's due date, recent study days, the next few
 * days' Sententia) to a file; each widget reads it, and works out what is due,
 * the streak and the day's line for the moment it is drawn, so the widgets
 * stay right overnight without the app having run.
 */
object WidgetBridge {
    private const val FILE = "widget-snapshot.json"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun publish(context: Context, snapshot: WidgetSnapshot) {
        val app = context.applicationContext
        scope.launch {
            runCatching {
                val file = File(app.filesDir, FILE)
                val temp = File(app.filesDir, "$FILE.tmp")
                temp.writeText(snapshot.toJson())
                temp.renameTo(file)
            }
            redraw(app)
        }
    }

    /** What the app last wrote, or null before the first run. */
    fun load(context: Context): WidgetSnapshot? =
        runCatching { WidgetSnapshot.fromJson(File(context.applicationContext.filesDir, FILE).readText()) }.getOrNull()

    suspend fun redraw(context: Context) {
        runCatching { TodayWidget().updateAll(context) }
        runCatching { SententiaWidget().updateAll(context) }
        runCatching { NextLessonWidget().updateAll(context) }
    }
}
