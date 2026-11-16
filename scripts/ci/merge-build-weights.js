#!/usr/bin/env node

'use strict';

// Combines the per-worker shard timings of the current run
// (build/__shard_timings__/*.json, written by scripts/rollup/build.js) into
// build-weights.json, which the workflow then saves back to the actions
// cache. The previous weights (restored to build-weights.json by the
// workflow) are only used to log a diff for variance monitoring; the new
// measurement is always written verbatim so that removed bundles drop out
// instead of accumulating. If the logged variance turns out to be too high
// for stable shards, weights should be aggregated across the last N runs
// instead. Weights feed scripts/rollup/sharding.js. This script never fails:
// the weights are an optimization, so a broken update must not break
// artifact processing.

const fs = require('fs');

const TIMINGS_DIR = 'build/__shard_timings__';
// The workflow restores the previous weights to OUT_PATH itself, so this
// script reads them from there before overwriting with the new measurement.
const OUT_PATH = 'build-weights.json';

function logDiff(fresh, previous) {
  const deltas = [];
  Object.keys(fresh).forEach(key => {
    if (previous[key] !== undefined) {
      deltas.push({key, delta: fresh[key] - previous[key]});
    }
  });
  if (deltas.length === 0) {
    return;
  }
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const absDeltas = deltas
    .map(entry => Math.abs(entry.delta))
    .sort((a, b) => a - b);
  const mean =
    absDeltas.reduce((sum, delta) => sum + delta, 0) / absDeltas.length;
  const p95 = absDeltas[Math.floor(absDeltas.length * 0.95)];
  console.log(
    `Weight changes vs the previous run: mean |delta| = ${mean.toFixed(2)}s, ` +
      `p95 = ${p95.toFixed(1)}s across ${deltas.length} bundles. ` +
      'High variance here means shards should be determined from multiple runs.'
  );
  console.log('Largest changes:');
  deltas.slice(0, 10).forEach(entry => {
    console.log(
      `  ${entry.delta >= 0 ? '+' : ''}${entry.delta.toFixed(1)}s ${entry.key}`
    );
  });
}

function main() {
  const fresh = {};
  const files = fs
    .readdirSync(TIMINGS_DIR)
    .filter(name => name.endsWith('.json'));
  files.forEach(name => {
    const timings = JSON.parse(
      fs.readFileSync(TIMINGS_DIR + '/' + name, 'utf8')
    );
    Object.keys(timings).forEach(key => {
      fresh[key] = timings[key];
    });
  });
  const freshKeys = Object.keys(fresh);
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')).weights;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Expected before the first weights have ever been saved.
    console.log('No previous weights found, skipping the diff.');
  }
  logDiff(fresh, previous);
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({version: 1, weights: fresh}, null, 2) + '\n'
  );
  console.log(`Wrote ${freshKeys.length} weights to ${OUT_PATH}.`);
}

try {
  main();
} catch (error) {
  console.log(
    'Could not update build shard weights, keeping the previous ones.',
    error
  );
  // The restored previous weights may still sit at OUT_PATH; delete them so
  // the save step cannot republish data this run did not produce.
  fs.rmSync(OUT_PATH, {force: true});
}
