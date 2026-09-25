package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.birneklub.drop.android.R
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.Segmented
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.core.domain.MapPoint
import de.birneklub.drop.core.domain.MapProjection
import de.birneklub.drop.core.model.Bean
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.hypot

/** Map artwork is authored on a 390 × 300 canvas (see core MapProjection). */
private const val ART_W = 390f
private const val ART_H = 300f

private data class Pin(val key: String, val title: String, val subtitle: String, val beans: List<Bean>, val point: MapPoint)

private class MapPaths(val world: Path, val europeLand: Path, val europeBorders: Path)

@Composable
private fun rememberMapPaths(): MapPaths? {
    val context = LocalContext.current
    val state = produceState<MapPaths?>(null) {
        value = withContext(Dispatchers.Default) {
            fun load(id: Int) = PathParser().parsePathString(context.resources.openRawResource(id).bufferedReader().use { it.readText() }).toPath()
            MapPaths(load(R.raw.map_world), load(R.raw.map_europe_land), load(R.raw.map_europe_borders))
        }
    }
    return state.value
}

@Composable
fun MapScreen(vm: DropsViewModel) {
    val lib by vm.library.collectAsStateWithLifecycle()
    var mode by rememberSaveable { mutableStateOf(0) } // 0 = origin, 1 = bought
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val paths = rememberMapPaths()
    val c = Drops.colors

    val pins = remember(lib.beans, mode) {
        val groups = if (mode == 0) {
            lib.beans.filter { it.origin != null }.groupBy { it.country }
        } else {
            lib.beans.filter { it.purchase?.location != null }.groupBy { it.purchase!!.city }
        }
        groups.map { (key, beans) ->
            val lat = beans.map { if (mode == 0) it.origin!!.lat else it.purchase!!.location!!.lat }.average()
            val lon = beans.map { if (mode == 0) it.origin!!.lon else it.purchase!!.location!!.lon }.average()
            val sub = if (mode == 0) beans.map { it.region }.distinct().joinToString(", ")
            else beans.map { "${it.purchase!!.shopName} · ${channelLabel(it.purchase!!.channel)}" }.distinct().joinToString(", ")
            Pin(key, key, sub, beans, if (mode == 0) MapProjection.world(lat, lon) else MapProjection.europe(lat, lon))
        }.sortedByDescending { it.beans.size }
    }
    val selectedPin = pins.firstOrNull { it.key == selected } ?: pins.firstOrNull()

    var scale by remember(mode) { mutableFloatStateOf(1f) }
    var pan by remember(mode) { mutableStateOf(Offset.Zero) }

    ScreenColumn(contentPadding = PaddingValues(top = 24.dp, bottom = 24.dp)) {
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            val roasters = lib.beans.mapNotNull { it.purchase?.shopName }.distinct().size
            ScreenTitle("Karte", if (mode == 0) "${pins.size} Länder · ${lib.beans.size} Röstungen" else "${pins.size} Städte · $roasters Röstereien")
            Segmented(listOf("Anbauregion", "Gekauft bei"), mode, { mode = it; selected = null }, Modifier.fillMaxWidth())
        }

        Box(
            Modifier.fillMaxWidth().height(300.dp).clipToBounds().background(c.sea)
                .a11y(if (mode == 0) "Weltkarte mit den Anbauregionen deiner Bohnen" else "Europakarte mit den Orten, an denen du gekauft hast"),
        ) {
            Canvas(
                Modifier.fillMaxWidth().height(300.dp)
                    .pointerInput(mode) {
                        detectTransformGestures { _, panChange, zoom, _ ->
                            scale = (scale * zoom).coerceIn(0.6f, 8f)
                            pan += panChange
                        }
                    }
                    .pointerInput(mode, pins) {
                        detectTapGestures { tap ->
                            val base = size.width / ART_W
                            val k = base * scale
                            val originX = (size.width - ART_W * k) / 2 + pan.x
                            val originY = (size.height - ART_H * k) / 2 + pan.y
                            pins.minByOrNull { p -> hypot(originX + p.point.x.toFloat() * k - tap.x, originY + p.point.y.toFloat() * k - tap.y) }
                                ?.takeIf { p -> hypot(originX + p.point.x.toFloat() * k - tap.x, originY + p.point.y.toFloat() * k - tap.y) < 28.dp.toPx() }
                                ?.let { selected = it.key }
                        }
                    },
            ) {
                val base = size.width / ART_W
                val k = base * scale
                val originX = (size.width - ART_W * k) / 2 + pan.x
                val originY = (size.height - ART_H * k) / 2 + pan.y
                withTransform({
                    translate(originX, originY)
                    scale(k, k, Offset.Zero)
                }) {
                    if (mode == 0) {
                        val t1 = MapProjection.world(23.44, 0.0).y.toFloat()
                        val t2 = MapProjection.world(-23.44, 0.0).y.toFloat()
                        drawRect(c.accent.copy(alpha = 0.07f), Offset(-600f, t1), androidx.compose.ui.geometry.Size(2000f, t2 - t1))
                        paths?.let {
                            drawPath(it.world, c.land)
                            drawPath(it.world, c.landLine, style = Stroke(0.6f / scale))
                        }
                        val dash = PathEffect.dashPathEffect(floatArrayOf(4f / scale, 4f / scale))
                        listOf(t1, t2).forEach { y -> drawLine(c.accent.copy(alpha = 0.45f), Offset(-600f, y), Offset(1400f, y), 1f / scale, pathEffect = dash) }
                    } else {
                        paths?.let {
                            drawPath(it.europeLand, c.land)
                            drawPath(it.europeBorders, c.landLine, style = Stroke(0.8f / scale))
                        }
                    }
                }
                pins.reversed().forEach { p ->
                    val on = p == selectedPin
                    val center = Offset(originX + p.point.x.toFloat() * k, originY + p.point.y.toFloat() * k)
                    val r = (6f + p.beans.size * 1.6f + if (on) 2f else 0f).dp.toPx()
                    drawCircle(c.surface, r + 2.dp.toPx(), center)
                    drawCircle(if (on) c.inverse else c.accent, r, center)
                }
            }
            Column(Modifier.align(Alignment.TopEnd).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                MapButton("+", "Hineinzoomen") { scale = (scale * 1.4f).coerceAtMost(8f) }
                MapButton("−", "Herauszoomen") { scale = (scale / 1.4f).coerceAtLeast(0.6f) }
                MapButton("⌂", "Ansicht zurücksetzen") { scale = 1f; pan = Offset.Zero }
            }
            if (paths == null) Text("Karte wird geladen …", style = DropsType.small, color = c.muted, modifier = Modifier.align(Alignment.Center))
        }

        Column(Modifier.padding(horizontal = 10.dp)) {
            pins.forEach { p ->
                val on = p == selectedPin
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 60.dp).clip(RoundedCornerShape(14.dp)).background(if (on) c.surface else c.paper)
                        .clickable(role = Role.Button) { selected = p.key }.padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(Modifier.size(10.dp).clip(RoundedCornerShape(5.dp)).background(if (on) c.inverse else c.accent))
                    Column(Modifier.weight(1f)) {
                        Text(p.title, style = DropsType.bodyStrong, color = c.ink)
                        Text(if (on) p.beans.joinToString(", ") { it.name } else p.subtitle, style = DropsType.small, color = c.muted)
                    }
                    Text("${p.beans.size} ${if (p.beans.size == 1) "Röstung" else "Röstungen"}", style = DropsType.small.copy(fontFamily = MonoFamily), color = c.muted)
                }
            }
        }
    }
}

@Composable
private fun MapButton(symbol: String, label: String, onClick: () -> Unit) {
    val c = Drops.colors
    Box(
        Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick).a11y(label),
        contentAlignment = Alignment.Center,
    ) { Text(symbol, style = DropsType.body, color = c.ink) }
}

fun channelLabel(ch: de.birneklub.drop.core.model.PurchaseChannel) = when (ch) {
    de.birneklub.drop.core.model.PurchaseChannel.IN_STORE -> "vor Ort"
    de.birneklub.drop.core.model.PurchaseChannel.ONLINE -> "online"
    de.birneklub.drop.core.model.PurchaseChannel.TRAVEL -> "auf Reisen"
}
