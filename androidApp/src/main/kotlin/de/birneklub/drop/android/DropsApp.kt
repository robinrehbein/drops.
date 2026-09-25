package de.birneklub.drop.android

import android.app.Application
import android.os.Build
import kotlinx.coroutines.launch
import de.birneklub.drop.data.BetaStats
import de.birneklub.drop.data.DropsRepository
import de.birneklub.drop.data.SyncClient
import de.birneklub.drop.data.createDatabase
import de.birneklub.drop.data.defaultHttpEngine

/** Manual dependency container; small enough that a DI framework would only add weight. */
class AppContainer(val app: Application) {
    private val database = createDatabase(app)
    val repository = DropsRepository(database)
    val sync = SyncClient(
        db = database,
        engine = defaultHttpEngine(),
        deviceName = "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
        platform = "android",
    )
    val stats = BetaStats(database, defaultHttpEngine(), platform = "android", appVersion = BuildConfig.VERSION_NAME)

    private val scope = kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.IO)
    val founding = FoundingMember(app, scope, ::verifyPurchase) {
        scope.launch { stats.count(de.birneklub.drop.core.stats.StatEvents.FOUNDING_BUY); stats.flush(statsServerUrl) }
    }

    /** POST /api/purchases/verify on our server; null when there is no server or no answer. */
    private suspend fun verifyPurchase(productId: String, token: String): String? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        if (statsServerUrl.isBlank()) return@withContext null
        runCatching {
            val body = de.birneklub.drop.core.sync.DropsJson.encodeToString(
                de.birneklub.drop.core.stats.PurchaseVerifyRequest.serializer(),
                de.birneklub.drop.core.stats.PurchaseVerifyRequest(productId, token),
            )
            val conn = (java.net.URL(statsServerUrl.trimEnd('/') + "/api/purchases/verify").openConnection() as java.net.HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            try {
                conn.outputStream.use { it.write(body.encodeToByteArray()) }
                if (conn.responseCode != 200) return@runCatching null
                val text = conn.inputStream.use { it.readBytes().decodeToString() }
                de.birneklub.drop.core.sync.DropsJson.decodeFromString(de.birneklub.drop.core.stats.PurchaseVerifyResponse.serializer(), text).state
            } finally {
                conn.disconnect()
            }
        }.getOrNull()
    }

    /** Where anonymous beta statistics go: the hosted drops. server, if this build has one. */
    val statsServerUrl: String = BuildConfig.DEFAULT_SYNC_URL.takeIf { it.removePrefix("https://").isNotBlank() }.orEmpty()
}

class DropsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        ReminderNotifications.createChannels(this)
        ReminderNotifications.schedule(this)
    }
}
