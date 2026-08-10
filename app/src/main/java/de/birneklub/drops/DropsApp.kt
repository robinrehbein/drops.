package de.birneklub.drops

import android.app.Application
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.CareRepository
import de.birneklub.drops.data.DataExporter
import de.birneklub.drops.data.DropsDatabase
import de.birneklub.drops.data.GrinderSettingsStore
import de.birneklub.drops.data.PlaceRepository

class AppContainer(app: Application) {
    val database by lazy { DropsDatabase.build(app) }
    val repository by lazy { BeanRepository(database.beanDao(), database.attemptDao()) }
    val careRepository by lazy { CareRepository(database.maintenanceDao()) }
    val placeRepository by lazy { PlaceRepository(database.placeDao()) }
    val grinderSettings by lazy { GrinderSettingsStore(app) }
    val dataExporter by lazy { DataExporter(database) }
}

class DropsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
