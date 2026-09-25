package de.birneklub.drop.data

import de.birneklub.drop.core.model.GeoPoint

/**
 * Example content for the "Entdecken" map layer until a real catalogue of
 * cafés, roasters and beans is connected. Names are fictional.
 */
object DiscoverCatalog {
    data class Place(
        val id: String,
        val name: String,
        val location: GeoPoint,
        val isRoaster: Boolean,
        val servesCoffee: Boolean,
        val distanceMeters: Int,
        val description: String,
        val openNow: Boolean,
        val hours: String,
        val note: String? = null,
    )

    data class Recommendation(
        val id: String,
        val name: String,
        val origin: String,
        val roaster: String,
        val roasterCity: String,
        val roasterLocation: GeoPoint,
        val notes: String,
        val price: String,
        val reason: String,
    )

    data class CityGuide(val id: String, val city: String, val location: GeoPoint, val cafes: Int, val roasters: Int)

    /** Example user position (Hamburg-Ottensen) for the "nearby" view. */
    val examplePosition = GeoPoint(53.5545, 9.9345)
    const val EXAMPLE_AREA = "Hamburg-Ottensen"

    val places = listOf(
        Place("siebwerk", "Siebwerk", GeoPoint(53.5531, 9.9265), false, true, 350, "Espressobar · Gaströster wechseln wöchentlich", true, "Geöffnet bis 18:00", "schenkt gerade Guji Hambela aus"),
        Place("kontor17", "Kontor 17", GeoPoint(53.5487, 9.9502), false, true, 1200, "Filter-Bar · V60, Batch Brew, Cupping samstags", true, "Geöffnet bis 17:00"),
        Place("brise", "Bohne & Brise", GeoPoint(53.5642, 9.9588), true, true, 2400, "Café mit eigener Rösterei · Frühstück", false, "Öffnet morgen 08:00"),
        Place("hafen", "Hafenrösterei", GeoPoint(53.5431, 9.9853), true, false, 3100, "Rösterei mit Probierbar", true, "Geöffnet bis 19:00", "deine meistgekaufte Rösterei"),
        Place("nord", "Röstwerk Nord", GeoPoint(53.5712, 9.9981), true, false, 4800, "Rösterei · Werksverkauf", false, "Öffnet Samstag 10:00"),
    )

    val recommendations = listOf(
        Recommendation("r1", "Kamundu Peaberry", "Kenia · Kiambu", "Röstwerk Nord", "Hamburg", GeoPoint(53.5712, 9.9981), "Washed · Cassis, Grapefruit", "18,90 € / 250 g", "Weil du Karogoto AA mit 4.5 bewertet hast."),
        Recommendation("r2", "Gatukuza", "Burundi · Kayanza", "Bohnenwerk", "Berlin", GeoPoint(52.52, 13.40), "Washed · Hibiskus, Rote Johannisbeere", "17,50 € / 250 g", "Floral und hell geröstet, wie deine Favoriten."),
        Recommendation("r3", "Bensa Shantawene", "Äthiopien · Sidama", "Nordlys Kaffe", "Kopenhagen", GeoPoint(55.68, 12.57), "Natural · Blaubeere, Kakaonibs", "19,00 € / 250 g", "Sidamo Bensa gehört zu deinen Top 3."),
    )

    val cityGuides = listOf(
        CityGuide("cph", "Kopenhagen", GeoPoint(55.68, 12.57), 14, 5),
        CityGuide("vie", "Wien", GeoPoint(48.21, 16.37), 11, 3),
        CityGuide("ber", "Berlin", GeoPoint(52.52, 13.40), 23, 9),
        CityGuide("ams", "Amsterdam", GeoPoint(52.37, 4.90), 17, 6),
    )
}
