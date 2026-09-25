package de.birneklub.drop.core.reminders

import de.birneklub.drop.core.domain.Maintenance
import de.birneklub.drop.core.domain.TaskState
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.BeanStatus
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Recipe
import kotlinx.datetime.Instant
import kotlin.math.floor

enum class ReminderKind { CARE, REORDER }

/**
 * Something worth a notification. [key] changes once per cycle (a new bag, a
 * task done again), so each reminder is sent once and never repeated.
 */
data class Reminder(
    val key: String,
    val kind: ReminderKind,
    val targetId: String,
    val title: String,
    val text: String,
)

object Reminders {
    /** A bag counts as running low when this many shots are left. */
    const val LOW_SHOTS = 3
    private const val DEFAULT_DOSE = 18.0

    fun shotsLeft(bean: Bean, dose: Double): Int = if (dose > 0) floor(bean.remainingGrams / dose).toInt() else 0

    /** Open bags about to run out that the user has not ruled out rebuying. */
    fun runningLow(beans: List<Bean>, recipes: List<Recipe>): List<Pair<Bean, Int>> = beans
        .filter { it.status == BeanStatus.OPEN && it.frozenDoses == 0 && it.wouldRebuy != false }
        .map { b -> b to shotsLeft(b, recipes.firstOrNull { it.beanId == b.id }?.doseGrams ?: DEFAULT_DOSE) }
        .filter { (_, left) -> left <= LOW_SHOTS }
        .sortedBy { it.second }

    fun due(
        tasks: List<MaintenanceTask>,
        equipment: List<Equipment>,
        beans: List<Bean>,
        recipes: List<Recipe>,
        now: Instant,
    ): List<Reminder> {
        val care = Maintenance.plan(tasks, equipment, now).filter { it.state == TaskState.OVERDUE }.map { s ->
            val cycle = s.task.lastDoneAt?.toEpochMilliseconds()?.toString() ?: s.task.lastDoneCounter.toString()
            Reminder(
                key = "care:${s.task.id}:$cycle",
                kind = ReminderKind.CARE,
                targetId = s.task.id,
                title = "${s.task.name} ist fällig",
                text = s.task.supply?.let { "Tippe zum Abhaken. Nachschub: $it" } ?: "Tippe zum Abhaken.",
            )
        }
        val reorder = runningLow(beans, recipes).map { (b, left) ->
            val cycle = b.purchase?.purchasedOn?.toString() ?: b.roastDate?.toString() ?: b.weightGrams.toString()
            Reminder(
                key = "reorder:${b.id}:$cycle",
                kind = ReminderKind.REORDER,
                targetId = b.id,
                title = if (left == 0) "${b.name} ist leer" else "${b.name}: noch $left Shots",
                text = "Jetzt nachbestellen, damit die nächste Tüte rechtzeitig ausgeruht ist.",
            )
        }
        return care + reorder
    }
}

/** Outbound links for reordering beans and consumables. */
object Links {
    /** The product page if the user saved one, otherwise a search for roaster and coffee. */
    fun reorder(bean: Bean): String =
        bean.purchase?.url?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
            ?: search("${bean.roaster} ${bean.name} Kaffee")

    fun supply(supply: String): String = search(supply)

    private fun search(query: String): String = "https://www.google.com/search?tbm=shop&q=" + encode(query.trim())

    private fun encode(s: String): String = buildString {
        s.encodeToByteArray().forEach { b ->
            val c = b.toInt().toChar()
            when {
                c.isLetterOrDigit() && b >= 0 -> append(c)
                c == '-' || c == '.' || c == '_' || c == '~' -> append(c)
                c == ' ' -> append('+')
                else -> append('%').append(((b.toInt() and 0xff) + 0x100).toString(16).substring(1).uppercase())
            }
        }
    }
}
