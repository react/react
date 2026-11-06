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
    iteratorItems: new WeakMap(),
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
        findModels => {
          const events = getRequiredEvents(fixture, expectedValue);
          const produced = isRootProduced(fixture);
          return getResultExpectation(
            expectedValue,
            produced && canSettle(events),
            getReleasedErrors(events),
            produced ? findModels(expectedValue) : [],
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
      return (
        state.pendingTasks === 0 &&
        state.resultChecks.every(check => check.done)
      );
    },
    async checkForMutations() {
      state.pendingTasks++;
      try {
        const blobs = state.receivedValues.flatMap(root =>
          traverse(state, root, false),
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
    getAliasStats() {
      return {...state.aliasStats};
    },
  };
}

function observeValue(state, expectedValue, received, path) {
  const root = {expectedValue, received, path};
  traverse(state, root, true);
  state.receivedValues.push(root);
}

function traverse(state, root, observe) {
  const blobs = [];
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
      if (metadata === undefined && pair.expectedValue instanceof Blob) {
        if (observe) {
          runAsyncTask(state, () =>
            assertBlobContents(pair.expectedValue, pair.received),
          );
        } else {
          blobs.push(pair);
        }
      }
      if (metadata !== undefined && metadata.type === 'iterator') {
        if (observe && !state.iteratorItems.has(pair.received)) {
          observeIterator(state, metadata, pair.received);
        }
        const items = state.iteratorItems.get(pair.received);
        if (items === undefined) {
          throw new Error('A received iterator was replaced');
        }
        children.push(
          ...items.map((item, i) => ({
            expectedValue: metadata.items[i],
            received: item,
            path: pair.path + '.item' + i,
          })),
        );
      }
      if (
        metadata !== undefined &&
        ['promise', 'stream', 'iterable', 'bytes'].includes(metadata.type)
      ) {
        if (observe) {
          if (!state.observedAsyncValues.has(pair.received)) {
            state.observedAsyncValues.add(pair.received);
            if (metadata.type === 'promise') {
              observePromise(state, metadata, pair);
            } else if (metadata.type === 'bytes') {
              observeByteStream(
                state,
                metadata,
                pair.expectedValue,
                pair.received,
                pair.path,
              );
            } else if (metadata.type === 'iterable') {
              observeAsyncIterable(state, metadata, pair.received, pair.path);
            } else {
              observeStream(
                state,
                metadata,
                pair.expectedValue,
                pair.received,
                pair.path,
              );
            }
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
  return blobs;
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
    if (metadata.type === 'iterator') {
      assertOracle(
        typeof received.next === 'function',
        'expected an iterator but received ' + describeValue(received),
      );
    } else if (metadata.type === 'iterable') {
      assertOracle(
        typeof received[Symbol.asyncIterator] === 'function',
        'expected an async iterable but received ' + describeValue(received),
      );
    } else if (metadata.type === 'stream' || metadata.type === 'bytes') {
      assertOracle(
        typeof received.getReader === 'function',
        'expected a readable stream but received ' + describeValue(received),
      );
    } else if (metadata.type === 'promise') {
      assertOracle(
        typeof received.then === 'function',
        'expected a thenable but received ' + describeValue(received),
      );
    } else {
      throw new Error('Unknown value type: ' + metadata.type);
    }
    return [];
  }
  if (expectedValue instanceof Set) {
    assertOracle(
      received instanceof Set,
      'expected a Set but received ' + describeValue(received),
    );
    assertSame(received.size, expectedValue.size);
    const items = Array.from(received);
    return Array.from(expectedValue, (item, i) => ({
      expectedValue: item,
      received: items[i],
      path: path + '.item' + i,
      isCollectionKey: true,
    }));
  }
  if (expectedValue instanceof Map) {
    assertOracle(
      received instanceof Map,
      'expected a Map but received ' + describeValue(received),
    );
    assertSame(received.size, expectedValue.size);
    const entries = Array.from(received);
    return Array.from(expectedValue).flatMap(([key, value], i) => [
      {
        expectedValue: key,
        received: entries[i][0],
        path: path + '.key' + i,
        isCollectionKey: true,
      },
      {
        expectedValue: value,
        received: entries[i][1],
        path: path + '.value' + i,
      },
    ]);
  }
  if (expectedValue instanceof Date) {
    assertOracle(
      received instanceof Date,
      'expected a Date but received ' + describeValue(received),
    );
    assertSame(received.getTime(), expectedValue.getTime());
    return [];
  }
  if (
    expectedValue instanceof ArrayBuffer ||
    ArrayBuffer.isView(expectedValue)
  ) {
    assertSame(
      Object.prototype.toString.call(received),
      Object.prototype.toString.call(expectedValue),
    );
    const expectedBytes = state.fixture.bytes.get(expectedValue);
    assertOracle(
      numberArraysEqual(getBytes(received), expectedBytes),
      'expected bytes ' +
        describeValue(expectedBytes) +
        ' but received ' +
        describeValue(getBytes(received)),
    );
    return [];
  }
  if (expectedValue instanceof Blob) {
    assertOracle(
      received instanceof Blob,
      'expected a Blob but received ' + describeValue(received),
    );
    assertSame(received.type, expectedValue.type);
    assertSame(received.size, expectedValue.size);
    // A File carried in FormData should keep its name. The writer re-sends it
    // with the default "blob" name instead, losing the original, so this is
    // enforced only under strict identity for now and reported as a finding.
    if (
      state.strictIdentity &&
      typeof File !== 'undefined' &&
      expectedValue instanceof File
    ) {
      assertOracle(
        received instanceof File,
        'expected a File but received a plain Blob',
      );
      assertSame(received.name, expectedValue.name);
    }
    return [];
  }
  if (expectedValue instanceof FormData) {
    assertOracle(
      received instanceof FormData,
      'expected FormData but received ' + describeValue(received),
    );
    const entries = Array.from(received.entries());
    const expectedEntries = Array.from(expectedValue.entries());
    assertSame(entries.length, expectedEntries.length);
    return expectedEntries.map(([key, value], i) => {
      assertSame(entries[i][0], key);
      return {
        expectedValue: value,
        received: entries[i][1],
        path: path + '.form' + i,
      };
    });
  }
  const isArray = Array.isArray(expectedValue);
  if (isArray) {
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
    path: isArray ? path + '[' + key + ']' : path + '.' + key,
  }));
}

function getBytes(value) {
  return value instanceof ArrayBuffer
    ? Array.from(new Uint8Array(value))
    : Array.from(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      );
}

async function assertBlobContents(expectedValue, received) {
  expect(Array.from(new Uint8Array(await received.arrayBuffer()))).toEqual(
    Array.from(new Uint8Array(await expectedValue.arrayBuffer())),
  );
}

function observeStream(state, metadata, expectedValue, received, path) {
  const {fixture} = state;
  const items = metadata.items;
  const areItemsProducedThrough = i =>
    areAllEventsReleased(metadata.events.slice(0, i + 1));
  const isClosed = () => areAllEventsReleased(metadata.events);
  const getStreamErrors = () =>
    isClosed() && metadata.failure !== undefined
      ? [fixture.valueMetadata.get(metadata.failure)]
      : [];
  const canSettleThrough = i => {
    for (let j = 0; j <= i; j++) {
      if (!canSettle(getRequiredEvents(fixture, items[j]))) {
        return false;
      }
    }
    return true;
  };
  const getModelsThrough = (i, findModels) =>
    items.slice(0, i + 1).flatMap(findModels);
  function getItemExpectation(i, findModels) {
    const errors = getReleasedErrors(getRequiredEvents(fixture, items[i]));
    const expectation = getResultExpectation(
      items[i],
      areItemsProducedThrough(i) && canSettleThrough(i),
      errors,
      areItemsProducedThrough(i) ? getModelsThrough(i, findModels) : [],
    );
    // A stream error discards queued items. This read may receive an error
    // from a later item, even while an earlier item's inputs are pending.
    const laterErrors = items
      .slice(i + 1)
      .filter((item, offset) => areItemsProducedThrough(i + 1 + offset))
      .flatMap(item => getReleasedErrors(getRequiredEvents(fixture, item)))
      .concat(getStreamErrors());
    const referenceErrors = items
      .slice(i)
      .filter((item, offset) => areItemsProducedThrough(i + offset))
      .flatMap(item => getModelErrors(findModels(item)));
    if (laterErrors.length > 0 || referenceErrors.length > 0) {
      expectation.errors = laterErrors.concat(referenceErrors, errors);
    }
    return expectation;
  }
  function getEndExpectation(findModels) {
    const errors = getStreamErrors();
    return getResultExpectation(
      undefined,
      isClosed() && (errors.length > 0 || canSettleThrough(items.length - 1)),
      errors,
      isClosed() ? getModelsThrough(items.length - 1, findModels) : [],
    );
  }
  const itemChecks = items.map((item, i) =>
    registerResultCheck(
      state,
      item,
      path + '.item' + i,
      findModels => getItemExpectation(i, findModels),
      true,
    ),
  );
  const endCheck = registerResultCheck(
    state,
    expectedValue,
    path + '.end',
    getEndExpectation,
    true,
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

function observeAsyncIterable(state, metadata, received, path) {
  const {fixture} = state;
  // Use separate iterators for sequential and concurrent next() calls.
  // A single-use iterator can only run one of these checks.
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
      // Unlike a stream read, next() can settle before an earlier next().
      const check = registerResultCheck(
        state,
        value,
        path + (readAhead ? '.ahead' : '') + '.next' + i,
        findModels => {
          const events = getRequiredEvents(fixture, value);
          const produced = areAllEventsReleased(
            metadata.events.slice(0, i + 1),
          );
          const inputsReady = produced && canSettle(events);
          return getResultExpectation(
            value,
            inputsReady,
            getReleasedErrors(events),
            produced ? findModels(value) : [],
          );
        },
        true,
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

function observeByteStream(state, metadata, expectedValue, received, path) {
  const expectedBytes = [].concat(...metadata.chunks.map(c => Array.from(c)));
  const getProducedByteCount = () => {
    let count = 0;
    for (let i = 0; i < metadata.chunks.length; i++) {
      if (!metadata.events[i].released) {
        break;
      }
      count += metadata.chunks[i].length;
    }
    return count;
  };
  runAsyncTask(state, async () => {
    const reader = received.getReader({mode: 'byob'});
    const receivedBytes = [];
    for (;;) {
      const offset = receivedBytes.length;
      // The default BYOB minimum is one byte. Don't wait for another
      // chunk to fill the buffer.
      const check = registerResultCheck(
        state,
        expectedValue,
        path + '.byte' + offset,
        () => {
          const available =
            getProducedByteCount() > offset ||
            areAllEventsReleased(metadata.events);
          return getResultExpectation(undefined, available, [], []);
        },
      );
      let result;
      try {
        result = await reader.read(
          new Uint8Array(1 + (receivedBytes.length % 3)),
        );
      } catch (error) {
        handleResult(state, check, error, true);
        return;
      }
      const {done, value} = result;
      if (value) {
        receivedBytes.push(...value);
      }
      expect(receivedBytes).toEqual(
        expectedBytes.slice(
          0,
          Math.min(receivedBytes.length, getProducedByteCount()),
        ),
      );
      if (done) {
        expect(areAllEventsReleased(metadata.events)).toBe(true);
        expect(receivedBytes).toEqual(expectedBytes);
        handleResult(state, check, undefined);
        break;
      }
      expect(receivedBytes.length).toBeGreaterThan(offset);
      handleResult(state, check, undefined);
    }
  });
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

function getResultExpectation(value, inputsReady, errors, models) {
  return {
    value,
    canFulfill: inputsReady && errors.length === 0,
    errors: (inputsReady ? errors : []).concat(getModelErrors(models)),
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
    handleResult(state, check, value, rejected);
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
      observeValue(state, expectation.value, value, check.path, check.tolerant);
    }
    check.done = true;
  });
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

function getValueDependencies(fixture, value) {
  const metadata = fixture.valueMetadata.get(value);
  if (metadata !== undefined) {
    return metadata.type === 'iterator' ? metadata.items : [];
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).flat();
  }
  if (value instanceof FormData) {
    return Array.from(value.values());
  }
  return Array.isArray(value) ||
    Object.getPrototypeOf(value) === Object.prototype
    ? Object.values(value)
    : [];
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
    if (
      metadata !== undefined &&
      ['promise', 'stream', 'iterable', 'bytes'].includes(metadata.type)
    ) {
      continue;
    }
    (fixture.requiredEvents.get(current) || []).forEach(event =>
      events.add(event),
    );
    todo.push(...getValueDependencies(fixture, current));
  }
  return Array.from(events);
}

function getReleasedErrors(events) {
  return Array.from(events)
    .filter(
      event =>
        event.released &&
        event.error !== undefined &&
        // Evaluation can finish early, but its error needs the loaded module.
        (event.after === undefined || event.after.released),
    )
    .map(event => event.error);
}

function getModelErrors(models) {
  return models.flatMap(model => getReleasedErrors(model.events));
}

function areAllEventsReleased(events) {
  return Array.from(events).every(event => event.released);
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
  const asyncValues = new Set();

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
      if (
        metadata !== undefined &&
        ['promise', 'stream', 'iterable', 'bytes'].includes(metadata.type)
      ) {
        asyncValues.add(value);
        continue;
      }
      (fixture.requiredEvents.get(value) || []).forEach(event =>
        model.events.add(event),
      );
      todo.push(...getValueDependencies(fixture, value));
    }
    return model;
  }

  // A known future root cannot have written objects or supplied their errors.
  if (!isRootProduced(fixture)) {
    return modelsByRootValue;
  }
  const rootModel = collectModel(
    fixture.rootPromise == null ? fixture.model : fixture.resolvedModel,
  );
  // Only a produced prefix can have serialized an object and owned its errors.
  asyncValues.forEach(value => {
    const metadata = fixture.valueMetadata.get(value);
    if (metadata.type === 'promise') {
      if (metadata.state === 'fulfilled') {
        collectModel(metadata.value);
      }
    } else if (metadata.type === 'stream' || metadata.type === 'iterable') {
      for (let i = 0; i < metadata.items.length; i++) {
        if (!metadata.events[i].released) {
          break;
        }
        collectModel(metadata.items[i]);
      }
      if (
        metadata.type === 'iterable' &&
        areAllEventsReleased(metadata.events)
      ) {
        collectModel(metadata.returnValue);
      }
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

function isRootProduced(fixture) {
  return (
    fixture.rootPromise == null ||
    fixture.valueMetadata.get(fixture.rootPromise).state === 'fulfilled'
  );
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

function runAsyncTask(state, run) {
  state.pendingTasks++;
  Promise.resolve()
    .then(run)
    .catch(error => state.failures.push(error))
    .then(() => state.pendingTasks--);
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
