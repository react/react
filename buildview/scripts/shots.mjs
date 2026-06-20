// Capture real-browser screenshots of every BuildView screen.
// SSRs each screen (real components), inlines the compiled Tailwind CSS, loads
// it in headless Chromium, and writes a full-page PNG per screen to /tmp.
//
//   npm run build && node scripts/shots.mjs
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {
  writeFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

// 1. Bundle + run the SSR entry to get per-screen HTML.
const result = await build({
  entryPoints: ['scripts/_shot_entry.jsx'],
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
const dir = mkdtempSync(join(tmpdir(), 'bv-shots-'));
const outFile = join(dir, 'bundle.cjs');
writeFileSync(outFile, result.outputFiles[0].text);
await import(pathToFileURL(outFile).href);
const screens = globalThis.__SCREENS;

// 2. Grab the compiled Tailwind CSS from the last `vite build`.
const cssName = readdirSync('dist/assets').find(f => f.endsWith('.css'));
if (!cssName) {
  console.error('No CSS in dist/assets — run `npm run build` first.');
  process.exit(1);
}
const css = readFileSync(join('dist/assets', cssName), 'utf8');

const doc = body => `<!doctype html><html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${css}</style></head><body>${body}</body></html>`;

// 3. Screenshot each screen at a phone-ish width (the primary on-site device).
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({width: 480, height: 900, deviceScaleFactor: 2});

const outDir = '/tmp';
for (const s of screens) {
  await page.setContent(doc(s.html), {waitUntil: 'domcontentloaded'});
  const path = join(outDir, `bv-${s.slug}.png`);
  await page.screenshot({path, fullPage: true});
  console.log('shot', path);
}

await browser.close();
console.log('done');
