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
import {
  insertNodesAndExecuteScripts,
  mergeOptions,
  stripExternalRuntimeInNodes,
  getVisibleChildren,
} from '../test-utils/FizzTestUtils';

let JSDOM;
let Stream;
let Scheduler;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMFizzServer;
let ReactDOMFizzStatic;
let Suspense;
let SuspenseList;

let assertConsoleErrorDev;
let useSyncExternalStore;
let useSyncExternalStoreWithSelector;
let use;
let useActionState;
let PropTypes;
let textCache;
let writable;
let CSPnonce = null;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;
let renderOptions;
let waitFor;
let waitForAll;
let assertLog;
let waitForPaint;
let clientAct;
let streamingContainer;

function normalizeError(msg) {
  // Take the first sentence to make it easier to assert on.
  const idx = msg.indexOf('.');
  if (idx > -1) {
    return msg.slice(0, idx + 1);
  }
  return msg;
}

describe('ReactDOMFizzServer', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;

    const jsdom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body><div id="container">',
      {
        runScripts: 'dangerously',
      },
    );
    // We mock matchMedia. for simplicity it only matches 'all' or '' and misses everything else
    Object.defineProperty(jsdom.window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === 'all' || query === '',
        media: query,
      })),
    });
    streamingContainer = null;
    global.window = jsdom.window;
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    global.Node = global.window.Node;
    global.addEventListener = global.window.addEventListener;
    global.MutationObserver = global.window.MutationObserver;
    // The Fizz runtime assumes requestAnimationFrame exists so we need to polyfill it.
    global.requestAnimationFrame = global.window.requestAnimationFrame = cb =>
      setTimeout(cb);
    container = document.getElementById('container');

    CSPnonce = null;
    Scheduler = require('scheduler');
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server');
    ReactDOMFizzStatic = require('react-dom/static');
    Stream = require('stream');
    Suspense = React.Suspense;
    use = React.use;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }
    PropTypes = require('prop-types');
    if (__VARIANT__) {
      const originalConsoleError = console.error;
      console.error = (error, ...args) => {
        if (
          typeof error !== 'string' ||
          error.indexOf('ReactDOM.useFormState has been renamed') === -1
        ) {
          originalConsoleError(error, ...args);
        }
      };

      // Remove after API is deleted.
      useActionState = ReactDOM.useFormState;
    } else {
      useActionState = React.useActionState;
    }

    ({
      assertConsoleErrorDev,
      assertLog,
      act: clientAct,
      waitFor,
      waitForAll,
      waitForPaint,
    } = require('internal-test-utils'));

    if (gate(flags => flags.source)) {
      // The `with-selector` module composes the main `use-sync-external-store`
      // entrypoint. In the compiled artifacts, this is resolved to the `shim`
      // implementation by our build config, but when running the tests against
      // the source files, we need to tell Jest how to resolve it. Because this
      // is a source module, this mock has no affect on the build tests.
      jest.mock('use-sync-external-store/src/useSyncExternalStore', () =>
        jest.requireActual('react'),
      );
    }
    useSyncExternalStore = React.useSyncExternalStore;
    useSyncExternalStoreWithSelector =
      require('use-sync-external-store/with-selector').useSyncExternalStoreWithSelector;

    textCache = new Map();

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

    renderOptions = {};
    if (gate(flags => flags.shouldUseFizzExternalRuntime)) {
      renderOptions.unstable_externalRuntimeSrc =
        'react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js';
    }
  });

  function expectErrors(errorsArr, toBeDevArr, toBeProdArr) {
    const mappedErrows = errorsArr.map(({error, errorInfo}) => {
      const stack = errorInfo && errorInfo.componentStack;
      const digest = error.digest;
      if (stack) {
        return [error.message, digest, normalizeCodeLocInfo(stack)];
      } else if (digest) {
        return [error.message, digest];
      }
      return error.message;
    });
    if (__DEV__) {
      expect(mappedErrows).toEqual(toBeDevArr);
    } else {
      expect(mappedErrows).toEqual(toBeProdArr);
    }
  }

  function componentStack(components) {
    return components
      .map(component => `\n    in ${component} (at **)`)
      .join('');
  }

  const bodyStartMatch = /<body(?:>| .*?>)/;
  const headStartMatch = /<head(?:>| .*?>)/;

  async function act(callback) {
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
    let bufferedContent = buffer;
    buffer = '';

    if (!bufferedContent) {
      jest.runAllTimers();
      return;
    }

    const bodyMatch = bufferedContent.match(bodyStartMatch);
    const headMatch = bufferedContent.match(headStartMatch);

    if (streamingContainer === null) {
      // This is the first streamed content. We decide here where to insert it. If we get <html>, <head>, or <body>
      // we abandon the pre-built document and start from scratch. If we get anything else we assume it goes into the
      // container. This is not really production behavior because you can't correctly stream into a deep div effectively
      // but it's pragmatic for tests.

      if (
        bufferedContent.startsWith('<head>') ||
        bufferedContent.startsWith('<head ') ||
        bufferedContent.startsWith('<body>') ||
        bufferedContent.startsWith('<body ')
      ) {
        // wrap in doctype to normalize the parsing process
        bufferedContent = '<!DOCTYPE html><html>' + bufferedContent;
      } else if (
        bufferedContent.startsWith('<html>') ||
        bufferedContent.startsWith('<html ')
      ) {
        throw new Error(
          'Recieved <html> without a <!DOCTYPE html> which is almost certainly a bug in React',
        );
      }

      if (bufferedContent.startsWith('<!DOCTYPE html>')) {
        // we can just use the whole document
        const tempDom = new JSDOM(bufferedContent);

        // Wipe existing head and body content
        document.head.innerHTML = '';
        document.body.innerHTML = '';

        // Copy the <html> attributes over
        const tempHtmlNode = tempDom.window.document.documentElement;
        for (let i = 0; i < tempHtmlNode.attributes.length; i++) {
          const attr = tempHtmlNode.attributes[i];
          document.documentElement.setAttribute(attr.name, attr.value);
        }

        if (headMatch) {
          // We parsed a head open tag. we need to copy head attributes and insert future
          // content into <head>
          streamingContainer = document.head;
          const tempHeadNode = tempDom.window.document.head;
          for (let i = 0; i < tempHeadNode.attributes.length; i++) {
            const attr = tempHeadNode.attributes[i];
            document.head.setAttribute(attr.name, attr.value);
          }
          const source = document.createElement('head');
          source.innerHTML = tempHeadNode.innerHTML;
          await insertNodesAndExecuteScripts(source, document.head, CSPnonce);
        }

        if (bodyMatch) {
          // We parsed a body open tag. we need to copy head attributes and insert future
          // content into <body>
          streamingContainer = document.body;
          const tempBodyNode = tempDom.window.document.body;
          for (let i = 0; i < tempBodyNode.attributes.length; i++) {
            const attr = tempBodyNode.attributes[i];
            document.body.setAttribute(attr.name, attr.value);
          }
          const source = document.createElement('body');
          source.innerHTML = tempBodyNode.innerHTML;
          await insertNodesAndExecuteScripts(source, document.body, CSPnonce);
        }

        if (!headMatch && !bodyMatch) {
          throw new Error('expected <head> or <body> after <html>');
        }
      } else {
        // we assume we are streaming into the default container'
        streamingContainer = container;
        const div = document.createElement('div');
        div.innerHTML = bufferedContent;
        await insertNodesAndExecuteScripts(div, container, CSPnonce);
      }
    } else if (streamingContainer === document.head) {
      bufferedContent = '<!DOCTYPE html><html><head>' + bufferedContent;
      const tempDom = new JSDOM(bufferedContent);

      const tempHeadNode = tempDom.window.document.head;
      const source = document.createElement('head');
      source.innerHTML = tempHeadNode.innerHTML;
      await insertNodesAndExecuteScripts(source, document.head, CSPnonce);

      if (bodyMatch) {
        streamingContainer = document.body;

        const tempBodyNode = tempDom.window.document.body;
        for (let i = 0; i < tempBodyNode.attributes.length; i++) {
          const attr = tempBodyNode.attributes[i];
          document.body.setAttribute(attr.name, attr.value);
        }
        const bodySource = document.createElement('body');
        bodySource.innerHTML = tempBodyNode.innerHTML;
        await insertNodesAndExecuteScripts(bodySource, document.body, CSPnonce);
      }
    } else {
      const div = document.createElement('div');
      div.innerHTML = bufferedContent;
      await insertNodesAndExecuteScripts(div, streamingContainer, CSPnonce);
    }
    // Let throttled boundaries reveal
    jest.runAllTimers();
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

  function rejectText(text, error) {
    const record = textCache.get(text);
    if (record === undefined) {
      const newRecord = {
        status: 'rejected',
        value: error,
      };
      textCache.set(text, newRecord);
    } else if (record.status === 'pending') {
      const thenable = record.value;
      record.status = 'rejected';
      record.value = error;
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
    return text;
  }

  function AsyncText({text}) {
    return readText(text);
  }

  function AsyncTextWrapped({as, text}) {
    const As = as;
    return <As>{readText(text)}</As>;
  }
  function renderToPipeableStream(jsx, options) {
    // Merge options with renderOptions, which may contain featureFlag specific behavior
    return ReactDOMFizzServer.renderToPipeableStream(
      jsx,
      mergeOptions(options, renderOptions),
    );
  }

  it('should asynchronously load a lazy component', async () => {
    let resolveA;
    const LazyA = React.lazy(() => {
      return new Promise(r => {
        resolveA = r;
      });
    });

    let resolveB;
    const LazyB = React.lazy(() => {
      return new Promise(r => {
        resolveB = r;
      });
    });

    class TextWithPunctuation extends React.Component {
      render() {
        return <Text text={this.props.text + this.props.punctuation} />;
      }
    }

    // This tests that default props of the inner element is resolved.
    TextWithPunctuation.defaultProps = {
      punctuation: '!',
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <div>
            <Suspense fallback={<Text text="Loading..." />}>
              <LazyA text="Hello" />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<Text text="Loading..." />}>
              <LazyB text="world" />
            </Suspense>
          </div>
        </div>,
      );
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Loading...</div>
        <div>Loading...</div>
      </div>,
    );
    await act(() => {
      resolveA({default: Text});
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Hello</div>
        <div>Loading...</div>
      </div>,
    );
    await act(() => {
      resolveB({default: TextWithPunctuation});
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Hello</div>
        <div>world!</div>
      </div>,
    );
  });

  it('#23331: does not warn about hydration mismatches if something suspended in an earlier sibling', async () => {
    const makeApp = () => {
      let resolve;
      const imports = new Promise(r => {
        resolve = () => r({default: () => <span id="async">async</span>});
      });
      const Lazy = React.lazy(() => imports);

      const App = () => (
        <div>
          <Suspense fallback={<span>Loading...</span>}>
            <Lazy />
            <span id="after">after</span>
          </Suspense>
        </div>
      );

      return [App, resolve];
    };

    // Server-side
    const [App, resolve] = makeApp();
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>Loading...</span>
      </div>,
    );
    await act(() => {
      resolve();
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span id="async">async</span>
        <span id="after">after</span>
      </div>,
    );

    // Client-side
    const [HydrateApp, hydrateResolve] = makeApp();
    await act(() => {
      ReactDOMClient.hydrateRoot(container, <HydrateApp />);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span id="async">async</span>
        <span id="after">after</span>
      </div>,
    );

    await act(() => {
      hydrateResolve();
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span id="async">async</span>
        <span id="after">after</span>
      </div>,
    );
  });

  it('should support nonce for bootstrap and runtime scripts', async () => {
    CSPnonce = 'R4nd0m';
    try {
      let resolve;
      const Lazy = React.lazy(() => {
        return new Promise(r => {
          resolve = r;
        });
      });

      await act(() => {
        const {pipe} = renderToPipeableStream(
          <div>
            <Suspense fallback={<Text text="Loading..." />}>
              <Lazy text="Hello" />
            </Suspense>
          </div>,
          {
            nonce: 'R4nd0m',
            bootstrapScriptContent: 'function noop(){}',
            bootstrapScripts: [
              'init.js',
              {src: 'init2.js', integrity: 'init2hash'},
            ],
            bootstrapModules: [
              'init.mjs',
              {src: 'init2.mjs', integrity: 'init2hash'},
            ],
          },
        );
        pipe(writable);
      });

      expect(getVisibleChildren(container)).toEqual([
        <link
          rel="preload"
          fetchpriority="low"
          href="init.js"
          as="script"
          nonce={CSPnonce}
        />,
        <link
          rel="preload"
          fetchpriority="low"
          href="init2.js"
          as="script"
          nonce={CSPnonce}
          integrity="init2hash"
        />,
        <link
          rel="modulepreload"
          fetchpriority="low"
          href="init.mjs"
          nonce={CSPnonce}
        />,
        <link
          rel="modulepreload"
          fetchpriority="low"
          href="init2.mjs"
          nonce={CSPnonce}
          integrity="init2hash"
        />,
        <div>Loading...</div>,
      ]);

      // check that there are 6 scripts with a matching nonce:
      // The runtime script or initial paint time, an inline bootstrap script, two bootstrap scripts and two bootstrap modules
      expect(
        Array.from(container.getElementsByTagName('script')).filter(
          node => node.getAttribute('nonce') === CSPnonce,
        ).length,
      ).toEqual(6);

      await act(() => {
        resolve({default: Text});
      });
      expect(getVisibleChildren(container)).toEqual([
        <link
          rel="preload"
          fetchpriority="low"
          href="init.js"
          as="script"
          nonce={CSPnonce}
        />,
        <link
          rel="preload"
          fetchpriority="low"
          href="init2.js"
          as="script"
          nonce={CSPnonce}
          integrity="init2hash"
        />,
        <link
          rel="modulepreload"
          fetchpriority="low"
          href="init.mjs"
          nonce={CSPnonce}
        />,
        <link
          rel="modulepreload"
          fetchpriority="low"
          href="init2.mjs"
          nonce={CSPnonce}
          integrity="init2hash"
        />,
        <div>Hello</div>,
      ]);
    } finally {
      CSPnonce = null;
    }
  });

  it('should not automatically add nonce to rendered scripts', async () => {
    CSPnonce = 'R4nd0m';
    try {
      await act(async () => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <script nonce={CSPnonce}>{'try { foo() } catch (e) {} ;'}</script>
              <script nonce={CSPnonce} src="foo" async={true} />
              <script src="bar" />
              <script src="baz" integrity="qux" async={true} />
              <script type="module" src="quux" async={true} />
              <script type="module" src="corge" async={true} />
              <script
                type="module"
                src="grault"
                integrity="garply"
                async={true}
              />
            </body>
          </html>,
          {
            nonce: CSPnonce,
          },
        );
        pipe(writable);
      });

      expect(
        stripExternalRuntimeInNodes(
          document.getElementsByTagName('script'),
          renderOptions.unstable_externalRuntimeSrc,
        ).map(n => n.outerHTML),
      ).toEqual([
        `<script nonce="${CSPnonce}" src="foo" async=""></script>`,
        `<script src="baz" integrity="qux" async=""></script>`,
        `<script type="module" src="quux" async=""></script>`,
        `<script type="module" src="corge" async=""></script>`,
        `<script type="module" src="grault" integrity="garply" async=""></script>`,
        `<script nonce="${CSPnonce}">try { foo() } catch (e) {} ;</script>`,
        `<script src="bar"></script>`,
      ]);
    } finally {
      CSPnonce = null;
    }
  });

  it('should client render a boundary if a lazy component rejects', async () => {
    let rejectComponent;
    const promise = new Promise((resolve, reject) => {
      rejectComponent = reject;
    });
    const LazyComponent = React.lazy(() => {
      return promise;
    });

    const LazyLazy = React.lazy(async () => {
      return {
        default: LazyComponent,
      };
    });

    function Wrapper({children}) {
      return children;
    }
    const LazyWrapper = React.lazy(() => {
      return {
        then(callback) {
          callback({
            default: Wrapper,
          });
        },
      };
    });

    function App({isClient}) {
      return (
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            <LazyWrapper>
              {isClient ? <Text text="Hello" /> : <LazyLazy text="Hello" />}
            </LazyWrapper>
          </Suspense>
        </div>
      );
    }

    let bootstrapped = false;
    const errors = [];
    window.__INIT__ = function () {
      bootstrapped = true;
      // Attempt to hydrate the content.
      ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
        onRecoverableError(error, errorInfo) {
          errors.push({error, errorInfo});
        },
      });
    };

    const theError = new Error('Test');
    const loggedErrors = [];
    function onError(x, errorInfo) {
      loggedErrors.push(x);
      return 'Hash of (' + x.message + ')';
    }
    const expectedDigest = onError(theError);
    loggedErrors.length = 0;

    await act(() => {
      const {pipe} = renderToPipeableStream(<App isClient={false} />, {
        bootstrapScriptContent: '__INIT__();',
        onError,
      });
      pipe(writable);
    });

    expect(loggedErrors).toEqual([]);
    expect(bootstrapped).toBe(true);

    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    expect(loggedErrors).toEqual([]);

    await act(() => {
      rejectComponent(theError);
    });

    expect(loggedErrors).toEqual([theError]);

    // We haven't ran the client hydration yet.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    // Now we can client render it instead.
    await waitForAll([]);
    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering errored:\n\n' +
            theError.message,
          expectedDigest,
          componentStack(['Lazy', 'Wrapper', 'Suspense', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );

    // The client rendered HTML is now in place.
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);

    expect(loggedErrors).toEqual([theError]);
  });

  it('should have special stacks if Suspense fallback', async () => {
    const infinitePromise = new Promise(() => {});
    const InfiniteComponent = React.lazy(() => {
      return infinitePromise;
    });

    function Throw({text}) {
      throw new Error(text);
    }

    function App() {
      return (
        <Suspense fallback="Loading">
          <div>
            <Suspense fallback={<Throw text="Bye" />}>
              <InfiniteComponent text="Hi" />
            </Suspense>
          </div>
        </Suspense>
      );
    }

    const loggedErrors = [];
    function onError(x, errorInfo) {
      loggedErrors.push({
        message: x.message,
        componentStack: errorInfo.componentStack,
      });
      return 'Hash of (' + x.message + ')';
    }
    loggedErrors.length = 0;

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError,
      });
      pipe(writable);
    });

    expect(loggedErrors.length).toBe(1);
    expect(loggedErrors[0].message).toBe('Bye');
    expect(normalizeCodeLocInfo(loggedErrors[0].componentStack)).toBe(
      componentStack(['Throw', 'Suspense Fallback', 'div', 'Suspense', 'App']),
    );
  });

  it('should asynchronously load a lazy element', async () => {
    let resolveElement;
    const lazyElement = React.lazy(() => {
      return new Promise(r => {
        resolveElement = r;
      });
    });

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            {lazyElement}
          </Suspense>
        </div>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    // Because there is no content inside the Suspense boundary that could've
    // been written, we expect to not see any additional partial data flushed
    // yet.
    expect(
      stripExternalRuntimeInNodes(
        container.childNodes,
        renderOptions.unstable_externalRuntimeSrc,
      ).length,
    ).toBe(gate(flags => flags.shouldUseFizzExternalRuntime) ? 1 : 2);
    await act(() => {
      resolveElement({default: <Text text="Hello" />});
    });
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);
  });

  it('should client render a boundary if a lazy element rejects', async () => {
    let rejectElement;
    const element = <Text text="Hello" />;
    const lazyElement = React.lazy(() => {
      return new Promise((resolve, reject) => {
        rejectElement = reject;
      });
    });

    const theError = new Error('Test');
    const loggedErrors = [];
    function onError(x, errorInfo) {
      loggedErrors.push(x);
      return 'hash of (' + x.message + ')';
    }
    const expectedDigest = onError(theError);
    loggedErrors.length = 0;

    function App({isClient}) {
      return (
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            {isClient ? element : lazyElement}
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App isClient={false} />, {
        onError,
      });
      pipe(writable);
    });
    expect(loggedErrors).toEqual([]);

    const errors = [];
    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });
    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    expect(loggedErrors).toEqual([]);

    await act(() => {
      rejectElement(theError);
    });

    expect(loggedErrors).toEqual([theError]);

    // We haven't ran the client hydration yet.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    // Now we can client render it instead.
    await waitForAll([]);

    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering errored:\n\n' +
            theError.message,
          expectedDigest,
          componentStack(['Suspense', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );

    // The client rendered HTML is now in place.
    // expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);

    expect(loggedErrors).toEqual([theError]);
  });

  it('Errors in boundaries should be sent to the client and reported on client render - Error before flushing', async () => {
    function Indirection({level, children}) {
      if (level > 0) {
        return <Indirection level={level - 1}>{children}</Indirection>;
      }
      return children;
    }

    const theError = new Error('uh oh');

    function Erroring({isClient}) {
      if (isClient) {
        return 'Hello World';
      }
      throw theError;
    }

    function App({isClient}) {
      return (
        <div>
          <Suspense fallback={<span>loading...</span>}>
            <Indirection level={2}>
              <Erroring isClient={isClient} />
            </Indirection>
          </Suspense>
        </div>
      );
    }

    const loggedErrors = [];
    function onError(x) {
      loggedErrors.push(x);
      return 'hash(' + x.message + ')';
    }
    const expectedDigest = onError(theError);
    loggedErrors.length = 0;

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <App />,

        {
          onError,
        },
      );
      pipe(writable);
    });
    expect(loggedErrors).toEqual([theError]);

    const errors = [];
    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });
    await waitForAll([]);

    expect(getVisibleChildren(container)).toEqual(<div>Hello World</div>);

    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering errored:\n\n' +
            theError.message,
          expectedDigest,
          componentStack([
            'Erroring',
            'Indirection',
            'Indirection',
            'Indirection',
            'Suspense',
            'div',
            'App',
          ]),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );
  });

  it('Errors in boundaries should be sent to the client and reported on client render - Error after flushing', async () => {
    let rejectComponent;
    const LazyComponent = React.lazy(() => {
      return new Promise((resolve, reject) => {
        rejectComponent = reject;
      });
    });

    function App({isClient}) {
      return (
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            {isClient ? <Text text="Hello" /> : <LazyComponent text="Hello" />}
          </Suspense>
        </div>
      );
    }

    const loggedErrors = [];
    const theError = new Error('uh oh');
    function onError(x) {
      loggedErrors.push(x);
      return 'hash(' + x.message + ')';
    }
    const expectedDigest = onError(theError);
    loggedErrors.length = 0;

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <App />,

        {
          onError,
        },
      );
      pipe(writable);
    });
    expect(loggedErrors).toEqual([]);

    const errors = [];
    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });
    await waitForAll([]);

    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    await act(() => {
      rejectComponent(theError);
    });

    expect(loggedErrors).toEqual([theError]);
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    // Now we can client render it instead.
    await waitForAll([]);

    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering errored:\n\n' +
            theError.message,
          expectedDigest,
          componentStack(['Lazy', 'Suspense', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );

    // The client rendered HTML is now in place.
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);
    expect(loggedErrors).toEqual([theError]);
  });

  it('should asynchronously load the suspense boundary', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Hello World" />
          </Suspense>
        </div>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    await act(() => {
      resolveText('Hello World');
    });
    expect(getVisibleChildren(container)).toEqual(<div>Hello World</div>);
  });

  it('waits for pending content to come in from the server and then hydrates it', async () => {
    const ref = React.createRef();

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <h1 ref={ref}>
              <AsyncText text="Hello" />
            </h1>
          </Suspense>
        </div>
      );
    }

    let bootstrapped = false;
    window.__INIT__ = function () {
      bootstrapped = true;
      // Attempt to hydrate the content.
      ReactDOMClient.hydrateRoot(container, <App />);
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        bootstrapScriptContent: '__INIT__();',
      });
      pipe(writable);
    });

    // We're still showing a fallback.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    // We already bootstrapped.
    expect(bootstrapped).toBe(true);

    // Attempt to hydrate the content.
    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    // The server now updates the content in place in the fallback.
    await act(() => {
      resolveText('Hello');
    });

    // The final HTML is now in place.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>Hello</h1>
      </div>,
    );
    const h1 = container.getElementsByTagName('h1')[0];

    // But it is not yet hydrated.
    expect(ref.current).toBe(null);

    await waitForAll([]);

    // Now it's hydrated.
    expect(ref.current).toBe(h1);
  });

  it('handles an error on the client if the server ends up erroring', async () => {
    const ref = React.createRef();

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return <b ref={ref}>{this.state.error.message}</b>;
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <ErrorBoundary>
          <div>
            <Suspense fallback="Loading...">
              <span ref={ref}>
                <AsyncText text="This Errors" />
              </span>
            </Suspense>
          </div>
        </ErrorBoundary>
      );
    }

    const loggedErrors = [];

    // We originally suspend the boundary and start streaming the loading state.
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <App />,

        {
          onError(x) {
            loggedErrors.push(x);
          },
        },
      );
      pipe(writable);
    });

    // We're still showing a fallback.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    expect(loggedErrors).toEqual([]);

    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    const theError = new Error('Error Message');
    await act(() => {
      rejectText('This Errors', theError);
    });

    expect(loggedErrors).toEqual([theError]);

    // The server errored, but we still haven't hydrated. We don't know if the
    // client will succeed yet, so we still show the loading state.
    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    expect(ref.current).toBe(null);

    // Flush the hydration.
    await waitForAll([]);

    // Hydrating should've generated an error and replaced the suspense boundary.
    expect(getVisibleChildren(container)).toEqual(<b>Error Message</b>);

    const b = container.getElementsByTagName('b')[0];
    expect(ref.current).toBe(b);
  });

  // @gate enableSuspenseList
  it('shows inserted items before pending in a SuspenseList as fallbacks while hydrating', async () => {
    const ref = React.createRef();

    // These are hoisted to avoid them from rerendering.
    const a = (
      <Suspense fallback="Loading A">
        <span ref={ref}>
          <AsyncText text="A" />
        </span>
      </Suspense>
    );
    const b = (
      <Suspense fallback="Loading B">
        <span>
          <Text text="B" />
        </span>
      </Suspense>
    );

    function App({showMore}) {
      return (
        <div>
          <SuspenseList revealOrder="forwards" tail="visible">
            {a}
            {b}
            {showMore ? (
              <Suspense fallback="Loading C">
                <span>C</span>
              </Suspense>
            ) : null}
          </SuspenseList>
        </div>
      );
    }

    // We originally suspend the boundary and start streaming the loading state.
    await act(() => {
      const {pipe} = renderToPipeableStream(<App showMore={false} />);
      pipe(writable);
    });

    const root = ReactDOMClient.hydrateRoot(
      container,
      <App showMore={false} />,
    );
    await waitForAll([]);

    // We're not hydrated yet.
    expect(ref.current).toBe(null);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        {'Loading A'}
        {'Loading B'}
      </div>,
    );

    // Add more rows before we've hydrated the first two.
    root.render(<App showMore={true} />);
    await waitForAll([]);

    // We're not hydrated yet.
    expect(ref.current).toBe(null);

    // We haven't resolved yet.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        {'Loading A'}
        {'Loading B'}
        {'Loading C'}
      </div>,
    );

    await act(async () => {
      await resolveText('A');
    });

    await waitForAll([]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </div>,
    );

    const span = container.getElementsByTagName('span')[0];
    expect(ref.current).toBe(span);
  });

  it('client renders a boundary if it does not resolve before aborting', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <h1>
              <AsyncText text="Hello" />
            </h1>
          </Suspense>
          <main>
            <Suspense fallback="loading...">
              <AsyncText text="World" />
            </Suspense>
          </main>
        </div>
      );
    }

    const loggedErrors = [];
    const expectedDigest = 'Hash for Abort';
    function onError(error) {
      loggedErrors.push(error);
      return expectedDigest;
    }

    let controls;
    await act(() => {
      controls = renderToPipeableStream(<App />, {onError});
      controls.pipe(writable);
    });

    // We're still showing a fallback.

    const errors = [];
    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });
    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        Loading...<main>loading...</main>
      </div>,
    );

    // We abort the server response.
    await act(() => {
      controls.abort();
    });

    // We still can't render it on the client.
    await waitForAll([]);
    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'The render was aborted by the server without a reason.',
          expectedDigest,
          // We get the stack of the task when it was aborted which is why we see `h1`
          componentStack(['AsyncText', 'h1', 'Suspense', 'div', 'App']),
        ],
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'The render was aborted by the server without a reason.',
          expectedDigest,
          componentStack(['AsyncText', 'Suspense', 'main', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );
    expect(getVisibleChildren(container)).toEqual(
      <div>
        Loading...<main>loading...</main>
      </div>,
    );

    // We now resolve it on the client.
    await clientAct(() => {
      resolveText('Hello');
      resolveText('World');
    });
    assertLog([]);

    // The client rendered HTML is now in place.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>Hello</h1>
        <main>World</main>
      </div>,
    );
  });

  it('should allow for two containers to be written to the same document', async () => {
    // We create two passthrough streams for each container to write into.
    // Notably we don't implement a end() call for these. Because we don't want to
    // close the underlying stream just because one of the streams is done. Instead
    // we manually close when both are done.
    const writableA = new Stream.Writable();
    writableA._write = (chunk, encoding, next) => {
      writable.write(chunk, encoding, next);
    };
    const writableB = new Stream.Writable();
    writableB._write = (chunk, encoding, next) => {
      writable.write(chunk, encoding, next);
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(
        // We use two nested boundaries to flush out coverage of an old reentrancy bug.
        <div>
          <Suspense fallback="Loading...">
            <Suspense fallback={<Text text="Loading A..." />}>
              <>
                <Text text="This will show A: " />
                <div>
                  <AsyncText text="A" />
                </div>
              </>
            </Suspense>
          </Suspense>
        </div>,
        {
          identifierPrefix: 'A_',
          onShellReady() {
            writableA.write('<div id="container-A">');
            pipe(writableA);
            writableA.write('</div>');
          },
        },
      );
    });

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Suspense fallback={<Text text="Loading B..." />}>
            <Text text="This will show B: " />
            <div>
              <AsyncText text="B" />
            </div>
          </Suspense>
        </div>,
        {
          identifierPrefix: 'B_',
          onShellReady() {
            writableB.write('<div id="container-B">');
            pipe(writableB);
            writableB.write('</div>');
          },
        },
      );
    });

    expect(getVisibleChildren(container)).toEqual([
      <div id="container-A">
        <div>Loading A...</div>
      </div>,
      <div id="container-B">
        <div>Loading B...</div>
      </div>,
    ]);

    await act(() => {
      resolveText('B');
    });

    expect(getVisibleChildren(container)).toEqual([
      <div id="container-A">
        <div>Loading A...</div>
      </div>,
      <div id="container-B">
        <div>
          This will show B: <div>B</div>
        </div>
      </div>,
    ]);

    await act(() => {
      resolveText('A');
    });

    // We're done writing both streams now.
    writable.end();

    expect(getVisibleChildren(container)).toEqual([
      <div id="container-A">
        <div>
          This will show A: <div>A</div>
        </div>
      </div>,
      <div id="container-B">
        <div>
          This will show B: <div>B</div>
        </div>
      </div>,
    ]);
  });

  it('can resolve async content in esoteric parents', async () => {
    function AsyncOption({text}) {
      return <option>{readText(text)}</option>;
    }

    function AsyncCol({className}) {
      return <col className={readText(className)} />;
    }

    function AsyncPath({id}) {
      return <path id={readText(id)} />;
    }

    function AsyncMi({id}) {
      return <mi id={readText(id)} />;
    }

    function App() {
      return (
        <div>
          <select>
            <Suspense fallback="Loading...">
              <AsyncOption text="Hello" />
            </Suspense>
          </select>
          <Suspense fallback="Loading...">
            <table>
              <colgroup>
                <AsyncCol className="World" />
              </colgroup>
            </table>
            <svg>
              <g>
                <AsyncPath id="my-path" />
              </g>
            </svg>
            <math>
              <AsyncMi id="my-mi" />
            </math>
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <select>Loading...</select>Loading...
      </div>,
    );

    await act(() => {
      resolveText('Hello');
    });

    await act(() => {
      resolveText('World');
    });

    await act(() => {
      resolveText('my-path');
      resolveText('my-mi');
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <select>
          <option>Hello</option>
        </select>
        <table>
          <colgroup>
            <col class="World" />
          </colgroup>
        </table>
        <svg>
          <g>
            <path id="my-path" />
          </g>
        </svg>
        <math>
          <mi id="my-mi" />
        </math>
      </div>,
    );

    expect(container.querySelector('#my-path').namespaceURI).toBe(
      'http://www.w3.org/2000/svg',
    );
    expect(container.querySelector('#my-mi').namespaceURI).toBe(
      'http://www.w3.org/1998/Math/MathML',
    );
  });

  it('can resolve async content in table parents', async () => {
    function AsyncTableBody({className, children}) {
      return <tbody className={readText(className)}>{children}</tbody>;
    }

    function AsyncTableRow({className, children}) {
      return <tr className={readText(className)}>{children}</tr>;
    }

    function AsyncTableCell({text}) {
      return <td>{readText(text)}</td>;
    }

    function App() {
      return (
        <table>
          <Suspense
            fallback={
              <tbody>
                <tr>
                  <td>Loading...</td>
                </tr>
              </tbody>
            }>
            <AsyncTableBody className="A">
              <AsyncTableRow className="B">
                <AsyncTableCell text="C" />
              </AsyncTableRow>
            </AsyncTableBody>
          </Suspense>
        </table>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <table>
        <tbody>
          <tr>
            <td>Loading...</td>
          </tr>
        </tbody>
      </table>,
    );

    await act(() => {
      resolveText('A');
    });

    await act(() => {
      resolveText('B');
    });

    await act(() => {
      resolveText('C');
    });

    expect(getVisibleChildren(container)).toEqual(
      <table>
        <tbody class="A">
          <tr class="B">
            <td>C</td>
          </tr>
        </tbody>
      </table>,
    );
  });

  it('can stream into an SVG container', async () => {
    function AsyncPath({id}) {
      return <path id={readText(id)} />;
    }

    function App() {
      return (
        <g>
          <Suspense fallback={<text>Loading...</text>}>
            <AsyncPath id="my-path" />
          </Suspense>
        </g>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <App />,

        {
          namespaceURI: 'http://www.w3.org/2000/svg',
          onShellReady() {
            writable.write('<svg>');
            pipe(writable);
            writable.write('</svg>');
          },
        },
      );
    });

    expect(getVisibleChildren(container)).toEqual(
      <svg>
        <g>
          <text>Loading...</text>
        </g>
      </svg>,
    );

    await act(() => {
      resolveText('my-path');
    });

    expect(getVisibleChildren(container)).toEqual(
      <svg>
        <g>
          <path id="my-path" />
        </g>
      </svg>,
    );

    expect(container.querySelector('#my-path').namespaceURI).toBe(
      'http://www.w3.org/2000/svg',
    );
  });

  function normalizeCodeLocInfo(str) {
    return (
      str &&
      String(str).replace(/\n +(?:at|in) ([^\(]+) [^\n]*/g, function (m, name) {
        return '\n    in ' + name + ' (at **)';
      })
    );
  }

  it('should include a component stack across suspended boundaries', async () => {
    function B() {
      const children = [readText('Hello'), readText('World')];
      // Intentionally trigger a key warning here.
      return (
        <div>
          {children.map(function mapper(t) {
            return <span>{t}</span>;
          })}
        </div>
      );
    }
    function C() {
      return (
        <inCorrectTag>
          <Text text="Loading" />
        </inCorrectTag>
      );
    }
    function A() {
      return (
        <div>
          <Suspense fallback={<C />}>
            <B />
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<A />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <incorrecttag>Loading</incorrecttag>
      </div>,
    );

    assertConsoleErrorDev([
      '<inCorrectTag /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements.' +
        '\n' +
        '    in inCorrectTag (at **)\n' +
        '    in C (at **)\n' +
        '    in A (at **)',
    ]);

    await act(() => {
      resolveText('Hello');
      resolveText('World');
    });

    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n\nCheck the render method of `B`.' +
        ' See https://react.dev/link/warning-keys for more information.\n' +
        '    in span (at **)\n' +
        '    in mapper (at **)\n' +
        '    in Array.map (at **)\n' +
        '    in B (at **)\n' +
        '    in A (at **)',
    ]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>
          <span>Hello</span>
          <span>World</span>
        </div>
      </div>,
    );
  });

  // @gate !disableLegacyContext
  it('should can suspend in a class component with legacy context', async () => {
    class TestProvider extends React.Component {
      static childContextTypes = {
        test: PropTypes.string,
      };
      state = {ctxToSet: null};
      static getDerivedStateFromProps(props, state) {
        return {ctxToSet: props.ctx};
      }
      getChildContext() {
        return {
          test: this.state.ctxToSet,
        };
      }
      render() {
        return this.props.children;
      }
    }

    class TestConsumer extends React.Component {
      static contextTypes = {
        test: PropTypes.string,
      };
      render() {
        const child = (
          <b>
            <Text text={this.context.test} />
          </b>
        );
        if (this.props.prefix) {
          return (
            <>
              {readText(this.props.prefix)}
              {child}
            </>
          );
        }
        return child;
      }
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <TestProvider ctx="A">
          <div>
            <Suspense
              fallback={
                <>
                  <Text text="Loading: " />
                  <TestConsumer />
                </>
              }>
              <TestProvider ctx="B">
                <TestConsumer prefix="Hello: " />
              </TestProvider>
              <TestConsumer />
            </Suspense>
          </div>
        </TestProvider>,
      );
      pipe(writable);
    });
    assertConsoleErrorDev([
      'TestProvider uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in TestProvider (at **)',
      'TestConsumer uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in TestConsumer (at **)',
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        Loading: <b>A</b>
      </div>,
    );
    await act(() => {
      resolveText('Hello: ');
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        Hello: <b>B</b>
        <b>A</b>
      </div>,
    );
  });

  it('should resume the context from where it left off', async () => {
    const ContextA = React.createContext('A0');
    const ContextB = React.createContext('B0');

    function PrintA() {
      return (
        <ContextA.Consumer>{value => <Text text={value} />}</ContextA.Consumer>
      );
    }

    class PrintB extends React.Component {
      static contextType = ContextB;
      render() {
        return <Text text={this.context} />;
      }
    }

    function AsyncParent({text, children}) {
      return (
        <>
          <AsyncText text={text} />
          <b>{children}</b>
        </>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <PrintA />
          <div>
            <ContextA.Provider value="A0.1">
              <Suspense fallback={<Text text="Loading..." />}>
                <AsyncParent text="Child:">
                  <PrintA />
                </AsyncParent>
                <PrintB />
              </Suspense>
            </ContextA.Provider>
          </div>
          <PrintA />
        </div>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        A0<div>Loading...</div>A0
      </div>,
    );
    await act(() => {
      resolveText('Child:');
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        A0
        <div>
          Child:<b>A0.1</b>B0
        </div>
        A0
      </div>,
    );
  });

  it('should recover the outer context when an error happens inside a provider', async () => {
    const ContextA = React.createContext('A0');
    const ContextB = React.createContext('B0');

    function PrintA() {
      return (
        <ContextA.Consumer>{value => <Text text={value} />}</ContextA.Consumer>
      );
    }

    class PrintB extends React.Component {
      static contextType = ContextB;
      render() {
        return <Text text={this.context} />;
      }
    }

    function Throws() {
      const value = React.useContext(ContextA);
      throw new Error(value);
    }

    const loggedErrors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <PrintA />
          <div>
            <ContextA.Provider value="A0.1">
              <Suspense
                fallback={
                  <b>
                    <Text text="Loading..." />
                  </b>
                }>
                <ContextA.Provider value="A0.1.1">
                  <Throws />
                </ContextA.Provider>
              </Suspense>
              <PrintB />
            </ContextA.Provider>
          </div>
          <PrintA />
        </div>,

        {
          onError(x) {
            loggedErrors.push(x);
          },
        },
      );
      pipe(writable);
    });
    expect(loggedErrors.length).toBe(1);
    expect(loggedErrors[0].message).toEqual('A0.1.1');
    expect(getVisibleChildren(container)).toEqual(
      <div>
        A0
        <div>
          <b>Loading...</b>B0
        </div>
        A0
      </div>,
    );
  });

  it('client renders a boundary if it errors before finishing the fallback', async () => {
    function App({isClient}) {
      return (
        <div>
          <Suspense fallback="Loading root...">
            <div>
              <Suspense fallback={<AsyncText text="Loading..." />}>
                <h1>
                  {isClient ? (
                    <Text text="Hello" />
                  ) : (
                    <AsyncText text="Hello" />
                  )}
                </h1>
              </Suspense>
            </div>
          </Suspense>
        </div>
      );
    }

    const theError = new Error('Test');
    const loggedErrors = [];
    function onError(x) {
      loggedErrors.push(x);
      return `hash of (${x.message})`;
    }
    const expectedDigest = onError(theError);
    loggedErrors.length = 0;

    let controls;
    await act(() => {
      controls = renderToPipeableStream(
        <App isClient={false} />,

        {
          onError,
        },
      );
      controls.pipe(writable);
    });

    // We're still showing a fallback.

    const errors = [];
    // Attempt to hydrate the content.
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });
    await waitForAll([]);

    // We're still loading because we're waiting for the server to stream more content.
    expect(getVisibleChildren(container)).toEqual(<div>Loading root...</div>);

    expect(loggedErrors).toEqual([]);

    // Error the content, but we don't have a fallback yet.
    await act(() => {
      rejectText('Hello', theError);
    });

    expect(loggedErrors).toEqual([theError]);

    // We still can't render it on the client because we haven't unblocked the parent.
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual(<div>Loading root...</div>);

    // Unblock the loading state
    await act(() => {
      resolveText('Loading...');
    });

    // Now we're able to show the inner boundary.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Loading...</div>
      </div>,
    );

    // That will let us client render it instead.
    await waitForAll([]);
    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering errored:\n\n' +
            theError.message,
          expectedDigest,
          componentStack([
            'AsyncText',
            'h1',
            'Suspense',
            'div',
            'Suspense',
            'div',
            'App',
          ]),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          expectedDigest,
        ],
      ],
    );

    // The client rendered HTML is now in place.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>
          <h1>Hello</h1>
        </div>
      </div>,
    );

    expect(loggedErrors).toEqual([theError]);
  });

  it('should be able to abort the fallback if the main content finishes first', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Suspense fallback={<Text text="Loading Outer" />}>
            <div>
              <Suspense
                fallback={
                  <div>
                    <AsyncText text="Loading" />
                    Inner
                  </div>
                }>
                <AsyncText text="Hello" />
              </Suspense>
            </div>
          </Suspense>
        </div>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>Loading Outer</div>);
    // We should have received a partial segment containing the a partial of the fallback.
    expect(container.innerHTML).toContain('Inner');
    await act(() => {
      resolveText('Hello');
    });
    // We should've been able to display the content without waiting for the rest of the fallback.
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Hello</div>
      </div>,
    );
  });

  it('calls getServerSnapshot instead of getSnapshot', async () => {
    const ref = React.createRef();

    function getServerSnapshot() {
      return 'server';
    }

    function getClientSnapshot() {
      return 'client';
    }

    function subscribe() {
      return () => {};
    }

    function Child({text}) {
      Scheduler.log(text);
      return text;
    }

    function App() {
      const value = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
      );
      return (
        <div ref={ref}>
          <Child text={value} />
        </div>
      );
    }

    const loggedErrors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <Suspense fallback="Loading...">
          <App />
        </Suspense>,
        {
          onError(x) {
            loggedErrors.push(x);
          },
        },
      );
      pipe(writable);
    });
    assertLog(['server']);

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });

    // The first paint switches to client rendering due to mismatch
    await waitForPaint([
      'client',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    expect(getVisibleChildren(container)).toEqual(<div>client</div>);
  });

  // The selector implementation uses the lazy ref initialization pattern

  it('calls getServerSnapshot instead of getSnapshot (with selector and isEqual)', async () => {
    // Same as previous test, but with a selector that returns a complex object
    // that is memoized with a custom `isEqual` function.
    const ref = React.createRef();
    function getServerSnapshot() {
      return {env: 'server', other: 'unrelated'};
    }
    function getClientSnapshot() {
      return {env: 'client', other: 'unrelated'};
    }
    function selector({env}) {
      return {env};
    }
    function isEqual(a, b) {
      return a.env === b.env;
    }
    function subscribe() {
      return () => {};
    }
    function Child({text}) {
      Scheduler.log(text);
      return text;
    }
    function App() {
      const {env} = useSyncExternalStoreWithSelector(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
        selector,
        isEqual,
      );
      return (
        <div ref={ref}>
          <Child text={env} />
        </div>
      );
    }
    const loggedErrors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <Suspense fallback="Loading...">
          <App />
        </Suspense>,
        {
          onError(x) {
            loggedErrors.push(x);
          },
        },
      );
      pipe(writable);
    });
    assertLog(['server']);

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
      },
    });

    // The first paint uses the client due to mismatch forcing client render
    // The first paint switches to client rendering due to mismatch
    await waitForPaint([
      'client',
      "onRecoverableError: Hydration failed because the server rendered HTML didn't match the client.",
    ]);
    expect(getVisibleChildren(container)).toEqual(<div>client</div>);
  });

  it(
    'errors during hydration in the shell force a client render at the ' +
      'root, and during the client render it recovers',
    async () => {
      let isClient = false;

      function subscribe() {
        return () => {};
      }
      function getClientSnapshot() {
        return 'Yay!';
      }

      // At the time of writing, the only API that exposes whether it's currently
      // hydrating is the `getServerSnapshot` API, so I'm using that here to
      // simulate an error during hydration.
      function getServerSnapshot() {
        if (isClient) {
          throw new Error('Hydration error');
        }
        return 'Yay!';
      }

      function Child() {
        const value = useSyncExternalStore(
          subscribe,
          getClientSnapshot,
          getServerSnapshot,
        );
        Scheduler.log(value);
        return value;
      }

      const spanRef = React.createRef();

      function App() {
        return (
          <span ref={spanRef}>
            <Child />
          </span>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Yay!']);

      const span = container.getElementsByTagName('span')[0];

      // Hydrate the tree. Child will throw during hydration, but not when it
      // falls back to client rendering.
      isClient = true;
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });

      // An error logged but instead of surfacing it to the UI, we switched
      // to client rendering.
      await waitForAll([
        'Yay!',
        'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering the entire root.',
        'Cause: Hydration error',
      ]);
      expect(getVisibleChildren(container)).toEqual(<span>Yay!</span>);

      // The node that's inside the boundary that errored during hydration was
      // not hydrated.
      expect(spanRef.current).not.toBe(span);
    },
  );

  it('can hydrate uSES in StrictMode with different client and server snapshot (sync)', async () => {
    function subscribe() {
      return () => {};
    }
    function getClientSnapshot() {
      return 'Yay!';
    }
    function getServerSnapshot() {
      return 'Nay!';
    }

    function App() {
      const value = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
      );
      Scheduler.log(value);

      return value;
    }

    const element = (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    await act(async () => {
      const {pipe} = renderToPipeableStream(element);
      pipe(writable);
    });

    assertLog(['Nay!']);
    expect(getVisibleChildren(container)).toEqual('Nay!');

    await clientAct(() => {
      ReactDOM.flushSync(() => {
        ReactDOMClient.hydrateRoot(container, element);
      });
    });

    expect(getVisibleChildren(container)).toEqual('Yay!');
    assertLog(['Nay!', 'Yay!']);
  });

  it('can hydrate uSES in StrictMode with different client and server snapshot (concurrent)', async () => {
    function subscribe() {
      return () => {};
    }
    function getClientSnapshot() {
      return 'Yay!';
    }
    function getServerSnapshot() {
      return 'Nay!';
    }

    function App() {
      const value = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
      );
      Scheduler.log(value);

      return value;
    }

    const element = (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    await act(async () => {
      const {pipe} = renderToPipeableStream(element);
      pipe(writable);
    });

    assertLog(['Nay!']);
    expect(getVisibleChildren(container)).toEqual('Nay!');

    await clientAct(() => {
      React.startTransition(() => {
        ReactDOMClient.hydrateRoot(container, element);
      });
    });

    expect(getVisibleChildren(container)).toEqual('Yay!');
    assertLog(['Nay!', 'Yay!']);
  });

  it(
    'errors during hydration force a client render at the nearest Suspense ' +
      'boundary, and during the client render it recovers',
    async () => {
      let isClient = false;

      function subscribe() {
        return () => {};
      }
      function getClientSnapshot() {
        return 'Yay!';
      }

      // At the time of writing, the only API that exposes whether it's currently
      // hydrating is the `getServerSnapshot` API, so I'm using that here to
      // simulate an error during hydration.
      function getServerSnapshot() {
        if (isClient) {
          throw new Error('Hydration error');
        }
        return 'Yay!';
      }

      function Child() {
        const value = useSyncExternalStore(
          subscribe,
          getClientSnapshot,
          getServerSnapshot,
        );
        Scheduler.log(value);
        return value;
      }

      const span1Ref = React.createRef();
      const span2Ref = React.createRef();
      const span3Ref = React.createRef();

      function App() {
        return (
          <div>
            <span ref={span1Ref} />
            <Suspense fallback="Loading...">
              <span ref={span2Ref}>
                <Child />
              </span>
            </Suspense>
            <span ref={span3Ref} />
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Yay!']);

      const [span1, span2, span3] = container.getElementsByTagName('span');

      // Hydrate the tree. Child will throw during hydration, but not when it
      // falls back to client rendering.
      isClient = true;
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });

      // An error logged but instead of surfacing it to the UI, we switched
      // to client rendering.
      await waitForAll([
        'Yay!',
        'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
        'Cause: Hydration error',
      ]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span />
          <span>Yay!</span>
          <span />
        </div>,
      );

      // The node that's inside the boundary that errored during hydration was
      // not hydrated.
      expect(span2Ref.current).not.toBe(span2);

      // But the nodes outside the boundary were.
      expect(span1Ref.current).toBe(span1);
      expect(span3Ref.current).toBe(span3);
    },
  );

  it(
    'errors during hydration force a client render at the nearest Suspense ' +
      'boundary, and during the client render it fails again',
    async () => {
      // Similar to previous test, but the client render errors, too. We should
      // be able to capture it with an error boundary.

      let isClient = false;

      class ErrorBoundary extends React.Component {
        state = {error: null};
        static getDerivedStateFromError(error) {
          return {error};
        }
        render() {
          if (this.state.error !== null) {
            return this.state.error.message;
          }
          return this.props.children;
        }
      }

      function Child() {
        if (isClient) {
          throw new Error('Oops!');
        }
        Scheduler.log('Yay!');
        return 'Yay!';
      }

      const span1Ref = React.createRef();
      const span2Ref = React.createRef();
      const span3Ref = React.createRef();

      function App() {
        return (
          <ErrorBoundary>
            <span ref={span1Ref} />
            <Suspense fallback="Loading...">
              <span ref={span2Ref}>
                <Child />
              </span>
            </Suspense>
            <span ref={span3Ref} />
          </ErrorBoundary>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Yay!']);

      // Hydrate the tree. Child will throw during render.
      isClient = true;
      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });

      // Because we failed to recover from the error, onRecoverableError
      // shouldn't be called.
      await waitForAll([]);
      expect(getVisibleChildren(container)).toEqual('Oops!');

      expectErrors(errors, [], []);
    },
  );

  // Disabled because of a WWW late mutations regression.
  // We may want to re-enable this if we figure out why.

  // @gate FIXME
  it('does not recreate the fallback if server errors and hydration suspends', async () => {
    let isClient = false;

    function Child() {
      if (isClient) {
        readText('Yay!');
      } else {
        throw Error('Oops.');
      }
      Scheduler.log('Yay!');
      return 'Yay!';
    }

    const fallbackRef = React.createRef();
    function App() {
      return (
        <div>
          <Suspense fallback={<p ref={fallbackRef}>Loading...</p>}>
            <span>
              <Child />
            </span>
          </Suspense>
        </div>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError(error) {
          Scheduler.log('[s!] ' + error.message);
        },
      });
      pipe(writable);
    });
    assertLog(['[s!] Oops.']);

    // The server could not complete this boundary, so we'll retry on the client.
    const serverFallback = container.getElementsByTagName('p')[0];
    expect(serverFallback.innerHTML).toBe('Loading...');

    // Hydrate the tree. This will suspend.
    isClient = true;
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + error.message);
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    // This should not report any errors yet.
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>Loading...</p>
      </div>,
    );

    // Normally, hydrating after server error would force a clean client render.
    // However, it suspended so at best we'd only get the same fallback anyway.
    // We don't want to recreate the same fallback in the DOM again because
    // that's extra work and would restart animations etc. Check we don't do that.
    const clientFallback = container.getElementsByTagName('p')[0];
    expect(serverFallback).toBe(clientFallback);

    // When we're able to fully hydrate, we expect a clean client render.
    await act(() => {
      resolveText('Yay!');
    });
    await waitForAll([
      'Yay!',
      'onRecoverableError: The server could not finish this Suspense boundary, ' +
        'likely due to an error during server rendering. ' +
        'Switched to client rendering.',
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>Yay!</span>
      </div>,
    );
  });

  // Disabled because of a WWW late mutations regression.
  // We may want to re-enable this if we figure out why.

  // @gate FIXME
  it(
    'does not recreate the fallback if server errors and hydration suspends ' +
      'and root receives a transition',
    async () => {
      let isClient = false;

      function Child({color}) {
        if (isClient) {
          readText('Yay!');
        } else {
          throw Error('Oops.');
        }
        Scheduler.log('Yay! (' + color + ')');
        return 'Yay! (' + color + ')';
      }

      const fallbackRef = React.createRef();
      function App({color}) {
        return (
          <div>
            <Suspense fallback={<p ref={fallbackRef}>Loading...</p>}>
              <span>
                <Child color={color} />
              </span>
            </Suspense>
          </div>
        );
      }
      await act(() => {
        const {pipe} = renderToPipeableStream(<App color="red" />, {
          onError(error) {
            Scheduler.log('[s!] ' + error.message);
          },
        });
        pipe(writable);
      });
      assertLog(['[s!] Oops.']);

      // The server could not complete this boundary, so we'll retry on the client.
      const serverFallback = container.getElementsByTagName('p')[0];
      expect(serverFallback.innerHTML).toBe('Loading...');

      // Hydrate the tree. This will suspend.
      isClient = true;
      const root = ReactDOMClient.hydrateRoot(container, <App color="red" />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + error.message);
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
      // This should not report any errors yet.
      await waitForAll([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <p>Loading...</p>
        </div>,
      );

      // Normally, hydrating after server error would force a clean client render.
      // However, it suspended so at best we'd only get the same fallback anyway.
      // We don't want to recreate the same fallback in the DOM again because
      // that's extra work and would restart animations etc. Check we don't do that.
      const clientFallback = container.getElementsByTagName('p')[0];
      expect(serverFallback).toBe(clientFallback);

      // Transition updates shouldn't recreate the fallback either.
      React.startTransition(() => {
        root.render(<App color="blue" />);
      });
      await waitForAll([]);
      jest.runAllTimers();
      const clientFallback2 = container.getElementsByTagName('p')[0];
      expect(clientFallback2).toBe(serverFallback);

      // When we're able to fully hydrate, we expect a clean client render.
      await act(() => {
        resolveText('Yay!');
      });
      await waitForAll([
        'Yay! (red)',
        'onRecoverableError: The server could not finish this Suspense boundary, ' +
          'likely due to an error during server rendering. ' +
          'Switched to client rendering.',
        'Yay! (blue)',
      ]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span>Yay! (blue)</span>
        </div>,
      );
    },
  );

  // Disabled because of a WWW late mutations regression.
  // We may want to re-enable this if we figure out why.

  // @gate FIXME
  it(
    'recreates the fallback if server errors and hydration suspends but ' +
      'client receives new props',
    async () => {
      let isClient = false;

      function Child() {
        const value = 'Yay!';
        if (isClient) {
          readText(value);
        } else {
          throw Error('Oops.');
        }
        Scheduler.log(value);
        return value;
      }

      const fallbackRef = React.createRef();
      function App({fallbackText}) {
        return (
          <div>
            <Suspense fallback={<p ref={fallbackRef}>{fallbackText}</p>}>
              <span>
                <Child />
              </span>
            </Suspense>
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(
          <App fallbackText="Loading..." />,
          {
            onError(error) {
              Scheduler.log('[s!] ' + error.message);
            },
          },
        );
        pipe(writable);
      });
      assertLog(['[s!] Oops.']);

      const serverFallback = container.getElementsByTagName('p')[0];
      expect(serverFallback.innerHTML).toBe('Loading...');

      // Hydrate the tree. This will suspend.
      isClient = true;
      const root = ReactDOMClient.hydrateRoot(
        container,
        <App fallbackText="Loading..." />,
        {
          onRecoverableError(error) {
            Scheduler.log('onRecoverableError: ' + error.message);
            if (error.cause) {
              Scheduler.log('Cause: ' + normalizeError(error.cause.message));
            }
          },
        },
      );
      // This should not report any errors yet.
      await waitForAll([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <p>Loading...</p>
        </div>,
      );

      // Normally, hydration after server error would force a clean client render.
      // However, that suspended so at best we'd only get a fallback anyway.
      // We don't want to replace a fallback with the same fallback because
      // that's extra work and would restart animations etc. Verify we don't do that.
      const clientFallback1 = container.getElementsByTagName('p')[0];
      expect(serverFallback).toBe(clientFallback1);

      // However, an update may have changed the fallback props. In that case we have to
      // actually force it to re-render on the client and throw away the server one.
      root.render(<App fallbackText="More loading..." />);
      await waitForAll([]);
      jest.runAllTimers();
      assertLog([
        'onRecoverableError: The server could not finish this Suspense boundary, ' +
          'likely due to an error during server rendering. ' +
          'Switched to client rendering.',
      ]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <p>More loading...</p>
        </div>,
      );
      // This should be a clean render without reusing DOM.
      const clientFallback2 = container.getElementsByTagName('p')[0];
      expect(clientFallback2).not.toBe(clientFallback1);

      // Verify we can still do a clean content render after.
      await act(() => {
        resolveText('Yay!');
      });
      await waitForAll(['Yay!']);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span>Yay!</span>
        </div>,
      );
    },
  );

  it(
    'errors during hydration force a client render at the nearest Suspense ' +
      'boundary, and during the client render it recovers, then a deeper ' +
      'child suspends',
    async () => {
      let isClient = false;

      function subscribe() {
        return () => {};
      }
      function getClientSnapshot() {
        return 'Yay!';
      }

      // At the time of writing, the only API that exposes whether it's currently
      // hydrating is the `getServerSnapshot` API, so I'm using that here to
      // simulate an error during hydration.
      function getServerSnapshot() {
        if (isClient) {
          throw new Error('Hydration error');
        }
        return 'Yay!';
      }

      function Child() {
        const value = useSyncExternalStore(
          subscribe,
          getClientSnapshot,
          getServerSnapshot,
        );
        if (isClient) {
          readText(value);
        }
        Scheduler.log(value);
        return value;
      }

      const span1Ref = React.createRef();
      const span2Ref = React.createRef();
      const span3Ref = React.createRef();

      function App() {
        return (
          <div>
            <span ref={span1Ref} />
            <Suspense fallback="Loading...">
              <span ref={span2Ref}>
                <Child />
              </span>
            </Suspense>
            <span ref={span3Ref} />
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertLog(['Yay!']);

      const [span1, span2, span3] = container.getElementsByTagName('span');

      // Hydrate the tree. Child will throw during hydration, but not when it
      // falls back to client rendering.
      isClient = true;
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });

      // An error logged but instead of surfacing it to the UI, we switched
      // to client rendering.
      await waitForAll([
        'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
        'Cause: Hydration error',
      ]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span />
          Loading...
          <span />
        </div>,
      );

      await clientAct(() => {
        resolveText('Yay!');
      });
      assertLog(['Yay!']);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <span />
          <span>Yay!</span>
          <span />
        </div>,
      );

      // The node that's inside the boundary that errored during hydration was
      // not hydrated.
      expect(span2Ref.current).not.toBe(span2);

      // But the nodes outside the boundary were.
      expect(span1Ref.current).toBe(span1);
      expect(span3Ref.current).toBe(span3);
    },
  );

  it('logs regular (non-hydration) errors when the UI recovers', async () => {
    let shouldThrow = true;

    function A({unused}) {
      if (shouldThrow) {
        Scheduler.log('Oops!');
        throw new Error('Oops!');
      }
      Scheduler.log('A');
      return 'A';
    }

    function B() {
      Scheduler.log('B');
      return 'B';
    }

    function App() {
      return (
        <>
          <A />
          <B />
        </>
      );
    }

    const root = ReactDOMClient.createRoot(container, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    React.startTransition(() => {
      root.render(<App />);
    });

    // Partially render A, but yield before the render has finished
    await waitFor(['Oops!']);

    // React will try rendering again synchronously. During the retry, A will
    // not throw. This simulates a concurrent data race that is fixed by
    // blocking the main thread.
    shouldThrow = false;
    await waitForAll([
      // Render again, synchronously
      'A',
      'B',

      // Log the error
      'onRecoverableError: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.',
      'Cause: Oops!',
    ]);

    // UI looks normal
    expect(container.textContent).toEqual('AB');
  });

  it('logs multiple hydration errors in the same render', async () => {
    let isClient = false;

    function subscribe() {
      return () => {};
    }
    function getClientSnapshot() {
      return 'Yay!';
    }
    function getServerSnapshot() {
      if (isClient) {
        throw new Error('Hydration error');
      }
      return 'Yay!';
    }

    function Child({label}) {
      // This will throw during client hydration. Only reason to use
      // useSyncExternalStore in this test is because getServerSnapshot has the
      // ability to observe whether we're hydrating.
      useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
      Scheduler.log(label);
      return label;
    }

    function App() {
      return (
        <>
          <Suspense fallback="Loading...">
            <Child label="A" />
          </Suspense>
          <Suspense fallback="Loading...">
            <Child label="B" />
          </Suspense>
        </>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    assertLog(['A', 'B']);

    // Hydrate the tree. Child will throw during hydration, but not when it
    // falls back to client rendering.
    isClient = true;
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });

    await waitForAll([
      'A',
      'B',

      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: Hydration error',

      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: Hydration error',
    ]);
  });

  it('supports iterable', async () => {
    const Immutable = require('immutable');

    const mappedJSX = Immutable.fromJS([
      {name: 'a', value: 'a'},
      {name: 'b', value: 'b'},
    ]).map(item => <li key={item.get('value')}>{item.get('name')}</li>);

    await act(() => {
      const {pipe} = renderToPipeableStream(<ul>{mappedJSX}</ul>);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <ul>
        <li>a</li>
        <li>b</li>
      </ul>,
    );
  });

  // @gate enableAsyncIterableChildren
  it('supports async generator component', async () => {
    async function* App() {
      yield <span key="1">{await Promise.resolve('Hi')}</span>;
      yield ' ';
      yield <span key="2">{await Promise.resolve('World')}</span>;
    }

    await act(async () => {
      const {pipe} = renderToPipeableStream(
        <div>
          <App />
        </div>,
      );
      pipe(writable);
    });

    // Each act retries once which causes a new ping which schedules
    // new work but only after the act has finished rendering.
    await act(() => {});
    await act(() => {});
    await act(() => {});
    await act(() => {});

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>Hi</span> <span>World</span>
      </div>,
    );
  });

  // @gate enableAsyncIterableChildren
  it('supports async iterable children', async () => {
    const iterable = {
      async *[Symbol.asyncIterator]() {
        yield <span key="1">{await Promise.resolve('Hi')}</span>;
        yield ' ';
        yield <span key="2">{await Promise.resolve('World')}</span>;
      },
    };

    function App({children}) {
      return <div>{children}</div>;
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App>{iterable}</App>);
      pipe(writable);
    });

    // Each act retries once which causes a new ping which schedules
    // new work but only after the act has finished rendering.
    await act(() => {});
    await act(() => {});
    await act(() => {});
    await act(() => {});

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>Hi</span> <span>World</span>
      </div>,
    );
  });

  it('supports bigint', async () => {
    await act(async () => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <div>{10n}</div>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>10</div>);
  });

  it('Supports custom abort reasons with a string', async () => {
    function App() {
      return (
        <div>
          <p>
            <Suspense fallback={'p'}>
              <AsyncText text={'hello'} />
            </Suspense>
          </p>
          <span>
            <Suspense fallback={'span'}>
              <AsyncText text={'world'} />
            </Suspense>
          </span>
        </div>
      );
    }

    let abort;
    const loggedErrors = [];
    await act(() => {
      const {pipe, abort: abortImpl} = renderToPipeableStream(<App />, {
        onError(error) {
          // In this test we contrive erroring with strings so we push the error whereas in most
          // other tests we contrive erroring with Errors and push the message.
          loggedErrors.push(error);
          return 'a digest';
        },
      });
      abort = abortImpl;
      pipe(writable);
    });

    expect(loggedErrors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>p</p>
        <span>span</span>
      </div>,
    );

    await act(() => {
      abort('foobar');
    });

    expect(loggedErrors).toEqual(['foobar', 'foobar']);

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });

    await waitForAll([]);

    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'foobar',
          'a digest',
          componentStack(['AsyncText', 'Suspense', 'p', 'div', 'App']),
        ],
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'foobar',
          'a digest',
          componentStack(['AsyncText', 'Suspense', 'span', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          'a digest',
        ],
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          'a digest',
        ],
      ],
    );
  });

  it('Supports custom abort reasons with an Error', async () => {
    function App() {
      return (
        <div>
          <p>
            <Suspense fallback={'p'}>
              <AsyncText text={'hello'} />
            </Suspense>
          </p>
          <span>
            <Suspense fallback={'span'}>
              <AsyncText text={'world'} />
            </Suspense>
          </span>
        </div>
      );
    }

    let abort;
    const loggedErrors = [];
    await act(() => {
      const {pipe, abort: abortImpl} = renderToPipeableStream(<App />, {
        onError(error) {
          loggedErrors.push(error.message);
          return 'a digest';
        },
      });
      abort = abortImpl;
      pipe(writable);
    });

    expect(loggedErrors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>p</p>
        <span>span</span>
      </div>,
    );

    await act(() => {
      abort(new Error('uh oh'));
    });

    expect(loggedErrors).toEqual(['uh oh', 'uh oh']);

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error, errorInfo) {
        errors.push({error, errorInfo});
      },
    });

    await waitForAll([]);

    expectErrors(
      errors,
      [
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'uh oh',
          'a digest',
          componentStack(['AsyncText', 'Suspense', 'p', 'div', 'App']),
        ],
        [
          'Switched to client rendering because the server rendering aborted due to:\n\n' +
            'uh oh',
          'a digest',
          componentStack(['AsyncText', 'Suspense', 'span', 'div', 'App']),
        ],
      ],
      [
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          'a digest',
        ],
        [
          'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          'a digest',
        ],
      ],
    );
  });

  it('reports abort errors for every suspended task when aborting fatals the shell', async () => {
    const promise = new Promise(() => {});
    const rendered = [];
    function Suspend({label}) {
      rendered.push(label);
      use(promise);
      return null;
    }

    function App() {
      return (
        <>
          <Suspense fallback="Loading...">
            <Suspend label="boundary" />
          </Suspense>
          <Suspend label="root one" />
          <Suspend label="root two" />
        </>
      );
    }

    const errors = [];
    let abort;
    await act(() => {
      abort = renderToPipeableStream(<App />, {
        onError(error) {
          errors.push(error.message);
        },
        onShellError() {},
      }).abort;
    });

    expect(rendered).toEqual(['boundary', 'root one', 'root two']);

    await act(() => {
      abort(new Error('abort reason'));
    });

    expect(errors).toEqual(['abort reason', 'abort reason', 'abort reason']);
  });

  it('uses a rejection reason from a lazy component before the abort finishes', async () => {
    let reject;
    const Lazy = React.lazy(
      () =>
        new Promise((resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const haltedPromise = new Promise(() => {});
    function HaltedWait() {
      use(haltedPromise);
      return null;
    }

    const errors = [];
    let abort;
    await act(() => {
      const controls = renderToPipeableStream(
        <>
          <Suspense fallback="Loading lazy">
            <Lazy />
          </Suspense>
          <Suspense fallback="Loading halted">
            <HaltedWait />
          </Suspense>
        </>,
        {
          onError(error) {
            errors.push(error.message);
          },
        },
      );
      abort = controls.abort;
      controls.pipe(writable);
    });

    await act(() => {
      abort(new Error('abort reason'));
      reject(new Error('rejected during abort'));
    });

    expect(errors).toEqual(['rejected during abort', 'abort reason']);
  });

  it('does not report a rejection reason after abort has finished', async () => {
    let reject;
    const promise = new Promise((resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    function Wait() {
      use(promise);
      return null;
    }

    const errors = [];
    let abort;
    await act(() => {
      const controls = renderToPipeableStream(
        <Suspense fallback="Loading">
          <Wait />
        </Suspense>,
        {
          onError(error) {
            errors.push(error.message);
          },
        },
      );
      abort = controls.abort;
      controls.pipe(writable);
    });

    await act(() => {
      abort(new Error('abort reason'));
    });

    await act(() => {
      reject(new Error('rejected after abort'));
    });

    expect(errors).toEqual(['abort reason']);
  });

  it('warns in dev if you access digest from errorInfo in onRecoverableError', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Suspense fallback={'loading...'}>
            <AsyncText text={'hello'} />
          </Suspense>
        </div>,
        {
          onError(error) {
            return 'a digest';
          },
        },
      );
      rejectText('hello');
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>loading...</div>);

    ReactDOMClient.hydrateRoot(
      container,
      <div>
        <Suspense fallback={'loading...'}>hello</Suspense>
      </div>,
      {
        onRecoverableError(error, errorInfo) {
          expect(error.digest).toBe('a digest');
          expect(errorInfo.digest).toBe(undefined);
          assertConsoleErrorDev([
            'You are accessing "digest" from the errorInfo object passed to onRecoverableError.' +
              ' This property is no longer provided as part of errorInfo but can be accessed as a property' +
              ' of the Error instance itself.',
          ]);
        },
      },
    );
    await waitForAll([]);
  });

  it('takes an importMap option which emits an "importmap" script in the head', async () => {
    const importMap = {
      foo: './path/to/foo.js',
    };
    await act(() => {
      renderToPipeableStream(
        <html>
          <head>
            <script async={true} src="foo" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
        {
          importMap,
        },
      ).pipe(writable);
    });

    expect(document.head.innerHTML).toBe(
      '<script type="importmap">' +
        JSON.stringify(importMap) +
        '</script><script async="" src="foo"></script>' +
        (gate(flags => flags.shouldUseFizzExternalRuntime)
          ? '<script src="react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js" async=""></script>'
          : '') +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render">'
          : ''),
    );
  });

  // bugfix: https://github.com/facebook/react/issues/27286
  it('can render custom elements with children on ther server', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <my-element>
              <div>foo</div>
            </my-element>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <my-element>
            <div>foo</div>
          </my-element>
        </body>
      </html>,
    );
  });

  // https://github.com/facebook/react/issues/27540
  // This test is not actually asserting much because there is possibly a bug in the closeing logic for the
  // Node implementation of Fizz. The close leads to an abort which sets the destination to null before the Float
  // method has an opportunity to schedule a write. We should fix this probably and once we do this test will start
  // to fail if the underyling issue of writing after stream completion isn't fixed
  it('does not try to write to the stream after it has been closed', async () => {
    async function preloadLate() {
      await 1;
      ReactDOM.preconnect('foo');
    }

    function Preload() {
      preloadLate();
      return null;
    }

    function App() {
      return (
        <html>
          <body>
            <main>hello</main>
            <Preload />
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <main>hello</main>
        </body>
      </html>,
    );
  });

  it('provides headers after initial work if onHeaders option used', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function Preloads() {
      ReactDOM.preload('font2', {as: 'font'});
      ReactDOM.preload('imagepre2', {as: 'image', fetchPriority: 'high'});
      ReactDOM.preconnect('pre2', {crossOrigin: 'use-credentials'});
      ReactDOM.prefetchDNS('dns2');
    }

    function Blocked() {
      readText('blocked');
      return (
        <>
          <Preloads />
          <img src="image2" />
        </>
      );
    }

    function App() {
      ReactDOM.preload('font', {as: 'font'});
      ReactDOM.preload('imagepre', {as: 'image', fetchPriority: 'high'});
      ReactDOM.preconnect('pre', {crossOrigin: 'use-credentials'});
      ReactDOM.prefetchDNS('dns');
      return (
        <html>
          <body>
            <img src="image" />
            <Blocked />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders});
    });

    expect(headers).toEqual({
      Link: `
<pre>; rel=preconnect; crossorigin="use-credentials",
 <dns>; rel=dns-prefetch,
 <font>; rel=preload; as="font"; crossorigin="",
 <imagepre>; rel=preload; as="image"; fetchpriority="high",
 <image>; rel=preload; as="image"
`
        .replaceAll('\n', '')
        .trim(),
    });
  });

  it('omits images from preload headers if they contain srcset and sizes', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      ReactDOM.preload('responsive-preload-set-only', {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: 'srcset',
      });
      ReactDOM.preload('responsive-preload', {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: 'srcset',
        imageSizes: 'sizes',
      });
      ReactDOM.preload('non-responsive-preload', {
        as: 'image',
        fetchPriority: 'high',
      });
      return (
        <html>
          <body>
            <img
              src="responsive-img-set-only"
              fetchPriority="high"
              srcSet="srcset"
            />
            <img
              src="responsive-img"
              fetchPriority="high"
              srcSet="srcset"
              sizes="sizes"
            />
            <img src="non-responsive-img" fetchPriority="high" />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders});
    });

    expect(headers).toEqual({
      Link: `
<non-responsive-preload>; rel=preload; as="image"; fetchpriority="high",
 <non-responsive-img>; rel=preload; as="image"; fetchpriority="high"
`
        .replaceAll('\n', '')
        .trim(),
    });
  });

  it('preserves referrerPolicy for image preload headers', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      return (
        <html>
          <body>
            <img
              src="image-with-referrer-policy"
              fetchPriority="high"
              referrerPolicy="no-referrer"
            />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders});
    });

    expect(headers).toEqual({
      Link: `<image-with-referrer-policy>; rel=preload; as="image"; fetchpriority="high"; referrerpolicy="no-referrer"`,
    });
  });

  it('emits nothing for headers if you pipe before work begins', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      ReactDOM.preload('presrc', {
        as: 'image',
        fetchPriority: 'high',
        imageSrcSet: 'presrcset',
        imageSizes: 'presizes',
      });
      return (
        <html>
          <body>
            <img src="src" srcSet="srcset" sizes="sizes" />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders}).pipe(writable);
    });

    expect(headers).toEqual({});
  });

  it('stops accumulating new headers once the maxHeadersLength limit is satisifed', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      ReactDOM.preconnect('foo');
      ReactDOM.preconnect('bar');
      ReactDOM.preconnect('baz');
      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders, maxHeadersLength: 44});
    });

    expect(headers).toEqual({
      Link: `
<foo>; rel=preconnect,
 <bar>; rel=preconnect
`
        .replaceAll('\n', '')
        .trim(),
    });
  });

  it('logs an error if onHeaders throws but continues the render', async () => {
    const errors = [];
    function onError(error) {
      errors.push(error.message);
    }

    function onHeaders(x) {
      throw new Error('bad onHeaders');
    }

    let pipe;
    await act(() => {
      ({pipe} = renderToPipeableStream(<div>hello</div>, {onHeaders, onError}));
    });

    expect(errors).toEqual(['bad onHeaders']);

    await act(() => {
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(<div>hello</div>);
  });

  it('accounts for the length of the interstitial between links when computing the headers length', async () => {
    let headers = null;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      // 20 bytes
      ReactDOM.preconnect('01');
      // 42 bytes
      ReactDOM.preconnect('02');
      // 64 bytes
      ReactDOM.preconnect('03');
      // 86 bytes
      ReactDOM.preconnect('04');
      // 108 bytes
      ReactDOM.preconnect('05');
      // 130 bytes
      ReactDOM.preconnect('06');
      // 152 bytes
      ReactDOM.preconnect('07');
      // 174 bytes
      ReactDOM.preconnect('08');
      // 196 bytes
      ReactDOM.preconnect('09');
      // 218 bytes
      ReactDOM.preconnect('10');
      // 240 bytes
      ReactDOM.preconnect('11');
      // 262 bytes
      ReactDOM.preconnect('12');
      // 284 bytes
      ReactDOM.preconnect('13');
      // 306 bytes
      ReactDOM.preconnect('14');
      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders, maxHeadersLength: 305});
    });
    expect(headers.Link.length).toBe(284);

    await act(() => {
      renderToPipeableStream(<App />, {onHeaders, maxHeadersLength: 306});
    });
    expect(headers.Link.length).toBe(306);
  });

  it('does not perform any additional work after fatally erroring', async () => {
    let resolve: () => void;
    const promise = new Promise(r => {
      resolve = r;
    });
    function AsyncComp() {
      React.use(promise);
      return <DidRender>Async</DidRender>;
    }

    let didRender = false;
    function DidRender({children}) {
      didRender = true;
      return children;
    }

    function ErrorComp() {
      throw new Error('boom');
    }

    function App() {
      return (
        <div>
          <Suspense fallback="loading...">
            <AsyncComp />
          </Suspense>
          <ErrorComp />
        </div>
      );
    }

    let pipe;
    const errors = [];
    let didFatal = true;
    await act(() => {
      pipe = renderToPipeableStream(<App />, {
        onError(error) {
          errors.push(error.message);
        },
        onShellError(error) {
          didFatal = true;
        },
      }).pipe;
    });

    expect(didRender).toBe(false);
    await act(() => {
      resolve();
    });
    expect(didRender).toBe(false);

    const testWritable = new Stream.Writable();
    await act(() => pipe(testWritable));
    expect(didRender).toBe(false);
    expect(didFatal).toBe(didFatal);
    expect(errors).toEqual(['boom']);
  });

  it('does not report aborts after fatally erroring', async () => {
    const promise = new Promise(() => {});
    function AsyncComp() {
      React.use(promise);
      return 'Async';
    }

    function ErrorComp() {
      throw new Error('boom');
    }

    const errors = [];
    let abort;
    await act(() => {
      abort = renderToPipeableStream(
        <div>
          <Suspense fallback="loading...">
            <AsyncComp />
          </Suspense>
          <ErrorComp />
        </div>,
        {
          onError(error) {
            errors.push(error.message);
          },
          onShellError() {},
        },
      ).abort;
    });

    expect(errors).toEqual(['boom']);

    await act(() => {
      abort(new Error('too late'));
    });

    expect(errors).toEqual(['boom']);
  });

  describe('error escaping', () => {
    it('escapes error hash, message, and component stack values in directly flushed errors (html escaping)', async () => {
      window.__outlet = {};

      const dangerousErrorString =
        '"></template></div><script>window.__outlet.message="from error"</script><div><template data-foo="';

      function Erroring() {
        throw new Error(dangerousErrorString);
      }

      // We can't test newline in component stacks because the stack always takes just one line and we end up
      // dropping the first part including the \n character
      Erroring.displayName =
        'DangerousName' +
        dangerousErrorString.replace(
          'message="from error"',
          'stack="from_stack"',
        );

      function App() {
        return (
          <div>
            <Suspense fallback={<div>Loading...</div>}>
              <Erroring />
            </Suspense>
          </div>
        );
      }

      function onError(x) {
        return `dangerous hash ${x.message.replace(
          'message="from error"',
          'hash="from hash"',
        )}`;
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />, {
          onError,
        });
        pipe(writable);
      });
      expect(window.__outlet).toEqual({});
    });

    it('escapes error hash, message, and component stack values in clientRenderInstruction (javascript escaping)', async () => {
      window.__outlet = {};

      const dangerousErrorString =
        '");window.__outlet.message="from error";</script><script>(() => {})("';

      let rejectComponent;
      const SuspensyErroring = React.lazy(() => {
        return new Promise((resolve, reject) => {
          rejectComponent = reject;
        });
      });

      // We can't test newline in component stacks because the stack always takes just one line and we end up
      // dropping the first part including the \n character
      SuspensyErroring.displayName =
        'DangerousName' +
        dangerousErrorString.replace(
          'message="from error"',
          'stack="from_stack"',
        );

      function App() {
        return (
          <div>
            <Suspense fallback={<div>Loading...</div>}>
              <SuspensyErroring />
            </Suspense>
          </div>
        );
      }

      function onError(x) {
        return `dangerous hash ${x.message.replace(
          'message="from error"',
          'hash="from hash"',
        )}`;
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />, {
          onError,
        });
        pipe(writable);
      });

      await act(() => {
        rejectComponent(new Error(dangerousErrorString));
      });
      expect(window.__outlet).toEqual({});
    });

    it('escapes such that attributes cannot be masked', async () => {
      const dangerousErrorString = '" data-msg="bad message" data-foo="';
      const theError = new Error(dangerousErrorString);

      function Erroring({isClient}) {
        if (isClient) return 'Hello';
        throw theError;
      }

      function App({isClient}) {
        return (
          <div>
            <Suspense fallback={<div>Loading...</div>}>
              <Erroring isClient={isClient} />
            </Suspense>
          </div>
        );
      }

      const loggedErrors = [];
      function onError(x) {
        loggedErrors.push(x);
        return x.message.replace('bad message', 'bad hash');
      }
      const expectedDigest = onError(theError);
      loggedErrors.length = 0;

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />, {
          onError,
        });
        pipe(writable);
      });

      expect(loggedErrors).toEqual([theError]);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
        onRecoverableError(error, errorInfo) {
          errors.push({error, errorInfo});
        },
      });
      await waitForAll([]);

      // If escaping were not done we would get a message that says "bad hash"
      expectErrors(
        errors,
        [
          [
            'Switched to client rendering because the server rendering errored:\n\n' +
              theError.message,
            expectedDigest,
            componentStack(['Erroring', 'Suspense', 'div', 'App']),
          ],
        ],
        [
          [
            'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
            expectedDigest,
          ],
        ],
      );
    });
  });

  it('accepts an integrity property for bootstrapScripts and bootstrapModules', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>hello world</div>
          </body>
        </html>,
        {
          bootstrapScripts: [
            'foo',
            {
              src: 'bar',
            },
            {
              src: 'baz',
              integrity: 'qux',
            },
          ],
          bootstrapModules: [
            'quux',
            {
              src: 'corge',
            },
            {
              src: 'grault',
              integrity: 'garply',
            },
          ],
        },
      );
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" fetchpriority="low" href="foo" as="script" />
          <link rel="preload" fetchpriority="low" href="bar" as="script" />
          <link
            rel="preload"
            fetchpriority="low"
            href="baz"
            as="script"
            integrity="qux"
          />
          <link rel="modulepreload" fetchpriority="low" href="quux" />
          <link rel="modulepreload" fetchpriority="low" href="corge" />
          <link
            rel="modulepreload"
            fetchpriority="low"
            href="grault"
            integrity="garply"
          />
        </head>
        <body>
          <div>hello world</div>
        </body>
      </html>,
    );
    expect(
      stripExternalRuntimeInNodes(
        document.getElementsByTagName('script'),
        renderOptions.unstable_externalRuntimeSrc,
      ).map(n => n.outerHTML),
    ).toEqual([
      '<script src="foo" id="_R_" async=""></script>',
      '<script src="bar" async=""></script>',
      '<script src="baz" integrity="qux" async=""></script>',
      '<script type="module" src="quux" async=""></script>',
      '<script type="module" src="corge" async=""></script>',
      '<script type="module" src="grault" integrity="garply" async=""></script>',
    ]);
  });

  it('accepts a crossOrigin property for bootstrapScripts and bootstrapModules', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>hello world</div>
          </body>
        </html>,
        {
          bootstrapScripts: [
            'foo',
            {
              src: 'bar',
            },
            {
              src: 'baz',
              crossOrigin: '',
            },
            {
              src: 'qux',
              crossOrigin: 'defaults-to-empty',
            },
          ],
          bootstrapModules: [
            'quux',
            {
              src: 'corge',
            },
            {
              src: 'grault',
              crossOrigin: 'use-credentials',
            },
          ],
        },
      );
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" fetchpriority="low" href="foo" as="script" />
          <link rel="preload" fetchpriority="low" href="bar" as="script" />
          <link
            rel="preload"
            fetchpriority="low"
            href="baz"
            as="script"
            crossorigin=""
          />
          <link
            rel="preload"
            fetchpriority="low"
            href="qux"
            as="script"
            crossorigin=""
          />
          <link rel="modulepreload" fetchpriority="low" href="quux" />
          <link rel="modulepreload" fetchpriority="low" href="corge" />
          <link
            rel="modulepreload"
            fetchpriority="low"
            href="grault"
            crossorigin="use-credentials"
          />
        </head>
        <body>
          <div>hello world</div>
        </body>
      </html>,
    );
    expect(
      stripExternalRuntimeInNodes(
        document.getElementsByTagName('script'),
        renderOptions.unstable_externalRuntimeSrc,
      ).map(n => n.outerHTML),
    ).toEqual([
      '<script src="foo" id="_R_" async=""></script>',
      '<script src="bar" async=""></script>',
      '<script src="baz" crossorigin="" async=""></script>',
      '<script src="qux" crossorigin="" async=""></script>',
      '<script type="module" src="quux" async=""></script>',
      '<script type="module" src="corge" async=""></script>',
      '<script type="module" src="grault" crossorigin="use-credentials" async=""></script>',
    ]);
  });

  describe('inline script escaping', () => {
    describe('bootstrapScriptContent', () => {
      it('the "S" in "</?[Ss]cript" strings are replaced with unicode escaped lowercase s or S depending on case, preserving case sensitivity of nearby characters', async () => {
        window.__test_outlet = '';
        const stringWithScriptsInIt =
          'prescription pre<scription pre<Scription pre</scRipTion pre</ScripTion </script><script><!-- <script> -->';
        await act(() => {
          const {pipe} = renderToPipeableStream(<div />, {
            bootstrapScriptContent:
              'window.__test_outlet = "This should have been replaced";var x = "' +
              stringWithScriptsInIt +
              '";\nwindow.__test_outlet = x;',
          });
          pipe(writable);
        });
        expect(window.__test_outlet).toMatch(stringWithScriptsInIt);
      });

      it('does not escape \\u2028, or \\u2029 characters', async () => {
        // these characters are ignored in engines support https://github.com/tc39/proposal-json-superset
        // in this test with JSDOM the characters are silently dropped and thus don't need to be encoded.
        // if you send these characters to an older browser they could fail so it is a good idea to
        // sanitize JSON input of these characters
        window.__test_outlet = '';
        const el = document.createElement('p');
        el.textContent = '{"one":1,\u2028\u2029"two":2}';
        const stringWithLSAndPSCharacters = el.textContent;
        await act(() => {
          const {pipe} = renderToPipeableStream(<div />, {
            bootstrapScriptContent:
              'let x = ' +
              stringWithLSAndPSCharacters +
              '; window.__test_outlet = x;',
          });
          pipe(writable);
        });
        const outletString = JSON.stringify(window.__test_outlet);
        expect(outletString).toBe(
          stringWithLSAndPSCharacters.replace(/[\u2028\u2029]/g, ''),
        );
      });

      it('does not escape <, >, or & characters', async () => {
        // these characters valid javascript and may be necessary in scripts and won't be interpretted properly
        // escaped outside of a string context within javascript
        window.__test_outlet = null;
        // this boolean expression will be cast to a number due to the bitwise &. we will look for a truthy value (1) below
        const booleanLogicString = '1 < 2 & 3 > 1';
        await act(() => {
          const {pipe} = renderToPipeableStream(<div />, {
            bootstrapScriptContent:
              'let x = ' + booleanLogicString + '; window.__test_outlet = x;',
          });
          pipe(writable);
        });
        expect(window.__test_outlet).toBe(1);
      });
    });

    describe('importMaps', () => {
      it('escapes </[sS]cirpt> in importMaps', async () => {
        window.__test_outlet_key = '';
        window.__test_outlet_value = '';
        const jsonWithScriptsInIt = {
          "keypos</script><script>window.__test_outlet_key = 'pwned'</script><script>":
            'value',
          key: "valuepos</script><script>window.__test_outlet_value = 'pwned'</script><script>",
        };
        await act(() => {
          const {pipe} = renderToPipeableStream(<div />, {
            importMap: jsonWithScriptsInIt,
          });
          pipe(writable);
        });
        expect(window.__test_outlet_key).toBe('');
        expect(window.__test_outlet_value).toBe('');
      });
    });

    describe('inline script', () => {
      it('escapes </[sS]cirpt> in inline scripts', async () => {
        window.__test_outlet = '';
        await act(() => {
          const {pipe} = renderToPipeableStream(
            <script>{`
              <!-- some html comment </script><script>window.__test_outlet = 'pwned'</script>
              window.__test_outlet = 'safe';
              --> </script><script>window.__test_outlet = 'pwned after'</script>
            `}</script>,
          );
          pipe(writable);
        });
        expect(window.__test_outlet).toBe('safe');
      });
    });
  });

  describe('<style> textContent escaping', () => {
    it('the "S" in "</?[Ss]style" strings are replaced with unicode escaped lowercase s or S depending on case, preserving case sensitivity of nearby characters', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <style>{`
            .foo::after {
              content: 'sSsS</style></Style></StYlE><style><Style>sSsS'
            }
            body {
              background-color: blue;
            }
          `}</style>,
        );
        pipe(writable);
      });
      expect(window.getComputedStyle(document.body).backgroundColor).toMatch(
        'rgb(0, 0, 255)',
      );
    });

    it('the "S" in "</?[Ss]style" strings are replaced with unicode escaped lowercase s or S depending on case, preserving case sensitivity of nearby characters inside hoistable style tags', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <>
            <style href="foo" precedence="default">{`
            .foo::after {
              content: 'sSsS</style></Style></StYlE><style><Style>sSsS'
            }
            body {
              background-color: blue;
            }
          `}</style>
            <style href="bar" precedence="default">{`
          .foo::after {
            content: 'sSsS</style></Style></StYlE><style><Style>sSsS'
          }
          body {
            background-color: red;
          }
        `}</style>
          </>,
        );
        pipe(writable);
      });
      expect(window.getComputedStyle(document.body).backgroundColor).toMatch(
        'rgb(255, 0, 0)',
      );
    });
  });

  // @gate enableFizzExternalRuntime
  it('supports option to load runtime as an external script', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <Suspense fallback={'loading...'}>
              <AsyncText text="Hello" />
            </Suspense>
          </body>
        </html>,
        {
          unstable_externalRuntimeSrc: 'src-of-external-runtime',
        },
      );
      pipe(writable);
    });

    // We want the external runtime to be sent in <head> so the script can be
    // fetched and executed as early as possible. For SSR pages using Suspense,
    // this script execution would be render blocking.
    expect(
      Array.from(document.head.getElementsByTagName('script')).map(
        n => n.outerHTML,
      ),
    ).toEqual(['<script src="src-of-external-runtime" async=""></script>']);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>loading...</body>
      </html>,
    );
  });

  // @gate shouldUseFizzExternalRuntime
  it('does not send script tags for SSR instructions when using the external runtime', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <div>
              <AsyncText text="Hello" />
            </div>
          </Suspense>
        </div>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    await act(() => {
      resolveText('Hello');
    });

    // The only script elements sent should be from unstable_externalRuntimeSrc
    expect(document.getElementsByTagName('script').length).toEqual(1);
  });

  // @gate shouldUseFizzExternalRuntime
  it('does (unfortunately) send the external runtime for static pages', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <p>hello world!</p>
          </body>
        </html>,
      );
      pipe(writable);
    });

    // no scripts should be sent
    expect(document.getElementsByTagName('script').length).toEqual(1);

    // the html should be as-is
    expect(document.documentElement.innerHTML).toEqual(
      '<head><script src="react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js" async=""></script>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render">'
          : '') +
        '</head><body><p>hello world!</p>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : '') +
        '</body>',
    );
  });

  it('#24384: Suspending should halt hydration warnings and not emit any if hydration completes successfully after unsuspending', async () => {
    const makeApp = () => {
      let resolve, resolved;
      const promise = new Promise(r => {
        resolve = () => {
          resolved = true;
          return r();
        };
      });
      function ComponentThatSuspends() {
        if (!resolved) {
          throw promise;
        }
        return <p>A</p>;
      }

      const App = () => {
        return (
          <div>
            <Suspense fallback={<h1>Loading...</h1>}>
              <ComponentThatSuspends />
              <h2 name="hello">world</h2>
            </Suspense>
          </div>
        );
      };

      return [App, resolve];
    };

    const [ServerApp, serverResolve] = makeApp();
    await act(() => {
      const {pipe} = renderToPipeableStream(<ServerApp />);
      pipe(writable);
    });
    await act(() => {
      serverResolve();
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="hello">world</h2>
      </div>,
    );

    const [ClientApp, clientResolve] = makeApp();
    ReactDOMClient.hydrateRoot(container, <ClientApp />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="hello">world</h2>
      </div>,
    );

    // Now that the boundary resolves to it's children the hydration completes and discovers that there is a mismatch requiring
    // client-side rendering.
    await clientResolve();
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="hello">world</h2>
      </div>,
    );
  });

  it('#24384: Suspending should halt hydration warnings but still emit hydration warnings after unsuspending if mismatches are genuine', async () => {
    const makeApp = () => {
      let resolve, resolved;
      const promise = new Promise(r => {
        resolve = () => {
          resolved = true;
          return r();
        };
      });
      function ComponentThatSuspends() {
        if (!resolved) {
          throw promise;
        }
        return <p>A</p>;
      }

      const App = ({text}) => {
        return (
          <div>
            <Suspense fallback={<h1>Loading...</h1>}>
              <ComponentThatSuspends />
              <h2 name={text}>{text}</h2>
            </Suspense>
          </div>
        );
      };

      return [App, resolve];
    };

    const [ServerApp, serverResolve] = makeApp();
    await act(() => {
      const {pipe} = renderToPipeableStream(<ServerApp text="initial" />);
      pipe(writable);
    });
    await act(() => {
      serverResolve();
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="initial">initial</h2>
      </div>,
    );

    // The client app is rendered with an intentionally incorrect text. The still Suspended component causes
    // hydration to fail silently (allowing for cache warming but otherwise skipping this boundary) until it
    // resolves.
    const [ClientApp, clientResolve] = makeApp();
    ReactDOMClient.hydrateRoot(container, <ClientApp text="replaced" />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="initial">initial</h2>
      </div>,
    );

    // Now that the boundary resolves to it's children the hydration completes and discovers that there is a mismatch requiring
    // client-side rendering.
    await clientResolve();
    await waitForAll([
      "onRecoverableError: Hydration failed because the server rendered text didn't match the client.",
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>A</p>
        <h2 name="replaced">replaced</h2>
      </div>,
    );

    await waitForAll([]);
  });

  it('only warns once on hydration mismatch while within a suspense boundary', async () => {
    const App = ({text}) => {
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <h2>{text}</h2>
            <h2>{text}</h2>
            <h2>{text}</h2>
          </Suspense>
        </div>
      );
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App text="initial" />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h2>initial</h2>
        <h2>initial</h2>
        <h2>initial</h2>
      </div>,
    );

    ReactDOMClient.hydrateRoot(container, <App text="replaced" />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([
      "onRecoverableError: Hydration failed because the server rendered text didn't match the client.",
    ]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h2>replaced</h2>
        <h2>replaced</h2>
        <h2>replaced</h2>
      </div>,
    );

    await waitForAll([]);
  });

  it('supresses hydration warnings when an error occurs within a Suspense boundary', async () => {
    let isClient = false;

    function ThrowWhenHydrating({children}) {
      // This is a trick to only throw if we're hydrating, because
      // useSyncExternalStore calls getServerSnapshot instead of the regular
      // getSnapshot in that case.
      useSyncExternalStore(
        () => {},
        t => t,
        () => {
          if (isClient) {
            throw new Error('uh oh');
          }
        },
      );
      return children;
    }

    const App = () => {
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <ThrowWhenHydrating>
              <h1>one</h1>
            </ThrowWhenHydrating>
            <h2>two</h2>
            <h3>{isClient ? 'five' : 'three'}</h3>
          </Suspense>
        </div>
      );
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );

    isClient = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([
      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: uh oh',
    ]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>five</h3>
      </div>,
    );

    await waitForAll([]);
  });

  it('does not log for errors after the first hydration error', async () => {
    let isClient = false;

    function ThrowWhenHydrating({children, message}) {
      // This is a trick to only throw if we're hydrating, because
      // useSyncExternalStore calls getServerSnapshot instead of the regular
      // getSnapshot in that case.
      useSyncExternalStore(
        () => {},
        t => t,
        () => {
          if (isClient) {
            Scheduler.log('throwing: ' + message);
            throw new Error(message);
          }
        },
      );
      return children;
    }

    const App = () => {
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <ThrowWhenHydrating message="first error">
              <h1>one</h1>
            </ThrowWhenHydrating>
            <ThrowWhenHydrating message="second error">
              <h2>two</h2>
            </ThrowWhenHydrating>
            <ThrowWhenHydrating message="third error">
              <h3>three</h3>
            </ThrowWhenHydrating>
          </Suspense>
        </div>
      );
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );

    isClient = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([
      'throwing: first error',

      // onRecoverableError because the UI recovered without surfacing the
      // error to the user.
      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: first error',
    ]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );

    await waitForAll([]);
  });

  it('does not log for errors after a preceding fiber suspends', async () => {
    let isClient = false;
    let promise = null;
    let unsuspend = null;
    let isResolved = false;

    function ComponentThatSuspendsOnClient() {
      if (isClient && !isResolved) {
        if (promise === null) {
          promise = new Promise(resolve => {
            unsuspend = () => {
              isResolved = true;
              resolve();
            };
          });
        }
        Scheduler.log('suspending');
        throw promise;
      }
      return null;
    }

    function ThrowWhenHydrating({children, message}) {
      // This is a trick to only throw if we're hydrating, because
      // useSyncExternalStore calls getServerSnapshot instead of the regular
      // getSnapshot in that case.
      useSyncExternalStore(
        () => {},
        t => t,
        () => {
          if (isClient) {
            Scheduler.log('throwing: ' + message);
            throw new Error(message);
          }
        },
      );
      return children;
    }

    const App = () => {
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <ComponentThatSuspendsOnClient />
            <ThrowWhenHydrating message="first error">
              <h1>one</h1>
            </ThrowWhenHydrating>
            <ThrowWhenHydrating message="second error">
              <h2>two</h2>
            </ThrowWhenHydrating>
            <ThrowWhenHydrating message="third error">
              <h3>three</h3>
            </ThrowWhenHydrating>
          </Suspense>
        </div>
      );
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );

    isClient = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll(['suspending']);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );
    await unsuspend();
    await waitForAll([
      'throwing: first error',
      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: first error',
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );
  });

  it('(outdated behavior) suspending after erroring will cause errors previously queued to be silenced until the boundary resolves', async () => {
    // NOTE: This test was originally written to test a scenario that doesn't happen
    // anymore. If something errors during hydration, we immediately unwind the
    // stack and revert to client rendering. I've kept the test around just to
    // demonstrate what actually happens in this sequence of events.

    let isClient = false;
    let promise = null;
    let unsuspend = null;
    let isResolved = false;

    function ComponentThatSuspendsOnClient() {
      if (isClient && !isResolved) {
        if (promise === null) {
          promise = new Promise(resolve => {
            unsuspend = () => {
              isResolved = true;
              resolve();
            };
          });
        }
        Scheduler.log('suspending');
        throw promise;
      }
      return null;
    }

    function ThrowWhenHydrating({children, message}) {
      // This is a trick to only throw if we're hydrating, because
      // useSyncExternalStore calls getServerSnapshot instead of the regular
      // getSnapshot in that case.
      useSyncExternalStore(
        () => {},
        t => t,
        () => {
          if (isClient) {
            Scheduler.log('throwing: ' + message);
            throw new Error(message);
          }
        },
      );
      return children;
    }

    const App = () => {
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <ThrowWhenHydrating message="first error">
              <h1>one</h1>
            </ThrowWhenHydrating>
            <ThrowWhenHydrating message="second error">
              <h2>two</h2>
            </ThrowWhenHydrating>
            <ComponentThatSuspendsOnClient />
            <ThrowWhenHydrating message="third error">
              <h3>three</h3>
            </ThrowWhenHydrating>
          </Suspense>
        </div>
      );
    };

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );

    isClient = true;

    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error) {
        Scheduler.log('onRecoverableError: ' + normalizeError(error.message));
        if (error.cause) {
          Scheduler.log('Cause: ' + normalizeError(error.cause.message));
        }
      },
    });
    await waitForAll([
      'throwing: first error',
      'suspending',
      'onRecoverableError: There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.',
      'Cause: first error',
    ]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>Loading...</h1>
      </div>,
    );
    await clientAct(() => unsuspend());
    // Since our client components only throw on the very first render there are no
    // new throws in this pass
    assertLog([]);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <h1>one</h1>
        <h2>two</h2>
        <h3>three</h3>
      </div>,
    );
  });

  it('#24578 Hydration errors caused by a suspending component should not become recoverable when nested in an ancestor Suspense that is showing primary content', async () => {
    // this test failed before because hydration errors on the inner boundary were upgraded to recoverable by
    // a codepath of the outer boundary
    function App({isClient}) {
      return (
        <Suspense fallback={'outer'}>
          <Suspense fallback={'inner'}>
            <div>
              {isClient ? <AsyncText text="A" /> : <Text text="A" />}
              <b>B</b>
            </div>
          </Suspense>
        </Suspense>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error) {
        errors.push(error.message);
      },
    });

    await waitForAll([]);
    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        A<b>B</b>
      </div>,
    );

    resolveText('A');
    await waitForAll([]);
    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        A<b>B</b>
      </div>,
    );
  });

  it('hydration warnings for mismatched text with multiple text nodes caused by suspending should be suppressed', async () => {
    let resolve;
    const Lazy = React.lazy(() => {
      return new Promise(r => {
        resolve = r;
      });
    });

    function App({isClient}) {
      return (
        <div>
          {isClient ? <Lazy /> : <p>lazy</p>}
          <p>some {'text'}</p>
        </div>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    const errors = [];
    ReactDOMClient.hydrateRoot(container, <App isClient={true} />, {
      onRecoverableError(error) {
        errors.push(error.message);
      },
    });

    await waitForAll([]);
    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>lazy</p>
        <p>some {'text'}</p>
      </div>,
    );

    resolve({default: () => <p>lazy</p>});
    await waitForAll([]);
    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>lazy</p>
        <p>some {'text'}</p>
      </div>,
    );
  });

  it('can emit the preamble even if the head renders asynchronously', async () => {
    function AsyncNoOutput() {
      readText('nooutput');
      return null;
    }
    function AsyncHead() {
      readText('head');
      return (
        <head data-foo="foo">
          <title>a title</title>
        </head>
      );
    }
    function AsyncBody() {
      readText('body');
      return (
        <body data-bar="bar">
          <link rel="preload" as="style" href="foo" />
          hello
        </body>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html data-html="html">
          <AsyncNoOutput />
          <AsyncHead />
          <AsyncBody />
        </html>,
      );
      pipe(writable);
    });
    await act(() => {
      resolveText('body');
    });
    await act(() => {
      resolveText('nooutput');
    });
    await act(() => {
      resolveText('head');
    });
    expect(getVisibleChildren(document)).toEqual(
      <html data-html="html">
        <head data-foo="foo">
          <link rel="preload" as="style" href="foo" />
          <title>a title</title>
        </head>
        <body data-bar="bar">hello</body>
      </html>,
    );
  });

  it('holds back body and html closing tags (the postamble) until all pending tasks are completed', async () => {
    const chunks = [];
    writable.on('data', chunk => {
      chunks.push(chunk);
    });

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            first
            <Suspense>
              <AsyncText text="second" />
            </Suspense>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>{'first'}</body>
      </html>,
    );

    await act(() => {
      resolveText('second');
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          {'first'}
          {'second'}
        </body>
      </html>,
    );

    expect(chunks.pop()).toEqual('</body></html>');
  });

  describe('text separators', () => {
    // To force performWork to start before resolving AsyncText but before piping we need to wait until
    // after scheduleWork which currently uses setImmediate to delay performWork
    function afterImmediate() {
      return new Promise(resolve => {
        setImmediate(resolve);
      });
    }

    it('only includes separators between adjacent text nodes', async () => {
      function App({name}) {
        return (
          <div>
            hello<b>world, {name}</b>!
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App name="Foo" />);
        pipe(writable);
      });

      expect(container.innerHTML).toEqual(
        (gate(flags => flags.shouldUseFizzExternalRuntime)
          ? '<script src="react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js" async=""></script>'
          : '') + '<div>hello<b>world, <!-- -->Foo</b>!</div>',
      );
      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App name="Foo" />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          hello<b>world, {'Foo'}</b>!
        </div>,
      );
    });

    it('does not insert text separators even when adjacent text is in a delayed segment', async () => {
      function App({name}) {
        return (
          <div>
            <Suspense fallback={'loading...'}>
              <div id="app-div">
                hello
                <b>
                  world, <AsyncText text={name} />
                </b>
                !
              </div>
            </Suspense>
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App name="Foo" />);
        pipe(writable);
      });

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">hello<b>world, <template id="P:1"></template></b>!</div>',
      );

      await act(() => resolveText('Foo'));

      const div = stripExternalRuntimeInNodes(
        container.children,
        renderOptions.unstable_externalRuntimeSrc,
      )[0].children[0];
      expect(div.outerHTML).toEqual(
        '<div id="app-div">hello<b>world, Foo</b>!</div>',
      );

      expect(div.childNodes.length).toBe(3);
      const b = div.childNodes[1];
      expect(b.childNodes.length).toBe(2);
      expect(b.childNodes[0]).toMatchInlineSnapshot('world, ');
      expect(b.childNodes[1]).toMatchInlineSnapshot('Foo');

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App name="Foo" />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <div id="app-div">
            hello<b>world, {'Foo'}</b>!
          </div>
        </div>,
      );
    });

    it('works with multiple adjacent segments', async () => {
      function App() {
        return (
          <div>
            <Suspense fallback={'loading...'}>
              <div id="app-div">
                h<AsyncText text={'ello'} />
                w<AsyncText text={'orld'} />
              </div>
            </Suspense>
          </div>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">h<template id="P:1"></template>w<template id="P:2"></template></div>',
      );

      await act(() => resolveText('orld'));

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">h<template id="P:1"></template>world</div>',
      );

      await act(() => resolveText('ello'));
      expect(
        stripExternalRuntimeInNodes(
          container.children,
          renderOptions.unstable_externalRuntimeSrc,
        )[0].children[0].outerHTML,
      ).toEqual('<div id="app-div">helloworld</div>');

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App name="Foo" />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <div id="app-div">{['h', 'ello', 'w', 'orld']}</div>
        </div>,
      );
    });

    it('works when some segments are flushed and others are patched', async () => {
      function App() {
        return (
          <div>
            <Suspense fallback={'loading...'}>
              <div id="app-div">
                h<AsyncText text={'ello'} />
                w<AsyncText text={'orld'} />
              </div>
            </Suspense>
          </div>
        );
      }

      await act(async () => {
        const {pipe} = renderToPipeableStream(<App />);
        await afterImmediate();
        await act(() => resolveText('ello'));
        pipe(writable);
      });

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">h<!-- -->ello<!-- -->w<template id="P:1"></template></div>',
      );

      await act(() => resolveText('orld'));

      expect(
        stripExternalRuntimeInNodes(
          container.children,
          renderOptions.unstable_externalRuntimeSrc,
        )[0].children[0].outerHTML,
      ).toEqual('<div id="app-div">h<!-- -->ello<!-- -->world</div>');

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push('onRecoverableError: ' + normalizeError(error.message));
          if (error.cause) {
            Scheduler.log('Cause: ' + normalizeError(error.cause.message));
          }
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <div id="app-div">{['h', 'ello', 'w', 'orld']}</div>
        </div>,
      );
    });

    it('does not prepend a text separators if the segment follows a non-Text Node', async () => {
      function App() {
        return (
          <Suspense fallback={'loading...'}>
            <div>
              hello
              <b>
                <AsyncText text={'world'} />
              </b>
            </div>
          </Suspense>
        );
      }

      await act(async () => {
        const {pipe} = renderToPipeableStream(<App />);
        await afterImmediate();
        await act(() => resolveText('world'));
        pipe(writable);
      });

      expect(container.lastElementChild.outerHTML).toEqual(
        '<div>hello<b>world<!-- --></b></div>',
      );

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          hello<b>world</b>
        </div>,
      );
    });

    it('does not prepend a text separators if the segments first emission is a non-Text Node', async () => {
      function App() {
        return (
          <Suspense fallback={'loading...'}>
            <div>
              hello
              <AsyncTextWrapped as={'b'} text={'world'} />
            </div>
          </Suspense>
        );
      }

      await act(async () => {
        const {pipe} = renderToPipeableStream(<App />);
        await afterImmediate();
        await act(() => resolveText('world'));
        pipe(writable);
      });

      expect(container.lastElementChild.outerHTML).toEqual(
        '<div>hello<b>world</b></div>',
      );

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          hello<b>world</b>
        </div>,
      );
    });

    it('should not insert separators for text inside Suspense boundaries even if they would otherwise be considered text-embedded', async () => {
      function App() {
        return (
          <Suspense fallback={'loading...'}>
            <div id="app-div">
              start
              <Suspense fallback={'[loading first]'}>
                firststart
                <AsyncText text={'first suspended'} />
                firstend
              </Suspense>
              <Suspense fallback={'[loading second]'}>
                secondstart
                <b>
                  <AsyncText text={'second suspended'} />
                </b>
              </Suspense>
              end
            </div>
          </Suspense>
        );
      }

      await act(async () => {
        const {pipe} = renderToPipeableStream(<App />);
        await afterImmediate();
        await act(() => resolveText('world'));
        pipe(writable);
      });

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">start<!--$?--><template id="B:0"></template>[loading first]<!--/$--><!--$?--><template id="B:1"></template>[loading second]<!--/$-->end</div>',
      );

      await act(() => {
        resolveText('first suspended');
      });

      expect(document.getElementById('app-div').outerHTML).toEqual(
        '<div id="app-div">start<!--$-->firststartfirst suspendedfirstend<!--/$--><!--$?--><template id="B:1"></template>[loading second]<!--/$-->end</div>',
      );

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div id="app-div">
          {'start'}
          {'firststart'}
          {'first suspended'}
          {'firstend'}
          {'[loading second]'}
          {'end'}
        </div>,
      );

      await act(() => {
        resolveText('second suspended');
      });

      expect(
        stripExternalRuntimeInNodes(
          container.children,
          renderOptions.unstable_externalRuntimeSrc,
        )[0].outerHTML,
      ).toEqual(
        '<div id="app-div">start<!--$-->firststartfirst suspendedfirstend<!--/$--><!--$-->secondstart<b>second suspended</b><!--/$-->end</div>',
      );

      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div id="app-div">
          {'start'}
          {'firststart'}
          {'first suspended'}
          {'firstend'}
          {'secondstart'}
          <b>second suspended</b>
          {'end'}
        </div>,
      );
    });

    it('(only) includes extraneous text separators in segments that complete before flushing, followed by nothing or a non-Text node', async () => {
      function App() {
        return (
          <div>
            <Suspense fallback={'text before, nothing after...'}>
              hello
              <AsyncText text="world" />
            </Suspense>
            <Suspense fallback={'nothing before or after...'}>
              <AsyncText text="world" />
            </Suspense>
            <Suspense fallback={'text before, element after...'}>
              hello
              <AsyncText text="world" />
              <br />
            </Suspense>
            <Suspense fallback={'nothing before, element after...'}>
              <AsyncText text="world" />
              <br />
            </Suspense>
          </div>
        );
      }

      await act(async () => {
        const {pipe} = renderToPipeableStream(<App />);
        await afterImmediate();
        await act(() => resolveText('world'));
        pipe(writable);
      });

      expect(container.innerHTML).toEqual(
        (gate(flags => flags.shouldUseFizzExternalRuntime)
          ? '<script src="react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js" async=""></script>'
          : '') +
          '<div><!--$-->hello<!-- -->world<!-- --><!--/$--><!--$-->world<!-- --><!--/$--><!--$-->hello<!-- -->world<!-- --><br><!--/$--><!--$-->world<!-- --><br><!--/$--></div>',
      );

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(container)).toEqual(
        <div>
          {/* first boundary */}
          {'hello'}
          {'world'}
          {/* second boundary */}
          {'world'}
          {/* third boundary */}
          {'hello'}
          {'world'}
          <br />
          {/* fourth boundary */}
          {'world'}
          <br />
        </div>,
      );
    });
  });

  describe('title children', () => {
    it('should accept a single string child', async () => {
      // a Single string child
      function App() {
        return (
          <head>
            <title>hello</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(document.head)).toEqual(<title>hello</title>);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(document.head)).toEqual(<title>hello</title>);
    });

    it('should accept a single number child', async () => {
      // a Single number child
      function App() {
        return (
          <head>
            <title>4</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(document.head)).toEqual(<title>4</title>);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(document.head)).toEqual(<title>4</title>);
    });

    it('should accept a single bigint child', async () => {
      // a Single number child
      function App() {
        return (
          <head>
            <title>5n</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(document.head)).toEqual(<title>5n</title>);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(document.head)).toEqual(<title>5n</title>);
    });

    it('should accept children array of length 1 containing a string', async () => {
      // a Single string child
      function App() {
        return (
          <head>
            <title>{['hello']}</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(document.head)).toEqual(<title>hello</title>);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      expect(getVisibleChildren(document.head)).toEqual(<title>hello</title>);
    });

    it('should warn in dev when given an array of length 2 or more', async () => {
      function App() {
        return (
          <head>
            <title>{['hello1', 'hello2']}</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertConsoleErrorDev([
        'React expects the `children` prop of <title> tags to be a string, number, bigint, ' +
          'or object with a novel `toString` method but found an Array with length 2 instead. ' +
          'Browsers treat all child Nodes of <title> tags as Text content and React expects ' +
          'to be able to convert `children` of <title> tags to a single string value which is why ' +
          'Arrays of length greater than 1 are not supported. ' +
          'When using JSX it can be common to combine text nodes and value nodes. ' +
          'For example: <title>hello {nameOfUser}</title>. ' +
          'While not immediately apparent, `children` in this case is an Array with length 2. ' +
          'If your `children` prop is using this form try rewriting it using a template string: ' +
          '<title>{`hello ${nameOfUser}`}</title>.\n' +
          '    in title (at **)\n' +
          '    in App (at **)',
      ]);

      expect(getVisibleChildren(document.head)).toEqual(<title />);
      const errors = [];
      ReactDOMClient.hydrateRoot(document.head, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      // with float, the title doesn't render on the client or on the server
      expect(getVisibleChildren(document.head)).toEqual(<title />);
    });

    it('should warn in dev if you pass a React Component as a child to <title>', async () => {
      function IndirectTitle() {
        return 'hello';
      }

      function App() {
        return (
          <head>
            <title>
              <IndirectTitle />
            </title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertConsoleErrorDev([
        'React expects the `children` prop of <title> tags to be a string, number, bigint, ' +
          'or object with a novel `toString` method but found an object that appears to be a ' +
          'React element which never implements a suitable `toString` method. ' +
          'Browsers treat all child Nodes of <title> tags as Text content and React expects ' +
          'to be able to convert children of <title> tags to a single string value which is ' +
          'why rendering React elements is not supported. If the `children` of <title> is a ' +
          'React Component try moving the <title> tag into that component. ' +
          'If the `children` of <title> is some HTML markup change it to be Text only to be valid HTML.\n' +
          '    in title (at **)\n' +
          '    in App (at **)',
      ]);
      // object titles are toStringed when float is on
      expect(getVisibleChildren(document.head)).toEqual(
        <title>{'[object Object]'}</title>,
      );
      const errors = [];
      ReactDOMClient.hydrateRoot(document.head, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      // object titles are toStringed when float is on
      expect(getVisibleChildren(document.head)).toEqual(
        <title>{'[object Object]'}</title>,
      );
    });

    it('should warn in dev if you pass an object that does not implement toString as a child to <title>', async () => {
      function App() {
        return (
          <head>
            <title>{{}}</title>
          </head>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      assertConsoleErrorDev([
        'React expects the `children` prop of <title> tags to be a string, number, bigint, ' +
          'or object with a novel `toString` method but found an object that does not implement a ' +
          'suitable `toString` method. Browsers treat all child Nodes of <title> tags as Text ' +
          'content and React expects to be able to convert children of <title> tags to a single string value. ' +
          'Using the default `toString` method available on every object is almost certainly an error. ' +
          'Consider whether the `children` of this <title> is an object in error and change it to a ' +
          'string or number value if so. Otherwise implement a `toString` method that React can ' +
          'use to produce a valid <title>.\n' +
          '    in title (at **)\n' +
          '    in App (at **)',
      ]);
      // object titles are toStringed when float is on
      expect(getVisibleChildren(document.head)).toEqual(
        <title>{'[object Object]'}</title>,
      );
      const errors = [];
      ReactDOMClient.hydrateRoot(document.head, <App />, {
        onRecoverableError(error) {
          errors.push(error.message);
        },
      });
      await waitForAll([]);
      expect(errors).toEqual([]);
      // object titles are toStringed when float is on
      expect(getVisibleChildren(document.head)).toEqual(
        <title>{'[object Object]'}</title>,
      );
    });
  });

  it('basic use(promise)', async () => {
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.resolve('B');
    const promiseC = Promise.resolve('C');

    function Async() {
      return use(promiseA) + use(promiseB) + use(promiseC);
    }

    function App() {
      return (
        <Suspense fallback="Loading...">
          <Async />
        </Suspense>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    // TODO: The `act` implementation in this file doesn't unwrap microtasks
    // automatically. We can't use the same `act` we use for Fiber tests
    // because that relies on the mock Scheduler. Doesn't affect any public
    // API but we might want to fix this for our own internal tests.
    //
    // For now, wait for each promise in sequence.
    await act(async () => {
      await promiseA;
    });
    await act(async () => {
      await promiseB;
    });
    await act(async () => {
      await promiseC;
    });

    expect(getVisibleChildren(container)).toEqual('ABC');

    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual('ABC');
  });

  it('basic use(context)', async () => {
    const ContextA = React.createContext('default');
    const ContextB = React.createContext('B');
    function Client() {
      return use(ContextA) + use(ContextB);
    }
    function App() {
      return (
        <>
          <ContextA.Provider value="A">
            <Client />
          </ContextA.Provider>
        </>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual('AB');

    // Hydration uses a different renderer runtime (Fiber instead of Fizz).
    // We reset _currentRenderer here to not trigger a warning about multiple
    // renderers concurrently using these contexts
    ContextA._currentRenderer = null;
    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual('AB');
  });

  it('use(promise) in multiple components', async () => {
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.resolve('B');
    const promiseC = Promise.resolve('C');
    const promiseD = Promise.resolve('D');

    function Child({prefix}) {
      return prefix + use(promiseC) + use(promiseD);
    }

    function Parent() {
      return <Child prefix={use(promiseA) + use(promiseB)} />;
    }

    function App() {
      return (
        <Suspense fallback="Loading...">
          <Parent />
        </Suspense>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    // TODO: The `act` implementation in this file doesn't unwrap microtasks
    // automatically. We can't use the same `act` we use for Fiber tests
    // because that relies on the mock Scheduler. Doesn't affect any public
    // API but we might want to fix this for our own internal tests.
    //
    // For now, wait for each promise in sequence.
    await act(async () => {
      await promiseA;
    });
    await act(async () => {
      await promiseB;
    });
    await act(async () => {
      await promiseC;
    });
    await act(async () => {
      await promiseD;
    });

    expect(getVisibleChildren(container)).toEqual('ABCD');

    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual('ABCD');
  });

  it('using a rejected promise will throw', async () => {
    const promiseA = Promise.resolve('A');
    const promiseB = Promise.reject(new Error('Oops!'));
    const promiseC = Promise.resolve('C');

    // Jest/Node will raise an unhandled rejected error unless we await this. It
    // works fine in the browser, though.
    await expect(promiseB).rejects.toThrow('Oops!');

    function Async() {
      return use(promiseA) + use(promiseB) + use(promiseC);
    }

    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        if (this.state.error) {
          return this.state.error.message;
        }
        return this.props.children;
      }
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <ErrorBoundary>
              <Async />
            </ErrorBoundary>
          </Suspense>
        </div>
      );
    }

    const reportedServerErrors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError(error) {
          reportedServerErrors.push(error);
        },
      });
      pipe(writable);
    });

    // TODO: The `act` implementation in this file doesn't unwrap microtasks
    // automatically. We can't use the same `act` we use for Fiber tests
    // because that relies on the mock Scheduler. Doesn't affect any public
    // API but we might want to fix this for our own internal tests.
    //
    // For now, wait for each promise in sequence.
    await act(async () => {
      await promiseA;
    });
    await act(async () => {
      await expect(promiseB).rejects.toThrow('Oops!');
    });
    await act(async () => {
      await promiseC;
    });

    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);
    expect(reportedServerErrors.length).toBe(1);
    expect(reportedServerErrors[0].message).toBe('Oops!');

    const reportedCaughtErrors = [];
    const reportedClientErrors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onCaughtError(error) {
        reportedCaughtErrors.push(error);
      },
      onRecoverableError(error) {
        reportedClientErrors.push(error);
      },
    });
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual(<div>Oops!</div>);
    // Because this is rethrown on the client, it is not a recoverable error.
    expect(reportedClientErrors.length).toBe(0);
    // It is caught by the error boundary.
    expect(reportedCaughtErrors.length).toBe(1);
    expect(reportedCaughtErrors[0].message).toBe('Oops!');
  });

  it("use a promise that's already been instrumented and resolved", async () => {
    const thenable = {
      status: 'fulfilled',
      value: 'Hi',
      then() {},
    };

    // This will never suspend because the thenable already resolved
    function App() {
      return use(thenable);
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual('Hi');

    ReactDOMClient.hydrateRoot(container, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(container)).toEqual('Hi');
  });

  it('unwraps thenable that fulfills synchronously without suspending', async () => {
    function App() {
      const thenable = {
        then(resolve) {
          // This thenable immediately resolves, synchronously, without waiting
          // a microtask.
          resolve('Hi');
        },
      };
      try {
        return <Text text={use(thenable)} />;
      } catch {
        throw new Error(
          '`use` should not suspend because the thenable resolved synchronously.',
        );
      }
    }
    // Because the thenable resolves synchronously, we should be able to finish
    // rendering synchronously, with no fallback.
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual('Hi');
  });

  // Regression: finishedTask aborting remaining fallback tasks from a
  // completed boundary could reenter itself via abortTaskSoft and fire
  // onAllReady twice (the inner call drained allPendingTasks to 0 and
  // called completeAll, then the outer call re-observed the same 0).
  it('only fires onAllReady once when a boundary with an instrumented sync-resolving thenable completes', async () => {
    // Mirrors Flight-client chunk behavior: the status-probe .then() in
    // trackUsedThenable stays pending, but the ping-attaching .then() in
    // renderNode's catch resolves synchronously. This reorders the work
    // queue so the fallback task is still in fallbackAbortableTasks when
    // the content task completes.
    function createDeferredSyncThenable(value) {
      let thenCallCount = 0;
      return {
        status: 'pending',
        value: undefined,
        then(resolve) {
          thenCallCount++;
          if (thenCallCount > 1) {
            this.status = 'fulfilled';
            this.value = value;
            resolve(value);
          }
        },
      };
    }

    const thenable = createDeferredSyncThenable('hello');
    function AsyncContent() {
      return <Text text={use(thenable)} />;
    }

    let allReadyCount = 0;
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <Suspense fallback={<Text text="Loading..." />}>
          <AsyncContent />
        </Suspense>,
        {
          onAllReady() {
            allReadyCount++;
          },
        },
      );
      pipe(writable);
    });

    expect(allReadyCount).toBe(1);
    expect(getVisibleChildren(container)).toEqual('hello');
  });

  // Same bug, hit without any sync-thenable trickery: if the fallback
  // also suspends, its spawned sub-task lives in fallbackAbortableTasks
  // and can still be there when the content task completes first.
  it('only fires onAllReady once when both content and fallback suspend on real promises', async () => {
    let resolveContent;
    const contentPromise = new Promise(r => (resolveContent = r));
    // The fallback promise never resolves — the fallback-sub-task gets
    // soft-aborted when the content completes, so we never need it.
    const fallbackPromise = new Promise(() => {});

    function AsyncContent() {
      return <Text text={use(contentPromise)} />;
    }
    function AsyncFallback() {
      return <Text text={use(fallbackPromise)} />;
    }

    let allReadyCount = 0;
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <Suspense fallback={<AsyncFallback />}>
          <AsyncContent />
        </Suspense>,
        {
          onAllReady() {
            allReadyCount++;
          },
        },
      );
      pipe(writable);
    });

    // Resolving content alone is enough: the fallback-sub-task is still
    // in fallbackAbortableTasks when the content task completes, and
    // abortTaskSoft on it reenters finishedTask.
    await act(async () => {
      resolveContent('hello');
      await contentPromise;
    });

    expect(allReadyCount).toBe(1);
    expect(getVisibleChildren(container)).toEqual('hello');
  });

  it('promise as node', async () => {
    const promise = Promise.resolve('Hi');
    await act(async () => {
      const {pipe} = renderToPipeableStream(promise);
      pipe(writable);
    });

    // TODO: The `act` implementation in this file doesn't unwrap microtasks
    // automatically. We can't use the same `act` we use for Fiber tests
    // because that relies on the mock Scheduler. Doesn't affect any public
    // API but we might want to fix this for our own internal tests.
    await act(async () => {
      await promise;
    });

    expect(getVisibleChildren(container)).toEqual('Hi');
  });

  it('context as node', async () => {
    const Context = React.createContext('Hi');
    await act(async () => {
      const {pipe} = renderToPipeableStream(Context);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual('Hi');
  });

  it('recursive Usable as node', async () => {
    const Context = React.createContext('Hi');
    const promiseForContext = Promise.resolve(Context);
    await act(async () => {
      const {pipe} = renderToPipeableStream(promiseForContext);
      pipe(writable);
    });

    // TODO: The `act` implementation in this file doesn't unwrap microtasks
    // automatically. We can't use the same `act` we use for Fiber tests
    // because that relies on the mock Scheduler. Doesn't affect any public
    // API but we might want to fix this for our own internal tests.
    await act(async () => {
      await promiseForContext;
    });

    expect(getVisibleChildren(container)).toEqual('Hi');
  });

  it('should correctly handle different promises in React.use() across lazy components', async () => {
    let promise1;
    let promise2;
    let promiseLazy;

    function Component1() {
      promise1 ??= new Promise(r => setTimeout(() => r('value1'), 50));
      const data = React.use(promise1);
      return (
        <div>
          {data}
          <Component2Lazy />
        </div>
      );
    }

    function Component2() {
      promise2 ??= new Promise(r => setTimeout(() => r('value2'), 50));
      const data = React.use(promise2);
      return <div>{data}</div>;
    }

    const Component2Lazy = React.lazy(async () => {
      promiseLazy ??= new Promise(r => setTimeout(r, 50));
      await promiseLazy;
      return {default: Component2};
    });

    function App() {
      return <Component1 />;
    }

    await act(async () => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    // Wait for promise to resolve
    await act(async () => {
      await promise1;
    });
    await act(async () => {
      await promiseLazy;
    });
    await act(async () => {
      await promise2;
    });

    // Verify both components received the correct values
    expect(getVisibleChildren(container)).toEqual(
      <div>
        value1
        <div>value2</div>
      </div>,
    );
  });

  it('useActionState hydrates without a mismatch', async () => {
    // This is testing an implementation detail: useActionState emits comment
    // nodes into the SSR stream, so this checks that they are handled correctly
    // during hydration.

    async function action(state) {
      return state;
    }

    const childRef = React.createRef(null);
    function Form() {
      const [state] = useActionState(action, 0);
      const text = `Child: ${state}`;
      return (
        <div id="child" ref={childRef}>
          {text}
        </div>
      );
    }

    function App() {
      return (
        <div>
          <div>
            <Form />
          </div>
          <span>Sibling</span>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>
          <div id="child">Child: 0</div>
        </div>
        <span>Sibling</span>
      </div>,
    );
    const child = document.getElementById('child');

    // Confirm that it hydrates correctly
    await clientAct(() => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
    expect(childRef.current).toBe(child);
  });

  it("useActionState hydrates without a mismatch if there's a render phase update", async () => {
    async function action(state) {
      return state;
    }

    const childRef = React.createRef(null);
    function Form() {
      const [localState, setLocalState] = React.useState(0);
      if (localState < 3) {
        setLocalState(localState + 1);
      }

      // Because of the render phase update above, this component is evaluated
      // multiple times (even during SSR), but it should only emit a single
      // marker per useActionState instance.
      const [actionState] = useActionState(action, 0);
      const text = `${readText('Child')}:${actionState}:${localState}`;
      return (
        <div id="child" ref={childRef}>
          {text}
        </div>
      );
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <Form />
          </Suspense>
          <span>Sibling</span>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        Loading...<span>Sibling</span>
      </div>,
    );

    await act(() => resolveText('Child'));
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div id="child">Child:0:3</div>
        <span>Sibling</span>
      </div>,
    );
    const child = document.getElementById('child');

    // Confirm that it hydrates correctly
    await clientAct(() => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });
    expect(childRef.current).toBe(child);
  });

  describe('useEffectEvent', () => {
    it('can server render a component with useEffectEvent', async () => {
      const ref = React.createRef();
      function App() {
        const [count, setCount] = React.useState(0);
        const onClick = React.useEffectEvent(() => {
          setCount(c => c + 1);
        });
        return (
          <button ref={ref} onClick={() => onClick()}>
            {count}
          </button>
        );
      }
      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(container)).toEqual(<button>0</button>);

      ReactDOMClient.hydrateRoot(container, <App />);
      await waitForAll([]);
      expect(getVisibleChildren(container)).toEqual(<button>0</button>);

      ref.current.dispatchEvent(
        new window.MouseEvent('click', {bubbles: true}),
      );
      await jest.runAllTimers();
      expect(getVisibleChildren(container)).toEqual(<button>1</button>);
    });

    it('throws if useEffectEvent is called during a server render', async () => {
      const logs = [];
      function App() {
        const onRender = React.useEffectEvent(() => {
          logs.push('rendered');
        });
        onRender();
        return <p>Hello</p>;
      }

      const reportedServerErrors = [];
      let caughtError;
      try {
        await act(() => {
          const {pipe} = renderToPipeableStream(<App />, {
            onError(e) {
              reportedServerErrors.push(e);
            },
          });
          pipe(writable);
        });
      } catch (err) {
        caughtError = err;
      }
      expect(logs).toEqual([]);
      expect(caughtError.message).toContain(
        "A function wrapped in useEffectEvent can't be called during rendering.",
      );
      expect(reportedServerErrors).toEqual([caughtError]);
    });

    it('does not guarantee useEffectEvent return values during server rendering are distinct', async () => {
      function App() {
        const onClick1 = React.useEffectEvent(() => {});
        const onClick2 = React.useEffectEvent(() => {});
        if (onClick1 === onClick2) {
          return <div />;
        } else {
          return <span />;
        }
      }
      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getVisibleChildren(container)).toEqual(<div />);

      const errors = [];
      ReactDOMClient.hydrateRoot(container, <App />, {
        onRecoverableError(error) {
          errors.push(error);
        },
      });
      await waitForAll([]);
      expect(errors.length).toEqual(1);
      expect(getVisibleChildren(container)).toEqual(<span />);
    });
  });

  it('can render scripts with simple children', async () => {
    await act(async () => {
      const {pipe} = renderToPipeableStream(
        <html>
          <body>
            <script>{'try { foo() } catch (e) {} ;'}</script>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(document.documentElement.outerHTML).toEqual(
      '<html><head>' +
        (gate(flags => flags.shouldUseFizzExternalRuntime)
          ? '<script src="react-dom-bindings/src/server/ReactDOMServerExternalRuntime.js" async=""></script>'
          : '') +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render">'
          : '') +
        '</head><body><script>try { foo() } catch (e) {} ;</script>' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : '') +
        '</body></html>',
    );
  });

  it('warns if script has complex children', async () => {
    function MyScript() {
      return 'bar();';
    }

    function App() {
      return (
        <html>
          <body>
            <script>{2}</script>
            <script>
              {['try { foo() } catch (e) {} ;', 'try { bar() } catch (e) {} ;']}
            </script>
            <script>
              <MyScript />
            </script>
          </body>
        </html>
      );
    }

    await act(async () => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    assertConsoleErrorDev([
      'A script element was rendered with a number for children. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.' +
        componentStack(['script', 'App']),
      'A script element was rendered with an array for children. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.' +
        componentStack(['script', 'App']),
      'A script element was rendered with something unexpected for children. If script element has children it must be a single string. Consider using dangerouslySetInnerHTML or passing a plain string as children.' +
        componentStack(['script', 'App']),
    ]);
  });

  it(
    'a transition that flows into a dehydrated boundary should not suspend ' +
      'if the boundary is showing a fallback',
    async () => {
      let setSearch;
      function App() {
        const [search, _setSearch] = React.useState('initial query');
        setSearch = _setSearch;
        return (
          <div>
            <div>{search}</div>
            <div>
              <Suspense fallback="Loading...">
                <AsyncText text="Async" />
              </Suspense>
            </div>
          </div>
        );
      }

      // Render the initial HTML, which is showing a fallback.
      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });

      // Start hydrating.
      await clientAct(() => {
        ReactDOMClient.hydrateRoot(container, <App />);
      });
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <div>initial query</div>
          <div>Loading...</div>
        </div>,
      );

      // Before the HTML has streamed in, update the query. The part outside
      // the fallback should be allowed to finish.
      await clientAct(() => {
        React.startTransition(() => setSearch('updated query'));
      });
      expect(getVisibleChildren(container)).toEqual(
        <div>
          <div>updated query</div>
          <div>Loading...</div>
        </div>,
      );
    },
  );

  it('can resume a prerender that was aborted', async () => {
    const promise = new Promise(r => {});

    let prerendering = true;

    function Wait() {
      if (prerendering) {
        return React.use(promise);
      } else {
        return 'Hello';
      }
    }

    function App() {
      return (
        <div>
          <Suspense fallback="Loading...">
            <p>
              <span>
                <Suspense fallback="Loading again...">
                  <Wait />
                </Suspense>
              </span>
            </p>
            <p>
              <span>
                <Suspense fallback="Loading again too...">
                  <Wait />
                </Suspense>
              </span>
            </p>
          </Suspense>
        </div>
      );
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const errors = [];
    function onError(error) {
      errors.push(error);
    }
    let pendingPrerender;
    await act(() => {
      pendingPrerender = ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
        signal,
        onError,
      });
    });
    controller.abort('boom');

    const prerendered = await pendingPrerender;

    expect(errors).toEqual(['boom', 'boom']);

    const preludeWritable = new Stream.PassThrough();
    preludeWritable.setEncoding('utf8');
    preludeWritable.on('data', chunk => {
      writable.write(chunk);
    });

    await act(() => {
      prerendered.prelude.pipe(preludeWritable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>
          <span>Loading again...</span>
        </p>
        <p>
          <span>Loading again too...</span>
        </p>
      </div>,
    );

    prerendering = false;

    errors.length = 0;
    const resumed = await ReactDOMFizzServer.resumeToPipeableStream(
      <App />,
      JSON.parse(JSON.stringify(prerendered.postponed)),
      {
        onError,
      },
    );

    await act(() => {
      resumed.pipe(writable);
    });

    expect(errors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>
          <span>Hello</span>
        </p>
        <p>
          <span>Hello</span>
        </p>
      </div>,
    );
  });

  it('should NOT warn for using generator functions as components', async () => {
    function* Foo() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<Foo />);
      pipe(writable);
    });

    expect(document.body.textContent).toBe('HelloWorld');
  });

  it('can abort synchronously during render', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <ComponentThatAborts />
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    function ComponentThatAborts() {
      abortRef.current();
      return <p>hello world</p>;
    }

    let finished = false;
    await act(() => {
      const {pipe, abort} = renderToPipeableStream(<App />);
      abortRef.current = abort;
      writable.on('finish', () => {
        finished = true;
      });
      pipe(writable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(finished).toBe(true);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('reports an in-flight root task after another root task fatals while aborting', async () => {
    const promise = new Promise(() => {});
    function SuspendedRoot() {
      use(promise);
      return null;
    }

    function Child() {
      return 'child';
    }

    const abortRef = {current: null};
    function ComponentThatAborts() {
      abortRef.current(new Error('abort reason'));
      return <Child />;
    }

    const errors = [];
    await act(() => {
      const {abort} = renderToPipeableStream(
        <>
          <SuspendedRoot />
          <ComponentThatAborts />
        </>,
        {
          onError(error) {
            errors.push(error.message);
          },
          onShellError() {},
        },
      );
      abortRef.current = abort;
    });

    expect(errors).toEqual(['abort reason', 'abort reason']);
  });

  it('reports a root task before rendering a suspended child returned after aborting', async () => {
    const promise = new Promise(() => {});
    function SuspendedRoot() {
      use(promise);
      return null;
    }

    function Child() {
      use(promise);
      return null;
    }

    const abortRef = {current: null};
    function ComponentThatAborts() {
      abortRef.current(new Error('abort reason'));
      return <Child />;
    }

    const errors = [];
    await act(() => {
      const {abort} = renderToPipeableStream(
        <>
          <SuspendedRoot />
          <ComponentThatAborts />
        </>,
        {
          onError(error) {
            errors.push(error.message);
          },
          onShellError() {},
        },
      );
      abortRef.current = abort;
    });

    expect(errors).toEqual(['abort reason', 'abort reason']);
  });

  it('reports a root task that suspends directly after aborting during render', async () => {
    const promise = new Promise(() => {});
    const abortRef = {current: null};
    function ComponentThatAbortsAndSuspends() {
      abortRef.current(new Error('abort reason'));
      use(promise);
      return null;
    }

    const errors = [];
    await act(() => {
      const {abort} = renderToPipeableStream(
        <ComponentThatAbortsAndSuspends />,
        {
          onError(error) {
            errors.push(error.message);
          },
          onShellError() {},
        },
      );
      abortRef.current = abort;
    });

    expect(errors).toEqual(['abort reason']);
  });

  it('can abort during render in a lazy initializer for a component', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            <LazyAbort />
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const LazyAbort = React.lazy(() => {
      abortRef.current();
      return {
        then(cb) {
          cb({default: 'div'});
        },
      };
    });

    let finished = false;
    await act(() => {
      const {pipe, abort} = renderToPipeableStream(<App />);
      abortRef.current = abort;
      writable.on('finish', () => {
        finished = true;
      });
      pipe(writable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(finished).toBe(true);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during render in a lazy initializer for an element', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            {lazyAbort}
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const lazyAbort = React.lazy(() => {
      abortRef.current();
      return {
        then(cb) {
          cb({default: 'hello world'});
        },
      };
    });

    let finished = false;
    await act(() => {
      const {pipe, abort} = renderToPipeableStream(<App />);
      abortRef.current = abort;
      writable.on('finish', () => {
        finished = true;
      });
      pipe(writable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(finished).toBe(true);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can abort during a synchronous thenable resolution', async () => {
    function Sibling() {
      return <p>sibling</p>;
    }

    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading 1...</p>}>
            {thenable}
            <Sibling />
          </Suspense>
          <Suspense fallback={<p>loading 2...</p>}>
            <Sibling />
          </Suspense>
          <div>
            <Suspense fallback={<p>loading 3...</p>}>
              <div>
                <Sibling />
              </div>
            </Suspense>
          </div>
        </div>
      );
    }

    const abortRef = {current: null};
    const thenable = {
      then(cb) {
        abortRef.current();
        cb(thenable.value);
      },
    };

    let finished = false;
    await act(() => {
      const {pipe, abort} = renderToPipeableStream(<App />);
      abortRef.current = abort;
      writable.on('finish', () => {
        finished = true;
      });
      pipe(writable);
    });

    assertConsoleErrorDev([
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
      'Error: The render was aborted by the server without a reason.' +
        '\n    in <stack>',
    ]);

    expect(finished).toBe(true);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>loading 1...</p>
        <p>loading 2...</p>
        <div>
          <p>loading 3...</p>
        </div>
      </div>,
    );
  });

  it('can support throwing after aborting during a render', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<p>loading...</p>}>
            <ComponentThatAborts />
          </Suspense>
        </div>
      );
    }

    function ComponentThatAborts() {
      abortRef.current('boom');
      throw new Error('bam');
    }

    const abortRef = {current: null};
    let finished = false;
    const errors = [];
    await act(() => {
      const {pipe, abort} = renderToPipeableStream(<App />, {
        onError(err) {
          errors.push(err);
        },
      });
      abortRef.current = abort;
      writable.on('finish', () => {
        finished = true;
      });
      pipe(writable);
    });

    expect(errors).toEqual(['boom']);

    expect(finished).toBe(true);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>loading...</p>
      </div>,
    );
  });

  it('should warn for using generators as children props', async () => {
    function* getChildren() {
      yield <h1 key="1">Hello</h1>;
      yield <h1 key="2">World</h1>;
    }

    function Foo() {
      const children = getChildren();
      return <div>{children}</div>;
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<Foo />);
      pipe(writable);
    });
    assertConsoleErrorDev([
      'Using Iterators as children is unsupported and will likely yield ' +
        'unexpected results because enumerating a generator mutates it. ' +
        'You may convert it to an array with `Array.from()` or the ' +
        '`[...spread]` operator before rendering. You can also use an ' +
        'Iterable that can iterate multiple times over the same items.\n' +
        '    in div (at **)\n' +
        '    in Foo (at **)',
    ]);

    expect(document.body.textContent).toBe('HelloWorld');
  });

  it('should warn for using other types of iterators as children', async () => {
    function Foo() {
      let i = 0;
      const iterator = {
        [Symbol.iterator]() {
          return iterator;
        },
        next() {
          switch (i++) {
            case 0:
              return {done: false, value: <h1 key="1">Hello</h1>};
            case 1:
              return {done: false, value: <h1 key="2">World</h1>};
            default:
              return {done: true, value: undefined};
          }
        },
      };
      return iterator;
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<Foo />);
      pipe(writable);
    });
    assertConsoleErrorDev([
      'Using Iterators as children is unsupported and will likely yield ' +
        'unexpected results because enumerating a generator mutates it. ' +
        'You may convert it to an array with `Array.from()` or the ' +
        '`[...spread]` operator before rendering. You can also use an ' +
        'Iterable that can iterate multiple times over the same items.\n' +
        '    in Foo (at **)',
    ]);

    expect(document.body.textContent).toBe('HelloWorld');
  });

  // @gate __DEV__
  it('can get the component owner stacks during rendering in dev', async () => {
    let stack;

    function Foo() {
      return <Bar />;
    }
    function Bar() {
      return (
        <div>
          <Baz />
        </div>
      );
    }
    function Baz() {
      stack = React.captureOwnerStack();
      return <span>hi</span>;
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Foo />
        </div>,
      );
      pipe(writable);
    });

    expect(normalizeCodeLocInfo(stack)).toBe(
      '\n    in Bar (at **)' + '\n    in Foo (at **)',
    );
  });

  // @gate __DEV__
  it('can get the component owner stacks for onError in dev', async () => {
    const thrownError = new Error('hi');
    let caughtError;
    let parentStack;
    let ownerStack;

    function Foo() {
      return <Bar />;
    }
    function Bar() {
      return (
        <div>
          <Baz />
        </div>
      );
    }
    function Baz() {
      throw thrownError;
    }

    await expect(async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <div>
            <Foo />
          </div>,
          {
            onError(error, errorInfo) {
              caughtError = error;
              parentStack = errorInfo.componentStack;
              ownerStack = React.captureOwnerStack
                ? React.captureOwnerStack()
                : null;
            },
          },
        );
        pipe(writable);
      });
    }).rejects.toThrow(thrownError);

    expect(caughtError).toBe(thrownError);
    expect(normalizeCodeLocInfo(parentStack)).toBe(
      '\n    in Baz (at **)' +
        '\n    in div (at **)' +
        '\n    in Bar (at **)' +
        '\n    in Foo (at **)' +
        '\n    in div (at **)',
    );
    expect(normalizeCodeLocInfo(ownerStack)).toBe(
      '\n    in Bar (at **)' + '\n    in Foo (at **)',
    );
  });

  it('can recover from very deep trees to avoid stack overflow', async () => {
    function Recursive({n}) {
      if (n > 0) {
        return <Recursive n={n - 1} />;
      }
      return <span>hi</span>;
    }

    // Recursively render a component tree deep enough to trigger stack overflow
    // more than once. The first overflow is recovered by the renderNode
    // trampoline; deeper trees must also recover when the retried task
    // overflows again. Don't make this too deep to slow down the test.
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <div>
          <Recursive n={1200} />
        </div>,
      );
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>hi</span>
      </div>,
    );
  });

  it('handles stack overflows inside components themselves', async () => {
    function StackOverflow() {
      // This component is recursive inside itself and is therefore an error.
      // Assuming no tail-call optimizations.
      function recursive(n, a0, a1, a2, a3) {
        if (n > 0) {
          return recursive(n - 1, a0, a1, a2, a3) + a0 + a1 + a2 + a3;
        }
        return a0;
      }
      return recursive(10000, 'should', 'not', 'resolve', 'this');
    }

    let caughtError;

    await expect(async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <div>
            <StackOverflow />
          </div>,
          {
            onError(error, errorInfo) {
              caughtError = error;
            },
          },
        );
        pipe(writable);
      });
    }).rejects.toThrow('Maximum call stack size exceeded');

    expect(caughtError.message).toBe('Maximum call stack size exceeded');
  });

  it('client renders incomplete Suspense boundaries when the document is no longer loading when hydration begins', async () => {
    let resolve;
    const promise = new Promise(r => {
      resolve = r;
    });

    function Blocking() {
      React.use(promise);
      return null;
    }

    function App() {
      return (
        <div>
          <p>outside</p>
          <Suspense fallback={<p>loading...</p>}>
            <Blocking />
            <p>inside</p>
          </Suspense>
        </div>
      );
    }

    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError(err) {
          errors.push(err.message);
        },
      });
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>loading...</p>
      </div>,
    );

    await act(() => {
      // We now end the stream and resolve the promise that was blocking the boundary
      // Because the stream is ended it won't actually propagate to the client
      writable.end();
      document.readyState = 'complete';
      resolve();
    });
    // ending the stream early will cause it to error on the server
    expect(errors).toEqual([
      expect.stringContaining('The destination stream closed early'),
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>loading...</p>
      </div>,
    );

    const clientErrors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error, errorInfo) {
        clientErrors.push(error.message);
      },
    });
    await waitForAll([]);
    // When we hydrate the client the document is already not loading
    // so we client render the boundary in fallback
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>inside</p>
      </div>,
    );
    expect(clientErrors).toEqual([
      expect.stringContaining(
        'The server could not finish this Suspense boundar',
      ),
    ]);
  });

  it('client renders incomplete Suspense boundaries when the document stops loading during hydration', async () => {
    let resolve;
    const promise = new Promise(r => {
      resolve = r;
    });

    function Blocking() {
      React.use(promise);
      return null;
    }

    function App() {
      return (
        <div>
          <p>outside</p>
          <Suspense fallback={<p>loading...</p>}>
            <Blocking />
            <p>inside</p>
          </Suspense>
        </div>
      );
    }

    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError(err) {
          errors.push(err.message);
        },
      });
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>loading...</p>
      </div>,
    );

    await act(() => {
      // We now end the stream and resolve the promise that was blocking the boundary
      // Because the stream is ended it won't actually propagate to the client
      writable.end();
      resolve();
    });
    // ending the stream early will cause it to error on the server
    expect(errors).toEqual([
      expect.stringContaining('The destination stream closed early'),
    ]);
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>loading...</p>
      </div>,
    );

    const clientErrors = [];
    ReactDOMClient.hydrateRoot(container, <App />, {
      onRecoverableError(error, errorInfo) {
        clientErrors.push(error.message);
      },
    });
    await waitForAll([]);
    // When we hydrate the client is still waiting for the blocked boundary
    // and won't client render unless the document is no longer loading
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>loading...</p>
      </div>,
    );

    document.readyState = 'complete';
    await waitForAll([]);
    // Now that the document is no longer in loading readyState it will client
    // render the boundary in fallback
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <p>outside</p>
        <p>inside</p>
      </div>,
    );
    expect(clientErrors).toEqual([
      expect.stringContaining(
        'The server could not finish this Suspense boundar',
      ),
    ]);
  });

  it('can suspend inside the <head /> tag', async () => {
    function BlockedOn({value, children}) {
      readText(value);
      return children;
    }

    function App() {
      return (
        <html>
          <head>
            <Suspense fallback={<meta itemProp="head loading" />}>
              <BlockedOn value="head">
                <meta itemProp="" content="head" />
              </BlockedOn>
            </Suspense>
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="head loading" />
        </head>
        <body>
          <div>hello world</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('head');
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="" content="head" />
        </head>
        <body>
          <div>hello world</div>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="" content="head" />
        </head>
        <body>
          <div>hello world</div>
        </body>
      </html>,
    );

    await act(() => {
      root.unmount();
    });
    await waitForAll([]);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('can render Suspense before, after, and around <html>', async () => {
    function BlockedOn({value, children}) {
      readText(value);
      return children;
    }

    function App() {
      return (
        <>
          <Suspense fallback="this fallback never renders">
            <div>before</div>
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <BlockedOn value="html">
              <html lang="en">
                <head>
                  <meta itemProp="" content="non-floaty meta" />
                </head>
                <body>
                  <div>hello world</div>
                </body>
              </html>
            </BlockedOn>
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <div>after</div>
          </Suspense>
        </>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady: () => {
          shellReady = true;
        },
      });
      pipe(writable);
    });

    // When we Suspend above the body we block the shell because the root HTML scope
    // is considered "reconciliation" mode whereby we should stay on the prior view
    // (the prior page for instance) rather than showing the fallback (semantically)
    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      resolveText('html');
    });
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(getVisibleChildren(document)).toEqual(
      <html lang="en">
        <head>
          <meta itemprop="" content="non-floaty meta" />
        </head>
        <body>
          <div>before</div>
          <div>hello world</div>
          <div>after</div>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html lang="en">
        <head>
          <meta itemprop="" content="non-floaty meta" />
        </head>
        <body>
          <div>before</div>
          <div>hello world</div>
          <div>after</div>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('can render Suspense before, after, and around <body>', async () => {
    function BlockedOn({value, children}) {
      readText(value);
      return children;
    }

    function App() {
      return (
        <html>
          <Suspense fallback="this fallback never renders">
            <meta content="before" />
            <meta itemProp="" content="before" />
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <BlockedOn value="body">
              <body lang="en">
                <div>hello world</div>
              </body>
            </BlockedOn>
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <meta content="after" />
            <meta itemProp="" content="after" />
          </Suspense>
        </html>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      resolveText('body');
    });
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta content="before" />
          <meta content="after" />
        </head>
        <body lang="en">
          <meta itemprop="" content="before" />
          <div>hello world</div>
          <meta itemprop="" content="after" />
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta content="before" />
          <meta content="after" />
        </head>
        <body lang="en">
          <meta itemprop="" content="before" />
          <div>hello world</div>
          <meta itemprop="" content="after" />
        </body>
      </html>,
    );
    assertConsoleErrorDev([
      'Cannot render a <meta> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <meta> remove the `itemProp` prop. Otherwise, try moving this tag into the <head> or <body> of the Document.',
      'In HTML, <meta> cannot be a child of <html>.\nThis will cause a hydration error.' +
        '\n' +
        '\n  <App>' +
        '\n>   <html>' +
        '\n      <Suspense fallback="this fallb...">' +
        '\n        <meta>' +
        '\n>       <meta itemProp="" content="before">' +
        '\n      ...' +
        '\n' +
        '\n    in meta (at **)' +
        '\n    in App (at **)',
      '<html> cannot contain a nested <meta>.\nSee this log for the ancestor stack trace.' +
        '\n    in html (at **)' +
        '\n    in App (at **)',
      'Cannot render a <meta> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <meta> remove the `itemProp` prop. Otherwise, try moving this tag into the <head> or <body> of the Document.',
    ]);

    await root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('can render Suspense before, after, and around <head>', async () => {
    function BlockedOn({value, children}) {
      readText(value);
      return children;
    }

    function App() {
      return (
        <html>
          <Suspense fallback="this fallback never renders">
            <meta content="before" />
            <meta itemProp="" content="before" />
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <BlockedOn value="head">
              <head lang="en">
                <meta itemProp="" />
              </head>
            </BlockedOn>
          </Suspense>
          <Suspense fallback="this fallback never renders">
            <meta content="after" />
            <meta itemProp="" content="after" />
          </Suspense>
          <body>
            <div>hello world</div>
          </body>
        </html>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      resolveText('head');
    });
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="en">
          <meta content="before" />
          <meta content="after" />
          <meta itemprop="" />
        </head>
        <body>
          <meta itemprop="" content="before" />
          <meta itemprop="" content="after" />
          <div>hello world</div>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="en">
          <meta content="before" />
          <meta content="after" />
          <meta itemprop="" />
        </head>
        <body>
          <meta itemprop="" content="before" />
          <meta itemprop="" content="after" />
          <div>hello world</div>
        </body>
      </html>,
    );
    assertConsoleErrorDev([
      'Cannot render a <meta> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <meta> remove the `itemProp` prop. Otherwise, try moving this tag into the <head> or <body> of the Document.',
      'In HTML, <meta> cannot be a child of <html>.\nThis will cause a hydration error.' +
        '\n' +
        '\n  <App>' +
        '\n>   <html>' +
        '\n      <Suspense fallback="this fallb...">' +
        '\n        <meta>' +
        '\n>       <meta itemProp="" content="before">' +
        '\n      ...' +
        '\n' +
        '\n    in meta (at **)' +
        '\n    in App (at **)',
      '<html> cannot contain a nested <meta>.\nSee this log for the ancestor stack trace.' +
        '\n    in html (at **)' +
        '\n    in App (at **)',
      'Cannot render a <meta> outside the main document if it has an `itemProp` prop. `itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. If you were intending for React to hoist this <meta> remove the `itemProp` prop. Otherwise, try moving this tag into the <head> or <body> of the Document.',
    ]);

    await root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('will render fallback Document when erroring a boundary above the body and recover on the client', async () => {
    let serverRendering = true;
    function Boom() {
      if (serverRendering) {
        throw new Error('Boom!');
      }
      return null;
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

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(errors).toEqual([new Error('Boom!')]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-error-html="">
        <head />
        <body data-error-body="">
          <span>hello error</span>
        </body>
      </html>,
    );

    serverRendering = false;

    const recoverableErrors = [];
    const root = ReactDOMClient.hydrateRoot(document, <App />, {
      onRecoverableError(err) {
        recoverableErrors.push(err);
      },
    });
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-content-html="">
        <head />
        <body data-content-body="">
          <span>hello world</span>
        </body>
      </html>,
    );
    expect(recoverableErrors).toEqual([
      __DEV__
        ? new Error(
            'Switched to client rendering because the server rendering errored:\n\nBoom!',
          )
        : new Error(
            'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          ),
    ]);

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('will hoist resources and hositables from a primary tree into the <head> of a client rendered fallback', async () => {
    let serverRendering = true;
    function Boom() {
      if (serverRendering) {
        throw new Error('Boom!');
      }
      return null;
    }

    function App() {
      return (
        <>
          <meta content="hoistable before" />
          <link rel="stylesheet" href="hoistable before" precedence="default" />
          <Suspense
            fallback={
              <html data-error-html="">
                <head data-error-head="">
                  {/* we have to make this a non-hoistable because we don't current emit
                      hoistables inside fallbacks because we have no way to clean them up
                      on hydration */}
                  <meta itemProp="" content="error document" />
                </head>
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
          <meta content="hoistable after" />
          <link rel="stylesheet" href="hoistable after" precedence="default" />
        </>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(errors).toEqual([new Error('Boom!')]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-error-html="">
        <head data-error-head="">
          <link
            rel="stylesheet"
            href="hoistable before"
            data-precedence="default"
          />
          <link
            rel="stylesheet"
            href="hoistable after"
            data-precedence="default"
          />
          <meta content="hoistable before" />
          <meta content="hoistable after" />
          <meta itemprop="" content="error document" />
        </head>
        <body data-error-body="">
          <span>hello error</span>
        </body>
      </html>,
    );

    serverRendering = false;

    const recoverableErrors = [];
    const root = ReactDOMClient.hydrateRoot(document, <App />, {
      onRecoverableError(err) {
        recoverableErrors.push(err);
      },
    });
    await waitForAll([]);
    expect(recoverableErrors).toEqual([
      __DEV__
        ? new Error(
            'Switched to client rendering because the server rendering errored:\n\nBoom!',
          )
        : new Error(
            'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          ),
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-content-html="">
        <head>
          <link
            rel="stylesheet"
            href="hoistable before"
            data-precedence="default"
          />
          <link
            rel="stylesheet"
            href="hoistable after"
            data-precedence="default"
          />
          <meta content="hoistable before" />
          <meta content="hoistable after" />
        </head>
        <body data-content-body="">
          <span>hello world</span>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            href="hoistable before"
            data-precedence="default"
          />
          <link
            rel="stylesheet"
            href="hoistable after"
            data-precedence="default"
          />
        </head>
        <body />
      </html>,
    );
  });

  it('will attempt to render the preamble inline to allow rendering before a later abort in the same task', async () => {
    const promise = new Promise(() => {});
    function Pending() {
      React.use(promise);
    }

    const controller = new AbortController();
    function Abort() {
      controller.abort();
      return <Comp />;
    }

    function Comp() {
      return null;
    }

    function App() {
      return (
        <html>
          <head>
            <meta content="here" />
          </head>
          <body>
            <main>hello</main>
            <Suspense>
              <Pending />
            </Suspense>
            <Abort />
          </body>
        </html>
      );
    }

    const signal = controller.signal;

    let thrownError = null;
    const errors = [];
    try {
      await act(() => {
        const {pipe, abort} = renderToPipeableStream(<App />, {
          onError(e, ei) {
            errors.push({
              error: e,
              componentStack: normalizeCodeLocInfo(ei.componentStack),
            });
          },
        });
        signal.addEventListener('abort', () => abort('boom'));
        pipe(writable);
      });
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toBe('boom');
    expect(errors).toEqual([
      {
        error: 'boom',
        componentStack: componentStack(['Abort', 'body', 'html', 'App']),
      },
      {
        error: 'boom',
        componentStack: componentStack([
          'Pending',
          'Suspense',
          'body',
          'html',
          'App',
        ]),
      },
      {
        error: 'boom',
        componentStack: componentStack([
          'Suspense Fallback',
          'body',
          'html',
          'App',
        ]),
      },
    ]);

    // We expect the render to throw before streaming anything so the default
    // document is still loaded
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container" />
        </body>
      </html>,
    );
  });

  it('Will wait to flush Document chunks until all boundaries which might contain a preamble are errored or resolved', async () => {
    let rejectFirst;
    const firstPromise = new Promise((_, reject) => {
      rejectFirst = reject;
    });
    function First({children}) {
      use(firstPromise);
      return children;
    }

    let resolveSecond;
    const secondPromise = new Promise(resolve => {
      resolveSecond = resolve;
    });
    function Second({children}) {
      use(secondPromise);
      return children;
    }

    const hangingPromise = new Promise(() => {});
    function Hanging({children}) {
      use(hangingPromise);
      return children;
    }

    function App() {
      return (
        <>
          <Suspense fallback={<span>loading...</span>}>
            <Suspense fallback={<span>inner loading...</span>}>
              <First>
                <span>first</span>
              </First>
            </Suspense>
          </Suspense>
          <Suspense fallback={<span>loading...</span>}>
            <main>
              <Second>
                <span>second</span>
              </Second>
            </main>
          </Suspense>
          <div>
            <Suspense fallback={<span>loading...</span>}>
              <Hanging>
                <span>third</span>
              </Hanging>
            </Suspense>
          </div>
        </>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      resolveSecond();
    });
    expect(content).toBe('');

    await act(() => {
      rejectFirst('Boom!');
    });
    expect(content.length).toBeGreaterThan(0);
    expect(errors).toEqual(['Boom!']);

    expect(getVisibleChildren(container)).toEqual([
      <span>inner loading...</span>,
      <main>
        <span>second</span>
      </main>,
      <div>
        <span>loading...</span>
      </div>,
    ]);
  });

  it('Can render a fallback <head> alongside a non-fallback body', async () => {
    let serverRendering = true;
    function Boom() {
      if (serverRendering) {
        throw new Error('Boom!');
      }
      return null;
    }

    function App() {
      return (
        <html>
          <Suspense
            fallback={
              <head data-fallback="">
                <meta itemProp="" content="fallback" />
              </head>
            }>
            <Boom />
            <head data-primary="">
              <meta itemProp="" content="primary" />
            </head>
          </Suspense>
          <Suspense
            fallback={
              <body data-fallback="">
                <div>fallback body</div>
              </body>
            }>
            <body data-primary="">
              <div>primary body</div>
            </body>
          </Suspense>
        </html>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(errors).toEqual([new Error('Boom!')]);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head data-fallback="">
          <meta itemprop="" content="fallback" />
        </head>
        <body data-primary="">
          <div>primary body</div>
        </body>
      </html>,
    );

    serverRendering = false;

    const recoverableErrors = [];
    const root = ReactDOMClient.hydrateRoot(document, <App />, {
      onRecoverableError(err) {
        recoverableErrors.push(err);
      },
    });
    await waitForAll([]);
    expect(recoverableErrors).toEqual([
      __DEV__
        ? new Error(
            'Switched to client rendering because the server rendering errored:\n\nBoom!',
          )
        : new Error(
            'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          ),
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head data-primary="">
          <meta itemprop="" content="primary" />
        </head>
        <body data-primary="">
          <div>primary body</div>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('Can render a fallback <body> alongside a non-fallback head', async () => {
    let serverRendering = true;
    function Boom() {
      if (serverRendering) {
        throw new Error('Boom!');
      }
      return null;
    }

    function App() {
      return (
        <html>
          <Suspense
            fallback={
              <head data-fallback="">
                <meta itemProp="" content="fallback" />
              </head>
            }>
            <head data-primary="">
              <meta itemProp="" content="primary" />
            </head>
          </Suspense>
          <Suspense
            fallback={
              <body data-fallback="">
                <div>fallback body</div>
              </body>
            }>
            <Boom />
            <body data-primary="">
              <div>primary body</div>
            </body>
          </Suspense>
        </html>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toMatch(/^<!DOCTYPE html>/);
    expect(errors).toEqual([new Error('Boom!')]);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head data-primary="">
          <meta itemprop="" content="primary" />
        </head>
        <body data-fallback="">
          <div>fallback body</div>
        </body>
      </html>,
    );

    serverRendering = false;

    const recoverableErrors = [];
    const root = ReactDOMClient.hydrateRoot(document, <App />, {
      onRecoverableError(err) {
        recoverableErrors.push(err);
      },
    });
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head data-primary="">
          <meta itemprop="" content="primary" />
        </head>
        <body data-primary="">
          <div>primary body</div>
        </body>
      </html>,
    );
    expect(recoverableErrors).toEqual([
      __DEV__
        ? new Error(
            'Switched to client rendering because the server rendering errored:\n\nBoom!',
          )
        : new Error(
            'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
          ),
    ]);

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('Can render a <head> outside of a containing <html>', async () => {
    function App() {
      return (
        <>
          <Suspense>
            <html data-x="">
              <body data-x="">
                <span>hello world</span>
              </body>
            </html>
          </Suspense>
          <head data-y="">
            <meta itemProp="" />
          </head>
        </>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toMatch(/^<!DOCTYPE html>/);

    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head data-y="">
          <meta itemprop="" />
        </head>
        <body data-x="">
          <span>hello world</span>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="">
        <head data-y="">
          <meta itemprop="" />
        </head>
        <body data-x="">
          <span>hello world</span>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('can render preamble tags in deeply nested indirect component trees', async () => {
    function App() {
      return (
        <Html>
          <DocumentMetadata />
          <Main />
        </Html>
      );
    }

    let loadLanguage;
    const langPromise = new Promise(r => {
      loadLanguage = r;
    });
    function Html({children}) {
      return (
        <Suspense fallback={<FallbackHtml>{children}</FallbackHtml>}>
          <MainHtml>{children}</MainHtml>
        </Suspense>
      );
    }
    function FallbackHtml({children}) {
      return <html lang="default">{children}</html>;
    }
    function MainHtml({children}) {
      const lang = use(langPromise);
      return <html lang={lang}>{children}</html>;
    }

    let loadMetadata;
    const metadataPromise = new Promise(r => {
      loadMetadata = r;
    });
    function DocumentMetadata() {
      return (
        <Suspense fallback={<FallbackDocumentMetadata />}>
          <MainDocumentMetadata />
        </Suspense>
      );
    }
    function FallbackDocumentMetadata() {
      return (
        <head data-fallback="">
          <meta content="fallback metadata" />
        </head>
      );
    }
    function MainDocumentMetadata() {
      const metadata = use(metadataPromise);
      return (
        <head data-main="">
          {metadata.map(m => (
            <meta content={m} key={m} />
          ))}
        </head>
      );
    }

    let loadMainContent;
    const mainContentPromise = new Promise(r => {
      loadMainContent = r;
    });
    function Main() {
      return (
        <Suspense fallback={<Skeleton />}>
          <PrimaryContent />
        </Suspense>
      );
    }
    function Skeleton() {
      return (
        <body data-fallback="">
          <div>Skeleton UI</div>
        </body>
      );
    }
    function PrimaryContent() {
      const content = use(mainContentPromise);
      return (
        <body data-main="">
          <div>{content}</div>
        </body>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    const errors = [];
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
        onError(e) {
          errors.push(e);
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      loadLanguage('es');
    });
    expect(content).toBe('');

    await act(() => {
      loadMainContent('This is soooo cool!');
    });
    expect(content).toBe('');

    await act(() => {
      loadMetadata(['author', 'published date']);
    });
    expect(content).toMatch(/^<!DOCTYPE html>/);

    expect(getVisibleChildren(document)).toEqual(
      <html lang="es">
        <head data-main="">
          <meta content="author" />
          <meta content="published date" />
        </head>
        <body data-main="">
          <div>This is soooo cool!</div>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html lang="es">
        <head data-main="">
          <meta content="author" />
          <meta content="published date" />
        </head>
        <body data-main="">
          <div>This is soooo cool!</div>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('will flush the preamble as soon as a complete preamble is available', async () => {
    function BlockedOn({value, children}) {
      readText(value);
      return children;
    }

    function App() {
      return (
        <>
          <Suspense fallback="loading before...">
            <div>
              <AsyncText text="before" />
            </div>
          </Suspense>
          <Suspense fallback="loading document...">
            <html>
              <body>
                <div>
                  <AsyncText text="body" />
                </div>
              </body>
            </html>
          </Suspense>
          <Suspense fallback="loading head...">
            <head>
              <BlockedOn value="head">
                <meta content="head" />
              </BlockedOn>
            </head>
          </Suspense>
          <Suspense fallback="loading after...">
            <div>
              <AsyncText text="after" />
            </div>
          </Suspense>
        </>
      );
    }

    let content = '';
    writable.on('data', chunk => (content += chunk));

    let shellReady = false;
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />, {
        onShellReady() {
          shellReady = true;
        },
      });
      pipe(writable);
    });

    expect(shellReady).toBe(true);
    expect(content).toBe('');

    await act(() => {
      resolveText('body');
    });
    expect(content).toBe('');

    await act(() => {
      resolveText('head');
    });
    expect(content).toMatch(/^<!DOCTYPE html>/);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta content="head" />
        </head>
        <body>
          loading before...
          <div>body</div>
          loading after...
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta content="head" />
        </head>
        <body>
          loading before...
          <div>body</div>
          loading after...
        </body>
      </html>,
    );

    await act(() => {
      resolveText('before');
      resolveText('after');
    });
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <meta content="head" />
        </head>
        <body>
          <div>before</div>
          <div>body</div>
          <div>after</div>
        </body>
      </html>,
    );

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('will clean up the head when a hydration mismatch causes a boundary to recover on the client', async () => {
    let content = 'server';

    function ServerApp() {
      return (
        <Suspense>
          <html data-x={content}>
            <head data-x={content}>
              <meta itemProp="" content={content} />
            </head>
            <body data-x={content}>{content}</body>
          </html>
        </Suspense>
      );
    }

    function ClientApp() {
      return (
        <Suspense>
          <html data-y={content}>
            <head data-y={content}>
              <meta itemProp="" name={content} />
            </head>
            <body data-y={content}>{content}</body>
          </html>
        </Suspense>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<ServerApp />);
      pipe(writable);
    });
    expect(getVisibleChildren(document)).toEqual(
      <html data-x="server">
        <head data-x="server">
          <meta itemprop="" content="server" />
        </head>
        <body data-x="server">server</body>
      </html>,
    );

    content = 'client';

    const recoverableErrors = [];
    const root = ReactDOMClient.hydrateRoot(document, <ClientApp />, {
      onRecoverableError(err) {
        recoverableErrors.push(err.message);
      },
    });
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-y="client">
        <head data-y="client">
          <meta itemprop="" name="client" />
        </head>
        <body data-y="client">client</body>
      </html>,
    );
    expect(recoverableErrors).toEqual([
      expect.stringContaining(
        "Hydration failed because the server rendered text didn't match the client.",
      ),
    ]);

    root.unmount();
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  it('can render styles with nonce', async () => {
    CSPnonce = 'R4nd0m';
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <style
            href="foo"
            precedence="default"
            nonce={CSPnonce}>{`.foo { color: hotpink; }`}</style>
          <style
            href="bar"
            precedence="default"
            nonce={CSPnonce}>{`.bar { background-color: blue; }`}</style>
        </>,
        {nonce: {style: CSPnonce}},
      );
      pipe(writable);
    });
    expect(document.querySelector('style').nonce).toBe(CSPnonce);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container">
            <style
              data-precedence="default"
              data-href="foo bar"
              nonce={
                CSPnonce
              }>{`.foo { color: hotpink; }.bar { background-color: blue; }`}</style>
          </div>
        </body>
      </html>,
    );
  });

  it("shouldn't render styles with mismatched nonce", async () => {
    CSPnonce = 'R4nd0m';
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <style
            href="foo"
            precedence="default"
            nonce={CSPnonce}>{`.foo { color: hotpink; }`}</style>
          <style
            href="bar"
            precedence="default"
            nonce={`${CSPnonce}${CSPnonce}`}>{`.bar { background-color: blue; }`}</style>
        </>,
        {nonce: {style: CSPnonce}},
      );
      pipe(writable);
    });
    assertConsoleErrorDev([
      'React encountered a style tag with `precedence` "default" and `nonce` "R4nd0mR4nd0m". When React manages style rules using `precedence` it will only include rules if the nonce matches the style nonce "R4nd0m" that was included with this render.' +
        '\n    in style (at **)',
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container">
            <style
              data-precedence="default"
              data-href="foo"
              nonce={CSPnonce}>{`.foo { color: hotpink; }`}</style>
          </div>
        </body>
      </html>,
    );
  });

  it("should render styles without nonce when render call doesn't receive nonce", async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <style
            href="foo"
            precedence="default"
            nonce="R4nd0m">{`.foo { color: hotpink; }`}</style>
        </>,
      );
      pipe(writable);
    });
    assertConsoleErrorDev([
      'React encountered a style tag with `precedence` "default" and `nonce` "R4nd0m". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.' +
        '\n    in style (at **)',
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container">
            <style
              data-precedence="default"
              data-href="foo">{`.foo { color: hotpink; }`}</style>
          </div>
        </body>
      </html>,
    );
  });

  it('should render styles without nonce when render call receives a string nonce dedicated to scripts', async () => {
    CSPnonce = 'R4nd0m';
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <style
            href="foo"
            precedence="default"
            nonce={CSPnonce}>{`.foo { color: hotpink; }`}</style>
        </>,
        {nonce: CSPnonce},
      );
      pipe(writable);
    });
    assertConsoleErrorDev([
      'React encountered a style tag with `precedence` "default" and `nonce` "R4nd0m". When React manages style rules using `precedence` it will only include a nonce attributes if you also provide the same style nonce value as a render option.' +
        '\n    in style (at **)',
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container">
            <style
              data-precedence="default"
              data-href="foo">{`.foo { color: hotpink; }`}</style>
          </div>
        </body>
      </html>,
    );
  });

  it('should allow for different script and style nonces', async () => {
    CSPnonce = 'R4nd0m';
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <style
            href="foo"
            precedence="default"
            nonce="D1ff3r3nt">{`.foo { color: hotpink; }`}</style>
        </>,
        {
          nonce: {script: CSPnonce, style: 'D1ff3r3nt'},
          bootstrapScriptContent: 'function noop(){}',
        },
      );
      pipe(writable);
    });
    const scripts = Array.from(container.getElementsByTagName('script')).filter(
      node => node.getAttribute('nonce') === CSPnonce,
    );
    expect(scripts[scripts.length - 1].textContent).toBe('function noop(){}');
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container">
            <style
              data-precedence="default"
              data-href="foo"
              nonce="D1ff3r3nt">{`.foo { color: hotpink; }`}</style>
          </div>
        </body>
      </html>,
    );
  });

  it('should not error when discarding deeply nested Suspense boundaries in a parent fallback partially complete before the parent boundary resolves', async () => {
    let resolve1;
    const promise1 = new Promise(r => (resolve1 = r));
    let resolve2;
    const promise2 = new Promise(r => (resolve2 = r));
    const promise3 = new Promise(r => {});

    function Use({children, promise}) {
      React.use(promise);
      return children;
    }
    function App() {
      return (
        <div>
          <Suspense
            fallback={
              <div>
                <Suspense fallback="Loading...">
                  <div>
                    <Use promise={promise1}>
                      <div>
                        <Suspense fallback="Loading more...">
                          <div>
                            <Use promise={promise3}>
                              <div>deep fallback</div>
                            </Use>
                          </div>
                        </Suspense>
                      </div>
                    </Use>
                  </div>
                </Suspense>
              </div>
            }>
            <Use promise={promise2}>Success!</Use>
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Loading...</div>
      </div>,
    );

    await act(() => {
      resolve1('resolved');
      resolve2('resolved');
    });

    expect(getVisibleChildren(container)).toEqual(<div>Success!</div>);
  });

  it('should not error when discarding deeply nested Suspense boundaries in a parent fallback partially complete before the parent boundary resolves with empty segments', async () => {
    let resolve1;
    const promise1 = new Promise(r => (resolve1 = r));
    let resolve2;
    const promise2 = new Promise(r => (resolve2 = r));
    const promise3 = new Promise(r => {});

    function Use({children, promise}) {
      React.use(promise);
      return children;
    }
    function App() {
      return (
        <div>
          <Suspense
            fallback={
              <Suspense fallback="Loading...">
                <Use promise={promise1}>
                  <Suspense fallback="Loading more...">
                    <Use promise={promise3}>
                      <div>deep fallback</div>
                    </Use>
                  </Suspense>
                </Use>
              </Suspense>
            }>
            <Use promise={promise2}>Success!</Use>
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getVisibleChildren(container)).toEqual(<div>Loading...</div>);

    await act(() => {
      resolve1('resolved');
      resolve2('resolved');
    });

    expect(getVisibleChildren(container)).toEqual(<div>Success!</div>);
  });

  it('should always flush the boundaries contributing the preamble regardless of their size', async () => {
    const longDescription =
      `I need to make this segment somewhat large because it needs to be large enough to be outlined during the initial flush. Setting the progressive chunk size to near zero isn't enough because there is a fixed minimum size that we use to avoid doing the size tracking altogether and this needs to be larger than that at least.

Unfortunately that previous paragraph wasn't quite long enough so I'll continue with some more prose and maybe throw on some repeated additional strings at the end for good measure.

` + 'a'.repeat(500);

    const randomTag = Math.random().toString(36).slice(2, 10);

    function App() {
      return (
        <Suspense fallback={randomTag}>
          <html lang="en">
            <body>
              <main>{longDescription}</main>
            </body>
          </html>
        </Suspense>
      );
    }

    let streamedContent = '';
    writable.on('data', chunk => (streamedContent += chunk));

    await act(() => {
      renderToPipeableStream(<App />, {progressiveChunkSize: 100}).pipe(
        writable,
      );
    });

    // We don't use the DOM here b/c we execute scripts which hides whether a fallback was shown briefly
    // Instead we assert that we never emitted the fallback of the Suspense boundary around the body.
    expect(streamedContent).not.toContain(randomTag);
  });

  it('should track byte size of shells that may contribute to the preamble when determining if the blocking render exceeds the max size', async () => {
    const longDescription =
      `I need to make this segment somewhat large because it needs to be large enough to be outlined during the initial flush. Setting the progressive chunk size to near zero isn't enough because there is a fixed minimum size that we use to avoid doing the size tracking altogether and this needs to be larger than that at least.

Unfortunately that previous paragraph wasn't quite long enough so I'll continue with some more prose and maybe throw on some repeated additional strings at the end for good measure.

` + 'a'.repeat(500);

    const randomTag = Math.random().toString(36).slice(2, 10);

    function App() {
      return (
        <>
          <Suspense fallback={randomTag}>
            <html lang="en">
              <body>
                <main>{longDescription}</main>
              </body>
            </html>
          </Suspense>
          <div>Outside Preamble</div>
        </>
      );
    }

    let streamedContent = '';
    writable.on('data', chunk => (streamedContent += chunk));

    const errors = [];
    await act(() => {
      renderToPipeableStream(<App />, {
        progressiveChunkSize: 5,
        onError(e) {
          errors.push(e);
        },
      }).pipe(writable);
    });

    if (gate(flags => flags.enableFizzBlockingRender)) {
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain(
        // We set the chunk size low enough that the threshold rounds to zero kB
        'This rendered a large document (>0 kB) without any Suspense boundaries around most of it.',
      );
    } else {
      expect(errors.length).toBe(0);
    }

    // We don't use the DOM here b/c we execute scripts which hides whether a fallback was shown briefly
    // Instead we assert that we never emitted the fallback of the Suspense boundary around the body.
    expect(streamedContent).not.toContain(randomTag);
  });

  it('should be able to Suspend after aborting in the same component without hanging the render', async () => {
    const controller = new AbortController();

    const promise1 = new Promise(() => {});
    function AbortAndSuspend() {
      controller.abort('boom');
      return React.use(promise1);
    }

    function App() {
      return (
        <html>
          <body>
            <Suspense fallback="loading...">
              {/*
                The particular code path that was problematic required the Suspend to happen in renderNode
                rather than retryRenderTask so we render the aborting function inside a host component
                intentionally here
              */}
              <div>
                <AbortAndSuspend />
              </div>
            </Suspense>
          </body>
        </html>
      );
    }

    const errors = [];
    await act(async () => {
      const result = await ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
        signal: controller.signal,
        onError(e) {
          errors.push(e);
        },
      });

      result.prelude.pipe(writable);
    });

    expect(errors).toEqual(['boom']);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>loading...</body>
      </html>,
    );
  });

  it('not error when a suspended fallback segment directly inside another Suspense is abandoned', async () => {
    function SuspendForever() {
      React.use(new Promise(() => {}));
    }

    let resolve = () => {};
    const suspendPromise = new Promise(r => {
      resolve = r;
    });
    function Suspend() {
      return React.use(suspendPromise);
    }

    function App() {
      return (
        <html>
          <body>
            <Suspense fallback="outer">
              <Suspense fallback={<SuspendForever />}>
                <span>hello world</span>
                <span>
                  <Suspend />
                </span>
              </Suspense>
            </Suspense>
          </body>
        </html>
      );
    }

    await act(async () => {
      const {pipe} = renderToPipeableStream(<App />, {
        onError() {},
      });
      pipe(writable);
    });

    await act(() => {
      resolve('!');
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <span>hello world</span>
          <span>!</span>
        </body>
      </html>,
    );
  });

  // @gate enableCPUSuspense
  it('outlines deferred Suspense boundaries', async () => {
    function Log({text}) {
      Scheduler.log(text);
      return text;
    }

    await act(async () => {
      renderToPipeableStream(
        <div>
          <Suspense defer={true} fallback={<Log text="Waiting" />}>
            <span>{<Log text="hello" />}</span>
          </Suspense>
        </div>,
      ).pipe(writable);
      await jest.runAllTimers();
      const temp = document.createElement('body');
      temp.innerHTML = buffer;
      expect(getVisibleChildren(temp)).toEqual(<div>Waiting</div>);
    });

    assertLog(['Waiting', 'hello']);

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>hello</span>
      </div>,
    );
  });

  it('outlines boundaries based on UTF-8 byte size, not code unit count', async () => {
    // Boundaries are outlined when byteSize > 500, which streams the fallback
    // first. Content is 200 three-byte characters: 600 UTF-8 bytes but only 200
    // code units. The fallback should be shown initially because the boundary is
    // large enough to outline. A string.length shortcut for byte size would
    // count 200, stay under the threshold, and inline the content with no
    // fallback shown — which would be incorrect.
    const multiByte = '✓'.repeat(200);

    function App() {
      return (
        <div>
          <Suspense fallback="Waiting">
            <span>{multiByte}</span>
          </Suspense>
        </div>
      );
    }

    await act(async () => {
      renderToPipeableStream(<App />, {progressiveChunkSize: 100}).pipe(
        writable,
      );
      await jest.runAllTimers();
      const temp = document.createElement('body');
      temp.innerHTML = buffer;
      // Fallback is shown because the boundary is outlined by its UTF-8 size.
      expect(getVisibleChildren(temp)).toEqual(<div>Waiting</div>);
    });

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <span>{multiByte}</span>
      </div>,
    );
  });

  it('useId is consistent for siblings when component suspends with nested lazy', async () => {
    // Inner component uses useId
    function InnerComponent() {
      const id = React.useId();
      Scheduler.log('InnerComponent id: ' + id);
      return <span id={id}>inner</span>;
    }

    // Outer component uses useId and renders a lazy inner
    function OuterComponent({innerElement}) {
      const id = React.useId();
      Scheduler.log('OuterComponent id: ' + id);
      return <div id={id}>{innerElement}</div>;
    }

    // This sibling also has useId - its ID must be consistent with server
    function Sibling() {
      const id = React.useId();
      Scheduler.log('Sibling id: ' + id);
      return <span id={id}>sibling</span>;
    }

    // Create fresh lazy components for SERVER (resolve immediately)
    const serverLazyInner = React.lazy(async () => {
      Scheduler.log('server lazy inner initializer');
      return {default: <InnerComponent />};
    });

    const serverLazyOuter = React.lazy(async () => {
      Scheduler.log('server lazy outer initializer');
      return {
        default: <OuterComponent key="outer" innerElement={serverLazyInner} />,
      };
    });

    // Server render with lazy (resolves immediately)
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <body>
            <>{serverLazyOuter}</>
            <>
              <Sibling />
            </>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="_R_1_">
            <span id="_R_5_">inner</span>
          </div>
          <span id="_R_2_">sibling</span>
        </body>
      </html>,
    );

    assertLog([
      'server lazy outer initializer',
      'Sibling id: _R_2_',
      'OuterComponent id: _R_1_',
      'server lazy inner initializer',
      'InnerComponent id: _R_5_',
    ]);

    // Create fresh lazy components for CLIENT
    let resolveClientInner;
    const clientLazyInner = React.lazy(async () => {
      Scheduler.log('client lazy inner initializer');
      return new Promise(r => {
        resolveClientInner = () => r({default: <InnerComponent />});
      });
    });

    let resolveClientOuter;
    const clientLazyOuter = React.lazy(async () => {
      Scheduler.log('client lazy outer initializer');
      return new Promise(r => {
        resolveClientOuter = () =>
          r({default: <OuterComponent innerElement={clientLazyInner} />});
      });
    });

    const hydrationErrors = [];

    // Client hydrates with nested lazy components
    let root;
    React.startTransition(() => {
      root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <>{clientLazyOuter}</>
            <>
              <Sibling />
            </>
          </body>
        </html>,
        {
          onRecoverableError(error) {
            hydrationErrors.push(error.message);
          },
        },
      );
    });

    // First suspension on outer lazy
    await waitFor(['client lazy outer initializer']);
    resolveClientOuter();

    // Second suspension on inner lazy
    await waitFor([
      'OuterComponent id: _R_1_',
      'client lazy inner initializer',
    ]);
    resolveClientInner();

    await waitForAll(['InnerComponent id: _R_5_', 'Sibling id: _R_2_']);

    // The IDs should match the server-generated IDs
    expect(hydrationErrors).toEqual([]);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="_R_1_">
            <span id="_R_5_">inner</span>
          </div>
          <span id="_R_2_">sibling</span>
        </body>
      </html>,
    );

    root.unmount();
  });
});
