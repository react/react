'use strict';

// Benchmarks the Flight server render of real captured payloads (see
// payloads/). Measures the bytes path only: revive a fresh model (the
// app's data + element creation, as a server would per request), render
// through renderToPipeableStream, drain to a null sink.
//
// Run from the fixture directory against the copied prod builds:
//   node --conditions react-server --expose-gc real/real-bench.js [name ...]
//
// Names default to all payloads. ITER=n to override iterations.

if (process.env.NODE_ENV !== 'production') {
  console.error(
    'Run with NODE_ENV=production: the dev build adds debug rows that ' +
      'triple the payload.'
  );
  process.exit(1);
}

const path = require('path');
const v8 = require('v8');
const fs = require('fs');
const {Writable} = require('stream');
const ReactServer = require('react');
const {
  renderToPipeableStream,
  registerClientReference,
  registerServerReference,
} = require('react-server-dom-webpack/server');
const {loadPayload} = require('./revive');

const PAYLOAD_DIR = path.join(__dirname, 'payloads');
const names =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : fs
        .readdirSync(PAYLOAD_DIR)
        .filter(f => f.endsWith('.html'))
        .map(f => f.replace(/\.html$/, ''));
const ITER = Number(process.env.ITER || 100);

function nullSink(onDone, onErr) {
  const sink = new Writable({
    write(c, e, cb) {
      this.bytes = (this.bytes || 0) + c.length;
      cb();
    },
  });
  sink.on('finish', () => onDone(sink.bytes || 0));
  sink.on('error', onErr);
  return sink;
}

function renderOnce(model, manifest, errors) {
  return new Promise((resolve, reject) => {
    const {pipe} = renderToPipeableStream(model, manifest, {
      onError(e) {
        errors.push(String((e && e.message) || e));
      },
    });
    pipe(nullSink(resolve, reject));
  });
}

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function benchPayload(name) {
  const file = path.join(PAYLOAD_DIR, name + '.html');
  const payload = loadPayload(
    file,
    ReactServer,
    registerClientReference,
    registerServerReference
  );
  const errors = [];

  // Warmup + sanity.
  let bytes = 0;
  for (let i = 0; i < 10; i++) {
    bytes = await renderOnce(payload.revive(), payload.clientManifest, errors);
  }
  const warmupErrors = errors.length / 10;

  const times = [];
  if (global.gc) global.gc();
  const gcProfiler = new v8.GCProfiler();
  gcProfiler.start();

  const runErrors = [];
  for (let i = 0; i < ITER; i++) {
    const t0 = performance.now();
    await renderOnce(payload.revive(), payload.clientManifest, runErrors);
    times.push(performance.now() - t0);
  }
  const gcStats = gcProfiler.stop().statistics;
  const gcCount = gcStats.length;
  const gcMajor = gcStats.filter(e => e.gcType !== 'Scavenge').length;
  const gcTime = gcStats.reduce((a, e) => a + e.cost, 0) / 1000;

  times.sort((a, b) => a - b);
  const s = payload.stats;
  const per = n => (n / s.renders).toFixed(1);
  console.log(
    name.padEnd(16) +
      ' p50 ' +
      pct(times, 0.5).toFixed(2) +
      'ms' +
      '  p95 ' +
      pct(times, 0.95).toFixed(2) +
      'ms' +
      '  p99 ' +
      pct(times, 0.99).toFixed(2) +
      'ms' +
      '  out ' +
      (bytes / 1024).toFixed(0) +
      'KB' +
      '  gc ' +
      gcCount +
      '/' +
      gcTime.toFixed(0) +
      'ms (' +
      gcMajor +
      ' major)' +
      '  err/iter ' +
      (runErrors.length / ITER).toFixed(1)
  );
  console.log(
    ''.padEnd(16) +
      ' rows ' +
      payload.rowCount +
      '  per render: holes ' +
      per(s.holes) +
      '  streams ' +
      per(s.streams) +
      '  serverRefs ' +
      per(s.serverRefs) +
      '  unknown ' +
      per(s.unknown) +
      (warmupErrors
        ? '  (first errors: ' +
          errors.slice(0, 2).join(' | ').slice(0, 120) +
          ')'
        : '')
  );
}

(async () => {
  console.log(
    'node ' +
      process.version +
      ', iterations ' +
      ITER +
      (global.gc ? '' : ' (run with --expose-gc for clean GC baselines)')
  );
  for (const name of names) {
    await benchPayload(name);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
