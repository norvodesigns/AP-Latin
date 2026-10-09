package com.norvodesigns.lectio.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * Cards over a reference list (grammar topics, devices, context): turn one over,
 * then "Got it" or "Practice again", which brings it back at the end. Studying a
 * deck counts as study time.
 */
@Composable
fun <T> StudyDeck(
    model: AppModel,
    items: List<T>,
    id: (T) -> String,
    noun: String,
    front: @Composable (T) -> Unit,
    back: @Composable (T) -> Unit,
) {
    val c = Lectio.colors
    val byId = remember(items) { items.associateBy(id) }
    val queue = remember(items) { mutableStateListOf<String>().apply { addAll(items.map(id).shuffled()) } }
    var cursor by remember(items) { mutableIntStateOf(0) }
    var shown by remember(items) { mutableStateOf(false) }
    var done by remember(items) { mutableIntStateOf(0) }

    fun reset() {
        queue.clear()
        queue.addAll(items.map(id).shuffled())
        cursor = 0
        shown = false
        done = 0
    }

    fun grade(again: Boolean) {
        val current = queue[cursor]
        done++
        if (done == 1) model.update { it.markStudied() }
        if (again) queue.add(current)
        cursor++
        shown = false
    }

    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        val item = queue.getOrNull(cursor)?.let { byId[it] }
        if (item != null) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                QuietLabel("${queue.size - cursor} left · $done done", Modifier.weight(1f))
                TextAction("Reshuffle", icon = "shuffle") { reset() }
            }
            AnimatedContent(
                queue[cursor] + cursor,
                transitionSpec = { (slideInHorizontally { it / 2 } + fadeIn()) togetherWith fadeOut() }, label = "deck",
            ) { target ->
                androidx.compose.runtime.key(target) { Surface(
                    Modifier.fillMaxWidth().heightIn(min = 260.dp).clickable(role = Role.Button, onClickLabel = if (shown) null else "Turn the card over") { shown = !shown },
                    shape = RoundedCornerShape(22.dp), color = c.slip, border = BorderStroke(0.5.dp, c.rule), shadowElevation = 4.dp,
                ) {
                    Box(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()).padding(24.dp), contentAlignment = if (shown) Alignment.TopStart else Alignment.Center) {
                        if (shown) back(item) else Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { front(item) }
                    }
                }
            }
            }
            if (shown) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    LectioButton({ grade(true) }, Modifier.weight(1f)) { ButtonLabel("Practice again", "arrow.counterclockwise", LectioText.headline) }
                    LectioButton({ grade(false) }, Modifier.weight(1f), prominent = true) { ButtonLabel("Got it", "checkmark", LectioText.headline) }
                }
            } else {
                LectioButton({ shown = true }, Modifier.fillMaxWidth()) { ButtonLabel("Turn over", "arrow.turn.up.right", LectioText.headline) }
            }
        } else if (queue.isNotEmpty()) {
            Column(Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Symbol("checkmark.seal", tint = c.correct, size = 48.dp)
                Text("Every $noun done", style = LectioText.prose(LectioText.title2), color = c.ink, textAlign = TextAlign.Center)
                LectioButton({ reset() }, prominent = true) { ButtonLabel("Go again") }
            }
        }
    }
}
