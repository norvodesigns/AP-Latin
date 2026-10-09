package com.norvodesigns.lectio.features.learn

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Course
import com.norvodesigns.lectio.core.CurriculumLevel
import com.norvodesigns.lectio.core.CurriculumUnit
import com.norvodesigns.lectio.core.Lesson
import com.norvodesigns.lectio.core.LessonPlace
import com.norvodesigns.lectio.core.LessonProgress
import com.norvodesigns.lectio.core.Path
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.IconBadge
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import androidx.compose.ui.unit.sp

/** Which track the map shows. */
enum class CourseTrack(val title: String) { Grammar("Grammar"), Vocabulary("Vocabulary") }

/**
 * The course: two tracks side by side, the web's /learn.
 *
 *  - **Grammar**, Prīma to Quārta, taken in order from where the level check
 *    (or the student) starts it.
 *  - **Vocabulary**, Verba: every word on the AP list, by letter, in lessons of
 *    about twelve. It adapts: lessons whose words are already known are passed
 *    over, and each unit ends in a test that, passed, skips the unit.
 *
 * At the top, "Your path": the next lesson of each track, and the level check.
 * A lesson opens over everything, full screen (see [LessonScreen]).
 */
@Composable
fun CourseScreen(model: AppModel) {
    val c = Lectio.colors
    val library = model.content
    var track by remember { mutableStateOf(CourseTrack.entries.firstOrNull { it.name == model.prefs.string("courseTrack") } ?: CourseTrack.Grammar) }
    var checking by remember { mutableStateOf(false) }
    val done = model.courseDone

    PageScaffold("Course") { padding ->
        ScreenColumn(Modifier.padding(padding), spacing = 16.dp) {
            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Latin, from the first word", style = LectioText.prose(LectioText.title), color = c.ink)
                Text(
                    "Grammar in short lessons, in order, and the AP word list by letter beside it. The words you learn join your flashcards, and the path leads to the AP syllabus.",
                    style = LectioText.prose(LectioText.body), color = c.inkMuted,
                )
            }

            PathPanel(model) { checking = true }

            if (library?.course?.grammarLessons?.isNotEmpty() == true) {
                Panel(title = "Practise") { PracticeRows(model) }
            }

            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                CourseTrack.entries.forEachIndexed { i, t ->
                    SegmentedButton(
                        selected = track == t,
                        onClick = {
                            track = t
                            model.prefs.put("courseTrack", t.name)
                        },
                        shape = SegmentedButtonDefaults.itemShape(i, CourseTrack.entries.size),
                        colors = SegmentedButtonDefaults.colors(
                            activeContainerColor = c.rubric, activeContentColor = c.onRubric, activeBorderColor = c.rubric,
                            inactiveContainerColor = c.slip, inactiveContentColor = c.ink2, inactiveBorderColor = c.ruleStrong,
                        ),
                        icon = {},
                    ) { Text(t.title, style = LectioText.subheadline.copy(fontWeight = FontWeight.Medium)) }
                }
            }

            if (library != null) {
                when (track) {
                    CourseTrack.Grammar -> for (level in library.course.grammarLevels) {
                        LevelHeader(level)
                        for (unit in level.units) {
                            UnitPanel(model, unit, "${level.title} · Unit ${unit.n}", false, done, model.nextCourseLesson?.id)
                        }
                    }
                    CourseTrack.Vocabulary -> {
                        val verba = library.course.vocabLevel
                        if (verba != null) {
                            VerbaHeader(model, verba)
                            for (unit in verba.units) UnitPanel(model, unit, "Unit ${unit.n}", true, done, model.nextVocabLesson?.id)
                        } else {
                            Text("The vocabulary track arrives with the next content update.", style = LectioText.prose(LectioText.callout), color = c.inkMuted)
                        }
                    }
                }
            }
        }
    }
    if (checking) LevelCheckScreen(model, onClose = { checking = false })
}

/* ------------------------------------------------------------------ */
/* Your path                                                           */
/* ------------------------------------------------------------------ */

/** The next lesson of each track, and the level check. */
@Composable
private fun PathPanel(model: AppModel, onCheck: () -> Unit) {
    val c = Lectio.colors
    Panel(title = "Your path") {
        Column {
            PathRow(model, CourseTrack.Grammar, model.nextCourseLesson, "You have finished every grammar lesson written so far.")
            Hairline(color = c.hair)
            PathRow(model, CourseTrack.Vocabulary, model.nextVocabLesson, "You know every word on the AP list. Your flashcards keep them fresh.")
            model.shakyLesson?.let { shaky ->
                Hairline(color = c.hair)
                RetryRow(model, shaky, model.progress.lessons[shaky.lesson.id]?.best ?: 0.0)
            }
        }
        LectioButton(onCheck, Modifier.fillMaxWidth()) {
            ButtonLabel(if (model.progress.learner == null) "Find my level" else "Check my level again", "scope")
        }
    }
}

@Composable
private fun PathRow(model: AppModel, track: CourseTrack, place: LessonPlace?, empty: String) {
    val c = Lectio.colors
    if (place == null) {
        Column(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            QuietLabel(track.title)
            Text(empty, style = LectioText.prose(LectioText.callout), color = c.inkMuted)
        }
        return
    }
    val tint = if (track == CourseTrack.Grammar) c.rubric else c.woad
    val symbol = if (place.lesson.isTest) "checkmark.seal" else if (track == CourseTrack.Grammar) "text.book.closed" else "character.book.closed"
    val detail = when {
        place.lesson.isTest -> "The level check thinks you know these. Pass the test to skip the unit · ${place.lesson.minutes} min"
        place.level.isVocabulary -> "Verba · ${place.unit.title} · ${place.lesson.words.size} words · ${place.lesson.minutes} min"
        else -> "${place.level.title} · Unit ${place.unit.n} · Lesson ${place.number} · ${place.lesson.minutes} min"
    }
    Row(
        Modifier.fillMaxWidth().clickable(role = Role.Button) { model.openLesson(place.lesson.id) }.padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBadge(symbol, tint, background = tint.copy(alpha = 0.14f))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            QuietLabel(track.title)
            RichText(place.lesson.title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text(detail, style = LectioText.subheadline, color = c.inkMuted)
        }
        Symbol("play.circle.fill", tint = c.rubric, size = 30.dp)
    }
}

/** A lesson that went badly, offered again: a second try usually goes much better. */
@Composable
private fun RetryRow(model: AppModel, place: LessonPlace, best: Double) {
    val c = Lectio.colors
    Row(
        Modifier.fillMaxWidth().clickable(role = Role.Button) { model.openLesson(place.lesson.id) }.padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBadge("arrow.counterclockwise", c.gilt, background = c.gilt.copy(alpha = 0.14f))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            QuietLabel("Worth another go")
            RichText(place.lesson.title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text("Best ${Math.round(best * 100)}% · a second try usually goes much better", style = LectioText.subheadline, color = c.inkMuted)
        }
        Symbol("play.circle.fill", tint = c.gilt, size = 30.dp)
    }
}

/** The next lesson, large, with its button. Leads Today for a student in the course. */
@Composable
fun ContinueCard(model: AppModel, place: LessonPlace, first: Boolean, framed: Boolean = true) {
    val c = Lectio.colors
    val body: @Composable () -> Unit = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            RubricLabel(if (first) "Start here" else "Continue")
            QuietLabel("${place.level.title} · Unit ${place.unit.n} · Lesson ${place.number}")
            RichText(place.lesson.title, style = LectioText.prose(LectioText.title2), color = c.ink)
            RichText(place.lesson.summary, style = LectioText.prose(LectioText.callout), color = c.ink2)
            LectioButton({ model.openLesson(place.lesson.id) }, Modifier.fillMaxWidth().padding(top = 6.dp), prominent = true) {
                ButtonLabel(if (first) "Begin · ${place.lesson.minutes} min" else "Continue · ${place.lesson.minutes} min", "play.fill")
            }
        }
    }
    if (framed) {
        androidx.compose.material3.Surface(
            shape = RoundedCornerShape(20.dp), color = c.slip, border = androidx.compose.foundation.BorderStroke(0.75.dp, c.rule),
        ) { Column(Modifier.padding(20.dp)) { body() } }
    } else {
        body()
    }
}

/** Ways to practise what the course has taught, side by side: Review and the sentence builder. */
@Composable
private fun PracticeRows(model: AppModel) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            if (model.canReview) "Review mixes ten exercises from lessons you’ve finished, more from the ones you found hard. The sentence builder has you rebuild eight sentences from tiles."
            else "The sentence builder has you rebuild eight sentences from the course, from tiles. Review joins it once you’ve finished a lesson or two.",
            style = LectioText.prose(LectioText.callout), color = c.ink2,
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (model.canReview) {
                LectioButton({ model.openReview() }, Modifier.weight(1f)) { ButtonLabel("Review · 6 min", "arrow.triangle.2.circlepath") }
            }
            LectioButton({ model.openSentences() }, Modifier.weight(1f)) { ButtonLabel("Build · 5 min", "rectangle.stack") }
        }
    }
}

/* ------------------------------------------------------------------ */
/* The map                                                             */
/* ------------------------------------------------------------------ */

@Composable
private fun LevelHeader(level: CurriculumLevel) {
    val c = Lectio.colors
    Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Text(level.numeral, style = LectioText.prose(androidx.compose.ui.text.TextStyle(fontSize = 40.sp)), color = c.rubric)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                androidx.compose.ui.text.buildAnnotatedString {
                    append("${level.title} · ")
                    pushStyle(androidx.compose.ui.text.SpanStyle(color = c.inkMuted))
                    append(level.subtitle)
                    pop()
                },
                style = LectioText.prose(LectioText.title2), color = c.ink,
            )
            Text(level.blurb, style = LectioText.prose(LectioText.callout), color = c.ink2)
        }
    }
}

/** Verba's heading: what it is, and how much of the list is known. */
@Composable
private fun VerbaHeader(model: AppModel, level: CurriculumLevel) {
    val c = Lectio.colors
    val (known, total) = model.wordsKnown
    Column(Modifier.padding(top = 14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                androidx.compose.ui.text.buildAnnotatedString {
                    append("${level.title} · ")
                    pushStyle(androidx.compose.ui.text.SpanStyle(color = c.inkMuted))
                    append(level.subtitle)
                    pop()
                },
                style = LectioText.prose(LectioText.title2), color = c.ink,
            )
            Text(level.blurb, style = LectioText.prose(LectioText.callout), color = c.ink2)
        }
        FigureRow(spacing = 26.dp) {
            Figure("$known", "words known", tint = c.woad)
            Figure("${model.vocab.size}", "in your deck")
            Figure("$total", "on the list")
        }
    }
}

/**
 * A unit as a panel: its title, progress and, opened, its lessons. The unit
 * holding the next lesson starts open. A unit's test, the quickest way past
 * what's already known, shows even when it's closed.
 */
@Composable
private fun UnitPanel(model: AppModel, unit: CurriculumUnit, label: String, isVocabulary: Boolean, done: Set<String>, next: String?) {
    val c = Lectio.colors
    var expanded by remember(unit.id) { mutableStateOf(unit.lessons.any { it.id == next }) }
    val progress = Course.unitProgress(unit, done)
    val test = unit.lessons.firstOrNull { it.isTest }
    val lessons = unit.lessons.filter { !it.isTest }
    val pctText = "${Math.round(progress * 100)}%"
    Panel {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Button) { expanded = !expanded },
            horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                RubricLabel(label)
                RichText(unit.title, style = LectioText.prose(LectioText.title3), color = c.ink)
            }
            Text(pctText, style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = if (progress >= 1) c.correct else c.inkMuted)
            Symbol("chevron.down", tint = c.inkFaint, size = 20.dp, modifier = Modifier.rotate(if (expanded) 0f else -90f))
        }
        LectioProgress(progress.toFloat(), tint = if (progress >= 1) c.correct else c.rubric)

        if (isVocabulary) {
            // A vocabulary unit: how many of its words are in the deck, and how many are held fast.
            val ids = unit.lessons.flatMap { it.vocabIds }
            val inDeck = ids.count { model.vocab[it] != null }
            val known = ids.count { (model.vocab[it]?.interval ?: 0) >= Path.knownInterval }
            Text("${ids.size} words · $inDeck in your deck · $known known", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
        }
        // A finished unit doesn't need its test, unless it was taken.
        if (test != null && (progress < 1 || model.progress.lessons[test.id] != null)) TestRow(model, test, unit)

        AnimatedVisibility(expanded) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                RichText(unit.blurb, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
                Column {
                    val intervals = remember(model.vocab) { model.vocab.mapValues { it.value.interval } }
                    lessons.forEachIndexed { i, lesson ->
                        if (i > 0) Hairline(color = c.hair)
                        LessonRow(
                            i + 1, lesson, model.progress.lessons[lesson.id], Path.lessonKnown(lesson.vocabIds, intervals), lesson.id == next,
                        ) { model.openLesson(lesson.id) }
                    }
                }
            }
        }
    }
}

/** A unit's test (grammar or vocabulary): what it does, how the last try went, and the button. Prominent when the level check thinks the unit is known. */
@Composable
private fun TestRow(model: AppModel, test: Lesson, unit: CurriculumUnit) {
    val c = Lectio.colors
    val record = model.progress.lessons[test.id]
    val suggested = unit.id in model.knownVocabUnits && record == null
    val passed = (record?.best ?: 0.0) >= Path.testPass
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                if (passed) "Unit test passed" else if (suggested) "You probably know these" else "Know these already?",
                style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = if (passed) c.correct else c.ink,
            )
            Text(
                record?.let { "Best ${Math.round(it.best * 100)}% · ${Math.round(Path.testPass * 100)}% passes" }
                    ?: "${test.exerciseCount} questions from the whole unit. Pass to skip it.",
                style = LectioText.footnote, color = c.inkMuted,
            )
        }
        LectioButton({ model.openLesson(test.id) }, prominent = suggested) {
            ButtonLabel(if (record == null) "Take the test" else "Again", "checkmark.seal")
        }
    }
}

@Composable
private fun LessonRow(number: Int, lesson: Lesson, record: LessonProgress?, known: Boolean, isNext: Boolean, open: () -> Unit) {
    val c = Lectio.colors
    val testedOut = record?.attempts == 0
    val status = when {
        testedOut -> "tested out"
        record != null -> "${Math.round(record.best * 100)}%"
        known -> "known"
        else -> "${lesson.minutes} min"
    }
    Row(
        Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = open).padding(vertical = 11.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.width(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            when {
                record != null -> Symbol("checkmark", tint = c.correct, size = 20.dp)
                known -> Symbol("checkmark", tint = c.inkFaint, size = 20.dp)
                else -> Text("$number", style = LectioText.prose(LectioText.body).copy(fontFeatureSettings = "tnum"), color = if (isNext) c.rubric else c.inkFaint)
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            RichText(
                lesson.title, style = LectioText.prose(LectioText.headline).copy(fontWeight = if (isNext) FontWeight.SemiBold else FontWeight.Normal),
                color = if (isNext) c.rubric else c.ink,
            )
            RichText(lesson.summary, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
        }
        Spacer(Modifier.width(4.dp))
        Text(status, style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = if (record != null) c.correct else c.inkFaint)
    }
}
