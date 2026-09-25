package de.birneklub.drop.android.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import android.net.Uri
import de.birneklub.drop.android.AppContainer
import de.birneklub.drop.core.backup.BackupException
import de.birneklub.drop.core.backup.DropsBackup
import de.birneklub.drop.core.catalog.EquipmentCatalog
import de.birneklub.drop.core.stats.StatEvents
import de.birneklub.drop.core.catalog.GrinderModel
import de.birneklub.drop.core.catalog.MachineModel
import de.birneklub.drop.core.domain.Maintenance
import de.birneklub.drop.core.domain.TaskStatus
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.data.AccountSession
import de.birneklub.drop.data.SyncException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
    fun runningLow(): List<Pair<Bean, Int>> = de.birneklub.drop.core.reminders.Reminders.runningLow(beans, recipes)
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

    /** null while loading; false shows onboarding on a fresh install. */
    private val stats = container.stats

    /** Anonymous beta statistics: null = not asked yet. */
    private val _statsOptIn = MutableStateFlow<Boolean?>(null)
    val statsOptIn: StateFlow<Boolean?> = _statsOptIn.asStateFlow()

    private val _setupDone = MutableStateFlow<Boolean?>(null)
    val setupDone: StateFlow<Boolean?> = _setupDone.asStateFlow()

    private var pendingSync: Job? = null

    init {
        viewModelScope.launch {
            _setupDone.value = repo.isSetupDone()
            _statsOptIn.value = stats.optedIn()
            if (sync.session.value != null) syncNow(silent = true)
            stats.countDaily(StatEvents.APP_OPEN)
            stats.flush(container.statsServerUrl)
        }
        viewModelScope.launch { sync.session.collect { s -> _account.value = _account.value.copy(session = s) } }
    }

    fun now() = repo.now()
    fun newId() = repo.newId()
    fun consumeMessage() { _messages.value = null }
    private fun say(text: String) { _messages.value = text }
    private fun count(event: String) { viewModelScope.launch { stats.count(event) } }

    val founding = container.founding
    /** The offer was shown; counted once a day for the beta conversion rate. */
    fun foundingViewed() = viewModelScope.launch { founding.connect(); stats.countDaily(StatEvents.FOUNDING_VIEW) }

    fun setStatsOptIn(enabled: Boolean) = viewModelScope.launch {
        stats.setOptIn(enabled)
        _statsOptIn.value = enabled
        if (enabled) {
            stats.countDaily(StatEvents.APP_OPEN)
            // Only a real setup counts, not "look around with sample data".
            if (library.value.equipment.any { !it.id.startsWith(de.birneklub.drop.data.SampleData.PREFIX) }) stats.count(StatEvents.SETUP_DONE)
        }
    }

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
    fun logShot(shot: Shot) = write("Shot gespeichert") { repo.logShot(shot); stats.count(StatEvents.SHOT_LOGGED) }
    /** Adds the coffee and the roaster's starting recipe from a scanned card; returns the bean id. */
    fun addRoasterCard(card: de.birneklub.drop.core.roaster.RoasterCard): String {
        val (bean, recipe) = card.toBeanAndRecipe(repo.newId(), repo.newId(), repo.now())
        write("${bean.name} mit Rezept von ${card.roaster} angelegt") {
            repo.saveBean(bean)
            repo.saveRecipe(recipe)
            stats.count(StatEvents.BEAN_ADDED)
            stats.count(StatEvents.ROASTER_RECIPE)
        }
        return bean.id
    }

    fun addBean(bean: Bean) = write("${bean.name} angelegt") { repo.saveBean(bean); stats.count(StatEvents.BEAN_ADDED) }
    fun adoptShot(shot: Shot) = write("Rezept aktualisiert") { repo.adoptShotAsRecipe(shot) }

    // --- care ------------------------------------------------------------------
    fun completeTask(status: TaskStatus) = write("${status.task.name}: erledigt") { repo.completeTask(status.task.id); stats.count(StatEvents.TASK_DONE) }
    fun saveEquipment(e: Equipment) = write { repo.saveEquipment(e) }
    fun removeSampleData() = write("Beispieldaten entfernt") { repo.removeSampleData() }

    // --- setup -------------------------------------------------------------------
    /** Sets up the machine from the catalog, or a named machine that is not in it. */
    fun chooseMachine(model: MachineModel?, customName: String = "") = write {
        val t = repo.now()
        val id = repo.newId()
        val equipment = model?.let { EquipmentCatalog.equipmentFor(it, id, t) }
            ?: de.birneklub.drop.core.model.Equipment(id, de.birneklub.drop.core.model.EquipmentKind.MACHINE, customName.ifBlank { "Siebträger" }, updatedAt = t)
        repo.replaceEquipment(equipment, EquipmentCatalog.tasksFor(model, id, t, repo::newId))
    }

    fun chooseGrinder(model: GrinderModel?, customName: String = "") = write {
        val t = repo.now()
        val id = repo.newId()
        val equipment = model?.let { EquipmentCatalog.equipmentFor(it, id, t) }
            ?: de.birneklub.drop.core.model.Equipment(
                id, de.birneklub.drop.core.model.EquipmentKind.GRINDER, customName.ifBlank { "Mühle" },
                grindScale = EquipmentCatalog.customGrindScale, updatedAt = t,
            )
        repo.replaceEquipment(equipment, EquipmentCatalog.tasksFor(model, id, t, repo::newId))
    }

    fun finishSetup() = viewModelScope.launch {
        repo.markSetupDone()
        stats.count(StatEvents.SETUP_DONE)
        _setupDone.value = true
    }

    /** Skips onboarding and opens the app with example data to look around. */
    fun exploreWithSamples() = viewModelScope.launch {
        repo.seedIfEmpty()
        repo.markSetupDone()
        _setupDone.value = true
    }

    // --- outbound links -----------------------------------------------------------
    /** Link for reordering a bean; the tap is counted for the beta metrics. */
    fun reorderLink(bean: Bean): String = de.birneklub.drop.core.reminders.Links.reorder(bean).also { linkOpened("reorder") }

    fun supplyLink(supply: String): String = de.birneklub.drop.core.reminders.Links.supply(supply).also { linkOpened("supply") }

    private fun linkOpened(kind: String) = count(if (kind == "reorder") StatEvents.LINK_REORDER else StatEvents.LINK_SUPPLY)

    // --- backup ------------------------------------------------------------------
    /** Writes a complete backup to a file the user picked (Downloads, Drive, …). */
    fun exportBackup(target: Uri) = viewModelScope.launch {
        try {
            val backup = repo.exportBackup()
            withContext(Dispatchers.IO) {
                container.app.contentResolver.openOutputStream(target, "wt")?.use { it.write(backup.encode().encodeToByteArray()) }
                    ?: error("no stream")
            }
            say("Backup gespeichert: ${backup.beans.size} Bohnen, ${backup.shots.size} Shots")
        } catch (e: Exception) {
            say("Backup konnte nicht gespeichert werden.")
        }
    }

    /** Merges a backup file; newer records on the device are kept. */
    fun importBackup(source: Uri) = viewModelScope.launch {
        try {
            val text = withContext(Dispatchers.IO) {
                container.app.contentResolver.openInputStream(source)?.use { it.readBytes().decodeToString() } ?: error("no stream")
            }
            val result = repo.importBackup(DropsBackup.decode(text))
            say(if (result.changed == 0) "Backup geprüft: nichts Neues" else "Backup eingespielt: ${result.added} neu, ${result.updated} aktualisiert")
            scheduleSync()
        } catch (e: BackupException) {
            say(e.message ?: "Backup ungültig")
        } catch (e: Exception) {
            say("Backup konnte nicht gelesen werden.")
        }
    }

    /** Takes over beans and espresso shots from a Beanconqueror export (ZIP or JSON). */
    fun importBeanconqueror(source: Uri) = viewModelScope.launch {
        try {
            val backup = withContext(Dispatchers.IO) {
                val bytes = container.app.contentResolver.openInputStream(source)?.use { it.readBytes() } ?: error("no stream")
                val files = readBeanconquerorFiles(bytes)
                de.birneklub.drop.core.importer.BeanconquerorImport.parse(
                    mainJson = files["Beanconqueror.json"] ?: throw BackupException("Im ZIP fehlt Beanconqueror.json."),
                    extraBeans = chunks(files, "Beans"),
                    extraBrews = chunks(files, "Brews"),
                    exportedAt = repo.now(),
                )
            }
            val result = repo.importBackup(backup)
            say("Aus Beanconqueror: ${backup.beans.size} Bohnen, ${backup.shots.size} Espresso-Shots (${result.added} neu)")
            scheduleSync()
        } catch (e: BackupException) {
            say(e.message ?: "Import fehlgeschlagen")
        } catch (e: Exception) {
            say("Die Datei konnte nicht gelesen werden.")
        }
    }

    private fun chunks(files: Map<String, String>, name: String): List<String> =
        generateSequence(1) { it + 1 }.map { files["Beanconqueror_${name}_$it.json"] }.takeWhile { it != null }.filterNotNull().toList()

    /** A ZIP export is unpacked (JSON files only, size-capped); a plain JSON file is taken as the main file. */
    private fun readBeanconquerorFiles(bytes: ByteArray): Map<String, String> {
        val isZip = bytes.size > 4 && bytes[0] == 'P'.code.toByte() && bytes[1] == 'K'.code.toByte()
        if (!isZip) return mapOf("Beanconqueror.json" to bytes.decodeToString())
        val files = mutableMapOf<String, String>()
        java.util.zip.ZipInputStream(bytes.inputStream()).use { zip ->
            var total = 0L
            while (true) {
                val entry = zip.nextEntry ?: break
                val name = entry.name.substringAfterLast('/')
                if (!entry.isDirectory && name.startsWith("Beanconqueror") && name.endsWith(".json")) {
                    val content = zip.readBytes()
                    total += content.size
                    if (total > MAX_IMPORT_BYTES) throw BackupException("Der Export ist zu groß.")
                    files[name] = content.decodeToString()
                }
            }
        }
        return files
    }

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
        private const val MAX_IMPORT_BYTES = 200L * 1024 * 1024

        fun factory(container: AppContainer): ViewModelProvider.Factory = viewModelFactory {
            initializer { DropsViewModel(container) }
        }
    }
}
