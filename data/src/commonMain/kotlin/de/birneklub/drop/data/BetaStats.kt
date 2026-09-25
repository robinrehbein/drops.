package de.birneklub.drop.data

import de.birneklub.drop.core.stats.StatCount
import de.birneklub.drop.core.stats.StatsLimits
import de.birneklub.drop.core.stats.StatsUpload
import de.birneklub.drop.core.sync.DropsJson
import de.birneklub.drop.data.db.DropsDatabase
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn
import kotlinx.serialization.builtins.ListSerializer
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

/**
 * Anonymous beta statistics. Nothing is counted until the user opts in; then
 * events are summed per day and uploaded under a random install id that is not
 * linked to the account. Opting out deletes the pending counts and the id.
 */
class BetaStats(
    private val db: DropsDatabase,
    engine: HttpClientEngine,
    private val platform: String,
    private val appVersion: String,
    private val clock: Clock = Clock.System,
    private val zone: TimeZone = TimeZone.currentSystemDefault(),
    private val io: CoroutineDispatcher = Dispatchers.IO,
) {
    private val q get() = db.recordsQueries
    private val mutex = Mutex()
    private val counts = ListSerializer(StatCount.serializer())

    private val http = HttpClient(engine) {
        install(ContentNegotiation) { json(DropsJson) }
        install(HttpTimeout) { requestTimeoutMillis = 15_000 }
        expectSuccess = false
    }

    /** null = not asked yet. */
    suspend fun optedIn(): Boolean? = withContext(io) { q.getValue(KEY_OPT_IN).executeAsOneOrNull()?.let { it == "1" } }

    @OptIn(ExperimentalUuidApi::class)
    suspend fun setOptIn(enabled: Boolean) = mutex.withLock {
        withContext(io) {
            db.transaction {
                q.setValue(KEY_OPT_IN, if (enabled) "1" else "0")
                if (enabled) {
                    if (q.getValue(KEY_INSTALL_ID).executeAsOneOrNull() == null) q.setValue(KEY_INSTALL_ID, Uuid.random().toString())
                } else {
                    q.removeValue(KEY_INSTALL_ID)
                    q.removeValue(KEY_PENDING)
                    q.removeValue(KEY_LAST_DAY)
                }
            }
        }
    }

    /** Adds one to today's count of [event]; a no-op without opt-in. */
    suspend fun count(event: String) = mutex.withLock {
        withContext(io) {
            if (q.getValue(KEY_OPT_IN).executeAsOneOrNull() != "1") return@withContext
            val today = clock.todayIn(zone)
            val list = pending().toMutableList()
            val i = list.indexOfFirst { it.day == today && it.event == event }
            if (i >= 0) list[i] = list[i].copy(count = (list[i].count + 1).coerceAtMost(StatsLimits.MAX_COUNT)) else list += StatCount(today, event, 1)
            q.setValue(KEY_PENDING, DropsJson.encodeToString(counts, list.takeLast(StatsLimits.MAX_COUNTS_PER_UPLOAD)))
        }
    }

    /** Counts [event] at most once per day, e.g. "the app was used today". */
    suspend fun countDaily(event: String) {
        val today = clock.todayIn(zone).toString()
        val key = "$event@$today"
        val seen = withContext(io) { q.getValue(KEY_LAST_DAY).executeAsOneOrNull() }
        if (seen?.split('\n')?.contains(key) == true) return
        count(event)
        withContext(io) {
            val kept = seen?.split('\n').orEmpty().filter { it.endsWith("@$today") }
            if (q.getValue(KEY_OPT_IN).executeAsOneOrNull() == "1") q.setValue(KEY_LAST_DAY, (kept + key).joinToString("\n"))
        }
    }

    /** Uploads pending counts to [serverUrl]; they are kept for later if that fails. */
    suspend fun flush(serverUrl: String): Boolean = mutex.withLock {
        withContext(io) {
            if (serverUrl.isBlank() || q.getValue(KEY_OPT_IN).executeAsOneOrNull() != "1") return@withContext false
            val installId = q.getValue(KEY_INSTALL_ID).executeAsOneOrNull() ?: return@withContext false
            val sent = pending()
            if (sent.isEmpty()) return@withContext true
            val ok = runCatching {
                http.post(SyncClient.normalizeServerUrl(serverUrl) + "/api/stats/events") {
                    contentType(ContentType.Application.Json)
                    setBody(StatsUpload(installId, platform, appVersion, sent))
                }.status.isSuccess()
            }.getOrDefault(false)
            if (ok) {
                // Keep anything counted while the request was in flight.
                val sentKeys = sent.associate { (it.day to it.event) to it.count }
                val rest = pending().mapNotNull { c ->
                    val done = sentKeys[c.day to c.event] ?: 0
                    (c.count - done).takeIf { it > 0 }?.let { c.copy(count = it) }
                }
                q.setValue(KEY_PENDING, DropsJson.encodeToString(counts, rest))
            }
            ok
        }
    }

    internal fun pending(): List<StatCount> =
        q.getValue(KEY_PENDING).executeAsOneOrNull()?.let { runCatching { DropsJson.decodeFromString(counts, it) }.getOrNull() }.orEmpty()

    companion object {
        private const val KEY_OPT_IN = "stats_opt_in"
        private const val KEY_INSTALL_ID = "stats_install_id"
        private const val KEY_PENDING = "stats_pending"
        private const val KEY_LAST_DAY = "stats_daily_seen"
    }
}
