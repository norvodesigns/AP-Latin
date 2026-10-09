package com.norvodesigns.lectio.features.exam

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.ContentLibrary
import com.norvodesigns.lectio.core.FrqPrompt
import com.norvodesigns.lectio.core.Question
import com.norvodesigns.lectio.core.Tally
import com.norvodesigns.lectio.notifications.ExamNotification
import com.norvodesigns.lectio.notifications.rememberNotificationPermission
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.CoverScaffold
import com.norvodesigns.lectio.ui.components.Figure
import com.norvodesigns.lectio.ui.components.FigureRow
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.RuledBlock
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.SlipBlock
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import com.norvodesigns.lectio.util.clean
import com.norvodesigns.lectio.util.longDate
import kotlinx.coroutines.delay

/** The paper for one sitting: 52 multiple choice and one free-response prompt of each type. */
class ExamPaper(val mcq: List<Question>, val frqs: List<FrqPrompt>) {
    companion object {
        const val MCQ_COUNT = 52
        const val MCQ_SECONDS = 65.0 * 60
        const val FRQ_SECONDS = 115.0 * 60

        fun build(library: ContentLibrary): ExamPaper {
            val pool = (library.questions + library.sightQuestions).shuffled()
            val paper = ArrayList<Question>()
            while (paper.size < MCQ_COUNT && pool.isNotEmpty()) paper += pool.take(MCQ_COUNT - paper.size)
            return ExamPaper(paper.take(MCQ_COUNT), library.examPrompts())
        }
    }
}

/** The real thing, end to end (src/app/exam/PracticeExam.tsx): 52 multiple choice in 65 minutes, then five free responses in 115, then a report. */
@Composable
fun ExamScreen(model: AppModel) {
    val library = model.content ?: return
    val c = Lectio.colors
    PageScaffold("Practice Exam") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 720.dp, spacing = 22.dp) {
            Text(
                "52 multiple-choice questions in 65 minutes, then five free-response questions in 115. Section timers, typed responses, and a scored report broken down by skill and question type.",
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
            SlipBlock {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Section I — Multiple Choice", Modifier.weight(1f), style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Text("52 questions · 65 min · 50%", style = LectioText.subheadline, color = c.ink2)
                }
                Hairline()
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Section II — Free Response", Modifier.weight(1f), style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    Text("5 questions · 115 min · 50%", style = LectioText.subheadline, color = c.ink2)
                }
            }
            val pool = library.questions.size + library.sightQuestions.size
            if (pool < 52) Text(
                "The question bank holds $pool items, so some of the 52 slots repeat a question. The timing rehearsal is still realistic; the accuracy figure less so.",
                style = LectioText.footnote, color = c.inkMuted,
            )
            LectioButton({ model.examPaper = ExamPaper.build(library) }, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Begin Section I", style = LectioText.headline) }
            val past = model.progress.examResults.takeLast(5).reversed()
            if (past.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RubricLabel("Previous exams")
                for (r in past) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(longDate(r.at), Modifier.weight(1f), style = LectioText.subheadline, color = c.inkFaint)
                    Text("MCQ ${r.mcqCorrect}/${r.mcqTotal} · FRQ ${r.frqPoints.clean()}/${r.frqMax.clean()}", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                }
            }
        }
    }
}

private enum class Stage { Mcq, Rest, Frq, Report }

/** One sitting: Section I, a break, Section II, the report. */
@Composable
fun ExamSession(model: AppModel, paper: ExamPaper, onClose: () -> Unit) {
    val c = Lectio.colors
    val context = LocalContext.current.applicationContext
    var stage by remember(paper) { mutableStateOf(Stage.Mcq) }
    var cursor by remember(paper) { mutableIntStateOf(0) }
    val answers = remember(paper) { mutableStateMapOf<Int, String>() }
    val flagged = remember(paper) { mutableStateListOf<Int>() }
    var mcqStart by remember(paper) { mutableLongStateOf(System.currentTimeMillis()) }
    var mcqUsed by remember(paper) { mutableLongStateOf(0L) }
    var frqStart by remember(paper) { mutableLongStateOf(0L) }
    var frqUsed by remember(paper) { mutableLongStateOf(0L) }
    val frqAnswers = remember(paper) { mutableStateMapOf<String, String>() }
    val frqScores = remember(paper) { mutableStateMapOf<String, Double>() }
    var saved by remember(paper) { mutableStateOf(false) }
    var confirmQuit by remember(paper) { mutableStateOf(false) }
    var now by remember(paper) { mutableLongStateOf(System.currentTimeMillis()) }

    val askPermission = rememberNotificationPermission { }

    val frqDone = paper.frqs.count { p -> p.subquestions.any { !frqAnswers["${p.id}:${it.id}"].isNullOrBlank() } }

    fun tallies(): Triple<Int, Map<String, Tally>, Map<String, Tally>> {
        var correct = 0
        val bySkill = linkedMapOf("1" to Tally(0, 0), "2" to Tally(0, 0), "3" to Tally(0, 0))
        val byType = LinkedHashMap<String, Tally>()
        paper.mcq.forEachIndexed { i, q ->
            val ok = answers[i] == q.answerId
            if (ok) correct++
            val s = bySkill[q.skillCategory] ?: Tally(0, 0)
            bySkill[q.skillCategory] = Tally(s.correct + if (ok) 1 else 0, s.total + 1)
            val t = byType[q.type] ?: Tally(0, 0)
            byType[q.type] = Tally(t.correct + if (ok) 1 else 0, t.total + 1)
        }
        return Triple(correct, bySkill, byType)
    }
    val frqMax = paper.frqs.sumOf { p -> p.rubric.sumOf { it.maxPoints } }.toDouble()
    val frqPoints = frqScores.values.sum()

    /** Records the sitting once, with Section II's scores if they've been entered, so leaving the report never loses the multiple-choice result. */
    fun saveIfNeeded() {
        if (saved) return
        val (correct, bySkill, byType) = tallies()
        model.update {
            it.recordExam(correct, paper.mcq.size, frqPoints, frqMax, bySkill, byType, Math.round(mcqUsed / 1000.0).toDouble(), Math.round(frqUsed / 1000.0).toDouble())
            it.markStudied()
        }
        model.reportActivity("auto", correct.toDouble(), paper.mcq.size.toDouble())
        saved = true
    }

    fun finish() {
        if (stage == Stage.Report) return
        if (stage == Stage.Mcq) mcqUsed = minOf((ExamPaper.MCQ_SECONDS * 1000).toLong(), System.currentTimeMillis() - mcqStart)
        if (stage == Stage.Frq) frqUsed = minOf((ExamPaper.FRQ_SECONDS * 1000).toLong(), System.currentTimeMillis() - frqStart)
        stage = Stage.Report
        ExamNotification.end(context)
    }

    fun endSectionI() {
        if (stage != Stage.Mcq) return
        mcqUsed = minOf((ExamPaper.MCQ_SECONDS * 1000).toLong(), System.currentTimeMillis() - mcqStart)
        stage = Stage.Rest
        ExamNotification.end(context)
    }

    LaunchedEffect(paper) {
        askPermission()
        model.update { it.markStudied() }
        mcqStart = System.currentTimeMillis()
        ExamNotification.start(context, "Section I", "Multiple choice", mcqStart + (ExamPaper.MCQ_SECONDS * 1000).toLong(), paper.mcq.size)
    }
    LaunchedEffect(answers.size) { if (stage == Stage.Mcq) ExamNotification.update(context, answers.size) }
    LaunchedEffect(frqDone) { if (stage == Stage.Frq) ExamNotification.update(context, frqDone) }
    DisposableEffect(paper) { onDispose { ExamNotification.end(context) } }
    LaunchedEffect(stage) {
        while (stage == Stage.Mcq || stage == Stage.Frq) {
            now = System.currentTimeMillis()
            val left = when (stage) {
                Stage.Mcq -> ExamPaper.MCQ_SECONDS * 1000 - (now - mcqStart)
                else -> ExamPaper.FRQ_SECONDS * 1000 - (now - frqStart)
            }
            if (left <= 0) {
                if (stage == Stage.Mcq) endSectionI() else finish()
                break
            }
            delay(500)
        }
    }

    val closeAction = {
        if (stage == Stage.Report) {
            saveIfNeeded()
            onClose()
        } else confirmQuit = true
    }

    CoverScaffold(
        closeAction, title = "", closeLabel = if (stage == Stage.Report) "Done" else "Leave",
        actions = {
            val (label, left) = when (stage) {
                Stage.Mcq -> "Section I" to ExamPaper.MCQ_SECONDS - (now - mcqStart) / 1000.0
                Stage.Frq -> "Section II" to ExamPaper.FRQ_SECONDS - (now - frqStart) / 1000.0
                else -> "" to 0.0
            }
            if (label.isNotEmpty()) {
                val s = maxOf(0.0, left).toLong()
                Column(Modifier.padding(end = 16.dp).semantics(mergeDescendants = true) { contentDescription = "$label, ${s / 60} minutes ${s % 60} seconds left" }, horizontalAlignment = Alignment.End) {
                    Text(label, style = LectioText.caption2, color = c.inkMuted)
                    Text("%d:%02d".format(s / 60, s % 60), style = LectioText.figure(LectioText.headline), color = if (s < 600) c.incorrect else c.ink)
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (stage) {
                Stage.Mcq -> McqStage(model, paper, cursor, { cursor = it }, answers, flagged) { endSectionI() }
                Stage.Rest -> RestStage(answers.size, paper.mcq.size, onBegin = {
                    frqStart = System.currentTimeMillis()
                    now = frqStart
                    stage = Stage.Frq
                    ExamNotification.start(context, "Section II", "Free response", frqStart + (ExamPaper.FRQ_SECONDS * 1000).toLong(), paper.frqs.size)
                }, onSkip = { finish() })
                Stage.Frq -> FrqStage(model, paper, frqAnswers) { finish() }
                Stage.Report -> {
                    val (correct, bySkill, byType) = tallies()
                    ReportStage(model, paper, answers, correct, bySkill, byType, frqScores, frqPoints, frqMax, saved) { saveIfNeeded() }
                }
            }
        }
    }

    if (confirmQuit) AlertDialog(
        onDismissRequest = { confirmQuit = false },
        title = { Text("Leave the exam?") },
        text = { Text("You can score what you’ve done so far, or leave without saving anything.") },
        confirmButton = { TextButton({ confirmQuit = false; finish() }) { Text("Score what I’ve done") } },
        dismissButton = { TextButton({ confirmQuit = false; onClose() }) { Text("Leave without scoring", color = c.incorrect) } },
        containerColor = c.slip,
    )
}

/* ------------------------------------------------------------------ */
/* Section I                                                            */
/* ------------------------------------------------------------------ */

@Composable
private fun McqStage(
    model: AppModel, paper: ExamPaper, cursor: Int, onCursor: (Int) -> Unit, answers: MutableMap<Int, String>, flagged: MutableList<Int>, onEnd: () -> Unit,
) {
    val c = Lectio.colors
    val q = paper.mcq[cursor]
    val strip = rememberLazyListState()
    LaunchedEffect(cursor) { strip.animateScrollToItem(maxOf(0, cursor - 3)) }
    Column(Modifier.fillMaxSize()) {
        LazyRow(state = strip, contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            itemsIndexed(paper.mcq) { i, _ ->
                Box(
                    Modifier.size(34.dp).clip(CircleShape)
                        .background(if (i == cursor) c.rubric else if (answers[i] != null) c.sunk else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable(role = Role.Button) { onCursor(i) }
                        .semantics { contentDescription = "Question ${i + 1}${if (answers[i] != null) ", answered" else ""}${if (i in flagged) ", flagged" else ""}" },
                    contentAlignment = Alignment.Center,
                ) {
                    Text("${i + 1}", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = if (i == cursor) c.onRubric else c.ink)
                    if (i in flagged) Box(Modifier.align(Alignment.TopEnd).size(8.dp).clip(CircleShape).background(c.gilt))
                }
            }
        }
        Hairline()
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 760.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                ExamStimulus(model, q)
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                    Text("${cursor + 1}. ${q.prompt}", Modifier.weight(1f), style = LectioText.prose(LectioText.title3).copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    IconButton({ if (cursor in flagged) flagged.remove(cursor) else flagged.add(cursor) }) {
                        Symbol(if (cursor in flagged) "flag.fill" else "flag", tint = c.gilt, contentDescription = if (cursor in flagged) "Unflag" else "Flag")
                    }
                }
                q.options.forEachIndexed { i, o ->
                    val chosen = answers[cursor] == o.id
                    androidx.compose.material3.Surface(
                        Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = if (chosen) c.sunk else c.slip,
                        border = androidx.compose.foundation.BorderStroke(if (chosen) 1.dp else 0.5.dp, if (chosen) c.rubric else c.ruleStrong),
                    ) {
                        Row(
                            Modifier.clickable(role = Role.RadioButton) { answers[cursor] = o.id }.padding(14.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("${i + 1}", style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkMuted)
                            Text(o.text, Modifier.weight(1f), style = LectioText.latin(18.sp), color = c.ink)
                            if (chosen) Symbol("largecircle.fill.circle", tint = c.rubric)
                        }
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            LectioButton({ onCursor(cursor - 1) }, enabled = cursor > 0) { ButtonLabel("Previous") }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) { QuietLabel("${answers.size} of ${paper.mcq.size} answered") }
            if (cursor < paper.mcq.size - 1) LectioButton({ onCursor(cursor + 1) }, prominent = true) { ButtonLabel("Next") }
            else LectioButton(onEnd, prominent = true) { ButtonLabel("End Section I") }
        }
    }
}

@Composable
private fun ExamStimulus(model: AppModel, question: Question) {
    val c = Lectio.colors
    val library = model.content
    val passage = question.passageId?.let { library?.passage(it) }
    val lines = remember(question) {
        val r = question.lineRange
        if (passage == null || r == null || r.size != 2) emptyList() else passage.lines.filter { it.n >= r[0] && it.n <= r[1] }
    }
    val stimulus = question.stimulus
    if (lines.isEmpty() && stimulus == null) return
    RuledBlock {
        QuietLabel(stimulus?.citation ?: passage?.citation ?: "")
        if (lines.isNotEmpty()) for (l in lines) Text(l.latin, style = LectioText.latin(19.sp), color = c.ink)
        else if (stimulus != null) Text(stimulus.latin, style = LectioText.latin(19.sp), color = c.ink)
    }
}

@Composable
private fun RestStage(answered: Int, total: Int, onBegin: () -> Unit, onSkip: () -> Unit) {
    val c = Lectio.colors
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(Modifier.widthIn(max = 640.dp).padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            RubricLabel("Section I complete")
            Text("Take a breath", style = LectioText.prose(LectioText.largeTitle), color = c.ink)
            Text(
                "You answered $answered of $total questions. Section II is five free-response questions in 115 minutes. Scores aren’t shown until the whole exam is finished — that’s how the real one feels.",
                style = LectioText.prose(LectioText.body), color = c.ink2,
            )
            LectioButton(onBegin, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Begin Section II", style = LectioText.headline) }
            TextAction("Skip Section II and score now", Modifier.align(Alignment.CenterHorizontally), onClick = onSkip)
        }
    }
}

/* ------------------------------------------------------------------ */
/* Section II                                                           */
/* ------------------------------------------------------------------ */

@Composable
private fun FrqStage(model: AppModel, paper: ExamPaper, answers: MutableMap<String, String>, onFinish: () -> Unit) {
    val c = Lectio.colors
    val library = model.content
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 820.dp).fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(28.dp)) {
            for (p in paper.frqs) Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Hairline()
                QuietLabel(library?.meta?.frqTypeLabels?.get(p.type) ?: p.type)
                Row(Modifier.fillMaxWidth()) {
                    Text(p.title, Modifier.weight(1f), style = LectioText.prose(LectioText.headline), color = c.ink)
                    Text("~${p.minutes} min", style = LectioText.caption, color = c.inkMuted)
                }
                val passage = p.passageId?.let { library?.passage(it) }
                if (p.latin != null) {
                    Text(p.latin!!, Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.sunk).padding(12.dp), style = LectioText.latin(17.sp), color = c.ink)
                } else if (passage != null) {
                    // The lines the prompt is set on, not the head of the passage.
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.sunk).padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        for (line in p.lines(passage)) Text(line.latin, style = LectioText.latin(17.sp), color = c.ink)
                    }
                }
                for (sq in p.subquestions) {
                    Text(
                        buildAnnotatedString {
                            withStyle(SpanStyle(color = c.inkFaint)) { append(sq.label) }
                            append(" ${sq.prompt}")
                        },
                        style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink,
                    )
                    val key = "${p.id}:${sq.id}"
                    LectioTextField(answers[key] ?: "", { answers[key] = it }, minLines = if (sq.points > 3) 7 else 3, maxLines = 30, textStyle = LectioText.prose(LectioText.body))
                }
            }
            LectioButton(onFinish, Modifier.fillMaxWidth(), prominent = true) { ButtonLabel("Finish and score", style = LectioText.headline) }
        }
    }
}

/* ------------------------------------------------------------------ */
/* Report                                                               */
/* ------------------------------------------------------------------ */

@Composable
private fun ReportStage(
    model: AppModel, paper: ExamPaper, answers: Map<Int, String>, correct: Int, bySkill: Map<String, Tally>, byType: Map<String, Tally>,
    frqScores: MutableMap<String, Double>, frqPoints: Double, frqMax: Double, saved: Boolean, onSave: () -> Unit,
) {
    val c = Lectio.colors
    val library = model.content
    var review by remember { mutableStateOf(false) }
    val pct = if (paper.mcq.isEmpty()) 0 else Math.round(correct.toDouble() / paper.mcq.size * 100).toInt()
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 760.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(26.dp)) {
            RubricLabel("Scored report")
            FigureRow(spacing = 30.dp) {
                Figure("$correct/${paper.mcq.size}", "Section I · $pct%", tint = c.rubric)
                Figure("${frqPoints.clean()}/${frqMax.clean()}", "Section II · self-scored")
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                RubricLabel("By skill category")
                for (k in listOf("1", "2", "3")) {
                    val s = bySkill[k] ?: Tally(0, 0)
                    Row(Modifier.fillMaxWidth()) {
                        Text("Skill category $k", Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                        Text("${s.correct}/${s.total}", style = LectioText.prose(LectioText.body).copy(fontFeatureSettings = "tnum"), color = c.ink)
                    }
                    LectioProgress(s.correct.toFloat() / maxOf(1, s.total))
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                RubricLabel("By question type")
                for ((type, s) in byType.entries.sortedBy { it.value.correct.toDouble() / it.value.total }) {
                    Row(Modifier.fillMaxWidth()) {
                        Text(library?.meta?.questionTypeLabels?.get(type) ?: type, Modifier.weight(1f), style = LectioText.subheadline, color = c.ink2)
                        Text("${s.correct}/${s.total}", style = LectioText.subheadline.copy(fontFeatureSettings = "tnum"), color = c.ink)
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                RubricLabel("Score Section II against the rubric")
                Text(
                    "Free response can’t be scored from an answer key. Work through the rubric rows here, or take each question into the FRQ Workshop for the full guidelines and a sample.",
                    style = LectioText.footnote, color = c.inkMuted,
                )
                for (p in paper.frqs) Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(p.title, style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                    for (row in p.rubric) {
                        val key = "${p.id}:${row.id}"
                        MenuPicker(
                            row.label, (0..row.maxPoints).map { it.toDouble() to "$it" }, frqScores[key] ?: 0.0,
                            { frqScores[key] = it },
                        )
                    }
                }
            }
            LectioButton(onSave, Modifier.fillMaxWidth(), prominent = true, enabled = !saved) { ButtonLabel(if (saved) "Saved to your history" else "Save results", style = LectioText.headline) }

            Column {
                Row(Modifier.fillMaxWidth().clickable(role = Role.Button) { review = !review }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Review every multiple-choice question", Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                    Symbol(if (review) "chevron.down" else "chevron.right", tint = c.inkMuted)
                }
                if (review) Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    paper.mcq.forEachIndexed { i, q ->
                        val chosen = answers[i]
                        val ok = chosen == q.answerId
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            RubricLabel("${i + 1}. ${if (ok) "Correct" else if (chosen == null) "Skipped" else "Wrong"}")
                            Text(q.prompt, style = LectioText.subheadline.copy(fontWeight = FontWeight.SemiBold), color = c.ink)
                            Text(q.options.firstOrNull { it.id == q.answerId }?.text ?: "", style = LectioText.latin(16.sp), color = c.correct)
                            Text(q.explanation, style = LectioText.footnote, color = c.inkMuted)
                        }
                        Hairline(color = c.hair)
                    }
                }
            }
        }
    }
}
