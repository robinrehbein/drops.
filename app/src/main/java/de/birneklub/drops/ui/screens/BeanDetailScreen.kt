package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.SentimentDissatisfied
import androidx.compose.material.icons.filled.SentimentSatisfiedAlt
import androidx.compose.material.icons.filled.SentimentVeryDissatisfied
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ThumbDown
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconToggleButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import de.birneklub.drops.data.Bean
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.BeanStatus
import de.birneklub.drops.data.DialInAttempt
import de.birneklub.drops.data.RoastLevel
import de.birneklub.drops.data.Verdict
import de.birneklub.drops.domain.suggestStartRecipe
import de.birneklub.drops.ui.AppViewModelProvider
import de.birneklub.drops.ui.formatDate
import de.birneklub.drops.ui.formatGrams
import de.birneklub.drops.ui.formatGrind
import de.birneklub.drops.ui.freshnessLabel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File
import java.text.DateFormat
import java.util.Date

data class BeanDetailState(
    val bean: Bean? = null,
    val attempts: List<DialInAttempt> = emptyList(),
) {
    val frozenAttempt: DialInAttempt?
        get() = bean?.frozenAttemptId?.let { id -> attempts.find { it.id == id } }
}

class BeanDetailViewModel(
    savedStateHandle: SavedStateHandle,
    private val repository: BeanRepository,
) : ViewModel() {
    val beanId: String = checkNotNull(savedStateHandle["beanId"])

    val state: StateFlow<BeanDetailState> =
        combine(
            repository.observeBean(beanId),
            repository.observeAttempts(beanId),
        ) { bean, attempts -> BeanDetailState(bean, attempts) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BeanDetailState())

    fun setStatus(status: BeanStatus) {
        viewModelScope.launch { repository.setStatus(beanId, status) }
    }

    fun setWouldBuyAgain(value: Boolean?) {
        viewModelScope.launch { repository.setWouldBuyAgain(beanId, value) }
    }

    fun freeze(attemptId: String) {
        viewModelScope.launch { repository.freezeAttempt(attemptId, beanId) }
    }

    fun delete(onDone: () -> Unit) {
        viewModelScope.launch {
            state.value.bean?.let { repository.deleteBean(it) }
            onDone()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeanDetailScreen(
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onLogAttempt: (String) -> Unit,
    viewModel: BeanDetailViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.state.collectAsState()
    val bean = state.bean ?: return
    var showDeleteDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(bean.name) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Zurück")
                    }
                },
                actions = {
                    IconButton(onClick = { onEdit(bean.id) }) {
                        Icon(Icons.Default.Edit, contentDescription = "Bearbeiten")
                    }
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(Icons.Default.Delete, contentDescription = "Löschen")
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Kopf: Foto + Metadaten
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (bean.photoUri != null) {
                    AsyncImage(
                        model = File(bean.photoUri),
                        contentDescription = "Tütenfoto",
                        modifier = Modifier.size(72.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(modifier = Modifier.size(14.dp))
                }
                Column {
                    if (bean.roaster != null) {
                        Text(bean.roaster, style = MaterialTheme.typography.titleMedium)
                    }
                    val meta = listOfNotNull(
                        bean.origin,
                        bean.process,
                        bean.roastLevel?.let {
                            when (it) {
                                RoastLevel.HELL -> "helle Röstung"
                                RoastLevel.MITTEL -> "mittlere Röstung"
                                RoastLevel.DUNKEL -> "dunkle Röstung"
                            }
                        },
                    )
                    if (meta.isNotEmpty()) {
                        Text(
                            meta.joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    bean.roastDate?.let { date ->
                        Text(
                            "Geröstet am ${formatDate(date)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    freshnessLabel(bean.roastDate)?.let { label ->
                        Text(
                            label,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.tertiary,
                        )
                    }
                    bean.boughtAt?.let { source ->
                        Text(
                            "Gekauft bei $source",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Das Rezept — der Star des Screens
            val frozen = state.frozenAttempt
            if (frozen != null) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "Rezept",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Text(
                            formatGrind(frozen.grindSetting),
                            style = MaterialTheme.typography.displayLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Text(
                            "Mahlgrad",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            "${formatGrams(frozen.doseG)} g → ${formatGrams(frozen.yieldG)} g · ${frozen.timeSec} s",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            } else {
                val suggestion = suggestStartRecipe(bean.roastLevel)
                Card {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "Noch kein Rezept — Zeit zum Eindialen!",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            "Startvorschlag: ${formatGrams(suggestion.doseG)} g → " +
                                "${formatGrams(suggestion.yieldG)} g · ${suggestion.tempRange} · ${suggestion.timeTarget}",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            suggestion.hint,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Würde ich wieder kaufen?
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text("Wieder kaufen?", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.weight(1f))
                FilledTonalIconToggleButton(
                    checked = bean.wouldBuyAgain == true,
                    onCheckedChange = { checked ->
                        viewModel.setWouldBuyAgain(if (checked) true else null)
                    },
                ) {
                    Icon(Icons.Default.ThumbUp, contentDescription = "Ja")
                }
                FilledTonalIconToggleButton(
                    checked = bean.wouldBuyAgain == false,
                    onCheckedChange = { checked ->
                        viewModel.setWouldBuyAgain(if (checked) false else null)
                    },
                ) {
                    Icon(Icons.Default.ThumbDown, contentDescription = "Nein")
                }
            }

            bean.notes?.let { notes ->
                Text(notes, style = MaterialTheme.typography.bodyMedium)
            }

            HorizontalDivider()

            // Aktionen
            if (bean.status == BeanStatus.ACTIVE) {
                Button(onClick = { onLogAttempt(bean.id) }, modifier = Modifier.fillMaxWidth()) {
                    Text(if (frozen == null) "Versuch loggen" else "Neu eindialen")
                }
                OutlinedButton(
                    onClick = { viewModel.setStatus(BeanStatus.FINISHED) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Aufgebraucht")
                }
            } else {
                FilledTonalButton(
                    onClick = { viewModel.setStatus(BeanStatus.ACTIVE) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Wieder gekauft — Bohne aktivieren")
                }
            }

            // Eindial-Verlauf
            if (state.attempts.isNotEmpty()) {
                Text(
                    "Eindial-Verlauf",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                state.attempts.forEach { attempt ->
                    AttemptRow(
                        attempt = attempt,
                        isFrozen = attempt.id == bean.frozenAttemptId,
                        onFreeze = { viewModel.freeze(attempt.id) },
                    )
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Bohne löschen?") },
            text = { Text("„${bean.name}“ und alle Versuche werden endgültig gelöscht.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    viewModel.delete(onBack)
                }) { Text("Löschen") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Abbrechen") }
            },
        )
    }
}

private fun verdictIcon(verdict: Verdict): ImageVector = when (verdict) {
    Verdict.SAUER -> Icons.Default.SentimentVeryDissatisfied
    Verdict.BITTER -> Icons.Default.SentimentDissatisfied
    Verdict.GUT -> Icons.Default.SentimentSatisfiedAlt
}

private fun verdictLabel(verdict: Verdict): String = when (verdict) {
    Verdict.SAUER -> "Sauer"
    Verdict.BITTER -> "Bitter"
    Verdict.GUT -> "Gut"
}

@Composable
private fun AttemptRow(
    attempt: DialInAttempt,
    isFrozen: Boolean,
    onFreeze: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isFrozen)
                MaterialTheme.colorScheme.secondaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                verdictIcon(attempt.verdict),
                contentDescription = verdictLabel(attempt.verdict),
                tint = when (attempt.verdict) {
                    Verdict.GUT -> MaterialTheme.colorScheme.tertiary
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
            Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(
                    "Mahlgrad ${formatGrind(attempt.grindSetting)} · " +
                        "${formatGrams(attempt.doseG)} g → ${formatGrams(attempt.yieldG)} g · ${attempt.timeSec} s",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    "${verdictLabel(attempt.verdict)} · " +
                        DateFormat.getDateInstance(DateFormat.SHORT).format(Date(attempt.createdAt)) +
                        (attempt.note?.let { " · $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (isFrozen) {
                Icon(
                    Icons.Default.Star,
                    contentDescription = "Eingefrorenes Rezept",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp),
                )
            } else if (attempt.verdict == Verdict.GUT) {
                TextButton(onClick = onFreeze) {
                    Icon(Icons.Default.AcUnit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Text(" Einfrieren")
                }
            }
        }
    }
}
