package de.birneklub.drops.data

import kotlinx.coroutines.flow.Flow
import java.util.UUID
import java.util.concurrent.TimeUnit

/** Fälligkeits-Status einer Wartungsaufgabe. */
enum class DueState { OVERDUE, DUE_SOON, OK, NEVER_DONE }

data class TaskWithDue(
    val task: MaintenanceTask,
    val dueState: DueState,
    val daysUntilDue: Long?,
)

fun MaintenanceTask.dueInfo(now: Long = System.currentTimeMillis()): TaskWithDue {
    val last = lastDoneAt
        ?: return TaskWithDue(this, DueState.NEVER_DONE, null)
    val dueAt = last + TimeUnit.DAYS.toMillis(intervalDays.toLong())
    val daysUntil = TimeUnit.MILLISECONDS.toDays(dueAt - now)
    val state = when {
        now >= dueAt -> DueState.OVERDUE
        daysUntil <= 2 -> DueState.DUE_SOON
        else -> DueState.OK
    }
    return TaskWithDue(this, state, daysUntil)
}

class CareRepository(private val dao: MaintenanceDao) {
    fun observeAll(): Flow<List<MaintenanceTask>> = dao.observeAll()

    suspend fun seedDefaultsIfEmpty() {
        if (dao.count() > 0) return
        val now = System.currentTimeMillis()
        // Intervalle nach gängigen Wartungs-Guides (Clive Coffee, Seattle Coffee Gear u. a.)
        val defaults = listOf(
            Triple("Duschsieb & Brühgruppe reinigen", TaskCategory.MASCHINE, 7),
            Triple("Backflush mit Reiniger", TaskCategory.MASCHINE, 14),
            Triple("Entkalken", TaskCategory.MASCHINE, 90),
            Triple("Wasserfilter wechseln", TaskCategory.WASSER, 180),
            Triple("Mühle reinigen (Mahlkammer & Bohnenbehälter)", TaskCategory.MUEHLE, 21),
            Triple("Siebträger & Körbe tiefenreinigen", TaskCategory.MASCHINE, 7),
        )
        defaults.forEach { (name, category, days) ->
            dao.upsert(
                MaintenanceTask(
                    id = UUID.randomUUID().toString(),
                    name = name,
                    category = category,
                    intervalDays = days,
                    createdAt = now,
                )
            )
        }
    }

    suspend fun markDone(task: MaintenanceTask) {
        dao.upsert(task.copy(lastDoneAt = System.currentTimeMillis()))
    }

    suspend fun save(task: MaintenanceTask) = dao.upsert(task)

    suspend fun delete(task: MaintenanceTask) = dao.delete(task)
}

class PlaceRepository(private val dao: PlaceDao) {
    fun observeAll(): Flow<List<Place>> = dao.observeAll()

    suspend fun seedStartersIfEmpty() {
        if (dao.count() > 0) return
        val now = System.currentTimeMillis()
        // Bekannte Specialty-Adressen als Startpunkt — bewusst klein, editierbar, löschbar.
        val starters = listOf(
            Triple("The Barn", "Berlin", PlaceType.ROESTEREI),
            Triple("Bonanza Coffee", "Berlin", PlaceType.ROESTEREI),
            Triple("Five Elephant", "Berlin", PlaceType.ROESTEREI),
            Triple("Man versus Machine", "München", PlaceType.ROESTEREI),
            Triple("Mahlefitz", "München", PlaceType.ROESTEREI),
            Triple("Elbgold", "Hamburg", PlaceType.ROESTEREI),
            Triple("Törnqvist", "Hamburg", PlaceType.CAFE),
            Triple("Hoppenworth & Ploch", "Frankfurt", PlaceType.ROESTEREI),
            Triple("Ernst Kaffeeröster", "Köln", PlaceType.ROESTEREI),
            Triple("Mókuska Caffè", "Stuttgart", PlaceType.ROESTEREI),
        )
        starters.forEach { (name, city, type) ->
            dao.upsert(
                Place(
                    id = UUID.randomUUID().toString(),
                    name = name,
                    city = city,
                    type = type,
                    createdAt = now,
                )
            )
        }
    }

    suspend fun save(place: Place) = dao.upsert(place)

    suspend fun delete(place: Place) = dao.delete(place)
}
