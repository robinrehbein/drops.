package de.birneklub.drops.data

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import java.time.LocalDate

enum class BeanStatus { ACTIVE, FINISHED }

enum class Verdict { SAUER, BITTER, GUT }

@Entity(tableName = "beans")
data class Bean(
    @PrimaryKey val id: String,
    val name: String,
    val roaster: String? = null,
    val roastDate: LocalDate? = null,
    val photoUri: String? = null,
    val notes: String? = null,
    val wouldBuyAgain: Boolean? = null,
    val status: BeanStatus = BeanStatus.ACTIVE,
    val frozenAttemptId: String? = null,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(
    tableName = "attempts",
    foreignKeys = [
        ForeignKey(
            entity = Bean::class,
            parentColumns = ["id"],
            childColumns = ["beanId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("beanId")],
)
data class DialInAttempt(
    @PrimaryKey val id: String,
    val beanId: String,
    val grindSetting: Double,
    val doseG: Double,
    val yieldG: Double,
    val timeSec: Int,
    val verdict: Verdict,
    val note: String? = null,
    val createdAt: Long,
)

/** Listenzeile: Bohne plus (falls eingefroren) das Rezept aus dem verknüpften Versuch. */
data class BeanListRow(
    @Embedded val bean: Bean,
    val recipeGrind: Double?,
    val recipeDose: Double?,
    val recipeYield: Double?,
    val recipeTime: Int?,
)

class Converters {
    @TypeConverter
    fun fromLocalDate(value: LocalDate?): String? = value?.toString()

    @TypeConverter
    fun toLocalDate(value: String?): LocalDate? = value?.let(LocalDate::parse)

    @TypeConverter
    fun fromStatus(value: BeanStatus): String = value.name

    @TypeConverter
    fun toStatus(value: String): BeanStatus = BeanStatus.valueOf(value)

    @TypeConverter
    fun fromVerdict(value: Verdict): String = value.name

    @TypeConverter
    fun toVerdict(value: String): Verdict = Verdict.valueOf(value)
}
