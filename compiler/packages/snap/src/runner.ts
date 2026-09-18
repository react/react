/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Worker} from 'jest-worker';
import {cpus} from 'os';
import process from 'process';
import * as readline from 'readline';
import ts from 'typescript';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {BABEL_PLUGIN_ROOT, PROJECT_ROOT} from './constants';
import {TestFilter, getFixtures} from './fixture-utils';
import {
  TestResult,
  TestResults,
  normalizeCodeBlankLines,
  report,
  update,
} from './reporter';
import {
  RunnerAction,
  RunnerState,
  buildRust,
  makeWatchRunner,
  watchSrc,
} from './runner-watch';
import * as runnerWorker from './runner-worker';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {minimize, minimizeRustDelta} from './minimize';
import {parseInput, parseLanguage, parseSourceType} from './compiler';
import {
  PARSE_CONFIG_PRAGMA_IMPORT,
  PRINT_HIR_IMPORT,
  PRINT_REACTIVE_IR_IMPORT,
  BABEL_PLUGIN_SRC,
} from './constants';
import chalk from 'chalk';

const WORKER_PATH = require.resolve('./runner-worker.js');
const NUM_WORKERS = cpus().length - 1;

readline.emitKeypressEvents(process.stdin);

type TestOptions = {
  sync: boolean;
  workerThreads: boolean;
  watch: boolean;
  update: boolean;
  pattern?: string;
  debug: boolean;
  verbose: boolean;
  rust: boolean;
};

type MinimizeOptions = {
  path: string;
  update: boolean;
  rust: boolean;
};

type MinimizeRustDeltaOptions = {
  path: string;
  update: boolean;
};

type CompileOptions = {
  path: string;
  debug: boolean;
};

async function runTestCommand(opts: TestOptions): Promise<void> {
  // Rust native module doesn't load in jest-worker child processes,
  // so force sync mode when using the Rust backend.
  if (opts.rust) {
    opts.sync = true;
  }

  const worker: Worker & typeof runnerWorker = new Worker(WORKER_PATH, {
    enableWorkerThreads: opts.workerThreads,
    numWorkers: NUM_WORKERS,
  }) as any;
  worker.getStderr().pipe(process.stderr);
  worker.getStdout().pipe(process.stdout);

  // Check if watch mode should be enabled
  const shouldWatch = opts.watch;

  if (shouldWatch) {
    makeWatchRunner(
      state => onChange(worker, state, opts.sync, opts.verbose, opts.rust),
      opts.debug,
      opts.pattern,
      opts.rust,
    );
    if (opts.pattern) {
      /**
       * Warm up wormers when in watch mode. Loading the Forget babel plugin
       * and all of its transitive dependencies takes 1-3s (per worker) on a M1.
       * As jest-worker dispatches tasks using a round-robin strategy, we can
       * avoid an additional 1-3s wait on the first num_workers runs by warming
       * up workers eagerly.
       */
      for (let i = 0; i < NUM_WORKERS - 1; i++) {
        worker.transformFixture(
          {
            fixturePath: 'tmp',
            snapshotPath: './tmp.expect.md',
            inputPath: './tmp.js',
            input: `
            function Foo(props) {
              return identity(props);
            }
            `,
            snapshot: null,
          },
          0,
          false,
          false,
          opts.rust,
        );
      }
    }
  } else {
    // Non-watch mode. For simplicity we re-use the same watchSrc() function.
    // After the first build completes run tests and exit
    const tsWatch: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram> =
      watchSrc(
        () => {},
        async (isTypecheckSuccess: boolean) => {
          let isSuccess = false;
          if (!isTypecheckSuccess) {
            console.error(
              'Found typescript errors in Forget source code, skipping test fixtures.',
            );
          } else {
            try {
              execSync('yarn build', {cwd: BABEL_PLUGIN_ROOT});
              console.log('Built compiler successfully with tsup');

              if (opts.rust && !buildRust()) {
                throw new Error('Failed to build Rust compiler');
              }

              // Determine which filter to use
              let testFilter: TestFilter | null = null;
              if (opts.pattern) {
                testFilter = {
                  paths: [opts.pattern],
                };
              }

              const results = await runFixtures(
                worker,
                testFilter,
                0,
                opts.debug,
                false, // no requireSingleFixture in non-watch mode
                opts.sync,
                opts.rust,
              );
              if (opts.update) {
                update(results);
                isSuccess = true;
              } else {
                isSuccess = report(results, opts.verbose, opts.rust);
              }
            } catch (e) {
              console.warn('Failed to build compiler with tsup:', e);
            }
          }
          tsWatch?.close();
          await worker.end();
          process.exit(isSuccess ? 0 : 1);
        },
      );
  }
}

async function runMinimizeCommand(opts: MinimizeOptions): Promise<void> {
  // Resolve the input path
  const inputPath = path.isAbsolute(opts.path)
    ? opts.path
    : path.resolve(PROJECT_ROOT, opts.path);

  // Check if file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Read the input file
  const input = fs.readFileSync(inputPath, 'utf-8');
  const filename = path.basename(inputPath);
  const firstLine = input.substring(0, input.indexOf('\n'));
  const language = parseLanguage(firstLine);
  const sourceType = parseSourceType(firstLine);

  if (opts.rust && !buildRust()) {
    console.error('Error: Failed to build Rust compiler');
    process.exit(1);
  }

  console.log(
    `Minimizing: ${inputPath}${opts.rust ? ' (using Rust compiler)' : ''}`,
  );

  const originalLines = input.split('\n').length;

  // Run the minimization
  const result = minimize(input, filename, language, sourceType, opts.rust);

  if (result.kind === 'success') {
    console.log('Could not minimize: the input compiles successfully.');
    process.exit(0);
  }

  if (result.kind === 'minimal') {
    console.log(
      'Could not minimize: the input fails but is already minimal and cannot be reduced further.',
    );
    process.exit(0);
  }

  // Output the minimized code
  console.log('--- Minimized Code ---');
  console.log(result.source);

  const minimizedLines = result.source.split('\n').length;
  console.log(
    `\nReduced from ${originalLines} lines to ${minimizedLines} lines`,
  );

  if (opts.update) {
    fs.writeFileSync(inputPath, result.source, 'utf-8');
    console.log(`\nUpdated ${inputPath} with minimized code.`);
  }
}

async function runMinimizeRustDeltaCommand(
  opts: MinimizeRustDeltaOptions,
): Promise<void> {
  const inputPath = path.isAbsolute(opts.path)
    ? opts.path
    : path.resolve(PROJECT_ROOT, opts.path);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Build both compilers
  execSync('yarn build', {cwd: BABEL_PLUGIN_ROOT});
  if (!buildRust()) {
    console.error('Error: Failed to build Rust compiler');
    process.exit(1);
  }

  const input = fs.readFileSync(inputPath, 'utf-8');
  const filename = path.basename(inputPath);
  const firstLine = input.substring(0, input.indexOf('\n'));
  const language = parseLanguage(firstLine);
  const sourceType = parseSourceType(firstLine);

  console.log(`Minimizing TS/Rust delta: ${inputPath}`);

  const originalLines = input.split('\n').length;

  const result = minimizeRustDelta(input, filename, language, sourceType);

  if (result.kind === 'no_delta') {
    console.log(
      'Could not minimize: TS and Rust compilers produce the same output.',
    );
    process.exit(0);
  }

  if (result.kind === 'minimal') {
    console.log(
      'Could not minimize: the delta exists but the input is already minimal.',
    );
    process.exit(0);
  }

  console.log('--- Minimized Code ---');
  console.log(result.source);

  const minimizedLines = result.source.split('\n').length;
  console.log(
    `\nReduced from ${originalLines} lines to ${minimizedLines} lines`,
  );

  if (opts.update) {
    fs.writeFileSync(inputPath, result.source, 'utf-8');
    console.log(`\nUpdated ${inputPath} with minimized code.`);
  }
}

async function runCompileCommand(opts: CompileOptions): Promise<void> {
  // Resolve the input path
  const inputPath = path.isAbsolute(opts.path)
    ? opts.path
    : path.resolve(PROJECT_ROOT, opts.path);

  // Check if file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Read the input file
  const input = fs.readFileSync(inputPath, 'utf-8');
  const filename = path.basename(inputPath);
  const firstLine = input.substring(0, input.indexOf('\n'));
  const language = parseLanguage(firstLine);
  const sourceType = parseSourceType(firstLine);

  // Import the compiler
  const importedCompilerPlugin = require(BABEL_PLUGIN_SRC) as Record<
    string,
    any
  >;
  const BabelPluginReactCompiler = importedCompilerPlugin['default'];
  const parseConfigPragmaForTests =
    importedCompilerPlugin[PARSE_CONFIG_PRAGMA_IMPORT];
  const printFunctionWithOutlined = importedCompilerPlugin[PRINT_HIR_IMPORT];
  const printReactiveFunctionWithOutlined =
    importedCompilerPlugin[PRINT_REACTIVE_IR_IMPORT];
  const EffectEnum = importedCompilerPlugin['Effect'];
  const ValueKindEnum = importedCompilerPlugin['ValueKind'];
  const ValueReasonEnum = importedCompilerPlugin['ValueReason'];

  // Setup debug logger
  let lastLogged: string | null = null;
  const debugIRLogger = opts.debug
    ? (value: any) => {
        let printed: string;
        switch (value.kind) {
          case 'hir':
            printed = printFunctionWithOutlined(value.value);
            break;
          case 'reactive':
            printed = printReactiveFunctionWithOutlined(value.value);
            break;
          case 'debug':
            printed = value.value;
            break;
          case 'ast':
            printed = '(ast)';
            break;
          default:
            printed = String(value);
        }

        if (printed !== lastLogged) {
          lastLogged = printed;
          console.log(`${chalk.green(value.name)}:\n${printed}\n`);
        } else {
          console.log(`${chalk.blue(value.name)}: (no change)\n`);
        }
      }
    : () => {};

  // Parse the input
  let ast;
  try {
    ast = parseInput(input, filename, language, sourceType);
  } catch (e: any) {
    console.error(`Parse error: ${e.message}`);
    process.exit(1);
  }

  // Build plugin options
  const config = parseConfigPragmaForTests(firstLine, {compilationMode: 'all'});
  const options = {
    ...config,
    environment: {
      ...config.environment,
    },
    logger: {
      logEvent: () => {},
      debugLogIRs: debugIRLogger,
    },
    enableReanimatedCheck: false,
  };

  // Compile
  const {transformFromAstSync} = require('@babel/core');
  try {
    const result = transformFromAstSync(ast, input, {
      filename: '/' + filename,
      highlightCode: false,
      retainLines: true,
      compact: true,
      plugins: [[BabelPluginReactCompiler, options]],
      sourceType: 'module',
      ast: false,
      cloneInputAst: true,
      configFile: false,
      babelrc: false,
    });

    if (result?.code != null) {
      // Format the output
      const prettier = require('prettier');
      const formatted = await prettier.format(result.code, {
        semi: true,
        parser: language === 'typescript' ? 'babel-ts' : 'flow',
      });
      console.log(formatted);
    } else {
      console.error('Error: No code emitted from compiler');
      process.exit(1);
    }
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    ['test', '$0'],
    'Run compiler tests',
    yargs => {
      return yargs
        .boolean('sync')
        .describe(
          'sync',
          'Run compiler in main thread (instead of using worker threads or subprocesses). Defaults to false.',
        )
        .default('sync', false)
        .boolean('worker-threads')
        .describe(
          'worker-threads',
          'Run compiler in worker threads (instead of subprocesses). Defaults to true.',
        )
        .default('worker-threads', true)
        .boolean('watch')
        .describe(
          'watch',
          'Run compiler in watch mode, re-running after changes',
        )
        .alias('w', 'watch')
        .default('watch', false)
        .boolean('update')
        .alias('u', 'update')
        .describe('update', 'Update fixtures')
        .default('update', false)
        .string('pattern')
        .alias('p', 'pattern')
        .describe(
          'pattern',
          'Optional glob pattern to filter fixtures (e.g., "error.*", "use-memo")',
        )
        .boolean('debug')
        .alias('d', 'debug')
        .describe('debug', 'Enable debug logging to print HIR for each pass')
        .default('debug', false)
        .boolean('verbose')
        .alias('v', 'verbose')
        .describe('verbose', 'Print individual test results')
        .default('verbose', false)
        .boolean('rust')
        .describe('rust', 'Use the Rust compiler backend instead of TypeScript')
        .default('rust', false);
    },
    async argv => {
      await runTestCommand(argv as TestOptions);
    },
  )
  .command(
    'minimize <path>',
    'Minimize a test case to reproduce a compiler error',
    yargs => {
      return yargs
        .positional('path', {
          describe: 'Path to the file to minimize',
          type: 'string',
          demandOption: true,
        })
        .boolean('update')
        .alias('u', 'update')
        .describe(
          'update',
          'Update the input file in-place with the minimized version',
        )
        .default('update', false)
        .boolean('rust')
        .describe('rust', 'Use the Rust compiler backend instead of TypeScript')
        .default('rust', false);
    },
    async argv => {
      await runMinimizeCommand(argv as unknown as MinimizeOptions);
    },
  )
  .command(
    'minimize-rust-delta <path>',
    'Minimize a test case to the smallest code that still produces different output between TS and Rust compilers',
    yargs => {
      return yargs
        .positional('path', {
          describe: 'Path to the file to minimize',
          type: 'string',
          demandOption: true,
        })
        .boolean('update')
        .alias('u', 'update')
        .describe(
          'update',
          'Update the input file in-place with the minimized version',
        )
        .default('update', false);
    },
    async argv => {
      await runMinimizeRustDeltaCommand(
        argv as unknown as MinimizeRustDeltaOptions,
      );
    },
  )
  .command(
    'compile <path>',
    'Compile a file with the React Compiler',
    yargs => {
      return yargs
        .positional('path', {
          describe: 'Path to the file to compile',
          type: 'string',
          demandOption: true,
        })
        .boolean('debug')
        .alias('d', 'debug')
        .describe('debug', 'Enable debug logging to print HIR for each pass')
        .default('debug', false);
    },
    async argv => {
      await runCompileCommand(argv as unknown as CompileOptions);
    },
  )
  .help('help')
  .strict()
  .demandCommand()
  .parse();

/**
 * Do a test run and return the test results
 */
async function runFixtures(
  worker: Worker & typeof runnerWorker,
  filter: TestFilter | null,
  compilerVersion: number,
  debug: boolean,
  requireSingleFixture: boolean,
  sync: boolean,
  enableRust: boolean = false,
): Promise<TestResults> {
  // We could in theory be fancy about tracking the contents of the fixtures
  // directory via our file subscription, but it's simpler to just re-read
  // the directory each time.
  const fixtures = await getFixtures(filter);
  const isOnlyFixture = filter !== null && fixtures.size === 1;
  const shouldLog = debug && (!requireSingleFixture || isOnlyFixture);

  let entries: Array<[string, TestResult]>;
  if (!sync) {
    // Note: promise.all to ensure parallelism when enabled
    const work: Array<Promise<[string, TestResult]>> = [];
    for (const [fixtureName, fixture] of fixtures) {
      work.push(
        worker
          .transformFixture(
            fixture,
            compilerVersion,
            shouldLog,
            true,
            enableRust,
          )
          .then(result => [fixtureName, result]),
      );
    }

    entries = await Promise.all(work);
  } else {
    entries = [];
    for (const [fixtureName, fixture] of fixtures) {
      let output = await runnerWorker.transformFixture(
        fixture,
        compilerVersion,
        shouldLog,
        true,
        enableRust,
      );
      entries.push([fixtureName, output]);
    }
  }

  return new Map(entries);
}

// Callback to re-run tests after some change
async function onChange(
  worker: Worker & typeof runnerWorker,
  state: RunnerState,
  sync: boolean,
  verbose: boolean,
  enableRust: boolean = false,
) {
  const {compilerVersion, isCompilerBuildValid, mode, filter, debug} = state;
  if (isCompilerBuildValid) {
    const start = performance.now();

    // console.clear() only works when stdout is connected to a TTY device.
    // we're currently piping stdout (see main.ts), so let's do a 'hack'
    console.log('\u001Bc');

    // we don't clear console after this point, since
    // it may contain debug console logging
    const results = await runFixtures(
      worker,
      mode.filter ? filter : null,
      compilerVersion,
      debug,
      true, // requireSingleFixture in watch mode
      sync,
      enableRust,
    );
    const end = performance.now();

    // Track fixture status for autocomplete suggestions
    for (const [basename, result] of results) {
      const actual =
        enableRust && result.actual
          ? normalizeCodeBlankLines(result.actual)
          : result.actual;
      const expected =
        enableRust && result.expected
          ? normalizeCodeBlankLines(result.expected)
          : result.expected;
      const failed = actual !== expected || result.unexpectedError != null;
      state.fixtureLastRunStatus.set(basename, failed ? 'fail' : 'pass');
    }

    if (mode.action === RunnerAction.Update) {
      update(results);
      state.lastUpdate = end;
    } else {
      report(results, verbose, enableRust);
    }
    console.log(`Completed in ${Math.floor(end - start)} ms`);
  } else {
    console.error(
      `${mode}: Found errors in Forget source code, skipping test fixtures.`,
    );
  }
  console.log(
    '\n' +
      (mode.filter
        ? `Current mode = FILTER, pattern = "${filter?.paths[0] ?? ''}".`
        : 'Current mode = NORMAL, run all test fixtures.') +
      '\nWaiting for input or file changes...\n' +
      'u     - update all fixtures\n' +
      `d     - toggle (turn ${debug ? 'off' : 'on'}) debug logging\n` +
      'p     - enter pattern to filter fixtures\n' +
      (mode.filter ? 'a     - run all tests (exit filter mode)\n' : '') +
      'q     - quit\n' +
      '[any] - rerun tests\n',
  );
}
