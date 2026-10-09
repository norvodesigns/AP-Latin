package com.norvodesigns.lectio.features.vocab

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.SpeedRound
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private sealed interface Scope {
    data object Deck : Scope
    data object All : Scope
    data class Unit(val n: String) : Scope
}

private enum class Phase { Ready, Play, Done }

/** Fewer words than this and a round keeps dealing the same boards. */
private const val MIN_POOL = 10

/**
 * Speed round, the web's /vocab/speed: a minute to match as many Latin words
 * to their meanings as possible, five pairs to a board. A wrong pair costs two
 * seconds and lists the word at the end, with a button to put the missed words
 * into the flashcards.
 */
@Composable
fun SpeedRoundScreen(model: AppModel, onClose: () -> Unit) {
    val c = Lectio.colors
    val library = model.content ?: return
    val scope = rememberCoroutineScope()
    val haptics = LocalHapticFeedback.current

    var phase by remember { mutableStateOf(Phase.Ready) }
    var chosenScope by remember { mutableStateOf<Scope?>(null) }
    var left by remember { mutableStateOf<List<SpeedRound.Word>>(emptyList()) }
    var right by remember { mutableStateOf<List<SpeedRound.Word>>(emptyList()) }
    val matched = remember { mutableStateListOf<String>() }
    var pickL by remember { mutableStateOf<String?>(null) }
    var pickR by remember { mutableStateOf<String?>(null) }
    var flash by remember { mutableStateOf<Triple<String, String, Boolean>?>(null) }
    var score by remember { mutableIntStateOf(0) }
    val missed = remember { mutableStateListOf<SpeedRound.Word>() }
    var deadline by remember { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(0L) }
    var newBest by remember { mutableStateOf(false) }
    var added by remember { mutableStateOf(false) }

    val effective = chosenScope ?: if (model.vocab.size >= MIN_POOL * 2) Scope.Deck else Scope.All
    val pool = remember(effective, model.vocab.keys.size, library) {
        when (effective) {
            Scope.Deck -> {
                val ids = model.vocab.keys
                SpeedRound.words((library.coreVocabulary + library.supplementaryVocabulary).filter { it.id in ids })
            }
            Scope.All -> SpeedRound.words(library.coreVocabulary)
            is Scope.Unit -> SpeedRound.words(library.coreVocabulary.filter { effective.n in it.units })
        }
    }
    val bestKey = when (effective) {
        Scope.Deck -> "speedBest.deck"
        Scope.All -> "speedBest.all"
        is Scope.Unit -> "speedBest.unit${effective.n}"
    }
    val remaining = maxOf(0L, deadline - now) / 1000.0

    fun deal() {
        val (l, r) = SpeedRound.deal(pool)
        left = l
        right = r
        matched.clear()
    }

    fun start() {
        deal()
        pickL = null
        pickR = null
        flash = null
        score = 0
        missed.clear()
        newBest = false
        added = false
        now = System.currentTimeMillis()
        deadline = now + SpeedRound.seconds * 1000L
        phase = Phase.Play
    }

    fun finish() {
        val best = model.prefs.int(bestKey, 0)
        if (score > best) {
            model.prefs.put(bestKey, score)
            newBest = score > 0
        }
        model.update { it.markStudied() }
        phase = Phase.Done
    }

    LaunchedEffect(phase) {
        if (phase != Phase.Play) return@LaunchedEffect
        while (true) {
            delay(100)
            now = System.currentTimeMillis()
            if (deadline - now <= 0) {
                finish()
                break
            }
        }
    }

    fun choose(sideLeft: Boolean, id: String) {
        val l = if (sideLeft) (if (pickL == id) null else id) else pickL
        val r = if (!sideLeft) (if (pickR == id) null else id) else pickR
        if (l == null || r == null) {
            pickL = l
            pickR = r
            return
        }
        pickL = null
        pickR = null
        val ok = l == r
        flash = Triple(l, r, ok)
        scope.launch {
            delay(if (ok) 220 else 420)
            if (flash?.first == l && flash?.second == r) flash = null
        }
        if (ok) {
            haptics.performHapticFeedback(HapticFeedbackType.Confirm)
            score++
            matched.add(l)
            if (matched.size == left.size) scope.launch {
                delay(200)
                if (phase == Phase.Play) deal()
            }
        } else {
            haptics.performHapticFeedback(HapticFeedbackType.Reject)
            deadline -= SpeedRound.missPenalty * 1000L
            left.firstOrNull { it.id == l }?.let { w -> if (missed.none { it.id == w.id }) missed.add(w) }
        }
    }

    CoverScaffold(onClose) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            when (phase) {
                Phase.Ready -> Ready(
                    model, pool.size, model.prefs.int(bestKey, 0), effective, { chosenScope = it }, ::start,
                )
                Phase.Play -> Column(Modifier.widthIn(max = 680.dp).fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        LectioProgress(
                            (remaining / SpeedRound.seconds).toFloat(), Modifier.weight(1f).semantics { contentDescription = "${Math.ceil(remaining).toInt()} seconds left" },
                            tint = if (remaining < 10) c.rubric else c.ink2,
                        )
                        Text("$score", Modifier.semantics { contentDescription = "$score matched" }, style = LectioText.figure(LectioText.title).copy(fontWeight = FontWeight.Medium), color = c.ink)
                    }
                    Text("Tap a word, then its meaning. A wrong pair costs ${SpeedRound.missPenalty} seconds.", style = LectioText.footnote, color = c.inkMuted)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            for (w in left) Tile(w, true, w.id in matched, pickL == w.id, flash?.takeIf { it.first == w.id }?.third) { choose(true, w.id) }
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            for (w in right) Tile(w, false, w.id in matched, pickR == w.id, flash?.takeIf { it.second == w.id }?.third) { choose(false, w.id) }
                        }
                    }
                }
                Phase.Done -> Done(
                    model, score, newBest, model.prefs.int(bestKey, 0), missed.toList(), added, ::start, onClose,
                ) {
                    model.update { doc -> doc.seedVocab(missed.filter { model.vocab[it.id] == null }.map { it.id }) }
                    added = true
                }
            }
        }
    }
}

@Composable
private fun Ready(model: AppModel, count: Int, best: Int, scope: Scope, onScope: (Scope) -> Unit, onStart: () -> Unit) {
    val c = Lectio.colors
    val options = buildList<Pair<Scope, String>> {
        if (model.vocab.size >= MIN_POOL) add(Scope.Deck to "My deck · ${model.vocab.size}")
        add(Scope.All to "The whole AP list")
        for (n in listOf("1", "2", "3", "4", "5", "6")) add(Scope.Unit(n) to "Unit $n")
    }
    Column(Modifier.widthIn(max = 640.dp).fillMaxSize()) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RubricLabel("Vocabulary · against the clock")
                Text("Speed round", style = LectioText.prose(LectioText.largeTitle), color = c.ink)
                Text(
                    "A minute to match as many Latin words to their meanings as you can, five at a time. A wrong pair costs ${SpeedRound.missPenalty} seconds, and the words you mix up are listed at the end.",
                    style = LectioText.prose(LectioText.body), color = c.ink2,
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                QuietLabel("Which words")
                MenuPicker("Which words", options, scope, onScope)
                Text("$count words" + if (best > 0) " · best $best" else "", style = LectioText.prose(LectioText.footnote), color = c.inkMuted)
            }
        }
        LectioButton(onStart, Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp).navigationBarsPadding(), prominent = true, enabled = count >= MIN_POOL) {
            ButtonLabel("Start · ${SpeedRound.seconds} seconds", "timer", LectioText.headline)
        }
    }
}

@Composable
private fun Tile(word: SpeedRound.Word, isLatin: Boolean, done: Boolean, picked: Boolean, flashOk: Boolean?, onClick: () -> Unit) {
    val c = Lectio.colors
    val edge by animateColorAsState(
        when {
            flashOk == true -> c.correct
            flashOk == false -> c.rubric
            picked -> c.ink
            else -> c.rule
        },
        label = "edge",
    )
    Surface(
        Modifier.fillMaxWidth().alpha(if (done) 0.25f else 1f).semantics { selected = picked },
        shape = RoundedCornerShape(14.dp), color = c.slip,
        border = BorderStroke(if (picked || flashOk != null) 2.dp else 0.5.dp, edge),
    ) {
        Box(Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable(enabled = !done, role = Role.Button, onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp), contentAlignment = Alignment.CenterStart) {
            Text(
                if (isLatin) word.latin else word.english,
                style = if (isLatin) LectioText.latin(20.sp) else LectioText.prose(LectioText.callout), color = c.ink,
            )
        }
    }
}

@Composable
private fun Done(
    model: AppModel, score: Int, newBest: Boolean, best: Int, missed: List<SpeedRound.Word>, added: Boolean,
    onAgain: () -> Unit, onClose: () -> Unit, onAdd: () -> Unit,
) {
    val c = Lectio.colors
    val toAdd = missed.filter { model.vocab[it.id] == null }
    Column(Modifier.widthIn(max = 640.dp).fillMaxSize()) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            RubricLabel("Time")
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontSize = 52.sp, fontWeight = FontWeight.Medium, color = c.rubric)) { append("$score") }
                    append(" ")
                    withStyle(SpanStyle(color = c.inkMuted)) { append(if (score == 1) "pair in a minute" else "pairs in a minute") }
                },
                style = LectioText.prose(LectioText.title3),
            )
            Text(if (newBest) "Your best yet." else "Best here: $best.", style = LectioText.prose(LectioText.body), color = c.ink2)
            if (missed.isNotEmpty()) Column {
                QuietLabel("Worth another look", Modifier.padding(bottom = 8.dp))
                for (w in missed) {
                    Hairline(color = c.hair)
                    Text(
                        buildAnnotatedString {
                            withStyle(SpanStyle(fontStyle = FontStyle.Italic, fontSize = 19.sp, color = c.ink)) { append(w.latin) }
                            append("  ")
                            withStyle(SpanStyle(color = c.ink2)) { append(w.english) }
                        },
                        Modifier.padding(vertical = 8.dp), style = LectioText.prose(LectioText.body),
                    )
                }
            }
        }
        Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            LectioButton(onAgain, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Again", style = LectioText.headline) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (toAdd.isNotEmpty() && !added) LectioButton(onAdd, Modifier.weight(1f)) { ButtonLabel("Add ${toAdd.size} to flashcards") }
                LectioButton(onClose, Modifier.weight(1f)) { ButtonLabel("Done") }
            }
        }
    }
}
