package com.norvodesigns.lectio.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Immutable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.R

/**
 * Three voices, as on the web and in the iOS app: the Latin in EB Garamond
 * (bundled, OFL), prose in the system serif, and the interface in the system
 * sans. Sizes are in sp, so the whole app (the Latin included) follows the
 * reader's font-size setting.
 */
object LectioFonts {
    private fun garamond(resId: Int, weight: Int, style: FontStyle) = Font(
        resId, FontWeight(weight), style, variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
    )

    val Garamond = FontFamily(
        garamond(R.font.ebgaramond, 400, FontStyle.Normal),
        garamond(R.font.ebgaramond, 500, FontStyle.Normal),
        garamond(R.font.ebgaramond, 600, FontStyle.Normal),
        garamond(R.font.ebgaramond_italic, 400, FontStyle.Italic),
        garamond(R.font.ebgaramond_italic, 500, FontStyle.Italic),
        garamond(R.font.ebgaramond_italic, 600, FontStyle.Italic),
    )

    /** The cursive wordmark. */
    val Wordmark = FontFamily(Font(R.font.italianno))

    /** Reading prose: summaries, explanations, definitions. */
    val Prose: FontFamily = FontFamily.Serif
}

/** The text styles the screens use, named for the iOS text styles they stand in for. */
@Immutable
object LectioText {
    val largeTitle = TextStyle(fontSize = 34.sp, lineHeight = 41.sp, fontWeight = FontWeight.Normal)
    val title = TextStyle(fontSize = 28.sp, lineHeight = 34.sp, fontWeight = FontWeight.Normal)
    val title2 = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Normal)
    val title3 = TextStyle(fontSize = 20.sp, lineHeight = 25.sp, fontWeight = FontWeight.Normal)
    val headline = TextStyle(fontSize = 17.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold)
    val body = TextStyle(fontSize = 17.sp, lineHeight = 24.sp)
    val callout = TextStyle(fontSize = 16.sp, lineHeight = 22.sp)
    val subheadline = TextStyle(fontSize = 15.sp, lineHeight = 20.sp)
    val footnote = TextStyle(fontSize = 13.sp, lineHeight = 18.sp)
    val caption = TextStyle(fontSize = 12.sp, lineHeight = 16.sp)
    val caption2 = TextStyle(fontSize = 11.sp, lineHeight = 14.sp)

    /** The Latin itself. [scale] is the reader's own Latin-only size setting. */
    fun latin(size: TextUnit = 22.sp, scale: Double = 1.0): TextStyle =
        TextStyle(fontFamily = LectioFonts.Garamond, fontSize = size * scale.toFloat(), lineHeight = size * scale.toFloat() * 1.32f, fontWeight = FontWeight.Normal)

    fun latinItalic(size: TextUnit = 22.sp, scale: Double = 1.0): TextStyle =
        latin(size, scale).copy(fontStyle = FontStyle.Italic)

    fun prose(base: TextStyle = body): TextStyle = base.copy(fontFamily = LectioFonts.Prose)

    fun wordmark(size: TextUnit = 52.sp): TextStyle =
        TextStyle(fontFamily = LectioFonts.Wordmark, fontSize = size, lineHeight = size * 1.1f)

    /** Serif figures, for the dashboard's numbers. */
    fun figure(base: TextStyle = largeTitle): TextStyle =
        base.copy(fontFamily = LectioFonts.Prose, fontWeight = FontWeight.Medium, fontFeatureSettings = "tnum")

    /** Small, uppercase, widely tracked rubric-red label: the web's section headings. */
    val rubricLabel = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.4.sp)
    val quietLabel = TextStyle(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium, letterSpacing = 1.2.sp)
}

fun materialTypography(): Typography = Typography(
    displayLarge = LectioText.largeTitle, displayMedium = LectioText.largeTitle, displaySmall = LectioText.title,
    headlineLarge = LectioText.title, headlineMedium = LectioText.title2, headlineSmall = LectioText.title3,
    titleLarge = LectioText.title2, titleMedium = LectioText.headline, titleSmall = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold),
    bodyLarge = LectioText.body, bodyMedium = LectioText.subheadline, bodySmall = LectioText.footnote,
    labelLarge = LectioText.subheadline.copy(fontWeight = FontWeight.Medium), labelMedium = LectioText.caption, labelSmall = LectioText.caption2,
)
