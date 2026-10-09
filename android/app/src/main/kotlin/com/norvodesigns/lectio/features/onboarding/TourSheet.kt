package com.norvodesigns.lectio.features.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.ambient
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.launch

/** The first run's tour on its own, from Settings › Take the tour again. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TourSheet(model: AppModel, onClose: () -> Unit) {
    val state = rememberPagerState { TOUR_PAGES }
    val scope = rememberCoroutineScope()
    CoverScaffold(onClose, Modifier.ambient()) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Box(Modifier.weight(1f).fillMaxWidth()) { TourPages(state, model) }
            Column(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 24.dp, vertical = 12.dp).widthIn(max = 480.dp).align(Alignment.CenterHorizontally),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                PageDots(TOUR_PAGES, state.currentPage)
                LectioButton(
                    { if (state.currentPage < TOUR_PAGES - 1) scope.launch { state.animateScrollToPage(state.currentPage + 1) } else onClose() },
                    Modifier.fillMaxWidth(), prominent = true,
                ) { ButtonLabel(if (state.currentPage < TOUR_PAGES - 1) "Continue" else "Done", style = LectioText.headline) }
            }
        }
    }
}
