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

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

import {
  getVisibleChildren,
  insertNodesAndExecuteScripts,
} from '../test-utils/FizzTestUtils';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

let JSDOM;
let React;
let ReactDOMFizzServer;
let ReactDOMFizzStatic;
let Suspense;
let SuspenseList;
let container;
let serverAct;
let assertConsoleErrorDev;

describe('ReactDOMFizzStaticBrowser', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;

    // We need the mocked version of setTimeout inside the document.
    window.setTimeout = setTimeout;
    window.requestAnimationFrame = setTimeout;

    patchMessageChannel();
    serverAct = require('internal-test-utils').serverAct;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    React = require('react');
    ReactDOMFizzServer = require('react-dom/server.browser');
    ReactDOMFizzStatic = require('react-dom/static.browser');
    Suspense = React.Suspense;
    SuspenseList = React.unstable_SuspenseList;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (typeof global.window.__restoreGlobalScope === 'function') {
      global.window.__restoreGlobalScope();
    }
    document.body.removeChild(container);
  });

  const theError = new Error('This is an error');
  function Throw() {
    throw theError;
  }
  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
  }

  async function readContent(stream) {
    const reader = stream.getReader();
    let content = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return content;
      }
      content += Buffer.from(value).toString('utf8');
    }
  }

  async function readIntoContainer(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      result += Buffer.from(value).toString('utf8');
    }
    const temp = document.createElement('div');
    temp.innerHTML = result;
    await insertNodesAndExecuteScripts(temp, container, null);
    jest.runAllTimers();
  }

  async function readIntoNewDocument(stream) {
    const content = await readContent(stream);
    const jsdom = new JSDOM(
      // The Fizz runtime assumes requestAnimationFrame exists so we need to polyfill it.
      '<script>window.requestAnimationFrame = setTimeout;</script>' + content,
      {
        runScripts: 'dangerously',
      },
    );
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalNavigator = global.navigator;
    const originalNode = global.Node;
    const originalAddEventListener = global.addEventListener;
    const originalMutationObserver = global.MutationObserver;
    global.window = jsdom.window;
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    global.Node = global.window.Node;
    global.addEventListener = global.window.addEventListener;
    global.MutationObserver = global.window.MutationObserver;
    global.window.__restoreGlobalScope = () => {
      global.window = originalWindow;
      global.document = originalDocument;
      global.navigator = originalNavigator;
      global.Node = originalNode;
      global.addEventListener = originalAddEventListener;
      global.MutationObserver = originalMutationObserver;
    };
  }

  async function readIntoCurrentDocument(stream) {
    const content = await readContent(stream);
    const temp = document.createElement('div');
    temp.innerHTML = content;
    await insertNodesAndExecuteScripts(temp, document.body, null);
    jest.runAllTimers();
  }

  it('should call prerender', async () => {
    const result = await serverAct(() =>
      ReactDOMFizzStatic.prerender(<div>hello world</div>),
    );
    const prelude = await readContent(result.prelude);
    expect(prelude).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should emit DOCTYPE at the root of the document', async () => {
    const result = await serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <html>
          <body>hello world</body>
        </html>,
      ),
    );
    const prelude = await readContent(result.prelude);
    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(prelude).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head><link rel="expect" href="#_R_" blocking="render"/></head><body>hello world<template id="_R_"></template></body></html>"`,
      );
    } else {
      expect(prelude).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head></head><body>hello world</body></html>"`,
      );
    }
  });

  it('should emit bootstrap script src at the end', async () => {
    const result = await serverAct(() =>
      ReactDOMFizzStatic.prerender(<div>hello world</div>, {
        bootstrapScriptContent: 'INIT();',
        bootstrapScripts: ['init.js'],
        bootstrapModules: ['init.mjs'],
      }),
    );
    const prelude = await readContent(result.prelude);
    expect(prelude).toMatchInlineSnapshot(
      `"<link rel="preload" as="script" fetchPriority="low" href="init.js"/><link rel="modulepreload" fetchPriority="low" href="init.mjs"/><div>hello world</div><script id="_R_">INIT();</script><script src="init.js" async=""></script><script type="module" src="init.mjs" async=""></script>"`,
    );
  });

  it('emits all HTML as one unit', async () => {
    let hasLoaded = false;
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Wait() {
      if (!hasLoaded) {
        throw promise;
      }
      return 'Done';
    }
    const resultPromise = serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <div>
          <Suspense fallback="Loading">
            <Wait />
          </Suspense>
        </div>,
      ),
    );

    await jest.runAllTimers();

    // Resolve the loading.
    hasLoaded = true;
    await resolve();

    const result = await resultPromise;
    const prelude = await readContent(result.prelude);
    expect(prelude).toMatchInlineSnapshot(`"<div><!--$-->Done<!--/$--></div>"`);
  });

  it('should reject the promise when an error is thrown at the root', async () => {
    const reportedErrors = [];
    let caughtError = null;
    try {
      await serverAct(() =>
        ReactDOMFizzStatic.prerender(
          <div>
            <Throw />
          </div>,
          {
            onError(x) {
              reportedErrors.push(x);
            },
          },
        ),
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBe(theError);
    expect(reportedErrors).toEqual([theError]);
  });

  it('should reject the promise when an error is thrown inside a fallback', async () => {
    const reportedErrors = [];
    let caughtError = null;
    try {
      await serverAct(() =>
        ReactDOMFizzStatic.prerender(
          <div>
            <Suspense fallback={<Throw />}>
              <InfiniteSuspend />
            </Suspense>
          </div>,
          {
            onError(x) {
              reportedErrors.push(x);
            },
          },
        ),
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBe(theError);
    expect(reportedErrors).toEqual([theError]);
  });

  it('should not error the stream when an error is thrown inside suspense boundary', async () => {
    const reportedErrors = [];
    const result = await serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <div>
          <Suspense fallback={<div>Loading</div>}>
            <Throw />
          </Suspense>
        </div>,
        {
          onError(x) {
            reportedErrors.push(x);
          },
        },
      ),
    );

    const prelude = await readContent(result.prelude);
    expect(prelude).toContain('Loading');
    expect(reportedErrors).toEqual([theError]);
  });

  it('should be able to complete by aborting even if the promise never resolves', async () => {
    const errors = [];
    const controller = new AbortController();
    let resultPromise;
    await serverAct(() => {
      resultPromise = ReactDOMFizzStatic.prerender(
        <div>
          <Suspense fallback={<div>Loading</div>}>
            <InfiniteSuspend />
          </Suspense>
        </div>,
        {
          signal: controller.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      );
    });

    await serverAct(() => {
      controller.abort();
    });

    const result = await resultPromise;

    const prelude = await readContent(result.prelude);
    expect(prelude).toContain('Loading');

    expect(errors).toEqual(['This operation was aborted']);
  });

  it('should resolve an empty prelude if aborting before the shell is complete', async () => {
    const errors = [];
    const controller = new AbortController();
    const promise = serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <div>
          <InfiniteSuspend />
        </div>,
        {
          signal: controller.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      ),
    );

    await jest.runAllTimers();

    const theReason = new Error('aborted for reasons');
    await serverAct(() => {
      controller.abort(theReason);
    });

    let rejected = false;
    let prelude;
    try {
      ({prelude} = await promise);
    } catch (error) {
      rejected = true;
    }
    expect(rejected).toBe(false);
    expect(errors).toEqual(['aborted for reasons']);
    const content = await readContent(prelude);
    expect(content).toBe('');
  });

  it('should be able to abort before something suspends', async () => {
    const errors = [];
    const controller = new AbortController();
    function App() {
      controller.abort();
      return (
        <Suspense fallback={<div>Loading</div>}>
          <InfiniteSuspend />
        </Suspense>
      );
    }
    const streamPromise = serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <div>
          <App />
        </div>,
        {
          signal: controller.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      ),
    );

    const {prelude} = await streamPromise;
    const content = await readContent(prelude);
    expect(errors).toEqual(['This operation was aborted']);
    expect(content).toBe('');
  });

  it('reports the abort reason if a task suspends after aborting a prerender', async () => {
    const promise = new Promise(() => {});
    const errors = [];
    const controller = new AbortController();
    function App() {
      controller.abort(new Error('abort reason'));
      React.use(promise);
      return null;
    }

    const result = await serverAct(() =>
      ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(error) {
          errors.push(error.message);
        },
      }),
    );

    expect(errors).toEqual(['abort reason']);
    expect(await readContent(result.prelude)).toBe('');
  });

  it('should resolve an empty prelude if passing an already aborted signal', async () => {
    const errors = [];
    const controller = new AbortController();
    const theReason = new Error('aborted for reasons');
    controller.abort(theReason);

    const promise = serverAct(() =>
      ReactDOMFizzStatic.prerender(
        <div>
          <Suspense fallback={<div>Loading</div>}>
            <InfiniteSuspend />
          </Suspense>
        </div>,
        {
          signal: controller.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      ),
    );

    // Technically we could still continue rendering the shell but currently the
    // semantics mean that we also abort any pending CPU work.
    let didThrow = false;
    let prelude;
    try {
      ({prelude} = await promise);
    } catch (error) {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
    expect(errors).toEqual(['aborted for reasons']);
    const content = await readContent(prelude);
    expect(content).toBe('');
  });

  it('supports custom abort reasons with a string', async () => {
    const promise = new Promise(r => {});
    function Wait() {
      throw promise;
    }
    function App() {
      return (
        <div>
          <p>
            <Suspense fallback={'p'}>
              <Wait />
            </Suspense>
          </p>
          <span>
            <Suspense fallback={'span'}>
              <Wait />
            </Suspense>
          </span>
        </div>
      );
    }

    const errors = [];
    const controller = new AbortController();
    let resultPromise;
    await serverAct(() => {
      resultPromise = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x);
          return 'a digest';
        },
      });
    });

    await serverAct(() => {
      controller.abort('foobar');
    });

    await resultPromise;

    expect(errors).toEqual(['foobar', 'foobar']);
  });

  it('supports custom abort reasons with an Error', async () => {
    const promise = new Promise(r => {});
    function Wait() {
      throw promise;
    }
    function App() {
      return (
        <div>
          <p>
            <Suspense fallback={'p'}>
              <Wait />
            </Suspense>
          </p>
          <span>
            <Suspense fallback={'span'}>
              <Wait />
            </Suspense>
          </span>
        </div>
      );
    }

    const errors = [];
    const controller = new AbortController();
    let resultPromise;
    await serverAct(() => {
      resultPromise = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
          return 'a digest';
        },
      });
    });

    await serverAct(() => {
      controller.abort(new Error('uh oh'));
    });

    await resultPromise;

    expect(errors).toEqual(['uh oh', 'uh oh']);
  });

  it('uses a rejection reason when an abort listener rejects pending work before the abort finishes', async () => {
    let reject;
    const rejectedPromise = new Promise((resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const haltedPromise = new Promise(() => {});
    function RejectedWait() {
      React.use(rejectedPromise);
      return null;
    }
    function HaltedWait() {
      React.use(haltedPromise);
      return null;
    }

    const errors = [];
    const controller = new AbortController();
    let resultPromise;
    await serverAct(() => {
      resultPromise = ReactDOMFizzStatic.prerender(
        <>
          <Suspense fallback="Loading rejected">
            <RejectedWait />
          </Suspense>
          <Suspense fallback="Loading halted">
            <HaltedWait />
          </Suspense>
        </>,
        {
          signal: controller.signal,
          onError(error) {
            errors.push(error.message);
          },
        },
      );
    });

    controller.signal.addEventListener('abort', () => {
      reject(new Error('rejected during abort'));
    });
    await serverAct(() => {
      controller.abort(new Error('abort reason'));
    });
    await resultPromise;

    expect(errors).toEqual(['rejected during abort', 'abort reason']);
  });

  it('logs an error if onHeaders throws but continues the prerender', async () => {
    const errors = [];
    function onError(error) {
      errors.push(error.message);
    }

    function onHeaders(x) {
      throw new Error('bad onHeaders');
    }

    const prerendered = await serverAct(() =>
      ReactDOMFizzStatic.prerender(<div>hello</div>, {
        onHeaders,
        onError,
      }),
    );
    expect(prerendered.postponed).toBe(null);
    expect(errors).toEqual(['bad onHeaders']);

    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>hello</div>);
  });

  it('can resume render of a prerender', async () => {
    const errors = [];

    let resolveA;
    const promiseA = new Promise(r => (resolveA = r));
    let resolveB;
    const promiseB = new Promise(r => (resolveB = r));

    async function ComponentA() {
      await promiseA;
      return (
        <Suspense fallback="Loading B">
          <ComponentB />
        </Suspense>
      );
    }

    async function ComponentB() {
      await promiseB;
      return 'Hello';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading A">
            <ComponentA />
          </Suspense>
        </div>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      });
    });

    await serverAct(() => {
      controller.abort();
    });
    const prerendered = await pendingResult;
    const postponedState = JSON.stringify(prerendered.postponed);

    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading A</div>);

    await resolveA();

    expect(prerendered.postponed).not.toBe(null);

    const controller2 = new AbortController();
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.resumeAndPrerender(
        <App />,
        JSON.parse(postponedState),
        {
          signal: controller2.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      );
    });

    await serverAct(() => {
      controller2.abort();
    });

    const prerendered2 = await pendingResult;
    const postponedState2 = JSON.stringify(prerendered2.postponed);

    await readIntoContainer(prerendered2.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading B</div>);

    await resolveB();

    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState2)),
    );

    await readIntoContainer(dynamic);
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);
  });

  it('can abort while replaying a prerendered tree', async () => {
    const promise = new Promise(() => {});
    let prerendering = true;
    const resumeController = new AbortController();

    function AbortDuringReplay({children}) {
      if (!prerendering) {
        resumeController.abort('resume abort');
      }
      return children;
    }

    function Wait() {
      return prerendering ? React.use(promise) : 'Hello';
    }

    function App() {
      return (
        <div>
          <AbortDuringReplay>
            <Suspense fallback="Loading 1...">
              <Wait />
            </Suspense>
          </AbortDuringReplay>
        </div>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    await serverAct(() => {
      controller.abort('prerender abort');
    });
    const prerendered = await pendingResult;

    prerendering = false;
    const errors = [];
    await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
        {
          signal: resumeController.signal,
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );

    expect(errors).toEqual(['resume abort']);
  });

  it('can abort and suspend while replaying a prerendered tree', async () => {
    const promise = new Promise(() => {});
    let prerendering = true;
    const resumeController = new AbortController();

    function AbortDuringReplay({children}) {
      if (!prerendering) {
        resumeController.abort('resume abort');
        React.use(promise);
      }
      return children;
    }

    function Wait() {
      return React.use(promise);
    }

    function App() {
      return (
        <div>
          <AbortDuringReplay>
            <Suspense fallback="Loading...">
              <Wait />
            </Suspense>
          </AbortDuringReplay>
        </div>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    await serverAct(() => {
      controller.abort('prerender abort');
    });
    const prerendered = await pendingResult;

    prerendering = false;
    const errors = [];
    await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
        {
          signal: resumeController.signal,
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );

    expect(errors).toEqual(['resume abort']);
  });

  it('can abort while rendering a resumed segment', async () => {
    const promise = new Promise(() => {});
    let prerendering = true;
    const resumeController = new AbortController();

    function Wait() {
      if (prerendering) {
        return React.use(promise);
      }
      resumeController.abort('resume abort');
      return 'Hello';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Wait />
          </Suspense>
        </div>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    await serverAct(() => {
      controller.abort('prerender abort');
    });
    const prerendered = await pendingResult;

    prerendering = false;
    const errors = [];
    await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
        {
          signal: resumeController.signal,
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );

    expect(errors).toEqual(['resume abort']);
  });

  [false, true].forEach(retryRootChild => {
    it(`retries the whole root after a synchronous abort ${
      retryRootChild ? 'in a retried task' : 'during the initial render'
    }`, async () => {
      const controller = new AbortController();
      let prerendering = true;
      let resolve;
      const promise = new Promise(r => (resolve = r));

      function Abort() {
        if (prerendering) {
          controller.abort('root abort');
        }
        return 'Child';
      }

      function Content() {
        if (retryRootChild) {
          React.use(promise);
        }
        return (
          <section>
            Before
            <Abort />
            <span>After</span>
          </section>
        );
      }

      function App() {
        return (
          <main>
            <Content />
          </main>
        );
      }

      let pendingResult;
      await serverAct(() => {
        pendingResult = ReactDOMFizzStatic.prerender(<App />, {
          signal: controller.signal,
          onError() {},
        });
      });
      if (retryRootChild) {
        await serverAct(() => resolve());
      }
      const prerendered = await pendingResult;

      expect(prerendered.postponed).not.toBe(null);
      expect(await readContent(prerendered.prelude)).toBe('');

      prerendering = false;
      const resumed = await serverAct(() =>
        ReactDOMFizzServer.resume(
          <App />,
          JSON.parse(JSON.stringify(prerendered.postponed)),
        ),
      );
      await readIntoContainer(resumed);
      expect(getVisibleChildren(container)).toEqual(
        <main>
          <section>{['Before', 'Child', <span>After</span>]}</section>
        </main>,
      );
    });
  });

  it('retries the whole root after a resumed prerender aborts synchronously', async () => {
    const controllers = [new AbortController(), new AbortController()];
    let stage = 0;
    let postponed;

    function Abort() {
      if (stage < 2) {
        controllers[stage].abort('root abort');
      }
      return 'Child';
    }

    function App() {
      return (
        <main>
          <section>
            Before
            <Abort />
            <span>After</span>
          </section>
        </main>
      );
    }

    for (let pass = 0; pass < 2; pass++) {
      stage = pass;
      const options = {
        signal: controllers[pass].signal,
        onError() {},
      };
      const result = await serverAct(() =>
        pass === 0
          ? ReactDOMFizzStatic.prerender(<App />, options)
          : ReactDOMFizzStatic.resumeAndPrerender(<App />, postponed, options),
      );
      expect(result.postponed).not.toBe(null);
      expect(await readContent(result.prelude)).toBe('');
      postponed = JSON.parse(JSON.stringify(result.postponed));
    }

    stage = 2;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, postponed),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <main>
        <section>{['Before', 'Child', <span>After</span>]}</section>
      </main>,
    );
  });

  it('preserves parent markup when a retried task aborts synchronously', async () => {
    let resolve;
    const promise = new Promise(r => (resolve = r));
    let prerendering = true;
    const controller = new AbortController();

    function Abort() {
      if (prerendering) {
        controller.abort();
      }
      return 'World';
    }

    function Content() {
      React.use(promise);
      return (
        <section>
          <span>Hello</span>
          <Abort />
        </section>
      );
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Content />
          </Suspense>
        </div>
      );
    }

    const errors = [];
    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(error) {
          errors.push(error.message);
        },
      });
    });
    await serverAct(() => resolve());
    const prerendered = await pendingResult;

    expect(errors).toEqual(['This operation was aborted']);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );

    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <section>
          <span>Hello</span>World
        </section>
      </div>,
    );
  });

  it('resumes after one child suspends and another aborts the prerender', async () => {
    const never = new Promise(() => {});
    const controller = new AbortController();
    let prerendering = true;

    function Pending() {
      if (prerendering) {
        React.use(never);
      }
      return 'First';
    }

    function Abort() {
      if (prerendering) {
        controller.abort('prerender abort');
      }
      return 'Second';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Pending />
            <Abort />
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;

    expect(prerendered.postponed).not.toBe(null);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <div>{['First', 'Second']}</div>,
    );
  });

  it('resumes an aborted prerender with children in a component', async () => {
    const never = new Promise(() => {});
    const controller = new AbortController();
    let prerendering = true;

    function Pending() {
      if (prerendering) {
        React.use(never);
      }
      return 'First';
    }

    function Abort() {
      if (prerendering) {
        controller.abort('prerender abort');
      }
      return 'Second';
    }

    function Content() {
      return (
        <>
          <Pending />
          <Abort />
        </>
      );
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Content />
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;

    expect(prerendered.postponed).not.toBe(null);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <div>{['First', 'Second']}</div>,
    );
  });

  it('keeps static children but discards user code results after a synchronous abort', async () => {
    const controller = new AbortController();
    const Context = React.createContext(null);
    let prerendering = true;
    let hostCoercions = 0;

    function Abort() {
      if (prerendering) {
        controller.abort('prerender abort');
      }
      return 'Abort';
    }

    function Later() {
      return prerendering ? 'Too early' : 'Later';
    }

    function Content() {
      const iterable = {
        [Symbol.iterator]() {
          let done = false;
          return {
            next() {
              if (done) {
                return {done: true};
              }
              done = true;
              return {
                done: false,
                value: prerendering ? 'Iterable too early' : 'Iterable',
              };
            },
          };
        },
      };
      const thenable = {
        then(resolve) {
          resolve(prerendering ? 'Thenable too early' : 'Thenable');
        },
      };
      const children = [
        <Abort key="abort" />,
        'Middle',
        <span
          key="host"
          title={{
            toString() {
              hostCoercions++;
              return 'host';
            },
          }}>
          Host
        </span>,
        <Later key="later" />,
        <Context.Consumer key="consumer">
          {() => (prerendering ? 'Consumer too early' : 'Consumer')}
        </Context.Consumer>,
        iterable,
        thenable,
      ];
      return <section>{children}</section>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Content />
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;

    expect(hostCoercions).toBeGreaterThan(0);
    expect(prerendered.postponed).not.toBe(null);
    await readIntoContainer(prerendered.prelude);
    expect(container.innerHTML.toLowerCase()).not.toContain('too early');
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <section>
          {[
            'Abort',
            'Middle',
            <span title="host">Host</span>,
            'Later',
            'Consumer',
            'Iterable',
            'Thenable',
          ]}
        </section>
      </div>,
    );
  });

  it('resumes an aborting iterable returned by a component', async () => {
    const controller = new AbortController();
    let prerendering = true;
    const iterable = {
      [Symbol.iterator]() {
        let done = false;
        return {
          next() {
            if (done) {
              return {done: true};
            }
            done = true;
            if (prerendering) {
              controller.abort('iterator abort');
            }
            return {
              done: false,
              value: prerendering ? (
                <span key="child">Too early</span>
              ) : (
                <span key="child">After</span>
              ),
            };
          },
        };
      },
    };

    function Child() {
      return iterable;
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <section>
              Before
              <Child />
              End
            </section>
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(await readContent(prerendered.prelude)).not.toContain('Too early');
    expect(prerendered.postponed).not.toBe(null);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    expect(await readContent(resumed)).toContain('After');
  });

  // @gate enableAsyncIterableChildren
  it('postpones an async iterable child when its iterator aborts synchronously', async () => {
    const controller = new AbortController();
    let prerendering = true;
    const resolvedStep = step => ({
      then(resolve) {
        resolve(step);
      },
    });
    const iterable = {
      [Symbol.asyncIterator]() {
        let done = false;
        return {
          next() {
            if (done) {
              return resolvedStep({done: true});
            }
            done = true;
            if (prerendering) {
              controller.abort('async iterator abort');
            }
            return resolvedStep({
              done: false,
              value: prerendering ? 'Too early' : 'After',
            });
          },
        };
      },
    };

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">{iterable}</Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(await readContent(prerendered.prelude)).not.toContain('Too early');
    expect(prerendered.postponed).not.toBe(null);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    expect(await readContent(resumed)).toContain('After');
  });

  it('postpones a thenable child when it aborts while resolving', async () => {
    const controller = new AbortController();
    let prerendering = true;

    function App() {
      const thenable = {
        then(resolve) {
          if (prerendering) {
            controller.abort('thenable abort');
          }
          resolve(prerendering ? 'Too early' : 'After');
        },
      };
      return (
        <div>
          <Suspense fallback="Loading...">{thenable}</Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(await readContent(prerendered.prelude)).not.toContain('Too early');
    expect(prerendered.postponed).not.toBe(null);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    expect(await readContent(resumed)).toContain('After');
  });

  it('postpones a forwardRef when its render function aborts', async () => {
    const controller = new AbortController();
    let prerendering = true;
    const Forwarded = React.forwardRef(function Forwarded() {
      if (prerendering) {
        controller.abort('forwardRef abort');
      }
      return prerendering ? 'Too early' : 'After';
    });

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Forwarded />
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(await readContent(prerendered.prelude)).not.toContain('Too early');
    expect(prerendered.postponed).not.toBe(null);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    expect(await readContent(resumed)).toContain('After');
  });

  it('discards render-phase updates after an abort', async () => {
    const controller = new AbortController();
    let prerendering = true;

    function Abort() {
      const [value, setValue] = React.useState(0);
      if (prerendering && value === 0) {
        setValue(1);
      } else if (prerendering && value === 1) {
        controller.abort('render-phase abort');
        setValue(2);
      }
      return 'After';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <section>
              Before
              <Abort />
            </section>
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(prerendered.postponed).not.toBe(null);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <section>{['Before', 'After']}</section>
      </div>,
    );
  });

  it('unwinds an abort in a nested Suspense fallback', async () => {
    const never = new Promise(() => {});
    const controller = new AbortController();
    let prerendering = true;
    let postAbortRenders = 0;

    function Pending() {
      if (prerendering) {
        React.use(never);
      }
      return 'Content';
    }

    function AfterAbort() {
      if (prerendering) {
        postAbortRenders++;
      }
      return 'Inner fallback';
    }

    const FallbackAbort = React.forwardRef(function FallbackAbort() {
      if (prerendering) {
        controller.abort('fallback abort');
      }
      return <AfterAbort />;
    });

    function App() {
      return (
        <div>
          <Suspense fallback="Outer fallback">
            <Suspense fallback={<FallbackAbort />}>
              <Pending />
            </Suspense>
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError() {},
      });
    });
    const prerendered = await pendingResult;
    expect(prerendered.postponed).not.toBe(null);
    expect(postAbortRenders).toBe(0);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Outer fallback</div>);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
      ),
    );
    await readIntoContainer(resumed);
    expect(getVisibleChildren(container)).toEqual(<div>Content</div>);
  });

  it('can postpone the same boundary across repeated prerenders', async () => {
    const never = new Promise(() => {});
    const errors = [];
    let ready = false;
    let postponed;

    function Wait() {
      if (!ready) {
        React.use(never);
      }
      return 'Hello';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Wait />
          </Suspense>
        </div>
      );
    }

    for (let pass = 0; pass < 2; pass++) {
      const controller = new AbortController();
      const options = {
        signal: controller.signal,
        onError(error) {
          errors.push(error);
        },
      };
      let pendingResult;
      await serverAct(() => {
        pendingResult =
          pass === 0
            ? ReactDOMFizzStatic.prerender(<App />, options)
            : ReactDOMFizzStatic.resumeAndPrerender(
                <App />,
                postponed,
                options,
              );
      });
      await serverAct(() => controller.abort(`abort ${pass}`));
      const result = await pendingResult;
      expect(result.postponed).not.toBe(null);
      await readIntoContainer(result.prelude);
      expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
      postponed = JSON.parse(JSON.stringify(result.postponed));
    }

    expect(errors).toEqual(['abort 0', 'abort 1']);
    ready = true;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, postponed, {
        onError(error) {
          errors.push(error);
        },
      }),
    );
    await readIntoContainer(resumed);
    expect(errors).toEqual(['abort 0', 'abort 1']);
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);
    expect(container.querySelector('template')).toBe(null);
  });

  [false, true].forEach(completedAncestor => {
    it(`preserves an earlier resumed boundary when a sibling aborts ${
      completedAncestor ? 'under a completed Suspense ancestor' : 'at the root'
    }`, async () => {
      const never = new Promise(() => {});
      const firstController = new AbortController();
      const secondController = new AbortController();
      let stage = 0;

      function First() {
        if (stage === 0) {
          React.use(never);
        }
        return <article>First</article>;
      }

      function Second() {
        if (stage === 0) {
          React.use(never);
        }
        if (stage === 1) {
          secondController.abort('second abort');
        }
        return <section>Second</section>;
      }

      function App() {
        const content = (
          <>
            <Suspense fallback={<p>First loading</p>}>
              <First />
            </Suspense>
            <Suspense fallback={<p>Second loading</p>}>
              <Second />
            </Suspense>
          </>
        );
        return (
          <main>
            {completedAncestor ? (
              <Suspense fallback="Outer loading">{content}</Suspense>
            ) : (
              content
            )}
          </main>
        );
      }

      let pendingResult;
      await serverAct(() => {
        pendingResult = ReactDOMFizzStatic.prerender(<App />, {
          signal: firstController.signal,
          onError() {},
        });
      });
      await serverAct(() => firstController.abort('first abort'));
      const initial = await pendingResult;
      expect(initial.postponed).not.toBe(null);
      await readIntoContainer(initial.prelude);
      expect(getVisibleChildren(container)).toEqual(
        <main>
          <p>First loading</p>
          <p>Second loading</p>
        </main>,
      );

      stage = 1;
      const second = await serverAct(() =>
        ReactDOMFizzStatic.resumeAndPrerender(
          <App />,
          JSON.parse(JSON.stringify(initial.postponed)),
          {
            signal: secondController.signal,
            onError() {},
          },
        ),
      );
      expect(second.postponed).not.toBe(null);
      await readIntoContainer(second.prelude);
      expect(getVisibleChildren(container)).toEqual(
        <main>
          <article>First</article>
          <p>Second loading</p>
        </main>,
      );

      stage = 2;
      const resumed = await serverAct(() =>
        ReactDOMFizzServer.resume(
          <App />,
          JSON.parse(JSON.stringify(second.postponed)),
        ),
      );
      await readIntoContainer(resumed);
      expect(getVisibleChildren(container)).toEqual(
        <main>
          <article>First</article>
          <section>Second</section>
        </main>,
      );
      expect(container.querySelector('template')).toBe(null);
    });
  });

  it('can resume after a resumed prerender aborts again', async () => {
    const never = new Promise(() => {});
    const firstController = new AbortController();
    const secondController = new AbortController();
    let stage = 0;
    const errors = [];

    function Pending() {
      if (stage < 2) {
        React.use(never);
      }
      return 'First';
    }

    function AbortFirst() {
      if (stage === 0) {
        firstController.abort('first abort');
      }
      return 'Second';
    }

    function AbortSecond() {
      if (stage === 1) {
        secondController.abort('second abort');
      }
      return 'Third';
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <section>
              Before
              <Pending />
              <AbortFirst />
              <AbortSecond />
              After
            </section>
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: firstController.signal,
        onError(error) {
          errors.push(error);
        },
      });
    });
    const first = await pendingResult;
    expect(first.postponed).not.toBe(null);
    expect(errors).toContain('first abort');
    expect(errors.every(error => error === 'first abort')).toBe(true);
    await readIntoContainer(first.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    expect(container.querySelector('section').textContent).toBe('BeforeAfter');

    stage = 1;
    errors.length = 0;
    let resumedResult;
    let resumedResultSettled = false;
    await serverAct(() => {
      resumedResult = ReactDOMFizzStatic.resumeAndPrerender(
        <App />,
        JSON.parse(JSON.stringify(first.postponed)),
        {
          signal: secondController.signal,
          onError(error) {
            errors.push(error);
          },
        },
      );
      resumedResult.then(
        () => (resumedResultSettled = true),
        () => (resumedResultSettled = true),
      );
    });
    expect(resumedResultSettled).toBe(true);
    const second = await resumedResult;
    expect(errors).toContain('second abort');
    expect(errors.every(error => error === 'second abort')).toBe(true);
    expect(second.postponed).not.toBe(null);
    await readIntoContainer(second.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    expect(container.querySelector('section').textContent).toBe(
      'BeforeSecondAfter',
    );

    stage = 2;
    errors.length = 0;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(second.postponed)),
        {
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );
    await readIntoContainer(resumed);
    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <section>{['Before', 'First', 'Second', 'Third', 'After']}</section>
      </div>,
    );
    expect(container.querySelector('template')).toBe(null);
  });

  ['forwards', 'backwards', 'together'].forEach(revealOrder => {
    [true, false].forEach(abortBeforeList => {
      // @gate enableSuspenseList
      it(`preserves static ${revealOrder} SuspenseList rows when aborting ${
        abortBeforeList ? 'before the list' : 'inside a row'
      }`, async () => {
        const controller = new AbortController();
        let prerendering = true;

        function Abort() {
          if (prerendering) {
            controller.abort('list abort');
          }
          return 'Aborted';
        }

        function Dynamic({text}) {
          return text;
        }

        function Content() {
          return (
            <section>
              {abortBeforeList ? <Abort /> : null}
              <SuspenseList revealOrder={revealOrder}>
                <span key="first" data-row="first">
                  First
                  <Dynamic text=" one" />
                </span>
                <span key="second" data-row="second">
                  Second{abortBeforeList ? null : <Abort />}
                </span>
                <span key="third" data-row="third">
                  Third
                  <Dynamic text=" three" />
                </span>
              </SuspenseList>
            </section>
          );
        }

        function App() {
          return (
            <div>
              <Suspense fallback="Loading...">
                <Content />
              </Suspense>
            </div>
          );
        }

        let pendingResult;
        await serverAct(() => {
          pendingResult = ReactDOMFizzStatic.prerender(<App />, {
            signal: controller.signal,
            onError() {},
          });
        });
        const prerendered = await pendingResult;
        expect(prerendered.postponed).not.toBe(null);
        await readIntoContainer(prerendered.prelude);
        expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
        expect(container.textContent).not.toContain('Aborted');
        expect(container.querySelector('[data-row="first"]').textContent).toBe(
          abortBeforeList ? 'First' : 'First one',
        );
        expect(container.querySelector('[data-row="second"]').textContent).toBe(
          'Second',
        );
        expect(container.querySelector('[data-row="third"]').textContent).toBe(
          'Third',
        );

        prerendering = false;
        const resumed = await serverAct(() =>
          ReactDOMFizzServer.resume(
            <App />,
            JSON.parse(JSON.stringify(prerendered.postponed)),
          ),
        );
        await readIntoContainer(resumed);
        const expectedRows = [
          <span data-row="first">{['First', ' one']}</span>,
          <span data-row="second">
            {abortBeforeList ? 'Second' : ['Second', 'Aborted']}
          </span>,
          <span data-row="third">{['Third', ' three']}</span>,
        ];
        if (revealOrder === 'backwards') {
          expectedRows.reverse();
        }
        if (abortBeforeList) {
          expectedRows.unshift('Aborted');
        }
        expect(getVisibleChildren(container)).toEqual(
          <div>
            <section>{expectedRows}</section>
          </div>,
        );
      });
    });
  });

  ['forwards', 'backwards', 'together'].forEach(revealOrder => {
    // @gate enableSuspenseList
    it(`settles an abort in a ${revealOrder} SuspenseList row`, async () => {
      let resolveGate;
      const gate = new Promise(resolve => (resolveGate = resolve));
      const controller = new AbortController();
      let prerendering = true;

      function Abort() {
        if (prerendering) {
          controller.abort('row abort');
        }
        return 'Fallback';
      }

      function Content() {
        React.use(gate);
        return (
          <SuspenseList revealOrder={revealOrder}>
            <Suspense key="one" fallback={<Abort />}>
              First
            </Suspense>
            <Suspense key="two" fallback="SecondFallback">
              Second
            </Suspense>
          </SuspenseList>
        );
      }

      function App() {
        return (
          <div>
            <Suspense fallback="Loading...">
              <Content />
            </Suspense>
          </div>
        );
      }

      let pendingResult;
      await serverAct(() => {
        pendingResult = ReactDOMFizzStatic.prerender(<App />, {
          signal: controller.signal,
          onError() {},
        });
      });
      await serverAct(() => resolveGate());
      const prerendered = await pendingResult;
      expect(prerendered.postponed).not.toBe(null);

      prerendering = false;
      const resumed = await serverAct(() =>
        ReactDOMFizzServer.resume(
          <App />,
          JSON.parse(JSON.stringify(prerendered.postponed)),
        ),
      );
      await readIntoContainer(prerendered.prelude);
      await readIntoContainer(resumed);
      expect(container.querySelector('div').textContent).toBe(
        revealOrder === 'backwards' ? 'SecondFirst' : 'FirstSecond',
      );
    });
  });

  it('resumes a retried array child after its child suspends and another aborts', async () => {
    const never = new Promise(() => {});
    let resolveGate;
    const gate = new Promise(resolve => (resolveGate = resolve));
    const controller = new AbortController();
    let prerendering = true;
    const errors = [];

    function Pending() {
      if (prerendering) {
        React.use(never);
      }
      return 'First';
    }

    function OutsidePending() {
      if (prerendering) {
        React.use(never);
      }
      return 'Outside';
    }

    function Outside() {
      return <OutsidePending />;
    }

    function Abort() {
      if (prerendering) {
        controller.abort('array child abort');
      }
      return 'Second';
    }

    function Gate() {
      React.use(gate);
      return (
        <>
          <Pending />
          <Abort />
        </>
      );
    }

    function App() {
      return (
        <div id="result">
          <Suspense fallback="Loading...">
            <span>Prefix</span>
            <Outside />
            <Gate key="gate" />
            <span>Suffix</span>
          </Suspense>
        </div>
      );
    }

    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(error) {
          errors.push(error);
        },
      });
    });
    await serverAct(() => resolveGate());
    const prerendered = await pendingResult;
    expect(prerendered.postponed).not.toBe(null);
    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(
      <div id="result">Loading...</div>,
    );

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
        {
          onError(error) {
            errors.push(error);
          },
        },
      ),
    );
    await readIntoContainer(resumed);
    expect(container.querySelector('#result').textContent).toBe(
      'PrefixOutsideFirstSecondSuffix',
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every(error => error === 'array child abort')).toBe(true);
  });

  it('can prerender a preamble', async () => {
    const errors = [];

    let resolveA;
    const promiseA = new Promise(r => (resolveA = r));
    let resolveB;
    const promiseB = new Promise(r => (resolveB = r));

    async function ComponentA() {
      await promiseA;
      return (
        <Suspense fallback="Loading B">
          <ComponentB />
        </Suspense>
      );
    }

    async function ComponentB() {
      await promiseB;
      return 'Hello';
    }

    function App() {
      return (
        <Suspense>
          <html data-x="">
            <body data-x="">
              <Suspense fallback="Loading A">
                <ComponentA />
              </Suspense>
            </body>
          </html>
        </Suspense>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      });
    });

    await serverAct(() => {
      controller.abort();
    });

    const prerendered = await pendingResult;
    const postponedState = JSON.stringify(prerendered.postponed);

    await readIntoNewDocument(prerendered.prelude);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head />
        <body data-x="">Loading A</body>
      </html>,
    );
    if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
      assertConsoleErrorDev([
        'React encountered an empty buffer when writing in an environment that does not support ArrayBuffer.prototype.detached. ' +
          'This could be a security issue if the buffer was not actually empty. ' +
          'Please use a modern browser that supports ArrayBuffer.prototype.detached.',
      ]);
    }

    await resolveA();

    expect(prerendered.postponed).not.toBe(null);

    const controller2 = new AbortController();
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.resumeAndPrerender(
        <App />,
        JSON.parse(postponedState),
        {
          signal: controller2.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      );
    });

    await serverAct(() => {
      controller2.abort();
    });

    const prerendered2 = await pendingResult;
    const postponedState2 = JSON.stringify(prerendered2.postponed);

    await readIntoCurrentDocument(prerendered2.prelude);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head />
        <body data-x="">Loading B</body>
      </html>,
    );

    await resolveB();

    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState2)),
    );

    await readIntoCurrentDocument(dynamic);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head />
        <body data-x="">Hello</body>
      </html>,
    );
  });

  it('can suspend inside <head> tag', async () => {
    const promise = new Promise(() => {});

    function App() {
      return (
        <html>
          <head>
            <Suspense fallback={<meta itemProp="" content="fallback" />}>
              <Metadata />
            </Suspense>
          </head>
          <body>
            <div>hello</div>
          </body>
        </html>
      );
    }

    function Metadata() {
      React.use(promise);
      return <meta itemProp="" content="primary" />;
    }

    const controller = new AbortController();
    let pendingResult;
    const errors = [];
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError: e => {
          errors.push(e.message);
        },
      });
    });

    await serverAct(() => {
      controller.abort(new Error('boom'));
    });

    const prerendered = await pendingResult;

    await readIntoNewDocument(prerendered.prelude);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="" content="fallback" />
        </head>
        <body>
          <div>hello</div>
        </body>
      </html>,
    );

    expect(errors).toEqual(['boom']);
    if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
      assertConsoleErrorDev([
        'React encountered an empty buffer when writing in an environment that does not support ArrayBuffer.prototype.detached. ' +
          'This could be a security issue if the buffer was not actually empty. ' +
          'Please use a modern browser that supports ArrayBuffer.prototype.detached.',
      ]);
    }
  });

  it('will render fallback Document when erroring a boundary above the body', async () => {
    let isPrerendering = true;
    const promise = new Promise(() => {});

    function Boom() {
      if (isPrerendering) {
        React.use(promise);
      }
      throw new Error('Boom!');
    }

    function App() {
      return (
        <Suspense
          fallback={
            <html data-error-html="">
              <body data-error-body="">
                <span>hello error</span>
              </body>
            </html>
          }>
          <html data-content-html="">
            <body data-content-body="">
              <Boom />
              <span>hello world</span>
            </body>
          </html>
        </Suspense>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    const errors = [];
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError: e => {
          errors.push(e.message);
        },
      });
    });

    await serverAct(() => {
      controller.abort();
    });

    const prerendered = await pendingResult;

    expect(errors).toEqual(['This operation was aborted']);
    const content = await readContent(prerendered.prelude);
    expect(content).toBe('');

    isPrerendering = false;
    const postponedState = JSON.stringify(prerendered.postponed);

    const resumeErrors = [];
    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState), {
        onError: e => {
          resumeErrors.push(e.message);
        },
      }),
    );

    expect(resumeErrors).toEqual(['Boom!']);
    await readIntoNewDocument(dynamic);

    expect(getVisibleChildren(document)).toEqual(
      <html data-error-html="">
        <head />
        <body data-error-body="">
          <span>hello error</span>
        </body>
      </html>,
    );
    if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
      assertConsoleErrorDev([
        'React encountered an empty buffer when writing in an environment that does not support ArrayBuffer.prototype.detached. ' +
          'This could be a security issue if the buffer was not actually empty. ' +
          'Please use a modern browser that supports ArrayBuffer.prototype.detached.',
      ]);
    }
  });

  it('reveals a resumed boundary even when the shell outlined a completed boundary', async () => {
    // Regression test for a segment-id collision between the prerendered shell
    // and the resume. The prelude flush outlines a large *completed* boundary
    // into the shell, advancing request.nextSegmentId past the value
    // getPostponedState snapshotted before the flush. If that snapshot isn't
    // finalized after the flush, the resume re-allocates ids the shell already
    // used; in the served document $RC (getElementById, first match) then
    // reveals the wrong element and the resumed boundary stays on its fallback.
    // Asserts on the rendered output rather than the segment ids.
    let prerendering = true;
    const shellText = 'a'.repeat(800); // > 500 bytes => eligible for outlining
    const resumeText = 'b'.repeat(800);

    // Completes during the prerender; large enough that the prelude flush
    // outlines it into the shell.
    function ShellBoundary() {
      return <div>{shellText}</div>;
    }

    // Suspends during the prerender so its boundary becomes a hole the resume
    // fills. On resume it renders a nested large boundary that itself outlines,
    // so the resume allocates fresh segment ids from the postponed seed.
    function Hole() {
      if (prerendering) {
        return React.use(theInfinitePromise);
      }
      return (
        <Suspense fallback="LoadingC">
          <div>{resumeText}</div>
        </Suspense>
      );
    }

    function App() {
      return (
        <div>
          <Suspense fallback="LoadingA">
            <ShellBoundary />
          </Suspense>
          <Suspense fallback="LoadingB">
            <Hole />
          </Suspense>
        </div>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(() => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        progressiveChunkSize: 100, // force the completed boundary to outline
        onError() {},
      });
    });
    await serverAct(() => controller.abort());
    const prerendered = await pendingResult;
    expect(prerendered.postponed).not.toBe(null);

    const shellHTML = await readContent(prerendered.prelude);

    prerendering = false;
    const resumed = await serverAct(() =>
      ReactDOMFizzServer.resume(
        <App />,
        JSON.parse(JSON.stringify(prerendered.postponed)),
        {onError() {}},
      ),
    );
    const resumeHTML = await readContent(resumed);

    // Run the shell and the resume as one served document so the completion
    // instructions ($RC) execute against both together, the way a browser does.
    const temp = document.createElement('div');
    temp.innerHTML = shellHTML + resumeHTML;
    await insertNodesAndExecuteScripts(temp, container, null);
    jest.runAllTimers();

    // Both boundaries reveal their own content. Without the fix the resumed
    // boundary reuses the shell's ids, so its $RC resolves to the shell's
    // element and it stays on its "LoadingC" fallback.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>{shellText}</div>
        <div>{resumeText}</div>
      </div>,
    );
  });

  it('can omit a preamble with an empty shell if no preamble is ready when prerendering finishes', async () => {
    const errors = [];

    let resolveA;
    const promiseA = new Promise(r => (resolveA = r));
    let resolveB;
    const promiseB = new Promise(r => (resolveB = r));

    async function ComponentA() {
      await promiseA;
      return (
        <Suspense fallback="Loading B">
          <ComponentB />
        </Suspense>
      );
    }

    async function ComponentB() {
      await promiseB;
      return 'Hello';
    }

    function App() {
      return (
        <Suspense>
          <html data-x="">
            <body data-x="">
              <ComponentA />
            </body>
          </html>
        </Suspense>
      );
    }

    const controller = new AbortController();
    let pendingResult;
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      });
    });

    await serverAct(() => {
      controller.abort();
    });

    const prerendered = await pendingResult;
    const postponedState = JSON.stringify(prerendered.postponed);

    const content = await readContent(prerendered.prelude);
    expect(content).toBe('');

    await resolveA();

    expect(prerendered.postponed).not.toBe(null);

    const controller2 = new AbortController();
    await serverAct(async () => {
      pendingResult = ReactDOMFizzStatic.resumeAndPrerender(
        <App />,
        JSON.parse(postponedState),
        {
          signal: controller2.signal,
          onError(x) {
            errors.push(x.message);
          },
        },
      );
    });

    await serverAct(() => {
      controller2.abort();
    });

    const prerendered2 = await pendingResult;
    const postponedState2 = JSON.stringify(prerendered2.postponed);

    await readIntoNewDocument(prerendered2.prelude);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head />
        <body data-x="">Loading B</body>
      </html>,
    );
    if (!ArrayBuffer.prototype.hasOwnProperty('detached')) {
      assertConsoleErrorDev([
        'React encountered an empty buffer when writing in an environment that does not support ArrayBuffer.prototype.detached. ' +
          'This could be a security issue if the buffer was not actually empty. ' +
          'Please use a modern browser that supports ArrayBuffer.prototype.detached.',
      ]);
    }

    await resolveB();

    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState2)),
    );

    await readIntoCurrentDocument(dynamic);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head />
        <body data-x="">Hello</body>
      </html>,
    );
  });

  // @gate enableSuspenseList
  it('can resume a partially prerendered SuspenseList', async () => {
    const errors = [];

    let resolveA;
    const promiseA = new Promise(r => (resolveA = r));
    let resolveB;
    const promiseB = new Promise(r => (resolveB = r));

    async function ComponentA() {
      await promiseA;
      return 'A';
    }

    async function ComponentB() {
      await promiseB;
      return 'B';
    }

    function App() {
      return (
        <div>
          <SuspenseList revealOrder="forwards" tail="visible">
            <Suspense fallback="Loading A">
              <ComponentA />
            </Suspense>
            <Suspense fallback="Loading B">
              <ComponentB />
            </Suspense>
            <Suspense fallback="Loading C">C</Suspense>
            <Suspense fallback="Loading D">D</Suspense>
          </SuspenseList>
        </div>
      );
    }

    const controller = new AbortController();
    const pendingResult = serverAct(() =>
      ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      }),
    );

    await serverAct(() => {
      controller.abort();
    });

    const prerendered = await pendingResult;

    const postponedState = JSON.stringify(prerendered.postponed);

    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        {'Loading A'}
        {'Loading B'}
        {'Loading C'}
        {'Loading D'}
      </div>,
    );

    expect(prerendered.postponed).not.toBe(null);

    await resolveA();
    await resolveB();

    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState)),
    );

    await readIntoContainer(dynamic);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        {'A'}
        {'B'}
        {'C'}
        {'D'}
      </div>,
    );
  });

  // @gate enableOptimisticKey
  it('can resume an optimistic keyed slot', async () => {
    const errors = [];

    let resolve;
    const promise = new Promise(r => (resolve = r));

    async function Component() {
      await promise;
      return 'Hi';
    }

    if (React.optimisticKey === undefined) {
      throw new Error('optimisticKey missing');
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading">
            <Component key={React.optimisticKey} />
          </Suspense>
        </div>
      );
    }

    const controller = new AbortController();
    const pendingResult = serverAct(() =>
      ReactDOMFizzStatic.prerender(<App />, {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      }),
    );

    await serverAct(() => {
      controller.abort();
    });

    const prerendered = await pendingResult;

    const postponedState = JSON.stringify(prerendered.postponed);

    await readIntoContainer(prerendered.prelude);
    expect(getVisibleChildren(container)).toEqual(<div>Loading</div>);

    expect(prerendered.postponed).not.toBe(null);

    await resolve();

    const dynamic = await serverAct(() =>
      ReactDOMFizzServer.resume(<App />, JSON.parse(postponedState)),
    );

    await readIntoContainer(dynamic);

    expect(getVisibleChildren(container)).toEqual(<div>Hi</div>);
  });

  describe('abort signal lifetime', () => {
    // Collects the lifetime signal that React bounds each abort listener with.
    // React passes that signal to addEventListener instead of calling
    // removeEventListener, so the runtime performs the removal and nothing here
    // observes it directly. An aborted lifetime is what shows the listener is
    // gone.
    function trackAbortListenerLifetimes(signal) {
      const lifetimes = [];
      const add = signal.addEventListener.bind(signal);
      signal.addEventListener = (type, listener, options) => {
        if (type === 'abort') {
          lifetimes.push(options.signal);
        }
        return add(type, listener, options);
      };
      return lifetimes;
    }

    it('detaches the listener when a prerender completes', async () => {
      const controller = new AbortController();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      const result = await serverAct(() =>
        ReactDOMFizzStatic.prerender(<div>hello world</div>, {
          signal: controller.signal,
        }),
      );
      expect(lifetimes).toHaveLength(1);
      expect(lifetimes[0].aborted).toBe(false);

      await readContent(result.prelude);
      expect(lifetimes[0].aborted).toBe(true);
    });

    it('detaches the listener when a render completes', async () => {
      const controller = new AbortController();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      const stream = await serverAct(() =>
        ReactDOMFizzServer.renderToReadableStream(<div>hello world</div>, {
          signal: controller.signal,
        }),
      );
      expect(lifetimes).toHaveLength(1);
      expect(lifetimes[0].aborted).toBe(false);

      await readContent(stream);
      expect(lifetimes[0].aborted).toBe(true);
    });

    it('detaches the listener when the signal aborts mid-render', async () => {
      let hasLoaded = false;
      let resolve;
      const promise = new Promise(r => (resolve = r));
      function Wait() {
        if (!hasLoaded) {
          throw promise;
        }
        return 'Done';
      }

      const controller = new AbortController();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      const resultPromise = ReactDOMFizzStatic.prerender(
        <div>
          <Suspense fallback="Loading">
            <Wait />
          </Suspense>
        </div>,
        {signal: controller.signal, onError() {}},
      );
      await jest.runAllTimers();
      expect(lifetimes).toHaveLength(1);
      expect(lifetimes[0].aborted).toBe(false);

      controller.abort();
      hasLoaded = true;
      resolve();
      await serverAct(() => resultPromise);

      expect(lifetimes[0].aborted).toBe(true);
    });

    it('detaches the listener when the stream is cancelled', async () => {
      let hasLoaded = false;
      let resolve;
      const promise = new Promise(r => (resolve = r));
      function Wait() {
        if (!hasLoaded) {
          throw promise;
        }
        return 'Done';
      }

      const controller = new AbortController();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      const stream = await serverAct(() =>
        ReactDOMFizzServer.renderToReadableStream(
          <div>
            <Suspense fallback="Loading">
              <Wait />
            </Suspense>
          </div>,
          {signal: controller.signal, onError() {}},
        ),
      );
      expect(lifetimes).toHaveLength(1);
      expect(lifetimes[0].aborted).toBe(false);

      await serverAct(() => stream.cancel());
      hasLoaded = true;
      resolve();

      expect(lifetimes[0].aborted).toBe(true);
    });

    it('detaches the listener when the shell errors', async () => {
      // A shell error rejects before the caller ever receives a stream, so
      // nothing consumes the request and it never closes. The listener has to
      // come off at the fatal error itself.
      function Boom() {
        throw new Error('boom');
      }

      const controller = new AbortController();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      await expect(
        serverAct(() =>
          ReactDOMFizzServer.renderToReadableStream(<Boom />, {
            signal: controller.signal,
            onError() {},
          }),
        ),
      ).rejects.toThrow('boom');

      expect(lifetimes).toHaveLength(1);
      expect(lifetimes[0].aborted).toBe(true);
    });

    it('constructs no abort controller when no signal is passed', async () => {
      // The render lifetime exists only to bound the caller's abort listener,
      // so a render that is given no signal has nothing to bound and should not
      // pay for a controller. It also means such a render never requires
      // AbortController to exist or to work.
      const RealAbortController = globalThis.AbortController;
      let constructed = 0;
      globalThis.AbortController = class extends RealAbortController {
        constructor() {
          super();
          constructed++;
        }
      };

      try {
        const stream = await serverAct(() =>
          ReactDOMFizzServer.renderToReadableStream(<div>hello world</div>),
        );
        await readContent(stream);
      } finally {
        globalThis.AbortController = RealAbortController;
      }

      expect(constructed).toBe(0);
    });

    it('attaches no listener when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const lifetimes = trackAbortListenerLifetimes(controller.signal);

      await serverAct(() =>
        ReactDOMFizzStatic.prerender(<div>hello world</div>, {
          signal: controller.signal,
          onError() {},
        }),
      );

      expect(lifetimes).toHaveLength(0);
    });
  });
});
