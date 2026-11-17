/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {
  isObject,
  assertSingleSource,
  compareValue,
  throwAtPath,
} = require('./FlightFuzzCompare');

function createOracle() {
  const state = {
    expectedByReceived: new WeakMap(),
    receivedValues: [],
  };
  return {
    observeValue(expectedValue, received) {
      observeValue(state, expectedValue, received, 'value');
    },
    // Compare every received value again to catch values that changed after
    // delivery.
    async checkForMutations() {
      const visited = new Set();
      state.receivedValues.forEach(root => traverse(state, root, visited));
    },
  };
}

function observeValue(state, expectedValue, received, path) {
  const root = {expectedValue, received, path};
  traverse(state, root);
  state.receivedValues.push(root);
}

function traverse(state, root, visited = new Set()) {
  const todo = [root];
  while (todo.length > 0) {
    const pair = todo.pop();
    const {expectedValue, received, path} = pair;
    try {
      const children = compareValue(pair);
      if (!isObject(received)) {
        continue;
      }
      assertSingleSource(state.expectedByReceived, expectedValue, received);
      // A source object may arrive as several copies. Visit each copy once.
      if (visited.has(received)) {
        continue;
      }
      visited.add(received);
      for (let i = children.length - 1; i >= 0; i--) {
        todo.push(children[i]);
      }
    } catch (error) {
      throwAtPath(error, path);
    }
  }
}

module.exports = {createOracle};
