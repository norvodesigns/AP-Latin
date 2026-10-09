package com.norvodesigns.lectio.features.scansion

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.layout.layout
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.ScansionCorpus
import com.norvodesigns.lectio.core.ScansionLine
import com.norvodesigns.lectio.core.ScansionStats
import com.norvodesigns.lectio.core.ScansionWork
import com.norvodesigns.lectio.data.AssetSource
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal enum class Tool(val label: String, val hint: String) {
    Quantity("Quantity", "Tap a syllable: long, short, then clear."),
    Feet("Feet", "Tap the last syllable of a foot to rule a boundary after it. Five boundaries make six feet."),
    Elision("Elision", "Tap a word’s last syllable to claim it elides into the next word."),
}

/** The scansion lab's state: the corpus, the line being scanned, and the set passage being worked through. */
@Stable
private class LabState(val model: AppModel) {
    var corpus by mutableStateOf<ScansionCorpus?>(null)
    var work by mutableStateOf<ScansionWork?>(null)

    /** Bumped on every edit: the work is a mutable object, so this is what makes the line redraw. */
    var rev by mutableIntStateOf(0)
    var tool by mutableStateOf(Tool.Quantity)
    var loadError by mutableStateOf<String?>(null)
    var revisitMastered by mutableStateOf(false)
    var setPassage by mutableStateOf<Passage?>(null)
    var passageLines by mutableStateOf<List<ScansionLine>>(emptyList())
    private val books = HashMap<Int, List<ScansionLine>>()
    private var saveJob: Job? = null

    private val attempts get() = model.progress.scansionAttempts

    fun lines(book: Int): List<ScansionLine> = books.getOrPut(book) { runCatching { corpus?.loadBook(book) }.getOrNull() ?: emptyList() }

    val setPassages: List<Passage>
        get() = (model.content?.passages ?: emptyList()).filter { it.required && it.isPoetry && it.author == "vergil" }

    fun open(line: ScansionLine) {
        work = ScansionWork(line, model.progress.scansionDraft(line.id))
        tool = Tool.Quantity
        rev++
    }

    /** Opens a set passage on its first line not yet mastered. Corpus line numbers follow the OCT, as the passages do. False if none can be scanned. */
    fun openPassage(p: Passage): Boolean {
        val from = p.lines.firstOrNull()?.n ?: return false
        val to = p.lines.lastOrNull()?.n ?: return false
        val ls = lines(p.book).filter { line -> ScansionCorpus.parseLineId(line.id)?.second?.let { it in from..to } == true }
        if (ls.isEmpty()) return false
        val mastered = ScansionStats.mastered(attempts)
        setPassage = p
        passageLines = ls
        open(ls.firstOrNull { it.id !in mastered } ?: ls[0])
        return true
    }

    fun leavePassage() {
        setPassage = null
        passageLines = emptyList()
        next()
    }

    /** The next line: in order through a set passage, else at random. */
    fun next() {
        if (setPassage != null && passageLines.isNotEmpty()) {
            val mastered = if (revisitMastered) emptySet() else ScansionStats.mastered(attempts)
            val at = passageLines.indexOfFirst { it.id == work?.line?.id }
            for (step in 1..passageLines.size) {
                val line = passageLines[(at + step + passageLines.size) % passageLines.size]
                if (line.id !in mastered || step == passageLines.size) return open(line)
            }
            return
        }
        randomLine()
    }

    /** A random line from the whole corpus that isn't mastered (unless asked). */
    fun randomLine() {
        val corpus = corpus ?: return
        val mastered = if (revisitMastered) emptySet() else ScansionStats.mastered(attempts)
        val exclude = work?.line?.id
        repeat(6) {
            val candidates = lines(corpus.randomBook()).filter { it.id != exclude && it.id !in mastered }
            if (candidates.isNotEmpty()) return open(candidates.random())
        }
        for (info in corpus.index.books) {
            lines(info.book).firstOrNull { it.id != exclude && it.id !in mastered }?.let { return open(it) }
        }
    }

    fun weakest() {
        setPassage = null
        passageLines = emptyList()
        val id = ScansionStats.weakest(attempts)
        val parsed = id?.let { ScansionCorpus.parseLineId(it) }
        val line = parsed?.let { p -> lines(p.first).firstOrNull { it.id == id } }
        if (line == null) randomLine() else open(line)
    }

    fun edit(i: Int) {
        val w = work ?: return
        if (w.checked) return
        when (tool) {
            Tool.Quantity -> w.cycleMark(i)
            Tool.Feet -> w.toggleDivision(i)
            Tool.Elision -> w.toggleElision(i)
        }
        rev++
        scheduleDraftSave()
    }

    fun check() {
        val w = work ?: return
        w.markChecked()
        val s = w.score
        rev++
        model.update {
            it.recordScansion(w.line.id, s.correct, s.total)
            it.saveScansionDraft(w.line.id, w.draft)
            it.markStudied()
        }
    }

    fun retry() {
        val w = work ?: return
        work = ScansionWork(w.line, null)
        rev++
    }

    private fun scheduleDraftSave() {
        saveJob?.cancel()
        val w = work ?: return
        if (w.checked || w.isBlank) return
        saveJob = model.scope.launch {
            delay(500)
            model.update { it.saveScansionDraft(w.line.id, w.draft) }
        }
    }
}

/**
 * Dactylic hexameter across the whole Aeneid (src/app/scansion/ScansionLab.tsx).
 *
 * Scanning a line by hand is three judgments, and all three are asked, never
 * shown: each syllable's quantity, where the five foot boundaries fall, and
 * where words elide. On a touchscreen they're three tools, picked from the bar
 * at the bottom: tap a syllable to mark it long or short, to rule a boundary
 * after it, or to claim an elision.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScansionScreen(model: AppModel) {
    val c = Lectio.colors
    val context = LocalContext.current
    val state = remember(model) { LabState(model) }
    var showRules by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }

    LaunchedEffect(state) {
        if (state.corpus != null) return@LaunchedEffect
        try {
            val corpus = withContext(Dispatchers.IO) { ScansionCorpus(AssetSource(context.assets, "scansion")) }
            state.corpus = corpus
            val start = model.scansionStartPassageId?.also { model.scansionStartPassageId = null }
            val passage = start?.let { model.content?.passage(it) }
            if (passage != null && state.openPassage(passage)) return@LaunchedEffect
            state.next()
        } catch (e: Exception) {
            state.loadError = "The scansion corpus couldn’t be read: ${e.message}"
        }
    }

    // The Reader can send the student here again while the lab is already open.
    LaunchedEffect(model.scansionStartPassageId) {
        val id = model.scansionStartPassageId ?: return@LaunchedEffect
        if (state.corpus == null) return@LaunchedEffect
        model.scansionStartPassageId = null
        model.content?.passage(id)?.let { state.openPassage(it) }
    }

    PageScaffold(
        "Scansion Lab",
        actions = {
            IconButton({ showRules = true }) { Symbol("book", tint = c.ink, contentDescription = "Rules") }
            Box {
                IconButton({ menu = true }) { Symbol("ellipsis", tint = c.ink, contentDescription = "More") }
                DropdownMenu(menu, { menu = false }, containerColor = c.slip) {
                    if (state.setPassages.isNotEmpty()) {
                        Text("SET PASSAGES", Modifier.padding(horizontal = 16.dp, vertical = 6.dp), style = LectioText.quietLabel, color = c.inkMuted)
                        for (p in state.setPassages) DropdownMenuItem(text = { Text("${p.citation} · ${p.title}") }, onClick = { menu = false; state.openPassage(p) })
                    }
                    if (state.setPassage != null) DropdownMenuItem(text = { Text("Random lines") }, leadingIcon = { Symbol("shuffle", size = 20.dp) }, onClick = { menu = false; state.leavePassage() })
                    DropdownMenuItem(text = { Text("Weakest line") }, leadingIcon = { Symbol("bolt", size = 20.dp) }, onClick = { menu = false; state.weakest() })
                    DropdownMenuItem(
                        text = { Text("Include mastered lines" + if (state.revisitMastered) "  ✓" else "") },
                        onClick = { state.revisitMastered = !state.revisitMastered },
                    )
                }
            }
        },
    ) { padding ->
        val work = state.work
        val corpus = state.corpus
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                work != null && corpus != null -> Lab(state, work, corpus)
                state.loadError != null -> Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Symbol("exclamationmark.triangle", tint = c.rubric, size = 44.dp)
                    Text("Couldn’t load the corpus", Modifier.padding(top = 12.dp), style = LectioText.prose(LectioText.title2), color = c.ink)
                    Text(state.loadError ?: "", Modifier.padding(top = 8.dp), style = LectioText.subheadline, color = c.inkMuted)
                }
                else -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    CircularProgressIndicator(color = c.inkMuted, strokeWidth = 2.dp)
                    Text("Loading the Aeneid…", Modifier.padding(top = 12.dp), style = LectioText.subheadline, color = c.inkMuted)
                }
            }
        }
    }
    if (showRules) ModalBottomSheet({ showRules = false }, containerColor = c.parchment) { Rules() }
}

@Composable
private fun Lab(state: LabState, work: ScansionWork, corpus: ScansionCorpus) {
    val c = Lectio.colors
    val model = state.model
    @Suppress("UNUSED_VARIABLE") val redraw = state.rev
    val attempts = model.progress.scansionAttempts
    val stats = ScansionStats.byLine(attempts)
    val masteredCount = stats.values.count { it.mastered }
    val lineStats = stats[work.line.id]

    Box(Modifier.fillMaxSize()) {
        ScreenColumn(Modifier, maxWidth = 760.dp, spacing = 24.dp, contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = if (work.checked) 0.dp else 72.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                RubricLabel("Dactylic hexameter · ${work.line.citation}")
                val set = state.setPassage
                if (set != null) {
                    val at = state.passageLines.indexOfFirst { it.id == work.line.id }.coerceAtLeast(0) + 1
                    val done = state.passageLines.count { stats[it.id]?.mastered == true }
                    Text(
                        "Set passage: ${set.citation}, ${set.title}. Line $at of the ${state.passageLines.size} the corpus can scan here; $done mastered.",
                        style = LectioText.footnote, color = c.inkMuted,
                    )
                } else {
                    Text(
                        "Drawn at random from %,d of the %,d lines of the Aeneid with an unambiguous scansion. Lines you’ve mastered don’t come back.".format(corpus.index.total, corpus.index.sourceTotal),
                        style = LectioText.footnote, color = c.inkMuted,
                    )
                }
            }

            LineScansion(work, state.tool, state.rev) { state.edit(it) }

            if (work.checked) {
                Review(work, onRetry = { state.retry() }, onNext = { state.next() })
            } else {
                Text(state.tool.hint, style = LectioText.footnote, color = c.inkMuted)
                LectioButton({ state.check() }, Modifier.fillMaxWidth(), prominent = true, enabled = work.isReady) {
                    ButtonLabel(if (work.isReady) "Check the line" else "Mark every syllable and rule five boundaries", style = LectioText.headline)
                }
            }

            FigureRow(spacing = 24.dp) {
                Figure("$masteredCount", "lines mastered")
                Figure("${attempts.size}", "scans")
                if (lineStats != null) Figure("${(lineStats.bestAccuracy * 100).toInt()}%", "best on this line")
            }
            Badges(attempts, corpus.index.total)
        }
        if (!work.checked) {
            Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp)) {
                Segmented(Tool.entries.map { it to it.label }, state.tool, { state.tool = it })
            }
        }
    }
}

@Composable
private fun Review(work: ScansionWork, onRetry: () -> Unit, onNext: () -> Unit) {
    val c = Lectio.colors
    val s = work.score
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("${s.correct} of ${s.total}", style = LectioText.prose(LectioText.largeTitle).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
        Text(
            "Syllables ${s.syllables}/${s.syllablesTotal} · Feet ${s.boundaries}/${s.boundariesTotal} · Elisions ${s.elisions}/${s.elisionsTotal}",
            style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink2,
        )
        Text("The metre: " + work.line.feet.joinToString(" ") { if (it == "dactyl") "D" else "S" }, style = LectioText.latin(18.sp), color = c.ink)
        if (work.line.caesurae.isNotEmpty()) {
            Text("Caesurae: " + work.line.caesurae.joinToString(", ") { it.type }, style = LectioText.footnote, color = c.inkMuted)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            LectioButton(onRetry) { ButtonLabel("Try it again") }
            LectioButton(onNext, prominent = true) { ButtonLabel("Next line") }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Badges(attempts: List<com.norvodesigns.lectio.core.ScansionAttempt>, pool: Int) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RubricLabel("Badges")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            for (badge in ScansionStats.badges(attempts, maxOf(1, pool))) {
                Row(
                    Modifier.semantics { contentDescription = "${badge.label}. ${badge.detail}. ${if (badge.earned) "Earned" else "Not yet earned"}" },
                    horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically,
                ) {
                    Symbol(if (badge.earned) "seal.fill" else "seal", tint = if (badge.earned) c.gilt else c.inkFaint, size = 18.dp)
                    Text(badge.label, style = LectioText.footnote, color = if (badge.earned) c.gilt else c.inkFaint)
                }
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* The line itself                                                     */
/* ------------------------------------------------------------------ */

/** Where a syllable sits among the student's feet. */
private class Place(val group: ScansionWork.Group, val isFoot: Boolean, val startsGroup: Boolean, val endsGroup: Boolean)

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun LineScansion(work: ScansionWork, tool: Tool, @Suppress("UNUSED_PARAMETER") rev: Int, onTap: (Int) -> Unit) {
    val wide = LocalConfiguration.current.screenWidthDp >= 600
    val groups = work.groups
    val places = HashMap<Int, Place>()
    groups.forEachIndexed { gi, group ->
        val isFoot = group.closed || (gi == groups.size - 1 && work.divisions.size == 5)
        for (i in group.syllables) places[i] = Place(group, isFoot, i == group.syllables.first(), i == group.syllables.last())
    }
    val words = remember(work.line) {
        val out = ArrayList<MutableList<Int>>()
        work.line.syllables.forEachIndexed { i, syl -> if (i == 0 || syl.startsWord != false || out.isEmpty()) out.add(mutableListOf(i)) else out.last().add(i) }
        out
    }
    // The line wraps between words, never inside one.
    FlowRow(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        for (word in words) {
            Row(verticalAlignment = Alignment.Top) {
                for (i in word) places[i]?.let { Syllable(work, tool, i, it, wide, onTap) }
            }
        }
    }
}

@Composable
private fun Syllable(work: ScansionWork, tool: Tool, i: Int, place: Place, wide: Boolean, onTap: (Int) -> Unit) {
    val c = Lectio.colors
    val haptics = LocalHapticFeedback.current
    val syl = work.line.syllables[i]
    val showElided = if (work.checked) syl.isElided else i in work.elisions
    val mark = work.marks[i]
    val elidable = i in work.elidableIndices
    val lead: Dp = if (i != 0 && syl.startsWord != false) 10.dp else 0.dp
    val trail: Dp = if (place.endsGroup && place.group.closed) 10.dp else 0.dp

    val markColor = if (!work.checked) c.rubric else if (work.isCorrect(i)) c.correct else c.incorrect
    val textColor = when {
        showElided -> c.inkFaint
        !work.checked -> c.ink
        else -> when (work.result(i)) {
            ScansionWork.SyllableResult.Ok -> c.correct
            ScansionWork.SyllableResult.Blank -> c.inkFaint
            else -> c.incorrect
        }
    }
    val dotColor = when {
        !elidable -> Color.Transparent
        work.checked -> if (work.elisionCorrect(i)) c.correct else c.incorrect
        i in work.elisions -> c.rubric
        tool == Tool.Elision -> c.ruleStrong
        else -> c.hair
    }
    val bracketColor = if (!work.checked) c.ruleStrong else if (place.group.closed && !work.boundaryCorrect(place.group.endsAt)) c.incorrect else c.ruleStrong
    val boundaryColor = if (!work.checked) c.rubric else if (work.boundaryCorrect(place.group.endsAt)) c.correct else c.incorrect
    val caesura = run {
        val shown = if (work.checked) work.line.caesurae else listOfNotNull(work.mainCaesura)
        val metrical = work.metricalIndices
        shown.any { it.afterSyllable < metrical.size && metrical[it.afterSyllable] == i }
    }
    val spoken = listOfNotNull(
        mark?.let { if (it == "long") "long" else "short" }, if (showElided) "elided" else null, if (i in work.divisions) "foot ends here" else null,
    ).joinToString(", ")

    Column(
        Modifier.clickable(role = Role.Button) {
            haptics.performHapticFeedback(HapticFeedbackType.SegmentTick)
            onTap(i)
        }.semantics(mergeDescendants = true) { contentDescription = syl.text; stateDescription = spoken },
    ) {
        Box(
            Modifier.drawBehind {
                // The student's own boundary after a foot.
                if (place.endsGroup && place.group.closed) {
                    drawRect(boundaryColor, Offset(size.width - 5.dp.toPx(), 4.dp.toPx()), Size(2.dp.toPx(), size.height - 8.dp.toPx()))
                }
                // A ruled bracket under each foot the student has divided, named from their own marks, never from the answer.
                if (place.isFoot) {
                    val start = if (place.startsGroup) lead.toPx() else 0f
                    drawRect(bracketColor, Offset(start, size.height - 1.dp.toPx()), Size(size.width - trail.toPx() - start, 1.dp.toPx()))
                }
            }.padding(start = lead, end = trail, bottom = 6.dp),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    when (mark) { "long" -> "–"; "short" -> "⏑"; else -> " " },
                    Modifier.height(22.dp), style = LectioText.latin(18.sp).copy(fontWeight = FontWeight.SemiBold), color = markColor,
                )
                Row {
                    Text(
                        syl.text, style = LectioText.latin(if (wide) 32.sp else 26.sp).copy(textDecoration = if (showElided) TextDecoration.LineThrough else null),
                        color = textColor, softWrap = false,
                    )
                    if (caesura) Text(" ‖", style = LectioText.latin(if (wide) 27.sp else 22.sp), color = c.rubric, softWrap = false)
                }
                // The elision target: shown on every word-final syllable, whether or not it really elides, so its presence gives nothing away.
                Box(Modifier.size(7.dp).clip(CircleShape).background(dotColor))
            }
        }
        Box(Modifier.height(14.dp)) {
            if (place.isFoot && place.startsGroup) {
                Text(
                    (work.footName(place.group) ?: " ").uppercase(),
                    // Drawn from the foot's first syllable but taking no room of its own, so a long name never pushes the syllables apart.
                    Modifier.padding(start = lead).layout { measurable, _ ->
                        val placeable = measurable.measure(androidx.compose.ui.unit.Constraints())
                        layout(0, placeable.height) { placeable.place(0, 0) }
                    },
                    style = LectioText.caption2.copy(fontWeight = FontWeight.Medium, letterSpacing = 1.sp), color = c.inkMuted, softWrap = false,
                )
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

private val rules = listOf(
    "The line" to "Six feet. The first four are dactyls (– ⏑ ⏑) or spondees (– –); the fifth is almost always a dactyl; the sixth is two syllables, the last of which may be short (anceps).",
    "Long by nature" to "A long vowel or a diphthong (ae, au, ei, eu, oe, ui) makes its syllable long.",
    "Long by position" to "A vowel followed by two consonants — in the same word or across a word break — makes its syllable long. x and z count as two; qu and h don’t count.",
    "Mute and liquid" to "A mute (p, b, t, d, c, g) followed by a liquid (l, r) may leave the syllable short — the poet’s choice.",
    "Elision" to "A word ending in a vowel, a diphthong or -m elides before a word beginning with a vowel or h: the final syllable is swallowed and doesn’t count.",
    "Caesura" to "A word break inside a foot. The main one usually falls in the third foot (penthemimeral), otherwise the fourth (hephthemimeral).",
    "Working method" to "Mark what you know first: the fifth foot (– ⏑ ⏑ | – x), every diphthong, every syllable long by position. The rest usually falls into place.",
)

@Composable
private fun Rules() {
    val c = Lectio.colors
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text("Rules of the hexameter", Modifier.align(Alignment.CenterHorizontally), style = LectioText.prose(LectioText.headline), color = c.ink)
        for ((title, body) in rules) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                RubricLabel(title)
                Text(body, style = LectioText.prose(LectioText.body), color = c.ink)
            }
        }
    }
}
