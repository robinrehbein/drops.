package de.birneklub.drop.core.backup

import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.core.sync.DropsJson
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject

/**
 * A complete, human-readable snapshot of everything a user tracks. The same
 * file restores on Android and later on iOS, so the format is versioned and
 * only ever extended with optional fields.
 */
@Serializable
data class DropsBackup(
    val format: String = FORMAT,
    val version: Int = VERSION,
    val exportedAt: Instant,
    val beans: List<Bean> = emptyList(),
    val recipes: List<Recipe> = emptyList(),
    val shots: List<Shot> = emptyList(),
    val equipment: List<Equipment> = emptyList(),
    val tasks: List<MaintenanceTask> = emptyList(),
) {
    val size: Int get() = beans.size + recipes.size + shots.size + equipment.size + tasks.size

    fun encode(): String = DropsJson.encodeToString(serializer(), this)

    companion object {
        const val FORMAT = "drops.backup"
        const val VERSION = 1

        /** Parses a backup file, rejecting anything that is not a drops. backup from this or an older version. */
        fun decode(text: String): DropsBackup {
            val notABackup = BackupException("Die Datei ist kein drops.-Backup.")
            val json = runCatching { DropsJson.parseToJsonElement(text).jsonObject }.getOrNull() ?: throw notABackup
            if ((json["format"] as? JsonPrimitive)?.contentOrNull != FORMAT) throw notABackup
            val backup = runCatching { DropsJson.decodeFromJsonElement(serializer(), json) }.getOrNull() ?: throw notABackup
            if (backup.version > VERSION) throw BackupException("Das Backup stammt aus einer neueren App-Version. Bitte aktualisiere die App.")
            return backup
        }
    }
}

class BackupException(message: String) : Exception(message)

/** What an import changed. Records that are newer on the device are kept. */
data class ImportResult(val added: Int, val updated: Int, val skipped: Int) {
    val changed: Int get() = added + updated
}
