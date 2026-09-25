package de.birneklub.drop.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.birneklub.drop.core.domain.TaskState
import de.birneklub.drop.core.domain.TaskStatus
import de.birneklub.drop.core.model.IntervalUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

// --- text helpers --------------------------------------------------------------

private val de = Locale.GERMANY

fun Double.fmt(decimals: Int = 1): String = String.format(Locale.ROOT, "%.${decimals}f", this)
fun Double.fmtDe(decimals: Int = 1): String = String.format(de, "%.${decimals}f", this)
fun Int.grouped(): String = String.format(de, "%,d", this)
fun euros(cents: Int?): String = cents?.let { String.format(de, "%.2f €", it / 100.0) } ?: "–"

fun TaskStatus.label(): String {
    val unit = task.intervalUnit
    fun amount(v: Double) = when (unit) {
        IntervalUnit.DAYS -> v.roundToInt().let { "$it ${if (it == 1) "Tag" else "Tagen"}" }
        IntervalUnit.KILOGRAMS -> "${v.fmtDe()} kg"
        IntervalUnit.SHOTS -> "${v.roundToInt()} Shots"
    }
    return when (state) {
        TaskState.OVERDUE -> when (unit) {
            IntervalUnit.DAYS -> abs(remaining).roundToInt().let { "$it ${if (it == 1) "Tag" else "Tage"} über" }
            else -> "${amount(abs(remaining)).removeSuffix("n")} über"
        }
        else -> if (unit == IntervalUnit.DAYS && remaining < 0.5) "heute" else "in ${amount(remaining)}"
    }
}

// --- building blocks ---------------------------------------------------------------

@Composable
fun Eyebrow(text: String, color: Color = Drops.colors.muted) =
    Text(text.uppercase(), style = DropsType.eyebrow, color = color)

@Composable
fun SectionHeader(title: String, action: String? = null, onAction: (() -> Unit)? = null, trailing: String? = null) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = DropsType.section, color = Drops.colors.ink)
        when {
            action != null && onAction != null -> TextAction(action, onAction)
            trailing != null -> Text(trailing, style = DropsType.small, color = Drops.colors.muted)
        }
    }
}

@Composable
fun TextAction(text: String, onClick: () -> Unit, color: Color = Drops.colors.accent) {
    Box(
        Modifier.defaultMinSize(minHeight = 44.dp).clip(RoundedCornerShape(8.dp)).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 4.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = DropsType.bodyStrong.copy(fontSize = 14.sp), color = color) }
}

@Composable
fun DropsCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    padding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier
            .clip(shape)
            .background(Drops.colors.surface)
            .border(1.dp, Drops.colors.line, shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(padding),
        content = content,
    )
}

@Composable
fun HeroCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(24.dp)).background(Drops.colors.hero).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        content = content,
    )
}

enum class ButtonKind { Accent, Hero, Ink, Ghost, GhostOnHero }

@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: ButtonKind = ButtonKind.Accent,
    height: Dp = 52.dp,
    enabled: Boolean = true,
    icon: ImageVector? = null,
) {
    val c = Drops.colors
    val (bg, fg, border) = when (kind) {
        ButtonKind.Accent -> Triple(c.accent, c.onAccent, null)
        ButtonKind.Hero -> Triple(c.heroAccent, Color(0xFF1E1915), null)
        ButtonKind.Ink -> Triple(c.inverse, c.onInverse, null)
        ButtonKind.Ghost -> Triple(Color.Transparent, c.ink, c.line)
        ButtonKind.GhostOnHero -> Triple(Color.Transparent, c.heroInk, Color(0xFF5A4A3E))
    }
    val shape = RoundedCornerShape(height / 2)
    Row(
        modifier
            .height(height)
            .clip(shape)
            .background(if (enabled) bg else bg.copy(alpha = 0.4f))
            .then(if (border != null) Modifier.border(1.dp, border, shape) else Modifier)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) Icon(icon, null, tint = fg, size = 20.dp)
        Text(text, style = DropsType.body.copy(fontWeight = if (kind == ButtonKind.Ghost || kind == ButtonKind.GhostOnHero) FontWeight.Medium else FontWeight.SemiBold, fontSize = 16.sp), color = fg, maxLines = 1)
    }
}

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    val c = Drops.colors
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier
            .height(36.dp)
            .clip(shape)
            .background(if (selected) c.inverse else Color.Transparent)
            .border(1.dp, if (selected) c.inverse else c.line, shape)
            .semantics { this.selected = selected }
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = DropsType.small.copy(fontSize = 14.sp, fontWeight = if (selected) FontWeight.Medium else FontWeight.Normal), color = if (selected) c.onInverse else c.ink)
    }
}

/** iOS-style segmented control. */
@Composable
fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier, textStyle: TextStyle = DropsType.bodyStrong.copy(fontSize = 14.sp)) {
    val c = Drops.colors
    Row(modifier.clip(RoundedCornerShape(14.dp)).background(c.track).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEachIndexed { i, label ->
            val on = i == selected
            Box(
                Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (on) c.surface else Color.Transparent)
                    .semantics { this.selected = on }
                    .clickable(role = Role.Tab) { onSelect(i) },
                contentAlignment = Alignment.Center,
            ) { Text(label, style = textStyle, color = if (on) c.ink else c.muted, textAlign = TextAlign.Center) }
        }
    }
}

@Composable
fun ProgressBar(progress: Float, color: Color, modifier: Modifier = Modifier, height: Dp = 6.dp, track: Color = Drops.colors.track) {
    Box(modifier.height(height).clip(RoundedCornerShape(height / 2)).background(track)) {
        Box(Modifier.fillMaxWidth(progress.coerceIn(0.02f, 1f)).height(height).clip(RoundedCornerShape(height / 2)).background(color))
    }
}

@Composable
fun IconBox(icon: ImageVector, tint: Color, background: Color, size: Dp = 40.dp) {
    Box(Modifier.size(size).clip(RoundedCornerShape(12.dp)).background(background), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = tint, size = size / 2)
    }
}

@Composable
fun Stat(label: String, value: String, labelColor: Color, valueColor: Color, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = DropsType.caption.copy(fontSize = 11.sp), color = labelColor)
        Text(value, style = DropsType.number, color = valueColor, maxLines = 1)
    }
}

fun stateColors(state: TaskState, c: DropsColors): Pair<Color, Color> = when (state) {
    TaskState.OVERDUE -> c.bad to c.badSoft
    TaskState.SOON -> c.warn to c.warnSoft
    TaskState.OK -> c.ok to c.okSoft
}

@Composable
fun TaskRow(status: TaskStatus, compact: Boolean, onBuy: ((String) -> Unit)? = null, buySponsored: Boolean = false, onDone: () -> Unit) {
    val c = Drops.colors
    val (fg, soft) = stateColors(status.state, c)
    Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            IconBox(if (status.task.intervalUnit == IntervalUnit.KILOGRAMS) DropsIcons.Brush else DropsIcons.Drop, fg, soft)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(status.task.name, style = DropsType.bodyStrong, color = c.ink)
                Text(if (compact) status.label() else status.task.description.ifBlank { intervalText(status) }, style = DropsType.caption, color = if (compact) fg else c.muted)
            }
            PillButton("Erledigt", onDone, kind = if (status.state == TaskState.OK) ButtonKind.Ghost else ButtonKind.Ink, height = 40.dp)
        }
        if (!compact) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ProgressBar(status.progress.toFloat(), fg, Modifier.weight(1f))
                Text(status.label(), style = DropsType.caption.copy(fontFamily = MonoFamily), color = fg)
            }
        }
        val supply = status.task.supply
        if (supply != null && onBuy != null && status.state != TaskState.OK) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextAction("$supply nachkaufen ↗", { onBuy(supply) })
                if (buySponsored) AdLabel()
            }
        }
    }
}

fun intervalText(s: TaskStatus): String = when (s.task.intervalUnit) {
    IntervalUnit.DAYS -> "alle ${s.task.intervalValue.roundToInt()} Tage"
    IntervalUnit.KILOGRAMS -> "alle ${s.task.intervalValue.fmtDe(0)} kg"
    IntervalUnit.SHOTS -> "alle ${s.task.intervalValue.roundToInt()} Shots"
}

/** Required next to every partner (affiliate) link. */
@Composable
fun AdLabel() {
    val c = Drops.colors
    Text(
        "Anzeige",
        style = DropsType.caption.copy(fontSize = 11.sp),
        color = c.muted,
        modifier = Modifier.border(1.dp, c.line, RoundedCornerShape(6.dp)).padding(horizontal = 6.dp, vertical = 1.dp),
    )
}

@Composable
fun Divider() = Box(Modifier.fillMaxWidth().height(1.dp).background(Drops.colors.line))

@Composable
fun RowScope.Spacer1() = Box(Modifier.weight(1f))

fun Modifier.a11y(label: String) = semantics { contentDescription = label }
