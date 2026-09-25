# drops. native (Kotlin Multiplatform) + sync server

The React Native app in `app/` and `src/` is being replaced by native apps.
The new code lives in Gradle modules at the repository root:

| Module | What | Targets |
| --- | --- | --- |
| `core/` | Models, domain logic (roast freshness, care plan, dial-in advice, palate profile, map projections), sync protocol | JVM, iOS |
| `data/` | SQLite (SQLDelight), `DropsRepository`, optional `SyncClient`, sample data | Android, JVM (tests), iOS (`DropsKit.framework`) |
| `androidApp/` | Jetpack Compose app (tabs: Heute, Bohnen, Karte with Anbauregion / Gekauft bei / Entdecken, Setup) | Android 8+ (API 26) |
| `server/` | Ktor sync server with optional accounts, SQLite | JVM 21, Docker |
| `iosApp/` | Placeholder for the SwiftUI app | iOS |

## Local-first, account optional

The app works fully offline without an account. Signing in (Setup → Konto) only
adds backup and sync between devices. On sign-in all local records are uploaded;
after that every change is pushed a few seconds later. Conflicts resolve with
last-write-wins on `updatedAt`. Deletions are synced as tombstones.

## Run locally

```bash
./gradlew :core:jvmTest :server:test :data:jvmTest   # all unit tests
./gradlew :androidApp:installDebug                    # needs Android SDK (local.properties: sdk.dir=…)
DATABASE_PATH=./drops.db BEHIND_PROXY=false ./gradlew :server:run
```

From the Android emulator the local server is reachable at `http://10.0.2.2:8080`
(plain HTTP is only accepted for localhost/emulator addresses).

## Server configuration

| Env | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `DATABASE_PATH` | `/data/drops.db` | SQLite file; mount `/data` as a persistent volume |
| `ALLOW_SIGNUP` | `true` | `false` closes registration (existing accounts keep working) |
| `AUTH_RATE_LIMIT_PER_MINUTE` | `10` | Login/register attempts per client IP |
| `BEHIND_PROXY` | `true` | Trust `X-Forwarded-For` from Coolify's proxy for rate limiting |

Endpoints: `GET /healthz`, `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/me`, `DELETE /api/me` (deletes account and
all server data), `POST /api/sync`.

## CI/CD

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | every PR and push to `main` | core + server tests, data tests, debug APK artifact |
| `deploy-server.yml` | push to `main` touching `core/`, `server/` or Gradle files | tests → Docker image `ghcr.io/<owner>/drops-server:latest` + `:sha-…` → Coolify redeploy webhook → waits for `/healthz` |
| `android-release.yml` | push to `main` touching app code, tags `v*` | tests → signed release APK + AAB (artifacts) → Play internal track (optional) → GitHub Release on tags |

### One-time setup

**Coolify**

1. New resource → *Docker Image* → `ghcr.io/robinrehbein/drops-server:latest`, port `8080`.
   If the package is private, add a GHCR registry credential (a GitHub token with `read:packages`) in Coolify.
2. Persistent storage: a volume mounted at `/data`.
3. Health check path `/healthz`, set a domain (e.g. `sync.example.com`) with HTTPS.
4. Webhooks / API: copy the deploy webhook URL of the resource and create an API token.

**GitHub → Settings → Secrets and variables → Actions** (environment `production`)

| Name | Kind | For |
| --- | --- | --- |
| `COOLIFY_WEBHOOK` | secret | Deploy webhook URL from Coolify |
| `COOLIFY_TOKEN` | secret | Coolify API token |
| `SYNC_URL` | variable | Public server URL, e.g. `https://sync.example.com` (health check + default in the app) |
| `ANDROID_KEYSTORE_BASE64` | secret | `base64 -w0 release.jks` |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | secrets | Signing |
| `PLAY_SERVICE_ACCOUNT_JSON` | secret, optional | Uploads the AAB to the Play internal track as a draft |

Without the Coolify secrets the image is still pushed and the deploy step is
skipped with a warning; without a keystore the release build is unsigned.

The Android `applicationId` stays `de.birneklub.drop`, so the native app can
replace the current store listing. That only works with the same upload key
that signed the existing app (Play App Signing).

## Open points

- iOS app (SwiftUI on top of `DropsKit`).
- Label scanning for new beans (CameraX + ML Kit text recognition on device).
- Café/roaster data and bean recommendations are example content; a data source is still to be chosen.
- Remove the React Native app once the native app covers its features.
