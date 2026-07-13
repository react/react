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

let React;
let ReactDOMFizzStatic;
let Suspense;

function normalizeCodeLocInfo(str) {
  return (
    str &&
    str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
      const dot = name.lastIndexOf('.');
      if (dot !== -1) {
        name = name.slice(dot + 1);
      }
      return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
    })
  );
}

function ignoreListStack(str) {
  if (!str) {
    return str;
  }

  let ignoreListedStack = '';
  const lines = str.split('\n');
  // eslint-disable-next-line no-for-of-loops/no-for-of-loops
  for (const line of lines) {
    if (line.indexOf(__filename) !== -1) {
      ignoreListedStack += '\n' + line;
    }
  }
  return ignoreListedStack;
}

describe('ReactDOMFizzStaticNode', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMFizzStatic = require('react-dom/static');
    Suspense = React.Suspense;
  });

  const theError = new Error('This is an error');
  function Throw() {
    throw theError;
  }
  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
  }

  function readContent(readable) {
    return new Promise((resolve, reject) => {
      let content = '';
      readable.on('data', chunk => {
        content += Buffer.from(chunk).toString('utf8');
      });
      readable.on('error', error => {
        reject(error);
      });
      readable.on('end', () => resolve(content));
    });
  }

  async function readContentWeb(stream) {
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

  it('should call prerenderToNodeStream', async () => {
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(
      <div>hello world</div>,
    );
    const prelude = await readContent(result.prelude);
    expect(prelude).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should suppport web streams', async () => {
    const result = await ReactDOMFizzStatic.prerender(<div>hello world</div>);
    const prelude = await readContentWeb(result.prelude);
    expect(prelude).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should emit DOCTYPE at the root of the document', async () => {
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(
      <html>
        <body>hello world</body>
      </html>,
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
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(
      <div>hello world</div>,
      {
        bootstrapScriptContent: 'INIT();',
        bootstrapScripts: ['init.js'],
        bootstrapModules: ['init.mjs'],
      },
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
    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(
      <div>
        <Suspense fallback="Loading">
          <Wait />
        </Suspense>
      </div>,
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
      await ReactDOMFizzStatic.prerenderToNodeStream(
        <div>
          <Throw />
        </div>,
        {
          onError(x) {
            reportedErrors.push(x);
          },
        },
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
      await ReactDOMFizzStatic.prerenderToNodeStream(
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
      );
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBe(theError);
    expect(reportedErrors).toEqual([theError]);
  });

  it('should not error the stream when an error is thrown inside suspense boundary', async () => {
    const reportedErrors = [];
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(
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
    );

    const prelude = await readContent(result.prelude);
    expect(prelude).toContain('Loading');
    expect(reportedErrors).toEqual([theError]);
  });

  it('should be able to complete by aborting even if the promise never resolves', async () => {
    const errors = [];
    const controller = new AbortController();
    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(
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

    await jest.runAllTimers();

    controller.abort();
    await jest.runAllTimers();

    const result = await resultPromise;

    const prelude = await readContent(result.prelude);
    expect(prelude).toContain('Loading');

    expect(errors).toEqual(['This operation was aborted']);
  });

  it('should resolve an empty shell if aborting before the shell is complete', async () => {
    const errors = [];
    const controller = new AbortController();
    const promise = ReactDOMFizzStatic.prerenderToNodeStream(
      <div>
        <InfiniteSuspend />
      </div>,
      {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      },
    );

    await jest.runAllTimers();

    const theReason = new Error('aborted for reasons');
    controller.abort(theReason);
    await jest.runAllTimers();

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
    const streamPromise = ReactDOMFizzStatic.prerenderToNodeStream(
      <div>
        <App />
      </div>,
      {
        signal: controller.signal,
        onError(x) {
          errors.push(x.message);
        },
      },
    );

    await jest.runAllTimers();
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

    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      signal: controller.signal,
      onError(error) {
        errors.push(error.message);
      },
    });

    await jest.runAllTimers();
    const result = await resultPromise;

    expect(errors).toEqual(['abort reason']);
    expect(await readContent(result.prelude)).toBe('');
  });

  it('should resolve with an empty prelude if passing an already aborted signal', async () => {
    const errors = [];
    const controller = new AbortController();
    const theReason = new Error('aborted for reasons');
    controller.abort(theReason);

    const promise = ReactDOMFizzStatic.prerenderToNodeStream(
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

    // Technically we could still continue rendering the shell but currently the
    // semantics mean that we also abort any pending CPU work.
    await jest.runAllTimers();

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
    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      signal: controller.signal,
      onError(x) {
        errors.push(x);
        return 'a digest';
      },
    });

    await jest.runAllTimers();

    controller.abort('foobar');
    await jest.runAllTimers();

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
    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      signal: controller.signal,
      onError(x) {
        errors.push(x.message);
        return 'a digest';
      },
    });

    await jest.runAllTimers();

    controller.abort(new Error('uh oh'));
    await jest.runAllTimers();

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
    const resultPromise = ReactDOMFizzStatic.prerenderToNodeStream(
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

    await jest.runAllTimers();

    controller.signal.addEventListener('abort', () => {
      reject(new Error('rejected during abort'));
    });
    controller.abort(new Error('abort reason'));

    await Promise.resolve();
    await jest.runAllTimers();
    await resultPromise;

    expect(errors).toEqual(['rejected during abort', 'abort reason']);
  });

  describe('with real timers', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('includes the suspended call site when aborting in the same rendering task', async () => {
      const promise = new Promise(() => {});
      const controller = new AbortController();
      let caughtError;
      let componentStack;
      let ownerStack;

      function AbortAndSuspend() {
        controller.abort(new Error('abort reason'));
        React.use(promise);
        return null;
      }

      function App() {
        return <AbortAndSuspend />;
      }

      const {prelude} = await ReactDOMFizzStatic.prerenderToNodeStream(
        <App />,
        {
          signal: controller.signal,
          onError(error, errorInfo) {
            caughtError = error;
            componentStack = errorInfo.componentStack;
            ownerStack = __DEV__ ? React.captureOwnerStack() : null;
          },
        },
      );

      expect(caughtError).toEqual(
        expect.objectContaining({message: 'abort reason'}),
      );
      expect(await readContent(prelude)).toBe('');
      if (__DEV__) {
        expect(normalizeCodeLocInfo(componentStack)).toBe(
          '\n    in AbortAndSuspend (at **)\n    in App',
        );
        expect(normalizeCodeLocInfo(ignoreListStack(ownerStack))).toBe(
          (gate(flags => flags.enableAsyncDebugInfo)
            ? '\n    in AbortAndSuspend (at **)'
            : '') + '\n    in App (at **)',
        );
      } else {
        expect(ownerStack).toBeNull();
      }
    });
  });
});
