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
    val founding = FoundingMember(app) {
        scope.launch { stats.count(de.birneklub.drop.core.stats.StatEvents.FOUNDING_BUY); stats.flush(statsServerUrl) }
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
