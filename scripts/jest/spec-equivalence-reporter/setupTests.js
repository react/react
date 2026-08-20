/*!
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {
  patchConsoleMethods,
  resetAllUnexpectedConsoleCalls,
  assertConsoleLogsCleared,
} = require('internal-test-utils/consoleMock');
const spyOn = jest.spyOn;

// Spying on console methods in production builds can mask errors.
// This is why we added an explicit spyOnDev() helper.
// It's too easy to accidentally use the more familiar spyOn() helper though,
// So we disable it entirely.
// Spying on both dev and prod will require using both spyOnDev() and spyOnProd().
global.spyOn = function () {
  throw new Error(
    'Do not use spyOn(). ' +
      'It can accidentally hide unexpected errors in production builds. ' +
      'Use spyOnDev(), spyOnProd(), or spyOnDevAndProd() instead.'
  );
};

global.spyOnDev = function (...args) {
  if (__DEV__) {
    return spyOn(...args);
  }
};

global.spyOnDevAndProd = spyOn;

global.spyOnProd = function (...args) {
  if (!__DEV__) {
    return spyOn(...args);
  }
};

// Patch the console to assert that all console error/warn/log calls assert.
patchConsoleMethods({includeLog: !!process.env.CI});
beforeEach(resetAllUnexpectedConsoleCalls);
afterEach(assertConsoleLogsCleared);

// TODO: enable this check so we don't forget to reset spyOnX mocks.
// afterEach(() => {
//   if (
//       console[methodName] !== mockMethod &&
//       !jest.isMockFunction(console[methodName])
//   ) {
//     throw new Error(
//       `Test did not tear down console.${methodName} mock properly.`
//     );
//   }
// });

expect.extend({
  ...require('../matchers/reactTestMatchers'),
  ...require('../matchers/toThrow'),
});
