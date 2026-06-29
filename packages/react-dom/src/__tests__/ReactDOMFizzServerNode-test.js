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

let Stream;
let React;
let ReactDOMFizzServer;
let Suspense;
let act;

describe('ReactDOMFizzServerNode', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');
    Suspense = React.Suspense;
    act = require('internal-test-utils').act;
  });

  function getTestWritable() {
    const writable = new Stream.PassThrough();
    writable.setEncoding('utf8');
    const output = {result: '', error: undefined};
    writable.on('data', chunk => {
      output.result += chunk;
    });
    writable.on('error', error => {
      output.error = error;
    });
    const completed = new Promise(resolve => {
      writable.on('finish', () => {
        resolve();
      });
      writable.on('error', () => {
        resolve();
      });
    });
    return {writable, completed, output};
  }

  const theError = new Error('This is an error');
  function Throw() {
    throw theError;
  }
  const theInfinitePromise = new Promise(() => {});
  function InfiniteSuspend() {
    throw theInfinitePromise;
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

  it('should call renderToPipeableStream', async () => {
    const {writable, output} = getTestWritable();
    await act(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <div>hello world</div>,
      );
      pipe(writable);
    });
    expect(output.result).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should support web streams', async () => {
    const stream = await act(() =>
      ReactDOMFizzServer.renderToReadableStream(<div>hello world</div>),
    );
    const result = await readContentWeb(stream);
    expect(result).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('flush fully if piping in on onShellReady', async () => {
    const {writable, output} = getTestWritable();
    await act(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <div>hello world</div>,
        {
          onShellReady() {
            pipe(writable);
          },
        },
      );
    });
    expect(output.result).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should emit DOCTYPE at the root of the document', async () => {
    const {writable, output} = getTestWritable();
    await act(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <body>hello world</body>
        </html>,
      );
      pipe(writable);
    });
    // with Float, we emit empty heads if they are elided when rendering <html>
    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(output.result).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head><link rel="expect" href="#_R_" blocking="render"/></head><body>hello world<template id="_R_"></template></body></html>"`,
      );
    } else {
      expect(output.result).toMatchInlineSnapshot(
        `"<!DOCTYPE html><html><head></head><body>hello world</body></html>"`,
      );
    }
  });

  it('should emit bootstrap script src at the end', async () => {
    const {writable, output} = getTestWritable();
    await act(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <div>hello world</div>,
        {
          bootstrapScriptContent: 'INIT();',
          bootstrapScripts: ['init.js'],
          bootstrapModules: ['init.mjs'],
        },
      );
      pipe(writable);
    });
    expect(output.result).toMatchInlineSnapshot(
      `"<link rel="preload" as="script" fetchPriority="low" href="init.js"/><link rel="modulepreload" fetchPriority="low" href="init.mjs"/><div>hello world</div><script id="_R_">INIT();</script><script src="init.js" async=""></script><script type="module" src="init.mjs" async=""></script>"`,
    );
  });

  it('should start writing after pipe', async () => {
    const {writable, output} = getTestWritable();
    let pipe;
    await act(() => {
      pipe = ReactDOMFizzServer.renderToPipeableStream(
        <div>hello world</div>,
      ).pipe;
    });
    // First we write our header.
    output.result +=
      '<!doctype html><html><head><title>test</title><head><body>';
    // Then React starts writing.
    pipe(writable);
    expect(output.result).toMatchInlineSnapshot(
      `"<!doctype html><html><head><title>test</title><head><body><div>hello world</div>"`,
    );
  });

  it('emits all HTML as one unit if we wait until the end to start', async () => {
    let hasLoaded = false;
    let resolve;
    const promise = new Promise(r => (resolve = r));
    function Wait() {
      if (!hasLoaded) {
        throw promise;
      }
      return 'Done';
    }
    let isCompleteCalls = 0;
    const {writable, output} = getTestWritable();
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback="Loading">
          <Wait />
        </Suspense>
      </div>,

      {
        onAllReady() {
          isCompleteCalls++;
        },
      },
    );
    await jest.runAllTimers();
    expect(output.result).toBe('');
    expect(isCompleteCalls).toBe(0);
    // Resolve the loading.
    hasLoaded = true;
    await resolve();

    await jest.runAllTimers();

    expect(output.result).toBe('');
    expect(isCompleteCalls).toBe(1);

    // First we write our header.
    output.result +=
      '<!doctype html><html><head><title>test</title><head><body>';
    // Then React starts writing.
    pipe(writable);
    expect(output.result).toMatchInlineSnapshot(
      `"<!doctype html><html><head><title>test</title><head><body><div><!--$-->Done<!-- --><!--/$--></div>"`,
    );
  });

  it('should error the stream when an error is thrown at the root', async () => {
    const reportedErrors = [];
    const reportedShellErrors = [];
    let shellReadyCalls = 0;
    let allReadyCalls = 0;
    const {writable, output, completed} = getTestWritable();
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Throw />
      </div>,
      {
        onError(x) {
          reportedErrors.push(x);
        },
        onShellError(x) {
          reportedShellErrors.push(x);
        },
        onShellReady() {
          shellReadyCalls++;
        },
        onAllReady() {
          allReadyCalls++;
        },
      },
    );

    // The stream is errored once we start writing.
    pipe(writable);

    await completed;

    expect(output.error).toBe(theError);
    expect(output.result).toBe('');
    // This type of error is reported to the error callback too.
    expect(reportedErrors).toEqual([theError]);
    expect(reportedShellErrors).toEqual([theError]);
    expect(shellReadyCalls).toBe(0);
    // onAllReady currently still fires once after a fatal shell error, even
    // though the render never completed (facebook/react#36890).
    expect(allReadyCalls).toBe(1);
  });

  it('should not report aborts after the shell has fatally errored', async () => {
    const reportedErrors = [];
    const reportedShellErrors = [];
    const {abort} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback="Loading">
          <InfiniteSuspend />
        </Suspense>
        <Throw />
      </div>,
      {
        onError(x) {
          reportedErrors.push(x);
        },
        onShellError(x) {
          reportedShellErrors.push(x);
        },
      },
    );

    await jest.runAllTimers();

    expect(reportedErrors).toEqual([theError]);
    expect(reportedShellErrors).toEqual([theError]);

    abort(new Error('too late'));

    expect(reportedErrors).toEqual([theError]);
    expect(reportedShellErrors).toEqual([theError]);
  });

  it('should error the stream when an error is thrown inside a fallback', async () => {
    const reportedErrors = [];
    const reportedShellErrors = [];
    const {writable, output, completed} = getTestWritable();
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback={<Throw />}>
          <InfiniteSuspend />
        </Suspense>
      </div>,

      {
        onError(x) {
          reportedErrors.push(x.message);
        },
        onShellError(x) {
          reportedShellErrors.push(x);
        },
      },
    );
    pipe(writable);

    await completed;

    expect(output.error).toBe(theError);
    expect(output.result).toBe('');
    expect(reportedErrors).toEqual([theError.message]);
    expect(reportedShellErrors).toEqual([theError]);
  });

  it('should not error the stream when an error is thrown inside suspense boundary', async () => {
    const reportedErrors = [];
    const reportedShellErrors = [];
    let allReadyCalls = 0;
    const {writable, output, completed} = getTestWritable();
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback={<div>Loading</div>}>
          <Throw />
        </Suspense>
      </div>,
      {
        onError(x) {
          reportedErrors.push(x);
        },
        onShellError(x) {
          reportedShellErrors.push(x);
        },
        onAllReady() {
          allReadyCalls++;
        },
      },
    );
    pipe(writable);

    await completed;

    expect(output.error).toBe(undefined);
    expect(output.result).toContain('Loading');
    // While no error is reported to the stream, the error is reported to the callback.
    expect(reportedErrors).toEqual([theError]);
    expect(reportedShellErrors).toEqual([]);
    // The shell stays valid, the boundary client-renders, and the render
    // completes, so onAllReady fires. This is documented behavior.
    expect(allReadyCalls).toBe(1);
  });

  it('should not attempt to render the fallback if the main content completes first', async () => {
    const {writable, output, completed} = getTestWritable();

    let renderedFallback = false;
    function Fallback() {
      renderedFallback = true;
      return 'Loading...';
    }
    function Content() {
      return 'Hi';
    }
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <Suspense fallback={<Fallback />}>
        <Content />
      </Suspense>,
    );
    pipe(writable);

    await completed;

    expect(output.result).toContain('Hi');
    expect(output.result).not.toContain('Loading');
    expect(renderedFallback).toBe(false);
  });

  it('should be able to complete by aborting even if the promise never resolves', async () => {
    let isCompleteCalls = 0;
    const errors = [];
    const {writable, output, completed} = getTestWritable();
    let abort;
    await act(() => {
      const pipeable = ReactDOMFizzServer.renderToPipeableStream(
        <div>
          <Suspense fallback={<div>Loading</div>}>
            <InfiniteSuspend />
          </Suspense>
        </div>,
        {
          onError(x) {
            errors.push(x.message);
          },
          onAllReady() {
            isCompleteCalls++;
          },
        },
      );
      pipeable.pipe(writable);
      abort = pipeable.abort;
    });

    expect(output.result).toContain('Loading');
    expect(isCompleteCalls).toBe(0);

    abort(new Error('uh oh'));
    await jest.runAllTimers();

    await completed;

    expect(errors).toEqual(['uh oh']);
    expect(output.error).toBe(undefined);
    expect(output.result).toContain('Loading');
    expect(isCompleteCalls).toBe(1);
  });

  it('should fail the shell if you abort before work has begun', async () => {
    let isCompleteCalls = 0;
    const errors = [];
    const shellErrors = [];
    const {writable, output, completed} = getTestWritable();
    const {pipe, abort} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback={<div>Loading</div>}>
          <InfiniteSuspend />
        </Suspense>
      </div>,
      {
        onError(x) {
          errors.push(x.message);
        },
        onShellError(x) {
          shellErrors.push(x.message);
        },
        onAllReady() {
          isCompleteCalls++;
        },
      },
    );
    pipe(writable);

    // Currently we delay work so if we abort, we abort the remaining CPU
    // work as well.

    // Abort before running the timers that perform the work
    const theReason = new Error('uh oh');
    abort(theReason);

    jest.runAllTimers();

    await completed;

    expect(errors).toEqual(['uh oh']);
    expect(shellErrors).toEqual(['uh oh']);
    expect(output.error).toBe(theReason);
    expect(output.result).toBe('');
    expect(isCompleteCalls).toBe(0);
  });

  it('should report abort errors for every suspended task but fail the shell only once', async () => {
    const promise = new Promise(() => {});
    const rendered = [];
    function Suspend({label}) {
      rendered.push(label);
      React.use(promise);
      return null;
    }

    const errors = [];
    const shellErrors = [];
    const {abort} = ReactDOMFizzServer.renderToPipeableStream(
      <>
        <Suspense fallback="Loading...">
          <Suspend label="boundary" />
        </Suspense>
        <Suspend label="root one" />
        <Suspend label="root two" />
      </>,
      {
        onError(error) {
          errors.push(error.message);
        },
        onShellError(error) {
          shellErrors.push(error);
        },
      },
    );

    await jest.runAllTimers();
    expect(rendered).toEqual(['boundary', 'root one', 'root two']);

    const reason = new Error('abort reason');
    abort(reason);
    await jest.runAllTimers();

    expect(shellErrors).toEqual([reason]);
    expect(errors).toEqual(['abort reason', 'abort reason', 'abort reason']);
  });

  it('should be able to complete by abort when the fallback is also suspended', async () => {
    let isCompleteCalls = 0;
    const errors = [];
    const {writable, output, completed} = getTestWritable();
    let abort;
    await act(() => {
      const pipeable = ReactDOMFizzServer.renderToPipeableStream(
        <div>
          <Suspense fallback="Loading">
            <Suspense fallback={<InfiniteSuspend />}>
              <InfiniteSuspend />
            </Suspense>
          </Suspense>
        </div>,
        {
          onError(x) {
            errors.push(x.message);
          },
          onAllReady() {
            isCompleteCalls++;
          },
        },
      );
      pipeable.pipe(writable);
      abort = pipeable.abort;
    });

    expect(output.result).toContain('Loading');
    expect(isCompleteCalls).toBe(0);

    abort();
    await jest.runAllTimers();

    await completed;

    expect(errors).toEqual([
      // There are two boundaries that abort
      'The render was aborted by the server without a reason.',
      'The render was aborted by the server without a reason.',
    ]);
    expect(output.error).toBe(undefined);
    expect(output.result).toContain('Loading');
    expect(isCompleteCalls).toBe(1);
  });

  it('should be able to get context value when promise resolves', async () => {
    class DelayClient {
      get() {
        if (this.resolved) return this.resolved;
        if (this.pending) return this.pending;
        return (this.pending = new Promise(resolve => {
          setTimeout(() => {
            delete this.pending;
            this.resolved = 'OK';
            resolve();
          }, 500);
        }));
      }
    }

    const DelayContext = React.createContext(undefined);
    const Component = () => {
      const client = React.useContext(DelayContext);
      if (!client) {
        return 'context not found.';
      }
      const result = client.get();
      if (typeof result === 'string') {
        return result;
      }
      throw result;
    };

    const client = new DelayClient();
    const {writable, output, completed} = getTestWritable();
    await act(() => {
      ReactDOMFizzServer.renderToPipeableStream(
        <DelayContext.Provider value={client}>
          <div>
            <Suspense fallback="loading">
              <Component />
            </Suspense>
          </div>
        </DelayContext.Provider>,
      ).pipe(writable);
    });

    expect(output.error).toBe(undefined);
    expect(output.result).toContain('loading');

    await completed;

    expect(output.error).toBe(undefined);
    expect(output.result).not.toContain('context never found');
    expect(output.result).toContain('OK');
  });

  it('should be able to get context value when calls renderToPipeableStream twice at the same time', async () => {
    class DelayClient {
      get() {
        if (this.resolved) return this.resolved;
        if (this.pending) return this.pending;
        return (this.pending = new Promise(resolve => {
          setTimeout(() => {
            delete this.pending;
            this.resolved = 'OK';
            resolve();
          }, 500);
        }));
      }
    }
    const DelayContext = React.createContext(undefined);
    const Component = () => {
      const client = React.useContext(DelayContext);
      if (!client) {
        return 'context never found';
      }
      const result = client.get();
      if (typeof result === 'string') {
        return result;
      }
      throw result;
    };

    const client0 = new DelayClient();
    const {
      writable: writable0,
      output: output0,
      completed: completed0,
    } = getTestWritable();
    const client1 = new DelayClient();
    const {
      writable: writable1,
      output: output1,
      completed: completed1,
    } = getTestWritable();
    await act(() => {
      ReactDOMFizzServer.renderToPipeableStream(
        <DelayContext.Provider value={client0}>
          <div>
            <Suspense fallback="loading">
              <Component />
            </Suspense>
          </div>
        </DelayContext.Provider>,
      ).pipe(writable0);
      ReactDOMFizzServer.renderToPipeableStream(
        <DelayContext.Provider value={client1}>
          <div>
            <Suspense fallback="loading">
              <Component />
            </Suspense>
          </div>
        </DelayContext.Provider>,
      ).pipe(writable1);
    });

    expect(output0.error).toBe(undefined);
    expect(output0.result).toContain('loading');

    expect(output1.error).toBe(undefined);
    expect(output1.result).toContain('loading');

    await Promise.all([completed0, completed1]);

    expect(output0.error).toBe(undefined);
    expect(output0.result).not.toContain('context never found');
    expect(output0.result).toContain('OK');

    expect(output1.error).toBe(undefined);
    expect(output1.result).not.toContain('context never found');
    expect(output1.result).toContain('OK');
  });

  it('should be able to pop context after suspending', async () => {
    class DelayClient {
      get() {
        if (this.resolved) return this.resolved;
        if (this.pending) return this.pending;
        return (this.pending = new Promise(resolve => {
          setTimeout(() => {
            delete this.pending;
            this.resolved = 'OK';
            resolve();
          }, 500);
        }));
      }
    }

    const DelayContext = React.createContext(undefined);
    const Component = () => {
      const client = React.useContext(DelayContext);
      if (!client) {
        return 'context not found.';
      }
      const result = client.get();
      if (typeof result === 'string') {
        return result;
      }
      throw result;
    };

    const client = new DelayClient();
    const {writable, output, completed} = getTestWritable();
    await act(() => {
      ReactDOMFizzServer.renderToPipeableStream(
        <div>
          <DelayContext.Provider value={client}>
            <Suspense fallback="loading">
              <Component />
            </Suspense>
          </DelayContext.Provider>
          <DelayContext.Provider value={client}>
            <Suspense fallback="loading">
              <Component />
            </Suspense>
          </DelayContext.Provider>
        </div>,
      ).pipe(writable);
    });

    expect(output.error).toBe(undefined);
    expect(output.result).toContain('loading');

    await completed;

    expect(output.error).toBe(undefined);
    expect(output.result).not.toContain('context never found');
    expect(output.result).toContain('OK');
  });

  it('should not continue rendering after the writable ends unexpectedly', async () => {
    let hasLoaded = false;
    let resolve;
    let isComplete = false;
    let rendered = false;
    const promise = new Promise(r => (resolve = r));
    function Wait({prop}) {
      if (!hasLoaded) {
        throw promise;
      }
      rendered = true;
      return 'Done';
    }
    const errors = [];
    const {writable, completed} = getTestWritable();
    const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
      <div>
        <Suspense fallback={<div>Loading</div>}>
          <Wait />
        </Suspense>
      </div>,
      {
        onError(x) {
          errors.push(x.message);
        },
        onAllReady() {
          isComplete = true;
        },
      },
    );
    pipe(writable);

    expect(rendered).toBe(false);
    expect(isComplete).toBe(false);

    writable.end();

    await jest.runAllTimers();

    hasLoaded = true;
    resolve();

    await completed;
    await jest.runAllTimers();

    expect(errors).toEqual([
      'The destination stream errored while writing data.',
    ]);
    expect(rendered).toBe(false);
    expect(isComplete).toBe(true);
  });

  it('should encode multibyte characters correctly without nulls (#24985)', async () => {
    const {writable, output} = getTestWritable();
    await act(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <div>{Array(700).fill('ののの')}</div>,
      );
      pipe(writable);
    });
    expect(output.result.indexOf('\u0000')).toBe(-1);
    expect(output.result).toEqual(
      '<div>' + Array(700).fill('ののの').join('<!-- -->') + '</div>',
    );
  });
});
