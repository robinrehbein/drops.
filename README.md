# Drops

Ein Bohnen-Gedächtnis mit Eindial-Hilfe für den Siebträger zuhause. Nativ für Android, lokal und offline — kein Konto, kein Sync, keine Cloud.

**Der Kern-Moment:** Eine Bohne von vor einem Jahr wieder gekauft → App öffnen → suchen → Rezept und Mahlgrad stehen da → Mühle einstellen. Fertig.

## Features

- **Bohnen-Bibliothek** mit Suche, Tütenfoto, Röster, Röstdatum und Frische-Anzeige
- **Eindialen**: Versuche loggen (Mahlgrad, Gramm rein/raus, Zeit, Urteil Sauer/Bitter/Gut) — der gute Versuch wird per Tap zum eingefrorenen Rezept
- **Mahlgrad-Rad**: drehbarer Einstellring wie an der Mühle, Skala (Min/Max/Schritt) einmalig konfigurierbar
- **Kauf-Gedächtnis**: „Würde ich wieder kaufen?" plus Wiederkauf-Flow, der die Bohne samt Rezept reaktiviert

## Stack

Kotlin · Jetpack Compose (Material 3) · Room · DataStore · Navigation Compose · Coil — ein Modul, keine DI-Frameworks.

## Bauen

```bash
./gradlew assembleDebug        # Debug-APK: app/build/outputs/apk/debug/
./gradlew installDebug         # direkt aufs angeschlossene Gerät
```

Benötigt JDK 17+ und ein Android SDK (`ANDROID_HOME` oder `local.properties` mit `sdk.dir`).

## Konzept

Siehe [`docs/drops-v2-konzept.md`](docs/drops-v2-konzept.md) — Produktdefinition, Datenmodell und bewusste Nicht-Ziele.
