package de.birneklub.drops.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import de.birneklub.drops.data.GrinderScale
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

/**
 * Drehbares Mahlgrad-Rad: Ziehen rotiert die Tick-Skala unter dem festen Zeiger,
 * wie am Einstellring einer Mühle. Ein Schritt der Mühlen-Skala = [DEGREES_PER_STEP]°.
 */
private const val DEGREES_PER_STEP = 14f
private const val VISIBLE_ARC = 132f

@Composable
fun GrindDial(
    value: Double,
    scale: GrinderScale,
    onValueChange: (Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptics = LocalHapticFeedback.current
    val primary = MaterialTheme.colorScheme.primary
    val onSurfaceVariant = MaterialTheme.colorScheme.onSurfaceVariant
    val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

    // Kontinuierlicher Drag-Wert; erst beim Einrasten auf Schritte gerundet.
    var dragValue by remember(value) { mutableFloatStateOf(value.toFloat()) }

    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.78f)
                .aspectRatio(1f),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .pointerInput(scale) {
                        var lastAngle = 0f
                        detectDragGestures(
                            onDragStart = { offset ->
                                val center = Offset(size.width / 2f, size.height / 2f)
                                lastAngle = angleOf(offset, center)
                            },
                            onDrag = { change, _ ->
                                change.consume()
                                val center = Offset(size.width / 2f, size.height / 2f)
                                val angle = angleOf(change.position, center)
                                var delta = angle - lastAngle
                                if (delta > 180f) delta -= 360f
                                if (delta < -180f) delta += 360f
                                lastAngle = angle

                                val before = scale.clampToStep(dragValue.toDouble())
                                dragValue = (dragValue + delta / DEGREES_PER_STEP * scale.step.toFloat())
                                    .coerceIn(scale.min.toFloat(), scale.max.toFloat())
                                val after = scale.clampToStep(dragValue.toDouble())
                                if (after != before) {
                                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onValueChange(after)
                                }
                            },
                        )
                    }
            ) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val radius = size.minDimension / 2f

                // Außenring
                drawCircle(
                    color = surfaceVariant,
                    radius = radius - 6.dp.toPx(),
                    center = center,
                    style = Stroke(width = 12.dp.toPx()),
                )

                // Tick-Skala, rotiert mit dem Wert unter dem festen Zeiger oben
                val stepsTotal = ((scale.max - scale.min) / scale.step).toInt()
                val current = dragValue.toDouble()
                for (i in 0..stepsTotal) {
                    val stepValue = scale.min + i * scale.step
                    val angleFromPointer =
                        ((stepValue - current) / scale.step * DEGREES_PER_STEP).toFloat()
                    if (abs(angleFromPointer) > VISIBLE_ARC) continue

                    val angleRad = Math.toRadians((angleFromPointer - 90f).toDouble())
                    val isMajor = i % 5 == 0
                    val tickLen = if (isMajor) 18.dp.toPx() else 10.dp.toPx()
                    val outer = radius - 14.dp.toPx()
                    val inner = outer - tickLen
                    val dir = Offset(cos(angleRad).toFloat(), sin(angleRad).toFloat())
                    val fade = (1f - abs(angleFromPointer) / VISIBLE_ARC).coerceIn(0.15f, 1f)
                    drawLine(
                        color = (if (isMajor) primary else onSurfaceVariant).copy(alpha = fade),
                        start = center + dir * inner,
                        end = center + dir * outer,
                        strokeWidth = if (isMajor) 3.dp.toPx() else 1.5.dp.toPx(),
                        cap = StrokeCap.Round,
                    )
                }

                // Fester Zeiger oben
                val pointerPath = Path().apply {
                    val tipY = center.y - radius + 30.dp.toPx()
                    moveTo(center.x, tipY)
                    lineTo(center.x - 7.dp.toPx(), tipY - 14.dp.toPx())
                    lineTo(center.x + 7.dp.toPx(), tipY - 14.dp.toPx())
                    close()
                }
                drawPath(pointerPath, color = primary)
            }

            // Wert in der Mitte
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = scale.format(scale.clampToStep(dragValue.toDouble())),
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = "Mahlgrad",
                    style = MaterialTheme.typography.labelMedium,
                    color = onSurfaceVariant,
                )
            }
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.padding(top = 4.dp),
        ) {
            IconButton(onClick = {
                val next = scale.clampToStep(value - scale.step)
                dragValue = next.toFloat()
                onValueChange(next)
            }) {
                Icon(Icons.Default.Remove, contentDescription = "Gröber", modifier = Modifier.size(28.dp))
            }
            IconButton(onClick = {
                val next = scale.clampToStep(value + scale.step)
                dragValue = next.toFloat()
                onValueChange(next)
            }) {
                Icon(Icons.Default.Add, contentDescription = "Feiner", modifier = Modifier.size(28.dp))
            }
        }
    }
}

private fun angleOf(position: Offset, center: Offset): Float =
    Math.toDegrees(
        atan2((position.y - center.y).toDouble(), (position.x - center.x).toDouble())
    ).toFloat()
