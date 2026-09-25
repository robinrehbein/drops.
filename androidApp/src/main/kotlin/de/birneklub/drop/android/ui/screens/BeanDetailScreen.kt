package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import de.birneklub.drop.android.ui.ButtonKind
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsCard
import de.birneklub.drop.android.ui.DropsIcons
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.Eyebrow
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Routes
import de.birneklub.drop.android.ui.Segmented
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.android.ui.euros
import de.birneklub.drop.android.ui.fmt
import de.birneklub.drop.core.model.BeanStatus
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BeanDetailScreen(vm: DropsViewModel, nav: NavController, beanId: String) {
    val lib by vm.library.collectAsStateWithLifecycle()
    val bean = lib.bean(beanId)
    val c = Drops.colors
    if (bean == null) {
        Box(Modifier.fillMaxSize().background(c.paper))
        return
    }
    val recipes = lib.recipesFor(bean.id)
    var recipeIndex by rememberSaveable { mutableIntStateOf(0) }
    val recipe = recipes.getOrNull(recipeIndex.coerceAtMost(recipes.lastIndex))
    val shots = lib.shotsFor(bean.id)

    Column(Modifier.fillMaxSize().background(c.paper)) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // Header
            Column(Modifier.fillMaxWidth().background(c.hero).statusBarsPadding().padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(44.dp).clip(RoundedCornerShape(22.dp)).background(c.heroLine).clickable(role = Role.Button) { nav.popBackStack() }.a11y("Zurück"),
                        contentAlignment = Alignment.Center,
                    ) { Icon(DropsIcons.Back, null, tint = c.heroInk, size = 20.dp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        val (label, color) = when (bean.status) {
                            BeanStatus.OPEN -> "Offen" to Color(0xFF3E6A55)
                            BeanStatus.FROZEN -> "Eingefroren" to Color(0xFF2F5064)
                            BeanStatus.ARCHIVED -> "Archiv" to Color(0xFF5A4A3E)
                        }
                        Box(Modifier.height(32.dp).clip(RoundedCornerShape(16.dp)).background(color).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                            Text(label, style = DropsType.small.copy(fontSize = 13.sp), color = c.heroInk)
                        }
                        when {
                            bean.status == BeanStatus.FROZEN -> PillButton("Dose auftauen", { vm.thawDose(bean) }, kind = ButtonKind.GhostOnHero, height = 40.dp)
                            !bean.inHopper -> PillButton("In den Trichter", { vm.putInHopper(bean) }, kind = ButtonKind.GhostOnHero, height = 40.dp)
                        }
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Eyebrow("${bean.roaster}${bean.purchase?.city?.let { " · $it" } ?: ""}", c.heroAccent)
                    Text(bean.name, style = DropsType.display.copy(fontSize = 46.sp, lineHeight = 46.sp), color = c.heroInk)
                    Text(listOf(bean.country, bean.region, bean.altitude).filter { it.isNotBlank() }.joinToString(" · "), style = DropsType.body, color = c.heroMuted)
                }
                if (bean.tastingNotes.isNotEmpty()) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        bean.tastingNotes.forEach {
                            Text(it, style = DropsType.small, color = c.heroInk, modifier = Modifier.border(1.dp, Color(0xFF5A4A3E), RoundedCornerShape(14.dp)).padding(horizontal = 12.dp, vertical = 6.dp))
                        }
                    }
                }
            }

            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                FactsGrid(
                    listOf(
                        "Aufbereitung" to processLabel(bean.process), "Varietät" to bean.variety.ifBlank { "–" }, "Röstgrad" to bean.roastLevel.ifBlank { "–" },
                        "Geröstet" to (bean.roastDate?.let { "%02d.%02d.%02d".format(it.dayOfMonth, it.monthNumber, it.year % 100) } ?: "–"),
                        "Preis" to euros(bean.purchase?.priceCents), "Menge" to "${bean.weightGrams} g",
                    ),
                )

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Rezepte", style = DropsType.title.copy(fontSize = 28.sp), color = c.ink)
                        TextAction("+ Neu", {
                            val base = recipe ?: Recipe(vm.newId(), bean.id, "Espresso", 15.0, 1200, 18.0, 36.0, 26, 30, 93, updatedAt = vm.now())
                            vm.saveRecipe(base.copy(id = vm.newId(), name = "Rezept ${recipes.size + 1}"), "Rezept angelegt")
                            recipeIndex = recipes.size
                        })
                    }
                    if (recipe == null) {
                        DropsCard(Modifier.fillMaxWidth()) { Text("Noch kein Rezept. Brüh einen Shot und übernimm ihn als Rezept.", style = DropsType.body, color = c.muted) }
                    } else {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            recipes.forEachIndexed { i, r -> Chip(r.name, r.id == recipe.id) { recipeIndex = i } }
                        }
                        RecipeCard(recipe)
                    }
                }

                if (shots.size > 1) DialInChart(shots)

                DropsCard(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text("Dein Urteil", style = DropsType.small, color = c.muted)
                            Text("${bean.rating?.fmt() ?: "–"} / 5", style = DropsType.headline, color = c.ink)
                        }
                        Row {
                            (1..5).forEach { i ->
                                val filled = (bean.rating ?: 0.0) >= i - 0.5
                                Box(Modifier.size(40.dp, 44.dp).clickable(role = Role.Button) { vm.rate(bean, i) }.a11y("$i Sterne"), contentAlignment = Alignment.Center) {
                                    Icon(if (filled) DropsIcons.StarFilled else DropsIcons.Star, null, tint = c.accent, size = 22.dp)
                                }
                            }
                        }
                    }
                    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Wieder kaufen?", style = DropsType.body, color = c.ink)
                        Segmented(listOf("Ja", "Nein"), when (bean.wouldRebuy) { true -> 0; false -> 1; null -> -1 }, { vm.setRebuy(bean, it == 0) }, Modifier.size(180.dp, 52.dp))
                    }
                    bean.purchase?.let { p ->
                        Text("Gekauft bei ${p.shopName}, ${p.city}", style = DropsType.small, color = c.muted)
                    }
                    if (bean.wouldRebuy != false) {
                        val uri = LocalUriHandler.current
                        val link = vm.reorderLink(bean)
                        if (link.sponsored) Row(Modifier.padding(top = 12.dp)) { de.birneklub.drop.android.ui.AdLabel() }
                        PillButton(
                            if (bean.purchase?.url != null) "Beim Röster nachkaufen" else "Nachkaufen suchen",
                            { uri.openUri(vm.open(link, reorder = true)) },
                            Modifier.fillMaxWidth().padding(top = 12.dp), kind = ButtonKind.Ghost, height = 44.dp, icon = DropsIcons.Cart,
                        )
                    }
                }
            }
        }

        if (bean.status == BeanStatus.OPEN) {
            Column(Modifier.fillMaxWidth().background(c.paper).navigationBarsPadding()) {
                de.birneklub.drop.android.ui.Divider()
                PillButton("Mit diesem Rezept brühen", { nav.navigate(Routes.shot(bean.id)) }, Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), height = 56.dp)
            }
        }
    }
}

@Composable
private fun FactsGrid(facts: List<Pair<String, String>>) {
    val c = Drops.colors
    Column(Modifier.clip(RoundedCornerShape(16.dp)).border(1.dp, c.line, RoundedCornerShape(16.dp)).background(c.line), verticalArrangement = Arrangement.spacedBy(1.dp)) {
        facts.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                row.forEach { (k, v) ->
                    Column(Modifier.weight(1f).background(c.surface).padding(12.dp)) {
                        Text(k, style = DropsType.caption.copy(fontSize = 11.sp), color = c.muted)
                        Text(v, style = DropsType.bodyStrong.copy(fontSize = 14.sp), color = c.ink, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
private fun RecipeCard(r: Recipe) {
    val c = Drops.colors
    DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(0.dp)) {
        val cells = listOf(
            Triple("Mahlgrad", r.grindSetting.fmt(), true), Triple("RPM", r.rpm?.toString() ?: "–", false),
            Triple("Dosis → Ertrag", "${r.doseGrams.fmt()} → ${r.yieldGrams.fmt()} g", false), Triple("Zeit", "${r.targetTimeMinSec}–${r.targetTimeMaxSec} s", false),
            Triple("Brühtemperatur", "${r.temperatureC} °C", false), Triple("Pre-Infusion", r.preinfusion.ifBlank { "–" }, false),
        )
        cells.chunked(2).forEach { row ->
            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                row.forEach { (k, v, accent) ->
                    Column(Modifier.weight(1f)) {
                        Text(k, style = DropsType.caption, color = c.muted)
                        Text(v, style = DropsType.numberLarge.copy(fontSize = 20.sp), color = if (accent) c.accent else c.ink)
                    }
                }
            }
        }
        de.birneklub.drop.android.ui.Divider()
        Text(
            listOf(r.equipmentNotes, "Ratio 1:${r.ratio.fmt(2)}").filter { it.isNotBlank() }.joinToString(" · "),
            style = DropsType.small, color = c.muted, modifier = Modifier.padding(16.dp),
        )
    }
}

@Composable
private fun DialInChart(shots: List<Shot>) {
    val c = Drops.colors
    val colors = listOf(c.accent, c.heroAccent, c.ok, c.muted, c.ink)
    val grinds = shots.map { it.grindSetting }
    val min = (grinds.min() * 2).let { kotlin.math.floor(it) / 2 } - 0.5
    val max = (grinds.max() * 2).let { kotlin.math.ceil(it) / 2 } + 0.5
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        de.birneklub.drop.android.ui.SectionHeader("Dial-in · ${shots.size} Shots", trailing = "Mahlgrad je Shot")
        DropsCard(Modifier.fillMaxWidth()) {
            Row {
                Column(Modifier.height(120.dp), verticalArrangement = Arrangement.SpaceBetween) {
                    listOf(max, (max + min) / 2, min).forEach { Text(it.fmt(), style = DropsType.caption.copy(fontFamily = MonoFamily, fontSize = 10.sp), color = c.muted) }
                }
                Canvas(Modifier.weight(1f).height(120.dp).padding(start = 8.dp).a11y("Mahlgrad von ${grinds.first().fmt()} auf ${grinds.last().fmt()}")) {
                    val pad = 8.dp.toPx()
                    fun x(i: Int) = pad + if (shots.size == 1) 0f else i * (size.width - 2 * pad) / (shots.size - 1)
                    fun y(g: Double) = (pad + (max - g) / (max - min) * (size.height - 2 * pad)).toFloat()
                    listOf(max, (max + min) / 2, min).forEach { drawLine(c.track, Offset(0f, y(it)), Offset(size.width, y(it)), 1.dp.toPx()) }
                    val path = Path().apply { shots.forEachIndexed { i, s -> if (i == 0) moveTo(x(i), y(s.grindSetting)) else lineTo(x(i), y(s.grindSetting)) } }
                    drawPath(path, c.ink, style = Stroke(1.5.dp.toPx()))
                    shots.forEachIndexed { i, s ->
                        val last = i == shots.lastIndex
                        drawCircle(colors[s.taste.ordinal], radius = (if (last) 6 else 5).dp.toPx(), center = Offset(x(i), y(s.grindSetting)))
                        if (last) drawCircle(c.ink, radius = 6.dp.toPx(), center = Offset(x(i), y(s.grindSetting)), style = Stroke(2.dp.toPx()))
                    }
                }
            }
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                shots.map { it.taste.ordinal }.distinct().sorted().forEach { t ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(colors[t]))
                        Text(TasteLabels[t], style = DropsType.caption, color = c.muted)
                    }
                }
            }
        }
    }
}
