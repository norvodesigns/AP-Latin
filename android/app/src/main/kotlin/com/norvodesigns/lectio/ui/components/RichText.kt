package com.norvodesigns.lectio.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle

/**
 * The course's markup (src/data/curriculum/types.ts) as an [AnnotatedString]:
 * `*word*` italic, `**word**` bold, and with `endings`, `puell|ae` sets the
 * ending after the bar in rubric red. The bar never shows.
 */
object Rich {
    fun annotated(text: String, endings: Boolean = false, endingColor: Color = Color.Unspecified): AnnotatedString = buildAnnotatedString {
        var rest = text
        while (rest.isNotEmpty()) {
            val boldEnd = if (rest.startsWith("**")) rest.indexOf("**", 2).takeIf { it >= 0 } else null
            val italicEnd = if (boldEnd == null && rest.startsWith("*")) rest.indexOf('*', 1).takeIf { it >= 0 } else null
            when {
                boldEnd != null -> {
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { run(rest.substring(2, boldEnd), endings, endingColor) }
                    rest = rest.substring(boldEnd + 2)
                }
                italicEnd != null -> {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { run(rest.substring(1, italicEnd), endings, endingColor) }
                    rest = rest.substring(italicEnd + 1)
                }
                else -> {
                    val next = rest.indexOf('*', 1).takeIf { it >= 0 } ?: rest.length
                    run(rest.substring(0, next), endings, endingColor)
                    rest = rest.substring(next)
                }
            }
        }
    }

    /** Plain text, with endings marked when asked. */
    private fun AnnotatedString.Builder.run(text: String, endings: Boolean, endingColor: Color) {
        if ('|' !in text) {
            append(text)
            return
        }
        if (!endings) {
            append(text.replace("|", ""))
            return
        }
        var rest = text
        while (true) {
            val bar = rest.indexOf('|')
            if (bar < 0) break
            append(rest.substring(0, bar))
            val afterBar = bar + 1
            var end = afterBar
            while (end < rest.length && rest[end].isLetter()) end++
            withStyle(SpanStyle(color = endingColor)) { append(rest.substring(afterBar, end)) }
            rest = rest.substring(end)
        }
        append(rest)
    }

    /** The text with its markup removed, for accessibility labels and plain surfaces. */
    fun plain(text: String): String = text.replace("**", "").replace("*", "").replace("|", "")
}

/** Text in the course's markup. */
@androidx.compose.runtime.Composable
fun RichText(
    text: String,
    modifier: androidx.compose.ui.Modifier = androidx.compose.ui.Modifier,
    style: androidx.compose.ui.text.TextStyle = com.norvodesigns.lectio.ui.theme.LectioText.body,
    color: Color = com.norvodesigns.lectio.ui.theme.Lectio.colors.ink,
    endings: Boolean = false,
    maxLines: Int = Int.MAX_VALUE,
    textAlign: androidx.compose.ui.text.style.TextAlign? = null,
) {
    val rubric = com.norvodesigns.lectio.ui.theme.Lectio.colors.rubric
    val annotated = androidx.compose.runtime.remember(text, endings, rubric) { Rich.annotated(text, endings, rubric) }
    androidx.compose.material3.Text(annotated, modifier, style = style, color = color, maxLines = maxLines, textAlign = textAlign)
}
