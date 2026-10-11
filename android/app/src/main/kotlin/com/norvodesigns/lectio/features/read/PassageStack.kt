package com.norvodesigns.lectio.features.read

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.staticCompositionLocalOf
import com.norvodesigns.lectio.AppModel
import com.norvodesigns.lectio.core.Passage
import com.norvodesigns.lectio.features.quiz.QuizSessionRequest
import com.norvodesigns.lectio.ui.components.ProvidePushedBack

/**
 * Passages opened one over another from a screen, as a navigation stack: the
 * reader's Previous and Next push the neighbouring passage, and Back pops one,
 * the way iOS pushes each reader onto the host's NavigationStack.
 */
@Stable
class PassageStack(ids: List<String> = emptyList()) {
    private val list = mutableStateListOf<String>().apply { addAll(ids) }

    val top: String? get() = list.lastOrNull()
    val depth: Int get() = list.size

    fun push(id: String) {
        list.add(id)
    }

    fun pop() {
        if (list.isNotEmpty()) list.removeAt(list.lastIndex)
    }

    fun clear() = list.clear()

    /** Opens [id] on its own, as a link from elsewhere does. */
    fun reset(id: String) {
        list.clear()
        list.add(id)
    }

    fun ids(): List<String> = list.toList()

    companion object {
        val Saver = listSaver<PassageStack, String>(save = { it.ids() }, restore = { PassageStack(it) })
    }
}

/** A stack that survives the screen being left and come back to (a tab switch), and the activity being recreated. */
@Composable
fun rememberPassageStack(): PassageStack = rememberSaveable(saver = PassageStack.Saver) { PassageStack() }

/**
 * What the reader's Practice menu does where it is hosted. The default starts
 * a quiz over the app and opens the Scansion Lab with Back returning here; a
 * host that is itself over the app (a quiz session) supplies its own, so the
 * set in progress isn't replaced.
 */
class ReaderPractice(val quiz: (QuizSessionRequest) -> Unit, val scan: (Passage) -> Unit)

val LocalReaderPractice = staticCompositionLocalOf<ReaderPractice?> { null }

/**
 * The top of [stack], with Back popping one passage. Each depth keeps its own
 * saved state, so Back returns to the previous passage where it was left. When
 * the last passage is popped, [onClose] runs if given (an overlay closing),
 * else the stack is simply emptied and the host shows what's under it.
 */
@Composable
fun PassageStackReader(model: AppModel, stack: PassageStack, onClose: (() -> Unit)? = null) {
    val id = stack.top ?: return
    val passage = model.content?.passage(id)
    val back: () -> Unit = { if (stack.depth <= 1 && onClose != null) onClose() else stack.pop() }
    if (passage == null) {
        // A passage that isn't in this content (an old link): nothing to show, so step past it.
        androidx.compose.runtime.LaunchedEffect(id) { back() }
        return
    }
    val holder = rememberSaveableStateHolder()
    BackHandler(onBack = back)
    holder.SaveableStateProvider("${stack.depth}:$id") {
        ProvidePushedBack(back) { PassageReader(model, passage, onNavigate = { stack.push(it.id) }) }
    }
}
