# Cloud Sync + Tablet Design

**Date:** 2026-06-08  
**Status:** Approved (design)

## Goal

Add a paid Cloud Sync tier that keeps the app fully offline-first for everyone, and
introduce a tablet-optimized layout so the same product feels intentional on
larger screens.

## Product rules

- **Offline stays free forever.**
- **Cloud Sync is paid.**
- **Cloud Sync is optional.** No auth wall for local use.
- **Tablet support is part of the core app**, not a separate product.
- **Self-hosted sync is supported** on your Coolify VPS.

## Tier model

| Tier | Included |
|------|----------|
| Free | Local database, full offline use, export/backup, phone UI |
| Paid Cloud Sync | Cross-device sync, account/device pairing, restore on new phone/tablet, hosted sync endpoint |
| Tablet mode | Adaptive layout on tablets/large screens, available to all users |

## Cloud Sync design

### UX

- Settings gets a new **Cloud Sync** section.
- Free users see:
  - sync is locked
  - what sync does
  - a clear upgrade CTA
  - local/offline reassurance
- Paid users see:
  - sync status
  - last sync time
  - connected devices
  - server URL / connection state
  - manual sync trigger

### Sync model

Use the existing local-first schema as the source of truth:

- every mutable row already has stable IDs
- soft deletes already exist
- `created_at` / `updated_at` / `deleted_at` can drive delta sync

Recommended sync flow:

1. Device records local mutations into a change queue.
2. Client pushes pending changes to the VPS.
3. Server resolves conflicts with last-write-wins on `updated_at`, while keeping tombstones.
4. Server returns remote changes since the device’s last cursor.
5. Client applies remote changes locally and advances the cursor.

### Server on Coolify VPS

Keep the sync backend small and boring:

- HTTPS API
- Postgres for sync metadata, users, devices, cursors, entitlements
- optional object storage later for attachments
- webhook/admin path for subscription entitlement updates

### Paid access

The app should never guess entitlement locally.

- server issues a sync token after payment is confirmed
- client stores only the token/device secret
- if entitlement lapses, offline use continues, but sync pauses

### Conflict handling

Default policy:

- same row edited on two devices → latest `updated_at` wins
- delete beats update when delete is newer
- server keeps the winning row plus cursor history for audit/debug

If you want, this can later grow a field-level merge strategy for notes.

## Tablet design

### Breakpoints

- **Phone:** under 768px
- **Tablet:** 768px and up
- **Large tablet / landscape:** 1024px and up

### Layout principles

- Keep the same routes.
- Switch to split-pane or master-detail layouts on wider screens.
- Avoid modal-only navigation when the screen can show both list and detail.
- Preserve the current Earthy Forest visual language.

### Screen adaptations

| Screen | Phone | Tablet |
|--------|-------|--------|
| Daily | stacked cards | summary rail + detail rail |
| Library | list only | bean list left, bean detail right |
| Lab | single column | timer / controls / history in columns |
| Explore | current map-first flow | map + place list side-by-side |
| Settings | scroll sheet | settings list left, panel detail right |

### Tablet-specific Cloud Sync fit

Tablet makes sync more valuable, so the first-class use case is:

- start a brew on phone
- review/edit it later on tablet
- sync both devices through the paid cloud tier

## Suggested settings copy

- **Cloud Sync** — Sync your beans, sessions, and notes across devices.
- **Offline mode** — Always available. Your data stays on this device.
- **Tablet layout** — Optimized for larger screens.

## Implementation notes

- Add a small sync service module rather than baking network calls into UI.
- Keep sync transport separate from repository logic.
- Make the tablet layout responsive, not a separate app target.
- Update privacy/store copy to say the app is local-first with optional paid sync.

