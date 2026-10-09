package com.norvodesigns.lectio.features.quiz

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.core.Question
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

enum class QuizAuthor(val label: String) {
    All("All authors"), Vergil("Vergil"), Pliny("Pliny"), Sight("Sight (no syllabus passage)"),
}

/** Filters for a practice set: the web Quiz Engine's, one for one. */
data class QuizFilters(
    val author: QuizAuthor = QuizAuthor.All,
    val passageId: String? = null,
    val unit: String? = null,
    val skill: String? = null,
    val types: Set<String> = emptySet(),
    val count: Int = 10,
) {
    fun matches(q: Question, passage: (String) -> Passage?): Boolean {
        if (q.type !in types) return false
        if (skill != null && q.skillCategory != skill) return false
        if (unit != null && q.unit != unit) return false
        if (passageId != null && q.passageId != passageId) return false
        return when (author) {
            QuizAuthor.All -> true
            QuizAuthor.Sight -> q.passageId == null
            QuizAuthor.Vergil, QuizAuthor.Pliny -> q.passageId?.let(passage)?.author == author.name.lowercase()
        }
    }
}

/**
 * Configurable AP-style multiple choice: build a set, answer it with an
 * explanation after every question, and anything missed goes to a review queue
 * that clears as you get each one right.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun QuizScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var filters by remember { mutableStateOf(QuizFilters(types = library.meta.questionTypeLabels.keys)) }

    // A weak spot on Today opens the Quiz narrowed to that question type.
    LaunchedEffect(model.quizPresetType) {
        model.quizPresetType?.let {
            filters = QuizFilters(types = setOf(it))
            model.quizPresetType = null
        }
    }

    val pool = remember(filters, library) { library.questions.filter { filters.matches(it, library::passage) } }
    val reviewPool = model.progress.reviewQueue.mapNotNull(library::question)
    val withQuestions = remember(library) { library.questions.mapNotNullTo(HashSet()) { it.passageId } }
    val passages = library.passages.filter { it.id in withQuestions }
        .filter { filters.author == QuizAuthor.All || filters.author == QuizAuthor.Sight || it.author == filters.author.name.lowercase() }

    PageScaffold("Quiz Engine") { padding ->
        ScreenColumn(Modifier.padding(padding), spacing = 24.dp) {
            Text(
                "Build a set filtered by author, passage, unit, skill or question type. Every question explains its answer, and missed ones go to your review queue.",
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
            if (reviewPool.isNotEmpty()) {
                LectioButton({ model.quizSession = QuizSessionRequest(reviewPool, isReview = true) }, Modifier.fillMaxWidth()) {
                    ButtonLabel("Review what you missed (${reviewPool.size})", "arrow.uturn.backward")
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                RubricLabel("Source", Modifier.padding(bottom = 6.dp))
                FilterRow {
                    MenuPicker("Author", QuizAuthor.entries.map { it to it.label }, filters.author, { filters = filters.copy(author = it, passageId = null) })
                }
                FilterRow {
                    MenuPicker(
                        "Passage", listOf<Pair<String?, String>>(null to "Any passage") + passages.map { it.id to it.citation }, filters.passageId,
                        { filters = filters.copy(passageId = it) },
                    )
                }
                RubricLabel("Scope", Modifier.padding(top = 16.dp, bottom = 6.dp))
                FilterRow {
                    MenuPicker(
                        "Unit", listOf<Pair<String?, String>>(null to "All units") + library.meta.unitTitles.keys.sorted().map { it to "Unit $it" }, filters.unit,
                        { filters = filters.copy(unit = it) },
                    )
                }
                FilterRow {
                    MenuPicker(
                        "Skill",
                        listOf<Pair<String?, String>>(null to "All skills", "1" to "1 — Read and comprehend", "2" to "2 — Style and context", "3" to "3 — Analyse with evidence"),
                        filters.skill, { filters = filters.copy(skill = it) },
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    RubricLabel("Question types", Modifier.weight(1f))
                    TextAction("All") { filters = filters.copy(types = library.meta.questionTypeLabels.keys) }
                    TextAction("None") { filters = filters.copy(types = emptySet()) }
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    for ((type, label) in library.meta.questionTypeLabels.entries.sortedBy { it.value }) {
                        val on = type in filters.types
                        val n = library.questions.count { it.type == type }
                        Chip("$label  $n", on) { filters = filters.copy(types = if (on) filters.types - type else filters.types + type) }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                RubricLabel("Set length")
                Segmented(listOf(5 to "5", 10 to "10", 20 to "20", 52 to "52 · full"), filters.count, { filters = filters.copy(count = it) })
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                LectioButton(
                    { model.quizSession = QuizSessionRequest(pool.shuffled().take(filters.count), isReview = false) },
                    Modifier.fillMaxWidth(), prominent = true, enabled = pool.isNotEmpty(),
                ) { ButtonLabel(if (pool.isEmpty()) "No matching questions" else "Start set", style = LectioText.headline) }
                QuietLabel(if (pool.isEmpty()) "Widen the type or scope selection." else "${pool.size} question${if (pool.size == 1) "" else "s"} match")
            }
        }
    }
}

@Composable
private fun FilterRow(content: @Composable () -> Unit) {
    Column {
        content()
        Hairline(color = Lectio.colors.hair)
    }
}
