package com.norvodesigns.lectio.features.vocab

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.VocabEntry
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * One review session.
 *
 * Same two answers as the web: "Practice again" (SM-2 quality 0, so the card
 * comes back later this session and tomorrow) and "Got it" (quality 4). Asking
 * a student to split hairs between Hard and Good the instant they see a word
 * measured their mood more than their memory.
 */
@Composable
fun FlashcardSession(model: AppModel, session: VocabSession, onClose: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    val queue = remember(session) { mutableStateListOf<String>().apply { addAll(session.queue) } }
    var reviewed by remember(session) { mutableIntStateOf(0) }
    var flipped by remember(session) { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current

    LaunchedEffect(session) { model.update { it.markStudied() } }

    fun grade(id: String, quality: Int) {
        model.update { it.reviewVocab(id, quality) }
        reviewed++
        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        flipped = false
        queue.removeAt(0)
        // A miss comes back at the end of this session, as on the web.
        if (quality < 3) queue.add(id)
    }

    CoverScaffold(onClose, title = "") { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 560.dp).fillMaxSize().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                val id = queue.firstOrNull()
                val entry = id?.let { library?.vocab(it) }
                if (id != null && entry != null) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        QuietLabel("${queue.size} to go")
                        model.vocab[id]?.let { card ->
                            QuietLabel(if (card.reviews > 0) "Seen ${card.reviews}× · EF ${"%.2f".format(card.ef)}" else "New card")
                        }
                    }
                    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        AnimatedContent(
                            id + reviewed,
                            transitionSpec = {
                                (slideInHorizontally { it / 2 } + fadeIn()) togetherWith (slideOutHorizontally { -it / 2 } + fadeOut())
                            },
                            label = "card",
                        ) { _ ->
                            CardFace(
                                entry, session.direction, contextLine(model, session, entry), library?.derivatives?.get(entry.id) ?: emptyList(), flipped,
                                onFlip = { flipped = !flipped },
                            )
                        }
                    }
                    Controls(flipped, { flipped = true }, { grade(id, 0) }, { grade(id, 4) })
                } else {
                    Finished(reviewed, onClose)
                }
            }
        }
    }
}

@Composable
private fun Controls(flipped: Boolean, onShow: () -> Unit, onAgain: () -> Unit, onGotIt: () -> Unit) {
    if (flipped) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            LectioButton(onAgain, Modifier.weight(1f)) { ButtonLabel("Practice again", "arrow.counterclockwise", LectioText.headline) }
            LectioButton(onGotIt, Modifier.weight(1f), prominent = true) { ButtonLabel("Got it", "checkmark", LectioText.headline) }
        }
    } else {
        LectioButton(onShow, Modifier.fillMaxWidth()) { ButtonLabel("Show answer", "eye", LectioText.headline) }
    }
}

@Composable
private fun Finished(reviewed: Int, onClose: () -> Unit) {
    val c = Lectio.colors
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Symbol("checkmark.seal", tint = c.correct, size = 56.dp)
        Text("Session complete", style = LectioText.prose(LectioText.title), color = c.ink)
        Text(
            "$reviewed review${if (reviewed == 1) "" else "s"}. The next ones are scheduled.",
            style = LectioText.prose(LectioText.callout), color = c.inkMuted, textAlign = TextAlign.Center,
        )
        LectioButton(onClose, Modifier.padding(top = 8.dp), prominent = true) { ButtonLabel("Done", style = LectioText.headline) }
    }
}

/** A line from the readings where this very word occurs, found through the pre-resolved glossary, so it's the word itself, not a lookalike. */
private fun contextLine(model: AppModel, session: VocabSession, entry: VocabEntry): Pair<String, String>? {
    if (session.direction != VocabDirection.Context) return null
    val library = model.content ?: return null
    for (passage in library.passages) {
        for (line in passage.lines) {
            if (line.tokens.any { t -> t.glosses.firstOrNull()?.let { it.id == entry.id && it.isExact } == true }) {
                return line.latin to if (passage.isPoetry) "${passage.citation} (${line.n})" else "${passage.citation}.${line.n}"
            }
        }
    }
    return null
}

/** A card is content: a slip of parchment. */
@Composable
private fun CardFace(
    entry: VocabEntry, direction: VocabDirection, context: Pair<String, String>?, derivatives: List<String>, flipped: Boolean, onFlip: () -> Unit,
) {
    val c = Lectio.colors
    val rotation by animateFloatAsState(if (flipped) 180f else 0f, spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessLow), label = "flip")
    val density = LocalDensity.current.density
    val label = if (flipped) {
        "${entry.lemma}. ${entry.definition}" + if (derivatives.isEmpty()) "" else ". English: ${derivatives.joinToString(", ")}"
    } else when (direction) {
        VocabDirection.LaEn -> entry.headword
        VocabDirection.EnLa -> entry.definition
        VocabDirection.Context -> context?.let { "${it.first}. Which meaning of ${entry.headword} fits?" } ?: entry.headword
    }
    Surface(
        Modifier.fillMaxWidth().heightIn(min = 300.dp)
            .graphicsLayer { rotationY = rotation; cameraDistance = 14f * density }
            .clickable(role = Role.Button, onClickLabel = if (flipped) null else "Show the answer", onClick = onFlip)
            .clearAndSetSemantics { contentDescription = label; role = Role.Button },
        shape = RoundedCornerShape(24.dp), color = c.slip, border = BorderStroke(0.5.dp, c.rule), shadowElevation = 6.dp,
    ) {
        Box(Modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
            if (rotation < 90f) {
                Front(entry, direction, context)
            } else {
                Box(Modifier.graphicsLayer { rotationY = 180f }) { Back(entry, derivatives) }
            }
        }
    }
}

@Composable
private fun Front(entry: VocabEntry, direction: VocabDirection, context: Pair<String, String>?) {
    val c = Lectio.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        when {
            direction == VocabDirection.EnLa -> {
                Text(entry.definition, style = LectioText.prose(LectioText.title2), color = c.ink, textAlign = TextAlign.Center)
                QuietLabel(entry.pos)
            }
            direction == VocabDirection.Context && context != null -> {
                QuietLabel(context.second)
                Text(context.first, style = LectioText.latin(22.sp), color = c.ink, textAlign = TextAlign.Center)
                Text(
                    buildAnnotatedString {
                        append("Which meaning of ")
                        withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = c.rubric)) { append(entry.headword) }
                        append(" fits this line?")
                    },
                    style = LectioText.footnote, color = c.inkMuted, textAlign = TextAlign.Center,
                )
            }
            else -> {
                Text(entry.headword, style = LectioText.latin(44.sp), color = c.ink, textAlign = TextAlign.Center)
                QuietLabel(entry.pos)
            }
        }
    }
}

@Composable
private fun Back(entry: VocabEntry, derivatives: List<String>) {
    val c = Lectio.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(entry.lemma, style = LectioText.latinItalic(24.sp), color = c.ink, textAlign = TextAlign.Center)
        Hairline(Modifier.widthIn(max = 60.dp), color = c.redLine)
        Text(entry.definition, style = LectioText.prose(LectioText.title3), color = c.ink2, textAlign = TextAlign.Center)
        if (derivatives.isNotEmpty()) {
            Text("English: ${derivatives.joinToString(", ")}", style = LectioText.footnote, color = c.inkMuted, textAlign = TextAlign.Center)
        }
    }
}
