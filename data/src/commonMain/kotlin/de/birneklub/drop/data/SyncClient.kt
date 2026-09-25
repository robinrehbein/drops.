package de.birneklub.drop.data

import de.birneklub.drop.core.sync.ApiError
import de.birneklub.drop.core.sync.AuthResponse
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.core.sync.LoginRequest
import de.birneklub.drop.core.sync.RegisterRequest
import de.birneklub.drop.core.sync.SyncRecord
import de.birneklub.drop.core.sync.SyncRequest
import de.birneklub.drop.core.sync.SyncResponse
import de.birneklub.drop.data.db.DropsDatabase
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.delete
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/** The signed-in account on this device. Absent = fully local, no account. */
@Serializable
data class AccountSession(
    val serverUrl: String,
    val token: String,
    val userId: String,
    val email: String,
    val deviceId: String,
)

data class SyncSummary(val pushed: Int, val pulled: Int, val serverTime: Long)

class SyncException(message: String, val sessionExpired: Boolean = false) : Exception(message)

/**
 * Optional account + sync. Nothing in the app depends on it: without a session
 * the data simply stays on the device.
 */
class SyncClient(
    private val db: DropsDatabase,
    engine: HttpClientEngine,
    private val deviceName: String,
    private val platform: String,
    private val io: CoroutineDispatcher = Dispatchers.IO,
) {
    private val q get() = db.recordsQueries

    private val http = HttpClient(engine) {
        install(ContentNegotiation) { json(DropsJson) }
        install(HttpTimeout) { requestTimeoutMillis = 30_000 }
        expectSuccess = false
    }

    private val _session = MutableStateFlow(loadSession())
    val session: StateFlow<AccountSession?> = _session.asStateFlow()

    suspend fun register(serverUrl: String, email: String, password: String): AccountSession =
        authenticate(serverUrl, "/api/auth/register") { RegisterRequest(email, password, deviceName, platform) }

    suspend fun login(serverUrl: String, email: String, password: String): AccountSession =
        authenticate(serverUrl, "/api/auth/login") { LoginRequest(email, password, deviceName, platform) }

    private suspend inline fun <reified T : Any> authenticate(serverUrl: String, path: String, crossinline body: () -> T): AccountSession = withContext(io) {
        val base = normalizeServerUrl(serverUrl)
        val res = request { http.post("$base$path") { contentType(ContentType.Application.Json); setBody(body()) } }
        if (!res.status.isSuccess()) throw SyncException(res.errorMessage())
        val auth: AuthResponse = res.body()
        val session = AccountSession(base, auth.token, auth.userId, auth.email, auth.deviceId)
        db.transaction {
            q.setValue(KEY_SESSION, DropsJson.encodeToString(AccountSession.serializer(), session))
            q.removeValue(KEY_SINCE)
            // Everything recorded before signing in gets uploaded on the first sync.
            q.markAllDirty()
        }
        _session.value = session
        session
    }

    /** Signs this device out. Local data stays on the device. */
    suspend fun logout() = withContext(io) {
        val s = _session.value ?: return@withContext
        runCatching { http.post("${s.serverUrl}/api/auth/logout") { bearerAuth(s.token) } }
        clearSession()
    }

    /** Deletes the account and all server-side data. Local data stays. */
    suspend fun deleteAccount() = withContext(io) {
        val s = _session.value ?: return@withContext
        val res = request { http.delete("${s.serverUrl}/api/me") { bearerAuth(s.token) } }
        if (!res.status.isSuccess() && res.status != HttpStatusCode.Unauthorized) throw SyncException(res.errorMessage())
        clearSession()
    }

    /** Pushes local changes and pulls remote ones (last write wins). */
    suspend fun sync(): SyncSummary = withContext(io) {
        val s = _session.value ?: throw SyncException("Nicht angemeldet")
        val since = q.getValue(KEY_SINCE).executeAsOneOrNull()?.toLongOrNull() ?: 0L
        val dirty = q.dirty().executeAsList()
        val outgoing = dirty.map { r ->
            SyncRecord(
                collection = r.collection,
                id = r.id,
                updatedAt = r.updated_at,
                deleted = r.deleted == 1L,
                data = r.json?.let { DropsJson.parseToJsonElement(it) },
            )
        }
        val res = request {
            http.post("${s.serverUrl}/api/sync") {
                bearerAuth(s.token)
                contentType(ContentType.Application.Json)
                setBody(SyncRequest(s.deviceId, since, outgoing))
            }
        }
        if (res.status == HttpStatusCode.Unauthorized) {
            clearSession()
            throw SyncException("Sitzung abgelaufen. Bitte erneut anmelden.", sessionExpired = true)
        }
        if (!res.status.isSuccess()) throw SyncException(res.errorMessage())
        val body: SyncResponse = res.body()

        var pulled = 0
        db.transaction {
            // Only clear rows that were not edited again while the request was in flight.
            outgoing.forEach { q.markClean(it.collection, it.id, it.updatedAt) }
            body.changes.forEach { remote ->
                val local = q.byId(remote.collection, remote.id).executeAsOneOrNull()
                if (local == null || remote.updatedAt > local.updated_at) {
                    q.upsert(remote.collection, remote.id, remote.data?.encode(), remote.updatedAt, if (remote.deleted) 1 else 0, 0)
                    pulled++
                }
            }
            q.setValue(KEY_SINCE, body.serverTime.toString())
        }
        SyncSummary(outgoing.size, pulled, body.serverTime)
    }

    fun pendingChanges(): Long = q.dirty().executeAsList().size.toLong()

    private fun clearSession() {
        db.transaction {
            q.removeValue(KEY_SESSION)
            q.removeValue(KEY_SINCE)
        }
        _session.value = null
    }

    private fun loadSession(): AccountSession? =
        q.getValue(KEY_SESSION).executeAsOneOrNull()?.let { runCatching { DropsJson.decodeFromString(AccountSession.serializer(), it) }.getOrNull() }

    private suspend fun request(block: suspend () -> HttpResponse): HttpResponse =
        try {
            block()
        } catch (e: Exception) {
            if (e is SyncException) throw e
            throw SyncException("Server nicht erreichbar. Prüfe Adresse und Verbindung.")
        }

    private suspend fun HttpResponse.errorMessage(): String =
        runCatching { body<ApiError>().message }.getOrNull() ?: "Serverfehler (${status.value})"

    private fun JsonElement.encode(): String = DropsJson.encodeToString(JsonElement.serializer(), this)

    companion object {
        private const val KEY_SESSION = "account_session"
        private const val KEY_SINCE = "sync_since"

        fun normalizeServerUrl(raw: String): String {
            val url = raw.trim().trimEnd('/')
            val local = url.startsWith("http://localhost") || url.startsWith("http://10.0.2.2") || url.startsWith("http://127.0.0.1")
            if (!url.startsWith("https://") && !local) throw SyncException("Die Server-Adresse muss mit https:// beginnen.")
            return url
        }
    }
}
