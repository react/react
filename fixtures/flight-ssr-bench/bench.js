'use strict';

require('@babel/register')({
  presets: [['@babel/preset-react', {runtime: 'automatic'}]],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
  only: [/\/src\//],
});

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const inspector = require('node:inspector');

const {clientManifest, ssrManifest} = require('./webpack-mock');

const PROFILE_MODE = process.argv.includes('--profile');
const CONCURRENT_MODE = process.argv.includes('--concurrent');
const INJECT = !process.argv.includes('--no-injection');

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build() {
  const config = require('./webpack.config');
  return new Promise(function (resolve, reject) {
    webpack(config, function (err, stats) {
      if (err) {
        reject(err);
        return;
      }
      if (stats.hasErrors()) {
        reject(new Error(stats.toString({errors: true})));
        return;
      }
      console.log(
        stats.toString({colors: true, modules: false, entrypoints: false})
      );
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

const {
  renderFizzNode: renderFizzNodeStream,
  renderFizzEdge: renderFizzEdgeStream,
  renderFlightFizzNode: renderFlightFizzNodeStream,
  renderFlightFizzEdge: renderFlightFizzEdgeStream,
  nodeStreamToString,
  webStreamToString,
} = require('./render-helpers');
const {printGrid} = require('./print-helpers');

function renderFizzNode(AppComponent, itemCount) {
  return nodeStreamToString(renderFizzNodeStream(AppComponent, itemCount));
}

function renderFizzEdge(AppComponent, itemCount) {
  return renderFizzEdgeStream(AppComponent, itemCount).then(webStreamToString);
}

function renderFlightFizzNode(renderRSCNode, AppComponent, itemCount) {
  return nodeStreamToString(
    renderFlightFizzNodeStream(
      renderRSCNode,
      AppComponent,
      itemCount,
      clientManifest,
      ssrManifest,
      {inject: INJECT}
    )
  );
}

function renderFlightFizzEdge(renderRSCEdge, AppComponent, itemCount) {
  return renderFlightFizzEdgeStream(
    renderRSCEdge,
    AppComponent,
    itemCount,
    clientManifest,
    ssrManifest,
    {inject: INJECT}
  ).then(webStreamToString);
}

// ---------------------------------------------------------------------------
// Benchmarking
// ---------------------------------------------------------------------------

const canGC = typeof globalThis.gc === 'function';

async function runBenchmark(name, fn, iterations, warmup) {
  if (canGC) globalThis.gc();

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Collect GC pauses during timed iterations.
  let gcCount = 0;
  let gcTotalMs = 0;
  const gcObs = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      gcCount++;
      gcTotalMs += entry.duration;
    }
  });
  gcObs.observe({entryTypes: ['gc']});

  // Timed iterations
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  gcObs.disconnect();

  // Trim top/bottom 5% to remove outliers
  const sorted = [...times].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.05);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  const mean = trimmed.reduce((s, t) => s + t, 0) / trimmed.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const stddev = Math.sqrt(
    trimmed.reduce((s, t) => s + (t - mean) ** 2, 0) / trimmed.length
  );
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    name,
    mean,
    median,
    stddev,
    p95,
    min,
    max,
    iterations,
    gcCount,
    gcTotalMs,
  };
}

function printResult(result) {
  console.log('  %s:', result.name);
  console.log('    Mean:   %s ms', result.mean.toFixed(2));
  console.log('    Median: %s ms', result.median.toFixed(2));
  console.log('    Stddev: %s ms', result.stddev.toFixed(2));
  console.log('    P95:    %s ms', result.p95.toFixed(2));
  console.log('    Min:    %s ms', result.min.toFixed(2));
  console.log('    Max:    %s ms', result.max.toFixed(2));
  console.log(
    '    GC:     %d pauses, %s ms total (%s ms/iter)',
    result.gcCount,
    result.gcTotalMs.toFixed(1),
    (result.gcTotalMs / result.iterations).toFixed(2)
  );
}

async function runConcurrent(name, fn, total, concurrency, warmup) {
  if (canGC) globalThis.gc();

  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  let gcCount = 0;
  let gcTotalMs = 0;
  const gcObs = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      gcCount++;
      gcTotalMs += entry.duration;
    }
  });
  gcObs.observe({entryTypes: ['gc']});

  const latencies = new Array(total);
  let completed = 0;
  let launched = 0;

  const start = performance.now();
  await new Promise(resolve => {
    function launch() {
      while (launched < total && launched - completed < concurrency) {
        const idx = launched++;
        const t0 = performance.now();
        fn().then(() => {
          latencies[idx] = performance.now() - t0;
          completed++;
          if (completed === total) {
            resolve();
          } else {
            launch();
          }
        });
      }
    }
    launch();
  });
  const elapsed = performance.now() - start;
  gcObs.disconnect();

  const sorted = [...latencies].sort((a, b) => a - b);
  const mean = sorted.reduce((s, t) => s + t, 0) / sorted.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return {
    name,
    reqPerSec: (total / elapsed) * 1000,
    mean,
    p95,
    total,
    concurrency,
    gcCount,
    gcTotalMs,
  };
}

function printConcurrentResult(result) {
  console.log('  %s:', result.name);
  console.log('    Req/s:  %s', result.reqPerSec.toFixed(1));
  console.log('    Mean:   %s ms', result.mean.toFixed(2));
  console.log('    P95:    %s ms', result.p95.toFixed(2));
  console.log(
    '    GC:     %d pauses, %s ms total (%s ms/req)',
    result.gcCount,
    result.gcTotalMs.toFixed(1),
    (result.gcTotalMs / result.total).toFixed(2)
  );
}

// ---------------------------------------------------------------------------
// CPU Profiling
// ---------------------------------------------------------------------------

function startProfiler() {
  const session = new inspector.Session();
  session.connect();
  return new Promise(function (resolve, reject) {
    session.post('Profiler.enable', function (err) {
      if (err) {
        reject(err);
        return;
      }
      session.post('Profiler.start', function (err2) {
        if (err2) {
          reject(err2);
          return;
        }
        resolve(session);
      });
    });
  });
}

function stopProfiler(session, outputPath) {
  return new Promise(function (resolve, reject) {
    session.post('Profiler.stop', function (err, {profile}) {
      if (err) {
        reject(err);
        return;
      }
      fs.mkdirSync(path.dirname(outputPath), {recursive: true});
      fs.writeFileSync(outputPath, JSON.stringify(profile));
      session.post('Profiler.disable');
      session.disconnect();
      resolve(profile);
    });
  });
}

function printTopFunctions(profile, topN) {
  // Aggregate self-time per function from the profile nodes.
  const selfTimes = new Map();
  for (const node of profile.nodes) {
    const name = node.callFrame.functionName || '(anonymous)';
    const loc = node.callFrame.url
      ? node.callFrame.url.replace(/.*\//, '') + ':' + node.callFrame.lineNumber
      : '(native)';
    const key = name + ' @ ' + loc;
    const hitCount = node.hitCount || 0;
    selfTimes.set(key, (selfTimes.get(key) || 0) + hitCount);
  }

  const sorted = [...selfTimes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  const totalSamples = profile.nodes.reduce((s, n) => s + (n.hitCount || 0), 0);

  console.log('    Top %d functions by self-time:', topN);
  for (const [key, hits] of sorted) {
    const pct = ((hits / totalSamples) * 100).toFixed(1);
    console.log('      %s%% - %s', pct, key);
  }
}

async function profileRun(name, fn, warmup, iterations, outputPath) {
  // Warmup (unprofiled)
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Collect GC pauses during the profiled run.
  let gcCount = 0;
  let gcTotalMs = 0;
  const gcObs = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      gcCount++;
      gcTotalMs += entry.duration;
    }
  });
  gcObs.observe({entryTypes: ['gc']});

  // Profiled run
  const session = await startProfiler();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const profile = await stopProfiler(session, outputPath);
  gcObs.disconnect();

  console.log('  %s → %s', name, outputPath);
  printTopFunctions(profile, 10);
  console.log(
    '    GC: %d pauses, %s ms total (%s ms/iter)',
    gcCount,
    gcTotalMs.toFixed(1),
    (gcTotalMs / iterations).toFixed(2)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Building RSC bundle...\n');
  await build();

  const {
    renderRSCNode,
    renderRSCEdge,
    App: RSCApp,
    AppAsync: RSCAppAsync,
  } = require('./build/rsc-bundle.js');
  const App = require('./src/App.js').default;
  const AppAsync = require('./src/AppAsync.js').default;

  const ITEM_COUNT = 200;

  const WARMUP = 50;
  const ITERATIONS = 1000;
  const PROFILE_WARMUP = 50;
  const PROFILE_ITERATIONS = 500;

  // --- Verify renders ---
  console.log('\n--- Verifying renders ---\n');

  const fizzNodeHtml = await renderFizzNode(App, ITEM_COUNT);
  console.log('Fizz (Node, sync):          %d bytes', fizzNodeHtml.length);

  const flightFizzNodeHtml = await renderFlightFizzNode(
    renderRSCNode,
    RSCApp,
    ITEM_COUNT
  );
  console.log(
    'Flight + Fizz (Node, sync): %d bytes',
    flightFizzNodeHtml.length
  );

  const fizzNodeAsyncHtml = await renderFizzNode(AppAsync, ITEM_COUNT);
  console.log('Fizz (Node, async):         %d bytes', fizzNodeAsyncHtml.length);

  const flightFizzNodeAsyncHtml = await renderFlightFizzNode(
    renderRSCNode,
    RSCAppAsync,
    ITEM_COUNT
  );
  console.log(
    'Flight + Fizz (Node, async):%d bytes',
    flightFizzNodeAsyncHtml.length
  );

  const fizzEdgeHtml = await renderFizzEdge(App, ITEM_COUNT);
  console.log('Fizz (Edge, sync):          %d bytes', fizzEdgeHtml.length);

  const fizzEdgeAsyncHtml = await renderFizzEdge(AppAsync, ITEM_COUNT);
  console.log('Fizz (Edge, async):         %d bytes', fizzEdgeAsyncHtml.length);

  const flightFizzEdgeHtml = await renderFlightFizzEdge(
    renderRSCEdge,
    RSCApp,
    ITEM_COUNT
  );
  console.log(
    'Flight + Fizz (Edge, sync): %d bytes',
    flightFizzEdgeHtml.length
  );

  const flightFizzEdgeAsyncHtml = await renderFlightFizzEdge(
    renderRSCEdge,
    RSCAppAsync,
    ITEM_COUNT
  );
  console.log(
    'Flight + Fizz (Edge, async):%d bytes',
    flightFizzEdgeAsyncHtml.length
  );

  // --- CPU Profiling ---
  if (PROFILE_MODE) {
    console.log(
      '\n--- CPU Profiling (%d warmup, %d iterations) ---\n',
      PROFILE_WARMUP,
      PROFILE_ITERATIONS
    );

    const profileDir = path.resolve(__dirname, 'build/profiles');

    await profileRun(
      'Fizz (Node, sync)',
      () => renderFizzNode(App, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'fizz-node-sync.cpuprofile')
    );

    await profileRun(
      'Flight + Fizz (Node, sync)',
      () => renderFlightFizzNode(renderRSCNode, RSCApp, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'flight-fizz-node-sync.cpuprofile')
    );

    await profileRun(
      'Fizz (Node, async)',
      () => renderFizzNode(AppAsync, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'fizz-node-async.cpuprofile')
    );

    await profileRun(
      'Flight + Fizz (Node, async)',
      () => renderFlightFizzNode(renderRSCNode, RSCAppAsync, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'flight-fizz-node-async.cpuprofile')
    );

    await profileRun(
      'Fizz (Edge, sync)',
      () => renderFizzEdge(App, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'fizz-edge-sync.cpuprofile')
    );

    await profileRun(
      'Flight + Fizz (Edge, sync)',
      () => renderFlightFizzEdge(renderRSCEdge, RSCApp, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'flight-fizz-edge-sync.cpuprofile')
    );

    await profileRun(
      'Fizz (Edge, async)',
      () => renderFizzEdge(AppAsync, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'fizz-edge-async.cpuprofile')
    );

    await profileRun(
      'Flight + Fizz (Edge, async)',
      () => renderFlightFizzEdge(renderRSCEdge, RSCAppAsync, ITEM_COUNT),
      PROFILE_WARMUP,
      PROFILE_ITERATIONS,
      path.join(profileDir, 'flight-fizz-edge-async.cpuprofile')
    );

    console.log(
      '\nProfiles saved to build/profiles/. Open in Chrome DevTools or speedscope.app.'
    );

    return;
  }

  // --- Concurrent Benchmark ---
  if (CONCURRENT_MODE) {
    const CONCURRENCY = 50;
    const TOTAL = 1000;
    const CONC_WARMUP = 20;

    console.log(
      '\n--- Concurrent Benchmark (%d warmup, %d concurrency, %d requests, %d items) ---\n',
      CONC_WARMUP,
      CONCURRENCY,
      TOTAL,
      ITEM_COUNT
    );

    const fizzNodeSync = await runConcurrent(
      'Fizz (Node, sync)',
      () => renderFizzNode(App, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(fizzNodeSync);

    const flightFizzNodeSync = await runConcurrent(
      'Flight + Fizz (Node, sync)',
      () => renderFlightFizzNode(renderRSCNode, RSCApp, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(flightFizzNodeSync);

    const fizzNodeAsync = await runConcurrent(
      'Fizz (Node, async)',
      () => renderFizzNode(AppAsync, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(fizzNodeAsync);

    const flightFizzNodeAsync = await runConcurrent(
      'Flight + Fizz (Node, async)',
      () => renderFlightFizzNode(renderRSCNode, RSCAppAsync, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(flightFizzNodeAsync);

    const fizzEdgeSync = await runConcurrent(
      'Fizz (Edge, sync)',
      () => renderFizzEdge(App, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(fizzEdgeSync);

    const flightFizzEdgeSync = await runConcurrent(
      'Flight + Fizz (Edge, sync)',
      () => renderFlightFizzEdge(renderRSCEdge, RSCApp, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(flightFizzEdgeSync);

    const fizzEdgeAsync = await runConcurrent(
      'Fizz (Edge, async)',
      () => renderFizzEdge(AppAsync, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(fizzEdgeAsync);

    const flightFizzEdgeAsync = await runConcurrent(
      'Flight + Fizz (Edge, async)',
      () => renderFlightFizzEdge(renderRSCEdge, RSCAppAsync, ITEM_COUNT),
      TOTAL,
      CONCURRENCY,
      CONC_WARMUP
    );
    printConcurrentResult(flightFizzEdgeAsync);

    const rps = r => r.reqPerSec;

    console.log('\n--- Flight overhead ---\n');
    printGrid(
      ['Fizz', 'Flight+Fizz'],
      [
        ['Node sync', fizzNodeSync, flightFizzNodeSync],
        ['Node async', fizzNodeAsync, flightFizzNodeAsync],
        ['Edge sync', fizzEdgeSync, flightFizzEdgeSync],
        ['Edge async', fizzEdgeAsync, flightFizzEdgeAsync],
      ],
      rps,
      'req/s',
      'higher is better'
    );

    console.log('\n--- Edge vs Node ---\n');
    printGrid(
      ['Node', 'Edge'],
      [
        ['Fizz sync', fizzNodeSync, fizzEdgeSync],
        ['Fizz async', fizzNodeAsync, fizzEdgeAsync],
        ['Flight+Fizz sync', flightFizzNodeSync, flightFizzEdgeSync],
        ['Flight+Fizz async', flightFizzNodeAsync, flightFizzEdgeAsync],
      ],
      rps,
      'req/s',
      'higher is better'
    );

    return;
  }

  // --- Benchmark ---
  console.log(
    '\n--- Benchmark (%d warmup, %d iterations, %d items) ---\n',
    WARMUP,
    ITERATIONS,
    ITEM_COUNT
  );

  const fizzNodeSync = await runBenchmark(
    'Fizz (Node, sync)',
    () => renderFizzNode(App, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(fizzNodeSync);

  const flightFizzNodeSync = await runBenchmark(
    'Flight + Fizz (Node, sync)',
    () => renderFlightFizzNode(renderRSCNode, RSCApp, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(flightFizzNodeSync);

  const fizzNodeAsync = await runBenchmark(
    'Fizz (Node, async)',
    () => renderFizzNode(AppAsync, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(fizzNodeAsync);

  const flightFizzNodeAsync = await runBenchmark(
    'Flight + Fizz (Node, async)',
    () => renderFlightFizzNode(renderRSCNode, RSCAppAsync, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(flightFizzNodeAsync);

  const fizzEdgeSync = await runBenchmark(
    'Fizz (Edge, sync)',
    () => renderFizzEdge(App, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(fizzEdgeSync);

  const flightFizzEdgeSync = await runBenchmark(
    'Flight + Fizz (Edge, sync)',
    () => renderFlightFizzEdge(renderRSCEdge, RSCApp, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(flightFizzEdgeSync);

  const fizzEdgeAsync = await runBenchmark(
    'Fizz (Edge, async)',
    () => renderFizzEdge(AppAsync, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(fizzEdgeAsync);

  const flightFizzEdgeAsync = await runBenchmark(
    'Flight + Fizz (Edge, async)',
    () => renderFlightFizzEdge(renderRSCEdge, RSCAppAsync, ITEM_COUNT),
    ITERATIONS,
    WARMUP
  );
  printResult(flightFizzEdgeAsync);

  const median = r => r.median;

  console.log('\n--- Flight overhead ---\n');
  printGrid(
    ['Fizz', 'Flight+Fizz'],
    [
      ['Node sync', fizzNodeSync, flightFizzNodeSync],
      ['Node async', fizzNodeAsync, flightFizzNodeAsync],
      ['Edge sync', fizzEdgeSync, flightFizzEdgeSync],
      ['Edge async', fizzEdgeAsync, flightFizzEdgeAsync],
    ],
    median,
    'ms',
    'median, lower is better'
  );

  console.log('\n--- Edge vs Node ---\n');
  printGrid(
    ['Node', 'Edge'],
    [
      ['Fizz sync', fizzNodeSync, fizzEdgeSync],
      ['Fizz async', fizzNodeAsync, fizzEdgeAsync],
      ['Flight+Fizz sync', flightFizzNodeSync, flightFizzEdgeSync],
      ['Flight+Fizz async', flightFizzNodeAsync, flightFizzEdgeAsync],
    ],
    median,
    'ms',
    'median, lower is better'
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
