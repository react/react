# BuildView

Construction-site web app for tracking work across a project hierarchy
(project → building → floor → room → task, with photos and issues per task).
Built per "BuildView MVP, logic spec v1": a logic-first MVP, now with an
industrial-themed UI on top.

## Run

```bash
cd buildview
npm install
npm run dev      # start dev server
npm run build    # production build
npm run check    # headless flow checks + render smoke (no browser needed)
npm run shots    # build + capture real-browser screenshots to /tmp (puppeteer)
```

## Architecture

- **`src/data/db.js`** — the single data-access module (the "storage seam").
  Every read and write goes through here. No component touches `localStorage`
  directly. To move to a real database later, replace the `backend` object in
  this file; nothing else changes. Writes are atomic: a failed persist rolls
  the cache back and throws `StorageError`.
- **`src/lib/useDb.js`** — `useDbVersion()` hook: subscribes a component to the
  store so it re-renders on writes. Components read data via `db.*` in render.
- **`src/domain/`** — `constants.js` (enums), `entities.js` (typed creators +
  operations), `queries.js` (hierarchy + dashboard), `permissions.js` (the
  single section-3 permission rule). No storage access; all via the seam.

## Permission rule (section 3)

A worker sees tasks only in their **granted** rooms where the task trade matches
their trade **OR** they are personally assigned; pending membership sees
nothing. Workers act only on tasks they are assigned to; only the foreman
resolves issues. Enforced centrally in `src/domain/permissions.js`.

## Screens (section 5)

`src/screens/` — Login, ForemanProjectList, ForemanProjectView,
ForemanRoomView, ForemanPendingRequests, ForemanDashboard, WorkerHome
(join + my tasks), TaskDetail (shared task + issue view). Navigation is a
plain back-button stack in `App.jsx` (no router library).

## Design

Industrial/construction theme on Tailwind v4. Tokens live in `src/index.css`
(`@theme`): safety-amber accent, dark-steel chrome, status colors
(blue/green/grey) and hazard red. Reusable presentational primitives are in
`src/components/ui.jsx` (Button, Card, badges, form controls, Avatar, etc.) —
they hold no logic and touch no data.

## Verification

- `scripts/flows.mjs` — drives the real seam + domain modules in Node with a
  localStorage polyfill, running Flows A–E top to bottom. Each "reload" truly
  discards the in-memory cache and rebuilds it from storage, so persistence is
  genuinely exercised. Also covers edge cases: unknown/duplicate invites,
  unique invite codes, granted-with-no-rooms, room revocation, cross-project
  isolation, and storage-write failure rollback.
- `scripts/render-smoke.mjs` — server-renders every screen with seeded data to
  catch component runtime crashes; also checks the UI access guard.
- `scripts/shots.mjs` — renders each screen in headless Chromium with the
  compiled CSS and writes full-page PNGs (real-browser screenshots).

## Status

Logic phase complete (build order steps 1–9): all 5 flows run end to end and
survive reloads; permission rule holds; dashboard numbers match the data.
Design phase complete: industrial theme applied across all screens, plus an
accessibility/polish pass. Logic and the data seam were untouched by styling.

## Scope boundaries (deferred, per spec §6)

Fake login (no passwords), local persistence only (photos as base64 with a
2 MB guard), no real backend/auth, notifications, exports, offline mode, or
Hebrew/RTL — all intentionally out of scope for this phase.
