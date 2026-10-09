package com.norvodesigns.lectio.features.laurels

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.AppTab
import com.norvodesigns.lectio.core.Laurel
import com.norvodesigns.lectio.core.Laurels
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LabelRow
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** Laurels: the web's /laurels. Achievements across the whole app, from the progress that already syncs. */
@Composable
fun LaurelsScreen(model: AppModel) {
    val c = Lectio.colors
    val course = model.content?.course
    val list = remember(model.progress, course) { course?.let { Laurels.all(model.progress, it) } ?: emptyList() }
    val earned = list.filter { it.earned }
    // The ones under way, closest to done first.
    val going = list.filter { !it.earned && it.have > 0 }.sortedByDescending { it.have.toDouble() / it.target }
    val ahead = list.filter { !it.earned && it.have == 0 }
    PageScaffold("Laurels") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 720.dp) {
            Text(
                "${earned.size} of ${list.size} earned. They come from what you do anywhere in Lectio, on any device you sign in on.",
                style = LectioText.prose(LectioText.body), color = c.inkMuted, modifier = Modifier.padding(top = 4.dp),
            )
            Group("Earned", earned)
            Group("Under way", going)
            Group("Still ahead", ahead)
        }
    }
}

@Composable
private fun Group(title: String, laurels: List<Laurel>) {
    if (laurels.isEmpty()) return
    val c = Lectio.colors
    Panel(title = title, trailing = "${laurels.size}") {
        Column {
            laurels.forEachIndexed { i, laurel ->
                if (i > 0) Hairline(color = c.hair)
                LaurelRow(laurel)
            }
        }
    }
}

@Composable
private fun LaurelRow(laurel: Laurel) {
    val c = Lectio.colors
    val spoken = if (laurel.earned) "Earned" else if (laurel.target > 1) "${laurel.have} of ${laurel.target}" else "Not yet"
    Column(Modifier.padding(vertical = 10.dp).semantics(mergeDescendants = true) { contentDescription = "${laurel.latin}. ${laurel.title}. ${laurel.detail} $spoken" }, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        LabelRow(
            leading = {
                Text(
                    if (laurel.earned) "❦ ${laurel.latin}" else laurel.latin,
                    style = LectioText.latinItalic(20.sp), color = if (laurel.earned) c.rubric else c.ink,
                )
            },
            trailing = {
                if (laurel.earned) QuietLabel("earned", color = c.rubric)
                else if (laurel.target > 1) Text("${laurel.have} / ${laurel.target}", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
            },
        )
        Text(
            buildAnnotatedString {
                pushStyle(SpanStyle(color = c.ink2))
                append("${laurel.title}. ")
                pop()
                pushStyle(SpanStyle(color = c.inkMuted))
                append(laurel.detail)
                pop()
            },
            style = LectioText.prose(LectioText.callout),
        )
        if (!laurel.earned && laurel.target > 1 && laurel.have > 0) {
            LectioProgress(laurel.have.toFloat() / laurel.target, Modifier.padding(top = 2.dp))
        }
    }
}

/**
 * Laurels in a row on Today: how many are earned and the next one near, and a
 * laurel earned since last time, named once. The first time, what is already
 * earned is simply remembered.
 */
@Composable
fun LaurelsTodayRow(model: AppModel) {
    val c = Lectio.colors
    val course = model.content?.course
    val list = remember(model.progress, course) { course?.let { Laurels.all(model.progress, it) } ?: emptyList() }
    val earned = list.filter { it.earned }
    val next = Laurels.next(list)
    var fresh by remember { mutableStateOf<Laurel?>(null) }
    val earnedIds = earned.map { it.id }
    LaunchedEffect(earnedIds) {
        val seen = model.prefs.string("laurelsSeen")?.split(",")?.filter { it.isNotEmpty() }
        if (seen != null) {
            earnedIds.lastOrNull { it !in seen }?.let { newest -> fresh = list.firstOrNull { it.id == newest } }
        }
        model.prefs.put("laurelsSeen", earnedIds.joinToString(","))
    }
    Column(
        Modifier.fillMaxWidth().clickable(role = Role.Button) { model.selectedTab = AppTab.Laurels },
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        LabelRow(
            leading = { RubricLabel("Laurels") },
            trailing = {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    QuietLabel("${earned.size} of ${list.size} earned")
                    Symbol("chevron.right", tint = c.inkFaint, size = 16.dp)
                }
            },
        )
        fresh?.let { f ->
            Text(
                buildAnnotatedString {
                    append("❦ New: ")
                    pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                    append(f.latin)
                    pop()
                    append(", ${f.title.lowercase()}.")
                },
                style = LectioText.prose(LectioText.callout), color = c.rubric,
            )
        }
        next?.let { n ->
            Text(
                buildAnnotatedString {
                    append("Next: ")
                    pushStyle(SpanStyle(fontStyle = FontStyle.Italic))
                    append(n.latin)
                    pop()
                    append(", ${n.title.lowercase()}${if (n.target > 1) " (${n.have} of ${n.target})." else "."}")
                },
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
        }
    }
}
