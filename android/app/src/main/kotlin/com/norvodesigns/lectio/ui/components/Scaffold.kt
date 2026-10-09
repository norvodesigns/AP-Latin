package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** Set by the shell for a section that was pushed over Today: the page's back button. Null on a tab or in the wide layout. */
val LocalPushedBack = compositionLocalOf<(() -> Unit)?> { null }

/** Whether the window is wide enough for the sidebar layout (a tablet or an unfolded foldable). */
val LocalWide = compositionLocalOf { false }

/**
 * A page of the app: a small top bar with a title (and a back button when the
 * page was pushed), then the content. [ambient] gives it the soft wash of
 * pigment behind the panels.
 */
@Composable
fun PageScaffold(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = LocalPushedBack.current,
    ambient: Boolean = true,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    val c = Lectio.colors
    Scaffold(
        modifier = modifier.then(if (ambient) Modifier.ambient() else Modifier.page()),
        containerColor = Color.Transparent,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(title, style = LectioText.prose(LectioText.headline), color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    if (onBack != null) IconButton(onClick = onBack) { Symbol("arrow.left", tint = c.ink, contentDescription = "Back") }
                },
                actions = actions,
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent, scrolledContainerColor = c.parchment.copy(alpha = 0.94f)),
            )
        },
        content = content,
    )
}

/** A scrolling column in a readable width, centred on a wide screen: the body of most pages. */
@Composable
fun ScreenColumn(
    modifier: Modifier = Modifier,
    maxWidth: androidx.compose.ui.unit.Dp = 760.dp,
    spacing: androidx.compose.ui.unit.Dp = 14.dp,
    contentPadding: PaddingValues = PaddingValues(),
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Box(modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.readableColumn(maxWidth).fillMaxWidth().padding(contentPadding).padding(start = 20.dp, end = 20.dp, bottom = 40.dp, top = 4.dp),
            verticalArrangement = Arrangement.spacedBy(spacing),
            content = content,
        )
    }
}

@Composable
fun ProvidePushedBack(back: (() -> Unit)?, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalPushedBack provides back, content = content)
}
