package com.norvodesigns.lectio.wear

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import com.norvodesigns.lectio.core.WatchDeck
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** The watch's screens on a round 1.4" face (the shape Wear OS listings ask screenshots in), with a morning's sample cards. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w227dp-h227dp-round-xhdpi")
@OptIn(ExperimentalTestApi::class)
class WatchScreenshots {
    @get:Rule val compose = createComposeRule()

    private val sample = WatchDeck(
        cards = listOf(
            WatchDeck.Card("amor", "amor", "amor, amōris", "noun, m.", "love"),
            WatchDeck.Card("arma", "arma", "arma, armōrum", "noun, n. pl.", "arms, weapons"),
            WatchDeck.Card("urbs", "urbs", "urbs, urbis", "noun, f.", "city"),
            WatchDeck.Card("fatum", "fātum", "fātum, fātī", "noun, n.", "fate, destiny"),
            WatchDeck.Card("pius", "pius", "pius, pia, pium", "adjective", "dutiful, devoted"),
        ),
        dueCount = 12, streak = 5, daysUntilExam = 214, sentAt = 1_790_000_000_000,
    )

    private fun store(): WatchStore = WatchStore.get(ApplicationProvider.getApplicationContext()).also { it.receive(sample, save = false) }

    private fun tap(description: String) {
        compose.onAllNodesWithContentDescription(description).onFirst().performClick()
        compose.waitForIdle()
    }

    @Test fun home() {
        val store = store()
        compose.setContent { WatchApp(store) }
        compose.waitForIdle()
        compose.onRoot().captureRoboImage("build/outputs/play/wear/01-home.png")
    }

    @Test fun reviewFront() {
        val store = store()
        compose.setContent { WatchApp(store, startReviewing = true) }
        compose.waitForIdle()
        compose.onRoot().captureRoboImage("build/outputs/play/wear/02-card.png")
    }

    @Test fun reviewBack() {
        val store = store()
        compose.setContent { WatchApp(store, startReviewing = true) }
        tap("Show the answer")
        compose.onRoot().captureRoboImage("build/outputs/play/wear/03-answer.png")
    }

    @Test fun aMissComesBackAndAHitDoesNot() {
        val store = store()
        compose.setContent { WatchApp(store, startReviewing = true) }
        val first = store.queue.first()
        tap("Show the answer")
        compose.onAllNodesWithContentDescription("Practice again").onFirst().performClick()
        compose.waitForIdle()
        // Missed: it goes to the back of this session.
        assertEquals(5, store.queue.size)
        assertEquals(first, store.queue.last())
        tap("Show the answer")
        compose.onAllNodesWithContentDescription("Got it").onFirst().performClick()
        compose.waitForIdle()
        assertEquals(4, store.queue.size)
        assertEquals(2, store.reviewed)
    }
}
