/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

// These Noop/Edge timing cases exclude Node's async I/O tracing.
jest.mock('async_hooks', () => ({
  ...jest.requireActual('async_hooks'),
  createHook() {
    return {
      enable() {
        return this;
      },
      disable() {
        return this;
      },
    };
  },
}));

let React;
let ReactServer;
let ReactNoop;
let ReactDOMFizzServer;
let ReactServerDOMServer;
let ReactServerDOMClient;
let act;
let serverAct;
let getDebugInfo;
let Stream;

describe('ReactFlightResult component history', () => {
  beforeEach(() => {
    let time = 10;
    jest.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(time);
    jest.spyOn(performance, 'now').mockImplementation(() => time++);
    jest.resetModules();
    patchSetImmediate();
    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactServerDOMServer = require('react-server-dom-webpack/server.node');
    serverAct = require('internal-test-utils').serverAct;
    jest.resetModules();
    __unmockReact();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    ReactDOMFizzServer = require('react-dom/server.node');
    ReactServerDOMClient = require('react-server-dom-webpack/client.node');
    act = require('internal-test-utils').act;
    getDebugInfo = require('internal-test-utils').getDebugInfo.bind(null, {
      useV8Stack: true,
      ignoreRscStreamInfo: true,
    });
    Stream = require('stream');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createResponse(result) {
    return ReactServerDOMClient.createFromResult(result, {
      clientManifest: {},
      serverConsumerManifest: {
        moduleMap: null,
        moduleLoading: null,
        serverModuleMap: null,
      },
    });
  }

  function createWireResponse(result) {
    const stream = new Stream.PassThrough();
    ReactServerDOMServer.renderResultToPipeableStream(result, {}).pipe(stream);
    return ReactServerDOMClient.createFromNodeStream(stream, {
      moduleMap: null,
      moduleLoading: null,
      serverModuleMap: null,
    });
  }

  function renderFizzToReadableStream(model) {
    const stream = new Stream.PassThrough();
    ReactDOMFizzServer.renderToPipeableStream(model).pipe(stream);
    return stream;
  }

  function readResult(stream) {
    return new Promise((resolve, reject) => {
      let content = '';
      stream.on('data', chunk => {
        content += chunk.toString('utf8');
      });
      stream.on('end', () => resolve(content));
      stream.on('error', reject);
    });
  }

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('can render a shared forwardRef Component', async () => {
    const Greeting = React.forwardRef(function Greeting(
      {firstName, lastName},
      ref,
    ) {
      return (
        <span ref={ref}>
          Hello, {firstName} {lastName}
        </span>
      );
    });

    const root = <Greeting firstName="Seb" lastName="Smith" />;

    const transport = await serverAct(() =>
      ReactServerDOMServer.renderToResult(root),
    );

    await act(async () => {
      const result = await createResponse(transport);
      expect(getDebugInfo(result)).toEqual(
        __DEV__
          ? [
              {time: 12},
              {
                name: 'Greeting',
                env: 'Server',
                key: null,
                stack: '    in Object.<anonymous> (at **)',
                props: {
                  firstName: 'Seb',
                  lastName: 'Smith',
                },
              },
              {time: 13},
            ]
          : undefined,
      );
      ReactNoop.render(result);
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>Hello, Seb Smith</span>);
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('uses the server component debug info as the element owner in DEV', async () => {
    function Container({children}) {
      return children;
    }

    function Greeting({firstName}) {
      // We can't use JSX here because it'll use the Client React.
      return ReactServer.createElement(
        Container,
        null,
        ReactServer.createElement('span', null, 'Hello, ', firstName),
      );
    }

    const model = {
      greeting: ReactServer.createElement(Greeting, {firstName: 'Seb'}),
    };

    const transport = await serverAct(() =>
      ReactServerDOMServer.renderToResult(model),
    );

    await act(async () => {
      const rootModel = await createResponse(transport);
      const greeting = rootModel.greeting;
      // We've rendered down to the span.
      expect(greeting.type).toBe('span');
      if (__DEV__) {
        const greetInfo = {
          name: 'Greeting',
          env: 'Server',
          key: null,
          stack: '    in Object.<anonymous> (at **)',
          props: {
            firstName: 'Seb',
          },
        };
        expect(getDebugInfo(greeting)).toEqual([
          {time: 12},
          greetInfo,
          {time: 13},
          {
            name: 'Container',
            env: 'Server',
            key: null,
            owner: greetInfo,
            stack: '    in Greeting (at **)',
            props: {
              children: expect.objectContaining({
                type: 'span',
                props: {
                  children: ['Hello, ', 'Seb'],
                },
              }),
            },
          },
          {time: 14},
        ]);
        // The owner that created the span was the outer server component.
        // We expect the debug info to be referentially equal to the owner.
        expect(greeting._owner).toBe(greeting._debugInfo[1]);
      } else {
        expect(greeting._debugInfo).toBe(undefined);
        expect(greeting._owner).toBe(undefined);
      }
      ReactNoop.render(greeting);
    });

    expect(ReactNoop).toMatchRenderedOutput(<span>Hello, Seb</span>);
  });

  // @gate !__DEV__ || enableComponentPerformanceTrack
  it('supports async server component debug info as the element owner in DEV', async () => {
    function Container({children}) {
      return children;
    }

    const promise = Promise.resolve(true);
    async function Greeting({firstName}) {
      // We can't use JSX here because it'll use the Client React.
      const child = ReactServer.createElement(
        'span',
        null,
        'Hello, ' + firstName,
      );
      // Yield the synchronous pass
      await promise;
      // We should still be able to track owner using AsyncLocalStorage.
      return ReactServer.createElement(Container, null, child);
    }

    const model = {
      greeting: ReactServer.createElement(Greeting, {firstName: 'Seb'}),
    };

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToResult(model),
    );

    const rootModel = await serverAct(() => createResponse(stream));

    const ssrStream = await serverAct(() =>
      renderFizzToReadableStream(rootModel.greeting),
    );
    const result = await readResult(ssrStream);
    expect(result).toEqual('<span>Hello, Seb</span>');

    // Resolve the React Lazy wrapper which must have resolved by now.
    const lazyWrapper = rootModel.greeting;
    const greeting = lazyWrapper._init(lazyWrapper._payload);

    // We've rendered down to the span.
    expect(greeting.type).toBe('span');
    if (__DEV__) {
      const greetInfo = expect.objectContaining({
        name: 'Greeting',
        env: 'Server',
      });
      expect(greeting._debugInfo).toEqual([
        {time: 12},
        greetInfo,
        {time: 13},
        expect.objectContaining({
          name: 'Container',
          env: 'Server',
          owner: greetInfo,
        }),
        {time: 14},
      ]);
      // The owner that created the span was the outer server component.
      // We expect the debug info to be referentially equal to the owner.
      expect(greeting._owner).toBe(greeting._debugInfo[1]);
    } else {
      expect(lazyWrapper._debugInfo).toBe(undefined);
      expect(greeting._owner).toBe(undefined);
    }
  });

  // @gate __DEV__ && enableComponentPerformanceTrack
  it('can render deep but cut off Map/Set in debug info', async () => {
    function createDeepMap(n) {
      if (n <= 0) {
        return null;
      }
      const map = new Map();
      map.set('key', createDeepMap(n - 1));
      return map;
    }

    function createDeepSet(n) {
      if (n <= 0) {
        return null;
      }
      const set = new Set();
      set.add(createDeepSet(n - 1));
      return set;
    }

    function ServerComponent(props) {
      return <div>not using props</div>;
    }

    const transport = await serverAct(() =>
      ReactServerDOMServer.renderToResult({
        set: (
          <ServerComponent
            set={createDeepSet(100) /* deper than objectLimit */}
          />
        ),
        map: (
          <ServerComponent
            map={createDeepMap(100) /* deper than objectLimit */}
          />
        ),
      }),
    );

    await act(async () => {
      const rootModel = await createWireResponse(transport);
      const set = rootModel.set._debugInfo[1].props.set;
      const map = rootModel.map._debugInfo[1].props.map;
      expect(set instanceof Set).toBe(true);
      expect(set.size).toBe(1);
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const entry of set) {
        expect(entry instanceof Set).toBe(true);
        break;
      }

      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(1);
      expect(map.get('key') instanceof Map).toBe(true);

      ReactNoop.render(rootModel.set);
    });

    expect(ReactNoop).toMatchRenderedOutput(<div>not using props</div>);
  });
});
