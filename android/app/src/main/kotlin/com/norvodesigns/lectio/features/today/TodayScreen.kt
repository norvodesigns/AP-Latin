package com.norvodesigns.lectio.features.today

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.SectionEntry
import com.norvodesigns.lectio.core.Course
import com.norvodesigns.lectio.core.Insights
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.Recap
import com.norvodesigns.lectio.core.Sententia
import com.norvodesigns.lectio.core.SpacedRepetition
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.core.Streaks
import com.norvodesigns.lectio.core.Tally
import com.norvodesigns.lectio.features.learn.ContinueCard
import com.norvodesigns.lectio.ui.components.AdaptiveGrid
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.FixedGrid
import com.norvodesigns.lectio.ui.components.GoalRing
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.IconBadge
import com.norvodesigns.lectio.ui.components.LabelRow
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.NextUpRow
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.FirstVisitTip
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.ambient
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/**
 * The dashboard, as a stack of panels, each one thing: how long until the exam
 * and how today's going, where to pick up, the Sententia, a way into every
 * other section, then the vocabulary, reading, week, skills, weak spots and
 * laurels. Every section of the app is also in Browse (the Search tab), so
 * nothing here is the only way to anywhere.
 */
@Composable
fun TodayScreen(model: AppModel) {
    val c = Lectio.colors
    Box(Modifier.fillMaxSize().ambient()) {
        Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).statusBarsPadding(), contentAlignment = Alignment.TopCenter) {
            Column(
                Modifier.widthIn(max = 960.dp).fillMaxWidth().padding(start = 20.dp, end = 20.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Header(model)
                TodayTip()
                if (model.courseFirstOnToday) {
                    model.nextCourseLesson?.let { next ->
                        Panel { ContinueCard(model, next, first = model.courseDone.isEmpty(), framed = false) }
                    }
                }
                Hero(model)
                PickUpPanel(model)
                model.todaysSententia?.let { line -> Panel { SententiaCard(model, line) } }
                JumpPanel(model)
                Panels(model)
            }
        }
        IconButton(
            onClick = { model.selectedTab = AppTab.Settings },
            modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(end = 8.dp),
        ) { Symbol("gearshape", tint = c.ink2, contentDescription = "Settings") }
    }
}

@Composable
private fun Header(model: AppModel) {
    val c = Lectio.colors
    Column(Modifier.padding(top = 12.dp, bottom = 4.dp, end = 48.dp)) {
        Text("Lectio", style = LectioText.wordmark(64.sp), color = c.rubric)
        Text(
            if (model.courseFirstOnToday) "Latin, from the first word" else "AP Latin · Vergil and Pliny",
            style = LectioText.prose(LectioText.subheadline), color = c.inkMuted,
        )
    }
}

/** A first-visit tip: shown once, in place, the first time a student reaches the screen it explains. */
@Composable
fun TodayTip() = FirstVisitTip(
    key = "tip.today", title = "Your day starts here", symbol = "sun.horizon",
    message = "Today shows your next lesson, the cards that are due, and how close you are to your daily goal. Tap any panel to go straight in.",
)

/** Browse: the whole app in one list. */
@Composable
fun BrowseTip() = FirstVisitTip(
    key = "tip.browse", title = "Everything is here", symbol = "square.grid.2x2",
    message = "Every part of Lectio in one list, and search finds passages, words and lessons.",
)

/* ---------------------------------------------------------------- */
/* Today: the countdown (or the course), the goal, the numbers        */
/* ---------------------------------------------------------------- */

@Composable
private fun Hero(model: AppModel) {
    val c = Lectio.colors
    val progress = model.progress
    val library = model.content
    val examDate = library?.meta?.examDate ?: "2027-05-14"
    val days = Streaks.daysUntilExam(examDate)
    val due = SpacedRepetition.due(model.vocab.values, StudyDates.today()).size
    val dateText = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMM d")) }
    Panel(title = "Today", trailing = dateText) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (model.courseFirstOnToday) CourseFigure(model) else ExamFigure(days, examDate)
            }
            GoalRing(model.studySecondsToday, progress.studyPlan.minutesPerDay)
        }
        Hairline(color = c.hair)
        FigureRow(spacing = 28.dp) {
            Figure("${Streaks.current(progress.studyDays)}", "day streak")
            Figure("${Streaks.longest(progress.studyDays)}", "longest")
            Figure("$due", if (due == 1) "card due" else "cards due")
        }
    }
}

@Composable
private fun ExamFigure(days: Int, examDate: String) {
    val c = Lectio.colors
    Figure("$days", if (days == 1) "day until the exam" else "days until the exam", tint = c.rubric)
    if (days > 0) {
        val whenText = runCatching { LocalDate.parse(examDate).format(DateTimeFormatter.ofPattern("d MMMM yyyy")) }.getOrNull()
        if (whenText != null) {
            val weeks = days / 7
            Text(
                if (weeks >= 1) "$whenText · $weeks week${if (weeks == 1) "" else "s"} to go" else whenText,
                style = LectioText.prose(LectioText.footnote), color = c.inkMuted,
            )
        }
    }
}

/** For a student in the course: lessons finished, and the unit in hand. */
@Composable
private fun CourseFigure(model: AppModel) {
    val c = Lectio.colors
    val done = model.courseDone
    val (finished, total) = model.grammarProgress
    val next = model.nextCourseLesson
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Figure("$finished", "of $total lessons finished", tint = c.rubric)
        if (next != null) {
            val pct = Course.unitProgress(next.unit, done)
            LectioProgress(pct.toFloat())
            QuietLabel("${next.level.title} · Unit ${next.unit.n} of ${next.level.units.size} · ${Rich.plain(next.unit.title)}")
        }
    }
}

/* ---------------------------------------------------------------- */
/* Passages the student has opened                                    */
/* ---------------------------------------------------------------- */

/** Passages the student has opened, each with when it was last opened. */
private fun AppModel.openedPassages(): List<Pair<String, String>> =
    progress.raw.obj("passages").mapNotNull { (id, state) -> state["lastOpened"]?.stringValue?.let { id to it } }

private fun AppModel.lastOpenedPassage(): Passage? =
    openedPassages().maxByOrNull { it.second }?.let { content?.passage(it.first) }

/* ---------------------------------------------------------------- */
/* Pick up                                                             */
/* ---------------------------------------------------------------- */

private class PickUpItem(val id: String, val title: String, val detail: String, val symbol: String, val action: () -> Unit)

/** Where to pick up: the next lesson, the passage last opened, the cards due. */
@Composable
private fun PickUpPanel(model: AppModel) {
    val c = Lectio.colors
    val items = buildList {
        // The course leads Today itself for a student who chose it.
        val lesson = model.nextCourseLesson
        if (lesson != null && !model.courseFirstOnToday && (model.courseInTabBar || model.courseDone.isNotEmpty())) {
            add(
                PickUpItem(
                    "course", if (model.courseDone.isEmpty()) "Start the course" else "Continue the course",
                    "${lesson.level.title} ${lesson.unit.n}.${lesson.number} · ${Rich.plain(lesson.lesson.title)}", "graduationcap",
                ) { model.openLesson(lesson.id) },
            )
        }
        // A lesson that went badly, offered again.
        model.shakyLesson?.let { shaky ->
            val best = Math.round((model.progress.lessons[shaky.lesson.id]?.best ?: 0.0) * 100)
            add(PickUpItem("retry", "Worth another go", "${Rich.plain(shaky.lesson.title)} · best $best%", "arrow.counterclockwise") { model.openLesson(shaky.lesson.id) })
        }
        // The vocabulary track: the next words, or a unit test the level check thinks will skip a unit.
        model.nextVocabLesson?.let { words ->
            add(
                PickUpItem(
                    "words",
                    if (words.lesson.isTest) "Take the ${words.unit.title} test" else "Learn new words",
                    if (words.lesson.isTest) "You probably know these. Pass to skip the unit" else "Verba · ${Rich.plain(words.lesson.title)} · ${words.lesson.words.size} words",
                    if (words.lesson.isTest) "checkmark.seal" else "character.book.closed",
                ) { model.openLesson(words.lesson.id) },
            )
        }
        val passage = model.lastOpenedPassage()
        if (passage != null) {
            add(PickUpItem("read", "Continue reading", passage.citation, "book.closed") { model.openPassage(passage) })
        } else {
            add(PickUpItem("read", "Reading Room", "Every syllabus passage, tap any word", "books.vertical") { model.selectedTab = AppTab.Read })
        }
        val due = SpacedRepetition.due(model.vocab.values, StudyDates.today()).size
        add(
            PickUpItem(
                "vocab", if (due > 0) "Review $due vocabulary card${if (due == 1) "" else "s"}" else "Vocabulary",
                if (due > 0) "Spaced repetition, due today" else "Nothing due — add words from a unit", "rectangle.on.rectangle.angled",
            ) { model.selectedTab = AppTab.Vocab },
        )
        // The quiz has the tab bar's second place unless the course took it.
        if (model.courseInTabBar) {
            add(PickUpItem("quiz", "Quiz Engine", "AP-style multiple choice, every question explained", "checklist") { model.selectedTab = AppTab.Quiz })
        }
    }.take(5) // Today is for the next step, and the rest is a tap away.

    Panel(title = "Pick up") {
        Column {
            items.forEachIndexed { index, item ->
                if (index > 0) Hairline(color = c.hair)
                NextUpRow(item.title, item.detail, item.symbol, onClick = item.action)
            }
        }
    }
}

/* ---------------------------------------------------------------- */
/* Jump to                                                             */
/* ---------------------------------------------------------------- */

private val jumpIds = listOf("translate", "sight", "scansion", "forge", "grammar", "devices", "context", "frq", "exam", "plan", "classroom")

/** A way into the sections that aren't in the tab bar, as a grid of icons; Browse (the last tile) lists them all. */
@Composable
private fun JumpPanel(model: AppModel) {
    val c = Lectio.colors
    val tiles = buildList<@Composable () -> Unit> {
        for (id in jumpIds) {
            val entry = SectionEntry.entry(id) ?: continue
            val tab = entry.tab ?: continue
            add { JumpTile(entry.short, entry.symbol, entry.group.tint(c)) { model.selectedTab = tab } }
        }
        add { JumpTile("Browse", "square.grid.2x2", c.ink2) { model.selectedTab = AppTab.Search } }
    }
    Panel(title = "Jump to") { FixedGrid(4, tiles, horizontalSpacing = 6.dp, verticalSpacing = 16.dp) }
}

@Composable
private fun JumpTile(title: String, symbol: String, tint: Color, onClick: () -> Unit) {
    val c = Lectio.colors
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onClick).padding(vertical = 2.dp).semantics { contentDescription = title },
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        IconBadge(symbol, tint, size = 50.dp)
        Text(title, style = LectioText.caption, color = c.ink2, maxLines = 1, overflow = TextOverflow.Clip)
    }
}

/* ---------------------------------------------------------------- */
/* The smaller panels                                                  */
/* ---------------------------------------------------------------- */

@Composable
private fun Panels(model: AppModel) {
    val library = model.content
    val progress = model.progress
    val quiz = remember(progress) { progress.quizAttempts }
    val recap = remember(progress) { Recap.of(progress) }
    val spots = remember(progress, model.vocab) {
        Insights.weakSpots(quiz, progress.translationAttempts, progress.scansionAttempts, model.vocab, library?.meta?.questionTypeLabels ?: emptyMap())
    }
    val items = buildList<@Composable () -> Unit> {
        add { VocabularyPanel(model) }
        add { ReadingPanel(model) }
        if (!(recap.week.isQuiet && recap.before.isQuiet)) add { WeekPanel(recap) }
        // Empty AP meters say nothing to someone early in the course.
        if (!(model.courseFirstOnToday && quiz.isEmpty())) add { MasteryPanel(quiz) }
        if (spots.isNotEmpty()) add { WeakSpotsPanel(model, spots) }
        add { Panel { com.norvodesigns.lectio.features.laurels.LaurelsTodayRow(model) } }
    }
    AdaptiveGrid(items, minColumnWidth = 320.dp)
}

/** The week of vocabulary ahead: cards due today, then each of the next six days. */
@Composable
private fun ForecastBars(week: List<Int>) {
    val c = Lectio.colors
    val peak = maxOf(1, week.maxOrNull() ?: 1)
    val today = remember { LocalDate.now().dayOfWeek }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
        week.forEachIndexed { i, n ->
            Column(
                Modifier.weight(1f).semantics(mergeDescendants = true) {}, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("$n", style = LectioText.caption2.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
                Box(Modifier.fillMaxWidth().height(maxOf(3f, 52f * n / peak).dp).clip(RoundedCornerShape(3.dp)).background(if (i == 0) c.rubric else c.ruleStrong))
                val label = if (i == 0) "Today" else DayOfWeek.of(((today.value - 1 + i) % 7) + 1).getDisplayName(TextStyle.SHORT, androidx.compose.ui.platform.LocalConfiguration.current.locales[0])
                Text(label, style = LectioText.caption2, color = c.inkFaint, maxLines = 1)
            }
        }
    }
}

/** The deck: what's due, what's still being learned, and the week ahead. */
@Composable
private fun VocabularyPanel(model: AppModel) {
    val c = Lectio.colors
    val forecast = remember(model.vocab) { Insights.forecast(model.vocab) }
    Panel(title = "Vocabulary", trailing = if (model.vocab.isEmpty()) null else "${model.vocab.size} in your deck") {
        if (model.vocab.isEmpty()) {
            Text(
                "Your deck fills as you finish lessons and open passages, and you can add words any time from the vocabulary lists.",
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
        } else {
            FigureRow(spacing = 24.dp) {
                Figure("${forecast.dueNow}", "due now", tint = if (forecast.dueNow > 0) c.rubric else c.ink)
                Figure("${forecast.learning}", "learning")
                Figure("${forecast.mature}", "mature")
            }
            ForecastBars(forecast.week)
        }
        // How much of the AP list is held fast (a mature card).
        val (known, total) = model.wordsKnown
        if (total > 0) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                LabelRow(
                    leading = { Text("The AP word list", style = LectioText.subheadline, color = c.ink) },
                    trailing = { Text("$known of $total known", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted) },
                )
                LectioProgress(if (total > 0) known.toFloat() / total else 0f, tint = c.woad)
            }
        }
        LectioButton({ model.selectedTab = AppTab.Vocab }, Modifier.fillMaxWidth(), prominent = forecast.dueNow > 0) {
            ButtonLabel(if (forecast.dueNow > 0) "Review ${forecast.dueNow} due" else "Open vocabulary", "rectangle.on.rectangle.angled")
        }
    }
}

/** How much of the syllabus has been opened, and where to carry on. */
@Composable
private fun ReadingPanel(model: AppModel) {
    val c = Lectio.colors
    val opened = model.openedPassages().size
    val total = model.content?.passages?.size ?: 0
    Panel(title = "Reading Room", trailing = if (total > 0) "$opened of $total opened" else null) {
        LectioProgress(minOf(opened, maxOf(1, total)).toFloat() / maxOf(1, total))
        val last = model.lastOpenedPassage()
        if (last != null) {
            Column(
                Modifier.fillMaxWidth().clickable(role = Role.Button) { model.openPassage(last) },
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                QuietLabel("Continue reading")
                Text(last.citation, style = LectioText.latin(20.sp), color = c.ink)
                Text(last.title, style = LectioText.subheadline, color = c.inkMuted)
            }
        } else {
            Text("Every syllabus passage, with a gloss on every word.", style = LectioText.prose(LectioText.callout), color = c.ink2)
        }
        LectioButton({ model.selectedTab = AppTab.Read }, Modifier.fillMaxWidth()) { ButtonLabel("Open the Reading Room", "book.closed") }
    }
}

private class WeekTile(val n: Int, val prev: Int, val one: String, val many: String, val note: String? = null)

/** The last seven days beside the seven before, as a grid of numbers. */
@Composable
private fun WeekPanel(recap: Recap) {
    val c = Lectio.colors
    val w = recap.week
    val b = recap.before
    val tiles = listOf(
        WeekTile(w.days, b.days, "day of study", "days of study"),
        WeekTile(w.lessons, b.lessons, "lesson finished", "lessons finished"),
        WeekTile(w.quiz, b.quiz, "quiz question", "quiz questions", if (w.quiz > 0) "${Math.round(w.quizRight.toDouble() / w.quiz * 100)}% right" else null),
        WeekTile(w.cards, b.cards, "flashcard reviewed", "flashcards reviewed"),
        WeekTile(w.sententiae, b.sententiae, "sententia", "sententiae"),
        WeekTile(w.scansion, b.scansion, "line scanned", "lines scanned"),
        WeekTile(w.translations, b.translations, "translation", "translations"),
    ).filter { it.n > 0 || it.prev > 0 }

    fun delta(d: Int) = if (d == 0) "same" else if (d > 0) "+$d" else "−${-d}"
    fun spoken(t: WeekTile): String {
        val d = t.n - t.prev
        val change = if (d == 0) "the same as the week before" else "${Math.abs(d)} ${if (d > 0) "more" else "fewer"} than the week before"
        return "${t.n} ${if (t.n == 1) t.one else t.many}${t.note?.let { ", $it" } ?: ""}, $change"
    }

    Panel(title = "This week", trailing = if (w.isQuiet) "nothing yet" else "vs the week before") {
        FixedGrid(2, tiles.map { t ->
            {
                Column(Modifier.semantics(mergeDescendants = true) { contentDescription = spoken(t) }, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("${t.n}", style = LectioText.figure(LectioText.title2), color = c.ink)
                    Text(if (t.n == 1) t.one else t.many, style = LectioText.caption, color = c.ink2)
                    Text(listOfNotNull(t.note, delta(t.n - t.prev)).joinToString(" · "), style = LectioText.caption2.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
                }
            }
        }, verticalSpacing = 16.dp)
    }
}

private val skillLabels = mapOf("1" to "Read & comprehend", "2" to "Style & context", "3" to "Analyze")

/** Accuracy by skill, weighted as the exam weights it. */
@Composable
private fun MasteryPanel(quiz: List<com.norvodesigns.lectio.core.QuizAttempt>) {
    val c = Lectio.colors
    val mastery = remember(quiz) { Insights.mastery(quiz) }
    fun pct(t: Tally): Double = if (t.total > 0) t.correct.toDouble() / t.total * 100 else 0.0
    val weakest = mastery.filter { it.value.total > 0 }.minByOrNull { pct(it.value) }?.key
    Panel(title = "Mastery by skill", trailing = if (quiz.isEmpty()) null else "${quiz.size} graded") {
        for (k in listOf("1", "2", "3")) {
            val t = mastery[k] ?: Tally(0, 0)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(skillLabels[k] ?: k, style = LectioText.subheadline, color = c.ink)
                    QuietLabel("${Insights.skillWeights[k] ?: 0}% of the exam")
                    Spacer(Modifier.weight(1f))
                    Text(if (t.total > 0) "${pct(t).toInt()}%" else "—", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                }
                LectioProgress((pct(t) / 100).toFloat(), tint = if (k == weakest) c.rubric else c.ink2)
            }
        }
        Text(
            if (quiz.isEmpty()) "Nothing graded yet. These fill in as you work the Quiz Engine." else "A thin bar on the first skill costs the most.",
            style = LectioText.footnote, color = c.inkMuted,
        )
    }
}

/** What the history says to work on, each with its way in. */
@Composable
private fun WeakSpotsPanel(model: AppModel, spots: List<Insights.WeakSpot>) {
    val c = Lectio.colors
    Panel(title = "Weak spots") {
        Column {
            spots.forEachIndexed { index, spot ->
                if (index > 0) Hairline(color = c.hair)
                Row(
                    Modifier.fillMaxWidth().clickable(role = Role.Button) { open(model, spot.destination) }.padding(vertical = 9.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(spot.label, style = LectioText.body, color = c.ink)
                        Text(spot.detail, style = LectioText.footnote, color = c.inkMuted)
                    }
                    spot.pct?.let { Text("$it%", style = LectioText.headline.copy(fontFeatureSettings = "tnum"), color = c.rubric) }
                    Text(spot.action, style = LectioText.footnote.copy(fontWeight = FontWeight.SemiBold), color = c.rubric)
                }
            }
        }
    }
}

private fun open(model: AppModel, destination: Insights.Destination) {
    when (destination) {
        is Insights.Destination.Quiz -> {
            model.quizPresetType = destination.type
            model.selectedTab = AppTab.Quiz
        }
        Insights.Destination.Grammar -> model.selectedTab = AppTab.Grammar
        Insights.Destination.Scansion -> model.selectedTab = AppTab.Scansion
        Insights.Destination.Vocab -> model.selectedTab = AppTab.Vocab
    }
}

/**
 * The Sententia of the day: the line, and three minutes of questions on it;
 * once done, what it says and where it comes from. The website's dashboard has
 * the same card.
 */
@Composable
private fun SententiaCard(model: AppModel, line: Sententia) {
    val c = Lectio.colors
    val done = model.progress.daily[model.dailyDay] != null
    val streak = model.dailyStreak
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        LabelRow(
            leading = { RubricLabel("Sententia · the line for today") },
            trailing = { if (streak > 0) QuietLabel("$streak day${if (streak == 1) "" else "s"} running") },
        )
        Text(line.latin, style = LectioText.latinItalic(22.sp), color = c.ink)
        if (done) {
            Text(
                androidx.compose.ui.text.buildAnnotatedString {
                    append("“${line.english}” ")
                    pushStyle(androidx.compose.ui.text.SpanStyle(color = c.inkMuted))
                    append("— ${Rich.plain(line.source)}")
                    pop()
                },
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
        } else {
            RichText(line.source, style = LectioText.prose(LectioText.callout), color = c.inkMuted)
        }
        LectioButton({ model.openDaily() }, Modifier.padding(top = 4.dp)) {
            ButtonLabel(if (done) "Look again" else "Three questions · 3 min", if (done) "checkmark" else "text.quote")
        }
    }
}
