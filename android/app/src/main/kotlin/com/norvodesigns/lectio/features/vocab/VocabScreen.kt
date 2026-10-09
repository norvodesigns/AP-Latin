package com.norvodesigns.lectio.features.vocab

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.core.ContentLibrary
import com.norvodesigns.lectio.core.Insights
import com.norvodesigns.lectio.core.SpacedRepetition
import com.norvodesigns.lectio.core.SpeedRound
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.core.VocabCard
import com.norvodesigns.lectio.core.VocabEntry
import com.norvodesigns.lectio.features.learn.CourseTrack
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.IconBadge
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.text.Normalizer

/** How a card is asked: the web's three directions. */
enum class VocabDirection(val label: String) {
    LaEn("Latin → English"), EnLa("English → Latin"), Context("In context"),
}

/** A flashcard session to run: the word ids in order, and how they are asked. */
@Immutable
data class VocabSession(val queue: List<String>, val direction: VocabDirection)

private val newBatchOptions = listOf(0 to "None", 10 to "10", 20 to "20", 50 to "50")

private fun fold(s: String) = Normalizer.normalize(s, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase()

/**
 * Spaced repetition over the vocabulary (src/app/vocab/Vocabulary.tsx).
 * Words enter the rotation by being looked up while reading, a unit or a
 * passage at a time from here, or as a batch of new cards in a review.
 */
@Composable
fun VocabScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var direction by remember { mutableStateOf(VocabDirection.LaEn) }
    var unit by remember { mutableStateOf<String?>(null) }
    var passageId by remember { mutableStateOf<String?>(null) }
    var newBatch by remember { mutableStateOf(20) }
    var search by remember { mutableStateOf("") }

    val scope = remember(library, unit, passageId) { scoped(library, unit, passageId) }
    val scopeIds = remember(scope) { scope.mapTo(HashSet()) { it.id } }
    val today = StudyDates.today()
    val due = SpacedRepetition.due(model.vocab.values, today).filter { it.id in scopeIds }
    val untouched = scope.filter { model.vocab[it.id] == null }
    val fresh = if (newBatch == 0) emptyList() else untouched.take(if (newBatch == -1) untouched.size else newBatch)
    val forecast = Insights.forecast(model.vocab)
    val browse = remember(scope, search) { browse(scope, search) }

    PageScaffold("Vocabulary") { padding ->
        LazyColumn(
            Modifier.padding(padding), horizontalAlignment = Alignment.CenterHorizontally,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 20.dp, end = 20.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Column(Modifier.widthIn(max = 720.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    FigureRow(Modifier.padding(horizontal = 4.dp), spacing = 28.dp) {
                        Figure("${due.size}", "due in scope", tint = c.rubric)
                        Figure("${model.vocab.size}", "in rotation")
                        Figure("${forecast.mature}", "mature")
                    }
                    if (library.course.vocabLevel != null) Panel(title = "Learn the AP list by letter") { VerbaRow(model) }

                    Panel(title = "Review") {
                        MenuPicker("Direction", VocabDirection.entries.map { it to it.label }, direction, { direction = it })
                        MenuPicker(
                            "Unit",
                            listOf<Pair<String?, String>>(null to "All units") + library.meta.unitTitles.keys.sorted().map { it to "Unit $it" },
                            unit, { unit = it },
                        )
                        MenuPicker(
                            "Passage",
                            listOf<Pair<String?, String>>(null to "Any passage") + library.passages.filter { it.required }.map { it.id to it.citation },
                            passageId, { passageId = it },
                        )
                        MenuPicker("New cards", newBatchOptions + (-1 to "All ${untouched.size}"), newBatch, { newBatch = it })
                        Text(
                            "New cards are words in this scope you haven’t met yet; each review adds that many, due today.",
                            style = LectioText.footnote, color = c.inkMuted,
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        LectioButton(
                            {
                                if (fresh.isNotEmpty()) model.update { it.seedVocab(fresh.map { w -> w.id }) }
                                val queue = due.map { it.id } + fresh.map { it.id }
                                if (queue.isNotEmpty()) model.vocabSession = VocabSession(queue, direction)
                            },
                            Modifier.fillMaxWidth(), prominent = true, enabled = due.isNotEmpty() || fresh.isNotEmpty(),
                        ) {
                            ButtonLabel(
                                if (due.isEmpty() && fresh.isEmpty()) "Nothing due in this scope" else "Review ${due.size} due" + if (fresh.isEmpty()) "" else " + ${fresh.size} new",
                                style = LectioText.headline,
                            )
                        }
                        LectioButton({ model.openDerivatives() }, Modifier.fillMaxWidth()) { ButtonLabel("Derivatives · 10 questions", "arrow.triangle.branch") }
                        LectioButton({ model.speedRoundOpen = true }, Modifier.fillMaxWidth()) { ButtonLabel("Speed round · ${SpeedRound.seconds} seconds", "timer") }
                    }

                    LectioTextField(search, { search = it }, placeholder = "Search words or meanings", singleLine = true, textStyle = LectioText.prose(LectioText.body))
                    RubricLabel("Browse ${unit?.let { "unit $it" } ?: "the core list"}", Modifier.padding(start = 4.dp, top = 4.dp))
                }
            }
            items(browse, key = { it.id }) { entry ->
                Box(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
                    Column {
                        VocabRow(entry, model.vocab[entry.id], library.derivatives[entry.id] ?: emptyList())
                        Hairline(color = c.hair)
                    }
                }
            }
        }
    }
}

private fun scoped(library: ContentLibrary, unit: String?, passageId: String?): List<VocabEntry> {
    var list = library.coreVocabulary
    if (unit != null) list = list.filter { unit in it.units }
    if (passageId != null) library.passage(passageId)?.let { p ->
        val ids = p.vocabIds.toHashSet()
        list = list.filter { it.id in ids }
    }
    return list
}

private fun browse(scope: List<VocabEntry>, search: String): List<VocabEntry> {
    val q = search.trim()
    if (q.isEmpty()) return scope.take(200)
    val folded = fold(q)
    return scope.filter { fold(it.headword).contains(folded) || it.definition.contains(q, ignoreCase = true) }
}

/** The vocabulary track (Verba) from the Vocab tab: the next lesson, how much of the list is known, and the way to every unit on the Course tab. */
@Composable
private fun VerbaRow(model: AppModel) {
    val c = Lectio.colors
    val (known, total) = model.wordsKnown
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        model.nextVocabLesson?.let { next ->
            Row(
                Modifier.fillMaxWidth().clickable(role = Role.Button) { model.openLesson(next.lesson.id) },
                horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBadge(if (next.lesson.isTest) "checkmark.seal" else "character.book.closed", c.woad)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    QuietLabel(if (next.lesson.isTest) "Unit test" else "Next words")
                    RichText(next.lesson.title, style = LectioText.prose(LectioText.headline), color = c.ink)
                    Text(
                        "${next.unit.title} · ${if (next.lesson.isTest) "pass to skip the unit" else "${next.lesson.words.size} words"} · ${next.lesson.minutes} min",
                        style = LectioText.subheadline, color = c.inkMuted,
                    )
                }
                Symbol("play.circle.fill", tint = c.rubric, size = 30.dp)
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("$known of $total words known", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
            LectioProgress(known.toFloat() / maxOf(1, total), tint = c.woad)
        }
        LectioButton(
            {
                model.prefs.put("courseTrack", CourseTrack.Vocabulary.name)
                model.selectedTab = AppTab.Learn
            },
            Modifier.fillMaxWidth(),
        ) { ButtonLabel("All seven units", "list.bullet.rectangle") }
    }
}

@Composable
private fun VocabRow(entry: VocabEntry, card: VocabCard?, derivatives: List<String>) {
    val c = Lectio.colors
    val today = StudyDates.today()
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(entry.lemma, style = LectioText.latinItalic(18.sp), color = c.ink)
            Text(entry.definition, style = LectioText.footnote, color = c.inkMuted, maxLines = 2)
            if (derivatives.isNotEmpty()) Text("English: ${derivatives.joinToString(", ")}", style = LectioText.caption, color = c.inkFaint)
        }
        if (card != null) {
            val isDue = card.due <= today
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    if (isDue) "due" else "in ${card.interval}d", style = LectioText.caption.copy(fontFeatureSettings = "tnum", fontWeight = FontWeight.Medium),
                    color = if (isDue) c.rubric else c.inkMuted,
                )
                if (card.lapses >= 2) QuietLabel("slipping")
            }
        } else {
            Text("new", style = LectioText.caption, color = c.inkFaint)
        }
    }
}
