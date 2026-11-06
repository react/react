/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchSetImmediate} from '../../../../scripts/jest/patchSetImmediate';

global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;

let React;
let ReactDOMClient;
let ReactDOMServer;
let ReactDOMStatic;
let ServerErrorBoundary;
let Stream;
let act;
let serverAct;

describe('ReactDOMServerErrorBoundary', () => {
  beforeEach(() => {
    jest.resetModules();
    patchSetImmediate();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server.node');
    ReactDOMStatic = require('react-dom/static.node');
    ServerErrorBoundary = React.unstable_ServerErrorBoundary;
    Stream = require('stream');
    ({act, serverAct} = require('internal-test-utils'));
  });

  function createDestination() {
    const destination = new Stream.PassThrough();
    destination.setEncoding('utf8');
    const output = {html: '', error: undefined};
    destination.on('data', chunk => {
      output.html += chunk;
    });
    destination.on('error', error => {
      output.error = error;
    });
    return {destination, output};
  }

  function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {promise, resolve, reject};
  }

  async function readStream(stream) {
    const reader = stream.getReader();
    let html = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        return html;
      }
      html += Buffer.from(value).toString('utf8');
    }
  }

  function Layout({children}) {
    return (
      <main>
        <header>Layout</header>
        {children}
        <footer>Footer</footer>
      </main>
    );
  }

  function Throw({error}) {
    throw error;
  }

  function Read({promise}) {
    return <span>{React.use(promise)}</span>;
  }

  // @gate enableServerErrorBoundary
  it('renders a synchronous error fallback as HTML while preserving the shell', async () => {
    const error = new Error('Server failure');
    const events = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Unavailable</p>}>
            <Throw error={error} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            events.push(caught);
            return 'safe-digest';
          },
          onShellReady() {
            events.push('shell');
          },
          onShellError(caught) {
            events.push(['shell error', caught]);
          },
          onAllReady() {
            events.push('all');
          },
        },
      ).pipe(destination);
    });

    expect(events).toEqual([error, 'shell', 'all']);
    expect(output.error).toBe(undefined);
    // Parse without executing scripts: the fallback must be usable without JS.
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutUnavailableFooter');
    expect(container.querySelector('template').dataset.dgst).toBe(
      'safe-digest',
    );
  });

  // @gate enableServerErrorBoundary
  it('aborts a pending shell without treating cancellation as an error fallback', async () => {
    const deferred = createDeferred();
    const reason = new Error('Request cancelled');
    const shellErrors = [];
    const onAllReady = jest.fn();
    const Fallback = jest.fn(() => <p>Unavailable</p>);
    const {destination, output} = createDestination();
    let stream;
    await serverAct(() => {
      stream = ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<Fallback />}>
            <Read promise={deferred.promise} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError() {},
          onShellError(error) {
            shellErrors.push(error);
          },
          onAllReady,
        },
      );
      stream.pipe(destination);
    });
    expect(output.html).toBe('');

    await serverAct(() => stream.abort(reason));
    expect(output.html).toBe('');
    expect(output.error).toBe(reason);
    expect(shellErrors).toEqual([reason]);
    expect(Fallback).not.toHaveBeenCalled();
    expect(onAllReady).not.toHaveBeenCalled();
  });

  // @gate enableServerErrorBoundary
  it('waits for suspended children without rendering the error fallback', async () => {
    const deferred = createDeferred();
    const events = [];
    const {destination, output} = createDestination();
    function Fallback() {
      events.push('fallback');
      return <p>Unavailable</p>;
    }
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<Fallback />}>
            <Read promise={deferred.promise} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(error) {
            events.push(error);
          },
          onShellReady() {
            events.push('shell');
          },
        },
      ).pipe(destination);
    });
    expect(output.html).toBe('');
    expect(events).toEqual([]);

    await serverAct(() => deferred.resolve('Content'));
    expect(events).toEqual(['shell']);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutContentFooter');
  });

  // @gate enableServerErrorBoundary
  it('reports asynchronous errors before committing a shell with the fallback', async () => {
    const deferred = createDeferred();
    const error = new Error('Asynchronous failure');
    const events = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Unavailable</p>}>
            <Read promise={deferred.promise} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            events.push(caught);
          },
          onShellReady() {
            events.push('shell');
          },
        },
      ).pipe(destination);
    });
    expect(output.html).toBe('');
    expect(events).toEqual([]);

    await serverAct(() => deferred.reject(error));
    expect(events).toEqual([error, 'shell']);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutUnavailableFooter');
  });

  // @gate enableServerErrorBoundary
  it('keeps the shell blocked on a sibling boundary after another boundary errors', async () => {
    const first = createDeferred();
    const second = createDeferred();
    const error = new Error('First child failure');
    const events = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>First fallback</p>}>
            <Read promise={first.promise} />
          </ServerErrorBoundary>
          <ServerErrorBoundary fallback={<p>Second fallback</p>}>
            <Read promise={second.promise} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            events.push(caught);
          },
          onShellReady() {
            events.push('shell');
          },
          onAllReady() {
            events.push('all');
          },
        },
      ).pipe(destination);
    });
    expect(events).toEqual([]);
    expect(output.html).toBe('');

    await serverAct(() => first.reject(error));
    expect(events).toEqual([error]);
    expect(output.html).toBe('');

    await serverAct(() => second.resolve('Second'));
    expect(events).toEqual([error, 'shell', 'all']);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutFirst fallbackSecondFooter');
  });

  // @gate enableServerErrorBoundary
  it('waits for an asynchronous error before resolving a readable stream', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    const deferred = createDeferred();
    const error = new Error('Readable stream failure');
    const events = [];
    let stream;
    await serverAct(() => {
      ReactDOMServer.renderToReadableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Unavailable</p>}>
            <Read promise={deferred.promise} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            events.push(caught);
          },
        },
      ).then(value => {
        stream = value;
        events.push('shell');
      });
    });
    expect(stream).toBe(undefined);
    expect(events).toEqual([]);

    await serverAct(() => deferred.reject(error));
    expect(events).toEqual([error, 'shell']);
    const container = document.createElement('div');
    container.innerHTML = await readStream(stream);
    expect(container.textContent).toBe('LayoutUnavailableFooter');
  });

  // @gate enableServerErrorBoundary
  it('lets an inner Suspense boundary handle loading and errors', async () => {
    const deferred = createDeferred();
    const error = new Error('Inner failure');
    const errors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Unavailable</p>}>
            <React.Suspense fallback={<p>Loading</p>}>
              <Read promise={deferred.promise} />
            </React.Suspense>
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            errors.push(caught);
          },
        },
      ).pipe(destination);
    });
    expect(output.html).toContain('<header>Layout</header>');
    expect(output.html).toContain('<p>Loading</p>');
    expect(output.html).not.toContain('Unavailable');
    expect(errors).toEqual([]);

    await serverAct(() => deferred.reject(error));
    expect(errors).toEqual([error]);
    expect(output.html).not.toContain('Unavailable');
    expect(output.error).toBe(undefined);
  });

  // @gate enableServerErrorBoundary && enableSuspenseList
  it('completes error boundaries in a together SuspenseList', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    expect(React.unstable_SuspenseList).toBeDefined();
    const SuspenseList = React.unstable_SuspenseList;
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <SuspenseList revealOrder="together">
            <ServerErrorBoundary fallback={<p>First fallback</p>}>
              <span>First</span>
            </ServerErrorBoundary>
            <ServerErrorBoundary fallback={<p>Second fallback</p>}>
              <span>Second</span>
            </ServerErrorBoundary>
          </SuspenseList>
        </Layout>,
      ).pipe(destination);
    });
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutFirstSecondFooter');
  });

  // @gate enableServerErrorBoundary && enableSuspenseList
  it('finishes a together SuspenseList after an error boundary stops suspending', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    expect(React.unstable_SuspenseList).toBeDefined();
    const SuspenseList = React.unstable_SuspenseList;
    const deferred = createDeferred();
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <SuspenseList revealOrder="together">
            <ServerErrorBoundary fallback={<p>First fallback</p>}>
              <span>First</span>
            </ServerErrorBoundary>
            <ServerErrorBoundary fallback={<p>Second fallback</p>}>
              <Read promise={deferred.promise} />
            </ServerErrorBoundary>
          </SuspenseList>
        </Layout>,
      ).pipe(destination);
    });
    expect(output.html).toBe('');
    await serverAct(() => deferred.resolve('Second'));
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutFirstSecondFooter');
  });

  [false, true].forEach(asynchronous => {
    // @gate enableServerErrorBoundary && enableSuspenseList
    it(
      'finishes a together SuspenseList after an error boundary fails (async: ' +
        asynchronous +
        ')',
      async () => {
        expect(ServerErrorBoundary).toBeDefined();
        expect(React.unstable_SuspenseList).toBeDefined();
        const deferred = createDeferred();
        const error = new Error('Second failure');
        const events = [];
        const {destination, output} = createDestination();
        await serverAct(() => {
          ReactDOMServer.renderToPipeableStream(
            <Layout>
              <React.unstable_SuspenseList revealOrder="together">
                <ServerErrorBoundary fallback={<p>First fallback</p>}>
                  <span>First</span>
                </ServerErrorBoundary>
                <ServerErrorBoundary fallback={<p>Second fallback</p>}>
                  {asynchronous ? (
                    <Read promise={deferred.promise} />
                  ) : (
                    <Throw error={error} />
                  )}
                </ServerErrorBoundary>
              </React.unstable_SuspenseList>
            </Layout>,
            {
              onError(caught) {
                events.push(caught);
              },
              onShellReady() {
                events.push('shell');
              },
              onAllReady() {
                events.push('all');
              },
            },
          ).pipe(destination);
        });
        if (asynchronous) {
          expect(output.html).toBe('');
          await serverAct(() => deferred.reject(error));
        }
        expect(events).toEqual([error, 'shell', 'all']);
        const container = document.createElement('div');
        container.innerHTML = output.html;
        expect(container.textContent).toBe('LayoutFirstSecond fallbackFooter');
      },
    );
  });

  // @gate enableServerErrorBoundary && enableSuspenseList
  it('completes the stream when every error boundary in a together list fails', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    expect(React.unstable_SuspenseList).toBeDefined();
    const firstError = new Error('First failure');
    const secondError = new Error('Second failure');
    const events = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <React.unstable_SuspenseList revealOrder="together">
          <ServerErrorBoundary fallback={<p>First fallback</p>}>
            <Throw error={firstError} />
          </ServerErrorBoundary>
          <ServerErrorBoundary fallback={<p>Second fallback</p>}>
            <Throw error={secondError} />
          </ServerErrorBoundary>
        </React.unstable_SuspenseList>,
        {
          onError(caught) {
            events.push(caught);
          },
          onShellReady() {
            events.push('shell');
          },
          onAllReady() {
            events.push('all');
          },
        },
      ).pipe(destination);
    });
    expect(events).toEqual([firstError, secondError, 'shell', 'all']);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('First fallbackSecond fallback');
  });

  [
    ['forwards', false],
    ['forwards', true],
    ['together', false],
    ['together', true],
  ].forEach(([revealOrder, asynchronous]) => {
    // @gate enableServerErrorBoundary && enableSuspenseList
    it(
      'unblocks an outer ordered row after a nested ' +
        revealOrder +
        ' list fails (async: ' +
        asynchronous +
        ')',
      async () => {
        expect(ServerErrorBoundary).toBeDefined();
        expect(React.unstable_SuspenseList).toBeDefined();
        const deferred = createDeferred();
        const error = new Error('Nested failure');
        const events = [];
        const {destination, output} = createDestination();
        await serverAct(() => {
          ReactDOMServer.renderToPipeableStream(
            <React.unstable_SuspenseList revealOrder="forwards">
              <React.unstable_SuspenseList revealOrder={revealOrder}>
                <ServerErrorBoundary fallback={<p>First fallback</p>}>
                  {asynchronous ? (
                    <Read promise={deferred.promise} />
                  ) : (
                    <Throw error={error} />
                  )}
                </ServerErrorBoundary>
                <ServerErrorBoundary fallback={<p>Second fallback</p>}>
                  <span>Second</span>
                </ServerErrorBoundary>
              </React.unstable_SuspenseList>
              <ServerErrorBoundary fallback={<p>Last fallback</p>}>
                <span>Last</span>
              </ServerErrorBoundary>
            </React.unstable_SuspenseList>,
            {
              onError(caught) {
                events.push(caught);
              },
              onShellReady() {
                events.push('shell');
              },
              onAllReady() {
                events.push('all');
              },
            },
          ).pipe(destination);
        });
        if (asynchronous) {
          expect(output.html).toBe('');
          await serverAct(() => deferred.reject(error));
        }
        expect(events).toEqual([error, 'shell', 'all']);
        const container = document.createElement('div');
        container.innerHTML = output.html;
        expect(container.textContent).toBe('First fallbackSecondLast');
      },
    );
  });

  // @gate enableServerErrorBoundary
  it('resumes an aborted prerender without using the error fallback for loading', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    const deferred = createDeferred();
    const controller = new AbortController();
    const errors = [];
    const app = (
      <Layout>
        <ServerErrorBoundary fallback={<p>Unavailable</p>}>
          <Read promise={deferred.promise} />
        </ServerErrorBoundary>
      </Layout>
    );
    let prerender;
    await serverAct(() => {
      prerender = ReactDOMStatic.prerenderToNodeStream(app, {
        signal: controller.signal,
        onError(error) {
          errors.push(error);
        },
      });
    });
    await serverAct(() => controller.abort('Prerender timeout'));
    const {prelude, postponed} = await prerender;
    expect(errors).toContain('Prerender timeout');
    const initial = createDestination();
    await serverAct(() => prelude.pipe(initial.destination));
    expect(initial.output.html).toBe('');
    expect(postponed).not.toBe(null);

    await serverAct(() => deferred.resolve('Content'));
    const resumed = createDestination();
    await serverAct(() => {
      ReactDOMServer.resumeToPipeableStream(
        app,
        JSON.parse(JSON.stringify(postponed)),
        {
          onError(error) {
            errors.push(error);
          },
        },
      ).pipe(resumed.destination);
    });
    const container = document.createElement('div');
    container.innerHTML = resumed.output.html;
    expect(container.textContent).toBe('LayoutContentFooter');
    expect(resumed.output.error).toBe(undefined);
  });

  // @gate enableServerErrorBoundary && enableSuspenseList
  it('preserves explicit Suspense reveal order when resuming through error boundaries', async () => {
    expect(ServerErrorBoundary).toBeDefined();
    expect(React.unstable_SuspenseList).toBeDefined();
    const first = createDeferred();
    const second = createDeferred();
    const controller = new AbortController();
    const app = (
      <Layout>
        <React.unstable_SuspenseList revealOrder="forwards">
          <ServerErrorBoundary fallback={<p>First error</p>}>
            <React.Suspense fallback={<p>First loading</p>}>
              <Read promise={first.promise} />
            </React.Suspense>
          </ServerErrorBoundary>
          <ServerErrorBoundary fallback={<p>Second error</p>}>
            <React.Suspense fallback={<p>Second loading</p>}>
              <Read promise={second.promise} />
            </React.Suspense>
          </ServerErrorBoundary>
        </React.unstable_SuspenseList>
      </Layout>
    );
    let prerender;
    await serverAct(() => {
      prerender = ReactDOMStatic.prerenderToNodeStream(app, {
        signal: controller.signal,
        onError() {},
      });
    });
    await serverAct(() => controller.abort('Prerender timeout'));
    const {prelude, postponed} = await prerender;
    const initial = createDestination();
    await serverAct(() => prelude.pipe(initial.destination));
    const container = document.createElement('div');
    container.innerHTML = initial.output.html;
    const templates = container.querySelectorAll('template');
    expect(templates).toHaveLength(2);
    const secondBoundaryId = templates[1].id;

    const resumed = createDestination();
    await serverAct(() => {
      ReactDOMServer.resumeToPipeableStream(
        app,
        JSON.parse(JSON.stringify(postponed)),
        {onError() {}},
      ).pipe(resumed.destination);
    });
    await serverAct(() => second.resolve('Second'));
    expect(resumed.output.html).not.toContain(
      '$RC("' + secondBoundaryId + '",',
    );
    await serverAct(() => first.resolve('First'));
    expect(resumed.output.html).toContain('$RC("' + secondBoundaryId + '",');
    expect(resumed.output.error).toBe(undefined);
  });

  // @gate enableServerErrorBoundary
  it('waits for a fallback that suspends after an error', async () => {
    const deferred = createDeferred();
    const error = new Error('Child failure');
    const errors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<Read promise={deferred.promise} />}>
            <Throw error={error} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            errors.push(caught);
          },
        },
      ).pipe(destination);
    });
    expect(output.html).toBe('');
    expect(errors).toEqual([error]);

    await serverAct(() => deferred.resolve('Unavailable'));
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutUnavailableFooter');
  });

  // @gate enableServerErrorBoundary
  it('propagates an error in a fallback to an outer boundary', async () => {
    const childError = new Error('Child failure');
    const fallbackError = new Error('Fallback failure');
    const errors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Outer fallback</p>}>
            <ServerErrorBoundary fallback={<Throw error={fallbackError} />}>
              <Throw error={childError} />
            </ServerErrorBoundary>
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            errors.push(caught);
          },
        },
      ).pipe(destination);
    });
    expect(errors).toEqual([childError, fallbackError]);
    expect(output.error).toBe(undefined);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('LayoutOuter fallbackFooter');
  });

  // @gate enableServerErrorBoundary
  it('reports a shell error if a fallback fails without an outer boundary', async () => {
    const childError = new Error('Child failure');
    const fallbackError = new Error('Fallback failure');
    const errors = [];
    const shellErrors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <ServerErrorBoundary fallback={<Throw error={fallbackError} />}>
          <Throw error={childError} />
        </ServerErrorBoundary>,
        {
          onError(caught) {
            errors.push(caught);
          },
          onShellError(caught) {
            shellErrors.push(caught);
          },
        },
      ).pipe(destination);
    });
    expect(errors).toEqual([childError, fallbackError]);
    expect(shellErrors).toEqual([fallbackError]);
    expect(output.error).toBe(fallbackError);
    expect(output.html).toBe('');
  });

  // @gate enableServerErrorBoundary
  it('handles null and undefined thrown values', async () => {
    const errors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Null fallback</p>}>
            <Throw error={null} />
          </ServerErrorBoundary>
          <ServerErrorBoundary fallback={<p>Undefined fallback</p>}>
            <Throw error={undefined} />
          </ServerErrorBoundary>
        </Layout>,
        {
          onError(caught) {
            errors.push(caught);
          },
        },
      ).pipe(destination);
    });
    expect(errors).toEqual([null, undefined]);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe(
      'LayoutNull fallbackUndefined fallbackFooter',
    );
  });

  // @gate enableServerErrorBoundary
  it('keeps large successful content visible without scripts when chunking', async () => {
    const content = 'Content '.repeat(512);
    const errors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(
        <Layout>
          <ServerErrorBoundary fallback={<p>Unavailable</p>}>
            <article>{content}</article>
          </ServerErrorBoundary>
        </Layout>,
        {
          progressiveChunkSize: 1,
          onError(error) {
            errors.push(error);
          },
        },
      ).pipe(destination);
    });

    if (gate(flags => flags.enableFizzBlockingRender)) {
      // The artificially small chunk limit also lowers the shell-size warning
      // threshold. This diagnostic must not turn into an error fallback.
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('This rendered a large document');
    } else {
      expect(errors).toEqual([]);
    }
    expect(output.html).not.toContain('Unavailable');
    const container = document.createElement('div');
    container.innerHTML = output.html;
    expect(container.textContent).toBe('Layout' + content + 'Footer');
    expect(container.querySelector('[hidden]')).toBe(null);
    expect(container.querySelector('script')).toBe(null);
  });

  // @gate enableServerErrorBoundary
  it('hydrates successful content without changing useId or replacing DOM', async () => {
    function Content() {
      const id = React.useId();
      return <span id={id}>Content</span>;
    }
    const app = (
      <Layout>
        <ServerErrorBoundary fallback={<p>Unavailable</p>}>
          <Content />
        </ServerErrorBoundary>
      </Layout>
    );
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(app).pipe(destination);
    });
    const container = document.createElement('div');
    container.innerHTML = output.html;
    const header = container.querySelector('header');
    const content = container.querySelector('span');
    const id = content.id;
    const errors = [];
    await act(() => {
      ReactDOMClient.hydrateRoot(container, app, {
        onRecoverableError(error) {
          errors.push(error);
        },
      });
    });
    expect(errors).toEqual([]);
    expect(container.querySelector('header')).toBe(header);
    expect(container.querySelector('span')).toBe(content);
    expect(container.querySelector('span').id).toBe(id);
  });

  // @gate enableServerErrorBoundary
  it('retries server failures on the client without replacing the layout', async () => {
    const serverError = new Error('Server-only failure');
    let shouldThrow = true;
    function Content() {
      if (shouldThrow) {
        throw serverError;
      }
      return <span>Recovered</span>;
    }
    const app = (
      <Layout>
        <ServerErrorBoundary fallback={<p>Unavailable</p>}>
          <Content />
        </ServerErrorBoundary>
      </Layout>
    );
    const serverErrors = [];
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(app, {
        onError(error) {
          serverErrors.push(error);
          return 'server-digest';
        },
      }).pipe(destination);
    });
    expect(serverErrors).toEqual([serverError]);
    const container = document.createElement('div');
    container.innerHTML = output.html;
    const header = container.querySelector('header');
    expect(container.textContent).toBe('LayoutUnavailableFooter');

    shouldThrow = false;
    const recoverableErrors = [];
    const caughtErrors = [];
    await act(() => {
      ReactDOMClient.hydrateRoot(container, app, {
        onRecoverableError(error) {
          recoverableErrors.push(error);
        },
        onCaughtError(error) {
          caughtErrors.push(error);
        },
      });
    });
    expect(container.textContent).toBe('LayoutRecoveredFooter');
    expect(container.querySelector('header')).toBe(header);
    expect(caughtErrors).toEqual([]);
    expect(recoverableErrors).toHaveLength(1);
    expect(recoverableErrors[0].digest).toBe('server-digest');
  });

  // @gate enableServerErrorBoundary
  it('keeps the fallback for a persistent hydration error and resets on a new key', async () => {
    const error = new Error('Persistent failure');
    let shouldThrow = true;
    function Content() {
      if (shouldThrow) {
        throw error;
      }
      return <span>Recovered</span>;
    }
    function App({boundaryKey}) {
      return (
        <Layout>
          <ServerErrorBoundary key={boundaryKey} fallback={<p>Unavailable</p>}>
            <Content />
          </ServerErrorBoundary>
        </Layout>
      );
    }
    const {destination, output} = createDestination();
    await serverAct(() => {
      ReactDOMServer.renderToPipeableStream(<App boundaryKey="a" />, {
        onError() {},
      }).pipe(destination);
    });
    const container = document.createElement('div');
    container.innerHTML = output.html;
    const header = container.querySelector('header');
    const caughtErrors = [];
    let root;
    await act(() => {
      root = ReactDOMClient.hydrateRoot(container, <App boundaryKey="a" />, {
        onRecoverableError() {},
        onCaughtError(caught) {
          caughtErrors.push(caught);
        },
      });
    });
    expect(caughtErrors).toEqual([error]);
    expect(container.textContent).toBe('LayoutUnavailableFooter');
    expect(container.querySelector('header')).toBe(header);

    shouldThrow = false;
    await act(() => root.render(<App boundaryKey="a" />));
    expect(container.textContent).toBe('LayoutUnavailableFooter');
    await act(() => root.render(<App boundaryKey="b" />));
    expect(container.textContent).toBe('LayoutRecoveredFooter');
    expect(container.querySelector('header')).toBe(header);
  });
});
