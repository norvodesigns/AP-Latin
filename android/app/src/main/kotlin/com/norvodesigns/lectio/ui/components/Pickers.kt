package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.norvodesigns.lectio.ui.theme.Lectio
import com.norvodesigns.lectio.ui.theme.LectioText

/**
 * A labelled choice among a few options, as a menu: the Android counterpart of
 * the iOS menu picker. The current choice shows on a slip with a chevron;
 * touching it opens the list.
 */
@Composable
fun <T> MenuPicker(
    label: String,
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val c = Lectio.colors
    var open by remember { mutableStateOf(false) }
    val current = options.firstOrNull { it.first == selected }?.second ?: ""
    Row(
        modifier.fillMaxWidth().heightIn(min = 48.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
        Box {
            Surface(
                Modifier.clickable(enabled = enabled, role = Role.DropdownList) { open = true }
                    .semantics { contentDescription = "$label: $current" },
                shape = RoundedCornerShape(50), color = c.slip.copy(alpha = 0.7f), border = BorderStroke(0.75.dp, c.ruleStrong),
            ) {
                Row(Modifier.padding(start = 14.dp, end = 8.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(current, style = LectioText.subheadline.copy(fontWeight = FontWeight.Medium), color = c.rubric, maxLines = 1)
                    Symbol("chevron.up.chevron.down", tint = c.rubric, size = 16.dp)
                }
            }
            DropdownMenu(open, { open = false }, containerColor = c.slip) {
                for ((value, text) in options) {
                    DropdownMenuItem(
                        text = { Text(text + if (value == selected) "  ✓" else "", style = LectioText.prose(LectioText.body), color = c.ink) },
                        onClick = {
                            open = false
                            onSelect(value)
                        },
                    )
                }
            }
        }
    }
}

/** A short run of mutually exclusive choices laid side by side. */
@Composable
fun <T> Segmented(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Lectio.colors
    SingleChoiceSegmentedButtonRow(modifier.fillMaxWidth()) {
        options.forEachIndexed { i, (value, text) ->
            SegmentedButton(
                selected = value == selected, onClick = { onSelect(value) },
                shape = SegmentedButtonDefaults.itemShape(i, options.size),
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = c.rubric, activeContentColor = c.onRubric, activeBorderColor = c.rubric,
                    inactiveContainerColor = c.slip.copy(alpha = 0.6f), inactiveContentColor = c.ink2, inactiveBorderColor = c.ruleStrong,
                ),
                icon = {},
            ) { Text(text, style = LectioText.subheadline, maxLines = 1) }
        }
    }
}

/** A switch with its label, and a line of explanation beneath. */
@Composable
fun ToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit, modifier: Modifier = Modifier, detail: String? = null, enabled: Boolean = true) {
    val c = Lectio.colors
    Row(
        modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(enabled = enabled, role = Role.Switch) { onChange(!checked) },
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = LectioText.prose(LectioText.body), color = if (enabled) c.ink else c.inkFaint)
            if (detail != null) Text(detail, style = LectioText.footnote, color = c.inkMuted)
        }
        Switch(
            checked, null, enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = c.onRubric, checkedTrackColor = c.rubric,
                uncheckedThumbColor = c.inkMuted, uncheckedTrackColor = c.slip, uncheckedBorderColor = c.ruleStrong,
            ),
        )
    }
}

/** A value with minus and plus buttons around it, for a goal in minutes or a count. */
@Composable
fun StepperRow(label: String, value: String, onMinus: () -> Unit, onPlus: () -> Unit, modifier: Modifier = Modifier, canMinus: Boolean = true, canPlus: Boolean = true) {
    val c = Lectio.colors
    Row(modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = LectioText.prose(LectioText.body), color = c.ink)
        androidx.compose.material3.IconButton(onMinus, enabled = canMinus) { Symbol("minus.circle", tint = if (canMinus) c.rubric else c.inkFaint, contentDescription = "Less") }
        Text(value, style = LectioText.figure(LectioText.title3), color = c.ink)
        androidx.compose.material3.IconButton(onPlus, enabled = canPlus) { Symbol("plus.circle", tint = if (canPlus) c.rubric else c.inkFaint, contentDescription = "More") }
    }
}
