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

**Purpose:** A morning glance. *"How am I caffeinated and what did I last brew?"*

Layout, top to bottom:

- **Header bar**: large serif title `Daily` centered. `Settings` text link top-right (forest green).
- **"Today, at a glance"** section heading.
- **Two big stats side by side**: large serif numbers for `shots today` and `est. caffeine (mg)`, with small caption labels below.
- **Last brew card** (only if there's been at least one brew): cream-deep surface, small uppercase `LAST BREW` label, then bold heading with the bean name, then caption with ratio (e.g., `1:1.58 · ★★★★`).
- **Big primary pill button**: `Start an Espresso Shot` — full-width, forest green, white-cream text. Tapping it routes to the Lab tab.
- **"Recent" section**: heading "Recent" + last 3 shot cards stacked. Each card is a row of three mini metric tiles: BEAN / RATIO / RATING.

Empty state for a brand-new user: only the title and the "Start an Espresso Shot" button are visible — everything else hides cleanly.

## Screen 2 — Library (📚 Library tab)

**Purpose:** Curated archive of beans the user owns / has tasted.

- **Header bar**: `Library` serif title. `+ Add` link top-right.
- **Bean list**: each bean is a horizontal card, ~80px tall:
  - Square coffee-bag thumbnail on the left (dark forest brown, white "☕" placeholder for now)
  - Name in serif heading
  - Subtitle in sans caption: `Origin · Process · Variety` (e.g., "Ethiopia · washed · medium-light")
  - Slim progress bar showing remaining bag weight (forest green fill on cream track)
  - Right-side circular badge showing days-since-roast (e.g., "3d") in `forestPale`
- **Empty state**: dashed-border cream card centered with a coffee cup icon, "No beans yet" heading, friendly body text, and a `+ Add a bean` pill.

### Add Bean form (push from `+ Add`)

- Header with `← Back` and `New bean`
- Form fields, each with small uppercase label above:
  - **Name** (required)
  - **Roaster**
  - **Origin**
  - **Roast level (1–5)** — five small pill buttons in a row, selected one = primary forest, others = ghost
  - **Bag size (g)** — numeric input
- Inline error caption in `danger` color if validation fails
- Big `Save bean` pill at the bottom, full-width

### Bean detail (push from any list card)

- Header with `← Back` and bean's name
- The same BeanCard at the top
- Section heading: `History with this bean` + caption count ("4 shots")
- Big `Delete bean` pill in `danger` variant at bottom

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
  - `Theme` → `Earthy Forest`
  - `Default ratio` → `1:2.0`
  - `Send diagnostic report` → `↗` (tappable)
  - `About` → `Brewlog v0.1.0`
- `Done` text button at the bottom centered (forest green).

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
