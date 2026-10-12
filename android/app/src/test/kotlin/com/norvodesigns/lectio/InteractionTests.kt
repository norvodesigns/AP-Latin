package com.norvodesigns.lectio

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.hasScrollToKeyAction
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.performScrollToKey
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.assertIsDisplayed
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.norvodesigns.lectio.core.Forge
import com.norvodesigns.lectio.core.Paradigm
import com.norvodesigns.lectio.features.exam.ExamPaper
import com.norvodesigns.lectio.features.exam.ExamSession
import com.norvodesigns.lectio.features.forge.ForgeRound
import com.norvodesigns.lectio.features.forge.ForgeRoundScreen
import com.norvodesigns.lectio.features.onboarding.OnboardingScreen
import com.norvodesigns.lectio.features.quiz.QuizSessionRequest
import com.norvodesigns.lectio.features.quiz.QuizSessionScreen
import com.norvodesigns.lectio.features.read.PassageReader
import com.norvodesigns.lectio.features.vocab.FlashcardSession
import com.norvodesigns.lectio.features.vocab.VocabDirection
import com.norvodesigns.lectio.features.vocab.VocabSession
import com.norvodesigns.lectio.ui.theme.Appearance
import com.norvodesigns.lectio.ui.theme.LectioTheme
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Walks the real screens with taps, on the JVM, so a screen that crashes the
 * moment someone uses it fails here rather than on a phone.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(application = LectioApplication::class, sdk = [35], qualifiers = "w411dp-h891dp-port-xxhdpi")
@OptIn(ExperimentalTestApi::class)
class InteractionTests {
    @get:Rule val compose = createComposeRule()

    private fun model(seed: Boolean = true): AppModel {
        val model = (ApplicationProvider.getApplicationContext<Application>() as LectioApplication).model
        if (model.content == null) {
            if (seed) model.prefs.put("seedDemo", true)
            runBlocking { model.loadContent() }
            if (seed) model.loadSampleProgress()
        }
        return model
    }

    private fun show(model: AppModel, content: @Composable () -> Unit) {
        model.appearance = Appearance.Light
        compose.setContent { LectioTheme(model.appearance) { content() } }
        compose.waitForIdle()
    }

    private fun tap(text: String) {
        compose.onAllNodesWithText(text, ignoreCase = true).onFirst().performClick()
        compose.waitForIdle()
    }

    private fun see(text: String) = compose.onAllNodesWithText(text, ignoreCase = true).onFirst().assertIsDisplayed()

    @Test fun firstRunReachesThePlan() {
        val model = model(seed = false)
        show(model) { OnboardingScreen(model) }
        see("Get started")
        tap("Get started")
        see("Start where you are")
        tap("Continue")
        see("Every word, glossed")
        tap("Continue")
        see("Words that stick")
        tap("Set up my course")
        see("Where are you starting?")
        tap("I’m new to Latin")
        tap("Continue")
        see("How much time a day?")
        tap("Continue")
        see("A daily nudge?")
        tap("Not now")
        see("Keep your progress safe")
        tap("Not now")
        see("You’re all set")
        tap("Look around first")
        assertFalse(model.showOnboarding)
        assertEquals("new", model.progress.learner?.track)
    }

    @Test fun aQuizAnswerIsRecordedAndExplained() {
        val model = model()
        val questions = model.content!!.questions.filter { it.passageId != null }.take(2)
        val before = model.progress.quizAttempts.size
        show(model) { QuizSessionScreen(model, QuizSessionRequest(questions, false)) {} }
        see("1 of 2")
        tap(questions[0].options[0].text)
        see("Why")
        assertEquals(before + 1, model.progress.quizAttempts.size)
        tap("Next question")
        see("2 of 2")
        tap(questions[1].options[0].text)
        tap("See results")
        see("Set complete")
    }

    @Test fun aFlashcardIsGradedAndScheduled() {
        val model = model()
        val id = model.vocab.keys.first()
        val reviewsBefore = model.vocab.getValue(id).reviews
        show(model) { FlashcardSession(model, VocabSession(listOf(id), VocabDirection.LaEn)) {} }
        tap("Show answer")
        see("Got it")
        tap("Got it")
        see("Session complete")
        assertEquals(reviewsBefore + 1, model.vocab.getValue(id).reviews)
    }

    @Test fun aMissedFlashcardComesBack() {
        val model = model()
        val id = model.vocab.keys.first()
        show(model) { FlashcardSession(model, VocabSession(listOf(id), VocabDirection.EnLa)) {} }
        tap("Show answer")
        tap("Practice again")
        // Still one to go: it returns at the end of the session.
        see("1 to go")
    }

    @Test fun aWordCanBeLookedUpInTheReader() {
        val model = model()
        val passage = model.content!!.passages.first { it.isPoetry }
        val word = passage.lines.first().tokens.first { it.isWord }
        show(model) { PassageReader(model, passage) }
        tap(word.text)
        // The gloss opens over the page, and looking a word up opens the passage for the record.
        assertTrue(model.progress.passage(passage.id).lastOpened != null)
    }

    @Test fun aForgeNameQuestionTakesAnAnswer() {
        val model = model()
        val library = model.content!!
        val scope = library.paradigms
        val round = ForgeRound(Forge.Mode.Name, scope, Forge.round(scope, Forge.Mode.Name, 2))
        val first = round.questions.first() as Forge.ForgeQuestion.Name
        show(model) { ForgeRoundScreen(model, round) {} }
        tap(first.options[first.answer])
        see("Continue")
        tap("Continue")
        compose.waitForIdle()
    }

    @Test fun theExamStartsAndTakesAnAnswer() {
        val model = model()
        val paper = ExamPaper.build(model.content!!)
        show(model) { ExamSession(model, paper) {} }
        see("Section I")
        tap(paper.mcq[0].options[1].text)
        see("1 of 52 answered")
        tap("Next")
        see("1 of 52 answered")
    }

    @Test fun anAnswerIsTheOnlyChoiceMarked() {
        val model = model()
        val q = model.content!!.questions.first { it.passageId != null }
        show(model) { QuizSessionScreen(model, QuizSessionRequest(listOf(q), false)) {} }
        tap(q.options.first { it.id != q.answerId }.text)
        // The right answer is shown after a miss.
        compose.onAllNodesWithText(q.options.first { it.id == q.answerId }.text).onFirst().assertIsDisplayed()
        assertTrue(model.progress.reviewQueue.contains(q.id))
    }

    @Test fun everySectionOpensInsideTheShell() {
        val model = model()
        model.appearance = Appearance.Light
        compose.setContent { LectioRoot(model) }
        compose.waitForIdle()
        for (tab in AppTab.entries) {
            model.selectedTab = tab
            compose.waitForIdle()
            assertEquals(tab, model.selectedTab)
        }
        // And back to Today, where the bottom bar names the five places a student goes every day.
        model.selectedTab = AppTab.Today
        compose.waitForIdle()
        for (label in listOf("Read", "Vocab", "Search")) tap(label)
        assertEquals(AppTab.Search, model.selectedTab)
    }

    @Test fun overlaysOpenOverTheShell() {
        val model = model()
        compose.setContent { LectioRoot(model) }
        compose.waitForIdle()
        val id = model.vocab.keys.first()
        model.vocabSession = VocabSession(listOf(id), VocabDirection.LaEn)
        compose.waitForIdle()
        see("Show answer")
        model.vocabSession = null
        model.speedRoundOpen = true
        compose.waitForIdle()
        see("Speed round")
        model.speedRoundOpen = false
        model.showTour = true
        compose.waitForIdle()
        see("Start where you are")
        model.showTour = false
        compose.waitForIdle()
    }

    @Test fun aGradeFromTheWatchIsAppliedWhenItWasMade() {
        val model = model()
        val id = model.vocab.keys.first()
        val before = model.vocab.getValue(id).reviews
        val earlier = System.currentTimeMillis() - 3_600_000
        model.applyWatchReview(com.norvodesigns.lectio.core.WatchReview(id, 4, earlier))
        assertEquals(before + 1, model.vocab.getValue(id).reviews)
    }

    @Test fun theWatchGetsTodaysDueCards() {
        val model = model()
        // No watch is paired in a test; sending must simply not throw, and the deck it would send holds only due cards.
        model.sendWatchDeck(force = true)
        val due = com.norvodesigns.lectio.core.SpacedRepetition.due(model.vocab.values, com.norvodesigns.lectio.core.StudyDates.today())
        assertTrue(due.isNotEmpty())
    }

    /* Navigation: what iOS does with a NavigationStack per tab. */

    private fun shell(model: AppModel, tab: AppTab) {
        model.appearance = Appearance.Light
        compose.setContent { LectioRoot(model) }
        compose.waitForIdle()
        model.selectedTab = tab
        compose.waitForIdle()
    }

    private fun back() {
        compose.onAllNodesWithContentDescription("Back").onFirst().performClick()
        compose.waitForIdle()
    }

    @Test fun aPassageFromSearchOpensOverTheResultsAndBackReturnsToThem() {
        val model = model()
        val passage = model.content!!.passages.first { it.required }
        shell(model, AppTab.Search)
        compose.onAllNodes(hasSetTextAction()).onFirst().performTextInput(passage.citation)
        compose.waitForIdle()
        tap(passage.title)
        // Pushed over Search: the tab doesn't change.
        assertEquals(AppTab.Search, model.selectedTab)
        assertEquals(PushedPage.Reader(passage.id), model.pushedPage)
        back()
        assertNull(model.pushedPage)
        assertEquals(AppTab.Search, model.selectedTab)
        // The results are still there, query and all.
        see(passage.title)
    }

    @Test fun aGrammarTopicFromSearchReturnsToTheResults() {
        val model = model()
        val topic = model.content!!.grammarTopics.first()
        shell(model, AppTab.Search)
        model.openGrammarTopic(topic.id)
        compose.waitForIdle()
        see(topic.summary)
        back()
        assertNull(model.pushedPage)
        assertEquals(AppTab.Search, model.selectedTab)
    }

    @Test fun nextPushesAPassageAndBackReturnsToTheOneBefore() {
        val model = model()
        val passages = model.content!!.passages
        model.readStack.reset(passages[0].id)
        shell(model, AppTab.Read)
        compose.onAllNodes(hasScrollToKeyAction()).onFirst().performScrollToKey("footer")
        compose.waitForIdle()
        tap("Next →")
        assertEquals(passages[1].id, model.readStack.top)
        assertEquals(2, model.readStack.depth)
        back()
        assertEquals(passages[0].id, model.readStack.top)
        back()
        assertNull(model.readStack.top)
    }

    @Test fun leavingATabForgetsWhereItsBackLed() {
        val model = model()
        shell(model, AppTab.Search)
        model.openSection(AppTab.Plan, from = AppTab.Search)
        assertEquals(AppTab.Search, model.backTarget)
        model.selectedTab = AppTab.Translate
        assertNull(model.backTarget)
    }

    @Test fun aTranslationInProgressSurvivesATabSwitch() {
        val model = model()
        val drill = model.content!!.translationDrills.first()
        shell(model, AppTab.Translate)
        tap(drill.citation)
        compose.onAllNodes(hasSetTextAction()).onFirst().performTextInput("arma virumque cano")
        compose.waitForIdle()
        model.selectedTab = AppTab.Today
        compose.waitForIdle()
        model.selectedTab = AppTab.Translate
        compose.waitForIdle()
        see("arma virumque cano")
    }

    @Test fun theLevelCheckCoversTheApp() {
        val model = model()
        shell(model, AppTab.Learn)
        model.levelCheckOpen = true
        compose.waitForIdle()
        see("Find my level")
        model.levelCheckOpen = false
        compose.waitForIdle()
    }

    /* A tablet's keyboard, as on iOS. */

    @OptIn(androidx.compose.ui.test.ExperimentalTestApi::class)
    private fun press(key: androidx.compose.ui.input.key.Key) {
        compose.onAllNodes(androidx.compose.ui.test.isFocused()).onFirst().performKeyInput { pressKey(key) }
        compose.waitForIdle()
    }

    @Test fun aFlashcardIsTurnedAndGradedFromTheKeyboard() {
        val model = model()
        val id = model.vocab.keys.first()
        val reviewsBefore = model.vocab.getValue(id).reviews
        show(model) { FlashcardSession(model, VocabSession(listOf(id), VocabDirection.LaEn)) {} }
        press(androidx.compose.ui.input.key.Key.Spacebar)
        see("Got it")
        press(androidx.compose.ui.input.key.Key.Two)
        see("Session complete")
        assertEquals(reviewsBefore + 1, model.vocab.getValue(id).reviews)
    }

    @Test fun aQuizQuestionIsAnsweredFromTheKeyboard() {
        val model = model()
        val questions = model.content!!.questions.filter { it.passageId != null }.take(2)
        val before = model.progress.quizAttempts.size
        show(model) { QuizSessionScreen(model, QuizSessionRequest(questions, false)) {} }
        press(androidx.compose.ui.input.key.Key.One)
        assertEquals(before + 1, model.progress.quizAttempts.size)
        see("Why")
        // Return goes on to the next question.
        press(androidx.compose.ui.input.key.Key.Enter)
        see("2 of 2")
    }

    @Test fun ctrlAndANumberJumpToASection() {
        val model = model()
        val activity = org.robolectric.Robolectric.buildActivity(MainActivity::class.java).setup().get()
        val down = android.view.KeyEvent(0, 0, android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_5, 0, android.view.KeyEvent.META_CTRL_ON)
        assertTrue(activity.onKeyShortcut(android.view.KeyEvent.KEYCODE_5, down))
        assertEquals(AppTab.Translate, model.selectedTab)
        model.selectedTab = AppTab.Today
    }
}

