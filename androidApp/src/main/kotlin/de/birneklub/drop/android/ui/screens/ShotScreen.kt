package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.Role
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
import de.birneklub.drop.android.ui.Icon
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.PillButton
import de.birneklub.drop.android.ui.Segmented
import de.birneklub.drop.android.ui.TextAction
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.android.ui.fmt
import de.birneklub.drop.core.domain.DialIn
import de.birneklub.drop.core.model.EquipmentKind
import de.birneklub.drop.core.model.GrindScale
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.core.model.Taste
import kotlin.math.round

@Composable
fun ShotScreen(vm: DropsViewModel, nav: NavController, beanId: String) {
    val lib by vm.library.collectAsStateWithLifecycle()
    val bean = lib.bean(beanId) ?: lib.hopperBean
    val c = Drops.colors
    if (bean == null) return
    val recipe: Recipe? = lib.recipesFor(bean.id).firstOrNull()

    var elapsed by rememberSaveable { mutableDoubleStateOf(0.0) }
    var running by remember { mutableStateOf(false) }
    // Pre-fill so a routine shot needs no typing: dial-in continues from the last
    // shot of this bean, the rest comes from the recipe.
    val last: Shot? = lib.shotsFor(bean.id).lastOrNull()
    val scale = lib.equipment.firstOrNull { it.kind == EquipmentKind.GRINDER }?.grindScale
    val step = scale?.step ?: 0.25
    var dose by rememberSaveable { mutableDoubleStateOf(recipe?.doseGrams ?: last?.doseGrams ?: 18.0) }
    var yieldG by rememberSaveable { mutableDoubleStateOf(recipe?.yieldGrams ?: last?.yieldGrams ?: 36.0) }
    var grind by rememberSaveable { mutableDoubleStateOf(last?.grindSetting ?: recipe?.grindSetting ?: scale?.espressoStart ?: 15.0) }
    var temp by rememberSaveable { mutableIntStateOf(recipe?.temperatureC ?: last?.temperatureC ?: 93) }
    var taste by rememberSaveable { mutableIntStateOf(Taste.BALANCED.ordinal) }
    var saved by remember { mutableStateOf<Shot?>(null) }

    LaunchedEffect(running) {
        if (!running) return@LaunchedEffect
        val start = withFrameMillis { it } - (elapsed * 1000).toLong()
        while (running) {
            withFrameMillis { now -> elapsed = (now - start) / 1000.0 }
        }
    }

    val tmin = recipe?.targetTimeMinSec ?: 25
    val tmax = recipe?.targetTimeMaxSec ?: 30
    val inZone = elapsed >= tmin && elapsed <= tmax
    val advice = DialIn.advise(Taste.entries[taste], elapsed, recipe, scale?.step ?: 0.5)

    Column(Modifier.fillMaxSize().background(c.paper).statusBarsPadding().navigationBarsPadding()) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextAction("Abbrechen", { nav.popBackStack() })
                Eyebrow("Shot #${(lib.equipment.firstOrNull { it.shotCount > 0 }?.shotCount ?: 0) + 1}")
                Box(Modifier.size(72.dp, 1.dp))
            }

            DropsCard(Modifier.fillMaxWidth(), padding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(c.hero), contentAlignment = Alignment.Center) {
                        Text(bean.name.take(1), style = DropsType.headline.copy(fontSize = 20.sp), color = c.heroAccent)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(bean.name, style = DropsType.bodyStrong, color = c.ink)
                        Text(recipe?.let { "Rezept „${it.name}“" } ?: "Noch kein Rezept", style = DropsType.caption, color = c.muted)
                    }
                }
            }

            // Timer ring with target window
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.size(220.dp).a11y("Laufzeit ${elapsed.fmt()} Sekunden, Ziel $tmin bis $tmax"), contentAlignment = Alignment.Center) {
                    Canvas(Modifier.fillMaxSize()) {
                        val stroke = 12.dp.toPx()
                        val inset = stroke / 2
                        val arcSize = Size(size.width - stroke, size.height - stroke)
                        val topLeft = Offset(inset, inset)
                        drawArc(c.track, 0f, 360f, false, topLeft, arcSize, style = Stroke(stroke))
                        drawArc(c.okSoft, -90f + tmin / 40f * 360f, (tmax - tmin) / 40f * 360f, false, topLeft, arcSize, style = Stroke(stroke))
                        drawArc(if (inZone) c.ok else c.accent, -90f, (elapsed / 40.0).coerceAtMost(1.0).toFloat() * 360f, false, topLeft, arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(elapsed.fmt(), style = DropsType.numberLarge.copy(fontSize = 56.sp), color = c.ink)
                        Text("Ziel $tmin–$tmax s", style = DropsType.small, color = c.muted)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PillButton(
                        if (running) "Stopp" else if (elapsed > 0) "Weiter" else "Start",
                        { running = !running; saved = null },
                        Modifier.size(150.dp, 52.dp),
                        kind = if (running) ButtonKind.Ink else ButtonKind.Accent,
                    )
                    PillButton("Zurücksetzen", { running = false; elapsed = 0.0; saved = null }, kind = ButtonKind.Ghost)
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stepper("Dosis", "${dose.fmt()} g", Modifier.weight(1f), { dose = round1(dose + 0.1) }, { dose = round1(dose - 0.1) })
                    Stepper("Ertrag", "${yieldG.fmt()} g", Modifier.weight(1f), { yieldG = round1(yieldG + 0.5) }, { yieldG = round1(yieldG - 0.5) })
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stepper(scale?.label?.takeIf { it == "Klicks" } ?: "Mahlgrad", grind.fmt(2).trimEnd('0').trimEnd('.'), Modifier.weight(1f), { grind = nudge(grind, step, scale) }, { grind = nudge(grind, -step, scale) })
                    Stepper("Temperatur", "$temp °C", Modifier.weight(1f), { temp++ }, { temp-- })
                }
                Text(
                    "Ratio 1:${(yieldG / dose).fmt(2)} · Flow ${if (elapsed > 0) (yieldG / elapsed).fmt() else "–"} g/s",
                    style = DropsType.small.copy(fontFamily = MonoFamily), color = c.muted, modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Wie schmeckt er?", style = DropsType.section, color = c.ink)
                Segmented(listOf("Sauer", "Leicht sauer", "Balance", "Leicht bitter", "Bitter"), taste, { taste = it; running = false; saved = null }, Modifier.fillMaxWidth(), DropsType.caption.copy(fontSize = 11.sp))
            }

            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.okSoft).padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(DropsIcons.Bulb, null, tint = c.ok, size = 20.dp)
                Text(adviceText(advice, grind), style = DropsType.body.copy(fontSize = 14.sp), color = c.ink)
            }

            saved?.let { shot ->
                if (advice.adoptAsRecipe) {
                    PillButton("Als Rezept übernehmen", { vm.adoptShot(shot); nav.popBackStack() }, Modifier.fillMaxWidth(), kind = ButtonKind.Ghost)
                }
            }
        }

        PillButton(
            if (saved != null) "Fertig" else "Shot speichern",
            {
                if (saved != null) {
                    nav.popBackStack()
                } else {
                    running = false
                    val now = vm.now()
                    val shot = Shot(vm.newId(), bean.id, recipe?.id, now, grind, dose, yieldG, round1(elapsed), temp, Taste.entries[taste], now)
                    vm.logShot(shot)
                    saved = shot
                }
            },
            Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            kind = ButtonKind.Ink,
            height = 56.dp,
        )
    }
}

private fun round1(v: Double) = round(v * 10) / 10

/** One step on the grinder's dial, kept inside its printed range. */
private fun nudge(grind: Double, delta: Double, scale: GrindScale?): Double {
    val next = round((grind + delta) * 100) / 100
    return scale?.clamp(next) ?: next
}

private fun adviceText(a: de.birneklub.drop.core.domain.DialInAdvice, grind: Double): String {
    val parts = mutableListOf<String>()
    if (a.grindDelta < 0) parts += "${(-a.grindDelta).fmt(2).trimEnd('0').trimEnd('.')} feiner mahlen (${(grind + a.grindDelta).fmt(2).trimEnd('0').trimEnd('.')})"
    if (a.grindDelta > 0) parts += "${a.grindDelta.fmt(2).trimEnd('0').trimEnd('.')} gröber mahlen (${(grind + a.grindDelta).fmt(2).trimEnd('0').trimEnd('.')})"
    if (a.temperatureDelta != 0) parts += "Temperatur ${if (a.temperatureDelta > 0) "+" else ""}${a.temperatureDelta} °C"
    if (a.yieldDeltaGrams != 0.0) parts += "oder ${-a.yieldDeltaGrams} g weniger Ertrag"
    val speed = when { a.ranFast -> " Lief zu schnell."; a.ranSlow -> " Lief zu lang."; else -> "" }
    return when {
        a.adoptAsRecipe -> "Treffer. Speichern und als Rezept übernehmen."
        parts.isEmpty() -> "Schmeckt, läuft aber lang.$speed"
        else -> "Nächster Shot: ${parts.joinToString(", ")}.$speed"
    }
}

@Composable
private fun Stepper(label: String, value: String, modifier: Modifier, onInc: () -> Unit, onDec: () -> Unit) {
    val c = Drops.colors
    DropsCard(modifier, padding = PaddingValues(start = 14.dp, end = 10.dp, top = 10.dp, bottom = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(label, style = DropsType.caption, color = c.muted)
                Text(value, style = DropsType.numberLarge.copy(fontSize = 20.sp), color = c.ink)
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                listOf("+" to onInc, "−" to onDec).forEach { (sym, action) ->
                    Box(
                        Modifier.size(44.dp, 30.dp).clip(RoundedCornerShape(10.dp)).background(c.paper).border(1.dp, c.line, RoundedCornerShape(10.dp))
                            .clickable(role = Role.Button, onClick = action).a11y("$label ${if (sym == "+") "erhöhen" else "verringern"}"),
                        contentAlignment = Alignment.Center,
                    ) { Text(sym, style = DropsType.body.copy(fontSize = 17.sp), color = c.ink) }
                }
            }
        }
    }
}
