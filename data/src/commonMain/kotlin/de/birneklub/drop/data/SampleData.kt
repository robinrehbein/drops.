package de.birneklub.drop.data

import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.BeanStatus
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.EquipmentKind
import de.birneklub.drop.core.model.GeoPoint
import de.birneklub.drop.core.model.IntervalUnit
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Purchase
import de.birneklub.drop.core.model.PurchaseChannel
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.core.model.Taste
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

/**
 * Example content for a fresh install. Roasters and shops are fictional.
 * IDs start with [PREFIX] so the user can remove them in one step.
 */
class SampleData(
    val beans: List<Bean>,
    val recipes: List<Recipe>,
    val shots: List<Shot>,
    val equipment: List<Equipment>,
    val tasks: List<MaintenanceTask>,
) {
    companion object {
        const val PREFIX = "sample-"

        fun create(now: Instant, zone: TimeZone = TimeZone.currentSystemDefault()): SampleData {
            val today = now.toLocalDateTime(zone).date
            fun daysAgo(d: Int): LocalDate = today.minus(DatePeriod(days = d))

            val hamburg = GeoPoint(53.55, 9.99)
            fun buy(shop: String, city: String, at: GeoPoint, channel: PurchaseChannel, cents: Int) =
                Purchase(shop, city, at, channel, cents)

            val beans = listOf(
                Bean(
                    "${PREFIX}guji", "Guji Hambela", "Hafenrösterei", "Äthiopien", "Guji · Hambela", GeoPoint(5.95, 38.95),
                    Process.WASHED, "74110 / 74112", "1.900–2.200 m", "Hell-mittel", daysAgo(14), 250, 142.0, 0,
                    listOf("Jasmin", "Bergamotte", "Weißer Pfirsich", "Honig"), BeanStatus.OPEN, 4.5, true,
                    buy("Hafenrösterei", "Hamburg", hamburg, PurchaseChannel.IN_STORE, 1650), inHopper = true, updatedAt = now,
                ),
                Bean(
                    "${PREFIX}cerrado", "Cerrado Mineiro", "Röstwerk Nord", "Brasilien", "Cerrado Mineiro", GeoPoint(-18.9, -46.9),
                    Process.NATURAL, "Yellow Catuaí", "1.000–1.200 m", "Mittel", daysAgo(31), 1000, 610.0, 0,
                    listOf("Haselnuss", "Milchschokolade", "Karamell"), BeanStatus.OPEN, 4.0, true,
                    buy("Röstwerk Nord", "Hamburg", GeoPoint(53.56, 9.96), PurchaseChannel.IN_STORE, 2990), updatedAt = now,
                ),
                Bean(
                    "${PREFIX}karogoto", "Karogoto AA", "Kontor Rösterei", "Kenia", "Nyeri", GeoPoint(-0.42, 36.95),
                    Process.WASHED, "SL28 / SL34", "1.700–1.850 m", "Hell", daysAgo(36), 250, 108.0, 6,
                    listOf("Cassis", "Tomate", "Rohrzucker"), BeanStatus.FROZEN, 4.5, true,
                    buy("Kontor Rösterei", "Leipzig", GeoPoint(51.34, 12.37), PurchaseChannel.ONLINE, 1890), updatedAt = now,
                ),
                Bean(
                    "${PREFIX}pitalito", "Pitalito Pink Bourbon", "Bohnenwerk", "Kolumbien", "Huila · Pitalito", GeoPoint(1.85, -76.05),
                    Process.WASHED, "Pink Bourbon", "1.600–1.800 m", "Hell", daysAgo(24), 250, 72.0, 4,
                    listOf("Rose", "Litschi", "Mandarine"), BeanStatus.FROZEN, 4.0, true,
                    buy("Bohnenwerk", "Berlin", GeoPoint(52.52, 13.40), PurchaseChannel.ONLINE, 2100), updatedAt = now,
                ),
                Bean(
                    "${PREFIX}huehue", "Huehuetenango", "Röstwerk Nord", "Guatemala", "Huehuetenango", GeoPoint(15.3, -91.5),
                    Process.WASHED, "Bourbon, Caturra", "1.600–1.900 m", "Mittel", daysAgo(115), 250, 0.0, 0,
                    listOf("Kakao", "Pflaume", "Brauner Zucker"), BeanStatus.ARCHIVED, 4.0, true,
                    buy("Röstwerk Nord", "Hamburg", GeoPoint(53.56, 9.96), PurchaseChannel.IN_STORE, 1500), updatedAt = now,
                ),
                Bean(
                    "${PREFIX}bensa", "Sidamo Bensa", "Nordlys Kaffe", "Äthiopien", "Sidama · Bensa", GeoPoint(6.5, 38.6),
                    Process.NATURAL, "74158", "2.000–2.300 m", "Hell", daysAgo(160), 250, 0.0, 0,
                    listOf("Erdbeere", "Blaubeere", "Hibiskus"), BeanStatus.ARCHIVED, 4.5, true,
                    buy("Nordlys Kaffe", "Kopenhagen", GeoPoint(55.68, 12.57), PurchaseChannel.TRAVEL, 1950), updatedAt = now,
                ),
                Bean(
                    "${PREFIX}tarrazu", "Tarrazú Honey", "Kaffeehaus Brennerei", "Costa Rica", "Tarrazú", GeoPoint(9.65, -84.02),
                    Process.HONEY, "Caturra", "1.500–1.800 m", "Mittel", daysAgo(138), 250, 0.0, 0,
                    listOf("Rosine", "Karamell", "Apfel"), BeanStatus.ARCHIVED, 3.5, false,
                    buy("Kaffeehaus Brennerei", "Wien", GeoPoint(48.21, 16.37), PurchaseChannel.TRAVEL, 1700), updatedAt = now,
                ),
            )

            val recipes = listOf(
                Recipe("${PREFIX}r-guji", "${PREFIX}guji", "Morgen-Espresso", 14.5, 1200, 18.0, 38.0, 27, 29, 93, "5 s · 3 bar", "Sieb 18 g Präzision · Puck-Screen · WDT", updatedAt = now),
                Recipe("${PREFIX}r-guji-cortado", "${PREFIX}guji", "Cortado", 14.0, 1200, 18.0, 32.0, 26, 28, 93, "5 s · 3 bar", "Sieb 18 g Präzision", updatedAt = now),
                Recipe("${PREFIX}r-cerrado", "${PREFIX}cerrado", "Milchgetränke", 16.0, 1000, 18.0, 36.0, 26, 30, 92, "3 s", "Sieb 18 g", updatedAt = now),
                Recipe("${PREFIX}r-karogoto", "${PREFIX}karogoto", "Espresso", 13.5, 1400, 17.5, 40.0, 26, 28, 94, "8 s · 2 bar", "Sieb 18 g Präzision", updatedAt = now),
                Recipe("${PREFIX}r-huehue", "${PREFIX}huehue", "Espresso", 15.0, 1100, 18.0, 37.0, 27, 29, 93, "4 s", "Sieb 18 g", updatedAt = now),
            )

            // Dial-in of the current bag: from sour and fast to balanced.
            val grinds = listOf(16.0, 15.75, 15.5, 15.25, 15.0, 14.75, 14.5, 14.5, 14.5)
            val times = listOf(21.0, 22.0, 23.0, 24.0, 25.0, 27.0, 28.0, 28.0, 27.6)
            val tastes = listOf(Taste.SOUR, Taste.SOUR, Taste.SOUR, Taste.SLIGHTLY_SOUR, Taste.SLIGHTLY_SOUR, Taste.BALANCED, Taste.BALANCED, Taste.BALANCED, Taste.BALANCED)
            val shots = grinds.indices.map { i ->
                Shot(
                    "${PREFIX}s$i", "${PREFIX}guji", "${PREFIX}r-guji", now - ((8 - i) * 20).hours - 1.hours,
                    grinds[i], 18.0, if (i < 2) 40.0 else 38.0, times[i], 93, tastes[i], now,
                )
            } + Shot("${PREFIX}s-cerrado", "${PREFIX}cerrado", "${PREFIX}r-cerrado", now - 2.days, 16.0, 18.0, 36.0, 28.0, 92, Taste.SLIGHTLY_BITTER, now)

            val machine = Equipment("${PREFIX}machine", EquipmentKind.MACHINE, "Siebträger", "Dualboiler · E61", shotCount = 1284, waterHardness = 14.0, filteredHardness = 6.0, updatedAt = now)
            val grinder = Equipment("${PREFIX}grinder", EquipmentKind.GRINDER, "Mühle", "Single-Dose · 64 mm Flat", groundKg = 21.6, updatedAt = now)

            val tasks = listOf(
                MaintenanceTask("${PREFIX}t-backflush", machine.id, "Rückspülen mit Reiniger", "Blindsieb, 5 × 10 s", 14.0, IntervalUnit.DAYS, now - 16.days, updatedAt = now),
                MaintenanceTask("${PREFIX}t-filter", machine.id, "Wasserfilter wechseln", "Alle 60 Tage oder 50 l", 60.0, IntervalUnit.DAYS, now - 54.days, updatedAt = now),
                MaintenanceTask("${PREFIX}t-grinder", grinder.id, "Mühle reinigen", "Pinsel, Blasebalg, Scheiben abbürsten", 3.0, IntervalUnit.KILOGRAMS, lastDoneCounter = 19.2, updatedAt = now),
                MaintenanceTask("${PREFIX}t-shower", machine.id, "Duschsieb abwischen", "", 7.0, IntervalUnit.DAYS, now - 3.days, updatedAt = now),
                MaintenanceTask("${PREFIX}t-descale", machine.id, "Entkalken", "Bei 6 °dH nach Filter", 180.0, IntervalUnit.DAYS, now - 71.days, updatedAt = now),
                MaintenanceTask("${PREFIX}t-gasket", machine.id, "Brühgruppendichtung tauschen", "", 365.0, IntervalUnit.DAYS, now - 250.days, updatedAt = now),
                MaintenanceTask("${PREFIX}t-burrs", grinder.id, "Mahlscheiben prüfen", "", 300.0, IntervalUnit.KILOGRAMS, lastDoneCounter = 0.0, updatedAt = now),
            )

            return SampleData(beans, recipes, shots, listOf(machine, grinder), tasks)
        }
    }
}
