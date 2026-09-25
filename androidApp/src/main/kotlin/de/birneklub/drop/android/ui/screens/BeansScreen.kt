package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.IconBox
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.ProgressBar
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.android.ui.fmt
import de.birneklub.drop.core.domain.FreshnessPhase
import de.birneklub.drop.core.domain.RoastFreshness
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.BeanStatus
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

private enum class BeanFilter(val label: String, val status: BeanStatus?) {
    ALL("Alle", null), OPEN("Offen", BeanStatus.OPEN), FROZEN("Eingefroren", BeanStatus.FROZEN), ARCHIVED("Archiv", BeanStatus.ARCHIVED)
}

/** Stable color per bean for the little bag swatch. */
fun bagColor(bean: Bean): Color {
    val palette = listOf(0xFF2A211B, 0xFF7A4B2A, 0xFF5B2E2A, 0xFF8C3F4A, 0xFF3E4A2F, 0xFF4A3226, 0xFF2F3A4A, 0xFF6B2A3A)
    return Color(palette[(bean.id.hashCode() and 0x7fffffff) % palette.size])
}

@Composable
fun BeansScreen(vm: DropsViewModel, nav: NavController) {
    val lib by vm.library.collectAsStateWithLifecycle()
    var filter by rememberSaveable { mutableStateOf(BeanFilter.ALL) }
    var query by rememberSaveable { mutableStateOf("") }
    val today = vm.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    val c = Drops.colors

    val visible = lib.beans.filter { b ->
        (filter.status == null || b.status == filter.status) &&
            (query.isBlank() || listOf(b.name, b.roaster, b.country, b.region, b.process.name).plus(b.tastingNotes).joinToString(" ").contains(query.trim(), ignoreCase = true))
    }

    Box(Modifier.fillMaxSize()) {
        ScreenColumn(contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 110.dp)) {
            ScreenTitle("Bohnen", "${lib.beans.size} Röstungen · ${lib.beans.map { it.country }.distinct().size} Länder")

            Row(
                Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(24.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(24.dp)).padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(DropsIcons.Search, null, tint = c.muted, size = 18.dp)
                Box(Modifier.weight(1f)) {
                    if (query.isEmpty()) Text("Bohne, Rösterei, Land, Aroma …", style = DropsType.body, color = c.muted)
                    BasicTextField(query, { query = it }, singleLine = true, textStyle = DropsType.body.copy(color = c.ink), cursorBrush = SolidColor(c.accent), modifier = Modifier.fillMaxWidth().a11y("Bohnen durchsuchen"))
                }
            }

            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                BeanFilter.entries.forEach { f ->
                    val count = f.status?.let { s -> lib.beans.count { it.status == s } }
                    Chip(if (count != null) "${f.label} $count" else f.label, filter == f) { filter = f }
                }
            }

            val open = visible.filter { it.status == BeanStatus.OPEN }
            val frozen = visible.filter { it.status == BeanStatus.FROZEN }
            val archived = visible.filter { it.status == BeanStatus.ARCHIVED }

            if (open.isNotEmpty()) {
                Eyebrow("Im Einsatz")
                open.forEach { OpenBeanRow(it, today) { nav.navigate(Routes.bean(it.id)) } }
            }
            if (frozen.isNotEmpty()) {
                Eyebrow("Eingefroren")
                DropsCard(padding = PaddingValues(0.dp)) {
                    frozen.forEachIndexed { i, b ->
                        if (i > 0) de.birneklub.drop.android.ui.Divider()
                        Row(
                            Modifier.fillMaxWidth().clickable { nav.navigate(Routes.bean(b.id)) }.padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            IconBox(DropsIcons.Snow, c.ice, c.iceSoft, 36.dp)
                            Column(Modifier.weight(1f)) {
                                Text(b.name, style = DropsType.bodyStrong, color = c.ink)
                                Text("${b.country} · ${b.roaster}", style = DropsType.caption, color = c.muted)
                            }
                            Text("${b.frozenDoses} × 18 g", style = DropsType.small.copy(fontFamily = MonoFamily), color = c.ink)
                        }
                    }
                }
            }
            if (archived.isNotEmpty()) {
                Eyebrow("Archiv")
                archived.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        pair.forEach { b ->
                            DropsCard(Modifier.weight(1f), onClick = { nav.navigate(Routes.bean(b.id)) }, padding = PaddingValues(12.dp)) {
                                Text(b.name, style = DropsType.bodyStrong, color = c.ink)
                                Text("${b.country} · ${b.roaster}", style = DropsType.caption, color = c.muted)
                                Text(
                                    (b.rating?.fmt() ?: "–") + if (b.wouldRebuy == true) " · wieder kaufen" else "",
                                    style = DropsType.small.copy(fontFamily = MonoFamily), color = c.accent, modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                        if (pair.size == 1) Box(Modifier.weight(1f))
                    }
                }
            }
            if (visible.isEmpty() && lib.loaded) {
                DropsCard(Modifier.fillMaxWidth()) { Text("Keine Bohne passt zu „$query“.", style = DropsType.body, color = c.muted) }
            }
        }

        Box(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(60.dp)
                .shadow(8.dp, RoundedCornerShape(30.dp))
                .clip(RoundedCornerShape(30.dp))
                .background(c.accent)
                .clickable(role = Role.Button) { nav.navigate(Routes.ADD_BEAN) }
                .a11y("Neue Bohne hinzufügen"),
            contentAlignment = Alignment.Center,
        ) { Icon(DropsIcons.Plus, null, tint = c.onAccent, size = 26.dp) }
    }
}

@Composable
private fun OpenBeanRow(bean: Bean, today: kotlinx.datetime.LocalDate, onClick: () -> Unit) {
    val c = Drops.colors
    val fresh = bean.roastDate?.let { RoastFreshness.evaluate(it, today) }
    DropsCard(Modifier.fillMaxWidth(), onClick = onClick, padding = PaddingValues(14.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(52.dp, 64.dp).clip(RoundedCornerShape(10.dp)).background(bagColor(bean)), contentAlignment = Alignment.BottomCenter) {
                Text(bean.country.take(3).uppercase(), style = DropsType.eyebrow.copy(fontSize = 10.sp), color = Color(0xFFF6EFE6), modifier = Modifier.padding(bottom = 8.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(bean.name + if (bean.inHopper) " ●" else "", style = DropsType.bodyStrong.copy(fontSize = 16.sp), color = c.ink)
                    if (fresh != null) {
                        val col = when (fresh.phase) { FreshnessPhase.RESTING -> c.muted; FreshnessPhase.PEAK -> c.ok; FreshnessPhase.FADING -> c.accent }
                        Text("Tag ${fresh.daysSinceRoast}", style = DropsType.caption.copy(fontFamily = MonoFamily), color = col)
                    }
                }
                Text("${bean.roaster} · ${processLabel(bean.process)} · ${bean.tastingNotes.take(2).joinToString(", ")}", style = DropsType.small, color = c.muted, maxLines = 1)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ProgressBar((bean.remainingGrams / bean.weightGrams).toFloat(), c.ink, Modifier.weight(1f), height = 5.dp)
                    Text("${bean.remainingGrams.fmt(0)} g", style = DropsType.caption.copy(fontFamily = MonoFamily, fontSize = 11.sp), color = c.muted)
                }
            }
        }
    }
}
