# Animated SVG Icons — Design

Date: 2026-06-01
Status: Approved

## Goal

Replace every emoji/glyph that renders as a UI element with a Lucide SVG icon, and
animate icons on interaction (press) and on meaningful state changes. The reference
[lucide-animated.com](https://lucide-animated.com/) is web-only (CSS / Framer Motion),
so the *feel* is recreated natively with `react-native-reanimated`.

## Constraints & decisions

- **Native, not web.** This is Expo + React Native. We use `lucide-react-native`
  (SVG icons via `react-native-svg`) and animate with `react-native-reanimated`
  (already installed). No web animation libraries.
- **Scope = every glyph that renders as a React UI element.** Glyphs that are
  composed into plain text strings cannot hold an SVG and stay as-is (see carve-outs).
- **Animation feel = transform/opacity springs**, not literal SVG path-draw morphing.
  Path interpolation is explicitly out of scope (YAGNI).

## Dependencies

- `npx expo install react-native-svg` — SDK-54-pinned version; peer dep of Lucide.
- `npm i lucide-react-native` — official Lucide RN icon set.
- Animations: `react-native-reanimated` (already a dependency).

## 1. Icon system — rewrite `src/ui/icons/line.tsx`

Replace the emoji-glyph map with a Lucide-backed `Icon`. Keep the existing
`{ name, color, size }` API and add an optional `fill` so swapping `string` → `IconName`
at call sites is mechanical. Expand `IconName`:

| Current glyph | `IconName`            | Lucide                       |
| ------------- | --------------------- | ---------------------------- |
| ☕            | `cup`                 | `Coffee`                     |
| 📚            | `book`                | `BookOpen`                   |
| ⚗️            | `flask`               | `FlaskConical`               |
| 🔧            | `wrench`              | `Wrench`                     |
| 📍            | `pin`                 | `MapPin`                     |
| 🫘            | `bean`                | `Bean`                       |
| ★ / ☆         | `star`                | `Star` (outline vs `fill`)   |
| ✓             | `check`               | `Check`                      |
| ✕             | `close`               | `X`                          |
| ←             | `arrowLeft`           | `ArrowLeft`                  |
| → (CTA)       | `arrowRight`          | `ArrowRight`                 |
| ↑ / ↓ (trend) | `trendUp`/`trendDown` | `TrendingUp` / `TrendingDown`|

## 2. Animation layer — `AnimatedIcon` + `usePressAnimation`

- A small set of Reanimated presets (transform/opacity only): `pop` (scale bounce),
  `pulse`, `spin`, `nudge` (translate).
- `usePressAnimation()` hook → returns an animated style plus `onPressIn`/`onPressOut`
  handlers for any `Pressable` (scale-down on press, spring back on release).
- State-change animations fire from a `useEffect` keyed on the meaningful prop
  (e.g. star `selected`, `visited`, `onWishlist`).
- Triggers: **press** and **state change** only. No mount/appear animations.

## 3. Consuming sites

| File | Change | Animation |
| ---- | ------ | --------- |
| `src/ui/primitives/RatingStars.tsx` | ★/☆ → `Star` filled/outline | `pop` when a star becomes selected |
| `src/ui/screens/PlaceDetail.tsx` | wishlist ★/☆, visited ✓ → icons | `pop` on toggle |
| `src/ui/screens/PlaceDetailSheet.tsx` | ✕ → `X` icon | press animation |
| `src/ui/primitives/Header.tsx` | ← Back → `ArrowLeft` icon | press animation |
| `src/ui/screens/OnboardingScreen.tsx` | slide emoji → `Icon`; CTA → → `ArrowRight` | press animation on CTA |
| `src/ui/screens/AddPlaceScreen.tsx` | 📍 → `pin` icon | none (display) |
| `src/ui/primitives/EmptyState.tsx` | `icon` prop type `string` → `IconName`; static SVG | none (no interaction) |
| `src/ui/primitives/WeeklyRecapCard.tsx` | `★` stat → `Star` icon; ↑/↓ → `TrendingUp/Down` | none (display) |

## 4. Text-only carve-outs (SVG impossible — stays as glyph)

These render into plain text strings, not React components:

- `src/features/export/shot-card.ts` — `☕ DROP` and `★` written to a shared `.txt` file.
- `src/domain/dialing.ts`, `src/domain/ratio.ts`, `src/db/schema.ts`,
  `src/ui/primitives/CoachCard.tsx` — `→` / `—` inside prose sentences and code comments.

## 5. Testing

Respecting documented Jest/Expo gotchas:

- Add `react-native-svg` + `lucide-react-native` to `jest.config.js`
  `transformIgnorePatterns` allowlist. If render still fails, add a lightweight
  `__mocks__/react-native-svg.js` (View-based), matching the existing Skia/MapLibre
  mock pattern.
- Add Reanimated's jest mock to `jest.setup.ts` if animated components break under test.
- `RatingStars` keeps `testID="star-N"`; its test is unaffected.
- `shot-card` test unchanged (export keeps glyphs).
- Verification gates: `npm run typecheck` + full `npm test` (never `--passWithNoTests`).
- No `src/domain/**` files change → 100% domain coverage is unaffected.

## Out of scope

- SVG path-draw / morphing animations (transform/opacity springs only).
- Mount/appear animations.
- Replacing glyphs inside text strings, code comments, or the shared export `.txt`.
