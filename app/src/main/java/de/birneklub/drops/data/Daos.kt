package de.birneklub.drops.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface BeanDao {
    @Query(
        """
        SELECT beans.*,
               a.grindSetting AS recipeGrind,
               a.doseG AS recipeDose,
               a.yieldG AS recipeYield,
               a.timeSec AS recipeTime
        FROM beans
        LEFT JOIN attempts a ON a.id = beans.frozenAttemptId
        ORDER BY beans.status ASC, beans.updatedAt DESC
        """
    )
    fun observeRows(): Flow<List<BeanListRow>>

    @Query("SELECT * FROM beans WHERE id = :id")
    fun observeById(id: String): Flow<Bean?>

    @Query("SELECT * FROM beans WHERE id = :id")
    suspend fun getById(id: String): Bean?

    @Query("SELECT * FROM beans")
    suspend fun getAll(): List<Bean>

    @Upsert
    suspend fun upsert(bean: Bean)

    @Delete
    suspend fun delete(bean: Bean)
}

@Dao
interface MaintenanceDao {
    @Query("SELECT * FROM maintenance_tasks ORDER BY category ASC, name ASC")
    fun observeAll(): Flow<List<MaintenanceTask>>

    @Query("SELECT COUNT(*) FROM maintenance_tasks")
    suspend fun count(): Int

    @Query("SELECT * FROM maintenance_tasks")
    suspend fun getAll(): List<MaintenanceTask>

    @Upsert
    suspend fun upsert(task: MaintenanceTask)

    @Delete
    suspend fun delete(task: MaintenanceTask)
}

@Dao
interface PlaceDao {
    @Query("SELECT * FROM places ORDER BY favorite DESC, city ASC, name ASC")
    fun observeAll(): Flow<List<Place>>

    @Query("SELECT COUNT(*) FROM places")
    suspend fun count(): Int

    @Query("SELECT * FROM places")
    suspend fun getAll(): List<Place>

    @Upsert
    suspend fun upsert(place: Place)

    @Delete
    suspend fun delete(place: Place)
}

@Dao
interface AttemptDao {
    @Query("SELECT * FROM attempts WHERE beanId = :beanId ORDER BY createdAt DESC")
    fun observeForBean(beanId: String): Flow<List<DialInAttempt>>

    @Query("SELECT * FROM attempts WHERE beanId = :beanId ORDER BY createdAt DESC LIMIT 1")
    suspend fun latestForBean(beanId: String): DialInAttempt?

    @Query("SELECT * FROM attempts WHERE id = :id")
    suspend fun getById(id: String): DialInAttempt?

    @Query("SELECT * FROM attempts")
    suspend fun getAll(): List<DialInAttempt>

    @Insert
    suspend fun insert(attempt: DialInAttempt)
}
