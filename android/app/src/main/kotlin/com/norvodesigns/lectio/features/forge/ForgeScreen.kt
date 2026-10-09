package com.norvodesigns.lectio.features.forge

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Forge
import com.norvodesigns.lectio.core.LessonCheck
import com.norvodesigns.lectio.core.Paradigm
import com.norvodesigns.lectio.features.learn.ParadigmChart
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.OptionCard
import com.norvodesigns.lectio.ui.components.OptionState
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.ToggleRow
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** One round in play, shown over the whole app like a lesson. */
@Immutable
data class ForgeRound(val mode: Forge.Mode, val scope: List<Paradigm>, val questions: List<Forge.ForgeQuestion>)

private const val ROUND_LENGTH = 10

private fun Forge.Mode.symbol() = when (this) {
    Forge.Mode.Make -> "square.and.pencil"
    Forge.Mode.Name -> "questionmark.circle"
    Forge.Mode.Chart -> "list.bullet.rectangle"
}

private fun Forge.Mode.blurb() = when (this) {
    Forge.Mode.Make -> "Given a word and what is wanted, type the form."
    Forge.Mode.Name -> "Given a form, say what it is."
    Forge.Mode.Chart -> "Complete a table with some cells left blank."
}

/**
 * Forms Forge, the web's /forge. Declension and conjugation drills made from
 * the tables in `forms.json`: make the form, name the form, fill the chart.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ForgeScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var mode by remember { mutableStateOf(Forge.Mode.Make) }
    var kinds by remember { mutableStateOf(Paradigm.Kind.entries.toSet()) }
    var learnedOnly by remember { mutableStateOf(true) }
    val all = library.paradigms
    val done = model.courseDone
    // "Only what I've learned" means something only once a finished lesson has a table; until then every table is in play.
    val learnedAny = all.any { p -> p.lesson?.let { it in done } == true }
    val scope = Forge.scope(all, kinds, if (learnedAny && learnedOnly) done else null)
    val forms = scope.sumOf { it.cellCount }

    PageScaffold("Forms Forge") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 720.dp, spacing = 28.dp) {
            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Every ending, hammered until it is automatic", style = LectioText.prose(LectioText.title2), color = c.ink)
                Text("Choose a way to practise and which tables to use. A round is ten questions.", style = LectioText.prose(LectioText.body), color = c.inkMuted)
            }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                RubricLabel("How")
                for (m in Forge.Mode.entries) {
                    OptionCard(if (m == mode) OptionState.Selected else OptionState.Idle, Modifier.fillMaxWidth(), onClick = { mode = m }) {
                        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Symbol(m.symbol(), tint = if (m == mode) c.rubric else c.inkMuted, size = 28.dp)
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(m.label, style = LectioText.prose(LectioText.headline), color = c.ink)
                                Text(m.blurb(), style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
                            }
                        }
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                RubricLabel("Which tables")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (k in Paradigm.Kind.entries) {
                        val on = k in kinds
                        Chip(k.label, on) {
                            if (on) { if (kinds.size > 1) kinds = kinds - k } else kinds = kinds + k
                        }
                    }
                }
                if (learnedAny) ToggleRow("Only tables from lessons I’ve finished", learnedOnly, { learnedOnly = it })
                Text(
                    if (scope.isEmpty()) {
                        if (kinds.isEmpty()) "Choose at least one kind of table." else "None of your finished lessons has one of these tables yet. Turn off the switch to use every table."
                    } else "${scope.size} table${if (scope.size == 1) "" else "s"}, $forms forms.",
                    style = LectioText.prose(LectioText.footnote), color = c.inkMuted,
                )
                LectioButton(
                    { model.forgeRound = ForgeRound(mode, scope, Forge.round(scope, mode, ROUND_LENGTH)) },
                    Modifier.fillMaxWidth(), prominent = true, enabled = scope.isNotEmpty(),
                ) { ButtonLabel("Start · $ROUND_LENGTH questions", "hammer", LectioText.headline) }
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                RubricLabel("The tables")
                for (k in Paradigm.Kind.entries) {
                    val tables = all.filter { it.kind == k }
                    if (tables.isEmpty()) continue
                    Text(k.label, Modifier.padding(top = 6.dp), style = LectioText.prose(LectioText.headline), color = c.ink)
                    for (p in tables) TableDisclosure(p)
                }
            }
        }
    }
}

@Composable
private fun TableDisclosure(p: Paradigm) {
    val c = Lectio.colors
    var open by remember { mutableStateOf(false) }
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(role = androidx.compose.ui.semantics.Role.Button) { open = !open }.padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(p.lemma, style = LectioText.latin(18.sp), color = c.ink)
                Text("${p.gloss} · ${p.title}", style = LectioText.caption, color = c.inkMuted)
            }
            Symbol(if (open) "chevron.down" else "chevron.right", tint = c.inkMuted, size = 20.dp)
        }
        if (open) Box(Modifier.padding(vertical = 6.dp)) { ParadigmChart(p.table) }
        Hairline(color = c.hair)
    }
}

/* ------------------------------------------------------------------ */
/* A round                                                             */
/* ------------------------------------------------------------------ */

@Composable
fun ForgeRoundScreen(model: AppModel, start: ForgeRound, onClose: () -> Unit) {
    val c = Lectio.colors
    var questions by remember(start) { mutableStateOf(start.questions) }
    var index by remember(start) { mutableIntStateOf(0) }
    val results = remember(start) { mutableStateListOf<Boolean>() }
    var verdict by remember(start) { mutableStateOf<Boolean?>(null) }
    val haptics = LocalHapticFeedback.current
    val finished = index >= questions.size

    fun answer(right: Boolean) {
        if (verdict != null) return
        verdict = right
        haptics.performHapticFeedback(if (right) HapticFeedbackType.Confirm else HapticFeedbackType.Reject)
    }

    fun next() {
        results.add(verdict ?: false)
        verdict = null
        index++
    }

    CoverScaffold(onClose, actions = {
        if (!finished) Box(Modifier.widthIn(max = 160.dp).padding(end = 16.dp).semantics { contentDescription = "Question ${index + 1} of ${questions.size}" }) {
            LectioProgress(index.toFloat() / questions.size, Modifier.widthIn(min = 120.dp))
        }
    }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            if (!finished) {
                val q = questions[index]
                androidx.compose.runtime.key(index) {
                    Column(
                        Modifier.widthIn(max = 640.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp).padding(bottom = 200.dp),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            QuietLabel(q.paradigm.title)
                            Text(
                                buildAnnotatedString {
                                    withStyle(SpanStyle(fontSize = 22.sp, color = c.ink)) { append(q.paradigm.lemma) }
                                    append("  ")
                                    withStyle(SpanStyle(color = c.inkMuted)) { append(q.paradigm.gloss) }
                                },
                                style = LectioText.latin(22.sp),
                            )
                        }
                        when (q) {
                            is Forge.ForgeQuestion.Make -> MakeQuestion(q, verdict, ::answer)
                            is Forge.ForgeQuestion.Name -> NameQuestion(q, verdict, ::answer)
                            is Forge.ForgeQuestion.Chart -> ChartQuestion(q, verdict, ::answer)
                        }
                    }
                }
                AnimatedVisibility(
                    verdict != null, Modifier.align(Alignment.BottomCenter),
                    enter = fadeIn() + slideInVertically { it }, exit = fadeOut() + slideOutVertically { it },
                ) {
                    verdict?.let { v -> Verdict(v, correctAnswer(q)) { next() } }
                }
            } else {
                Summary(results, onAnother = {
                    questions = Forge.round(start.scope, start.mode, questions.size)
                    results.clear()
                    verdict = null
                    index = 0
                }, onClose)
            }
        }
    }
}

private fun correctAnswer(q: Forge.ForgeQuestion): String? = when (q) {
    is Forge.ForgeQuestion.Make -> q.paradigm.rows[q.cell.row].cells[q.cell.col]
    is Forge.ForgeQuestion.Name -> q.options[q.answer]
    is Forge.ForgeQuestion.Chart -> null
}

@Composable
private fun Summary(results: List<Boolean>, onAnother: () -> Unit, onClose: () -> Unit) {
    val c = Lectio.colors
    val right = results.count { it }
    Column(Modifier.fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(
            if (right == results.size) "Every one right." else "$right of ${results.size} right",
            style = LectioText.prose(LectioText.largeTitle), color = c.ink, textAlign = TextAlign.Center,
        )
        Text(
            if (right == results.size) "Clean work. Try a harder mode, or widen the tables in play." else "The ones you missed are the ones to come back to. Another round mixes them in again.",
            style = LectioText.prose(LectioText.body), color = c.inkMuted, textAlign = TextAlign.Center,
        )
        Column(Modifier.padding(top = 10.dp).widthIn(max = 300.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            LectioButton(onAnother, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Another round", style = LectioText.headline) }
            LectioButton(onClose, Modifier.fillMaxWidth()) { ButtonLabel("Done") }
        }
    }
}

@Composable
private fun Verdict(right: Boolean, answer: String?, onContinue: () -> Unit) {
    val c = Lectio.colors
    Surface(
        Modifier.widthIn(max = 560.dp).fillMaxWidth().navigationBarsPadding().padding(horizontal = 14.dp, vertical = 6.dp),
        shape = RoundedCornerShape(26.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule), shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Symbol(if (right) "checkmark.circle.fill" else "xmark.circle.fill", tint = if (right) c.correct else c.incorrect)
                Text(if (right) "Rēctē — right" else "Not quite", style = LectioText.headline, color = if (right) c.correct else c.incorrect)
            }
            if (!right && answer != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                    Text("ANSWER", style = LectioText.caption.copy(fontWeight = FontWeight.SemiBold), color = c.inkMuted)
                    RichText(answer, style = LectioText.latin(20.sp), endings = true)
                }
            }
            LectioButton(onContinue, Modifier.fillMaxWidth().padding(top = 4.dp), prominent = true) { ButtonLabel("Continue", style = LectioText.headline) }
        }
    }
}

/* ------------------------------------------------------------------ */
/* The three questions                                                 */
/* ------------------------------------------------------------------ */

@Composable
private fun MakeQuestion(q: Forge.ForgeQuestion.Make, verdict: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var text by remember { mutableStateOf("") }

    fun check() {
        if (verdict != null || text.isBlank()) return
        answer(LessonCheck.checkTyped(text, q.answers))
    }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(
            buildAnnotatedString {
                append("Give the ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(q.asked) }
                append(" of ")
                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(q.paradigm.headword) }
                append(".")
            },
            style = LectioText.prose(LectioText.title3), color = c.ink,
        )
        LectioTextField(
            text, { text = it }, placeholder = "Type the form", enabled = verdict == null, singleLine = true, autoFocus = true,
            textStyle = LectioText.latin(26.sp), capitalization = KeyboardCapitalization.None, autoCorrect = false, onDone = ::check,
        )
        Text("Macrons are optional when you type.", style = LectioText.caption2, color = c.inkFaint)
        if (verdict == null) LectioButton({ check() }, prominent = true, enabled = text.isNotBlank()) { ButtonLabel("Check") }
    }
}

@Composable
private fun NameQuestion(q: Forge.ForgeQuestion.Name, verdict: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var chosen by remember { mutableStateOf<Int?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("What is this form?", style = LectioText.prose(LectioText.title3), color = c.ink)
        RichText(q.form, Modifier.padding(vertical = 4.dp), style = LectioText.latin(36.sp), endings = true)
        q.options.forEachIndexed { i, option ->
            val state = when {
                verdict == null -> OptionState.Idle
                i == q.answer -> OptionState.Right
                i == chosen -> OptionState.Wrong
                else -> OptionState.Faded
            }
            OptionCard(state, Modifier.fillMaxWidth(), enabled = verdict == null, onClick = {
                if (verdict == null) {
                    chosen = i
                    answer(i == q.answer)
                }
            }) { Text(option, style = LectioText.prose(LectioText.body), color = c.ink) }
        }
    }
}

@Composable
private fun ChartQuestion(q: Forge.ForgeQuestion.Chart, verdict: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    val p = q.paradigm
    val values = remember { mutableStateMapOf<Forge.Cell, String>() }
    val requesters = remember { q.blanks.associateWith { FocusRequester() } }
    var focused by remember { mutableStateOf<Forge.Cell?>(null) }
    val filled = q.blanks.all { !values[it].isNullOrBlank() }

    fun isRight(cell: Forge.Cell) = LessonCheck.checkTyped(values[cell] ?: "", Forge.cellForms(p.rows[cell.row].cells[cell.col]))

    fun check() {
        if (verdict != null || !filled) return
        answer(q.blanks.all(::isRight))
    }

    androidx.compose.runtime.LaunchedEffect(Unit) { q.blanks.firstOrNull()?.let { runCatching { requesters[it]?.requestFocus() } } }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Fill in the blanks.", style = LectioText.prose(LectioText.title3), color = c.ink)
        Column(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.widthIn(min = 64.dp))
                for (col in p.cols) Box(Modifier.widthIn(min = 112.dp)) { QuietLabel(col) }
            }
            Hairline()
            p.rows.forEachIndexed { r, row ->
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
                    Text(row.label, Modifier.widthIn(min = 64.dp).padding(top = 8.dp), style = LectioText.caption, color = c.inkMuted)
                    row.cells.forEachIndexed { col, cellText ->
                        val cell = Forge.Cell(r, col)
                        Box(Modifier.widthIn(min = 112.dp)) {
                            if (cell in q.blanks) {
                                val ok = isRight(cell)
                                val index = q.blanks.indexOf(cell)
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    androidx.compose.foundation.text.BasicTextField(
                                        values[cell] ?: "", { values[cell] = it },
                                        Modifier.widthIn(min = 96.dp).focusRequester(requesters.getValue(cell)).onFocusChanged { if (it.isFocused) focused = cell else if (focused == cell) focused = null }
                                            .semantics { contentDescription = p.names[r][col] },
                                        enabled = verdict == null, singleLine = true,
                                        textStyle = LectioText.latin(18.sp).copy(color = c.ink),
                                        cursorBrush = androidx.compose.ui.graphics.SolidColor(c.rubric),
                                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                            capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false,
                                            imeAction = if (index == q.blanks.lastIndex) ImeAction.Done else ImeAction.Next,
                                        ),
                                        keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                                            onNext = { q.blanks.getOrNull(index + 1)?.let { runCatching { requesters[it]?.requestFocus() } } },
                                            onDone = { check() },
                                        ),
                                        decorationBox = { inner ->
                                            Box(
                                                Modifier.border(
                                                    if (verdict == null && focused != cell) 0.75.dp else 1.25.dp,
                                                    if (verdict == null) (if (focused == cell) c.ink else c.ruleStrong) else if (ok) c.correct else c.incorrect,
                                                    RoundedCornerShape(8.dp),
                                                ).padding(horizontal = 8.dp, vertical = 6.dp),
                                            ) { inner() }
                                        },
                                    )
                                    if (verdict != null && !ok) RichText(cellText, style = LectioText.latin(15.sp), color = c.ink2, endings = true)
                                }
                            } else {
                                RichText(cellText, Modifier.padding(top = 6.dp), style = LectioText.latin(19.sp), endings = true)
                            }
                        }
                    }
                }
            }
        }
        Text("Macrons are optional when you type.", style = LectioText.caption2, color = c.inkFaint)
        if (verdict == null) LectioButton({ check() }, prominent = true, enabled = filled) { ButtonLabel("Check") }
    }
}
