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
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServerTest {
    private fun withServer(config: ServerConfig = ServerConfig(authRateLimit = 100), block: suspend ApplicationTestBuilder.(HttpClient) -> Unit) {
        val db = File.createTempFile("drops", ".db").apply { deleteOnExit() }
        val store = Store(db.absolutePath)
        testApplication {
            application { dropsModule(store, config) }
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
}
