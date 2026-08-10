package de.birneklub.drops.domain

data class GuideStep(
    val text: String,
    val timerSeconds: Int? = null,
)

data class BrewGuide(
    val id: String,
    val title: String,
    val subtitle: String,
    val steps: List<GuideStep>,
)

val BREW_GUIDES: List<BrewGuide> = listOf(
    BrewGuide(
        id = "espresso-dialin",
        title = "Espresso eindialen",
        subtitle = "18 g → 1:2 · 25–32 s · Schritt für Schritt zum Rezept",
        steps = listOf(
            GuideStep("Dosis fixieren: 18 g frisch gemahlen ins Doppelsieb — und ab jetzt bei jedem Versuch exakt gleich."),
            GuideStep("Mahlgrad wählen: Starte in der Mitte der Espresso-Range deiner Mühle (oder beim Startrezept-Vorschlag der Bohne)."),
            GuideStep("Verteilen und eben, gerade und fest tampen — die Technik bleibt konstant, nur der Mahlgrad ändert sich."),
            GuideStep("Bezug starten und Timer mitlaufen lassen. Ziel: 36 g in der Tasse (1:2) in 25–32 Sekunden.", timerSeconds = 30),
            GuideStep("Auswerten: Unter 25 s durchgelaufen → feiner. Über 35 s gequält → gröber."),
            GuideStep("Schmecken: Sauer/dünn → feiner mahlen. Bitter/hart → gröber mahlen. Nur EINE Variable pro Shot ändern."),
            GuideStep("Versuch in Drops loggen. Wenn er sitzt: „Als Rezept einfrieren“ — fertig, nie wieder raten."),
        ),
    ),
    BrewGuide(
        id = "v60",
        title = "V60 Handfilter",
        subtitle = "15 g → 250 g · ca. 3 min",
        steps = listOf(
            GuideStep("15 g mittelfein mahlen. Papierfilter mit heißem Wasser spülen, Wasser wegschütten."),
            GuideStep("Blooming: 45 g Wasser (93–96 °C) aufgießen, alle Kaffeepartikel benetzen.", timerSeconds = 45),
            GuideStep("In langsamen Kreisen bis 150 g aufgießen.", timerSeconds = 30),
            GuideStep("Bis 250 g auffüllen, Rand sauber halten.", timerSeconds = 30),
            GuideStep("Auslaufen lassen. Gesamtzeit 2:30–3:30 — deutlich schneller → feiner, langsamer → gröber."),
        ),
    ),
    BrewGuide(
        id = "frenchpress",
        title = "French Press",
        subtitle = "30 g → 500 g · 4 min",
        steps = listOf(
            GuideStep("30 g grob mahlen, in die Kanne geben."),
            GuideStep("500 g Wasser (ca. 95 °C) aufgießen, kurz umrühren."),
            GuideStep("4 Minuten ziehen lassen — Deckel drauf, nicht drücken.", timerSeconds = 240),
            GuideStep("Schaum und aufschwimmende Partikel mit einem Löffel abheben (klareres Ergebnis)."),
            GuideStep("Stempel nur bis knapp über das Kaffeebett drücken und direkt servieren."),
        ),
    ),
    BrewGuide(
        id = "aeropress",
        title = "AeroPress",
        subtitle = "15 g → 220 g · ca. 2:30 min",
        steps = listOf(
            GuideStep("15 g mittelfein mahlen. AeroPress normal aufbauen, Filter spülen."),
            GuideStep("220 g Wasser (ca. 90 °C) zügig aufgießen, einmal umrühren."),
            GuideStep("2 Minuten ziehen lassen.", timerSeconds = 120),
            GuideStep("Langsam und gleichmäßig über ca. 30 Sekunden herunterdrücken.", timerSeconds = 30),
            GuideStep("Bei Bitterkeit: kühleres Wasser oder kürzere Ziehzeit. Bei Säure: feiner oder länger."),
        ),
    ),
)
