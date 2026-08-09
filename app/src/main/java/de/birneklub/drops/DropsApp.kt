package de.birneklub.drops

import android.app.Application
import de.birneklub.drops.data.BeanRepository
import de.birneklub.drops.data.DropsDatabase
import de.birneklub.drops.data.GrinderSettingsStore

class AppContainer(app: Application) {
    private val database by lazy { DropsDatabase.build(app) }
    val repository by lazy { BeanRepository(database.beanDao(), database.attemptDao()) }
    val grinderSettings by lazy { GrinderSettingsStore(app) }
}

class DropsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
