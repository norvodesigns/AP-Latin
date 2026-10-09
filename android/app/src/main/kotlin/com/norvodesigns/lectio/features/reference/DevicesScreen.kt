package com.norvodesigns.lectio.features.reference

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.DeviceCard
import com.norvodesigns.lectio.core.GrammarExample
import com.norvodesigns.lectio.features.read.ReaderPage
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.OptionCard
import com.norvodesigns.lectio.ui.components.OptionState
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.StudyDeck
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

private enum class DevicesMode(val label: String) { Reference("Reference"), Study("Study"), Drill("Drill") }

/** Skill 2.A, style and its function (src/app/devices/Devices.tsx): a reference, a study deck, and a spot-the-device drill built from every example in the reference. */
@Composable
fun DevicesScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var mode by remember { mutableStateOf(DevicesMode.Reference) }
    var reading by remember { mutableStateOf<String?>(null) }
    val passage = reading?.let { library.passage(it) }
    if (passage != null) {
        ReaderPage(model, passage) { reading = null }
        return
    }
    PageScaffold("Literary Devices") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 20.dp) {
            Segmented(DevicesMode.entries.map { it to it.label }, mode, { mode = it })
            when (mode) {
                DevicesMode.Reference -> for (d in library.deviceCards) DeviceEntry(model, d) { reading = it }
                DevicesMode.Study -> StudyDeck(model, library.deviceCards, { it.id }, "device", front = { d ->
                    Text(d.name, style = LectioText.prose(LectioText.title), color = c.ink, textAlign = TextAlign.Center)
                }, back = { d -> DeviceBack(model, d, true) { reading = it } })
                DevicesMode.Drill -> SpotTheDevice(model, library.deviceCards)
            }
        }
    }
}

@Composable
private fun DeviceEntry(model: AppModel, device: DeviceCard, onRead: (String) -> Unit) {
    val c = Lectio.colors
    var open by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = !open }, verticalAlignment = Alignment.CenterVertically) {
            Text(device.name, Modifier.weight(1f), style = LectioText.prose(LectioText.title3), color = c.ink)
            Symbol("chevron.down", tint = c.inkFaint, modifier = Modifier.rotate(if (open) 180f else 0f))
        }
        Text(device.definition, style = LectioText.prose(LectioText.callout), color = c.ink2)
        if (open) DeviceBack(model, device, false, onRead)
        Hairline(Modifier.padding(top = 6.dp), color = c.hair)
    }
}

@Composable
private fun DeviceBack(model: AppModel, device: DeviceCard, showDefinition: Boolean, onRead: (String) -> Unit) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        if (showDefinition) Text(device.definition, style = LectioText.prose(LectioText.title3), color = c.ink)
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, color = c.inkMuted)) { append("EFFECT — ") }
                append(device.effect)
            },
            style = LectioText.prose(LectioText.callout), color = c.ink2,
        )
        for (ex in device.examples) ExampleView(model, ex, onRead)
    }
}

/** Which device is at work here? Every reference example becomes an item, with three other devices as distractors. */
@Composable
private fun SpotTheDevice(model: AppModel, devices: List<DeviceCard>) {
    val c = Lectio.colors
    class Item(val example: GrammarExample, val answerId: String, val options: List<String>)

    fun build(): List<Item> {
        val items = ArrayList<Item>()
        for (d in devices) {
            // Examples whose analysis says they're *not* the device don't belong in the drill.
            for (ex in d.examples.filter { !it.analysis.lowercase().startsWith("not ") }) {
                val distractors = devices.filter { it.id != d.id }.map { it.id }.shuffled().take(3)
                items.add(Item(ex, d.id, (listOf(d.id) + distractors).shuffled()))
            }
        }
        return items.shuffled()
    }

    var pool by remember { mutableStateOf(build()) }
    var index by remember { mutableIntStateOf(0) }
    var chosen by remember { mutableStateOf<String?>(null) }
    var right by remember { mutableIntStateOf(0) }
    if (pool.isEmpty()) return
    val item = pool[index % pool.size]
    fun name(id: String) = devices.firstOrNull { it.id == id }?.name ?: id

    Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            RubricLabel("$right of ${index + (if (chosen == null) 0 else 1)} correct", Modifier.weight(1f))
            TextAction("Reshuffle", icon = "shuffle") { pool = build(); index = 0; chosen = null; right = 0 }
        }
        RuledBlock {
            QuietLabel("Which device is at work here?")
            Text(item.example.latin, style = LectioText.latin(24.sp), color = c.ink)
            Text(item.example.citation, style = LectioText.caption, color = c.inkFaint)
        }
        for (id in item.options) {
            val isAnswer = id == item.answerId
            val state = when {
                chosen == null -> OptionState.Idle
                isAnswer -> OptionState.Right
                id == chosen -> OptionState.Wrong
                else -> OptionState.Idle
            }
            OptionCard(state, Modifier.fillMaxWidth(), enabled = chosen == null, onClick = {
                if (chosen == null) {
                    chosen = id
                    if (isAnswer) right++
                    model.update { it.markStudied() }
                }
            }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(name(id), Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                    if (chosen != null && isAnswer) Symbol("checkmark.circle.fill", tint = c.correct)
                }
            }
        }
        if (chosen != null) {
            Text(item.example.analysis, style = LectioText.prose(LectioText.callout), color = c.ink2)
            LectioButton({ chosen = null; index++ }, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Next", style = LectioText.headline) }
        }
    }
}
