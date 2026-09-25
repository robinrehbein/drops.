package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.HeroCard
import de.birneklub.drop.android.ui.IconBox
import de.birneklub.drop.android.ui.LibraryState
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.ProgressBar
import de.birneklub.drop.android.ui.SectionHeader
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.core.domain.FlavorCategory
import de.birneklub.drop.core.domain.Palate
import de.birneklub.drop.data.DiscoverCatalog

/**
 * "Entdecken" content shown under the map in its Entdecken mode. Tapping an
 * entry focuses its pin on the map. Recommendations and places are example
 * content until a catalogue source is connected (docs/native-app.md).
 */
@Composable
fun DiscoverContent(
    lib: LibraryState,
    selectedKey: String?,
    placeFilter: Int,
    onPlaceFilter: (Int) -> Unit,
    onFocus: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val profile = remember(lib.beans) { Palate.profile(lib.beans) }
    var saved by rememberSaveable { mutableStateOf(setOf<String>()) }
    val c = Drops.colors

    Column(modifier, verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(
            "Auf Basis von ${profile.ratedBeans} bewerteten Röstungen und ${lib.shots.size} Shots. Tippe auf einen Eintrag, um ihn auf der Karte zu sehen.",
            style = DropsType.small, color = c.muted,
        )

        HeroCard {
            Eyebrow("Dein Gaumen", c.heroAccent)
            val top = profile.scores.entries.sortedByDescending { it.value }.take(2).map { categoryLabel(it.key).lowercase() }
            Text(
                "${if (profile.prefersWashed) "Gewaschen" else "Natural & Honey"}, ${top.joinToString(" und ")}." +
                    (profile.favouriteCountry?.let { " $it holt bei dir die besten Noten." } ?: ""),
                style = DropsType.headline.copy(fontSize = 24.sp, lineHeight = 28.sp), color = c.heroInk,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FlavorCategory.entries.forEach { cat ->
                    val v = profile.scores[cat] ?: 0.0
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(categoryLabel(cat), style = DropsType.caption, color = c.heroMuted, modifier = Modifier.width(92.dp))
                        ProgressBar(v.toFloat(), if (v >= 0.5) c.heroAccent else Color(0xFF8F8275), Modifier.weight(1f), track = c.heroLine)
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionHeader("Könnte dir schmecken", trailing = "${DiscoverCatalog.recommendations.size} Vorschläge")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                DiscoverCatalog.recommendations.forEach { r ->
                    val key = "r:${r.id}"
                    DropsCard(Modifier.width(250.dp).then(if (selectedKey == key) Modifier.border(1.dp, c.ink, RoundedCornerShape(20.dp)) else Modifier), onClick = { onFocus(key) }) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${r.roaster}, ${r.roasterCity}", style = DropsType.caption, color = c.muted)
                            Eyebrow(r.origin)
                            Text(r.name, style = DropsType.headline, color = c.ink)
                            Text(r.notes, style = DropsType.small, color = c.muted)
                            Text(r.reason, style = DropsType.caption, color = c.ink, modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(c.okSoft).padding(horizontal = 10.dp, vertical = 8.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(r.price, style = DropsType.small.copy(fontFamily = MonoFamily), color = c.ink)
                                val isSaved = r.id in saved
                                TextAction(if (isSaved) "Gemerkt ✓" else "Merken", { saved = if (isSaved) saved - r.id else saved + r.id })
                            }
                        }
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionHeader("In deiner Nähe", trailing = "Beispiel: ${DiscoverCatalog.EXAMPLE_AREA}")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Cafés", "Röstereien", "Jetzt offen").forEachIndexed { i, l -> Chip(l, placeFilter == i) { onPlaceFilter(i) } }
            }
            DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(0.dp)) {
                DiscoverCatalog.places.filter { placeFilterMatches(it, placeFilter) }.forEachIndexed { i, p ->
                    if (i > 0) de.birneklub.drop.android.ui.Divider()
                    val key = "p:${p.id}"
                    Row(
                        Modifier.fillMaxWidth().background(if (selectedKey == key) c.paper else c.surface)
                            .clickable(role = Role.Button) { onFocus(key) }.padding(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        IconBox(if (p.isRoaster && !p.servesCoffee) DropsIcons.Grinder else DropsIcons.Coffee, if (p.openNow) c.accent else c.muted, if (p.openNow) c.warnSoft else c.track, 48.dp)
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(p.name, style = DropsType.bodyStrong, color = c.ink)
                                Text(
                                    if (p.distanceMeters < 1000) "${p.distanceMeters} m" else "${"%.1f".format(p.distanceMeters / 1000.0).replace('.', ',')} km",
                                    style = DropsType.small.copy(fontFamily = MonoFamily), color = c.muted,
                                )
                            }
                            Text(p.description, style = DropsType.small, color = c.muted)
                            Text(p.hours + (p.note?.let { " · $it" } ?: ""), style = DropsType.small, color = if (p.openNow) c.ok else c.muted)
                        }
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionHeader("Auf Reisen")
            DiscoverCatalog.cityGuides.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { g ->
                        val key = "t:${g.id}"
                        DropsCard(
                            Modifier.weight(1f).then(if (selectedKey == key) Modifier.border(1.dp, c.ink, RoundedCornerShape(20.dp)) else Modifier),
                            onClick = { onFocus(key) }, padding = PaddingValues(14.dp),
                        ) {
                            Text(g.city, style = DropsType.headline.copy(fontSize = 24.sp), color = c.ink)
                            Text("${g.cafes} Cafés · ${g.roasters} Röstereien", style = DropsType.small, color = c.muted)
                        }
                    }
                }
            }
            Box(Modifier.padding(bottom = 4.dp))
        }
    }
}

private fun categoryLabel(c: FlavorCategory) = when (c) {
    FlavorCategory.FLORAL -> "Floral"
    FlavorCategory.FRUITY -> "Fruchtig"
    FlavorCategory.SWEET -> "Süße"
    FlavorCategory.CHOCOLATE -> "Schokolade"
}
