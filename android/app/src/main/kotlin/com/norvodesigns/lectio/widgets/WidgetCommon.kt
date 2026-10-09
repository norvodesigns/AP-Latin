package com.norvodesigns.lectio.widgets

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.action.Action
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.SizeMode
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontFamily
import androidx.glance.text.FontStyle
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.MainActivity
import com.norvodesigns.lectio.core.WidgetSnapshot

/** The app's parchment and rubric, restated for the widget process (light, dark). */
object WidgetPalette {
    val parchment = ColorProvider(day = Color(0xFFF6F1E6), night = Color(0xFF17140F))
    val ink = ColorProvider(day = Color(0xFF221F1A), night = Color(0xFFEFE7D5))
    val muted = ColorProvider(day = Color(0xFF6D6455), night = Color(0xFFA2967F))
    val rubric = ColorProvider(day = Color(0xFF9D2F24), night = Color(0xFFE0796A))
}

internal val Small = DpSize(110.dp, 110.dp)
internal val Medium = DpSize(250.dp, 110.dp)
internal val sizes = SizeMode.Responsive(setOf(Small, Medium))

internal fun serif(size: TextUnit, color: ColorProvider = WidgetPalette.ink, weight: FontWeight = FontWeight.Normal, italic: Boolean = false) =
    TextStyle(color = color, fontSize = size, fontWeight = weight, fontFamily = FontFamily.Serif, fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal)

internal fun label(color: ColorProvider = WidgetPalette.rubric) = TextStyle(color = color, fontSize = 9.sp, fontWeight = FontWeight.Bold)

/** Opens the app on a lectio:// link: the same ones the iOS widgets use. */
internal fun open(context: Context, link: String): Action =
    actionStartActivity(Intent(Intent.ACTION_VIEW, link.toUri(), context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP))

internal fun GlanceModifier.card(): GlanceModifier = this.fillMaxSize().background(WidgetPalette.parchment).padding(14.dp)

internal fun snapshotOrPlaceholder(context: Context): WidgetSnapshot = WidgetBridge.load(context) ?: WidgetSnapshot.placeholder
