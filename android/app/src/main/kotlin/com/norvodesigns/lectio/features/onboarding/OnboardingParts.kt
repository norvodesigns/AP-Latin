package com.norvodesigns.lectio.features.onboarding

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.R
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/* ------------------------------------------------------------------ */
/* The mark                                                            */
/* ------------------------------------------------------------------ */

/** The L of the app icon on a disc of parchment, between laurels: the first thing the welcome shows, and the last thing the plan does. It settles into place once. */
@Composable
fun LectioMedallion(modifier: Modifier = Modifier, size: Dp = 148.dp) {
    val c = Lectio.colors
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    val scale by animateFloatAsState(if (shown) 1f else 0.86f, spring(0.55f, Spring.StiffnessLow), label = "medallion")
    val alpha by animateFloatAsState(if (shown) 1f else 0f, tween(600), label = "medallion-alpha")
    Box(modifier.size(size * 1.5f).alpha(alpha).scale(scale).clearAndSetSemantics { }, contentAlignment = Alignment.Center) {
        Image(painterResource(R.drawable.lectio_laurel), null, Modifier.fillMaxSize(), colorFilter = ColorFilter.tint(c.gilt))
        Box(Modifier.size(size * 0.86f).clip(CircleShape).background(c.parchment).shadow(0.dp, CircleShape), contentAlignment = Alignment.Center) {
            Image(painterResource(R.drawable.lectio_mark), null, Modifier.size(size * 0.7f), colorFilter = ColorFilter.tint(c.rubric))
        }
    }
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

/** How far through the setup questions: one short bar per step. */
@Composable
fun ProgressSegments(count: Int, current: Int, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    Row(
        modifier.semantics(mergeDescendants = true) { contentDescription = "Step ${minOf(current + 1, count)} of $count" },
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        for (i in 0 until count) {
            Box(Modifier.weight(1f).height(4.dp).clip(CircleShape).background(if (i <= current) c.rubric else c.ruleStrong.copy(alpha = 0.6f)))
        }
    }
}

/** The tour's page dots: the current one is a longer red bar. */
@Composable
fun PageDots(count: Int, current: Int, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    Row(modifier.semantics(mergeDescendants = true) { contentDescription = "Page ${current + 1} of $count" }, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        for (i in 0 until count) {
            val width by animateDpAsState(if (i == current) 22.dp else 7.dp, spring(), label = "dot")
            Box(Modifier.width(width).height(7.dp).clip(CircleShape).background(if (i == current) c.rubric else c.inkFaint.copy(alpha = 0.45f)))
        }
    }
}

/** A step's heading: a small rubric eyebrow, a serif title, a line of prose. */
@Composable
fun OnboardingHeading(eyebrow: String, title: String, detail: String? = null) {
    val c = Lectio.colors
    Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { heading() }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RubricLabel(eyebrow)
        Text(title, style = LectioText.prose(LectioText.largeTitle), color = c.ink, textAlign = TextAlign.Center)
        if (detail != null) Text(detail, Modifier.padding(top = 2.dp), style = LectioText.prose(LectioText.callout), color = c.inkMuted, textAlign = TextAlign.Center)
    }
}

/** One answer to "where are you starting?": an icon, a title, a line of explanation, and a check when it's the one chosen. */
@Composable
fun ChoiceCard(symbol: String, tint: Color, title: String, detail: String, selected: Boolean, onClick: () -> Unit) {
    val c = Lectio.colors
    Surface(
        Modifier.fillMaxWidth().semantics { this.contentDescription = "$title. $detail" + if (selected) ". Selected" else "" },
        shape = RoundedCornerShape(20.dp), color = if (selected) c.redTint else c.slip.copy(alpha = 0.85f),
        border = BorderStroke(if (selected) 1.5.dp else 0.75.dp, if (selected) c.rubric else c.ruleStrong),
    ) {
        Row(
            Modifier.clickable(role = Role.RadioButton, onClick = onClick).padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(46.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) { Symbol(symbol, tint = tint, size = 24.dp) }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
                Text(detail, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
            }
            Symbol(if (selected) "checkmark.circle.fill" else "circle", tint = if (selected) c.rubric else c.inkFaint, size = 26.dp)
        }
    }
}

/** A row of the plan: what, and the answer. */
@Composable
fun PlanRow(symbol: String, tint: Color, label: String, value: String) {
    val c = Lectio.colors
    Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { }, horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) { Symbol(symbol, tint = tint, size = 20.dp) }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            QuietLabel(label)
            Text(value, style = LectioText.prose(LectioText.body), color = c.ink)
        }
    }
}

/** What the daily reminder looks like, before the system asks permission. */
@Composable
fun NotificationPreview() {
    val c = Lectio.colors
    Surface(
        Modifier.fillMaxWidth().clearAndSetSemantics { contentDescription = "Example reminder: Time for Latin. 12 vocabulary cards due. Keep your 5-day streak going." },
        shape = RoundedCornerShape(22.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule),
    ) {
        Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(38.dp).clip(RoundedCornerShape(9.dp)).background(c.parchment), contentAlignment = Alignment.Center) {
                Image(painterResource(R.drawable.lectio_mark), null, Modifier.size(28.dp), colorFilter = ColorFilter.tint(c.rubric))
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(Modifier.fillMaxWidth()) {
                    Text("Time for Latin", Modifier.weight(1f), style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Text("now", style = LectioText.caption, color = c.inkMuted)
                }
                Text("12 vocabulary cards due. Keep your 5-day streak going.", style = LectioText.subheadline, color = c.ink2)
            }
        }
    }
}

/** Content set on a slip of the page: the plan, the benefits. The Android counterpart to the iOS glass panel. */
@Composable
fun SlipPanel(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    val c = Lectio.colors
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(26.dp), color = c.slip.copy(alpha = 0.9f), border = BorderStroke(0.75.dp, c.rule)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
    }
}

/* ------------------------------------------------------------------ */
/* The tour                                                            */
/* ------------------------------------------------------------------ */

const val TOUR_PAGES = 3

/** The three things Lectio does, a page each, every one with a small live picture of the real screen rather than a promise. */
@Composable
fun TourPages(state: PagerState, model: AppModel) {
    HorizontalPager(state, Modifier.fillMaxSize()) { page ->
        when (page) {
            0 -> TourPage("The course", "Start where you are", "Short lessons in order, from your first Latin word to Vergil. A quick check skips what you already know.") { CoursePreview(model) }
            1 -> TourPage("The Reading Room", "Every word, glossed", "All the AP passages of Vergil and Pliny. Tap a word for its meaning, hold to highlight, and ask about any line.") { ReadingPreview() }
            else -> TourPage("Vocabulary", "Words that stick", "Each card comes back just before you’d forget it. A few minutes a day keeps the whole AP list fresh, on your phone or your watch.") { FlashcardPreview() }
        }
    }
}

@Composable
private fun TourPage(eyebrow: String, title: String, detail: String, picture: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.Center) {
        Column(Modifier.widthIn(max = 560.dp).padding(horizontal = 24.dp, vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(28.dp)) {
            Box(Modifier.widthIn(max = 380.dp).padding(top = 8.dp)) { picture() }
            OnboardingHeading(eyebrow, title, detail)
        }
    }
}

@Composable
private fun PreviewCard(description: String, content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    val c = Lectio.colors
    Surface(
        Modifier.fillMaxWidth().clearAndSetSemantics { contentDescription = description },
        shape = RoundedCornerShape(26.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule), shadowElevation = 4.dp,
    ) { Column(Modifier.padding(20.dp), content = content) }
}

/** The course: two units done, the third under way. */
@Composable
private fun CoursePreview(model: AppModel) {
    val c = Lectio.colors
    val units = model.content?.course?.grammarLevels?.firstOrNull()?.units?.take(3)?.map { Rich.plain(it.title) }.orEmpty()
    val titles = if (units.size == 3) units else listOf("Sounds and first words", "The first declension", "The second declension")
    var filled by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { filled = true }
    val progress by animateFloatAsState(if (filled) 0.4f else 0.05f, tween(1200, 300), label = "bar")
    PreviewCard("A course map: units one and two done, unit three under way.") {
        RubricLabel("Prīma", Modifier.padding(bottom = 10.dp))
        titles.forEachIndexed { i, title ->
            if (i > 0) Hairline(Modifier.padding(vertical = 10.dp), color = c.hair)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Symbol(if (i < 2) "checkmark.circle.fill" else "play.circle.fill", tint = if (i < 2) c.correct else c.rubric, size = 28.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    QuietLabel("Unit ${i + 1}")
                    Text(title, style = LectioText.prose(LectioText.subheadline).copy(fontWeight = if (i == 2) FontWeight.SemiBold else FontWeight.Normal), color = c.ink, maxLines = 2)
                    if (i == 2) com.norvodesigns.lectio.ui.components.LectioProgress(progress)
                }
            }
        }
    }
}

/** The opening of the Aeneid, with one word looked up. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReadingPreview() {
    val c = Lectio.colors
    val words = listOf("Arma", "virumque", "canō,", "Trōiae", "quī", "prīmus", "ab", "ōrīs")
    var looked by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(450); looked = true }
    val reveal by animateFloatAsState(if (looked) 1f else 0f, tween(600), label = "reveal")
    PreviewCard("The first line of the Aeneid, with the word virumque looked up: vir, man or hero, and -que, and.") {
        RubricLabel("Aeneid 1.1", Modifier.padding(bottom = 14.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            words.forEachIndexed { i, word ->
                val marked = i == 1 && looked
                Text(
                    word, Modifier.clip(RoundedCornerShape(5.dp)).background(if (marked) c.redTint else Color.Transparent).padding(horizontal = 3.dp),
                    style = LectioText.latin(24.sp), color = c.ink,
                )
            }
        }
        Column(
            Modifier.padding(top = 14.dp).alpha(reveal).offset(y = (10 * (1 - reveal)).dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.parchment).padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("vir, virī") }
                    append("  m.")
                },
                style = LectioText.latin(19.sp), color = c.ink,
            )
            Text("man; hero", style = LectioText.prose(LectioText.subheadline), color = c.ink2)
            Hairline(Modifier.padding(vertical = 2.dp), color = c.hair)
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("-que") }
                    append("  and")
                },
                style = LectioText.prose(LectioText.subheadline), color = c.ink2,
            )
        }
    }
}

/** A flashcard on top of its deck, with the two answers. */
@Composable
private fun FlashcardPreview() {
    val c = Lectio.colors
    var dealt by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(200); dealt = true }
    val spread by animateFloatAsState(if (dealt) 1f else 0f, spring(0.5f, Spring.StiffnessLow), label = "deal")
    @Composable fun card(modifier: Modifier, content: @Composable () -> Unit = {}) {
        Surface(
            modifier.size(240.dp, 190.dp), shape = RoundedCornerShape(22.dp), color = c.slip, border = BorderStroke(0.75.dp, c.ruleStrong), shadowElevation = 6.dp,
            content = { Box(contentAlignment = Alignment.Center) { content() } },
        )
    }
    Column(Modifier.fillMaxWidth().clearAndSetSemantics { contentDescription = "A flashcard: amor, amōris, love, with the answers Practice again and Got it." }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Box(Modifier.height(210.dp), contentAlignment = Alignment.Center) {
            card(Modifier.rotate(-7f * spread).offset((-10).dp, 8.dp).alpha(0.55f))
            card(Modifier.rotate(5f * spread).offset(10.dp, 4.dp).alpha(0.75f))
            card(Modifier) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("amor", style = LectioText.latin(40.sp), color = c.ink)
                    Text("amōris  m.", style = LectioText.latinItalic(18.sp), color = c.inkMuted)
                    Hairline(Modifier.width(60.dp).padding(vertical = 6.dp), color = c.redLine)
                    Text("love", style = LectioText.prose(LectioText.title3), color = c.ink2)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                Modifier.weight(1f).clip(CircleShape).background(c.slip).padding(vertical = 11.dp), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Symbol("arrow.counterclockwise", tint = c.ink, size = 18.dp)
                Text("Practice again", style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
            }
            Row(
                Modifier.weight(1f).clip(CircleShape).background(c.rubric).padding(vertical = 11.dp), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Symbol("checkmark", tint = c.onRubric, size = 18.dp)
                Text("Got it", style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.onRubric)
            }
        }
    }
}
