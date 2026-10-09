package com.norvodesigns.lectio.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = WatchStore.get(this)
        setContent { WatchApp(store) }
    }
}
