# Drops — Release Runbook

Goal: ship **Drops** to the **Google Play closed testing ("alpha") track** and **App Store Connect TestFlight** for a closed group of invited testers.

App identity: package `de.birneklub.drop`, Expo owner `birneklub`,
EAS projectId `c4d1539b-70ea-4412-8ea0-d3fbbdb99900`.

---

## Version history

| Version | Key changes |
|---------|-------------|
| 0.2.0   | Paid Cloud Sync (self-hosted Coolify VPS), tablet split-pane layout, NavRail sidebar, two-column Daily tab, `supportsTablet: true` |
| 0.1.0   | Initial closed alpha — brew lab, bean library, explore map, care/maintenance |

---

## 0. One-time prerequisites (you must do these)

1. **Google Play Developer account** — $25 one-time. https://play.google.com/console
2. **Expo account** with access to the `birneklub` project. Log in locally:
   ```bash
   npm i -g eas-cli        # or use: npx eas-cli@latest …
   eas login               # interactive — needs your Expo credentials
   eas whoami              # confirm you're on the birneklub account
   ```
3. **Sentry sourcemap upload — already disabled for the alpha.** `eas.json`
   `build.production.env` now sets `SENTRY_DISABLE_AUTO_UPLOAD=true` (there were no
   Sentry secrets on the EAS project, so an upload would have failed the build).
   Crash reporting still works; only sourcemap upload is skipped (stack traces are
   less symbolicated). To re-enable later, set it back to `"false"` and add secrets:
   ```bash
   eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
   eas secret:create --scope project --name SENTRY_ORG --value <org-slug>
   eas secret:create --scope project --name SENTRY_PROJECT --value <project-slug>
   ```

---

## 1. Build for both platforms

```bash
# Build Android (AAB) and iOS (IPA) in parallel
eas build --platform all --profile production
```

- **Android**: outputs AAB (`buildType: app-bundle`). `autoIncrement: true` bumps versionCode automatically.
- **iOS**: outputs `.ipa` at `build/Drops.ipa`. Credentials sourced from EAS remote (`credentialsSource: remote`).
- On first run EAS offers to generate/store the Android keystore — accept it.
- When builds finish, EAS gives you build URLs + downloadable artifacts.

Smoke-test first (optional but recommended):
```bash
eas build --platform all --profile preview   # APK + ad-hoc IPA, no store upload
```

> **Tablet note (v0.2.0+):** `supportsTablet: true` is now set and `orientation: "default"` 
> allows rotation. The first build after this change will mark the iOS binary as 
> iPad-compatible. Verify the tablet layout on an iPad simulator before submitting.

---

## 2. Create the app in Play Console (manual, web UI)

In https://play.google.com/console → **Create app**:
- App name: **Drops**, default language, type **App**, **Free**.
- Then complete the required "Set up your app" items (all gate a closed test going live):
  - **App access** (any login required? no → all functionality available).
  - **Content rating** (IARC questionnaire).
  - **Target audience & content** (age groups).
  - **Data safety** — DISCLOSE: **Location** (used to find nearby coffee; not shared),
    **Crash logs / diagnostics** (via Sentry), and (if Cloud Sync is offered)
    **User-generated content / brew data** (synced to user's own server — not collected
    by the developer). Be accurate here; Cloud Sync data goes to the user's own
    Coolify VPS, not to any third party.
  - **Privacy policy URL** — REQUIRED. You need a hosted privacy policy that covers
    location use and Sentry crash/telemetry.
  - **Store listing** — short + full description, app icon (512×512), feature graphic
    (1024×500), and ≥ 2 phone screenshots.

---

## 3. Create a service account for `eas submit`

`eas.json` → `submit.production.android` expects a key at
`./.eas/play-service-account.json` (this path is gitignored — never commit it).

1. Google Cloud Console → the project linked to your Play account → **IAM & Admin →
   Service Accounts** → create one → create a **JSON key** → download it.
2. Play Console → **Users and permissions** (or Setup → API access) → grant that
   service account access with permission to **manage releases**.
3. Save the JSON to `./.eas/play-service-account.json` in this repo.

> First upload caveat: Play sometimes requires the very first AAB to be uploaded
> through the web UI to establish the app. If `eas submit` rejects the first upload,
> upload the `.aab` from step 1 manually once, then use `eas submit` thereafter.

---

## 4. Submit to the closed alpha track

```bash
eas submit --platform android --profile production
```
- Submits the latest build to the **`alpha`** (closed testing) track —
  `eas.json` is already set to `track: "alpha"`.
- `changesNotSentForReview: false` → the release is sent for Google review.

---

## 5. Configure the closed test & invite testers (manual, web UI)

Play Console → **Testing → Closed testing** → the **Alpha** track:
1. **Testers** tab → create/select an email list or link a **Google Group** of testers.
2. **Releases** → your submitted build appears → **Create release** → review → **Roll out**.
3. Google reviews the first closed release (typically hours, up to a couple of days).
4. Once live, copy the **opt-in URL** (or "Copy link") and send it to your testers —
   they tap it, accept, and install Drops from Play.

> New developer accounts: Google's "12 testers for 14 days" rule gates applying for
> **production** access — it does **not** block running this closed alpha.

---

## Pre-flight checklist

- [ ] Expo logged in (`eas whoami` = birneklub)
- [ ] Sentry upload resolved (disabled for alpha, or secrets set) — else the build fails
- [ ] `eas build -p android --profile production` succeeded (have the `.aab`)
- [ ] Play app created; data safety + privacy policy + content rating + listing done
- [ ] `./.eas/play-service-account.json` in place with release permission
- [ ] `eas submit -p android --profile production` succeeded
- [ ] Closed "Alpha" track has testers + a rolled-out release
- [ ] Opt-in URL shared

## Notes / risks
- **Native modules:** this build includes `react-native-svg`, MapLibre, Skia,
  Reanimated, SQLite — all config-plugin/autolinked, so a clean EAS production build
  picks them up. (The icons need a native build, which this is.)
- **Place images:** the seed hotlinks ~390 third-party images. Exposure is limited for
  a closed alpha, but resolve licensing / self-host before any public/production release.
