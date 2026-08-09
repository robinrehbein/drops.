package de.birneklub.drops.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ThumbDown
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import de.birneklub.drops.data.BeanListRow
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.BeanStatus
import de.birneklub.drops.ui.AppViewModelProvider
import de.birneklub.drops.ui.formatGrind
import de.birneklub.drops.ui.formatRecipeShort
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.io.File

class BeanListViewModel(repository: BeanRepository) : ViewModel() {
    val query = MutableStateFlow("")

    val rows: StateFlow<List<BeanListRow>> =
        combine(repository.observeRows(), query) { rows, q ->
            if (q.isBlank()) rows
            else rows.filter { row ->
                row.bean.name.contains(q, ignoreCase = true) ||
                    row.bean.roaster?.contains(q, ignoreCase = true) == true
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeanListScreen(
    onOpenBean: (String) -> Unit,
    onAddBean: () -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: BeanListViewModel = viewModel(factory = AppViewModelProvider.Factory),
) {
    val rows by viewModel.rows.collectAsState()
    val query by viewModel.query.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Drops") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Einstellungen")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddBean) {
                Icon(Icons.Default.Add, contentDescription = "Neue Bohne")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { viewModel.query.value = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Bohne oder Röster suchen…") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(28.dp),
            )

            val active = rows.filter { it.bean.status == BeanStatus.ACTIVE }
            val finished = rows.filter { it.bean.status == BeanStatus.FINISHED }

            if (rows.isEmpty()) {
                EmptyState(hasQuery = query.isNotBlank())
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(active, key = { it.bean.id }) { row ->
                        BeanCard(row = row, onClick = { onOpenBean(row.bean.id) })
                    }
                    if (finished.isNotEmpty()) {
                        item {
                            Text(
                                "Aufgebraucht",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 12.dp, bottom = 2.dp),
                            )
                        }
                        items(finished, key = { it.bean.id }) { row ->
                            BeanCard(row = row, onClick = { onOpenBean(row.bean.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyState(hasQuery: Boolean) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.Coffee,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                if (hasQuery) "Keine Bohne gefunden" else "Noch keine Bohnen — leg die erste an!",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }
}

@Composable
private fun BeanCard(row: BeanListRow, onClick: () -> Unit) {
    val bean = row.bean
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = if (bean.status == BeanStatus.ACTIVE)
                MaterialTheme.colorScheme.surfaceVariant
            else
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        ),
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (bean.photoUri != null) {
                AsyncImage(
                    model = File(bean.photoUri),
                    contentDescription = null,
                    modifier = Modifier.size(52.dp).clip(RoundedCornerShape(10.dp)),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Coffee,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
                androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        bean.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    when (bean.wouldBuyAgain) {
                        true -> Icon(
                            Icons.Default.ThumbUp,
                            contentDescription = "Würde ich wieder kaufen",
                            modifier = Modifier.padding(start = 6.dp).size(14.dp),
                            tint = MaterialTheme.colorScheme.tertiary,
                        )
                        false -> Icon(
                            Icons.Default.ThumbDown,
                            contentDescription = "Nicht nochmal",
                            modifier = Modifier.padding(start = 6.dp).size(14.dp),
                            tint = MaterialTheme.colorScheme.error,
                        )
                        null -> {}
                    }
                }
                if (bean.roaster != null) {
                    Text(
                        bean.roaster,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (row.recipeGrind != null) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        formatGrind(row.recipeGrind),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        formatRecipeShort(row.recipeDose, row.recipeYield, row.recipeTime),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else if (bean.status == BeanStatus.ACTIVE) {
                SuggestionChip(onClick = onClick, label = { Text("eindialen…") })
            }
        }
    }
}
