package com.norvodesigns.lectio.features.scansion

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.ScansionAttempt
import com.norvodesigns.lectio.core.ScansionCorpus
import com.norvodesigns.lectio.core.ScansionHistory
import com.norvodesigns.lectio.core.ScansionLine
import com.norvodesigns.lectio.core.ScansionStats
import com.norvodesigns.lectio.core.ScansionWork
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import kotlin.math.roundToInt

private const val PAGE = 40

/** The scans the "where the points go" breakdown reads. */
private const val RECENT = 40

private enum class HistoryFilter(val label: String) { All("All"), Missed("Not perfect"), Perfect("Perfect") }

private val ScansionAttempt.isPerfect: Boolean get() = total > 0 && correct == total

/** Lines from the corpus, loaded a book at a time off the main thread. */
private class LineCache {
    val byId = mutableStateMapOf<String, ScansionLine>()
    private val loaded = HashSet<Int>()

    suspend fun load(books: List<Int>, corpus: ScansionCorpus) {
        for (book in books) {
            if (book in loaded) continue
            val lines = runCatching { withContext(Dispatchers.IO) { corpus.loadBook(book) } }.getOrNull() ?: continue
            loaded.add(book)
            byId.putAll(lines.associateBy { it.id })
        }
    }
}

private fun citation(lineId: String, line: ScansionLine?): String =
    line?.citation ?: ScansionCorpus.parseLineId(lineId)?.let { "Aeneid ${it.first}.${it.second}" } ?: lineId

private fun ordinal(n: Int): String {
    val v = n % 100
    val suffix = if (v in 11..13) "th" else when (n % 10) { 1 -> "st"; 2 -> "nd"; 3 -> "rd"; else -> "th" }
    return "$n$suffix"
}

private fun localDateTime(at: String) = runCatching { Instant.parse(at).atZone(ZoneId.systemDefault()) }.getOrNull()

private fun dayLabel(day: LocalDate): String {
    val today = LocalDate.now()
    return when (day) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        else -> day.format(DateTimeFormatter.ofPattern("EEEE d MMMM"))
    }
}

private fun timeLabel(at: String): String =
    localDateTime(at)?.format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT)) ?: ""

/**
 * Every line checked in the Scansion Lab, newest first
 * (src/app/scansion/history/ScansionHistory.tsx).
 */
@Composable
internal fun ScansionHistoryScreen(model: AppModel, corpus: ScansionCorpus, onOpen: (String) -> Unit, onBack: () -> Unit) {
    val c = Lectio.colors
    val attempts = model.progress.scansionAttempts
    val newestFirst = remember(attempts) { attempts.asReversed().toList() }
    var filter by remember { mutableStateOf(HistoryFilter.All) }
    var shown by remember { mutableIntStateOf(PAGE) }
    val cache = remember { LineCache() }

    val filtered = newestFirst.filter {
        when (filter) {
            HistoryFilter.All -> true
            HistoryFilter.Perfect -> it.isPerfect
            HistoryFilter.Missed -> !it.isPerfect
        }
    }
    val visible = filtered.take(shown)
    val tries = remember(attempts) { ScansionHistory.tryNumbers(attempts) }
    val latest = remember(attempts) { ScansionHistory.latestIds(attempts) }
    val wanted = (visible + newestFirst.take(RECENT)).mapNotNull { ScansionCorpus.parseLineId(it.lineId)?.first }.distinct().sorted()
    LaunchedEffect(wanted) { cache.load(wanted, corpus) }

    PageScaffold("Your scans", onBack = onBack) { padding ->
        if (attempts.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Symbol("waveform.path", tint = c.inkMuted, size = 44.dp)
                Text("No scans yet", style = LectioText.prose(LectioText.title2), color = c.ink)
                Text(
                    "Check a line in the Scansion Lab and it appears here, with the marks you made and what was right.",
                    style = LectioText.prose(LectioText.callout), color = c.inkMuted,
                )
            }
            return@PageScaffold
        }
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 20.dp) {
            Summary(attempts)
            Breakdown(newestFirst.take(RECENT), cache, latest, model)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (f in HistoryFilter.entries) Chip(f.label, filter == f) { filter = f; shown = PAGE }
            }
            if (visible.isEmpty()) {
                Text(
                    if (filter == HistoryFilter.Perfect) "No perfect scans yet." else "Every scan so far is perfect.",
                    style = LectioText.prose(LectioText.callout), color = c.inkMuted,
                )
            }
            var lastDay: LocalDate? = null
            for (a in visible) {
                val day = localDateTime(a.at)?.toLocalDate()
                if (day != null && day != lastDay) {
                    QuietLabel(dayLabel(day), Modifier.padding(top = 8.dp))
                    lastDay = day
                }
                HistoryRow(a, cache.byId[a.lineId], tries[a.id] ?: 1) { onOpen(a.id) }
            }
            if (filtered.size > visible.size) {
                LectioButton({ shown += PAGE }) { ButtonLabel("Show ${minOf(PAGE, filtered.size - visible.size)} more") }
            }
        }
    }
}

@Composable
private fun Summary(attempts: List<ScansionAttempt>) {
    val stats = ScansionStats.byLine(attempts)
    val recent = attempts.takeLast(20)
    val right = recent.sumOf { it.correct }
    val total = recent.sumOf { it.total }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(Modifier.fillMaxWidth()) {
            Figure("${attempts.size}", if (attempts.size == 1) "scan" else "scans", Modifier.weight(1f))
            Figure("${stats.size}", if (stats.size == 1) "line" else "different lines", Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth()) {
            Figure("${stats.values.count { it.mastered }}", "mastered", Modifier.weight(1f))
            Figure(if (total > 0) "${(right * 100.0 / total).roundToInt()}%" else "—", "right, last ${recent.size}", Modifier.weight(1f))
        }
    }
}

/** Which of the three halves of scanning costs the most, over recent scans whose marks were kept. */
@Composable
private fun Breakdown(recent: List<ScansionAttempt>, cache: LineCache, latest: Set<String>, model: AppModel) {
    val c = Lectio.colors
    val scores = recent.mapNotNull { a ->
        val line = cache.byId[a.lineId] ?: return@mapNotNull null
        ScansionHistory.reviewed(a, line, a.id in latest, model.progress.scansionDraft(a.lineId))?.score
    }
    if (scores.isEmpty()) return
    fun pct(a: Int, b: Int) = if (b > 0) (a * 100.0 / b).roundToInt() else 100
    val rows = listOf(
        "Syllables" to pct(scores.sumOf { it.syllables }, scores.sumOf { it.syllablesTotal }),
        "Feet" to pct(scores.sumOf { it.boundaries }, scores.sumOf { it.boundariesTotal }),
        "Elisions" to pct(scores.sumOf { it.elisions }, scores.sumOf { it.elisionsTotal }),
    )
    val weakest = rows.minOf { it.second }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RubricLabel("Where the points go")
        Row(Modifier.fillMaxWidth()) {
            for ((label, value) in rows) {
                Figure("$value%", label, Modifier.weight(1f), tint = if (value == weakest && value < 90) c.rubric else c.ink)
            }
        }
        Text(
            "Across your last ${scores.size} scan${if (scores.size == 1) "" else "s"} with marks kept",
            style = LectioText.footnote, color = c.inkFaint,
        )
    }
}

@Composable
private fun HistoryRow(a: ScansionAttempt, line: ScansionLine?, tryNumber: Int, onClick: () -> Unit) {
    val c = Lectio.colors
    Column(Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick).semantics(mergeDescendants = true) {}) {
        Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(citation(a.lineId, line), style = LectioText.latin(20.sp), color = c.ink)
                Text(
                    line?.latin ?: " ", style = LectioText.latinItalic(16.sp), color = c.inkMuted,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (a.isPerfect) Symbol("star.fill", tint = c.gilt, size = 14.dp, contentDescription = "Perfect")
                    Text("${a.correct} / ${a.total}", style = LectioText.latin(19.sp).copy(fontFeatureSettings = "tnum"), color = if (a.isPerfect) c.gilt else c.ink)
                }
                QuietLabel(timeLabel(a.at) + if (tryNumber > 1) " · ${ordinal(tryNumber)} try" else "")
            }
        }
        HorizontalDivider(color = c.hair, thickness = 0.5.dp)
    }
}

/* ------------------------------------------------------------------ */
/* One scan                                                            */
/* ------------------------------------------------------------------ */

/** One checked line again: the student's marks, coloured right and wrong, above the right scansion. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ScanResultScreen(
    model: AppModel,
    corpus: ScansionCorpus,
    attemptId: String,
    onOpen: (String) -> Unit,
    onBack: () -> Unit,
    scanAgain: (String) -> Unit,
) {
    val c = Lectio.colors
    val attempts = model.progress.scansionAttempts
    val attempt = attempts.firstOrNull { it.id == attemptId }
    val cache = remember { LineCache() }
    val book = attempt?.let { ScansionCorpus.parseLineId(it.lineId)?.first }
    LaunchedEffect(book) { if (book != null) cache.load(listOf(book), corpus) }
    val line = attempt?.let { cache.byId[it.lineId] }

    PageScaffold(attempt?.let { citation(it.lineId, line) } ?: "Scan", onBack = onBack) { padding ->
        if (attempt == null) {
            Column(Modifier.fillMaxSize().padding(padding).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text("That scan isn’t in your history", style = LectioText.prose(LectioText.title2), color = c.ink)
                Text("It may have been made on another device that hasn’t synced yet.", Modifier.padding(top = 8.dp), style = LectioText.subheadline, color = c.inkMuted)
            }
            return@PageScaffold
        }
        val latest = ScansionHistory.latestIds(attempts)
        val work = line?.let { ScansionHistory.reviewed(attempt, it, attempt.id in latest, model.progress.scansionDraft(attempt.lineId)) }
        val sameLine = attempts.filter { it.lineId == attempt.lineId }
        val tryNumber = sameLine.indexOfFirst { it.id == attempt.id } + 1
        val whenLabel = localDateTime(attempt.at)?.format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)) ?: ""
        val pct = if (attempt.total > 0) (attempt.correct * 100.0 / attempt.total).roundToInt() else 0

        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 24.dp) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                RubricLabel("Scanned $whenLabel" + if (tryNumber > 1) " · ${ordinal(tryNumber)} try" else "")
                if (line != null) Text(line.latin, style = LectioText.latinItalic(20.sp), color = c.ink2)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "${attempt.correct} of ${attempt.total}",
                        style = LectioText.prose(LectioText.largeTitle).copy(fontWeight = FontWeight.SemiBold),
                        color = if (attempt.isPerfect) c.gilt else c.ink,
                    )
                    QuietLabel(if (attempt.isPerfect) "perfect" else "$pct% right", Modifier.padding(bottom = 6.dp))
                }
                work?.score?.let { s ->
                    Text(
                        "Syllables ${s.syllables}/${s.syllablesTotal} · Feet ${s.boundaries}/${s.boundariesTotal} · Elisions ${s.elisions}/${s.elisionsTotal}",
                        style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink2,
                    )
                }
            }

            if (line == null) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = c.inkMuted, strokeWidth = 2.dp) }
            } else {
                if (work != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        RubricLabel("Your scansion")
                        LineScansion(work, Tool.Quantity, 0, readOnly = true) {}
                    }
                } else {
                    Text(
                        "Lectio didn’t keep the marks for scans made before the history was added, so only the score is shown for this one. The right scansion is below.",
                        style = LectioText.prose(LectioText.callout), color = c.inkMuted,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    RubricLabel("The scansion")
                    LineScansion(ScansionHistory.answer(line), Tool.Quantity, 0, isAnswer = true, readOnly = true) {}
                    Text(
                        line.feet.joinToString(" ") { if (it == "dactyl") "D" else "S" } +
                            if (line.caesurae.isEmpty()) "" else " · caesurae: " + line.caesurae.joinToString(", ") { it.type },
                        style = LectioText.footnote, color = c.inkMuted,
                    )
                }
                if (work != null) Mistakes(work)
            }

            if (sameLine.size > 1) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    RubricLabel("Every scan of this line")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        sameLine.forEachIndexed { i, a ->
                            Chip("${ordinal(i + 1)} · ${a.correct}/${a.total}", a.id == attempt.id) { onOpen(a.id) }
                        }
                    }
                }
            }

            LectioButton({ scanAgain(attempt.lineId) }, Modifier.fillMaxWidth(), prominent = true) {
                ButtonLabel("Scan it again", style = LectioText.headline)
            }
        }
    }
}

/** What went wrong, a sentence each: quantities, boundaries, elisions. */
@Composable
private fun Mistakes(work: ScansionWork) {
    val c = Lectio.colors
    val line = work.line
    val metrical = work.metricalIndices
    val sentences = buildList {
        for (i in metrical) {
            if (work.result(i) == ScansionWork.SyllableResult.Ok) continue
            val syl = line.syllables[i]
            val given = work.marks[i]?.let { "you marked it $it" } ?: "you left it unmarked"
            add("${syl.text} is ${syl.quantity} — $given. ${ScansionHistory.explainQuantity(line, i)}")
        }
        for (d in work.divisions) if (!work.boundaryCorrect(d)) add("No foot ends after ${line.syllables[d].text}, but you ruled a boundary there.")
        for (m in work.correctDivisions) {
            val raw = metrical.getOrNull(m) ?: continue
            if (raw !in work.divisions) add("A foot ends after ${line.syllables[raw].text}.")
        }
        for (i in work.elidableIndices) {
            if (work.elisionCorrect(i)) continue
            val text = line.syllables[i].text
            add(if (line.syllables[i].isElided) "$text elides into the next word — you left it unmarked." else "$text does not elide — you marked it as eliding.")
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (sentences.isEmpty()) {
            Text("Every quantity, every foot boundary and every elision right.", style = LectioText.prose(LectioText.body), color = c.ink2)
        } else {
            RubricLabel("What to look at")
            for (s in sentences) Text(s, style = LectioText.prose(LectioText.body), color = c.ink)
        }
    }
}
