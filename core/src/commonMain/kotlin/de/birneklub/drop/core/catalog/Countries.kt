package de.birneklub.drop.core.catalog

import de.birneklub.drop.core.model.GeoPoint

/** Coffee-growing countries with a map point, recognised in German and English. */
object Countries {
    private val all: List<Triple<String, List<String>, GeoPoint>> = listOf(
        Triple("Äthiopien", listOf("ethiopia", "äthiopien", "aethiopien"), GeoPoint(7.0, 38.7)),
        Triple("Kenia", listOf("kenya", "kenia"), GeoPoint(-0.4, 37.0)),
        Triple("Ruanda", listOf("rwanda", "ruanda"), GeoPoint(-2.3, 29.5)),
        Triple("Burundi", listOf("burundi"), GeoPoint(-3.0, 29.9)),
        Triple("Kolumbien", listOf("colombia", "kolumbien"), GeoPoint(2.0, -75.5)),
        Triple("Brasilien", listOf("brazil", "brasil", "brasilien"), GeoPoint(-19.0, -46.5)),
        Triple("Guatemala", listOf("guatemala"), GeoPoint(15.0, -91.0)),
        Triple("Costa Rica", listOf("costa rica"), GeoPoint(9.7, -84.0)),
        Triple("Honduras", listOf("honduras"), GeoPoint(14.5, -88.0)),
        Triple("El Salvador", listOf("el salvador"), GeoPoint(13.8, -89.0)),
        Triple("Panama", listOf("panama", "panamá"), GeoPoint(8.8, -82.4)),
        Triple("Peru", listOf("peru", "perú"), GeoPoint(-6.0, -78.0)),
        Triple("Mexiko", listOf("mexico", "méxico", "mexiko"), GeoPoint(16.5, -92.5)),
        Triple("Indonesien", listOf("indonesia", "indonesien", "sumatra", "java", "sulawesi"), GeoPoint(3.5, 98.5)),
        Triple("Jemen", listOf("yemen", "jemen"), GeoPoint(15.3, 44.0)),
        Triple("Indien", listOf("india", "indien"), GeoPoint(12.5, 75.5)),
        Triple("Bolivien", listOf("bolivia", "bolivien"), GeoPoint(-16.3, -67.8)),
        Triple("Nicaragua", listOf("nicaragua"), GeoPoint(13.1, -85.9)),
        Triple("Tansania", listOf("tanzania", "tansania"), GeoPoint(-3.4, 37.3)),
        Triple("Uganda", listOf("uganda"), GeoPoint(1.1, 34.2)),
        Triple("Kongo", listOf("congo", "kongo", "drc"), GeoPoint(-2.5, 28.9)),
        Triple("Ecuador", listOf("ecuador"), GeoPoint(-1.8, -78.2)),
        Triple("Papua-Neuguinea", listOf("papua new guinea", "papua-neuguinea", "png"), GeoPoint(-6.3, 145.9)),
        Triple("Vietnam", listOf("vietnam"), GeoPoint(12.0, 108.0)),
        Triple("China", listOf("china", "yunnan"), GeoPoint(23.0, 101.0)),
    )

    /** German name and map point for [name], or null if unknown. */
    fun lookup(name: String): Pair<String, GeoPoint>? {
        val n = name.trim().lowercase()
        if (n.isEmpty()) return null
        return all.firstOrNull { (_, aliases, _) -> n in aliases }?.let { it.first to it.third }
    }
}
