package com.norvodesigns.lectio.features.reference

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.GrammarChart
import com.norvodesigns.lectio.core.GrammarExample
import com.norvodesigns.lectio.core.GrammarTopic
import com.norvodesigns.lectio.features.read.ReaderPage
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.StudyDeck
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

private val levels = listOf("foundational" to "Foundations", "ap" to "Tested on the AP exam", "advanced" to "Beyond the exam")

/** The grammar reference, ordered as a course runs: foundational paradigms, then the syntax AP tests, then the rest. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GrammarScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var studying by remember { mutableStateOf(false) }
    // A search result opens its topic directly.
    val topic = model.grammarTopicId?.let { id -> library.grammarTopics.firstOrNull { it.id == id } }
    if (topic != null) {
        androidx.activity.compose.BackHandler { model.grammarTopicId = null }
        GrammarTopicScreen(model, topic) { model.grammarTopicId = null }
        return
    }

    PageScaffold("Grammar & Syntax", actions = {
        IconButton({ studying = true }) { Symbol("rectangle.on.rectangle.angled", tint = c.ink, contentDescription = "Study") }
    }) { padding ->
        LazyColumn(Modifier.padding(padding), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 8.dp)) {
            for ((id, title) in levels) {
                val topics = library.grammarTopics.filter { it.courseLevel == id }
                if (topics.isEmpty()) continue
                item(key = "h-$id") { RubricLabel(title, Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(top = 16.dp, bottom = 4.dp)) }
                items(topics, key = { it.id }) { t ->
                    Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
                        Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { model.grammarTopicId = t.id }.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(t.name, style = LectioText.headline, color = c.ink)
                            Text(t.summary, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted, maxLines = 2)
                        }
                        Hairline(color = c.hair)
                    }
                }
            }
        }
    }
    if (studying) ModalBottomSheet({ studying = false }, containerColor = c.parchment) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Text("Study grammar", Modifier.align(Alignment.CenterHorizontally).padding(bottom = 16.dp), style = LectioText.prose(LectioText.headline), color = c.ink)
            StudyDeck(model, library.grammarTopics, { it.id }, "topic", front = { t ->
                Text(t.name, style = LectioText.prose(LectioText.title), color = c.ink, textAlign = TextAlign.Center)
            }, back = { t ->
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(t.summary, style = LectioText.prose(LectioText.title3), color = c.ink)
                    for (r in t.recognition) Text("· $r", style = LectioText.prose(LectioText.callout), color = c.ink2)
                }
            })
        }
    }
}

@Composable
fun GrammarTopicScreen(model: AppModel, topic: GrammarTopic, onBack: () -> Unit) {
    val c = Lectio.colors
    var reading by remember { mutableStateOf<String?>(null) }
    val passage = reading?.let { model.content?.passage(it) }
    if (passage != null) {
        ReaderPage(model, passage) { reading = null }
        return
    }
    PageScaffold(topic.name, onBack = onBack) { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 24.dp) {
            Text(topic.summary, style = LectioText.prose(LectioText.title3), color = c.ink)
            topic.charts?.forEach { GrammarChartView(it) }
            BulletSection("How to recognize it", topic.recognition)
            BulletSection("How to translate it", topic.translation)
            if (topic.examples.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                RubricLabel("From the readings")
                for (ex in topic.examples) {
                    ExampleView(model, ex) { reading = it }
                    Hairline(color = c.hair)
                }
            }
        }
    }
}

@Composable
internal fun BulletSection(title: String, items: List<String>) {
    if (items.isEmpty()) return
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        RubricLabel(title)
        for (item in items) Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("·", color = c.rubric, style = LectioText.prose(LectioText.body))
            Text(item, style = LectioText.prose(LectioText.body), color = c.ink)
        }
    }
}

/** A Latin example from the readings, with its citation (linked to the passage when it's one of ours) and the analysis. */
@Composable
internal fun ExampleView(model: AppModel, example: GrammarExample, onRead: (String) -> Unit) {
    val c = Lectio.colors
    val linked = example.passageId?.takeIf { model.content?.passage(it) != null }
    RuledBlock {
        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(example.latin, style = LectioText.latin(19.sp), color = c.ink)
            if (linked != null) TextAction(example.citation, Modifier.padding(start = 0.dp)) { onRead(linked) }
            else Text(example.citation, style = LectioText.caption, color = c.inkFaint)
            Text(example.analysis, style = LectioText.prose(LectioText.callout), color = c.ink2)
        }
    }
}

/** A declension or conjugation as an actual chart, ruled like a manuscript table. */
@Composable
private fun GrammarChartView(chart: GrammarChart) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(chart.title, style = LectioText.latinItalic(20.sp), color = c.ink)
        Column(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                Box(Modifier.widthIn(min = 64.dp))
                for (col in chart.cols) Box(Modifier.widthIn(min = 80.dp)) { QuietLabel(col) }
            }
            Hairline()
            for (row in chart.rows) Row(horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
                Text(row.label, Modifier.widthIn(min = 64.dp), style = LectioText.caption, color = c.inkMuted)
                for (cell in row.cells) Box(Modifier.widthIn(min = 80.dp)) {
                    Text(cell.ifEmpty { "—" }, style = LectioText.latin(19.sp), color = if (cell.isEmpty()) c.inkFaint else c.ink)
                }
            }
        }
        chart.note?.let { Text(it, style = LectioText.prose(LectioText.footnote), color = c.inkMuted) }
    }
}
