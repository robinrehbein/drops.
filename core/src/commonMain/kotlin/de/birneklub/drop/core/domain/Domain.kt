package de.birneklub.drop.core.domain

import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.IntervalUnit
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Taste
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.daysUntil
import kotlin.math.PI
import kotlin.math.ln
import kotlin.math.tan

// ---------------------------------------------------------------------------
// Roast freshness
// ---------------------------------------------------------------------------

enum class FreshnessPhase { RESTING, PEAK, FADING }

data class Freshness(val daysSinceRoast: Int, val phase: FreshnessPhase)

object RoastFreshness {
    /** Espresso window: rest for a week, best until about four weeks after roasting. */
    val espressoWindow: IntRange = 7..28

    fun evaluate(roastDate: LocalDate, today: LocalDate, window: IntRange = espressoWindow): Freshness {
        val days = roastDate.daysUntil(today).coerceAtLeast(0)
        val phase = when {
            days < window.first -> FreshnessPhase.RESTING
            days <= window.last -> FreshnessPhase.PEAK
            else -> FreshnessPhase.FADING
        }
        return Freshness(days, phase)
    }
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

enum class TaskState { OK, SOON, OVERDUE }

data class TaskStatus(
    val task: MaintenanceTask,
    /** Days, kg or shots used since the task was last done. */
    val used: Double,
    /** 0.0 = just done, 1.0 = due. */
    val progress: Double,
    val remaining: Double,
    val state: TaskState,
)

object Maintenance {
    const val SOON_THRESHOLD = 0.8
    private const val MILLIS_PER_DAY = 86_400_000.0

    fun status(task: MaintenanceTask, equipment: Equipment?, now: Instant): TaskStatus {
        val used = when (task.intervalUnit) {
            IntervalUnit.DAYS -> task.lastDoneAt?.let { (now - it).inWholeMilliseconds / MILLIS_PER_DAY } ?: task.intervalValue
            IntervalUnit.KILOGRAMS -> (equipment?.groundKg ?: 0.0) - task.lastDoneCounter
            IntervalUnit.SHOTS -> (equipment?.shotCount ?: 0) - task.lastDoneCounter
        }.coerceAtLeast(0.0)
        val progress = if (task.intervalValue > 0) used / task.intervalValue else 1.0
        val state = when {
            progress >= 1.0 -> TaskState.OVERDUE
            progress >= SOON_THRESHOLD -> TaskState.SOON
            else -> TaskState.OK
        }
        return TaskStatus(task, used, progress, task.intervalValue - used, state)
    }

    /** All tasks, most urgent first. */
    fun plan(tasks: List<MaintenanceTask>, equipment: List<Equipment>, now: Instant): List<TaskStatus> {
        val byId = equipment.associateBy { it.id }
        return tasks.map { status(it, byId[it.equipmentId], now) }.sortedByDescending { it.progress }
    }

    /** Returns the task reset to "done now". */
    fun markDone(task: MaintenanceTask, equipment: Equipment?, now: Instant): MaintenanceTask = when (task.intervalUnit) {
        IntervalUnit.DAYS -> task.copy(lastDoneAt = now, updatedAt = now)
        IntervalUnit.KILOGRAMS -> task.copy(lastDoneCounter = equipment?.groundKg ?: 0.0, lastDoneAt = now, updatedAt = now)
        IntervalUnit.SHOTS -> task.copy(lastDoneCounter = (equipment?.shotCount ?: 0).toDouble(), lastDoneAt = now, updatedAt = now)
    }
}

// ---------------------------------------------------------------------------
// Dial-in advice after a shot
// ---------------------------------------------------------------------------

data class DialInAdvice(
    /** Negative = finer. */
    val grindDelta: Double,
    val temperatureDelta: Int,
    val yieldDeltaGrams: Double,
    /** The shot tasted right; offer to store it as the recipe. */
    val adoptAsRecipe: Boolean,
    val ranFast: Boolean,
    val ranSlow: Boolean,
)

object DialIn {
    fun advise(taste: Taste, timeSec: Double, recipe: Recipe?): DialInAdvice {
        val min = recipe?.targetTimeMinSec ?: 25
        val max = recipe?.targetTimeMaxSec ?: 30
        val fast = timeSec > 0 && timeSec < min
        val slow = timeSec > max
        return when (taste) {
            Taste.SOUR -> DialInAdvice(-1.0, if (fast) 0 else 1, 0.0, false, fast, slow)
            Taste.SLIGHTLY_SOUR -> DialInAdvice(-0.5, 0, 0.0, false, fast, slow)
            Taste.BALANCED -> DialInAdvice(if (slow) 0.25 else 0.0, 0, 0.0, !slow, fast, slow)
            Taste.SLIGHTLY_BITTER -> DialInAdvice(0.5, 0, -1.5, false, fast, slow)
            Taste.BITTER -> DialInAdvice(1.0, -1, 0.0, false, fast, slow)
        }
    }
}

// ---------------------------------------------------------------------------
// Taste profile for recommendations
// ---------------------------------------------------------------------------

enum class FlavorCategory(val keywords: Set<String>) {
    FLORAL(setOf("jasmin", "rose", "hibiskus", "bergamotte", "earl grey", "lavendel", "holunder")),
    FRUITY(setOf("pfirsich", "cassis", "litschi", "mandarine", "erdbeere", "blaubeere", "zitrone", "orange", "pflaume", "apfel", "rosine", "tomate", "aprikose", "kirsche", "grapefruit", "johannisbeere")),
    SWEET(setOf("honig", "karamell", "rohrzucker", "brauner zucker", "vanille", "melasse")),
    CHOCOLATE(setOf("kakao", "schokolade", "milchschokolade", "haselnuss", "nuss", "mandel")),
    ;

    fun matches(note: String): Boolean = keywords.any { note.lowercase().contains(it) }
}

data class PalateProfile(
    /** 0..1, relative to the strongest category. */
    val scores: Map<FlavorCategory, Double>,
    val prefersWashed: Boolean,
    val favouriteCountry: String?,
    val ratedBeans: Int,
)

object Palate {
    /** Ratings above this pull the profile towards a bean's notes. */
    private const val NEUTRAL_RATING = 2.5

    fun profile(beans: List<Bean>): PalateProfile {
        val rated = beans.filter { it.rating != null }
        val raw = FlavorCategory.entries.associateWith { 0.0 }.toMutableMap()
        rated.forEach { bean ->
            val weight = (bean.rating!! - NEUTRAL_RATING).coerceAtLeast(0.0)
            bean.tastingNotes.forEach { note ->
                FlavorCategory.entries.filter { it.matches(note) }.forEach { raw[it] = raw.getValue(it) + weight }
            }
        }
        val max = raw.values.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val washed = rated.filter { it.process == Process.WASHED }.map { it.rating!! }
        val other = rated.filter { it.process != Process.WASHED }.map { it.rating!! }
        val favourite = rated.groupBy { it.country }
            .mapValues { (_, list) -> list.map { it.rating!! }.average() }
            .maxByOrNull { it.value }?.key
        return PalateProfile(
            scores = raw.mapValues { it.value / max },
            prefersWashed = (washed.averageOrZero()) >= (other.averageOrZero()),
            favouriteCountry = favourite,
            ratedBeans = rated.size,
        )
    }

    private fun List<Double>.averageOrZero() = if (isEmpty()) 0.0 else average()
}

// ---------------------------------------------------------------------------
// Map projections (match the bundled world and Europe map artwork)
// ---------------------------------------------------------------------------

data class MapPoint(val x: Double, val y: Double)

/**
 * The bundled map vectors were projected with d3-geo. These parameters place a
 * lat/lon on the same canvas so pins line up with the artwork on every platform.
 */
object MapProjection {
    private const val RAD = PI / 180.0

    /** Equirectangular world map (coffee belt view). */
    fun world(lat: Double, lon: Double): MapPoint =
        MapPoint(245.1428571 + 127.6877372 * lon * RAD, 152.2285714 - 127.6877372 * lat * RAD)

    /** Mercator map of central Europe (where beans were bought). */
    fun europe(lat: Double, lon: Double): MapPoint =
        MapPoint(-9.2823368 + 1114.7157833 * lon * RAD, 1338.5044652 - 1114.7157833 * ln(tan(PI / 4 + lat * RAD / 2)))
}
