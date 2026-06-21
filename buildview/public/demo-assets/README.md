# BuildView demo assets

Curated, clearly-licensed files for demoing BuildView with realistic content.
Served statically from `buildview/public` → available in the app at
`/demo-assets/...`.

- **Licensing:** every file is public domain, Creative Commons (attributed), or
  our own. See `ASSETS_CREDITS.md`. Nothing license-unclear is included.
- **Index:** `manifest.json` lists each asset with path, type, license and a
  `safe` flag, so the app can reference assets by id.

## Folders
```
floor-plans/   demo-apartment.svg (ours), sample-floorplan.jpg (PD)
drawings/      habs-residence-floorplan.jpg (PD / HABS)
site-photos/   workers-on-site-mekis.jpg (CC BY 4.0), construction-site-ahsmann.jpg (CC BY-SA 3.0)
issue-photos/  sample-defect.svg (ours)
bim/           README.md (curated IFC sources; no binaries bundled yet)
```

## Suggested in-app use
- **Floor-plan preview / room map** → `floor-plans/demo-apartment.svg`
- **Plan / drawing attachment** → `drawings/habs-residence-floorplan.jpg`, `floor-plans/sample-floorplan.jpg`
- **Worker completion-photo demo** → `site-photos/*`
- **Issue evidence** → `issue-photos/sample-defect.svg` (or a real site photo)
- **Project report / investor view** → recent photos from `site-photos/`
