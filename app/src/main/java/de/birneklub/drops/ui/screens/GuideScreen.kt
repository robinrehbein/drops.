package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import de.birneklub.drops.data.RoastLevel
import de.birneklub.drops.domain.BREW_GUIDES
import de.birneklub.drops.domain.BrewGuide
import de.birneklub.drops.domain.suggestStartRecipe
import de.birneklub.drops.ui.components.StepCountdown
import de.birneklub.drops.ui.formatGrams

private fun roastLabel(level: RoastLevel?): String = when (level) {
    RoastLevel.HELL -> "Hell"
    RoastLevel.MITTEL -> "Mittel"
    RoastLevel.DUNKEL -> "Dunkel"
    null -> "Unbekannt"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuideScreen(onOpenGuide: (String) -> Unit) {
    var roast by remember { mutableStateOf<RoastLevel?>(null) }
    val suggestion = suggestStartRecipe(roast)

    Scaffold(
        topBar = { TopAppBar(title = { Text("Guide") }) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Startrezept nach Röstgrad", style = MaterialTheme.typography.titleMedium)
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (listOf<RoastLevel?>(null) + RoastLevel.entries).forEach { level ->
                        FilterChip(
                            selected = roast == level,
                            onClick = { roast = level },
                            label = { Text(roastLabel(level)) },
                        )
                    }
                }
            }
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "${formatGrams(suggestion.doseG)} g → ${formatGrams(suggestion.yieldG)} g",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Text(
                            "Ratio 1:${formatGrams(suggestion.ratio)} · ${suggestion.tempRange} · ${suggestion.timeTarget}",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            suggestion.hint,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }
            item {
                Text(
                    "Brüh-Guides",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            BREW_GUIDES.forEach { guide ->
                item(key = guide.id) {
                    Card(
                        onClick = { onOpenGuide(guide.id) },
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Coffee,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                Text(guide.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Text(
                                    guide.subtitle,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuideDetailScreen(guideId: String, onBack: () -> Unit) {
    val guide: BrewGuide = BREW_GUIDES.find { it.id == guideId } ?: return

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(guide.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Zurück")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                guide.subtitle,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            guide.steps.forEachIndexed { index, step ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                "${index + 1}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Text(
                                step.text,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(start = 12.dp),
                            )
                        }
                        step.timerSeconds?.let { seconds ->
                            StepCountdown(totalSeconds = seconds, modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                }
            }
        }
    }
}
