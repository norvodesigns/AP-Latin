package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** Text set off by the rubric's red rule on its left: a quotation, a set text, the one thing to work on. */
@Composable
fun RuledBlock(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val c = Lectio.colors
    Row(modifier.height(IntrinsicSize.Min)) {
        Box(Modifier.width(2.dp).fillMaxHeight().background(c.redLine))
        Column(Modifier.padding(start = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

/** A short amber note on the page: the AI is unavailable, a request failed. */
@Composable
fun Notice(text: String, modifier: Modifier = Modifier) {
    val c = Lectio.colors
    Text(
        text, modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.partialWash).padding(12.dp),
        style = LectioText.footnote, color = c.ink2,
    )
}

/** A flat card of page-coloured slip, for content that is not a dashboard panel (a model answer, a rubric). */
@Composable
fun SlipBlock(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val c = Lectio.colors
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.slip).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp), content = content,
    )
}
