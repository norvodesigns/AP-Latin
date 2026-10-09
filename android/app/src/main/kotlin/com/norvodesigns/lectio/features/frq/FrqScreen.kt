package com.norvodesigns.lectio.features.frq

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.FrqPrompt
import com.norvodesigns.lectio.core.FrqRubrics
import com.norvodesigns.lectio.core.JSONObject
import com.norvodesigns.lectio.core.JSONValue
import com.norvodesigns.lectio.core.ProjectPassage
import com.norvodesigns.lectio.core.jobj
import com.norvodesigns.lectio.data.AIClient
import com.norvodesigns.lectio.ui.components.AIConsentHost
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Chip
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.Notice
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.SlipBlock
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.components.rememberAIGate
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import com.norvodesigns.lectio.util.clean
import com.norvodesigns.lectio.util.shortDate
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class FrqMode(val label: String) { Prompts("Prompts"), Project("Course Project") }

/**
 * Section II: five questions, 115 minutes, half the score (src/app/frq/FrqWorkshop.tsx).
 * Draft under a timer, then score yourself against the official rubric rows with a
 * strong sample beside you, or have the website's grader read it against the same rows.
 */
@Composable
fun FrqScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    var mode by remember { mutableStateOf(FrqMode.Prompts) }
    var selected by remember { mutableStateOf<String?>(null) }
    val prompt = selected?.let { id -> library.frqPrompts.firstOrNull { it.id == id } }
    if (prompt != null) {
        androidx.activity.compose.BackHandler { selected = null }
        FrqWorkspace(model, prompt) { selected = null }
        return
    }
    PageScaffold("FRQ Workshop") { padding ->
        LazyColumn(Modifier.padding(padding), horizontalAlignment = Alignment.CenterHorizontally, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            item { Box(Modifier.widthIn(max = 720.dp).fillMaxWidth().padding(bottom = 8.dp)) { Segmented(FrqMode.entries.map { it to it.label }, mode, { mode = it }) } }
            when (mode) {
                FrqMode.Prompts -> items(library.frqPrompts, key = { it.id }) { p ->
                    Column(Modifier.widthIn(max = 720.dp).fillMaxWidth()) {
                        Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { selected = p.id }.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            QuietLabel(library.meta.frqTypeLabels[p.type] ?: p.type)
                            Text(p.title, style = LectioText.prose(LectioText.headline), color = c.ink)
                            p.citation?.let { Text(it, style = LectioText.latin(16.sp), color = c.inkMuted) }
                            val points = p.rubric.sumOf { it.maxPoints }
                            Text(
                                "$points points · ~${p.minutes} min · ${p.subquestions.size} part${if (p.subquestions.size == 1) "" else "s"}",
                                style = LectioText.caption, color = c.inkFaint,
                            )
                        }
                        Hairline(color = c.hair)
                    }
                }
                FrqMode.Project -> item { Box(Modifier.widthIn(max = 720.dp).fillMaxWidth()) { CourseProject(model, library.frqRubrics) } }
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* One prompt                                                          */
/* ------------------------------------------------------------------ */

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FrqWorkspace(model: AppModel, prompt: FrqPrompt, onBack: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    val scope = rememberCoroutineScope()
    val gate = rememberAIGate(model)
    val answers = remember(prompt.id) { mutableStateMapOf<String, String>() }
    val selfScore = remember(prompt.id) { mutableStateMapOf<String, Double>() }
    var elapsed by remember(prompt.id) { mutableDoubleStateOf(0.0) }
    var runningSince by remember(prompt.id) { mutableLongStateOf(0L) }
    var now by remember(prompt.id) { mutableLongStateOf(System.currentTimeMillis()) }
    var showSample by remember(prompt.id) { mutableStateOf(false) }
    var saved by remember(prompt.id) { mutableStateOf(false) }
    var projectId by remember(prompt.id) { mutableStateOf<String?>(null) }
    var grading by remember { mutableStateOf(false) }
    var gradeError by remember { mutableStateOf<String?>(null) }
    var feedback by remember(prompt.id) { mutableStateOf<JSONValue?>(null) }
    var menu by remember { mutableStateOf(false) }

    val isProject = prompt.type == "project-prose" || prompt.type == "project-poetry"
    val wantedGenre = if (prompt.type == "project-poetry") "poetry" else "prose"
    val totalPoints = prompt.rubric.sumOf { it.maxPoints }
    val earned = selfScore.values.sum()
    val candidates = model.progress.projectPassages.filter { it.genre == wantedGenre }
    val project = candidates.firstOrNull { it.id == projectId } ?: candidates.firstOrNull()

    LaunchedEffect(Unit) { model.checkAI() }
    LaunchedEffect(runningSince) {
        while (runningSince != 0L) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }

    fun currentElapsed(): Double = elapsed + if (runningSince != 0L) (now - runningSince) / 1000.0 else 0.0

    val combined = prompt.subquestions.joinToString("\n\n") { (if (it.label.isEmpty()) "" else "${it.label}. ") + (answers[it.id] ?: "") }.trim()

    fun grade() {
        grading = true
        gradeError = null
        scope.launch {
            try {
                if (prompt.type == "short-answer") {
                    val a = JSONObject()
                    for ((k, v) in answers.entries.sortedBy { it.key }) a[k] = JSONValue.Str(v)
                    feedback = model.ai.post("grade-short-answer", jobj("promptId" to prompt.id, "answers" to JSONValue.Obj(a)))
                    model.update { it.recordAiCall("grade-short-answer") }
                } else {
                    val body = JSONObject("promptId" to JSONValue.Str(prompt.id), "essay" to JSONValue.Str(combined))
                    if (isProject && project != null) body["customPassage"] = jobj("citation" to project.citation, "latin" to project.latin)
                    feedback = model.ai.post("grade-essay", JSONValue.Obj(body))
                    model.update { it.recordAiCall("grade-essay") }
                }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: AIClient.Failure) {
                gradeError = e.message
            } catch (e: Exception) {
                gradeError = "Couldn’t reach the grader."
            } finally {
                grading = false
            }
        }
    }

    val t = currentElapsed()
    PageScaffold(
        prompt.title, onBack = onBack,
        actions = {
            Text(
                "%d:%02d".format(t.toLong() / 60, t.toLong() % 60), Modifier.semantics { contentDescription = "Time elapsed" },
                style = LectioText.figure(LectioText.headline), color = if (t > prompt.minutes * 60) c.incorrect else c.ink,
            )
            TextAction(if (runningSince != 0L) "Pause" else if (elapsed == 0.0) "Start (${prompt.minutes} min)" else "Resume", icon = if (runningSince != 0L) "pause" else "play") {
                if (runningSince != 0L) {
                    elapsed += (System.currentTimeMillis() - runningSince) / 1000.0
                    runningSince = 0L
                } else {
                    now = System.currentTimeMillis()
                    runningSince = now
                }
            }
        },
    ) { padding ->
        ScreenColumn(Modifier.padding(padding).imePadding(), maxWidth = 820.dp, spacing = 24.dp) {
            RubricLabel(library?.meta?.frqTypeLabels?.get(prompt.type) ?: "")
            Text(prompt.title, style = LectioText.prose(LectioText.title2).copy(fontWeight = FontWeight.SemiBold), color = c.ink)

            PassageSection(model, prompt, isProject, wantedGenre, candidates, project) { projectId = it }

            for (sq in prompt.subquestions) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Hairline()
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                        Text(
                            buildAnnotatedString {
                                withStyle(SpanStyle(color = c.inkFaint)) { append(sq.label) }
                                append(" ${sq.prompt}")
                            },
                            Modifier.weight(1f), style = LectioText.headline, color = c.ink,
                        )
                        QuietLabel("${sq.points} pt${if (sq.points == 1) "" else "s"}")
                    }
                    LectioTextField(
                        answers[sq.id] ?: "", { answers[sq.id] = it; saved = false },
                        minLines = if (prompt.type == "short-answer") 3 else 9, maxLines = 30, textStyle = LectioText.prose(LectioText.body),
                    )
                }
            }

            if (model.aiAvailable == true) {
                val disabled = grading || (if (prompt.type == "short-answer") answers.values.all { it.isEmpty() } else combined.length < 20 || (isProject && project == null))
                LectioButton({ gate.ask { grade() } }, Modifier.fillMaxWidth(), enabled = !disabled) {
                    if (grading) CircularProgressIndicator(Modifier.height(18.dp).width(18.dp), color = c.rubric, strokeWidth = 2.dp)
                    ButtonLabel(if (grading) "Grading…" else if (prompt.type == "short-answer") "Grade the set with AI" else "Grade against the rubric with AI")
                }
            }
            gradeError?.let { Notice("$it Self-scoring below works exactly the same.") }
            feedback?.let { if (prompt.type == "short-answer") ShortAnswerFeedback(it) else EssayFeedback(it) }

            // The rubric
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Official scoring guidelines", style = LectioText.prose(LectioText.headline), color = c.ink)
                        Text("From the CED. Score yourself honestly, row by row.", style = LectioText.footnote, color = c.inkMuted)
                    }
                    Text("${earned.clean()} / $totalPoints", style = LectioText.figure(LectioText.title2).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                }
                for (row in prompt.rubric) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Hairline(color = c.hair)
                        Text(row.label, style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                        Text(row.criteria, style = LectioText.footnote, color = c.inkMuted)
                        for (rule in row.decisionRules) Text("• $rule", style = LectioText.caption, color = c.inkFaint)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            for (n in 0..row.maxPoints) {
                                Chip("$n", selfScore[row.id] == n.toDouble(), Modifier.semantics { contentDescription = "$n point${if (n == 1) "" else "s"} for ${row.label}" }) {
                                    selfScore[row.id] = n.toDouble()
                                    saved = false
                                }
                            }
                        }
                    }
                }
            }

            // A strong sample
            SlipBlock(Modifier.animateContentSize()) {
                Row(Modifier.fillMaxWidth().clickable(role = Role.Button) { showSample = !showSample }, verticalAlignment = Alignment.CenterVertically) {
                    RubricLabel("A strong sample response", Modifier.weight(1f))
                    Text(if (showSample) "Hide" else "Show", style = LectioText.footnote, color = c.rubric)
                }
                if (showSample) {
                    androidx.compose.foundation.text.selection.SelectionContainer { Text(prompt.sampleResponse, style = LectioText.prose(LectioText.callout), color = c.ink) }
                    Hairline(color = c.hair)
                    Text(prompt.scoringNotes, style = LectioText.footnote, color = c.inkMuted)
                }
            }

            LectioButton(
                {
                    model.update {
                        it.saveFrq(null, prompt.id, answers.toMap(), selfScore.toMap(), Math.round(currentElapsed()).toDouble(), true)
                        it.markStudied()
                    }
                    model.reportActivity("self", earned, totalPoints.toDouble())
                    saved = true
                },
                Modifier.fillMaxWidth(), prominent = true, enabled = !saved && selfScore.isNotEmpty(),
            ) { ButtonLabel(if (saved) "Saved" else "Log this attempt (${earned.clean()}/$totalPoints)", style = LectioText.headline) }

            val prior = model.progress.frqResponses.filter { it.promptId == prompt.id }.takeLast(5).reversed()
            if (prior.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                RubricLabel("Previous attempts")
                for (r in prior) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(shortDate(r.at), style = LectioText.subheadline, color = c.inkFaint)
                    Text("${r.selfScore.values.sum().clean()}/$totalPoints", Modifier.weight(1f), style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                    Text("${Math.round(r.secondsSpent / 60)} min", style = LectioText.subheadline, color = c.inkFaint)
                }
            }
        }
    }
    AIConsentHost(gate)
}

@Composable
private fun PassageSection(
    model: AppModel, prompt: FrqPrompt, isProject: Boolean, wantedGenre: String, candidates: List<ProjectPassage>, project: ProjectPassage?, onPick: (String) -> Unit,
) {
    val c = Lectio.colors
    val library = model.content
    var menu by remember { mutableStateOf(false) }
    if (isProject) {
        if (candidates.isEmpty()) {
            Notice(
                "FRQ ${if (prompt.type == "project-prose") "4" else "5"} is always set on one of the passages you choose for the course project. Add your $wantedGenre passage under Course Project first.",
            )
        } else if (project != null) {
            SlipBlock {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    QuietLabel("Your $wantedGenre project passage", Modifier.weight(1f))
                    if (candidates.size > 1) Box {
                        TextAction("Change") { menu = true }
                        DropdownMenu(menu, { menu = false }, containerColor = c.slip) {
                            for (p in candidates) DropdownMenuItem(text = { Text(p.title.ifEmpty { p.citation }) }, onClick = { menu = false; onPick(p.id) })
                        }
                    }
                }
                Text("${project.author} — ${project.citation}", style = LectioText.footnote, color = c.inkMuted)
                Text(project.latin, style = LectioText.latin(20.sp), color = c.ink)
                Text("On FRQ 4 and 5, words outside the core vocabulary list are not glossed.", style = LectioText.caption, color = c.inkFaint)
            }
        }
    } else {
        val passage = prompt.passageId?.let { library?.passage(it) }
        if (passage != null) {
            RuledBlock {
                QuietLabel(prompt.citation ?: passage.citation)
                for (line in prompt.lines(passage)) Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                    Text("${line.n}", Modifier.width(28.dp).padding(top = 4.dp), style = LectioText.caption2.copy(fontFeatureSettings = "tnum", textAlign = androidx.compose.ui.text.style.TextAlign.End), color = c.inkFaint)
                    Text(line.latin, style = LectioText.latin(19.sp), color = c.ink)
                }
            }
        } else prompt.latin?.let { Text(it, style = LectioText.latin(20.sp), color = c.ink) }
    }
}

/* ------------------------------------------------------------------ */
/* AI feedback                                                          */
/* ------------------------------------------------------------------ */

private fun JSONValue?.num(): String = (this?.doubleValue ?: 0.0).clean()

@Composable
private fun EssayFeedback(data: JSONValue) {
    val c = Lectio.colors
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.sunk).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("AI feedback", style = LectioText.prose(LectioText.headline), color = c.ink)
        val uncited = data["uncitedClaims"]?.arrayValue ?: emptyList()
        if (uncited.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Claims with no Latin behind them — the commonest way points are lost", style = LectioText.caption.copy(fontWeight = FontWeight.SemiBold), color = c.incorrect)
            for (u in uncited) Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("“${u["claim"]?.stringValue ?: ""}”", style = LectioText.callout.copy(fontStyle = FontStyle.Italic), color = c.ink)
                Text(u["why"]?.stringValue ?: "", style = LectioText.footnote, color = c.inkMuted)
                Text(
                    buildAnnotatedString {
                        append("Try: ")
                        withStyle(SpanStyle(fontSize = 16.sp)) { append(u["suggestedEvidence"]?.stringValue ?: "") }
                    },
                    style = LectioText.footnote, color = c.ink,
                )
            }
        }
        val citations = data["citationCheck"]?.arrayValue ?: emptyList()
        if (citations.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            QuietLabel("Your citations, checked against the passage")
            for (ci in citations) {
                val accurate = ci["accurate"]?.boolValue ?: false
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(ci["quoted"]?.stringValue ?: "", style = LectioText.latin(16.sp), color = c.ink)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            ci["citedAs"]?.stringValue ?: "",
                            Modifier.clip(RoundedCornerShape(50)).background(if (accurate) c.partialWash else c.incorrectWash).padding(horizontal = 6.dp, vertical = 2.dp),
                            style = LectioText.caption, color = c.ink,
                        )
                        if (!accurate) Text(ci["note"]?.stringValue ?: "", style = LectioText.caption, color = c.inkMuted)
                    }
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            QuietLabel("Per dimension")
            for (d in data["dimensions"]?.arrayValue ?: emptyList()) Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(Modifier.fillMaxWidth()) {
                    Text(d["name"]?.stringValue ?: "", Modifier.weight(1f), style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Text("${d["earned"].num()}/${d["possible"].num()}", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                }
                Text(d["justification"]?.stringValue ?: "", style = LectioText.footnote, color = c.inkMuted)
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            QuietLabel("Two revisions")
            (data["revisions"]?.arrayValue ?: emptyList()).forEachIndexed { i, r -> Text("${i + 1}. ${r.stringValue ?: ""}", style = LectioText.footnote, color = c.ink2) }
            data["overall"]?.stringValue?.let { Text(it, Modifier.padding(top = 4.dp), style = LectioText.prose(LectioText.callout), color = c.ink2) }
        }
    }
}

@Composable
private fun ShortAnswerFeedback(data: JSONValue) {
    val c = Lectio.colors
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.sunk).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("AI feedback", Modifier.weight(1f), style = LectioText.prose(LectioText.headline), color = c.ink)
            Text("${data["totalEarned"].num()}/${data["totalPossible"].num()}", style = LectioText.figure(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
        }
        for (it in data["items"]?.arrayValue ?: emptyList()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                    Text(it["prompt"]?.stringValue ?: "", Modifier.weight(1f), style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Text("${it["earned"].num()}/${it["possible"].num()}", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                }
                Text(it["feedback"]?.stringValue ?: "", style = LectioText.footnote, color = c.inkMuted)
                Text("Full credit looks like: ${it["modelAnswer"]?.stringValue ?: ""}", style = LectioText.footnote, color = c.ink)
            }
            Hairline(color = c.hair)
        }
        val patterns = data["patterns"]?.arrayValue ?: emptyList()
        if (patterns.isNotEmpty()) {
            QuietLabel("Patterns across the set")
            for (p in patterns) Text("• ${p.stringValue ?: ""}", style = LectioText.footnote, color = c.ink2)
        }
    }
}

/* ------------------------------------------------------------------ */
/* Course project                                                       */
/* ------------------------------------------------------------------ */

/** The four passages a student chooses for the course project — two prose, two poetry. They become the passages FRQ 4 and 5 are set on here. */
@Composable
private fun CourseProject(model: AppModel, rubrics: FrqRubrics) {
    val c = Lectio.colors
    var editing by remember { mutableStateOf<ProjectPassage?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            "The course project is four passages you choose with your teacher — two prose, two poetry. Two are assessed on the exam as FRQ 4 and 5. Add them here and they become available in those workspaces.",
            style = LectioText.prose(LectioText.callout), color = c.ink2,
        )
        for (p in model.progress.projectPassages) {
            Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { editing = p }.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(p.title.ifEmpty { "Untitled" }, Modifier.weight(1f), style = LectioText.headline, color = c.ink)
                    QuietLabel(p.genre)
                }
                Text(listOf(p.author, p.citation).filter { it.isNotEmpty() }.joinToString(", "), style = LectioText.subheadline, color = c.inkMuted)
                Text(p.latin, style = LectioText.latin(16.sp), color = c.ink2, maxLines = 2)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    for ((label, text) in listOf("CP1" to p.checkpoint1, "CP2" to p.checkpoint2)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Symbol(if (text.isEmpty()) "circle" else "checkmark.circle.fill", tint = c.gilt, size = 16.dp)
                            Text(label, style = LectioText.caption, color = c.gilt)
                        }
                    }
                    Box(Modifier.weight(1f))
                    TextAction("Remove", tint = c.incorrect) { model.update { it.removeProjectPassage(p.id) } }
                }
            }
            Hairline(color = c.hair)
        }
        TextAction("Add a passage", icon = "plus") {
            editing = ProjectPassage(java.util.UUID.randomUUID().toString().take(8), "", "", "", "prose", "", "", "", "")
        }
    }
    editing?.let { ProjectEditor(model, it, rubrics) { editing = null } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProjectEditor(model: AppModel, initial: ProjectPassage, rubrics: FrqRubrics, onDismiss: () -> Unit) {
    val c = Lectio.colors
    var p by remember(initial.id) { mutableStateOf(initial) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.parchment) {
        Column(Modifier.fillMaxWidth().imePadding().navigationBarsPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                TextAction("Cancel", tint = c.inkMuted, onClick = onDismiss)
                Text(p.title.ifEmpty { "Project passage" }, Modifier.weight(1f), style = LectioText.prose(LectioText.headline), color = c.ink, maxLines = 1, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                TextAction("Save", enabled = p.latin.isNotBlank()) {
                    model.update { it.upsertProjectPassage(p) }
                    onDismiss()
                }
            }
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                RubricLabel("Passage")
                LectioTextField(p.title, { p = p.copy(title = it) }, placeholder = "Title", singleLine = true, textStyle = LectioText.prose(LectioText.body))
                LectioTextField(p.author, { p = p.copy(author = it) }, placeholder = "Author", singleLine = true, textStyle = LectioText.prose(LectioText.body))
                LectioTextField(p.citation, { p = p.copy(citation = it) }, placeholder = "Citation", singleLine = true, textStyle = LectioText.prose(LectioText.body))
                Segmented(listOf("prose" to "Prose", "poetry" to "Poetry"), p.genre, { p = p.copy(genre = it) })
                RubricLabel("Latin")
                LectioTextField(p.latin, { p = p.copy(latin = it) }, minLines = 5, maxLines = 14, textStyle = LectioText.latin(18.sp), autoCorrect = false)
                RubricLabel("Notes")
                LectioTextField(p.notes, { p = p.copy(notes = it) }, minLines = 3, maxLines = 8, textStyle = LectioText.prose(LectioText.body))
                RubricLabel("Checkpoint 1 — summary · 2 pts")
                LectioTextField(p.checkpoint1, { p = p.copy(checkpoint1 = it) }, minLines = 4, maxLines = 10, textStyle = LectioText.prose(LectioText.body))
                Text(rubrics.checkpoint1.firstOrNull()?.criteria ?: "", style = LectioText.footnote, color = c.inkMuted)
                RubricLabel("Checkpoint 2 — interpretation · 3 pts")
                LectioTextField(p.checkpoint2, { p = p.copy(checkpoint2 = it) }, minLines = 4, maxLines = 10, textStyle = LectioText.prose(LectioText.body))
                Text(rubrics.checkpoint2.firstOrNull()?.criteria ?: "", style = LectioText.footnote, color = c.inkMuted)
            }
        }
    }
}
