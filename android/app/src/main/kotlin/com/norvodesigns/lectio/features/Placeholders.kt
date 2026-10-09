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

@Composable fun VocabScreen(model: AppModel) = ComingSoon("Vocabulary")
@Composable fun QuizScreen(model: AppModel) = ComingSoon("Quiz Engine")
@Composable fun TranslateScreen(model: AppModel) = ComingSoon("Translate")
@Composable fun SightScreen(model: AppModel) = ComingSoon("Sight Reading")
@Composable fun ScansionScreen(model: AppModel) = ComingSoon("Scansion Lab")
@Composable fun ForgeScreen(model: AppModel) = ComingSoon("Forms Forge")
@Composable fun GrammarScreen(model: AppModel) = ComingSoon("Grammar & Syntax")
@Composable fun DevicesScreen(model: AppModel) = ComingSoon("Literary Devices")
@Composable fun ContextScreen(model: AppModel) = ComingSoon("Context & Culture")
@Composable fun FrqScreen(model: AppModel) = ComingSoon("FRQ Workshop")
@Composable fun ExamScreen(model: AppModel) = ComingSoon("Practice Exam")
@Composable fun PlanScreen(model: AppModel) = ComingSoon("Study Plan")
@Composable fun ClassroomScreen(model: AppModel) = ComingSoon("Classroom")
@Composable fun SettingsScreen(model: AppModel) = ComingSoon("Settings")
@Composable fun OnboardingScreen(model: AppModel) = ComingSoon("Welcome")
