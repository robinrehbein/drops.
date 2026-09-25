package de.birneklub.drop.core.importer

import de.birneklub.drop.core.backup.BackupException
import de.birneklub.drop.core.backup.DropsBackup
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.BeanStatus
import de.birneklub.drop.core.catalog.Countries
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Purchase
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.core.model.Taste
import de.birneklub.drop.core.sync.DropsJson
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlin.math.roundToInt

/**
 * Reads the main `Beanconqueror.json` from a Beanconqueror export (the ZIP is
 * unpacked by the platform; chunk files `Beanconqueror_Beans_1.json` etc. are
 * passed in [extraBeans] and [extraBrews]). Only espresso brews become shots.
 *
 * IDs are derived from Beanconqueror's UUIDs and timestamps from its own, so
 * importing the same file twice changes nothing.
 */
object BeanconquerorImport {
    private const val ID_PREFIX = "bc-"

    fun parse(
        mainJson: String,
        extraBeans: List<String> = emptyList(),
        extraBrews: List<String> = emptyList(),
        exportedAt: Instant,
        zone: TimeZone = TimeZone.currentSystemDefault(),
    ): DropsBackup {
        val root = runCatching { DropsJson.parseToJsonElement(mainJson).jsonObject }.getOrNull()
            ?: throw BackupException("Die Datei ist kein Beanconqueror-Export.")
        if ("BEANS" !in root && "BREWS" !in root) throw BackupException("Die Datei ist kein Beanconqueror-Export.")

        fun array(key: String, extra: List<String>): List<JsonObject> =
            (root[key] as? JsonArray).orEmpty().mapNotNull { it as? JsonObject } +
                extra.flatMap { chunk -> (runCatching { DropsJson.parseToJsonElement(chunk) }.getOrNull() as? JsonArray).orEmpty().mapNotNull { it as? JsonObject } }

        val espressoPreparations = array("PREPARATION", emptyList())
            .filter { it.str("style_type") == "ESPRESSO" }
            .mapNotNull { it.uuid() }
            .toSet()

        val beanObjects = array("BEANS", extraBeans)
        val brews = array("BREWS", extraBrews).filter { it.str("method_of_preparation") in espressoPreparations }

        val shots = brews.mapNotNull { b -> shot(b, exportedAt) }
        val usedGrams = shots.groupBy { it.beanId }.mapValues { (_, s) -> s.sumOf { it.doseGrams } }
        val beans = beanObjects.mapNotNull { bean(it, usedGrams, exportedAt, zone) }
        val beanIds = beans.map { it.id }.toSet()

        return DropsBackup(exportedAt = exportedAt, beans = beans, shots = shots.filter { it.beanId in beanIds })
    }

    private fun bean(o: JsonObject, usedGrams: Map<String, Double>, fallback: Instant, zone: TimeZone): Bean? {
        val uuid = o.uuid() ?: return null
        val id = ID_PREFIX + uuid
        val info = (o["bean_information"] as? JsonArray)?.firstOrNull() as? JsonObject
        val country = info?.str("country").orEmpty()
        val known = Countries.lookup(country)
        val weight = o.num("weight")?.roundToInt()?.takeIf { it > 0 } ?: 250
        val frozen = o.str("frozenDate").isNotBlank() && o.str("unfrozenDate").isBlank()
        val finished = o.bool("finished") == true
        val rating = o.num("rating")?.takeIf { it > 0 }?.coerceAtMost(5.0)
        return Bean(
            id = id,
            name = o.str("name").ifBlank { "Ohne Namen" },
            roaster = o.str("roaster"),
            country = known?.first ?: country,
            region = info?.str("region").orEmpty(),
            origin = known?.second,
            process = process(info?.str("processing").orEmpty()),
            variety = info?.str("variety").orEmpty(),
            altitude = info?.str("elevation").orEmpty(),
            roastDate = date(o.str("roastingDate"), zone),
            weightGrams = weight,
            remainingGrams = (weight - (usedGrams[id] ?: 0.0)).coerceAtLeast(0.0),
            tastingNotes = o.str("aromatics").split(',').map { it.trim() }.filter { it.isNotEmpty() },
            status = when { finished -> BeanStatus.ARCHIVED; frozen -> BeanStatus.FROZEN; else -> BeanStatus.OPEN },
            rating = rating,
            purchase = Purchase(
                shopName = o.str("roaster").ifBlank { "Rösterei" },
                city = "",
                priceCents = o.num("cost")?.takeIf { it > 0 }?.let { (it * 100).roundToInt() },
                purchasedOn = date(o.str("buyDate"), zone),
                url = o.str("url").takeIf { it.startsWith("http") },
            ),
            updatedAt = o.timestamp() ?: fallback,
        )
    }

    private fun shot(o: JsonObject, fallback: Instant): Shot? {
        val uuid = o.uuid() ?: return null
        val beanUuid = o.str("bean").ifBlank { return null }
        val pulledAt = o.timestamp() ?: fallback
        val seconds = (o.num("brew_time") ?: 0.0) + (o.num("brew_time_milliseconds") ?: 0.0) / 1000.0
        val yieldGrams = o.num("brew_beverage_quantity")?.takeIf { it > 0 } ?: o.num("brew_quantity") ?: 0.0
        return Shot(
            id = ID_PREFIX + uuid,
            beanId = ID_PREFIX + beanUuid,
            pulledAt = pulledAt,
            // Beanconqueror stores the grind setting as free text ("2,5", "12 clicks").
            grindSetting = Regex("""\d+([.,]\d+)?""").find(o.str("grind_size"))?.value?.replace(',', '.')?.toDoubleOrNull() ?: 0.0,
            doseGrams = o.num("grind_weight") ?: o.num("bean_weight_in") ?: 0.0,
            yieldGrams = yieldGrams,
            timeSec = seconds,
            temperatureC = o.num("brew_temperature")?.roundToInt()?.takeIf { it > 0 } ?: 93,
            // Beanconqueror rates shots but does not record sour/bitter.
            taste = Taste.BALANCED,
            updatedAt = pulledAt,
        )
    }

    private fun process(s: String): Process {
        val p = s.lowercase()
        return when {
            "anaer" in p -> Process.ANAEROBIC
            "natur" in p -> Process.NATURAL
            "honey" in p -> Process.HONEY
            "wash" in p || "gewaschen" in p -> Process.WASHED
            p.isBlank() -> Process.WASHED
            else -> Process.OTHER
        }
    }

    /** Beanconqueror stores dates as ISO timestamps of local midnight. */
    private fun date(s: String, zone: TimeZone): LocalDate? {
        if (s.isBlank()) return null
        return runCatching { Instant.parse(s).toLocalDateTime(zone).date }.getOrNull()
            ?: runCatching { LocalDate.parse(s.take(10)) }.getOrNull()
    }

    private fun JsonObject.str(key: String): String = (this[key] as? JsonPrimitive)?.contentOrNull.orEmpty()
    private fun JsonObject.num(key: String): Double? = (this[key] as? JsonPrimitive)?.let { it.doubleOrNull ?: it.contentOrNull?.replace(',', '.')?.toDoubleOrNull() }
    private fun JsonObject.bool(key: String): Boolean? = (this[key] as? JsonPrimitive)?.booleanOrNull
    private fun JsonObject.config(): JsonObject? = this["config"] as? JsonObject
    private fun JsonObject.uuid(): String? = config()?.str("uuid")?.ifBlank { null }
    private fun JsonObject.timestamp(): Instant? = config()?.num("unix_timestamp")?.takeIf { it > 0 }?.let { Instant.fromEpochSeconds(it.toLong()) }
}
