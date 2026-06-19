# BuildView (logic-only MVP)

Construction-site web app — **logic phase only**. No styling, plain HTML
elements. Built per "BuildView MVP, logic spec v1".

## Run

```bash
cd buildview
npm install
npm run dev      # start dev server
npm run build    # production build
```

## Architecture

- **`src/data/db.js`** — the single data-access module (the "storage seam").
  Every read and write goes through here. No component touches `localStorage`
  directly. To move to a real database later, replace the `backend` object in
  this file; nothing else changes.
- **`src/lib/useDb.js`** — `useDbVersion()` hook: subscribes a component to the
  store so it re-renders on writes. Components read data via `db.*` in render.

## Status

Step 1 complete: project scaffolded + data-access module in place. Remaining
steps (login, Flow A–E) build on top of the seam.
