# BuildView (logic-only MVP)

Construction-site web app — **logic phase only**. No styling, plain HTML
elements. Built per "BuildView MVP, logic spec v1".

## Run

```bash
cd buildview
npm install
npm run dev      # start dev server
npm run build    # production build
npm run check    # headless flow checks + render smoke (no browser needed)
```

## Architecture

- **`src/data/db.js`** — the single data-access module (the "storage seam").
  Every read and write goes through here. No component touches `localStorage`
  directly. To move to a real database later, replace the `backend` object in
  this file; nothing else changes.
- **`src/lib/useDb.js`** — `useDbVersion()` hook: subscribes a component to the
  store so it re-renders on writes. Components read data via `db.*` in render.

## Screens (section 5)

`src/screens/` — Login, ForemanProjectList, ForemanProjectView,
ForemanRoomView, ForemanPendingRequests, ForemanDashboard, WorkerHome
(join + my tasks), TaskDetail (shared task + issue view). Navigation is a
plain back-button stack in `App.jsx` (no router library).

## Verification

- `scripts/flows.mjs` — drives the real seam + domain modules in Node with a
  localStorage polyfill, running Flows A–E top to bottom. Each "reload" truly
  discards the in-memory cache and rebuilds it from storage, so persistence is
  genuinely exercised. Also covers edge cases: unknown/duplicate invites,
  unique invite codes, granted-with-no-rooms, room revocation, cross-project
  isolation, and storage-write failure rollback (StorageError).
- `scripts/render-smoke.mjs` — bundles and server-renders every screen with
  seeded data to catch component runtime crashes; also checks the UI access
  guard.

## Status

Logic phase complete (build order steps 1–9). All 5 flows run end to end and
survive reloads; permission rule holds; dashboard numbers match the data; no
styling added. Stopped before design, as specified.
