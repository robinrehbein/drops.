package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.HeroCard
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.SectionHeader
import de.birneklub.drop.android.ui.Stat
import de.birneklub.drop.android.ui.TaskRow
import de.birneklub.drop.android.ui.fmt
import de.birneklub.drop.android.ui.label
import de.birneklub.drop.core.domain.FreshnessPhase
import de.birneklub.drop.core.domain.RoastFreshness
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Recipe
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toJavaInstant
import kotlinx.datetime.toLocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.floor
import kotlin.time.Duration.Companion.days

/** Scrollable screen body shared by the tab screens. */
@Composable
fun ScreenColumn(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 32.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier.fillMaxSize().background(Drops.colors.paper).statusBarsPadding().verticalScroll(rememberScrollState()).padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        content = content,
    )
}

@Composable
fun ScreenTitle(title: String, trailing: String? = null, trailingColor: Color = Drops.colors.muted) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
        Text(title, style = DropsType.display, color = Drops.colors.ink)
        if (trailing != null) Text(trailing, style = DropsType.caption.copy(fontFamily = de.birneklub.drop.android.ui.MonoFamily), color = trailingColor)
    }
}

val TasteLabels = listOf("Sauer", "Etwas sauer", "Ausgewogen", "Leicht bitter", "Bitter")

@Composable
fun tasteColor(index: Int): Color = with(Drops.colors) { listOf(accent, heroAccent, ok, muted, ink)[index] }

@Composable
fun TodayScreen(vm: DropsViewModel, nav: NavController) {
    val lib by vm.library.collectAsStateWithLifecycle()
    val now = vm.now()
    val zone = TimeZone.currentSystemDefault()
    val date = DateTimeFormatter.ofPattern("EEEE · d. MMMM", Locale.GERMANY).format(now.toJavaInstant().atZone(java.time.ZoneId.systemDefault()))

    ScreenColumn {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Eyebrow(date)
            Text(greeting(now.toLocalDateTime(zone).hour), style = DropsType.display, color = Drops.colors.ink)
        }

        val bean = lib.hopperBean
        if (bean != null) {
            HopperCard(bean, lib.recipesFor(bean.id).firstOrNull(), now.toLocalDateTime(zone).date,
                onShot = { nav.navigate(Routes.shot(bean.id)) }, onRecipe = { nav.navigate(Routes.bean(bean.id)) })
        } else if (lib.loaded) {
            HeroCard {
                Eyebrow("Im Trichter", Drops.colors.heroAccent)
                Text("Keine offene Tüte.", style = DropsType.headline, color = Drops.colors.heroInk)
                PillButton("Bohne auswählen", { nav.navigate(Routes.BEANS) }, kind = ButtonKind.Hero)
            }
        }

        val uri = LocalUriHandler.current
        val low = lib.runningLow().take(2)
        if (low.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionHeader("Geht zur Neige")
                DropsCard(padding = PaddingValues(0.dp)) {
                    low.forEachIndexed { i, (b, left) ->
                        if (i > 0) de.birneklub.drop.android.ui.Divider()
                        Row(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(b.name, style = DropsType.bodyStrong, color = Drops.colors.ink)
                                Text(if (left == 0) "leer" else "noch $left Shots · ${b.roaster}", style = DropsType.caption, color = Drops.colors.warn)
                            }
                            val link = vm.reorderLink(b)
                            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                PillButton("Nachkaufen", { uri.openUri(vm.open(link, reorder = true)) }, kind = ButtonKind.Ink, height = 40.dp)
                                if (link.sponsored) de.birneklub.drop.android.ui.AdLabel()
                            }
                        }
                    }
                }
            }
        }

        val due = lib.carePlan(now).filter { it.progress >= 0.8 }.take(3)
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionHeader("Fällig", "Alle Pflege", { nav.navigate(Routes.SETUP) })
            if (due.isEmpty()) {
                DropsCard { Text("Alles gepflegt.", style = DropsType.body, color = Drops.colors.ok) }
            } else {
                DropsCard(padding = PaddingValues(0.dp)) {
                    due.forEachIndexed { i, s ->
                        if (i > 0) de.birneklub.drop.android.ui.Divider()
                        TaskRow(s, compact = true, onBuy = { uri.openUri(vm.open(vm.supplyLink(it), reorder = false)) }, buySponsored = vm.supplyLinksSponsored) { vm.completeTask(s) }
                    }
                }
            }
        }

        val recent = lib.shots.sortedByDescending { it.pulledAt }.take(3)
        if (recent.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                val week = lib.shots.count { now - it.pulledAt < 7.days }
                SectionHeader("Letzte Shots", trailing = "Diese Woche $week")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    recent.forEach { s ->
                        DropsCard(Modifier.weight(1f), onClick = { nav.navigate(Routes.bean(s.beanId)) }, padding = PaddingValues(12.dp)) {
                            Text(relativeDay(s.pulledAt, now), style = DropsType.caption, color = Drops.colors.muted)
                            Text("${s.doseGrams.fmt(0)}→${s.yieldGrams.fmt(0)} · ${s.timeSec.fmt(0)}s", style = DropsType.small.copy(fontFamily = de.birneklub.drop.android.ui.MonoFamily), color = Drops.colors.ink, modifier = Modifier.padding(vertical = 6.dp))
                            Text(TasteLabels[s.taste.ordinal], style = DropsType.caption, color = tasteColor(s.taste.ordinal))
                        }
                    }
                }
            }
        }
    }
}

private fun greeting(hour: Int) = when (hour) {
    in 5..10 -> "Guten Morgen."
    in 11..16 -> "Guten Tag."
    else -> "Guten Abend."
}

fun relativeDay(at: kotlinx.datetime.Instant, now: kotlinx.datetime.Instant): String {
    val zone = TimeZone.currentSystemDefault()
    val d = at.toLocalDateTime(zone)
    val days = d.date.daysUntilSafe(now.toLocalDateTime(zone).date)
    return when {
        days == 0 -> "Heute %02d:%02d".format(d.hour, d.minute)
        days == 1 -> "Gestern"
        days < 7 -> listOf("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")[d.dayOfWeek.ordinal]
        else -> "${d.dayOfMonth}.${d.monthNumber}."
    }
}

private fun kotlinx.datetime.LocalDate.daysUntilSafe(other: kotlinx.datetime.LocalDate): Int =
    (other.toEpochDays() - toEpochDays())

@Composable
private fun HopperCard(bean: Bean, recipe: Recipe?, today: kotlinx.datetime.LocalDate, onShot: () -> Unit, onRecipe: () -> Unit) {
    val c = Drops.colors
    HeroCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Eyebrow("Im Trichter", c.heroAccent)
            val shots = floor(bean.remainingGrams / (recipe?.doseGrams ?: 18.0)).toInt()
            Text("${bean.remainingGrams.fmt(0)} / ${bean.weightGrams} g · ≈ $shots Shots", style = DropsType.caption.copy(fontFamily = de.birneklub.drop.android.ui.MonoFamily), color = c.heroMuted)
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(bean.name, style = DropsType.title.copy(fontSize = 34.sp), color = c.heroInk)
            Text("${bean.roaster} · ${bean.country} · ${processLabel(bean.process)}", style = DropsType.small.copy(fontSize = 14.sp), color = c.heroMuted)
        }
        bean.roastDate?.let { roast ->
            val f = RoastFreshness.evaluate(roast, today)
            val (label, color) = when (f.phase) {
                FreshnessPhase.RESTING -> "Noch ruhen lassen" to c.heroMuted
                FreshnessPhase.PEAK -> "Im Sweetspot" to c.heroInk
                FreshnessPhase.FADING -> "Bald aufbrauchen" to c.heroAccent
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Tag ${f.daysSinceRoast} nach Röstung", style = DropsType.caption, color = c.heroMuted)
                    Text(label, style = DropsType.caption, color = color)
                }
                FreshnessBar(f.daysSinceRoast)
            }
        }
        if (recipe != null) {
            Row(Modifier.fillMaxWidth().padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("Mahlgrad", recipe.grindSetting.fmt(), c.heroMuted, c.heroInk, Modifier.weight(1f))
                Stat("Ratio", "1:${recipe.ratio.fmt()}", c.heroMuted, c.heroInk, Modifier.weight(1f))
                Stat("Zeit", "${recipe.targetTimeMinSec}–${recipe.targetTimeMaxSec}s", c.heroMuted, c.heroInk, Modifier.weight(1.1f))
                Stat("Temp.", "${recipe.temperatureC}°", c.heroMuted, c.heroInk, Modifier.weight(0.8f))
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PillButton("Shot starten", onShot, Modifier.weight(1f), kind = ButtonKind.Hero, icon = DropsIcons.Timer)
            PillButton("Rezept", onRecipe, kind = ButtonKind.GhostOnHero)
        }
    }
}

@Composable
private fun FreshnessBar(days: Int) {
    val c = Drops.colors
    val max = 45f
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        BoxWithConstraints(Modifier.fillMaxWidth().height(16.dp)) {
            val w = maxWidth
            Box(Modifier.align(Alignment.CenterStart).fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(c.heroLine))
            Box(Modifier.align(Alignment.CenterStart).offset(x = w * (7 / max)).width(w * (21 / max)).height(8.dp).clip(RoundedCornerShape(4.dp)).background(Color(0xFF6B4A33)))
            Box(Modifier.align(Alignment.CenterStart).offset(x = w * (days.coerceAtMost(45) / max) - 2.dp).width(4.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).background(c.heroAccent))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf("0", "7", "28 Tage", "45").forEach { Text(it, style = DropsType.eyebrow.copy(fontSize = 10.sp, letterSpacing = 0.sp), color = Color(0xFF8F8275)) }
        }
    }
}

fun processLabel(p: de.birneklub.drop.core.model.Process) = when (p) {
    de.birneklub.drop.core.model.Process.WASHED -> "Washed"
    de.birneklub.drop.core.model.Process.NATURAL -> "Natural"
    de.birneklub.drop.core.model.Process.HONEY -> "Honey"
    de.birneklub.drop.core.model.Process.ANAEROBIC -> "Anaerob"
    de.birneklub.drop.core.model.Process.OTHER -> "Andere"
}
