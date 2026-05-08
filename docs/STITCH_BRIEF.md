# Brewlog — design brief for Google Stitch

> A self-contained design prompt you can paste into Google Stitch (or any
> design-generation tool) to produce screens for the app. Scoped to the
> v1 surface that's already implemented.

## App identity

**Brewlog** is a high-fidelity coffee brewing companion for specialty espresso enthusiasts. It's a **local-first iOS + Android app** built with Expo + React Native. The user is a home barista who pulls 1–5 espresso shots a day and wants to log every variable that affects taste — bean, dose, yield, time, grind, rating, flavor notes — so they can build intuition over time.

Tone: **calm, ritualistic, precise**. Think *barista's leather notebook*, not *tech bro dashboard*. Every screen should feel like a clean place to think.

## Visual direction — "Earthy Forest"

**Aesthetic philosophy:** *Tactile Organicism.* Soft rounded geometry, earthy palette evoking the coffee plant's origin, high information density delivered through clean typography rather than chrome.

### Color tokens (semantic names, not raw hex)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#f1ece0` | App background — warm cream |
| `paperDeep` | `#e6dfcc` | Tiles, raised surfaces |
| `paperEdge` | `#d9d2c0` | Hairlines, borders |
| `ink` | `#2a3a30` | Primary text — deep forest charcoal |
| `inkSoft` | `#5a6a60` | Secondary text |
| `inkFaint` | `#8a9088` | Captions, hints, inactive tab labels |
| `forest` | `#3a5a3e` | CTAs, active states, brand color |
| `forestDeep` | `#2a3a2e` | Pressed / hover state |
| `forestPale` | `#a8c0a8` | Subtle accent backgrounds, badges |
| `amber` | `#a36a3a` | Recovery banner, undo confirms |
| `danger` | `#9a3a2e` | Destructive (Stop Pull, Delete) |

**No dark mode in v1.** Everything is light.

### Typography

- **Fraunces** (variable serif, Google Font) for large display numbers, screen titles, section headings. Conveys character + ritual.
- **Inter** for body text, UI labels, all-caps tile labels, tabular numerals.
- **System fallbacks:** Georgia (serif), system-ui (sans).

Type scale:

- `display` 56pt serif light — the timer ("00:18.4")
- `title` 24pt serif medium — screen titles ("Brew Lab")
- `heading` 18pt serif semibold — section labels ("Today, at a glance")
- `body` 15pt sans
- `bodyStrong` 15pt sans semibold
- `caption` 13pt sans (`inkSoft`)
- `label` 11pt sans semibold uppercase, letter-spacing 1.4 (`inkSoft`)
- `numeral` 16pt sans semibold tabular-nums

### Geometry

- **Rounded everything.** Radii: tiles 14, sheets 22, buttons (pill) 999. No square corners.
- **Spacing:** 4-pt grid (4 / 8 / 12 / 16 / 24 / 32 / 48). Bias toward generous whitespace.
- **Borders preferred over shadows.** Single 1px hairline in `paperEdge`. Only the tasting-note sheet has a soft drop shadow.

## Visual storytelling — REQUIRED

This app is **about the ritual of coffee**, so screens should feel like a curated journal, not a generic app skeleton. Every screen needs at least one piece of **real, illustrative content** — never a flat placeholder block, never a single emoji glyph standing in for art.

**Use these imagery directions throughout:**

- **Bean cards in the Library** — each thumbnail is a hand-drawn coffee bag illustration with subtle textile texture, the roaster's wordmark visible, and a small branch-and-cherry detail in the corner. Vary the bag color subtly per bean (deep brown for dark roast, terracotta for medium, light kraft for light roast). Never a flat colored square with an emoji.
- **Daily Brew "Last brew" card** — small editorial photograph or illustration of a porcelain espresso cup with crema visible at top-right of the card. Soft shadow, warm light.
- **Bean detail screen** — hero illustration at top showing the bean's region (a stylized topographic map sliver of the country, with a coffee cherry branch overlaid).
- **Brew Lab — IdleSetup** — a faint, almost watermark-style branch-and-cherry illustration behind the steppers, at ~8% opacity in `forestPale` so it doesn't compete with the controls.
- **Tasting Note modal** — flavor tag chips have tiny custom glyphs next to each word (a citrus slice next to "citrus", a chocolate square next to "chocolate", a flower next to "jasmine", etc.). Glyphs are simple line-art, single color (`forest` or `inkSoft`).
- **Empty states** — always include a small custom line-art illustration appropriate to the context (e.g., empty Library shows an empty mason jar with a single bean inside; empty History shows a closed pocket-watch).

**Imagery style cohesion:**
- All illustrations are hand-drawn, single-line or two-tone, in `forest` / `inkSoft` / `paperDeep` palette
- Never use stock 3D coffee cups, photorealistic latte art clichés, or generic emoji
- Never use "☕" or "📚" or "⚗️" emoji as primary content — they're acceptable ONLY in the bottom tab bar at small size, and even there custom line-art icons are preferred

**Visual tells the brewing story:**
- The extraction ring on Brew Lab Pulling should have a subtle radial gradient inside (very faint cream-to-paperDeep) suggesting crema forming
- Progress bars on bean cards should taper visually (lighter at empty end) like a coffee bag emptying
- Recovery banner on Lab should have a soft pulsing glow (suggested via amber → cream gradient) implying urgency without being aggressive

## Token discipline — REQUIRED

The design system tokens listed above (`paper #f1ece0`, etc.) are **the source of truth**. Do not generate a derived Material color palette that drifts:

- App background MUST be exactly `paper #f1ece0` (warm cream), not a minty `#ebfeef` or any auto-derived "surface" token.
- Accent green MUST be exactly `forest #3a5a3e`, not a slightly different "primary container" derivative.
- Typography MUST use Fraunces + Inter, not falling back to the design system's "title-md" / "body-lg" if those are slightly different sizes.
- Tile radii MUST be 14px exactly. Pill buttons MUST be 999px (full pill).
- Tab bar background MUST be `paper #f1ece0`, not a light tint of green.

Stitch should treat the tokens as **strict constraints** rather than suggestions. If a Stitch-generated Material palette would change `surface` to anything other than `#f1ece0`, override it back to the brief's value.

## Information architecture

**Four** tabs, four modal flows. Bottom tab bar with line-style icons + labels (no emoji).

```
☕ Daily          📚 Library          ⚗️ Lab            🔧 Care
  (machine          (lifetime           (active brewing    (machine
   readiness +       bean archive       workflow +          maintenance)
   cups widget)      with recipes)       state machine)
```

Modals reachable from the tabs: **Pick Bean**, **Tasting Note**, **Settings**, **Save Recipe Confirm**, **Log Maintenance Task**.

## Screen 1 — Daily Brew (☕ Daily tab)

**Purpose:** A morning glance. *"Is the machine ready, how many cups have I had toward today's goal, and what should I brew next?"*

Layout, top to bottom:

- **Header bar** — large serif `Daily` centered. `Settings` text link top-right in `forest`.

- **Match daily cups (PRIMARY)** — the most prominent widget on the screen, just below the header. A horizontal row of espresso-cup line-art glyphs: as many cups as the user's daily-cups goal (default 4, configurable). Each cup is a small ceramic-cup outline (~32×32 px) drawn in `inkSoft` line. As shots are pulled today, cups fill with crema-brown (a `secondary #a36a3a` tone blended with `forest`). Cups past the goal appear in `amber`. Below the row: single-line caption `2 of 4 · est. 360 mg`. When the goal is met exactly, a small `✓ daily cups` tick appears in `forest`. **Visual cue:** cups should feel hand-drawn, slightly imperfect, like sketched in the corner of a notebook. Each filled cup gets a tiny crema swirl at the rim.

- **Machine readiness** — three rows below the cups widget. Each row: small uppercase label on the left (`FILTER`, `BACKFLUSH`, `BURR CLEAN`), value on the right in caption type. Row colour reflects status:
  - `forest` text → ok ("18 days left")
  - `amber` → due soon ("Due in 2 days")
  - `danger` bold + tiny `!` → overdue ("Overdue 3 days")
  - The whole row is a Pressable that routes to the Care tab.
  - If no machine is configured: instead show one dashed-border tile "Add a machine in Care to track readiness" with a `forestPale` wrench glyph.

- **Big primary pill button** — full-width `forest` green, `paper` text: `Start an Espresso Shot`. If the recently-used bean has a saved recipe, append a small subline below the button: `Yirgacheffe Konga · recipe ready`.

- **Recent shots** — heading `Recent` + last 3 shot cards stacked. Each card on `paperDeep`, hairline border, 14px radius. Inside: bean name (Fraunces heading); below, a row of inline metrics: time-of-day · ratio · star rating.

**Empty state** (brand-new user): only the header, an empty cup row of 4 outlined cups, the dashed Care CTA, and the `Start an Espresso Shot` button. Recent section omitted.

**Caffeine is a fact, not a goal.** It appears only as a subtle suffix in the cup-row caption ("· est. 360 mg") — never as a standalone hero stat.

## Screen 2 — Library (📚 Library tab) — *lifetime archive*

**Purpose:** A lifetime archive of every coffee the user has ever tasted — currently brewing, finished, would-buy-again, archived. Not a current-inventory view. Inventory tracking (weight + price) is opt-in for fun-fact stats.

- **Header bar** — `Library` serif title. `+ Add` link top-right in `forest`.

- **Status filter chips** — a row of segmented chips just below the header: `Active` (default, selected) · `Finished` · `Would buy again` · `All`. Selected chip is filled `forest`; others are ghost. As the user taps, the list filters live.

- **Bean list** — each bean is a horizontal card, 14px radius, `paperDeep` background, hairline border, ~88px tall.

  Inside (left to right):
  1. **Thumbnail (56×56 px, 8px radius)** — a hand-drawn coffee bag illustration with subtle textile texture, the roaster's wordmark visible, a tiny branch-and-cherry detail in the corner. Vary the bag colour subtly per bean (deep brown for dark, terracotta for medium, light kraft for light). **Never a flat colour with an emoji glyph.**
  2. **Info column** — bean name in Fraunces heading (`ink`); subtitle in caption sans (`inkSoft`): "Origin · Process · Roast level"; a 4px-tall progress bar showing remaining bag weight if `start_weight_g` is tracked (otherwise hidden, no awkward empty bar).
  3. **Right-side context** — depends on the active filter:
     - *Active filter:* a small pill badge with days-since-roast ("3d") in `forestPale` background, `forest` text.
     - *Finished filter:* a small "finished N days ago" caption + a tiny would-buy-again thumb (`forest` thumbs-up if `true`, `inkFaint` thumbs-down if `false`, omitted if `null`).
     - *Would-buy-again filter:* same as Finished but only those flagged `true`.
     - *All:* show whichever icon is most relevant for that bean.

- **Empty state** — dashed-border cream card centered with a hand-drawn empty mason jar (single bean inside) illustration, "No beans yet" heading in serif, body text "Add your first bag to start logging brews", and a `+ Add a bean` pill below.

### Add Bean form (push from `+ Add`)

- Header with `← Back` and `New bean`.
- **Required**: only `name` (with red asterisk).
- All other fields are explicitly labelled "*optional*" in caption text below their label.
- Form fields, each with small uppercase label above:
  - **Name** *required* — text input
  - **Roaster** *optional* — text input
  - **Origin** *optional* — text input
  - **Process** *optional* — small chip row (washed / natural / honey / anaerobic / other)
  - **Roast level** *optional* — five small pill buttons (1–5)
  - **Bag size (g)** *optional* — numeric input. Caption hint below: "If you fill this in, we'll show cost-per-shot stats."
  - **Price** *optional* — numeric + currency picker. Same caption hint.
  - **Roasted on** *optional* — date picker
  - **Notes** *optional* — multiline text
- Inline error caption in `danger` if validation fails (e.g., empty name).
- Big `Save bean` pill at the bottom, full-width.

### Bean detail (push from any list card) — the deepest screen in the app

- **Header** with `← Back` and bean's name.

- **Hero section** — large bean illustration (a stylized topographic sliver of the country with a coffee cherry branch overlaid, single colour `forest` on `paperDeep`). Bean name in big serif title. Subtitle in caption: "Origin · Process · Roast level". Days-since-roast badge. Remaining-weight bar (only if tracked). A **"Would buy again"** toggle row (👍 / 👎 / "not yet decided") with `forest` selected state.

- **Recipe section** — a `paperDeep` card with hairline border, 14px radius. If a recipe is locked in, show:
  ```
  ╭─────────────────────────────────────╮
  │ RECIPE                              │
  │                                     │
  │ Dose 18.0 g · Yield 36.0 g · 27.0 s │
  │ Grind 3.2 · 93 °C                   │
  │                                     │
  │ saved from shot on Oct 3, 4★        │
  │                                     │
  │   [Edit]                  [Clear]   │
  ╰─────────────────────────────────────╯
  ```
  If no recipe is locked, show a dashed-border tile in its place: "No recipe yet. Pull a great shot, then mark it as the recipe from its session detail." with a faint pencil-and-cup illustration.

- **Sensory radar** — a five-axis radar chart showing the bean's average tasting fingerprint across all shots. Five spokes labelled `mouthfeel` / `acidity` / `sweetness` / `bitterness` / `balance`. Pentagonal background grid in `paperEdge`. Fingerprint polygon filled `forestPale` with `forest` border. Below the chart, a wrap of the most-frequent flavor-tag chips for this bean (with line-art glyphs — citrus slice, chocolate square, flower for jasmine, etc.).

- **History** — heading `History with this bean` + caption "*N* shots · avg ★*X*". Below: a list of every shot, time-of-day + ratio + star rating, tappable to session detail.

- **Fun facts** (only if `start_weight_g` AND `price_paid_minor` are tracked) — three small `paperDeep` tiles in a row: `COST/SHOT` · `TOTAL SPENT` · `DAYS TO EMPTY` (estimated from current usage rate).

- **Lifecycle** — a status segmented control (Active / Finished / Archived). If status is `finished`, show `Finished on <date>` caption below. Below the status row, the `Delete bean` pill in `danger` variant (with undo snackbar after tapping).

## Screen 3 — Brew Lab (⚗️ Lab tab) — the v1 hero

The most important screen. It's a state machine with three visible modes.

### Lab — IdleSetup (default)

- **Header bar**: `Brew Lab` serif title. `History` link top-right.
- **Bean chip**: a small pill button at the top of the body, cream-deep background. Reads `Brewing with: {bean name} ▾`. Tapping opens the Pick Bean modal.
- Two **steppers** stacked:
  - `DOSE` label — rounded `−` button, large value `18.0 g`, `+` button
  - `TARGET YIELD` label — same shape, value `36.0 g`
- Big `Start Shot` pill at the bottom, forest green. Disabled (lower opacity) if no bean selected.

### Lab — Pulling (active state)

- Same Header.
- Same bean chip.
- **Centered timer** in big serif light: `00:18.4`. Updates 10× per second.
- **Extraction ring** (Skia-rendered): 220px circle, 6px stroke. Background ring in `paperEdge`, progress arc in `forest`, drawn from 12 o'clock clockwise. Center of the ring shows percentage in serif title (e.g., `66%`) and tiny uppercase `EXTRACTION` caption below.
- **Two metric tiles** below the ring side by side: `DOSE` and `TARGET`.
- **Two ghost pills** below tiles: `Pre-infusion end` and `First drop` (the user taps these milestones during the pull).
- **Big danger pill** at the bottom: `Stop Pull` — full-width, deep red.

### Lab — History view (`History` link in header)

- Header `← Back` and `History`.
- Scrollable list of past session cards on cream-deep surfaces:
  - Bean name in serif heading
  - Caption: time of day + relative date ("9:42 AM · yesterday")
  - Bottom row of tabular numerals: `27.4s`, `1:1.58`, `★★★★`

### Session Detail (push from any history card)

- Header `← Back` and `Shot`.
- Bean name in big serif title.
- Two rows of metric tiles: `DOSE / YIELD / RATIO`, then `DURATION / RATING`.
- **Milestones surface** (cream-deep card): heading `Milestones` + each milestone as a row with kind + timestamp.
- **Notes surface** (cream-deep card) with the user's free-text comment, if any.
- **Save as recipe** action at the bottom:
  - If the bean has no recipe yet → primary `forest` pill: `Save as recipe for {bean name}`
  - If the bean already has a recipe → ghost `forest` pill: `Replace bean's recipe with this shot`
  Both trigger the **Save Recipe Confirm** modal (below).

## Screen 4 — Care (🔧 Care tab) — *machine maintenance*

**Purpose:** Replaces the paper notebook's machine-care pages. Tracks water filter freshness and cleaning schedules so you don't lose track of what's clean and what's overdue.

### Care — home (machine list)

- Header `Care` serif title (no `+` button — adds happen via cards).
- Vertical stack of **machine cards**, one per active machine. Each card on `paperDeep`, hairline border, 14px radius:
  - Machine name in Fraunces heading (e.g., "Lelit Bianca V3"), tiny `forestPale` chip next to it with the kind ("espresso machine").
  - Optional subtitle: vendor + model.
  - Below the name, a list of up to **3 most-imminent tasks** with computed status:
    - `FILTER` — `18 days left` (in `forest`)
    - `BACKFLUSH` — `Due in 2 days` (in `amber`)
    - `BURR CLEAN` — `Overdue 3 days` (in `danger` bold + small `!`)
  - Tapping the card → machine detail.
- After the cards, an **add-machine tile** — dashed-border, `forestPale` wrench glyph, "Add a machine" body text, tap to push the Add Machine form.
- **Empty state** (no machines yet): a hand-drawn illustration of a small lever-style espresso machine with a wrench resting against it, big heading "Track your machine's care", body text "Add your espresso machine to start logging cleaning, filter changes, and backflushes.", `+ Add machine` pill.

### Machine detail (push from a card)

- Header `← Back` and machine name. `Edit` link top-right.
- Hero: machine name in big serif title. Subtitle with kind + vendor + model.
- **Tasks list** — each task on a `paperDeep` row, 14px radius. Layout:
  ```
  ╭─────────────────────────────────────────────╮
  │ Backflush group head                        │
  │ Every 7 days · last done 5 days ago         │
  │ DUE IN 2 DAYS                  [Mark done]  │
  ╰─────────────────────────────────────────────╯
  ```
  The status line ("DUE IN 2 DAYS") uses status colour. The `Mark done` pill is small, `forest`, opens the **Log Maintenance Task** modal.
- After the task list, an **add-task tile** — dashed-border, "Add a task" body text.
- Below tasks: a small `Notes` section (free-text edit) for machine-specific notes.

### Add Machine form

- Header with `← Back` and `Add machine`.
- Fields:
  - **Name** *required* — text input
  - **Kind** *required* — segmented (`Espresso machine` · `Grinder` · `Kettle` · `Other`)
  - **Vendor** *optional*
  - **Model** *optional*
  - **Acquired on** *optional* — date picker
  - **Set as primary machine** — toggle; on by default if it's the first machine
  - **Notes** *optional* — multiline
- Big `Save machine` pill at bottom.

### Add Task form

- Header `← Back` and `Add task`.
- Fields:
  - **Kind** *required* — picker with curated options: Backflush · Gasket replace · Burr clean · Filter replace · Descale · Group screen clean · Custom
  - **Label** *required* — text input (auto-fills based on kind, editable)
  - **Cadence** *required* — segmented (`Every N days` · `Every N shots` · `Every N liters`) + numeric input
  - **Notes** *optional* — multiline
- Big `Save task` pill at bottom.

## Modal 1 — Pick Bean (slides up from bottom)

- Bottom sheet with rounded top corners, ~70% screen height, optional drag handle at top center.
- `Pick a bean` serif title.
- Search input field (cream-deep background, hairline border).
- Scrollable list of bean cards (same shape as Library).
- Empty-state for "no matches" with a `+ Add a bean` CTA.

## Modal 2 — Tasting Note (slides up after Stop Pull)

- Bottom sheet, ~95% screen height.
- `Log this shot` serif title + caption with shot duration and dose.
- **Yield stepper** (g, 1-decimal precision).
- **Rating** label + row of five pills (1–5), selected one filled green, others ghost.
- **Sensory sliders** as steppers, 1–5 each: Mouthfeel, Acidity, Sweetness, Bitterness, Balance.
- **Flavor tags**: wrap of ghost pills (`bergamot`, `jasmine`, `stone fruit`, `chocolate`, `caramel`, `citrus`, `berry`, `floral`). Tapped → primary fill.
- **Notes** multiline text input.
- **Three buttons** at bottom: `Save` (primary, half-width), `Save & log another` (ghost, half-width) side by side, then `Discard shot` (ghost) below.

## Modal 3 — Settings

- Bottom sheet with `Settings` title.
- Vertical list of rows. Each row: label on the left (`body`), value/glyph on the right (`caption`), hairline divider below:
  - `Weight unit` → `g`
  - `Default ratio` → `1:2.0`
  - `Daily cups goal` → `4`  *(controls the cup-row widget on Daily)*
  - `Caffeine target (optional)` → `not set` *(if set, Daily caption gets a "/ Y mg goal" suffix)*
  - `Theme` → `Earthy Forest`
  - `Send diagnostic report` → `↗` (tappable)
  - `About` → `Brewlog v0.1.0`
- `Done` text button at the bottom centered (forest green).

## Modal 4 — Save Recipe Confirm (slides up from session detail)

A confirm sheet that previews the values about to be locked in as the bean's canonical recipe. Triggered by the "Save as recipe" / "Replace bean's recipe" pill on session detail.

- Bottom sheet, ~50% screen height.
- Title: serif `Save as recipe?` (or `Replace recipe?` for replace flow).
- Below the title, the bean name in caption.
- A `paperDeep` card showing the values about to be saved:
  ```
  Dose 18.0 g · Yield 36.0 g · 27.0 s
  Grind 3.2 · 93 °C
  ```
- A `Notes` text area (multiline, optional) — placeholder: "Any tips for next time? e.g. 'purge 4 turns coarser, then back'."
- For the replace flow, a small `inkSoft` caption above the card: "This will replace the recipe saved on Sept 14, 2026."
- Two buttons at the bottom: `Cancel` (ghost) and `Save recipe` / `Replace recipe` (primary `forest`).

## Modal 5 — Log Maintenance Task (slides up from machine detail)

A small confirm sheet for marking a task complete.

- Bottom sheet, ~40% screen height.
- Title: `Mark done · Backflush group head` in serif.
- Caption below: `Cadence: every 7 days · last done 5 days ago`.
- Small fact line(s) showing the snapshot being logged (auto-filled, read-only):
  - For shot-cadence tasks: `At shot count: 412`
  - For litre-cadence tasks: `At water processed: 47.2 L`
  - For day-cadence tasks: `At date: today, 14:22`
- A `Notes` text area (optional) — placeholder: "Any observations? e.g. 'gasket starting to crack'."
- Two buttons: `Cancel` (ghost) and `Mark done` (primary `forest`). On confirm, fires a snackbar: "Backflush logged · next due in 7 days".

## Cross-cutting interactions

- **Snackbar**: appears at the bottom of the screen above home indicator. Forest-deep background, cream text. Optional secondary action label in `forestPale` (e.g., "Bean deleted · Undo"). Auto-dismisses after 4s.
- **Recovery banner**: amber surface, mounted at the top of the Lab screen if a previous shot was killed mid-pull. Shows "In-progress shot from 47s ago" with `Resume` (primary pill) and `Discard` (text link) actions.
- **Empty / loading / error states** for every list view:
  - Empty: dashed-border card centered with a coffee-related emoji + heading + body + CTA pill.
  - Loading: small `Loading…` caption, no spinners.
  - Error: red caption "Couldn't load. Pull to retry."
- **All interactive elements** have rounded touch targets ≥ 44×44pt and forest-green active state. Status bar uses dark glyphs (light theme app).

## Mood board cues

Lean into:

- Hand-thrown ceramic coffee cup, soft directional light
- Whole coffee cherries on a bough, branch-and-leaves details
- Aerial of a green Ethiopian farm
- Clean greyscale on a kitchen counter, a porcelain dripper, a barista's notebook

Avoid:

- Glossy 3D coffee cups, beach-cafe-stock-photo vibes, neon brand colors, sterile dashboard chrome.
