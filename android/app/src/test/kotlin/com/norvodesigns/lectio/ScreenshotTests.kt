package com.norvodesigns.lectio

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import com.norvodesigns.lectio.core.Daily
import com.norvodesigns.lectio.features.laurels.LaurelsScreen
import com.norvodesigns.lectio.features.learn.CourseScreen
import com.norvodesigns.lectio.features.learn.LessonScreen
import com.norvodesigns.lectio.features.learn.LevelCheckScreen
import com.norvodesigns.lectio.features.search.SearchScreen
import com.norvodesigns.lectio.features.today.TodayScreen
import com.norvodesigns.lectio.ui.theme.Appearance
import com.norvodesigns.lectio.ui.theme.LectioTheme
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Renders the real screens on the JVM (Robolectric's native graphics) with
 * sample progress, so the layout can be looked at without a device. The same
 * renders become the Play Store screenshots.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(application = LectioApplication::class, sdk = [35], qualifiers = "w411dp-h891dp-port-xxhdpi")
class ScreenshotTests {
    @get:Rule val compose = createComposeRule()

    private fun model(): AppModel {
        val model = (ApplicationProvider.getApplicationContext<Application>() as LectioApplication).model
        if (model.content == null) {
            model.prefs.put("seedDemo", true)
            runBlocking { model.loadContent() }
            model.loadSampleProgress()
        }
        return model
    }

    private fun shoot(name: String, dark: Boolean = false, content: @Composable (AppModel) -> Unit) {
        val model = model()
        model.appearance = if (dark) Appearance.Dark else Appearance.Light
        compose.setContent { LectioTheme(model.appearance) { content(model) } }
        compose.waitForIdle()
        compose.onRoot().captureRoboImage("build/outputs/roborazzi/$name.png")
    }

    @Test fun today() = shoot("today") { TodayScreen(it) }
    @Test fun todayDark() = shoot("today-dark", dark = true) { TodayScreen(it) }
    @Test fun course() = shoot("course") { CourseScreen(it) }
    @Test fun browse() = shoot("browse") { SearchScreen(it) }
    @Test fun laurels() = shoot("laurels") { LaurelsScreen(it) }
    @Test fun levelCheck() = shoot("level-check") { LevelCheckScreen(it) {} }
    @Test fun lessonIntro() = shoot("lesson-intro") { m -> LessonScreen(m, m.content!!.course.place("prima-1-1")!!) }
    @Test fun sententiaIntro() = shoot("sententia") { m -> LessonScreen(m, Daily.lesson(m.todaysSententia!!, m.dailyDay)) }
}
