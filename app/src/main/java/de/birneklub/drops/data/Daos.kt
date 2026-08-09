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

    @Upsert
    suspend fun upsert(bean: Bean)

    @Delete
    suspend fun delete(bean: Bean)
}

@Dao
interface AttemptDao {
    @Query("SELECT * FROM attempts WHERE beanId = :beanId ORDER BY createdAt DESC")
    fun observeForBean(beanId: String): Flow<List<DialInAttempt>>

    @Query("SELECT * FROM attempts WHERE beanId = :beanId ORDER BY createdAt DESC LIMIT 1")
    suspend fun latestForBean(beanId: String): DialInAttempt?

    @Query("SELECT * FROM attempts WHERE id = :id")
    suspend fun getById(id: String): DialInAttempt?

    @Insert
    suspend fun insert(attempt: DialInAttempt)
}
