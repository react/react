/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Sends a graph in a reply and back in a response, both with temporary
// reference sets. The client encodes the graph, the server decodes
// it, reads out its async values and renders the result back, and the client
// resolves each temporary reference to its original object.
//
// An opaque leaf (an element, a plain function or a symbol) must come back as
// the original object. Any other value may come back as a copy, but whenever
// the server returns a value by reference it must resolve to the matching
// source object.

const {
  isObject,
  describeValue,
  assertSingleSource,
  assertBlobContents,
  compareValue,
  throwAtPath,
} = require('./FlightFuzzCompare');

// A consumed stream cannot be sent back as a stream, so each stream, async
// iterable, iterator and thenable in the decoded graph is replaced by a plain
// wrapper holding what it produced. Containers without async contents are
// kept as they are, so the server can return them by reference.
const STREAM = '__fuzz_stream__';
const ASYNC_ITERABLE = '__fuzz_asyncIterable__';
const ASYNC_RETURN = '__fuzz_asyncReturn__';
const SYNC_ITERATOR = '__fuzz_syncIterator__';
const PROMISE = '__fuzz_promise__';

async function drainAndEcho(value, memo = new Map()) {
  if (!isObject(value)) {
    return value;
  }
  if (memo.has(value)) {
    return memo.get(value);
  }
  // Opaque temporary references decode to a proxy over a function that throws
  // on unexpected property reads, so pass them through untouched.
  if (typeof value === 'function') {
    return value;
  }
  if (value instanceof ReadableStream) {
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
  if (
    value instanceof Date ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof Blob
  ) {
    return value;
  }
  // Build a drained copy, and keep the original if nothing inside changed.
  // Entries are [key, value] pairs, or [value] for Sets and arrays.
  let result;
  let entries;
  let add;
  if (value instanceof Map) {
    result = new Map();
    entries = Array.from(value);
    add = ([key, item]) => result.set(key, item);
  } else if (value instanceof Set) {
    result = new Set();
    entries = Array.from(value, item => [item]);
    add = ([item]) => result.add(item);
  } else if (Array.isArray(value)) {
    result = [];
    entries = value.map(item => [item]);
    add = ([item]) => result.push(item);
  } else {
    result = {};
    entries = Object.keys(value).map(key => [key, value[key]]);
    add = ([key, item]) => (result[key] = item);
  }
  memo.set(value, result);
  let changed = false;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const drained = [];
    for (let j = 0; j < entry.length; j++) {
      drained[j] = await drainAndEcho(entry[j], memo);
      if (drained[j] !== entry[j]) {
        changed = true;
      }
    }
    add(drained);
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
  const clientReferences = ReactServerDOMClient.createTemporaryReferenceSet();
  const body = await ReactServerDOMClient.encodeReply(sourceRoot, {
    temporaryReferences: clientReferences,
  });
  const serverReferences = ReactServerDOMServer.createTemporaryReferenceSet();
  // The graph size is bounded by the generator. Test decoding independently of
  // the configurable limit on nested arrays.
  const decoded = await ReactServerDOMServer.decodeReply(
    body,
    WebpackMock.webpackServerMap,
    {temporaryReferences: serverReferences, arraySizeLimit: Infinity},
  );
  const container = await drainAndEcho(decoded);
  const stream = await serverAct(() =>
    ReactServerDOMServer.renderToReadableStream(container, null, {
      temporaryReferences: serverReferences,
    }),
  );
  return ReactServerDOMClient.createFromReadableStream(stream, {
    serverConsumerManifest: {
      moduleMap: null,
      serverModuleMap: WebpackMock.webpackServerMap,
      moduleLoading: null,
    },
    temporaryReferences: clientReferences,
  });
}

async function compareTemporaryReferences(fixture, sourceRoot, received) {
  const sources = collectSourceObjects(fixture, sourceRoot);
  const expectedByReceived = new WeakMap();
  const visited = new Set();
  const blobs = [];
  const todo = [{expectedValue: sourceRoot, received, path: 'root'}];
  while (todo.length > 0) {
    const pair = todo.pop();
    try {
      const children = compareEchoedValue(fixture, sources, pair);
      if (children === null) {
        continue;
      }
      if (isObject(pair.received)) {
        assertSingleSource(
          expectedByReceived,
          pair.expectedValue,
          pair.received,
        );
        if (visited.has(pair.received)) {
          continue;
        }
        visited.add(pair.received);
        if (pair.expectedValue instanceof Blob) {
          blobs.push(pair);
        }
      }
      for (let i = children.length - 1; i >= 0; i--) {
        todo.push(children[i]);
      }
    } catch (error) {
      throwAtPath(error, pair.path);
    }
  }
  await Promise.all(
    blobs.map(({expectedValue, received: value}) =>
      assertBlobContents(expectedValue, value),
    ),
  );
}

// Returns the pairs to compare next, or null when the received value is the
// source object itself.
function compareEchoedValue(fixture, sources, pair) {
  const {expectedValue, received, path} = pair;
  // Opaque symbols have metadata too.
  const metadata = fixture.valueMetadata.get(expectedValue);
  const type = metadata === undefined ? undefined : metadata.type;
  if (type === 'opaque' || sources.has(received)) {
    if (!Object.is(received, expectedValue)) {
      throw new Error(
        type === 'opaque'
          ? 'an opaque temporary reference lost its identity'
          : 'a temporary reference resolved to a different source object',
      );
    }
    return null;
  }
  switch (type) {
    case 'promise':
    case 'thenable':
      // Draining awaits a thenable, which flattens a chain of thenables.
      requireWrapper(received, PROMISE);
      return [
        {
          expectedValue: unwrapThenable(fixture, metadata.value),
          received: received[PROMISE],
          path: path + '.then',
        },
      ];
    case 'stream':
      return compareList(metadata.items, received, STREAM, path + '.item');
    case 'iterator':
      return compareList(
        metadata.items,
        received,
        SYNC_ITERATOR,
        path + '.item',
      );
    case 'iterable':
      return compareList(
        metadata.items,
        received,
        ASYNC_ITERABLE,
        path + '.next',
      ).concat({
        expectedValue: metadata.returnValue,
        received: received[ASYNC_RETURN],
        path: path + '.return',
      });
    default:
      return compareValue(fixture, pair);
  }
}

function requireWrapper(received, key) {
  if (!isObject(received) || !(key in received)) {
    throw new Error(
      'expected a drained ' + key + ' but received ' + describeValue(received),
    );
  }
}

function compareList(items, received, key, path) {
  requireWrapper(received, key);
  const list = received[key];
  if (list.length !== items.length) {
    throw new Error(
      'expected ' + items.length + ' items but received ' + list.length,
    );
  }
  return items.map((item, i) => ({
    expectedValue: item,
    received: list[i],
    path: path + i,
  }));
}

function unwrapThenable(fixture, value) {
  const seen = new Set();
  let current = value;
  while (isObject(current) && !seen.has(current)) {
    const metadata = fixture.valueMetadata.get(current);
    if (
      metadata === undefined ||
      (metadata.type !== 'promise' && metadata.type !== 'thenable')
    ) {
      break;
    }
    seen.add(current);
    current = metadata.value;
  }
  return current;
}

// Every object reachable from the source root, including the contents of
// streams, iterables and thenables.
function collectSourceObjects(fixture, sourceRoot) {
  const sources = new Set();
  const todo = [sourceRoot];
  while (todo.length > 0) {
    const value = todo.pop();
    if (!isObject(value) || sources.has(value)) {
      continue;
    }
    sources.add(value);
    const metadata = fixture.valueMetadata.get(value);
    if (metadata !== undefined) {
      if (metadata.items !== undefined) {
        todo.push(...metadata.items);
      }
      if (metadata.type === 'iterable') {
        todo.push(metadata.returnValue);
      } else if (metadata.type === 'promise' || metadata.type === 'thenable') {
        todo.push(metadata.value);
      }
    } else if (value instanceof Map) {
      todo.push(...Array.from(value).flat());
    } else if (value instanceof Set) {
      todo.push(...value);
    } else if (Array.isArray(value)) {
      todo.push(...value);
    } else if (Object.getPrototypeOf(value) === Object.prototype) {
      todo.push(...Object.values(value));
    }
  }
  return sources;
}

module.exports = {
  roundTripTemporaryReferences,
  compareTemporaryReferences,
};
