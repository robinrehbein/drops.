package de.birneklub.drop.core.model

import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.serialization.Serializable

/**
 * Every synced entity has a stable client-generated [id] and an [updatedAt]
 * timestamp. Sync resolves conflicts with last-write-wins on [updatedAt].
 */
sealed interface Entity {
    val id: String
    val updatedAt: Instant
}

@Serializable
data class GeoPoint(val lat: Double, val lon: Double)

@Serializable
enum class BeanStatus { OPEN, FROZEN, ARCHIVED }

@Serializable
enum class Process { WASHED, NATURAL, HONEY, ANAEROBIC, OTHER }

@Serializable
enum class PurchaseChannel { IN_STORE, ONLINE, TRAVEL }

@Serializable
data class Purchase(
    val shopName: String,
    val city: String,
    val location: GeoPoint? = null,
    val channel: PurchaseChannel = PurchaseChannel.IN_STORE,
    val priceCents: Int? = null,
    val purchasedOn: LocalDate? = null,
)

@Serializable
data class Bean(
    override val id: String,
    val name: String,
    val roaster: String,
    val country: String,
    val region: String = "",
    val origin: GeoPoint? = null,
    val process: Process = Process.WASHED,
    val variety: String = "",
    val altitude: String = "",
    val roastLevel: String = "",
    val roastDate: LocalDate? = null,
    val weightGrams: Int = 250,
    val remainingGrams: Double = weightGrams.toDouble(),
    val frozenDoses: Int = 0,
    val tastingNotes: List<String> = emptyList(),
    val status: BeanStatus = BeanStatus.OPEN,
    val rating: Double? = null,
    val wouldRebuy: Boolean? = null,
    val purchase: Purchase? = null,
    val inHopper: Boolean = false,
    override val updatedAt: Instant,
) : Entity

@Serializable
data class Recipe(
    override val id: String,
    val beanId: String,
    val name: String,
    val grindSetting: Double,
    val rpm: Int? = null,
    val doseGrams: Double,
    val yieldGrams: Double,
    val targetTimeMinSec: Int,
    val targetTimeMaxSec: Int,
    val temperatureC: Int,
    val preinfusion: String = "",
    val equipmentNotes: String = "",
    override val updatedAt: Instant,
) : Entity {
    val ratio: Double get() = if (doseGrams > 0) yieldGrams / doseGrams else 0.0
}

@Serializable
enum class Taste { SOUR, SLIGHTLY_SOUR, BALANCED, SLIGHTLY_BITTER, BITTER }

@Serializable
data class Shot(
    override val id: String,
    val beanId: String,
    val recipeId: String? = null,
    val pulledAt: Instant,
    val grindSetting: Double,
    val doseGrams: Double,
    val yieldGrams: Double,
    val timeSec: Double,
    val temperatureC: Int,
    val taste: Taste,
    override val updatedAt: Instant,
) : Entity

@Serializable
enum class EquipmentKind { MACHINE, GRINDER }

@Serializable
data class Equipment(
    override val id: String,
    val kind: EquipmentKind,
    val name: String,
    val details: String = "",
    val shotCount: Int = 0,
    val groundKg: Double = 0.0,
    /** Tap water hardness in °dH, and after the filter (machines only). */
    val waterHardness: Double? = null,
    val filteredHardness: Double? = null,
    override val updatedAt: Instant,
) : Entity

@Serializable
enum class IntervalUnit { DAYS, KILOGRAMS, SHOTS }

@Serializable
data class MaintenanceTask(
    override val id: String,
    val equipmentId: String,
    val name: String,
    val description: String = "",
    val intervalValue: Double,
    val intervalUnit: IntervalUnit,
    /** Set for [IntervalUnit.DAYS]. */
    val lastDoneAt: Instant? = null,
    /** Equipment counter (kg or shots) at the time the task was last done. */
    val lastDoneCounter: Double = 0.0,
    override val updatedAt: Instant,
) : Entity
