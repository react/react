'use strict';

const fs = require('fs');

function readWeights() {
  const weightsPath = process.env.BUILD_SHARD_WEIGHTS;
  if (!weightsPath) {
    return null;
  }
  let weights;
  try {
    weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8')).weights;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Expected before the first weights have ever been saved.
      console.log('No build shard weights found, using round-robin sharding.');
      return null;
    }
    throw error;
  }
  if (weights === null || typeof weights !== 'object') {
    return null;
  }
  return weights;
}

// Persists the durations this worker measured so that
// process_artifacts_combined can merge them into the shared weights cache.
// No-op outside sharded CI builds.
function writeShardTimings(timings) {
  const nodeIndex = process.env.CI_INDEX;
  if (!process.env.CI_TOTAL || !nodeIndex) {
    return;
  }
  const dir = 'build/__shard_timings__';
  fs.mkdirSync(dir, {recursive: true});
  const result = {};
  timings.forEach(timing => {
    result[timing.key] = Math.round(timing.seconds * 10) / 10;
  });
  fs.writeFileSync(
    dir + '/' + nodeIndex + '-' + process.env.RELEASE_CHANNEL + '.json',
    JSON.stringify(result)
  );
}

// Assigns work items to CI workers. With measured per-item durations (see
// scripts/ci/merge-build-weights.js), items are assigned longest-first to
// the currently least-loaded worker so that workers finish around the same
// time. Every worker computes the full assignment and then picks its own
// bin, so the ordering below must stay deterministic. Without weights we
// fall back to round-robin.
function selectShard(items, keyFn, nodeTotal, nodeIndex) {
  const weights = readWeights();
  const weightedKeys = weights === null ? [] : Object.keys(weights);
  if (weightedKeys.length === 0) {
    return items.filter((_, i) => i % nodeTotal === nodeIndex);
  }
  const keys = items.map(keyFn);
  const sortedWeights = weightedKeys
    .map(key => weights[key])
    .sort((a, b) => a - b);
  const defaultWeight = sortedWeights[Math.floor(sortedWeights.length / 2)];
  const weightOf = index => {
    const weight = weights[keys[index]];
    return weight === undefined ? defaultWeight : weight;
  };
  const order = items
    .map((_, i) => i)
    .sort((a, b) => {
      const delta = weightOf(b) - weightOf(a);
      if (delta !== 0) {
        return delta;
      }
      if (keys[a] !== keys[b]) {
        return keys[a] < keys[b] ? -1 : 1;
      }
      return a - b;
    });
  const bins = [];
  for (let i = 0; i < nodeTotal; i++) {
    bins.push({load: 0, indices: []});
  }
  order.forEach(i => {
    // The first bin wins ties so that the assignment stays deterministic.
    let target = bins[0];
    for (let j = 1; j < bins.length; j++) {
      if (bins[j].load < target.load) {
        target = bins[j];
      }
    }
    target.load += weightOf(i);
    target.indices.push(i);
  });
  const shard = bins[nodeIndex].indices.sort((a, b) => a - b);
  console.log(
    `Sharding by measured build time: worker ${nodeIndex + 1}/${nodeTotal} ` +
      `builds ${shard.length} of ${items.length} bundles ` +
      `(~${Math.round(bins[nodeIndex].load)}s of rollup time).`
  );
  return shard.map(i => items[i]);
}

module.exports = {selectShard, writeShardTimings};
