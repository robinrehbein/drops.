package de.birneklub.drops.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/** Stoppuhr für die Shot-Zeit: Start/Stopp, Ergebnis in ganzen Sekunden. */
@Composable
fun ShotStopwatch(
    onResult: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var running by remember { mutableStateOf(false) }
    var startedAt by remember { mutableLongStateOf(0L) }
    var elapsedMs by remember { mutableLongStateOf(0L) }

    LaunchedEffect(running) {
        while (running) {
            elapsedMs = System.currentTimeMillis() - startedAt
            delay(100)
        }
    }

    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = {
            if (running) {
                running = false
                onResult(((elapsedMs + 500) / 1000).toInt())
            } else {
                startedAt = System.currentTimeMillis()
                elapsedMs = 0
                running = true
            }
        }) {
            Icon(
                if (running) Icons.Default.Stop else Icons.Default.PlayArrow,
                contentDescription = if (running) "Stoppen" else "Stoppuhr starten",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        Text(
            "%.1f s".format(elapsedMs / 1000.0),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (running) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Countdown für Guide-Schritte. */
@Composable
fun StepCountdown(
    totalSeconds: Int,
    modifier: Modifier = Modifier,
) {
    var remaining by remember(totalSeconds) { mutableIntStateOf(totalSeconds) }
    var running by remember(totalSeconds) { mutableStateOf(false) }

    LaunchedEffect(running) {
        while (running && remaining > 0) {
            delay(1000)
            remaining -= 1
        }
        if (remaining == 0) running = false
    }

    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = {
            if (remaining == 0) {
                remaining = totalSeconds
            } else {
                running = !running
            }
        }) {
            Icon(
                when {
                    remaining == 0 -> Icons.Default.Refresh
                    running -> Icons.Default.Stop
                    else -> Icons.Default.PlayArrow
                },
                contentDescription = "Timer",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        Text(
            "%d:%02d".format(remaining / 60, remaining % 60),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        LinearProgressIndicator(
            progress = { if (totalSeconds == 0) 0f else 1f - remaining.toFloat() / totalSeconds },
            modifier = Modifier
                .padding(start = 12.dp)
                .size(width = 120.dp, height = 6.dp),
        )
    }
}
