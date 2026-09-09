/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const {main} = require('../enable-feature-flag');

describe('enable-feature-flag', () => {
  let consoleError;
  let consoleLog;
  let consoleWarn;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleLog.mockRestore();
    consoleWarn.mockRestore();
  });

  it('should count updated fixtures if fixture pragmas are added', async () => {
    const exit = jest.fn(code => code);
    const updateSnapshots = jest.fn(() => true);
    const verifyAllTestsPass = jest.fn(() => true);

    await main({
      flagName: 'enableFoo',
      enableFlagInEnvironment: jest.fn(),
      runTests: jest.fn(() => ({
        output: 'FAIL: first-fixture\nFAIL: second-fixture',
      })),
      findFixtureFile: jest.fn(testName => `/fixtures/${testName}.js`),
      addPragmaToFixture: jest.fn(() => true),
      updateSnapshots,
      verifyAllTestsPass,
      exit,
    });

    expect(updateSnapshots).toHaveBeenCalledTimes(1);
    expect(verifyAllTestsPass).toHaveBeenCalledTimes(1);
    expect(consoleLog).toHaveBeenCalledWith(
      '\nSummary: Updated 2 fixtures, 0 not found'
    );
    expect(consoleLog).toHaveBeenCalledWith(
      '  - Updated 2 fixture files with pragma'
    );
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('should fail before updating snapshots if a fixture file cannot be found', async () => {
    const exit = jest.fn(code => code);
    const updateSnapshots = jest.fn(() => true);
    const verifyAllTestsPass = jest.fn(() => true);

    await main({
      flagName: 'enableFoo',
      enableFlagInEnvironment: jest.fn(),
      runTests: jest.fn(() => ({
        output: 'FAIL: first-fixture\nFAIL: missing-fixture',
      })),
      findFixtureFile: jest.fn(testName =>
        testName === 'missing-fixture' ? null : `/fixtures/${testName}.js`
      ),
      addPragmaToFixture: jest.fn(() => true),
      updateSnapshots,
      verifyAllTestsPass,
      exit,
    });

    expect(consoleWarn).toHaveBeenCalledWith(
      'Could not find fixture file for: missing-fixture'
    );
    expect(consoleLog).toHaveBeenCalledWith(
      '\nSummary: Updated 1 fixtures, 1 not found'
    );
    expect(consoleError).toHaveBeenCalledWith(
      '\nFailed to update snapshots, could not find:\nmissing-fixture'
    );
    expect(updateSnapshots).not.toHaveBeenCalled();
    expect(verifyAllTestsPass).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
