package com.norvodesigns.lectio.features.settings

import android.app.TimePickerDialog
import android.content.pm.ApplicationInfo
import android.text.format.DateFormat
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.ProgressDocument
import com.norvodesigns.lectio.data.AppConfig
import com.norvodesigns.lectio.features.account.AccountScreen
import com.norvodesigns.lectio.features.account.SyncStatusLabel
import com.norvodesigns.lectio.notifications.rememberNotificationPermission
import com.norvodesigns.lectio.ui.components.AIConsent
import com.norvodesigns.lectio.ui.components.Hairline
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.R_raw_text
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.StepperRow
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.components.ToggleRow
import com.norvodesigns.lectio.ui.theme.Appearance
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/** Appearance, backup, sign in, reminders, AI use, and the small print. */
@Composable
fun SettingsScreen(model: AppModel) {
    val c = Lectio.colors
    val context = LocalContext.current
    val uri = LocalUriHandler.current
    var showAccount by remember { mutableStateOf(false) }
    var showLicenses by remember { mutableStateOf(false) }
    var pendingImport by remember { mutableStateOf<ProgressDocument?>(null) }
    var importError by remember { mutableStateOf<String?>(null) }
    var confirmClear by remember { mutableStateOf(false) }
    var reminderOn by remember { mutableStateOf(model.reminderEnabled) }
    var reminderNote by remember { mutableStateOf<String?>(null) }
    var aiAllowed by remember { mutableStateOf(AIConsent.granted(model)) }

    val askNotifications = rememberNotificationPermission { granted ->
        reminderOn = granted
        model.setReminder(granted)
        reminderNote = if (granted) null else "Notifications are off for Lectio. Turn them on in the system settings to get a reminder."
    }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { target ->
        if (target != null) runCatching {
            context.contentResolver.openOutputStream(target)?.use { it.write(model.progress.exportJson().toByteArray(Charsets.UTF_8)) }
        }
    }
    val import = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { source ->
        if (source != null) {
            try {
                val text = context.contentResolver.openInputStream(source)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: throw java.io.IOException()
                pendingImport = ProgressDocument.importJson(text)
            } catch (e: ProgressDocument.ImportException) {
                importError = if (e.reason == ProgressDocument.ImportException.Reason.NotAnExport) "That doesn’t look like a Lectio backup file." else "The file couldn’t be read."
            } catch (e: Exception) {
                importError = "The file couldn’t be read."
            }
        }
    }

    if (showAccount) {
        androidx.activity.compose.BackHandler { showAccount = false }
        AccountScreen(model, onBack = { showAccount = false })
        return
    }
    if (showLicenses) {
        androidx.activity.compose.BackHandler { showLicenses = false }
        LicensesScreen { showLicenses = false }
        return
    }

    PageScaffold("Settings") { padding ->
        ScreenColumn(Modifier.padding(padding), maxWidth = 720.dp, spacing = 16.dp) {
            Panel(title = "Appearance") {
                Segmented(Appearance.entries.map { it to it.label }, model.appearance, { model.appearance = it })
                MenuPicker(
                    "Latin size", listOf(0.85 to "Smaller", 1.0 to "Standard", 1.2 to "Larger", 1.45 to "Largest"),
                    listOf(0.85, 1.0, 1.2, 1.45).minByOrNull { kotlin.math.abs(it - model.latinScale) } ?: 1.0, { model.latinScale = it },
                )
            }
            Panel(title = "Reading") {
                ToggleRow(
                    "Glossary in the Reading Room", model.progress.glossaryEnabled, { model.update { it.toggleGlossary() } },
                    detail = "Turn the glossary off for a cold read, the way the exam gives you the Latin.",
                )
            }
            Panel(title = "Your data") {
                TextAction("Export a backup", icon = "square.and.arrow.up") { export.launch("lectio-backup.json") }
                TextAction("Restore from a backup…", icon = "square.and.arrow.down") { import.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) }
                // Only while signed out, so an empty device can never sync over an account.
                if (model.account == null) TextAction("Clear all progress on this device", icon = "trash", tint = c.incorrect) { confirmClear = true }
                Text(
                    "The same file the website’s Settings page exports and imports, so a backup moves between the two either way.",
                    style = LectioText.footnote, color = c.inkMuted,
                )
            }
            Panel(title = "AI features") {
                ToggleRow(
                    "Allow AI features", aiAllowed, { aiAllowed = it; AIConsent.set(model, it) },
                    detail = "AI grading, the line tutor and sight-passage selection send the Latin and what you wrote or asked to an AI provider (Google Gemini, or Groq as a backup). Nothing is sent until you press an AI button. With AI off, every feature still has its self-graded path.",
                )
                TextAction("How AI features use your text", icon = "hand.raised") { uri.openUri(AppConfig.web("privacy")) }
            }
            Panel(title = "Account") {
                val account = model.account
                Row(Modifier.fillMaxWidth().clickableRow { showAccount = true }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (account != null) Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(account.displayName, style = LectioText.prose(LectioText.body), color = c.ink)
                        SyncStatusLabel(model.syncStatus)
                    } else {
                        TextAction("Sign in to sync with the website", Modifier.weight(1f), icon = "person.crop.circle") { showAccount = true }
                    }
                    com.norvodesigns.lectio.ui.components.Symbol("chevron.right", tint = c.inkFaint, size = 20.dp)
                }
            }
            Panel(title = "Study") {
                val plan = model.progress.studyPlan
                StepperRow(
                    "Daily goal", "${plan.minutesPerDay} min",
                    onMinus = { model.update { it.setStudyPlan(minutesPerDay = maxOf(5, plan.minutesPerDay - 5)) } },
                    onPlus = { model.update { it.setStudyPlan(minutesPerDay = minOf(240, plan.minutesPerDay + 5)) } },
                    canMinus = plan.minutesPerDay > 5, canPlus = plan.minutesPerDay < 240,
                )
                ToggleRow("Daily reminder", reminderOn, { on ->
                    reminderNote = null
                    if (on) askNotifications() else {
                        reminderOn = false
                        model.setReminder(false)
                    }
                })
                if (reminderOn) {
                    val minutes = model.reminderMinutes
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("Remind me at", Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                        TextAction(formatClock(context, minutes)) {
                            TimePickerDialog(context, { _, h, m ->
                                model.reminderMinutes = h * 60 + m
                                model.rescheduleReminder()
                            }, minutes / 60, minutes % 60, DateFormat.is24HourFormat(context)).show()
                        }
                    }
                }
                reminderNote?.let { Text(it, style = LectioText.footnote, color = c.incorrect) }
                Text(
                    "Time counts while a study section is open on screen, the same way the website counts it. The reminder quotes the day’s line and says how many cards are due.",
                    style = LectioText.footnote, color = c.inkMuted,
                )
            }
            val debuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (debuggable && model.account == null && !model.prefs.bool("seedDemo")) {
                // Debug builds only (never the Play Store): fill an empty device with sample progress so every screen has something to show.
                Panel(title = "Developer") {
                    TextAction("Load sample progress", icon = "tray.and.arrow.down", enabled = model.progress.vocab.isEmpty()) { model.loadSampleProgress() }
                }
            }
            Panel(title = "About") {
                val version = remember { runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "–" }
                InfoRow("Version", version)
                model.content?.let { InfoRow("Content", it.manifest.contentHash.take(12)) }
                TextAction("lectio.norvodesigns.com", icon = "safari") { uri.openUri(AppConfig.webBaseUrl) }
                TextAction("Privacy", icon = "hand.raised") { uri.openUri(AppConfig.web("privacy")) }
                TextAction("Support", icon = "questionmark.circle") { uri.openUri(AppConfig.web("support")) }
                TextAction("Acknowledgements", icon = "text.book.closed") { showLicenses = true }
                TextAction("Take the tour again", icon = "rectangle.stack") { model.showTour = true }
                Text(AppConfig.trademarkNotice, style = LectioText.footnote, color = c.inkMuted)
            }
        }
    }

    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("Clear all progress on this device?") },
        text = { Text("This can’t be undone. Export a backup first if you want to keep it.") },
        confirmButton = {
            TextButton({
                confirmClear = false
                model.replaceProgress(ProgressDocument.blank(prefersDark = model.appearance == Appearance.Dark))
            }) { Text("Clear progress", color = c.incorrect) }
        },
        dismissButton = { TextButton({ confirmClear = false }) { Text("Cancel") } },
        containerColor = c.slip,
    )
    pendingImport?.let { doc ->
        AlertDialog(
            onDismissRequest = { pendingImport = null },
            title = { Text("Replace your progress with this backup?") },
            text = { Text("Everything on this device is replaced by the file’s contents.") },
            confirmButton = { TextButton({ model.replaceProgress(doc); pendingImport = null }) { Text("Replace", color = c.incorrect) } },
            dismissButton = { TextButton({ pendingImport = null }) { Text("Cancel") } },
            containerColor = c.slip,
        )
    }
    importError?.let { message ->
        AlertDialog(
            onDismissRequest = { importError = null },
            title = { Text("Couldn’t restore that file") }, text = { Text(message) },
            confirmButton = { TextButton({ importError = null }) { Text("OK") } },
            containerColor = c.slip,
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    val c = Lectio.colors
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
        Text(value, style = LectioText.prose(LectioText.body), color = c.inkMuted)
    }
}

private fun Modifier.clickableRow(onClick: () -> Unit): Modifier = this.then(Modifier.clickable(role = androidx.compose.ui.semantics.Role.Button, onClick = onClick))

private fun formatClock(context: android.content.Context, minutes: Int): String {
    val cal = java.util.Calendar.getInstance().apply { set(java.util.Calendar.HOUR_OF_DAY, minutes / 60); set(java.util.Calendar.MINUTE, minutes % 60) }
    return DateFormat.getTimeFormat(context).format(cal.time)
}

/** The bundled fonts are under the SIL Open Font License, which asks for the licence to travel with them; the Latin texts are public domain. */
@Composable
private fun LicensesScreen(onBack: () -> Unit) {
    val c = Lectio.colors
    val context = LocalContext.current
    PageScaffold("Acknowledgements", onBack = onBack) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text(
                "Latin texts are from The Latin Library and are in the public domain. The course follows the College Board’s published AP® Latin Course and Exam Description (2025), and the vocabulary track teaches the words on its vocabulary list; the definitions, notes, questions and lessons are Lectio’s own.",
                style = LectioText.prose(LectioText.callout), color = c.ink,
            )
            Text(AppConfig.trademarkNotice, style = LectioText.prose(LectioText.footnote), color = c.inkMuted)
            for ((title, resource) in listOf("EBGaramond" to "ebgaramond_ofl", "Italianno" to "italianno_ofl")) {
                val text = remember(resource) { R_raw_text(context, resource) }
                if (text != null) {
                    com.norvodesigns.lectio.ui.components.RubricLabel(title)
                    Text(text, style = LectioText.caption.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace), color = c.ink2)
                }
            }
        }
    }
}
