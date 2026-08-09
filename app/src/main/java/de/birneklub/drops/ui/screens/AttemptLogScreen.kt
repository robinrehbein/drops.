package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.GrinderScale
import de.birneklub.drops.data.GrinderSettingsStore
import de.birneklub.drops.data.Verdict
import de.birneklub.drops.ui.AppViewModelProvider
import de.birneklub.drops.ui.components.GrindDial
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AttemptLogState(
    val grind: Double? = null,
    val doseText: String = "18",
    val yieldText: String = "36",
    val timeText: String = "28",
    val verdict: Verdict? = null,
    val note: String = "",
)

class AttemptLogViewModel(
    savedStateHandle: SavedStateHandle,
    private val repository: BeanRepository,
    grinderSettings: GrinderSettingsStore,
) : ViewModel() {
    private val beanId: String = checkNotNull(savedStateHandle["beanId"])

    val scale: StateFlow<GrinderScale> = grinderSettings.scale
        .stateIn(viewModelScope, SharingStarted.Eagerly, GrinderScale())

    val state = MutableStateFlow(AttemptLogState())

    init {
        viewModelScope.launch {
            // Vorbelegung: letzter Versuch, sonst eingefrorenes Rezept, sonst Standardwerte
            val prefill = repository.latestAttempt(beanId)
                ?: repository.getBean(beanId)?.frozenAttemptId?.let { repository.getAttempt(it) }
            if (prefill != null) {
                state.value = AttemptLogState(
                    grind = prefill.grindSetting,
                    doseText = trimNumber(prefill.doseG),
                    yieldText = trimNumber(prefill.yieldG),
                    timeText = prefill.timeSec.toString(),
                )
            }
        }
    }

    fun update(transform: (AttemptLogState) -> AttemptLogState) {
        state.value = transform(state.value)
    }

    fun currentGrind(): Double = state.value.grind ?: defaultGrind()

    private fun defaultGrind(): Double {
        val s = scale.value
        return s.clampToStep((s.min + s.max) / 2)
    }

    val canSave: Boolean
        get() = state.value.let { s ->
            s.verdict != null &&
                s.doseText.toDoubleOrNullDe() != null &&
                s.yieldText.toDoubleOrNullDe() != null &&
                s.timeText.toIntOrNull() != null
        }

    fun save(freeze: Boolean, onDone: () -> Unit) {
        val s = state.value
        val verdict = s.verdict ?: return
        val dose = s.doseText.toDoubleOrNullDe() ?: return
        val yield_ = s.yieldText.toDoubleOrNullDe() ?: return
        val time = s.timeText.toIntOrNull() ?: return
        viewModelScope.launch {
            repository.logAttempt(
                beanId = beanId,
                grindSetting = currentGrind(),
                doseG = dose,
                yieldG = yield_,
                timeSec = time,
                verdict = verdict,
                note = s.note.trim().ifBlank { null },
                freeze = freeze,
            )
            onDone()
        }
    }
}

private fun trimNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()

private fun String.toDoubleOrNullDe(): Double? = replace(',', '.').toDoubleOrNull()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttemptLogScreen(
    onBack: () -> Unit,
    viewModel: AttemptLogViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.state.collectAsState()
    val scale by viewModel.scale.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Versuch loggen") },
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GrindDial(
                value = viewModel.currentGrind(),
                scale = scale,
                onValueChange = { v -> viewModel.update { it.copy(grind = v) } },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = state.doseText,
                    onValueChange = { v -> viewModel.update { it.copy(doseText = v) } },
                    label = { Text("Rein (g)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = state.yieldText,
                    onValueChange = { v -> viewModel.update { it.copy(yieldText = v) } },
                    label = { Text("Raus (g)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = state.timeText,
                    onValueChange = { v -> viewModel.update { it.copy(timeText = v) } },
                    label = { Text("Zeit (s)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }

            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                val options = listOf(
                    Verdict.SAUER to "Sauer",
                    Verdict.BITTER to "Bitter",
                    Verdict.GUT to "Gut",
                )
                options.forEachIndexed { index, (verdict, label) ->
                    SegmentedButton(
                        selected = state.verdict == verdict,
                        onClick = { viewModel.update { it.copy(verdict = verdict) } },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
                    ) {
                        Text(label)
                    }
                }
            }

            when (state.verdict) {
                Verdict.SAUER -> HintText("Unterextrahiert → feiner mahlen")
                Verdict.BITTER -> HintText("Überextrahiert → gröber mahlen")
                else -> {}
            }

            OutlinedTextField(
                value = state.note,
                onValueChange = { v -> viewModel.update { it.copy(note = v) } },
                label = { Text("Notiz (optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            if (state.verdict == Verdict.GUT) {
                Button(
                    onClick = { viewModel.save(freeze = true, onDone = onBack) },
                    enabled = viewModel.canSave,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Speichern & als Rezept einfrieren")
                }
                OutlinedButton(
                    onClick = { viewModel.save(freeze = false, onDone = onBack) },
                    enabled = viewModel.canSave,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Nur speichern")
                }
            } else {
                Button(
                    onClick = { viewModel.save(freeze = false, onDone = onBack) },
                    enabled = viewModel.canSave,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Speichern")
                }
            }
        }
    }
}

@Composable
private fun HintText(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.tertiary,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
    )
}
