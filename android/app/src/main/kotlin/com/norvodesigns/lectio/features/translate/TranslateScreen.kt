package com.norvodesigns.lectio.features.translate

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.JSONValue
import com.norvodesigns.lectio.core.TranslationDrill
import com.norvodesigns.lectio.core.TranslationSegment
import com.norvodesigns.lectio.core.jobj
import com.norvodesigns.lectio.data.AIClient
import com.norvodesigns.lectio.features.read.ReaderPage
import com.norvodesigns.lectio.recordTranslation
import com.norvodesigns.lectio.ui.components.AIConsentHost
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Notice
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.components.rememberAIGate
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import com.norvodesigns.lectio.util.clean
import com.norvodesigns.lectio.util.shortDate
import com.norvodesigns.lectio.util.wordCount
import kotlinx.coroutines.launch

/**
 * FRQ 2 practice (src/app/translate/Translate.tsx). About 35 words of Vergil or
 * 40 of Pliny, translated literally and scored in the exam's 15 segments:
 * graded by the website's AI grader when it's available, or against the segment
 * requirements by the student.
 */
@Composable
fun TranslateScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val drill = selected?.let { id -> library.translationDrills.firstOrNull { it.id == id } }
    if (drill != null) {
        androidx.activity.compose.BackHandler { selected = null }
        TranslationDrillScreen(model, drill) { selected = null }
        return
    }
    PageScaffold("Translate") { padding ->
        LazyColumn(
            Modifier.padding(padding), horizontalAlignment = Alignment.CenterHorizontally,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 8.dp),
        ) {
            item {
                Text(
                    "The exam gives you about 35 words of Vergil or 40 of Pliny and scores your literal translation in 15 segments. Type your translation, then grade it against the actual scoring criteria.",
                    Modifier.padding(bottom = 12.dp).widthInColumn(), style = LectioText.prose(LectioText.callout), color = c.ink2,
                )
            }
            items(library.translationDrills, key = { it.id }) { d ->
                Column(Modifier.widthInColumn()) {
                    Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { selected = d.id }.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(d.citation, style = LectioText.latin(20.sp), color = c.ink)
                        library.passage(d.passageId)?.let { Text(it.title, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted) }
                        QuietLabel("${d.segments.size} segments · ${wordCount(d.latin)} words")
                    }
                    Hairline(color = c.hair)
                }
            }
        }
    }
}

private fun Modifier.widthInColumn(): Modifier = this.widthIn(max = 720.dp).fillMaxWidth()

/** A segment's grade. */
enum class Verdict(val wire: String, val label: String, val points: Double) {
    Correct("correct", "Correct", 1.0), Partial("partial", "Partial", 0.5), Incorrect("incorrect", "Missed", 0.0);

    companion object { fun of(wire: String?) = entries.firstOrNull { it.wire == wire } }
}

/** The AI grader's reading of one segment (translationGradeSchema). */
private data class AISegment(val verdict: Verdict, val studentRendering: String, val reason: String, val correctedLiteral: String)

@Composable
private fun TranslationDrillScreen(model: AppModel, drill: TranslationDrill, onBack: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    val scope = rememberCoroutineScope()
    val gate = rememberAIGate(model)
    var text by rememberSaveable(drill.id) { mutableStateOf("") }
    var revealed by rememberSaveable(drill.id) { mutableStateOf(false) }
    val scores = remember(drill.id) { mutableStateMapOf<String, Verdict>() }
    val aiSegments = remember(drill.id) { mutableStateMapOf<String, AISegment>() }
    var aiCorrected by remember(drill.id) { mutableStateOf<String?>(null) }
    var aiAdvice by remember(drill.id) { mutableStateOf<String?>(null) }
    var grading by remember { mutableStateOf(false) }
    var gradeError by remember { mutableStateOf<String?>(null) }
    var saved by remember(drill.id) { mutableStateOf(false) }
    var reading by remember { mutableStateOf<String?>(null) }
    val haptics = LocalHapticFeedback.current
    val score = drill.segments.sumOf { scores[it.id]?.points ?: 0.0 }

    LaunchedEffect(drill.id) {
        model.checkAI()
        model.update { it.markStudied() }
    }

    val passage = reading?.let { library?.passage(it) }
    if (passage != null) {
        ReaderPage(model, passage) { reading = null }
        return
    }

    fun reveal() { revealed = true }

    fun grade() {
        if (model.aiAvailable != true) return reveal()
        grading = true
        gradeError = null
        scope.launch {
            try {
                val result = model.ai.post("grade-translation", jobj("drillId" to drill.id, "translation" to text))
                model.update { it.recordAiCall("grade-translation") }
                val next = HashMap<String, Verdict>()
                val ai = HashMap<String, AISegment>()
                for (seg in result["segments"]?.arrayValue ?: emptyList()) {
                    val id = seg["segmentId"]?.stringValue ?: continue
                    val v = Verdict.of(seg["verdict"]?.stringValue) ?: continue
                    next[id] = v
                    ai[id] = AISegment(v, seg["studentRendering"]?.stringValue ?: "", seg["reason"]?.stringValue ?: "", seg["correctedLiteral"]?.stringValue ?: "")
                }
                scores.clear(); scores.putAll(next)
                aiSegments.clear(); aiSegments.putAll(ai)
                aiCorrected = result["correctedTranslation"]?.stringValue
                aiAdvice = result["oneThingToWorkOn"]?.stringValue
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: AIClient.Failure) {
                gradeError = e.message
            } catch (e: Exception) {
                gradeError = "Couldn’t reach the grader."
            } finally {
                grading = false
                reveal()
            }
        }
    }

    fun save() {
        val missedTags = drill.segments.filter { scores[it.id] != null && scores[it.id] != Verdict.Correct }.flatMap { it.tags }
        val gradedBy = if (aiSegments.isEmpty()) "self" else "ai"
        model.recordTranslation(drill, scores.mapValues { it.value.wire }, text, score, missedTags, gradedBy)
        saved = true
    }

    PageScaffold(drill.citation, onBack = onBack) { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 24.dp) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RubricLabel("FRQ 2 · ${drill.segments.size} segments · 15 minutes on the exam")
                library?.passage(drill.passageId)?.let { p ->
                    TextAction("${p.title} — read in context →", Modifier.padding(start = 0.dp)) { reading = p.id }
                }
            }
            RuledBlock {
                QuietLabel("Translate as literally as possible")
                androidx.compose.foundation.text.selection.SelectionContainer { Text(drill.latin, style = LectioText.latin(22.sp), color = c.ink) }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RubricLabel("Your translation")
                LectioTextField(
                    text, { if (it.length <= 4000) text = it }, placeholder = "", minLines = 7, maxLines = 14, enabled = !revealed,
                    textStyle = LectioText.prose(LectioText.body),
                )
                Text("Account for every Latin word. Keep the tenses, cases and constructions the Latin actually uses.", style = LectioText.footnote, color = c.inkFaint)
            }
            if (!revealed) {
                val empty = text.isBlank()
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    LectioButton(
                        { if (model.aiAvailable == true) gate.ask { grade() } else reveal() },
                        Modifier.fillMaxWidth(), prominent = true, enabled = !empty && !grading,
                    ) {
                        if (grading) CircularProgressIndicator(Modifier.height(20.dp).width(20.dp), color = c.onRubric, strokeWidth = 2.dp)
                        ButtonLabel(if (grading) "Grading…" else if (model.aiAvailable == true) "Grade with AI" else "Reveal the model and self-score", style = LectioText.headline)
                    }
                    if (model.aiAvailable == true) TextAction("or self-score instead", enabled = !empty && !grading) { reveal() }
                }
            }
            gradeError?.let { Notice("$it Self-scoring below works exactly the same.") }
            if (revealed) {
                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Scoring segments", style = LectioText.prose(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                            Text("Mark each segment honestly against what you wrote.", style = LectioText.footnote, color = c.inkMuted)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("${score.clean()} / ${drill.segments.size}", style = LectioText.figure(LectioText.title).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                            QuietLabel("${scores.size} of ${drill.segments.size} marked")
                        }
                    }
                    aiAdvice?.let { advice ->
                        RuledBlock {
                            RubricLabel("One thing to work on")
                            Text(advice, style = LectioText.prose(LectioText.body), color = c.ink)
                        }
                    }
                    drill.segments.forEachIndexed { i, seg ->
                        SegmentCard(i + 1, seg, scores[seg.id], aiSegments[seg.id]) { v ->
                            haptics.performHapticFeedback(HapticFeedbackType.SegmentTick)
                            scores[seg.id] = v
                            saved = false
                        }
                    }
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.slip).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        RubricLabel("Continuous literal model")
                        Text(aiCorrected ?: drill.modelTranslation, style = LectioText.prose(LectioText.body), color = c.ink)
                        drill.notes?.let {
                            Hairline(color = c.hair)
                            Text(it, style = LectioText.footnote, color = c.inkMuted)
                        }
                    }
                    LectioButton({ save() }, Modifier.fillMaxWidth(), prominent = true, enabled = scores.isNotEmpty() && !saved) {
                        ButtonLabel(if (saved) "Saved" else "Log this attempt (${score.clean()}/${drill.segments.size})", style = LectioText.headline)
                    }
                    val unmarked = drill.segments.size - scores.size
                    if (unmarked > 0 && !saved) Text("$unmarked segment${if (unmarked == 1) "" else "s"} still unmarked.", style = LectioText.footnote, color = c.inkFaint)
                    PreviousAttempts(model, drill)
                }
            }
        }
    }
    AIConsentHost(gate, onDecline = { reveal() })
}

@Composable
private fun PreviousAttempts(model: AppModel, drill: TranslationDrill) {
    val c = Lectio.colors
    val prior = model.progress.translationAttempts.filter { it.drillId == drill.id }.takeLast(5).reversed()
    if (prior.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RubricLabel("Previous attempts", Modifier.padding(top = 12.dp))
        for (a in prior) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(shortDate(a.at), style = LectioText.subheadline, color = c.inkFaint)
                Text("${a.score.clean()}/${a.maxScore}", Modifier.weight(1f), style = LectioText.latin(18.sp), color = c.ink)
                QuietLabel(if (a.gradedBy == "ai") "AI graded" else "Self-scored")
            }
            Hairline(color = c.hair)
        }
    }
}

@Composable
private fun SegmentCard(index: Int, segment: TranslationSegment, verdict: Verdict?, ai: AISegment?, onVerdict: (Verdict) -> Unit) {
    val c = Lectio.colors
    fun color(v: Verdict) = when (v) {
        Verdict.Correct -> c.correct
        Verdict.Partial -> c.partial
        Verdict.Incorrect -> c.incorrect
    }
    val edge = verdict?.let(::color) ?: c.rule
    val edgeWidth = if (verdict == null) 0.5.dp else 2.dp
    Column(
        Modifier.fillMaxWidth().drawBehind { drawLine(edge, Offset(0f, 0f), Offset(size.width, 0f), edgeWidth.toPx()) }.padding(top = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
            Text("$index", Modifier.padding(top = 5.dp), style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkFaint)
            Text(segment.latin, Modifier.weight(1f), style = LectioText.latin(19.sp).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
            if (verdict != null) Text(verdict.label.uppercase(), style = LectioText.rubricLabel, color = color(verdict))
        }
        Labelled("Literal", segment.literal)
        Labelled("To earn it", segment.requirement)
        for (p in segment.pitfalls) Text("· $p", style = LectioText.footnote, color = c.inkMuted)
        if (ai != null) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.sunk).padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                RubricLabel("AI reading of your answer")
                Text(
                    if (ai.studentRendering.isEmpty()) "Nothing corresponded to this segment." else "“${ai.studentRendering}”",
                    style = LectioText.prose(LectioText.callout).copy(fontStyle = FontStyle.Italic), color = c.ink,
                )
                Text(ai.reason, style = LectioText.callout, color = c.ink2)
                if (ai.verdict != Verdict.Correct && ai.correctedLiteral.isNotEmpty()) Labelled("Should read", ai.correctedLiteral)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (v in Verdict.entries) Chip(v.label, verdict == v) { onVerdict(v) }
        }
        if (segment.tags.isNotEmpty()) QuietLabel(segment.tags.joinToString(" · ") { it.replace("-", " ") })
    }
}

@Composable
private fun Labelled(label: String, text: String) {
    val c = Lectio.colors
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = c.inkMuted)) { append(label.uppercase() + " — ") }
            append(text)
        },
        style = LectioText.prose(LectioText.callout), color = c.ink,
    )
}
