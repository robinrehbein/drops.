package de.birneklub.drop.android.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.birneklub.drop.android.R
import de.birneklub.drop.android.ui.Chip
import de.birneklub.drop.android.ui.Drops
import de.birneklub.drop.android.ui.DropsColors
import de.birneklub.drop.android.ui.DropsType
import de.birneklub.drop.android.ui.DropsViewModel
import de.birneklub.drop.android.ui.MonoFamily
import de.birneklub.drop.android.ui.Segmented
import de.birneklub.drop.android.ui.a11y
import de.birneklub.drop.core.domain.MapPoint
import de.birneklub.drop.core.domain.MapProjection
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.data.DiscoverCatalog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/** Map artwork is authored on a 390 × 300 canvas (see core MapProjection). */
private const val ART_W = 390f
private const val ART_H = 300f

enum class MapMode(val label: String) { ORIGIN("Anbauregion"), BOUGHT("Gekauft bei"), DISCOVER("Entdecken") }
enum class DiscoverLayer(val label: String) { NEARBY("In der Nähe"), RECOMMENDED("Empfehlungen"), TRAVEL("Reiseziele") }
enum class PinKind { BEAN, OPEN, CLOSED, RECOMMENDATION, TRAVEL, ME }

data class MapPin(
    val key: String,
    val title: String,
    val subtitle: String,
    val point: MapPoint,
    val weight: Int,
    val kind: PinKind,
    val beans: List<Bean> = emptyList(),
)

private class MapPaths(
    val world: Path,
    val europeLand: Path,
    val europeBorders: Path,
    // Street-level layer for the example city (OpenStreetMap, ODbL).
    val cityWater: Path,
    val cityParks: Path,
    val cityMinorRoads: Path,
    val cityMajorRoads: Path,
)

@Composable
private fun rememberMapPaths(): MapPaths? {
    val context = LocalContext.current
    val state = produceState<MapPaths?>(null) {
        value = withContext(Dispatchers.Default) {
            fun load(id: Int) = PathParser().parsePathString(context.resources.openRawResource(id).bufferedReader().use { it.readText() }).toPath()
            MapPaths(
                load(R.raw.map_world), load(R.raw.map_europe_land), load(R.raw.map_europe_borders),
                load(R.raw.map_city_water).apply { fillType = androidx.compose.ui.graphics.PathFillType.EvenOdd },
                load(R.raw.map_city_parks), load(R.raw.map_city_minor), load(R.raw.map_city_major),
            )
        }
    }
    return state.value
}

private fun pinColor(kind: PinKind, c: DropsColors): Color = when (kind) {
    PinKind.BEAN, PinKind.OPEN -> c.accent
    PinKind.CLOSED -> c.muted
    PinKind.RECOMMENDATION -> c.ok
    PinKind.TRAVEL -> c.ice
    PinKind.ME -> c.inverse
}

private fun beanPins(beans: List<Bean>, mode: MapMode): List<MapPin> {
    val groups = if (mode == MapMode.ORIGIN) beans.filter { it.origin != null }.groupBy { it.country }
    else beans.filter { it.purchase?.location != null }.groupBy { it.purchase!!.city }
    return groups.map { (key, list) ->
        val points = list.map { if (mode == MapMode.ORIGIN) it.origin!! else it.purchase!!.location!! }
        val lat = points.map { it.lat }.average()
        val lon = points.map { it.lon }.average()
        val sub = if (mode == MapMode.ORIGIN) list.map { it.region }.distinct().joinToString(", ")
        else list.map { "${it.purchase!!.shopName} · ${channelLabel(it.purchase!!.channel)}" }.distinct().joinToString(", ")
        MapPin(key, key, sub, if (mode == MapMode.ORIGIN) MapProjection.world(lat, lon) else MapProjection.europe(lat, lon), list.size, PinKind.BEAN, list)
    }.sortedByDescending { it.weight }
}

fun discoverPins(layer: DiscoverLayer, placeFilter: Int): List<MapPin> = when (layer) {
    DiscoverLayer.NEARBY -> DiscoverCatalog.places.filter { placeFilterMatches(it, placeFilter) }.map {
        MapPin("p:${it.id}", it.name, it.description, MapProjection.europe(it.location.lat, it.location.lon), 2, if (it.openNow) PinKind.OPEN else PinKind.CLOSED)
    } + MapPin("me", "Du", DiscoverCatalog.EXAMPLE_AREA, DiscoverCatalog.examplePosition.let { MapProjection.europe(it.lat, it.lon) }, 0, PinKind.ME)
    DiscoverLayer.RECOMMENDED -> DiscoverCatalog.recommendations.map {
        MapPin("r:${it.id}", it.name, "${it.roaster} · ${it.roasterCity}", MapProjection.europe(it.roasterLocation.lat, it.roasterLocation.lon), 3, PinKind.RECOMMENDATION)
    }
    DiscoverLayer.TRAVEL -> DiscoverCatalog.cityGuides.map {
        MapPin("t:${it.id}", it.city, "${it.cafes} Cafés · ${it.roasters} Röstereien", MapProjection.europe(it.location.lat, it.location.lon), it.cafes / 5, PinKind.TRAVEL)
    }
}

/** 0 = cafés, 1 = roasters, 2 = open now */
fun placeFilterMatches(p: DiscoverCatalog.Place, filter: Int) = when (filter) {
    0 -> p.servesCoffee
    1 -> p.isRoaster
    else -> p.openNow
}

@Composable
fun MapScreen(vm: DropsViewModel) {
    val lib by vm.library.collectAsStateWithLifecycle()
    var mode by rememberSaveable { mutableStateOf(MapMode.ORIGIN) }
    var layer by rememberSaveable { mutableStateOf(DiscoverLayer.NEARBY) }
    var placeFilter by rememberSaveable { mutableIntStateOf(0) }
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val paths = rememberMapPaths()
    val c = Drops.colors

    val pins = remember(lib.beans, mode, layer, placeFilter) {
        if (mode == MapMode.DISCOVER) discoverPins(layer, placeFilter) else beanPins(lib.beans, mode)
    }
    val selectedPin = pins.firstOrNull { it.key == selected } ?: pins.firstOrNull().takeIf { mode != MapMode.DISCOVER }

    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    var scale by remember { mutableFloatStateOf(1f) }
    var pan by remember { mutableStateOf(Offset.Zero) }

    // Frame all pins whenever the visible set changes (mode, layer or filter).
    fun fit() {
        if (canvasSize.width == 0 || pins.isEmpty()) return
        val w = canvasSize.width.toFloat()
        val h = canvasSize.height.toFloat()
        val base = w / ART_W
        val xs = pins.map { it.point.x.toFloat() }
        val ys = pins.map { it.point.y.toFloat() }
        val minSpan = if (mode == MapMode.DISCOVER && layer == DiscoverLayer.NEARBY) 2.2f else 120f
        val spanX = max((xs.max() - xs.min()) * 1.5f, minSpan)
        val spanY = max((ys.max() - ys.min()) * 1.5f, minSpan * ART_H / ART_W)
        scale = min(w / (spanX * base), h / (spanY * base)).coerceIn(0.6f, 300f)
        val k = base * scale
        val cx = (xs.max() + xs.min()) / 2
        val cy = (ys.max() + ys.min()) / 2
        pan = Offset(k * (ART_W / 2 - cx), (h / 2) - (h - ART_H * k) / 2 - cy * k)
    }
    LaunchedEffect(mode, layer, placeFilter, canvasSize) { fit() }

    ScreenColumn(contentPadding = PaddingValues(top = 24.dp, bottom = 24.dp)) {
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            val roasters = lib.beans.mapNotNull { it.purchase?.shopName }.distinct().size
            ScreenTitle(
                "Karte",
                when (mode) {
                    MapMode.ORIGIN -> "${pins.size} Länder · ${lib.beans.size} Röstungen"
                    MapMode.BOUGHT -> "${pins.size} Städte · $roasters Röstereien"
                    MapMode.DISCOVER -> "Beispielinhalte"
                },
            )
            Segmented(MapMode.entries.map { it.label }, mode.ordinal, { mode = MapMode.entries[it]; selected = null }, Modifier.fillMaxWidth())
        }

        Box(
            Modifier.fillMaxWidth().height(300.dp).clipToBounds().background(c.sea).onSizeChanged { canvasSize = it }
                .a11y(
                    when (mode) {
                        MapMode.ORIGIN -> "Weltkarte mit den Anbauregionen deiner Bohnen"
                        MapMode.BOUGHT -> "Europakarte mit den Orten, an denen du gekauft hast"
                        MapMode.DISCOVER -> "Karte mit Cafés, empfohlenen Kaffees und Reisezielen"
                    },
                ),
        ) {
            Canvas(
                Modifier.fillMaxWidth().height(300.dp)
                    .pointerInput(Unit) {
                        detectTransformGestures { _, panChange, zoom, _ ->
                            scale = (scale * zoom).coerceIn(0.6f, 300f)
                            pan += panChange
                        }
                    }
                    .pointerInput(pins) {
                        detectTapGestures { tap ->
                            val k = size.width / ART_W * scale
                            val originX = (size.width - ART_W * k) / 2 + pan.x
                            val originY = (size.height - ART_H * k) / 2 + pan.y
                            fun dist(p: MapPin) = hypot(originX + p.point.x.toFloat() * k - tap.x, originY + p.point.y.toFloat() * k - tap.y)
                            pins.minByOrNull(::dist)?.takeIf { dist(it) < 28.dp.toPx() }?.let { selected = it.key }
                        }
                    },
            ) {
                val k = size.width / ART_W * scale
                val originX = (size.width - ART_W * k) / 2 + pan.x
                val originY = (size.height - ART_H * k) / 2 + pan.y
                withTransform({
                    translate(originX, originY)
                    scale(k, k, Offset.Zero)
                }) {
                    val unit = 1f / k // one screen pixel in artwork units
                    if (mode == MapMode.ORIGIN) {
                        val t1 = MapProjection.world(23.44, 0.0).y.toFloat()
                        val t2 = MapProjection.world(-23.44, 0.0).y.toFloat()
                        drawRect(c.accent.copy(alpha = 0.07f), Offset(-600f, t1), androidx.compose.ui.geometry.Size(2000f, t2 - t1))
                        paths?.let {
                            drawPath(it.world, c.land)
                            drawPath(it.world, c.landLine, style = Stroke(1.5f * unit))
                        }
                        val dash = PathEffect.dashPathEffect(floatArrayOf(8f * unit, 8f * unit))
                        listOf(t1, t2).forEach { y -> drawLine(c.accent.copy(alpha = 0.45f), Offset(-600f, y), Offset(1400f, y), 2f * unit, pathEffect = dash) }
                    } else {
                        paths?.let {
                            drawPath(it.europeLand, c.land)
                            drawPath(it.cityParks, c.okSoft.copy(alpha = 0.6f))
                            drawPath(it.cityWater, c.sea)
                            val round = androidx.compose.ui.graphics.StrokeCap.Round
                            drawPath(it.cityMinorRoads, c.line, style = Stroke(1.5f * unit, cap = round))
                            drawPath(it.cityMajorRoads, c.landLine, style = Stroke(3f * unit, cap = round))
                            drawPath(it.europeBorders, c.landLine, style = Stroke(2f * unit))
                        }
                    }
                }
                pins.reversed().forEach { p ->
                    val on = p == selectedPin
                    val center = Offset(originX + p.point.x.toFloat() * k, originY + p.point.y.toFloat() * k)
                    if (p.kind == PinKind.ME) {
                        drawCircle(c.inverse.copy(alpha = 0.12f), 14.dp.toPx(), center)
                        drawCircle(c.surface, 7.dp.toPx(), center)
                        drawCircle(c.inverse, 5.dp.toPx(), center)
                    } else {
                        val r = (6f + p.weight * 1.6f + if (on) 2f else 0f).dp.toPx()
                        drawCircle(c.surface, r + 2.dp.toPx(), center)
                        drawCircle(if (on) c.inverse else pinColor(p.kind, c), r, center)
                    }
                }
            }
            Column(Modifier.align(Alignment.TopEnd).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                MapButton("+", "Hineinzoomen") { scale = (scale * 1.4f).coerceAtMost(300f) }
                MapButton("−", "Herauszoomen") { scale = (scale / 1.4f).coerceAtLeast(0.6f) }
                MapButton("⌂", "Alle Pins zeigen") { fit() }
            }
            if (mode == MapMode.DISCOVER) {
                val legend = when (layer) {
                    DiscoverLayer.NEARBY -> listOf(PinKind.OPEN to "Geöffnet", PinKind.CLOSED to "Geschlossen", PinKind.ME to "Du")
                    DiscoverLayer.RECOMMENDED -> listOf(PinKind.RECOMMENDATION to "Rösterei des Vorschlags")
                    DiscoverLayer.TRAVEL -> listOf(PinKind.TRAVEL to "Städte-Guide")
                }
                Row(
                    Modifier.align(Alignment.BottomStart).padding(12.dp).clip(RoundedCornerShape(12.dp)).background(c.surface)
                        .border(1.dp, c.line, RoundedCornerShape(12.dp)).padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    legend.forEach { (kind, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(pinColor(kind, c)))
                            Text(label, style = DropsType.caption, color = c.muted)
                        }
                    }
                }
            }
            if (mode != MapMode.ORIGIN) {
                Text(
                    "© OpenStreetMap-Mitwirkende", style = DropsType.caption.copy(fontSize = 10.sp), color = c.muted,
                    modifier = Modifier.align(Alignment.BottomEnd).padding(4.dp).background(c.surface.copy(alpha = 0.8f)).padding(horizontal = 4.dp),
                )
            }
            if (paths == null) Text("Karte wird geladen …", style = DropsType.small, color = c.muted, modifier = Modifier.align(Alignment.Center))
        }

        if (mode == MapMode.DISCOVER) {
            // What the map shows sits right under it, next to the content it filters.
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DiscoverLayer.entries.forEach { l -> Chip(l.label, l == layer) { layer = l; selected = null } }
            }
            DiscoverContent(
                lib = lib,
                selectedKey = selected,
                placeFilter = placeFilter,
                onPlaceFilter = { placeFilter = it; layer = DiscoverLayer.NEARBY; selected = null },
                onFocus = { key ->
                    layer = when (key.first()) { 'p' -> DiscoverLayer.NEARBY; 'r' -> DiscoverLayer.RECOMMENDED; else -> DiscoverLayer.TRAVEL }
                    selected = key
                },
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        } else {
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
                        Text("${p.weight} ${if (p.weight == 1) "Röstung" else "Röstungen"}", style = DropsType.small.copy(fontFamily = MonoFamily), color = c.muted)
                    }
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
