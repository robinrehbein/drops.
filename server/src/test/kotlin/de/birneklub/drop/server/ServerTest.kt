package de.birneklub.drop.server

import de.birneklub.drop.core.sync.AuthResponse
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.LoginRequest
import de.birneklub.drop.core.sync.MeResponse
import de.birneklub.drop.core.sync.RegisterRequest
import de.birneklub.drop.core.sync.SyncRecord
import de.birneklub.drop.core.sync.SyncRequest
import de.birneklub.drop.core.sync.SyncResponse
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.datetime.minus
import kotlinx.datetime.todayIn
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServerTest {
    private val sentMails = mutableListOf<Pair<String, String>>()

    private fun withServer(config: ServerConfig = ServerConfig(authRateLimit = 100), block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) {
        val db = File.createTempFile("drops", ".db").apply { deleteOnExit() }
        val store = Store(db.absolutePath)
        testApplication {
            application { dropsModule(store, config) { to, _, text -> sentMails += to to text } }
            val client = createClient { install(ContentNegotiation) { json(DropsJson) } }
            block(client)
        }
        store.close()
    }

    private suspend fun HttpClient.register(email: String = "robin@example.com", device: String = "Pixel"): AuthResponse =
        post("/api/auth/register") {
            contentType(ContentType.Application.Json)
            setBody(RegisterRequest(email, "sehrgeheim", device, "android"))
        }.also { assertEquals(HttpStatusCode.Created, it.status) }.body()

    private fun bean(id: String, updatedAt: Long, name: String) = SyncRecord(
        "beans", id, updatedAt, data = buildJsonObject { put("id", JsonPrimitive(id)); put("name", JsonPrimitive(name)) },
    )

    @Test
    fun healthCheck() = withServer { client ->
        assertEquals(HttpStatusCode.OK, client.get("/healthz").status)
    }

    @Test
    fun registerLoginAndRejectBadCredentials() = withServer { client ->
        client.register()
        val dup = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json); setBody(RegisterRequest("Robin@Example.com", "sehrgeheim", "x", "ios"))
        }
        assertEquals(HttpStatusCode.Conflict, dup.status)

        val ok = client.post("/api/auth/login") {
            contentType(ContentType.Application.Json); setBody(LoginRequest("robin@example.com", "sehrgeheim", "iPhone", "ios"))
        }
        assertEquals(HttpStatusCode.OK, ok.status)

        val bad = client.post("/api/auth/login") {
            contentType(ContentType.Application.Json); setBody(LoginRequest("robin@example.com", "falsch123", "iPhone", "ios"))
        }
        assertEquals(HttpStatusCode.Unauthorized, bad.status)

        val weak = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json); setBody(RegisterRequest("neu@example.com", "kurz", "x", "ios"))
        }
        assertEquals(HttpStatusCode.BadRequest, weak.status)
    }

    @Test
    fun syncRequiresToken() = withServer { client ->
        val res = client.post("/api/sync") { contentType(ContentType.Application.Json); setBody(SyncRequest("d", 0, emptyList())) }
        assertEquals(HttpStatusCode.Unauthorized, res.status)
    }

    @Test
    fun syncBetweenTwoDevicesWithLastWriteWins() = withServer { client ->
        val phone = client.register()
        val tablet: AuthResponse = client.post("/api/auth/login") {
            contentType(ContentType.Application.Json); setBody(LoginRequest("robin@example.com", "sehrgeheim", "Tablet", "android"))
        }.body()

        val first: SyncResponse = client.post("/api/sync") {
            bearerAuth(phone.token); contentType(ContentType.Application.Json)
            setBody(SyncRequest(phone.deviceId, 0, listOf(bean("b1", 1000, "Guji"))))
        }.body()
        assertTrue(first.changes.isEmpty(), "own writes are not echoed back")

        val onTablet: SyncResponse = client.post("/api/sync") {
            bearerAuth(tablet.token); contentType(ContentType.Application.Json)
            setBody(SyncRequest(tablet.deviceId, 0, listOf(bean("b1", 500, "Veraltet"))))
        }.body()
        assertEquals(listOf("b1"), onTablet.changes.map { it.id })
        assertEquals("Guji", onTablet.changes.single().data!!.toString().substringAfter("\"name\":\"").substringBefore("\""))

        client.post("/api/sync") {
            bearerAuth(tablet.token); contentType(ContentType.Application.Json)
            setBody(SyncRequest(tablet.deviceId, onTablet.serverTime, listOf(SyncRecord("beans", "b1", 2000, deleted = true))))
        }
        val back: SyncResponse = client.post("/api/sync") {
            bearerAuth(phone.token); contentType(ContentType.Application.Json)
            setBody(SyncRequest(phone.deviceId, first.serverTime, emptyList()))
        }.body()
        assertTrue(back.changes.single().deleted)

        val me: MeResponse = client.get("/api/me") { bearerAuth(phone.token) }.body()
        assertEquals(2, me.devices.size)
    }

    @Test
    fun rejectsUnknownCollection() = withServer { client ->
        val auth = client.register()
        val res = client.post("/api/sync") {
            bearerAuth(auth.token); contentType(ContentType.Application.Json)
            setBody(SyncRequest(auth.deviceId, 0, listOf(SyncRecord("secrets", "x", 1, data = JsonPrimitive(1)))))
        }
        assertEquals(HttpStatusCode.BadRequest, res.status)
    }

    @Test
    fun logoutAndAccountDeletion() = withServer { client ->
        val auth = client.register()
        assertEquals(HttpStatusCode.NoContent, client.post("/api/auth/logout") { bearerAuth(auth.token) }.status)
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me") { bearerAuth(auth.token) }.status)

        val again = client.register(email = "zweit@example.com")
        assertEquals(HttpStatusCode.NoContent, client.delete("/api/me") { bearerAuth(again.token) }.status)
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/me") { bearerAuth(again.token) }.status)
    }

    @Test
    fun signupCanBeDisabled() = withServer(ServerConfig(allowSignup = false, authRateLimit = 100)) { client ->
        val res = client.post("/api/auth/register") {
            contentType(ContentType.Application.Json); setBody(RegisterRequest("a@b.de", "sehrgeheim", "x", "ios"))
        }
        assertEquals(HttpStatusCode.Forbidden, res.status)
    }

    @Test
    fun passwordHashing() {
        val h = Passwords.hash("sehrgeheim")
        assertTrue(Passwords.verify("sehrgeheim", h))
        assertTrue(!Passwords.verify("anders", h))
    }

    @Test
    fun statsAreStoredAndReportedOnlyWithToken() = withServer(ServerConfig(authRateLimit = 100, statsToken = "0123456789abcdef-secret")) { client ->
        val today = kotlinx.datetime.Clock.System.todayIn(kotlinx.datetime.TimeZone.UTC)
        val upload = de.birneklub.drop.core.stats.StatsUpload(
            "install-0123456789abcdef", "android", "0.1.0",
            listOf(
                de.birneklub.drop.core.stats.StatCount(today, "app_open", 1),
                de.birneklub.drop.core.stats.StatCount(today, "setup_done", 1),
                de.birneklub.drop.core.stats.StatCount(today, "shot_logged", 3),
            ),
        )
        val sent = client.post("/api/stats/events") { contentType(ContentType.Application.Json); setBody(upload) }
        assertEquals(HttpStatusCode.NoContent, sent.status)

        val bad = client.post("/api/stats/events") { contentType(ContentType.Application.Json); setBody(upload.copy(counts = listOf(de.birneklub.drop.core.stats.StatCount(today, "email", 1)))) }
        assertEquals(HttpStatusCode.BadRequest, bad.status)

        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/stats/report").status)
        val report: de.birneklub.drop.core.stats.BetaReport = client.get("/api/stats/report") { bearerAuth("0123456789abcdef-secret") }.body()
        assertEquals(1, report.installs)
        assertEquals(1.0, report.setupCompletedShare)
        assertEquals(3.0, report.shotsPerActiveWeek)
    }

    @Test
    fun reportIsDisabledWithoutToken() = withServer { client ->
        assertEquals(HttpStatusCode.NotFound, client.get("/api/stats/report").status)
    }

    @Test
    fun retentionCountsDays28To35() {
        val today = kotlinx.datetime.LocalDate(2026, 12, 31)
        fun day(offset: Int) = today.minus(kotlinx.datetime.DatePeriod(days = offset)).toString()
        val rows = listOf(
            StatRow("a", day(40), "app_open", 1), StatRow("a", day(10), "app_open", 1), // first seen 40 days ago, back on day 30
            StatRow("b", day(40), "app_open", 1), // never came back
            StatRow("c", day(5), "app_open", 1), // too new for the cohort
            StatRow("c", day(5), "founding_buy", 1),
            StatRow("c", day(5), "link_reorder", 1),
        )
        val r = BetaReports.compute(rows, today)
        assertEquals(2, r.day30Cohort)
        assertEquals(0.5, r.day30RetentionShare)
        assertEquals(2, r.activeLast30Days)
        assertEquals(0.5, r.foundingBuyerShare)
        assertEquals(0.5, r.linkClickShare)
    }

    @Test
    fun roasterCardsRenderAndOpen() = withServer(ServerConfig(authRateLimit = 100, publicUrl = "https://sync.example.com")) { client ->
        assertEquals(HttpStatusCode.OK, client.get("/roaster").status)
        val card = client.get("/roaster/card?roaster=Nordbahnhof&coffee=Guji%20%3Cb%3E&country=Ethiopia&process=NATURAL&dose=18&yield=40&tmin=26&tmax=30&temp=94")
        assertEquals(HttpStatusCode.OK, card.status)
        val html = card.bodyAsText()
        assertTrue("<svg" in html && "Guji &lt;b&gt;" in html, "QR code rendered, input escaped")
        val link = Regex("""https://sync\.example\.com/r/[A-Za-z0-9_-]+""").find(html)!!.value
        val landing = client.get(link.removePrefix("https://sync.example.com"))
        assertEquals(HttpStatusCode.OK, landing.status)
        assertTrue("94 °C" in landing.bodyAsText())

        assertEquals(HttpStatusCode.BadRequest, client.get("/roaster/card?roaster=X&coffee=Y&dose=18&yield=40&tmin=26&tmax=30&temp=150").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/r/kaputt").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/.well-known/assetlinks.json").status)
    }

    @Test
    fun waitlistNeedsConsentAndDoubleOptIn() = withServer(ServerConfig(authRateLimit = 100, publicUrl = "https://drops.example.com", statsToken = "0123456789abcdef-secret")) { client ->
        fun join(consent: Boolean) = kotlinx.coroutines.runBlocking {
            client.post("/api/waitlist") { contentType(ContentType.Application.Json); setBody(WaitlistRequest("Robin@Example.com ", consent)) }
        }
        assertEquals(HttpStatusCode.BadRequest, join(consent = false).status)
        assertEquals(HttpStatusCode.Accepted, join(consent = true).status)
        val (to, text) = sentMails.single()
        assertEquals("robin@example.com", to)
        val confirm = Regex("""https://drops\.example\.com(/waitlist/confirm\?token=[A-Za-z0-9_-]+)""").find(text)!!.groupValues[1]

        val before: de.birneklub.drop.core.stats.BetaReport = client.get("/api/stats/report") { bearerAuth("0123456789abcdef-secret") }.body()
        assertEquals(0, before.waitlistConfirmed, "unconfirmed sign-ups do not count")
        assertEquals(HttpStatusCode.OK, client.get(confirm).status)
        val after: de.birneklub.drop.core.stats.BetaReport = client.get("/api/stats/report") { bearerAuth("0123456789abcdef-secret") }.body()
        assertEquals(1, after.waitlistConfirmed)

        // A confirmed address gets no second mail, and the answer does not reveal it.
        assertEquals(HttpStatusCode.Accepted, join(consent = true).status)
        assertEquals(1, sentMails.size)
        assertTrue("robin@example.com" in client.get("/api/waitlist/export") { bearerAuth("0123456789abcdef-secret") }.bodyAsText())
        assertEquals(HttpStatusCode.Unauthorized, client.get("/api/waitlist/export").status)

        val remove = Regex("""https://drops\.example\.com(/waitlist/remove\?token=[A-Za-z0-9_-]+)""").find(text)!!.groupValues[1]
        client.get(remove)
        assertTrue("robin@example.com" !in client.get("/api/waitlist/export") { bearerAuth("0123456789abcdef-secret") }.bodyAsText())
    }

    @Test
    fun websiteIsServedNextToTheApi() = withServer { client ->
        val home = client.get("/")
        assertEquals(HttpStatusCode.OK, home.status)
        assertTrue("Auf die Warteliste" in home.bodyAsText())
        assertEquals(HttpStatusCode.OK, client.get("/datenschutz").status)
        assertEquals(HttpStatusCode.OK, client.get("/site.css").status)
        assertEquals(HttpStatusCode.OK, client.get("/healthz").status)
        assertEquals(HttpStatusCode.OK, client.get("/roaster").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/gibt-es-nicht").status)
    }
}
