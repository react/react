/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

function isObject(value) {
  return (
    value !== null && (typeof value === 'object' || typeof value === 'function')
  );
}

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
        // Describe items one level deep so a cyclic array stays printable.
        const items = value.slice(0, 8).map(describeShallow);
        return '[' + items.join(', ') + (value.length > 8 ? ', …' : '') + ']';
      }
      return Object.prototype.toString.call(value);
    default:
      return String(value);
  }
}

function describeShallow(value) {
  if (value !== null && typeof value === 'object') {
    return Array.isArray(value)
      ? 'Array(' + value.length + ')'
      : Object.prototype.toString.call(value);
  }
  return describeValue(value);
}

// The comparison runs many times, so these don't use expect(). They only
// build a message when a check fails.
function assert(condition, message) {
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

function assertKind(condition, kind, received) {
  assert(
    condition,
    'expected ' + kind + ' but received ' + describeValue(received),
  );
}

// Uses Array.prototype.every so large byte arrays don't trip the test
// transform's loop-iteration guard.
function arraysEqual(received, expected) {
  return (
    Array.isArray(received) &&
    Array.isArray(expected) &&
    received.length === expected.length &&
    received.every((value, i) => Object.is(value, expected[i]))
  );
}

function getBytes(value) {
  return value instanceof ArrayBuffer
    ? Array.from(new Uint8Array(value))
    : Array.from(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      );
}

async function assertBlobContents(expectedValue, received) {
  const receivedBytes = Array.from(
    new Uint8Array(await received.arrayBuffer()),
  );
  const expectedBytes = Array.from(
    new Uint8Array(await expectedValue.arrayBuffer()),
  );
  assert(
    arraysEqual(receivedBytes, expectedBytes),
    'expected Blob bytes ' +
      describeValue(expectedBytes) +
      ' but received ' +
      describeValue(receivedBytes),
  );
}

// One received object must never stand for two different source objects.
function assertSingleSource(expectedByReceived, expectedValue, received) {
  const previous = expectedByReceived.get(received);
  if (previous !== undefined && previous !== expectedValue) {
    throw new Error('A received object matches two distinct source objects');
  }
  expectedByReceived.set(received, expectedValue);
}

// Compares the contents of one source value with one received value, without
// looking into nested values. Returns the nested pairs to compare next. The
// caller tracks identity and stops at cycles. Values with fixture metadata
// (Promises, streams, elements, Server Functions) are only checked for their
// kind here; their results are observed separately.
function compareValue(fixture, {expectedValue, received, path}) {
  if (!isObject(expectedValue)) {
    assertSame(received, expectedValue);
    return [];
  }
  const metadata = fixture.valueMetadata.get(expectedValue);
  if (metadata !== undefined && metadata.type === 'module') {
    assertSame(received, metadata.value);
    return [];
  }
  assertKind(isObject(received), 'an object', received);
  if (metadata !== undefined) {
    switch (metadata.type) {
      case 'function':
        assertKind(typeof received === 'function', 'a function', received);
        return [];
      case 'iterator':
        assertKind(
          typeof received.next === 'function',
          'an iterator',
          received,
        );
        return [];
      case 'iterable':
        assertKind(
          typeof received[Symbol.asyncIterator] === 'function',
          'an async iterable',
          received,
        );
        return [];
      case 'stream':
        assertKind(
          typeof received.getReader === 'function',
          'a readable stream',
          received,
        );
        return [];
      case 'promise':
        assertKind(typeof received.then === 'function', 'a thenable', received);
        return [];
      case 'element':
        // Flight may deliver a lazy element before its props are ready.
        // Rendering and the component's props callback check its contents.
        // The key can only be read from an element that is not lazy.
        if (received.$$typeof === Symbol.for('react.transitional.element')) {
          assertSame(received.key, expectedValue.key);
        }
        return [];
      case 'error':
        return compareError(expectedValue, received, path);
      default:
        throw new Error('Unknown value type: ' + metadata.type);
    }
  }
  if (expectedValue instanceof Set) {
    assertKind(received instanceof Set, 'a Set', received);
    assertSame(received.size, expectedValue.size);
    const items = Array.from(received);
    return Array.from(expectedValue, (item, i) => ({
      expectedValue: item,
      received: items[i],
      path: path + '.item' + i,
    }));
  }
  if (expectedValue instanceof Map) {
    assertKind(received instanceof Map, 'a Map', received);
    assertSame(received.size, expectedValue.size);
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
    assertKind(received instanceof Date, 'a Date', received);
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
    // The writer may detach the source buffer, so compare with saved bytes.
    const expectedBytes = fixture.bytes.get(expectedValue);
    const receivedBytes = getBytes(received);
    assert(
      arraysEqual(receivedBytes, expectedBytes),
      'expected bytes ' +
        describeValue(expectedBytes) +
        ' but received ' +
        describeValue(receivedBytes),
    );
    return [];
  }
  if (expectedValue instanceof Blob) {
    // The caller reads the contents, which is asynchronous.
    assertKind(received instanceof Blob, 'a Blob', received);
    assertSame(received.type, expectedValue.type);
    assertSame(received.size, expectedValue.size);
    if (expectedValue instanceof File) {
      assertKind(received instanceof File, 'a File', received);
      assertSame(received.name, expectedValue.name);
    }
    return [];
  }
  if (expectedValue instanceof FormData) {
    assertKind(received instanceof FormData, 'FormData', received);
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
    assertKind(Array.isArray(received), 'an array', received);
    assertSame(received.length, expectedValue.length);
  } else {
    assertSame(Object.getPrototypeOf(expectedValue), Object.prototype);
    assertKind(
      Object.getPrototypeOf(received) === Object.prototype,
      'a plain object',
      received,
    );
  }
  const keys = Object.keys(expectedValue);
  const receivedKeys = Object.keys(received);
  assert(
    arraysEqual(receivedKeys, keys),
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

// Production omits an Error's message, cause and aggregated errors.
function compareError(expectedValue, received, path) {
  assertKind(received instanceof Error, 'an Error', received);
  if (!__DEV__) {
    return [];
  }
  const children = [];
  assertSame(received.name, expectedValue.name);
  assertSame(received.message, expectedValue.message);
  assertSame('cause' in received, 'cause' in expectedValue);
  if ('cause' in expectedValue) {
    children.push({
      expectedValue: expectedValue.cause,
      received: received.cause,
      path: path + '.cause',
    });
  }
  if (expectedValue instanceof AggregateError) {
    assertKind(
      received instanceof AggregateError,
      'an AggregateError',
      received,
    );
    children.push({
      expectedValue: expectedValue.errors,
      received: received.errors,
      path: path + '.errors',
    });
  }
  return children;
}

function throwAtPath(error, path) {
  if (error.fuzzFailure === undefined) {
    error.fuzzFailure = 'value: ' + error.message;
  }
  if (error.path === undefined) {
    error.message = path + ': ' + error.message;
    error.path = path;
  }
  throw error;
}

module.exports = {
  isObject,
  assertSingleSource,
  assertBlobContents,
  compareValue,
  throwAtPath,
};
