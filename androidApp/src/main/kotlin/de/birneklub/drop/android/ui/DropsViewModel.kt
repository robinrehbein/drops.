package de.birneklub.drop.android.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import de.birneklub.drop.android.AppContainer
import de.birneklub.drop.core.domain.Maintenance
import de.birneklub.drop.core.domain.TaskStatus
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.data.AccountSession
import de.birneklub.drop.data.SyncException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class LibraryState(
    val beans: List<Bean> = emptyList(),
    val recipes: List<Recipe> = emptyList(),
    val shots: List<Shot> = emptyList(),
    val equipment: List<Equipment> = emptyList(),
    val tasks: List<MaintenanceTask> = emptyList(),
    val loaded: Boolean = false,
) {
    val hopperBean: Bean? get() = beans.firstOrNull { it.inHopper } ?: beans.firstOrNull { it.status == de.birneklub.drop.core.model.BeanStatus.OPEN }
    fun recipesFor(beanId: String) = recipes.filter { it.beanId == beanId }.sortedBy { it.name }
    fun shotsFor(beanId: String) = shots.filter { it.beanId == beanId }.sortedBy { it.pulledAt }
    fun bean(id: String) = beans.firstOrNull { it.id == id }
    fun carePlan(now: kotlinx.datetime.Instant): List<TaskStatus> = Maintenance.plan(tasks, equipment, now)
}

data class AccountState(
    val session: AccountSession? = null,
    val busy: Boolean = false,
    val lastSyncMessage: String? = null,
    val error: String? = null,
)

class DropsViewModel(private val container: AppContainer) : ViewModel() {
    private val repo = container.repository
    private val sync = container.sync

    val library: StateFlow<LibraryState> = combine(repo.beans, repo.recipes, repo.shots, repo.equipment, repo.tasks) { b, r, s, e, t ->
        LibraryState(b.sortedBy { it.name }, r, s, e, t, loaded = true)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LibraryState())

    private val _account = MutableStateFlow(AccountState(session = sync.session.value))
    val account: StateFlow<AccountState> = _account.asStateFlow()

    private val _messages = MutableStateFlow<String?>(null)
    val messages: StateFlow<String?> = _messages.asStateFlow()

    private var pendingSync: Job? = null

    init {
        viewModelScope.launch {
            repo.seedIfEmpty()
            if (sync.session.value != null) syncNow(silent = true)
        }
        viewModelScope.launch { sync.session.collect { s -> _account.value = _account.value.copy(session = s) } }
    }

    fun now() = repo.now()
    fun newId() = repo.newId()
    fun consumeMessage() { _messages.value = null }
    private fun say(text: String) { _messages.value = text }

    /** Runs a local write, then schedules a background sync when an account is connected. */
    private fun write(message: String? = null, block: suspend () -> Unit) {
        viewModelScope.launch {
            block()
            message?.let(::say)
            scheduleSync()
        }
    }

    private fun scheduleSync() {
        if (sync.session.value == null) return
        pendingSync?.cancel()
        pendingSync = viewModelScope.launch {
            delay(2_000)
            syncNow(silent = true)
        }
    }

    // --- beans ---------------------------------------------------------------
    fun saveBean(bean: Bean, message: String? = null) = write(message) { repo.saveBean(bean) }
    fun putInHopper(bean: Bean) = write("${bean.name} ist jetzt im Trichter") { repo.putInHopper(bean.id) }
    fun thawDose(bean: Bean) = write("1 Dose aufgetaut") { repo.thawDose(bean.id) }
    fun rate(bean: Bean, stars: Int) {
        val value = if (bean.rating == stars.toDouble()) stars - 0.5 else stars.toDouble()
        saveBean(bean.copy(rating = value))
    }
    fun setRebuy(bean: Bean, rebuy: Boolean) = saveBean(bean.copy(wouldRebuy = rebuy))
    fun saveRecipe(recipe: Recipe, message: String? = null) = write(message) { repo.saveRecipe(recipe) }

    // --- shots -----------------------------------------------------------------
    fun logShot(shot: Shot) = write("Shot gespeichert") { repo.logShot(shot) }
    fun adoptShot(shot: Shot) = write("Rezept aktualisiert") { repo.adoptShotAsRecipe(shot) }

    // --- care ------------------------------------------------------------------
    fun completeTask(status: TaskStatus) = write("${status.task.name}: erledigt") { repo.completeTask(status.task.id) }
    fun saveEquipment(e: Equipment) = write { repo.saveEquipment(e) }
    fun removeSampleData() = write("Beispieldaten entfernt") { repo.removeSampleData() }

    // --- account (optional) ------------------------------------------------------
    fun login(serverUrl: String, email: String, password: String, register: Boolean) {
        viewModelScope.launch {
            _account.value = _account.value.copy(busy = true, error = null)
            try {
                if (register) sync.register(serverUrl, email, password) else sync.login(serverUrl, email, password)
                _account.value = _account.value.copy(busy = false)
                syncNow()
            } catch (e: SyncException) {
                _account.value = _account.value.copy(busy = false, error = e.message)
            }
        }
    }

    fun syncNow(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) _account.value = _account.value.copy(busy = true, error = null)
            try {
                val result = sync.sync()
                _account.value = _account.value.copy(busy = false, error = null, lastSyncMessage = "Synchronisiert: ${result.pushed} hoch, ${result.pulled} runter")
            } catch (e: SyncException) {
                _account.value = _account.value.copy(busy = false, error = e.message)
            }
        }
    }

    fun logout() = viewModelScope.launch { sync.logout(); say("Abgemeldet. Deine Daten bleiben auf dem Gerät.") }

    fun deleteAccount() = viewModelScope.launch {
        try {
            sync.deleteAccount()
            say("Konto gelöscht. Deine Daten bleiben auf dem Gerät.")
        } catch (e: SyncException) {
            _account.value = _account.value.copy(error = e.message)
        }
    }

    companion object {
        fun factory(container: AppContainer): ViewModelProvider.Factory = viewModelFactory {
            initializer { DropsViewModel(container) }
        }
    }
}
