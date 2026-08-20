/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const spawnSync = require('child_process').spawnSync;

describe('ReactClassEquivalence', () => {
  it('tests the same thing for es6 classes and CoffeeScript', () => {
    const result1 = runJest('ReactCoffeeScriptClass-test.coffee');
    const result2 = runJest('ReactES6Class-test.js');
    compareResults(result1, result2);
  });

  it('tests the same thing for es6 classes and TypeScript', () => {
    const result1 = runJest('ReactTypeScriptClass-test.ts');
    const result2 = runJest('ReactES6Class-test.js');
    compareResults(result1, result2);
  });
});

function runJest(testFile) {
  const cwd = process.cwd();
  const extension = process.platform === 'win32' ? '.cmd' : '';
  const command = process.env.npm_lifecycle_event;
  const defaultReporter = '--reporters=default';
  const equivalenceReporter =
    '--reporters=<rootDir>/scripts/jest/spec-equivalence-reporter/equivalenceReporter.js';
  if (!command.startsWith('test')) {
    throw new Error(
      'Expected this test to run as a result of one of test commands.',
    );
  }
  const result = spawnSync(
    'yarn' + extension,
    [command, testFile, defaultReporter, equivalenceReporter],
    {
      cwd,
      env: Object.assign({}, process.env, {
        REACT_CLASS_EQUIVALENCE_TEST: 'true',
      }),
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      'jest process exited with: ' +
        result.status +
        '\n' +
        'stdout: ' +
        result.stdout.toString() +
        'stderr: ' +
        result.stderr.toString(),
    );
  }

  return result.stdout.toString() + result.stderr.toString();
}

function compareResults(a, b) {
  const regexp = /EQUIVALENCE.*$/gm;
  const aSpecs = (a.match(regexp) || []).sort().join('\n');
  const bSpecs = (b.match(regexp) || []).sort().join('\n');

  if (aSpecs.length === 0 && bSpecs.length === 0) {
    throw new Error('No spec results found in the output');
  }

  expect(aSpecs).toEqual(bSpecs);
}
