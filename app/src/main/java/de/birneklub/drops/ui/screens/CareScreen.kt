package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import de.birneklub.drops.data.CareRepository
import de.birneklub.drops.data.DueState
import de.birneklub.drops.data.MaintenanceTask
import de.birneklub.drops.data.TaskCategory
import de.birneklub.drops.data.TaskWithDue
import de.birneklub.drops.data.dueInfo
import de.birneklub.drops.ui.AppViewModelProvider
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

class CareViewModel(private val repository: CareRepository) : ViewModel() {
    init {
        viewModelScope.launch { repository.seedDefaultsIfEmpty() }
    }

    val tasks: StateFlow<List<TaskWithDue>> = repository.observeAll()
        .map { list ->
            list.map { it.dueInfo() }
                .sortedBy { it.dueState.ordinal }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun markDone(task: MaintenanceTask) {
        viewModelScope.launch { repository.markDone(task) }
    }

    fun save(task: MaintenanceTask) {
        viewModelScope.launch { repository.save(task) }
    }

    fun delete(task: MaintenanceTask) {
        viewModelScope.launch { repository.delete(task) }
    }
}

private fun categoryLabel(category: TaskCategory): String = when (category) {
    TaskCategory.MASCHINE -> "Maschine"
    TaskCategory.MUEHLE -> "Mühle"
    TaskCategory.WASSER -> "Wasser"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CareScreen(
    viewModel: CareViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val tasks by viewModel.tasks.collectAsState()
    var editTask by remember { mutableStateOf<MaintenanceTask?>(null) }
    var showNewDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Pflege") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showNewDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Neue Aufgabe")
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(tasks, key = { it.task.id }) { item ->
                CareCard(
                    item = item,
                    onDone = { viewModel.markDone(item.task) },
                    onEdit = { editTask = item.task },
                )
            }
        }
    }

    if (showNewDialog) {
        TaskDialog(
            task = null,
            onSave = { viewModel.save(it); showNewDialog = false },
            onDelete = null,
            onDismiss = { showNewDialog = false },
        )
    }
    editTask?.let { task ->
        TaskDialog(
            task = task,
            onSave = { viewModel.save(it); editTask = null },
            onDelete = { viewModel.delete(task); editTask = null },
            onDismiss = { editTask = null },
        )
    }
}

@Composable
private fun CareCard(item: TaskWithDue, onDone: () -> Unit, onEdit: () -> Unit) {
    val (statusColor, statusText) = when (item.dueState) {
        DueState.OVERDUE -> MaterialTheme.colorScheme.error to "überfällig"
        DueState.DUE_SOON -> Color(0xFFB07B4F) to "bald fällig"
        DueState.OK -> MaterialTheme.colorScheme.tertiary to "in ${item.daysUntilDue} Tagen"
        DueState.NEVER_DONE -> MaterialTheme.colorScheme.onSurfaceVariant to "noch nie erledigt"
    }
    Card(
        onClick = onEdit,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Default.Circle,
                contentDescription = statusText,
                tint = statusColor,
                modifier = Modifier.size(12.dp),
            )
            Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(item.task.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(
                    "${categoryLabel(item.task.category)} · alle ${item.task.intervalDays} Tage · $statusText",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            FilledTonalButton(onClick = onDone) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                Text(" Erledigt")
            }
        }
    }
}

@Composable
private fun TaskDialog(
    task: MaintenanceTask?,
    onSave: (MaintenanceTask) -> Unit,
    onDelete: (() -> Unit)?,
    onDismiss: () -> Unit,
) {
    var name by remember { mutableStateOf(task?.name ?: "") }
    var intervalText by remember { mutableStateOf(task?.intervalDays?.toString() ?: "30") }
    var category by remember { mutableStateOf(task?.category ?: TaskCategory.MASCHINE) }
    val interval = intervalText.toIntOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (task == null) "Neue Aufgabe" else "Aufgabe bearbeiten") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = intervalText,
                    onValueChange = { intervalText = it },
                    label = { Text("Intervall (Tage)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TaskCategory.entries.forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(categoryLabel(cat)) },
                        )
                    }
                }
                if (onDelete != null) {
                    TextButton(onClick = onDelete) { Text("Aufgabe löschen") }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && interval != null && interval > 0,
                onClick = {
                    onSave(
                        task?.copy(name = name.trim(), intervalDays = interval!!, category = category)
                            ?: MaintenanceTask(
                                id = UUID.randomUUID().toString(),
                                name = name.trim(),
                                category = category,
                                intervalDays = interval!!,
                                createdAt = System.currentTimeMillis(),
                            )
                    )
                },
            ) { Text("Speichern") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Abbrechen") } },
    )
}
