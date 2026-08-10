package de.birneklub.drops.ui.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import androidx.compose.material3.FilterChip
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.RoastLevel
import de.birneklub.drops.ui.AppViewModelProvider
import de.birneklub.drops.ui.formatDate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

data class BeanEditState(
    val name: String = "",
    val roaster: String = "",
    val roastDate: LocalDate? = null,
    val notes: String = "",
    val photoPath: String? = null,
    val origin: String = "",
    val process: String = "",
    val roastLevel: RoastLevel? = null,
    val boughtAt: String = "",
    val loaded: Boolean = false,
)

class BeanEditViewModel(
    savedStateHandle: SavedStateHandle,
    private val repository: BeanRepository,
) : ViewModel() {
    private val beanId: String? = savedStateHandle["beanId"]
    val isNew: Boolean get() = beanId == null

    val state = MutableStateFlow(BeanEditState())

    init {
        viewModelScope.launch {
            if (beanId != null) {
                repository.getBean(beanId)?.let { bean ->
                    state.value = BeanEditState(
                        name = bean.name,
                        roaster = bean.roaster.orEmpty(),
                        roastDate = bean.roastDate,
                        notes = bean.notes.orEmpty(),
                        photoPath = bean.photoUri,
                        origin = bean.origin.orEmpty(),
                        process = bean.process.orEmpty(),
                        roastLevel = bean.roastLevel,
                        boughtAt = bean.boughtAt.orEmpty(),
                        loaded = true,
                    )
                }
            } else {
                state.value = state.value.copy(loaded = true)
            }
        }
    }

    fun update(transform: (BeanEditState) -> BeanEditState) {
        state.value = transform(state.value)
    }

    fun save(onDone: (String) -> Unit) {
        val s = state.value
        if (s.name.isBlank()) return
        viewModelScope.launch {
            if (beanId == null) {
                val id = repository.createBean(
                    name = s.name.trim(),
                    roaster = s.roaster.trim().ifBlank { null },
                    roastDate = s.roastDate,
                    photoUri = s.photoPath,
                    notes = s.notes.trim().ifBlank { null },
                    origin = s.origin.trim().ifBlank { null },
                    process = s.process.trim().ifBlank { null },
                    roastLevel = s.roastLevel,
                    boughtAt = s.boughtAt.trim().ifBlank { null },
                )
                onDone(id)
            } else {
                repository.getBean(beanId)?.let { bean ->
                    repository.updateBean(
                        bean.copy(
                            name = s.name.trim(),
                            roaster = s.roaster.trim().ifBlank { null },
                            roastDate = s.roastDate,
                            photoUri = s.photoPath,
                            notes = s.notes.trim().ifBlank { null },
                            origin = s.origin.trim().ifBlank { null },
                            process = s.process.trim().ifBlank { null },
                            roastLevel = s.roastLevel,
                            boughtAt = s.boughtAt.trim().ifBlank { null },
                        )
                    )
                }
                onDone(beanId)
            }
        }
    }
}

private fun newPhotoFile(context: Context): File {
    val dir = File(context.filesDir, "photos").apply { mkdirs() }
    return File(dir, "${UUID.randomUUID()}.jpg")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeanEditScreen(
    onBack: () -> Unit,
    onSaved: (String) -> Unit,
    viewModel: BeanEditViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    var pendingPhoto by remember { mutableStateOf<File?>(null) }
    val takePicture = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        val file = pendingPhoto
        if (ok && file != null) {
            viewModel.update { it.copy(photoPath = file.absolutePath) }
        } else {
            file?.delete()
        }
        pendingPhoto = null
    }

    var showDatePicker by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isNew) "Neue Bohne" else "Bohne bearbeiten") },
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
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (state.photoPath != null) {
                    AsyncImage(
                        model = File(state.photoPath!!),
                        contentDescription = "Tütenfoto",
                        modifier = Modifier.size(88.dp).clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Crop,
                    )
                }
                OutlinedButton(
                    onClick = {
                        val file = newPhotoFile(context)
                        pendingPhoto = file
                        val uri: Uri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file,
                        )
                        takePicture.launch(uri)
                    },
                    modifier = Modifier.padding(start = if (state.photoPath != null) 14.dp else 0.dp),
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = null)
                    Text(
                        if (state.photoPath != null) "  Neues Foto" else "  Tütenfoto",
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }

            OutlinedTextField(
                value = state.name,
                onValueChange = { v -> viewModel.update { it.copy(name = v) } },
                label = { Text("Name *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.roaster,
                onValueChange = { v -> viewModel.update { it.copy(roaster = v) } },
                label = { Text("Röster") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.CalendarMonth, contentDescription = null)
                Text(
                    state.roastDate?.let { "  Geröstet am ${formatDate(it)}" } ?: "  Röstdatum wählen",
                    modifier = Modifier.padding(start = 4.dp),
                )
            }

            Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)) {
                Text(
                    "Röstgrad:",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 12.dp),
                )
                listOf(
                    RoastLevel.HELL to "Hell",
                    RoastLevel.MITTEL to "Mittel",
                    RoastLevel.DUNKEL to "Dunkel",
                ).forEach { (level, label) ->
                    FilterChip(
                        selected = state.roastLevel == level,
                        onClick = {
                            viewModel.update {
                                it.copy(roastLevel = if (it.roastLevel == level) null else level)
                            }
                        },
                        label = { Text(label) },
                    )
                }
            }

            Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = state.origin,
                    onValueChange = { v -> viewModel.update { it.copy(origin = v) } },
                    label = { Text("Herkunft") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = state.process,
                    onValueChange = { v -> viewModel.update { it.copy(process = v) } },
                    label = { Text("Prozess") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }

            OutlinedTextField(
                value = state.boughtAt,
                onValueChange = { v -> viewModel.update { it.copy(boughtAt = v) } },
                label = { Text("Gekauft bei") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.notes,
                onValueChange = { v -> viewModel.update { it.copy(notes = v) } },
                label = { Text("Notiz") },
                minLines = 3,
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = { viewModel.save(onSaved) },
                enabled = state.name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Speichern")
            }
        }
    }

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = state.roastDate
                ?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    val millis = pickerState.selectedDateMillis
                    if (millis != null) {
                        val date = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()
                        viewModel.update { it.copy(roastDate = date) }
                    }
                    showDatePicker = false
                }) { Text("Übernehmen") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Abbrechen") }
            },
        ) {
            DatePicker(state = pickerState, title = {
                Text("Röstdatum", modifier = Modifier.padding(start = 24.dp, top = 16.dp))
            })
        }
    }
}
