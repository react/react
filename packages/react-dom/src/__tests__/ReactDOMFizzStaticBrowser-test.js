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

describe('ReactDOMFizzStaticBrowser', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;

    // We need the mocked version of setTimeout inside the document.
    window.setTimeout = setTimeout;
    window.requestAnimationFrame = setTimeout;

    patchMessageChannel();
    serverAct = require('internal-test-utils').serverAct;

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
});
