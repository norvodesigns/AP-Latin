package com.norvodesigns.lectio.features.reference

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.ContextCard
import com.norvodesigns.lectio.features.quiz.QuizSessionRequest
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.StudyDeck
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

private enum class ContextMode(val label: String) { Cards("Cards"), Study("Study"), Quiz("Quiz") }

/** Skill 2.B, historical and cultural context (src/app/context/ContextCards.tsx): the cards, a study deck over them, and the context-culture questions. */
@Composable
fun ContextScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var mode by remember { mutableStateOf(ContextMode.Cards) }
    PageScaffold("Context & Culture") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 20.dp) {
            Segmented(ContextMode.entries.map { it to it.label }, mode, { mode = it })
            when (mode) {
                ContextMode.Cards -> {
                    val syllabus = library.contextCards.filter { it.isRequired }
                    val background = library.contextCards.filter { !it.isRequired }
                    RubricLabel("The syllabus")
                    for (card in syllabus) ContextEntry(card, library.meta.contextTopicLabels[card.topic])
                    if (background.isNotEmpty()) {
                        RubricLabel("Roman background", Modifier.padding(top = 12.dp))
                        Text("Not required by the exam, but assumed by every author on it.", style = LectioText.footnote, color = c.inkMuted)
                        for (card in background) ContextEntry(card, library.meta.contextTopicLabels[card.topic])
                    }
                }
                ContextMode.Study -> StudyDeck(model, library.contextCards, { it.id }, "card", front = { card ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        QuietLabel(library.meta.contextTopicLabels[card.topic] ?: "")
                        Text(card.title, style = LectioText.prose(LectioText.title), color = c.ink, textAlign = TextAlign.Center)
                    }
                }, back = { card -> ContextBody(card) })
                ContextMode.Quiz -> {
                    val pool = library.questions.filter { it.type == "context-culture" }
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            "${pool.size} questions on context and culture, drawn from the Quiz Engine’s pool. Misses go to your review queue.",
                            style = LectioText.prose(LectioText.callout), color = c.ink2,
                        )
                        LectioButton({ model.quizSession = QuizSessionRequest(pool.shuffled(), isReview = false) }, Modifier.fillMaxWidth(), prominent = true, enabled = pool.isNotEmpty()) {
                            ButtonLabel("Start", style = LectioText.headline)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContextEntry(card: ContextCard, topic: String?) {
    val c = Lectio.colors
    var open by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = !open }, verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                if (topic != null) QuietLabel(topic)
                Text(card.title, style = LectioText.prose(LectioText.title3), color = c.ink)
            }
            Symbol("chevron.down", tint = c.inkFaint, modifier = Modifier.rotate(if (open) 180f else 0f))
        }
        if (open) ContextBody(card)
        Hairline(Modifier.padding(top = 6.dp), color = c.hair)
    }
}

@Composable
private fun ContextBody(card: ContextCard) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(card.body, style = LectioText.prose(LectioText.body), color = c.ink)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            RubricLabel("Worth knowing cold")
            for (fact in card.keyFacts) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("·", color = c.rubric)
                Text(fact, style = LectioText.prose(LectioText.callout), color = c.ink2)
            }
        }
    }
}
