// Bundle the JSX smoke entry with esbuild and run it under Node with a
// localStorage polyfill, so we can server-render every screen and catch
// component runtime crashes that a production build can't.
//
//   node scripts/render-smoke.mjs
import {build} from 'esbuild';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const result = await build({
  entryPoints: ['scripts/_smoke_entry.jsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  jsx: 'automatic',
  // Provide a localStorage polyfill before any bundled module runs.
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

const dir = mkdtempSync(join(tmpdir(), 'bv-smoke-'));
const outFile = join(dir, 'bundle.cjs');
writeFileSync(outFile, result.outputFiles[0].text);
await import(pathToFileURL(outFile).href);
