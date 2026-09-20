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

    // Passing it back resolves the object through the server manifest.
    const body = await ReactServerDOMClient.encodeReply({ref: token});
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
    expect(() => result.first.theme).toThrow(
      'Cannot access theme on the client.',
    );
  });

  // @gate enableFlightObjectReferences
  it('round-trips an object reference under then after its module loads', async () => {
    let resolveModule;
    const blockOnChunk = new Promise(resolve => {
      resolveModule = resolve;
    });
    const settings = {theme: 'dark'};
    const ServerModule = serverObjectExports({settings}, blockOnChunk);
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);
    const body = await ReactServerDOMClient.encodeReply({
      first: ref,
      then: ref,
    });
    const pending = ReactServerDOMServer.decodeReply(body, turbopackServerMap);
    await resolveModule();
    const decoded = await pending;
    expect(decoded.first).toBe(settings);
    expect(decoded.then).toBe(settings);

    const decodedAgain = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decodedAgain.first).toBe(settings);
    expect(decodedAgain.then).toBe(settings);
  });

  // Produce an ordinary alias using the encoder, then extend only its path.
  // Map entries are outlined, so this also exercises delayed path resolution
  // when the referenced module has not loaded yet. Chunk IDs come from the encoder.
  async function encodePropertyRead(ref, property) {
    const container = {ref};
    const body = await ReactServerDOMClient.encodeReply({
      map: new Map([['container', container]]),
      selected: container,
    });
    const model = JSON.parse(body.get('0'));
    model.selected += ':ref:' + property;
    body.set('0', JSON.stringify(model));
    return body;
  }

  describe.each(['object', 'array'])('reply paths into a server %s', shape => {
    describe.each(['loaded', 'delayed'])('with a %s module', loading => {
      async function checkPropertyRead(registerExports, initialValue) {
        let resolveModule;
        const blockOnChunk =
          loading === 'delayed'
            ? new Promise(resolve => {
                resolveModule = resolve;
              })
            : undefined;
        let current = initialValue;
        const ServerModule = registerExports(
          {
            get value() {
              return current;
            },
          },
          blockOnChunk,
        );
        const stream = await serverAct(() =>
          ReactServerDOMServer.renderToReadableStream(
            {ref: ServerModule.value},
            turbopackMap,
          ),
        );
        const {ref} =
          await ReactServerDOMClient.createFromReadableStream(stream);
        const readProperty = jest.fn(() => 'server value');
        const property = shape === 'array' ? '0' : 'value';
        // Model the next request supplying a fresh module export. It has
        // never been registered or sent to the client.
        current = Object.defineProperty(shape === 'array' ? [] : {}, property, {
          get: readProperty,
        });
        const body = await encodePropertyRead(ref, property);
        const pending = ReactServerDOMServer.decodeReply(
          body,
          turbopackServerMap,
        );
        if (resolveModule) {
          await resolveModule();
        }
        await expect(Promise.resolve(pending)).rejects.toThrow(
          'Invalid reference.',
        );
        expect(readProperty).not.toHaveBeenCalled();

        const container = {ref};
        const validBody = await ReactServerDOMClient.encodeReply({
          container,
          alias: container,
        });
        const decoded = await ReactServerDOMServer.decodeReply(
          validBody,
          turbopackServerMap,
        );
        expect(decoded.container).toBe(decoded.alias);
        expect(decoded.container.ref).toBe(current);
      }

      // @gate enableFlightObjectReferences
      it('rejects property access through an object reference', async () => {
        await checkPropertyRead(serverObjectExports, {});
      });

      it('rejects property access through a function reference whose export is now an object', async () => {
        await checkPropertyRead(serverExports, function action() {});
      });
    });
  });

  it('still resolves aliases through client objects and arrays', async () => {
    const child = {value: 'client value'};
    const container = [child];
    const body = await ReactServerDOMClient.encodeReply({
      map: new Map([['container', container]]),
      container,
      child,
    });
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.container).toBe(decoded.map.get('container'));
    expect(decoded.child).toBe(decoded.container[0]);
    expect(decoded.child.value).toBe('client value');
  });

  // A consuming decoder (Map, Set, iterator) reads its initializer array
  // directly, without walking a property path, so the opacity guard in the
  // path walkers doesn't cover it. Pointing one at a chunk that resolves to a
  // server-owned array would otherwise spill its contents into the reply. Map
  // stands in for all three; they share one `isServerReferenceObject` guard in
  // `createMap`/`createSet`/`extractIterator`.
  // @gate enableFlightObjectReferences
  it('rejects a reply that decodes a server object as a Map', async () => {
    const leaked = [['leaked', 'secret']];
    const ServerModule = serverObjectExports({value: leaked});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.value},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);

    // Point a Map decoder at a fresh row that resolves to the server array, so
    // the Map initializer is the server-owned array itself (isArray is true)
    // and it's specifically the opacity guard that rejects, not the
    // not-an-array path. Row 7 is an unused id we add for this indirection.
    const body = await ReactServerDOMClient.encodeReply({ref});
    const referenceMarker = JSON.parse(body.get('0')).ref;
    body.set('0', JSON.stringify('$Q7'));
    body.set('7', JSON.stringify(referenceMarker));

    const pending = ReactServerDOMServer.decodeReply(body, turbopackServerMap);
    await expect(Promise.resolve(pending)).rejects.toThrow(
      'Invalid Map initializer.',
    );
    // The rejection happened before the decoder marked the server-owned array
    // as consumed, so its state is untouched.
    expect(leaked.$$consumed).toBe(undefined);
  });

  // @gate enableFlightObjectReferences
  it('keeps registered binary values opaque when yielded by an async iterable', async () => {
    async function* items(value) {
      yield value;
      yield value;
    }
    const values = [new Uint8Array([1, 2, 3]), new ArrayBuffer(3)];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      serverObjectExports({value});
      const stream = await serverAct(() =>
        ReactServerDOMServer.renderToReadableStream(
          {ref: value, items: items(value)},
          turbopackMap,
        ),
      );
      const result =
        await ReactServerDOMClient.createFromReadableStream(stream);
      const iterator = result.items[Symbol.asyncIterator]();
      const first = await iterator.next();
      const second = await iterator.next();
      expect(first.value === result.ref).toBe(true);
      expect(second.value === result.ref).toBe(true);
      expect((await iterator.next()).done).toBe(true);
      expect(() => first.value.byteLength).toThrow(
        'Cannot access byteLength on the client.',
      );
      const body = await ReactServerDOMClient.encodeReply({ref: first.value});
      const decoded = await ReactServerDOMServer.decodeReply(
        body,
        turbopackServerMap,
      );
      expect(decoded.ref).toBe(value);
    }
  });

  describe.each(['loaded', 'delayed'])(
    'invalid object references with a %s module',
    loading => {
      // @gate enableFlightObjectReferences
      it('rejects a function encoded as an object reference', async () => {
        let resolveModule;
        const blockOnChunk =
          loading === 'delayed'
            ? new Promise(resolve => {
                resolveModule = resolve;
              })
            : undefined;
        const fn = jest.fn();
        const ServerModule = serverExports({fn}, blockOnChunk);
        const stream = await serverAct(() =>
          ReactServerDOMServer.renderToReadableStream(
            {fn: ServerModule.fn},
            turbopackMap,
          ),
        );
        const result =
          await ReactServerDOMClient.createFromReadableStream(stream);
        const body = await ReactServerDOMClient.encodeReply({
          fn: result.fn,
          ref: result.fn,
        });
        const model = JSON.parse(body.get('0'));
        // Keep the function occurrence, but submit the same reference as an
        // object under "then" too. It must not become a callable thenable.
        model.then = model.ref.replace('$h', '$H');
        delete model.ref;
        body.set('0', JSON.stringify(model));
        const pending = ReactServerDOMServer.decodeReply(
          body,
          turbopackServerMap,
        );
        if (resolveModule) {
          await resolveModule();
        }
        await expect(Promise.resolve(pending)).rejects.toThrow(
          'Expected a Server Reference to an object to resolve to an object.',
        );
        expect(fn).not.toHaveBeenCalled();
      });
    },
  );

  // @gate enableFlightObjectReferences
  it('does not bind arguments supplied with object reference metadata', async () => {
    const bind = jest.fn();
    const settings = {bind};
    const ServerModule = serverObjectExports({settings});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);
    const body = await ReactServerDOMClient.encodeReply({
      ref,
      args: Promise.resolve([]),
    });
    const model = JSON.parse(body.get('0'));
    // Use the encoder's metadata and promise IDs; add only the unsupported
    // bound-arguments field to the object reference.
    const metadataKey = model.ref.slice(2);
    const metadata = JSON.parse(body.get(metadataKey));
    metadata.bound = model.args;
    body.set(metadataKey, JSON.stringify(metadata));
    const decoded = await ReactServerDOMServer.decodeReply(
      body,
      turbopackServerMap,
    );
    expect(decoded.ref).toBe(settings);
    expect(bind).not.toHaveBeenCalled();
  });

  // @gate enableFlightObjectReferences
  it('rejects an object reference missing from the receiving server manifest', async () => {
    const settings = {theme: 'dark'};
    const ServerModule = serverObjectExports({settings});
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {ref: ServerModule.settings},
        turbopackMap,
      ),
    );
    const {ref} = await ReactServerDOMClient.createFromReadableStream(stream);
    const body = await ReactServerDOMClient.encodeReply({ref});
    await expect(
      Promise.resolve(ReactServerDOMServer.decodeReply(body, {})),
    ).rejects.toThrow('Could not find the module');
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
