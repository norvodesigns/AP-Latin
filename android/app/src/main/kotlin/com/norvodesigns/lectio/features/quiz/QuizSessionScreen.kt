package com.norvodesigns.lectio.features.quiz

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Question
import com.norvodesigns.lectio.features.read.PassageReader
import com.norvodesigns.lectio.recordQuiz
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.OptionCard
import com.norvodesigns.lectio.ui.components.OptionState
import com.norvodesigns.lectio.ui.components.ProvidePushedBack
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** One set, question by question, then the results. */
@Composable
fun QuizSessionScreen(model: AppModel, session: QuizSessionRequest, onClose: () -> Unit) {
    var index by remember(session) { mutableIntStateOf(0) }
    var chosen by remember(session) { mutableStateOf<String?>(null) }
    val results = remember(session) { mutableStateListOf<Boolean>() }
    var startedAt by remember(session) { mutableLongStateOf(System.currentTimeMillis()) }
    var reading by remember(session) { mutableStateOf<String?>(null) }
    val haptics = LocalHapticFeedback.current
    val finished = index >= session.questions.size

    LaunchedEffect(session) { model.update { it.markStudied() } }

    fun choose(optionId: String) {
        if (chosen != null) return
        val q = session.questions[index]
        val correct = optionId == q.answerId
        chosen = optionId
        results.add(correct)
        haptics.performHapticFeedback(if (correct) HapticFeedbackType.Confirm else HapticFeedbackType.Reject)
        model.recordQuiz(q, optionId, Math.round((System.currentTimeMillis() - startedAt) / 1000.0).toDouble())
    }

    fun next() {
        chosen = null
        index++
        startedAt = System.currentTimeMillis()
    }

    val passage = reading?.let { model.content?.passage(it) }
    if (passage != null) {
        // "Read in full" opens the passage over the set, with its own back.
        androidx.activity.compose.BackHandler { reading = null }
        ProvidePushedBack({ reading = null }) { PassageReader(model, passage) }
        return
    }

    CoverScaffold(onClose, closeLabel = if (finished) "Done" else "End set") { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            AnimatedContent(
                index, transitionSpec = { (slideInHorizontally { it / 3 } + fadeIn()) togetherWith fadeOut() }, label = "question",
            ) { i ->
                if (i < session.questions.size) {
                    QuestionPage(model, session.questions[i], i + 1, session.questions.size, if (i == index) chosen else null, ::choose, ::next) { reading = it }
                } else {
                    ResultsPage(session, results, onClose)
                }
            }
        }
    }
}

@Composable
private fun QuestionPage(
    model: AppModel, question: Question, number: Int, total: Int, chosen: String?,
    onChoose: (String) -> Unit, onNext: () -> Unit, onRead: (String) -> Unit,
) {
    val c = Lectio.colors
    val library = model.content
    val revealed = chosen != null
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp).padding(bottom = if (revealed) 76.dp else 0.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    RubricLabel("$number of $total")
                    QuietLabel(library?.meta?.questionTypeLabels?.get(question.type) ?: question.type)
                    QuietLabel("Skill ${question.skill}")
                }
                LectioProgress((number - 1).toFloat() / total)
            }
            Stimulus(model, question)
            Text(question.prompt, style = LectioText.prose(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                question.options.forEachIndexed { i, option ->
                    val isAnswer = option.id == question.answerId
                    val isChosen = option.id == chosen
                    val state = when {
                        !revealed -> OptionState.Idle
                        isAnswer -> OptionState.Right
                        isChosen -> OptionState.Wrong
                        else -> OptionState.Faded
                    }
                    OptionCard(state, Modifier.fillMaxWidth(), enabled = !revealed, onClick = { onChoose(option.id) }) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("${i + 1}", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
                            Text(option.text, Modifier.weight(1f), style = LectioText.latin(18.sp), color = c.ink)
                            if (revealed && isAnswer) Symbol("checkmark.circle.fill", tint = c.correct)
                            else if (revealed && isChosen) Symbol("xmark.circle.fill", tint = c.incorrect)
                        }
                    }
                }
            }
            AnimatedVisibility(revealed, enter = fadeIn() + slideInVertically { it / 4 }) {
                Column(
                    Modifier.fillMaxWidth().clip(androidx.compose.foundation.shape.RoundedCornerShape(14.dp)).background(c.slip).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    RubricLabel("Why")
                    Text(question.explanation, style = LectioText.prose(LectioText.body), color = c.ink2)
                    question.passageId?.let { id -> library?.passage(id) }?.let { p ->
                        TextAction("Read ${p.citation} in full →") { onRead(p.id) }
                    }
                }
            }
        }
        AnimatedVisibility(
            revealed, Modifier.align(Alignment.BottomCenter), enter = fadeIn() + slideInVertically { it }, exit = fadeOut() + slideOutVertically { it },
        ) {
            Box(Modifier.widthIn(max = 720.dp).fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp)) {
                LectioButton(onNext, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel(if (number < total) "Next question" else "See results", style = LectioText.headline) }
            }
        }
    }
}

@Composable
private fun Stimulus(model: AppModel, question: Question) {
    val c = Lectio.colors
    val library = model.content
    val passage = question.passageId?.let { library?.passage(it) }
    val lines = remember(question) {
        val range = question.lineRange
        if (passage == null || range == null || range.size != 2) emptyList() else passage.lines.filter { it.n >= range[0] && it.n <= range[1] }
    }
    val stimulus = question.stimulus
    if (lines.isEmpty() && stimulus == null) return
    Row(Modifier.height(IntrinsicSize.Min)) {
        Box(Modifier.width(2.dp).fillMaxHeight().background(c.redLine))
        Column(Modifier.padding(start = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            RubricLabel(stimulus?.citation ?: passage?.citation ?: "")
            if (lines.isNotEmpty()) {
                for (line in lines) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                        Text("${line.n}", Modifier.width(28.dp).padding(top = 5.dp), style = LectioText.caption.copy(fontFeatureSettings = "tnum", textAlign = androidx.compose.ui.text.style.TextAlign.End), color = c.inkFaint)
                        Text(line.latin, style = LectioText.latin(20.sp), color = c.ink)
                    }
                }
            } else if (stimulus != null) {
                Text(stimulus.latin, style = LectioText.latin(20.sp), color = c.ink)
                val gloss = stimulus.gloss
                if (!gloss.isNullOrEmpty()) {
                    Hairline(Modifier.padding(vertical = 6.dp), color = c.redLine)
                    for (g in gloss) {
                        Text(
                            buildAnnotatedString {
                                withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(g.word) }
                                append(" — ${g.meaning}")
                            },
                            style = LectioText.latin(16.sp), color = c.ink2,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultsPage(session: QuizSessionRequest, results: List<Boolean>, onDone: () -> Unit) {
    val c = Lectio.colors
    val correct = results.count { it }
    val pct = if (results.isEmpty()) 0 else Math.round(correct.toDouble() / results.size * 100).toInt()
    val missed = results.size - correct
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 720.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            RubricLabel("Set complete")
            Text("$pct%", style = LectioText.prose(LectioText.largeTitle).copy(fontSize = 64.sp, fontWeight = FontWeight.SemiBold), color = c.ink)
            Text(
                "$correct of ${results.size} correct. " + if (missed > 0) "$missed question${if (missed == 1) "" else "s"} went to your review queue." else "Nothing added to the review queue — clean set.",
                style = LectioText.prose(LectioText.body), color = c.ink2,
            )
            Hairline()
            session.questions.forEachIndexed { i, q ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                    Box(Modifier.padding(top = 8.dp).size(7.dp).clip(CircleShape).background(if (i < results.size && results[i]) c.correct else c.rubric))
                    Text(q.prompt, style = LectioText.latin(16.sp), color = c.ink2, maxLines = 2)
                }
            }
            LectioButton(onDone, Modifier.fillMaxWidth().padding(top = 8.dp), prominent = true) { ButtonLabel("Done", style = LectioText.headline) }
        }
    }
}
