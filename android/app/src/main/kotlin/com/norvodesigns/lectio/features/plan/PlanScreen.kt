package com.norvodesigns.lectio.features.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.core.SpacedRepetition
import com.norvodesigns.lectio.core.Streaks
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private class Phase(val id: String, val name: String, val from: Int, val to: Int, val focus: String, val targets: List<String>)

/** Phase lengths follow the exam's own weighting: reading and comprehension is the largest share, so most of the time goes on the syllabus itself. */
private fun phases(days: Int): List<Phase> {
    fun r(f: Double) = maxOf(1, Math.round(days * f).toInt())
    return listOf(
        Phase(
            "foundation", "Foundation", days, r(0.55), "Read the syllabus and build the vocabulary base.",
            listOf(
                "Work through the required passages in the Reading Room, one or two a week.",
                "Keep the vocabulary queue clear — the core list is the floor everything else stands on.",
                "Start Grammar & Syntax on the constructions you keep stumbling over.",
            ),
        ),
        Phase(
            "consolidation", "Consolidation", r(0.55), r(0.22), "Translate accurately and start writing to the rubric.",
            listOf(
                "A literal translation drill twice a week; log the segments you miss.",
                "Scansion until the fifth-foot dactyl is automatic.",
                "One FRQ 3 short essay a week, self-scored against the official rows.",
                "Sight reading once a week, timed.",
            ),
        ),
        Phase(
            "exam-shape", "Exam shape", r(0.22), r(0.06), "Practise under the real timing.",
            listOf(
                "A full practice exam every two or three weeks.",
                "Course project passages: drill summary and interpretation-with-evidence.",
                "Rework the questions in your review queue until it empties.",
                "Target the weakest skill category, not the most comfortable.",
            ),
        ),
        Phase(
            "taper", "Taper", r(0.06), 0, "Keep it warm; do not learn anything new.",
            listOf(
                "Re-read the syllabus passages you know least well.",
                "Vocabulary review only — no new cards.",
                "One timed section, not a whole exam.",
                "Sleep.",
            ),
        ),
    )
}

/** A plan measured backwards from exam day (src/app/plan/StudyPlan.tsx). */
@Composable
fun PlanScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    val locale = androidx.compose.ui.platform.LocalConfiguration.current.locales[0]
    val days = Streaks.daysUntilExam(library.meta.examDate)
    val phases = phases(days)
    val current = phases.firstOrNull { days <= it.from && days > it.to } ?: phases.last()
    val plan = model.progress.studyPlan
    val required = library.requiredPassages
    val read = required.count { model.progress.passage(it.id).lastOpened != null }
    val inRotation = model.vocab.size
    val due = SpacedRepetition.due(model.vocab.values, StudyDates.today()).size
    val weeksLeft = maxOf(1.0, days / 7.0)
    val passagesPerWeek = (required.size - read) / weeksLeft
    val wordsPerWeek = (library.coreVocabulary.size - inRotation) / weeksLeft
    // Sunday is 0 in the plan, as in the web app.
    val weekday = LocalDate.now().dayOfWeek.value % 7
    val todayActive = weekday in plan.activeDays
    val studiedToday = StudyDates.today() in model.progress.studyDays
    val hours = Math.round(days / 7.0 * maxOf(plan.activeDays.size, 1) * plan.minutesPerDay / 60.0).toInt()
    val drillsTried = model.progress.translationAttempts.map { it.drillId }.toSet().size

    @Composable fun target(text: String) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("·", color = c.rubric, style = LectioText.prose(LectioText.callout))
            Text(text, style = LectioText.prose(LectioText.callout), color = c.ink)
        }
    }

    @Composable fun meter(label: String, value: Int, max: Int) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Text(label, Modifier.weight(1f), style = LectioText.subheadline, color = c.ink)
                Text("$value / $max", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
            }
            LectioProgress(value.toFloat() / maxOf(max, 1))
        }
    }

    PageScaffold("Study Plan") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 30.dp) {
            RubricLabel("$days days · ${examDateLabel(library.meta.examDate)}")

            RuledBlock {
                QuietLabel(if (todayActive) "Today" else "Today · a rest day in your schedule")
                Text(
                    if (studiedToday) "Done for today" else if (todayActive) "${plan.minutesPerDay} minutes" else "Rest day",
                    style = LectioText.prose(LectioText.title).copy(fontWeight = FontWeight.SemiBold), color = c.ink,
                )
                if (todayActive && !studiedToday) {
                    if (due > 0) target("Clear ${minOf(due, 40)} vocabulary card${if (due == 1) "" else "s"} (${minOf(15, (plan.minutesPerDay * 0.35).toInt())} min)")
                    target(current.focus)
                    if (read < required.size) target("Read or re-read one syllabus passage")
                }
                Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (due > 0) LectioButton({ model.selectedTab = AppTab.Vocab }, prominent = true) { ButtonLabel("Vocabulary ($due)") }
                    LectioButton({ model.selectedTab = AppTab.Read }) { ButtonLabel("Reading Room") }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                RubricLabel("Your schedule")
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        buildAnnotatedString {
                            append("Minutes per study day — ")
                            withStyle(SpanStyle(color = c.rubric, fontWeight = FontWeight.Bold)) { append("${plan.minutesPerDay}") }
                        },
                        style = LectioText.prose(LectioText.body), color = c.ink,
                    )
                    Slider(
                        plan.minutesPerDay.toFloat(), { v -> model.update { it.setStudyPlan(minutesPerDay = Math.round(v / 5f) * 5) } }, valueRange = 10f..120f, steps = 21,
                        colors = SliderDefaults.colors(thumbColor = c.rubric, activeTrackColor = c.rubric, inactiveTrackColor = c.ruleStrong),
                        modifier = Modifier.semantics { contentDescription = "Minutes per study day" },
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Study days", style = LectioText.prose(LectioText.body), color = c.ink)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (d in 0..6) {
                            val on = d in plan.activeDays
                            // Sunday is day 0; java.time counts Monday as 1.
                            val dow = java.time.DayOfWeek.of(if (d == 0) 7 else d)
                            Chip(
                                dow.getDisplayName(TextStyle.NARROW, locale), on,
                                Modifier.semantics { contentDescription = dow.getDisplayName(TextStyle.FULL, locale) + if (on) ", on" else ", off" },
                            ) {
                                val next = if (on) plan.activeDays - d else plan.activeDays + d
                                model.update { it.setStudyPlan(activeDays = next.sorted()) }
                            }
                        }
                    }
                }
                Text(
                    buildAnnotatedString {
                        append("That is roughly ")
                        withStyle(SpanStyle(color = c.rubric, fontWeight = FontWeight.Bold)) { append("$hours hours") }
                        append(" between now and the exam. To finish the required reading you need about ")
                        withStyle(SpanStyle(color = c.rubric, fontWeight = FontWeight.Bold)) { append(if (passagesPerWeek < 0.1) "no" else "%.1f".format(passagesPerWeek)) }
                        append(" passages a week, and to get the whole core list into rotation about ")
                        withStyle(SpanStyle(color = c.rubric, fontWeight = FontWeight.Bold)) { append("${maxOf(0, Math.ceil(wordsPerWeek).toInt())}") }
                        append(" new words a week.")
                    },
                    style = LectioText.prose(LectioText.callout), color = c.ink2,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                RubricLabel("Phases")
                for (p in phases) {
                    val here = p.id == current.id
                    Column(Modifier.alpha(if (here) 1f else 0.75f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(p.name, style = LectioText.prose(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                            if (here) Text(
                                "you are here", Modifier.clip(RoundedCornerShape(50)).background(c.rubric).padding(horizontal = 8.dp, vertical = 3.dp),
                                style = LectioText.caption.copy(fontWeight = FontWeight.SemiBold), color = c.onRubric,
                            )
                            Box0(Modifier.weight(1f))
                            QuietLabel("${p.from}–${p.to} days out")
                        }
                        Text(p.focus, style = LectioText.prose(LectioText.body), color = c.ink2)
                        for (t in p.targets) target(t)
                        Hairline(Modifier.padding(top = 12.dp), color = c.hair)
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                RubricLabel("Where you are")
                meter("Required passages opened", read, required.size)
                meter("Core vocabulary in rotation", inRotation, library.coreVocabulary.size)
                meter("Translation drills attempted", drillsTried, library.translationDrills.size)
                Text(
                    "${model.progress.studyDays.size} days studied since you started. " +
                        if (model.progress.quizAttempts.isEmpty()) "Nothing logged yet — the plan gets more useful once there’s data behind it."
                        else "${model.progress.quizAttempts.size} questions answered, ${model.progress.translationAttempts.size} translations logged.",
                    style = LectioText.prose(LectioText.callout), color = c.ink2,
                )
            }
        }
    }
}

@Composable
private fun Box0(modifier: Modifier) = androidx.compose.foundation.layout.Box(modifier)

private fun examDateLabel(iso: String): String {
    val parts = iso.split("-").mapNotNull { it.toIntOrNull() }
    if (parts.size != 3) return iso
    val date = runCatching { LocalDate.of(parts[0], parts[1], parts[2]) }.getOrNull() ?: return iso
    return date.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.getDefault()))
}
