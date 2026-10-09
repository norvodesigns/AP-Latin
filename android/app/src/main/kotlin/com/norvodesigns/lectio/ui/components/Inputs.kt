package com.norvodesigns.lectio.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

enum class OptionState { Idle, Selected, Right, Wrong, Faded }

/** A tappable card on the page: content, so parchment and a hairline. Presses in a little, as the iOS card does. */
@Composable
fun OptionCard(
    state: OptionState,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    val c = Lectio.colors
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.98f else 1f, spring(stiffness = 600f), label = "press")
    val background by animateColorAsState(
        when (state) {
            OptionState.Right -> c.correctWash
            OptionState.Wrong -> c.incorrectWash
            else -> c.slip
        },
        label = "bg",
    )
    val border = when (state) {
        OptionState.Right -> c.correct
        OptionState.Wrong -> c.incorrect
        OptionState.Selected -> c.ink
        else -> c.ruleStrong
    }
    val spoken = when (state) {
        OptionState.Right -> "Correct answer"
        OptionState.Wrong -> "Your answer, incorrect"
        else -> null
    }
    Surface(
        modifier.scale(scale).alpha(if (state == OptionState.Faded) 0.45f else 1f).semantics {
            selected = state == OptionState.Selected
            if (spoken != null) stateDescription = spoken
        },
        shape = RoundedCornerShape(14.dp), color = background,
        border = BorderStroke(if (state == OptionState.Idle) 0.75.dp else 1.5.dp, border),
    ) {
        Box(Modifier.fillMaxWidth().clickable(enabled = enabled, interactionSource = source, indication = null, role = Role.Button, onClick = onClick).padding(horizontal = 16.dp, vertical = 13.dp)) {
            content()
        }
    }
}

/** A text field in the page's own style: a slip with a hairline that firms up when focused. */
@Composable
fun LectioTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    textStyle: TextStyle = LectioText.prose(LectioText.title3),
    enabled: Boolean = true,
    singleLine: Boolean = false,
    minLines: Int = 1,
    maxLines: Int = if (singleLine) 1 else 6,
    autoFocus: Boolean = false,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.Sentences,
    autoCorrect: Boolean = true,
    imeAction: ImeAction = if (singleLine) ImeAction.Done else ImeAction.Default,
    onDone: (() -> Unit)? = null,
    password: Boolean = false,
    keyboardType: androidx.compose.ui.text.input.KeyboardType = androidx.compose.ui.text.input.KeyboardType.Text,
) {
    val c = Lectio.colors
    var focused by remember { mutableStateOf(false) }
    val requester = remember { FocusRequester() }
    androidx.compose.runtime.LaunchedEffect(autoFocus) { if (autoFocus) runCatching { requester.requestFocus() } }
    BasicTextField(
        value, onValueChange,
        modifier.fillMaxWidth().focusRequester(requester).onFocusChanged { focused = it.isFocused },
        enabled = enabled, singleLine = singleLine, minLines = minLines, maxLines = maxLines,
        textStyle = textStyle.copy(color = c.ink),
        cursorBrush = SolidColor(c.rubric),
        visualTransformation = if (password) androidx.compose.ui.text.input.PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(capitalization = capitalization, autoCorrectEnabled = autoCorrect, imeAction = imeAction, keyboardType = if (password) androidx.compose.ui.text.input.KeyboardType.Password else keyboardType),
        keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }, onGo = { onDone?.invoke() }, onSend = { onDone?.invoke() }),
        decorationBox = { inner ->
            Box(
                Modifier.fillMaxWidth().heightIn(min = 48.dp)
                    .border(if (focused) 1.25.dp else 0.75.dp, if (focused) c.ink else c.ruleStrong, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (value.isEmpty() && placeholder.isNotEmpty()) Text(placeholder, style = textStyle, color = c.inkFaint)
                inner()
            }
        },
    )
}
