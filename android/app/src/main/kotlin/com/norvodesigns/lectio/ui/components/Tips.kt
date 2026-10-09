package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.LectioApplication
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * A first-visit tip, each shown once, in place, the first time a student
 * reaches the screen it explains (the iOS app's TipKit tips). Dismissing it, or
 * just using the screen, retires it.
 */
@Composable
fun FirstVisitTip(key: String, title: String, message: String, symbol: String, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    val model = (LocalContext.current.applicationContext as? LectioApplication)?.model
    var visible by remember { mutableStateOf(model != null && !model.prefs.bool(key) && !model.prefs.bool("seedDemo") && !model.prefs.bool("showOnboarding")) }
    if (!visible || model == null) return
    Surface(
        modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = c.slip, border = BorderStroke(0.75.dp, c.rule),
    ) {
        Row(Modifier.padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            Symbol(symbol, tint = c.rubric, size = 26.dp, modifier = Modifier.padding(top = 2.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
                Text(message, style = LectioText.subheadline, color = c.ink2)
            }
            IconButton(onClick = {
                model.prefs.put(key, true)
                visible = false
            }) { Symbol("xmark", tint = c.inkMuted, size = 18.dp, contentDescription = "Dismiss tip") }
        }
    }
}
