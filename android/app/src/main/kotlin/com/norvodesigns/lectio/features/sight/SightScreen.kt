package com.norvodesigns.lectio.features.sight

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.GlossNote
import com.norvodesigns.lectio.core.Question
import com.norvodesigns.lectio.core.QuestionOption
import com.norvodesigns.lectio.core.SightPassage
import com.norvodesigns.lectio.core.jobj
import com.norvodesigns.lectio.data.AIClient
import com.norvodesigns.lectio.recordQuiz
import com.norvodesigns.lectio.ui.components.AIConsentHost
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.Notice
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.rememberAIGate
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import com.norvodesigns.lectio.util.wordCount
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** One sight passage ready to attempt: a vetted one from the course, or one the website's generator just selected. */
data class SightItem(
    val id: String, val title: String, val subtitle: String, val genre: String, val latin: String, val gloss: List<GlossNote>,
    val summary: String, val source: String, val questions: List<Question>, val machineSelected: Boolean, val confidence: String?, val cached: Boolean,
)

/** Timed unseen passages (src/app/sight/SightReading.tsx). Half of the exam's multiple choice is sight reading. */
@Composable
fun SightScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    val gate = rememberAIGate(model)
    var author by remember { mutableStateOf("Nepos") }
    var genre by remember { mutableStateOf("prose") }
    var variant by remember { mutableIntStateOf(0) }
    var generating by remember { mutableStateOf(false) }
    var generateError by remember { mutableStateOf<String?>(null) }
    var open by remember { mutableStateOf<SightItem?>(null) }

    LaunchedEffect(Unit) { model.checkAI() }

    fun item(p: SightPassage) = SightItem(
        p.id, p.citation, "${p.author}, ${p.work}", p.genre, p.latin, p.gloss, p.summary, p.source,
        p.questionIds.mapNotNull(library::question), p.machineSelected ?: false, null, false,
    )

    fun generate() {
        generating = true
        generateError = null
        scope.launch {
            try {
                val g = model.ai.post("generate-sight", jobj("author" to author, "genre" to genre, "variant" to variant, "questionCount" to 4))
                model.update { it.recordAiCall("generate-sight") }
                variant++
                val questions = (g["questions"]?.arrayValue ?: emptyList()).mapIndexed { i, q ->
                    Question(
                        id = "gen-$i", type = q["type"]?.stringValue ?: "inference", skill = "1.B", skillCategory = "1",
                        prompt = q["prompt"]?.stringValue ?: "",
                        options = (q["options"]?.arrayValue ?: emptyList()).map { QuestionOption(it["id"]?.stringValue ?: "", it["text"]?.stringValue ?: "") },
                        answerId = q["answerId"]?.stringValue ?: "", explanation = q["explanation"]?.stringValue ?: "", unit = "1", difficulty = 2,
                    )
                }
                open = SightItem(
                    "generated-$variant", g["citation"]?.stringValue ?: "Sight passage",
                    "${g["author"]?.stringValue ?: author}, ${g["work"]?.stringValue ?: ""}", g["genre"]?.stringValue ?: genre, g["latin"]?.stringValue ?: "",
                    (g["gloss"]?.arrayValue ?: emptyList()).map { GlossNote(it["word"]?.stringValue ?: "", it["meaning"]?.stringValue ?: "") },
                    g["summary"]?.stringValue ?: "", "Machine-selected — not vetted", questions, true, g["confidence"]?.stringValue,
                    g["_meta"]?.get("cached")?.boolValue ?: false,
                )
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: AIClient.Failure) {
                generateError = e.message
            } catch (e: Exception) {
                generateError = "Couldn’t reach the generator. The vetted passages still work."
            } finally {
                generating = false
            }
        }
    }

    val current = open
    if (current != null) {
        androidx.activity.compose.BackHandler { open = null }
        SightAttempt(model, current) { open = null }
        return
    }

    PageScaffold("Sight Reading") { padding ->
        LazyColumn(Modifier.padding(padding), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 8.dp)) {
            item {
                Text(
                    "Unseen passages from the authors the CED names for sight practice. Read it cold, answer the questions, then check the summary.",
                    Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(bottom = 16.dp), style = LectioText.prose(LectioText.callout), color = c.ink2,
                )
                RubricLabel("Vetted passages", Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(bottom = 4.dp))
            }
            items(library.sightPassages, key = { it.id }) { p ->
                Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = item(p) }.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(p.citation, style = LectioText.latin(20.sp), color = c.ink)
                        Text("${p.author}, ${p.work}", style = LectioText.prose(LectioText.subheadline), color = c.inkMuted)
                        QuietLabel("${p.genre} · ${wordCount(p.latin)} words · ${p.questionIds.size} questions")
                    }
                    Hairline(color = c.hair)
                }
            }
            item {
                Column(Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    RubricLabel("Generate a new passage")
                    if (model.aiAvailable == false) {
                        Text(
                            "No AI provider is configured, so passage generation is off. The vetted passages above work exactly the same.",
                            style = LectioText.prose(LectioText.callout), color = c.ink2,
                        )
                    } else {
                        Text(
                            "The model selects a genuine public-domain passage rather than composing Latin, with glosses and AP-style questions. Generated passages are always labelled machine-selected — nobody has checked them against a printed text.",
                            style = LectioText.footnote, color = c.inkMuted,
                        )
                        MenuPicker("Author", library.sightAuthors.map { it to it }, author, { author = it })
                        Segmented(listOf("prose" to "Prose", "poetry" to "Poetry"), genre, { genre = it })
                        LectioButton({ gate.ask { generate() } }, Modifier.fillMaxWidth(), prominent = true, enabled = !generating) {
                            if (generating) CircularProgressIndicator(Modifier.height(20.dp).width(20.dp), color = c.onRubric, strokeWidth = 2.dp)
                            ButtonLabel(if (generating) "Selecting…" else "Generate", style = LectioText.headline)
                        }
                        generateError?.let { Text(it, style = LectioText.footnote, color = c.ink2) }
                    }
                }
            }
        }
    }
    AIConsentHost(gate)
}

/** Read cold against the clock, answer, then check. */
@Composable
private fun SightAttempt(model: AppModel, item: SightItem, onBack: () -> Unit) {
    val c = Lectio.colors
    var startedAt by remember(item.id) { mutableLongStateOf(0L) }
    var finishedAt by remember(item.id) { mutableLongStateOf(0L) }
    var now by remember(item.id) { mutableLongStateOf(System.currentTimeMillis()) }
    val answers = remember(item.id) { mutableStateMapOf<String, String>() }
    var showSummary by remember(item.id) { mutableStateOf(false) }
    val submitted = finishedAt != 0L

    LaunchedEffect(startedAt, submitted) {
        while (startedAt != 0L && !submitted) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }

    fun submit() {
        if (startedAt == 0L) startedAt = System.currentTimeMillis()
        finishedAt = System.currentTimeMillis()
        model.update { it.markStudied() }
        for (q in item.questions) {
            val chosen = answers[q.id] ?: continue
            model.recordQuiz(q, chosen, 0.0)
        }
    }

    val elapsed = if (startedAt == 0L) 0L else ((if (submitted) finishedAt else now) - startedAt) / 1000
    PageScaffold(
        item.title, onBack = onBack,
        actions = {
            if (startedAt != 0L) {
                Text("%d:%02d".format(elapsed / 60, elapsed % 60), Modifier.padding(end = 16.dp), style = LectioText.figure(LectioText.headline), color = c.rubric)
            } else {
                com.norvodesigns.lectio.ui.components.TextAction("Start the clock", icon = "timer") {
                    startedAt = System.currentTimeMillis()
                    now = startedAt
                }
            }
        },
    ) { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 760.dp, spacing = 22.dp) {
            RubricLabel(item.subtitle)
            if (item.machineSelected) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.partialWash).padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("MACHINE-SELECTED", style = LectioText.rubricLabel, color = c.gilt)
                    Text(
                        "A model chose and reproduced this passage; nobody has checked it against a printed text. Verify the Latin before trusting it, and treat the questions as practice." +
                            (item.confidence?.let { " The model rated its own confidence $it." } ?: "") + if (item.cached) " Served from cache — no quota was used." else "",
                        style = LectioText.footnote, color = c.ink2,
                    )
                }
            }
            RuledBlock {
                SelectionContainer { Text(item.latin, style = LectioText.latin(21.sp), color = c.ink) }
                if (item.gloss.isNotEmpty()) {
                    Hairline(color = c.redLine)
                    for (g in item.gloss) {
                        Text(
                            buildAnnotatedString {
                                withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(g.word) }
                                append(" — ${g.meaning}")
                            },
                            style = LectioText.latin(16.sp), color = c.ink2,
                        )
                    }
                }
                Text(item.source, style = LectioText.caption, color = c.inkFaint)
            }
            item.questions.forEachIndexed { i, q ->
                SightQuestion(i + 1, q, answers[q.id], submitted) { answers[q.id] = it }
            }
            if (submitted) {
                val correct = item.questions.count { answers[it.id] == it.answerId }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("$correct of ${item.questions.size} correct", style = LectioText.prose(LectioText.title2).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    if (showSummary) {
                        RubricLabel("Summary")
                        Text(item.summary, style = LectioText.prose(LectioText.body), color = c.ink)
                    } else {
                        LectioButton({ showSummary = true }) { ButtonLabel("Reveal the English summary") }
                    }
                }
            } else {
                LectioButton({ submit() }, Modifier.fillMaxWidth(), prominent = true, enabled = answers.isNotEmpty()) { ButtonLabel("Check answers", style = LectioText.headline) }
            }
        }
    }
}

@Composable
private fun SightQuestion(number: Int, question: Question, chosen: String?, submitted: Boolean, onChoose: (String) -> Unit) {
    val c = Lectio.colors
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Hairline()
        Text("$number. ${question.prompt}", style = LectioText.prose(LectioText.body).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
        for (option in question.options) {
            val isAnswer = option.id == question.answerId
            val isChosen = option.id == chosen
            val wash = when {
                submitted && isAnswer -> c.correctWash
                submitted && isChosen -> c.incorrectWash
                else -> androidx.compose.ui.graphics.Color.Transparent
            }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(wash)
                    .clickable(enabled = !submitted, role = Role.RadioButton) { onChoose(option.id) }.padding(vertical = 8.dp, horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically,
            ) {
                Symbol(if (isChosen) "largecircle.fill.circle" else "circle", tint = if (isChosen) c.rubric else c.inkFaint, size = 20.dp)
                Text(option.text, Modifier.weight(1f), style = LectioText.latin(17.sp), color = c.ink)
                if (submitted && isAnswer) Symbol("checkmark", tint = c.correct, size = 20.dp)
            }
        }
        if (submitted) Text(question.explanation, style = LectioText.prose(LectioText.callout), color = c.ink2)
    }
}
