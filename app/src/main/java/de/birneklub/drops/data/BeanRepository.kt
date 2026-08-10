package de.birneklub.drops.data

import kotlinx.coroutines.flow.Flow
import java.time.LocalDate
import java.util.UUID

class BeanRepository(
    private val beanDao: BeanDao,
    private val attemptDao: AttemptDao,
) {
    fun observeRows(): Flow<List<BeanListRow>> = beanDao.observeRows()

    fun observeBean(id: String): Flow<Bean?> = beanDao.observeById(id)

    fun observeAttempts(beanId: String): Flow<List<DialInAttempt>> =
        attemptDao.observeForBean(beanId)

    suspend fun getBean(id: String): Bean? = beanDao.getById(id)

    suspend fun getAttempt(id: String): DialInAttempt? = attemptDao.getById(id)

    suspend fun latestAttempt(beanId: String): DialInAttempt? = attemptDao.latestForBean(beanId)

    suspend fun createBean(
        name: String,
        roaster: String?,
        roastDate: LocalDate?,
        photoUri: String?,
        notes: String?,
        origin: String? = null,
        process: String? = null,
        roastLevel: RoastLevel? = null,
        boughtAt: String? = null,
    ): String {
        val now = System.currentTimeMillis()
        val id = UUID.randomUUID().toString()
        beanDao.upsert(
            Bean(
                id = id,
                name = name,
                roaster = roaster,
                roastDate = roastDate,
                photoUri = photoUri,
                notes = notes,
                origin = origin,
                process = process,
                roastLevel = roastLevel,
                boughtAt = boughtAt,
                createdAt = now,
                updatedAt = now,
            )
        )
        return id
    }

    suspend fun updateBean(bean: Bean) {
        beanDao.upsert(bean.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun deleteBean(bean: Bean) = beanDao.delete(bean)

    suspend fun logAttempt(
        beanId: String,
        grindSetting: Double,
        doseG: Double,
        yieldG: Double,
        timeSec: Int,
        verdict: Verdict,
        note: String?,
        freeze: Boolean,
    ) {
        val attempt = DialInAttempt(
            id = UUID.randomUUID().toString(),
            beanId = beanId,
            grindSetting = grindSetting,
            doseG = doseG,
            yieldG = yieldG,
            timeSec = timeSec,
            verdict = verdict,
            note = note,
            createdAt = System.currentTimeMillis(),
        )
        attemptDao.insert(attempt)
        if (freeze) freezeAttempt(attempt.id, beanId)
    }

    suspend fun freezeAttempt(attemptId: String, beanId: String) {
        val bean = beanDao.getById(beanId) ?: return
        beanDao.upsert(
            bean.copy(frozenAttemptId = attemptId, updatedAt = System.currentTimeMillis())
        )
    }

    suspend fun setStatus(beanId: String, status: BeanStatus) {
        val bean = beanDao.getById(beanId) ?: return
        // Wiederkauf: Röstdatum zurücksetzen, damit die Frische-Anzeige nicht
        // die alte Tüte beschreibt — die neue Röstung trägt ihr eigenes Datum.
        val reactivated = bean.status == BeanStatus.FINISHED && status == BeanStatus.ACTIVE
        beanDao.upsert(
            bean.copy(
                status = status,
                roastDate = if (reactivated) null else bean.roastDate,
                updatedAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun setWouldBuyAgain(beanId: String, value: Boolean?) {
        val bean = beanDao.getById(beanId) ?: return
        beanDao.upsert(bean.copy(wouldBuyAgain = value, updatedAt = System.currentTimeMillis()))
    }
}
