package com.norvodesigns.lectio

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import com.norvodesigns.lectio.core.DirectorySource
import com.norvodesigns.lectio.core.ScansionCorpus
import com.norvodesigns.lectio.core.ScansionWork
import com.norvodesigns.lectio.features.quiz.QuizSessionRequest
import com.norvodesigns.lectio.features.quiz.QuizSessionScreen
import com.norvodesigns.lectio.features.vocab.FlashcardSession
import com.norvodesigns.lectio.features.vocab.VocabDirection
import com.norvodesigns.lectio.features.vocab.VocabSession
import com.norvodesigns.lectio.ui.theme.Appearance
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * The Google Play listing's screenshots, rendered from the real screens with
 * sample progress: a phone (1080×2160, the 1:2 shape Play accepts), a 7-inch
 * tablet and a 10-inch tablet. Run with `./gradlew :app:recordRoborazziDebug
 * --tests '*StoreScreenshots*'`; the pictures land in app/build/outputs/play.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(application = LectioApplication::class, sdk = [35])
@OptIn(ExperimentalTestApi::class)
class StoreScreenshots {
    @get:Rule val compose = createComposeRule()

    private enum class Device(val folder: String, val qualifiers: String) {
        Phone("phone", "w360dp-h720dp-port-xxhdpi"),
        Tablet7("tablet7", "w600dp-h960dp-port-xhdpi"),
        Tablet10("tablet10", "w800dp-h1280dp-port-xhdpi"),
    }

    private fun model(): AppModel {
        val model = (ApplicationProvider.getApplicationContext<Application>() as LectioApplication).model
        if (model.content == null) {
            model.prefs.put("seedDemo", true)
            runBlocking { model.loadContent() }
            model.loadSampleProgress()
        }
        model.appearance = Appearance.Light
        return model
    }

    private fun shoot(device: Device, name: String, prepare: (AppModel) -> Unit = {}, after: () -> Unit = {}, content: @Composable (AppModel) -> Unit) {
        RuntimeEnvironment.setQualifiers("+" + device.qualifiers)
        val model = model()
        prepare(model)
        compose.setContent { content(model) }
        compose.waitForIdle()
        after()
        compose.waitForIdle()
        compose.onRoot().captureRoboImage("build/outputs/play/${device.folder}/$name.png")
    }

    private fun tap(text: String) {
        compose.onAllNodesWithText(text, ignoreCase = true).onFirst().performClick()
        compose.waitForIdle()
    }

    private fun shell(device: Device, name: String, tab: AppTab, before: (AppModel) -> Unit = {}) =
        shoot(device, name, prepare = { m -> before(m); m.selectedTab = tab }) { m -> LectioRoot(m) }

    /** A reviewed line of the Aeneid: marks in, feet ruled, one syllable wrong, as it looks after "Check the line". */
    private fun reviewedLine(model: AppModel) {
        val corpus = ScansionCorpus(DirectorySource(File("../../public/scansion")))
        val line = corpus.loadBook(1).first { it.id.endsWith("-1-1") || it.citation.endsWith("1.1") }
        val work = ScansionWork(line, null)
        line.syllables.forEachIndexed { i, s -> if (!s.isElided) work.setMark(i, if (i == 6) (if (s.quantity == "long") "short" else "long") else s.quantity) }
        for (i in work.elidableIndices) if (line.syllables[i].isElided) work.toggleElision(i)
        val metrical = work.metricalIndices
        for (d in work.correctDivisions) work.toggleDivision(metrical[d])
        work.markChecked()
        model.update { it.saveScansionDraft(line.id, work.draft) }
        model.scansionStartPassageId = "aen-1-1-33"
    }

    /* The phone */

    @Test fun phone01Today() = shell(Device.Phone, "01-today", AppTab.Today)
    @Test fun phone02Course() = shell(Device.Phone, "02-course", AppTab.Learn)
    @Test fun phone03Reader() = shoot(Device.Phone, "03-reader", after = {
        val m = model()
        val word = m.content!!.passage("aen-1-1-33")!!.lines.first().tokens.first { it.isWord && it.text.startsWith("virum") }
        tap(word.text)
    }) { m ->
        com.norvodesigns.lectio.features.read.PassageReader(m, m.content!!.passage("aen-1-1-33")!!)
    }
    @Test fun phone04Flashcard() = shoot(
        Device.Phone, "04-flashcard",
        prepare = { m -> m.update { d -> d.seedVocab(listOf(m.content!!.coreVocabulary.first { it.headword == "amor" }.id)) } },
        after = { tap("Show answer") },
    ) { m ->
        val id = m.content!!.coreVocabulary.first { it.headword == "amor" }.id
        FlashcardSession(m, VocabSession(listOf(id), VocabDirection.LaEn)) {}
    }
    @Test fun phone05Quiz() = shoot(Device.Phone, "05-quiz", after = {
        val q = model().content!!.questions.first { it.passageId != null }
        tap(q.options.first { it.id != q.answerId }.text)
    }) { m -> QuizSessionScreen(m, QuizSessionRequest(listOf(m.content!!.questions.first { it.passageId != null }), false)) {} }
    @Test fun phone06Scansion() = shoot(Device.Phone, "06-scansion", prepare = ::reviewedLine) { m ->
        com.norvodesigns.lectio.features.scansion.ScansionScreen(m)
    }
    @Test fun phone07Browse() = shell(Device.Phone, "07-browse", AppTab.Search)
    @Test fun phone08Laurels() = shell(Device.Phone, "08-laurels", AppTab.Laurels)

    /* Tablets */

    @Test fun tablet7Today() = shell(Device.Tablet7, "01-today", AppTab.Today)
    @Test fun tablet7Reader() = shoot(Device.Tablet7, "02-reader") { m ->
        com.norvodesigns.lectio.features.read.PassageReader(m, m.content!!.passage("aen-1-1-33")!!)
    }
    @Test fun tablet7Course() = shell(Device.Tablet7, "03-course", AppTab.Learn)
    @Test fun tablet7Vocab() = shell(Device.Tablet7, "04-vocab", AppTab.Vocab)

    @Test fun tablet10Today() = shell(Device.Tablet10, "01-today", AppTab.Today)
    @Test fun tablet10Reader() = shell(Device.Tablet10, "02-reader", AppTab.Read) { it.readPassageId = "aen-1-1-33" }
    @Test fun tablet10Course() = shell(Device.Tablet10, "03-course", AppTab.Learn)
    @Test fun tablet10Vocab() = shell(Device.Tablet10, "04-vocab", AppTab.Vocab)
}
