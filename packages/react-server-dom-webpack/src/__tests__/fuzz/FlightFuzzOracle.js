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
  assertBlobContents,
  compareValue,
  throwAtPath,
} = require('./FlightFuzzCompare');
const {
  separateResultTypes,
  getRequiredEvents,
  getReleasedErrors,
  areAllEventsReleased,
  createModelLookup,
  getRootExpectation,
  getPromiseExpectation,
  getRenderExpectation,
  getStreamExpectations,
  getIterableExpectation,
} = require('./FlightFuzzReadiness');

function createOracle(
  fixture = {valueMetadata: new Map(), requiredEvents: new Map()},
  {render} = {},
) {
  const state = {
    fixture,
    render,
    expectedByReceived: new WeakMap(),
    receivedValues: [],
    observedAsyncValues: new WeakSet(),
    thenableResults: new WeakMap(),
    iteratorItems: new WeakMap(),
    functionCalls: new Map(),
    resultChecks: [],
    failures: [],
    pendingTasks: 0,
  };
  return {
    observeValue(expectedValue, received) {
      observeValue(state, expectedValue, received, 'value');
    },
    observeProps(element, received) {
      guard(state, () => {
        const events = getRequiredEvents(fixture, element.props);
        if (
          !areAllEventsReleased(events) ||
          getReleasedErrors(events).length > 0
        ) {
          throw new Error(
            'A component received props before their inputs arrived',
          );
        }
        observeValue(
          state,
          element.props,
          received,
          'props of ' + element.type.name,
        );
      });
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
    // delivery. Server Functions are called again, and iterators and async
    // values must still be the ones observed.
    async checkForMutations() {
      state.pendingTasks++;
      try {
        state.functionCalls.forEach((call, received) =>
          observeServerFunction(state, received, call.metadata),
        );
        const visited = new Set();
        const blobs = state.receivedValues.flatMap(root =>
          traverse(state, root, false, visited),
        );
        await Promise.all(
          blobs.map(({expectedValue, received}) =>
            assertBlobContents(expectedValue, received),
          ),
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
// Returns the Blobs whose contents the caller reads.
function traverse(state, root, observe, visited = new Set()) {
  const {fixture} = state;
  const blobs = [];
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
        if (expectedValue instanceof Blob) {
          if (observe) {
            runAsyncTask(state, () =>
              assertBlobContents(expectedValue, received),
            );
          } else {
            blobs.push(pair);
          }
        }
      } else if (metadata.type === 'function') {
        if (observe) {
          observeServerFunction(state, received, metadata);
        }
        const call = state.functionCalls.get(received);
        if (call === undefined) {
          throw new Error('A received Server Function was replaced');
        }
        children.push({
          expectedValue: metadata.result,
          received: call.result,
          path: path + '()',
        });
      } else if (metadata.type === 'iterator') {
        if (observe && !state.iteratorItems.has(received)) {
          observeIterator(state, metadata, received);
        }
        const items = state.iteratorItems.get(received);
        if (items === undefined) {
          throw new Error('A received iterator was replaced');
        }
        items.forEach((item, i) =>
          children.push({
            expectedValue: metadata.items[i],
            received: item,
            path: path + '.item' + i,
          }),
        );
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
  return blobs;
}

function observeAsyncValue(state, metadata, pair) {
  switch (metadata.type) {
    case 'promise':
      observePromise(state, metadata, pair);
      break;
    case 'element':
      observeElement(state, pair);
      break;
    case 'stream':
      observeStream(state, metadata, pair);
      break;
    case 'iterable':
      observeAsyncIterable(state, metadata, pair);
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

function observeElement(state, {expectedValue, received, path}) {
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.render',
    findModels =>
      getRenderExpectation(state.fixture, expectedValue, findModels),
  );
  runAsyncTask(state, async () => {
    let html;
    try {
      html = await state.render(received);
    } catch (error) {
      handleResult(state, check, error, true);
      return;
    }
    handleResult(state, check, html);
  });
}

function observeStream(state, metadata, {expectedValue, received, path}) {
  const {items} = metadata;
  const {getItemExpectation, getEndExpectation} = getStreamExpectations(
    state.fixture,
    metadata,
  );
  const itemChecks = items.map((item, i) =>
    registerResultCheck(state, item, path + '.item' + i, findModels =>
      getItemExpectation(i, findModels),
    ),
  );
  const endCheck = registerResultCheck(
    state,
    expectedValue,
    path + '.end',
    getEndExpectation,
  );
  runAsyncTask(state, async () => {
    const reader = received.getReader();
    for (let i = 0; i < items.length; i++) {
      let item;
      try {
        item = await reader.read();
      } catch (error) {
        handleResult(state, itemChecks[i], error, true);
        // No further reads are possible after a stream error.
        for (let j = i + 1; j < items.length; j++) {
          itemChecks[j].done = true;
        }
        endCheck.done = true;
        return;
      }
      if (item.done) {
        throw new Error(path + '.item' + i + ': ended early');
      }
      handleResult(state, itemChecks[i], item.value);
    }
    let last;
    try {
      last = await reader.read();
    } catch (error) {
      handleResult(state, endCheck, error, true);
      return;
    }
    expect(last.done).toBe(true);
    handleResult(state, endCheck, last.value);
  });
}

function observeAsyncIterable(state, metadata, {received, path}) {
  // Read once with sequential next() calls and once with concurrent ones. A
  // single-use iterator can only be read once.
  const modes = metadata.single ? [true] : [false, true];
  for (let mode = 0; mode < modes.length; mode++) {
    const readAhead = modes[mode];
    const iterator = received[Symbol.asyncIterator]();
    expect(iterator === received).toBe(metadata.single === true);
    const items = metadata.items;
    const consume = async i => {
      const done = i >= items.length;
      const value = done
        ? i === items.length
          ? metadata.returnValue
          : undefined
        : items[i];
      const check = registerResultCheck(
        state,
        value,
        path + (readAhead ? '.ahead' : '') + '.next' + i,
        findModels =>
          getIterableExpectation(state.fixture, metadata, i, value, findModels),
      );
      let result;
      try {
        result = await iterator.next();
      } catch (error) {
        // A rejected result doesn't prevent later next() calls.
        handleResult(state, check, error, true);
        return;
      }
      expect(result.done).toBe(done);
      handleResult(state, check, result.value);
    };
    // Reads after the return value must keep returning
    // {done: true, value: undefined}.
    if (readAhead) {
      for (let i = 0; i < items.length + 3; i++) {
        runAsyncTask(state, () => consume(i));
      }
    } else {
      runAsyncTask(state, async () => {
        for (let i = 0; i < items.length + 3; i++) {
          await consume(i);
        }
      });
    }
  }
}

// Each call returns a new array of the bound arguments followed by the
// supplied ones. The bound arguments must stay the same objects.
function observeServerFunction(state, received, metadata) {
  const result = received(...metadata.args);
  let bound = null;
  if (metadata.bound.length > 0) {
    expect(Array.isArray(result)).toBe(true);
    const previous = state.functionCalls.get(received);
    if (previous !== undefined) {
      previous.bound.forEach((value, i) => {
        if (!Object.is(result[i], value)) {
          throw new Error('A Server Function changed a bound argument');
        }
      });
    }
    bound = result.slice(0, metadata.bound.length);
  }
  state.functionCalls.set(received, {metadata, result, bound});
}

function observeIterator(state, metadata, received) {
  const items = [];
  for (let i = 0; i < metadata.items.length; i++) {
    const result = received.next();
    expect(result.done).toBe(false);
    items.push(result.value);
  }
  const last = received.next();
  expect(last.done).toBe(true);
  expect(last.value).toBe(undefined);
  state.iteratorItems.set(received, items);
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

function runAsyncTask(state, run) {
  state.pendingTasks++;
  Promise.resolve()
    .then(run)
    .catch(error => recordFailure(state, error))
    .then(() => state.pendingTasks--);
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
  if (error.fuzzFailure === undefined) {
    error.fuzzFailure = 'observation: ' + error.message;
  }
  state.failures.push(error);
}

module.exports = {createOracle};
