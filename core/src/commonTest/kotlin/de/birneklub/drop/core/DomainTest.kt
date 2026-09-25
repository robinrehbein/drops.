package de.birneklub.drop.core

import de.birneklub.drop.core.domain.DialIn
import de.birneklub.drop.core.domain.FlavorCategory
import de.birneklub.drop.core.domain.FreshnessPhase
import de.birneklub.drop.core.domain.Maintenance
import de.birneklub.drop.core.domain.MapProjection
import de.birneklub.drop.core.domain.Palate
import de.birneklub.drop.core.domain.RoastFreshness
import de.birneklub.drop.core.domain.TaskState
import de.birneklub.drop.core.model.Bean
import de.birneklub.drop.core.model.Equipment
import de.birneklub.drop.core.model.EquipmentKind
import de.birneklub.drop.core.model.IntervalUnit
import de.birneklub.drop.core.model.MaintenanceTask
import de.birneklub.drop.core.model.Process
import de.birneklub.drop.core.model.Recipe
import de.birneklub.drop.core.model.Taste
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.SyncRecord
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.serialization.json.encodeToJsonElement
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.days

class DomainTest {
    private val now = Instant.parse("2026-09-25T08:00:00Z")

    @Test
    fun freshnessPhases() {
        val today = LocalDate(2026, 9, 25)
        assertEquals(FreshnessPhase.RESTING, RoastFreshness.evaluate(LocalDate(2026, 9, 22), today).phase)
        val peak = RoastFreshness.evaluate(LocalDate(2026, 9, 11), today)
        assertEquals(14, peak.daysSinceRoast)
        assertEquals(FreshnessPhase.PEAK, peak.phase)
        assertEquals(FreshnessPhase.FADING, RoastFreshness.evaluate(LocalDate(2026, 8, 1), today).phase)
    }

    @Test
    fun maintenanceByDaysAndKilograms() {
        val grinder = Equipment("g", EquipmentKind.GRINDER, "Mühle", groundKg = 21.6, updatedAt = now)
        val backflush = MaintenanceTask("t1", "m", "Rückspülen", intervalValue = 14.0, intervalUnit = IntervalUnit.DAYS, lastDoneAt = now - 16.days, updatedAt = now)
        val filter = MaintenanceTask("t2", "m", "Filter", intervalValue = 60.0, intervalUnit = IntervalUnit.DAYS, lastDoneAt = now - 54.days, updatedAt = now)
        val clean = MaintenanceTask("t3", "g", "Mühle reinigen", intervalValue = 3.0, intervalUnit = IntervalUnit.KILOGRAMS, lastDoneCounter = 20.0, updatedAt = now)

        val plan = Maintenance.plan(listOf(clean, filter, backflush), listOf(grinder), now)
        assertEquals(listOf("t1", "t2", "t3"), plan.map { it.task.id })
        assertEquals(TaskState.OVERDUE, plan[0].state)
        assertEquals(TaskState.SOON, plan[1].state)
        assertEquals(TaskState.OK, plan[2].state)
        assertTrue(abs(plan[2].used - 1.6) < 1e-9)

        val done = Maintenance.markDone(clean, grinder, now)
        assertEquals(TaskState.OK, Maintenance.status(done, grinder, now).state)
        assertEquals(21.6, done.lastDoneCounter)
    }

    @Test
    fun dialInAdvice() {
        val recipe = Recipe("r", "b", "Espresso", 14.5, doseGrams = 18.0, yieldGrams = 38.0, targetTimeMinSec = 27, targetTimeMaxSec = 29, temperatureC = 93, updatedAt = now)
        val sour = DialIn.advise(Taste.SOUR, 22.0, recipe)
        assertEquals(-1.0, sour.grindDelta)
        assertTrue(sour.ranFast)
        assertTrue(DialIn.advise(Taste.BALANCED, 28.0, recipe).adoptAsRecipe)
        assertFalse(DialIn.advise(Taste.BALANCED, 33.0, recipe).adoptAsRecipe)
        assertEquals(0.5, DialIn.advise(Taste.SLIGHTLY_BITTER, 28.0, recipe).grindDelta)
        assertEquals(38.0 / 18.0, recipe.ratio)
    }

    @Test
    fun palateFavoursHighlyRatedNotes() {
        val a = Bean("a", "Guji", "R", "Äthiopien", process = Process.WASHED, tastingNotes = listOf("Jasmin", "Pfirsich"), rating = 4.5, updatedAt = now)
        val b = Bean("b", "Cerrado", "R", "Brasilien", process = Process.NATURAL, tastingNotes = listOf("Kakao"), rating = 3.0, updatedAt = now)
        val profile = Palate.profile(listOf(a, b, a.copy(id = "c", rating = null)))
        assertEquals(1.0, profile.scores[FlavorCategory.FLORAL])
        assertTrue(profile.scores.getValue(FlavorCategory.CHOCOLATE) < 0.5)
        assertTrue(profile.prefersWashed)
        assertEquals("Äthiopien", profile.favouriteCountry)
        assertEquals(2, profile.ratedBeans)
    }

    @Test
    fun projectionsMatchArtwork() {
        val ethiopia = MapProjection.world(5.95, 38.95)
        assertTrue(abs(ethiopia.x - 331.9) < 0.1 && abs(ethiopia.y - 139.0) < 0.1)
        val hamburg = MapProjection.europe(53.55, 9.99)
        assertTrue(abs(hamburg.x - 185.1) < 0.1 && abs(hamburg.y - 100.2) < 0.1)
    }

    @Test
    fun recordsRoundTrip() {
        val bean = Bean("a", "Guji", "R", "Äthiopien", roastDate = LocalDate(2026, 9, 11), updatedAt = now)
        val record = SyncRecord("beans", bean.id, now.toEpochMilliseconds(), data = DropsJson.encodeToJsonElement(bean))
        val decoded = DropsJson.decodeFromString(SyncRecord.serializer(), DropsJson.encodeToString(SyncRecord.serializer(), record))
        assertEquals(bean, DropsJson.decodeFromJsonElement(Bean.serializer(), decoded.data!!))
    }

    @Test
    fun dialInAdviceFollowsTheGrinderStep() {
        assertEquals(-2.0, DialIn.advise(Taste.SOUR, 28.0, null, step = 1.0).grindDelta)
        assertEquals(1.0, DialIn.advise(Taste.BALANCED, 40.0, null, step = 1.0).grindDelta, "a stepped dial never gets half a click")
        assertEquals(0.25, DialIn.advise(Taste.BALANCED, 40.0, null, step = 0.5).grindDelta)
    }

    @Test
    fun catalogCarePlansMatchTheMachine() {
        val now = kotlinx.datetime.Instant.parse("2026-09-25T08:00:00Z")
        var n = 0
        val id = { "t${n++}" }
        val sage = de.birneklub.drop.core.catalog.EquipmentCatalog.machine("sage-barista-pro")!!
        val sageTasks = de.birneklub.drop.core.catalog.EquipmentCatalog.tasksFor(sage, "m", now, id)
        assertTrue(sageTasks.any { it.intervalUnit == de.birneklub.drop.core.model.IntervalUnit.SHOTS && it.intervalValue == 200.0 })
        assertTrue(sageTasks.any { it.name == "Wasserfilter wechseln" })

        val bambino = de.birneklub.drop.core.catalog.EquipmentCatalog.machine("sage-bambino-plus")!!
        assertFalse(de.birneklub.drop.core.catalog.EquipmentCatalog.tasksFor(bambino, "m", now, id).any { it.name.startsWith("Rückspülen") }, "no three-way valve, no backflush")

        val e61 = de.birneklub.drop.core.catalog.EquipmentCatalog.machine("rocket-appartamento")!!
        val e61Tasks = de.birneklub.drop.core.catalog.EquipmentCatalog.tasksFor(e61, "m", now, id)
        assertFalse(e61Tasks.any { it.name == "Entkalken" })
        // A new plan starts fresh instead of overdue.
        assertTrue(Maintenance.plan(e61Tasks, emptyList(), now).all { it.state == TaskState.OK })
        assertEquals(e61Tasks.size, e61Tasks.map { it.id }.toSet().size)
    }

    @Test
    fun catalogIdsAreUniqueAndSearchable() {
        val c = de.birneklub.drop.core.catalog.EquipmentCatalog
        assertEquals(c.machines.size, c.machines.map { it.id }.toSet().size)
        assertEquals(c.grinders.size, c.grinders.map { it.id }.toSet().size)
        assertEquals(listOf("rancilio-silvia"), c.search(c.machines, "silvia") { it.displayName }.map { it.id })
        assertEquals(listOf("niche-zero"), c.search(c.grinders, "niche ZERO") { it.displayName }.map { it.id })
        c.grinders.forEach { g -> assertTrue(g.scale.espressoStart in g.scale.min..g.scale.max, g.id) }
        c.grinders.mapNotNull { it.builtInto }.forEach { assertNotNull(c.machine(it)) }
    }

    @Test
    fun remindersFireOncePerCycle() {
        val now = kotlinx.datetime.Instant.parse("2026-09-25T08:00:00Z")
        val task = MaintenanceTask("t", "m", "Wasserfilter wechseln", intervalValue = 60.0, intervalUnit = IntervalUnit.DAYS,
            lastDoneAt = now - kotlin.time.Duration.parse("61d"), supply = "Wasserfilter", updatedAt = now)
        val low = Bean("b", "Guji", "Röster", "Äthiopien", weightGrams = 250, remainingGrams = 40.0, updatedAt = now)
        val plenty = low.copy(id = "c", remainingGrams = 200.0)
        val noRebuy = low.copy(id = "d", wouldRebuy = false)
        val r = de.birneklub.drop.core.reminders.Reminders.due(listOf(task), emptyList(), listOf(low, plenty, noRebuy), emptyList(), now)
        assertEquals(listOf("t", "b"), r.map { it.targetId })
        assertEquals("Guji: noch 2 Shots", r[1].title)

        val done = Maintenance.markDone(task, null, now)
        val after = de.birneklub.drop.core.reminders.Reminders.due(listOf(done), emptyList(), emptyList(), emptyList(), now + kotlin.time.Duration.parse("61d"))
        assertTrue(after.single().key != r[0].key, "the next cycle gets a new key")
    }

    @Test
    fun reorderLinksPreferTheSavedShop() {
        val now = kotlinx.datetime.Instant.parse("2026-09-25T08:00:00Z")
        val bean = Bean("b", "Guji Hambela", "Nordbahnhof", "Äthiopien", updatedAt = now)
        assertEquals(
            de.birneklub.drop.core.reminders.OutboundLink("https://www.google.com/search?tbm=shop&q=Nordbahnhof+Guji+Hambela+Kaffee", sponsored = false),
            de.birneklub.drop.core.reminders.Links.reorder(bean),
        )
        val withShop = bean.copy(purchase = de.birneklub.drop.core.model.Purchase("Nordbahnhof", "Hamburg", url = "https://example.com/guji"))
        assertEquals("https://example.com/guji", de.birneklub.drop.core.reminders.Links.reorder(withShop).url)
        assertEquals("https://www.google.com/search?tbm=shop&q=Br%C3%BChgruppendichtung", de.birneklub.drop.core.reminders.Links.supply("Brühgruppendichtung").url)

        // Partner templates make the link sponsored; a saved shop page stays a plain link.
        val partner = de.birneklub.drop.core.reminders.LinkConfig(
            reorderTemplate = "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued=https%3A%2F%2Fshop.example%2Fsearch%3Fq%3D{qq}",
            supplyTemplate = "https://www.amazon.de/s?k={q}&tag=drops-21",
        )
        val sponsored = de.birneklub.drop.core.reminders.Links.reorder(bean, partner)
        assertTrue(sponsored.sponsored)
        assertEquals("https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&ued=https%3A%2F%2Fshop.example%2Fsearch%3Fq%3DNordbahnhof%2BGuji%2BHambela%2BKaffee", sponsored.url)
        assertEquals("https://www.amazon.de/s?k=Entkalker&tag=drops-21", de.birneklub.drop.core.reminders.Links.supply("Entkalker", partner).url)
        assertFalse(de.birneklub.drop.core.reminders.Links.reorder(withShop, partner).sponsored)
    }

    @Test
    fun importsABeanconquerorExport() {
        val json = """
            {"VERSION":[],"SETTINGS":[{}],
             "PREPARATION":[{"name":"Silvia","style_type":"ESPRESSO","config":{"uuid":"p1","unix_timestamp":1700000000}},
                            {"name":"V60","style_type":"POUR OVER","config":{"uuid":"p2","unix_timestamp":1700000000}}],
             "BEANS":[{"name":"Guji","roaster":"Nordbahnhof","weight":250,"cost":16.5,"finished":false,"aromatics":"Pfirsich, Jasmin",
                       "roastingDate":"2026-09-01T22:00:00.000Z","url":"https://example.com/guji","rating":4,
                       "bean_information":[{"country":"Ethiopia","region":"Guji","processing":"Natural","variety":"Heirloom","elevation":"2000"}],
                       "config":{"uuid":"b1","unix_timestamp":1758000000}}],
             "BREWS":[{"bean":"b1","method_of_preparation":"p1","grind_size":"2,5","grind_weight":18,"brew_beverage_quantity":38,
                       "brew_time":28,"brew_time_milliseconds":400,"brew_temperature":93,"config":{"uuid":"s1","unix_timestamp":1758100000}},
                      {"bean":"b1","method_of_preparation":"p2","grind_size":"20","grind_weight":15,"config":{"uuid":"s2","unix_timestamp":1758100000}}]}
        """.trimIndent()
        val now = kotlinx.datetime.Instant.parse("2026-09-25T08:00:00Z")
        val b = de.birneklub.drop.core.importer.BeanconquerorImport.parse(json, exportedAt = now, zone = kotlinx.datetime.TimeZone.of("Europe/Berlin"))
        val bean = b.beans.single()
        assertEquals("bc-b1", bean.id)
        assertEquals("Äthiopien", bean.country)
        assertNotNull(bean.origin)
        assertEquals(Process.NATURAL, bean.process)
        assertEquals(kotlinx.datetime.LocalDate(2026, 9, 2), bean.roastDate, "local midnight in Germany")
        assertEquals(232.0, bean.remainingGrams)
        assertEquals(1650, bean.purchase?.priceCents)
        assertEquals(listOf("Pfirsich", "Jasmin"), bean.tastingNotes)
        val shot = b.shots.single()
        assertEquals(2.5, shot.grindSetting)
        assertEquals(28.4, shot.timeSec)
        assertEquals(38.0, shot.yieldGrams)
        assertFailsWithMessage { de.birneklub.drop.core.importer.BeanconquerorImport.parse("{\"x\":1}", exportedAt = now) }
    }

    private fun assertFailsWithMessage(block: () -> Unit) {
        val e = runCatching(block).exceptionOrNull()
        assertTrue(e is de.birneklub.drop.core.backup.BackupException)
    }

    @Test
    fun roasterCardsTravelInsideTheLink() {
        val card = de.birneklub.drop.core.roaster.RoasterCard(
            roaster = "Nordbahnhof", coffee = "Guji Hambela", country = "Ethiopia", process = Process.NATURAL,
            notes = listOf("Pfirsich", "Jasmin"), doseGrams = 18.0, yieldGrams = 40.0, timeMinSec = 26, timeMaxSec = 30,
            temperatureC = 94, hint = "Eher fein starten", url = "https://example.com/guji",
        ).validate()
        val link = "https://sync.example.com" + de.birneklub.drop.core.roaster.RoasterCard.PATH + card.encode()
        assertTrue(link.length < 600, "fits a QR code comfortably")
        assertEquals(card, de.birneklub.drop.core.roaster.RoasterCard.fromLink(link))
        assertNull(de.birneklub.drop.core.roaster.RoasterCard.fromLink("https://sync.example.com/r/kaputt"))

        val now = kotlinx.datetime.Instant.parse("2026-09-25T08:00:00Z")
        val (bean, recipe) = card.toBeanAndRecipe("b", "r", now)
        assertEquals("Äthiopien", bean.country)
        assertEquals("https://example.com/guji", bean.purchase?.url)
        assertEquals(Recipe.SOURCE_ROASTER, recipe.source)
        assertFailsWithMessage2 { card.copy(temperatureC = 120).validate() }
    }

    private fun assertFailsWithMessage2(block: () -> Unit) = assertTrue(runCatching(block).isFailure)
}
