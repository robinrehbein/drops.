# Marktanalyse & Kriterienkatalog — Drops v2.1

Stand: 2026-08-10 · Grundlage für die Erweiterung von Drops zur vollwertigen Kaffeeliebhaber-App (Ziel-Definition von Robin: Bohnen/Rezepte-Tracking, Maschinen-/Mühlen-Status, Kaffee-Entdecken, Rezeptvorschläge + Guide-Modus).

## 1. Untersuchte Referenzen

| Referenz | Relevanz | Kernerkenntnisse |
|---|---|---|
| **Beanconqueror** (Community-Standard, von James Hoffmann empfohlen) | Tracking | Bohnen- & Brüh-Tracking über viele Methoden, offline, **kein Konto, keine Werbung, Daten gehören dem Nutzer** (Export). Verbrauchs-/Restmengen-Tracking. Bluetooth-Waagen als Kür. |
| **Dial In Coffee / Dial In Espresso** | Eindialen | Dose/Yield/Zeit/Mahlgrad/Geschmack pro *Tüte*, daraus **konkrete Next-Shot-Empfehlung**. Kein Konto nötig. |
| **Filtru** | Guides | **Geführte Rezepte mit eingebautem Timer** + Journal — Guide-Modus ist etablierte Erwartung. |
| **Brewlog / Dialed Shots** | Einfachheit | Bewusst simpel: schnelles Loggen schlägt Feature-Fülle; Ziel „Bohnen sparen beim Eindialen". |
| **BeanBook / Espresso Notes** | Bohnen-Metadaten | Herkunft, Prozess, Röstgrad, Tütenfoto sind Standard-Felder eines Bohnen-Journals. |
| **European Coffee Trip** (App + Plattform) | Entdecken | **Handkuratierte** Café-/Röster-Datenbank, Suche nach Stadt/Nähe/Karte, Filter, **offline nutzbar**, kostenlos. Kuratierung ist redaktionelle Arbeit — nicht automatisierbar. |
| Wartungs-Guides (Clive Coffee, Seattle Coffee Gear, Whole Latte Love u. a.) | Pflege | Etablierte Intervalle: täglich wischen; Duschsieb/Gruppe wöchentlich; **Backflush mit Reiniger alle 2–4 Wochen**; **Mühle alle 1–3 Wochen** (~0,5–1,5 kg); Entkalken je nach Wasser ~monatlich–quartalsweise; **Wasserfilter ~6 Monate**. |
| Dial-in-Standards (Hoffmann, Rao, Barista Hustle, espressoaf.com) | Rezeptvorschlag | Startpunkt **18 g → 1:2 in 25–32 s bei ~93 °C**; hell geröstet → höhere Ratio (bis 1:2,5+) & heißer (94–96 °C); dunkel → niedrigere Ratio (1:1,5–1:2) & kühler (~89–92 °C). Sauer → feiner, bitter → gröber, **eine Variable pro Shot**. |

## 2. Kriterienkatalog

**M** = Muss (ohne das nimmt ein Kaffeeliebhaber die App nicht ernst) · **S** = Soll (differenziert) · **K** = Kür (bewusst offen)

### A · Bohnen & Rezepte
- **A1 (M)** Bohnen-Bibliothek mit Foto, Röster, Röstdatum, Herkunft, Prozess, Röstgrad
- **A2 (M)** Rezept pro Bohne (Mahlgrad, Dose, Yield, Zeit), sofort abrufbar
- **A3 (M)** Eindial-Log mit Geschmacksurteil und Richtungs-Hinweis (sauer→feiner, bitter→gröber)
- **A4 (M)** Frische-Anzeige (Tage seit Röstung); Wiederkauf reaktiviert ohne Datenverlust
- **A5 (M)** Offline, kein Konto, keine Werbung
- **A6 (S)** Datenexport (Backup, Datenhoheit wie Beanconqueror)
- **A7 (S)** Shot-Timer direkt beim Loggen
- **A8 (K)** Restmengen-Tracking — *bewusst ausgelassen (Nutzer-Entscheid v2)*; Bluetooth-Waagen — *Kür, später*

### B · Maschine & Mühle (Pflege)
- **B1 (M)** Wartungsaufgaben mit Intervallen: Wasserfilter, Entkalken, Backflush, Duschsieb/Gruppe, Mühlenreinigung
- **B2 (M)** Fälligkeits-Status auf einen Blick (überfällig / bald fällig / ok) + „Erledigt"-Aktion
- **B3 (S)** Intervalle editierbar, eigene Aufgaben anlegbar (Maschine/Mühle/Wasser-Kategorien)
- **B4 (K)** Push-Erinnerungen — *Kür, später (App-Öffnen zeigt Status)*

### C · Entdecken
- **C1 (M)** Persönliche Café-/Röster-Liste: Name, Stadt, Typ, Notiz, Favorit — offline
- **C2 (M)** Stadt-/Namens-Suche und Typ-Filter; Absprung in Karten-App
- **C3 (S)** Starter-Kuratierung als Ausgangspunkt + Verweis auf European Coffee Trip fürs europaweite Entdecken (deren Kuratierung ist redaktionell — wir ersetzen sie nicht, wir verlinken sie)
- **C4 (S)** Verknüpfung zum Kern: „Gekauft bei" an der Bohne
- **C5 (K)** Eigene Kartenansicht mit Pins — *Kür (Karten-SDK), Absprung zu Google Maps deckt den Job*

### D · Rezeptvorschläge & Guide
- **D1 (M)** Startrezept-Vorschlag nach Röstgrad (Ratio, Temperatur, Zeitfenster nach Standard-Lehre)
- **D2 (M)** Geführter Espresso-Dial-in (Schritte + Abbruchkriterien + Timer)
- **D3 (S)** Brüh-Guides für weitere Methoden (V60, French Press, AeroPress) mit Schritt-Timern
- **D4 (S)** Vorschlag erscheint an der Bohne, solange kein Rezept eingefroren ist

## 3. Abgleich (wird nach Umsetzung gepflegt)

| Kriterium | Status in Drops |
|---|---|
| A1–A5, A6, A7 | ✅ umgesetzt in v2.1 |
| A8 | ⏸ bewusst offen |
| B1–B3 | ✅ umgesetzt in v2.1 |
| B4 | ⏸ Kür |
| C1–C4 | ✅ umgesetzt in v2.1 |
| C5 | ⏸ Kür |
| D1–D4 | ✅ umgesetzt in v2.1 |

Quellen: beanconqueror.com · kaffeemacher.de (Beanconqueror-Review) · App-Store-Seiten von Dial In Coffee, Filtru, Brewlog, BeanBook · europeancoffeetrip.com · clivecoffee.com, seattlecoffeegear.com, wholelattelove.com (Wartung) · espressoaf.com, Clive-Coffee- & Barista-Hustle-Dial-in-Guides.
