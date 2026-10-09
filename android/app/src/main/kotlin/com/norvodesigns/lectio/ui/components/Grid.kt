package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Items laid out row by row in as many columns as fit [minColumnWidth], each row aligned to the top: a lazy grid without the lazy part. */
@Composable
fun AdaptiveGrid(
    items: List<@Composable () -> Unit>,
    modifier: Modifier = Modifier,
    minColumnWidth: Dp = 320.dp,
    spacing: Dp = 14.dp,
    maxColumns: Int = 4,
) {
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val columns = ((maxWidth + spacing) / (minColumnWidth + spacing)).toInt().coerceIn(1, maxColumns)
        FixedGrid(columns, items, Modifier, spacing, spacing)
    }
}

@Composable
fun FixedGrid(
    columns: Int,
    items: List<@Composable () -> Unit>,
    modifier: Modifier = Modifier,
    horizontalSpacing: Dp = 14.dp,
    verticalSpacing: Dp = 14.dp,
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(verticalSpacing)) {
        items.chunked(columns).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(horizontalSpacing), verticalAlignment = Alignment.Top) {
                row.forEach { item -> Column(Modifier.weight(1f)) { item() } }
                repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}
