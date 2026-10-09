package com.norvodesigns.lectio.features.account

import android.text.format.DateUtils
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norvodesigns.lectio.Account
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.SyncStatus
import com.norvodesigns.lectio.core.AuthManager
import com.norvodesigns.lectio.core.SupabaseError
import com.norvodesigns.lectio.data.AppConfig
import com.norvodesigns.lectio.ui.components.ButtonLabel
import com.norvodesigns.lectio.ui.components.LectioButton
import com.norvodesigns.lectio.ui.components.LectioTextField
import com.norvodesigns.lectio.ui.components.MenuPicker
import com.norvodesigns.lectio.ui.components.PageScaffold
import com.norvodesigns.lectio.ui.components.Panel
import com.norvodesigns.lectio.ui.components.QuietLabel
import com.norvodesigns.lectio.ui.components.ScreenColumn
import com.norvodesigns.lectio.ui.components.Segmented
import com.norvodesigns.lectio.ui.components.Symbol
import com.norvodesigns.lectio.ui.components.TextAction
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText
import kotlinx.coroutines.launch

/**
 * Sign in, create an account, or manage the one you're signed into: the same
 * Supabase accounts the website uses, so progress follows you between the two.
 * [startsWithSignUp] opens on "Create account" (the first run's "Create a free account").
 */
@Composable
fun AccountScreen(model: AppModel, startsWithSignUp: Boolean = false, onBack: (() -> Unit)?) {
    PageScaffold("Account", onBack = onBack) { padding ->
        val account = model.account
        if (account != null) SignedIn(model, account, Modifier.padding(padding)) else SignIn(model, startsWithSignUp, Modifier.padding(padding))
    }
}

/* ------------------------------------------------------------------ */
/* Signed out                                                          */
/* ------------------------------------------------------------------ */

@Composable
private fun SignIn(model: AppModel, startsWithSignUp: Boolean, modifier: Modifier) {
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    var signUp by remember { mutableStateOf(startsWithSignUp) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("student") }
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var checkEmail by remember { mutableStateOf(false) }

    fun submit() {
        error = null
        AuthManager.validate(email, password)?.let { error = it; return }
        val name = displayName.trim()
        if (signUp && name.length !in 1..60) {
            error = "Enter a name between 1 and 60 characters."
            return
        }
        working = true
        scope.launch {
            try {
                if (!signUp) {
                    model.signIn(email, password)
                } else if (model.signUp(email, password, name, role) == AppModel.SignUpOutcome.CheckEmail) {
                    checkEmail = true
                    signUp = false
                    password = ""
                }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: SupabaseError) {
                error = e.message
            } catch (e: Exception) {
                error = "Couldn’t reach the server. Check your connection and try again."
            } finally {
                working = false
            }
        }
    }

    ScreenColumn(modifier, maxWidth = 560.dp, spacing = 18.dp) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Lectio", style = LectioText.wordmark(48.sp), color = c.rubric)
            Text(
                "Sign in with the same account you use on the website, and your reading notes, vocabulary deck and history follow you between the two.",
                style = LectioText.prose(LectioText.callout), color = c.ink2,
            )
        }
        Segmented(listOf(false to "Sign in", true to "Create account"), signUp, { signUp = it; error = null })
        if (checkEmail) Panel {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Symbol("envelope.badge", tint = c.rubric)
                Text("Check your email for a confirmation link. Once you’ve followed it, come back and sign in here.", style = LectioText.prose(LectioText.callout), color = c.ink)
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (signUp) {
                LectioTextField(displayName, { displayName = it }, placeholder = "Your name", singleLine = true, textStyle = LectioText.prose(LectioText.body), capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next)
                MenuPicker("I’m a", listOf("student" to "Student", "teacher" to "Teacher"), role, { role = it })
            }
            LectioTextField(
                email, { email = it }, placeholder = "Email", singleLine = true, textStyle = LectioText.prose(LectioText.body),
                capitalization = KeyboardCapitalization.None, autoCorrect = false, keyboardType = KeyboardType.Email, imeAction = ImeAction.Next,
            )
            LectioTextField(
                password, { password = it }, placeholder = "Password", singleLine = true, textStyle = LectioText.prose(LectioText.body),
                password = true, capitalization = KeyboardCapitalization.None, autoCorrect = false, imeAction = ImeAction.Go, onDone = ::submit,
            )
            Text(
                error ?: if (signUp) "At least 8 characters. Teachers can create classrooms on the website; students join them with a code." else "",
                style = LectioText.footnote, color = if (error != null) c.incorrect else c.inkMuted,
            )
        }
        LectioButton({ submit() }, Modifier.fillMaxWidth(), prominent = true, enabled = !working) {
            if (working) CircularProgressIndicator(Modifier.height(20.dp).width(20.dp), color = c.onRubric, strokeWidth = 2.dp)
            else ButtonLabel(if (signUp) "Create account" else "Sign in", style = LectioText.headline)
        }
        // The reset happens on the website (its email link opens there), which sends the student back here to sign in.
        if (!signUp) TextAction("Forgot your password?", icon = "key") { uri.openUri(AppConfig.web("forgot-password")) }
    }
}


/* ------------------------------------------------------------------ */
/* Signed in                                                           */
/* ------------------------------------------------------------------ */

@Composable
private fun SignedIn(model: AppModel, account: Account, modifier: Modifier) {
    val c = Lectio.colors
    val scope = rememberCoroutineScope()
    var confirmSignOut by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }

    ScreenColumn(modifier, maxWidth = 560.dp, spacing = 18.dp) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(account.displayName, style = LectioText.prose(LectioText.title2), color = c.ink)
            account.email?.let { Text(it, style = LectioText.prose(LectioText.body), color = c.inkMuted) }
            QuietLabel(if (account.isTeacher) "Teacher" else "Student", Modifier.padding(top = 2.dp))
        }
        Panel(title = "Sync") {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Status", Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
                SyncStatusLabel(model.syncStatus)
            }
            TextAction("Sync now", icon = "arrow.triangle.2.circlepath", enabled = model.syncStatus != SyncStatus.Syncing) { scope.launch { model.reconcile() } }
            Text(
                "Your progress is saved on this device first and synced to your account in the background, so it works offline and catches up when you’re back online.",
                style = LectioText.footnote, color = c.inkMuted,
            )
        }
        Panel {
            TextAction("Sign out", icon = "rectangle.portrait.and.arrow.right") { confirmSignOut = true }
            Text("Signing out keeps your progress on this device.", style = LectioText.footnote, color = c.inkMuted)
        }
        Panel {
            if (deleting) CircularProgressIndicator(Modifier.height(24.dp).width(24.dp), color = c.incorrect, strokeWidth = 2.dp)
            else TextAction("Delete account", icon = "trash", tint = c.incorrect) { confirmDelete = true }
            Text(
                deleteError ?: "Permanently deletes your account, your synced progress and any classrooms you teach. Progress already on this device stays here.",
                style = LectioText.footnote, color = if (deleteError != null) c.incorrect else c.inkMuted,
            )
        }
    }

    if (confirmSignOut) AlertDialog(
        onDismissRequest = { confirmSignOut = false },
        title = { Text("Sign out of ${account.displayName}?") },
        confirmButton = { TextButton({ confirmSignOut = false; scope.launch { model.signOut() } }) { Text("Sign out") } },
        dismissButton = { TextButton({ confirmSignOut = false }) { Text("Cancel") } },
        containerColor = c.slip,
    )
    if (confirmDelete) AlertDialog(
        onDismissRequest = { confirmDelete = false },
        title = { Text("Delete your account?") }, text = { Text("This can’t be undone.") },
        confirmButton = {
            TextButton({
                confirmDelete = false
                deleting = true
                deleteError = null
                scope.launch {
                    try {
                        model.deleteAccount()
                    } catch (e: kotlinx.coroutines.CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        deleteError = "Couldn’t delete the account: ${(e as? SupabaseError)?.message ?: "the server couldn’t be reached"}. Nothing was changed."
                    } finally {
                        deleting = false
                    }
                }
            }) { Text("Delete account", color = c.incorrect) }
        },
        dismissButton = { TextButton({ confirmDelete = false }) { Text("Cancel") } },
        containerColor = c.slip,
    )
}

@Composable
fun SyncStatusLabel(status: SyncStatus) {
    val c = Lectio.colors
    when (status) {
        SyncStatus.Idle -> Text("Not synced yet", style = LectioText.subheadline, color = c.inkMuted)
        SyncStatus.Syncing -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.height(14.dp).width(14.dp), color = c.inkMuted, strokeWidth = 1.5.dp)
            Text("Syncing", style = LectioText.subheadline, color = c.inkMuted)
        }
        is SyncStatus.Synced -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            Symbol("checkmark.icloud", tint = c.correct, size = 18.dp)
            Text(
                "Synced " + DateUtils.getRelativeTimeSpanString(status.at.toEpochMilli(), System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS),
                style = LectioText.subheadline, color = c.ink,
            )
        }
        is SyncStatus.Offline -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.Top) {
            Symbol("icloud.slash", tint = c.inkMuted, size = 18.dp)
            Text(status.message, style = LectioText.footnote, color = c.ink)
        }
    }
}
