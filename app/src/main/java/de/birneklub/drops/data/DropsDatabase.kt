package de.birneklub.drops.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [Bean::class, DialInAttempt::class, MaintenanceTask::class, Place::class],
    version = 2,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class DropsDatabase : RoomDatabase() {
    abstract fun beanDao(): BeanDao
    abstract fun attemptDao(): AttemptDao
    abstract fun maintenanceDao(): MaintenanceDao
    abstract fun placeDao(): PlaceDao

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE beans ADD COLUMN origin TEXT")
                db.execSQL("ALTER TABLE beans ADD COLUMN process TEXT")
                db.execSQL("ALTER TABLE beans ADD COLUMN roastLevel TEXT")
                db.execSQL("ALTER TABLE beans ADD COLUMN boughtAt TEXT")
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS maintenance_tasks (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        intervalDays INTEGER NOT NULL,
                        lastDoneAt INTEGER,
                        createdAt INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS places (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL,
                        city TEXT NOT NULL,
                        type TEXT NOT NULL,
                        notes TEXT,
                        url TEXT,
                        favorite INTEGER NOT NULL DEFAULT 0,
                        createdAt INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
            }
        }

        fun build(context: Context): DropsDatabase =
            Room.databaseBuilder(context, DropsDatabase::class.java, "drops.db")
                .addMigrations(MIGRATION_1_2)
                .build()
    }
}
