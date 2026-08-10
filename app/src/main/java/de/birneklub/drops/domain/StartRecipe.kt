package de.birneklub.drops.domain

import de.birneklub.drops.data.RoastLevel

data class StartRecipe(
    val doseG: Double,
    val ratio: Double,
    val tempRange: String,
    val timeTarget: String,
    val hint: String,
) {
    val yieldG: Double get() = doseG * ratio
}

/**
 * Startrezept nach Röstgrad — Standard-Lehre (Hoffmann/Rao/Barista Hustle):
 * Basis 18 g → 1:2 in 25–32 s bei ~93 °C; hell höher & heißer, dunkel kürzer & kühler.
 */
fun suggestStartRecipe(roastLevel: RoastLevel?): StartRecipe = when (roastLevel) {
    RoastLevel.HELL -> StartRecipe(
        doseG = 18.0,
        ratio = 2.5,
        tempRange = "94–96 °C",
        timeTarget = "25–32 s",
        hint = "Helle Röstungen sind schwer zu extrahieren: höhere Ratio, heißeres Wasser.",
    )
    RoastLevel.DUNKEL -> StartRecipe(
        doseG = 18.0,
        ratio = 1.75,
        tempRange = "89–92 °C",
        timeTarget = "25–30 s",
        hint = "Dunkle Röstungen extrahieren leicht: kürzere Ratio, kühleres Wasser gegen Bitterkeit.",
    )
    else -> StartRecipe(
        doseG = 18.0,
        ratio = 2.0,
        tempRange = "92–94 °C",
        timeTarget = "25–32 s",
        hint = "Der klassische Startpunkt. Nur eine Variable pro Shot ändern — zuerst den Mahlgrad.",
    )
}
