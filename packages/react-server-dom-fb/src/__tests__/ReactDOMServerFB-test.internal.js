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
let ReactDOMServer;
let Suspense;

describe('ReactDOMServerFB', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMServer = require('../ReactDOMServerFB');
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

  function readResult(stream) {
    let result = '';
    while (!ReactDOMServer.hasFinished(stream)) {
      result += ReactDOMServer.renderNextChunk(stream);
    }
    return result;
  }

  it('should be able to render basic HTML', async () => {
    const stream = ReactDOMServer.renderToStream(<div>hello world</div>, {
      onError(x) {
        console.error(x);
      },
    });
    const result = readResult(stream);
    expect(result).toMatchInlineSnapshot(`"<div>hello world</div>"`);
  });

  it('should emit bootstrap script src at the end', () => {
    const stream = ReactDOMServer.renderToStream(<div>hello world</div>, {
      bootstrapScriptContent: 'INIT();',
      bootstrapScripts: ['init.js'],
      bootstrapModules: ['init.mjs'],
      onError(x) {
        console.error(x);
      },
    });
    const result = readResult(stream);
    expect(result).toMatchInlineSnapshot(
      `"<link rel="preload" as="script" fetchPriority="low" href="init.js"/><link rel="modulepreload" fetchPriority="low" href="init.mjs"/><div>hello world</div><script id="_R_">INIT();</script><script src="init.js" async=""></script><script type="module" src="init.mjs" async=""></script>"`,
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
    const stream = ReactDOMServer.renderToStream(
      <div>
        <Suspense fallback="Loading">
          <Wait />
        </Suspense>
      </div>,
      {
        onError(x) {
          console.error(x);
        },
      },
    );
    await jest.runAllTimers();
    // Resolve the loading.
    hasLoaded = true;
    await resolve();

    await jest.runAllTimers();

    const result = readResult(stream);
    expect(result).toMatchInlineSnapshot(`"<div><!--$-->Done<!--/$--></div>"`);
  });

  it('should throw an error when an error is thrown at the root', () => {
    const reportedErrors = [];
    const stream = ReactDOMServer.renderToStream(
      <div>
        <Throw />
      </div>,
      {
        onError(x) {
          reportedErrors.push(x);
        },
      },
    );

    let caughtError = null;
    let result = '';
    try {
      result = readResult(stream);
    } catch (x) {
      caughtError = x;
    }
    expect(caughtError).toBe(theError);
    expect(result).toBe('');
    expect(reportedErrors).toEqual([theError]);
  });

  it('should throw an error when an error is thrown inside a fallback', () => {
    const reportedErrors = [];
    const stream = ReactDOMServer.renderToStream(
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

    let caughtError = null;
    let result = '';
    try {
      result = readResult(stream);
    } catch (x) {
      caughtError = x;
    }
    expect(caughtError).toBe(theError);
    expect(result).toBe('');
    expect(reportedErrors).toEqual([theError]);
  });

  it('should not throw an error when an error is thrown inside suspense boundary', async () => {
    const reportedErrors = [];
    const stream = ReactDOMServer.renderToStream(
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

    const result = readResult(stream);
    expect(result).toContain('Loading');
    expect(reportedErrors).toEqual([theError]);
  });

  it('should be able to complete by aborting even if the promise never resolves', () => {
    const errors = [];
    const stream = ReactDOMServer.renderToStream(
      <div>
        <Suspense fallback={<div>Loading</div>}>
          <InfiniteSuspend />
        </Suspense>
      </div>,
      {
        onError(x) {
          errors.push(x.message);
        },
      },
    );

    const partial = ReactDOMServer.renderNextChunk(stream);
    expect(partial).toContain('Loading');

    ReactDOMServer.abortStream(stream);

    const remaining = readResult(stream);
    expect(remaining).toEqual('');

    expect(errors).toEqual([
      'The render was aborted by the server without a reason.',
    ]);
  });

  it('should allow setting an abort reason', () => {
    const errors = [];
    const stream = ReactDOMServer.renderToStream(
      <div>
        <Suspense fallback={<div>Loading</div>}>
          <InfiniteSuspend />
        </Suspense>
      </div>,
      {
        onError(error) {
          errors.push(error);
        },
      },
    );
    ReactDOMServer.abortStream(stream, theError);
    expect(errors).toEqual([theError]);
  });
});
