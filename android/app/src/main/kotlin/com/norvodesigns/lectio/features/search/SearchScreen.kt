package com.norvodesigns.lectio.features.search

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.SectionEntry
import com.norvodesigns.lectio.SectionGroup
import com.norvodesigns.lectio.core.ContentLibrary
import com.norvodesigns.lectio.core.GrammarTopic
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.SpacedRepetition
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.core.VocabEntry
import com.norvodesigns.lectio.features.today.BrowseTip
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.text.Normalizer
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height

private val marks = Regex("\\p{M}+")

private fun fold(s: String): String = Normalizer.normalize(s, Normalizer.Form.NFD).replace(marks, "").lowercase()

/** Everything search looks through, folded once per library rather than once per keystroke. */
private class SearchIndex(library: ContentLibrary?) {
    class Folded<T>(val item: T, val keys: List<String>)

    val passages = library?.passages?.map { Folded(it, listOf(fold(it.citation), fold(it.title))) } ?: emptyList()
    val words = library?.let { lib -> (lib.coreVocabulary + lib.supplementaryVocabulary).map { Folded(it, listOf(fold(it.headword), fold(it.definition))) } } ?: emptyList()
    val topics = library?.grammarTopics?.map { Folded(it, listOf(fold(it.name))) } ?: emptyList()
    val sections = SectionEntry.all.map { Folded(it, listOf(fold(it.title), fold(it.blurb))) }
}

private class SearchResults(val sections: List<SectionEntry>, val passages: List<Passage>, val words: List<VocabEntry>, val topics: List<GrammarTopic>) {
    val isEmpty get() = sections.isEmpty() && passages.isEmpty() && words.isEmpty() && topics.isEmpty()
}

private fun search(index: SearchIndex, query: String, visible: (SectionEntry) -> Boolean): SearchResults {
    val q = fold(query)
    val sections = index.sections.filter { visible(it.item) && it.keys.any { k -> k.contains(q) } }.map { it.item }
    val passages = index.passages.filter { it.keys.any { k -> k.contains(q) } }.take(8).map { it.item }
    val byHead = index.words.filter { it.keys[0].contains(q) }
    val byDefinition = if (query.length >= 3) index.words.filter { !it.keys[0].contains(q) && it.keys[1].contains(q) } else emptyList()
    val words = (byHead + byDefinition).take(20).map { it.item }
    val topics = index.topics.filter { it.keys[0].contains(q) }.take(8).map { it.item }
    return SearchResults(sections, passages, words, topics)
}

/**
 * Browse and search in one place. Empty, it's the whole menu as one list
 * (every section of the website, in its groups); typing turns it into a search
 * over sections, passages, vocabulary and grammar, the app's version of the
 * web's ⌘K palette.
 */
@Composable
fun SearchScreen(model: AppModel) {
    val c = Lectio.colors
    val library = model.content
    // Saved with the tab, so a result opened and backed out of returns to the same results.
    var query by rememberSaveable { mutableStateOf("") }
    var selectedEntry by remember { mutableStateOf<VocabEntry?>(null) }
    val trimmed = query.trim()
    val index = remember(library) { SearchIndex(library) }

    fun visible(entry: SectionEntry): Boolean = entry.tab != null || model.todaysSententia != null

    fun open(entry: SectionEntry) {
        if (entry.tab == null) model.openDaily() else model.openSection(entry.tab, from = AppTab.Search)
    }

    PageScaffold(if (trimmed.isEmpty()) "Browse" else "Search") { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Box(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp), contentAlignment = Alignment.Center) {
                Row(Modifier.widthIn(max = 720.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Symbol("magnifyingglass", tint = c.inkMuted, size = 22.dp)
                    LectioTextField(
                        query, { query = it }, Modifier.weight(1f), placeholder = "Sections, arma, Aeneid 4, ablative…",
                        textStyle = LectioText.body, singleLine = true, capitalization = KeyboardCapitalization.None, autoCorrect = false, imeAction = ImeAction.Search,
                        trailing = if (query.isEmpty()) null else ({
                            androidx.compose.material3.IconButton({ query = "" }, Modifier.size(32.dp)) {
                                Symbol("xmark.circle.fill", tint = c.inkFaint, size = 20.dp, contentDescription = "Clear search")
                            }
                        }),
                    )
                }
            }
            if (trimmed.isEmpty()) {
                LazyColumn(
                    Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp), horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    item { Box(Modifier.widthIn(max = 720.dp).fillMaxWidth()) { BrowseTip() } }
                    for (group in SectionGroup.entries) {
                        item(key = "h-${group.name}") {
                            RubricLabel(group.title, Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(top = if (group == SectionGroup.Study) 4.dp else 18.dp, start = 4.dp))
                        }
                        items(SectionEntry.inGroup(group).filter(::visible), key = { it.id }) { entry ->
                            Box(Modifier.widthIn(max = 720.dp).fillMaxWidth()) { SectionCard(model, entry) { open(entry) } }
                        }
                    }
                }
            } else {
                val results = remember(index, trimmed, model.todaysSententia != null) { search(index, trimmed, ::visible) }
                Results(model, trimmed, results, ::open) { selectedEntry = it }
            }
        }
    }

    selectedEntry?.let { entry ->
        ModalBottomSheet(onDismissRequest = { selectedEntry = null }, sheetState = rememberModalBottomSheetState(), containerColor = c.slip) {
            WordSheet(model, entry)
        }
    }
}

@Composable
private fun Results(model: AppModel, query: String, results: SearchResults, open: (SectionEntry) -> Unit, onWord: (VocabEntry) -> Unit) {
    val c = Lectio.colors
    val sections = results.sections
    val passages = results.passages
    val words = results.words
    val topics = results.topics

    if (results.isEmpty) {
        Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.TopCenter) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Symbol("magnifyingglass", tint = c.inkFaint, size = 44.dp)
                Text("No results for “$query”", style = LectioText.prose(LectioText.title3), color = c.ink)
                Text("Check the spelling or try a different search.", style = LectioText.subheadline, color = c.inkMuted)
            }
        }
        return
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 32.dp)) {
        if (sections.isNotEmpty()) {
            item { Header("Sections") }
            items(sections, key = { "s-" + it.id }) { entry ->
                ResultRow(onClick = { open(entry) }) {
                    Symbol(entry.symbol, tint = entry.group.tint(c), size = 24.dp)
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(entry.title, style = LectioText.body, color = c.ink)
                        Text(entry.blurb, style = LectioText.footnote, color = c.inkMuted)
                    }
                }
            }
        }
        if (passages.isNotEmpty()) {
            item { Header("Passages") }
            items(passages, key = { "p-" + it.id }) { passage ->
                ResultRow(onClick = { model.openPassage(passage) }) {
                    Column(Modifier.weight(1f)) {
                        Text(passage.citation, style = LectioText.latin(18.sp), color = c.ink)
                        Text(passage.title, style = LectioText.subheadline, color = c.inkMuted)
                    }
                }
            }
        }
        if (words.isNotEmpty()) {
            item { Header("Vocabulary") }
            items(words, key = { "w-" + it.id }) { entry ->
                ResultRow(onClick = { onWord(entry) }) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(entry.lemma, style = LectioText.latinItalic(18.sp), color = c.ink)
                        Text(entry.definition, style = LectioText.subheadline, color = c.inkMuted, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
        if (topics.isNotEmpty()) {
            item { Header("Grammar") }
            items(topics, key = { "g-" + it.id }) { topic ->
                ResultRow(onClick = { model.openGrammarTopic(topic.id) }) { Text(topic.name, Modifier.weight(1f), style = LectioText.body, color = c.ink) }
            }
        }
    }
}

@Composable
private fun Header(text: String) {
    RubricLabel(text, Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(top = 18.dp, bottom = 6.dp))
}

@Composable
private fun ResultRow(onClick: () -> Unit, content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit) {
    val c = Lectio.colors
    Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick).padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically, content = content,
        )
        com.norvodesigns.lectio.ui.components.Hairline(color = c.hair)
    }
}

/**
 * One section as a card: a tinted symbol, its name, one line on what it's for,
 * and a note where there's something to say (cards due, lessons done, the
 * Sententia finished).
 */
@Composable
private fun SectionCard(model: AppModel, entry: SectionEntry, onClick: () -> Unit) {
    val c = Lectio.colors
    val tint = entry.group.tint(c)
    val note: String? = when (entry.id) {
        "vocab" -> SpacedRepetition.due(model.vocab.values, StudyDates.today()).size.let { if (it > 0) "$it due" else null }
        "learn" -> model.grammarProgress.let { (done, total) -> if (done > 0 && total > 0) "$done of $total" else null }
        "daily" -> if (model.progress.daily[model.dailyDay] != null) "Done" else null
        else -> null
    }
    Surface(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = "${entry.title}. ${note ?: ""} ${entry.blurb}" },
        shape = RoundedCornerShape(22.dp), color = c.slip.copy(alpha = if (c.isDark) 0.92f else 0.88f), border = BorderStroke(0.75.dp, c.rule),
    ) {
        Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(46.dp).clip(RoundedCornerShape(13.dp)).background(tint.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Symbol(entry.symbol, tint = tint, size = 24.dp)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(entry.title, style = LectioText.headline, color = c.ink)
                Text(entry.blurb, style = LectioText.subheadline, color = c.inkMuted)
            }
            if (note != null) Text(note, style = LectioText.footnote.copy(fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum"), color = c.rubric)
            Symbol("chevron.right", tint = c.inkFaint, size = 20.dp)
        }
    }
}

/** A word from search: its entry, and a way to start learning it. */
@Composable
private fun WordSheet(model: AppModel, entry: VocabEntry) {
    val c = Lectio.colors
    val card = model.vocab[entry.id]
    val haptics = LocalHapticFeedback.current
    Column(Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(entry.lemma, style = LectioText.latinItalic(28.sp), color = c.ink)
        QuietLabel(entry.pos)
        Text(entry.definition, style = LectioText.prose(LectioText.title3), color = c.ink2)
        Spacer(Modifier.height(12.dp))
        if (card != null) {
            val days = maxOf(0, (StudyDates.dayNumber(card.due) ?: 0) - (StudyDates.dayNumber(StudyDates.today()) ?: 0))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Symbol("checkmark.circle", tint = c.inkMuted, size = 20.dp)
                Text(if (days == 0) "In your deck, due today" else "In your deck, due in $days day${if (days == 1) "" else "s"}", style = LectioText.subheadline, color = c.inkMuted)
            }
        } else {
            LectioButton({
                haptics.performHapticFeedback(HapticFeedbackType.Confirm)
                model.update { it.seedVocab(listOf(entry.id)) }
            }, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Add to my vocabulary deck", "plus") }
        }
    }
}
