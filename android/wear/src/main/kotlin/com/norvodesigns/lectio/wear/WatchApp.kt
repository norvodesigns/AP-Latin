package com.norvodesigns.lectio.wear

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.TimeText

/** The app's coral on black: the dark-mode accent, which suits a watch. */
private val Coral = Color(0xFFE0796A)
private val Ink = Color(0xFFEFE7D5)
private val Muted = Color(0xFFA2967F)
private val Parchment = Color(0xFF17140F)
private val Serif = FontFamily.Serif

private val scheme = ColorScheme(
    primary = Coral, onPrimary = Parchment, primaryContainer = Color(0xFF4A2019), onPrimaryContainer = Ink,
    secondary = Color(0xFFCFA94D), onSecondary = Parchment,
    background = Color.Black, onBackground = Ink,
    surfaceContainer = Color(0xFF241F18), surfaceContainerLow = Color(0xFF1C1812), surfaceContainerHigh = Color(0xFF2C261D),
    onSurface = Ink, onSurfaceVariant = Muted,
)

/** Lectio on the wrist: the vocabulary cards due today, flipped and graded with the same two answers as the phone. */
@Composable
fun WatchApp(store: WatchStore, startReviewing: Boolean = false) {
    var reviewing by remember { mutableStateOf(startReviewing) }
    MaterialTheme(colorScheme = scheme) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            if (reviewing) Review(store) { reviewing = false } else Home(store) { reviewing = true }
        }
    }
}

@Composable
internal fun Home(store: WatchStore, onReview: () -> Unit) {
    val deck = store.deck
    Box(Modifier.fillMaxSize()) {
        TimeText()
        Column(Modifier.fillMaxSize().padding(horizontal = 14.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            if (deck != null) {
                Text("${deck.daysUntilExam}", fontSize = 40.sp, fontFamily = Serif, fontWeight = FontWeight.SemiBold, color = Coral)
                Text("DAYS TO THE EXAM", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Muted)
                Row(Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${store.queue.size} cards", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text("${deck.streak}-day streak", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Button(onClick = onReview, enabled = store.queue.isNotEmpty(), label = { Text(if (store.queue.isEmpty()) "All caught up" else "Review") })
            } else {
                Text("Open Lectio on your phone to send today’s cards.", fontSize = 13.sp, color = Muted, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
internal fun Review(store: WatchStore, onDone: () -> Unit) {
    var flipped by remember { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current
    val id = store.queue.firstOrNull()
    val card = id?.let { store.card(it) }
    if (id == null || card == null) {
        Column(Modifier.fillMaxSize().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("✓", fontSize = 34.sp, color = Color(0xFF6FBF9B))
            Text("${store.reviewed} reviewed", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text("Synced to your phone.", fontSize = 11.sp, color = Muted)
            Button(onClick = onDone, modifier = Modifier.padding(top = 8.dp), label = { Text("Done") })
        }
        return
    }
    fun grade(quality: Int) {
        store.grade(id, quality)
        haptics.performHapticFeedback(if (quality >= 3) HapticFeedbackType.Confirm else HapticFeedbackType.Reject)
        flipped = false
    }
    Column(
        Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 14.dp)
            .clickable(role = Role.Button, onClickLabel = if (flipped) "Hide the answer" else "Show the answer") { flipped = !flipped },
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
    ) {
        Text("${store.queue.size} left", fontSize = 10.sp, color = Muted)
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (flipped) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(card.lemma, fontSize = 17.sp, fontFamily = Serif, fontStyle = FontStyle.Italic, textAlign = TextAlign.Center)
                    Text(card.definition, fontSize = 13.sp, color = Muted, textAlign = TextAlign.Center)
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(card.headword, fontSize = 24.sp, fontFamily = Serif, textAlign = TextAlign.Center)
                    Text(card.pos, fontSize = 11.sp, color = Muted)
                }
            }
        }
        if (flipped) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Answer("↺", "Practice again", Color(0xFF2C261D), Ink) { grade(0) }
                Answer("✓", "Got it", Coral, Parchment) { grade(4) }
            }
        } else {
            Answer("Show", "Show the answer", Color(0xFF2C261D), Ink, wide = true) { flipped = true }
        }
    }
}

/** A round (or, for "Show", a pill-shaped) answer button, with its label centred. */
@Composable
private fun Answer(text: String, description: String, fill: Color, ink: Color, wide: Boolean = false, onClick: () -> Unit) {
    Box(
        Modifier.size(width = if (wide) 96.dp else 52.dp, height = 44.dp).clip(RoundedCornerShape(50)).background(fill)
            .clickable(role = Role.Button, onClick = onClick).clearAndSetSemantics { contentDescription = description; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) { Text(text, fontSize = if (wide) 15.sp else 20.sp, fontWeight = FontWeight.SemiBold, color = ink) }
}
