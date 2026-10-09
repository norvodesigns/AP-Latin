package com.norvodesigns.lectio.notifications

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

/** Whether Lectio may post notifications. Always true before Android 13, where there is no runtime permission. */
fun notificationsAllowed(context: android.content.Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

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
            if (notificationsAllowed(context)) onResult(true) else launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
