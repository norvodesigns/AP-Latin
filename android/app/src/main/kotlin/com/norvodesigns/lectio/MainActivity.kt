package com.norvodesigns.lectio

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : ComponentActivity() {
    private val model: AppModel get() = (application as LectioApplication).model

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { LectioRoot(model) }
        handle(intent)
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
}
