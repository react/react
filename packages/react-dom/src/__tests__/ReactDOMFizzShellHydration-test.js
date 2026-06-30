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

  it('TODO: A large component stack causes SSR to stack overflow', async () => {
    spyOnDevAndProd(console, 'error').mockImplementation(() => {});

    function NestedComponent({depth}: {depth: number}) {
      if (depth <= 0) {
        return <AsyncText text="Shell" />;
      }
      return <NestedComponent depth={depth - 1} />;
    }

    // Server render
    await serverAct(async () => {
      ReactDOMFizzServer.renderToPipeableStream(
        <NestedComponent depth={3000} />,
      );
    });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0].toString()).toBe(
      'RangeError: Maximum call stack size exceeded',
    );
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

  it('handles conditional use with a cascading update and error boundaries (#33580)', async () => {
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

    // Server render
    await serverAct(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(<App />, {
        onError(error) {
          Scheduler.log('onError: ' + error.message);
        },
      });
      pipe(writable);
    });
    assertLog(['onError: boom']);

    const errors = [];
    await clientAct(async () => {
      ReactDOMClient.hydrateRoot(container, <App />, {
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

    assertLog(['onCaughtError: boom']);

    // The bug (#33580) manifested as "Rendered more hooks than during the
    // previous render" when a component calls use(thenable) conditionally after
    // hydration inside a Suspense boundary with an ErrorBoundary, combined with
    // a cascading transition update. The fix ensures the work-in-progress hook
    // chain is completed during unwind so that committing a Suspense fallback
    // does not corrupt the current fiber's hooks.
    const hooksError = errors.find(e => e.includes('Rendered more hooks'));
    expect(hooksError).toBeUndefined();
    expect(container.textContent).toBe('Something went wrong: boomresolved');
  });
});
