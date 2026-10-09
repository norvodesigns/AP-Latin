package com.norvodesigns.lectio.features

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

@Composable
fun ComingSoon(title: String) {
    PageScaffold(title) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            Text(title, style = LectioText.title2, color = Lectio.colors.inkMuted)
        }
    }
}

