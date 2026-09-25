package de.birneklub.drop.android.ui

import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Line icons drawn on a 24 grid, matching the design canvas. */
object DropsIcons {
    private fun line(name: String, d: String, stroke: Float = 1.8f, filled: Boolean = false) = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        addPath(
            pathData = addPathNodes(d),
            fill = if (filled) SolidColor(Color.Black) else null,
            stroke = SolidColor(Color.Black),
            strokeLineWidth = stroke,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        )
    }.build()

    val Home = line("home", "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z")
    val Bean = line("bean", "M12 3c4.5 0 7 3.5 7 8.5S16 21 12 21s-7-4-7-9.5S7.5 3 12 3zM12 3c-2 3-2 6 0 9s2 6 0 9")
    val Map = line("map", "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14")
    val Compass = line("compass", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z")
    val Setup = line("setup", "M5 21V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13M3 21h18M9 6V3h6v3M9 12h6M12 12v4")
    val Timer = line("timer", "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M9 2h6", 2f)
    val Back = line("back", "M15 18l-6-6 6-6", 2f)
    val Plus = line("plus", "M12 5v14M5 12h14", 2.2f)
    val Drop = line("drop", "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z", 2f)
    val Brush = line("brush", "M14 4l6 6-8 8H6v-6zM6 18l-3 3", 2f)
    val Snow = line("snow", "M12 2v20M4 7l16 10M20 7L4 17", 2f)
    val Search = line("search", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5", 2f)
    val Pin = line("pin", "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", 2f)
    val Bulb = line("bulb", "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z", 2f)
    val Cart = line("cart", "M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", 2f)
    val Coffee = line("coffee", "M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2")
    val Machine = line("machine", "M4 3h16v6H4zM7 9v3h10V9M9 12v2M15 12v2M6 20h12", 1.6f)
    val Grinder = line("grinder", "M8 3h8l-1 5H9zM6 8h12v8H6zM9 16v3h6v-3", 1.6f)
    val Star = line("star", "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", 1.6f)
    val StarFilled = line("star-filled", "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", 1.6f, filled = true)
    val Cloud = line("cloud", "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z", 2f)
    val Refresh = line("refresh", "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4", 2f)
    val Fit = line("fit", "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", 2f)
}

@Composable
fun Icon(vector: ImageVector, contentDescription: String?, tint: Color, size: Dp = 24.dp, modifier: Modifier = Modifier) {
    androidx.compose.material3.Icon(vector, contentDescription, modifier.size(size), tint = tint)
}
