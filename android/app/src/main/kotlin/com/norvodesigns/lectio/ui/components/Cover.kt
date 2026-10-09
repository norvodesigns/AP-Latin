package com.norvodesigns.lectio.ui.components

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextOverflow
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * A full-screen page that opens over the whole app (a flashcard session, a quiz):
 * the iOS full-screen cover. Closed with the X or the system Back.
 */
@Composable
fun CoverScaffold(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "",
    closeLabel: String = "Close",
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    val c = Lectio.colors
    BackHandler(onBack = onClose)
    Scaffold(
        // Swallow touches so the page underneath never sees them.
        modifier = modifier.fillMaxSize().background(c.parchment).pointerInput(Unit) {},
        containerColor = Color.Transparent,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(title, style = LectioText.prose(LectioText.headline), color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { IconButton(onClose) { Symbol("xmark", tint = c.ink, contentDescription = closeLabel) } },
                actions = actions,
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent),
            )
        },
        content = content,
    )
}
