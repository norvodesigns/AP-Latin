package com.norvodesigns.lectio.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LocalLectioColors = staticCompositionLocalOf { LectioColors.Light }

/** Whether the app follows the system appearance, or is fixed light or dark. Device-only, as on iOS. */
enum class Appearance(val label: String) {
    System("System"), Light("Light"), Dark("Dark");

    companion object {
        fun from(raw: String?): Appearance = entries.firstOrNull { it.name.equals(raw, ignoreCase = true) } ?: System
    }
}

object Lectio {
    val colors: LectioColors
        @Composable @ReadOnlyComposable get() = LocalLectioColors.current
}

/** Whether this appearance is dark, given whether the system is. */
fun Appearance.isDark(systemDark: Boolean): Boolean = when (this) {
    Appearance.System -> systemDark
    Appearance.Light -> false
    Appearance.Dark -> true
}

@Composable
fun LectioTheme(appearance: Appearance = Appearance.System, content: @Composable () -> Unit) {
    val dark = appearance.isDark(isSystemInDarkTheme())
    val colors = if (dark) LectioColors.Dark else LectioColors.Light
    CompositionLocalProvider(LocalLectioColors provides colors) {
        MaterialTheme(colorScheme = colors.toMaterial(), typography = materialTypography(), content = content)
    }
}
