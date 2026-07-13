/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Performance profiling script for Rust vs JS React Compiler.
 *
 * Runs both compilers on all fixtures without debug logging,
 * collects fine-grained timing data at every stage, and reports
 * aggregate performance breakdowns.
 *
 * Usage: npx tsx compiler/scripts/profile-rust-port.ts [flags]
 *
 * Flags:
 *   --release    Build and use release-mode Rust binary
 *   --json       Output JSON instead of formatted tables
 *   --limit N    Max fixtures to profile (default: all)
 */

import * as babel from '@babel/core';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

import {parseConfigPragmaForTests} from '../packages/babel-plugin-react-compiler/src/Utils/TestUtils';

const REPO_ROOT = path.resolve(__dirname, '../..');

// --- Parse flags ---
const rawArgs = process.argv.slice(2);
const releaseMode = rawArgs.includes('--release');
const jsonMode = rawArgs.includes('--json');
const limitIdx = rawArgs.indexOf('--limit');
const limitArg = limitIdx >= 0 ? parseInt(rawArgs[limitIdx + 1], 10) : 0;

// --- ANSI colors ---
const useColor = !jsonMode;
const BOLD = useColor ? '\x1b[1m' : '';
const DIM = useColor ? '\x1b[2m' : '';
const RED = useColor ? '\x1b[0;31m' : '';
const GREEN = useColor ? '\x1b[0;32m' : '';
const YELLOW = useColor ? '\x1b[0;33m' : '';
const CYAN = useColor ? '\x1b[0;36m' : '';
const RESET = useColor ? '\x1b[0m' : '';

// --- Build native module ---
const NATIVE_DIR = path.join(
  REPO_ROOT,
  'compiler/packages/babel-plugin-react-compiler-rust/native',
);
const NATIVE_NODE_PATH = path.join(NATIVE_DIR, 'index.node');

if (!jsonMode) {
  console.log(
    `Building Rust native module (${releaseMode ? 'release' : 'debug'})...`,
  );
}

// Profiling needs symbol names; override the release profile's strip=true.
const cargoBuildArgs = releaseMode
  ? "--release --config 'profile.release.strip=false' -p react_compiler_napi"
  : '-p react_compiler_napi';

try {
  execSync(`~/.cargo/bin/cargo build ${cargoBuildArgs}`, {
    cwd: path.join(REPO_ROOT, 'compiler/crates'),
    stdio: jsonMode ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    shell: true,
  });
} catch {
  console.error('ERROR: Failed to build Rust native module.');
  process.exit(1);
}

// Copy the built dylib as index.node
const TARGET_DIR = path.join(
  REPO_ROOT,
  releaseMode ? 'compiler/target/release' : 'compiler/target/debug',
);
const dylib = fs.existsSync(
  path.join(TARGET_DIR, 'libreact_compiler_napi.dylib'),
)
  ? path.join(TARGET_DIR, 'libreact_compiler_napi.dylib')
  : path.join(TARGET_DIR, 'libreact_compiler_napi.so');

if (!fs.existsSync(dylib)) {
  console.error(`ERROR: Could not find built native module in ${TARGET_DIR}`);
  process.exit(1);
}
fs.copyFileSync(dylib, NATIVE_NODE_PATH);

// --- Load plugins ---
const tsPlugin = require('../packages/babel-plugin-react-compiler/src').default;
const {extractScopeInfo} =
  require('../packages/babel-plugin-react-compiler-rust/src/scope') as typeof import('../packages/babel-plugin-react-compiler-rust/src/scope');
const {resolveOptions} =
  require('../packages/babel-plugin-react-compiler-rust/src/options') as typeof import('../packages/babel-plugin-react-compiler-rust/src/options');
const {compileWithRustProfiled} =
  require('../packages/babel-plugin-react-compiler-rust/src/bridge') as typeof import('../packages/babel-plugin-react-compiler-rust/src/bridge');

// --- Types ---
interface TimingEntry {
  name: string;
  duration_us: number;
}

interface BridgeTiming {
  jsStringifyAst_us: number;
  jsStringifyScope_us: number;
  jsStringifyOptions_us: number;
  napiCall_us: number;
  jsParseResult_us: number;
}

interface FixtureProfile {
  fixture: string;
  sizeBytes: number;
  tsTotal_us: number;
  rustTotal_us: number;
  rustScopeExtraction_us: number;
  rustBridge: BridgeTiming;
  rustPasses: TimingEntry[];
}

// --- Discover fixtures ---
function discoverFixtures(rootPath: string): string[] {
  const results: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        /\.(js|jsx|ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith('.expect.md')
      ) {
        results.push(fullPath);
      }
    }
  }
  walk(rootPath);
  results.sort();
  return results;
}

// --- Compile fixture with TS compiler (no debug logging) ---
function compileWithTS(fixturePath: string): number {
  const source = fs.readFileSync(fixturePath, 'utf8');
  const firstLine = source.substring(0, source.indexOf('\n'));
  const pragmaOpts = parseConfigPragmaForTests(firstLine, {
    compilationMode: 'all',
  });

  const isFlow = firstLine.includes('@flow');
  const isScript = firstLine.includes('@script');
  const parserPlugins: string[] = isFlow
    ? ['flow', 'jsx']
    : ['typescript', 'jsx'];

  const start = performance.now();
  try {
    babel.transformSync(source, {
      filename: fixturePath,
      sourceType: isScript ? 'script' : 'module',
      parserOpts: {plugins: parserPlugins},
      plugins: [
        [
          tsPlugin,
          {
            ...pragmaOpts,
            compilationMode: 'all' as const,
            panicThreshold: 'all_errors' as const,
          },
        ],
      ],
      configFile: false,
      babelrc: false,
    });
  } catch {
    // Ignore errors - we still measure timing
  }
  const end = performance.now();
  return Math.round((end - start) * 1000); // microseconds
}

// --- Compile fixture with Rust compiler (profiled) ---
function compileWithRustProfile(fixturePath: string): {
  total_us: number;
  scopeExtraction_us: number;
  bridge: BridgeTiming;
  passes: TimingEntry[];
} {
  const source = fs.readFileSync(fixturePath, 'utf8');
  const firstLine = source.substring(0, source.indexOf('\n'));
  const pragmaOpts = parseConfigPragmaForTests(firstLine, {
    compilationMode: 'all',
  });

  const isFlow = firstLine.includes('@flow');
  const isScript = firstLine.includes('@script');
  const parserPlugins: string[] = isFlow
    ? ['flow', 'jsx']
    : ['typescript', 'jsx'];

  // Parse the AST via Babel (same as the real plugin)
  const parseResult = babel.transformSync(source, {
    filename: fixturePath,
    sourceType: isScript ? 'script' : 'module',
    parserOpts: {plugins: parserPlugins},
    plugins: [
      // Use a minimal plugin that captures the AST and scope info
      function capturePlugin(_api: typeof babel): babel.PluginObj {
        return {
          name: 'capture',
          visitor: {
            Program: {
              enter(prog, pass): void {
                // Resolve options
                const opts = resolveOptions(
                  {
                    ...pragmaOpts,
                    compilationMode: 'all',
                    panicThreshold: 'all_errors',
                  },
                  pass.file,
                  fixturePath,
                  pass.file.ast,
                );

                // Extract scope info (timed)
                const scopeStart = performance.now();
                let scopeInfo;
                try {
                  scopeInfo = extractScopeInfo(prog);
                } catch {
                  // Store failed result
                  (pass as any).__profileResult = {
                    total_us: Math.round(
                      (performance.now() - scopeStart) * 1000,
                    ),
                    scopeExtraction_us: Math.round(
                      (performance.now() - scopeStart) * 1000,
                    ),
                    bridge: {
                      jsStringifyAst_us: 0,
                      jsStringifyScope_us: 0,
                      jsStringifyOptions_us: 0,
                      napiCall_us: 0,
                      jsParseResult_us: 0,
                    },
                    passes: [],
                  };
                  return;
                }
                const scopeEnd = performance.now();

                const totalStart = performance.now();
                try {
                  const profiled = compileWithRustProfiled(
                    pass.file.ast,
                    scopeInfo,
                    opts,
                    pass.file.code ?? null,
                  );
                  const totalEnd = performance.now();

                  (pass as any).__profileResult = {
                    total_us: Math.round((totalEnd - totalStart) * 1000),
                    scopeExtraction_us: Math.round(
                      (scopeEnd - scopeStart) * 1000,
                    ),
                    bridge: profiled.bridgeTiming,
                    passes: profiled.rustTiming,
                  };
                } catch {
                  const totalEnd = performance.now();
                  (pass as any).__profileResult = {
                    total_us: Math.round((totalEnd - totalStart) * 1000),
                    scopeExtraction_us: Math.round(
                      (scopeEnd - scopeStart) * 1000,
                    ),
                    bridge: {
                      jsStringifyAst_us: 0,
                      jsStringifyScope_us: 0,
                      jsStringifyOptions_us: 0,
                      napiCall_us: 0,
                      jsParseResult_us: 0,
                    },
                    passes: [],
                  };
                }
                prog.skip();
              },
            },
          },
        };
      },
    ],
    configFile: false,
    babelrc: false,
  });

  // Extract the profile result stored by the plugin
  const result = (parseResult as any)?.metadata?.__profileResult ??
    (parseResult as any)?.__profileResult ?? {
      total_us: 0,
      scopeExtraction_us: 0,
      bridge: {
        jsStringifyAst_us: 0,
        jsStringifyScope_us: 0,
        jsStringifyOptions_us: 0,
        napiCall_us: 0,
        jsParseResult_us: 0,
      },
      passes: [],
    };

  return result;
}

// --- Compile fixture with Rust compiler (simpler approach using direct API) ---
function compileWithRustDirect(fixturePath: string): {
  total_us: number;
  scopeExtraction_us: number;
  bridge: BridgeTiming;
  passes: TimingEntry[];
} {
  const source = fs.readFileSync(fixturePath, 'utf8');
  const firstLine = source.substring(0, source.indexOf('\n'));
  const pragmaOpts = parseConfigPragmaForTests(firstLine, {
    compilationMode: 'all',
  });

  const isFlow = firstLine.includes('@flow');
  const isScript = firstLine.includes('@script');
  const parserPlugins: string[] = isFlow
    ? ['flow', 'jsx']
    : ['typescript', 'jsx'];

  // Parse the AST via Babel
  let ast: babel.types.File | null = null;
  let scopeInfo: any = null;
  let opts: any = null;
  let scopeExtraction_us = 0;

  try {
    babel.transformSync(source, {
      filename: fixturePath,
      sourceType: isScript ? 'script' : 'module',
      parserOpts: {plugins: parserPlugins},
      plugins: [
        function capturePlugin(_api: typeof babel): babel.PluginObj {
          return {
            name: 'capture-for-profile',
            visitor: {
              Program: {
                enter(prog, pass): void {
                  ast = pass.file.ast;
                  opts = resolveOptions(
                    {
                      ...pragmaOpts,
                      compilationMode: 'all',
                      panicThreshold: 'all_errors',
                    },
                    pass.file,
                    fixturePath,
                    pass.file.ast,
                  );

                  const scopeStart = performance.now();
                  try {
                    scopeInfo = extractScopeInfo(prog);
                  } catch {
                    scopeInfo = null;
                  }
                  scopeExtraction_us = Math.round(
                    (performance.now() - scopeStart) * 1000,
                  );
                  prog.skip();
                },
              },
            },
          };
        },
      ],
      configFile: false,
      babelrc: false,
    });
  } catch {
    // Parse error or other babel failure - skip this fixture
  }

  if (ast == null || scopeInfo == null || opts == null) {
    return {
      total_us: 0,
      scopeExtraction_us,
      bridge: {
        jsStringifyAst_us: 0,
        jsStringifyScope_us: 0,
        jsStringifyOptions_us: 0,
        napiCall_us: 0,
        jsParseResult_us: 0,
      },
      passes: [],
    };
  }

  const totalStart = performance.now();
  try {
    const profiled = compileWithRustProfiled(ast, scopeInfo, opts, source);
    const totalEnd = performance.now();

    return {
      total_us: Math.round((totalEnd - totalStart) * 1000),
      scopeExtraction_us,
      bridge: profiled.bridgeTiming,
      passes: profiled.rustTiming,
    };
  } catch {
    const totalEnd = performance.now();
    return {
      total_us: Math.round((totalEnd - totalStart) * 1000),
      scopeExtraction_us,
      bridge: {
        jsStringifyAst_us: 0,
        jsStringifyScope_us: 0,
        jsStringifyOptions_us: 0,
        napiCall_us: 0,
        jsParseResult_us: 0,
      },
      passes: [],
    };
  }
}

// --- Main ---
const DEFAULT_FIXTURES_DIR = path.join(
  REPO_ROOT,
  'compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler',
);

let fixtures = discoverFixtures(DEFAULT_FIXTURES_DIR);
if (limitArg > 0) {
  fixtures = fixtures.slice(0, limitArg);
}

if (fixtures.length === 0) {
  console.error('No fixtures found.');
  process.exit(1);
}

if (!jsonMode) {
  console.log(`\nProfiling ${BOLD}${fixtures.length}${RESET} fixtures...`);
}

// --- Warmup pass ---
if (!jsonMode) {
  console.log(`${DIM}Warmup pass (results discarded)...${RESET}`);
}
for (const fixturePath of fixtures) {
  compileWithTS(fixturePath);
  compileWithRustDirect(fixturePath);
}

// --- Profile pass ---
if (!jsonMode) {
  console.log(`Profiling...`);
}

const profiles: FixtureProfile[] = [];

for (const fixturePath of fixtures) {
  const relPath = path.relative(REPO_ROOT, fixturePath);
  const sizeBytes = fs.statSync(fixturePath).size;

  const tsTotal_us = compileWithTS(fixturePath);
  const rustResult = compileWithRustDirect(fixturePath);

  profiles.push({
    fixture: relPath,
    sizeBytes,
    tsTotal_us,
    rustTotal_us: rustResult.scopeExtraction_us + rustResult.total_us,
    rustScopeExtraction_us: rustResult.scopeExtraction_us,
    rustBridge: rustResult.bridge,
    rustPasses: rustResult.passes,
  });
}

// --- Aggregation ---
const totalTS = profiles.reduce((sum, p) => sum + p.tsTotal_us, 0);
const totalRust = profiles.reduce((sum, p) => sum + p.rustTotal_us, 0);
const ratio = totalRust / totalTS;

// Aggregate pass timing
const passAggregates = new Map<string, {total_us: number; values: number[]}>();

function addPassTiming(name: string, duration_us: number): void {
  let agg = passAggregates.get(name);
  if (!agg) {
    agg = {total_us: 0, values: []};
    passAggregates.set(name, agg);
  }
  agg.total_us += duration_us;
  agg.values.push(duration_us);
}

for (const profile of profiles) {
  // Bridge phases
  addPassTiming('JS: extractScopeInfo', profile.rustScopeExtraction_us);
  addPassTiming('JS: JSON.stringify AST', profile.rustBridge.jsStringifyAst_us);
  addPassTiming(
    'JS: JSON.stringify scope',
    profile.rustBridge.jsStringifyScope_us,
  );
  addPassTiming(
    'JS: JSON.stringify options',
    profile.rustBridge.jsStringifyOptions_us,
  );
  addPassTiming('JS: JSON.parse result', profile.rustBridge.jsParseResult_us);

  // Rust passes
  for (const pass of profile.rustPasses) {
    addPassTiming(`Rust: ${pass.name}`, pass.duration_us);
  }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// --- Output ---
if (jsonMode) {
  const output = {
    build: releaseMode ? 'release' : 'debug',
    fixtureCount: fixtures.length,
    totalTS_us: totalTS,
    totalRust_us: totalRust,
    ratio: Math.round(ratio * 100) / 100,
    passAggregates: Object.fromEntries(
      [...passAggregates.entries()].map(([name, agg]) => [
        name,
        {
          total_us: agg.total_us,
          avg_us: Math.round(agg.total_us / agg.values.length),
          p95_us: percentile(agg.values, 95),
          count: agg.values.length,
        },
      ]),
    ),
    fixtures: profiles,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log('');
  console.log(`${BOLD}=== Summary ===${RESET}`);
  console.log(
    `Build: ${CYAN}${releaseMode ? 'release' : 'debug'}${RESET} | Fixtures: ${BOLD}${fixtures.length}${RESET} | Warmup: done`,
  );
  console.log('');

  const tsMs = (totalTS / 1000).toFixed(1);
  const rustMs = (totalRust / 1000).toFixed(1);
  const ratioStr = ratio.toFixed(2);
  const ratioColor = ratio <= 1.0 ? GREEN : ratio <= 1.5 ? YELLOW : RED;
  console.log(
    `Total: TS ${BOLD}${tsMs}ms${RESET} | Rust ${BOLD}${rustMs}ms${RESET} | Ratio ${ratioColor}${ratioStr}x${RESET}`,
  );
  console.log('');

  // --- Pass breakdown table ---
  console.log(`${BOLD}=== Rust Time Breakdown (aggregate) ===${RESET}`);

  // Sort by total time descending
  const sortedPasses = [...passAggregates.entries()].sort(
    (a, b) => b[1].total_us - a[1].total_us,
  );

  const header = `${'Phase'.padEnd(50)} ${'Total(ms)'.padStart(10)} ${'%'.padStart(6)} ${'Avg(us)'.padStart(9)} ${'P95(us)'.padStart(9)}`;
  console.log(`${DIM}${header}${RESET}`);

  for (const [name, agg] of sortedPasses) {
    const totalMs = (agg.total_us / 1000).toFixed(1);
    const pct = ((agg.total_us / totalRust) * 100).toFixed(1);
    const avg = Math.round(agg.total_us / agg.values.length);
    const p95 = percentile(agg.values, 95);

    console.log(
      `${name.padEnd(50)} ${totalMs.padStart(10)} ${(pct + '%').padStart(6)} ${String(avg).padStart(9)} ${String(p95).padStart(9)}`,
    );
  }
  console.log('');

  // --- Top 20 slowest fixtures ---
  console.log(`${BOLD}=== Top 20 Slowest Fixtures (Rust) ===${RESET}`);
  const sortedFixtures = [...profiles].sort(
    (a, b) => b.rustTotal_us - a.rustTotal_us,
  );
  const topN = sortedFixtures.slice(0, 20);

  const fHeader = `${'Fixture'.padEnd(55)} ${'Size'.padStart(6)} ${'TS(ms)'.padStart(8)} ${'Rust(ms)'.padStart(9)} ${'Ratio'.padStart(7)} ${'Bottleneck'.padStart(20)}`;
  console.log(`${DIM}${fHeader}${RESET}`);

  for (const p of topN) {
    const shortName =
      p.fixture.length > 54 ? '...' + p.fixture.slice(-51) : p.fixture;
    const sizeStr =
      p.sizeBytes > 1024
        ? (p.sizeBytes / 1024).toFixed(0) + 'K'
        : String(p.sizeBytes);
    const tsMsStr = (p.tsTotal_us / 1000).toFixed(2);
    const rustMsStr = (p.rustTotal_us / 1000).toFixed(2);
    const fixtureRatio = p.tsTotal_us > 0 ? p.rustTotal_us / p.tsTotal_us : 0;
    const ratioStr = fixtureRatio.toFixed(1) + 'x';
    const ratioColor =
      fixtureRatio <= 1.0 ? GREEN : fixtureRatio <= 1.5 ? YELLOW : RED;

    // Find bottleneck pass
    let bottleneck = '';
    if (p.rustPasses.length > 0) {
      const sorted = [...p.rustPasses].sort(
        (a, b) => b.duration_us - a.duration_us,
      );
      const top = sorted[0];
      const pct = ((top.duration_us / p.rustTotal_us) * 100).toFixed(0);
      bottleneck = `${top.name} (${pct}%)`;
    }
    const bottleneckStr =
      bottleneck.length > 19 ? bottleneck.slice(0, 19) + '…' : bottleneck;

    console.log(
      `${shortName.padEnd(55)} ${sizeStr.padStart(6)} ${tsMsStr.padStart(8)} ${rustMsStr.padStart(9)} ${ratioColor}${ratioStr.padStart(7)}${RESET} ${bottleneckStr.padStart(20)}`,
    );
  }
}
