package com.norvodesigns.lectio.features.learn

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.core.BuildStep
import com.norvodesigns.lectio.core.ChoiceStep
import com.norvodesigns.lectio.core.LessonCheck
import com.norvodesigns.lectio.core.LessonStep
import com.norvodesigns.lectio.core.MatchStep
import com.norvodesigns.lectio.core.ParadigmTable
import com.norvodesigns.lectio.core.ReadStep
import com.norvodesigns.lectio.core.TeachStep
import com.norvodesigns.lectio.core.TranslateStep
import com.norvodesigns.lectio.core.TypeStep
import com.norvodesigns.lectio.core.UnknownStep
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.OptionCard
import com.norvodesigns.lectio.ui.components.OptionState
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * The body of one lesson step. Exercises call [answer] once, when the student
 * commits; the container then shows the feedback panel.
 */
@Composable
fun StepContent(step: LessonStep, result: Boolean?, answer: (Boolean) -> Unit) {
    when (step) {
        is TeachStep -> TeachCard(step)
        is ReadStep -> ReadCard(step)
        is ChoiceStep -> ChoiceExercise(step, result, answer)
        is TypeStep -> TypeExercise(step, result, answer)
        is TranslateStep -> TranslateExercise(step, result, answer)
        is BuildStep -> BuildExercise(step, result, answer)
        is MatchStep -> MatchExercise(step, result, answer)
        is UnknownStep -> {}
    }
}

/* Shared pieces */

@Composable
private fun Prompt(text: String) {
    RichText(text, style = LectioText.prose(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = Lectio.colors.ink)
}

/** Latin the question is about, set large. */
@Composable
private fun Stimulus(text: String?) {
    if (text == null) return
    RichText(text, Modifier.padding(vertical = 4.dp), style = LectioText.latin(28.sp), color = Lectio.colors.ink, endings = true)
}

/* Teaching and reading */

@Composable
private fun TeachCard(step: TeachStep) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        RichText(step.title, style = LectioText.prose(LectioText.title), color = c.ink)
        for (p in step.body) RichText(p, style = LectioText.prose(LectioText.body), color = c.ink2)
        step.table?.let { ParadigmChart(it) }
        val examples = step.examples
        if (!examples.isNullOrEmpty()) {
            Column(Modifier.padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                for (e in examples) {
                    Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(Modifier.width(2.dp).fillMaxHeight().background(c.redLine))
                        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            RichText(e.la, style = LectioText.latin(22.sp), color = c.ink, endings = true)
                            Text(e.en, style = LectioText.prose(LectioText.callout), color = c.ink2)
                            e.note?.let { RichText(it, style = LectioText.footnote, color = c.inkMuted) }
                        }
                    }
                }
            }
        }
        step.tip?.let { tip ->
            Column(
                Modifier.fillMaxWidth().border(1.dp, c.redLine, RoundedCornerShape(14.dp)).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                RubricLabel("Note")
                RichText(tip, style = LectioText.prose(LectioText.callout), color = c.ink2)
            }
        }
    }
}

/** A declension or conjugation, ruled like a manuscript table, endings in red. */
@Composable
fun ParadigmChart(table: ParadigmTable, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            table.caption?.let { QuietLabel(it) }
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                Column(Modifier.width(IntrinsicSize.Max), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text("", style = LectioText.quietLabel)
                    Hairline()
                    for (row in table.rows) Text(row.label, style = LectioText.caption, color = c.inkMuted, modifier = Modifier.heightIn(min = 26.dp).padding(top = 4.dp))
                }
                table.cols.forEachIndexed { col, title ->
                    Column(Modifier.width(IntrinsicSize.Max), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        QuietLabel(title)
                        Hairline()
                        for (row in table.rows) {
                            RichText(row.cells.getOrElse(col) { "" }, Modifier.heightIn(min = 26.dp), style = LectioText.latin(20.sp), color = c.ink, endings = true)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReadCard(step: ReadStep) {
    val c = Lectio.colors
    val shown = remember(step) { mutableStateListOf<Int>() }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        RubricLabel("Reading")
        Text(step.title, style = LectioText.latinItalic(30.sp), color = c.ink)
        step.intro?.let { RichText(it, style = LectioText.prose(LectioText.callout), color = c.ink2) }
        step.lines.forEachIndexed { i, line ->
            Column(
                Modifier.fillMaxWidth().clickable(role = Role.Button) { if (i in shown) shown.remove(i) else shown.add(i) },
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(line.la, style = LectioText.latin(22.sp), color = c.ink)
                if (i in shown) Text(line.en, style = LectioText.prose(LectioText.callout), color = c.ink2)
                else Text("Tap for the translation", style = LectioText.caption2, color = c.inkFaint)
            }
        }
        val gloss = step.gloss
        if (!gloss.isNullOrEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Hairline()
                for (g in gloss) {
                    Text(
                        buildAnnotatedString {
                            pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                            append(g.word)
                            pop()
                            append(" · ${g.meaning}")
                        },
                        style = LectioText.prose(LectioText.footnote), color = c.ink2,
                    )
                }
            }
        }
        TextAction(
            if (shown.size == step.lines.size) "Hide the translations" else "Show all translations",
        ) {
            if (shown.size == step.lines.size) shown.clear() else {
                shown.clear()
                shown.addAll(step.lines.indices)
            }
        }
    }
}

/* Exercises */

@Composable
private fun ChoiceExercise(step: ChoiceStep, result: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var chosen by remember(step) { mutableStateOf<Int?>(null) }
    fun state(i: Int): OptionState {
        if (result == null) return OptionState.Idle
        if (i == step.answer) return OptionState.Right
        if (i == chosen) return OptionState.Wrong
        return OptionState.Faded
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Prompt(step.prompt)
        Stimulus(step.latin)
        step.options.forEachIndexed { i, option ->
            OptionCard(state(i), Modifier.fillMaxWidth(), enabled = result == null, onClick = {
                if (result == null) {
                    chosen = i
                    answer(i == step.answer)
                }
            }) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("${i + 1}", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkFaint)
                    RichText(option, style = LectioText.prose(LectioText.body), color = c.ink)
                }
            }
        }
    }
}

@Composable
private fun TypeExercise(step: TypeStep, result: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var text by remember(step) { mutableStateOf("") }
    var showHint by remember(step) { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    fun check() {
        if (result != null || text.isBlank()) return
        focus.clearFocus()
        answer(LessonCheck.checkTyped(text, step.answers))
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Prompt(step.prompt)
        Stimulus(step.latin)
        LectioTextField(
            text, { text = it }, placeholder = "Type here", textStyle = LectioText.latin(26.sp), enabled = result == null, singleLine = true,
            autoFocus = true, capitalization = KeyboardCapitalization.None, autoCorrect = false, imeAction = ImeAction.Done, onDone = ::check,
        )
        Text("Macrons are optional when you type.", style = LectioText.caption2, color = c.inkFaint)
        if (result == null) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                LectioButton(::check, prominent = true, enabled = text.isNotBlank()) { ButtonLabel("Check") }
                if (step.hint != null && !showHint) LectioButton({ showHint = true }) { ButtonLabel("Hint") }
            }
            if (showHint) step.hint?.let { RichText(it, style = LectioText.prose(LectioText.callout), color = c.ink2) }
        }
    }
}

@Composable
private fun TranslateExercise(step: TranslateStep, result: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    var text by remember(step) { mutableStateOf("") }
    var judging by remember(step) { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    fun check() {
        val trimmed = text.trim()
        if (result != null || judging || trimmed.isEmpty()) return
        focus.clearFocus()
        if (LessonCheck.checkTranslation(trimmed, step.answers)) answer(true) else judging = true
    }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Prompt("Translate into English")
        Stimulus(step.latin)
        LectioTextField(text, { text = it }, placeholder = "Your translation", enabled = result == null && !judging, minLines = 2, maxLines = 5, autoFocus = true)
        if (result == null && !judging) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                LectioButton(::check, prominent = true, enabled = text.isNotBlank()) { ButtonLabel("Check") }
                LectioButton({ answer(false) }) { ButtonLabel("I don’t know") }
            }
        }
        if (judging && result == null) {
            Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    RubricLabel("Compare")
                    Text(step.answers.firstOrNull() ?: "", style = LectioText.prose(LectioText.title3), color = c.ink)
                    Text("English has many right answers. Does yours say the same thing?", style = LectioText.prose(LectioText.footnote), color = c.inkMuted)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        LectioButton({ answer(true) }, prominent = true) { ButtonLabel("Mine means the same") }
                        LectioButton({ answer(false) }) { ButtonLabel("I had it wrong") }
                    }
                }
            }
        }
    }
}

private class Tile(val id: Int, val text: String)

/** Word tiles into a sentence. Tiles move between the bank and the line. */
@Composable
private fun BuildExercise(step: BuildStep, result: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    val tiles = remember(step) { (step.answer + step.extra).mapIndexed { i, t -> Tile(i, t) }.shuffled() }
    val placed = remember(step) { mutableStateListOf<Int>() }
    val latin = step.isLatin
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Prompt(step.prompt)
        Text(step.source, style = if (latin) LectioText.prose(LectioText.title2) else LectioText.latin(26.sp), color = c.ink)

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            FlowRow(Modifier.fillMaxWidth().heightIn(min = 44.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                for (id in placed.toList()) tiles.firstOrNull { it.id == id }?.let { TileButton(it, latin, result == null, "Removes it from your sentence") { placed.remove(it.id) } }
            }
            if (placed.isEmpty()) {
                Text(if (step.anyOrder == true) "Tap the words, in any order" else "Tap the words in order", style = LectioText.caption, color = c.inkFaint)
            }
            Hairline(color = c.ruleStrong)
        }

        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            for (tile in tiles) {
                if (tile.id !in placed) TileButton(tile, latin, result == null, "Adds it to your sentence") { placed.add(tile.id) }
                else TileLabel(tile, latin, Modifier.alpha(0.18f).semantics { contentDescription = "" })
            }
        }

        if (result == null) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                LectioButton(
                    { answer(LessonCheck.checkBuild(placed.mapNotNull { id -> tiles.firstOrNull { it.id == id }?.text }, step)) },
                    prominent = true, enabled = placed.isNotEmpty(),
                ) { ButtonLabel("Check") }
                if (placed.isNotEmpty()) LectioButton({ placed.clear() }) { ButtonLabel("Clear") }
            }
        }
    }
}

@Composable
private fun TileButton(tile: Tile, latin: Boolean, enabled: Boolean, hint: String, onClick: () -> Unit) {
    TileLabel(tile, latin, Modifier.clip(CircleShape).clickable(enabled = enabled, role = Role.Button, onClick = onClick).semantics { contentDescription = tile.text + ". " + hint })
}

@Composable
private fun TileLabel(tile: Tile, latin: Boolean, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    Text(
        tile.text,
        modifier.background(c.slip, CircleShape).border(0.75.dp, c.ruleStrong, CircleShape).padding(horizontal = 12.dp, vertical = 7.dp),
        style = if (latin) LectioText.latinItalic(20.sp) else LectioText.prose(LectioText.body), color = c.ink,
    )
}

/** Tap one side, then its partner on the other. */
@Composable
private fun MatchExercise(step: MatchStep, result: Boolean?, answer: (Boolean) -> Unit) {
    val c = Lectio.colors
    val rights = remember(step) { step.pairs.indices.toList().shuffled() }
    var selected by remember(step) { mutableStateOf<Pair<Boolean, Int>?>(null) } // (isLeft, index)
    val matched = remember(step) { mutableStateListOf<Int>() }
    var wrong by remember(step) { mutableStateOf<Pair<Int, Int>?>(null) }
    var mistakes by remember(step) { mutableStateOf(false) }
    var wrongTick by remember(step) { mutableStateOf(0) }
    LaunchedEffect(wrongTick) {
        if (wrongTick > 0) {
            kotlinx.coroutines.delay(550)
            wrong = null
        }
    }

    fun tap(left: Boolean, i: Int) {
        if (result != null || i in matched) return
        val current = selected
        if (current == null || current.first == left) {
            selected = left to i
            return
        }
        val l = if (left) i else current.second
        val r = if (!left) i else current.second
        selected = null
        if (l == r) {
            matched.add(l)
            if (matched.size == step.pairs.size) answer(!mistakes)
        } else {
            mistakes = true
            wrong = l to r
            wrongTick++
        }
    }

    @Composable
    fun Cell(left: Boolean, i: Int) {
        val text = step.pairs[i].let { if (it.size == 2) it[if (left) 0 else 1] else "" }
        val isMatched = i in matched
        val isSelected = selected?.let { it.first == left && it.second == i } ?: false
        val isWrong = wrong?.let { if (left) it.first == i else it.second == i } ?: false
        val state = when {
            isMatched -> OptionState.Right
            isWrong -> OptionState.Wrong
            isSelected -> OptionState.Selected
            else -> OptionState.Idle
        }
        OptionCard(state, Modifier.fillMaxWidth().alpha(if (isMatched) 0.65f else 1f), enabled = !isMatched && result == null, onClick = { tap(left, i) }) {
            Text(text, style = if (left) LectioText.latinItalic(19.sp) else LectioText.prose(LectioText.callout), color = c.ink)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Prompt(step.prompt)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) { step.pairs.indices.forEach { Cell(true, it) } }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) { rights.forEach { Cell(false, it) } }
        }
    }
}
