package com.norvodesigns.lectio

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
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

    /** A lectio:// link from an email, a widget, a notification or a shortcut. */
    private fun handle(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "lectio") model.handleLink(data.toString())
    }

    private companion object {
        // The scrims enableEdgeToEdge uses by default behind three-button navigation.
        val LIGHT_SCRIM = Color.argb(0xe6, 0xFF, 0xFF, 0xFF)
        val DARK_SCRIM = Color.argb(0x80, 0x1b, 0x1b, 0x1b)
    }
}
