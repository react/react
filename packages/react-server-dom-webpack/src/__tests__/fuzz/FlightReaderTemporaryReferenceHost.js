/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Round-trips a generated graph through a reply and back out through a server
// response, exercising the encoder's temporary-reference handling.
//
// The client encodes the graph with a temporary reference set
// (ReactFlightReplyClient.processReply: every `writeTemporaryReference` call
// site, serializeStreamItem's outlined branch). The server decodes it with its
// own set (ReactFlightReplyServer.reviveModel registers each decoded object by
// its reference path), fully reads the decoded streams and iterables into plain
// containers, then re-serializes those containers with the same server set
// (ReactFlightServer writes `$T` for a registered object). The client reads the
// response with its own set, which resolves each `$T` back to the original
// client object (ReactFlightClient / ReactFlightTemporaryReferences).
//
// Identity rule, derived from those paths:
//  - An opaque leaf (element, plain function, symbol) is always written as a
//    temporary reference marker and always comes back as the original object.
//  - Any other object round trips by identity only when the encoder gave it a
//    part or a path registration and the server echoes it by that reference.
//    Whether a stream item is outlined is incidental to event timing, so the
//    oracle accepts "identical OR structurally equal" for non-opaque values and
//    counts which happened, while still forbidding a missing value, a hang, or a
//    server-side opaque-reference error.

// A consumed stream cannot be echoed as a stream, so every stream, async
// iterable and sync iterator in the decoded graph is read out and replaced by a
// plain wrapper of what it produced. Promises are awaited into a wrapper too, so
// the echoed container holds only concrete values. Plain objects, arrays, Maps
// and Sets that contain nothing async are echoed unchanged, so the server can
// still write them as a temporary reference by identity.
const STREAM = '__fuzz_stream__';
const ASYNC_ITERABLE = '__fuzz_asyncIterable__';
const ASYNC_RETURN = '__fuzz_asyncReturn__';
const SYNC_ITERATOR = '__fuzz_syncIterator__';
const PROMISE = '__fuzz_promise__';

async function drainAndEcho(value, memo = new Map()) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return value;
  }
  if (memo.has(value)) {
    return memo.get(value);
  }
  // Opaque temporary references decode to a proxy over a function. Reading an
  // unexpected property throws, so they are passed straight through.
  if (typeof value === 'function') {
    return value;
  }
  if (typeof ReadableStream === 'function' && value instanceof ReadableStream) {
    const wrapper = {[STREAM]: []};
    memo.set(value, wrapper);
    const reader = value.getReader();
    for (;;) {
      const {done, value: item} = await reader.read();
      if (done) {
        break;
      }
      wrapper[STREAM].push(await drainAndEcho(item, memo));
    }
    return wrapper;
  }
  if (typeof value[Symbol.asyncIterator] === 'function') {
    const wrapper = {[ASYNC_ITERABLE]: [], [ASYNC_RETURN]: undefined};
    memo.set(value, wrapper);
    const iterator = value[Symbol.asyncIterator]();
    for (;;) {
      const {done, value: item} = await iterator.next();
      if (done) {
        wrapper[ASYNC_RETURN] = await drainAndEcho(item, memo);
        break;
      }
      wrapper[ASYNC_ITERABLE].push(await drainAndEcho(item, memo));
    }
    return wrapper;
  }
  if (typeof value.then === 'function') {
    const wrapper = {[PROMISE]: undefined};
    memo.set(value, wrapper);
    wrapper[PROMISE] = await drainAndEcho(await value, memo);
    return wrapper;
  }
  if (typeof value.next === 'function') {
    const wrapper = {[SYNC_ITERATOR]: []};
    memo.set(value, wrapper);
    for (;;) {
      const {done, value: item} = value.next();
      if (done) {
        break;
      }
      wrapper[SYNC_ITERATOR].push(await drainAndEcho(item, memo));
    }
    return wrapper;
  }
  if (value instanceof Map) {
    const result = new Map();
    memo.set(value, result);
    let changed = false;
    const entries = Array.from(value);
    for (let i = 0; i < entries.length; i++) {
      const [k, v] = entries[i];
      const nk = await drainAndEcho(k, memo);
      const nv = await drainAndEcho(v, memo);
      result.set(nk, nv);
      if (nk !== k || nv !== v) {
        changed = true;
      }
    }
    if (!changed) {
      memo.set(value, value);
      return value;
    }
    return result;
  }
  if (value instanceof Set) {
    const result = new Set();
    memo.set(value, result);
    let changed = false;
    const items = Array.from(value);
    for (let i = 0; i < items.length; i++) {
      const nv = await drainAndEcho(items[i], memo);
      result.add(nv);
      if (nv !== items[i]) {
        changed = true;
      }
    }
    if (!changed) {
      memo.set(value, value);
      return value;
    }
    return result;
  }
  if (
    value instanceof Date ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob === 'function' && value instanceof Blob)
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const result = [];
    memo.set(value, result);
    let changed = false;
    for (let i = 0; i < value.length; i++) {
      result[i] = await drainAndEcho(value[i], memo);
      if (result[i] !== value[i]) {
        changed = true;
      }
    }
    if (!changed) {
      memo.set(value, value);
      return value;
    }
    return result;
  }
  // Plain object. Keep the original (so it round trips by identity) unless a
  // nested async value forced a replacement.
  const result = {};
  memo.set(value, result);
  let changed = false;
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = await drainAndEcho(value[key], memo);
    if (result[key] !== value[key]) {
      changed = true;
    }
  }
  if (!changed) {
    memo.set(value, value);
    return value;
  }
  return result;
}

async function roundTripTemporaryReferences(
  {ReactServerDOMServer, ReactServerDOMClient, WebpackMock, serverAct},
  sourceRoot,
) {
  const clientRefs = ReactServerDOMClient.createTemporaryReferenceSet();
  const body = await ReactServerDOMClient.encodeReply(sourceRoot, {
    temporaryReferences: clientRefs,
  });
  const serverRefs = ReactServerDOMServer.createTemporaryReferenceSet();
  // The graph size is bounded by the generator; test decoding independently of
  // the configurable nested-array limit.
  const decoded = await ReactServerDOMServer.decodeReply(
    body,
    WebpackMock.webpackServerMap,
    {temporaryReferences: serverRefs, arraySizeLimit: Infinity},
  );
  const container = await drainAndEcho(decoded);
  const stream = await serverAct(() =>
    ReactServerDOMServer.renderToReadableStream(container, null, {
      temporaryReferences: serverRefs,
    }),
  );
  return ReactServerDOMClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      moduleMap: null,
      serverModuleMap: WebpackMock.webpackServerMap,
      moduleLoading: null,
    },
    temporaryReferences: clientRefs,
  });
}

// Compare a source value against the value read back through the round trip.
// Returns {identical, structural}: how many non-opaque objects came back as the
// original object vs. as a structural copy.
async function compareTemporaryReferences(fixture, sourceRoot, received) {
  const stats = {identical: 0, structural: 0};
  const walked = new Set();
  const sourceOfReceived = new WeakMap();
  const countedSources = new Set();
  const blobs = [];
  const stack = [{expected: sourceRoot, actual: received, path: 'root'}];

  const fail = (path, message) => {
    throw new Error(path + ': ' + message);
  };
  const same = (path, actual, expected) => {
    if (!Object.is(actual, expected)) {
      fail(
        path,
        'expected ' + show(expected) + ' but received ' + show(actual),
      );
    }
  };

  while (stack.length > 0) {
    const {expected, actual, path} = stack.pop();
    if (
      expected === null ||
      (typeof expected !== 'object' && typeof expected !== 'function')
    ) {
      // Symbols only reach here as opaque leaves, handled below by metadata.
      same(path, actual, expected);
      continue;
    }
    const metadata = fixture.valueMetadata.get(expected);
    const type = metadata !== undefined ? metadata.type : undefined;

    if (type === 'opaque') {
      // An opaque leaf must come back as the original client object.
      if (!Object.is(actual, expected)) {
        fail(path, 'an opaque temporary reference lost its identity');
      }
      continue;
    }

    // Count whether a non-opaque object came back by identity or as a copy, and
    // enforce that one received object maps to a single source object.
    if (type === undefined || type === 'thenable') {
      // (thenable carries no received object of its own; skip the mapping)
    }
    const priorSource = sourceOfReceived.get(actual);
    if (priorSource !== undefined && priorSource !== expected) {
      fail(path, 'a received object matches two distinct source objects');
    }

    if (type === 'thenable' || type === 'promise') {
      // A thenable is awaited during the drain, which flattens a chain of
      // thenables, so compare against the fully resolved value.
      const resolved = unwrapThenable(fixture, metadata.value);
      if (
        actual === null ||
        typeof actual !== 'object' ||
        !(PROMISE in actual)
      ) {
        fail(
          path,
          'expected a resolved thenable wrapper but received ' + show(actual),
        );
      }
      stack.push({
        expected: resolved,
        actual: actual[PROMISE],
        path: path + '.then',
      });
      continue;
    }
    if (type === 'stream') {
      requireList(path, actual, STREAM, metadata.items.length, fail);
      metadata.items.forEach((item, i) =>
        stack.push({
          expected: item,
          actual: actual[STREAM][i],
          path: path + '.item' + i,
        }),
      );
      continue;
    }
    if (type === 'iterable') {
      requireList(path, actual, ASYNC_ITERABLE, metadata.items.length, fail);
      metadata.items.forEach((item, i) =>
        stack.push({
          expected: item,
          actual: actual[ASYNC_ITERABLE][i],
          path: path + '.next' + i,
        }),
      );
      stack.push({
        expected: metadata.returnValue,
        actual: actual[ASYNC_RETURN],
        path: path + '.return',
      });
      continue;
    }
    if (type === 'iterator') {
      requireList(path, actual, SYNC_ITERATOR, metadata.items.length, fail);
      metadata.items.forEach((item, i) =>
        stack.push({
          expected: item,
          actual: actual[SYNC_ITERATOR][i],
          path: path + '.item' + i,
        }),
      );
      continue;
    }

    // From here the expected value is a structural object. A missing or
    // primitive received value (for example a stream item that decoded to
    // undefined) fails here instead of further down.
    if (
      actual === null ||
      (typeof actual !== 'object' && typeof actual !== 'function')
    ) {
      fail(path, 'expected an object but received ' + show(actual));
    }
    // The received value carries its own object identity. Record it and stop if
    // we have already walked this received object (cycle).
    sourceOfReceived.set(actual, expected);
    if (!countedSources.has(expected)) {
      countedSources.add(expected);
      if (Object.is(actual, expected)) {
        stats.identical++;
      } else {
        stats.structural++;
      }
    }
    if (walked.has(actual)) {
      continue;
    }
    walked.add(actual);

    if (expected instanceof Date) {
      if (!(actual instanceof Date)) {
        fail(path, 'expected a Date but received ' + show(actual));
      }
      same(path, actual.getTime(), expected.getTime());
      continue;
    }
    if (expected instanceof ArrayBuffer || ArrayBuffer.isView(expected)) {
      same(
        path,
        Object.prototype.toString.call(actual),
        Object.prototype.toString.call(expected),
      );
      const expectedBytes = fixture.bytes.get(expected);
      if (!numbersEqual(bytesOf(actual), expectedBytes)) {
        fail(path, 'binary contents differ');
      }
      continue;
    }
    if (typeof Blob === 'function' && expected instanceof Blob) {
      if (!(actual instanceof Blob)) {
        fail(path, 'expected a Blob but received ' + show(actual));
      }
      same(path, actual.size, expected.size);
      same(path, actual.type, expected.type);
      blobs.push({expected, actual});
      continue;
    }
    if (expected instanceof Set) {
      if (!(actual instanceof Set)) {
        fail(path, 'expected a Set but received ' + show(actual));
      }
      same(path, actual.size, expected.size);
      const items = Array.from(actual);
      Array.from(expected).forEach((item, i) =>
        stack.push({
          expected: item,
          actual: items[i],
          path: path + '.item' + i,
        }),
      );
      continue;
    }
    if (expected instanceof Map) {
      if (!(actual instanceof Map)) {
        fail(path, 'expected a Map but received ' + show(actual));
      }
      same(path, actual.size, expected.size);
      const entries = Array.from(actual);
      Array.from(expected).forEach(([key, value], i) => {
        stack.push({
          expected: key,
          actual: entries[i][0],
          path: path + '.key' + i,
        });
        stack.push({
          expected: value,
          actual: entries[i][1],
          path: path + '.value' + i,
        });
      });
      continue;
    }
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        fail(path, 'expected an array but received ' + show(actual));
      }
      same(path, actual.length, expected.length);
      for (let i = 0; i < expected.length; i++) {
        stack.push({
          expected: expected[i],
          actual: actual[i],
          path: path + '[' + i + ']',
        });
      }
      continue;
    }
    // Plain object.
    if (
      actual === null ||
      typeof actual !== 'object' ||
      Array.isArray(actual)
    ) {
      fail(path, 'expected a plain object but received ' + show(actual));
    }
    const keys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    if (!numbersEqual(actualKeys, keys)) {
      fail(
        path,
        'expected keys ' + show(keys) + ' but received ' + show(actualKeys),
      );
    }
    keys.forEach(key =>
      stack.push({
        expected: expected[key],
        actual: actual[key],
        path: path + '.' + key,
      }),
    );
  }

  await Promise.all(
    blobs.map(async ({expected, actual}) => {
      const a = Array.from(new Uint8Array(await actual.arrayBuffer()));
      const b = Array.from(new Uint8Array(await expected.arrayBuffer()));
      if (!numbersEqual(a, b)) {
        throw new Error('Blob contents differ');
      }
    }),
  );
  return stats;
}

function unwrapThenable(fixture, value) {
  const seen = new Set();
  let current = value;
  for (;;) {
    if (
      current === null ||
      (typeof current !== 'object' && typeof current !== 'function') ||
      seen.has(current)
    ) {
      return current;
    }
    const metadata = fixture.valueMetadata.get(current);
    if (
      metadata === undefined ||
      (metadata.type !== 'promise' && metadata.type !== 'thenable')
    ) {
      return current;
    }
    seen.add(current);
    current = metadata.value;
  }
}

function requireList(path, actual, key, length, fail) {
  if (
    actual === null ||
    typeof actual !== 'object' ||
    !Array.isArray(actual[key])
  ) {
    fail(path, 'expected a drained ' + key + ' but received ' + show(actual));
  }
  if (actual[key].length !== length) {
    fail(
      path,
      'expected ' + length + ' items but received ' + actual[key].length,
    );
  }
}

function bytesOf(value) {
  return value instanceof ArrayBuffer
    ? Array.from(new Uint8Array(value))
    : Array.from(
        new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      );
}

function numbersEqual(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((value, i) => Object.is(value, b[i]))
  );
}

function show(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return 'function ' + (value.name || '(anonymous)');
  }
  if (typeof value === 'object') {
    return Object.prototype.toString.call(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return String(value);
}

module.exports = {
  roundTripTemporaryReferences,
  compareTemporaryReferences,
};
