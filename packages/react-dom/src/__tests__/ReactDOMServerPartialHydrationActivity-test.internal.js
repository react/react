/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

let Activity;
let React = require('react');
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let ReactFeatureFlags;
let Scheduler;
let Suspense;
let useSyncExternalStore;
let act;
let IdleEventPriority;
let waitForAll;
let waitFor;
let assertLog;
let assertConsoleErrorDev;

function normalizeError(msg) {
  // Take the first sentence to make it easier to assert on.
  const idx = msg.indexOf('.');
  if (idx > -1) {
    return msg.slice(0, idx + 1);
  }
  return msg;
}

function dispatchMouseEvent(to, from) {
  if (!to) {
    to = null;
  }
  if (!from) {
    from = null;
  }
  if (from) {
    const mouseOutEvent = document.createEvent('MouseEvents');
    mouseOutEvent.initMouseEvent(
      'mouseout',
      true,
      true,
      window,
      0,
      50,
      50,
      50,
      50,
      false,
      false,
      false,
      false,
      0,
      to,
    );
    from.dispatchEvent(mouseOutEvent);
  }
  if (to) {
    const mouseOverEvent = document.createEvent('MouseEvents');
    mouseOverEvent.initMouseEvent(
      'mouseover',
      true,
      true,
      window,
      0,
      50,
      50,
      50,
      50,
      false,
      false,
      false,
      false,
      0,
      from,
    );
    to.dispatchEvent(mouseOverEvent);
  }
}

describe('ReactDOMServerPartialHydrationActivity', () => {
  beforeEach(() => {
    jest.resetModules();

    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.enableSuspenseCallback = true;
    ReactFeatureFlags.enableCreateEventHandleAPI = true;

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    ReactDOMServer = require('react-dom/server');
    Scheduler = require('scheduler');
    Activity = React.Activity;
    Suspense = React.Suspense;
    useSyncExternalStore = React.useSyncExternalStore;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

    IdleEventPriority = require('react-reconciler/constants').IdleEventPriority;
  });

  it('hydrates a parent even if a child Activity boundary is blocked', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    function App() {
      return (
        <div>
          <Activity>
            <span ref={ref}>
              <Child />
            </span>
          </Activity>
        </div>
      );
    }

    // First we render the final HTML. With the streaming renderer
    // this may have suspense points on the server but here we want
    // to test the completed HTML. Don't suspend on the server.
    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    expect(ref.current).toBe(null);

    // Resolving the promise should continue hydration
    suspend = false;
    resolve();
    await promise;
    await waitForAll([]);

    // We should now have hydrated with a ref on the existing span.
    expect(ref.current).toBe(span);
  });

  it('can hydrate siblings of a suspended component without errors', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    function App() {
      return (
        <Activity>
          <Child />
          <Activity>
            <div>Hello</div>
          </Activity>
        </Activity>
      );
    }

    // First we render the final HTML. With the streaming renderer
    // this may have suspense points on the server but here we want
    // to test the completed HTML. Don't suspend on the server.
    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;
    expect(container.textContent).toBe('HelloHello');

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([]);

    // Expect the server-generated HTML to stay intact.
    expect(container.textContent).toBe('HelloHello');

    // Resolving the promise should continue hydration
    suspend = false;
    resolve();
    await promise;
    await waitForAll([]);
    // Hydration should not change anything.
    expect(container.textContent).toBe('HelloHello');
  });

  it('falls back to client rendering boundary on mismatch', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child() {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return 'Hello';
      }
    }
    function Component({shouldMismatch}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>Mismatch</article>;
      }
      return <div>Component</div>;
    }
    function App() {
      return (
        <Activity>
          <Child />
          <Component />
          <Component />
          <Component />
          <Component shouldMismatch={true} />
        </Activity>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Hello', 'Component', 'Component', 'Component', 'Component']);

    expect(container.innerHTML).toBe(
      '<!--&-->Hello<div>Component</div><div>Component</div><div>Component</div><div>Component</div><!--/&-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Suspend']);
    jest.runAllTimers();

    // Unchanged
    expect(container.innerHTML).toBe(
      '<!--&-->Hello<div>Component</div><div>Component</div><div>Component</div><div>Component</div><!--/&-->',
    );

    suspend = false;
    resolve();
    await promise;
    await waitForAll([
      // first pass, mismatches at end
      'Hello',
      'Component',
      'Component',
      'Component',
      'Component',

      // second pass as client render
      'Hello',
      'Component',
      'Component',
      'Component',
      'Component',
      // Hydration mismatch is logged
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);

    // Client rendered - suspense comment nodes removed
    expect(container.innerHTML).toBe(
      'Hello<div>Component</div><div>Component</div><div>Component</div><article>Mismatch</article>',
    );
  });

  it('handles if mismatch is after suspending', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child() {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return 'Hello';
      }
    }
    function Component({shouldMismatch}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>Mismatch</article>;
      }
      return <div>Component</div>;
    }
    function App() {
      return (
        <Activity>
          <Child />
          <Component shouldMismatch={true} />
        </Activity>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Hello', 'Component']);

    expect(container.innerHTML).toBe(
      '<!--&-->Hello<div>Component</div><!--/&-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Suspend']);
    jest.runAllTimers();

    // !! Unchanged, continue showing server content while suspended.
    expect(container.innerHTML).toBe(
      '<!--&-->Hello<div>Component</div><!--/&-->',
    );

    suspend = false;
    resolve();
    await promise;
    await waitForAll([
      // first pass, mismatches at end
      'Hello',
      'Component',
      'Hello',
      'Component',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    jest.runAllTimers();

    // Client rendered - suspense comment nodes removed.
    expect(container.innerHTML).toBe('Hello<article>Mismatch</article>');
  });

  it('handles if mismatch is child of suspended component', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child({children}) {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return <div>{children}</div>;
      }
    }
    function Component({shouldMismatch}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>Mismatch</article>;
      }
      return <div>Component</div>;
    }
    function App() {
      return (
        <Activity>
          <Child>
            <Component shouldMismatch={true} />
          </Child>
        </Activity>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Hello', 'Component']);

    expect(container.innerHTML).toBe(
      '<!--&--><div><div>Component</div></div><!--/&-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Suspend']);
    jest.runAllTimers();

    // !! Unchanged, continue showing server content while suspended.
    expect(container.innerHTML).toBe(
      '<!--&--><div><div>Component</div></div><!--/&-->',
    );

    suspend = false;
    resolve();
    await promise;
    await waitForAll([
      // first pass, mismatches at end
      'Hello',
      'Component',
      'Hello',
      'Component',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    jest.runAllTimers();

    // Client rendered - suspense comment nodes removed
    expect(container.innerHTML).toBe('<div><article>Mismatch</article></div>');
  });

  it('handles if mismatch is parent and first child suspends', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child({children}) {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return <div>{children}</div>;
      }
    }
    function Component({shouldMismatch, children}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return (
          <div>
            {children}
            <article>Mismatch</article>
          </div>
        );
      }
      return (
        <div>
          {children}
          <div>Component</div>
        </div>
      );
    }
    function App() {
      return (
        <Activity>
          <Component shouldMismatch={true}>
            <Child />
          </Component>
        </Activity>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Component', 'Hello']);

    expect(container.innerHTML).toBe(
      '<!--&--><div><div></div><div>Component</div></div><!--/&-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Component', 'Suspend']);
    jest.runAllTimers();

    // !! Unchanged, continue showing server content while suspended.
    expect(container.innerHTML).toBe(
      '<!--&--><div><div></div><div>Component</div></div><!--/&-->',
    );

    suspend = false;
    resolve();
    await promise;
    await waitForAll([
      // first pass, mismatches at end
      'Component',
      'Hello',
      'Component',
      'Hello',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    jest.runAllTimers();

    // Client rendered - suspense comment nodes removed
    expect(container.innerHTML).toBe(
      '<div><div></div><article>Mismatch</article></div>',
    );
  });

  it('does show a parent fallback if mismatch is parent and second child suspends', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child({children}) {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return <div>{children}</div>;
      }
    }
    function Component({shouldMismatch, children}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return (
          <div>
            <article>Mismatch</article>
            {children}
          </div>
        );
      }
      return (
        <div>
          <div>Component</div>
          {children}
        </div>
      );
    }
    function Fallback() {
      Scheduler.log('Fallback');
      return 'Loading...';
    }
    function App() {
      return (
        <Suspense fallback={<Fallback />}>
          <Activity>
            <Component shouldMismatch={true}>
              <Child />
            </Component>
          </Activity>
        </Suspense>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Component', 'Hello']);

    const div = container.getElementsByTagName('div')[0];

    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div><div>Component</div><div></div></div><!--/&--><!--/$-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Component', 'Component', 'Suspend', 'Fallback']);
    jest.runAllTimers();

    // !! Client switches to suspense fallback. The dehydrated content is still hidden because we never
    // committed the client rendering.
    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div style="display: none;"><div>Component</div><div></div></div><!--/&--><!--/$-->' +
        'Loading...',
    );

    suspend = false;
    resolve();
    await promise;
    if (gate(flags => flags.alwaysThrottleRetries)) {
      await waitForAll(['Component', 'Component', 'Hello']);
    } else {
      await waitForAll([
        'Component',
        'Component',
        'Hello',
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }
    jest.runAllTimers();

    // Now that we've hit the throttle timeout, we can commit the failed hydration.
    if (gate(flags => flags.alwaysThrottleRetries)) {
      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }

    // Client rendered - activity comment nodes removed
    expect(container.innerHTML).toBe(
      '<!--$--><!--/$--><div><article>Mismatch</article><div></div></div>',
    );
  });

  it('does show a parent fallback if mismatch is in parent element only', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child({children}) {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return <div>{children}</div>;
      }
    }
    function Component({shouldMismatch, children}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>{children}</article>;
      }
      return <div>{children}</div>;
    }
    function Fallback() {
      Scheduler.log('Fallback');
      return 'Loading...';
    }
    function App() {
      return (
        <Suspense fallback={<Fallback />}>
          <Activity>
            <Component shouldMismatch={true}>
              <Child />
            </Component>
          </Activity>
        </Suspense>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Component', 'Hello']);

    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div><div></div></div><!--/&--><!--/$-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Component', 'Component', 'Suspend', 'Fallback']);
    jest.runAllTimers();

    // !! Client switches to suspense fallback. The dehydrated content is still hidden because we never
    // committed the client rendering.
    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div style="display: none;"><div></div></div><!--/&--><!--/$-->' +
        'Loading...',
    );

    suspend = false;
    resolve();
    await promise;
    if (gate(flags => flags.alwaysThrottleRetries)) {
      await waitForAll(['Component', 'Component', 'Hello']);
    } else {
      await waitForAll([
        'Component',
        'Component',
        'Hello',
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }
    jest.runAllTimers();

    // Now that we've hit the throttle timeout, we can commit the failed hydration.
    if (gate(flags => flags.alwaysThrottleRetries)) {
      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }

    // Client rendered - activity comment nodes removed
    expect(container.innerHTML).toBe(
      '<!--$--><!--/$--><article><div></div></article>',
    );
  });

  it('does show a parent fallback if mismatch is before suspending', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child() {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return 'Hello';
      }
    }
    function Component({shouldMismatch}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>Mismatch</article>;
      }
      return <div>Component</div>;
    }
    function Fallback() {
      Scheduler.log('Fallback');
      return 'Loading...';
    }
    function App() {
      return (
        <Suspense fallback={<Fallback />}>
          <Activity>
            <Component shouldMismatch={true} />
            <Child />
          </Activity>
        </Suspense>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Component', 'Hello']);

    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div>Component</div>Hello<!--/&--><!--/$-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Component', 'Component', 'Suspend', 'Fallback']);
    jest.runAllTimers();

    // !! Client switches to suspense fallback. The dehydrated content is still hidden because we never
    // committed the client rendering.
    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div style="display: none;">Component</div><!--/&--><!--/$-->' +
        'Loading...',
    );

    suspend = false;
    resolve();
    await promise;
    if (gate(flags => flags.alwaysThrottleRetries)) {
      await waitForAll(['Component', 'Component', 'Hello']);
    } else {
      await waitForAll([
        'Component',
        'Component',
        'Hello',
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }
    jest.runAllTimers();

    // Now that we've hit the throttle timeout, we can commit the failed hydration.
    if (gate(flags => flags.alwaysThrottleRetries)) {
      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }

    // Client rendered - activity comment nodes removed
    expect(container.innerHTML).toBe(
      '<!--$--><!--/$--><article>Mismatch</article>Hello',
    );
  });

  it('does show a parent fallback if mismatch is before suspending in a child', async () => {
    let client = false;
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => {
      resolve = () => {
        suspend = false;
        resolvePromise();
      };
    });
    function Child() {
      if (suspend) {
        Scheduler.log('Suspend');
        throw promise;
      } else {
        Scheduler.log('Hello');
        return 'Hello';
      }
    }
    function Component({shouldMismatch}) {
      Scheduler.log('Component');
      if (shouldMismatch && client) {
        return <article>Mismatch</article>;
      }
      return <div>Component</div>;
    }
    function Fallback() {
      Scheduler.log('Fallback');
      return 'Loading...';
    }
    function App() {
      return (
        <Suspense fallback={<Fallback />}>
          <Activity>
            <Component shouldMismatch={true} />
            <div>
              <Child />
            </div>
          </Activity>
        </Suspense>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('section');
    container.innerHTML = finalHTML;
    assertLog(['Component', 'Hello']);

    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div>Component</div><div>Hello</div><!--/&--><!--/$-->',
    );

    suspend = true;
    client = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['Component', 'Component', 'Suspend', 'Fallback']);
    jest.runAllTimers();

    // !! Client switches to suspense fallback. The dehydrated content is still hidden because we never
    // committed the client rendering.
    expect(container.innerHTML).toBe(
      '<!--$--><!--&--><div style="display: none;">Component</div><div style="display: none;">Hello</div><!--/&--><!--/$-->' +
        'Loading...',
    );

    suspend = false;
    resolve();
    await promise;
    if (gate(flags => flags.alwaysThrottleRetries)) {
      await waitForAll(['Component', 'Component', 'Hello']);
    } else {
      await waitForAll([
        'Component',
        'Component',
        'Hello',
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }
    jest.runAllTimers();

    // Now that we've hit the throttle timeout, we can commit the failed hydration.
    if (gate(flags => flags.alwaysThrottleRetries)) {
      assertLog([
        "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
      ]);
    }

    // Client rendered - activity comment nodes removed
    expect(container.innerHTML).toBe(
      '<!--$--><!--/$--><article>Mismatch</article><div>Hello</div>',
    );
  });

  it('calls the hydration callbacks after hydration or deletion', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    let suspend2 = false;
    const promise2 = new Promise(() => {});
    function Child2({value}) {
      if (suspend2 && !value) {
        throw promise2;
      } else {
        return 'World';
      }
    }

    function App({value}) {
      return (
        <div>
          <Activity>
            <Child />
          </Activity>
          <Activity>
            <Child2 value={value} />
          </Activity>
        </div>
      );
    }

    // First we render the final HTML. With the streaming renderer
    // this may have suspense points on the server but here we want
    // to test the completed HTML. Don't suspend on the server.
    suspend = false;
    suspend2 = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const hydrated = [];
    const deleted = [];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    suspend2 = true;
    const root = ReactDOMClient.hydrateRoot(container, <App />, {
      onHydrated(node) {
        hydrated.push(node);
      },
      onDeleted(node) {
        deleted.push(node);
      },
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([]);

    expect(hydrated.length).toBe(0);
    expect(deleted.length).toBe(0);

    await act(async () => {
      // Resolving the promise should continue hydration
      suspend = false;
      resolve();
      await promise;
    });

    expect(hydrated.length).toBe(1);
    expect(deleted.length).toBe(0);

    // Performing an update should force it to delete the boundary if
    // it could be unsuspended by the update.
    await act(() => {
      root.render(<App value={true} />);
    });

    expect(hydrated.length).toBe(1);
    expect(deleted.length).toBe(1);
  });

  it('hydrates an empty activity boundary', async () => {
    function App() {
      return (
        <div>
          <Activity />
          <div>Sibling</div>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    expect(container.innerHTML).toContain('<div>Sibling</div>');
  });

  it('recovers with client render when server rendered additional nodes at suspense root', async () => {
    function CheckIfHydrating({children}) {
      // This is a trick to check whether we're hydrating or not, since React
      // doesn't expose that information currently except
      // via useSyncExternalStore.
      let serverOrClient = '(unknown)';
      useSyncExternalStore(
        () => {},
        () => {
          serverOrClient = 'Client rendered';
          return null;
        },
        () => {
          serverOrClient = 'Server rendered';
          return null;
        },
      );
      Scheduler.log(serverOrClient);
      return null;
    }

    const ref = React.createRef();
    function App({hasB}) {
      return (
        <div>
          <Activity>
            <span ref={ref}>A</span>
            {hasB ? <span>B</span> : null}
            <CheckIfHydrating />
          </Activity>
          <div>Sibling</div>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App hasB={true} />);
    assertLog(['Server rendered']);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).toContain('<span>B</span>');
    expect(ref.current).toBe(null);

    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App hasB={false} />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
    });

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).not.toContain('<span>B</span>');

    assertLog([
      'Server rendered',
      'Client rendered',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    expect(ref.current).not.toBe(span);
  });

  it('recovers with client render when server rendered additional nodes at suspense root after unsuspending', async () => {
    const ref = React.createRef();
    let shouldSuspend = false;
    let resolve;
    const promise = new Promise(res => {
      resolve = () => {
        shouldSuspend = false;
        res();
      };
    });
    function Suspender() {
      if (shouldSuspend) {
        throw promise;
      }
      return <></>;
    }
    function App({hasB}) {
      return (
        <div>
          <Activity>
            <Suspender />
            <span ref={ref}>A</span>
            {hasB ? <span>B</span> : null}
          </Activity>
          <div>Sibling</div>
        </div>
      );
    }
    const finalHTML = ReactDOMServer.renderToString(<App hasB={true} />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).toContain('<span>B</span>');
    expect(ref.current).toBe(null);

    shouldSuspend = true;
    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App hasB={false} />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
    });

    await act(() => {
      resolve();
    });

    assertLog([
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).not.toContain('<span>B</span>');
    expect(ref.current).not.toBe(span);
  });

  it('recovers with client render when server rendered additional nodes deep inside suspense root', async () => {
    const ref = React.createRef();
    function App({hasB}) {
      return (
        <div>
          <Activity>
            <div>
              <span ref={ref}>A</span>
              {hasB ? <span>B</span> : null}
            </div>
          </Activity>
          <div>Sibling</div>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App hasB={true} />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).toContain('<span>B</span>');
    expect(ref.current).toBe(null);

    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App hasB={false} />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
    });
    assertLog([
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);

    expect(container.innerHTML).toContain('<span>A</span>');
    expect(container.innerHTML).not.toContain('<span>B</span>');
    expect(ref.current).not.toBe(span);
  });

  it('calls the onDeleted hydration callback if the parent gets deleted', async () => {
    let suspend = false;
    const promise = new Promise(() => {});
    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    function App({deleted}) {
      if (deleted) {
        return null;
      }
      return (
        <div>
          <Activity>
            <Child />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const deleted = [];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = await act(() => {
      return ReactDOMClient.hydrateRoot(container, <App />, {
        onDeleted(node) {
          deleted.push(node);
        },
      });
    });

    expect(deleted.length).toBe(0);

    await act(() => {
      root.render(<App deleted={true} />);
    });

    // The callback should have been invoked.
    expect(deleted.length).toBe(1);
  });

  it('can insert siblings before the dehydrated boundary', async () => {
    let suspend = false;
    const promise = new Promise(() => {});
    let showSibling;

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return 'Second';
      }
    }

    function Sibling() {
      const [visible, setVisibilty] = React.useState(false);
      showSibling = () => setVisibilty(true);
      if (visible) {
        return <div>First</div>;
      }
      return null;
    }

    function App() {
      return (
        <div>
          <Sibling />
          <Activity>
            <span>
              <Child />
            </span>
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;

    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(container.firstChild.firstChild.tagName).not.toBe('DIV');

    // In this state, we can still update the siblings.
    await act(() => showSibling());

    expect(container.firstChild.firstChild.tagName).toBe('DIV');
    expect(container.firstChild.firstChild.textContent).toBe('First');
  });

  it('can delete the dehydrated boundary before it is hydrated', async () => {
    let suspend = false;
    const promise = new Promise(() => {});
    let hideMiddle;

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return (
          <>
            <div>Middle</div>
            Some text
          </>
        );
      }
    }

    function App() {
      const [visible, setVisibilty] = React.useState(true);
      hideMiddle = () => setVisibilty(false);

      return (
        <div>
          <div>Before</div>
          {visible ? (
            <Activity>
              <Child />
            </Activity>
          ) : null}
          <div>After</div>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(container.firstChild.children[1].textContent).toBe('Middle');

    // In this state, we can still delete the boundary.
    await act(() => hideMiddle());

    expect(container.firstChild.children[1].textContent).toBe('After');
  });

  it('blocks updates to hydrate the content first if props have changed', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return text;
      }
    }

    function App({text, className}) {
      return (
        <div>
          <Activity>
            <span ref={ref} className={className}>
              <Child text={text} />
            </span>
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <App text="Hello" className="hello" />,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(span.textContent).toBe('Hello');

    // Render an update, which will be higher or the same priority as pinging the hydration.
    root.render(<App text="Hi" className="hi" />);

    // At the same time, resolving the promise so that rendering can complete.
    // This should first complete the hydration and then flush the update onto the hydrated state.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    // The new span should be the same since we should have successfully hydrated
    // before changing it.
    const newSpan = container.getElementsByTagName('span')[0];
    expect(span).toBe(newSpan);

    // We should now have fully rendered with a ref on the new span.
    expect(ref.current).toBe(span);
    expect(span.textContent).toBe('Hi');
    // If we ended up hydrating the existing content, we won't have properly
    // patched up the tree, which might mean we haven't patched the className.
    expect(span.className).toBe('hi');
  });

  // @gate www
  it('blocks updates to hydrate the content first if props changed at idle priority', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return text;
      }
    }

    function App({text, className}) {
      return (
        <div>
          <Activity>
            <span ref={ref} className={className}>
              <Child text={text} />
            </span>
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <App text="Hello" className="hello" />,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(span.textContent).toBe('Hello');

    // Schedule an update at idle priority
    ReactDOM.unstable_runWithPriority(IdleEventPriority, () => {
      root.render(<App text="Hi" className="hi" />);
    });

    // At the same time, resolving the promise so that rendering can complete.
    suspend = false;
    resolve();
    await promise;

    // This should first complete the hydration and then flush the update onto the hydrated state.
    await waitForAll([]);

    // The new span should be the same since we should have successfully hydrated
    // before changing it.
    const newSpan = container.getElementsByTagName('span')[0];
    expect(span).toBe(newSpan);

    // We should now have fully rendered with a ref on the new span.
    expect(ref.current).toBe(span);
    expect(span.textContent).toBe('Hi');
    // If we ended up hydrating the existing content, we won't have properly
    // patched up the tree, which might mean we haven't patched the className.
    expect(span.className).toBe('hi');
  });

  it('shows the fallback of the parent if props have changed before hydration completes and is still suspended', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const outerRef = React.createRef();
    const ref = React.createRef();

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return text;
      }
    }

    function App({text, className}) {
      return (
        <Suspense fallback="Loading...">
          <div ref={outerRef}>
            <Activity>
              <span ref={ref} className={className}>
                <Child text={text} />
              </span>
            </Activity>
          </div>
        </Suspense>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <App text="Hello" className="hello" />,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
      {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      },
    );
    await waitForAll([]);

    expect(container.getElementsByTagName('div').length).toBe(1); // hidden
    const div = container.getElementsByTagName('div')[0];

    expect(outerRef.current).toBe(div);
    expect(ref.current).toBe(null);

    // Render an update, but leave it still suspended.
    await act(() => {
      root.render(<App text="Hi" className="hi" />);
    });

    // Flushing now should hide the existing content and show the fallback.

    expect(outerRef.current).toBe(null);
    expect(div.style.display).toBe('none');
    expect(container.getElementsByTagName('span').length).toBe(1); // hidden
    expect(ref.current).toBe(null);
    expect(container.textContent).toBe('HelloLoading...');

    // Unsuspending shows the content.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    const span = container.getElementsByTagName('span')[0];
    expect(span.textContent).toBe('Hi');
    expect(span.className).toBe('hi');
    expect(ref.current).toBe(span);
    expect(container.textContent).toBe('Hi');
  });

  it('clears nested activity boundaries if they did not hydrate yet', async () => {
    let suspend = false;
    const promise = new Promise(() => {});
    const ref = React.createRef();

    function Child({text}) {
      if (suspend && text !== 'Hi') {
        throw promise;
      } else {
        return text;
      }
    }

    function App({text, className}) {
      return (
        <div>
          <Activity>
            <Activity>
              <Child text={text} />
            </Activity>{' '}
            <span ref={ref} className={className}>
              <Child text={text} />
            </span>
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <App text="Hello" className="hello" />,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
      {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      },
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);

    // Render an update, that unblocks.
    // Flushing now should delete the existing content and show the update.
    await act(() => {
      root.render(<App text="Hi" className="hi" />);
    });

    const span = container.getElementsByTagName('span')[0];
    expect(span.textContent).toBe('Hi');
    expect(span.className).toBe('hi');
    expect(ref.current).toBe(span);
    expect(container.textContent).toBe('Hi Hi');
  });

  it('hydrates first if props changed but we are able to resolve within a timeout', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return text;
      }
    }

    function App({text, className}) {
      return (
        <div>
          <Activity>
            <span ref={ref} className={className}>
              <Child text={text} />
            </span>
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <App text="Hello" className="hello" />,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(container.textContent).toBe('Hello');

    // Render an update with a long timeout.
    React.startTransition(() => root.render(<App text="Hi" className="hi" />));
    // This shouldn't force the fallback yet.
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(container.textContent).toBe('Hello');

    // Resolving the promise so that rendering can complete.
    // This should first complete the hydration and then flush the update onto the hydrated state.
    suspend = false;
    await act(() => resolve());

    // The new span should be the same since we should have successfully hydrated
    // before changing it.
    const newSpan = container.getElementsByTagName('span')[0];
    expect(span).toBe(newSpan);

    // We should now have fully rendered with a ref on the new span.
    expect(ref.current).toBe(span);
    expect(container.textContent).toBe('Hi');
    // If we ended up hydrating the existing content, we won't have properly
    // patched up the tree, which might mean we haven't patched the className.
    expect(span.className).toBe('hi');
  });

  it('warns but works if setState is called before commit in a dehydrated component', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    let updateText;

    function Child() {
      const [state, setState] = React.useState('Hello');
      updateText = setState;
      Scheduler.log('Child');
      if (suspend) {
        throw promise;
      } else {
        return state;
      }
    }

    function Sibling() {
      Scheduler.log('Sibling');
      return null;
    }

    function App() {
      return (
        <div>
          <Activity>
            <Child />
            <Sibling />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    assertLog(['Child', 'Sibling']);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    ReactDOMClient.hydrateRoot(
      container,
      <App text="Hello" className="hello" />,
    );

    await act(async () => {
      suspend = true;
      await waitFor(['Child']);

      // While we're part way through the hydration, we update the state.
      // This will schedule an update on the children of the activity boundary.
      updateText('Hi');
      assertConsoleErrorDev([
        "Can't perform a React state update on a component that hasn't mounted yet. " +
          'This indicates that you have a side-effect in your render function that ' +
          'asynchronously tries to update the component. Move this work to useEffect instead.\n' +
          '    in App (at **)',
      ]);

      // This will throw it away and rerender.
      await waitForAll(['Child']);

      expect(container.textContent).toBe('Hello');

      suspend = false;
      resolve();
      await promise;
    });
    assertLog(['Child', 'Sibling']);

    expect(container.textContent).toBe('Hello');
  });

  it('blocks the update to hydrate first if context has changed', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();
    const Context = React.createContext(null);

    function Child() {
      const {text, className} = React.useContext(Context);
      if (suspend) {
        throw promise;
      } else {
        return (
          <span ref={ref} className={className}>
            {text}
          </span>
        );
      }
    }

    const App = React.memo(function App() {
      return (
        <div>
          <Activity>
            <Child />
          </Activity>
        </div>
      );
    });

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <Context.Provider value={{text: 'Hello', className: 'hello'}}>
        <App />
      </Context.Provider>,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <Context.Provider value={{text: 'Hello', className: 'hello'}}>
        <App />
      </Context.Provider>,
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(span.textContent).toBe('Hello');

    // Render an update, which will be higher or the same priority as pinging the hydration.
    root.render(
      <Context.Provider value={{text: 'Hi', className: 'hi'}}>
        <App />
      </Context.Provider>,
    );

    // At the same time, resolving the promise so that rendering can complete.
    // This should first complete the hydration and then flush the update onto the hydrated state.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    // Since this should have been hydrated, this should still be the same span.
    const newSpan = container.getElementsByTagName('span')[0];
    expect(newSpan).toBe(span);

    // We should now have fully rendered with a ref on the new span.
    expect(ref.current).toBe(span);
    expect(span.textContent).toBe('Hi');
    // If we ended up hydrating the existing content, we won't have properly
    // patched up the tree, which might mean we haven't patched the className.
    expect(span.className).toBe('hi');
  });

  it('shows the parent fallback if context has changed before hydration completes and is still suspended', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();
    const Context = React.createContext(null);

    function Child() {
      const {text, className} = React.useContext(Context);
      if (suspend) {
        throw promise;
      } else {
        return (
          <span ref={ref} className={className}>
            {text}
          </span>
        );
      }
    }

    const App = React.memo(function App() {
      return (
        <Suspense fallback="Loading...">
          <div>
            <Activity>
              <Child />
            </Activity>
          </div>
        </Suspense>
      );
    });

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <Context.Provider value={{text: 'Hello', className: 'hello'}}>
        <App />
      </Context.Provider>,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <Context.Provider value={{text: 'Hello', className: 'hello'}}>
        <App />
      </Context.Provider>,
      {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      },
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);

    // Render an update, but leave it still suspended.
    // Flushing now should delete the existing content and show the fallback.
    await act(() => {
      root.render(
        <Context.Provider value={{text: 'Hi', className: 'hi'}}>
          <App />
        </Context.Provider>,
      );
    });

    expect(container.getElementsByTagName('span').length).toBe(1); // hidden
    expect(ref.current).toBe(null);
    expect(container.textContent).toBe('HelloLoading...');

    // Unsuspending shows the content.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    const span = container.getElementsByTagName('span')[0];
    expect(span.textContent).toBe('Hi');
    expect(span.className).toBe('hi');
    expect(ref.current).toBe(span);
    expect(container.textContent).toBe('Hi');
  });

  it('can hydrate TWO activity boundaries', async () => {
    const ref1 = React.createRef();
    const ref2 = React.createRef();

    function App() {
      return (
        <div>
          <Activity>
            <span ref={ref1}>1</span>
          </Activity>
          <Activity>
            <span ref={ref2}>2</span>
          </Activity>
        </div>
      );
    }

    // First we render the final HTML. With the streaming renderer
    // this may have suspense points on the server but here we want
    // to test the completed HTML. Don't suspend on the server.
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span1 = container.getElementsByTagName('span')[0];
    const span2 = container.getElementsByTagName('span')[1];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    expect(ref1.current).toBe(span1);
    expect(ref2.current).toBe(span2);
  });

  it('regenerates if it cannot hydrate before changes to props/context expire', async () => {
    let suspend = false;
    const promise = new Promise(resolvePromise => {});
    const ref = React.createRef();
    const ClassName = React.createContext(null);

    function Child({text}) {
      const className = React.useContext(ClassName);
      if (suspend && className !== 'hi' && text !== 'Hi') {
        // Never suspends on the newer data.
        throw promise;
      } else {
        return (
          <span ref={ref} className={className}>
            {text}
          </span>
        );
      }
    }

    function App({text, className}) {
      return (
        <div>
          <Activity>
            <Child text={text} />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(
      <ClassName.Provider value={'hello'}>
        <App text="Hello" />
      </ClassName.Provider>,
    );
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <ClassName.Provider value={'hello'}>
        <App text="Hello" />
      </ClassName.Provider>,
      {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      },
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(span.textContent).toBe('Hello');

    // Render an update, which will be higher or the same priority as pinging the hydration.
    // The new update doesn't suspend.
    // Since we're still suspended on the original data, we can't hydrate.
    // This will force all expiration times to flush.
    await act(() => {
      root.render(
        <ClassName.Provider value={'hi'}>
          <App text="Hi" />
        </ClassName.Provider>,
      );
    });

    // This will now be a new span because we weren't able to hydrate before
    const newSpan = container.getElementsByTagName('span')[0];
    expect(newSpan).not.toBe(span);

    // We should now have fully rendered with a ref on the new span.
    expect(ref.current).toBe(newSpan);
    expect(newSpan.textContent).toBe('Hi');
    // If we ended up hydrating the existing content, we won't have properly
    // patched up the tree, which might mean we haven't patched the className.
    expect(newSpan.className).toBe('hi');
  });

  it('does not invoke an event on a hydrated node until it commits', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Sibling({text}) {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    let clicks = 0;

    function Button() {
      const [clicked, setClicked] = React.useState(false);
      if (clicked) {
        return null;
      }
      return (
        <a
          onClick={() => {
            setClicked(true);
            clicks++;
          }}>
          Click me
        </a>
      );
    }

    function App() {
      return (
        <div>
          <Activity>
            <Button />
            <Sibling />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const a = container.getElementsByTagName('a')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    expect(container.textContent).toBe('Click meHello');

    // We're now partially hydrated.
    await act(() => {
      a.click();
    });
    expect(clicks).toBe(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(clicks).toBe(0);
    expect(container.textContent).toBe('Click meHello');

    document.body.removeChild(container);
  });

  // @gate www
  it('does not invoke an event on a hydrated event handle until it commits', async () => {
    const setClick = ReactDOM.unstable_createEventHandle('click');
    let suspend = false;
    let isServerRendering = true;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Sibling({text}) {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    const onEvent = jest.fn();

    function Button() {
      const ref = React.useRef(null);
      if (!isServerRendering) {
        React.useLayoutEffect(() => {
          return setClick(ref.current, onEvent);
        });
      }
      return <a ref={ref}>Click me</a>;
    }

    function App() {
      return (
        <div>
          <Activity>
            <Button />
            <Sibling />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const a = container.getElementsByTagName('a')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    isServerRendering = false;
    ReactDOMClient.hydrateRoot(container, <App />);

    // We'll do one click before hydrating.
    a.click();
    // This should be delayed.
    expect(onEvent).toHaveBeenCalledTimes(0);

    await waitForAll([]);

    // We're now partially hydrated.
    await act(() => {
      a.click();
    });
    // We should not have invoked the event yet because we're not
    // yet hydrated.
    expect(onEvent).toHaveBeenCalledTimes(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(onEvent).toHaveBeenCalledTimes(0);

    document.body.removeChild(container);
  });

  it('invokes discrete events on nested activity boundaries in a root (legacy system)', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    let clicks = 0;

    function Button() {
      return (
        <a
          onClick={() => {
            clicks++;
          }}>
          Click me
        </a>
      );
    }

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return (
          <Activity>
            <Button />
          </Activity>
        );
      }
    }

    function App() {
      return (
        <Activity>
          <Child />
        </Activity>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const a = container.getElementsByTagName('a')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />);

    // We'll do one click before hydrating.
    await act(() => {
      a.click();
    });
    // This should be delayed.
    expect(clicks).toBe(0);

    await waitForAll([]);

    // We're now partially hydrated.
    await act(() => {
      a.click();
    });
    expect(clicks).toBe(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(clicks).toBe(0);

    document.body.removeChild(container);
  });

  // @gate www
  it('invokes discrete events on nested activity boundaries in a root (createEventHandle)', async () => {
    let suspend = false;
    let isServerRendering = true;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    const onEvent = jest.fn();
    const setClick = ReactDOM.unstable_createEventHandle('click');

    function Button() {
      const ref = React.useRef(null);

      if (!isServerRendering) {
        React.useLayoutEffect(() => {
          return setClick(ref.current, onEvent);
        });
      }

      return <a ref={ref}>Click me</a>;
    }

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        return (
          <Activity>
            <Button />
          </Activity>
        );
      }
    }

    function App() {
      return (
        <Activity>
          <Child />
        </Activity>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const a = container.getElementsByTagName('a')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    isServerRendering = false;
    ReactDOMClient.hydrateRoot(container, <App />);

    // We'll do one click before hydrating.
    a.click();
    // This should be delayed.
    expect(onEvent).toHaveBeenCalledTimes(0);

    await waitForAll([]);

    // We're now partially hydrated.
    await act(() => {
      a.click();
    });
    // We should not have invoked the event yet because we're not
    // yet hydrated.
    expect(onEvent).toHaveBeenCalledTimes(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(onEvent).toHaveBeenCalledTimes(0);

    document.body.removeChild(container);
  });

  it('does not invoke the parent of dehydrated boundary event', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    let clicksOnParent = 0;
    let clicksOnChild = 0;

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return (
          <span
            onClick={e => {
              // The stopPropagation is showing an example why invoking
              // the event on only a parent might not be correct.
              e.stopPropagation();
              clicksOnChild++;
            }}>
            Hello
          </span>
        );
      }
    }

    function App() {
      return (
        <div onClick={() => clicksOnParent++}>
          <Activity>
            <Child />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const span = container.getElementsByTagName('span')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    // We're now partially hydrated.
    await act(() => {
      span.click();
    });
    expect(clicksOnChild).toBe(0);
    expect(clicksOnParent).toBe(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(clicksOnChild).toBe(0);
    expect(clicksOnParent).toBe(0);

    document.body.removeChild(container);
  });

  it('does not invoke an event on a parent tree when a subtree is dehydrated', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    let clicks = 0;
    const childSlotRef = React.createRef();

    function Parent() {
      return <div onClick={() => clicks++} ref={childSlotRef} />;
    }

    function Child({text}) {
      if (suspend) {
        throw promise;
      } else {
        return <a>Click me</a>;
      }
    }

    function App() {
      // The root is a Suspense boundary.
      return (
        <Activity>
          <Child />
        </Activity>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);

    const parentContainer = document.createElement('div');
    const childContainer = document.createElement('div');

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(parentContainer);

    // We're going to use a different root as a parent.
    // This lets us detect whether an event goes through React's event system.
    const parentRoot = ReactDOMClient.createRoot(parentContainer);
    await act(() => parentRoot.render(<Parent />));

    childSlotRef.current.appendChild(childContainer);

    childContainer.innerHTML = finalHTML;

    const a = childContainer.getElementsByTagName('a')[0];

    suspend = true;

    // Hydrate asynchronously.
    await act(() => ReactDOMClient.hydrateRoot(childContainer, <App />));

    // The Suspense boundary is not yet hydrated.
    await act(() => {
      a.click();
    });
    expect(clicks).toBe(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    expect(clicks).toBe(0);

    document.body.removeChild(parentContainer);
  });

  it('blocks only on the last continuous event (legacy system)', async () => {
    let suspend1 = false;
    let resolve1;
    const promise1 = new Promise(resolvePromise => (resolve1 = resolvePromise));
    let suspend2 = false;
    let resolve2;
    const promise2 = new Promise(resolvePromise => (resolve2 = resolvePromise));

    function First({text}) {
      if (suspend1) {
        throw promise1;
      } else {
        return 'Hello';
      }
    }

    function Second({text}) {
      if (suspend2) {
        throw promise2;
      } else {
        return 'World';
      }
    }

    const ops = [];

    function App() {
      return (
        <div>
          <Activity>
            <span
              onMouseEnter={() => ops.push('Mouse Enter First')}
              onMouseLeave={() => ops.push('Mouse Leave First')}
            />
            {/* We suspend after to test what happens when we eager
                attach the listener. */}
            <First />
          </Activity>
          <Activity>
            <span
              onMouseEnter={() => ops.push('Mouse Enter Second')}
              onMouseLeave={() => ops.push('Mouse Leave Second')}>
              <Second />
            </span>
          </Activity>
        </div>
      );
    }

    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const appDiv = container.getElementsByTagName('div')[0];
    const firstSpan = appDiv.getElementsByTagName('span')[0];
    const secondSpan = appDiv.getElementsByTagName('span')[1];
    expect(firstSpan.textContent).toBe('');
    expect(secondSpan.textContent).toBe('World');

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend1 = true;
    suspend2 = true;
    ReactDOMClient.hydrateRoot(container, <App />);

    await waitForAll([]);

    dispatchMouseEvent(appDiv, null);
    dispatchMouseEvent(firstSpan, appDiv);
    dispatchMouseEvent(secondSpan, firstSpan);

    // Neither target is yet hydrated.
    expect(ops).toEqual([]);

    // Resolving the second promise so that rendering can complete.
    suspend2 = false;
    resolve2();
    await promise2;

    await waitForAll([]);

    // We've unblocked the current hover target so we should be
    // able to replay it now.
    expect(ops).toEqual(['Mouse Enter Second']);

    // Resolving the first promise has no effect now.
    suspend1 = false;
    resolve1();
    await promise1;

    await waitForAll([]);

    expect(ops).toEqual(['Mouse Enter Second']);

    document.body.removeChild(container);
  });

  it('finishes normal pri work before continuing to hydrate a retry', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));
    const ref = React.createRef();

    function Child() {
      if (suspend) {
        throw promise;
      } else {
        Scheduler.log('Child');
        return 'Hello';
      }
    }

    function Sibling() {
      Scheduler.log('Sibling');
      React.useLayoutEffect(() => {
        Scheduler.log('Commit Sibling');
      });
      return 'World';
    }

    // Avoid rerendering the tree by hoisting it.
    const tree = (
      <Activity>
        <span ref={ref}>
          <Child />
        </span>
      </Activity>
    );

    function App({showSibling}) {
      return (
        <div>
          {tree}
          {showSibling ? <Sibling /> : null}
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    assertLog(['Child']);

    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    suspend = true;
    const root = ReactDOMClient.hydrateRoot(
      container,
      <App showSibling={false} />,
    );
    await waitForAll([]);

    expect(ref.current).toBe(null);
    expect(container.textContent).toBe('Hello');

    // Resolving the promise should continue hydration
    suspend = false;
    resolve();
    await promise;

    Scheduler.unstable_advanceTime(100);

    // Before we have a chance to flush it, we'll also render an update.
    root.render(<App showSibling={true} />);

    // When we flush we expect the Normal pri render to take priority
    // over hydration.
    await waitFor(['Sibling', 'Commit Sibling']);

    // We shouldn't have hydrated the child yet.
    expect(ref.current).toBe(null);
    // But we did have a chance to update the content.
    expect(container.textContent).toBe('HelloWorld');

    await waitForAll(['Child']);

    // Now we're hydrated.
    expect(ref.current).not.toBe(null);
  });

  it('regression test: does not overfire non-bubbling browser events', async () => {
    let suspend = false;
    let resolve;
    const promise = new Promise(resolvePromise => (resolve = resolvePromise));

    function Sibling({text}) {
      if (suspend) {
        throw promise;
      } else {
        return 'Hello';
      }
    }

    let submits = 0;

    function Form() {
      const [submitted, setSubmitted] = React.useState(false);
      if (submitted) {
        return null;
      }
      return (
        <form
          onSubmit={() => {
            setSubmitted(true);
            submits++;
          }}>
          Click me
        </form>
      );
    }

    function App() {
      return (
        <div>
          <Activity>
            <Form />
            <Sibling />
          </Activity>
        </div>
      );
    }

    suspend = false;
    const finalHTML = ReactDOMServer.renderToString(<App />);
    const container = document.createElement('div');
    container.innerHTML = finalHTML;

    // We need this to be in the document since we'll dispatch events on it.
    document.body.appendChild(container);

    const form = container.getElementsByTagName('form')[0];

    // On the client we don't have all data yet but we want to start
    // hydrating anyway.
    suspend = true;
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    expect(container.textContent).toBe('Click meHello');

    // We're now partially hydrated.
    await act(() => {
      form.dispatchEvent(
        new window.Event('submit', {
          bubbles: true,
        }),
      );
    });
    expect(submits).toBe(0);

    // Resolving the promise so that rendering can complete.
    await act(async () => {
      suspend = false;
      resolve();
      await promise;
    });

    // discrete event not replayed
    expect(submits).toBe(0);
    expect(container.textContent).toBe('Click meHello');

    document.body.removeChild(container);
  });

  it('fallback to client render on hydration mismatch at root', async () => {
    let suspend = true;
    let resolve;
    const promise = new Promise((res, rej) => {
      resolve = () => {
        suspend = false;
        res();
      };
    });
    function App({isClient}) {
      return (
        <>
          <Activity>
            <ChildThatSuspends id={1} isClient={isClient} />
          </Activity>
          {isClient ? <span>client</span> : <div>server</div>}
          <Activity>
            <ChildThatSuspends id={2} isClient={isClient} />
          </Activity>
        </>
      );
    }
    function ChildThatSuspends({id, isClient}) {
      if (isClient && suspend) {
        throw promise;
      }
      return <div>{id}</div>;
    }

    const finalHTML = ReactDOMServer.renderToString(<App isClient={false} />);

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = finalHTML;

    await act(() => {
      ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
    });

    // We suspend the root while we wait for the promises to resolve, leaving the
    // existing content in place.
    expect(container.innerHTML).toEqual(
      '<!--&--><div>1</div><!--/&--><div>server</div><!--&--><div>2</div><!--/&-->',
    );

    await act(async () => {
      resolve();
      await promise;
    });

    assertLog([
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);

    expect(container.innerHTML).toEqual(
      '<div>1</div><span>client</span><div>2</div>',
    );
  });
});
