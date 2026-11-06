/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// The runner flushes delivery after each source event before asking which
// results are missing. Readiness comes from the source, not the client.
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
  };
  return {
    observeValue(expectedValue, received) {
      observeValue(state, expectedValue, received, 'value');
    },
    subscribeToRoot(root, expectedValue, {subscribeAgain = false} = {}) {
      const check = registerResultCheck(state, expectedValue, 'root', () => {
        const events = getRequiredEvents(fixture, expectedValue);
        return getResultExpectation(
          expectedValue,
          canSettle(events),
          getReleasedErrors(events),
        );
      });
      subscribe(state, root, check, subscribeAgain);
    },
    throwIfFailed() {
      throwIfFailed(state);
    },
    getMissingResults() {
      throwIfFailed(state);
      return state.resultChecks.filter(
        check => !check.done && check.getExpectation().mustSettle,
      );
    },
    isComplete() {
      throwIfFailed(state);
      return state.resultChecks.every(check => check.done);
    },
    async checkForMutations() {
      state.receivedValues.forEach(root => traverse(state, root, false));
      throwIfFailed(state);
    },
  };
}

function observeValue(state, expectedValue, received, path) {
  const root = {expectedValue, received, path};
  traverse(state, root, true);
  state.receivedValues.push(root);
}

function traverse(state, root, observe) {
  const todo = [root];
  // One source object may have several received copies. Visit each copy,
  // including on a later check, rather than stopping at the source object.
  const visited = new Set();
  while (todo.length > 0) {
    const pair = todo.pop();
    try {
      const children = compareValue(state, pair, visited);
      if (children === null) {
        continue;
      }
      const metadata = state.fixture.valueMetadata.get(pair.expectedValue);
      if (metadata !== undefined && metadata.type === 'promise') {
        if (observe) {
          if (!state.observedAsyncValues.has(pair.received)) {
            state.observedAsyncValues.add(pair.received);
            observePromise(state, metadata, pair);
          }
        } else if (!state.observedAsyncValues.has(pair.received)) {
          throw new Error('A received async value was replaced');
        }
      }
      for (let i = children.length - 1; i >= 0; i--) {
        todo.push(children[i]);
      }
    } catch (error) {
      if (error.path === undefined) {
        error.message = pair.path + ': ' + error.message;
        error.path = pair.path;
      }
      throw error;
    }
  }
}

// This is the same comparison for initial delivery and later mutation checks.
function compareValue(state, {expectedValue, received, path}, visited) {
  if (
    expectedValue === null ||
    (typeof expectedValue !== 'object' && typeof expectedValue !== 'function')
  ) {
    expect(received).toBe(expectedValue);
    return [];
  }
  const metadata = state.fixture.valueMetadata.get(expectedValue);
  if (metadata !== undefined && metadata.type === 'module') {
    expect(received).toBe(metadata.value);
    return [];
  }
  expect(received).not.toBe(null);
  expect(['object', 'function']).toContain(typeof received);
  const previous = state.expectedByReceived.get(received);
  if (previous !== undefined && previous !== expectedValue) {
    throw new Error('A received object matches two distinct source objects');
  }
  state.expectedByReceived.set(received, expectedValue);
  if (visited.has(received)) {
    return null;
  }
  visited.add(received);
  if (metadata !== undefined) {
    if (metadata.type !== 'promise') {
      throw new Error('Unknown value type: ' + metadata.type);
    }
    expect(typeof received.then).toBe('function');
    return [];
  }
  if (Array.isArray(expectedValue)) {
    expect(Array.isArray(received)).toBe(true);
    expect(received.length).toBe(expectedValue.length);
  } else {
    expect(Object.getPrototypeOf(expectedValue)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(received)).toBe(Object.prototype);
  }
  const keys = Object.keys(expectedValue);
  expect(Object.keys(received)).toEqual(keys);
  return keys.map(key => ({
    expectedValue: expectedValue[key],
    received: received[key],
    path: path + '.' + key,
  }));
}

function registerResultCheck(state, expectedValue, path, getExpectation) {
  const check = {expectedValue, path, getExpectation, done: false};
  state.resultChecks.push(check);
  return check;
}

function getResultExpectation(value, inputsReady, errors) {
  return {
    value,
    canFulfill: inputsReady && errors.length === 0,
    errors: inputsReady ? errors : [],
    mustSettle: inputsReady,
  };
}

function observePromise(state, metadata, {expectedValue, received, path}) {
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.then',
    () => {
      const events = getRequiredEvents(state.fixture, metadata.value);
      return getResultExpectation(
        metadata.value,
        metadata.state === 'fulfilled' && canSettle(events),
        getReleasedErrors(events),
      );
    },
  );
  subscribe(state, received, check, true);
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
    guard(state, () => {
      expect(check.done).toBe(false);
      const expectation = check.getExpectation();
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

function assertExpectedError(error, expected, path) {
  // A client module failure must preserve the exact local error object.
  if (!expected.some(candidate => candidate === error)) {
    throw new Error(
      path +
        ': rejected with "' +
        String(error) +
        '", expected ' +
        expected.map(candidate => '"' + candidate.message + '"').join(' or '),
    );
  }
}

function getRequiredEvents(fixture, value) {
  const todo = [value];
  const seen = new Set();
  const events = new Set();
  while (todo.length > 0) {
    const current = todo.pop();
    if (
      current === null ||
      (typeof current !== 'object' && typeof current !== 'function') ||
      seen.has(current)
    ) {
      continue;
    }
    seen.add(current);
    const metadata = fixture.valueMetadata.get(current);
    // A containing object need not wait for its nested Promise's result.
    if (metadata !== undefined && metadata.type === 'promise') {
      continue;
    }
    (fixture.requiredEvents.get(current) || []).forEach(event =>
      events.add(event),
    );
    if (metadata === undefined) {
      todo.push(...Object.values(current));
    }
  }
  return Array.from(events);
}

function getReleasedErrors(events) {
  return events
    .filter(event => event.released && event.error !== undefined)
    .map(event => event.error);
}

function canSettle(events) {
  // One failed dependency rejects the result without waiting for other loads.
  return (
    events.every(event => event.released) ||
    getReleasedErrors(events).length > 0
  );
}

function guard(state, run) {
  try {
    run();
  } catch (error) {
    state.failures.push(error);
  }
}

function throwIfFailed(state) {
  if (state.failures.length > 0) {
    throw state.failures[0];
  }
}

module.exports = {createOracle};
