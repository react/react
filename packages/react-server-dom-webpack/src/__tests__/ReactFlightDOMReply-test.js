/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// let serverExports;
let webpackServerMap;
let React;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactServerScheduler;
let serverAct;

describe('ReactFlightDOMReply', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactServerScheduler = require('scheduler');
    patchMessageChannel(ReactServerScheduler);
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.browser'),
    );
    const WebpackMock = require('./utils/WebpackMock');
    // serverExports = WebpackMock.serverExports;
    webpackServerMap = WebpackMock.webpackServerMap;
    React = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server.browser');
    jest.resetModules();
    __unmockReact();
    ReactServerDOMClient = require('react-server-dom-webpack/client');
  });

  // This method should exist on File but is not implemented in JSDOM
  async function arrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        return resolve(reader.result);
      };
      reader.onerror = function () {
        return reject(reader.error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  it('can pass undefined as a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply(undefined);
    const missing = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    expect(missing).toBe(undefined);

    const body2 = await ReactServerDOMClient.encodeReply({
      array: [undefined, null, undefined],
      prop: undefined,
    });
    const object = await ReactServerDOMServer.decodeReply(
      body2,
      webpackServerMap,
    );
    expect(object.array.length).toBe(3);
    expect(object.array[0]).toBe(undefined);
    expect(object.array[1]).toBe(null);
    expect(object.array[3]).toBe(undefined);
    expect(object.prop).toBe(undefined);
    // These should really be true but our deserialization doesn't currently deal with it.
    expect('3' in object.array).toBe(false);
    expect('prop' in object).toBe(false);
  });

  it('can pass an iterable as a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply({
      [Symbol.iterator]: function* () {
        yield 'A';
        yield 'B';
        yield 'C';
      },
    });
    const iterable = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const items = [];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const item of iterable) {
      items.push(item);
    }
    expect(items).toEqual(['A', 'B', 'C']);

    // Multipass
    const items2 = [];
    // eslint-disable-next-line no-for-of-loops/no-for-of-loops
    for (const item of iterable) {
      items2.push(item);
    }
    expect(items2).toEqual(['A', 'B', 'C']);
  });

  it('can pass an iterator as a reply', async () => {
    const iterator = (function* () {
      yield 'A';
      yield 'B';
      yield 'C';
    })();

    const body = await ReactServerDOMClient.encodeReply(iterator);
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    // The iterator should be the same as itself.
    expect(result[Symbol.iterator]()).toBe(result);

    expect(Array.from(result)).toEqual(['A', 'B', 'C']);
    // We've already consumed this iterator.
    expect(Array.from(result)).toEqual([]);
  });

  it('can pass weird numbers as a reply', async () => {
    const nums = [0, -0, Infinity, -Infinity, NaN];
    const body = await ReactServerDOMClient.encodeReply(nums);
    const nums2 = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(nums).toEqual(nums2);
    expect(nums.every((n, i) => Object.is(n, nums2[i]))).toBe(true);
  });

  it('can pass a BigInt as a reply', async () => {
    const body = await ReactServerDOMClient.encodeReply(90071992547409910000n);
    const n = await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(n).toEqual(90071992547409910000n);
  });

  it('can pass FormData as a reply', async () => {
    const formData = new FormData();
    formData.set('hello', 'world');
    formData.append('list', '1');
    formData.append('list', '2');
    formData.append('list', '3');
    const typedArray = new Uint8Array([0, 1, 2, 3]);
    const blob = new Blob([typedArray]);
    formData.append('blob', blob, 'filename.blob');

    const body = await ReactServerDOMClient.encodeReply(formData);
    const formData2 = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    expect(formData2).not.toBe(formData);
    expect(Array.from(formData2).length).toBe(5);
    expect(formData2.get('hello')).toBe('world');
    expect(formData2.getAll('list')).toEqual(['1', '2', '3']);
    const blob2 = formData.get('blob');
    expect(blob2.size).toBe(4);
    expect(blob2.name).toBe('filename.blob');
    expect(blob2.type).toBe('');
    const typedArray2 = new Uint8Array(await arrayBuffer(blob2));
    expect(typedArray2).toEqual(typedArray);
  });

  it('can pass multiple Files in FormData', async () => {
    const typedArrayA = new Uint8Array([0, 1, 2, 3]);
    const typedArrayB = new Uint8Array([4, 5]);
    const blobA = new Blob([typedArrayA]);
    const blobB = new Blob([typedArrayB]);
    const formData = new FormData();
    formData.append('filelist', 'string');
    formData.append('filelist', blobA);
    formData.append('filelist', blobB);

    const body = await ReactServerDOMClient.encodeReply(formData);
    const formData2 = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    const filelist2 = formData2.getAll('filelist');
    expect(filelist2.length).toBe(3);
    expect(filelist2[0]).toBe('string');
    const blobA2 = filelist2[1];
    expect(blobA2.size).toBe(4);
    expect(blobA2.name).toBe('blob');
    expect(blobA2.type).toBe('');
    const typedArrayA2 = new Uint8Array(await arrayBuffer(blobA2));
    expect(typedArrayA2).toEqual(typedArrayA);
    const blobB2 = filelist2[2];
    expect(blobB2.size).toBe(2);
    expect(blobB2.name).toBe('blob');
    expect(blobB2.type).toBe('');
    const typedArrayB2 = new Uint8Array(await arrayBuffer(blobB2));
    expect(typedArrayB2).toEqual(typedArrayB);
  });

  it('can pass two independent FormData with same keys', async () => {
    const formDataA = new FormData();
    formDataA.set('greeting', 'hello');
    const formDataB = new FormData();
    formDataB.set('greeting', 'hi');

    const body = await ReactServerDOMClient.encodeReply({
      a: formDataA,
      b: formDataB,
    });
    const {a: formDataA2, b: formDataB2} =
      await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(Array.from(formDataA2).length).toBe(1);
    expect(Array.from(formDataB2).length).toBe(1);
    expect(formDataA2.get('greeting')).toBe('hello');
    expect(formDataB2.get('greeting')).toBe('hi');
  });

  it('can pass a Date as a reply', async () => {
    const d = new Date(1234567890123);
    const body = await ReactServerDOMClient.encodeReply(d);
    const d2 = await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(d).toEqual(d2);
    expect(d % 1000).toEqual(123); // double-check the milliseconds made it through
  });

  it('can pass a Map as a reply', async () => {
    const objKey = {obj: 'key'};
    const m = new Map([
      ['hi', {greet: 'world'}],
      [objKey, 123],
    ]);
    const body = await ReactServerDOMClient.encodeReply(m);
    const m2 = await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(m2 instanceof Map).toBe(true);
    expect(m2.size).toBe(2);
    expect(m2.get('hi').greet).toBe('world');
    expect(m2).toEqual(m);
  });

  it('can pass a Set as a reply', async () => {
    const objKey = {obj: 'key'};
    const s = new Set(['hi', objKey]);

    const body = await ReactServerDOMClient.encodeReply(s);
    const s2 = await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(s2 instanceof Set).toBe(true);
    expect(s2.size).toBe(2);
    expect(s2.has('hi')).toBe(true);
    expect(s2).toEqual(s);
  });

  it('can pass a null-prototype object as a reply', async () => {
    const obj = Object.create(null);
    const nested = Object.create(null);
    const shared = Object.create(null);
    nested.answer = 42;
    shared.label = 'shared';
    obj.greet = 'world';
    obj.constructor = 'safe';
    Object.defineProperty(obj, '__proto__', {
      value: 'proto value',
      enumerable: true,
      writable: true,
      configurable: true,
    });
    obj.nested = nested;
    obj.first = shared;
    obj.second = shared;

    const body = await ReactServerDOMClient.encodeReply(obj);
    const obj2 = await ReactServerDOMServer.decodeReply(body, webpackServerMap);

    expect(Object.getPrototypeOf(obj2)).toBe(null);
    expect(Object.getPrototypeOf(obj2.nested)).toBe(null);
    expect(Object.getPrototypeOf(obj2.first)).toBe(null);
    expect(obj2.first).toBe(obj2.second);
    expect(Object.prototype.hasOwnProperty.call(obj2, '__proto__')).toBe(true);
    expect(Object.getOwnPropertyDescriptor(obj2, '__proto__').value).toBe(
      'proto value',
    );
    expect(obj2.constructor).toBe('safe');
    expect(obj2.greet).toBe('world');
    expect(obj2.nested.answer).toBe(42);
  });

  it('does not hang indefinitely when calling decodeReply with FormData', async () => {
    let error;
    try {
      await ReactServerDOMServer.decodeReply(new FormData(), webpackServerMap);
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe('Connection closed.');
  });

  it('resolves a promise and includes its value', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    const bodyPromise = ReactServerDOMClient.encodeReply({promise: promise});
    resolve('Hi');
    const result = await ReactServerDOMServer.decodeReply(await bodyPromise);
    expect(await result.promise).toBe('Hi');
  });

  it('resolves a React.lazy and includes its value', async () => {
    let resolve;
    const lazy = React.lazy(() => new Promise(r => (resolve = r)));
    const bodyPromise = ReactServerDOMClient.encodeReply({lazy: lazy});
    resolve({default: 'Hi'});
    const result = await ReactServerDOMServer.decodeReply(await bodyPromise);
    expect(result.lazy).toBe('Hi');
  });

  it('resolves a proxy throwing a promise inside React.lazy', async () => {
    let resolve1;
    let resolve2;
    const lazy = React.lazy(() => new Promise(r => (resolve1 = r)));
    const promise = new Promise(r => (resolve2 = r));
    const bodyPromise1 = ReactServerDOMClient.encodeReply({lazy: lazy});
    const target = {value: ''};
    let loaded = false;
    const proxy = new Proxy(target, {
      get(targetObj, prop, receiver) {
        if (prop === 'value') {
          if (!loaded) {
            throw promise;
          }
          return 'Hello';
        }
        return targetObj[prop];
      },
    });
    await resolve1({default: proxy});

    // Encode it again so that we have an already initialized lazy
    // This is now already resolved but the proxy inside isn't. This ensures
    // we trigger the retry code path.
    const bodyPromise2 = ReactServerDOMClient.encodeReply({lazy: lazy});

    // Then resolve the inner thrown promise.
    loaded = true;
    await resolve2('Hello');

    const result1 = await ReactServerDOMServer.decodeReply(await bodyPromise1);
    expect(await result1.lazy.value).toBe('Hello');
    const result2 = await ReactServerDOMServer.decodeReply(await bodyPromise2);
    expect(await result2.lazy.value).toBe('Hello');
  });

  it('errors when called with JSX by default', async () => {
    let error;
    try {
      await ReactServerDOMClient.encodeReply(<div />);
    } catch (x) {
      error = x;
    }
    expect(error).toEqual(
      expect.objectContaining({
        message: __DEV__
          ? expect.stringContaining(
              'React Element cannot be passed to Server Functions from the Client without a temporary reference set.',
            )
          : expect.stringContaining(''),
      }),
    );
  });

  it('can pass JSX through a round trip using temporary references', async () => {
    function Component() {
      return <div />;
    }

    const children = <Component />;

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(
      {children},
      {
        temporaryReferences,
      },
    );

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(serverPayload, null, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClient.createFromReadableStream(
      stream,
      {
        temporaryReferences,
      },
    );

    // This should've been the same reference that we already saw.
    expect(response.children).toBe(children);
  });

  it('can pass JSX as root model through a round trip using temporary references', async () => {
    const jsx = <div />;

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(jsx, {
      temporaryReferences,
    });

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(serverPayload, null, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClient.createFromReadableStream(
      stream,
      {
        temporaryReferences,
      },
    );

    // This should be the same reference that we already saw.
    await expect(response).toBe(jsx);
  });

  it('can pass a promise that resolves to JSX through a round trip using temporary references', async () => {
    const jsx = <div />;
    const promise = Promise.resolve(jsx);

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(
      {promise},
      {
        temporaryReferences,
      },
    );

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(serverPayload, null, {
        temporaryReferences: temporaryReferencesServer,
      }),
    );
    const response = await ReactServerDOMClient.createFromReadableStream(
      stream,
      {
        temporaryReferences,
      },
    );

    // This should resolve to the same reference that we already saw.
    await expect(response.promise).resolves.toBe(jsx);
  });

  it('can return the same object using temporary references', async () => {
    const obj = {
      this: {is: 'a large object'},
      with: {many: 'properties in it'},
    };

    const root = {obj};

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(root, {
      temporaryReferences,
    });

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          root: serverPayload,
          obj: serverPayload.obj,
        },
        null,
        {temporaryReferences: temporaryReferencesServer},
      ),
    );
    const response = await ReactServerDOMClient.createFromReadableStream(
      stream,
      {
        temporaryReferences,
      },
    );

    // This should've been the same reference that we already saw because
    // we returned it by reference.
    expect(response.root).toBe(root);
    expect(response.obj).toBe(obj);
  });

  it('can return an opaque object through an async function', async () => {
    function fn() {
      return 'this is a client function';
    }

    const args = [fn];

    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(args, {
      temporaryReferences,
    });

    const temporaryReferencesServer =
      ReactServerDOMServer.createTemporaryReferenceSet();
    const serverPayload = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
      {temporaryReferences: temporaryReferencesServer},
    );

    async function action(arg) {
      return arg;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          result: action.apply(null, serverPayload),
        },
        null,
        {temporaryReferences: temporaryReferencesServer},
      ),
    );
    const response = await ReactServerDOMClient.createFromReadableStream(
      stream,
      {
        temporaryReferences,
      },
    );

    expect(await response.result).toBe(fn);
  });

  it('should supports streaming ReadableStream with objects', async () => {
    let controller1;
    let controller2;
    const s1 = new ReadableStream({
      start(c) {
        controller1 = c;
      },
    });
    const s2 = new ReadableStream({
      start(c) {
        controller2 = c;
      },
    });

    const promise = ReactServerDOMClient.encodeReply({s1, s2});

    controller1.enqueue({hello: 'world'});
    controller2.enqueue({hi: 'there'});

    controller1.enqueue('text1');
    controller2.enqueue('text2');

    controller1.close();
    controller2.close();

    const body = await promise;

    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );
    const reader1 = result.s1.getReader();
    const reader2 = result.s2.getReader();

    expect(await reader1.read()).toEqual({
      value: {hello: 'world'},
      done: false,
    });
    expect(await reader2.read()).toEqual({
      value: {hi: 'there'},
      done: false,
    });

    expect(await reader1.read()).toEqual({
      value: 'text1',
      done: false,
    });
    expect(await reader1.read()).toEqual({
      value: undefined,
      done: true,
    });
    expect(await reader2.read()).toEqual({
      value: 'text2',
      done: false,
    });
    expect(await reader2.read()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('should supports streaming AsyncIterables with objects', async () => {
    let resolve;
    const wait = new Promise(r => (resolve = r));
    const multiShotIterable = {
      async *[Symbol.asyncIterator]() {
        const next = yield {hello: 'A'};
        expect(next).toBe(undefined);
        await wait;
        yield {hi: 'B'};
        return 'C';
      },
    };
    const singleShotIterator = (async function* () {
      const next = yield {hello: 'D'};
      expect(next).toBe(undefined);
      await wait;
      yield {hi: 'E'};
      return 'F';
    })();

    await resolve();

    const body = await ReactServerDOMClient.encodeReply({
      multiShotIterable,
      singleShotIterator,
    });
    const result = await ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    const iterator1 = result.multiShotIterable[Symbol.asyncIterator]();
    const iterator2 = result.singleShotIterator[Symbol.asyncIterator]();

    expect(iterator1).not.toBe(result.multiShotIterable);
    expect(iterator2).toBe(result.singleShotIterator);

    expect(await iterator1.next()).toEqual({
      value: {hello: 'A'},
      done: false,
    });
    expect(await iterator2.next()).toEqual({
      value: {hello: 'D'},
      done: false,
    });

    expect(await iterator1.next()).toEqual({
      value: {hi: 'B'},
      done: false,
    });
    expect(await iterator2.next()).toEqual({
      value: {hi: 'E'},
      done: false,
    });
    expect(await iterator1.next()).toEqual({
      value: 'C', // Return value
      done: true,
    });
    expect(await iterator1.next()).toEqual({
      value: undefined,
      done: true,
    });

    expect(await iterator2.next()).toEqual({
      value: 'F', // Return value
      done: true,
    });

    // Multi-shot iterables should be able to do the same thing again
    const iterator3 = result.multiShotIterable[Symbol.asyncIterator]();

    expect(iterator3).not.toBe(iterator1);

    // We should be able to iterate over the iterable again and it should be
    // synchronously available using instrumented promises so that React can
    // rerender it synchronously.
    expect(iterator3.next().value).toEqual({
      value: {hello: 'A'},
      done: false,
    });
    expect(iterator3.next().value).toEqual({
      value: {hi: 'B'},
      done: false,
    });
    expect(iterator3.next().value).toEqual({
      value: 'C', // Return value
      done: true,
    });
    expect(iterator3.next().value).toEqual({
      value: undefined,
      done: true,
    });

    expect(() => iterator3.next('this is not allowed')).toThrow(
      'Values cannot be passed to next() of AsyncIterables passed to Client Components.',
    );
  });

  it('can transport cyclic objects', async () => {
    const cyclic = {obj: null};
    cyclic.obj = cyclic;

    const body = await ReactServerDOMClient.encodeReply({prop: cyclic});
    const root = await ReactServerDOMServer.decodeReply(body, webpackServerMap);
    expect(root.prop.obj).toBe(root.prop);
  });

  it('can transport cyclic arrays', async () => {
    const obj = {};
    const cyclic = [obj];
    cyclic[1] = cyclic;

    const body = await ReactServerDOMClient.encodeReply({prop: cyclic, obj});
    const root = await ReactServerDOMServer.decodeReply(body, webpackServerMap);
    expect(root.prop[1]).toBe(root.prop);
    expect(root.prop[0]).toBe(root.obj);
  });

  it('can abort an unresolved model and get the partial result', async () => {
    const promise = new Promise(r => {});
    const controller = new AbortController();
    const bodyPromise = ReactServerDOMClient.encodeReply(
      {promise: promise, hello: 'world'},
      {signal: controller.signal},
    );
    controller.abort();

    const result = await ReactServerDOMServer.decodeReply(await bodyPromise);
    expect(result.hello).toBe('world');
    // TODO: await result.promise should reject at this point because the stream
    // has closed but that's a bug in both ReactFlightReplyServer and ReactFlightClient.
    // It just halts in this case.
  });

  it('cannot deserialize a Blob reference backed by a string', async () => {
    const formData = new FormData();
    formData.set('1', '-'.repeat(50000));
    formData.set('0', JSON.stringify(['$B1']));
    let error;
    try {
      await ReactServerDOMServer.decodeReply(formData, webpackServerMap);
    } catch (x) {
      error = x;
    }
    expect(error.message).toContain('Referenced Blob is not a Blob.');
  });
});
