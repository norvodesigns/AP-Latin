package com.norvodesigns.lectio.widgets

import android.content.Context
import com.norvodesigns.lectio.core.WidgetSnapshot

/** Hands the widgets what they need to draw (filled in with the widgets themselves). */
object WidgetBridge {
    fun publish(context: Context, snapshot: WidgetSnapshot) {}
}
