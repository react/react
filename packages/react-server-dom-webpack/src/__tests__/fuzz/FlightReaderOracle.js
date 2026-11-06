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
      const check = registerResultCheck(
        state,
        expectedValue,
        'root',
        findModels => {
          const events = getRequiredEvents(fixture, expectedValue);
          return getResultExpectation(
            expectedValue,
            canSettle(events),
            getReleasedErrors(events),
            findModels(expectedValue),
          );
        },
      );
      subscribe(state, root, check, subscribeAgain);
    },
    throwIfFailed() {
      throwIfFailed(state);
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
  const isArray = Array.isArray(expectedValue);
  if (isArray) {
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
    path: isArray ? path + '[' + key + ']' : path + '.' + key,
  }));
}

function registerResultCheck(state, expectedValue, path, getExpectation) {
  const check = {expectedValue, path, getExpectation, done: false};
  state.resultChecks.push(check);
  return check;
}

function getResultExpectation(value, inputsReady, errors, models) {
  return {
    value,
    canFulfill: inputsReady && errors.length === 0,
    errors: (inputsReady ? errors : []).concat(
      models.flatMap(model => getReleasedErrors(Array.from(model.events))),
    ),
    // A direct error is due even if a possible referenced owner is loading.
    mustSettle:
      inputsReady &&
      (errors.length > 0 ||
        models.every(model => canSettle(Array.from(model.events)))),
  };
}

function observePromise(state, metadata, {expectedValue, received, path}) {
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.then',
    findModels => {
      const events = getRequiredEvents(state.fixture, metadata.value);
      return getResultExpectation(
        metadata.value,
        metadata.state === 'rejected' ||
          (metadata.state === 'fulfilled' && canSettle(events)),
        metadata.state === 'rejected'
          ? [state.fixture.valueMetadata.get(metadata.reason)]
          : getReleasedErrors(events),
        // A consumer cannot borrow model errors until its source produces the
        // value, even if that value already occurs in another eligible model.
        metadata.state === 'fulfilled' ? findModels(metadata.value) : [],
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
      const expectation = check.getExpectation(
        createModelLookup(state.fixture),
      );
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
  // Server errors are compared by digest; local module errors by identity.
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

function collectModels(fixture) {
  const modelsByRootValue = new Map();
  const modelsByValue = new Map();
  const promises = new Set();

  function collectModel(rootValue) {
    const model = {events: new Set(), referencedModels: new Set()};
    const todo = [rootValue];
    const seen = new Set();
    while (todo.length > 0) {
      const value = todo.pop();
      if (
        value === null ||
        (typeof value !== 'object' && typeof value !== 'function') ||
        seen.has(value)
      ) {
        continue;
      }
      seen.add(value);
      if (value === rootValue) {
        modelsByRootValue.set(value, model);
      }
      modelsByValue.set(value, (modelsByValue.get(value) || []).concat(model));
      const metadata = fixture.valueMetadata.get(value);
      if (metadata !== undefined && metadata.type === 'promise') {
        promises.add(value);
        continue;
      }
      (fixture.requiredEvents.get(value) || []).forEach(event =>
        model.events.add(event),
      );
      if (metadata === undefined) {
        todo.push(...Object.values(value));
      }
    }
    return model;
  }

  const rootModel = collectModel(fixture.model);
  // Visiting a produced result may discover more source Promises.
  promises.forEach(promise => {
    const metadata = fixture.valueMetadata.get(promise);
    if (metadata.state === 'fulfilled') {
      collectModel(metadata.value);
    }
  });
  modelsByValue.forEach(models => {
    // The root is serialized first. Otherwise any produced result containing
    // this object could write it first, and the others could reference it.
    const rootContainsValue = models.includes(rootModel);
    models.forEach(model => {
      const possibleSources = rootContainsValue
        ? [rootModel]
        : models.filter(other => other !== model);
      possibleSources.forEach(source => model.referencedModels.add(source));
    });
  });
  return modelsByRootValue;
}

function createModelLookup(fixture) {
  let modelsByRootValue = null;
  return value => {
    // Share one analysis per synchronous check, then rebuild after events.
    if (modelsByRootValue === null) {
      modelsByRootValue = collectModels(fixture);
    }
    const model = modelsByRootValue.get(value);
    if (model === undefined) {
      return [];
    }
    const models = [];
    const seen = new Set();
    const todo = [model];
    while (todo.length > 0) {
      const current = todo.pop();
      if (!seen.has(current)) {
        seen.add(current);
        models.push(current);
        current.referencedModels.forEach(next => todo.push(next));
      }
    }
    return models;
  };
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
