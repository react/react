/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Compares received values with their source values, and subscribes to every
// Promise it finds in them. After each source event the test asks which
// results are due and have not arrived.

const {
  isObject,
  assertSingleSource,
  compareValue,
  throwAtPath,
} = require('./FlightFuzzCompare');
const {
  separateResultTypes,
  createModelLookup,
  getRootExpectation,
  getPromiseExpectation,
} = require('./FlightFuzzReadiness');

function createOracle(
  fixture = {valueMetadata: new Map(), requiredEvents: new Map()},
) {
  const state = {
    fixture,
    expectedByReceived: new WeakMap(),
    receivedValues: [],
    observedAsyncValues: new WeakSet(),
    thenableResults: new WeakMap(),
    resultChecks: [],
    failures: [],
    pendingTasks: 0,
  };
  return {
    observeValue(expectedValue, received) {
      observeValue(state, expectedValue, received, 'value');
    },
    subscribeToRoot(root, expectedValue, {subscribeAgain = false} = {}) {
      const check = registerResultCheck(
        state,
        expectedValue,
        'root',
        findModels => getRootExpectation(fixture, expectedValue, findModels),
      );
      subscribe(state, root, check, subscribeAgain);
    },
    getMissingResults() {
      throwIfFailed(state);
      const findModels = createModelLookup(fixture);
      return state.resultChecks.filter(
        check => !check.done && check.getExpectation(findModels).mustSettle,
      );
    },
    isComplete() {
      throwIfFailed(state);
      return (
        state.pendingTasks === 0 &&
        state.resultChecks.every(check => check.done)
      );
    },
    // Compare every received value again to catch values that changed after
    // delivery. Async values must still be the ones observed.
    async checkForMutations() {
      state.pendingTasks++;
      try {
        const visited = new Set();
        state.receivedValues.forEach(root =>
          traverse(state, root, false, visited),
        );
        throwIfFailed(state);
      } finally {
        state.pendingTasks--;
      }
    },
  };
}

function observeValue(state, expectedValue, received, path) {
  const root = {expectedValue, received, path};
  traverse(state, root, true);
  state.receivedValues.push(root);
}

// With `observe`, this also subscribes to each async value it finds. Without
// it, finding an async value it has not seen means a delivered value was
// replaced.
function traverse(state, root, observe, visited = new Set()) {
  const {fixture} = state;
  const todo = [root];
  while (todo.length > 0) {
    const pair = todo.pop();
    const {expectedValue, received, path} = pair;
    try {
      const children = compareValue(fixture, pair);
      if (!isObject(received)) {
        continue;
      }
      assertSingleSource(state.expectedByReceived, expectedValue, received);
      // A source object may arrive as several copies. Visit each copy once.
      if (visited.has(received)) {
        continue;
      }
      visited.add(received);
      const metadata = fixture.valueMetadata.get(expectedValue);
      if (metadata === undefined) {
        // There is nothing to subscribe to.
      } else if (separateResultTypes.includes(metadata.type)) {
        if (!state.observedAsyncValues.has(received)) {
          if (!observe) {
            throw new Error('A received async value was replaced');
          }
          state.observedAsyncValues.add(received);
          observeAsyncValue(state, metadata, pair);
        }
      }
      for (let i = children.length - 1; i >= 0; i--) {
        todo.push(children[i]);
      }
    } catch (error) {
      throwAtPath(error, path);
    }
  }
}

function observeAsyncValue(state, metadata, pair) {
  switch (metadata.type) {
    case 'promise':
      observePromise(state, metadata, pair);
      break;
  }
}

function observePromise(state, metadata, {expectedValue, received, path}) {
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.then',
    findModels => getPromiseExpectation(state.fixture, metadata, findModels),
  );
  subscribe(state, received, check, true);
}

function registerResultCheck(state, expectedValue, path, getExpectation) {
  const check = {expectedValue, path, getExpectation, done: false};
  state.resultChecks.push(check);
  return check;
}

function subscribe(state, thenable, check, subscribeAgain) {
  const settle = (value, rejected) => {
    guard(state, () => {
      // Repeated subscriptions must return the same value or error.
      const previous = state.thenableResults.get(thenable);
      if (previous === undefined) {
        state.thenableResults.set(thenable, {rejected, value});
      } else if (
        previous.rejected !== rejected ||
        !Object.is(previous.value, value)
      ) {
        throw new Error(
          'A thenable changed its settlement between observations',
        );
      }
    });
    handleResult(state, check, value, rejected);
    if (subscribeAgain) {
      const repeat = registerResultCheck(
        state,
        check.expectedValue,
        check.path + ' (again)',
        check.getExpectation,
      );
      subscribe(state, thenable, repeat, false);
    }
  };
  thenable.then(
    value => settle(value, false),
    error => settle(error, true),
  );
}

function handleResult(state, check, value, rejected = false) {
  guard(state, () => {
    expect(check.done).toBe(false);
    const expectation = check.getExpectation(createModelLookup(state.fixture));
    if (rejected) {
      if (expectation.errors.length === 0) {
        throw new Error(
          check.path + ': unexpected rejection: ' + String(value),
          {cause: value},
        );
      }
      assertExpectedError(value, expectation.errors, check.path);
    } else {
      if (!expectation.canFulfill) {
        if (expectation.mustSettle) {
          throw new Error(check.path + ': expected a rejection');
        }
        throw new Error('Delivered before its inputs arrived: ' + check.path);
      }
      observeValue(state, expectation.value, value, check.path);
    }
    check.done = true;
  });
}

// Server errors are compared by digest; local module errors by identity.
function assertExpectedError(error, expected, path) {
  if (
    !expected.some(candidate =>
      candidate instanceof Error
        ? candidate === error
        : error != null &&
          candidate != null &&
          error.digest === candidate.digest,
    )
  ) {
    throw new Error(
      path +
        ': rejected with "' +
        String(error) +
        '", expected ' +
        expected
          .map(candidate =>
            candidate instanceof Error
              ? '"' + candidate.message + '"'
              : 'digest ' + candidate.digest,
          )
          .join(' or '),
    );
  }
}

function guard(state, run) {
  try {
    run();
  } catch (error) {
    recordFailure(state, error);
  }
}

function throwIfFailed(state) {
  if (state.failures.length > 0) {
    throw state.failures[0];
  }
}

function recordFailure(state, error) {
  state.failures.push(error);
}

module.exports = {createOracle};
