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
    ReactServerDOMClient = require('react-server-dom-turbopack/client');
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

    // The client representation is opaque. The object never crossed the wire,
    // and reading any property throws.
    expect(() => token.theme).toThrow(
      'Cannot access theme on the client. ' +
        'You cannot read a Server Reference to an object on the client. ' +
        'You can only pass it back to the server.',
    );
    // It is not callable either; it is not a Server Function.
    expect(() => token()).toThrow(
      'Attempted to call a Server Reference to an object from the client, ' +
        'but it is not a function. You can only pass it back to the server.',
    );

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
