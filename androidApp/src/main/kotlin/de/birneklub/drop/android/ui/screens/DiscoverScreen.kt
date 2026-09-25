package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.HeroCard
import de.birneklub.drop.android.ui.IconBox
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.ProgressBar
import de.birneklub.drop.android.ui.SectionHeader
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.core.domain.FlavorCategory
import de.birneklub.drop.core.domain.Palate

/**
 * Recommendations and cafés are example content until a catalogue/places
 * source is connected (see docs/native-app.md, open points).
 */
private data class Recommendation(val id: String, val origin: String, val name: String, val roaster: String, val notes: String, val price: String, val reason: String)
private data class Place(val name: String, val roaster: Boolean, val distanceM: Int, val description: String, val open: Boolean, val hours: String, val extra: String? = null)

private val recommendations = listOf(
    Recommendation("r1", "Kenia · Kiambu", "Kamundu Peaberry", "Röstwerk Nord", "Washed · Cassis, Grapefruit", "18,90 € / 250 g", "Weil du Karogoto AA mit 4.5 bewertet hast."),
    Recommendation("r2", "Burundi · Kayanza", "Gatukuza", "Bohnenwerk", "Washed · Hibiskus, Rote Johannisbeere", "17,50 € / 250 g", "Floral und hell geröstet, wie deine Favoriten."),
    Recommendation("r3", "Äthiopien · Sidama", "Bensa Shantawene", "Nordlys Kaffe", "Natural · Blaubeere, Kakaonibs", "19,00 € / 250 g", "Sidamo Bensa gehört zu deinen Top 3."),
)

private val places = listOf(
    Place("Siebwerk", false, 350, "Espressobar · Gaströster wechseln wöchentlich", true, "Geöffnet bis 18:00", "schenkt gerade Guji Hambela aus"),
    Place("Kontor 17", false, 1200, "Filter-Bar · V60, Batch Brew, Cupping samstags", true, "Geöffnet bis 17:00"),
    Place("Bohne & Brise", true, 2400, "Café mit eigener Rösterei · Frühstück", false, "Öffnet morgen 08:00"),
    Place("Hafenrösterei", true, 3100, "Rösterei mit Probierbar", true, "Geöffnet bis 19:00", "deine meistgekaufte Rösterei"),
)

private val cities = listOf("Kopenhagen" to "14 Cafés · 5 Röstereien", "Wien" to "11 Cafés · 3 Röstereien", "Berlin" to "23 Cafés · 9 Röstereien", "Amsterdam" to "17 Cafés · 6 Röstereien")

@Composable
fun DiscoverScreen(vm: DropsViewModel) {
    val lib by vm.library.collectAsStateWithLifecycle()
    val profile = remember(lib.beans) { Palate.profile(lib.beans) }
    var filter by rememberSaveable { mutableStateOf(0) }
    var saved by rememberSaveable { mutableStateOf(setOf<String>()) }
    val c = Drops.colors

    ScreenColumn {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            ScreenTitle("Entdecken")
            Text("Auf Basis von ${profile.ratedBeans} bewerteten Röstungen und ${lib.shots.size} Shots", style = DropsType.small, color = c.muted)
        }

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
                        ProgressBar(v.toFloat(), if (v >= 0.5) c.heroAccent else androidx.compose.ui.graphics.Color(0xFF8F8275), Modifier.weight(1f), track = c.heroLine)
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionHeader("Könnte dir schmecken", trailing = "Beispiele")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                recommendations.forEach { r ->
                    DropsCard(Modifier.width(250.dp)) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Eyebrow(r.origin)
                            Text(r.name, style = DropsType.headline, color = c.ink)
                            Text("${r.roaster} · ${r.notes}", style = DropsType.small, color = c.muted)
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
            SectionHeader("In deiner Nähe", trailing = "Beispiel: Hamburg")
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Cafés", "Röstereien", "Jetzt offen").forEachIndexed { i, l -> Chip(l, filter == i) { filter = i } }
            }
            val shown = places.filter { when (filter) { 0 -> !it.roaster || it.name == "Bohne & Brise"; 1 -> it.roaster; else -> it.open } }
            DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(0.dp)) {
                shown.forEachIndexed { i, p ->
                    if (i > 0) de.birneklub.drop.android.ui.Divider()
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        IconBox(if (p.roaster) DropsIcons.Grinder else DropsIcons.Coffee, if (p.open) c.accent else c.muted, if (p.open) c.warnSoft else c.track, 48.dp)
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(p.name, style = DropsType.bodyStrong, color = c.ink)
                                Text(if (p.distanceM < 1000) "${p.distanceM} m" else "${"%.1f".format(p.distanceM / 1000.0).replace('.', ',')} km", style = DropsType.small.copy(fontFamily = MonoFamily), color = c.muted)
                            }
                            Text(p.description, style = DropsType.small, color = c.muted)
                            Text(p.hours + (p.extra?.let { " · $it" } ?: ""), style = DropsType.small, color = if (p.open) c.ok else c.muted)
                        }
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionHeader("Auf Reisen")
            cities.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { (city, info) ->
                        DropsCard(Modifier.weight(1f), padding = PaddingValues(14.dp)) {
                            Text(city, style = DropsType.headline.copy(fontSize = 24.sp), color = c.ink)
                            Text(info, style = DropsType.small, color = c.muted)
                        }
                    }
                }
            }
            Box(Modifier.height(4.dp))
        }
    }
}

private fun categoryLabel(c: FlavorCategory) = when (c) {
    FlavorCategory.FLORAL -> "Floral"
    FlavorCategory.FRUITY -> "Fruchtig"
    FlavorCategory.SWEET -> "Süße"
    FlavorCategory.CHOCOLATE -> "Schokolade"
}
