package com.norvodesigns.lectio.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * "Rubrica": the website's manuscript palette (src/app/globals.css), with a
 * light and a dark value each, the same ones the iOS app's asset catalog holds.
 *
 * The design rule carried over from the web: the page is parchment and ink
 * with hairline rules and red rubrication, and never boxes the Latin in. On
 * Android the controls that float above the page are plain Material surfaces
 * in the page's own colours; there is no glass.
 */
@Immutable
class LectioColors(
    val isDark: Boolean,
    val parchment: Color,
    /** A slip laid on the page: flashcards, glossary. */
    val slip: Color,
    val sunk: Color,
    val ink: Color,
    val ink2: Color,
    val inkMuted: Color,
    val inkFaint: Color,
    val rule: Color,
    val ruleStrong: Color,
    val hair: Color,
    /** Rubrication red: the one accent. */
    val rubric: Color,
    val redLine: Color,
    /** A word marked under the reader's finger. */
    val redTint: Color,
    val gilt: Color,
    /** The other two pigments of the manuscript: a blue and a green. */
    val woad: Color,
    val verdigris: Color,
    val correct: Color,
    val correctWash: Color,
    val partial: Color,
    val partialWash: Color,
    val incorrect: Color,
    val incorrectWash: Color,
    val washRubric: Color,
    val washGilt: Color,
    val washVerdigris: Color,
    val washWoad: Color,
) {
    /** Text on a rubric fill: the page colour, so it's light on the deep red of light mode and dark on the brighter red of dark mode. */
    val onRubric: Color get() = parchment

    fun toMaterial(): ColorScheme {
        val base = if (isDark) darkColorScheme() else lightColorScheme()
        return base.copy(
            primary = rubric, onPrimary = parchment,
            primaryContainer = redTint, onPrimaryContainer = rubric,
            secondary = ink2, onSecondary = parchment,
            secondaryContainer = sunk, onSecondaryContainer = ink,
            tertiary = gilt, onTertiary = parchment,
            background = parchment, onBackground = ink,
            surface = parchment, onSurface = ink,
            surfaceVariant = slip, onSurfaceVariant = inkMuted,
            surfaceContainerLowest = parchment, surfaceContainerLow = parchment,
            surfaceContainer = slip, surfaceContainerHigh = slip, surfaceContainerHighest = sunk,
            surfaceTint = rubric,
            outline = ruleStrong, outlineVariant = rule,
            error = incorrect, onError = parchment,
            errorContainer = incorrectWash, onErrorContainer = incorrect,
            scrim = Color.Black,
        )
    }

    companion object {
        val Light = LectioColors(
            isDark = false,
            parchment = Color(0xFFF6F1E6), slip = Color(0xFFFDFBF4), sunk = Color(0xFFEFE8D9),
            ink = Color(0xFF221F1A), ink2 = Color(0xFF4A443A), inkMuted = Color(0xFF6D6455), inkFaint = Color(0xFF73664B),
            rule = Color(0xFFDDD3BD), ruleStrong = Color(0xFFC9B998), hair = Color(0xFFE3D9C2),
            rubric = Color(0xFF9D2F24), redLine = Color(0xFFE3CFC9), redTint = Color(0xFFF3E3D8),
            gilt = Color(0xFF8A6D24), woad = Color(0xFF3F6A94), verdigris = Color(0xFF3F8A6D),
            correct = Color(0xFF4A6B3F), correctWash = Color(0xFFEAEFE2),
            partial = Color(0xFF8A6D24), partialWash = Color(0xFFF5EED9),
            incorrect = Color(0xFF9D2F24), incorrectWash = Color(0xFFF3E3D8),
            washRubric = Color(0xFFDDBBB0), washGilt = Color(0xFFD0C3A2), washVerdigris = Color(0xFFB0C3B4), washWoad = Color(0xFFB0BAC0),
        )

        val Dark = LectioColors(
            isDark = true,
            parchment = Color(0xFF17140F), slip = Color(0xFF1E1A14), sunk = Color(0xFF120F0B),
            ink = Color(0xFFEFE7D5), ink2 = Color(0xFFCFC5B0), inkMuted = Color(0xFFA2967F), inkFaint = Color(0xFF958A74),
            rule = Color(0xFF3A3229), ruleStrong = Color(0xFF4C4235), hair = Color(0xFF3A3229),
            rubric = Color(0xFFE0796A), redLine = Color(0xFF5A3A33), redTint = Color(0xFF38241F),
            gilt = Color(0xFFCFA94D), woad = Color(0xFF3F6A94), verdigris = Color(0xFF3F8A6D),
            correct = Color(0xFF9DBF8F), correctWash = Color(0xFF1F2A1B),
            partial = Color(0xFFCFA94D), partialWash = Color(0xFF2B2416),
            incorrect = Color(0xFFE0796A), incorrectWash = Color(0xFF38241F),
            washRubric = Color(0xFF4F3028), washGilt = Color(0xFF574825), washVerdigris = Color(0xFF1F3428), washWoad = Color(0xFF1F2A34),
        )
    }
}
