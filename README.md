# Drops

A high-fidelity coffee brewing companion for specialty coffee enthusiasts. Local-first, privacy-respecting, designed around the daily ritual of pulling a clean espresso shot.

## Quick start

```bash
npm install
npm run db:prepare
npx expo start
```

## Scripts

- `npm test` — unit + DB + state-machine tests
- `npm run test:coverage` — coverage report (`src/domain/**` enforced at 100%)
- `npm run typecheck` — TypeScript strict check
- `npm run lint` — ESLint
- `npm run e2e:ios` / `npm run e2e:android` — Maestro flows (release build required)
- `npm run db:generate` — regenerate Drizzle migration from `src/db/schema.ts`
- `npm run db:bundle` — combine generated migrations into `src/db/migrations/bundle.json` for the runtime
- `npm run db:prepare` — `db:generate && db:bundle`

## Stack

Expo SDK 54 · Expo Router · TypeScript strict · Drizzle ORM + expo-sqlite · Zustand · TanStack Query · react-native-reanimated · @shopify/react-native-skia · zod · date-fns · react-i18next · @sentry/react-native · jest@^29 + @testing-library/react-native · Maestro.

## Design

See [`docs/superpowers/specs/2026-05-08-drop-design.md`](docs/superpowers/specs/2026-05-08-drop-design.md) for the v1 design spec, and [`docs/superpowers/plans/2026-05-08-drop-v1.md`](docs/superpowers/plans/2026-05-08-drop-v1.md) for the implementation plan.
