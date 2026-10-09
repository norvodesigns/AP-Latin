package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.data.AppConfig
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * Permission to send text to the AI service. The AI features pass the student's
 * own writing to a third-party AI provider, so the app asks once, plainly,
 * before the first request, and the answer can be changed at any time in
 * Settings › AI features. (Google Play's user data policy asks the same of an
 * app that shares user content with an AI service.)
 */
object AIConsent {
    const val KEY = "aiConsent"
    fun granted(model: AppModel): Boolean = model.prefs.bool(KEY)
    fun set(model: AppModel, value: Boolean) = model.prefs.put(KEY, value)
}

/** An AI request waiting on the student's permission. */
@Stable
class AIGate(private val model: AppModel) {
    private var pending by mutableStateOf<(() -> Unit)?>(null)
    internal val isAsking: Boolean get() = pending != null

    /** Runs [action] now if AI is allowed; otherwise asks first. */
    fun ask(action: () -> Unit) {
        if (AIConsent.granted(model)) action() else pending = action
    }

    internal fun decide(allowed: Boolean, onDecline: () -> Unit) {
        val action = pending
        pending = null
        if (allowed) {
            AIConsent.set(model, true)
            action?.invoke()
        } else {
            onDecline()
        }
    }
}

@Composable
fun rememberAIGate(model: AppModel): AIGate = remember(model) { AIGate(model) }

/** Shows the permission sheet while [gate] has a request waiting; [onDecline] is the self-graded path, where there is one. */
@Composable
fun AIConsentHost(gate: AIGate, onDecline: () -> Unit = {}) {
    if (gate.isAsking) {
        Dialog(
            onDismissRequest = {},
            properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
        ) {
            androidx.compose.material3.Surface(Modifier.fillMaxSize(), color = Lectio.colors.parchment) {
                AIConsentSheet { allowed -> gate.decide(allowed, onDecline) }
            }
        }
    }
}

/** What the AI features send, and to whom, before anything is sent. */
@Composable
fun AIConsentSheet(decide: (Boolean) -> Unit) {
    val c = Lectio.colors
    val uri = LocalUriHandler.current
    Column(Modifier.fillMaxSize().systemBarsPadding().verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
        Column(Modifier.widthIn(max = 560.dp).fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Symbol("sparkles", tint = c.rubric, size = 44.dp)
            Text("Before you use AI", style = LectioText.prose(LectioText.title), color = c.ink)
            Text(
                "Lectio’s AI grading, line tutor and sight-passage selection are written by an AI service outside Lectio. Here is what that means.",
                style = LectioText.prose(LectioText.body), color = c.ink2,
            )
            Panel {
                Point("paperplane", "What is sent", "The Latin you’re working on, and what you wrote or asked: a translation, an answer, an essay or a question. Not your name, your email or your progress.")
                Hairline(color = c.hair)
                Point("server.rack", "Who receives it", "Lectio’s server passes it to an AI provider, Google Gemini (or Groq as a backup), which writes the feedback.")
                Hairline(color = c.hair)
                Point("hand.raised", "Leave out anything personal", "The providers may keep what they receive and use it to improve their models.")
            }
            Text(
                "Nothing is sent until you press an AI button. You can change your mind in Settings › AI features, and every AI feature has a self-graded path that works without it.",
                style = LectioText.prose(LectioText.subheadline), color = c.inkMuted,
            )
            TextAction("Privacy policy", icon = "hand.raised") { uri.openUri(AppConfig.web("privacy")) }
            Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                LectioButton({ decide(true) }, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Allow AI features", style = LectioText.headline) }
                LectioButton({ decide(false) }, Modifier.fillMaxWidth()) { ButtonLabel("Not now") }
            }
        }
    }
}

@Composable
private fun Point(symbol: String, title: String, detail: String) {
    val c = Lectio.colors
    Row(Modifier.padding(vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        IconBadge(symbol, c.rubric, size = 36.dp, background = c.rubric.copy(alpha = 0.12f))
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, style = LectioText.prose(LectioText.headline), color = c.ink)
            Text(detail, style = LectioText.prose(LectioText.subheadline), color = c.ink2)
        }
    }
}
