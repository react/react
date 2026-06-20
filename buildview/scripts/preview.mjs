// Build a standalone, openable HTML preview of a styled screen:
// server-render it and inline the compiled Tailwind CSS from the last build.
//
//   npm run build && node scripts/preview.mjs
//
// Writes /tmp/buildview-preview.html
import {build} from 'esbuild';
import {
  writeFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// 1. Render the entry to an HTML string (localStorage polyfilled, like smoke).
const result = await build({
  entryPoints: ['scripts/_preview_entry.jsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  jsx: 'automatic',
  banner: {
    js: `
      const __store = {};
      globalThis.localStorage = {
        getItem: k => (k in __store ? __store[k] : null),
        setItem: (k, v) => { __store[k] = String(v); },
        removeItem: k => { delete __store[k]; },
      };
    `,
  },
});

const dir = mkdtempSync(join(tmpdir(), 'bv-preview-'));
const outFile = join(dir, 'bundle.cjs');
writeFileSync(outFile, result.outputFiles[0].text);
await import(pathToFileURL(outFile).href);
const bodyHtml = globalThis.__PREVIEW_HTML;

// 2. Grab the compiled Tailwind CSS produced by `vite build`.
const assetsDir = 'dist/assets';
const cssName = readdirSync(assetsDir).find(f => f.endsWith('.css'));
if (!cssName) {
  console.error('No CSS found in dist/assets. Run `npm run build` first.');
  process.exit(1);
}
const css = readFileSync(join(assetsDir, cssName), 'utf8');

// 3. Compose a standalone HTML document.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BuildView — Task Detail preview</title>
<style>${css}</style>
</head>
<body>${bodyHtml}</body>
</html>`;

const target = '/tmp/buildview-preview.html';
writeFileSync(target, html);
console.log('Wrote', target);
