package com.norvodesigns.lectio.features.learn

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.LessonPlace
import com.norvodesigns.lectio.core.Path
import com.norvodesigns.lectio.core.Placement
import com.norvodesigns.lectio.core.PlacementQuestion
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.IconBadge
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.OptionCard
import com.norvodesigns.lectio.ui.components.OptionState
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.ProvidePushedBack
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.delay

/**
 * One placement question: the prompt, the Latin, the options, and a way to say
 * "I don't know". A choice shows right and wrong for a moment, then reports.
 * Shared by the first run and the level check; key each question so the choice
 * resets.
 */
@Composable
fun PlacementCard(question: PlacementQuestion, number: Int, total: Int, onAnswer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var chosen by remember(question, number) { mutableStateOf<Int?>(null) }
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(chosen) {
        val pick = chosen ?: return@LaunchedEffect
        haptics.performHapticFeedback(HapticFeedbackType.SegmentTick)
        delay(650)
        onAnswer(pick == question.step.answer)
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        RubricLabel("Question $number of $total")
        LectioProgress((number - 1).toFloat() / maxOf(1, total))
        RichText(question.step.prompt, style = LectioText.prose(LectioText.title3).copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold), color = c.ink)
        question.step.latin?.let { Text(it, style = LectioText.latin(28.sp), color = c.ink) }
        question.step.options.forEachIndexed { i, option ->
            val state = when {
                chosen == null -> OptionState.Idle
                i == question.step.answer -> OptionState.Right
                i == chosen -> OptionState.Wrong
                else -> OptionState.Idle
            }
            OptionCard(state, Modifier.fillMaxWidth(), enabled = chosen == null, onClick = { chosen = i }) {
                RichText(option, style = LectioText.prose(LectioText.body), color = c.ink)
            }
        }
        TextAction("I don’t know this yet", enabled = chosen == null, tint = c.inkMuted) { onAnswer(false) }
    }
}

private enum class Stage { Intro, Grammar, Vocabulary, Result }

/**
 * The level check, any time (the course's "Find my level"): the grammar
 * placement, easiest first, stopping once it has found your level; then two
 * words from each unit of the AP list. Nothing is scored. It decides where the
 * grammar track starts and which vocabulary units are offered as unit tests
 * first, and the student says whether to use it.
 */
@Composable
fun LevelCheckScreen(model: AppModel, onClose: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    var stage by remember { mutableStateOf(Stage.Intro) }
    var withGrammar by remember { mutableStateOf(true) }
    val grammar = remember { mutableStateListOf<Placement.Answer>() }
    val vocabulary = remember { mutableStateListOf<Placement.Answer>() }
    val grammarQuestions = library?.course?.placement ?: emptyList()
    val vocabQuestions = library?.course?.vocabPlacement ?: emptyList()
    BackHandler(onBack = onClose)

    Box(Modifier.fillMaxSize().background(c.parchment)) {
        ProvidePushedBack(onClose) {
            PageScaffold("Find my level") { padding ->
                Box(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
                    Column(Modifier.widthIn(max = 560.dp).fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                        AnimatedContent(stage, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "stage") { s ->
                            Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                when (s) {
                                    Stage.Intro -> Intro(grammarQuestions.size, vocabQuestions.size, onStart = {
                                        withGrammar = true
                                        stage = if (grammarQuestions.isEmpty()) Stage.Vocabulary else Stage.Grammar
                                    }, onVocabOnly = {
                                        withGrammar = false
                                        stage = Stage.Vocabulary
                                    })
                                    Stage.Grammar -> if (grammar.size < grammarQuestions.size) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            QuietLabel("Grammar")
                                            androidx.compose.runtime.key("g${grammar.size}") {
                                                PlacementCard(grammarQuestions[grammar.size], grammar.size + 1, grammarQuestions.size) { right ->
                                                    grammar.add(Placement.Answer(grammarQuestions[grammar.size].unit, right))
                                                    if (!Placement.continues(grammar, grammarQuestions.size)) {
                                                        stage = if (vocabQuestions.isEmpty()) Stage.Result else Stage.Vocabulary
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Stage.Vocabulary -> if (vocabulary.size < vocabQuestions.size) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            QuietLabel("Vocabulary")
                                            androidx.compose.runtime.key("v${vocabulary.size}") {
                                                PlacementCard(vocabQuestions[vocabulary.size], vocabulary.size + 1, vocabQuestions.size) { right ->
                                                    vocabulary.add(Placement.Answer(vocabQuestions[vocabulary.size].unit, right))
                                                    if (vocabulary.size >= vocabQuestions.size) stage = Stage.Result
                                                }
                                            }
                                        }
                                    }
                                    Stage.Result -> Result(model, withGrammar, grammar, vocabulary, onClose)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}



@Composable
private fun Intro(grammarCount: Int, vocabCount: Int, onStart: () -> Unit, onVocabOnly: () -> Unit) {
    val c = Lectio.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Symbol("scope", tint = c.rubric, size = 52.dp, modifier = Modifier.padding(top = 20.dp))
        Text("Two short parts", style = LectioText.prose(LectioText.title), color = c.ink)
        Panel {
            Part("Grammar", "Up to $grammarCount questions, easiest first. It stops as soon as it finds your level, usually well before the end.", "text.book.closed", c.rubric)
            Hairline(color = c.hair)
            Part("Vocabulary", "$vocabCount words, two from each part of the AP list. Where you know both, that part’s unit test comes first, so you can skip what you know.", "character.book.closed", c.woad)
        }
        Text("Nothing is scored, and you choose whether to use the result.", style = LectioText.prose(LectioText.callout), color = c.inkMuted, textAlign = TextAlign.Center)
        LectioButton(onStart, Modifier.widthIn(max = 300.dp).fillMaxWidth(), prominent = true) { ButtonLabel("Start", style = LectioText.headline) }
        if (vocabCount > 0) LectioButton(onVocabOnly, Modifier.widthIn(max = 300.dp).fillMaxWidth()) { ButtonLabel("Just the vocabulary") }
    }
}

@Composable
private fun Part(title: String, detail: String, symbol: String, tint: androidx.compose.ui.graphics.Color) {
    val c = Lectio.colors
    Row(Modifier.padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        IconBadge(symbol, tint, size = 40.dp, background = tint.copy(alpha = 0.14f))
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text(detail, style = LectioText.prose(LectioText.subheadline), color = c.ink2)
        }
    }
}

@Composable
private fun Result(model: AppModel, withGrammar: Boolean, grammar: List<Placement.Answer>, vocabulary: List<Placement.Answer>, onClose: () -> Unit) {
    val c = Lectio.colors
    val course = model.content?.course
    val grammarQuestions = course?.placement ?: emptyList()
    // Where the grammar starts: the first unit with a slip, or past every unit the check asked about.
    val start: LessonPlace? = if (withGrammar && course != null && grammar.isNotEmpty()) {
        (Placement.start(grammar) ?: Placement.unitBeyond(course.unitIds, grammarQuestions.map { it.unit }))?.let { course.firstLesson(it) }
    } else null
    val known = Path.knownVocabUnits(vocabulary)
    val units = course?.vocabLevel?.units ?: emptyList()

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Symbol("checkmark.seal", tint = c.correct, size = 52.dp, modifier = Modifier.padding(top = 20.dp))
        Text("Your path", style = LectioText.prose(LectioText.title), color = c.ink)
        Panel {
            if (withGrammar) {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    QuietLabel("Grammar")
                    if (start != null) {
                        Text(
                            buildAnnotatedString {
                                append("Start at ${start.level.title}, Unit ${start.unit.n}: ")
                                pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                                append(Rich.plain(start.unit.title))
                                pop()
                                append(".")
                            },
                            style = LectioText.prose(LectioText.body), color = c.ink,
                        )
                        Text("The units before it stay open, for review whenever you like.", style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
                    } else {
                        Text("You answered everything right: start with the AP texts, and use the grammar for review.", style = LectioText.prose(LectioText.body), color = c.ink)
                    }
                }
                Hairline(color = c.hair)
            }
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                QuietLabel("Vocabulary")
                Text("${vocabulary.count { it.right }} of ${vocabulary.size} words known.", style = LectioText.prose(LectioText.body), color = c.ink)
                for (unit in units) {
                    val isKnown = unit.id in known
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Symbol(if (isKnown) "checkmark.seal" else "largecircle.fill.circle", tint = if (isKnown) c.woad else c.inkFaint, size = 20.dp)
                        Text(
                            "${unit.title}: ${if (isKnown) "start with the unit test" else "start with the lessons"}",
                            style = LectioText.prose(LectioText.subheadline), color = if (isKnown) c.ink else c.inkMuted,
                        )
                    }
                }
            }
        }
        LectioButton(
            {
                model.applyLevelCheck(if (withGrammar) start?.lesson?.id else null, known)
                onClose()
            },
            Modifier.widthIn(max = 300.dp).fillMaxWidth(), prominent = true,
        ) { ButtonLabel("Use this path", style = LectioText.headline) }
        LectioButton(onClose, Modifier.widthIn(max = 300.dp).fillMaxWidth()) { ButtonLabel("Keep my current path") }
    }
}
