/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.WritableStream =
  require('web-streams-polyfill/ponyfill/es6').WritableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

const {
  patchMessageChannel,
} = require('../../../../scripts/jest/patchMessageChannel');

let clientExports;
let serverExports;
let webpackMap;
let webpackServerMap;
let act;
let serverAct;
let getDebugInfo;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMFizzServer;
let ReactServerDOMServer;
let ReactServerDOMStaticServer;
let ReactServerDOMClient;
let Suspense;
let use;
let ReactServer;
let ReactServerDOM;
let ReactServerScheduler;
let assertConsoleErrorDev;

describe('ReactFlightDOMBrowser', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactServerScheduler = require('scheduler');
    patchMessageChannel(ReactServerScheduler);
    serverAct = require('internal-test-utils').serverAct;
    getDebugInfo = require('internal-test-utils').getDebugInfo.bind(null, {
      ignoreProps: true,
      useFixedTime: true,
    });

    // Simulate the condition resolution

    jest.mock('react', () => require('react/react.react-server'));
    ReactServer = require('react');
    ReactServerDOM = require('react-dom');

    jest.mock('react-server-dom-webpack/server', () =>
      require('react-server-dom-webpack/server.browser'),
    );
    const WebpackMock = require('./utils/WebpackMock');
    clientExports = WebpackMock.clientExports;
    serverExports = WebpackMock.serverExports;
    webpackMap = WebpackMock.webpackMap;
    webpackServerMap = WebpackMock.webpackServerMap;
    ReactServerDOMServer = require('react-server-dom-webpack/server');
    jest.mock('react-server-dom-webpack/static', () =>
      require('react-server-dom-webpack/static.browser'),
    );
    ReactServerDOMStaticServer = require('react-server-dom-webpack/static');

    __unmockReact();
    jest.resetModules();

    patchMessageChannel();

    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server.browser');
    ReactServerDOMClient = require('react-server-dom-webpack/client');
    Suspense = React.Suspense;
    use = React.use;
  });

  function makeDelayedText(Model) {
    let error, _resolve, _reject;
    let promise = new Promise((resolve, reject) => {
      _resolve = () => {
        promise = null;
        resolve();
      };
      _reject = e => {
        error = e;
        promise = null;
        reject(e);
      };
    });
    function DelayedText({children}, data) {
      if (promise) {
        throw promise;
      }
      if (error) {
        throw error;
      }
      return <Model>{children}</Model>;
    }
    return [DelayedText, _resolve, _reject];
  }

  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
  }

  function requireServerRef(ref) {
    let name = '';
    let resolvedModuleData = webpackServerMap[ref];
    if (resolvedModuleData) {
      // The potentially aliased name.
      name = resolvedModuleData.name;
    } else {
      // We didn't find this specific export name but we might have the * export
      // which contains this name as well.
      // TODO: It's unfortunate that we now have to parse this string. We should
      // probably go back to encoding path and name separately on the client reference.
      const idx = ref.lastIndexOf('#');
      if (idx !== -1) {
        name = ref.slice(idx + 1);
        resolvedModuleData = webpackServerMap[ref.slice(0, idx)];
      }
      if (!resolvedModuleData) {
        throw new Error(
          'Could not find the module "' +
            ref +
            '" in the React Client Manifest. ' +
            'This is probably a bug in the React Server Components bundler.',
        );
      }
    }
    const mod = __webpack_require__(resolvedModuleData.id);
    if (name === '*') {
      return mod;
    }
    return mod[name];
  }

  async function callServer(actionId, body) {
    const fn = requireServerRef(actionId);
    const args = await ReactServerDOMServer.decodeReply(body, webpackServerMap);
    return fn.apply(null, args);
  }

  function createDelayedStream(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            controller.close();
          } else {
            // Artificially delay between enqueuing chunks.
            await new Promise(resolve => setTimeout(resolve));
            controller.enqueue(value);
          }
        }
      },
    });
  }

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
        return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
      })
    );
  }

  it('should resolve HTML using W3C streams', async () => {
    function Text({children}) {
      return <span>{children}</span>;
    }
    function HTML() {
      return (
        <div>
          <Text>hello</Text>
          <Text>world</Text>
        </div>
      );
    }

    function App() {
      const model = {
        html: <HTML />,
      };
      return model;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<App />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const model = await response;
    expect(model).toEqual({
      html: (
        <div>
          <span>hello</span>
          <span>world</span>
        </div>
      ),
    });
  });

  it('should resolve client components (with async chunks) when referenced in props', async () => {
    let resolveClientComponentChunk;

    const ClientOuter = clientExports(function ClientOuter({
      Component,
      children,
    }) {
      return <Component>{children}</Component>;
    });

    const ClientInner = clientExports(
      function ClientInner({children}) {
        return <span>{children}</span>;
      },
      '42',
      '/test.js',
      new Promise(resolve => (resolveClientComponentChunk = resolve)),
    );

    function Server() {
      return <ClientOuter Component={ClientInner}>Hello, World!</ClientOuter>;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<span>Hello, World!</span>');
  });

  it('should resolve deduped objects within the same model root when it is blocked', async () => {
    let resolveClientComponentChunk;

    const ClientOuter = clientExports(function ClientOuter({Component, value}) {
      return <Component value={value} />;
    });

    const ClientInner = clientExports(
      function ClientInner({value}) {
        return <pre>{JSON.stringify(value)}</pre>;
      },
      '42',
      '/test.js',
      new Promise(resolve => (resolveClientComponentChunk = resolve)),
    );

    function Server({value}) {
      return <ClientOuter Component={ClientInner} value={value} />;
    }

    const shared = [1, 2, 3];
    const value = [shared, shared];

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <Server value={value} />,
        webpackMap,
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<pre>[[1,2,3],[1,2,3]]</pre>');
  });

  it('should resolve deduped objects within the same model root when it is blocked and there is a listener attached to the root', async () => {
    let resolveClientComponentChunk;

    const ClientOuter = clientExports(function ClientOuter({Component, value}) {
      return <Component value={value} />;
    });

    const ClientInner = clientExports(
      function ClientInner({value}) {
        return <pre>{JSON.stringify(value)}</pre>;
      },
      '42',
      '/test.js',
      new Promise(resolve => (resolveClientComponentChunk = resolve)),
    );

    function Server({value}) {
      return <ClientOuter Component={ClientInner} value={value} />;
    }

    const shared = [1, 2, 3];
    const value = [shared, shared];

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <Server value={value} />,
        webpackMap,
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    // make sure we have a listener so that `resolveModelChunk` initializes the chunk eagerly
    response.then(() => {});

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<pre>[[1,2,3],[1,2,3]]</pre>');
  });

  it('should resolve deduped objects that are themselves blocked', async () => {
    let resolveClientComponentChunk;

    const Client = clientExports(
      [4, 5],
      '42',
      '/test.js',
      new Promise(resolve => (resolveClientComponentChunk = resolve)),
    );

    const shared = [1, 2, 3, Client];

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <div>
          <Suspense fallback="Loading">
            <span>
              {shared /* this will serialize first and block nearest element */}
            </span>
          </Suspense>
          {shared /* this will be referenced inside the blocked element */}
        </div>,
        webpackMap,
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<div><span>12345</span>12345</div>');
  });

  it('should resolve deduped objects in nested children of blocked models', async () => {
    let resolveOuterClientComponentChunk;
    let resolveInnerClientComponentChunk;

    const ClientOuter = clientExports(
      function ClientOuter({children, value}) {
        return children;
      },
      '1',
      '/outer.js',
      new Promise(resolve => (resolveOuterClientComponentChunk = resolve)),
    );

    function PassthroughServerComponent({children}) {
      return children;
    }

    const ClientInner = clientExports(
      function ClientInner({children}) {
        return JSON.stringify(children);
      },
      '2',
      '/inner.js',
      new Promise(resolve => (resolveInnerClientComponentChunk = resolve)),
    );

    const value = {};

    function Server() {
      return (
        <ClientOuter value={value}>
          <PassthroughServerComponent>
            <ClientInner>{value}</ClientInner>
          </PassthroughServerComponent>
        </ClientOuter>
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveInnerClientComponentChunk();
      resolveOuterClientComponentChunk();
    });

    expect(container.innerHTML).toBe('{}');
  });

  it('should resolve deduped objects in blocked models referencing other blocked models with blocked references', async () => {
    let resolveFooClientComponentChunk;
    let resolveBarClientComponentChunk;

    function PassthroughServerComponent({children}) {
      return children;
    }

    const FooClient = clientExports(
      function FooClient({children}) {
        return JSON.stringify(children);
      },
      '1',
      '/foo.js',
      new Promise(resolve => (resolveFooClientComponentChunk = resolve)),
    );

    const BarClient = clientExports(
      function BarClient() {
        return 'not used';
      },
      '2',
      '/bar.js',
      new Promise(resolve => (resolveBarClientComponentChunk = resolve)),
    );

    const shared = {foo: 1};

    function Server() {
      return (
        <>
          <PassthroughServerComponent>
            <FooClient key="first" bar={BarClient}>
              {shared}
            </FooClient>
          </PassthroughServerComponent>
          <FooClient key="second" bar={BarClient}>
            {shared}
          </FooClient>
        </>
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveFooClientComponentChunk();
      resolveBarClientComponentChunk();
    });

    expect(container.innerHTML).toBe('{"foo":1}{"foo":1}');
  });

  it('should handle deduped props of re-used elements in fragments (same-chunk reference)', async () => {
    let resolveFooClientComponentChunk;

    const FooClient = clientExports(
      function Foo({children, item}) {
        return children;
      },
      '1',
      '/foo.js',
      new Promise(resolve => (resolveFooClientComponentChunk = resolve)),
    );

    const shared = <div />;

    function Server() {
      return (
        <FooClient track={shared}>
          <>{shared}</>
        </FooClient>
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveFooClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<div></div>');
  });

  it('should handle deduped props of re-used elements in server components (cross-chunk reference)', async () => {
    let resolveFooClientComponentChunk;

    function PassthroughServerComponent({children}) {
      return children;
    }

    const FooClient = clientExports(
      function Foo({children, item}) {
        return children;
      },
      '1',
      '/foo.js',
      new Promise(resolve => (resolveFooClientComponentChunk = resolve)),
    );

    const shared = <div />;

    function Server() {
      return (
        <FooClient track={shared}>
          <PassthroughServerComponent>{shared}</PassthroughServerComponent>
        </FooClient>
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveFooClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<div></div>');
  });

  it('should handle references to deduped owner objects', async () => {
    // This is replicating React components as generated by @svgr/webpack:
    let path1a: React.ReactNode;
    let path1b: React.ReactNode;
    let path2: React.ReactNode;

    function Svg1() {
      return ReactServer.createElement(
        'svg',
        {id: '1'},
        path1a || (path1a = ReactServer.createElement('path', {})),
        path1b || (path1b = ReactServer.createElement('path', {})),
      );
    }

    function Svg2() {
      return ReactServer.createElement(
        'svg',
        {id: '2'},
        path2 || (path2 = ReactServer.createElement('path', {})),
      );
    }

    function Server() {
      return ReactServer.createElement(
        ReactServer.Fragment,
        {},
        ReactServer.createElement(Svg1),
        ReactServer.createElement(Svg2),
      );
    }

    let stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    let response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    const expectedHtml =
      '<svg id="1"><path></path><path></path></svg><svg id="2"><path></path></svg>';

    expect(container.innerHTML).toBe(expectedHtml);

    // Render a second time:

    // Assigning the path elements to variables in module scope (here simulated
    // with the test's function scope), and rendering a second time, prevents
    // the owner of the path elements (i.e. Svg1/Svg2) to be deduped. The owner
    // of the path in Svg1 is fully inlined. The owner of the owner of the path
    // in Svg2 is Server, which is deduped and replaced with a reference to the
    // owner of the owner of the path in Svg1. This nested owner is actually
    // Server from the previous render pass, which is kinda broken and libraries
    // probably shouldn't generate code like this. This reference can only be
    // resolved properly if owners are specifically handled when resolving
    // outlined models.

    stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    response = ReactServerDOMClient.createFromReadableStream(stream);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe(expectedHtml);

    if (__DEV__) {
      const resolvedPath1b = response.value[0].props.children[1];

      expect(resolvedPath1b._owner).toEqual(
        expect.objectContaining({
          name: 'Svg1',
          env: 'Server',
          key: null,
          owner: expect.objectContaining({
            name: 'Server',
            env: 'Server',
            key: null,
          }),
        }),
      );

      const resolvedPath2 = response.value[1].props.children;

      expect(resolvedPath2._owner).toEqual(
        expect.objectContaining({
          name: 'Svg2',
          env: 'Server',
          key: null,
          owner: expect.objectContaining({
            name: 'Server',
            env: 'Server',
            key: null,
          }),
        }),
      );
    }
  });

  it('should progressively reveal server components', async () => {
    let reportedErrors = [];

    // Client Components

    class ErrorBoundary extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback(this.state.error);
        }
        return this.props.children;
      }
    }

    let errorBoundaryFn;
    if (__DEV__) {
      errorBoundaryFn = e => (
        <p>
          {e.message} + {e.digest}
        </p>
      );
    } else {
      errorBoundaryFn = e => {
        expect(e.message).toBe(
          'An error occurred in the Server Components render. The specific message is omitted in production' +
            ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
            ' may provide additional details about the nature of the error.',
        );
        return <p>{e.digest}</p>;
      };
    }

    function MyErrorBoundary({children}) {
      return (
        <ErrorBoundary fallback={errorBoundaryFn}>{children}</ErrorBoundary>
      );
    }

    // Model
    function Text({children}) {
      return children;
    }

    const [Friends, resolveFriends] = makeDelayedText(Text);
    const [Name, resolveName] = makeDelayedText(Text);
    const [Posts, resolvePosts] = makeDelayedText(Text);
    const [Photos, resolvePhotos] = makeDelayedText(Text);
    const [Games, , rejectGames] = makeDelayedText(Text);

    // View
    function ProfileDetails({avatar}) {
      return (
        <div>
          <Name>:name:</Name>
          {avatar}
        </div>
      );
    }
    function ProfileSidebar({friends}) {
      return (
        <div>
          <Photos>:photos:</Photos>
          {friends}
        </div>
      );
    }
    function ProfilePosts({posts}) {
      return <div>{posts}</div>;
    }
    function ProfileGames({games}) {
      return <div>{games}</div>;
    }

    const MyErrorBoundaryClient = clientExports(MyErrorBoundary);

    function ProfileContent() {
      return (
        <>
          <ProfileDetails avatar={<Text>:avatar:</Text>} />
          <Suspense fallback={<p>(loading sidebar)</p>}>
            <ProfileSidebar friends={<Friends>:friends:</Friends>} />
          </Suspense>
          <Suspense fallback={<p>(loading posts)</p>}>
            <ProfilePosts posts={<Posts>:posts:</Posts>} />
          </Suspense>
          <MyErrorBoundaryClient>
            <Suspense fallback={<p>(loading games)</p>}>
              <ProfileGames games={<Games>:games:</Games>} />
            </Suspense>
          </MyErrorBoundaryClient>
        </>
      );
    }

    const model = {
      rootContent: <ProfileContent />,
    };

    function ProfilePage({response}) {
      return use(response).rootContent;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, webpackMap, {
        onError(x) {
          reportedErrors.push(x);
          return __DEV__ ? `a dev digest` : `digest("${x.message}")`;
        },
      }),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Suspense fallback={<p>(loading)</p>}>
          <ProfilePage response={response} />
        </Suspense>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // This isn't enough to show anything.
    await serverAct(async () => {
      await act(() => {
        resolveFriends();
      });
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    // We can now show the details. Sidebar and posts are still loading.
    await serverAct(async () => {
      await act(() => {
        resolveName();
      });
    });
    // Advance time enough to trigger a nested fallback.
    jest.advanceTimersByTime(500);
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        '<p>(loading games)</p>',
    );

    expect(reportedErrors).toEqual([]);

    const theError = new Error('Game over');
    // Let's *fail* loading games.
    await serverAct(async () => {
      await act(() => {
        rejectGames(theError);
      });
    });

    const gamesExpectedValue = __DEV__
      ? '<p>Game over + a dev digest</p>'
      : '<p>digest("Game over")</p>';

    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<p>(loading sidebar)</p>' +
        '<p>(loading posts)</p>' +
        gamesExpectedValue,
    );

    expect(reportedErrors).toEqual([theError]);
    reportedErrors = [];

    // We can now show the sidebar.
    await serverAct(async () => {
      await act(() => {
        resolvePhotos();
      });
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<p>(loading posts)</p>' +
        gamesExpectedValue,
    );

    // Show everything.
    await serverAct(async () => {
      await act(() => {
        resolvePosts();
      });
    });
    expect(container.innerHTML).toBe(
      '<div>:name::avatar:</div>' +
        '<div>:photos::friends:</div>' +
        '<div>:posts:</div>' +
        gamesExpectedValue,
    );

    expect(reportedErrors).toEqual([]);
  });

  it('should close the stream upon completion when rendering to W3C streams', async () => {
    // Model
    function Text({children}) {
      return children;
    }

    const [Friends, resolveFriends] = makeDelayedText(Text);
    const [Name, resolveName] = makeDelayedText(Text);
    const [Posts, resolvePosts] = makeDelayedText(Text);
    const [Photos, resolvePhotos] = makeDelayedText(Text);

    // View
    function ProfileDetails({avatar}) {
      return (
        <div>
          <Name>:name:</Name>
          {avatar}
        </div>
      );
    }
    function ProfileSidebar({friends}) {
      return (
        <div>
          <Photos>:photos:</Photos>
          {friends}
        </div>
      );
    }
    function ProfilePosts({posts}) {
      return <div>{posts}</div>;
    }

    function ProfileContent() {
      return (
        <Suspense fallback="(loading everything)">
          <ProfileDetails avatar={<Text>:avatar:</Text>} />
          <Suspense fallback={<p>(loading sidebar)</p>}>
            <ProfileSidebar friends={<Friends>:friends:</Friends>} />
          </Suspense>
          <Suspense fallback={<p>(loading posts)</p>}>
            <ProfilePosts posts={<Posts>:posts:</Posts>} />
          </Suspense>
        </Suspense>
      );
    }

    const model = {
      rootContent: <ProfileContent />,
    };

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(model, webpackMap),
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let flightResponse = '';
    let isDone = false;

    reader.read().then(function progress({done, value}) {
      if (done) {
        isDone = true;
        return;
      }

      flightResponse += decoder.decode(value);

      return reader.read().then(progress);
    });

    // Advance time enough to trigger a nested fallback.
    jest.advanceTimersByTime(500);

    await serverAct(() => {});

    expect(flightResponse).toContain('(loading everything)');
    expect(flightResponse).toContain('(loading sidebar)');
    expect(flightResponse).toContain('(loading posts)');
    if (!__DEV__) {
      expect(flightResponse).not.toContain(':friends:');
      expect(flightResponse).not.toContain(':name:');
    }

    await serverAct(() => {
      resolveFriends();
    });

    expect(flightResponse).toContain(':friends:');

    await serverAct(() => {
      resolveName();
    });

    expect(flightResponse).toContain(':name:');

    await serverAct(() => {
      resolvePhotos();
    });

    expect(flightResponse).toContain(':photos:');

    await serverAct(() => {
      resolvePosts();
    });

    expect(flightResponse).toContain(':posts:');

    // Final pending chunk is written; stream should be closed.
    expect(isDone).toBeTruthy();
  });

  it('should be able to complete after aborting and throw the reason client-side', async () => {
    const reportedErrors = [];

    let errorBoundaryFn;
    if (__DEV__) {
      errorBoundaryFn = e => (
        <p>
          {e.message} + {e.digest}
        </p>
      );
    } else {
      errorBoundaryFn = e => {
        expect(e.message).toBe(
          'An error occurred in the Server Components render. The specific message is omitted in production' +
            ' builds to avoid leaking sensitive details. A digest property is included on this error instance which' +
            ' may provide additional details about the nature of the error.',
        );
        return <p>{e.digest}</p>;
      };
    }

    class ErrorBoundary extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback(this.state.error);
        }
        return this.props.children;
      }
    }

    const controller = new AbortController();
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <div>
          <InfiniteSuspend />
        </div>,
        webpackMap,
        {
          signal: controller.signal,
          onError(x) {
            const message = typeof x === 'string' ? x : x.message;
            reportedErrors.push(x);
            return __DEV__ ? 'a dev digest' : `digest("${message}")`;
          },
        },
      ),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    function App({res}) {
      return use(res);
    }

    await act(() => {
      root.render(
        <ErrorBoundary fallback={errorBoundaryFn}>
          <Suspense fallback={<p>(loading)</p>}>
            <App res={response} />
          </Suspense>
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe('<p>(loading)</p>');

    await act(() => {
      controller.abort('for reasons');
    });
    const expectedValue = __DEV__
      ? '<p>for reasons + a dev digest</p>'
      : '<p>digest("for reasons")</p>';
    expect(container.innerHTML).toBe(expectedValue);

    expect(reportedErrors).toEqual(['for reasons']);
  });

  it('should warn in DEV a child is missing keys', async () => {
    function ParentClient({children}) {
      return children;
    }
    const Parent = clientExports(ParentClient);
    const ParentModule = clientExports({Parent: ParentClient});

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <>
          <Parent>{Array(6).fill(<div>no key</div>)}</Parent>
          <ParentModule.Parent>
            {Array(6).fill(<div>no key</div>)}
          </ParentModule.Parent>
        </>,
        webpackMap,
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(stream);

    await act(() => {
      root.render(result);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\n' +
        'Check the top-level render call using <ParentClient>. ' +
        'See https://react.dev/link/warning-keys for more information.\n' +
        '    in div (at **)',
    ]);
  });

  it('basic use(promise)', async () => {
    function Server() {
      return (
        ReactServer.use(Promise.resolve('A')) +
        ReactServer.use(Promise.resolve('B')) +
        ReactServer.use(Promise.resolve('C'))
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    function Client() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Suspense fallback="Loading...">
          <Client />
        </Suspense>,
      );
    });
    expect(container.innerHTML).toBe('ABC');
  });

  it('use(promise) in multiple components', async () => {
    function Child({prefix}) {
      return (
        prefix +
        ReactServer.use(Promise.resolve('C')) +
        ReactServer.use(Promise.resolve('D'))
      );
    }

    function Parent() {
      return (
        <Child
          prefix={
            ReactServer.use(Promise.resolve('A')) +
            ReactServer.use(Promise.resolve('B'))
          }
        />
      );
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Parent />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    function Client() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <Suspense fallback="Loading...">
          <Client />
        </Suspense>,
      );
    });
    expect(container.innerHTML).toBe('ABCD');
  });

  it('using a rejected promise will throw', async () => {
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.reject(new Error('Oops!'));
    const promiseC = Promise.resolve('C');

    // Jest/Node will raise an unhandled rejected error unless we await this. It
    // works fine in the browser, though.
    await expect(promiseB).rejects.toThrow('Oops!');

    function Server() {
      return (
        ReactServer.use(promiseA) +
        ReactServer.use(promiseB) +
        ReactServer.use(promiseC)
      );
    }

    const reportedErrors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap, {
        onError(x) {
          reportedErrors.push(x);
          return __DEV__ ? 'a dev digest' : `digest("${x.message}")`;
        },
      }),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return __DEV__
            ? this.state.error.message + ' + ' + this.state.error.digest
            : this.state.error.digest;
        }
        return this.props.children;
      }
    }

    function Client() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <ErrorBoundary>
          <Client />
        </ErrorBoundary>,
      );
    });
    expect(container.innerHTML).toBe(
      __DEV__ ? 'Oops! + a dev digest' : 'digest("Oops!")',
    );
    expect(reportedErrors.length).toBe(1);
    expect(reportedErrors[0].message).toBe('Oops!');
  });

  it("use a promise that's already been instrumented and resolved", async () => {
    const thenable = {
      status: 'fulfilled',
      value: 'Hi',
      then() {},
    };

    // This will never suspend because the thenable already resolved
    function Server() {
      return ReactServer.use(thenable);
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    function Client() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Client />);
    });
    expect(container.innerHTML).toBe('Hi');
  });

  it('unwraps thenable that fulfills synchronously without suspending', async () => {
    function Server() {
      const thenable = {
        then(resolve) {
          // This thenable immediately resolves, synchronously, without waiting
          // a microtask.
          resolve('Hi');
        },
      };
      try {
        return ReactServer.use(thenable);
      } catch {
        throw new Error(
          '`use` should not suspend because the thenable resolved synchronously.',
        );
      }
    }

    // Because the thenable resolves synchronously, we should be able to finish
    // rendering synchronously, with no fallback.
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream);

    function Client() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Client />);
    });
    expect(container.innerHTML).toBe('Hi');
  });

  it('can pass a higher order function by reference from server to client', async () => {
    let actionProxy;

    function Client({action}) {
      actionProxy = action;
      return 'Click Me';
    }

    function greet(transform, text) {
      return 'Hello ' + transform(text);
    }

    function upper(text) {
      return text.toUpperCase();
    }

    const ServerModuleA = serverExports({
      greet,
    });
    const ServerModuleB = serverExports({
      upper,
    });
    const ClientRef = clientExports(Client);

    const boundFn = ServerModuleA.greet.bind(null, ServerModuleB.upper);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef action={boundFn} />,
        webpackMap,
      ),
    );

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(ref, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        return callServer(ref, body);
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toBe('Click Me');
    expect(typeof actionProxy).toBe('function');
    expect(actionProxy).not.toBe(boundFn);

    const result = await actionProxy('hi');
    expect(result).toBe('Hello HI');
  });

  it('can call a module split server function', async () => {
    let actionProxy;

    function Client({action}) {
      actionProxy = action;
      return 'Click Me';
    }

    function greet(text) {
      return 'Hello ' + text;
    }

    const ServerModule = serverExports({
      // This gets split into another module
      split: greet,
    });
    const ClientRef = clientExports(Client);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef action={ServerModule.split} />,
        webpackMap,
      ),
    );

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(ref, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        return callServer(ref, body);
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toBe('Click Me');
    expect(typeof actionProxy).toBe('function');

    const result = await actionProxy('Split');
    expect(result).toBe('Hello Split');
  });

  it('can pass a server function by importing from client back to server', async () => {
    function greet(transform, text) {
      return 'Hello ' + transform(text);
    }

    function upper(text) {
      return text.toUpperCase();
    }

    const ServerModuleA = serverExports({
      greet,
    });
    const ServerModuleB = serverExports({
      upper,
    });

    let actionProxy;

    // This is a Proxy representing ServerModuleB in the Client bundle.
    const ServerModuleBImportedOnClient = {
      upper: ReactServerDOMClient.createServerReference(
        ServerModuleB.upper.$$id,
        async function (ref, args) {
          const body = await ReactServerDOMClient.encodeReply(args);
          return callServer(ref, body);
        },
        undefined,
        undefined,
        'upper',
      ),
    };

    expect(ServerModuleBImportedOnClient.upper.name).toBe(
      __DEV__ ? 'upper' : 'action',
    );
    if (__DEV__) {
      expect(ServerModuleBImportedOnClient.upper.toString()).toBe(
        '(...args) => server(...args)',
      );
    }

    function Client({action}) {
      // Client side pass a Server Reference into an action.
      actionProxy = text => action(ServerModuleBImportedOnClient.upper, text);
      return 'Click Me';
    }

    const ClientRef = clientExports(Client);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef action={ServerModuleA.greet} />,
        webpackMap,
      ),
    );

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(ref, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        return callServer(ref, body);
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toBe('Click Me');

    const result = await actionProxy('hi');
    expect(result).toBe('Hello HI');
  });

  it('can bind arguments to a server reference', async () => {
    let actionProxy;

    function Client({action}) {
      actionProxy = action;
      return 'Click Me';
    }

    const greet = serverExports(function greet(a, b, c) {
      return a + ' ' + b + c;
    });
    const ClientRef = clientExports(Client);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef action={greet.bind(null, 'Hello').bind(null, 'World')} />,
        webpackMap,
      ),
    );

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(actionId, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        return callServer(actionId, body);
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toBe('Click Me');
    expect(typeof actionProxy).toBe('function');
    expect(actionProxy).not.toBe(greet);

    const result = await actionProxy('!');
    expect(result).toBe('Hello World!');
  });

  it('propagates server reference errors to the client', async () => {
    let actionProxy;

    function Client({action}) {
      actionProxy = action;
      return 'Click Me';
    }

    async function send(text) {
      throw new Error(`Error for ${text}`);
    }

    const ServerModule = serverExports({send});
    const ClientRef = clientExports(Client);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef action={ServerModule.send} />,
        webpackMap,
      ),
    );
    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(actionId, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        const result = callServer(actionId, body);
        // Flight doesn't attach error handlers early enough. we suppress the warning
        // by putting a dummy catch on the result here
        result.catch(() => {});
        return ReactServerDOMClient.createFromReadableStream(
          ReactServerDOMServer.renderToReadableStream(result, null, {
            onError: error => 'test-error-digest',
          }),
        );
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    let thrownError;

    try {
      await serverAct(() => actionProxy('test'));
    } catch (error) {
      thrownError = error;
    }

    if (__DEV__) {
      expect(thrownError).toEqual(new Error('Error for test'));
    } else {
      expect(thrownError).toEqual(
        new Error(
          'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.',
        ),
      );

      expect(thrownError.digest).toBe('test-error-digest');
    }
  });

  it('can use the same function twice as a server action', async () => {
    let actionProxy1;
    let actionProxy2;

    function Client({action1, action2}) {
      actionProxy1 = action1;
      actionProxy2 = action2;
      return 'Click Me';
    }

    function greet(text) {
      return 'Hello ' + text;
    }

    const ServerModule = serverExports({
      greet,
      greet2: greet,
    });
    const ClientRef = clientExports(Client);

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientRef
          action1={ServerModule.greet}
          action2={ServerModule.greet2}
        />,
        webpackMap,
      ),
    );

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      async callServer(ref, args) {
        const body = await ReactServerDOMClient.encodeReply(args);
        return callServer(ref, body);
      },
    });

    function App() {
      return use(response);
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toBe('Click Me');
    expect(typeof actionProxy1).toBe('function');
    expect(actionProxy1).not.toBe(greet);

    // TODO: Ideally flight would be encoding this the same.
    expect(actionProxy1).not.toBe(actionProxy2);

    const result = await actionProxy1('world');
    expect(result).toBe('Hello world');
  });

  it('can pass an async server exports that resolves later to an outline object like a Map', async () => {
    let resolve;
    const chunkPromise = new Promise(r => (resolve = r));

    function action() {}
    const serverModule = serverExports(
      {
        action: action,
      },
      chunkPromise,
    );

    // Send the action to the client
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {action: serverModule.action},
        webpackMap,
      ),
    );

    // Snapshot updates change this formatting, so we let prettier ignore it.
    // prettier-ignore
    const response =
      await ReactServerDOMClient.createFromReadableStream(stream);

    // Pass the action back to the server inside a Map

    const map = new Map();
    map.set('action', response.action);

    const body = await ReactServerDOMClient.encodeReply(map);
    const resultPromise = ReactServerDOMServer.decodeReply(
      body,
      webpackServerMap,
    );

    // We couldn't yet resolve the server reference because we haven't loaded
    // its chunk yet in the new server instance. We now resolve it which loads
    // it asynchronously.
    await resolve();

    const result = await resultPromise;
    expect(result instanceof Map).toBe(true);
    expect(result.get('action')).toBe(action);
  });

  it('supports Float hints before the first await in server components in Fiber', async () => {
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent() {
      ReactServerDOM.preload('before', {as: 'style'});
      await 1;
      ReactServerDOM.preload('after', {as: 'style'});
      return <ClientComponent />;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ServerComponent />,
        webpackMap,
      ),
    );

    let response = null;
    function getResponse() {
      if (response === null) {
        response = ReactServerDOMClient.createFromReadableStream(stream);
      }
      return response;
    }

    function App() {
      return getResponse();
    }

    // pausing to let Flight runtime tick. This is a test only artifact of the fact that
    // we aren't operating separate module graphs for flight and fiber. In a real app
    // each would have their own dispatcher and there would be no cross dispatching.
    await 1;

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });
    expect(document.head.innerHTML).toBe(
      gate(f => f.www)
        ? // The www entrypoints for ReactDOM and ReactDOMClient are unified so even
          // when you pull in just the top level the dispatcher for the Document is
          // loaded alongside it. In a normal environment there would be nothing to dispatch to
          // in a server environment so the preload calls would still only be dispatched to fizz
          // or the browser but not both. However in this contrived test environment the preloads
          // are being dispatched simultaneously causing an extraneous preload to show up. This test currently
          // asserts this be demonstrating that the preload call after the await point
          // is written to the document before the call before it. We still demonstrate that
          // flight handled the sync call because if the fiber implementation did it would appear
          // before the after call. In the future we will change this assertion once the fiber
          // implementation no long automatically gets pulled in
          '<link rel="preload" href="after" as="style"><link rel="preload" href="before" as="style">'
        : // For other release channels the client and isomorphic entrypoints are separate and thus we only
          // observe the expected preload from before the first await
          '<link rel="preload" href="before" as="style">',
    );
    expect(container.innerHTML).toBe('<p>hello world</p>');
  });

  it('Does not support Float hints in server components anywhere in Fizz', async () => {
    // In environments that do not support AsyncLocalStorage the Flight client has no ability
    // to scope hint dispatching to a specific Request. In Fiber this isn't a problem because
    // the Browser scope acts like a singleton and we can dispatch away. But in Fizz we need to have
    // a reference to Resources and this is only possible during render unless you support AsyncLocalStorage.
    function Component() {
      return <p>hello world</p>;
    }

    const ClientComponent = clientExports(Component);

    async function ServerComponent() {
      ReactDOM.preload('before', {as: 'style'});
      await 1;
      ReactDOM.preload('after', {as: 'style'});
      return <ClientComponent />;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ServerComponent />,
        webpackMap,
      ),
    );

    let response = null;
    function getResponse() {
      if (response === null) {
        response = ReactServerDOMClient.createFromReadableStream(stream);
      }
      return response;
    }

    function App() {
      return (
        <html>
          <body>{getResponse()}</body>
        </html>
      );
    }

    let fizzPromise;
    await act(async () => {
      fizzPromise = ReactDOMFizzServer.renderToReadableStream(<App />);
    });
    const fizzStream = await fizzPromise;

    const decoder = new TextDecoder();
    const reader = fizzStream.getReader();
    let content = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        content += decoder.decode();
        break;
      }
      content += decoder.decode(value, {stream: true});
    }

    expect(content).toEqual(
      '<!DOCTYPE html><html><head>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render"/>'
          : '') +
        '</head>' +
        '<body><p>hello world</p>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : '') +
        '</body></html>',
    );
  });

  it('should not continue rendering after the reader cancels', async () => {
    let hasLoaded = false;
    let resolve;
    let rendered = false;
    const promise = new Promise(r => (resolve = r));
    function Wait() {
      if (!hasLoaded) {
        throw promise;
      }
      rendered = true;
      return 'Done';
    }
    const errors = [];
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <div>
          <Suspense fallback={<div>Loading</div>}>
            <Wait />
          </Suspense>
        </div>,
        null,
        {
          onError(x) {
            errors.push(x.message);
          },
        },
      ),
    );

    expect(rendered).toBe(false);

    const reader = stream.getReader();
    await reader.read();
    await reader.cancel();

    expect(errors).toEqual([
      'The render was aborted by the server without a reason.',
    ]);

    hasLoaded = true;
    resolve();

    await jest.runAllTimers();

    expect(rendered).toBe(false);

    expect(errors).toEqual([
      'The render was aborted by the server without a reason.',
    ]);
  });

  function passThrough(stream) {
    // Simulate more realistic network by splitting up and rejoining some chunks.
    // This lets us test that we don't accidentally rely on particular bounds of the chunks.
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        function push() {
          reader.read().then(({done, value}) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            push();
            return;
          });
        }
        push();
      },
    });
  }

  it('should supports streaming ReadableStream with objects', async () => {
    const errors = [];
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
    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          s1,
          s2,
        },
        {},
        {
          onError(x) {
            errors.push(x);
            return x;
          },
        },
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(
      passThrough(rscStream),
    );

    const reader1 = result.s1.getReader();
    const reader2 = result.s2.getReader();

    await serverAct(() => {
      controller1.enqueue({hello: 'world'});
      controller2.enqueue({hi: 'there'});
    });

    expect(await reader1.read()).toEqual({
      value: {hello: 'world'},
      done: false,
    });
    expect(await reader2.read()).toEqual({
      value: {hi: 'there'},
      done: false,
    });

    await serverAct(async () => {
      controller1.enqueue('text1');
      controller2.enqueue('text2');
      controller1.close();
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
    await serverAct(async () => {
      controller2.error('rejected');
    });
    let error = null;
    try {
      await reader2.read();
    } catch (x) {
      error = x;
    }
    expect(error.digest).toBe('rejected');
    expect(errors).toEqual(['rejected']);
  });

  it('should cancels the underlying ReadableStream when we are cancelled', async () => {
    let controller;
    let cancelReason;
    const s = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel(r) {
        cancelReason = r;
      },
    });
    let loggedReason;
    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        s,
        {},
        {
          onError(reason) {
            loggedReason = reason;
          },
        },
      ),
    );
    const reader = rscStream.getReader();
    controller.enqueue('hi');
    const reason = new Error('aborted');
    reader.cancel(reason);
    await reader.read();
    expect(cancelReason).toBe(reason);
    expect(loggedReason).toBe(reason);
  });

  it('should cancels the underlying ReadableStream when we abort', async () => {
    const errors = [];
    let controller;
    let cancelReason;
    const abortController = new AbortController();
    const s = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel(r) {
        cancelReason = r;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        s,
        {},
        {
          signal: abortController.signal,
          onError(x) {
            errors.push(x);
            return x.message;
          },
        },
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(
      passThrough(rscStream),
    );
    const reader = result.getReader();

    controller.enqueue('hi');

    await 0;

    const reason = new Error('aborted');
    abortController.abort(reason);

    // We should be able to read the part we already emitted before the abort
    expect(await reader.read()).toEqual({
      value: 'hi',
      done: false,
    });

    expect(cancelReason).toBe(reason);

    let error = null;
    try {
      await reader.read();
    } catch (x) {
      error = x;
    }
    expect(error.digest).toBe('aborted');
    expect(errors).toEqual([reason]);
  });

  it('should supports streaming AsyncIterables with objects', async () => {
    let resolve;
    const wait = new Promise(r => (resolve = r));
    const errors = [];
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
      // eslint-disable-next-line no-throw-literal
      throw 'F';
    })();

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          multiShotIterable,
          singleShotIterator,
        },
        {},
        {
          onError(x) {
            errors.push(x);
            return x;
          },
        },
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(
      passThrough(rscStream),
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

    await serverAct(() => {
      resolve();
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

    let error = null;
    try {
      await iterator2.next();
    } catch (x) {
      error = x;
    }
    expect(error.digest).toBe('F');
    expect(errors).toEqual(['F']);

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

  it('should cancels the underlying AsyncIterable when we are cancelled', async () => {
    let resolve;
    const wait = new Promise(r => (resolve = r));
    let thrownReason;
    const iterator = (async function* () {
      try {
        await wait;
        yield 'a';
        yield 'b';
      } catch (x) {
        thrownReason = x;
      }
      yield 'c';
    })();
    let loggedReason;

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        iterator,
        {},
        {
          onError(reason) {
            loggedReason = reason;
          },
        },
      ),
    );

    const reader = rscStream.getReader();

    const reason = new Error('aborted');
    reader.cancel(reason);
    await resolve();
    await reader.read();
    expect(thrownReason).toBe(reason);
    expect(loggedReason).toBe(reason);
  });

  it('should cancels the underlying AsyncIterable when we abort', async () => {
    const errors = [];
    const abortController = new AbortController();
    let resolve;
    const wait = new Promise(r => (resolve = r));
    let thrownReason;
    const iterator = (async function* () {
      try {
        yield 'a';
        await wait;
        yield 'b';
      } catch (x) {
        thrownReason = x;
      }
      yield 'c';
    })();
    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        iterator,
        {},
        {
          signal: abortController.signal,
          onError(x) {
            errors.push(x);
            return x.message;
          },
        },
      ),
    );
    const result = await ReactServerDOMClient.createFromReadableStream(
      passThrough(rscStream),
    );

    const reason = new Error('aborted');
    abortController.abort(reason);

    await serverAct(() => {
      resolve();
    });

    // We should be able to read the part we already emitted before the abort
    expect(await result.next()).toEqual({
      value: 'a',
      done: false,
    });

    expect(thrownReason).toBe(reason);

    let error = null;
    try {
      await result.next();
    } catch (x) {
      error = x;
    }
    expect(error.digest).toBe('aborted');
    expect(errors).toEqual([reason]);
  });

  it('can prerender', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <div>
          <Greeting />
        </div>
      );
    }

    async function Greeting() {
      await greetingPromise;
      return 'hello world';
    }

    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          <App />,
          webpackMap,
        ),
      };
    });

    resolveGreeting();
    const {prelude} = await pendingResult;

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      passThrough(prelude),
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });
    expect(container.innerHTML).toBe('<div>hello world</div>');
  });

  it('does not propagate abort reasons errors when aborting a prerender', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <div>
          <Suspense fallback="loading...">
            <Greeting />
          </Suspense>
        </div>
      );
    }

    async function Greeting() {
      await greetingPromise;
      return 'hello world';
    }

    const controller = new AbortController();
    const errors = [];
    const {pendingResult} = await serverAct(async () => {
      // destructure trick to avoid the act scope from awaiting the returned value
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          <App />,
          webpackMap,
          {
            signal: controller.signal,
            onError(err) {
              errors.push(err);
            },
          },
        ),
      };
    });

    controller.abort('boom');
    resolveGreeting();
    const {prelude} = await serverAct(() => pendingResult);
    expect(errors).toEqual([]);

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      passThrough(prelude),
    );
    const container = document.createElement('div');
    errors.length = 0;
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(err) {
        errors.push(err);
      },
    });

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(errors).toEqual([new Error('Connection closed.')]);
    expect(container.innerHTML).toBe('');
  });

  it('renders Suspense fallback for unresolved promises with unstable_allowPartialStream', async () => {
    let resolveGreeting;
    const greetingPromise = new Promise(resolve => {
      resolveGreeting = resolve;
    });

    function App() {
      return (
        <Suspense fallback="loading...">
          <Greeting />
        </Suspense>
      );
    }

    async function Greeting() {
      const greeting = await greetingPromise;
      return greeting;
    }

    const controller = new AbortController();
    const {pendingResult} = await serverAct(async () => {
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          <App />,
          webpackMap,
          {
            signal: controller.signal,
          },
        ),
      };
    });

    controller.abort();
    resolveGreeting('Hello, World!');
    const {prelude} = await serverAct(() => pendingResult);

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      passThrough(prelude),
      {
        unstable_allowPartialStream: true,
      },
    );
    const container = document.createElement('div');
    const errors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError(err) {
        errors.push(err);
      },
    });

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    // With `unstable_allowPartialStream`, we should see the fallback instead of a
    // 'Connection closed.' error
    expect(errors).toEqual([]);
    expect(container.innerHTML).toBe('loading...');
  });

  it('renders client components that are blocked on chunks with unstable_allowPartialStream', async () => {
    let resolveClientComponentChunk;

    const ClientComponent = clientExports(
      function ClientComponent({children}) {
        return <div>{children}</div>;
      },
      '42',
      '/test.js',
      new Promise(resolve => (resolveClientComponentChunk = resolve)),
    );

    function App() {
      return <ClientComponent>Hello, World!</ClientComponent>;
    }

    const controller = new AbortController();
    const {pendingResult} = await serverAct(async () => {
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          <App />,
          webpackMap,
          {
            signal: controller.signal,
          },
        ),
      };
    });

    controller.abort();
    const {prelude} = await serverAct(() => pendingResult);

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      passThrough(prelude),
      {
        unstable_allowPartialStream: true,
      },
    );
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('');

    await act(() => {
      resolveClientComponentChunk();
    });

    expect(container.innerHTML).toBe('<div>Hello, World!</div>');
  });

  it('closes inner ReadableStreams gracefully with unstable_allowPartialStream', async () => {
    let streamController;
    const innerStream = new ReadableStream({
      start(c) {
        streamController = c;
      },
    });

    const abortController = new AbortController();
    const {pendingResult} = await serverAct(async () => {
      streamController.enqueue({hello: 'world'});
      return {
        pendingResult: ReactServerDOMStaticServer.prerender(
          {stream: innerStream},
          webpackMap,
          {
            signal: abortController.signal,
          },
        ),
      };
    });

    abortController.abort();
    const {prelude} = await serverAct(() => pendingResult);

    const response = await ReactServerDOMClient.createFromReadableStream(
      passThrough(prelude),
      {
        unstable_allowPartialStream: true,
      },
    );

    // The inner stream should be readable up to what was enqueued.
    const reader = response.stream.getReader();
    const {value, done} = await reader.read();
    expect(value).toEqual({hello: 'world'});
    expect(done).toBe(false);

    // The next read should signal the stream is done (closed, not errored).
    const final = await reader.read();
    expect(final.done).toBe(true);
  });

  it('can dedupe references inside promises', async () => {
    const foo = {};
    const bar = {
      foo: foo,
    };
    foo.bar = bar;

    const object = {
      foo: Promise.resolve(foo),
      bar: Promise.resolve(bar),
    };

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(object, webpackMap),
    );

    const response = await ReactServerDOMClient.createFromReadableStream(
      passThrough(stream),
    );

    const responseFoo = await response.foo;
    const responseBar = await response.bar;
    expect(responseFoo.bar).toBe(responseBar);
    expect(responseBar.foo).toBe(responseFoo);
  });

  it('can deduped outlined references inside promises', async () => {
    const foo = {};
    const bar = new Set([foo]); // This will be outlined which can create a future reference
    foo.bar = bar;

    const object = {
      foo: Promise.resolve(foo),
      bar: Promise.resolve(bar),
    };

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(object, webpackMap),
    );

    const response = await ReactServerDOMClient.createFromReadableStream(
      passThrough(stream),
    );

    const responseFoo = await response.foo;
    const responseBar = await response.bar;
    expect(responseFoo.bar).toBe(responseBar);
    expect(Array.from(responseBar)[0]).toBe(responseFoo);
  });

  it('should resolve deduped references in maps used in client component props', async () => {
    const ClientComponent = clientExports(function ClientComponent({
      shared,
      map,
    }) {
      expect(map.get(42)).toBe(shared);
      return JSON.stringify({shared, map: Array.from(map)});
    });

    function Server() {
      const shared = {id: 42};
      const map = new Map([[42, shared]]);

      return <ClientComponent shared={shared} map={map} />;
    }

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Server />, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe(
      '{"shared":{"id":42},"map":[[42,{"id":42}]]}',
    );
  });

  it('should resolve a cycle between debug info and the value it produces', async () => {
    function Inner({style}) {
      return <div style={style} />;
    }

    function Component({style}) {
      return <Inner style={style} />;
    }

    const style = {};
    const element = <Component style={style} />;
    style.element = element;

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(element, webpackMap),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream);
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('<div></div>');
  });

  it('does not close the response early when using a fast debug channel', async () => {
    function Component() {
      return <div>Hi</div>;
    }

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(<Component />, webpackMap, {
        debugChannel: {
          writable: new WritableStream({
            write(chunk) {
              debugReadableStreamController.enqueue(chunk);
            },
            close() {
              debugReadableStreamController.close();
            },
          }),
        },
      }),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(
      // Create a delayed stream to simulate that the RSC stream might be
      // transported slower than the debug channel, which must not lead to a
      // `Connection closed` error in the Flight client.
      createDelayedStream(rscStream),
      {
        debugChannel: {readable: debugReadableStream},
      },
    );

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('<div>Hi</div>');
  });

  it('can transport debug info through a dedicated debug channel', async () => {
    let ownerStack;

    const ClientComponent = clientExports(() => {
      ownerStack = React.captureOwnerStack ? React.captureOwnerStack() : null;
      return <p>Hi</p>;
    });

    function App() {
      return ReactServer.createElement(
        ReactServer.Suspense,
        null,
        ReactServer.createElement(ClientComponent, null),
      );
    }

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        ReactServer.createElement(App, null),
        webpackMap,
        {
          debugChannel: {
            writable: new WritableStream({
              write(chunk) {
                debugReadableStreamController.enqueue(chunk);
              },
              close() {
                debugReadableStreamController.close();
              },
            }),
          },
        },
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      replayConsoleLogs: true,
      debugChannel: {
        readable: debugReadableStream,
        // Explicitly not defining a writable side here. Its presence was
        // previously used as a condition to wait for referenced debug chunks.
      },
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    if (__DEV__) {
      expect(normalizeCodeLocInfo(ownerStack)).toBe('\n    in App (at **)');
    }

    expect(container.innerHTML).toBe('<p>Hi</p>');
  });

  it('should not have missing key warnings when a static child is blocked on debug info', async () => {
    const ClientComponent = clientExports(function ClientComponent({element}) {
      return (
        <div>
          <span>Hi</span>
          {element}
        </div>
      );
    });

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        <ClientComponent element={<span>Sebbie</span>} />,
        webpackMap,
        {
          debugChannel: {
            writable: new WritableStream({
              write(chunk) {
                debugReadableStreamController.enqueue(chunk);
              },
              close() {
                debugReadableStreamController.close();
              },
            }),
          },
        },
      ),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      debugChannel: {readable: createDelayedStream(debugReadableStream)},
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    // Wait for the debug info to be processed.
    await act(() => {});

    expect(container.innerHTML).toBe(
      '<div><span>Hi</span><span>Sebbie</span></div>',
    );
  });

  it('should fully resolve debug info when transported through a (slow) debug channel', async () => {
    function Paragraph({children}) {
      return ReactServer.createElement('p', null, children);
    }

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const app = ReactServer.createElement(
      ReactServer.Fragment,
      null,
      ReactServer.createElement(Paragraph, null, 'foo'),
      ReactServer.createElement(Paragraph, null, 'bar'),
    );
    const stream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(
        {
          root: app,
        },
        webpackMap,
        {
          debugChannel: {
            writable: new WritableStream({
              write(chunk) {
                debugReadableStreamController.enqueue(chunk);
              },
              close() {
                debugReadableStreamController.close();
              },
            }),
          },
        },
      ),
    );

    function ClientRoot({response}) {
      const {root} = use(response);
      return root;
    }

    const [slowDebugStream1, slowDebugStream2] =
      createDelayedStream(debugReadableStream).tee();

    const response = ReactServerDOMClient.createFromReadableStream(stream, {
      debugChannel: {readable: slowDebugStream1},
    });

    const container = document.createElement('div');
    const clientRoot = ReactDOMClient.createRoot(container);

    await act(() => {
      clientRoot.render(<ClientRoot response={response} />);
    });

    if (__DEV__) {
      const debugStreamReader = slowDebugStream2.getReader();
      while (true) {
        const {done} = await debugStreamReader.read();
        if (done) {
          break;
        }
        // Allow the client to process each debug chunk as it arrives.
        await act(() => {});
      }
    }

    expect(container.innerHTML).toBe('<p>foo</p><p>bar</p>');

    if (
      __DEV__ &&
      gate(
        flags =>
          flags.enableComponentPerformanceTrack && flags.enableAsyncDebugInfo,
      )
    ) {
      const result = await response;
      const firstParagraph = result.root[0];

      expect(getDebugInfo(firstParagraph)).toMatchInlineSnapshot(`
        [
          {
            "time": 0,
          },
          {
            "env": "Server",
            "key": null,
            "name": "Paragraph",
            "props": {},
            "stack": [
              [
                "Object.<anonymous>",
                "/packages/react-server-dom-webpack/src/__tests__/ReactFlightDOMBrowser-test.js",
                2989,
                19,
                2973,
                89,
              ],
            ],
          },
          {
            "time": 0,
          },
        ]
      `);
    }
  });

  it('should resolve a cycle between debug info and the value it produces when using a debug channel', async () => {
    // Same as `should resolve a cycle between debug info and the value it produces`, but using a debug channel.

    function Inner({style}) {
      return <div style={style} />;
    }

    function Component({style}) {
      return <Inner style={style} />;
    }

    const style = {};
    const element = <Component style={style} />;
    style.element = element;

    let debugReadableStreamController;

    const debugReadableStream = new ReadableStream({
      start(controller) {
        debugReadableStreamController = controller;
      },
    });

    const rscStream = await serverAct(() =>
      ReactServerDOMServer.renderToReadableStream(element, webpackMap, {
        debugChannel: {
          writable: new WritableStream({
            write(chunk) {
              debugReadableStreamController.enqueue(chunk);
            },
            close() {
              debugReadableStreamController.close();
            },
          }),
        },
      }),
    );

    function ClientRoot({response}) {
      return use(response);
    }

    const response = ReactServerDOMClient.createFromReadableStream(rscStream, {
      debugChannel: {readable: debugReadableStream},
    });

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<ClientRoot response={response} />);
    });

    expect(container.innerHTML).toBe('<div></div>');
  });
});
