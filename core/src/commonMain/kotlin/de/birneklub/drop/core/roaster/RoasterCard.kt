package de.birneklub.drop.core.roaster

import de.birneklub.drop.core.catalog.Countries
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Purchase
import de.birneklub.drop.core.model.PurchaseChannel
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.sync.DropsJson
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * A roaster's starting recipe for one coffee, printed as a QR code on a card
 * that goes into the bag. The whole card travels inside the link, so no server
 * lookup (and no tracking) is needed to open it.
 */
@Serializable
data class RoasterCard(
    val roaster: String,
    val coffee: String,
    val country: String = "",
    val region: String = "",
    val process: Process = Process.WASHED,
    val notes: List<String> = emptyList(),
    val doseGrams: Double,
    val yieldGrams: Double,
    val timeMinSec: Int,
    val timeMaxSec: Int,
    val temperatureC: Int,
    val hint: String = "",
    /** Shop page for reordering. */
    val url: String? = null,
) {
    fun validate(): RoasterCard {
        require(roaster.isNotBlank() && roaster.length <= 60) { "Röstereiname fehlt oder ist zu lang" }
        require(coffee.isNotBlank() && coffee.length <= 80) { "Kaffeename fehlt oder ist zu lang" }
        require(doseGrams in 5.0..30.0 && yieldGrams in 10.0..120.0) { "Dosis oder Ertrag unplausibel" }
        require(timeMinSec in 5..90 && timeMaxSec in timeMinSec..120) { "Zeitfenster unplausibel" }
        require(temperatureC in 80..100) { "Temperatur unplausibel" }
        require(url == null || url.startsWith("https://")) { "Shop-Link muss mit https:// beginnen" }
        require(notes.size <= 6 && hint.length <= 200 && country.length <= 40 && region.length <= 60) { "Zu viel Text" }
        return this
    }

    /** The bean and its starting recipe as they land in the app. */
    fun toBeanAndRecipe(beanId: String, recipeId: String, now: Instant): Pair<Bean, Recipe> {
        val known = Countries.lookup(country)
        val bean = Bean(
            id = beanId, name = coffee, roaster = roaster, country = known?.first ?: country, region = region,
            origin = known?.second, process = process, tastingNotes = notes,
            purchase = Purchase(roaster, "", channel = PurchaseChannel.ONLINE, url = url),
            updatedAt = now,
        )
        val recipe = Recipe(
            id = recipeId, beanId = beanId, name = "Start von $roaster", grindSetting = 0.0,
            doseGrams = doseGrams, yieldGrams = yieldGrams, targetTimeMinSec = timeMinSec, targetTimeMaxSec = timeMaxSec,
            temperatureC = temperatureC, equipmentNotes = hint, source = Recipe.SOURCE_ROASTER, updatedAt = now,
        )
        return bean to recipe
    }

    @OptIn(ExperimentalEncodingApi::class)
    fun encode(): String = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT).encode(DropsJson.encodeToString(serializer(), this).encodeToByteArray())

    companion object {
        /** Path on the drops. server that shows the card and opens the app. */
        const val PATH = "/r/"

        @OptIn(ExperimentalEncodingApi::class)
        fun decode(payload: String): RoasterCard? = runCatching {
            if (payload.length > 2_000) return null
            val json = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT_OPTIONAL).decode(payload).decodeToString()
            DropsJson.decodeFromString(serializer(), json).validate()
        }.getOrNull()

        /** Extracts the card from a full link like https://host/r/<payload>. */
        fun fromLink(link: String): RoasterCard? = link.substringAfter(PATH, "").substringBefore('?').substringBefore('#').takeIf { it.isNotEmpty() }?.let(::decode)
    }
}
