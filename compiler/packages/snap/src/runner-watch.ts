/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import watcher from '@parcel/watcher';
import path from 'path';
import ts from 'typescript';
import {
  FIXTURES_PATH,
  BABEL_PLUGIN_ROOT,
  BABEL_PLUGIN_RUST_ROOT,
  CRATES_PATH,
} from './constants';
import {TestFilter, getFixtures} from './fixture-utils';
import {execSync} from 'child_process';
import fs from 'fs';

export function watchSrc(
  onStart: () => void,
  onComplete: (isSuccess: boolean) => void,
): ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram> {
  const configPath = ts.findConfigFile(
    /*searchPath*/ BABEL_PLUGIN_ROOT,
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }
  const createProgram = ts.createSemanticDiagnosticsBuilderProgram;
  const host = ts.createWatchCompilerHost(
    configPath,
    undefined,
    ts.sys,
    createProgram,
    () => {}, // we manually report errors in afterProgramCreate
    () => {}, // we manually report watch status
  );

  const origCreateProgram = host.createProgram;
  host.createProgram = (rootNames, options, host, oldProgram) => {
    onStart();
    return origCreateProgram(rootNames, options, host, oldProgram);
  };
  host.afterProgramCreate = program => {
    /**
     * Avoid calling original postProgramCreate because it always emits tsc
     * compilation output
     */

    // syntactic diagnostics refer to javascript syntax
    const errors = program
      .getSyntacticDiagnostics()
      .filter(diag => diag.category === ts.DiagnosticCategory.Error);
    // semantic diagnostics refer to typescript semantics
    errors.push(
      ...program
        .getSemanticDiagnostics()
        .filter(diag => diag.category === ts.DiagnosticCategory.Error),
    );

    if (errors.length > 0) {
      for (const diagnostic of errors) {
        let fileLoc: string;
        if (diagnostic.file) {
          // https://github.com/microsoft/TypeScript/blob/ddd5084659c423f4003d2176e12d879b6a5bcf30/src/compiler/program.ts#L663-L674
          const {line, character} = ts.getLineAndCharacterOfPosition(
            diagnostic.file,
            diagnostic.start!,
          );
          const fileName = path.relative(
            ts.sys.getCurrentDirectory(),
            diagnostic.file.fileName,
          );
          fileLoc = `${fileName}:${line + 1}:${character + 1} - `;
        } else {
          fileLoc = '';
        }
        console.error(
          `${fileLoc}error TS${diagnostic.code}:`,
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      }
      console.error(
        `Compilation failed (${errors.length} ${
          errors.length > 1 ? 'errors' : 'error'
        }).\n`,
      );
    }

    const isSuccess = errors.length === 0;
    onComplete(isSuccess);
  };

  // `createWatchProgram` creates an initial program, watches files, and updates
  // the program over time.
  return ts.createWatchProgram(host);
}

/**
 * Watch mode helpers
 */
export enum RunnerAction {
  Test = 'Test',
  Update = 'Update',
}

type RunnerMode = {
  action: RunnerAction;
  filter: boolean;
};

export type RunnerState = {
  // Monotonically increasing integer to describe the 'version' of the compiler.
  // This is passed to `compile()` when compiling, so that the worker knows when
  // to reset its module cache (compared to using its cached compiler version)
  compilerVersion: number;
  isCompilerBuildValid: boolean;
  // timestamp of the last update
  lastUpdate: number;
  mode: RunnerMode;
  filter: TestFilter | null;
  debug: boolean;
  // Input mode for interactive pattern entry
  inputMode: 'none' | 'pattern';
  inputBuffer: string;
  // Autocomplete state
  allFixtureNames: Array<string>;
  matchingFixtures: Array<string>;
  selectedIndex: number;
  // Track last run status of each fixture (for autocomplete suggestions)
  fixtureLastRunStatus: Map<string, 'pass' | 'fail'>;
};

function subscribeFixtures(
  state: RunnerState,
  onChange: (state: RunnerState) => void,
) {
  // Watch the fixtures directory for changes
  watcher.subscribe(FIXTURES_PATH, async (err, _events) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    // Try to ignore changes that occurred as a result of our explicitly updating
    // fixtures in update().
    // Currently keeps a timestamp of last known changes, and ignore events that occurred
    // around that timestamp.
    const isRealUpdate = performance.now() - state.lastUpdate > 5000;
    if (isRealUpdate) {
      // Fixtures changed, re-run tests
      state.mode.action = RunnerAction.Test;
      onChange(state);
    }
  });
}

function subscribeTsc(
  state: RunnerState,
  onChange: (state: RunnerState) => void,
  enableRust: boolean = false,
) {
  // Run TS in incremental watch mode
  watchSrc(
    function onStart() {
      // Notify the user when compilation starts but don't clear the screen yet
      console.log('\nCompiling...');
    },
    isTypecheckSuccess => {
      let isCompilerBuildValid = false;
      if (isTypecheckSuccess) {
        try {
          execSync('yarn build', {cwd: BABEL_PLUGIN_ROOT});
          console.log('Built compiler successfully with tsup');
          isCompilerBuildValid = true;
        } catch (e) {
          console.warn('Failed to build compiler with tsup:', e);
        }
      }
      // When using Rust, also build the Rust compiler after TS build succeeds
      if (isCompilerBuildValid && enableRust) {
        isCompilerBuildValid = buildRust();
      }
      // Bump the compiler version after a build finishes
      // and re-run tests
      if (isCompilerBuildValid) {
        state.compilerVersion++;
      }
      state.isCompilerBuildValid = isCompilerBuildValid;
      state.mode.action = RunnerAction.Test;
      onChange(state);
    },
  );
}

export function buildRust(): boolean {
  const compilerRoot = path.join(BABEL_PLUGIN_ROOT, '..', '..');
  try {
    execSync('cargo build -p react_compiler_napi', {
      cwd: compilerRoot,
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('Failed to build Rust compiler with cargo:', e);
    return false;
  }

  // Copy the built native module to the babel plugin package
  const platform = process.platform;
  const ext = platform === 'darwin' ? 'dylib' : 'so';
  const libName =
    platform === 'darwin'
      ? 'libreact_compiler_napi.dylib'
      : 'libreact_compiler_napi.so';
  const sourcePath = path.join(compilerRoot, 'target', 'debug', libName);
  const destPath = path.join(BABEL_PLUGIN_RUST_ROOT, 'native', 'index.node');

  try {
    fs.copyFileSync(sourcePath, destPath);
  } catch (e) {
    console.error(
      `Failed to copy native module (${sourcePath} -> ${destPath}):`,
      e,
    );
    return false;
  }

  // Build the TypeScript wrapper
  try {
    execSync('yarn build', {cwd: BABEL_PLUGIN_RUST_ROOT, stdio: 'inherit'});
    console.log('Built Rust compiler successfully');
  } catch (e) {
    console.error('Failed to build Rust babel plugin with tsc:', e);
    return false;
  }

  return true;
}

function subscribeRustCrates(
  state: RunnerState,
  onChange: (state: RunnerState) => void,
) {
  watcher.subscribe(CRATES_PATH, async (err, events) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    // Only rebuild on .rs file changes
    const hasRustChanges = events.some(e => e.path.endsWith('.rs'));
    if (!hasRustChanges) {
      return;
    }
    console.log('\nRust source changed, rebuilding...');
    if (buildRust()) {
      state.compilerVersion++;
      state.isCompilerBuildValid = true;
      state.mode.action = RunnerAction.Test;
      onChange(state);
    } else {
      state.isCompilerBuildValid = false;
      console.error('Rust build failed, waiting for changes...');
    }
  });
}

/**
 * Levenshtein edit distance between two strings
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create a 2D array for memoization
  const dp: number[][] = Array.from({length: m + 1}, () =>
    Array(n + 1).fill(0),
  );

  // Base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function filterFixtures(
  allNames: Array<string>,
  pattern: string,
): Array<string> {
  if (pattern === '') {
    return allNames;
  }
  const lowerPattern = pattern.toLowerCase();
  const matches = allNames.filter(name =>
    name.toLowerCase().includes(lowerPattern),
  );
  // Sort by edit distance (lower = better match)
  matches.sort((a, b) => {
    const distA = editDistance(lowerPattern, a.toLowerCase());
    const distB = editDistance(lowerPattern, b.toLowerCase());
    return distA - distB;
  });
  return matches;
}

const MAX_DISPLAY = 15;

function renderAutocomplete(state: RunnerState): void {
  // Clear terminal
  console.log('\u001Bc');

  // Show current input
  console.log(`Pattern: ${state.inputBuffer}`);
  console.log('');

  // Get current filter pattern if active
  const currentFilterPattern =
    state.mode.filter && state.filter ? state.filter.paths[0] : null;

  // Show matching fixtures (limit to MAX_DISPLAY)
  const toShow = state.matchingFixtures.slice(0, MAX_DISPLAY);

  toShow.forEach((name, i) => {
    const isSelected = i === state.selectedIndex;
    const matchesCurrentFilter =
      currentFilterPattern != null &&
      name.toLowerCase().includes(currentFilterPattern.toLowerCase());

    let prefix: string;
    if (isSelected) {
      prefix = '> ';
    } else if (matchesCurrentFilter) {
      prefix = '* ';
    } else {
      prefix = '  ';
    }
    console.log(`${prefix}${name}`);
  });

  if (state.matchingFixtures.length > MAX_DISPLAY) {
    console.log(
      `  ... and ${state.matchingFixtures.length - MAX_DISPLAY} more`,
    );
  }

  console.log('');
  console.log('↑/↓/Tab navigate | Enter select | Esc cancel');
}

function subscribeKeyEvents(
  state: RunnerState,
  onChange: (state: RunnerState) => void,
) {
  process.stdin.on('keypress', async (str, key) => {
    // Handle input mode (pattern entry with autocomplete)
    if (state.inputMode !== 'none') {
      if (key.name === 'return') {
        // Enter pressed - use selected fixture or typed text
        let pattern: string;
        if (
          state.selectedIndex >= 0 &&
          state.selectedIndex < state.matchingFixtures.length
        ) {
          pattern = state.matchingFixtures[state.selectedIndex];
        } else {
          pattern = state.inputBuffer.trim();
        }

        state.inputMode = 'none';
        state.inputBuffer = '';
        state.allFixtureNames = [];
        state.matchingFixtures = [];
        state.selectedIndex = -1;

        if (pattern !== '') {
          state.filter = {paths: [pattern]};
          state.mode.filter = true;
          state.mode.action = RunnerAction.Test;
          onChange(state);
        }
        return;
      } else if (key.name === 'escape') {
        // Cancel input mode
        state.inputMode = 'none';
        state.inputBuffer = '';
        state.allFixtureNames = [];
        state.matchingFixtures = [];
        state.selectedIndex = -1;
        // Redraw normal UI
        onChange(state);
        return;
      } else if (key.name === 'up' || (key.name === 'tab' && key.shift)) {
        // Navigate up in autocomplete list
        if (state.matchingFixtures.length > 0) {
          if (state.selectedIndex <= 0) {
            state.selectedIndex =
              Math.min(state.matchingFixtures.length, MAX_DISPLAY) - 1;
          } else {
            state.selectedIndex--;
          }
          renderAutocomplete(state);
        }
        return;
      } else if (key.name === 'down' || (key.name === 'tab' && !key.shift)) {
        // Navigate down in autocomplete list
        if (state.matchingFixtures.length > 0) {
          const maxIndex =
            Math.min(state.matchingFixtures.length, MAX_DISPLAY) - 1;
          if (state.selectedIndex >= maxIndex) {
            state.selectedIndex = 0;
          } else {
            state.selectedIndex++;
          }
          renderAutocomplete(state);
        }
        return;
      } else if (key.name === 'backspace') {
        if (state.inputBuffer.length > 0) {
          state.inputBuffer = state.inputBuffer.slice(0, -1);
          state.matchingFixtures = filterFixtures(
            state.allFixtureNames,
            state.inputBuffer,
          );
          state.selectedIndex = -1;
          renderAutocomplete(state);
        }
        return;
      } else if (str && !key.ctrl && !key.meta) {
        // Regular character - accumulate, filter, and render
        state.inputBuffer += str;
        state.matchingFixtures = filterFixtures(
          state.allFixtureNames,
          state.inputBuffer,
        );
        state.selectedIndex = -1;
        renderAutocomplete(state);
        return;
      }
      return; // Ignore other keys in input mode
    }

    // Normal mode keypress handling
    if (key.name === 'u') {
      // u => update fixtures
      state.mode.action = RunnerAction.Update;
    } else if (key.name === 'q') {
      process.exit(0);
    } else if (key.name === 'a') {
      // a => exit filter mode and run all tests
      state.mode.filter = false;
      state.filter = null;
      state.mode.action = RunnerAction.Test;
    } else if (key.name === 'd') {
      // d => toggle debug logging
      state.debug = !state.debug;
      state.mode.action = RunnerAction.Test;
    } else if (key.name === 'p') {
      // p => enter pattern input mode with autocomplete
      state.inputMode = 'pattern';
      state.inputBuffer = '';

      // Load all fixtures for autocomplete
      const fixtures = await getFixtures(null);
      state.allFixtureNames = Array.from(fixtures.keys()).sort();
      // Show failed fixtures first when no pattern entered
      const failedFixtures = Array.from(state.fixtureLastRunStatus.entries())
        .filter(([_, status]) => status === 'fail')
        .map(([name]) => name)
        .sort();
      state.matchingFixtures =
        failedFixtures.length > 0 ? failedFixtures : state.allFixtureNames;
      state.selectedIndex = -1;

      renderAutocomplete(state);
      return; // Don't trigger onChange yet
    } else {
      // any other key re-runs tests
      state.mode.action = RunnerAction.Test;
    }
    onChange(state);
  });
}

export async function makeWatchRunner(
  onChange: (state: RunnerState) => void,
  debugMode: boolean,
  initialPattern?: string,
  enableRust: boolean = false,
): Promise<void> {
  // Determine initial filter state
  let filter: TestFilter | null = null;
  let filterEnabled = false;

  if (initialPattern) {
    filter = {paths: [initialPattern]};
    filterEnabled = true;
  }

  const state: RunnerState = {
    compilerVersion: 0,
    isCompilerBuildValid: false,
    lastUpdate: -1,
    mode: {
      action: RunnerAction.Test,
      filter: filterEnabled,
    },
    filter,
    debug: debugMode,
    inputMode: 'none',
    inputBuffer: '',
    allFixtureNames: [],
    matchingFixtures: [],
    selectedIndex: -1,
    fixtureLastRunStatus: new Map(),
  };

  subscribeTsc(state, onChange, enableRust);
  subscribeFixtures(state, onChange);
  subscribeKeyEvents(state, onChange);
  if (enableRust) {
    subscribeRustCrates(state, onChange);
  }
}
