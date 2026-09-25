package de.birneklub.drop.data

import de.birneklub.drop.core.domain.Maintenance
import de.birneklub.drop.core.domain.TaskState
import de.birneklub.drop.core.model.Shot
import de.birneklub.drop.core.model.Taste
import de.birneklub.drop.core.sync.AuthResponse
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.SyncRecord
import de.birneklub.drop.core.sync.SyncRequest
import de.birneklub.drop.core.sync.SyncResponse
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DataTest {
    private val fixedNow = Instant.parse("2026-09-25T08:00:00Z")
    private val clock = object : Clock { override fun now() = fixedNow }

    private fun repo(db: de.birneklub.drop.data.db.DropsDatabase = createDatabase()) =
        DropsRepository(db, clock, Dispatchers.Unconfined)

    @Test
    fun seedsOnceAndCanRemoveSamples() = runTest {
        val db = createDatabase()
        val repo = repo(db)
        repo.seedIfEmpty()
        repo.seedIfEmpty()
        assertEquals(7, repo.beans.first().size)
        assertEquals(1, repo.beans.first().count { it.inHopper })
        repo.removeSampleData()
        assertTrue(repo.beans.first().isEmpty())
        assertEquals(2, repo.equipment.first().size, "equipment and care plan stay")
    }

    @Test
    fun loggingAShotUpdatesBagAndCounters() = runTest {
        val repo = repo()
        repo.seedIfEmpty()
        val before = repo.equipment.first().associateBy { it.kind }
        repo.logShot(Shot("s-new", "sample-guji", "sample-r-guji", fixedNow, 14.5, 18.0, 38.0, 28.0, 93, Taste.BALANCED, fixedNow))

        val bean = repo.beans.first().single { it.id == "sample-guji" }
        assertEquals(124.0, bean.remainingGrams)
        val after = repo.equipment.first().associateBy { it.kind }
        assertEquals(before.values.first { it.shotCount > 0 }.shotCount + 1, after.values.first { it.shotCount > 0 }.shotCount)
        assertTrue(after.values.any { it.groundKg > 21.61 })
    }

    @Test
    fun completingATaskResetsIt() = runTest {
        val repo = repo()
        repo.seedIfEmpty()
        val overdue = Maintenance.plan(repo.tasks.first(), repo.equipment.first(), fixedNow).first()
        assertEquals(TaskState.OVERDUE, overdue.state)
        repo.completeTask(overdue.task.id)
        val again = Maintenance.plan(repo.tasks.first(), repo.equipment.first(), fixedNow).single { it.task.id == overdue.task.id }
        assertEquals(TaskState.OK, again.state)
    }

    @Test
    fun putInHopperKeepsOneBagActive() = runTest {
        val repo = repo()
        repo.seedIfEmpty()
        repo.putInHopper("sample-cerrado")
        assertEquals(listOf("sample-cerrado"), repo.beans.first().filter { it.inHopper }.map { it.id })
    }

    @Test
    fun loginUploadsLocalDataAndAppliesRemoteChanges() = runTest {
        val db = createDatabase()
        val repo = repo(db)
        repo.seedIfEmpty()
        var pushed: SyncRequest? = null
        val engine = MockEngine { request ->
            val json = headersOf(HttpHeaders.ContentType, "application/json")
            when (request.url.encodedPath) {
                "/api/auth/login" -> respond(DropsJson.encodeToString(AuthResponse.serializer(), AuthResponse("tok", "u1", "a@b.de", "d1")), HttpStatusCode.OK, json)
                "/api/sync" -> {
                    assertEquals("Bearer tok", request.headers[HttpHeaders.Authorization])
                    pushed = DropsJson.decodeFromString(SyncRequest.serializer(), String(request.body.toByteArray()))
                    val remoteBean = pushed!!.changes.first { it.id == "sample-guji" }
                    val renamed = buildJsonObject {
                        remoteBean.data!!.let { it as kotlinx.serialization.json.JsonObject }.forEach { (k, v) -> put(k, if (k == "name") JsonPrimitive("Vom Tablet") else v) }
                    }
                    val response = SyncResponse(
                        serverTime = 42,
                        changes = listOf(
                            SyncRecord("beans", "sample-guji", remoteBean.updatedAt + 1, data = renamed),
                            SyncRecord("beans", "sample-tarrazu", remoteBean.updatedAt + 1, deleted = true),
                        ),
                    )
                    respond(DropsJson.encodeToString(SyncResponse.serializer(), response), HttpStatusCode.OK, json)
                }
                else -> respond("", HttpStatusCode.NotFound)
            }
        }
        val sync = SyncClient(db, engine, "Pixel", "android", Dispatchers.Unconfined)
        assertNull(sync.session.value)
        sync.login("https://sync.example.com/", "a@b.de", "sehrgeheim")
        assertEquals("https://sync.example.com", sync.session.value?.serverUrl)

        val summary = sync.sync()
        assertEquals(pushed!!.changes.size, summary.pushed)
        assertEquals(2, summary.pulled)
        assertEquals(0, sync.pendingChanges())
        val beans = repo.beans.first()
        assertEquals("Vom Tablet", beans.single { it.id == "sample-guji" }.name)
        assertNull(beans.firstOrNull { it.id == "sample-tarrazu" })
    }

    @Test
    fun expiredSessionSignsOut() = runTest {
        val db = createDatabase()
        val engine = MockEngine { request ->
            val json = headersOf(HttpHeaders.ContentType, "application/json")
            if (request.url.encodedPath == "/api/auth/login") {
                respond(DropsJson.encodeToString(AuthResponse.serializer(), AuthResponse("tok", "u1", "a@b.de", "d1")), HttpStatusCode.OK, json)
            } else {
                respond("""{"code":"unauthorized","message":"x"}""", HttpStatusCode.Unauthorized, json)
            }
        }
        val sync = SyncClient(db, engine, "Pixel", "android", Dispatchers.Unconfined)
        sync.login("https://sync.example.com", "a@b.de", "sehrgeheim")
        val e = assertFailsWith<SyncException> { sync.sync() }
        assertTrue(e.sessionExpired)
        assertNull(sync.session.value)
    }

    @Test
    fun rejectsPlainHttpServers() {
        assertFailsWith<SyncException> { SyncClient.normalizeServerUrl("http://sync.example.com") }
        assertNotNull(SyncClient.normalizeServerUrl("http://10.0.2.2:8080"))
    }

    @Test
    fun backupRoundTripsIntoAFreshInstall() = runTest {
        val source = repo()
        source.seedIfEmpty()
        val file = source.exportBackup().encode()

        val target = repo()
        val result = target.importBackup(de.birneklub.drop.core.backup.DropsBackup.decode(file))
        assertEquals(source.exportBackup().size, result.added)
        assertEquals(source.beans.first().map { it.id }.sorted(), target.beans.first().map { it.id }.sorted())
        target.seedIfEmpty()
        assertEquals(7, target.beans.first().size, "a restored install is not seeded again")
    }

    @Test
    fun importKeepsNewerLocalRecords() = runTest {
        val repo = repo()
        repo.seedIfEmpty()
        val old = repo.exportBackup()
        val bean = repo.beans.first().first()
        val later = object : Clock { override fun now() = fixedNow.plus(kotlin.time.Duration.parse("1h")) }
        DropsRepository(repo.db, later, Dispatchers.Unconfined).saveBean(bean.copy(name = "Neu"))

        val result = repo.importBackup(old)
        assertEquals(0, result.changed)
        assertEquals("Neu", repo.beans.first().single { it.id == bean.id }.name)
    }

    @Test
    fun rejectsForeignFiles() {
        assertFailsWith<de.birneklub.drop.core.backup.BackupException> { de.birneklub.drop.core.backup.DropsBackup.decode("{\"beans\":[]}") }
        assertFailsWith<de.birneklub.drop.core.backup.BackupException> { de.birneklub.drop.core.backup.DropsBackup.decode("hello") }
    }

    @Test
    fun freshInstallNeedsSetupAndReplacingEquipmentSwapsTheCarePlan() = runTest {
        val repo = repo()
        assertEquals(false, repo.isSetupDone())
        repo.seedIfEmpty()
        assertEquals(true, repo.isSetupDone())

        val catalog = de.birneklub.drop.core.catalog.EquipmentCatalog
        val model = catalog.machine("rancilio-silvia")!!
        val machine = catalog.equipmentFor(model, "m-new", fixedNow)
        repo.replaceEquipment(machine, catalog.tasksFor(model, machine.id, fixedNow, repo::newId))

        val machines = repo.equipment.first().filter { it.kind == de.birneklub.drop.core.model.EquipmentKind.MACHINE }
        assertEquals(listOf("m-new"), machines.map { it.id })
        val tasks = repo.tasks.first()
        val grinderId = repo.equipment.first().single { it.kind == de.birneklub.drop.core.model.EquipmentKind.GRINDER }.id
        assertTrue(tasks.all { it.equipmentId == "m-new" || it.equipmentId == grinderId }, "old machine tasks are gone")
        assertTrue(tasks.any { it.equipmentId == grinderId }, "grinder tasks stay")
    }

    @Test
    fun remindersAreHandedOutOnce() = runTest {
        val repo = repo()
        repo.seedIfEmpty()
        val first = repo.takeNewReminders()
        assertTrue(first.isNotEmpty(), "sample data has overdue care and a bag running low")
        assertTrue(repo.takeNewReminders().isEmpty())
    }

    @Test
    fun betaStatsCountOnlyAfterOptInAndClearOnOptOut() = runTest {
        val db = createDatabase()
        var uploaded: de.birneklub.drop.core.stats.StatsUpload? = null
        val engine = MockEngine { request ->
            uploaded = DropsJson.decodeFromString(de.birneklub.drop.core.stats.StatsUpload.serializer(), request.body.toByteArray().decodeToString())
            respond("", HttpStatusCode.NoContent)
        }
        val stats = BetaStats(db, engine, "android", "0.1.0", clock, kotlinx.datetime.TimeZone.UTC, Dispatchers.Unconfined)

        assertNull(stats.optedIn())
        stats.count("shot_logged")
        assertTrue(stats.pending().isEmpty(), "nothing is counted before opt-in")

        stats.setOptIn(true)
        stats.count("shot_logged")
        stats.count("shot_logged")
        stats.countDaily("app_open")
        stats.countDaily("app_open")
        assertTrue(stats.flush("https://drops.example.com"))
        val sent = assertNotNull(uploaded)
        assertEquals(mapOf("shot_logged" to 2, "app_open" to 1), sent.counts.associate { it.event to it.count })
        assertTrue(stats.pending().isEmpty())

        stats.count("task_done")
        stats.setOptIn(false)
        assertTrue(stats.pending().isEmpty())
        assertEquals(false, stats.flush("https://drops.example.com"))
    }
}
