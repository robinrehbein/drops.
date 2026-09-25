package de.birneklub.drop.android

import android.app.Application
import android.os.Build
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
}

class DropsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
