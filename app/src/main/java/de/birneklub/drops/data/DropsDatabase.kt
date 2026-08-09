package de.birneklub.drops.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [Bean::class, DialInAttempt::class],
    version = 1,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class DropsDatabase : RoomDatabase() {
    abstract fun beanDao(): BeanDao
    abstract fun attemptDao(): AttemptDao

    companion object {
        fun build(context: Context): DropsDatabase =
            Room.databaseBuilder(context, DropsDatabase::class.java, "drops.db").build()
    }
}
