/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {runBabelPluginReactCompiler} from '../Babel/RunReactCompilerBabelPlugin';
import type {Logger, LoggerEvent} from '../Entrypoint';

const COMPONENT =
  'function Button(props) { return <button>{props.label}</button> }';

function compileWithSources(
  file: string,
  sources: Array<string> | ((filename: string) => boolean),
): Array<[string | null, LoggerEvent]> {
  const logs: [string | null, LoggerEvent][] = [];
  const logger: Logger = {
    logEvent(filename, event) {
      logs.push([filename, event]);
    },
  };
  runBabelPluginReactCompiler(COMPONENT, file, 'typescript', {logger, sources});
  return logs;
}

function diagnostics(
  logs: Array<[string | null, LoggerEvent]>,
): Array<Extract<LoggerEvent, {kind: 'CompileDiagnostic'}>> {
  return logs
    .map(([, event]) => event)
    .filter(
      (event): event is Extract<LoggerEvent, {kind: 'CompileDiagnostic'}> =>
        event.kind === 'CompileDiagnostic',
    );
}

it('warns when an array `sources` prefix matches a node_modules file', () => {
  // The doc's repro: `/myapp/` matches the checkout root `/home/ci/myapp`, so a
  // dependency under node_modules ends up in scope.
  const logs = compileWithSources(
    '/home/ci/myapp/node_modules/@vendor/icons/Star.jsx',
    ['/myapp/'],
  );
  const warnings = diagnostics(logs);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].detail.reason).toContain('node_modules');
});

it('warns when an array `sources` entry has no path separator', () => {
  const logs = compileWithSources('/home/ci/myapp/src/Button.jsx', ['myapp']);
  const warnings = diagnostics(logs);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].detail.reason).toContain('no path separator');
});

it('does not warn for an anchored array `sources` prefix', () => {
  const logs = compileWithSources('/home/ci/myapp/src/Button.jsx', [
    '/myapp/src/',
  ]);
  expect(diagnostics(logs)).toHaveLength(0);
});

it('does not warn for the function form of `sources`', () => {
  const logs = compileWithSources(
    '/home/ci/myapp/node_modules/@vendor/icons/Star.jsx',
    () => true,
  );
  expect(diagnostics(logs)).toHaveLength(0);
});
