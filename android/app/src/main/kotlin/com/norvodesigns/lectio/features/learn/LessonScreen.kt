package com.norvodesigns.lectio.features.learn

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.BuildStep
import com.norvodesigns.lectio.core.ChoiceStep
import com.norvodesigns.lectio.core.CourseIds
import com.norvodesigns.lectio.core.Daily
import com.norvodesigns.lectio.core.LessonCheck
import com.norvodesigns.lectio.core.LessonPlace
import com.norvodesigns.lectio.core.LessonStep
import com.norvodesigns.lectio.core.MatchStep
import com.norvodesigns.lectio.core.Path
import com.norvodesigns.lectio.core.SentenceBuilder
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.core.TranslateStep
import com.norvodesigns.lectio.core.TypeStep
import com.norvodesigns.lectio.core.UnknownStep
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private enum class Phase { Intro, Steps, Done }

/** What kind of lesson this is: one of the course's, or one made on the spot, known by its id. */
private enum class Kind { Course, Review, Daily, Derivatives, Sentences }

private fun kindOf(id: String): Kind = when {
    CourseIds.isReview(id) -> Kind.Review
    Daily.isDaily(id) -> Kind.Daily
    CourseIds.isDerivatives(id) -> Kind.Derivatives
    SentenceBuilder.isSentences(id) -> Kind.Sentences
    else -> Kind.Course
}

/**
 * One lesson, full screen: what it teaches, its steps one at a time, then a
 * result: the web's LessonPlayer. An exercise answered wrong comes back once at
 * the end; only the first try counts toward the score.
 */
@Composable
fun LessonScreen(model: AppModel, place: LessonPlace) {
    val c = Lectio.colors
    val lesson = place.lesson
    val kind = kindOf(lesson.id)
    val isSession = kind != Kind.Course
    val haptics = LocalHapticFeedback.current

    var phase by remember(lesson.id) { mutableStateOf(Phase.Intro) }
    val queue = remember(lesson.id) { mutableStateListOf<Int>() }
    var pos by remember(lesson.id) { mutableStateOf(0) }
    val firstTry = remember(lesson.id) { mutableStateMapOf<Int, Boolean>() }
    val requeued = remember(lesson.id) { mutableStateListOf<Int>() }
    var result by remember(lesson.id) { mutableStateOf<Boolean?>(null) }
    var score by remember(lesson.id) { mutableStateOf(0.0) }

    /** Steps this build can show (content from a newer website may have kinds it doesn't know). */
    val playable = remember(lesson.id) { lesson.steps.indices.filter { lesson.steps[it] !is UnknownStep } }
    val exerciseCount = playable.count { lesson.steps[it].isExercise }

    fun start() {
        queue.clear()
        queue.addAll(playable)
        pos = 0
        firstTry.clear()
        requeued.clear()
        result = null
        phase = if (queue.isEmpty()) Phase.Done else Phase.Steps
    }

    fun answered(index: Int, right: Boolean) {
        result = right
        haptics.performHapticFeedback(if (right) HapticFeedbackType.Confirm else HapticFeedbackType.Reject)
        if (firstTry[index] == null) firstTry[index] = right
        if (!right && index !in requeued) {
            requeued.add(index)
            // Again at the end, but before any closing steps after the last exercise (the Sententia's translation), which stay last.
            val lastExercise = lesson.steps.indexOfLast { it.isExercise }
            val outro = queue.indices.firstOrNull { it > pos && queue[it] > lastExercise }
            if (outro != null) queue.add(outro, index) else queue.add(index)
        }
    }

    fun advance() {
        if (pos + 1 < queue.size) {
            result = null
            pos += 1
            return
        }
        val right = firstTry.values.count { it }
        score = LessonCheck.score(right, exerciseCount)
        model.completeLesson(lesson, score)
        result = null
        phase = Phase.Done
    }

    fun close() {
        model.activeLesson = null
    }

    BackHandler { close() }

    Box(Modifier.fillMaxSize().background(c.parchment)) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            // The bar: close, and the progress through the steps.
            Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = ::close) { Symbol("xmark", tint = c.ink, contentDescription = "Close") }
                if (phase == Phase.Steps) {
                    Box(Modifier.weight(1f).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        LectioProgress(pos.toFloat() / maxOf(queue.size, 1), Modifier.widthIn(max = 220.dp))
                    }
                    Text("${pos + 1} / ${queue.size}", Modifier.padding(end = 16.dp), style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
                }
            }

            Box(Modifier.weight(1f)) {
                AnimatedContent(
                    targetState = phase, label = "phase",
                    transitionSpec = { (fadeIn() + slideInHorizontally { it / 8 }) togetherWith fadeOut() },
                ) { current ->
                    when (current) {
                        Phase.Intro -> Intro(model, place, kind, onStart = ::start)
                        Phase.Steps -> StepsView(place, queue, pos, result, ::answered, ::advance)
                        Phase.Done -> Done(model, place, kind, firstTry.values.count { it }, exerciseCount, score, onAgain = {
                            when (kind) {
                                Kind.Review -> model.openReview()
                                Kind.Derivatives -> model.openDerivatives()
                                Kind.Sentences -> model.openSentences()
                                else -> start()
                            }
                        }, onClose = ::close)
                    }
                }
            }
        }
    }
}

/* Intro */

private fun eyebrow(place: LessonPlace, kind: Kind): String = when (kind) {
    Kind.Course -> "${place.level.title} · Unit ${place.unit.n} · Lesson ${place.number}"
    Kind.Review -> "Review · from lessons you have finished"
    Kind.Derivatives -> "Vocabulary · Latin inside English"
    Kind.Sentences -> "Sentence builder · from the course"
    Kind.Daily -> {
        val day = Daily.day(place.lesson.id)
        val text = StudyDates.dayNumber(day)?.let {
            DateTimeFormatter.ofPattern("EEEE, MMMM d").withZone(ZoneOffset.UTC).format(Instant.ofEpochSecond(it * 86_400L + 43_200))
        }
        "Sententia · ${text ?: day}"
    }
}

@Composable
private fun Intro(model: AppModel, place: LessonPlace, kind: Kind, onStart: () -> Unit) {
    val c = Lectio.colors
    val lesson = place.lesson
    val previous = if (kind != Kind.Course) null else model.progress.lessons[lesson.id]
    val aims = when (kind) {
        Kind.Course -> "You will be able to"
        Kind.Daily -> "In three minutes"
        else -> "What it's for"
    }
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    RubricLabel(eyebrow(place, kind))
                    RichText(lesson.title, style = LectioText.prose(LectioText.largeTitle), color = c.ink)
                    RichText(lesson.summary, style = LectioText.prose(LectioText.title3), color = c.ink2)
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuietLabel(aims)
                    for (o in lesson.objectives) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                            Text("·", color = c.rubric, style = LectioText.body)
                            RichText(o, style = LectioText.prose(LectioText.body), color = c.ink)
                        }
                    }
                }
                if (lesson.words.isNotEmpty()) {
                    Column {
                        QuietLabel("New words", Modifier.padding(bottom = 8.dp))
                        for (w in lesson.words) {
                            Hairline(color = c.hair)
                            Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    buildAnnotatedString {
                                        pushStyle(SpanStyle(fontFamily = com.norvodesigns.lectio.ui.theme.LectioFonts.Garamond, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic, fontSize = 19.sp, color = c.ink))
                                        append(w.latin)
                                        pop()
                                        pushStyle(SpanStyle(color = c.ink2))
                                        append("  ${w.english}")
                                        pop()
                                    },
                                    style = LectioText.prose(LectioText.body),
                                )
                                val d = w.derivatives
                                if (!d.isNullOrEmpty()) Text("English: ${d.joinToString(", ")}", style = LectioText.footnote, color = c.inkMuted)
                            }
                        }
                    }
                }
                if (previous != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Symbol("checkmark.seal", tint = c.correct, size = 20.dp)
                        Text("Finished · best ${Math.round(previous.best * 100)}%", style = LectioText.subheadline, color = c.correct)
                    }
                }
            }
        }
        BottomBar {
            LectioButton(onStart, Modifier.widthIn(max = 520.dp).fillMaxWidth(), prominent = true) {
                ButtonLabel(if (previous == null) "Begin · ${lesson.minutes} min" else "Do it again · ${lesson.minutes} min", style = LectioText.headline)
            }
        }
    }
}

@Composable
private fun BottomBar(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(start = 20.dp, end = 20.dp, bottom = 8.dp, top = 6.dp), contentAlignment = Alignment.Center) { content() }
}

/* Steps */

@Composable
private fun StepsView(
    place: LessonPlace, queue: List<Int>, pos: Int, result: Boolean?, answered: (Int, Boolean) -> Unit, advance: () -> Unit,
) {
    val c = Lectio.colors
    val lesson = place.lesson
    val index = if (queue.isEmpty()) 0 else queue[minOf(pos, queue.size - 1)]
    val step = lesson.steps[index]
    val again = (queue.indexOf(index).takeIf { it >= 0 } ?: pos) < pos
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            AnimatedContent(
                targetState = pos, label = "step",
                transitionSpec = { (fadeIn() + slideInHorizontally { it / 6 }) togetherWith fadeOut() },
            ) { p ->
                val i = if (queue.isEmpty()) 0 else queue[minOf(p, queue.size - 1)]
                Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
                    Column(Modifier.widthIn(max = 680.dp).fillMaxWidth().padding(20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                        if (again && p == pos) RubricLabel("Once more")
                        StepContent(lesson.steps[i], if (p == pos) result else null) { answered(i, it) }
                    }
                }
            }
        }
        if (!step.isExercise) {
            BottomBar {
                LectioButton(advance, Modifier.widthIn(max = 520.dp).fillMaxWidth(), prominent = true) { ButtonLabel("Continue", style = LectioText.headline) }
            }
        }
        AnimatedVisibility(
            result != null && step.isExercise,
            enter = slideInVertically { it } + fadeIn(), exit = slideOutVertically { it } + fadeOut(),
        ) {
            if (result != null) FeedbackPanel(result, step, advance)
        }
    }
}

/** Right or not, the answer when it was wrong, why, and Continue. */
@Composable
private fun FeedbackPanel(right: Boolean, step: LessonStep, onContinue: () -> Unit) {
    val c = Lectio.colors
    val correctAnswer: String? = when (step) {
        is ChoiceStep -> Rich.plain(step.options[step.answer])
        is TypeStep -> step.answers.firstOrNull()
        is TranslateStep -> step.answers.firstOrNull()
        is BuildStep -> step.answer.joinToString(" ")
        else -> null
    }
    val explain: String? = when (step) {
        is ChoiceStep -> step.explain
        is TypeStep -> step.explain
        is TranslateStep -> step.explain
        is BuildStep -> step.explain ?: if (step.anyOrder == true && right) "Any order of these words is good Latin." else null
        is MatchStep -> if (right) null else "All matched in the end. The pairs you missed are worth a second look."
        else -> null
    }
    Box(Modifier.fillMaxWidth().padding(horizontal = 14.dp).padding(bottom = 6.dp).navigationBarsPadding().imePadding(), contentAlignment = Alignment.Center) {
        Surface(
            Modifier.widthIn(max = 560.dp).fillMaxWidth(), shape = RoundedCornerShape(26.dp), color = c.slip,
            border = BorderStroke(1.dp, if (right) c.correct.copy(alpha = 0.5f) else c.incorrect.copy(alpha = 0.5f)), shadowElevation = 8.dp,
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Symbol(if (right) "checkmark.circle.fill" else "xmark.circle.fill", tint = if (right) c.correct else c.incorrect, size = 24.dp)
                    Text(if (right) "Rēctē — right" else "Not quite", style = LectioText.headline, color = if (right) c.correct else c.incorrect)
                }
                if (!right && correctAnswer != null) {
                    Text(
                        buildAnnotatedString {
                            pushStyle(SpanStyle(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = c.inkMuted))
                            append("Answer  ")
                            pop()
                            pushStyle(SpanStyle(fontFamily = com.norvodesigns.lectio.ui.theme.LectioFonts.Garamond, fontSize = 19.sp, color = c.ink))
                            append(correctAnswer)
                            pop()
                        },
                        style = LectioText.body,
                    )
                }
                if (explain != null) RichText(explain, style = LectioText.prose(LectioText.callout), color = c.ink2)
                if (!right) Text("This one comes back at the end.", style = LectioText.caption, color = c.inkMuted)
                LectioButton(onContinue, Modifier.fillMaxWidth().padding(top = 4.dp), prominent = true) { ButtonLabel("Continue", style = LectioText.headline) }
            }
        }
    }
}

/* Result */

@Composable
private fun Done(model: AppModel, place: LessonPlace, kind: Kind, right: Int, exerciseCount: Int, score: Double, onAgain: () -> Unit, onClose: () -> Unit) {
    val c = Lectio.colors
    val lesson = place.lesson
    val deck = lesson.words.filter { it.vocabId != null }
    val next = if (kind != Kind.Course) null else model.content?.course?.after(lesson.id)
    val (verdict, gloss) = when {
        score >= 0.9 -> "Optimē!" to "Excellent."
        score >= 0.7 -> "Bene!" to "Well done."
        else -> "Satis." to "Enough for now. It's worth another go."
    }
    val doneLabel = when (kind) {
        Kind.Course -> "Lesson complete"
        Kind.Review -> "Review complete"
        Kind.Daily -> "Today's line, done"
        Kind.Derivatives, Kind.Sentences -> "Round complete"
    }
    val againLabel = when (kind) {
        Kind.Review -> "Another review"
        Kind.Derivatives, Kind.Sentences -> "Another round"
        else -> "Do it again"
    }
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                RubricLabel(doneLabel)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(verdict, style = LectioText.latinItalic(52.sp), color = c.rubric)
                    Text(gloss, style = LectioText.prose(LectioText.title3), color = c.inkMuted)
                }
                FigureRow {
                    Figure("${Math.round(score * 100)}%", "score", tint = c.rubric)
                    Figure("$right / $exerciseCount", "right first time")
                    if (deck.isNotEmpty()) Figure("${deck.size}", if (deck.size == 1) "word to your deck" else "words to your deck")
                }
                if (lesson.isTest) {
                    val unit = model.content?.course?.place(lesson.id)?.unit?.title ?: "the unit"
                    val passed = Path.testPassed(score)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                        Symbol(if (passed) "checkmark.seal" else "arrow.uturn.backward", tint = if (passed) c.correct else c.inkMuted, size = 22.dp)
                        Text(
                            if (passed) "Passed. Every lesson of $unit now counts as done, and its words are in your flashcards as words you know, a few coming back each day for the next three weeks."
                            else "${Math.round(Path.testPass * 100)}% passes. The unit's lessons are waiting, and the test is here whenever you want another go.",
                            style = LectioText.prose(LectioText.body), color = c.ink2,
                        )
                    }
                }
                if (kind == Kind.Daily) {
                    val streak = model.dailyStreak
                    Text(if (streak > 1) "$streak days in a row. A new line tomorrow." else "A new line tomorrow.", style = LectioText.prose(LectioText.body), color = c.ink2)
                }
                if (deck.isNotEmpty()) {
                    Text(
                        "${deck.joinToString(", ") { it.latin.substringBefore(",") }} ${if (deck.size == 1) "is" else "are"} now in your flashcards, due today. Reviewing them tomorrow is what makes them stick.",
                        style = LectioText.prose(LectioText.body), color = c.ink2,
                    )
                }
            }
        }
        BottomBar {
            Column(Modifier.widthIn(max = 520.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (next != null) {
                    LectioButton({ model.activeLesson = next }, Modifier.fillMaxWidth(), prominent = true) {
                        Text("Next: ${Rich.plain(next.lesson.title)}", style = LectioText.headline, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    LectioButton(onAgain, Modifier.weight(1f)) { ButtonLabel(againLabel) }
                    LectioButton(onClose, Modifier.weight(1f), prominent = next == null) { ButtonLabel("Done") }
                }
            }
        }
    }
}
