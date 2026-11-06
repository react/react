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
        state.functionCalls.forEach((call, received) =>
          observeServerFunction(state, received, call.metadata, call.args),
        );
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
  };
}

function observeValue(state, expectedValue, received, path) {
  const root = {expectedValue, received, path};
  traverse(state, root, true);
  state.receivedValues.push(root);
}

function traverse(state, root, observe) {
  const blobs = [];
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
      if (metadata === undefined && pair.expectedValue instanceof Blob) {
        if (observe) {
          runAsyncTask(state, () =>
            assertBlobContents(pair.expectedValue, pair.received),
          );
        } else {
          blobs.push(pair);
        }
      }
      if (metadata !== undefined && metadata.type === 'function') {
        if (observe) {
          observeServerFunction(state, pair.received, metadata, metadata.args);
        }
        const call = state.functionCalls.get(pair.received);
        if (call === undefined) {
          throw new Error('A received Server Function was replaced');
        }
        children.push({
          expectedValue: metadata.result,
          received: call.result,
          path: pair.path + '()',
          isCallResult: true,
        });
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
        [
          'promise',
          'element',
          'stream',
          'iterable',
          'bytes',
          'canceled',
        ].includes(metadata.type)
      ) {
        if (observe) {
          if (!state.observedAsyncValues.has(pair.received)) {
            state.observedAsyncValues.add(pair.received);
            if (metadata.type === 'promise') {
              observePromise(state, metadata, pair);
            } else if (metadata.type === 'element') {
              observeElement(state, metadata, pair);
            } else if (metadata.type === 'canceled') {
              observeCanceledStream(state, metadata, pair.received, pair.path);
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

// This is the same comparison for initial delivery and later mutation checks.
function compareValue(
  state,
  {expectedValue, received, path, isCallResult},
  visited,
) {
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
  if (!isCallResult) {
    const previous = state.expectedByReceived.get(received);
    if (previous !== undefined && previous !== expectedValue) {
      throw new Error('A received object matches two distinct source objects');
    }
    state.expectedByReceived.set(received, expectedValue);
    if (visited.has(received)) {
      return null;
    }
    visited.add(received);
  }
  if (metadata !== undefined) {
    if (metadata.type === 'function') {
      expect(typeof received).toBe('function');
    } else if (metadata.type === 'iterator') {
      expect(typeof received.next).toBe('function');
    } else if (metadata.type === 'iterable') {
      expect(typeof received[Symbol.asyncIterator]).toBe('function');
    } else if (
      metadata.type === 'stream' ||
      metadata.type === 'bytes' ||
      metadata.type === 'canceled'
    ) {
      expect(typeof received.getReader).toBe('function');
    } else if (metadata.type === 'element') {
      // Flight may deliver a lazy element before its props are ready.
      // Rendering and the component's props callback check its contents.
    } else if (metadata.type === 'promise') {
      expect(typeof received.then).toBe('function');
    } else {
      throw new Error('Unknown value type: ' + metadata.type);
    }
    return [];
  }
  if (expectedValue instanceof Set) {
    expect(received).toBeInstanceOf(Set);
    expect(received.size).toBe(expectedValue.size);
    const items = Array.from(received);
    return Array.from(expectedValue, (item, i) => ({
      expectedValue: item,
      received: items[i],
      path: path + '.item' + i,
    }));
  }
  if (expectedValue instanceof Map) {
    expect(received).toBeInstanceOf(Map);
    expect(received.size).toBe(expectedValue.size);
    const entries = Array.from(received);
    return Array.from(expectedValue).flatMap(([key, value], i) => [
      {expectedValue: key, received: entries[i][0], path: path + '.key' + i},
      {
        expectedValue: value,
        received: entries[i][1],
        path: path + '.value' + i,
      },
    ]);
  }
  if (expectedValue instanceof Date) {
    expect(received).toBeInstanceOf(Date);
    expect(received.getTime()).toBe(expectedValue.getTime());
    return [];
  }
  if (
    expectedValue instanceof ArrayBuffer ||
    ArrayBuffer.isView(expectedValue)
  ) {
    expect(Object.prototype.toString.call(received)).toBe(
      Object.prototype.toString.call(expectedValue),
    );
    expect(getBytes(received)).toEqual(state.fixture.bytes.get(expectedValue));
    return [];
  }
  if (expectedValue instanceof Blob) {
    expect(received).toBeInstanceOf(Blob);
    expect(received.type).toBe(expectedValue.type);
    expect(received.size).toBe(expectedValue.size);
    return [];
  }
  if (expectedValue instanceof FormData) {
    expect(received).toBeInstanceOf(FormData);
    const entries = Array.from(received.entries());
    const expectedEntries = Array.from(expectedValue.entries());
    expect(entries.length).toBe(expectedEntries.length);
    return expectedEntries.map(([key, value], i) => {
      expect(entries[i][0]).toBe(key);
      return {
        expectedValue: value,
        received: entries[i][1],
        path: path + '.form' + i,
      };
    });
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

function observeServerFunction(state, received, metadata, args) {
  const result = received(...args);
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
  state.functionCalls.set(received, {
    metadata,
    args,
    result,
    bound,
  });
}

function observeElement(state, metadata, {expectedValue, received, path}) {
  const {fixture} = state;
  const check = registerResultCheck(
    state,
    expectedValue,
    path + '.render',
    findModels => {
      const events = (fixture.requiredEvents.get(expectedValue) || []).concat(
        getRequiredEvents(fixture, expectedValue.props),
      );
      return getResultExpectation(
        metadata.html,
        canSettle(events),
        getReleasedErrors(events),
        findModels(expectedValue).concat(findModels(expectedValue.props)),
      );
    },
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

function observeCanceledStream(state, metadata, received, path) {
  const {fixture} = state;
  const check = registerResultCheck(
    state,
    metadata.first,
    path + '.first',
    findModels => {
      const events = getRequiredEvents(fixture, metadata.first);
      return getResultExpectation(
        metadata.first,
        canSettle(events),
        getReleasedErrors(events),
        findModels(metadata.first),
      );
    },
  );
  runAsyncTask(state, async () => {
    const reader = received.getReader();
    let item;
    try {
      item = await reader.read();
    } catch (error) {
      handleResult(state, check, error, true);
      return;
    }
    expect(item.done).toBe(false);
    await reader.cancel('canceled by the test');
    handleResult(state, check, item.value);
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

function registerResultCheck(state, expectedValue, path, getExpectation) {
  const check = {expectedValue, path, getExpectation, done: false};
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
    return metadata.type === 'function'
      ? metadata.bound
      : metadata.type === 'iterator'
        ? metadata.items
        : [];
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
      [
        'promise',
        'element',
        'stream',
        'iterable',
        'bytes',
        'canceled',
      ].includes(metadata.type)
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
  const boundArgumentModels = new Map();
  const visitedElements = new Set();

  function collectModel(rootValues, parent = null, events = []) {
    const model = {
      parent,
      events: new Set(events),
      referencedModels: new Set(),
    };
    const todo = rootValues.slice();
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
      if (rootValues.includes(value)) {
        modelsByRootValue.set(value, model);
      }
      modelsByValue.set(value, (modelsByValue.get(value) || []).concat(model));
      const metadata = fixture.valueMetadata.get(value);
      if (metadata !== undefined && metadata.type === 'element') {
        if (!visitedElements.has(value)) {
          // Props errors belong to the rendered element; they need not block
          // delivery of a containing model that can hold a lazy element.
          visitedElements.add(value);
          collectModel(
            [value.props],
            model,
            fixture.requiredEvents.get(value) || [],
          );
        }
        continue;
      }
      if (
        metadata !== undefined &&
        ['promise', 'stream', 'iterable', 'bytes', 'canceled'].includes(
          metadata.type,
        )
      ) {
        asyncValues.add(value);
        continue;
      }
      (fixture.requiredEvents.get(value) || []).forEach(event =>
        model.events.add(event),
      );
      if (metadata !== undefined && metadata.type === 'function') {
        // Bound arguments serialize separately even when the function is in root.
        asyncValues.add(value);
        continue;
      }
      todo.push(...getValueDependencies(fixture, value));
    }
    return model;
  }

  // A known future root cannot have written objects or supplied their errors.
  if (!isRootProduced(fixture)) {
    return modelsByRootValue;
  }
  const rootModel = collectModel([
    fixture.rootPromise == null ? fixture.model : fixture.resolvedModel,
  ]);
  // Only a produced prefix can have serialized an object and owned its errors.
  asyncValues.forEach(value => {
    const metadata = fixture.valueMetadata.get(value);
    if (metadata.type === 'function') {
      boundArgumentModels.set(value, collectModel(metadata.bound));
    } else if (metadata.type === 'promise') {
      if (metadata.state === 'fulfilled') {
        collectModel([metadata.value]);
      }
    } else if (metadata.type === 'canceled') {
      // Its first item is enqueued when the native source is constructed.
      collectModel([metadata.first]);
    } else if (metadata.type === 'stream' || metadata.type === 'iterable') {
      for (let i = 0; i < metadata.items.length; i++) {
        if (!metadata.events[i].released) {
          break;
        }
        collectModel([metadata.items[i]]);
      }
      if (
        metadata.type === 'iterable' &&
        areAllEventsReleased(metadata.events)
      ) {
        collectModel([metadata.returnValue]);
      }
    }
  });
  boundArgumentModels.forEach((argumentModel, fn) => {
    modelsByValue
      .get(fn)
      .forEach(model => model.referencedModels.add(argumentModel));
  });
  const getTopLevelModel = model =>
    model.parent === null ? model : getTopLevelModel(model.parent);
  modelsByValue.forEach(models => {
    // The root is serialized first. Otherwise any produced result containing
    // this object could write it first, and the others could reference it.
    const rootModels = models.filter(
      model => getTopLevelModel(model) === rootModel,
    );
    models.forEach(model => {
      const possibleSources =
        rootModels.length > 0
          ? rootModels
          : models.filter(other => other !== model);
      possibleSources.forEach(source => {
        for (let owner = source; owner !== null; owner = owner.parent) {
          model.referencedModels.add(owner);
        }
      });
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
