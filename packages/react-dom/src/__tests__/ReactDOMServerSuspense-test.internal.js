/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let act;
let SuspenseList;

describe('ReactDOMServerSuspense', () => {
  beforeEach(() => {
    // Reset warning cache.
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }
  });

  function Text(props) {
    return <div>{props.text}</div>;
  }

  function AsyncText(props) {
    throw new Promise(() => {});
  }

  function getVisibleChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          node.tagName !== 'SCRIPT' &&
          node.tagName !== 'TEMPLATE' &&
          node.tagName !== 'template' &&
          !node.hasAttribute('hidden') &&
          !node.hasAttribute('aria-hidden')
        ) {
          const props = {};
          const attributes = node.attributes;
          for (let i = 0; i < attributes.length; i++) {
            if (
              attributes[i].name === 'id' &&
              attributes[i].value.includes(':')
            ) {
              // We assume this is a React added ID that's a non-visual implementation detail.
              continue;
            }
            props[attributes[i].name] = attributes[i].value;
          }
          props.children = getVisibleChildren(node);
          children.push(React.createElement(node.tagName.toLowerCase(), props));
        }
      } else if (node.nodeType === 3) {
        children.push(node.data);
      }
      node = node.nextSibling;
    }
    return children.length === 0
      ? undefined
      : children.length === 1
        ? children[0]
        : children;
  }

  it('should render the children when no promise is thrown', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <Text text="Children" />
      </React.Suspense>,
    );
    container.innerHTML = html;
    expect(getVisibleChildren(container)).toEqual(<div>Children</div>);
  });

  it('should render the fallback when a promise thrown', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <AsyncText text="Children" />
      </React.Suspense>,
    );
    container.innerHTML = html;
    expect(getVisibleChildren(container)).toEqual(<div>Fallback</div>);
  });

  // @gate enableBrowserAPI
  it('hydrates browser-only content rendered with renderToString', async () => {
    function BrowserOnly() {
      React.use(ReactDOM.browser('Only render this content in the browser'));
      return <Text text="Children" />;
    }

    const app = (
      <React.Suspense fallback={<Text text="Fallback" />}>
        <BrowserOnly />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    expect(getVisibleChildren(container)).toEqual(<div>Fallback</div>);

    const recoverableErrors = [];
    await act(() => {
      ReactDOMClient.hydrateRoot(container, app, {
        onRecoverableError(error) {
          recoverableErrors.push(error);
        },
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(<div>Children</div>);
  });

  // @gate enableBrowserAPI
  it('preserves the server fallback DOM node while browser content is pending', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });

    function BrowserContent() {
      // Keep this thenable stable across every render. On the server the browser
      // marker produces the fallback; on the client the controlled promise keeps
      // the boundary pending long enough to observe the fallback identity.
      React.use(ReactDOM.browser());
      React.use(data);
      return <div id="loaded">Loaded</div>;
    }

    const app = (
      <React.Suspense fallback={<div id="fallback">Loading</div>}>
        <BrowserContent />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    const serverFallback = container.querySelector('#fallback');
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app);
      });

      // Baseline expectation: this currently fails because retrying the
      // dehydrated boundary replaces the fallback node. A correct fix should
      // make the identity assertion pass without hiding updates or effects.
      expect(container.querySelector('#fallback')).toBe(serverFallback);

      await act(async () => {
        resolveData('ready');
        await data;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }
  });

  // @gate enableBrowserAPI
  it('keeps interactive fallback state and balances its effect lifecycle', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });
    let mounts = 0;
    let cleanups = 0;

    function BrowserContent() {
      React.use(ReactDOM.browser());
      React.use(data);
      return <div id="loaded">Loaded</div>;
    }

    function InteractiveFallback() {
      const [count, setCount] = React.useState(0);
      React.useEffect(() => {
        mounts++;
        return () => {
          cleanups++;
        };
      }, []);
      return (
        <div id="fallback">
          <button
            id="fallback-action"
            onClick={() => setCount(value => value + 1)}>
            {count}
          </button>
        </div>
      );
    }

    const app = (
      <React.Suspense fallback={<InteractiveFallback />}>
        <BrowserContent />
      </React.Suspense>
    );
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(app);
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app);
      });

      const button = container.querySelector('#fallback-action');
      expect(button).not.toBe(null);
      expect(mounts).toBe(1);

      await act(() => {
        button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(button.textContent).toBe('1');
      expect(cleanups).toBe(0);

      await act(async () => {
        resolveData('ready');
        await data;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
      expect(cleanups).toBe(1);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
      document.body.removeChild(container);
    }

    // Baseline currently passes this guard: the fallback handles the click and
    // the effect is mounted once. A fix must preserve the same behavior and
    // leave exactly one cleanup after root.unmount().
    expect(mounts).toBe(1);
    expect(cleanups).toBe(1);
  });

  // @gate enableBrowserAPI
  it('updates fallback context when a memoized Suspense element is reused', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });
    const FallbackContext = React.createContext('initial');

    function BrowserContent() {
      React.use(ReactDOM.browser());
      React.use(data);
      return <div id="loaded">Loaded</div>;
    }

    function Fallback() {
      return <div id="fallback">{React.useContext(FallbackContext)}</div>;
    }

    // Keep this Suspense element object stable. Only the Provider value changes.
    const memoizedSuspenseElement = (
      <React.Suspense fallback={<Fallback />}>
        <BrowserContent />
      </React.Suspense>
    );
    const initialApp = (
      <FallbackContext.Provider value="initial">
        {memoizedSuspenseElement}
      </FallbackContext.Provider>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(initialApp);
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, initialApp);
      });
      expect(container.querySelector('#fallback').textContent).toBe('initial');

      await act(() => {
        root.render(
          <FallbackContext.Provider value="changed">
            {memoizedSuspenseElement}
          </FallbackContext.Provider>,
        );
      });
      expect(container.querySelector('#fallback').textContent).toBe('changed');

      await act(async () => {
        resolveData('ready');
        await data;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }
  });

  // @gate enableBrowserAPI
  it('preserves fallback useId and DOM identity during browser hydration', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });

    function BrowserContent() {
      React.use(ReactDOM.browser());
      React.use(data);
      return <div id="loaded">Loaded</div>;
    }

    function Fallback() {
      const id = React.useId();
      return (
        <div data-fallback="true" data-fallback-id={id}>
          Loading
        </div>
      );
    }

    const app = (
      <React.Suspense fallback={<Fallback />}>
        <BrowserContent />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    const serverFallback = container.querySelector('[data-fallback]');
    const serverId = serverFallback.getAttribute('data-fallback-id');
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app);
      });
      const hydratedFallback = container.querySelector('[data-fallback]');
      expect(hydratedFallback).toBe(serverFallback);
      expect(hydratedFallback.getAttribute('data-fallback-id')).toBe(serverId);

      await act(async () => {
        resolveData('ready');
        await data;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }
  });

  // @gate enableBrowserAPI
  it('does not resurrect browser content after unmounting a pending root', async () => {
    let resolveData;
    const data = new Promise(resolve => {
      resolveData = resolve;
    });

    function BrowserContent() {
      React.use(ReactDOM.browser());
      React.use(data);
      return <div id="loaded">Loaded</div>;
    }

    const app = (
      <React.Suspense fallback={<div id="fallback">Loading</div>}>
        <BrowserContent />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app);
      });
      expect(container.querySelector('#fallback')).not.toBe(null);

      await act(() => root.unmount());
      expect(container.innerHTML).toBe('');

      await act(async () => {
        resolveData('ready');
        await data;
      });
      expect(container.innerHTML).toBe('');
      expect(container.querySelector('#loaded')).toBe(null);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }
  });

  // @gate enableBrowserAPI
  it('recovers nested interactive fallback content in order', async () => {
    let resolveOuter;
    let resolveInner;
    const outerData = new Promise(resolve => {
      resolveOuter = resolve;
    });
    const innerData = new Promise(resolve => {
      resolveInner = resolve;
    });
    let fallbackMounts = 0;
    let fallbackCleanups = 0;

    function InnerBrowserContent() {
      React.use(ReactDOM.browser());
      React.use(innerData);
      return <span id="inner-loaded">Inner loaded</span>;
    }

    function InteractiveInnerFallback() {
      const [count, setCount] = React.useState(0);
      React.useEffect(() => {
        fallbackMounts++;
        return () => {
          fallbackCleanups++;
        };
      }, []);
      return (
        <button
          id="inner-fallback-action"
          onClick={() => setCount(value => value + 1)}>
          Inner {count}
        </button>
      );
    }

    function OuterBrowserContent() {
      React.use(ReactDOM.browser());
      React.use(outerData);
      return <div id="outer-loaded">Outer loaded</div>;
    }

    function OuterFallback() {
      return (
        <>
          <span id="left-marker">Left</span>
          <React.Suspense fallback={<InteractiveInnerFallback />}>
            <InnerBrowserContent />
          </React.Suspense>
          <span id="right-marker">Right</span>
        </>
      );
    }

    const app = (
      <React.Suspense fallback={<OuterFallback />}>
        <OuterBrowserContent />
      </React.Suspense>
    );
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(app);
    const serverLeft = container.querySelector('#left-marker');
    const serverRight = container.querySelector('#right-marker');
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app);
      });
      expect(container.querySelector('#left-marker')).toBe(serverLeft);
      expect(container.querySelector('#right-marker')).toBe(serverRight);

      const button = container.querySelector('#inner-fallback-action');
      expect(button).not.toBe(null);
      expect(fallbackMounts).toBe(1);
      await act(() => {
        button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(button.textContent).toBe('Inner 1');

      await act(async () => {
        resolveInner('inner ready');
        await innerData;
      });
      expect(container.querySelector('#inner-loaded')).not.toBe(null);
      expect(container.querySelector('#left-marker')).toBe(serverLeft);
      expect(container.querySelector('#right-marker')).toBe(serverRight);

      await act(async () => {
        resolveOuter('outer ready');
        await outerData;
      });
      expect(container.querySelector('#outer-loaded')).not.toBe(null);
      expect(container.querySelector('#left-marker')).toBe(null);
      expect(container.querySelector('#right-marker')).toBe(null);
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
      document.body.removeChild(container);
    }

    expect(fallbackCleanups).toBe(1);
    expect(container.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('recovers an inner fallback error without replacing its outer fallback', async () => {
    let shouldThrow = false;
    let resolveOuter;
    const outerData = new Promise(resolve => {
      resolveOuter = resolve;
    });
    const innerData = new Promise(() => {});
    const caught = [];
    const recoverable = [];
    class InnerErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error !== null ? (
          <span id="inner-caught">Inner error handled</span>
        ) : (
          this.props.children
        );
      }
    }
    function InnerPrimary() {
      React.use(ReactDOM.browser());
      React.use(innerData);
      return <span>Inner loaded</span>;
    }
    function InnerFallback() {
      if (shouldThrow) throw new Error('controlled inner fallback error');
      return <span id="inner-fallback">Inner loading</span>;
    }
    function OuterPrimary() {
      React.use(ReactDOM.browser());
      React.use(outerData);
      return <div id="outer-loaded">Outer loaded</div>;
    }
    function OuterFallback() {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button id="outer-action" onClick={() => setCount(x => x + 1)}>
            {count}
          </button>
          <InnerErrorBoundary>
            <React.Suspense fallback={<InnerFallback />}>
              <InnerPrimary />
            </React.Suspense>
          </InnerErrorBoundary>
          <span id="outer-right">Right</span>
        </>
      );
    }
    const app = (
      <React.Suspense fallback={<OuterFallback />}>
        <OuterPrimary />
      </React.Suspense>
    );
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(app);
    const button = container.querySelector('#outer-action');
    const right = container.querySelector('#outer-right');
    shouldThrow = true;
    let root;
    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app, {
          onCaughtError: error => caught.push(error),
          onRecoverableError: error => recoverable.push(error),
        });
      });
      expect(container.querySelector('#inner-caught').textContent).toBe(
        'Inner error handled',
      );
      expect(container.querySelector('#inner-fallback')).toBe(null);
      expect(container.querySelector('#outer-action')).toBe(button);
      expect(container.querySelector('#outer-right')).toBe(right);
      expect(caught).toHaveLength(1);
      expect(caught[0].message).toBe('controlled inner fallback error');
      await act(() =>
        button.dispatchEvent(new MouseEvent('click', {bubbles: true})),
      );
      expect(button.textContent).toBe('1');
      await act(async () => {
        resolveOuter('ready');
        await outerData;
      });
      expect(container.querySelector('#outer-loaded').textContent).toBe(
        'Outer loaded',
      );
      expect(container.querySelector('#inner-caught')).toBe(null);
      expect(caught).toHaveLength(1);
      expect(recoverable.length).toBeLessThanOrEqual(1);
    } finally {
      if (root !== undefined) await act(() => root.unmount());
      document.body.removeChild(container);
    }
    expect(container.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('lets a client error boundary catch an error while hydrating fallback', async () => {
    let shouldThrow = false;
    const caughtErrors = [];
    const recoverableErrors = [];

    class ErrorBoundary extends React.Component {
      state = {error: null};

      static getDerivedStateFromError(error) {
        return {error};
      }

      render() {
        if (this.state.error !== null) {
          return <div id="caught">Caught client error</div>;
        }
        return this.props.children;
      }
    }

    function ClientThrowsAfterServerRender() {
      if (shouldThrow) {
        throw new Error('controlled client hydration error');
      }
      return <div id="server-content">Server content</div>;
    }

    const pending = new Promise(() => {});
    function BrowserContent() {
      React.use(ReactDOM.browser());
      React.use(pending);
      return <div id="loaded">Loaded</div>;
    }
    // The error must arise inside the fallback that this change hydrates.
    const app = (
      <ErrorBoundary>
        <React.Suspense fallback={<ClientThrowsAfterServerRender />}>
          <BrowserContent />
        </React.Suspense>
      </ErrorBoundary>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    expect(container.querySelector('#server-content')).not.toBe(null);
    shouldThrow = true;
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, app, {
          onRecoverableError(error) {
            recoverableErrors.push(error);
          },
          onCaughtError(error) {
            caughtErrors.push(error);
          },
        });
      });
      expect(container.querySelector('#caught')).not.toBe(null);
      expect(container.querySelector('#server-content')).toBe(null);
      expect(caughtErrors).toHaveLength(1);
      expect(caughtErrors[0].message).toBe('controlled client hydration error');
      expect(recoverableErrors.length).toBeLessThanOrEqual(1);
      for (let i = 0; i < recoverableErrors.length; i++) {
        const error = recoverableErrors[i];
        expect(error.cause.message).toBe('controlled client hydration error');
        expect(error.message).toContain('client rendering the entire root');
      }
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }

    expect(container.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('reports a recoverable fallback mismatch and then hydrates the primary', async () => {
    let resolvePrimary;
    const primaryData = new Promise(resolve => {
      resolvePrimary = resolve;
    });

    function Primary() {
      React.use(ReactDOM.browser());
      React.use(primaryData);
      return <div id="loaded">Loaded</div>;
    }

    const serverApp = (
      <React.Suspense fallback={<div id="fallback">Server fallback</div>}>
        <Primary />
      </React.Suspense>
    );
    const clientApp = (
      <React.Suspense fallback={<div id="fallback">Client fallback</div>}>
        <Primary />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(serverApp);
    const recoverableErrors = [];
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, clientApp, {
          onRecoverableError(error) {
            recoverableErrors.push(error);
          },
        });
      });

      expect(container.querySelector('#fallback').textContent).toBe(
        'Client fallback',
      );
      expect(
        recoverableErrors.some(error => /hydration/i.test(error.message)),
      ).toBe(true);

      await act(async () => {
        resolvePrimary('ready');
        await primaryData;
      });
      expect(container.querySelector('#loaded').textContent).toBe('Loaded');
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
    }

    expect(container.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('recovers a client-suspending fallback before resolving the primary', async () => {
    let resolveFallback;
    let resolvePrimary;
    const fallbackData = new Promise(resolve => {
      resolveFallback = resolve;
    });
    const primaryData = new Promise(resolve => {
      resolvePrimary = resolve;
    });

    function Primary() {
      React.use(ReactDOM.browser());
      React.use(primaryData);
      return <div id="loaded">Loaded</div>;
    }

    function FallbackContent({shouldSuspend}) {
      if (shouldSuspend) {
        React.use(fallbackData);
      }
      const [count, setCount] = React.useState(0);
      return (
        <button
          id="fallback-action"
          onClick={() => setCount(value => value + 1)}>
          Fallback {count}
        </button>
      );
    }

    function OuterLoading() {
      return <div id="outer-loading">Outer loading</div>;
    }

    const serverApp = (
      <React.Suspense fallback={<OuterLoading />}>
        <React.Suspense fallback={<FallbackContent shouldSuspend={false} />}>
          <Primary />
        </React.Suspense>
      </React.Suspense>
    );
    const clientApp = (
      <React.Suspense fallback={<OuterLoading />}>
        <React.Suspense fallback={<FallbackContent shouldSuspend={true} />}>
          <Primary />
        </React.Suspense>
      </React.Suspense>
    );
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(serverApp);
    let root;

    try {
      await act(() => {
        root = ReactDOMClient.hydrateRoot(container, clientApp);
      });
      expect(container.querySelector('#outer-loading')).not.toBe(null);
      // Both the baseline and candidate retain this Offscreen subtree hidden.
      expect(container.querySelector('#fallback-action').style.display).toBe(
        'none',
      );

      await act(async () => {
        resolveFallback('fallback ready');
        await fallbackData;
      });
      const button = container.querySelector('#fallback-action');
      expect(button).not.toBe(null);
      expect(button.style.display).not.toBe('none');
      await act(() => {
        button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(button.textContent).toBe('Fallback 1');

      await act(async () => {
        resolvePrimary('primary ready');
        await primaryData;
      });
      expect(container.querySelector('#loaded').textContent).toBe('Loaded');
    } finally {
      if (root !== undefined) {
        await act(() => root.unmount());
      }
      document.body.removeChild(container);
    }

    // The unmodified implementation also retains the ordinary outer markers.
    // No fallback content or Fizz error metadata may remain after unmount.
    expect(container.innerHTML).toBe('<!--$--><!--/$-->');
  });

  // @gate enableBrowserAPI
  it('keeps a discarded fallback hydration error from changing the next attempt', async () => {
    const Scheduler = require('scheduler');
    const {waitFor} = require('internal-test-utils');
    let resolvePrimary;
    const primaryData = new Promise(resolve => {
      resolvePrimary = resolve;
    });
    const blockedError = new Promise(() => {});
    const Tick = React.createContext(0);
    let shouldThrow = false;
    let setTick;
    let throwCount = 0;
    let errorFallbackCount = 0;
    const caught = [];
    const recoverable = [];

    function Primary() {
      React.use(ReactDOM.browser());
      React.use(primaryData);
      return <div id="loaded">Loaded</div>;
    }
    function Fallback() {
      if (shouldThrow) {
        if (throwCount++ === 0) Scheduler.log('Fallback throw');
        throw new Error('discarded fallback error');
      }
      const [count, setCount] = React.useState(0);
      return (
        <button id="fallback" onClick={() => setCount(x => x + 1)}>
          {count}
        </button>
      );
    }
    function PendingError() {
      if (errorFallbackCount++ === 0) Scheduler.log('Blocked error result');
      React.use(blockedError);
      return <div id="error-result">Error result</div>;
    }
    class Boundary extends React.Component {
      static contextType = Tick;
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error !== null && shouldThrow ? (
          <PendingError />
        ) : (
          this.props.children
        );
      }
    }
    const stableBoundary = (
      <Boundary>
        <React.Suspense fallback={<Fallback />}>
          <Primary />
        </React.Suspense>
      </Boundary>
    );
    function Controller() {
      const [tick, updateTick] = React.useState(0);
      setTick = updateTick;
      return <Tick.Provider value={tick}>{stableBoundary}</Tick.Provider>;
    }
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(<Controller />);
    const serverFallback = container.querySelector('#fallback');
    shouldThrow = true;
    const root = ReactDOMClient.hydrateRoot(container, <Controller />, {
      onCaughtError(error) {
        caught.push(error);
      },
      onRecoverableError(error) {
        recoverable.push(error);
      },
    });
    try {
      await waitFor(['Fallback throw', 'Blocked error result']);
      expect(throwCount).toBeGreaterThan(0);
      expect(errorFallbackCount).toBeGreaterThan(0);
      expect(caught).toHaveLength(0);
      expect(container.querySelector('#error-result')).toBe(null);
      expect(container.querySelector('#fallback')).toBe(serverFallback);

      shouldThrow = false;
      ReactDOM.flushSync(() => setTick(1));
      await act(() => {});
      expect(container.querySelector('#fallback')).toBe(serverFallback);
      await act(() =>
        container
          .querySelector('#fallback')
          .dispatchEvent(new MouseEvent('click', {bubbles: true})),
      );
      expect(container.querySelector('#fallback').textContent).toBe('1');
      await act(async () => {
        resolvePrimary('ready');
        await primaryData;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
    } finally {
      await act(() => root.unmount());
      document.body.removeChild(container);
    }
    expect(container.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('keeps discarded fallback hydration errors isolated across roots', async () => {
    const Scheduler = require('scheduler');
    const {waitFor} = require('internal-test-utils');
    let resolvePrimary;
    const primaryData = new Promise(resolve => {
      resolvePrimary = resolve;
    });
    const blockedError = new Promise(() => {});
    const Tick = React.createContext(0);
    let shouldThrow = false;
    let setTick;
    let throwCount = 0;
    let errorFallbackCount = 0;
    const caught = [];
    const recoverable = [];

    function Primary() {
      React.use(ReactDOM.browser());
      React.use(primaryData);
      return <div id="loaded">Loaded</div>;
    }
    function Fallback() {
      if (shouldThrow) {
        if (throwCount++ === 0) Scheduler.log('Fallback throw');
        throw new Error('discarded fallback error');
      }
      const [count, setCount] = React.useState(0);
      return (
        <button id="fallback" onClick={() => setCount(x => x + 1)}>
          {count}
        </button>
      );
    }
    function PendingError() {
      if (errorFallbackCount++ === 0) Scheduler.log('Blocked error result');
      React.use(blockedError);
      return <div id="error-result">Error result</div>;
    }
    class Boundary extends React.Component {
      static contextType = Tick;
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error !== null && shouldThrow ? (
          <PendingError />
        ) : (
          this.props.children
        );
      }
    }
    const stableBoundary = (
      <Boundary>
        <React.Suspense fallback={<Fallback />}>
          <Primary />
        </React.Suspense>
      </Boundary>
    );
    function Controller() {
      const [tick, updateTick] = React.useState(0);
      setTick = updateTick;
      return <Tick.Provider value={tick}>{stableBoundary}</Tick.Provider>;
    }
    const otherContainer = document.createElement('div');
    const otherErrors = [];
    const otherRoot = ReactDOMClient.createRoot(otherContainer, {
      onCaughtError: error => otherErrors.push(error),
      onUncaughtError: error => otherErrors.push(error),
      onRecoverableError: error => otherErrors.push(error),
    });
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(<Controller />);
    const serverFallback = container.querySelector('#fallback');
    shouldThrow = true;
    const root = ReactDOMClient.hydrateRoot(container, <Controller />, {
      onCaughtError(error) {
        caught.push(error);
      },
      onRecoverableError(error) {
        recoverable.push(error);
      },
    });
    try {
      await waitFor(['Fallback throw', 'Blocked error result']);
      expect(throwCount).toBeGreaterThan(0);
      expect(errorFallbackCount).toBeGreaterThan(0);
      expect(caught).toHaveLength(0);
      expect(container.querySelector('#error-result')).toBe(null);
      expect(container.querySelector('#fallback')).toBe(serverFallback);

      ReactDOM.flushSync(() => {
        otherRoot.render(<div id="other-ready">Other root ready</div>);
      });
      expect(otherContainer.textContent).toBe('Other root ready');
      expect(otherErrors).toHaveLength(0);
      expect(container.querySelector('#fallback')).toBe(serverFallback);
      expect(caught).toHaveLength(0);

      shouldThrow = false;
      ReactDOM.flushSync(() => setTick(1));
      await act(() => {});
      expect(container.querySelector('#fallback')).toBe(serverFallback);
      await act(() =>
        container
          .querySelector('#fallback')
          .dispatchEvent(new MouseEvent('click', {bubbles: true})),
      );
      expect(container.querySelector('#fallback').textContent).toBe('1');
      await act(async () => {
        resolvePrimary('ready');
        await primaryData;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
      expect(caught).toHaveLength(0);
      expect(recoverable).toHaveLength(0);
      expect(otherContainer.textContent).toBe('Other root ready');
    } finally {
      await act(() => {
        root.unmount();
        otherRoot.unmount();
      });
      document.body.removeChild(container);
    }
    expect(container.innerHTML).toBe('');
    expect(otherContainer.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('reports a new hydration mismatch after discarding an earlier fallback error', async () => {
    const Scheduler = require('scheduler');
    const {waitFor} = require('internal-test-utils');
    let resolvePrimary;
    const primaryData = new Promise(resolve => {
      resolvePrimary = resolve;
    });
    const blockedError = new Promise(() => {});
    const Tick = React.createContext(0);
    let shouldThrow = false;
    let prefix = '';
    let setTick;
    let throwCount = 0;
    let errorFallbackCount = 0;
    const caught = [];
    const recoverable = [];

    function Primary() {
      React.use(ReactDOM.browser());
      React.use(primaryData);
      return <div id="loaded">Loaded</div>;
    }
    function Fallback() {
      if (shouldThrow) {
        if (throwCount++ === 0) Scheduler.log('Fallback throw');
        throw new Error('discarded fallback error');
      }
      const [count, setCount] = React.useState(0);
      return (
        <button id="fallback" onClick={() => setCount(x => x + 1)}>
          {prefix}
          {count}
        </button>
      );
    }
    function PendingError() {
      if (errorFallbackCount++ === 0) Scheduler.log('Blocked error result');
      React.use(blockedError);
      return <div id="error-result">Error result</div>;
    }
    class Boundary extends React.Component {
      static contextType = Tick;
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        return this.state.error !== null && shouldThrow ? (
          <PendingError />
        ) : (
          this.props.children
        );
      }
    }
    const stableBoundary = (
      <Boundary>
        <React.Suspense fallback={<Fallback />}>
          <Primary />
        </React.Suspense>
      </Boundary>
    );
    function Controller() {
      const [tick, updateTick] = React.useState(0);
      setTick = updateTick;
      return <Tick.Provider value={tick}>{stableBoundary}</Tick.Provider>;
    }
    const otherContainer = document.createElement('div');
    const otherErrors = [];
    const otherRoot = ReactDOMClient.createRoot(otherContainer, {
      onCaughtError: error => otherErrors.push(error),
      onUncaughtError: error => otherErrors.push(error),
      onRecoverableError: error => otherErrors.push(error),
    });
    const container = document.createElement('div');
    // WWW delegates clicks to document, so event fixtures must be connected.
    document.body.appendChild(container);
    container.innerHTML = ReactDOMServer.renderToString(<Controller />);
    const serverFallback = container.querySelector('#fallback');
    shouldThrow = true;
    const root = ReactDOMClient.hydrateRoot(container, <Controller />, {
      onCaughtError(error) {
        caught.push(error);
      },
      onRecoverableError(error) {
        recoverable.push(error);
      },
    });
    try {
      await waitFor(['Fallback throw', 'Blocked error result']);
      expect(throwCount).toBeGreaterThan(0);
      expect(errorFallbackCount).toBeGreaterThan(0);
      expect(caught).toHaveLength(0);
      expect(container.querySelector('#error-result')).toBe(null);
      expect(container.querySelector('#fallback')).toBe(serverFallback);

      ReactDOM.flushSync(() => {
        otherRoot.render(<div id="other-ready">Other root ready</div>);
      });
      expect(otherContainer.textContent).toBe('Other root ready');
      expect(otherErrors).toHaveLength(0);
      expect(container.querySelector('#fallback')).toBe(serverFallback);
      expect(caught).toHaveLength(0);

      shouldThrow = false;
      prefix = 'Changed ';
      ReactDOM.flushSync(() => setTick(1));
      await act(() => {});
      expect(container.querySelector('#fallback')).not.toBe(serverFallback);
      expect(container.querySelector('#fallback').textContent).toBe(
        'Changed 0',
      );
      await act(() =>
        container
          .querySelector('#fallback')
          .dispatchEvent(new MouseEvent('click', {bubbles: true})),
      );
      expect(container.querySelector('#fallback').textContent).toBe(
        'Changed 1',
      );
      await act(async () => {
        resolvePrimary('ready');
        await primaryData;
      });
      expect(container.querySelector('#loaded')).not.toBe(null);
      expect(caught).toHaveLength(0);
      expect(recoverable).toHaveLength(1);
      expect(recoverable[0].message).toMatch(/hydration/i);
      expect(recoverable[0].cause).toBe(undefined);
      expect(otherErrors).toHaveLength(0);
      expect(otherContainer.textContent).toBe('Other root ready');
    } finally {
      await act(() => {
        root.unmount();
        otherRoot.unmount();
      });
      document.body.removeChild(container);
    }
    expect(container.innerHTML).toBe('');
    expect(otherContainer.innerHTML).toBe('');
  });

  // @gate enableBrowserAPI
  it('renders only the browser-only fallback with renderToStaticMarkup', () => {
    function BrowserOnly() {
      React.use(ReactDOM.browser('Only render this content in the browser'));
      return <Text text="Children" />;
    }

    const html = ReactDOMServer.renderToStaticMarkup(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <BrowserOnly />
      </React.Suspense>,
    );

    expect(html).toBe('<div>Fallback</div>');
  });

  it('should work with nested suspense components', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <div>
          <Text text="Children" />
          <React.Suspense fallback={<Text text="Fallback" />}>
            <AsyncText text="Children" />
          </React.Suspense>
        </div>
      </React.Suspense>,
    );
    container.innerHTML = html;

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Children</div>
        <div>Fallback</div>
      </div>,
    );
  });

  // @gate enableSuspenseList
  it('server renders a SuspenseList component and its children', async () => {
    const example = (
      <SuspenseList revealOrder="forwards" tail="visible">
        <React.Suspense fallback="Loading A">
          <div>A</div>
        </React.Suspense>
        <React.Suspense fallback="Loading B">
          <div>B</div>
        </React.Suspense>
      </SuspenseList>
    );
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(example);
    container.innerHTML = html;

    const divA = container.children[0];
    expect(divA.tagName).toBe('DIV');
    expect(divA.textContent).toBe('A');
    const divB = container.children[1];
    expect(divB.tagName).toBe('DIV');
    expect(divB.textContent).toBe('B');

    await act(() => {
      ReactDOMClient.hydrateRoot(container, example);
    });

    const divA2 = container.children[0];
    const divB2 = container.children[1];
    expect(divA).toBe(divA2);
    expect(divB).toBe(divB2);
  });

  it('throws when rendering a suspending component outside a Suspense node', async () => {
    expect(() => {
      ReactDOMServer.renderToString(
        <div>
          <React.Suspense />
          <AsyncText text="Children" />
          <React.Suspense />
        </div>,
      );
    }).toThrow('A component suspended while responding to synchronous input.');
  });

  it('does not get confused by throwing null', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw null;
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe(null);
  });

  it('does not get confused by throwing undefined', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw undefined;
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe(undefined);
  });

  it('does not get confused by throwing a primitive', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw 'foo';
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe('foo');
  });
});
