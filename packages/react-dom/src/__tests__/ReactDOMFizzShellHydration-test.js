/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

let JSDOM;
let React;
let startTransition;
let ReactDOMClient;
let Scheduler;
let clientAct;
let ReactDOMFizzServer;
let Stream;
let document;
let writable;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;
let textCache;
let assertLog;

describe('ReactDOMFizzShellHydration', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');
    clientAct = require('internal-test-utils').act;
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;

    startTransition = React.startTransition;

    textCache = new Map();

    // Test Environment
    const jsdom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body><div id="container">',
      {
        runScripts: 'dangerously',
      },
    );
    document = jsdom.window.document;
    container = document.getElementById('container');

    buffer = '';
    hasErrored = false;

    writable = new Stream.PassThrough();
    writable.setEncoding('utf8');
    writable.on('data', chunk => {
      buffer += chunk;
    });
    writable.on('error', error => {
      hasErrored = true;
      fatalError = error;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function serverAct(callback) {
    await callback();
    // Await one turn around the event loop.
    // This assumes that we'll flush everything we have so far.
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    if (hasErrored) {
      throw fatalError;
    }
    // JSDOM doesn't support stream HTML parser so we need to give it a proper fragment.
    // We also want to execute any scripts that are embedded.
    // We assume that we have now received a proper fragment of HTML.
    const bufferedContent = buffer;
    buffer = '';
    const fakeBody = document.createElement('body');
    fakeBody.innerHTML = bufferedContent;
    while (fakeBody.firstChild) {
      const node = fakeBody.firstChild;
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        script.textContent = node.textContent;
        fakeBody.removeChild(node);
        container.appendChild(script);
      } else {
        container.appendChild(node);
      }
    }
  }

  async function hydrateRootAndCollectErrors(reactNode) {
    const errors = [];
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, reactNode, {
        onCaughtError(error) {
          Scheduler.log('onCaughtError: ' + error.message);
          errors.push('caught: ' + error.message);
        },
        onUncaughtError(error) {
          Scheduler.log('onUncaughtError: ' + error.message);
          errors.push('uncaught: ' + error.message);
        },
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + error.message);
          errors.push('recoverable: ' + error.message);
        },
      });
    });
    return errors;
  }

  function createErrorBoundaryAndBomb() {
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = {error: null};
      }

      static getDerivedStateFromError(error) {
        return {error};
      }

      componentDidCatch() {}

      render() {
        if (this.state.error) {
          return 'Something went wrong: ' + this.state.error.message;
        }

        return this.props.children;
      }
    }

    function Bomb() {
      throw new Error('boom');
    }

    return {ErrorBoundary, Bomb};
  }

  function resolveText(text) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'resolved',
        value: text,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'resolved';
      record.value = text;
      thenable.pings.forEach(t => t());
    }
  }

  function readText(text) {
    const record = textCache.get(text);
    if (record !== undefined) {
      switch (record.status) {
        case 'pending':
          throw record.value;
        case 'rejected':
          throw record.value;
        case 'resolved':
          return record.value;
      }
    } else {
      Scheduler.log(`Suspend! [${text}]`);

      const thenable = {
        pings: [],
        then(resolve) {
          if (newRecord.status === 'pending') {
            thenable.pings.push(resolve);
          } else {
            Promise.resolve().then(() => resolve(newRecord.value));
          }
        },
      };

      const newRecord = {
        status: 'pending',
        value: thenable,
      };
      textCache.set(text, newRecord);

      throw thenable;
    }
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  function AsyncText({text}) {
    readText(text);
    Scheduler.log(text);
    return text;
  }

  function resetTextCache() {
    textCache = new Map();
  }

  it('suspending in the shell during hydration', async () => {
    const div = React.createRef(null);

    function App() {
      return (
        <div ref={div}>
          <AsyncText text="Shell" />
        </div>
      );
    }

    // Server render
    await resolveText('Shell');
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Shell']);
    const dehydratedDiv = container.getElementsByTagName('div')[0];

    // Clear the cache and start rendering on the client
    resetTextCache();

    // Hydration suspends because the data for the shell hasn't loaded yet
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
    assertLog(['Suspend! [Shell]']);
    expect(div.current).toBe(null);
    expect(container.textContent).toBe('Shell');

    // The shell loads and hydration finishes
    await clientAct(async () => {
      await resolveText('Shell');
    });
    assertLog(['Shell']);
    expect(div.current).toBe(dehydratedDiv);
    expect(container.textContent).toBe('Shell');
  });

  it('suspending in the shell during a normal client render', async () => {
    // Same as previous test but during a normal client render, no hydration
    function App() {
      return <AsyncText text="Shell" />;
    }

    const root = ReactDOMClient.createRoot(container);
    await clientAct(async () => {
      root.render(<App />);
    });
    assertLog(['Suspend! [Shell]']);

    await clientAct(async () => {
      await resolveText('Shell');
    });
    assertLog(['Shell']);
    expect(container.textContent).toBe('Shell');
  });

  it(
    'updating the root at lower priority than initial hydration does not ' +
      'force a client render',
    async () => {
      function App() {
        return <Text text="Initial" />;
      }

      // Server render
      await resolveText('Initial');
      await serverAct(async () => {
        const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Initial']);

      await clientAct(async () => {
        const root = ReactDOMClient.hydrateRoot(container, <App />);
        // This has lower priority than the initial hydration, so the update
        // won't be processed until after hydration finishes.
        startTransition(() => {
          root.render(<Text text="Updated" />);
        });
      });
      assertLog(['Initial', 'Updated']);
      expect(container.textContent).toBe('Updated');
    },
  );

  it(
    'updating the root at same priority as initial hydration does not ' +
      'force a client render',
    async () => {
      function App() {
        return <Text text="Initial" />;
      }

      // Server render
      await resolveText('Initial');
      await serverAct(async () => {
        const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Initial']);

      await clientAct(async () => {
        let root;
        startTransition(() => {
          root = ReactDOMClient.hydrateRoot(container, <App />);
        });
        // This has lower priority than the initial hydration, so the update
        // won't be processed until after hydration finishes.
        startTransition(() => {
          root.render(<Text text="Updated" />);
        });
      });
      assertLog(['Initial', 'Updated']);
      expect(container.textContent).toBe('Updated');
    },
  );

  it('updating the root while the shell is suspended forces a client render', async () => {
    function App() {
      return <AsyncText text="Shell" />;
    }

    // Server render
    await resolveText('Shell');
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Shell']);

    // Clear the cache and start rendering on the client
    resetTextCache();

    // Hydration suspends because the data for the shell hasn't loaded yet
    const root = await clientAct(async () => {
      return ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          Scheduler.log(error.message);
        },
      });
    });
    assertLog(['Suspend! [Shell]']);
    expect(container.textContent).toBe('Shell');

    await clientAct(async () => {
      root.render(<Text text="New screen" />);
    });
    assertLog([
      'New screen',
      'This root received an early update, before anything was able ' +
        'hydrate. Switched the entire root to client rendering.',
    ]);
    expect(container.textContent).toBe('New screen');
  });

  it('recovers from a large component stack during SSR', async () => {
    spyOnDevAndProd(console, 'error').mockImplementation(() => {});

    function NestedComponent({depth}: {depth: number}) {
      if (depth <= 0) {
        return <AsyncText text="Shell" />;
      }
      return <NestedComponent depth={depth - 1} />;
    }

    await resolveText('Shell');
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <NestedComponent depth={3000} />,
      );
      pipe(writable);
    });
    expect(console.error).not.toHaveBeenCalled();
    assertLog(['Shell']);
    expect(container.textContent).toBe('Shell');
  });

  it('client renders when an error is thrown in an error boundary', async () => {
    function Throws() {
      throw new Error('plain error');
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <div>Caught an error: {this.state.error.message}</div>;
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <ErrorBoundary>
          <Throws />
        </ErrorBoundary>
      );
    }

    // Server render
    let shellError;
    try {
      await serverAct(async () => {
        const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
          onError(error) {
            Scheduler.log('onError: ' + error.message);
          },
        });
        pipe(writable);
      });
    } catch (x) {
      shellError = x;
    }
    expect(shellError).toEqual(
      expect.objectContaining({message: 'plain error'}),
    );
    assertLog(['onError: plain error']);

    function ErroredApp() {
      return <span>loading</span>;
    }

    // Reset test environment
    buffer = '';
    hasErrored = false;
    writable = new Stream.PassThrough();
    writable.setEncoding('utf8');
    writable.on('data', chunk => {
      buffer += chunk;
    });
    writable.on('error', error => {
      hasErrored = true;
      fatalError = error;
    });

    // The Server errored at the shell. The recommended approach is to render a
    // fallback loading state, which can then be hydrated with a mismatch.
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<ErroredApp />);
      pipe(writable);
    });

    expect(container.innerHTML).toBe('<span>loading</span>');

    // Hydration suspends because the data for the shell hasn't loaded yet
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onCaughtError(error) {
          Scheduler.log('onCaughtError: ' + error.message);
        },
        onUncaughtError(error) {
          Scheduler.log('onUncaughtError: ' + error.message);
        },
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + error.message);
          if (error.cause) {
            Scheduler.log('Cause: ' + error.cause.message);
          }
        },
      });
    });

    assertLog(['onCaughtError: plain error']);
    expect(container.textContent).toBe('Caught an error: plain error');
  });

  it('client renders when a client error is thrown in an error boundary', async () => {
    let isClient = false;

    function Throws() {
      if (isClient) {
        throw new Error('plain error');
      }
      return <div>Hello world</div>;
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <div>Caught an error: {this.state.error.message}</div>;
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <ErrorBoundary>
          <Throws />
        </ErrorBoundary>
      );
    }

    // Server render
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
        onError(error) {
          Scheduler.log('onError: ' + error.message);
        },
      });
      pipe(writable);
    });
    assertLog([]);

    expect(container.innerHTML).toBe('<div>Hello world</div>');

    isClient = true;

    // Hydration suspends because the data for the shell hasn't loaded yet
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onCaughtError(error) {
          Scheduler.log('onCaughtError: ' + error.message);
        },
        onUncaughtError(error) {
          Scheduler.log('onUncaughtError: ' + error.message);
        },
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + error.message);
          if (error.cause) {
            Scheduler.log('Cause: ' + error.cause.message);
          }
        },
      });
    });

    assertLog(['onCaughtError: plain error']);
    expect(container.textContent).toBe('Caught an error: plain error');
  });

  it('client renders when a hydration pass error is thrown in an error boundary', async () => {
    let isClient = false;
    let isFirst = true;

    function Throws() {
      if (isClient && isFirst) {
        isFirst = false; // simulate a hydration or concurrent error
        throw new Error('plain error');
      }
      return <div>Hello world</div>;
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <div>Caught an error: {this.state.error.message}</div>;
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <ErrorBoundary>
          <Throws />
        </ErrorBoundary>
      );
    }

    // Server render
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
        onError(error) {
          Scheduler.log('onError: ' + error.message);
        },
      });
      pipe(writable);
    });
    assertLog([]);

    expect(container.innerHTML).toBe('<div>Hello world</div>');

    isClient = true;

    // Hydration suspends because the data for the shell hasn't loaded yet
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onCaughtError(error) {
          Scheduler.log('onCaughtError: ' + error.message);
        },
        onUncaughtError(error) {
          Scheduler.log('onUncaughtError: ' + error.message);
        },
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + error.message);
          if (error.cause) {
            Scheduler.log('Cause: ' + error.cause.message);
          }
        },
      });
    });

    assertLog([
      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering the entire root.',
      'Cause: plain error',
    ]);
    expect(container.textContent).toBe('Hello world');
  });

  it(
    'handles suspending while recovering from a hydration error (in the ' +
      'shell, no Suspense boundary)',
    async () => {
      const useSyncExternalStore = React.useSyncExternalStore;

      let isClient = false;

      let resolve;
      const clientPromise = new Promise(res => {
        resolve = res;
      });

      function App() {
        const state = useSyncExternalStore(
          function subscribe() {
            return () => {};
          },
          function getSnapshot() {
            return 'Client';
          },
          function getServerSnapshot() {
            const isHydrating = isClient;
            if (isHydrating) {
              // This triggers an error during hydration
              throw new Error('Oops!');
            }
            return 'Server';
          },
        );

        if (state === 'Client') {
          return React.use(clientPromise);
        }

        return state;
      }

      // Server render
      await serverAct(async () => {
        const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog([]);

      expect(container.innerHTML).toBe('Server');

      // During hydration, an error is thrown. React attempts to recover by
      // switching to client render
      isClient = true;
      await clientAct(async () => {
        ReactDOMClient.hydrateRoot(container, <App />, {
          onRecoverableError(error) {
            Scheduler.log('onRecoverableError: ' + error.message);
            if (error.cause) {
              Scheduler.log('Cause: ' + error.cause.message);
            }
          },
        });
      });
      expect(container.innerHTML).toBe('Server'); // Still suspended
      assertLog([]);

      await clientAct(async () => {
        resolve('Client');
      });
      assertLog([
        'onRecoverableError: There was an error while hydrating but React was ' +
          'able to recover by instead client rendering the entire root.',
        'Cause: Oops!',
      ]);
      expect(container.innerHTML).toBe('Client');
    },
  );

  it(
    'does not corrupt hooks during hydration when conditional use suspends ' +
      'after a cascading update (#33580)',
    async () => {
      const {ErrorBoundary, Bomb} = createErrorBoundaryAndBomb();

      function Updater({setPromise}) {
        const [state, setState] = React.useState(false);

        React.useEffect(() => {
          setState(true);
          startTransition(() => {
            setPromise(Promise.resolve('resolved'));
          });
        }, [state]);

        return null;
      }

      function Page() {
        const [promise, setPromise] = React.useState(null);
        const value = promise ? React.use(promise) : promise;

        React.useMemo(() => {}, []);

        return (
          <>
            <Updater setPromise={setPromise} />
            <React.Suspense fallback="Loading...">
              <ErrorBoundary>
                <Bomb />
              </ErrorBoundary>
            </React.Suspense>
            {value !== null ? value : 'hello world'}
          </>
        );
      }

      function App() {
        return <Page />;
      }

      await serverAct(async () => {
        const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
          onError(error) {
            Scheduler.log('onError: ' + error.message);
          },
        });
        pipe(writable);
      });
      assertLog(['onError: boom']);

      const errors = await hydrateRootAndCollectErrors(<App />);
      assertLog(['onCaughtError: boom']);

      expect(
        errors.find(error => error.includes('Rendered more hooks')),
      ).toBeUndefined();
      expect(container.textContent).toBe('Something went wrong: boomresolved');
    },
  );

  it('preserves hooks when suspension happens before the first tracked hook', async () => {
    const {ErrorBoundary, Bomb} = createErrorBoundaryAndBomb();
    let setReady;

    function Updater({setPromise}) {
      React.useEffect(() => {
        setReady(true);
        startTransition(() => {
          setPromise(Promise.resolve('resolved'));
        });
      }, []);

      return null;
    }

    function Page({promise}) {
      const value = promise ? React.use(promise) : promise;

      const [ready, _setReady] = React.useState(false);
      setReady = _setReady;

      React.useMemo(() => {}, []);

      return (
        <>
          <React.Suspense fallback="Loading...">
            <ErrorBoundary>
              <Bomb />
            </ErrorBoundary>
          </React.Suspense>
          <span>{ready ? 'ready' : 'not-ready'}</span>
          <span>{value !== null ? value : 'hello world'}</span>
        </>
      );
    }

    function App() {
      const [promise, setPromise] = React.useState(null);

      return (
        <>
          <Updater setPromise={setPromise} />
          <Page promise={promise} />
        </>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
        onError(error) {
          Scheduler.log('onError: ' + error.message);
        },
      });
      pipe(writable);
    });
    assertLog(['onError: boom']);

    const errors = await hydrateRootAndCollectErrors(<App />);
    assertLog(['onCaughtError: boom']);

    expect(
      errors.find(error => error.includes('Rendered more hooks')),
    ).toBeUndefined();
    expect(container.textContent).toBe(
      'Something went wrong: boomreadyresolved',
    );
  });

  // The following tests characterize a loop in hydration mismatch recovery.
  // When the forced client render after a hydration mismatch suspends and
  // cannot commit, the dehydrated state persists on the current tree while
  // the ForceClientRender marker is discarded with the work-in-progress tree,
  // so the next ping re-attempts hydration and re-encounters the same
  // mismatch.

  function logRecoverableError(error) {
    // The full message contains a DEV-only diff, so log a stable marker.
    if (error.message.startsWith('Hydration failed because')) {
      Scheduler.log('onRecoverableError: Hydration failed');
    } else {
      Scheduler.log('onRecoverableError: ' + error.message.split('\n')[0]);
    }
  }

  it('re-encounters a shell hydration mismatch after a ping if the recovery render suspended', async () => {
    let isClient = false;

    let resolve;
    const clientPromise = new Promise(res => {
      resolve = res;
    });

    // A sibling before the mismatching host element. Renders in every pass
    // that reaches it: both hydration attempts and client renders. It is not
    // an ancestor of the mismatching element, so the component stack
    // collection that re-invokes function components never touches it.
    function Marker() {
      Scheduler.log('Marker');
      return null;
    }

    function SuspendingChild() {
      Scheduler.log('SuspendingChild');
      if (isClient) {
        React.use(clientPromise);
      }
      return 'data';
    }

    function App() {
      return (
        <div>
          <Marker />
          {isClient ? <b>client</b> : <span>server</span>}
          <SuspendingChild />
        </div>
      );
    }

    // Server render
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Marker', 'SuspendingChild']);
    expect(container.textContent).toBe('serverdata');

    isClient = true;

    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError: logRecoverableError,
      });
    });
    // The hydration attempt reaches the mismatch and throws, then the forced
    // client render suspends.
    assertLog(['Marker', 'Marker', 'SuspendingChild']);
    // Nothing committed; the SSR HTML is still in place.
    expect(container.textContent).toBe('serverdata');

    // Resolve the promise. The root is still dehydrated and the
    // ForceClientRender marker was discarded with the work-in-progress tree,
    // so the retry attempts hydration again and hits the mismatch again.
    await clientAct(async () => {
      resolve('Client');
    });
    assertLog([
      'Marker',
      'Marker',
      'SuspendingChild',
      'onRecoverableError: Hydration failed',
    ]);
    expect(container.textContent).toBe('clientdata');
  });

  it('re-encounters a shell hydration mismatch on every retry when the recovery suspends on uncached promises', async () => {
    let isClient = false;
    let suspendsRemaining = 0;

    function Marker() {
      Scheduler.log('Marker');
      return null;
    }

    function SuspendingChild() {
      Scheduler.log('SuspendingChild');
      if (isClient && suspendsRemaining > 0) {
        suspendsRemaining--;
        // Legacy-style thrown thenable (no `use` instrumentation, so the
        // shellSuspendCounter uncached-promise guard does not apply).
        // Pings on a microtask.
        const thenable = {
          then(resolvePromise) {
            Promise.resolve().then(() => resolvePromise());
          },
        };
        throw thenable;
      }
      return 'data';
    }

    function App() {
      return (
        <div>
          <Marker />
          {isClient ? <b>client</b> : <span>server</span>}
          <SuspendingChild />
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Marker', 'SuspendingChild']);
    expect(container.textContent).toBe('serverdata');

    isClient = true;
    // Artificially bounded so the test terminates. Without the bound this
    // loop never ends: each ping re-attempts hydration and re-encounters the
    // mismatch.
    suspendsRemaining = 3;

    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError: logRecoverableError,
      });
    });

    // Each cycle: hydration attempt (Marker, throw) then client render
    // (Marker, SuspendingChild, suspend). After 3 suspends the 4th client
    // render completes. If hydration were only attempted once, Marker would
    // appear twice in total instead of once per cycle.
    assertLog([
      // cycle 1: hydrate -> mismatch -> client render -> suspend
      'Marker',
      'Marker',
      'SuspendingChild',
      // cycle 2 (after ping): hydrate again -> mismatch again -> suspend
      'Marker',
      'Marker',
      'SuspendingChild',
      // cycle 3
      'Marker',
      'Marker',
      'SuspendingChild',
      // cycle 4
      'Marker',
      'Marker',
      'SuspendingChild',
      'onRecoverableError: Hydration failed',
    ]);
    expect(container.textContent).toBe('clientdata');
  });

  it('does not loop a boundary hydration mismatch once the fallback commits', async () => {
    let isClient = false;

    let resolve;
    const clientPromise = new Promise(res => {
      resolve = res;
    });

    function Marker() {
      Scheduler.log('Marker');
      return null;
    }

    function SuspendingChild() {
      Scheduler.log('SuspendingChild');
      if (isClient) {
        React.use(clientPromise);
      }
      return 'data';
    }

    function App() {
      return (
        <React.Suspense fallback={<div>loading</div>}>
          <Marker />
          {isClient ? <b>client</b> : <span>server</span>}
          <SuspendingChild />
        </React.Suspense>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Marker', 'SuspendingChild']);
    expect(container.textContent).toBe('serverdata');

    isClient = true;

    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError: logRecoverableError,
      });
    });
    // The boundary hydration attempt hits the mismatch, the forced client
    // render suspends, and the fallback is shown.
    assertLog([
      'Marker',
      'Marker',
      'SuspendingChild',
      'onRecoverableError: Hydration failed',
    ]);
    // The fallback committed, so the boundary is no longer dehydrated.
    expect(container.textContent).toBe('loading');

    await clientAct(async () => {
      resolve('Client');
    });
    // The retry renders the boundary's content without hydrating again:
    // no additional mismatch.
    assertLog(['Marker', 'SuspendingChild']);
    expect(container.textContent).toBe('clientdata');
  });

  it('re-encounters a shell hydration mismatch after a ping when hydrating inside a transition', async () => {
    let isClient = false;

    let resolve;
    const clientPromise = new Promise(res => {
      resolve = res;
    });

    function Marker() {
      Scheduler.log('Marker');
      return null;
    }

    function SuspendingChild() {
      Scheduler.log('SuspendingChild');
      if (isClient) {
        React.use(clientPromise);
      }
      return 'data';
    }

    function App() {
      return (
        <div>
          <Marker />
          {isClient ? <b>client</b> : <span>server</span>}
          <SuspendingChild />
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Marker', 'SuspendingChild']);

    isClient = true;

    await clientAct(async () => {
      startTransition(() => {
        ReactDOMClient.hydrateRoot(container, <App />, {
          onRecoverableError: logRecoverableError,
        });
      });
    });
    assertLog(['Marker', 'Marker', 'SuspendingChild']);
    expect(container.textContent).toBe('serverdata');

    await clientAct(async () => {
      resolve('Client');
    });
    assertLog([
      'Marker',
      'Marker',
      'SuspendingChild',
      'onRecoverableError: Hydration failed',
    ]);
    expect(container.textContent).toBe('clientdata');
  });

  it('re-encounters a boundary hydration mismatch while the fallback cannot commit', async () => {
    let isClient = false;

    let resolveContent;
    let resolveFallback;
    const contentPromise = new Promise(res => {
      resolveContent = res;
    });
    const fallbackPromise = new Promise(res => {
      resolveFallback = res;
    });

    function Marker() {
      Scheduler.log('Marker');
      return null;
    }

    function Content() {
      Scheduler.log('Content');
      if (isClient) {
        React.use(contentPromise);
      }
      return 'content-data';
    }

    function Fallback() {
      Scheduler.log('Fallback');
      if (isClient) {
        React.use(fallbackPromise);
      }
      return 'loading';
    }

    function App() {
      return (
        <React.Suspense fallback={<Fallback />}>
          <Marker />
          {isClient ? <b>client</b> : <span>server</span>}
          <Content />
        </React.Suspense>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['Marker', 'Content']);
    expect(container.textContent).toBe('servercontent-data');

    isClient = true;

    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError: logRecoverableError,
      });
    });
    // The boundary hydration attempt renders Marker and throws. The forced
    // client render renders Marker + Content, which suspends. The fallback
    // pass renders Fallback, which also suspends, so nothing commits and the
    // boundary stays dehydrated.
    assertLog(['Marker', 'Marker', 'Content', 'Fallback']);
    expect(container.textContent).toBe('servercontent-data');

    // Resolve the fallback first. Because nothing committed, the boundary is
    // still dehydrated, so the retry re-attempts hydration and hits the
    // mismatch again (the first 'Marker' below) before client rendering.
    await clientAct(async () => {
      resolveFallback();
    });
    assertLog([
      'Marker',
      'Marker',
      'Content',
      'Fallback',
      'onRecoverableError: Hydration failed',
    ]);
    expect(container.textContent).toBe('loading');

    await clientAct(async () => {
      resolveContent();
    });
    assertLog(['Marker', 'Content']);
    expect(container.textContent).toBe('clientcontent-data');
  });

  it('loops shell hydration mismatches with uncached use() until the shell suspend counter trips', async () => {
    let isClient = false;
    let suspendCount = 0;
    const uncaughtErrors = [];
    const recoverableErrors = [];

    function SuspendingChild() {
      if (isClient) {
        suspendCount++;
        // Uncached: a brand new thenable on every render. Pings on a
        // microtask, so the loop is driven by pings.
        React.use({
          then(resolvePromise) {
            Promise.resolve().then(() => resolvePromise());
          },
        });
      }
      return 'data';
    }

    function App() {
      return (
        <div>
          {isClient ? <b>client</b> : <span>server</span>}
          <SuspendingChild />
        </div>
      );
    }

    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(container.textContent).toBe('serverdata');

    isClient = true;

    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          recoverableErrors.push(error.message.split('\n')[0]);
        },
        onUncaughtError(error) {
          uncaughtErrors.push(error.message.split('\n')[0]);
        },
      });
    });

    // Each loop cycle suspends once during the forced client render. The
    // loop runs until shellSuspendCounter exceeds 100, i.e. hydration was
    // re-attempted more than a hundred times.
    expect(suspendCount).toBeGreaterThan(100);
    // The guard converts the loop into a fatal error that unmounts the root.
    expect(uncaughtErrors).toEqual([
      'An unknown Component is an async Client Component. Only Server ' +
        'Components can be async at the moment. This error is often caused ' +
        "by accidentally adding `'use client'` to a module that was " +
        'originally written for the server.',
    ]);
    // The mismatch errors are never delivered: every render that queued them
    // was discarded before committing.
    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toBe('');
  });
});
