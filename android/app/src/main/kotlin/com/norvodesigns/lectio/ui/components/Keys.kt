package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isAltPressed
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type

/** The keys a screen's inner parts have asked for (the current exercise's options), newest first. */
class KeyShortcuts internal constructor() {
    internal val handlers = mutableListOf<(Key) -> Boolean>()

    internal fun dispatch(key: Key): Boolean = handlers.asReversed().any { it(key) }
}

val LocalKeyShortcuts = staticCompositionLocalOf<KeyShortcuts?> { null }

/**
 * Hardware-keyboard keys for a screen, on a tablet's or a Chromebook's
 * keyboard: the iOS app's keyboard shortcuts. The screen takes the focus so
 * the keys reach it, again whenever [refocusOn] changes (a step that had a
 * text field focused has gone). A key typed into a text field stays in the
 * field; anything else is offered to the parts registered with [KeyShortcut],
 * then to [onKey]. Only plain keys: Ctrl and the like are left to the app.
 */
@Composable
fun KeyShortcutHost(modifier: Modifier = Modifier, refocusOn: Any? = null, onKey: (Key) -> Boolean = { false }, content: @Composable () -> Unit) {
    val registry = remember { KeyShortcuts() }
    val focus = remember { FocusRequester() }
    val handler by rememberUpdatedState(onKey)
    LaunchedEffect(refocusOn) { runCatching { focus.requestFocus() } }
    Box(
        modifier.focusRequester(focus).focusable().onKeyEvent { e ->
            e.type == KeyEventType.KeyDown && !e.isCtrlPressed && !e.isAltPressed && !e.isMetaPressed &&
                (registry.dispatch(e.key) || handler(e.key))
        },
    ) {
        CompositionLocalProvider(LocalKeyShortcuts provides registry, content = content)
    }
}

/** Keys an inner part of the screen answers, for as long as it's on screen. */
@Composable
fun KeyShortcut(onKey: (Key) -> Boolean) {
    val registry = LocalKeyShortcuts.current ?: return
    val current by rememberUpdatedState(onKey)
    DisposableEffect(registry) {
        val h: (Key) -> Boolean = { current(it) }
        registry.handlers.add(h)
        onDispose { registry.handlers.remove(h) }
    }
}

/** 1 to 9 on the number row or the keypad as 0 to 8, else null: the options of a question. */
fun Key.optionIndex(): Int? = when (this) {
    Key.One, Key.NumPad1 -> 0
    Key.Two, Key.NumPad2 -> 1
    Key.Three, Key.NumPad3 -> 2
    Key.Four, Key.NumPad4 -> 3
    Key.Five, Key.NumPad5 -> 4
    Key.Six, Key.NumPad6 -> 5
    Key.Seven, Key.NumPad7 -> 6
    Key.Eight, Key.NumPad8 -> 7
    Key.Nine, Key.NumPad9 -> 8
    else -> null
}

/** Return, on either side of the keyboard. */
val Key.isEnter: Boolean get() = this == Key.Enter || this == Key.NumPadEnter
