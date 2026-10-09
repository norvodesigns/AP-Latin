package com.norvodesigns.lectio.features.classroom

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.SupabaseError
import com.norvodesigns.lectio.data.AppConfig
import com.norvodesigns.lectio.features.account.AccountScreen
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioProgress
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.RubricLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.launch

/** The web nav label for an assignable section id: `sectionLabel` in src/lib/nav.ts. */
fun sectionTitle(section: String): String = mapOf(
    "read" to "Reading Room", "translate" to "Translate", "sight" to "Sight Reading", "quiz" to "Quiz Engine",
    "vocab" to "Vocabulary", "grammar" to "Grammar & Syntax", "scansion" to "Scansion Lab", "devices" to "Literary Devices",
    "context" to "Context & Culture", "frq" to "FRQ Workshop", "exam" to "Practice Exam", "plan" to "Study Plan",
)[section] ?: section

/**
 * Classrooms: the website's /classroom (students) and a read-only view of /teach
 * (teachers). Students join with a code and see their assignments and the
 * leaderboard; creating classrooms and setting assignments stays on the website,
 * where a teacher has room for it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassroomScreen(model: AppModel) {
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    var classrooms by remember { mutableStateOf<List<AppModel.Classroom>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var code by remember { mutableStateOf("") }
    var joining by remember { mutableStateOf(false) }
    var joinMessage by remember { mutableStateOf<String?>(null) }
    var open by remember { mutableStateOf<AppModel.Classroom?>(null) }
    var showAccount by remember { mutableStateOf(false) }

    suspend fun load() {
        if (model.account == null) return
        loading = true
        try {
            classrooms = model.classrooms()
            error = null
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            error = (e as? SupabaseError)?.message ?: "Couldn’t load your classrooms."
        } finally {
            loading = false
        }
    }

    LaunchedEffect(model.account?.userId) { load() }

    open?.let { classroom ->
        androidx.activity.compose.BackHandler { open = null }
        ClassroomDetail(model, classroom) { open = null; scope.launch { load() } }
        return
    }
    if (showAccount) {
        androidx.activity.compose.BackHandler { showAccount = false }
        AccountScreen(model, onBack = { showAccount = false })
        return
    }

    PageScaffold("Classroom") { padding ->
        val account = model.account
        if (account == null) {
            Column(Modifier.fillMaxSize().padding(padding).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)) {
                Symbol("person.3", tint = c.inkMuted, size = 48.dp)
                Text("Classrooms need an account", style = LectioText.prose(LectioText.title2), color = c.ink, textAlign = TextAlign.Center)
                Text(
                    "Sign in to join your teacher’s classroom with a code, see what’s assigned, and follow the leaderboard.",
                    style = LectioText.prose(LectioText.callout), color = c.inkMuted, textAlign = TextAlign.Center,
                )
                LectioButton({ showAccount = true }, prominent = true) { ButtonLabel("Sign in", style = LectioText.headline) }
            }
        } else {
            PullToRefreshBox(loading, { scope.launch { load() } }, Modifier.padding(padding)) {
                ScreenColumn(Modifier, maxWidth = 720.dp, spacing = 18.dp) {
                    if (!account.isTeacher) Panel(title = "Join a classroom") {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            LectioTextField(
                                code, { code = it.uppercase().filter { ch -> ch.isLetterOrDigit() }.take(6) }, Modifier.weight(1f), placeholder = "Join code", singleLine = true,
                                textStyle = LectioText.title3.copy(fontFamily = FontFamily.Monospace), capitalization = KeyboardCapitalization.Characters, autoCorrect = false,
                            )
                            LectioButton(
                                {
                                    joining = true
                                    joinMessage = null
                                    scope.launch {
                                        try {
                                            val name = model.joinClassroom(code)
                                            joinMessage = "You’ve joined $name."
                                            code = ""
                                            load()
                                        } catch (e: kotlinx.coroutines.CancellationException) {
                                            throw e
                                        } catch (e: Exception) {
                                            joinMessage = (e as? SupabaseError)?.message ?: "Couldn’t join. Check the code and your connection."
                                        } finally {
                                            joining = false
                                        }
                                    }
                                },
                                prominent = true, enabled = code.length == 6 && !joining,
                            ) { ButtonLabel(if (joining) "Joining…" else "Join") }
                        }
                        joinMessage?.let { Text(it, style = LectioText.footnote, color = c.ink2) }
                        Text("Your teacher’s six-character code.", style = LectioText.footnote, color = c.inkMuted)
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        RubricLabel("Your classrooms", Modifier.padding(bottom = 4.dp))
                        if (loading && classrooms.isEmpty()) CircularProgressIndicator(color = c.inkMuted, strokeWidth = 2.dp)
                        else if (classrooms.isEmpty()) Text(
                            if (account.isTeacher) "You don’t teach any classrooms yet. Create one on the website." else "You haven’t joined a classroom yet.",
                            style = LectioText.prose(LectioText.body), color = c.inkMuted,
                        )
                        for (room in classrooms) {
                            Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = room }.padding(vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(room.name, Modifier.weight(1f), style = LectioText.headline, color = c.ink)
                                    Symbol("chevron.right", tint = c.inkFaint, size = 20.dp)
                                }
                                if (account.isTeacher && room.joinCode != null) {
                                    Text("Join code ${room.joinCode}", style = LectioText.subheadline.copy(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold), color = c.ink2)
                                }
                                if (room.archived) QuietLabel("Archived")
                            }
                            Hairline(color = c.hair)
                        }
                        error?.let { Text(it, style = LectioText.footnote, color = c.incorrect) }
                    }
                    if (account.isTeacher) TextAction("Create classrooms and set assignments on the website", icon = "safari") { uri.openUri(AppConfig.web("teach")) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClassroomDetail(model: AppModel, classroom: AppModel.Classroom, onBack: () -> Unit) {
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    var detail by remember { mutableStateOf<AppModel.ClassroomDetail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var confirmLeave by remember { mutableStateOf(false) }
    var removing by remember { mutableStateOf<AppModel.LeaderRow?>(null) }
    val me = model.account?.userId ?: ""
    val isTeacher = model.account?.isTeacher ?: false

    suspend fun load() {
        refreshing = true
        try {
            detail = model.classroomDetail(classroom.id)
            error = null
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            error = (e as? SupabaseError)?.message ?: "Couldn’t load this classroom."
        } finally {
            refreshing = false
        }
    }
    LaunchedEffect(classroom.id) { load() }

    PageScaffold(classroom.name, onBack = onBack) { padding ->
        PullToRefreshBox(refreshing, { scope.launch { load() } }, Modifier.padding(padding)) {
            ScreenColumn(Modifier, maxWidth = 720.dp, spacing = 18.dp) {
                classroom.examDate?.let { Text("Exam day: $it", style = LectioText.prose(LectioText.callout), color = c.ink2) }
                val d = detail
                if (d != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        RubricLabel("Assignments")
                        if (d.assignments.isEmpty()) Text("Nothing assigned yet.", style = LectioText.prose(LectioText.body), color = c.inkMuted)
                        for (a in d.assignments) {
                            if (isTeacher) {
                                val met = d.leaderboard.count { (d.sectionSeconds[it.id]?.get(a.section) ?: 0.0) >= a.targetMinutes * 60.0 }
                                AssignmentRow(a, null, "$met of ${d.leaderboard.size} students have met it")
                            } else {
                                AssignmentRow(a, d.sectionSeconds[me]?.get(a.section) ?: 0.0, null)
                            }
                            Hairline(color = c.hair)
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        RubricLabel("Leaderboard")
                        d.leaderboard.forEachIndexed { i, row ->
                            var menu by remember { mutableStateOf(false) }
                            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${i + 1}", Modifier.width(22.dp), style = LectioText.caption.copy(fontFeatureSettings = "tnum"), color = c.inkFaint)
                                Text(row.name, Modifier.weight(1f), style = LectioText.prose(LectioText.body).copy(fontWeight = if (row.id == me) FontWeight.SemiBold else FontWeight.Normal), color = c.ink)
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("${(row.seconds / 60).toInt()} min", style = LectioText.prose(LectioText.body).copy(fontFeatureSettings = "tnum"), color = c.ink)
                                    if (row.total > 0) Text("${Math.round(row.correct / row.total * 100)}% of ${row.total.toInt()}", style = LectioText.caption2, color = c.inkMuted)
                                }
                                if (row.id != me) Box {
                                    IconButton({ menu = true }) { Symbol("ellipsis", tint = c.inkMuted, contentDescription = "Actions for ${row.name}") }
                                    DropdownMenu(menu, { menu = false }, containerColor = c.slip) {
                                        if (isTeacher) DropdownMenuItem(text = { Text("Remove from classroom", color = c.incorrect) }, onClick = { menu = false; removing = row })
                                        DropdownMenuItem(text = { Text("Report name") }, onClick = {
                                            menu = false
                                            uri.openUri(
                                                AppConfig.web("support") + "?report=" + java.net.URLEncoder.encode(row.name, "UTF-8") + "&classroom=" + classroom.id + "&from=android",
                                            )
                                        })
                                    }
                                }
                            }
                            Hairline(color = c.hair)
                        }
                        Text(
                            "Ranked by time studied. Accuracy is shown but not ranked on — a handful of perfect answers shouldn’t outrank hundreds at 90%. " +
                                if (isTeacher) "Use ⋯ on a student to remove them, or to report their name." else "Use ⋯ on a name to report it.",
                            style = LectioText.footnote, color = c.inkMuted,
                        )
                    }
                } else if (error != null) {
                    Text(error ?: "", style = LectioText.prose(LectioText.body), color = c.incorrect)
                } else {
                    CircularProgressIndicator(color = c.inkMuted, strokeWidth = 2.dp)
                }
                if (!isTeacher) TextAction("Leave classroom", tint = c.incorrect) { confirmLeave = true }
            }
        }
    }

    removing?.let { row ->
        AlertDialog(
            onDismissRequest = { removing = null },
            title = { Text("Remove ${row.name}?") },
            text = { Text("Their account and history stay. They can rejoin only with the classroom code.") },
            confirmButton = {
                TextButton({
                    removing = null
                    scope.launch {
                        try {
                            model.removeStudent(row.id, classroom.id)
                            load()
                        } catch (e: kotlinx.coroutines.CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            error = (e as? SupabaseError)?.message ?: "Couldn’t remove ${row.name}."
                        }
                    }
                }) { Text("Remove from ${classroom.name}", color = c.incorrect) }
            },
            dismissButton = { TextButton({ removing = null }) { Text("Cancel") } },
            containerColor = c.slip,
        )
    }
    if (confirmLeave) AlertDialog(
        onDismissRequest = { confirmLeave = false },
        title = { Text("Leave ${classroom.name}?") },
        confirmButton = {
            TextButton({
                confirmLeave = false
                scope.launch {
                    runCatching { model.leaveClassroom(classroom.id) }
                    onBack()
                }
            }) { Text("Leave", color = c.incorrect) }
        },
        dismissButton = { TextButton({ confirmLeave = false }) { Text("Cancel") } },
        containerColor = c.slip,
    )
}

@Composable
private fun AssignmentRow(a: AppModel.Assignment, progress: Double?, footer: String?) {
    val c = Lectio.colors
    Column(Modifier.padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(sectionTitle(a.section), Modifier.weight(1f), style = LectioText.headline, color = c.ink)
            a.dueDate?.let { Text("due $it", style = LectioText.caption, color = c.inkMuted) }
        }
        if (progress != null) {
            val target = a.targetMinutes * 60.0
            LectioProgress((minOf(progress, target) / maxOf(target, 1.0)).toFloat(), tint = if (progress >= target) c.correct else c.rubric)
            Text("${(progress / 60).toInt()} of ${a.targetMinutes} minutes", style = LectioText.caption, color = c.inkMuted)
        } else {
            Text("${a.targetMinutes} minutes", style = LectioText.caption, color = c.inkMuted)
        }
        footer?.let { Text(it, style = LectioText.caption, color = c.inkMuted) }
        a.note?.takeIf { it.isNotEmpty() }?.let { Text(it, style = LectioText.prose(LectioText.callout), color = c.ink2) }
    }
}
