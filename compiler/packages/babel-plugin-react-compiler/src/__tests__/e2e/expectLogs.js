/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const logs = [];

export function log(message) {
  logs.push(message);
}

export function expectLogsAndClear(expected) {
  expect(logs).toEqual(expected);
  logs.length = 0;
}
