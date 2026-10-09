package com.norvodesigns.lectio.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import com.norvodesigns.lectio.core.WidgetSnapshot
import java.time.Instant

/* ------------------------------------------------------------------ */
/* Lectio: days to the exam, cards due, the streak                      */
/* ------------------------------------------------------------------ */

class TodayWidget : GlanceAppWidget() {
    override val sizeMode = sizes

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = snapshotOrPlaceholder(context)
        provideContent { TodayContent(context, snapshot, Instant.now()) }
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}

@Composable
private fun TodayContent(context: Context, s: WidgetSnapshot, now: Instant) {
    val days = s.daysUntilExam(now)
    val due = s.cardsDue(now)
    val streak = s.streak(now)
    val wide = LocalSize.current.width >= Medium.width
    Row(GlanceModifier.card().clickable(open(context, "lectio://vocab"))) {
        Column(GlanceModifier.defaultWeight()) {
            Text("$days", style = serif(44.sp, WidgetPalette.rubric, FontWeight.Medium))
            Text(if (days == 1) "DAY TO THE EXAM" else "DAYS TO THE EXAM", style = label(WidgetPalette.muted))
            Spacer(GlanceModifier.defaultWeight())
            if (!wide) {
                Text(if (due == 1) "1 card due" else "$due cards due", style = serif(14.sp, weight = FontWeight.Bold))
                Text("$streak-day streak", style = serif(12.sp, WidgetPalette.muted))
            }
        }
        if (wide) Column(GlanceModifier.defaultWeight(), verticalAlignment = Alignment.CenterVertically) {
            Stat("$due", if (due == 1) "card due" else "cards due")
            Spacer(GlanceModifier.height(10.dp))
            Stat("$streak", "day streak")
            Spacer(GlanceModifier.height(10.dp))
            Stat("${s.minutesToday(now)}/${s.goalMinutes}", "min today")
        }
    }
}

@Composable
private fun Stat(value: String, caption: String) {
    Column {
        Text(value, style = serif(20.sp, weight = FontWeight.Medium))
        Text(caption.uppercase(), style = label(WidgetPalette.muted))
    }
}

/* ------------------------------------------------------------------ */
/* Sententia of the day                                                 */
/* ------------------------------------------------------------------ */

class SententiaWidget : GlanceAppWidget() {
    override val sizeMode = sizes

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = snapshotOrPlaceholder(context)
        provideContent { SententiaContent(context, snapshot, Instant.now()) }
    }
}

class SententiaWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SententiaWidget()
}

@Composable
private fun SententiaContent(context: Context, s: WidgetSnapshot, now: Instant) {
    val line = s.line(now)
    val done = s.dailyDone(now)
    val wide = LocalSize.current.width >= Medium.width
    Column(GlanceModifier.card().clickable(open(context, "lectio://learn/daily"))) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("SENTENTIA", style = label())
            if (done) Text("  ✓", style = label())
        }
        Spacer(GlanceModifier.height(6.dp))
        if (line != null) {
            Text(line.latin, maxLines = if (wide) 3 else 5, style = serif(if (wide) 21.sp else 17.sp, italic = true))
            Spacer(GlanceModifier.defaultWeight())
            if (wide) Text(if (done) "“${line.english}”" else line.source, maxLines = 2, style = serif(12.sp, WidgetPalette.muted))
        } else {
            Text("Open Lectio for today’s line.", style = serif(13.sp, WidgetPalette.muted))
        }
    }
}

/* ------------------------------------------------------------------ */
/* The next lesson                                                      */
/* ------------------------------------------------------------------ */

class NextLessonWidget : GlanceAppWidget() {
    override val sizeMode = sizes

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = snapshotOrPlaceholder(context)
        provideContent { NextLessonContent(context, snapshot) }
    }
}

class NextLessonWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NextLessonWidget()
}

@Composable
private fun NextLessonContent(context: Context, s: WidgetSnapshot) {
    val next = s.nextLesson
    Column(GlanceModifier.card().clickable(open(context, next?.let { "lectio://learn/${it.id}" } ?: "lectio://learn"))) {
        Text(if (next == null) "THE COURSE" else "NEXT LESSON", style = label())
        Spacer(GlanceModifier.height(6.dp))
        if (next != null) {
            Text(next.place, style = serif(12.sp, WidgetPalette.muted))
            Text(next.title, maxLines = 4, style = serif(18.sp, weight = FontWeight.Medium))
        } else {
            Text("Every lesson written so far is done.", style = serif(13.sp))
        }
    }
}
