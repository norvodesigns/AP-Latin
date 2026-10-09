package com.norvodesigns.lectio.features.read

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.core.Annotation
import com.norvodesigns.lectio.core.HighlightColor
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.PassageLine
import com.norvodesigns.lectio.core.PassageState
import com.norvodesigns.lectio.core.Token
import com.norvodesigns.lectio.features.quiz.QuizSessionRequest
import com.norvodesigns.lectio.ui.components.FirstVisitTip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioColors
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.launch

/**
 * A passage opened over the screen that linked to it ("read in context"), with a
 * back button that returns there.
 */
@Composable
fun ReaderPage(model: AppModel, passage: Passage, onBack: () -> Unit) {
    androidx.activity.compose.BackHandler(onBack = onBack)
    com.norvodesigns.lectio.ui.components.ProvidePushedBack(onBack) { PassageReader(model, passage) }
}

/** A word the reader tapped, for the glossary. */
data class WordSelection(val passageId: String, val lineN: Int, val tokenIndex: Int, val token: Token)

/** A run of tokens on one line, chosen for highlighting: never across lines, as on the web, so an anchor is just a line number and a token range. */
data class SpanSelection(val lineN: Int, val start: Int, val end: Int) {
    operator fun contains(i: Int) = i in start..end
}

data class NoteTarget(val span: SpanSelection, val text: String, val existingId: String?, val note: String)

internal fun washFor(c: LectioColors, color: String?): Color = when (color) {
    HighlightColor.GILT -> c.washGilt
    HighlightColor.VERDIGRIS -> c.washVerdigris
    HighlightColor.WOAD -> c.washWoad
    HighlightColor.RUBRIC -> c.washRubric
    else -> Color.Transparent
}

internal fun fillFor(c: LectioColors, color: String): Color = when (color) {
    HighlightColor.GILT -> c.gilt
    HighlightColor.VERDIGRIS -> c.verdigris
    HighlightColor.WOAD -> c.woad
    else -> c.rubric
}

/**
 * One passage, set as a manuscript page: line numbers in the margin, the Latin
 * as large as the screen allows, and every word tappable for its gloss.
 *
 * Tap a word for its gloss. Touch and hold a word to start a highlight, tap
 * further words on the same line to extend it, and pick a pigment, add a note,
 * or ask the tutor about the line from the bar that appears.
 */
@Composable
fun PassageReader(model: AppModel, passage: Passage) {
    val c = Lectio.colors
    val library = model.content
    val state = remember(model.progress, passage.id) { model.progress.passage(passage.id) }
    val byLine = remember(state) { state.annotations.groupBy { it.lineN } }
    var selection by remember { mutableStateOf<WordSelection?>(null) }
    var span by remember { mutableStateOf<SpanSelection?>(null) }
    var noteTarget by remember { mutableStateOf<NoteTarget?>(null) }
    var askLine by remember { mutableStateOf<PassageLine?>(null) }
    var showNotes by remember { mutableStateOf(false) }
    var optionsMenu by remember { mutableStateOf(false) }
    var practiceMenu by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val wide = LocalConfiguration.current.screenWidthDp >= 600
    val haptics = LocalHapticFeedback.current

    LaunchedEffect(passage.id) {
        model.update { it.markOpened(passage.id) }
        model.checkAI()
    }

    fun spanText(s: SpanSelection): String =
        passage.lines.firstOrNull { it.n == s.lineN }?.let { l -> l.tokens.subList(s.start, s.end + 1).joinToString("") { it.text }.trim() } ?: ""

    fun existing(s: SpanSelection): Annotation? = state.annotations.firstOrNull { it.lineN == s.lineN && it.startTok == s.start && it.endTok == s.end }

    fun tapped(line: PassageLine, index: Int) {
        val current = span
        if (current != null) {
            if (current.lineN == line.n) {
                // Extending the highlight to take in the tapped word.
                span = current.copy(start = minOf(current.start, index), end = maxOf(current.end, index))
                return
            }
            span = null
        }
        if (!model.progress.glossaryEnabled) return
        val token = line.tokens[index]
        selection = WordSelection(passage.id, line.n, index, token)
        // Looking a word up is how vocabulary gets tracked, exactly as on the web: an exact dictionary match seeds it into the review rotation.
        // Stem matches are guesses and are not trusted enough to seed.
        val top = token.glosses.firstOrNull()
        if (top != null && top.isExact) model.update {
            it.encounterWord(top.id, passage.id)
            it.markStudied()
        }
    }

    fun held(line: PassageLine, index: Int) {
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        selection = null
        span = SpanSelection(line.n, index, index)
    }

    fun applyColor(color: String) {
        val s = span ?: return
        val text = spanText(s)
        // Tapping the pigment a span already has takes it off again.
        val next = if (existing(s)?.color == color) null else color
        model.update {
            it.setHighlight(passage.id, s.lineN, s.start, s.end, text, next)
            it.markStudied()
        }
        span = null
    }

    PageScaffold(
        passage.citation, ambient = false,
        actions = {
            IconButton({ model.update { it.toggleBookmark(passage.id) } }) {
                Symbol(if (state.bookmarked) "bookmark.fill" else "bookmark", tint = if (state.bookmarked) c.rubric else c.ink, contentDescription = if (state.bookmarked) "Remove bookmark" else "Bookmark")
            }
            IconButton({ showNotes = true }) { Symbol("text.alignleft", tint = c.ink, contentDescription = "Notes and context") }
            val questions = library?.questions?.filter { it.passageId == passage.id } ?: emptyList()
            val scannable = passage.isPoetry && passage.author == "vergil" && passage.required
            if (questions.isNotEmpty() || scannable) {
                Box {
                    IconButton({ practiceMenu = true }) { Symbol("graduationcap", tint = c.ink, contentDescription = "Practice") }
                    DropdownMenu(practiceMenu, { practiceMenu = false }, containerColor = c.slip) {
                        if (questions.isNotEmpty()) DropdownMenuItem(
                            text = { Text("${questions.size} questions on this passage") },
                            leadingIcon = { Symbol("checklist", size = 20.dp) },
                            onClick = {
                                practiceMenu = false
                                model.quizSession = QuizSessionRequest(questions.shuffled(), isReview = false)
                            },
                        )
                        if (scannable) DropdownMenuItem(
                            text = { Text("Scan this passage") },
                            leadingIcon = { Symbol("waveform.path", size = 20.dp) },
                            onClick = {
                                practiceMenu = false
                                model.scansionStartPassageId = passage.id
                                model.openSection(AppTab.Scansion, from = AppTab.Read)
                            },
                        )
                    }
                }
            }
            Box {
                IconButton({ optionsMenu = true }) { Symbol("textformat.size", tint = c.ink, contentDescription = "Reading options") }
                DropdownMenu(optionsMenu, { optionsMenu = false }, containerColor = c.slip) {
                    DropdownMenuItem(
                        text = { Text(if (model.progress.glossaryEnabled) "Glossary on (turn off for a cold read)" else "Glossary off (turn on)") },
                        leadingIcon = { Symbol("character.book.closed", size = 20.dp) },
                        onClick = {
                            model.update { it.toggleGlossary() }
                            optionsMenu = false
                        },
                    )
                    for ((label, scale) in listOf("Smaller" to 0.85, "Standard" to 1.0, "Larger" to 1.2, "Largest" to 1.45)) {
                        DropdownMenuItem(
                            text = { Text("Latin size: $label" + if (model.latinScale == scale) "  ✓" else "") },
                            onClick = {
                                model.latinScale = scale
                                optionsMenu = false
                            },
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(
                Modifier.fillMaxSize(), listState, horizontalAlignment = Alignment.CenterHorizontally,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 20.dp, end = 20.dp, bottom = 220.dp),
            ) {
                item(key = "header") {
                    Column(Modifier.widthIn(max = 760.dp).fillMaxWidth()) {
                        Header(passage)
                        FirstVisitTip(
                            "tip.gloss", "Tap any word", symbol = "hand.tap",
                            message = "Its meaning comes up from the vocabulary list. Touch and hold a word to highlight it, add a note, or ask about its line. Tap a line number to flag a hard line.",
                            modifier = Modifier.padding(bottom = 16.dp),
                        )
                        passage.salutation?.let {
                            Text(it, Modifier.padding(bottom = 12.dp), style = LectioText.latinItalic(18.sp, model.latinScale), color = c.ink2)
                        }
                    }
                }
                itemsIndexed(passage.lines, key = { _, l -> l.n }) { _, line ->
                    Box(Modifier.widthIn(max = 760.dp).fillMaxWidth()) {
                        LineRow(
                            model, passage, line, byLine[line.n] ?: emptyList(), line.n in state.flaggedLines,
                            glossed = selection?.takeIf { it.lineN == line.n }?.tokenIndex,
                            span = span?.takeIf { it.lineN == line.n },
                            scaleBoost = if (wide) 1.2 else 1.0,
                            onTap = { tapped(line, it) }, onHold = { held(line, it) },
                            onNote = { a -> noteTarget = NoteTarget(SpanSelection(a.lineN, a.startTok, a.endTok), a.text, a.id, a.note) },
                        )
                    }
                }
                item(key = "footer") { Box(Modifier.widthIn(max = 760.dp).fillMaxWidth()) { Footer(model, passage) } }
            }

            // Floating over the page: the gloss, or the highlight bar.
            Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding(), horizontalAlignment = Alignment.CenterHorizontally) {
                AnimatedVisibility(selection != null && span == null, enter = slideInVertically { it } + fadeIn(), exit = slideOutVertically { it } + fadeOut()) {
                    selection?.let { GlossPanel(model, it) { selection = null } }
                }
                AnimatedVisibility(span != null, enter = slideInVertically { it } + fadeIn(), exit = slideOutVertically { it } + fadeOut()) {
                    span?.let { s ->
                        val current = existing(s)
                        SpanToolbar(
                            current = current, onColor = ::applyColor,
                            onNote = {
                                noteTarget = NoteTarget(s, spanText(s), current?.id, current?.note ?: "")
                                span = null
                            },
                            onAsk = { askLine = passage.lines.firstOrNull { it.n == s.lineN } },
                            onRemove = {
                                current?.let { a -> model.update { it.removeAnnotation(passage.id, a.id) } }
                                span = null
                            },
                            onDone = { span = null },
                        )
                    }
                }
            }
        }
    }

    noteTarget?.let { target -> NoteEditor(model, target, passage.id) { noteTarget = null } }
    askLine?.let { line -> AskAboutLineSheet(model, passage, line) { askLine = null } }
    if (showNotes) {
        PassageNotesSheet(model, passage, onJump = { n ->
            showNotes = false
            val index = passage.lines.indexOfFirst { it.n == n }
            if (index >= 0) scope.launch { listState.animateScrollToItem(index + 1) }
        }, onDismiss = { showNotes = false })
    }
}


@Composable
private fun Header(passage: Passage) {
    val c = Lectio.colors
    Column(Modifier.padding(top = 12.dp, bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        RubricLabel(if (passage.required) "CED reading ${passage.cedReading ?: ""}" else "Supplementary")
        Text(passage.title, style = LectioText.prose(LectioText.title2), color = c.ink)
        Text("${passage.work} · ${passage.wordCount} words", style = LectioText.subheadline, color = c.inkMuted)
        Hairline(Modifier.padding(top = 10.dp), color = c.redLine)
    }
}

@Composable
private fun Footer(model: AppModel, passage: Passage) {
    val c = Lectio.colors
    val all = model.content?.passages ?: emptyList()
    val i = all.indexOfFirst { it.id == passage.id }
    val prev = if (i > 0) all[i - 1] else null
    val next = if (i >= 0 && i + 1 < all.size) all[i + 1] else null
    Column(Modifier.padding(top = 28.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text("Tap a word for its gloss. Touch and hold to highlight, add a note, or ask about the line.", style = LectioText.footnote, color = c.inkFaint)
        Hairline()
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            if (prev != null) Column(Modifier.clickable(role = Role.Button) { model.readPassageId = prev.id }.padding(vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                QuietLabel("← Previous")
                Text(prev.citation, style = LectioText.latin(17.sp), color = c.ink)
            } else Box(Modifier.size(1.dp))
            if (next != null) Column(Modifier.clickable(role = Role.Button) { model.readPassageId = next.id }.padding(vertical = 6.dp), horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                QuietLabel("Next →")
                Text(next.citation, style = LectioText.latin(17.sp), color = c.ink)
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* A line                                                              */
/* ------------------------------------------------------------------ */

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun LineRow(
    model: AppModel, passage: Passage, line: PassageLine, annotations: List<Annotation>, flagged: Boolean, glossed: Int?, span: SpanSelection?,
    scaleBoost: Double, onTap: (Int) -> Unit, onHold: (Int) -> Unit, onNote: (Annotation) -> Unit,
) {
    val c = Lectio.colors
    val glossaryEnabled = model.progress.glossaryEnabled
    // Verse is numbered every fifth line, as printed; prose sections always.
    val showNumber = !passage.isPoetry || line.n % 5 == 0 || line.n == passage.lines.firstOrNull()?.n
    val chunks = remember(line) {
        // Token index ranges, each a word plus the punctuation and space after it, so the flow never starts a line with a stray space.
        val out = ArrayList<IntRange>()
        var start = 0
        line.tokens.forEachIndexed { i, token -> if (token.isWord && i > start) { out.add(start until i); start = i } }
        if (start < line.tokens.size) out.add(start until line.tokens.size)
        out
    }
    val style = LectioText.latin(if (passage.isPoetry) 22.sp else 21.sp, model.latinScale * scaleBoost)

    Row(Modifier.fillMaxWidth().padding(vertical = if (passage.isPoetry) 3.dp else 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Text(
            if (showNumber || flagged) "${line.n}" else " ",
            Modifier.width(30.dp).clickable(role = Role.Button) { model.update { it.toggleFlaggedLine(passage.id, line.n) } }.padding(top = 6.dp)
                .semantics { contentDescription = if (flagged) "Line ${line.n}, flagged as hard" else "Line ${line.n}" },
            style = LectioText.caption.copy(fontFeatureSettings = "tnum", textAlign = androidx.compose.ui.text.style.TextAlign.End), color = if (flagged) c.rubric else c.inkFaint,
        )
        FlowRow(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            for (chunk in chunks) Row {
                for (i in chunk) TokenView(line, i, style, annotations, glossed == i, span?.contains(i) ?: false, glossaryEnabled, onTap, onHold, onNote)
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun TokenView(
    line: PassageLine, i: Int, style: androidx.compose.ui.text.TextStyle, annotations: List<Annotation>, glossed: Boolean, inSpan: Boolean, glossaryEnabled: Boolean,
    onTap: (Int) -> Unit, onHold: (Int) -> Unit, onNote: (Annotation) -> Unit,
) {
    val c = Lectio.colors
    val token = line.tokens[i]
    // The newest mark covering a token is the one shown, as on the web.
    val mark = annotations.lastOrNull { it.color != null && i >= it.startTok && i <= it.endTok }?.color
    val bg = if (inSpan || glossed) c.redTint else washFor(c, mark)
    var modifier = Modifier.clip(RoundedCornerShape(3.dp)).background(bg)
    if (token.isWord) {
        modifier = modifier.combinedClickable(onClick = { onTap(i) }, onLongClick = { onHold(i) }, role = Role.Button)
    }
    Box(modifier.then(if (inSpan) Modifier.drawUnderline(c.rubric) else Modifier)) {
        Text(token.text, Modifier.padding(horizontal = if (token.isWord) 1.dp else 0.dp), style = style, color = c.ink)
    }
    val noted = annotations.lastOrNull { it.endTok == i && it.note.trim().isNotEmpty() }
    if (noted != null) {
        Box(Modifier.clickable(role = Role.Button) { onNote(noted) }.semantics { contentDescription = "Your note on ${noted.text}" }.padding(horizontal = 1.dp)) {
            Symbol("text.bubble.fill", tint = c.rubric, size = 12.dp, modifier = Modifier.padding(bottom = 10.dp))
        }
    }
}

private fun Modifier.drawUnderline(color: Color): Modifier = this.drawBehind {
    val h = 1.5.dp.toPx()
    drawRect(color, topLeft = Offset(0f, size.height - h), size = Size(size.width, h))
}

/* ------------------------------------------------------------------ */
/* The gloss, and the highlight bar                                     */
/* ------------------------------------------------------------------ */

/** The gloss for a tapped word: a card over the page, short enough that the line it came from stays in view. */
@Composable
private fun GlossPanel(model: AppModel, selection: WordSelection, onClose: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    val entries = selection.token.glosses.mapNotNull { g -> library?.vocab(g.id)?.let { g to it } }
    Surface(
        Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).heightIn(max = 300.dp),
        shape = RoundedCornerShape(26.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule), shadowElevation = 10.dp,
    ) {
        Box {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(selection.token.text, style = LectioText.latin(34.sp), color = c.ink)
                if (entries.isEmpty()) {
                    Text("Not on the vocabulary lists. The exam would gloss a word like this in the margin.", style = LectioText.prose(LectioText.callout), color = c.inkMuted)
                } else {
                    entries.forEachIndexed { index, (gloss, entry) ->
                        if (index > 0) Hairline(color = c.hair)
                        Column(Modifier.semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(entry.lemma, style = LectioText.latinItalic(22.sp), color = c.ink)
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                QuietLabel(entry.pos)
                                // A stem match is the lookup's best guess, and says so.
                                if (!gloss.isExact) RubricLabel("Stem guess")
                                if (entry.isSupplementary) QuietLabel("Beyond the CED list")
                            }
                            Text(entry.definition, style = LectioText.prose(LectioText.body), color = c.ink2)
                        }
                    }
                }
            }
            IconButton(onClose, Modifier.align(Alignment.TopEnd)) { Symbol("xmark", tint = c.inkMuted, size = 20.dp, contentDescription = "Close") }
        }
    }
}

/** Floats over the page while a span is selected: the four manuscript pigments, a note, the tutor, and remove. */
@Composable
private fun SpanToolbar(current: Annotation?, onColor: (String) -> Unit, onNote: () -> Unit, onAsk: () -> Unit, onRemove: () -> Unit, onDone: () -> Unit) {
    val c = Lectio.colors
    Surface(
        Modifier.padding(horizontal = 16.dp, vertical = 8.dp), shape = RoundedCornerShape(50), color = c.slip,
        border = BorderStroke(0.75.dp, c.ruleStrong), shadowElevation = 10.dp,
    ) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically) {
            for (color in HighlightColor.all) {
                Box(
                    Modifier.size(44.dp).clickable(role = Role.Button) { onColor(color) }.semantics { contentDescription = color.replaceFirstChar { it.uppercase() } },
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.size(26.dp).clip(CircleShape).background(fillFor(c, color)), contentAlignment = Alignment.Center) {
                        if (current?.color == color) Symbol("checkmark", tint = Color.White, size = 16.dp)
                    }
                }
            }
            IconButton(onNote) { Symbol("square.and.pencil", tint = c.ink, contentDescription = "Note") }
            IconButton(onAsk) { Symbol("sparkles", tint = c.ink, contentDescription = "Ask") }
            if (current != null) IconButton(onRemove) { Symbol("trash", tint = c.incorrect, contentDescription = "Remove") }
            IconButton(onDone) { Symbol("xmark", tint = c.ink, contentDescription = "Done") }
        }
    }
}
