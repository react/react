/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

// The taint registry forgets a value once its lifetime object is collected.
// A mock stands in for the real registry so a test can collect on demand.
const finalizationRegistries = [];
function FinalizationRegistryMock(callback) {
  this._heldValues = [];
  this._callback = callback;
  finalizationRegistries.push(this);
}
FinalizationRegistryMock.prototype.register = function (target, heldValue) {
  this._heldValues.push(heldValue);
};
global.FinalizationRegistry = FinalizationRegistryMock;

function gc() {
  for (let i = 0; i < finalizationRegistries.length; i++) {
    const registry = finalizationRegistries[i];
    const callback = registry._callback;
    const heldValues = registry._heldValues;
    for (let j = 0; j < heldValues.length; j++) {
      callback(heldValues[j]);
    }
    heldValues.length = 0;
  }
}

let clientExports;
let clientModuleError;
let webpackMap;
let webpackModules;
let webpackModuleLoading;
let React;
let ReactDOMServer;
let ReactServer;
let FlightReactDOM;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let ReactServerDOMClient;
let Stream;
let use;
let serverAct;

describe('ReactFlightDOMResult', () => {
  beforeEach(() => {
    jest.resetModules();

    patchSetImmediate();
    serverAct = require('internal-test-utils').serverAct;

    // Simulate the condition resolution
    jest.mock('react', () => require('react/react.react-server'));
    jest.mock('react-server-dom-webpack/server', () =>
      jest.requireActual('react-server-dom-webpack/server.node'),
    );
    ReactServer = require('react');
    FlightReactDOM = require('react-dom');
    ReactServerDOMServer = require('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/static', () =>
      jest.requireActual('react-server-dom-webpack/static.node'),
    );
    ReactServerDOMStaticServer = require('react-server-dom-webpack/static');

    const WebpackMock = require('./utils/WebpackMock');
    clientExports = WebpackMock.clientExports;
    clientModuleError = WebpackMock.clientModuleError;
    webpackMap = WebpackMock.webpackMap;
    webpackModules = WebpackMock.webpackModules;
    webpackModuleLoading = WebpackMock.moduleLoading;

    jest.resetModules();
    __unmockReact();
    jest.unmock('react-server-dom-webpack/server');
    jest.unmock('react-server-dom-webpack/static');
    jest.mock('react-server-dom-webpack/client', () =>
      jest.requireActual('react-server-dom-webpack/client.node'),
    );

    React = require('react');
    ReactDOMServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Stream = require('stream');
    use = React.use;
  });

  function readFromResult(result, options) {
    return ReactServerDOMClient.createFromResult(result, {
      clientManifest: webpackMap,
      serverConsumerManifest: {
        // The SSR module graph is the same as the server's in these tests.
        moduleMap: null,
        moduleLoading: webpackModuleLoading,
        serverModuleMap: null,
      },
      ...options,
    });
  }

  function readFromStream(result) {
    const readable = new Stream.PassThrough();
    ReactServerDOMServer.renderToPipeableStream(result, webpackMap).pipe(
      readable,
    );
    return ReactServerDOMClient.createFromNodeStream(readable, {
      moduleMap: webpackMap,
      moduleLoading: webpackModuleLoading,
    });
  }

  async function readAll(iterable) {
    const iterator = iterable[Symbol.asyncIterator]();
    const items = [];
    while (true) {
      const {done, value} = await iterator.next();
      if (done) {
        return items;
      }
      items.push(value);
    }
  }

  async function readStream(stream) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return chunks;
      }
      chunks.push(value);
    }
  }

  async function readHTML(element) {
    const output = new Stream.PassThrough();
    let html = '';
    output.setEncoding('utf8');
    output.on('data', chunk => {
      html += chunk;
    });
    const done = new Promise(resolve => output.on('end', resolve));
    await serverAct(() => {
      const {pipe} = ReactDOMServer.renderToPipeableStream(element, {
        onAllReady() {
          pipe(output);
        },
      });
    });
    await done;
    return html;
  }

  it('reads a Result in process', async () => {
    let renders = 0;
    async function Greeting({name}) {
      renders++;
      await 1;
      return ReactServer.createElement('p', null, 'Hello, ' + name);
    }
    const data = {items: [1, 2, 3]};
    const model = {
      header: ReactServer.createElement('h1', null, 'Title'),
      data,
      greeting: ReactServer.createElement(Greeting, {name: 'Seb'}),
    };
    const result = ReactServerDOMServer.renderToResult(model);
    const root = await readFromResult(result);
    // Nothing about these needs to change for this consumer.
    expect(root.header).toBe(model.header);
    expect(root.data).toBe(data);
    // The Server Component is read once it has rendered.
    expect(root.greeting.$$typeof).toBe(Symbol.for('react.lazy'));
    const greeting = await serverAct(() => root.greeting._payload);
    expect(greeting.type).toBe('p');
    expect(greeting.props.children).toBe('Hello, Seb');
    expect(renders).toBe(1);
  });

  it('renders the HTML of a Result', async () => {
    async function Greeting({name}) {
      await 1;
      return ReactServer.createElement('p', null, 'Hello, ' + name);
    }
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Greeting, {name: 'Seb'}),
      );
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    const response = readFromResult(result);
    function Root() {
      return use(response);
    }
    expect(await readHTML(React.createElement(Root))).toBe(
      '<div><p>Hello, Seb</p></div>',
    );
  });

  it('rejects a value the wire rejects with the same error', async () => {
    const errors = [];
    function handler() {}
    function App() {
      return ReactServer.createElement('div', {data: {handler}});
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
      {
        onError(error) {
          errors.push(error.message);
          return 'digest(' + error.message + ')';
        },
      },
    );
    // The element holding the invalid value is at the top of the root row,
    // so the root fails, as it would on the wire.
    let caught;
    try {
      await readFromResult(result);
    } catch (error) {
      caught = error;
    }
    expect(errors).toEqual([
      'Functions cannot be passed directly to Client Components unless you ' +
        'explicitly expose it by marking it with "use server". Or maybe you ' +
        'meant to call this function rather than return it.\n' +
        '  {handler: function handler}\n' +
        '            ^^^^^^^^^^^^^^^^',
    ]);
    expect(caught.digest).toBe('digest(' + errors[0] + ')');
    expect(caught.message).toBe(
      __DEV__
        ? errors[0]
        : 'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.',
    );
  });

  // Reads a Result whose root errors, and returns what was reported.
  async function readErrors(element) {
    const errors = [];
    const result = ReactServerDOMServer.renderToResult(element, {
      onError(error) {
        errors.push(error.message);
      },
    });
    await expect(readFromResult(result)).rejects.toThrow();
    return errors;
  }

  // @gate enableTaint
  it('rejects a tainted object like the wire', async () => {
    const user = {name: 'Seb', age: 'rather not say'};
    ReactServer.experimental_taintObjectReference(
      "Don't pass the raw user object to the client",
      user,
    );
    const errors = await readErrors(ReactServer.createElement('div', {user}));
    expect(errors).toEqual(["Don't pass the raw user object to the client"]);
  });

  // @gate enableTaint
  it('rejects a tainted function like the wire', async () => {
    function change() {}
    ReactServer.experimental_taintObjectReference(
      'A change handler cannot be passed to a client component',
      change,
    );
    const errors = await readErrors(
      ReactServer.createElement('div', {onChange: change}),
    );
    expect(errors).toEqual([
      'A change handler cannot be passed to a client component',
    ]);
  });

  // @gate enableTaint
  it('rejects a tainted string like the wire', async () => {
    const process = {env: {SECRET: '3e971ecc1485fe78625598bf9b6f85db'}};
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      process,
      process.env.SECRET,
    );
    const errors = await readErrors(
      ReactServer.createElement('div', {token: process.env.SECRET}),
    );
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
    // Keeps the lifetime object alive through the read.
    expect(process.env.SECRET).toBe('3e971ecc1485fe78625598bf9b6f85db');
  });

  // @gate enableTaint
  it('rejects a tainted bigint like the wire', async () => {
    const currentUser = {token: BigInt('0x3e971ecc1485fe78625598bf9b6f85dc')};
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      currentUser,
      currentUser.token,
    );
    const errors = await readErrors(
      ReactServer.createElement('div', {token: currentUser.token}),
    );
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
  });

  // @gate enableTaint
  it('rejects a copy of a tainted binary value like the wire', async () => {
    const currentUser = {
      token: new Uint32Array([0x3e971ecc, 0x1485fe78, 0x625598bf, 0x9b6f85dd]),
    };
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      currentUser,
      currentUser.token,
    );
    const errors = await readErrors(
      ReactServer.createElement('div', {token: currentUser.token.slice()}),
    );
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
  });

  // @gate enableTaint
  it('rejects a tainted string inside a FormData like the wire', async () => {
    const process = {env: {SECRET: '3e971ecc1485fe78625598bf9b6f85db'}};
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      process,
      process.env.SECRET,
    );
    const formData = new FormData();
    formData.append('token', process.env.SECRET);
    const errors = await readErrors(
      ReactServer.createElement('div', {formData}),
    );
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
    expect(process.env.SECRET).toBe('3e971ecc1485fe78625598bf9b6f85db');
  });

  it('loads the module of a Client Component when it is rendered', async () => {
    const Client = clientExports(function Client({label}) {
      return ReactServer.createElement('span', null, label);
    });
    function App() {
      return ReactServer.createElement(
        'div',
        null,
        ReactServer.createElement(Client, {label: 'hi'}),
      );
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    const div = await readFromResult(result);
    // The type is a lazy over the module, like on the wire.
    expect(div.props.children.type.$$typeof).toBe(Symbol.for('react.lazy'));
    const response = readFromResult(result);
    function Root() {
      return use(response);
    }
    expect(await readHTML(React.createElement(Root))).toBe(
      '<div><span>hi</span></div>',
    );
  });

  it('waits for a module that loads asynchronously', async () => {
    let resolveChunk;
    const chunkPromise = new Promise(resolve => {
      resolveChunk = resolve;
    });
    const Client = clientExports(
      function Client({label}) {
        return ReactServer.createElement('span', null, label);
      },
      '42',
      '/chunk.js',
      chunkPromise,
    );
    const config = clientExports({theme: 'dark'});
    function App() {
      // One reference as an element type, one as a value.
      return ReactServer.createElement(
        'div',
        {'data-theme': config.theme},
        ReactServer.createElement(Client, {label: 'hi'}),
      );
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    const response = readFromResult(result);
    let html = '';
    const output = new Stream.Writable({
      write(chunk, encoding, next) {
        html += chunk.toString('utf8');
        next();
      },
    });
    function Root() {
      return use(response);
    }
    await serverAct(() => {
      const {pipe} = ReactDOMServer.renderToPipeableStream(
        React.createElement(
          'section',
          null,
          React.createElement(
            React.Suspense,
            {fallback: 'loading'},
            React.createElement(Root),
          ),
        ),
        {
          onShellReady() {
            pipe(output);
          },
        },
      );
    });
    expect(html).toContain('loading');
    expect(html).not.toContain('<span>hi</span>');
    await serverAct(() => resolveChunk());
    expect(html).toContain('<span>hi</span>');
  });

  it('fails an element whose module failed to load with the module error', async () => {
    const errors = [];
    const Broken = clientModuleError(new Error('module init error'));
    function App() {
      return ReactServer.createElement('div', {broken: Broken});
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
      {
        onError(error) {
          errors.push(error);
          return 'digest';
        },
      },
    );
    let caught;
    try {
      await readFromResult(result);
    } catch (error) {
      caught = error;
    }
    // The module error is this consumer's own and keeps its message in
    // production; the server's onError never sees it.
    expect(caught.message).toBe('module init error');
    expect(errors).toEqual([]);
  });

  // The shape of a tree with lazies resolved, for comparing the in-process
  // read against the wire.
  async function shapeOf(node) {
    if (node === null || typeof node !== 'object') {
      return node;
    }
    if (node.$$typeof === Symbol.for('react.lazy')) {
      await node._payload;
      return shapeOf(node._init(node._payload));
    }
    if (Array.isArray(node)) {
      return Promise.all(node.map(shapeOf));
    }
    if (node.$$typeof === Symbol.for('react.transitional.element')) {
      return {
        type: typeof node.type === 'string' ? node.type : 'component',
        key: node.key,
        children: await shapeOf(node.props.children),
      };
    }
    return node;
  }

  it('prefixes the keys of Server Components like the serializer', async () => {
    function Item({children}) {
      return ReactServer.createElement('li', null, children);
    }
    function Pair() {
      return [
        ReactServer.createElement('span', {key: 'a'}),
        ReactServer.createElement('span', {key: 'b'}),
      ];
    }
    async function Later() {
      await 1;
      return ReactServer.createElement('b', {key: 'inner'});
    }
    function App() {
      return ReactServer.createElement(
        'ul',
        null,
        // A keyed Server Component prefixes the key of what it renders.
        ReactServer.createElement(Item, {key: 'x'}, 'one'),
        // A keyed one rendering an array wraps it in a keyed fragment.
        ReactServer.createElement(Pair, {key: 'p'}),
        // A keyless one in a slot of its own gives its output an implicit
        // slot, so a keyed element it renders is wrapped in an array.
        ReactServer.createElement(
          'div',
          null,
          ReactServer.createElement(Later, null),
        ),
        // A keyless fragment is dropped, and gives an implicit slot too.
        ReactServer.createElement(
          ReactServer.Fragment,
          null,
          ReactServer.createElement(Item, {key: 'f'}, 'three'),
        ),
      );
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    let inProcess;
    let fromStream;
    await serverAct(() => {
      inProcess = readFromResult(result);
      fromStream = readFromStream(result);
    });
    const expected = await shapeOf(await fromStream);
    expect(await shapeOf(await inProcess)).toEqual(expected);
    expect(expected).toEqual({
      type: 'ul',
      key: null,
      children: [
        {type: 'li', key: 'x', children: 'one'},
        {
          type: 'component',
          key: 'p',
          children: [
            {type: 'span', key: 'a', children: undefined},
            {type: 'span', key: 'b', children: undefined},
          ],
        },
        {
          type: 'div',
          key: null,
          children: [{type: 'b', key: 'inner', children: undefined}],
        },
        [{type: 'li', key: 'f', children: 'three'}],
      ],
    });
  });

  it('settles the root with the output of a pending root Server Component', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });
    async function Inner() {
      return ReactServer.createElement('b', null, await data);
    }
    async function App() {
      await 1;
      // The root row waits for the whole chain at its top, like the wire.
      return ReactServer.createElement(Inner, null);
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    const response = readFromResult(result);
    let settled = null;
    response.then(value => {
      settled = value;
    });
    await serverAct(() => {});
    expect(settled).toBe(null);
    await serverAct(() => resolveData('hi'));
    expect(settled.type).toBe('b');
    expect(settled.props.children).toBe('hi');
    expect(await shapeOf(await readFromStream(result))).toEqual(
      await shapeOf(settled),
    );
  });

  it('hands plain data to the renderer by identity', async () => {
    const Show = clientExports(function Show() {
      return null;
    });
    const data = {items: [1, 2, {deep: new Map([['k', new Date(0)]])}]};
    function Keyed() {
      return ReactServer.createElement(Show, {value: data});
    }
    async function Async() {
      await 1;
      return ReactServer.createElement(Show, {value: data});
    }
    const model = {
      data,
      direct: ReactServer.createElement(Show, {value: data}),
      keyed: ReactServer.createElement(Keyed, {key: 'k'}),
      async: ReactServer.createElement(Async, null),
    };
    const result = ReactServerDOMServer.renderToResult(model);
    const root = await readFromResult(result);
    expect(root.data).toBe(data);
    expect(root.direct.props.value).toBe(data);
    // The wire would copy this one under the keyed Server Component. Here
    // there's nothing to copy, so the same object is shared.
    expect(root.keyed.props.value).toBe(data);
    expect(root.keyed.key).toBe('k');
    await serverAct(() => root.async._payload);
    expect(root.async._init(root.async._payload).props.value).toBe(data);
  });

  it('reads cyclic and shared data the way the wire does', async () => {
    const Box = clientExports(function Box() {
      return null;
    });
    const plain = {name: 'plain', list: []};
    plain.list.push(plain);
    plain.self = plain;
    const map = new Map();
    map.set('me', map);
    // Holds an element, so this consumer gets a copy. The cycle and the
    // other reference to it must point at that copy, not the server object.
    const copied = {icon: ReactServer.createElement(Box, null)};
    copied.ring = [copied, new Set([copied])];
    const model = {
      plain,
      map,
      copied,
      element: ReactServer.createElement(Box, {value: copied}),
    };
    const result = ReactServerDOMServer.renderToResult(model);
    const root = await readFromResult(result);
    expect(root.plain.name).toBe('plain');
    expect(root.plain.self).toBe(root.plain);
    expect(root.plain.list[0]).toBe(root.plain);
    expect(root.map.get('me')).toBe(root.map);
    expect(root.copied).not.toBe(copied);
    expect(root.copied.icon.type.$$typeof).toBe(Symbol.for('react.lazy'));
    expect(root.copied.ring[0]).toBe(root.copied);
    expect(Array.from(root.copied.ring[1])[0]).toBe(root.copied);
    expect(root.element.props.value).toBe(root.copied);
  });

  it('reads an object again from the start after waiting on a module inside it', async () => {
    let loadChunk;
    const chunk = new Promise(resolve => {
      loadChunk = resolve;
    });
    const Box = clientExports(function Box() {
      return null;
    });
    function Slow() {
      return 'slow';
    }
    const SlowReference = clientExports(Slow, 'slow-chunk', 'slow.js', chunk);
    // The element before the reference changes for this consumer, so the
    // object is being copied when the reference waits for its module, and
    // the copy refers back to the object.
    const model = {
      tree: ReactServer.createElement(Box, null, 'x'),
      G: [SlowReference, null],
      last: 'b',
    };
    model.G.push(model);
    const result = ReactServerDOMServer.renderToResult(model);
    const rootPromise = readFromResult(result);
    await serverAct(() => loadChunk());
    const root = await rootPromise;
    expect(root.G[0]).toBe(Slow);
    expect(root.G[1]).toBe(null);
    expect(root.G[2]).toBe(root);
    expect(root.last).toBe('b');
  });

  it('reports an error once across the consumers of a Result', async () => {
    const errors = [];
    const rejected = Promise.reject(new Error('rejected'));
    rejected.catch(() => {});
    function Throws() {
      throw new Error('thrown');
    }
    const model = {
      thrown: ReactServer.createElement(Throws, null),
      rejected,
      invalid: ReactServer.createElement('div', {data: {handler() {}}}),
    };
    const result = ReactServerDOMServer.renderToResult(model, {
      onError(error) {
        errors.push(error.message);
        return 'digest(' + error.message + ')';
      },
    });
    let inProcess;
    let fromStream;
    await serverAct(() => {
      inProcess = readFromResult(result);
      fromStream = readFromStream(result);
    });
    const root = await inProcess;
    const streamed = await fromStream;
    const invalid =
      'Functions cannot be passed directly to Client Components unless you ' +
      'explicitly expose it by marking it with "use server". Or maybe you ' +
      'meant to call this function rather than return it.\n' +
      '  {handler: function handler}\n' +
      '            ^^^^^^^^^^^^^^^^';
    // A thrown error and a rejection are one error object that both
    // consumers meet, so the first one to report it sets the digest. An
    // invalid value is found by each consumer on its own, so each reports
    // it.
    expect(errors.sort()).toEqual([invalid, invalid, 'rejected', 'thrown']);
    // Both consumers see the same digests.
    function digestOf(lazy) {
      try {
        lazy._init(lazy._payload);
      } catch (error) {
        return error.digest;
      }
      throw new Error('Expected the lazy to throw.');
    }
    expect(digestOf(root.thrown)).toBe('digest(thrown)');
    expect(digestOf(streamed.thrown)).toBe('digest(thrown)');
    await expect(root.rejected).rejects.toMatchObject({
      digest: 'digest(rejected)',
    });
    await expect(streamed.rejected).rejects.toMatchObject({
      digest: 'digest(rejected)',
    });
  });

  // @gate __DEV__
  it('carries the cause and errors of an error in development', async () => {
    const cause = {detail: 'why'};
    function Throws() {
      throw new AggregateError(
        [new TypeError('first'), new Error('second')],
        'aggregate',
        {cause},
      );
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(Throws, null),
      {
        onError() {
          return 'digest';
        },
      },
    );
    let caught;
    try {
      await readFromResult(result);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AggregateError);
    expect(caught.message).toBe('aggregate');
    expect(caught.environmentName).toBe('Server');
    expect(caught.cause).toEqual({detail: 'why'});
    expect(caught.errors.map(error => error.name)).toEqual([
      'TypeError',
      'Error',
    ]);
  });

  // @gate enableTaint
  it('rejects a Blob of a tainted binary value like the wire', async () => {
    const currentUser = {
      token: new Uint32Array([0x3e971ecc, 0x1485fe78, 0x625598bf, 0x9b6f85de]),
    };
    ReactServer.experimental_taintUniqueValue(
      'Cannot pass a secret token to the client',
      currentUser,
      currentUser.token,
    );
    const blob = new Blob([currentUser.token], {
      type: 'application/octet-stream',
    });
    const errors = await readErrors(ReactServer.createElement('div', {blob}));
    expect(errors).toEqual(['Cannot pass a secret token to the client']);
  });

  it('hands a Blob to the renderer by identity', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], {type: 'text/plain'});
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement('div', {blob}),
    );
    const element = await readFromResult(result);
    expect(element.props.blob).toBe(blob);
  });

  it('aborting a Result errors what every consumer still waits for', async () => {
    const errors = [];
    const never = new Promise(() => {});
    let cacheSignal;
    function Done() {
      cacheSignal = ReactServer.cacheSignal();
      return 'done';
    }
    async function Pending() {
      await never;
      return 'never';
    }
    const controller = new AbortController();
    const result = ReactServerDOMServer.renderToResult(
      {
        done: ReactServer.createElement(Done, null),
        pending: ReactServer.createElement(Pending, null),
        promise: never,
      },
      {
        onError(error) {
          errors.push(error.message);
          return 'digest(' + error.message + ')';
        },
        signal: controller.signal,
      },
    );
    // The stream subscribes to the abort first. Aborting it detaches it
    // while the listeners run, which must not skip the next one.
    let fromStream;
    await serverAct(() => {
      fromStream = readFromStream(result);
    });
    const root = await readFromResult(result);
    expect(root.done).toBe('done');
    expect(root.promise.status).toBe('pending');
    expect(cacheSignal.aborted).toBe(false);

    await serverAct(() => controller.abort(new Error('gone')));

    expect(cacheSignal.aborted).toBe(true);
    // Reported once, and both consumers see it with the same digest on what
    // was still pending, while what had finished stays readable.
    expect(errors).toEqual(['gone']);
    expect(root.promise.status).toBe('rejected');
    expect(root.promise.reason.digest).toBe('digest(gone)');
    function digestOf(lazy) {
      try {
        lazy._init(lazy._payload);
      } catch (error) {
        return error.digest;
      }
      throw new Error('Expected the lazy to throw.');
    }
    expect(digestOf(root.pending)).toBe('digest(gone)');
    const streamed = await fromStream;
    expect(streamed.done).toBe('done');
    expect(digestOf(streamed.pending)).toBe('digest(gone)');
    // A Server Component first reached after the abort errors the same way.
    await expect(
      readFromResult(
        ReactServerDOMServer.renderToResult(
          ReactServer.createElement(Pending, {key: 'late'}),
        ),
      ),
    ).resolves.toBeDefined();
  });

  it('releases the cache signal once the last consumer is done', async () => {
    let cacheSignal;
    function App() {
      cacheSignal = ReactServer.cacheSignal();
      return 'hi';
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App, null),
    );
    const controller = new AbortController();
    const inProcess = readFromResult(result, {signal: controller.signal});
    let fromStream;
    await serverAct(() => {
      fromStream = readFromStream(result);
    });
    expect(await inProcess).toBe('hi');
    expect(await fromStream).toBe('hi');
    // The stream is done, but the renderer may still be reading.
    expect(cacheSignal.aborted).toBe(false);
    controller.abort();
    expect(cacheSignal.aborted).toBe(true);
  });

  it('keeps reading a stream for a consumer that starts after the last one finished', async () => {
    let enqueue;
    let close;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('a');
        enqueue = chunk => controller.enqueue(chunk);
        close = () => controller.close();
      },
    });
    let cacheSignal;
    function App() {
      cacheSignal = ReactServer.cacheSignal();
      return {stream};
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App, null),
    );
    const controller = new AbortController();
    const inProcess = await readFromResult(result, {signal: controller.signal});
    const reader = inProcess.stream.getReader();
    expect(await reader.read()).toEqual({done: false, value: 'a'});
    // The HTML is done before the stream is, and the hydration stream starts
    // after that.
    controller.abort();
    expect(cacheSignal.aborted).toBe(true);
    let fromStream;
    await serverAct(() => {
      fromStream = readFromStream(result);
    });
    await serverAct(() => {
      enqueue('b');
      close();
    });
    expect(await readStream((await fromStream).stream)).toEqual(['a', 'b']);
  });

  // @gate enableTaint
  it('keeps a tainted value tainted until the consumer is done', async () => {
    function getUser() {
      const user = {token: '3e971ecc1485fe78625598bf9b6f85db'};
      ReactServer.experimental_taintUniqueValue(
        'Cannot pass a secret token to the client',
        user,
        user.token,
      );
      return user;
    }
    function App() {
      const derivedValue = {...getUser()};
      // A garbage collection can happen at any time, even before this
      // consumer is done. This would clean up the user object.
      gc();
      return ReactServer.createElement('div', {user: derivedValue});
    }
    let errors = [];
    const controller = new AbortController();
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
      {
        onError(error) {
          errors.push(error.message);
        },
      },
    );
    await expect(
      readFromResult(result, {signal: controller.signal}),
    ).rejects.toThrow();
    expect(errors).toEqual(['Cannot pass a secret token to the client']);

    // Once the consumer is done, the token can be read again.
    controller.abort();
    errors = [];
    const again = ReactServerDOMServer.renderToResult(
      ReactServer.createElement('div', {
        user: {token: '3e971ecc1485fe78625598bf9b6f85db'},
      }),
      {
        onError(error) {
          errors.push(error.message);
        },
      },
    );
    await readFromResult(again);
    expect(errors).toEqual([]);
  });

  // Renders HTML the way a framework does: the reader is created from inside
  // a component during the Fizz render.
  async function readHTMLFromWithinFizz(getResponse) {
    let response = null;
    function Root() {
      if (response === null) {
        response = getResponse();
      }
      return use(response);
    }
    return readHTML(React.createElement(Root));
  }

  it('dispatches hints into the renderer consuming the Result', async () => {
    let resolveLater;
    const later = new Promise(resolve => {
      resolveLater = resolve;
    });
    async function Page() {
      FlightReactDOM.preload('/before.css', {as: 'style'});
      await later;
      FlightReactDOM.preload('/after.css', {as: 'style'});
      return ReactServer.createElement('p', null, 'hi');
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(Page, null),
    );
    const htmlPromise = readHTMLFromWithinFizz(() => readFromResult(result));
    await serverAct(() => resolveLater());
    const html = await htmlPromise;
    expect(html).toContain('<link rel="preload" href="/before.css" as="style"');
    expect(html).toContain('<link rel="preload" href="/after.css" as="style"');
    expect(html).toContain('<p>hi</p>');
  });

  it('preloads the chunks of a Client Component resolved through an SSR module map', async () => {
    function ClientComponent() {
      return React.createElement('span', null, 'Client Component');
    }
    // The client build has its own module id and chunk for the component.
    const ClientComponentOnTheClient = clientExports(
      ClientComponent,
      123,
      'path/to/chunk.js',
    );
    const ClientComponentOnTheServer = clientExports(ClientComponent);
    // The SSR bundle does not have the client module; it maps the client
    // metadata to its own.
    const clientId = webpackMap[ClientComponentOnTheClient.$$id].id;
    delete webpackModules[clientId];
    const translationMap = {
      [clientId]: {
        '*': webpackMap[ClientComponentOnTheServer.$$id],
      },
    };
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(ClientComponentOnTheClient, null),
    );
    const html = await readHTMLFromWithinFizz(() =>
      ReactServerDOMClient.createFromResult(result, {
        clientManifest: webpackMap,
        serverConsumerManifest: {
          moduleMap: translationMap,
          moduleLoading: webpackModuleLoading,
          serverModuleMap: null,
        },
      }),
    );
    expect(html).toBe(
      '<script src="/path/to/chunk.js" async=""></script><span>Client Component</span>',
    );
  });

  it('aborting a prerender of a Result halts its stream and nothing else', async () => {
    let resolveGreeting;
    const greeting = new Promise(resolve => {
      resolveGreeting = resolve;
    });
    async function Greeting() {
      return ReactServer.createElement('p', null, await greeting);
    }
    const errors = [];
    const controller = new AbortController();
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(Greeting, null),
      {
        onError(error) {
          errors.push(error.message);
        },
      },
    );
    const inProcess = readFromResult(result);
    const {pending} = await serverAct(() => ({
      pending: ReactServerDOMStaticServer.prerenderToNodeStream(
        result,
        webpackMap,
        {signal: controller.signal},
      ),
    }));
    await serverAct(() => controller.abort('boom'));
    const {prelude} = await pending;
    expect(errors).toEqual([]);

    // The prelude leaves the pending component unresolved; the Result and
    // the reader go on and get it when it settles.
    const streamed = ReactServerDOMClient.createFromNodeStream(prelude, {
      moduleMap: null,
      moduleLoading: null,
    });
    await serverAct(() => resolveGreeting('hello'));
    expect((await inProcess).props.children).toBe('hello');
    await expect(streamed).rejects.toThrow('Connection closed.');
  });

  it('serializes a Result to a stream started after the last consumer finished', async () => {
    let cacheSignal;
    function App() {
      cacheSignal = ReactServer.cacheSignal();
      return 'hi';
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App, null),
    );
    let first;
    await serverAct(() => {
      first = readFromStream(result);
    });
    expect(await first).toBe('hi');
    // The only consumer is done, so the cache signal has ended. A framework
    // starts the hydration stream after the HTML is done.
    expect(cacheSignal.aborted).toBe(true);
    let second;
    await serverAct(() => {
      second = readFromStream(result);
    });
    expect(await second).toBe('hi');
  });

  it('serializes the same Result to more than one stream', async () => {
    let renders = 0;
    async function Greeting({name}) {
      renders++;
      await 1;
      return ReactServer.createElement('p', null, 'Hello, ' + name);
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(Greeting, {name: 'Seb'}),
    );
    let first;
    let second;
    await serverAct(() => {
      first = readFromStream(result);
      second = readFromStream(result);
    });
    expect((await first).props.children).toBe('Hello, Seb');
    expect((await second).props.children).toBe('Hello, Seb');
    expect(renders).toBe(1);
  });

  it('serializes an iterator, a stream and an async iterable to every stream', async () => {
    function* numbers() {
      yield 1;
      yield 2;
    }
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('a');
        controller.enqueue('b');
        controller.close();
      },
    });
    async function* letters() {
      yield 'x';
      yield 'y';
    }
    function App() {
      return {numbers: numbers(), stream, letters: letters()};
    }
    const result = ReactServerDOMServer.renderToResult(
      ReactServer.createElement(App),
    );
    let first;
    let second;
    await serverAct(() => {
      first = readFromStream(result);
      second = readFromStream(result);
    });
    const responses = [await first, await second];
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      expect(Array.from(response.numbers)).toEqual([1, 2]);
      expect(await readStream(response.stream)).toEqual(['a', 'b']);
      expect(await readAll(response.letters)).toEqual(['x', 'y']);
    }
  });
});
