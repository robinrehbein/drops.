# Drops v2 — Konzept (Neuanfang, Kotlin + Jetpack Compose)

Stand: 2026-08-09 · Status: **Entwurf zur Freigabe** — es wird erst gebaut, wenn dieses Dokument abgesegnet ist.

## Warum Neuanfang

Die bestehende Expo/React-Native-App ist zu einem Store-Produkt gewachsen (Karte, Cloud-Sync-Abo, Wasserchemie, Koffein, Wartung, Dashboard), das am eigentlichen Bedarf vorbeigeht und sich schlecht anfühlt. Drops v2 ist bewusst das Gegenteil: **eine persönliche App für einen Nutzer, eine Siebträgermaschine, eine Mühle. Lokal, offline, ohne Konto.**

## Das Produkt in einem Satz

> Ein **Bohnen-Gedächtnis mit Eindial-Hilfe**: Ich kaufe eine Bohne (wieder), die App kennt das Rezept und die Mahlgrad-Einstellung — ich muss nie zweimal eindialen.

### Der Kern-Moment, an dem alles gemessen wird

Ich stehe im Laden oder an der Maschine, habe eine Bohne von vor einem Jahr wieder gekauft:
**App öffnen → Bohne suchen (oder am Tütenfoto erkennen) → Rezept steht da → Mühle einstellen. Fertig in unter 10 Sekunden.**

## Ziele

1. **Kauf-Gedächtnis**: Welche Bohnen hatte ich, waren sie gut, würde ich sie wieder kaufen?
2. **Rezept pro Bohne**: Mahlgrad (Skala meiner Mühle), Gramm rein, Gramm raus, Zeit — eingefroren, sofort abrufbar.
3. **Eindial-Hilfe**: Versuche kurz loggen, bis der Shot sitzt; der gute Versuch wird per Tap zum Rezept. Danach wird nichts mehr geloggt.
4. **Frische im Blick**: Röstdatum erfassen, Tage seit Röstung anzeigen.

## Nicht-Ziele (bewusst gestrichen)

- Kein Cloud-Sync, kein Abo, kein Konto, kein Backend
- Keine Karte / Café-Explore
- Kein dauerhaftes Shot-Logging, keine Statistiken/Insights/Dashboard
- Keine Wasserchemie, kein Koffein-Tracking, keine Kostenrechnung
- Kein Wartungs-Tracker für die Maschine
- Kein Tablet-Layout, kein iOS, keine Mehrsprachigkeit (nur Deutsch)
- Keine Verwaltung mehrerer Maschinen/Mühlen — es gibt genau eine, sie braucht keinen Namen

Wenn später „ein paar Nutzer" dazukommen sollen: nichts hiervon verbaut das — aber nichts davon wird vorsorglich mitgebaut.

## Tech-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache/UI | Kotlin, Jetpack Compose, Material 3 | Nativ, wie gewünscht; bestes Eingabe-Gefühl |
| Persistenz | Room (SQLite) | Lokal, offline, robust, migrierbar |
| Architektur | 1 Modul, ViewModel + Repository, manuelle DI | Kein Hilt/Multi-Module-Zeremoniell für 4 Screens |
| Navigation | Navigation Compose | Standard |
| Fotos | CameraX bzw. System-Kamera-Intent, Datei lokal | Tütenfoto = schnellstes Wiedererkennen |
| Berechtigungen | Nur Kamera (optional) | Kein Netzwerk, kein Standort |

Start mit leerer Datenbank — keine Migration aus der alten App.

## Datenmodell

```
Bean
├─ id: UUID
├─ name: String                  (Pflicht — einziges Pflichtfeld)
├─ roaster: String?
├─ roastDate: LocalDate?         (→ Anzeige „Tag X nach Röstung")
├─ photoUri: String?             (Tütenfoto)
├─ notes: String?
├─ wouldBuyAgain: Boolean?       (null = noch kein Urteil)
├─ status: ACTIVE | FINISHED
├─ frozenAttemptId: UUID?        (FK → DialInAttempt; null = noch nicht eingedialt)
├─ createdAt / updatedAt

DialInAttempt
├─ id: UUID
├─ beanId: UUID                  (FK → Bean)
├─ grindSetting: String          (frei, Skala der eigenen Mühle, z. B. „2.4")
├─ doseG: Double                 (Gramm rein)
├─ yieldG: Double                (Gramm raus)
├─ timeSec: Int
├─ verdict: SAUER | BITTER | GUT
├─ note: String?
├─ createdAt
```

Das **Rezept ist kein eigenes Objekt** — es ist der eingefrorene gute Versuch (`frozenAttemptId`). Das hält Modell und Bedienung identisch: was du beim Eindialen eintippst, ist exakt das, was später als Rezept dasteht.

## Screens & Flows

### 1. Bohnenliste (Startscreen)

- Suchfeld ganz oben, sofort fokussierbar — die Suche *ist* der Kern-Moment
- Karteneinträge: Tütenfoto-Thumbnail, Name, Röster, Mahlgrad-Kurzanzeige (falls eingefroren), Badge „eindialen…" falls nicht
- Aktive Bohnen oben, darunter abgeschlossene (mit 👍/👎 für „wieder kaufen")
- FAB: neue Bohne anlegen

### 2. Bohne anlegen / bearbeiten

- Minimal: Name eintippen, fertig. Optional: Foto knipsen, Röster, Röstdatum, Notiz
- Kein Pflichtfeld-Marathon — Anlegen an der Kasse in 15 Sekunden

### 3. Bohnen-Detail

- **Rezept groß und zuerst** (falls eingefroren): Mahlgrad dominant, darunter `18 g → 38 g · 28 s`
- Frische: „Tag 12 nach Röstung"
- „Würde ich wieder kaufen": 👍 / 👎
- Darunter eingeklappt: Eindial-Verlauf (die Versuche, die zum Rezept führten)
- Aktionen: „Versuch loggen" (solange nicht eingefroren) · „Neu eindialen" (z. B. neue Röstung schmeckt anders — startet neue Versuchsrunde, altes Rezept bleibt als Referenz sichtbar) · „Aufgebraucht" (Status → FINISHED)

### 4. Versuch loggen (der Eindial-Flow)

- Formular vorbelegt mit dem letzten Versuch (bzw. dem alten Rezept bei „Neu eindialen")
- Vier Eingaben: Mahlgrad, Gramm rein, Gramm raus, Zeit — große Touch-Ziele, Zahlenfeld-Tastatur
- Urteil als drei Buttons: **Sauer · Bitter · Gut**
- Sanfte Hilfe (kein Zwang): bei „Sauer" → Hinweis „feiner mahlen", bei „Bitter" → „gröber mahlen"
- Bei „Gut": Button **„Als Rezept einfrieren"** → fertig, Bohne ist eingedialt

### Wiederkauf-Flow (der Zweck des Ganzen)

Alte Bohne suchen → Detail zeigt Rezept → Button „Wieder gekauft": Status zurück auf ACTIVE, optional neues Röstdatum/Foto. Rezept bleibt unangetastet — nur wenn der erste Shot nicht passt, „Neu eindialen".

## Meilensteine

1. **M1 — Grundlage**: Projekt-Setup, Room-Schema, Bohnenliste + Anlegen/Bearbeiten
2. **M2 — Eindialen**: Detail-Screen, Versuchs-Log, Einfrieren, Eindial-Hinweise
3. **M3 — Kern-Moment**: Suche, Wiederkauf-Flow, Tütenfoto, Frische-Anzeige, Feinschliff
4. **M4 (optional)**: JSON-Export per Share-Sheet — einziges „Backup", damit die Daten einen Handywechsel überleben

## Offene Fragen

1. **Restgewicht** („noch 180 g in der Tüte")? Vorschlag: **weglassen** — Pflege-Aufwand bei jedem Bezug, und die Tüte in der Hand beantwortet die Frage schneller.
2. **Repo-Strategie beim Baustart**: Clean Slate auf diesem Branch (Expo-Code fliegt raus, Kotlin-Projekt wird Repo-Wurzel) oder Unterordner? Entscheidung fällig bei Freigabe.
3. **Mühlen-Skala**: reicht ein Freitextfeld für den Mahlgrad (z. B. „2.4", „14 Klicks"), oder soll die Skala der Mühle einmal konfigurierbar sein (min/max/Schrittweite) für Plausibilität?
