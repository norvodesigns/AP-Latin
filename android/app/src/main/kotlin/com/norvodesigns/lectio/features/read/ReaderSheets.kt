package com.norvodesigns.lectio.features.read

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.JSONValue
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.PassageLine
import com.norvodesigns.lectio.core.jobj
import com.norvodesigns.lectio.data.AIClient
import com.norvodesigns.lectio.ui.components.AIConsentHost
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.components.rememberAIGate
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/* ------------------------------------------------------------------ */
/* Notes and context                                                   */
/* ------------------------------------------------------------------ */

/**
 * The Reader's side rail on the web (summary, context, themes, vocabulary
 * coverage, your notes and flagged lines) as one sheet.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PassageNotesSheet(model: AppModel, passage: Passage, onJump: (Int) -> Unit, onDismiss: () -> Unit) {
    val c = Lectio.colors
    var showEnglish by remember { mutableStateOf(false) }
    val state = model.progress.passage(passage.id)
    val noted = state.annotations.filter { it.note.trim().isNotEmpty() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(), containerColor = c.parchment) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(26.dp)) {
            Text(passage.citation, style = LectioText.prose(LectioText.headline), color = c.ink, modifier = Modifier.align(Alignment.CenterHorizontally))
            NoteSection("Summary") {
                if (showEnglish) Text(passage.summary, style = LectioText.prose(LectioText.body), color = c.ink)
                else LectioButton({ showEnglish = true }) { ButtonLabel("Reveal the English summary") }
            }
            NoteSection("Context") { Text(passage.context, style = LectioText.prose(LectioText.body), color = c.ink2) }
            if (passage.themes.isNotEmpty()) NoteSection("Themes") {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (theme in passage.themes) {
                        Text(
                            theme, Modifier.clip(RoundedCornerShape(50)).background(c.redTint).padding(horizontal = 10.dp, vertical = 5.dp),
                            style = LectioText.subheadline, color = c.ink,
                        )
                    }
                }
            }
            if (passage.vocabIds.isNotEmpty()) {
                val inRotation = passage.vocabIds.count { model.vocab[it] != null }
                val total = passage.vocabIds.size
                val pct = if (total > 0) Math.round(inRotation.toDouble() / total * 100).toInt() else 0
                NoteSection("Vocabulary coverage") {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        LectioProgress(inRotation.toFloat() / maxOf(total, 1), Modifier.weight(1f))
                        Text("$pct%", style = LectioText.latin(20.sp), color = c.ink)
                    }
                    Text("$inRotation of $total words in your deck. Tapping a word while reading adds it automatically.", style = LectioText.footnote, color = c.inkMuted)
                    if (inRotation < total) LectioButton({ model.update { it.seedVocab(passage.vocabIds) } }) { ButtonLabel("Add all to deck") }
                }
            }
            if (noted.isNotEmpty()) NoteSection("Your notes") {
                for (a in noted) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(Modifier.clickable { onJump(a.lineN) }, horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                            Text("“${a.text}”", Modifier.weight(1f, fill = false), style = LectioText.latinItalic(18.sp), color = c.ink)
                            QuietLabel("· line ${a.lineN}")
                        }
                        Text(a.note, style = LectioText.prose(LectioText.callout), color = c.ink2)
                        TextAction("Remove", tint = c.incorrect) { model.update { it.removeAnnotation(passage.id, a.id) } }
                        Hairline(color = c.hair)
                    }
                }
            }
            if (state.flaggedLines.isNotEmpty()) NoteSection("Flagged as hard") {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (n in state.flaggedLines) LectioButton({ onJump(n) }) { ButtonLabel("Line $n") }
                }
            }
        }
    }
}

@Composable
private fun NoteSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        RubricLabel(title)
        content()
    }
}

/* ------------------------------------------------------------------ */
/* A note on a highlight                                               */
/* ------------------------------------------------------------------ */

/** Writes (or edits) the note on a highlighted phrase. Saved with the highlight, so it syncs with it. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditor(model: AppModel, target: NoteTarget, passageId: String, onDismiss: () -> Unit) {
    val c = Lectio.colors
    var note by remember(target) { mutableStateOf(target.note) }

    fun save() {
        val text = note.trim()
        model.update { doc ->
            var id = target.existingId
            if (id == null) {
                // A note needs an annotation to hang on; a colourless one is made just for it.
                if (text.isEmpty()) return@update
                id = doc.setHighlight(passageId, target.span.lineN, target.span.start, target.span.end, target.text, null).id
            }
            doc.setAnnotationNote(passageId, id, text)
            doc.markStudied()
        }
        onDismiss()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.parchment) {
        Column(Modifier.fillMaxWidth().imePadding().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TextAction("Cancel", tint = c.inkMuted, onClick = onDismiss)
                Text("Note", Modifier.weight(1f), style = LectioText.prose(LectioText.headline), color = c.ink, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                TextAction("Save", onClick = ::save)
            }
            Text("“${target.text}”", style = LectioText.latinItalic(20.sp), color = c.ink)
            LectioTextField(
                note, { note = it }, placeholder = "Write a note for yourself…", minLines = 4, maxLines = 8, autoFocus = true,
                textStyle = LectioText.prose(LectioText.body),
            )
            Text("Notes stay on your device and sync with your account.", style = LectioText.footnote, color = c.inkMuted)
        }
    }
}

/* ------------------------------------------------------------------ */
/* Ask about this line                                                 */
/* ------------------------------------------------------------------ */

private val suggestions = listOf(
    "Parse every word in this line.",
    "What construction is happening here?",
    "How does this line scan?",
    "Why is this word in this case?",
)

/**
 * "Ask about this line": the website's scoped tutor. The answer streams in from
 * /api/ai/ask. With no AI configured, or offline, the line's glossary is still
 * there underneath.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AskAboutLineSheet(model: AppModel, passage: Passage, line: PassageLine, onDismiss: () -> Unit) {
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    val gate = rememberAIGate(model)
    var question by remember { mutableStateOf("") }
    var answer by remember { mutableStateOf("") }
    var streaming by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var job by remember { mutableStateOf<Job?>(null) }

    LaunchedEffect(Unit) { model.checkAI() }
    androidx.compose.runtime.DisposableEffect(Unit) { onDispose { job?.cancel() } }

    fun send(q: String) {
        question = ""
        answer = ""
        error = null
        streaming = true
        job?.cancel()
        job = scope.launch {
            val body = jobj("passageId" to passage.id, "lineN" to line.n, "latin" to line.latin, "question" to q)
            try {
                var first = true
                model.ai.stream("ask", body).collect { chunk ->
                    if (first) {
                        model.update { it.recordAiCall("ask") }
                        first = false
                    }
                    answer += chunk
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: AIClient.Failure) {
                error = e.message
            } catch (e: Exception) {
                error = "Couldn’t reach the tutor. The glossary below still works."
            } finally {
                streaming = false
            }
        }
    }

    fun ask(raw: String) {
        val q = raw.trim()
        if (q.isEmpty() || streaming) return
        gate.ask { send(q) }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.parchment) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.92f).imePadding()) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Text("Ask about this line", style = LectioText.prose(LectioText.headline), color = c.ink, modifier = Modifier.align(Alignment.CenterHorizontally))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    RubricLabel("${passage.citation} · ${if (passage.isPoetry) "line" else "section"} ${line.n}")
                    Text(line.latin, style = LectioText.latin(21.sp), color = c.ink)
                }
                if (model.aiAvailable == false) {
                    Notice("No AI provider is configured on the server, so the tutor is off. The dictionary entries below come from the offline vocabulary list.")
                }
                error?.let { Notice(it) }
                if (answer.isNotEmpty() || streaming) {
                    SelectionContainer {
                        Text(
                            answer + if (streaming) " ▍" else "",
                            Modifier.animateContentSize(), style = LectioText.prose(LectioText.body), color = c.ink,
                        )
                    }
                } else if (model.aiAvailable != false) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (s in suggestions) Chip(s, selected = false) { ask(s) }
                    }
                }
                Glossary(model, line)
            }
            if (model.aiAvailable != false) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Bottom) {
                    LectioTextField(
                        question, { question = it }, Modifier.weight(1f), placeholder = "Ask about this line…", maxLines = 4,
                        textStyle = LectioText.prose(LectioText.body), imeAction = ImeAction.Send, onDone = { ask(question) },
                    )
                    val enabled = question.trim().isNotEmpty() && !streaming
                    IconButton({ ask(question) }, Modifier.background(if (enabled) c.rubric else c.ruleStrong, CircleShape), enabled = enabled) {
                        Symbol("arrow.up", tint = c.onRubric, contentDescription = "Ask")
                    }
                }
            }
        }
    }
    AIConsentHost(gate)
}

@Composable
private fun Notice(text: String) {
    val c = Lectio.colors
    Text(
        text, Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.partialWash).padding(12.dp),
        style = LectioText.footnote, color = c.ink2,
    )
}

@Composable
private fun Glossary(model: AppModel, line: PassageLine) {
    val c = Lectio.colors
    val library = model.content
    val words = line.tokens.filter { it.isWord && it.glosses.isNotEmpty() }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 16.dp)) {
        RubricLabel("Glossary")
        for (token in words) {
            val entry = token.glosses.firstOrNull()?.let { library?.vocab(it.id) } ?: continue
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(token.text) }
                        append("  ")
                        withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(entry.lemma) }
                    },
                    style = LectioText.latin(17.sp), color = c.ink,
                )
                Text(entry.definition, style = LectioText.footnote, color = c.inkMuted, maxLines = 2)
            }
        }
    }
}
