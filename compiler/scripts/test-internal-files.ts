/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Compare TS and Rust React Compiler output on external production files.
 *
 * Given a configuration module and a source root directory, compiles files
 * using the exact plugin options from the configuration, then compares code
 * output and error events between the TS and Rust compilers. Files with
 * differences can be copied as test fixtures for further investigation.
 *
 * Usage:
 *   npx tsx compiler/scripts/test-internal-files.ts <config-path> <source-root> [flags]
 *
 * Arguments:
 *   <config-path>    Path to the compiler configuration module (JS file that
 *                    exports getForgetConfiguration and config)
 *   <source-root>    Root directory from which the config's source prefixes
 *                    are resolved
 *
 * Flags:
 *   --limit N        Max files to process (default: 0 = all)
 *   --pattern PAT    Filter file paths (substring match)
 *   --project NAME   Filter by project name from config
 *   --dry-run        Compare only, skip fixture creation
 *   --no-color       Disable ANSI color codes
 */

import * as babel from '@babel/core';
import hermesParserPlugin from 'babel-plugin-syntax-hermes-parser';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

const REPO_ROOT = path.resolve(__dirname, '../..');
const FIXTURE_DIR = path.join(
  REPO_ROOT,
  'compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/internal',
);

// --- Parse flags and positional args ---
const rawArgs = process.argv.slice(2);
const noColor = rawArgs.includes('--no-color') || !!process.env.NO_COLOR;
const dryRun = rawArgs.includes('--dry-run');
const limitIdx = rawArgs.indexOf('--limit');
const limitArg = limitIdx >= 0 ? parseInt(rawArgs[limitIdx + 1], 10) : 0;
const patternIdx = rawArgs.indexOf('--pattern');
const patternArg = patternIdx >= 0 ? rawArgs[patternIdx + 1] : null;
const projectIdx = rawArgs.indexOf('--project');
const projectArg = projectIdx >= 0 ? rawArgs[projectIdx + 1] : null;

// Collect flag indices to exclude from positional args
const flagValueIndices = new Set<number>();
if (limitIdx >= 0) flagValueIndices.add(limitIdx + 1);
if (patternIdx >= 0) flagValueIndices.add(patternIdx + 1);
if (projectIdx >= 0) flagValueIndices.add(projectIdx + 1);
const positional = rawArgs.filter(
  (a, i) => !a.startsWith('--') && !flagValueIndices.has(i),
);

if (positional.length < 2) {
  console.error(
    'Usage: npx tsx compiler/scripts/test-internal-files.ts <config-path> <source-root> [flags]',
  );
  console.error('');
  console.error('Arguments:');
  console.error('  <config-path>    Path to the compiler configuration module');
  console.error(
    '  <source-root>    Root directory for resolving config source prefixes',
  );
  console.error('');
  console.error('Flags:');
  console.error('  --limit N        Max files to process');
  console.error('  --pattern PAT    Filter file paths (substring match)');
  console.error('  --project NAME   Filter by project name from config');
  console.error('  --dry-run        Compare only, skip fixture creation');
  console.error('  --no-color       Disable ANSI color codes');
  process.exit(1);
}

const configPath = path.resolve(positional[0]);
const sourceRoot = path.resolve(positional[1]);

// --- ANSI colors ---
const RED = noColor ? '' : '\x1b[0;31m';
const GREEN = noColor ? '' : '\x1b[0;32m';
const YELLOW = noColor ? '' : '\x1b[0;33m';
const BOLD = noColor ? '' : '\x1b[1m';
const DIM = noColor ? '' : '\x1b[2m';
const RESET = noColor ? '' : '\x1b[0m';

// --- Load config ---
if (!fs.existsSync(configPath)) {
  console.error(`${RED}ERROR: Could not find config at ${configPath}${RESET}`);
  process.exit(1);
}
if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) {
  console.error(
    `${RED}ERROR: Source root is not a valid directory: ${sourceRoot}${RESET}`,
  );
  process.exit(1);
}
const forgetConfig = require(configPath);
const {getForgetConfiguration, config: rawConfig} = forgetConfig;

// --- Build native module ---
const NATIVE_DIR = path.join(
  REPO_ROOT,
  'compiler/packages/babel-plugin-react-compiler-rust/native',
);
const NATIVE_NODE_PATH = path.join(NATIVE_DIR, 'index.node');

console.log('Building Rust native module...');
try {
  execSync('~/.cargo/bin/cargo build -p react_compiler_napi', {
    cwd: path.join(REPO_ROOT, 'compiler/crates'),
    stdio: 'inherit',
    shell: true,
  });
} catch {
  console.error(`${RED}ERROR: Failed to build Rust native module.${RESET}`);
  process.exit(1);
}

const TARGET_DIR = path.join(REPO_ROOT, 'compiler/target/debug');
const dylib = fs.existsSync(
  path.join(TARGET_DIR, 'libreact_compiler_napi.dylib'),
)
  ? path.join(TARGET_DIR, 'libreact_compiler_napi.dylib')
  : path.join(TARGET_DIR, 'libreact_compiler_napi.so');

if (!fs.existsSync(dylib)) {
  console.error(
    `${RED}ERROR: Could not find built native module in ${TARGET_DIR}${RESET}`,
  );
  process.exit(1);
}
fs.copyFileSync(dylib, NATIVE_NODE_PATH);

// --- Load plugins ---
const tsPlugin = require('../packages/babel-plugin-react-compiler/src').default;
const rustPlugin =
  require('../packages/babel-plugin-react-compiler-rust/src').default;

// --- Types ---
interface LoggerEvent {
  kind: string;
  fnName?: string | null;
  fnLoc?: unknown;
  reason?: string;
  detail?: {
    reason?: string;
    severity?: string;
    category?: string;
    description?: string;
  };
  data?: string;
}

interface CompileResult {
  code: string | null;
  events: LoggerEvent[];
  error: string | null;
}

interface FileEntry {
  filePath: string;
  projectName: string;
  projectConfig: Record<string, unknown>;
}

// --- File discovery ---
// Additional directory exclusions beyond what the config handles
const EXTRA_EXCLUDES = [
  '__server_snapshot_tests__',
  '__e2e_tests__',
  '__perf_tests__',
  '__integration_tests__',
];

function walkDir(dir: string, callback: (filePath: string) => void): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXTRA_EXCLUDES.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      callback(fullPath);
    }
  }
}

function discoverFiles(): FileEntry[] {
  console.log('Discovering files...');
  const results: FileEntry[] = [];
  const seen = new Set<string>();

  for (const [prefix, projectName] of Object.entries(
    rawConfig.sources as Record<string, string>,
  )) {
    if (projectArg && projectName !== projectArg) continue;

    // Resolve prefix to absolute path relative to source root
    const absPrefix = path.join(sourceRoot, prefix);
    if (!fs.existsSync(absPrefix)) continue;

    const stat = fs.statSync(absPrefix);
    if (!stat.isDirectory()) continue;

    walkDir(absPrefix, filePath => {
      if (seen.has(filePath)) return;
      seen.add(filePath);

      if (patternArg && !filePath.includes(patternArg)) return;

      const config = getForgetConfiguration(filePath);
      if (config == null || !config.enable) return;

      results.push({filePath, projectName, projectConfig: config});
    });

    if (limitArg > 0 && results.length >= limitArg) break;
  }

  if (limitArg > 0) {
    return results.slice(0, limitArg);
  }
  return results;
}

// --- Build plugin options from production config ---
function makePluginOptions(
  projectConfig: Record<string, unknown>,
  logger: {logEvent: (filename: string | null, event: LoggerEvent) => void},
): Record<string, unknown> {
  return {
    compilationMode: projectConfig.compilationMode,
    panicThreshold: 'none',
    environment: projectConfig.environment,
    target:
      projectConfig.compilerVersion === 'experimental'
        ? projectConfig.target
        : projectConfig.target,
    gating: null,
    flowSuppressions: projectConfig.flowSuppressions,
    enableReanimatedCheck: false,
    logger,
    sources: null,
  };
}

// --- Compile a file ---
function compileFile(
  mode: 'ts' | 'rust',
  filePath: string,
  pluginOptions: Record<string, unknown>,
): CompileResult {
  const source = fs.readFileSync(filePath, 'utf8');
  const events: LoggerEvent[] = [];

  const logger = {
    logEvent(_filename: string | null, event: LoggerEvent): void {
      events.push(event);
    },
  };

  const opts = {...pluginOptions, logger};
  const plugin = mode === 'ts' ? tsPlugin : rustPlugin;

  try {
    const result = babel.transformSync(source, {
      filename: filePath,
      sourceType: 'module',
      plugins: [hermesParserPlugin, [plugin, opts]],
      configFile: false,
      babelrc: false,
    });
    return {code: result?.code ?? null, events, error: null};
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {code: null, events, error: msg};
  }
}

// --- Format events for comparison ---
function formatEvents(events: LoggerEvent[]): string {
  return events
    .filter(e =>
      [
        'CompileError',
        'CompileSkip',
        'CompileSuccess',
        'PipelineError',
      ].includes(e.kind),
    )
    .map(e => {
      if (e.kind === 'CompileSuccess') {
        return `[CompileSuccess] ${e.fnName ?? '(anonymous)'}`;
      }
      if (e.kind === 'CompileError') {
        const d = e.detail;
        return `[CompileError] ${d?.reason ?? '(no reason)'} (${d?.severity ?? ''}, ${d?.category ?? ''})`;
      }
      if (e.kind === 'CompileSkip') {
        return `[CompileSkip] ${e.reason ?? '(no reason)'}`;
      }
      return `[${e.kind}] ${e.data ?? ''}`;
    })
    .join('\n');
}

// --- Simple diff ---
function unifiedDiff(expected: string, actual: string): string {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const lines: string[] = [];
  lines.push(`${RED}--- TS${RESET}`);
  lines.push(`${GREEN}+++ Rust${RESET}`);

  const maxLen = Math.max(expectedLines.length, actualLines.length);
  let contextStart = -1;
  for (let i = 0; i < maxLen; i++) {
    const eLine = i < expectedLines.length ? expectedLines[i] : undefined;
    const aLine = i < actualLines.length ? actualLines[i] : undefined;
    if (eLine === aLine) continue;
    if (contextStart !== i) {
      lines.push(`${YELLOW}@@ line ${i + 1} @@${RESET}`);
    }
    contextStart = i + 1;
    if (eLine !== undefined) lines.push(`${RED}-${eLine}${RESET}`);
    if (aLine !== undefined) lines.push(`${GREEN}+${aLine}${RESET}`);
  }
  return lines.join('\n');
}

// --- Format code with prettier ---
async function formatCode(code: string): Promise<string> {
  return prettier.format(code, {semi: true, parser: 'flow'});
}

// --- Generate pragma line for fixture ---
function generatePragma(
  projectConfig: Record<string, unknown>,
  isFlow: boolean,
): string {
  const parts: string[] = [];

  // The snap tool checks the first line for @flow to determine parser
  if (isFlow) {
    parts.push('@flow');
  }

  // compilationMode
  const mode = projectConfig.compilationMode as string;
  if (mode && mode !== 'all') {
    parts.push(`@compilationMode:"${mode}"`);
  }

  // Environment options
  const env = (projectConfig.environment ?? {}) as Record<string, unknown>;

  if (env.enableAssumeHooksFollowRulesOfReact === true) {
    parts.push('@enableAssumeHooksFollowRulesOfReact');
  }
  if (env.enableTransitivelyFreezeFunctionExpressions === true) {
    parts.push('@enableTransitivelyFreezeFunctionExpressions');
  }
  if (env.validatePreserveExistingMemoizationGuarantees === true) {
    parts.push('@validatePreserveExistingMemoizationGuarantees');
  }
  if (env.enableFunctionOutlining === false) {
    parts.push('@enableFunctionOutlining:false');
  }
  if (
    Array.isArray(env.validateNoCapitalizedCalls) &&
    env.validateNoCapitalizedCalls.length > 0
  ) {
    parts.push(
      `@validateNoCapitalizedCalls:${JSON.stringify(env.validateNoCapitalizedCalls)}`,
    );
  }

  // target for experimental projects
  if (projectConfig.compilerVersion === 'experimental') {
    parts.push('@target:"donotuse_meta_internal"');
  }

  return parts.length > 0 ? '// ' + parts.join(' ') : '';
}

// --- Create fixture file and baseline .expect.md ---
async function createFixture(
  filePath: string,
  projectName: string,
  projectConfig: Record<string, unknown>,
  tsCode: string | null,
  tsError: string | null,
): Promise<string> {
  fs.mkdirSync(FIXTURE_DIR, {recursive: true});

  const basename = path.basename(filePath);
  const ext = path.extname(basename);
  const stem = basename.slice(0, -ext.length);
  let fixtureName = `${projectName}--${basename}`;

  // Deduplicate
  let counter = 0;
  while (fs.existsSync(path.join(FIXTURE_DIR, fixtureName))) {
    counter++;
    fixtureName = `${projectName}--${stem}-${counter}${ext}`;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const headerBlock = source.substring(0, source.indexOf('*/') + 2 || 200);
  const isFlow = headerBlock.includes('@flow');
  const pragma = generatePragma(projectConfig, isFlow);

  const content = pragma ? `${pragma}\n${source}` : source;

  const fixturePath = path.join(FIXTURE_DIR, fixtureName);
  fs.writeFileSync(fixturePath, content, 'utf8');

  // Generate .expect.md baseline from TS compiler output.
  // This bypasses yarn snap -u (which fails due to sprout evaluator
  // not being able to resolve internal module imports).
  // Format matches snap's writeOutputToString in reporter.ts.
  let formattedCode: string | null = null;
  if (tsCode != null) {
    try {
      formattedCode = await formatCode(tsCode);
    } catch {
      formattedCode = tsCode;
    }
  }

  let expectMd = `\n## Input\n\n\`\`\`javascript\n${content}\n\`\`\`\n`;
  if (formattedCode != null) {
    expectMd += `\n## Code\n\n\`\`\`javascript\n${formattedCode}\`\`\`\n`;
  } else {
    expectMd += '\n';
  }
  if (tsError != null) {
    const cleanError = tsError.replace(/^\/.*?:\s/, '');
    expectMd += `\n## Error\n\n\`\`\`\n${cleanError}\n\`\`\`\n          \n`;
  }
  expectMd += `      `;

  const expectPath = fixturePath.replace(/\.[^.]+$/, '.expect.md');
  fs.writeFileSync(expectPath, expectMd, 'utf8');

  return fixturePath;
}

// --- Main ---
(async () => {
  const files = discoverFiles();
  if (files.length === 0) {
    console.error('No files found matching filters.');
    process.exit(1);
  }

  console.log(
    `\nComparing ${BOLD}${files.length}${RESET} files (TS vs Rust)...\n`,
  );

  // Crash recovery: maintain a skip list of files that segfault the native module.
  // On crash, the current file is appended to the skip list.
  // On subsequent runs, those files are skipped automatically.
  const crashLogPath = path.join(
    REPO_ROOT,
    'compiler/.test-internal-files-current',
  );
  const skipListPath = path.join(
    REPO_ROOT,
    'compiler/.test-internal-skip-list',
  );
  const skipSet = new Set<string>();
  try {
    const skipData = fs.readFileSync(skipListPath, 'utf8');
    for (const line of skipData.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) skipSet.add(trimmed);
    }
    if (skipSet.size > 0) {
      console.log(
        `${DIM}Skipping ${skipSet.size} previously-crashing files${RESET}`,
      );
    }
  } catch {}

  process.on('exit', code => {
    if (code === 139 || code === 134 || code === 11) {
      // SIGSEGV or SIGABRT — append the culprit to skip list
      try {
        const crashFile = fs.readFileSync(crashLogPath, 'utf8').trim();
        fs.appendFileSync(skipListPath, crashFile + '\n', 'utf8');
        console.error(
          `\n${RED}CRASH (signal ${code}) on file: ${crashFile}${RESET}`,
        );
        console.error(
          `${YELLOW}File added to skip list. Re-run to continue.${RESET}`,
        );
      } catch {}
    }
    try {
      fs.unlinkSync(crashLogPath);
    } catch {}
  });

  let processed = 0;
  let codeDiffs = 0;
  let eventDiffs = 0;
  let bothErrored = 0;
  let crashes = 0;
  const diffFiles: Array<{
    filePath: string;
    projectName: string;
    projectConfig: Record<string, unknown>;
    codeDiff: string | null;
    eventDiff: string | null;
    tsCode: string | null;
    tsError: string | null;
  }> = [];
  const createdFixtures: string[] = [];

  for (const {filePath, projectName, projectConfig} of files) {
    if (skipSet.has(filePath)) continue;
    processed++;

    // Write current file for crash identification
    fs.writeFileSync(crashLogPath, filePath, 'utf8');

    // Progress
    const relPath = filePath.replace(sourceRoot + '/', '');
    process.stdout.write(
      `\r${DIM}[${processed}/${files.length}] ${codeDiffs} code diffs, ${eventDiffs} event diffs, ${crashes} crashes${RESET}  `,
    );

    const pluginOpts = makePluginOptions(projectConfig, {
      logEvent() {},
    });

    let tsResult: CompileResult;
    let rustResult: CompileResult;
    try {
      tsResult = compileFile('ts', filePath, pluginOpts);
    } catch (e) {
      // Unexpected crash in TS compiler
      tsResult = {
        code: null,
        events: [],
        error: `TS crash: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    try {
      rustResult = compileFile('rust', filePath, pluginOpts);
    } catch (e) {
      // Unexpected crash in Rust compiler
      rustResult = {
        code: null,
        events: [],
        error: `Rust crash: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // Compare code
    let hasCodeDiff = false;
    let codeDiffDetail: string | null = null;
    try {
      const tsCode = await formatCode(tsResult.code ?? '');
      const rustCode = await formatCode(rustResult.code ?? '');
      if (tsCode !== rustCode) {
        hasCodeDiff = true;
        codeDiffDetail = unifiedDiff(tsCode, rustCode);
      }
    } catch {
      // Prettier failed — compare raw
      if ((tsResult.code ?? '') !== (rustResult.code ?? '')) {
        hasCodeDiff = true;
        codeDiffDetail = unifiedDiff(
          tsResult.code ?? '',
          rustResult.code ?? '',
        );
      }
    }

    // Compare error events
    const tsEvents = formatEvents(tsResult.events);
    const rustEvents = formatEvents(rustResult.events);
    let hasEventDiff = false;
    let eventDiffDetail: string | null = null;
    if (tsEvents !== rustEvents) {
      hasEventDiff = true;
      eventDiffDetail = unifiedDiff(tsEvents, rustEvents);
    }

    // Track errors
    if (tsResult.error && rustResult.error) {
      bothErrored++;
    }

    if (hasCodeDiff || hasEventDiff) {
      if (hasCodeDiff) codeDiffs++;
      if (hasEventDiff) eventDiffs++;
      diffFiles.push({
        filePath,
        projectName,
        projectConfig,
        codeDiff: codeDiffDetail,
        eventDiff: eventDiffDetail,
        tsCode: tsResult.code,
        tsError: tsResult.error,
      });
    }
  }

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  // --- Report diffs ---
  if (diffFiles.length > 0) {
    console.log(`\n${BOLD}--- Differences ---${RESET}\n`);
    const showLimit = 50;
    const toShow = diffFiles.slice(0, showLimit);

    for (const entry of toShow) {
      const relPath = entry.filePath.replace(sourceRoot + '/', '');
      console.log(
        `${RED}DIFF${RESET} ${relPath} ${DIM}(${entry.projectName})${RESET}`,
      );
      if (entry.codeDiff) {
        console.log(entry.codeDiff);
      }
      if (entry.eventDiff) {
        console.log(`${YELLOW}Event diff:${RESET}`);
        console.log(entry.eventDiff);
      }
      console.log('');
    }
    if (diffFiles.length > showLimit) {
      console.log(
        `${DIM}(showing first ${showLimit} of ${diffFiles.length} diffs)${RESET}`,
      );
    }
  }

  // --- Create fixtures ---
  if (!dryRun && diffFiles.length > 0) {
    console.log(`\n${BOLD}--- Creating fixtures ---${RESET}\n`);

    // Only create fixtures for files with code diffs (not event-only diffs)
    const codeDiffFiles = diffFiles.filter(f => f.codeDiff != null);

    for (const entry of codeDiffFiles) {
      const fixturePath = await createFixture(
        entry.filePath,
        entry.projectName,
        entry.projectConfig,
        entry.tsCode,
        entry.tsError,
      );
      createdFixtures.push(fixturePath);
      const fixtureName = path.basename(fixturePath);
      console.log(`  ${GREEN}+${RESET} ${fixtureName}`);
    }

    if (createdFixtures.length > 0) {
      console.log(
        `\nCreated ${BOLD}${createdFixtures.length}${RESET} fixtures in internal/`,
      );

      // --- Verification ---
      console.log(`\n${BOLD}--- Verifying fixtures ---${RESET}\n`);

      // Verify with Rust compiler (baselines already written as .expect.md)
      console.log('\nVerifying with yarn snap --rust ...');
      try {
        execSync("yarn snap --rust -p 'internal/*'", {
          cwd: path.join(REPO_ROOT, 'compiler'),
          stdio: 'inherit',
        });
        // If snap --rust passes, all fixtures matched (unexpected)
        console.log(
          `${YELLOW}WARNING: yarn snap --rust passed — fixtures may not reproduce differences.${RESET}`,
        );
      } catch {
        // Expected: snap --rust should fail for differing fixtures
        console.log(
          `${GREEN}yarn snap --rust failed as expected — fixtures reproduce differences.${RESET}`,
        );
      }

      console.log(
        `\n${RED}${BOLD}DO NOT COMMIT${RESET}${RED} the fixture files in internal/${RESET}`,
      );
    }
  }

  // --- Summary ---
  console.log(`\n${BOLD}--- Summary ---${RESET}`);
  console.log(`Processed: ${processed}`);
  console.log(`Code diffs: ${codeDiffs}`);
  console.log(
    `Event-only diffs: ${eventDiffs - codeDiffs > 0 ? eventDiffs - codeDiffs : 0}`,
  );
  console.log(`Both errored: ${bothErrored}`);
  if (crashes > 0) console.log(`Crashes (skipped): ${crashes}`);
  if (createdFixtures.length > 0) {
    console.log(`Fixtures created: ${createdFixtures.length}`);
  }

  process.exit(codeDiffs > 0 ? 1 : 0);
})();
