package com.norvodesigns.lectio.notifications

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Whether Lectio may post notifications: the runtime permission (Android 13+),
 * and the app's own switch in the system settings, which can be off on any version.
 */
fun notificationsAllowed(context: android.content.Context): Boolean =
    (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

/** Whether asking would show the system's permission dialog (Android 13+, not yet granted); otherwise only the settings can turn notifications on. */
fun notificationsAskable(context: android.content.Context): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED

/** Opens Lectio's page in the system notification settings. */
fun openNotificationSettings(context: android.content.Context) {
    val intent = android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
        .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(intent) }
}

/**
 * Returns a function that asks for the notification permission (Android 13+)
 * and reports the answer; where it is already granted, or not needed, it
 * answers at once without showing anything.
 */
@Composable
fun rememberNotificationPermission(onResult: (Boolean) -> Unit): () -> Unit {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission(), onResult)
    return remember(launcher, context) {
        {
            when {
                notificationsAllowed(context) -> onResult(true)
                notificationsAskable(context) -> launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
                // Switched off in the system settings: no dialog can turn them back on.
                else -> onResult(false)
            }
        }
    }
}
