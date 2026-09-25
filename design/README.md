# drops. Greenfield-Redesign

Neuentwurf der App, unabhängig von der aktuellen UI. Die bestehende Expo-App bleibt unangetastet.

- **Design-Canvas:** https://claude.ai/artifact/WHr6x5WMZSkGSe41Am5QB1 (alle Screens + Design-Grundlagen)
- **Klickbarer Prototyp:** `design/prototype/index.html` (lokal im Browser öffnen, am besten in Handy-Breite).
  Gehostete Version: https://claude.ai/artifact/LWwGHinb3jA39tc6iJ21Mh

## Informationsarchitektur

| Tab | Aufgabe |
| --- | --- |
| **Heute** | Bohne im Trichter, Röstalter (Sweetspot 7–28 Tage), Rezept auf einen Blick, „Shot starten“, fällige Pflege, letzte Shots |
| **Bohnen** | Regal nach Zustand: offen, eingefroren (Dosen à 18 g), Archiv mit gesichertem Rezept und „wieder kaufen?“ |
| **Karte** | Umschalter *Anbauregion* (Kaffeegürtel, Weltkarte) und *Gekauft bei* (Städte/Röstereien in Europa) |
| **Entdecken** | Geschmacksprofil aus Bewertungen + Aromen, Bohnen-Empfehlungen mit Begründung, Cafés/Röstereien in der Nähe, Städte-Guides |
| **Setup** | Maschine und Mühle mit Zählern, Wasserhärte, Pflegeplan nach Dringlichkeit |

Detail-Flows: Bohne & Rezepte (mehrere Rezepte pro Bohne, Dial-in-Verlauf, Bewertung, Nachkaufen), Shot loggen (Timer mit Zielfenster, Stepper, Geschmack → konkreter Korrekturvorschlag, „als Rezept übernehmen“), Neue Bohne (Etikett-Scan füllt Felder vor, Startwert Mahlgrad aus ähnlicher Bohne).

## Designsystem „Röster-Ledger“

- Farben: Papier `#F3EEE5`, Fläche `#FBF8F3`, Tinte `#1E1915`, Espresso `#2A211B`, Crema `#A4521E` (auf Dunkel `#E08A4F`), Status: ok `#3E6A55`, bald `#A4521E`, überfällig `#9B2C20`. Dunkelmodus im Prototyp enthalten.
- Schrift: Instrument Serif (Namen, Titel), Geist (Text), Geist Mono (alle Messwerte).
- Touch-Ziele ≥ 44 px, Stepper statt Tastatur im Shot-Screen.

## Datenmodell (Vorschlag)

```
Bean      id, name, roaster, country, region, lat, lon, process, variety, altitude,
          roastLevel, roastDate, weightG, remainingG, priceEur, notes[], status(open|frozen|archive),
          frozenDoses, rating, rebuy, purchase{shopName, city, lat, lon, channel(vor Ort|online|auf Reisen)}
Recipe    id, beanId, name, grind, rpm, doseG, yieldG, timeMinS, timeMaxS, tempC, preinfusion, kit
Shot      id, beanId, recipeId, at, grind, doseG, yieldG, timeS, tempC, taste(0..4)
Equipment id, kind(machine|grinder), name, shotCount, groundKg
Task      id, equipmentId, name, interval(value, unit: days|kg|liters|shots), lastDoneAt | lastDoneCounter
```

Pflege-Status: `used / interval` ≥ 1 → überfällig, ≥ 0,8 → bald fällig, sonst ok. Mühlen-Aufgaben zählen gemahlene kg (jeder Shot addiert die Dosis).

## Offene Punkte

- Café- und Röstereidaten: Quelle klären (eigene Kuratierung, Partner-API oder Community-Einträge).
- Empfehlungen: im Prototyp regelbasiert (Aromen-Kategorien gewichtet mit Bewertung); später Katalog der Röstereien anbinden.
- Etikett-Scan: OCR on-device (z. B. ML Kit / Vision) mit Feld-Mapping.
