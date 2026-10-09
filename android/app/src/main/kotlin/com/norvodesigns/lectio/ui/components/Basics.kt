package com.norvodesigns.lectio.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.util.Locale

/** A hairline rule: the page's only way of separating things. */
@Composable
fun Hairline(modifier: Modifier = Modifier, color: Color = Lectio.colors.rule) {
    Box(modifier.fillMaxWidth().height(0.75.dp).background(color))
}

/** Small, uppercase, widely tracked rubric-red label: the web's section headings, which stay quiet so the Latin is always the largest thing. */
@Composable
fun RubricLabel(text: String, modifier: Modifier = Modifier, color: Color = Lectio.colors.rubric) {
    Text(text.uppercase(Locale.getDefault()), modifier, color = color, style = LectioText.rubricLabel)
}

/** The same treatment in ink, for secondary labels. */
@Composable
fun QuietLabel(text: String, modifier: Modifier = Modifier, color: Color = Lectio.colors.inkMuted) {
    Text(text.uppercase(Locale.getDefault()), modifier, color = color, style = LectioText.quietLabel)
}

/** A figure with a quiet caption under it, set in the serif: the dashboard's countdown and streak numbers. */
@Composable
fun Figure(value: String, caption: String, modifier: Modifier = Modifier, tint: Color = Lectio.colors.ink) {
    Column(modifier.semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(value, style = LectioText.figure(), color = tint)
        QuietLabel(caption)
    }
}

/** Figures side by side. */
@Composable
fun FigureRow(modifier: Modifier = Modifier, spacing: Dp = 32.dp, content: @Composable RowScope.() -> Unit) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing), verticalAlignment = Alignment.Top, content = content)
}

/** A label with a note at the far end. */
@Composable
fun LabelRow(modifier: Modifier = Modifier, leading: @Composable () -> Unit, trailing: @Composable () -> Unit = {}) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f, fill = false)) { leading() }
        Spacer(Modifier.size(8.dp))
        trailing()
    }
}

/** Parchment with a faint wash of the manuscript's pigments (rubric, gilt, woad) behind it: the screens made of panels. */
fun Modifier.ambientBackground(colors: LectioColorsRef): Modifier = this.drawBehind {
    drawRect(colors.parchment)
    val w = size.width
    val h = size.height
    drawRect(Brush.radialGradient(listOf(colors.rubric.copy(alpha = 0.14f), Color.Transparent), center = Offset(w, 0f), radius = 480.dp.toPx()))
    drawRect(Brush.radialGradient(listOf(colors.gilt.copy(alpha = 0.16f), Color.Transparent), center = Offset(0f, h * 0.35f), radius = 520.dp.toPx()))
    drawRect(Brush.radialGradient(listOf(colors.woad.copy(alpha = 0.11f), Color.Transparent), center = Offset(w, h), radius = 560.dp.toPx()))
}

class LectioColorsRef(val parchment: Color, val rubric: Color, val gilt: Color, val woad: Color)

@Composable
fun Modifier.ambient(): Modifier {
    val c = Lectio.colors
    val ref = remember(c) { LectioColorsRef(c.parchment, c.rubric, c.gilt, c.woad) }
    return ambientBackground(ref)
}

/** Parchment behind a screen. */
@Composable
fun Modifier.page(): Modifier = background(Lectio.colors.parchment)

/** Keeps a page to a readable column on a wide screen. A phone is narrower than the column, so it's unaffected. */
fun Modifier.readableColumn(width: Dp = 760.dp): Modifier = this.widthIn(max = width)

/**
 * A labelled panel: the dashboard's unit. The label is the small rubric
 * heading the whole app uses, with an optional quiet note at the far end.
 * On iOS this is a pane of Liquid Glass; here it is a slip of the page's own
 * colour with a hairline edge.
 */
@Composable
fun Panel(
    modifier: Modifier = Modifier,
    title: String? = null,
    trailing: String? = null,
    padding: PaddingValues = PaddingValues(18.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = Lectio.colors
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        color = c.slip.copy(alpha = if (c.isDark) 0.92f else 0.88f),
        border = BorderStroke(0.75.dp, c.rule),
        shadowElevation = 0.dp,
    ) {
        Column(Modifier.padding(padding), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (title != null) {
                LabelRow(leading = { RubricLabel(title) }, trailing = { if (trailing != null) QuietLabel(trailing) })
            }
            content()
        }
    }
}

/** A flat slip on the page (flashcards, the glossary). */
@Composable
fun Slip(modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(22.dp), content: @Composable () -> Unit) {
    val c = Lectio.colors
    Surface(modifier, shape = shape, color = c.slip, border = BorderStroke(0.75.dp, c.rule), shadowElevation = 3.dp, content = content)
}

/** A primary (filled rubric) or secondary (outlined) button with the label inside. */
@Composable
fun LectioButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    prominent: Boolean = false,
    enabled: Boolean = true,
    tint: Color = Lectio.colors.rubric,
    content: @Composable RowScope.() -> Unit,
) {
    val c = Lectio.colors
    val shape = RoundedCornerShape(50)
    val padding = PaddingValues(horizontal = 14.dp, vertical = 11.dp)
    if (prominent) {
        Button(
            onClick, modifier.heightIn(min = 48.dp), enabled = enabled, shape = shape, contentPadding = padding,
            colors = ButtonDefaults.buttonColors(containerColor = tint, contentColor = c.onRubric, disabledContainerColor = c.ruleStrong, disabledContentColor = c.inkMuted),
            elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp, 0.dp, 0.dp),
            content = { ProvideButtonText { content() } },
        )
    } else {
        OutlinedButton(
            onClick, modifier.heightIn(min = 48.dp), enabled = enabled, shape = shape, contentPadding = padding,
            border = BorderStroke(1.dp, if (enabled) tint.copy(alpha = 0.55f) else c.rule),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = c.slip.copy(alpha = 0.6f), contentColor = tint, disabledContentColor = c.inkFaint),
            content = { ProvideButtonText { content() } },
        )
    }
}

@Composable
private fun RowScope.ProvideButtonText(content: @Composable RowScope.() -> Unit) {
    Row(Modifier, horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) { content() }
}

/** A label with an optional leading icon, for [LectioButton]. */
@Composable
fun ButtonLabel(text: String, icon: String? = null, style: TextStyle = LectioText.subheadline.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)) {
    if (icon != null) Symbol(icon, size = 20.dp)
    Text(text, style = style, maxLines = 2, overflow = TextOverflow.Ellipsis)
}

/** A text-only action, in rubric. */
@Composable
fun TextAction(text: String, modifier: Modifier = Modifier, icon: String? = null, enabled: Boolean = true, tint: Color = Lectio.colors.rubric, onClick: () -> Unit) {
    Row(
        modifier.clip(RoundedCornerShape(10.dp)).clickable(enabled = enabled, role = Role.Button, onClick = onClick).heightIn(min = 40.dp).padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) Symbol(icon, tint = if (enabled) tint else Lectio.colors.inkFaint, size = 18.dp)
        Text(text, style = LectioText.subheadline.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium), color = if (enabled) tint else Lectio.colors.inkFaint)
    }
}

/** A circle holding a symbol, tinted: the icon of a list row or a tile. */
@Composable
fun IconBadge(symbol: String, tint: Color, modifier: Modifier = Modifier, size: Dp = 44.dp, background: Color = tint.copy(alpha = 0.15f)) {
    Box(modifier.size(size).clip(CircleShape).background(background), contentAlignment = Alignment.Center) {
        Symbol(symbol, tint = tint, size = size * 0.5f)
    }
}

/** A thin progress bar. */
@Composable
fun LectioProgress(fraction: Float, modifier: Modifier = Modifier, tint: Color = Lectio.colors.rubric, track: Color = Lectio.colors.ruleStrong.copy(alpha = 0.45f), height: Dp = 6.dp) {
    val animated by animateFloatAsState(fraction.coerceIn(0f, 1f), tween(500), label = "progress")
    Box(modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(50)).background(track)) {
        Box(Modifier.fillMaxSize().drawBehind { drawRect(tint, size = Size(size.width * animated, size.height)) })
    }
}

/** Today's study time against the daily goal, as a ring. */
@Composable
fun GoalRing(seconds: Double, goalMinutes: Int, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    val fraction = if (goalMinutes > 0) minOf(1.0, seconds / (goalMinutes * 60)).toFloat() else 0f
    val animated by animateFloatAsState(fraction, tween(600), label = "ring")
    val met = fraction >= 1f
    val minutes = (seconds / 60).toInt()
    Box(
        modifier.size(96.dp).semantics(mergeDescendants = true) { contentDescription = "Today's goal: $minutes of $goalMinutes minutes studied" },
        contentAlignment = Alignment.Center,
    ) {
        val stroke = with(LocalDensity.current) { 9.dp.toPx() }
        val ruleColor = c.ruleStrong.copy(alpha = 0.45f)
        val arc = if (met) c.correct else c.rubric
        Canvas(Modifier.fillMaxSize().padding(5.dp)) {
            drawArc(ruleColor, 0f, 360f, false, style = Stroke(stroke))
            drawArc(arc, -90f, 360f * maxOf(0.004f, animated), false, style = Stroke(stroke, cap = StrokeCap.Round))
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$minutes", style = LectioText.figure(LectioText.title), color = c.ink)
            Text("of $goalMinutes min", style = LectioText.caption2, color = c.inkMuted)
        }
    }
}

@Composable
fun Chip(text: String, selected: Boolean, modifier: Modifier = Modifier, tint: Color = Lectio.colors.rubric, onClick: () -> Unit) {
    val c = Lectio.colors
    val shape = RoundedCornerShape(50)
    Surface(
        modifier.clip(shape).clickable(role = Role.Button, onClick = onClick),
        shape = shape,
        color = if (selected) tint else c.slip.copy(alpha = 0.7f),
        border = BorderStroke(0.75.dp, if (selected) tint else c.ruleStrong),
    ) {
        Text(
            text, Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            style = LectioText.subheadline.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium),
            color = if (selected) c.onRubric else c.ink2, maxLines = 1,
        )
    }
}

/** A row that opens something: title, detail and a chevron. */
@Composable
fun NextUpRow(title: String, detail: String, symbol: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = Lectio.colors
    Row(
        modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick).padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBadge(symbol, c.rubric, background = c.redTint)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = LectioText.headline, color = c.ink)
            Text(detail, style = LectioText.subheadline, color = c.inkMuted)
        }
        Symbol("chevron.right", tint = c.inkFaint, size = 20.dp)
    }
}

@Composable
fun SectionSpacer(height: Dp = 14.dp) = Spacer(Modifier.height(height))
