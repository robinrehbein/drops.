package de.birneklub.drops.data

import android.content.Context
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Skala der eigenen Mühle — einmal konfiguriert, überall vom Mahlgrad-Rad benutzt. */
data class GrinderScale(
    val min: Double = 0.0,
    val max: Double = 40.0,
    val step: Double = 1.0,
) {
    val decimals: Int
        get() = if (step % 1.0 == 0.0) 0 else if ((step * 10) % 1.0 == 0.0) 1 else 2

    fun format(value: Double): String = "%.${decimals}f".format(value)

    fun clampToStep(value: Double): Double {
        val snapped = min + Math.round((value - min) / step) * step
        return snapped.coerceIn(min, max)
    }
}

private val Context.dataStore by preferencesDataStore(name = "grinder_settings")

class GrinderSettingsStore(private val context: Context) {
    private val keyMin = doublePreferencesKey("scale_min")
    private val keyMax = doublePreferencesKey("scale_max")
    private val keyStep = doublePreferencesKey("scale_step")

    val scale: Flow<GrinderScale> = context.dataStore.data.map { prefs ->
        GrinderScale(
            min = prefs[keyMin] ?: 0.0,
            max = prefs[keyMax] ?: 40.0,
            step = prefs[keyStep] ?: 1.0,
        )
    }

    suspend fun save(scale: GrinderScale) {
        context.dataStore.edit { prefs ->
            prefs[keyMin] = scale.min
            prefs[keyMax] = scale.max
            prefs[keyStep] = scale.step
        }
    }
}
