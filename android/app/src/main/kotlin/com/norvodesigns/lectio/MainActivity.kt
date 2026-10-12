package com.norvodesigns.lectio

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.KeyboardShortcutGroup
import android.view.KeyboardShortcutInfo
import android.view.Menu
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.DisposableEffect
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.norvodesigns.lectio.ui.theme.isDark

class MainActivity : ComponentActivity() {
    private val model: AppModel get() = (application as LectioApplication).model

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            // The clock and battery follow the app's own appearance (Settings > Appearance), not just the system's,
            // and change with it, as iOS's preferredColorScheme does for the whole window.
            val dark = model.appearance.isDark(isSystemInDarkTheme())
            DisposableEffect(dark) {
                enableEdgeToEdge(
                    statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT) { dark },
                    navigationBarStyle = SystemBarStyle.auto(LIGHT_SCRIM, DARK_SCRIM) { dark },
                )
                onDispose {}
            }
            LectioRoot(model)
        }
        // A link is handled once, when it arrives: not again when the activity is recreated, or reopened from Recents.
        val fromHistory = intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0
        if (savedInstanceState == null && !fromHistory) handle(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handle(intent)
    }

    /** Ctrl and a number goes straight to a section, as ⌘ and a number does on an iPad (the website's g-then-letter jumps). */
    override fun onKeyShortcut(keyCode: Int, event: KeyEvent): Boolean {
        val jump = GO.firstOrNull { it.keyCode == keyCode && it.shift == event.isShiftPressed }
        if (jump == null || !event.isCtrlPressed || model.contentState !is ContentState.Ready) return super.onKeyShortcut(keyCode, event)
        model.selectedTab = jump.tab
        return true
    }

    /** What the system's keyboard shortcuts list (Meta + /) shows. */
    override fun onProvideKeyboardShortcuts(data: MutableList<KeyboardShortcutGroup>, menu: Menu?, deviceId: Int) {
        val items = GO.map { KeyboardShortcutInfo(it.title, it.keyCode, KeyEvent.META_CTRL_ON or if (it.shift) KeyEvent.META_SHIFT_ON else 0) }
        data.add(KeyboardShortcutGroup("Go", items))
    }

    /** A lectio:// link from an email, a widget, a notification or a shortcut. */
    private fun handle(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "lectio") model.handleLink(data.toString())
    }

    private class Jump(val title: String, val tab: AppTab, val keyCode: Int, val shift: Boolean = false)

    private companion object {
        // The iOS app's Go menu, key for key.
        val GO = listOf(
            Jump("Today", AppTab.Today, KeyEvent.KEYCODE_1),
            Jump("Course", AppTab.Learn, KeyEvent.KEYCODE_0),
            Jump("Reading Room", AppTab.Read, KeyEvent.KEYCODE_2),
            Jump("Vocabulary", AppTab.Vocab, KeyEvent.KEYCODE_3),
            Jump("Quiz Engine", AppTab.Quiz, KeyEvent.KEYCODE_4),
            Jump("Translate", AppTab.Translate, KeyEvent.KEYCODE_5),
            Jump("Scansion Lab", AppTab.Scansion, KeyEvent.KEYCODE_6),
            Jump("Forms Forge", AppTab.Forge, KeyEvent.KEYCODE_M, shift = true),
            Jump("Grammar & Syntax", AppTab.Grammar, KeyEvent.KEYCODE_7),
            Jump("FRQ Workshop", AppTab.Frq, KeyEvent.KEYCODE_8),
            Jump("Practice Exam", AppTab.Exam, KeyEvent.KEYCODE_9),
            Jump("Search", AppTab.Search, KeyEvent.KEYCODE_F),
            Jump("Settings", AppTab.Settings, KeyEvent.KEYCODE_COMMA),
        )

        // The scrims enableEdgeToEdge uses by default behind three-button navigation.
        val LIGHT_SCRIM = Color.argb(0xe6, 0xFF, 0xFF, 0xFF)
        val DARK_SCRIM = Color.argb(0x80, 0x1b, 0x1b, 0x1b)
    }
}
