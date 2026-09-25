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
}
