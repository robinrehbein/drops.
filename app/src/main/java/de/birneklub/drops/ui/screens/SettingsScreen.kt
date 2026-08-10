package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import android.content.Intent
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import de.birneklub.drops.data.DataExporter
import de.birneklub.drops.data.GrinderScale
import de.birneklub.drops.data.GrinderSettingsStore
import de.birneklub.drops.ui.AppViewModelProvider
import java.io.File
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val grinderSettings: GrinderSettingsStore,
    private val dataExporter: DataExporter,
) : ViewModel() {
    val scale: StateFlow<GrinderScale> = grinderSettings.scale
        .stateIn(viewModelScope, SharingStarted.Eagerly, GrinderScale())

    fun save(min: Double, max: Double, step: Double, onDone: () -> Unit) {
        viewModelScope.launch {
            grinderSettings.save(GrinderScale(min = min, max = max, step = step))
            onDone()
        }
    }

    fun export(onJson: (String) -> Unit) {
        viewModelScope.launch {
            onJson(dataExporter.buildJson())
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val scale by viewModel.scale.collectAsState()

    var minText by remember { mutableStateOf("") }
    var maxText by remember { mutableStateOf("") }
    var stepText by remember { mutableStateOf("") }
    var initialized by remember { mutableStateOf(false) }

    LaunchedEffect(scale) {
        if (!initialized) {
            minText = scale.format(scale.min)
            maxText = scale.format(scale.max)
            stepText = if (scale.step % 1.0 == 0.0) scale.step.toInt().toString() else scale.step.toString()
            initialized = true
        }
    }

    val min = minText.replace(',', '.').toDoubleOrNull()
    val max = maxText.replace(',', '.').toDoubleOrNull()
    val step = stepText.replace(',', '.').toDoubleOrNull()
    val valid = min != null && max != null && step != null && max > min && step > 0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Einstellungen") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Zurück")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Skala deiner Mühle", style = MaterialTheme.typography.titleMedium)
            Text(
                "Bestimmt den Bereich des Mahlgrad-Rads — z. B. 0 bis 40 in 1er-Schritten " +
                    "oder 0 bis 10 in 0,1er-Schritten.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = minText,
                    onValueChange = { minText = it },
                    label = { Text("Min") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = maxText,
                    onValueChange = { maxText = it },
                    label = { Text("Max") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = stepText,
                    onValueChange = { stepText = it },
                    label = { Text("Schritt") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }

            Button(
                onClick = { viewModel.save(min!!, max!!, step!!, onBack) },
                enabled = valid,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Speichern")
            }

            HorizontalDivider()

            Text("Daten", style = MaterialTheme.typography.titleMedium)
            Text(
                "Alle Bohnen, Versuche, Orte und Wartungsaufgaben als JSON sichern — " +
                    "z. B. in deine Cloud oder per Mail an dich selbst.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            val context = LocalContext.current
            OutlinedButton(
                onClick = {
                    viewModel.export { json ->
                        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
                        val file = File(dir, "drops-backup.json")
                        file.writeText(json)
                        val uri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file,
                        )
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "application/json"
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(intent, "Backup teilen"))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Daten exportieren (JSON)")
            }
        }
    }
}
