package com.norvodesigns.lectio.features.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.LearnerProfile
import com.norvodesigns.lectio.core.LessonPlace
import com.norvodesigns.lectio.core.Path
import com.norvodesigns.lectio.core.Placement
import com.norvodesigns.lectio.core.PlacementQuestion
import com.norvodesigns.lectio.core.StudyDates
import com.norvodesigns.lectio.features.account.AccountScreen
import com.norvodesigns.lectio.features.learn.PlacementCard
import com.norvodesigns.lectio.notifications.rememberNotificationPermission
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.Rich
import com.norvodesigns.lectio.ui.components.RichText
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.components.ambient
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import java.time.Instant
import kotlinx.coroutines.launch

enum class Step { Welcome, Tour, Track, Check, Grammar, Vocab, Path, PickUnit, Goal, Reminder, Account, Ready }

private val Step.isSetup get() = this != Step.Welcome && this != Step.Tour && this != Step.Track
private val Step.growsDown get() = this == Step.Grammar || this == Step.Vocab || this == Step.PickUnit

private val goals = listOf(
    Triple(10, "Light", "A lesson or your cards"),
    Triple(20, "Steady", "A lesson and your cards"),
    Triple(30, "Serious", "Add some reading"),
    Triple(45, "Exam season", "The full workout"),
)

/** Everything the student has answered so far, and where they are. */
@Stable
private class Flow(val model: AppModel, launch: Step) {
    var step by mutableStateOf(launch)
    val history = mutableStateListOf<Step>()
    var forward by mutableStateOf(true)
    var track by mutableStateOf<String?>(if (launch.isSetup) "some" else null)
    var start by mutableStateOf<String?>(null)
    val grammar = mutableStateListOf<Placement.Answer>()
    val vocabulary = mutableStateListOf<Placement.Answer>()
    var afterPick by mutableStateOf(Step.Goal)
    var minutes by mutableIntStateOf(20)
    var reminderMinutes by mutableIntStateOf(16 * 60)
    var reminderOn by mutableStateOf(false)
    var showAccount by mutableStateOf(false)
    var signUp by mutableStateOf(true)
    var returning by mutableStateOf(false)

    val library get() = model.content
    val placement: List<PlacementQuestion> get() = library?.course?.placement ?: emptyList()
    val vocabPlacement: List<PlacementQuestion> get() = library?.course?.vocabPlacement ?: emptyList()
    val chosenTrack: String get() = track ?: "some"

    fun go(next: Step) {
        history.add(step)
        forward = true
        step = next
    }

    /** Back to the step before, past the questions of a check (which start again from its intro). */
    fun back() {
        var previous: Step? = null
        while (history.isNotEmpty()) {
            val last = history.removeAt(history.lastIndex)
            if (last == Step.Grammar || last == Step.Vocab) continue
            previous = last
            break
        }
        previous ?: return
        if (previous == Step.Check) {
            grammar.clear()
            vocabulary.clear()
        }
        forward = false
        step = previous
    }

    val canGoBack get() = history.isNotEmpty() && step != Step.Ready && step != Step.Grammar && step != Step.Vocab
    val showsSkip get() = step != Step.Welcome && step != Step.Ready

    /** Where the grammar starts: the chosen or placed lesson, else the first. */
    val startPlace: LessonPlace?
        get() {
            val course = library?.course ?: return null
            return start?.let { course.place(it) } ?: course.grammarLessons.firstOrNull()
        }

    val grammarSummary: String
        get() {
            if (chosenTrack == "ap") return "The AP texts, with the course there for review"
            if (grammar.isNotEmpty() && start == null) return "You knew every unit the check asked about: start with the AP texts"
            val place = startPlace ?: return "The beginning"
            return "${place.level.title}, Unit ${place.unit.n}: ${Rich.plain(place.unit.title)}"
        }

    val pathDetail: String
        get() = when {
            chosenTrack == "ap" -> "Vergil and Pliny first. The words you know are set to be tested out of."
            grammar.isEmpty() -> "The units before it stay open, for review whenever you like."
            else -> "The units before your start stay open, for review whenever you like."
        }

    val vocabSummary: String
        get() {
            val units = library?.course?.vocabLevel?.units ?: emptyList()
            val known = Path.knownVocabUnits(vocabulary.toList()).size
            if (vocabulary.isEmpty() || known == 0) return "The AP list from the start: ${units.firstOrNull()?.let { Rich.plain(it.title) } ?: "A"}"
            return "$known of ${units.size} parts to test out of; the rest, lesson by lesson"
        }

    val startSymbol get() = when (chosenTrack) { "ap" -> "book.closed"; "teacher" -> "person.2"; else -> "text.book.closed" }
    val startSummary get() = when (chosenTrack) {
        "ap" -> "Vergil and Pliny, with the quiz and practice exams"
        "teacher" -> "Your classroom: create it on the website, then follow it here"
        else -> grammarSummary
    }
    val readyDetail get() = when (chosenTrack) {
        "new" -> "Your first lesson takes about ten minutes. Everything else is a tap away."
        "some" -> "Your first lesson is ready. Everything else is a tap away."
        "ap" -> "Today shows what’s due each day. Everything else is a tap away."
        else -> "Everything a student sees, you can try too."
    }
    val readyAction get() = when (chosenTrack) { "new", "some" -> "Start my first lesson"; "ap" -> "Go to Today"; else -> "Open Classroom" }

    /** The setup's progress: the track, the check (when there is one), the goal, the reminder and the account. Null on the welcome and the tour. */
    val progress: Pair<Int, Int>?
        get() {
            val withCheck = track == null || track == "some" || track == "ap"
            val count = if (withCheck) 5 else 4
            val index = when (step) {
                Step.Welcome, Step.Tour -> return null
                Step.Track -> 0
                Step.Check, Step.Grammar, Step.Vocab, Step.Path, Step.PickUnit -> 1
                Step.Goal -> if (withCheck) 2 else 1
                Step.Reminder -> if (withCheck) 3 else 2
                Step.Account -> if (withCheck) 4 else 3
                Step.Ready -> count
            }
            return count to index
        }

    fun afterTrack() {
        when (chosenTrack) {
            "new" -> { start = library?.course?.grammarLessons?.firstOrNull()?.lesson?.id; go(Step.Goal) }
            "some" -> { start = null; go(if (placement.isEmpty() && vocabPlacement.isEmpty()) Step.Goal else Step.Check) }
            "ap" -> { start = null; go(if (vocabPlacement.isEmpty()) Step.Goal else Step.Check) }
            else -> { start = null; go(Step.Goal) }
        }
    }

    /** The grammar half is over: where it says to start, then the words. */
    fun settleGrammar(skippingWords: Boolean = false) {
        val course = library?.course
        if (grammar.isEmpty()) {
            start = course?.grammarLessons?.firstOrNull()?.lesson?.id
        } else {
            val unit = Placement.start(grammar.toList()) ?: Placement.unitBeyond(course?.unitIds ?: emptyList(), placement.map { it.unit })
            start = unit?.let { course?.firstLesson(it)?.lesson?.id }
        }
        go(if (skippingWords || vocabPlacement.isEmpty()) Step.Path else Step.Vocab)
    }

    fun finish(openStart: Boolean) {
        val known = Path.knownVocabUnits(vocabulary.toList())
        val startId = when (chosenTrack) {
            "new", "some" -> start ?: startPlace?.lesson?.id
            else -> null
        }
        model.finishOnboarding(
            LearnerProfile(chosenTrack, startId, StudyDates.isoTimestamp(Instant.now()), known.ifEmpty { null }),
            minutes, openStart,
        )
    }

    fun skip() {
        when {
            step == Step.Tour -> go(Step.Track)
            track != null -> finish(false)
            else -> model.finishOnboarding(null)
        }
    }

    fun accountClosed() {
        if (model.account != null) {
            if (returning) model.finishOnboarding(null) else go(Step.Ready)
        }
        returning = false
    }
}

/**
 * The first run. A welcome and a three-page tour of what Lectio does, then a few
 * questions that set the course up: where you're starting, a level check for
 * anyone who knows some Latin (the grammar, then the AP words), a daily goal, a
 * reminder and an account. It ends on the plan those answers make and a button
 * straight into it. Everything past the welcome can be skipped, and nothing
 * needs an account.
 */
@OptIn(ExperimentalFoundationApi::class, ExperimentalAnimationApi::class, ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(model: AppModel, launchStep: Step = Step.Welcome) {
    val c = Lectio.colors
    val flow = remember(model) { Flow(model, launchStep) }
    val scope = rememberCoroutineScope()
    val tour = rememberPagerState { TOUR_PAGES }
    val askNotifications = rememberNotificationPermission { granted ->
        flow.reminderOn = granted
        model.reminderMinutes = flow.reminderMinutes
        model.setReminder(granted)
        flow.go(Step.Account)
    }

    // Signed in from the account page: straight on, no need to close it by hand.
    LaunchedEffect(model.account?.userId) {
        if (model.account != null && flow.showAccount) {
            flow.showAccount = false
            flow.accountClosed()
        }
    }
    BackHandler(enabled = flow.showAccount || flow.canGoBack) { if (flow.showAccount) flow.showAccount = false else flow.back() }

    Box(Modifier.fillMaxSize().ambient()) {
        Column(Modifier.fillMaxSize()) {
            TopBar(flow)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                AnimatedContent(
                    flow.step,
                    transitionSpec = {
                        val dir = if (flow.forward) 1 else -1
                        (slideInHorizontally(tween(420)) { it * dir / 3 } + fadeIn(tween(300))) togetherWith (slideOutHorizontally(tween(420)) { -it * dir / 3 } + fadeOut(tween(200)))
                    },
                    label = "onboarding-step",
                ) { step ->
                    if (step == Step.Tour) {
                        TourPages(tour, model)
                    } else {
                        Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = if (step.growsDown) Alignment.TopCenter else Alignment.Center) {
                            Column(Modifier.widthIn(max = 560.dp).padding(horizontal = 24.dp, vertical = 16.dp)) { StepContent(flow, step) }
                        }
                    }
                }
            }
            BottomBar(flow, tour.currentPage, onTourNext = {
                if (tour.currentPage < TOUR_PAGES - 1) scope.launch { tour.animateScrollToPage(tour.currentPage + 1) } else flow.go(Step.Track)
            }, onRemind = { askNotifications() })
        }
        if (flow.showAccount) Surface(Modifier.fillMaxSize(), color = c.parchment) {
            AccountScreen(model, startsWithSignUp = flow.signUp, onBack = { flow.showAccount = false })
        }
    }
}

@Composable
private fun TopBar(flow: Flow) {
    val c = Lectio.colors
    Box(Modifier.fillMaxWidth().statusBarsPadding().height(52.dp).padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
        flow.progress?.let { (count, index) -> ProgressSegments(count, index, Modifier.widthIn(max = 200.dp)) }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            if (flow.canGoBack) IconButton({ flow.back() }) { Symbol("chevron.left", tint = c.ink, contentDescription = "Back") }
            Box(Modifier.weight(1f))
            if (flow.showsSkip) TextAction("Skip", tint = c.inkMuted) { flow.skip() }
        }
    }
}

@Composable
private fun BottomBar(flow: Flow, tourPage: Int, onTourNext: () -> Unit, onRemind: () -> Unit) {
    val c = Lectio.colors
    val placement = flow.placement
    val grammarToo = flow.track != "ap" && placement.isNotEmpty()
    val actions: (@Composable () -> Unit)? = when (flow.step) {
        Step.Welcome -> ({
            Primary("Get started") { flow.go(Step.Tour) }
            Secondary("I already have an account") { flow.returning = true; flow.signUp = false; flow.showAccount = true }
        })
        Step.Tour -> ({
            PageDots(TOUR_PAGES, tourPage, Modifier.padding(bottom = 6.dp))
            Primary(if (tourPage < TOUR_PAGES - 1) "Continue" else "Set up my course", onClick = onTourNext)
        })
        Step.Track -> ({ Primary("Continue", enabled = flow.track != null) { flow.afterTrack() } })
        Step.Check -> ({
            Primary(if (grammarToo) "Start the check" else "Check my words") {
                flow.grammar.clear()
                flow.vocabulary.clear()
                flow.go(if (grammarToo) Step.Grammar else Step.Vocab)
            }
            if (grammarToo) Secondary("I’ll choose a unit myself") { flow.afterPick = Step.Goal; flow.go(Step.PickUnit) }
            else Secondary("Skip for now") { flow.go(Step.Goal) }
        })
        Step.Path -> ({
            Primary("Sounds good") { flow.go(Step.Goal) }
            if (flow.chosenTrack != "ap") Secondary("Choose a different unit") { flow.afterPick = Step.Path; flow.go(Step.PickUnit) }
        })
        Step.Goal -> ({ Primary("Continue") { flow.go(Step.Reminder) } })
        Step.Reminder -> ({
            Primary("Remind me at ${formatMinutes(flow.reminderMinutes)}", onClick = onRemind)
            Secondary("Not now") { flow.go(Step.Account) }
        })
        Step.Account -> ({
            Primary("Create a free account") { flow.signUp = true; flow.showAccount = true }
            Secondary("I already have one") { flow.signUp = false; flow.showAccount = true }
            TextAction("Not now", tint = c.inkMuted) { flow.go(Step.Ready) }
        })
        Step.Ready -> ({
            Primary(flow.readyAction) { flow.finish(true) }
            if (flow.chosenTrack == "new" || flow.chosenTrack == "some") Secondary("Look around first") { flow.finish(false) }
        })
        Step.Grammar, Step.Vocab, Step.PickUnit -> null
    }
    if (actions != null) {
        Box(Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(Color.Transparent, c.parchment.copy(alpha = 0.92f)))).navigationBarsPadding(), contentAlignment = Alignment.Center) {
            Column(Modifier.widthIn(max = 480.dp).padding(horizontal = 24.dp).padding(top = 12.dp, bottom = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) { actions() }
        }
    }
}

@Composable
private fun Primary(title: String, enabled: Boolean = true, onClick: () -> Unit) {
    LectioButton(onClick, Modifier.fillMaxWidth(), prominent = true, enabled = enabled) { ButtonLabel(title, style = LectioText.headline) }
}

@Composable
private fun Secondary(title: String, onClick: () -> Unit) {
    LectioButton(onClick, Modifier.fillMaxWidth()) { ButtonLabel(title) }
}

private fun formatMinutes(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    val hour12 = if (h % 12 == 0) 12 else h % 12
    return "%d:%02d %s".format(hour12, m, if (h < 12) "AM" else "PM")
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StepContent(flow: Flow, step: Step) {
    val c = Lectio.colors
    val model = flow.model
    when (step) {
        Step.Welcome -> Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)) {
            LectioMedallion(Modifier.padding(bottom = 6.dp))
            Text("Lectio", style = LectioText.wordmark(84.sp), color = c.rubric)
            Text(
                "lege, notā, mementō", Modifier.padding(top = 0.dp).semantics { contentDescription = "Lege, notā, mementō: read, mark, remember." },
                style = LectioText.latinItalic(20.sp), color = c.inkMuted,
            )
            Text("From your first Latin word to the AP exam.", Modifier.padding(top = 8.dp), style = LectioText.prose(LectioText.title2), color = c.ink, textAlign = TextAlign.Center)
            Text(
                "Short lessons that find your level, every passage of Vergil and Pliny with each word glossed, and flashcards that come back just before you forget.",
                style = LectioText.prose(LectioText.callout), color = c.inkMuted, textAlign = TextAlign.Center,
            )
        }
        Step.Tour -> Unit
        Step.Track -> Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            OnboardingHeading("About you", "Where are you starting?", "This sets where the course begins. You can change it any time.")
            Box(Modifier.height(8.dp))
            ChoiceCard("leaf", c.verdigris, "I’m new to Latin", "Begin at the beginning: the sounds, the first words, and why endings matter.", flow.track == "new") { flow.track = "new" }
            ChoiceCard("book", c.woad, "I know some Latin", "Take a three-minute check and start where it finds you.", flow.track == "some") { flow.track = "some" }
            ChoiceCard("graduationcap", c.rubric, "I’m preparing for the AP exam", "Go straight to Vergil and Pliny, the quiz and practice exams.", flow.track == "ap") { flow.track = "ap" }
            ChoiceCard("person.2", c.gilt, "I teach Latin", "Set up a classroom, assign work, and follow your students’ progress.", flow.track == "teacher") { flow.track = "teacher" }
        }
        Step.Check -> {
            val grammarToo = flow.track != "ap" && flow.placement.isNotEmpty()
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Box(Modifier.size(84.dp).clip(CircleShape).background(c.slip), contentAlignment = Alignment.Center) { Symbol("scope", tint = c.rubric, size = 40.dp) }
                OnboardingHeading(
                    "Find your level", if (grammarToo) "A quick check" else "Which words do you know?",
                    if (grammarToo) "About three minutes. Nothing is scored, and you choose whether to use the result."
                    else "Two words from each part of the AP list. Where you know both, that part starts with a short test you can pass to skip it.",
                )
                SlipPanel {
                    if (grammarToo) {
                        CheckPart("text.book.closed", c.rubric, "Grammar", "Short questions, easiest first. It stops as soon as it finds your level.")
                        Hairline(color = c.hair)
                    }
                    CheckPart("character.book.closed", c.woad, "Vocabulary", "${flow.vocabPlacement.size} words from the AP list, two from each part.")
                }
            }
        }
        Step.Grammar -> if (flow.grammar.size < flow.placement.size) Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            QuietLabel(if (flow.vocabPlacement.isEmpty()) "Grammar" else "Part 1 of 2 · Grammar")
            val q = flow.placement[flow.grammar.size]
            androidx.compose.runtime.key("g${flow.grammar.size}") {
                PlacementCard(q, flow.grammar.size + 1, flow.placement.size) { right ->
                    flow.grammar.add(Placement.Answer(q.unit, right))
                    if (!Placement.continues(flow.grammar.toList(), flow.placement.size)) flow.settleGrammar()
                }
            }
            TextAction("Skip the rest of the check", Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp), tint = c.inkMuted) { flow.settleGrammar(skippingWords = true) }
        }
        Step.Vocab -> if (flow.vocabulary.size < flow.vocabPlacement.size) Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            QuietLabel(if (flow.track == "ap" || flow.placement.isEmpty()) "Vocabulary" else "Part 2 of 2 · Vocabulary")
            val q = flow.vocabPlacement[flow.vocabulary.size]
            androidx.compose.runtime.key("v${flow.vocabulary.size}") {
                PlacementCard(q, flow.vocabulary.size + 1, flow.vocabPlacement.size) { right ->
                    flow.vocabulary.add(Placement.Answer(q.unit, right))
                    if (flow.vocabulary.size >= flow.vocabPlacement.size) flow.go(Step.Path)
                }
            }
            TextAction("Skip the words", Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp), tint = c.inkMuted) { flow.go(Step.Path) }
        }
        Step.Path -> Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Box(Modifier.size(84.dp).clip(CircleShape).background(c.slip), contentAlignment = Alignment.Center) { Symbol("point.bottomleft.forward.to.point.topright.scurvepath", tint = c.rubric, size = 36.dp) }
            OnboardingHeading("Your level", "Here’s your path", flow.pathDetail)
            SlipPanel {
                PlanRow("text.book.closed", c.rubric, "Grammar", flow.grammarSummary)
                if (flow.vocabPlacement.isNotEmpty()) {
                    Hairline(color = c.hair)
                    PlanRow("character.book.closed", c.woad, "Vocabulary", flow.vocabSummary)
                    KnownUnitChips(flow)
                }
            }
        }
        Step.PickUnit -> Column {
            OnboardingHeading("Find your level", "Choose a unit")
            Box(Modifier.height(18.dp))
            for (level in flow.library?.course?.grammarLevels ?: emptyList()) {
                RubricLabel(level.title, Modifier.padding(top = 14.dp, bottom = 6.dp))
                for (unit in level.units) {
                    val first = unit.lessons.firstOrNull()?.id
                    val selected = flow.start == first
                    Row(
                        Modifier.fillMaxWidth().clickable(role = Role.Button) { flow.start = first; flow.go(flow.afterPick) }.padding(vertical = 10.dp)
                            .semantics { contentDescription = "${level.title}, unit ${unit.n}: ${Rich.plain(unit.title)}" },
                        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(30.dp).clip(CircleShape).background(if (selected) c.rubric else c.redTint), contentAlignment = Alignment.Center) {
                            Text("${unit.n}", style = LectioText.prose(LectioText.subheadline).copy(fontWeight = FontWeight.SemiBold), color = if (selected) c.onRubric else c.rubric)
                        }
                        RichText(unit.title, Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                        Symbol("chevron.right", tint = c.inkFaint, size = 20.dp)
                    }
                    Hairline(color = c.hair)
                }
            }
        }
        Step.Goal -> Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            OnboardingHeading("Your routine", "How much time a day?", "A little every day beats a lot now and then. Change it any time in Settings.")
            for (row in goals.chunked(2)) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                for ((minutes, name, detail) in row) {
                    val on = flow.minutes == minutes
                    Surface(
                        Modifier.weight(1f).semantics { contentDescription = "$minutes minutes a day, $name: $detail" + if (on) ". Selected" else "" },
                        shape = RoundedCornerShape(20.dp), color = if (on) c.redTint else c.slip.copy(alpha = 0.85f),
                        border = androidx.compose.foundation.BorderStroke(if (on) 1.5.dp else 0.75.dp, if (on) c.rubric else c.ruleStrong),
                    ) {
                        Column(Modifier.clickable(role = Role.RadioButton) { flow.minutes = minutes }.padding(vertical = 18.dp, horizontal = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text("$minutes", style = LectioText.prose(LectioText.largeTitle).copy(fontSize = 38.sp), color = if (on) c.rubric else c.ink)
                                Text("min", Modifier.padding(bottom = 6.dp), style = LectioText.subheadline, color = if (on) c.rubric else c.ink)
                            }
                            Text(name, style = LectioText.prose(LectioText.headline), color = c.ink)
                            Text(detail, style = LectioText.caption, color = c.inkMuted, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
        Step.Reminder -> {
            val context = androidx.compose.ui.platform.LocalContext.current
            Column(verticalArrangement = Arrangement.spacedBy(22.dp)) {
                OnboardingHeading("Your routine", "A daily nudge?", "One notification a day, at a time you choose, with that day’s line of Latin and the cards waiting. Nothing else.")
                NotificationPreview()
                SlipPanel {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Symbol("bell", tint = c.ink, size = 22.dp)
                        Text("Every day at", Modifier.weight(1f).padding(start = 10.dp), style = LectioText.prose(LectioText.body), color = c.ink)
                        TextAction(formatMinutes(flow.reminderMinutes)) {
                            android.app.TimePickerDialog(context, { _, h, m -> flow.reminderMinutes = h * 60 + m }, flow.reminderMinutes / 60, flow.reminderMinutes % 60, false).show()
                        }
                    }
                }
            }
        }
        Step.Account -> {
            val teacher = flow.track == "teacher"
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(22.dp)) {
                Box(Modifier.size(84.dp).clip(CircleShape).background(c.slip), contentAlignment = Alignment.Center) {
                    Symbol(if (teacher) "person.2.badge.gearshape" else "icloud.and.arrow.up", tint = c.rubric, size = 36.dp)
                }
                OnboardingHeading(
                    if (teacher) "One more thing" else "Optional", if (teacher) "Sign in to teach" else "Keep your progress safe",
                    if (teacher) "Classrooms need a free account. Your students join with a six-character code."
                    else "Lectio works fully without an account, and everything stays on this device. A free account adds:",
                )
                SlipPanel {
                    if (teacher) {
                        Benefit("rectangle.stack", "Create classrooms", "On the website, with a join code for your students.")
                        Hairline(color = c.hair)
                        Benefit("checklist", "Follow their work", "Minutes studied, assignments met, and a class leaderboard.")
                    } else {
                        Benefit("arrow.triangle.2.circlepath", "Sync", "Your deck, notes and progress on the website and your other devices.")
                        Hairline(color = c.hair)
                        Benefit("person.3", "Your class", "Join your teacher’s classroom with a code.")
                        Hairline(color = c.hair)
                        Benefit("hand.raised", "A safe copy", "Nothing lost if you change phones.")
                    }
                }
            }
        }
        Step.Ready -> Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(22.dp)) {
            LectioMedallion(size = 112.dp)
            OnboardingHeading("Your plan", "You’re all set", flow.readyDetail)
            SlipPanel {
                PlanRow(flow.startSymbol, c.rubric, "Start", flow.startSummary)
                if (flow.chosenTrack != "teacher" && flow.vocabPlacement.isNotEmpty()) {
                    Hairline(color = c.hair)
                    PlanRow("character.book.closed", c.woad, "Vocabulary", flow.vocabSummary)
                }
                Hairline(color = c.hair)
                PlanRow("timer", c.verdigris, "Daily goal", "${flow.minutes} minutes a day")
                Hairline(color = c.hair)
                PlanRow(if (flow.reminderOn) "bell.badge" else "bell.slash", c.gilt, "Reminder", if (flow.reminderOn) "Every day at ${formatMinutes(flow.reminderMinutes)}" else "Off; turn it on in Settings")
                model.account?.let {
                    Hairline(color = c.hair)
                    PlanRow("checkmark.icloud", c.woad, "Account", "Syncing as ${it.displayName}")
                }
            }
        }
    }
}

@Composable
private fun CheckPart(symbol: String, tint: Color, title: String, detail: String) {
    val c = Lectio.colors
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) { Symbol(symbol, tint = tint, size = 22.dp) }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text(detail, style = LectioText.prose(LectioText.subheadline), color = c.ink2)
        }
    }
}

@Composable
private fun Benefit(symbol: String, title: String, detail: String) {
    val c = Lectio.colors
    Row(Modifier.semantics(mergeDescendants = true) { }, horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(c.rubric.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) { Symbol(symbol, tint = c.rubric, size = 20.dp) }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text(detail, style = LectioText.prose(LectioText.subheadline), color = c.ink2)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun KnownUnitChips(flow: Flow) {
    val c = Lectio.colors
    val known = Path.knownVocabUnits(flow.vocabulary.toList()).toSet()
    val units = flow.library?.course?.vocabLevel?.units ?: emptyList()
    if (flow.vocabulary.isEmpty() || units.isEmpty()) return
    FlowRow(Modifier.padding(start = 52.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (unit in units) {
            val isKnown = unit.id in known
            Row(
                Modifier.clip(RoundedCornerShape(50)).background(if (isKnown) c.woad.copy(alpha = 0.12f) else c.slip).padding(horizontal = 10.dp, vertical = 6.dp)
                    .semantics(mergeDescendants = true) { contentDescription = "${Rich.plain(unit.title)}: ${if (isKnown) "start with the unit test" else "start with the lessons"}" },
                horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically,
            ) {
                Symbol(if (isKnown) "checkmark.seal.fill" else "circle", tint = if (isKnown) c.woad else c.inkMuted, size = 14.dp)
                Text(Rich.plain(unit.title), style = LectioText.caption.copy(fontWeight = FontWeight.Medium), color = if (isKnown) c.woad else c.inkMuted)
            }
        }
    }
}
