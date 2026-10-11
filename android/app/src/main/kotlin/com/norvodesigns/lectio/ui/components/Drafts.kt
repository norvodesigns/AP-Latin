package com.norvodesigns.lectio.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.norvodesigns.lectio.AppModel

/**
 * State that outlives the screen showing it: kept on the model under [key], so
 * a half-finished attempt is still there when the student comes back from
 * another tab (see [AppModel.screenDrafts]). [create] makes a fresh one.
 */
@Composable
inline fun <reified T : Any> rememberDraft(model: AppModel, key: String, crossinline create: () -> T): T =
    remember(key) { (model.screenDrafts[key] as? T) ?: create().also { model.screenDrafts[key] = it } }

/** Ends the work kept under [key], so the next visit starts fresh. */
fun AppModel.discardDraft(key: String) {
    screenDrafts.remove(key)
}
