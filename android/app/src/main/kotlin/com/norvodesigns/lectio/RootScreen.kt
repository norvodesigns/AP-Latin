package com.norvodesigns.lectio

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.core.SpacedRepetition
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.features.classroom.ClassroomScreen
import com.norvodesigns.lectio.features.reference.ContextScreen
import com.norvodesigns.lectio.features.reference.DevicesScreen
import com.norvodesigns.lectio.features.exam.ExamScreen
import com.norvodesigns.lectio.features.exam.ExamSession
import com.norvodesigns.lectio.features.forge.ForgeRoundScreen
import com.norvodesigns.lectio.features.forge.ForgeScreen
import com.norvodesigns.lectio.features.frq.FrqScreen
import com.norvodesigns.lectio.features.reference.GrammarScreen
import com.norvodesigns.lectio.features.onboarding.OnboardingScreen
import com.norvodesigns.lectio.features.onboarding.TourSheet
import com.norvodesigns.lectio.features.plan.PlanScreen
import com.norvodesigns.lectio.features.quiz.QuizScreen
import com.norvodesigns.lectio.features.quiz.QuizSessionScreen
import com.norvodesigns.lectio.features.read.ReadScreen
import com.norvodesigns.lectio.features.scansion.ScansionScreen
import com.norvodesigns.lectio.features.settings.SettingsScreen
import com.norvodesigns.lectio.features.sight.SightScreen
import com.norvodesigns.lectio.features.translate.TranslateScreen
import com.norvodesigns.lectio.features.vocab.FlashcardSession
import com.norvodesigns.lectio.features.vocab.SpeedRoundScreen
import com.norvodesigns.lectio.features.vocab.VocabScreen
import com.norvodesigns.lectio.features.laurels.LaurelsScreen
import com.norvodesigns.lectio.features.learn.CourseScreen
import com.norvodesigns.lectio.features.learn.LessonScreen
import com.norvodesigns.lectio.features.search.SearchScreen
import com.norvodesigns.lectio.features.today.TodayScreen
import com.norvodesigns.lectio.ui.components.LocalWide
import com.norvodesigns.lectio.ui.components.ProvidePushedBack
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import com.norvodesigns.lectio.ui.theme.LectioTheme
import kotlinx.coroutines.delay

/** The app's frame, and everything that opens over it. */
@Composable
fun LectioRoot(model: AppModel) {
    LectioTheme(model.appearance) {
        LaunchedEffect(Unit) { model.loadContent() }
        val c = Lectio.colors
        Box(Modifier.fillMaxSize().background(c.parchment)) {
            when (val state = model.contentState) {
                ContentState.Loading -> LaunchScreen()
                is ContentState.Failed -> ContentFailed(state.message)
                is ContentState.Ready -> Shell(model)
            }
        }
    }
}

/** Shown for the moment the content bundle takes to decode. */
@Composable
private fun LaunchScreen() {
    val c = Lectio.colors
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("Lectio", style = LectioText.wordmark(72.sp), color = c.rubric)
        CircularProgressIndicator(Modifier.padding(top = 12.dp), color = c.inkMuted, strokeWidth = 2.dp)
    }
}

@Composable
private fun ContentFailed(message: String) {
    val c = Lectio.colors
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Symbol("exclamationmark.triangle", tint = c.rubric, size = 44.dp)
        Text("Couldn't open the course", style = LectioText.prose(LectioText.title2), color = c.ink, modifier = Modifier.padding(top = 12.dp))
        Text(message, style = LectioText.subheadline, color = c.inkMuted, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun Shell(model: AppModel) {
    val wide = LocalConfiguration.current.screenWidthDp >= 720
    Box(Modifier.fillMaxSize()) {
        CompositionLocalProvider(LocalWide provides wide) {
            if (wide) WideShell(model) else PhoneShell(model)
        }
        GoalToast(model)

        // A course lesson opens over everything, from wherever it was started.
        AnimatedVisibility(
            model.activeLesson != null,
            enter = slideInVertically(tween(320)) { it / 8 } + fadeIn(tween(250)), exit = fadeOut(tween(200)),
        ) {
            val place = model.activeLesson
            if (place != null) androidx.compose.runtime.key(place.id) { LessonScreen(model, place) }
        }

        // Flashcard sessions, the speed round and quiz sessions cover the whole app, tab bar included.
        AnimatedVisibility(model.vocabSession != null, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            model.vocabSession?.let { session -> FlashcardSession(model, session) { model.vocabSession = null } }
        }
        AnimatedVisibility(model.quizSession != null, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            model.quizSession?.let { session -> QuizSessionScreen(model, session) { model.quizSession = null } }
        }
        AnimatedVisibility(model.forgeRound != null, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            model.forgeRound?.let { round -> ForgeRoundScreen(model, round) { model.forgeRound = null } }
        }
        AnimatedVisibility(model.examPaper != null, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            model.examPaper?.let { paper -> ExamSession(model, paper) { model.examPaper = null } }
        }
        AnimatedVisibility(model.speedRoundOpen, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            SpeedRoundScreen(model) { model.speedRoundOpen = false }
        }

        // The tour on its own, from Settings.
        AnimatedVisibility(model.showTour, enter = slideInVertically(tween(300)) { it / 6 } + fadeIn(tween(250)), exit = fadeOut(tween(200))) {
            TourSheet(model) { model.showTour = false }
        }

        // The first run: where the student is starting, and a goal.
        AnimatedVisibility(model.showOnboarding, enter = fadeIn(tween(300)), exit = fadeOut(tween(250))) {
            OnboardingScreen(model)
        }
    }

    model.authNotice?.let { notice ->
        AlertDialog(
            onDismissRequest = { model.authNotice = null },
            confirmButton = { TextButton({ model.authNotice = null }) { Text("OK") } },
            title = { Text("Account") }, text = { Text(notice) },
            containerColor = Lectio.colors.slip,
        )
    }
}

/* ------------------------------------------------------------------ */
/* The phone                                                            */
/* ------------------------------------------------------------------ */

private data class TabSpec(val tab: AppTab, val title: String, val symbol: String)

private fun phoneTabSpecs(model: AppModel): List<TabSpec> = listOf(
    TabSpec(AppTab.Today, "Today", "sun.horizon"),
    if (model.courseInTabBar) TabSpec(AppTab.Learn, "Course", "graduationcap") else TabSpec(AppTab.Quiz, "Quiz", "checklist"),
    TabSpec(AppTab.Read, "Read", "book.closed"),
    TabSpec(AppTab.Vocab, "Vocab", "rectangle.on.rectangle.angled"),
    TabSpec(AppTab.Search, "Search", "magnifyingglass"),
)

/**
 * On a phone it's a bottom bar with the four places a student goes every day,
 * plus search. The other sections open as pages over Today (or over Browse, if
 * that's where they were opened from), with a back button.
 */
@Composable
private fun PhoneShell(model: AppModel) {
    val c = Lectio.colors
    val specs = phoneTabSpecs(model)
    val tabs = specs.map { it.tab }
    val selected = model.selectedTab
    val pushed = selected !in tabs
    val holder = rememberSaveableStateHolder()
    val due = SpacedRepetition.due(model.vocab.values, StudyDates.today()).size

    BackHandler(enabled = pushed || selected != AppTab.Today) {
        val target = model.backTarget
        model.backTarget = null
        model.selectedTab = if (pushed) (target ?: AppTab.Today) else AppTab.Today
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            holder.SaveableStateProvider(selected.route) {
                ProvidePushedBack(if (pushed) ({ model.selectedTab = model.backTarget.also { model.backTarget = null } ?: AppTab.Today }) else null) {
                    TabContent(model, selected)
                }
            }
        }
        NavigationBar(containerColor = c.slip, contentColor = c.ink, tonalElevation = 0.dp) {
            specs.forEach { spec ->
                NavigationBarItem(
                    selected = (if (pushed) AppTab.Today else selected) == spec.tab,
                    onClick = {
                        model.backTarget = null
                        model.selectedTab = spec.tab
                    },
                    icon = {
                        if (spec.tab == AppTab.Vocab && due > 0) {
                            BadgedBox(badge = { Badge(containerColor = c.rubric, contentColor = c.onRubric) { Text(if (due > 99) "99+" else "$due") } }) { Symbol(spec.symbol) }
                        } else {
                            Symbol(spec.symbol)
                        }
                    },
                    label = { Text(spec.title, style = LectioText.caption) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = c.rubric, selectedTextColor = c.rubric, indicatorColor = c.redTint,
                        unselectedIconColor = c.inkMuted, unselectedTextColor = c.inkMuted,
                    ),
                )
            }
        }
    }
}

@Composable
private fun TabContent(model: AppModel, tab: AppTab) {
    when (tab) {
        AppTab.Today -> TodayScreen(model)
        AppTab.Learn -> CourseScreen(model)
        AppTab.Read -> ReadScreen(model)
        AppTab.Vocab -> VocabScreen(model)
        AppTab.Quiz -> QuizScreen(model)
        AppTab.Translate -> TranslateScreen(model)
        AppTab.Sight -> SightScreen(model)
        AppTab.Scansion -> ScansionScreen(model)
        AppTab.Forge -> ForgeScreen(model)
        AppTab.Grammar -> GrammarScreen(model)
        AppTab.Devices -> DevicesScreen(model)
        AppTab.Context -> ContextScreen(model)
        AppTab.Frq -> FrqScreen(model)
        AppTab.Exam -> ExamScreen(model)
        AppTab.Plan -> PlanScreen(model)
        AppTab.Classroom -> ClassroomScreen(model)
        AppTab.Settings -> SettingsScreen(model)
        AppTab.Search -> SearchScreen(model)
        AppTab.Laurels -> LaurelsScreen(model)
    }
}

/* ------------------------------------------------------------------ */
/* The tablet                                                           */
/* ------------------------------------------------------------------ */

private class SidebarRow(val tab: AppTab, val title: String, val symbol: String)

private val sidebarGroups: List<Pair<String?, List<SidebarRow>>> = listOf(
    null to listOf(
        SidebarRow(AppTab.Today, "Today", "sun.horizon"), SidebarRow(AppTab.Learn, "Course", "graduationcap"), SidebarRow(AppTab.Read, "Read", "book.closed"),
        SidebarRow(AppTab.Vocab, "Vocab", "rectangle.on.rectangle.angled"), SidebarRow(AppTab.Quiz, "Quiz", "checklist"),
    ),
    "Drill" to listOf(
        SidebarRow(AppTab.Translate, "Translate", "character.book.closed"), SidebarRow(AppTab.Sight, "Sight Reading", "eye"),
        SidebarRow(AppTab.Scansion, "Scansion", "waveform.path"), SidebarRow(AppTab.Forge, "Forms Forge", "hammer"),
    ),
    "Reference" to listOf(
        SidebarRow(AppTab.Grammar, "Grammar", "text.book.closed"), SidebarRow(AppTab.Devices, "Devices", "wand.and.stars"), SidebarRow(AppTab.Context, "Context", "building.columns"),
    ),
    "Exam" to listOf(
        SidebarRow(AppTab.Frq, "FRQ Workshop", "pencil.and.list.clipboard"), SidebarRow(AppTab.Exam, "Practice Exam", "timer"), SidebarRow(AppTab.Plan, "Study Plan", "calendar"),
    ),
    "You" to listOf(
        SidebarRow(AppTab.Laurels, "Laurels", "laurel.leading"), SidebarRow(AppTab.Classroom, "Classroom", "person.3"),
        SidebarRow(AppTab.Settings, "Settings", "gearshape"), SidebarRow(AppTab.Search, "Search", "magnifyingglass"),
    ),
)

/** A tablet gets a sidebar holding every section, grouped as the website's sidebar groups them, and the section beside it. */
@Composable
private fun WideShell(model: AppModel) {
    val c = Lectio.colors
    val selected = model.selectedTab
    val holder = rememberSaveableStateHolder()
    val due = SpacedRepetition.due(model.vocab.values, StudyDates.today()).size
    BackHandler(enabled = selected != AppTab.Today) { model.selectedTab = AppTab.Today }
    Row(Modifier.fillMaxSize()) {
        Column(Modifier.width(264.dp).fillMaxHeight().background(c.sunk).statusBarsPadding()) {
            Text("Lectio", style = LectioText.wordmark(48.sp), color = c.rubric, modifier = Modifier.padding(start = 24.dp, top = 12.dp, bottom = 8.dp))
            LazyColumn(Modifier.weight(1f), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp)) {
                sidebarGroups.forEach { (title, rows) ->
                    if (title != null) {
                        item(key = "t-$title") {
                            Text(title.uppercase(), style = LectioText.rubricLabel, color = c.rubric, modifier = Modifier.padding(start = 12.dp, top = 18.dp, bottom = 6.dp))
                        }
                    }
                    items(rows.size, key = { rows[it].tab.route }) { i ->
                        val row = rows[i]
                        val on = row.tab == selected
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (on) c.redTint else androidx.compose.ui.graphics.Color.Transparent)
                                .clickable(role = Role.Tab) { model.selectedTab = row.tab }.padding(horizontal = 12.dp, vertical = 11.dp)
                                .semantics { contentDescription = row.title },
                            horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Symbol(row.symbol, tint = if (on) c.rubric else c.inkMuted, size = 22.dp)
                            Text(row.title, Modifier.weight(1f), style = LectioText.body.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal), color = if (on) c.rubric else c.ink)
                            if (row.tab == AppTab.Vocab && due > 0) Badge(containerColor = c.rubric, contentColor = c.onRubric) { Text("$due") }
                        }
                    }
                }
            }
        }
        Box(Modifier.weight(1f).fillMaxHeight()) {
            holder.SaveableStateProvider(selected.route) { ProvidePushedBack(null) { TabContent(model, selected) } }
        }
    }
}

/** The web's DailyGoalToast: a capsule the moment today's study-time goal is first reached, gone again on its own. */
@Composable
private fun GoalToast(model: AppModel) {
    val c = Lectio.colors
    LaunchedEffect(model.goalJustReached) {
        if (model.goalJustReached) {
            delay(5000)
            model.goalJustReached = false
        }
    }
    Box(Modifier.fillMaxWidth().statusBarsPadding().padding(top = 8.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(model.goalJustReached, enter = slideInVertically { -it } + fadeIn(), exit = slideOutVertically { -it } + fadeOut()) {
            Surface(
                Modifier.clip(RoundedCornerShape(50)).clickable { model.goalJustReached = false },
                shape = RoundedCornerShape(50), color = c.slip, border = BorderStroke(0.75.dp, c.rule), shadowElevation = 8.dp,
            ) {
                Row(Modifier.padding(horizontal = 18.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Symbol("laurel.leading", tint = c.rubric, size = 22.dp)
                    Text("Today's ${model.progress.studyPlan.minutesPerDay}-minute goal reached", style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.rubric)
                }
            }
        }
    }
}
