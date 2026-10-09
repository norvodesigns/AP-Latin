package com.norvodesigns.lectio.features.read

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.ProvidePushedBack
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * The Reading Room: every passage grouped by CED unit, required readings first
 * within each unit, supplementary ones marked as on the web. A passage opens
 * in the reader over it.
 */
@Composable
fun ReadScreen(model: AppModel) {
    val passage = model.readPassageId?.let { model.content?.passage(it) }
    if (passage != null) {
        BackHandler { model.readPassageId = null }
        androidx.compose.runtime.key(passage.id) {
            ProvidePushedBack({ model.readPassageId = null }) { PassageReader(model, passage) }
        }
    } else {
        ReadIndex(model)
    }
}

@Composable
private fun ReadIndex(model: AppModel) {
    val c = Lectio.colors
    val library = model.content
    var showSupplementary by remember { mutableStateOf(true) }
    var menu by remember { mutableStateOf(false) }
    PageScaffold(
        "Reading Room", ambient = false,
        actions = {
            Box {
                IconButton({ menu = true }) { Symbol("line.3.horizontal.decrease", tint = c.ink, contentDescription = "Filter") }
                DropdownMenu(menu, { menu = false }, containerColor = c.slip) {
                    DropdownMenuItem(
                        text = { Text(if (showSupplementary) "Hide supplementary passages" else "Show supplementary passages") },
                        onClick = {
                            showSupplementary = !showSupplementary
                            menu = false
                        },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            LazyColumn(Modifier.widthIn(max = 760.dp).fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)) {
                if (library != null) for (group in library.passagesByUnit) {
                    val passages = group.passages.filter { showSupplementary || it.required }
                        .sortedWith(compareBy({ if (it.required) 0 else 1 }, { it.citation }))
                    if (passages.isEmpty()) continue
                    item(key = "u-${group.unit}") {
                        Column(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 6.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            RubricLabel("Unit ${group.unit}")
                            Text(group.title, style = LectioText.prose(LectioText.subheadline), color = c.ink2)
                        }
                    }
                    items(passages, key = { it.id }) { passage ->
                        PassageRow(model, passage)
                    }
                }
            }
        }
    }
}

@Composable
private fun PassageRow(model: AppModel, passage: Passage) {
    val c = Lectio.colors
    val state = remember(model.progress, passage.id) { model.progress.passage(passage.id) }
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Button) { model.readPassageId = passage.id }.padding(horizontal = 20.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(passage.citation, style = LectioText.latin(19.sp), color = c.ink)
                Text(passage.title, style = LectioText.prose(LectioText.subheadline), color = c.inkMuted, maxLines = 2)
                if (!passage.required) QuietLabel("Supplementary")
            }
            if (state.bookmarked) Symbol("bookmark.fill", tint = c.rubric, size = 22.dp, contentDescription = "Bookmarked")
        }
        Hairline(Modifier.padding(horizontal = 20.dp), color = c.hair)
    }
}
