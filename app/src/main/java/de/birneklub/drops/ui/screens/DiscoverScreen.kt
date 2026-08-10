package de.birneklub.drops.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import de.birneklub.drops.data.Place
import de.birneklub.drops.data.PlaceRepository
import de.birneklub.drops.data.PlaceType
import de.birneklub.drops.ui.AppViewModelProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

class DiscoverViewModel(private val repository: PlaceRepository) : ViewModel() {
    init {
        viewModelScope.launch { repository.seedStartersIfEmpty() }
    }

    val query = MutableStateFlow("")
    val typeFilter = MutableStateFlow<PlaceType?>(null)

    val places: StateFlow<List<Place>> =
        combine(repository.observeAll(), query, typeFilter) { places, q, type ->
            places
                .filter { type == null || it.type == type }
                .filter {
                    q.isBlank() ||
                        it.name.contains(q, ignoreCase = true) ||
                        it.city.contains(q, ignoreCase = true)
                }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun toggleFavorite(place: Place) {
        viewModelScope.launch { repository.save(place.copy(favorite = !place.favorite)) }
    }

    fun save(place: Place) {
        viewModelScope.launch { repository.save(place) }
    }

    fun delete(place: Place) {
        viewModelScope.launch { repository.delete(place) }
    }
}

private fun typeLabel(type: PlaceType): String = when (type) {
    PlaceType.CAFE -> "Café"
    PlaceType.ROESTEREI -> "Rösterei"
    PlaceType.SHOP -> "Shop"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    viewModel: DiscoverViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val places by viewModel.places.collectAsState()
    val query by viewModel.query.collectAsState()
    val typeFilter by viewModel.typeFilter.collectAsState()
    val context = LocalContext.current
    var editPlace by remember { mutableStateOf<Place?>(null) }
    var showNewDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Entdecken") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showNewDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Ort hinzufügen")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            OutlinedTextField(
                value = query,
                onValueChange = { viewModel.query.value = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Stadt oder Name suchen…") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(28.dp),
            )
            Row(
                modifier = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PlaceType.entries.forEach { type ->
                    FilterChip(
                        selected = typeFilter == type,
                        onClick = {
                            viewModel.typeFilter.value = if (typeFilter == type) null else type
                        },
                        label = { Text(typeLabel(type)) },
                    )
                }
            }
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(places, key = { it.id }) { place ->
                    PlaceCard(
                        place = place,
                        onOpenMap = {
                            val geo = Uri.parse("geo:0,0?q=" + Uri.encode("${place.name} ${place.city}"))
                            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, geo)) }
                        },
                        onToggleFavorite = { viewModel.toggleFavorite(place) },
                        onEdit = { editPlace = place },
                    )
                }
                item {
                    TextButton(onClick = {
                        runCatching {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse("https://europeancoffeetrip.com"))
                            )
                        }
                    }) {
                        Text("Europaweit entdecken: European Coffee Trip öffnen →")
                    }
                }
            }
        }
    }

    if (showNewDialog) {
        PlaceDialog(
            place = null,
            onSave = { viewModel.save(it); showNewDialog = false },
            onDelete = null,
            onDismiss = { showNewDialog = false },
        )
    }
    editPlace?.let { place ->
        PlaceDialog(
            place = place,
            onSave = { viewModel.save(it); editPlace = null },
            onDelete = { viewModel.delete(place); editPlace = null },
            onDismiss = { editPlace = null },
        )
    }
}

@Composable
private fun PlaceCard(
    place: Place,
    onOpenMap: () -> Unit,
    onToggleFavorite: () -> Unit,
    onEdit: () -> Unit,
) {
    Card(
        onClick = onEdit,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(place.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(
                    "${place.city} · ${typeLabel(place.type)}" +
                        (place.notes?.let { " · $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onToggleFavorite) {
                Icon(
                    if (place.favorite) Icons.Default.Star else Icons.Default.StarBorder,
                    contentDescription = "Favorit",
                    tint = if (place.favorite) MaterialTheme.colorScheme.secondary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onOpenMap) {
                Icon(Icons.Default.Map, contentDescription = "In Karte öffnen", modifier = Modifier.size(22.dp))
            }
        }
    }
}

@Composable
private fun PlaceDialog(
    place: Place?,
    onSave: (Place) -> Unit,
    onDelete: (() -> Unit)?,
    onDismiss: () -> Unit,
) {
    var name by remember { mutableStateOf(place?.name ?: "") }
    var city by remember { mutableStateOf(place?.city ?: "") }
    var notes by remember { mutableStateOf(place?.notes ?: "") }
    var type by remember { mutableStateOf(place?.type ?: PlaceType.CAFE) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (place == null) "Ort hinzufügen" else "Ort bearbeiten") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = city,
                    onValueChange = { city = it },
                    label = { Text("Stadt") },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notiz") },
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PlaceType.entries.forEach { t ->
                        FilterChip(
                            selected = type == t,
                            onClick = { type = t },
                            label = { Text(typeLabel(t)) },
                        )
                    }
                }
                if (onDelete != null) {
                    TextButton(onClick = onDelete) { Text("Ort löschen") }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && city.isNotBlank(),
                onClick = {
                    onSave(
                        place?.copy(
                            name = name.trim(),
                            city = city.trim(),
                            notes = notes.trim().ifBlank { null },
                            type = type,
                        )
                            ?: Place(
                                id = UUID.randomUUID().toString(),
                                name = name.trim(),
                                city = city.trim(),
                                type = type,
                                notes = notes.trim().ifBlank { null },
                                createdAt = System.currentTimeMillis(),
                            )
                    )
                },
            ) { Text("Speichern") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Abbrechen") } },
    )
}
