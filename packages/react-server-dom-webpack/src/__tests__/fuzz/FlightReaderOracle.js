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
        const ready = areInputsReady(fixture, expectedValue);
        return {value: expectedValue, ready};
      });
      subscribe(state, root, check, subscribeAgain);
    },
    throwIfFailed() {
      throwIfFailed(state);
    },
    getMissingResults() {
      throwIfFailed(state);
      return state.resultChecks.filter(
        check => !check.done && check.getExpectation().ready,
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
  // Same-row identity is scoped per model row. A new row begins at the root and
  // at a Server Function's bound arguments, which the writer serializes
  // separately, so a cross-row alias is not mistaken for a same-row cycle. Each
  // row records the first received object per source and which sources it saw as
  // a collection member or key.
  root.row = root.row || {
    received: new WeakMap(),
    collectionKeys: new WeakSet(),
    tolerant: root.tolerant === true,
  };
  const todo = [root];
  // One source object may have several received copies. Visit each copy,
  // including on a later check, rather than stopping at the source object.
  const visited = new Set();
  while (todo.length > 0) {
    const pair = todo.pop();
    try {
      const children = compareValue(state, pair, visited, pair.row);
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
        // A call result is a fresh row; its bound arguments serialize
        // separately, so cycle splits in it are tolerated like other sub-rows.
        children[i].row = children[i].isCallResult
          ? {
              received: new WeakMap(),
              collectionKeys: new WeakSet(),
              tolerant: true,
            }
          : pair.row;
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

// A readable rendering of a value for a mismatch message.
function describeValue(value) {
  switch (typeof value) {
    case 'bigint':
      return value.toString() + 'n';
    case 'symbol':
      return value.toString();
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return Object.is(value, -0) ? '-0' : String(value);
    case 'function':
      return 'function ' + (value.name || '(anonymous)');
    case 'object':
      if (value === null) {
        return 'null';
      }
      if (Array.isArray(value)) {
        // Describe elements only one level deep so a cyclic or deep array
        // cannot make the message itself recurse without bound.
        const items = value.slice(0, 8).map(describeShallow);
        return '[' + items.join(', ') + (value.length > 8 ? ', …' : '') + ']';
      }
      return Object.prototype.toString.call(value);
    default:
      return String(value);
  }
}

// A one-level rendering used for array elements, so describing a value never
// walks into a nested object or follows a cycle.
function describeShallow(value) {
  if (value !== null && typeof value === 'object') {
    return Array.isArray(value)
      ? 'Array(' + value.length + ')'
      : Object.prototype.toString.call(value);
  }
  return describeValue(value);
}

// Plain assertions replace expect() on the comparison hot path: they avoid the
// matcher's per-call cost and build a message only when a check fails. The
// message always names the expected and received values; traverse prefixes the
// path.
function assertOracle(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSame(received, expected) {
  if (!Object.is(received, expected)) {
    throw new Error(
      'expected ' +
        describeValue(expected) +
        ' but received ' +
        describeValue(received),
    );
  }
}

// Compares flat arrays of primitives in order. Uses Array.prototype.every so
// large byte arrays don't trip the test transform's loop-iteration guard.
function numberArraysEqual(received, expected) {
  return (
    Array.isArray(received) &&
    Array.isArray(expected) &&
    received.length === expected.length &&
    received.every((value, i) => Object.is(value, expected[i]))
  );
}

// This is the same comparison for initial delivery and later mutation checks.
function compareValue(state, {expectedValue, received, path}, visited) {
  if (
    expectedValue === null ||
    (typeof expectedValue !== 'object' && typeof expectedValue !== 'function')
  ) {
    assertSame(received, expectedValue);
    return [];
  }
  const metadata = state.fixture.valueMetadata.get(expectedValue);
  if (metadata !== undefined && metadata.type === 'module') {
    assertSame(received, metadata.value);
    return [];
  }
  assertOracle(received !== null, 'expected an object but received null');
  assertOracle(
    typeof received === 'object' || typeof received === 'function',
    'expected an object or function but received ' + describeValue(received),
  );
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
    assertOracle(
      Array.isArray(received),
      'expected an array but received ' + describeValue(received),
    );
    assertSame(received.length, expectedValue.length);
  } else {
    assertSame(Object.getPrototypeOf(expectedValue), Object.prototype);
    assertOracle(
      Object.getPrototypeOf(received) === Object.prototype,
      'expected a plain object but received ' + describeValue(received),
    );
  }
  const keys = Object.keys(expectedValue);
  const receivedKeys = Object.keys(received);
  assertOracle(
    numberArraysEqual(receivedKeys, keys),
    'expected keys ' +
      describeValue(keys) +
      ' but received ' +
      describeValue(receivedKeys),
  );
  return keys.map(key => ({
    expectedValue: expectedValue[key],
    received: received[key],
    path: path + '.' + key,
  }));
}

function registerResultCheck(
  state,
  expectedValue,
  path,
  getExpectation,
  tolerant = false,
) {
  const check = {
    expectedValue,
    path,
    getExpectation,
    done: false,
    tolerant,
  };
  state.resultChecks.push(check);
  return check;
}

function observePromise(state, metadata, {expectedValue, received, path}) {
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.then',
    () => ({
      value: metadata.value,
      ready:
        metadata.state === 'fulfilled' &&
        areInputsReady(state.fixture, metadata.value),
    }),
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
        // This slice has no expected source or module failures. In particular,
        // rejection with undefined must not pass as fulfillment of undefined.
        throw new Error(
          check.path + ': unexpected rejection: ' + String(value),
          {cause: value},
        );
      }
      if (!expectation.ready) {
        throw new Error('Delivered before its inputs arrived: ' + check.path);
      }
      observeValue(state, expectation.value, value, check.path, check.tolerant);
      check.done = true;
    });
    if (subscribeAgain) {
      const repeat = registerResultCheck(
        state,
        check.expectedValue,
        check.path + ' (again)',
        check.getExpectation,
        check.tolerant,
      );
      subscribe(state, thenable, repeat, false);
    }
  };
  thenable.then(
    value => settle(value, false),
    error => settle(error, true),
  );
}

function areInputsReady(fixture, value) {
  const todo = [value];
  const seen = new Set();
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
    const events = fixture.requiredEvents.get(current) || [];
    if (events.some(event => !event.released)) {
      return false;
    }
    if (metadata === undefined) {
      todo.push(...Object.values(current));
    }
  }
  return true;
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
