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

let serverExports;
let serverObjectExports;
let turbopackMap;
let turbopackServerMap;
let ReactServerDOMServer;
let ReactServerDOMClient;
let ReactServerScheduler;
let serverAct;

describe('ReactFlightTurbopackDOMObjectReferences', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactServerScheduler = require('scheduler');
    patchMessageChannel(ReactServerScheduler);
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-turbopack/server', () =>
      require('react-server-dom-turbopack/server.browser'),
    );

    const TurbopackMock = require('./utils/TurbopackMock');
    serverExports = TurbopackMock.serverExports;
    serverObjectExports = TurbopackMock.serverObjectExports;
    turbopackMap = TurbopackMock.turbopackMap;
    turbopackServerMap = TurbopackMock.turbopackServerMap;

    ReactServerDOMServer = require('react-server-dom-turbopack/server.browser');

    __unmockReact();
    jest.resetModules();
    ReactServerDOMClient = require('react-server-dom-turbopack/client.browser');
  });

  // @gate enableFlightObjectReferences
  it('passes an object reference to the client and back to the server where it resolves', async () => {
    const settings = {theme: 'dark'};
    const ServerModule = serverObjectExports({settings});

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    const token = result.ref;
    expect(typeof token).toBe('object');

    // The client representation is opaque. The object never crossed the wire,
    // and reading any property throws.
    expect(() => token.theme).toThrow(
      'Cannot access theme on the client. ' +
        'You cannot read a Server Reference to an object on the client. ' +
        'You can only pass it back to the server.',
    );
    // It is not callable either; it is not a Server Function.
    expect(() => token()).toThrow(TypeError);

    // React must treat it as a state value, not call it as an initializer.
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');
    function Client() {
      const [value] = React.useState(token);
      expect(value).toBe(token);
      return null;
    }
    ReactDOMServer.renderToString(React.createElement(Client));

    // Passing it back to the server resolves it to the object via the
    // manifest. Object references are encoded with their own marker, distinct
    // from function references.
    const body = await ReactServerDOMClient.encodeReply({ref: token});
    expect(body.get('0')).toContain('"$H');
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.ref).toBe(settings);
  });

  // @gate enableFlightObjectReferences
  it('encodes an object reference at the root, including with temporary references', async () => {
    const settings = {theme: 'dark'};
    const ServerModule = serverObjectExports({settings});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);

    const temporaryReferenceSets = [
      undefined,
      ReactServerDOMClient.createTemporaryReferenceSet(),
    ];
    for (let i = 0; i < temporaryReferenceSets.length; i++) {
      const temporaryReferences = temporaryReferenceSets[i];
      const body = await ReactServerDOMClient.encodeReply(ref, {
        temporaryReferences,
      });
      expect(body.get('0')).toContain('"$H');
      const decoded = await ReactServerDOMServer.decodeReply(
        body,
        turbopackServerMap,
      );
      expect(decoded).toBe(settings);

      const nestedBody = await ReactServerDOMClient.encodeReply(
        {first: ref, second: ref, promised: Promise.resolve(ref)},
        {temporaryReferences},
      );
      const nested = await ReactServerDOMServer.decodeReply(
        nestedBody,
        turbopackServerMap,
      );
      expect(nested.first).toBe(settings);
      expect(nested.second).toBe(settings);
      expect(await nested.promised).toBe(settings);
    }
  });

  // @gate enableFlightObjectReferences
  it('does not await an object reference that is a Promise', async () => {
    const promise = Promise.resolve('server secret');
    const ServerModule = serverObjectExports({promise});

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.promise},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    const token = result.ref;
    expect(typeof token).toBe('object');

    // The token must not appear thenable, or awaiting it would hang or leak.
    // Awaiting it just yields the token itself.
    expect(token.then).toBe(undefined);
    expect(await token).toBe(token);
    expect(() => token.value).toThrow('Cannot access value on the client.');

    const body = await ReactServerDOMClient.encodeReply({ref: token});
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.ref).toBe(promise);
    expect(await decoded.ref).toBe('server secret');
  });

  // @gate enableFlightObjectReferences
  it('resolves to the current value of the module export, not a snapshot', async () => {
    let current = {version: 1};
    const ServerModule = serverObjectExports({
      get value() {
        return current;
      },
    });

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.value},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    const token = result.ref;
    expect(typeof token).toBe('object');

    const body1 = await ReactServerDOMClient.encodeReply({ref: token});
    const decoded1 = await ReactServerDOMServer.decodeReply(
      body1,
      turbopackServerMap,
    );
    expect(decoded1.ref).toBe(current);
    expect(decoded1.ref.version).toBe(1);

    // Simulate a later request where the module export resolves to a fresh
    // value. The same reference must resolve to the new value.
    current = {version: 2};
    const body2 = await ReactServerDOMClient.encodeReply({ref: token});
    const decoded2 = await ReactServerDOMServer.decodeReply(
      body2,
      turbopackServerMap,
    );
    expect(decoded2.ref).toBe(current);
    expect(decoded2.ref.version).toBe(2);
  });

  // @gate enableFlightObjectReferences
  it('is not turned into a temporary reference when a TemporaryReferenceSet is passed', async () => {
    const settings = {theme: 'dark'};
    const ServerModule = serverObjectExports({settings});

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    const token = result.ref;
    expect(typeof token).toBe('object');

    // A Server Reference is never turned into a temporary reference, even
    // when a TemporaryReferenceSet is provided. It must encode as an object
    // reference so the server resolves it through the manifest.
    const temporaryReferences =
      ReactServerDOMClient.createTemporaryReferenceSet();
    const body = await ReactServerDOMClient.encodeReply(
      {ref: token},
      {temporaryReferences},
    );
    expect(body.get('0')).toContain('"$H');
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.ref).toBe(settings);
  });

  // @gate enableFlightObjectReferences
  it('keeps Dates and objects with toJSON opaque', async () => {
    const date = new Date('2026-09-14T00:00:00.000Z');
    const custom = {
      get toJSON() {
        throw new Error('Must not read toJSON on a registered object.');
      },
    };
    const ServerModule = serverObjectExports({date, custom});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(ServerModule, turbopackMap),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    expect(typeof result.date).toBe('object');
    expect(() => result.date.toISOString()).toThrow(
      'Cannot access toISOString on the client.',
    );
    expect(typeof result.custom).toBe('object');

    const body = await ReactServerDOMClient.encodeReply(result);
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.date).toBe(date);
    expect(decoded.custom).toBe(custom);
  });

  // @gate enableFlightObjectReferences
  it('preserves identity across repeated references and streamed values', async () => {
    const settings = {theme: 'dark'};
    serverObjectExports({settings});
    let resolveLater;
    const later = new Promise(resolve => {
      resolveLater = resolve;
    });
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          first: settings,
          second: settings,
          map: new Map([[settings, 'value']]),
          later,
        },
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    expect(result.first).toBe(result.second);
    expect(result.map.get(result.first)).toBe('value');
    await serverAct(() => resolveLater(settings));
    expect(await result.later).toBe(result.first);
  });

  // @gate enableFlightObjectReferences
  it('round-trips an object reference under then, including after preloading a module', async () => {
    const settings = {theme: 'dark'};
    serverObjectExports({settings});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: settings},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);
    const body = await ReactServerDOMClient.encodeReply({
      first: ref,
      then: ref,
    });
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.first).toBe(settings);
    expect(decoded.then).toBe(settings);

    const moduleId = settings.$$id.slice(0, settings.$$id.lastIndexOf('#'));
    turbopackServerMap[moduleId].chunks = ['settings.js'];
    let resolveModule;
    global.__turbopack_load_by_url__ = jest.fn(
      () =>
        new Promise(resolve => {
          resolveModule = resolve;
        }),
    );
    try {
      const pending = ReactServerDOMServer.decodeReply(
        body,
        turbopackServerMap,
      );
      const completion = new Promise((resolve, reject) =>
        pending.then(resolve, reject),
      );
      resolveModule();
      const asyncDecoded = await completion;
      expect(asyncDecoded.first).toBe(settings);
      expect(asyncDecoded.then).toBe(settings);
    } finally {
      delete global.__turbopack_load_by_url__;
    }
  });

  // @gate enableFlightObjectReferences
  it('rejects a function forged as an object reference, even if its function metadata was cached', async () => {
    const fn = jest.fn();
    serverExports({fn});
    const body = new FormData();
    body.set('0', '{"function":"$h1","then":"$H1"}');
    body.set('1', JSON.stringify({id: fn.$$id}));
    await expect(
      ReactServerDOMServer.decodeReply(body, turbopackServerMap),
    ).rejects.toThrow(
      'Expected a Server Reference to an object to resolve to an object.',
    );
    expect(fn).not.toHaveBeenCalled();
  });

  // @gate enableFlightObjectReferences
  it('does not trust an object reference cache supplied in the payload', async () => {
    const fn = jest.fn();
    serverExports({fn});
    const body = new FormData();
    body.set('0', '{"then":"$H1"}');
    body.set(
      '1',
      JSON.stringify({
        id: fn.$$id,
        $$objectPromise: {status: 'fulfilled', value: '$h2'},
      }),
    );
    body.set('2', JSON.stringify({id: fn.$$id}));
    await expect(
      ReactServerDOMServer.decodeReply(body, turbopackServerMap),
    ).rejects.toThrow(
      'Expected a Server Reference to an object to resolve to an object.',
    );
    expect(fn).not.toHaveBeenCalled();
  });

  // @gate enableFlightObjectReferences
  it('rejects an asynchronously loaded function forged as an object reference', async () => {
    const fn = jest.fn();
    serverExports({fn});
    const moduleId = fn.$$id.slice(0, fn.$$id.lastIndexOf('#'));
    turbopackServerMap[moduleId].chunks = ['function.js'];
    let resolveModule;
    global.__turbopack_load_by_url__ = jest.fn(
      () =>
        new Promise(resolve => {
          resolveModule = resolve;
        }),
    );
    try {
      const body = new FormData();
      body.set('0', '{"first":"$H1","then":"$H1"}');
      body.set('1', JSON.stringify({id: fn.$$id}));
      const pending = ReactServerDOMServer.decodeReply(
        body,
        turbopackServerMap,
      );
      const completion = new Promise((resolve, reject) =>
        pending.then(resolve, reject),
      );
      resolveModule();
      await expect(completion).rejects.toThrow(
        'Expected a Server Reference to an object to resolve to an object.',
      );
      expect(fn).not.toHaveBeenCalled();
    } finally {
      delete global.__turbopack_load_by_url__;
    }
  });

  // @gate enableFlightObjectReferences
  it('does not bind arguments supplied with object reference metadata', async () => {
    const bind = jest.fn();
    const settings = {bind};
    serverObjectExports({settings});
    const body = new FormData();
    body.set('0', '{"ref":"$H1"}');
    body.set('1', JSON.stringify({id: settings.$$id, bound: '$@2'}));
    body.set('2', '[]');
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.ref).toBe(settings);
    expect(bind).not.toHaveBeenCalled();
  });

  it('rejects a reference whose id is not in the server manifest', async () => {
    const forged = ReactServerDOMClient.createServerReference(
      'file:///forged#steal',
      () => Promise.resolve(),
    );
    const body = await ReactServerDOMClient.encodeReply({ref: forged});
    await expect(
      ReactServerDOMServer.decodeReply(body, turbopackServerMap),
    ).rejects.toThrow(
      'Could not find the module "file:///forged#steal" in the React Server ' +
        'Manifest.',
    );
  });

  // @gate !enableFlightObjectReferences
  it('serializes a registered Promise as a thenable when the flag is off', async () => {
    const promise = Promise.resolve('resolved');
    const ServerModule = serverObjectExports({promise});

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {promise: ServerModule.promise},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);

    // Without the flag, a registered Promise is awaited like any other
    // thenable and its value crosses to the client.
    expect(await result.promise).toBe('resolved');
  });

  // @gate enableFlightObjectReferences
  it('round-trips objects and bound functions together', async () => {
    const settings = {theme: 'dark'};
    function describe(theme, name) {
      return theme + ': ' + name;
    }
    const ServerModule = serverObjectExports({settings, describe});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          settings: ServerModule.settings,
          again: ServerModule.settings,
          describe: ServerModule.describe,
          bound: ServerModule.describe.bind(null, 'dark'),
        },
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    expect(typeof result.settings).toBe('object');
    expect(() => result.settings.theme).toThrow(
      'Cannot access theme on the client.',
    );
    expect(result.again).toBe(result.settings);
    expect(typeof result.describe).toBe('function');
    expect(typeof result.bound).toBe('function');

    const body = await ReactServerDOMClient.encodeReply(result);
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.settings).toBe(settings);
    expect(decoded.again).toBe(settings);
    expect(decoded.describe).toBe(describe);
    expect(decoded.bound('Alice')).toBe('dark: Alice');
  });

  it('still round-trips function server references', async () => {
    function greet(name) {
      return 'hi, ' + name;
    }
    const ServerModule = serverExports({greet});

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {method: ServerModule.greet},
        turbopackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);
    expect(typeof result.method).toBe('function');

    const body = await ReactServerDOMClient.encodeReply({
      method: result.method,
    });
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.method).toBe(greet);
    expect(decoded.method('there')).toBe('hi, there');
  });
});
