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
} from '../test-utils/FizzTestUtils';

let JSDOM;
let Stream;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMFizzServer;
let Suspense;
let SuspenseList;
let textCache;
let loadCache;
let writable;
let CSPnonce = null;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;
let renderOptions;
let waitForAll;
let assertLog;
let Scheduler;
let clientAct;
let streamingContainer;
let assertConsoleErrorDev;

describe('ReactDOMFloat', () => {
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
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');
    Suspense = React.Suspense;
    SuspenseList = React.unstable_SuspenseList;
    Scheduler = require('scheduler/unstable_mock');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
    clientAct = InternalTestUtils.act;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

    textCache = new Map();
    loadCache = new Set();

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
        'react-dom/unstable_server-external-runtime';
    }
  });

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
    await 0;
    // Let throttled boundaries reveal
    jest.runAllTimers();
  }

  function getMeaningfulChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          // some tags are ambiguous and might be hidden because they look like non-meaningful children
          // so we have a global override where if this data attribute is included we also include the node
          node.hasAttribute('data-meaningful') ||
          (node.tagName === 'SCRIPT' &&
            node.hasAttribute('src') &&
            node.getAttribute('src') !==
              renderOptions.unstable_externalRuntimeSrc &&
            node.hasAttribute('async')) ||
          (node.tagName !== 'SCRIPT' &&
            node.tagName !== 'TEMPLATE' &&
            node.tagName !== 'template' &&
            !node.hasAttribute('hidden') &&
            !node.hasAttribute('aria-hidden') &&
            // Ignore the render blocking expect
            (node.getAttribute('rel') !== 'expect' ||
              node.getAttribute('blocking') !== 'render'))
        ) {
          const props = {};
          const attributes = node.attributes;
          for (let i = 0; i < attributes.length; i++) {
            if (
              attributes[i].name === 'id' &&
              attributes[i].value.includes(':')
            ) {
              // We assume this is a React added ID that's a non-visual implementation detail.
              continue;
            }
            props[attributes[i].name] = attributes[i].value;
          }
          props.children = getMeaningfulChildren(node);
          children.push(React.createElement(node.tagName.toLowerCase(), props));
        }
      } else if (node.nodeType === 3) {
        children.push(node.data);
      }
      node = node.nextSibling;
    }
    return children.length === 0
      ? undefined
      : children.length === 1
        ? children[0]
        : children;
  }

  function BlockedOn({value, children}) {
    readText(value);
    return children;
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

  function AsyncText({text}) {
    return readText(text);
  }

  function renderToPipeableStream(jsx, options) {
    // Merge options with renderOptions, which may contain featureFlag specific behavior
    return ReactDOMFizzServer.renderToPipeableStream(
      jsx,
      mergeOptions(options, renderOptions),
    );
  }

  function loadPreloads(hrefs) {
    const event = new window.Event('load');
    const nodes = document.querySelectorAll('link[rel="preload"]');
    resolveLoadables(hrefs, nodes, event, href =>
      Scheduler.log('load preload: ' + href),
    );
  }

  function errorPreloads(hrefs) {
    const event = new window.Event('error');
    const nodes = document.querySelectorAll('link[rel="preload"]');
    resolveLoadables(hrefs, nodes, event, href =>
      Scheduler.log('error preload: ' + href),
    );
  }

  function loadStylesheets(hrefs) {
    loadStylesheetsFrom(document, hrefs);
  }

  function loadStylesheetsFrom(root, hrefs) {
    const event = new window.Event('load');
    const nodes = root.querySelectorAll('link[rel="stylesheet"]');
    resolveLoadables(hrefs, nodes, event, href => {
      Scheduler.log('load stylesheet: ' + href);
    });
  }

  function errorStylesheets(hrefs) {
    const event = new window.Event('error');
    const nodes = document.querySelectorAll('link[rel="stylesheet"]');
    resolveLoadables(hrefs, nodes, event, href => {
      Scheduler.log('error stylesheet: ' + href);
    });
  }

  function resolveLoadables(hrefs, nodes, event, onLoad) {
    const hrefSet = hrefs ? new Set(hrefs) : null;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (loadCache.has(node)) {
        continue;
      }
      const href = node.getAttribute('href');
      if (!hrefSet || hrefSet.has(href)) {
        loadCache.add(node);
        onLoad(href);
        node.dispatchEvent(event);
      }
    }
  }

  it('can render resources before singletons', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <>
        <title>foo</title>
        <html>
          <head>
            <link rel="foo" href="foo" />
          </head>
          <body>hello world</body>
        </html>
      </>,
    );
    try {
      await waitForAll([]);
    } catch (e) {
      // for DOMExceptions that happen when expecting this test to fail we need
      // to clear the scheduler first otherwise the expected failure will fail
      await waitForAll([]);
      throw e;
    }
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <title>foo</title>
          <link rel="foo" href="foo" />
        </head>
        <body>hello world</body>
      </html>,
    );
  });

  it('can hydrate non Resources in head when Resources are also inserted there', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head>
            <meta property="foo" content="bar" />
            <link rel="foo" href="bar" onLoad={() => {}} />
            <title>foo</title>
            <noscript>
              <link rel="icon" href="icon" />
            </noscript>
            <base target="foo" href="bar" />
            <script async={true} src="foo" onLoad={() => {}} />
          </head>
          <body>foo</body>
        </html>,
      );
      pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta property="foo" content="bar" />
          <title>foo</title>
          <link rel="foo" href="bar" />
          <noscript>&lt;link rel="icon" href="icon"&gt;</noscript>
          <base target="foo" href="bar" />
          <script async="" src="foo" />
        </head>
        <body>foo</body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <head>
          <meta property="foo" content="bar" />
          <link rel="foo" href="bar" onLoad={() => {}} />
          <title>foo</title>
          <noscript>
            <link rel="icon" href="icon" />
          </noscript>
          <base target="foo" href="bar" />
          <script async={true} src="foo" onLoad={() => {}} />
        </head>
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta property="foo" content="bar" />
          <title>foo</title>
          <link rel="foo" href="bar" />
          <noscript>&lt;link rel="icon" href="icon"&gt;</noscript>
          <base target="foo" href="bar" />
          <script async="" src="foo" />
        </head>
        <body>foo</body>
      </html>,
    );
  });

  it('warns if you render resource-like elements above <head> or <body>', async () => {
    const root = ReactDOMClient.createRoot(document);

    root.render(
      <>
        <noscript>foo</noscript>
        <html>
          <body>foo</body>
        </html>
      </>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render <noscript> outside the main document. Try moving it into the root <head> tag.',
    ]);

    root.render(
      <html>
        <template>foo</template>
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render <template> outside the main document. Try moving it into the root <head> tag.\n' +
        '    in html (at **)',
      'In HTML, <template> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n\n' +
        '> <html>\n' +
        '>   <template>\n' +
        '    ...\n' +
        '\n' +
        '    in template (at **)',
    ]);

    root.render(
      <html>
        <body>foo</body>
        <style>foo</style>
      </html>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <style> outside the main document without knowing its precedence ' +
        'and a unique href key. React can hoist and deduplicate <style> tags if you provide a ' +
        '`precedence` prop along with an `href` prop that does not conflict with the `href` ' +
        'values used in any other hoisted <style> or <link rel="stylesheet" ...> tags.  ' +
        'Note that hoisting <style> tags is considered an advanced feature that most will not use directly. ' +
        'Consider moving the <style> tag to the <head> or consider adding a `precedence="default"` ' +
        'and `href="some unique resource identifier"`.\n' +
        '    in html (at **)',
      'In HTML, <style> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n\n' +
        '> <html>\n' +
        '    <body>\n' +
        '>   <style>\n' +
        '\n' +
        '    in style (at **)',
    ]);

    root.render(
      <>
        <html>
          <body>foo</body>
        </html>
        <link rel="stylesheet" href="foo" />
      </>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <link rel="stylesheet" /> outside the main document without knowing its precedence. ' +
        'Consider adding precedence="default" or moving it into the root <head> tag.',
    ]);

    root.render(
      <>
        <html>
          <body>foo</body>
          <script href="foo" />
        </html>
      </>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a sync or defer <script> outside the main document without knowing its order. ' +
        'Try adding async="" or moving it into the root <head> tag.\n' +
        '    in html (at **)',
      'In HTML, <script> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '    <body>\n' +
        '>   <script href="foo">\n' +
        '\n' +
        '    in script (at **)',
      ...(gate('enableTrustedTypesIntegration')
        ? [
            'Encountered a script tag while rendering React component. ' +
              'Scripts inside React components are never executed when rendering on the client. ' +
              'Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).\n' +
              '     in script (at **)',
          ]
        : []),
    ]);

    root.render(
      <html>
        <script async={true} onLoad={() => {}} href="bar" />
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <script> with onLoad or onError listeners outside the main document. ' +
        'Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or ' +
        'somewhere in the <body>.\n' +
        '    in html (at **)',
    ]);

    root.render(
      <>
        <link rel="foo" onLoad={() => {}} href="bar" />
        <html>
          <body>foo</body>
        </html>
      </>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <link> with onLoad or onError listeners outside the main document. ' +
        'Try removing onLoad={...} and onError={...} or moving it into the root <head> tag or ' +
        'somewhere in the <body>.',
    ]);
    return;
  });

  it('can acquire a resource after releasing it in the same commit', async () => {
    const root = ReactDOMClient.createRoot(container);
    root.render(
      <>
        <script async={true} src="foo" />
      </>,
    );
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <script async="" src="foo" />
        </head>
        <body>
          <div id="container" />
        </body>
      </html>,
    );

    root.render(
      <>
        {null}
        <script data-new="new" async={true} src="foo" />
      </>,
    );
    await waitForAll([]);
    // we don't see the attribute because the resource is the same and was not reconstructed
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <script async="" src="foo" />
        </head>
        <body>
          <div id="container" />
        </body>
      </html>,
    );
  });

  it('emits an implicit <head> element to hold resources when none is rendered but an <html> is rendered', async () => {
    const chunks = [];

    writable.on('data', chunk => {
      chunks.push(chunk);
    });

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <>
          <title>foo</title>
          <html>
            <body>bar</body>
          </html>
          <script async={true} src="foo" />
        </>,
      );
      pipe(writable);
    });
    expect(chunks).toEqual([
      '<!DOCTYPE html><html><head><script async="" src="foo"></script>' +
        (gate(flags => flags.shouldUseFizzExternalRuntime)
          ? '<script src="react-dom/unstable_server-external-runtime" async=""></script>'
          : '') +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<link rel="expect" href="#_R_" blocking="render"/>'
          : '') +
        '<title>foo</title></head>' +
        '<body>bar' +
        (gate(flags => flags.enableFizzBlockingRender)
          ? '<template id="_R_"></template>'
          : ''),
      '</body></html>',
    ]);
  });

  it('dedupes if the external runtime is explicitly loaded using preinit', async () => {
    const unstable_externalRuntimeSrc = 'src-of-external-runtime';
    function App() {
      ReactDOM.preinit(unstable_externalRuntimeSrc, {as: 'script'});
      return (
        <div>
          <Suspense fallback={<h1>Loading...</h1>}>
            <AsyncText text="Hello" />
          </Suspense>
        </div>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <App />
          </body>
        </html>,
        {
          unstable_externalRuntimeSrc,
        },
      );
      pipe(writable);
    });

    expect(
      Array.from(document.querySelectorAll('script[async]')).map(
        n => n.outerHTML,
      ),
    ).toEqual(['<script src="src-of-external-runtime" async=""></script>']);
  });

  it('can send style insertion implementation independent of boundary commpletion instruction implementation', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Suspense fallback="loading foo...">
              <BlockedOn value="foo">foo</BlockedOn>
            </Suspense>
            <Suspense fallback="loading bar...">
              <BlockedOn value="bar">
                <link rel="stylesheet" href="bar" precedence="bar" />
                bar
              </BlockedOn>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          {'loading foo...'}
          {'loading bar...'}
        </body>
      </html>,
    );

    await act(() => {
      resolveText('foo');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          foo
          {'loading bar...'}
        </body>
      </html>,
    );
    await act(() => {
      resolveText('bar');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="bar" data-precedence="bar" />
        </head>
        <body>
          foo
          {'loading bar...'}
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );
  });

  it('can avoid inserting a late stylesheet if it already rendered on the client', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Suspense fallback="loading foo...">
              <BlockedOn value="foo">
                <link rel="stylesheet" href="foo" precedence="foo" />
                foo
              </BlockedOn>
            </Suspense>
            <Suspense fallback="loading bar...">
              <BlockedOn value="bar">
                <link rel="stylesheet" href="bar" precedence="bar" />
                bar
              </BlockedOn>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          {'loading foo...'}
          {'loading bar...'}
        </body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <body>
          <link rel="stylesheet" href="foo" precedence="foo" />
          <Suspense fallback="loading foo...">
            <link rel="stylesheet" href="foo" precedence="foo" />
            foo
          </Suspense>
          <Suspense fallback="loading bar...">
            <link rel="stylesheet" href="bar" precedence="bar" />
            bar
          </Suspense>
        </body>
      </html>,
    );
    await waitForAll([]);
    loadPreloads();
    await assertLog(['load preload: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
          <link as="style" href="foo" rel="preload" />
        </head>
        <body>
          {'loading foo...'}
          {'loading bar...'}
        </body>
      </html>,
    );

    await act(() => {
      resolveText('bar');
    });
    await act(() => {
      loadStylesheets();
    });
    await assertLog(['load stylesheet: foo', 'load stylesheet: bar']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
          <link rel="stylesheet" href="bar" data-precedence="bar" />
          <link as="style" href="foo" rel="preload" />
        </head>
        <body>
          {'loading foo...'}
          {'bar'}
          <link as="style" href="bar" rel="preload" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('foo');
    });
    await act(() => {
      loadStylesheets();
    });
    await assertLog([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
          <link rel="stylesheet" href="bar" data-precedence="bar" />
          <link as="style" href="foo" rel="preload" />
        </head>
        <body>
          {'foo'}
          {'bar'}
          <link as="style" href="bar" rel="preload" />
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );
  });

  it('can hoist <link rel="stylesheet" .../> and <style /> tags together, respecting order of discovery', async () => {
    const css = `
body {
  background-color: red;
}`;

    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <link rel="stylesheet" href="one1" precedence="one" />
            <style href="two1" precedence="two">
              {css}
            </style>
            <link rel="stylesheet" href="three1" precedence="three" />
            <style href="four1" precedence="four">
              {css}
            </style>
            <Suspense>
              <BlockedOn value="block">
                <link rel="stylesheet" href="one2" precedence="one" />
                <link rel="stylesheet" href="two2" precedence="two" />
                <style href="three2" precedence="three">
                  {css}
                </style>
                <style href="four2" precedence="four">
                  {css}
                </style>
                <link rel="stylesheet" href="five1" precedence="five" />
              </BlockedOn>
            </Suspense>
            <Suspense>
              <BlockedOn value="block2">
                <style href="one3" precedence="one">
                  {css}
                </style>
                <style href="two3" precedence="two">
                  {css}
                </style>
                <link rel="stylesheet" href="three3" precedence="three" />
                <link rel="stylesheet" href="four3" precedence="four" />
                <style href="six1" precedence="six">
                  {css}
                </style>
              </BlockedOn>
            </Suspense>
            <Suspense>
              <BlockedOn value="block again">
                <link rel="stylesheet" href="one2" precedence="one" />
                <link rel="stylesheet" href="two2" precedence="two" />
                <style href="three2" precedence="three">
                  {css}
                </style>
                <style href="four2" precedence="four">
                  {css}
                </style>
                <link rel="stylesheet" href="five1" precedence="five" />
              </BlockedOn>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="one1" data-precedence="one" />
          <style data-href="two1" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="three1" data-precedence="three" />
          <style data-href="four1" data-precedence="four">
            {css}
          </style>
        </head>
        <body />
      </html>,
    );

    await act(() => {
      resolveText('block');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="one1" data-precedence="one" />
          <link rel="stylesheet" href="one2" data-precedence="one" />
          <style data-href="two1" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="two2" data-precedence="two" />
          <link rel="stylesheet" href="three1" data-precedence="three" />
          <style data-href="three2" data-precedence="three">
            {css}
          </style>
          <style data-href="four1" data-precedence="four">
            {css}
          </style>
          <style data-href="four2" data-precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="five1" data-precedence="five" />
        </head>
        <body>
          <link rel="preload" href="one2" as="style" />
          <link rel="preload" href="two2" as="style" />
          <link rel="preload" href="five1" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('block2');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="one1" data-precedence="one" />
          <link rel="stylesheet" href="one2" data-precedence="one" />
          <style data-href="one3" data-precedence="one">
            {css}
          </style>
          <style data-href="two1" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="two2" data-precedence="two" />
          <style data-href="two3" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="three1" data-precedence="three" />
          <style data-href="three2" data-precedence="three">
            {css}
          </style>
          <link rel="stylesheet" href="three3" data-precedence="three" />
          <style data-href="four1" data-precedence="four">
            {css}
          </style>
          <style data-href="four2" data-precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="four3" data-precedence="four" />
          <link rel="stylesheet" href="five1" data-precedence="five" />
          <style data-href="six1" data-precedence="six">
            {css}
          </style>
        </head>
        <body>
          <link rel="preload" href="one2" as="style" />
          <link rel="preload" href="two2" as="style" />
          <link rel="preload" href="five1" as="style" />
          <link rel="preload" href="three3" as="style" />
          <link rel="preload" href="four3" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('block again');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="one1" data-precedence="one" />
          <link rel="stylesheet" href="one2" data-precedence="one" />
          <style data-href="one3" data-precedence="one">
            {css}
          </style>
          <style data-href="two1" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="two2" data-precedence="two" />
          <style data-href="two3" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="three1" data-precedence="three" />
          <style data-href="three2" data-precedence="three">
            {css}
          </style>
          <link rel="stylesheet" href="three3" data-precedence="three" />
          <style data-href="four1" data-precedence="four">
            {css}
          </style>
          <style data-href="four2" data-precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="four3" data-precedence="four" />
          <link rel="stylesheet" href="five1" data-precedence="five" />
          <style data-href="six1" data-precedence="six">
            {css}
          </style>
        </head>
        <body>
          <link rel="preload" href="one2" as="style" />
          <link rel="preload" href="two2" as="style" />
          <link rel="preload" href="five1" as="style" />
          <link rel="preload" href="three3" as="style" />
          <link rel="preload" href="four3" as="style" />
        </body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <body>
          <link rel="stylesheet" href="one4" precedence="one" />
          <style href="two4" precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="three4" precedence="three" />
          <style href="four4" precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="seven1" precedence="seven" />
          <style href="eight1" precedence="eight">
            {css}
          </style>
        </body>
      </html>,
    );
    await waitForAll([]);
    await act(() => {
      loadPreloads();
      loadStylesheets();
    });
    await assertLog([
      'load preload: one4',
      'load preload: three4',
      'load preload: seven1',
      'load preload: one2',
      'load preload: two2',
      'load preload: five1',
      'load preload: three3',
      'load preload: four3',
      'load stylesheet: one1',
      'load stylesheet: one2',
      'load stylesheet: one4',
      'load stylesheet: two2',
      'load stylesheet: three1',
      'load stylesheet: three3',
      'load stylesheet: three4',
      'load stylesheet: four3',
      'load stylesheet: five1',
      'load stylesheet: seven1',
    ]);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="one1" data-precedence="one" />
          <link rel="stylesheet" href="one2" data-precedence="one" />
          <style data-href="one3" data-precedence="one">
            {css}
          </style>
          <link rel="stylesheet" href="one4" data-precedence="one" />
          <style data-href="two1" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="two2" data-precedence="two" />
          <style data-href="two3" data-precedence="two">
            {css}
          </style>
          <style data-href="two4" data-precedence="two">
            {css}
          </style>
          <link rel="stylesheet" href="three1" data-precedence="three" />
          <style data-href="three2" data-precedence="three">
            {css}
          </style>
          <link rel="stylesheet" href="three3" data-precedence="three" />
          <link rel="stylesheet" href="three4" data-precedence="three" />
          <style data-href="four1" data-precedence="four">
            {css}
          </style>
          <style data-href="four2" data-precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="four3" data-precedence="four" />
          <style data-href="four4" data-precedence="four">
            {css}
          </style>
          <link rel="stylesheet" href="five1" data-precedence="five" />
          <style data-href="six1" data-precedence="six">
            {css}
          </style>
          <link rel="stylesheet" href="seven1" data-precedence="seven" />
          <style data-href="eight1" data-precedence="eight">
            {css}
          </style>
          <link rel="preload" href="one4" as="style" />
          <link rel="preload" href="three4" as="style" />
          <link rel="preload" href="seven1" as="style" />
        </head>
        <body>
          <link rel="preload" href="one2" as="style" />
          <link rel="preload" href="two2" as="style" />
          <link rel="preload" href="five1" as="style" />
          <link rel="preload" href="three3" as="style" />
          <link rel="preload" href="four3" as="style" />
        </body>
      </html>,
    );
  });

  it('client renders a boundary if a style Resource dependency fails to load', async () => {
    function App() {
      return (
        <html>
          <head />
          <body>
            <Suspense fallback="loading...">
              <BlockedOn value="unblock">
                <link rel="stylesheet" href="foo" precedence="arbitrary" />
                <link rel="stylesheet" href="bar" precedence="arbitrary" />
                Hello
              </BlockedOn>
            </Suspense>
          </body>
        </html>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>loading...</body>
      </html>,
    );

    await act(() => {
      resolveText('unblock');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="arbitrary" />
          <link rel="stylesheet" href="bar" data-precedence="arbitrary" />
        </head>
        <body>
          loading...
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );

    errorStylesheets(['bar']);
    assertLog(['error stylesheet: bar']);

    await waitForAll([]);

    const boundaryTemplateInstance = document.getElementById('B:0');
    const suspenseInstance = boundaryTemplateInstance.previousSibling;

    expect(suspenseInstance.data).toEqual('$!');
    expect(boundaryTemplateInstance.dataset.dgst).toBe('CSS failed to load');

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="arbitrary" />
          <link rel="stylesheet" href="bar" data-precedence="arbitrary" />
        </head>
        <body>
          loading...
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );

    const errors = [];
    ReactDOMClient.hydrateRoot(document, <App />, {
      onRecoverableError(err, errInfo) {
        errors.push(err.message);
        errors.push(err.digest);
      },
    });
    await waitForAll([]);
    // When binding a stylesheet that was SSR'd in a boundary reveal there is a loadingState promise
    // We need to use that promise to resolve the suspended commit because we don't know if the load or error
    // events have already fired. This requires the load to be awaited for the commit to have a chance to flush
    // We could change this by tracking the loadingState's fulfilled status directly on the loadingState similar
    // to thenables however this slightly increases the fizz runtime code size.
    await clientAct(() => loadStylesheets());
    assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="arbitrary" />
          <link rel="stylesheet" href="bar" data-precedence="arbitrary" />
        </head>
        <body>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          Hello
        </body>
      </html>,
    );
    expect(errors).toEqual([
      'The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering.',
      'CSS failed to load',
    ]);
  });

  it('treats stylesheet links with a precedence as a resource', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="foo" precedence="arbitrary" />
            Hello
          </body>
        </html>,
      );
      pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="arbitrary" />
        </head>
        <body>Hello</body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <head />
        <body>Hello</body>
      </html>,
    );
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="arbitrary" />
        </head>
        <body>Hello</body>
      </html>,
    );
  });

  it('inserts text separators following text when followed by an element that is converted to a resource and thus removed from the html inline', async () => {
    // If you render many of these as siblings the values get emitted as a single text with no separator sometimes
    // because the link gets elided as a resource
    function AsyncTextWithResource({text, href, precedence}) {
      const value = readText(text);
      return (
        <>
          {value}
          <link rel="stylesheet" href={href} precedence={precedence} />
        </>
      );
    }

    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <AsyncTextWithResource text="foo" href="foo" precedence="one" />
            <AsyncTextWithResource text="bar" href="bar" precedence="two" />
            <AsyncTextWithResource text="baz" href="baz" precedence="three" />
          </body>
        </html>,
      );
      pipe(writable);
      resolveText('foo');
      resolveText('bar');
      resolveText('baz');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="bar" data-precedence="two" />
          <link rel="stylesheet" href="baz" data-precedence="three" />
        </head>
        <body>
          {'foo'}
          {'bar'}
          {'baz'}
        </body>
      </html>,
    );
  });

  it('hoists late stylesheets the correct precedence', async () => {
    function PresetPrecedence() {
      ReactDOM.preinit('preset', {as: 'style', precedence: 'preset'});
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="initial" precedence="one" />
            <PresetPrecedence />
            <div>
              <Suspense fallback="loading foo bar...">
                <div>foo</div>
                <link rel="stylesheet" href="foo" precedence="one" />
                <BlockedOn value="bar">
                  <div>bar</div>
                  <link rel="stylesheet" href="bar" precedence="default" />
                </BlockedOn>
              </Suspense>
            </div>
            <div>
              <Suspense fallback="loading bar baz qux...">
                <BlockedOn value="bar">
                  <div>bar</div>
                  <link rel="stylesheet" href="bar" precedence="default" />
                </BlockedOn>
                <BlockedOn value="baz">
                  <div>baz</div>
                  <link rel="stylesheet" href="baz" precedence="two" />
                </BlockedOn>
                <BlockedOn value="qux">
                  <div>qux</div>
                  <link rel="stylesheet" href="qux" precedence="one" />
                </BlockedOn>
              </Suspense>
            </div>
            <div>
              <Suspense fallback="loading bar baz qux...">
                <BlockedOn value="unblock">
                  <BlockedOn value="bar">
                    <div>bar</div>
                    <link rel="stylesheet" href="bar" precedence="default" />
                  </BlockedOn>
                  <BlockedOn value="baz">
                    <div>baz</div>
                    <link rel="stylesheet" href="baz" precedence="two" />
                  </BlockedOn>
                  <BlockedOn value="qux">
                    <div>qux</div>
                    <link rel="stylesheet" href="qux" precedence="one" />
                  </BlockedOn>
                </BlockedOn>
              </Suspense>
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
        </head>
        <body>
          <div>loading foo bar...</div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('foo');
      resolveText('bar');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
        </head>
        <body>
          <div>loading foo bar...</div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      const link = document.querySelector('link[rel="stylesheet"][href="foo"]');
      const event = document.createEvent('Events');
      event.initEvent('load', true, true);
      link.dispatchEvent(event);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
        </head>
        <body>
          <div>loading foo bar...</div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      const link = document.querySelector('link[rel="stylesheet"][href="bar"]');
      const event = document.createEvent('Events');
      event.initEvent('load', true, true);
      link.dispatchEvent(event);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
          </div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
          <link rel="preload" href="bar" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('baz');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
          </div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
          <link rel="preload" as="style" href="bar" />
          <link rel="preload" as="style" href="baz" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('qux');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="qux" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="two" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
          </div>
          <div>loading bar baz qux...</div>
          <div>loading bar baz qux...</div>
          <link rel="preload" as="style" href="bar" />
          <link rel="preload" as="style" href="baz" />
          <link rel="preload" as="style" href="qux" />
        </body>
      </html>,
    );

    await act(() => {
      const bazlink = document.querySelector(
        'link[rel="stylesheet"][href="baz"]',
      );
      const quxlink = document.querySelector(
        'link[rel="stylesheet"][href="qux"]',
      );
      const presetLink = document.querySelector(
        'link[rel="stylesheet"][href="preset"]',
      );
      const event = document.createEvent('Events');
      event.initEvent('load', true, true);
      bazlink.dispatchEvent(event);
      quxlink.dispatchEvent(event);
      presetLink.dispatchEvent(event);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="qux" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="two" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
          </div>
          <div>
            <div>bar</div>
            <div>baz</div>
            <div>qux</div>
          </div>
          <div>loading bar baz qux...</div>
          <link rel="preload" as="style" href="bar" />
          <link rel="preload" as="style" href="baz" />
          <link rel="preload" as="style" href="qux" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('unblock');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="initial" data-precedence="one" />
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="qux" data-precedence="one" />
          <link rel="stylesheet" href="preset" data-precedence="preset" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="two" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
          </div>
          <div>
            <div>bar</div>
            <div>baz</div>
            <div>qux</div>
          </div>
          <div>
            <div>bar</div>
            <div>baz</div>
            <div>qux</div>
          </div>
          <link rel="preload" as="style" href="bar" />
          <link rel="preload" as="style" href="baz" />
          <link rel="preload" as="style" href="qux" />
        </body>
      </html>,
    );
  });

  it('normalizes stylesheet resource precedence for all boundaries inlined as part of the shell flush', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>
              outer
              <link rel="stylesheet" href="1one" precedence="one" />
              <link rel="stylesheet" href="1two" precedence="two" />
              <link rel="stylesheet" href="1three" precedence="three" />
              <link rel="stylesheet" href="1four" precedence="four" />
              <Suspense fallback={null}>
                <div>
                  middle
                  <link rel="stylesheet" href="2one" precedence="one" />
                  <link rel="stylesheet" href="2two" precedence="two" />
                  <link rel="stylesheet" href="2three" precedence="three" />
                  <link rel="stylesheet" href="2four" precedence="four" />
                  <Suspense fallback={null}>
                    <div>
                      inner
                      <link rel="stylesheet" href="3five" precedence="five" />
                      <link rel="stylesheet" href="3one" precedence="one" />
                      <link rel="stylesheet" href="3two" precedence="two" />
                      <link rel="stylesheet" href="3three" precedence="three" />
                      <link rel="stylesheet" href="3four" precedence="four" />
                    </div>
                  </Suspense>
                </div>
              </Suspense>
              <Suspense fallback={null}>
                <div>middle</div>
                <link rel="stylesheet" href="4one" precedence="one" />
                <link rel="stylesheet" href="4two" precedence="two" />
                <link rel="stylesheet" href="4three" precedence="three" />
                <link rel="stylesheet" href="4four" precedence="four" />
              </Suspense>
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="1one" data-precedence="one" />
          <link rel="stylesheet" href="2one" data-precedence="one" />
          <link rel="stylesheet" href="3one" data-precedence="one" />
          <link rel="stylesheet" href="4one" data-precedence="one" />

          <link rel="stylesheet" href="1two" data-precedence="two" />
          <link rel="stylesheet" href="2two" data-precedence="two" />
          <link rel="stylesheet" href="3two" data-precedence="two" />
          <link rel="stylesheet" href="4two" data-precedence="two" />

          <link rel="stylesheet" href="1three" data-precedence="three" />
          <link rel="stylesheet" href="2three" data-precedence="three" />
          <link rel="stylesheet" href="3three" data-precedence="three" />
          <link rel="stylesheet" href="4three" data-precedence="three" />

          <link rel="stylesheet" href="1four" data-precedence="four" />
          <link rel="stylesheet" href="2four" data-precedence="four" />
          <link rel="stylesheet" href="3four" data-precedence="four" />
          <link rel="stylesheet" href="4four" data-precedence="four" />

          <link rel="stylesheet" href="3five" data-precedence="five" />
        </head>
        <body>
          <div>
            outer
            <div>
              middle<div>inner</div>
            </div>
            <div>middle</div>
          </div>
        </body>
      </html>,
    );
  });

  it('stylesheet resources are inserted according to precedence order on the client', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>
              <link rel="stylesheet" href="foo" precedence="one" />
              <link rel="stylesheet" href="bar" precedence="two" />
              Hello
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="bar" data-precedence="two" />
        </head>
        <body>
          <div>Hello</div>
        </body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(
      document,
      <html>
        <head />
        <body>
          <div>
            <link rel="stylesheet" href="foo" precedence="one" />
            <link rel="stylesheet" href="bar" precedence="two" />
            Hello
          </div>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="bar" data-precedence="two" />
        </head>
        <body>
          <div>Hello</div>
        </body>
      </html>,
    );

    root.render(
      <html>
        <head />
        <body>
          <div>Goodbye</div>
          <link rel="stylesheet" href="baz" precedence="one" />
        </body>
      </html>,
    );
    await waitForAll([]);
    await act(() => {
      loadPreloads();
      loadStylesheets();
    });
    await assertLog([
      'load preload: baz',
      'load stylesheet: foo',
      'load stylesheet: baz',
      'load stylesheet: bar',
    ]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="one" />
          <link rel="stylesheet" href="baz" data-precedence="one" />
          <link rel="stylesheet" href="bar" data-precedence="two" />
          <link rel="preload" as="style" href="baz" />
        </head>
        <body>
          <div>Goodbye</div>
        </body>
      </html>,
    );
  });

  it('inserts preloads in render phase eagerly', async () => {
    function Throw() {
      throw new Error('Uh oh!');
    }
    class ErrorBoundary extends React.Component {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(error) {
        return {
          hasError: true,
          error,
        };
      }
      render() {
        if (this.state.hasError) {
          return this.state.error.message;
        }
        return this.props.children;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    root.render(
      <ErrorBoundary>
        <link rel="stylesheet" href="foo" precedence="default" />
        <div>foo</div>
        <Throw />
      </ErrorBoundary>,
    );
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="style" />
        </head>
        <body>
          <div id="container">Uh oh!</div>
        </body>
      </html>,
    );
  });

  it('will include child boundary stylesheet resources in the boundary reveal instruction', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>
              <Suspense fallback="loading foo...">
                <BlockedOn value="foo">
                  <div>foo</div>
                  <link rel="stylesheet" href="foo" precedence="default" />
                  <Suspense fallback="loading bar...">
                    <BlockedOn value="bar">
                      <div>bar</div>
                      <link rel="stylesheet" href="bar" precedence="default" />
                      <Suspense fallback="loading baz...">
                        <BlockedOn value="baz">
                          <div>baz</div>
                          <link
                            rel="stylesheet"
                            href="baz"
                            precedence="default"
                          />
                        </BlockedOn>
                      </Suspense>
                    </BlockedOn>
                  </Suspense>
                </BlockedOn>
              </Suspense>
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading foo...</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('bar');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading foo...</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('baz');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading foo...</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('foo');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="default" />
        </head>
        <body>
          <div>loading foo...</div>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          <link rel="preload" href="baz" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      const event = document.createEvent('Events');
      event.initEvent('load', true, true);
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(
        el => {
          el.dispatchEvent(event);
        },
      );
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="default" />
        </head>
        <body>
          <div>
            <div>foo</div>
            <div>bar</div>
            <div>baz</div>
          </div>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          <link rel="preload" href="baz" as="style" />
        </body>
      </html>,
    );
  });

  it('will hoist resources of child boundaries emitted as part of a partial boundary to the parent boundary', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>
              <Suspense fallback="loading...">
                <div>
                  <BlockedOn value="foo">
                    <div>foo</div>
                    <link rel="stylesheet" href="foo" precedence="default" />
                    <Suspense fallback="loading bar...">
                      <BlockedOn value="bar">
                        <div>bar</div>
                        <link
                          rel="stylesheet"
                          href="bar"
                          precedence="default"
                        />
                        <Suspense fallback="loading baz...">
                          <div>
                            <BlockedOn value="baz">
                              <div>baz</div>
                              <link
                                rel="stylesheet"
                                href="baz"
                                precedence="default"
                              />
                            </BlockedOn>
                          </div>
                        </Suspense>
                      </BlockedOn>
                    </Suspense>
                  </BlockedOn>
                  <BlockedOn value="qux">
                    <div>qux</div>
                    <link rel="stylesheet" href="qux" precedence="default" />
                  </BlockedOn>
                </div>
              </Suspense>
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );

    // This will enqueue a stylesheet resource in a deep blocked boundary (loading baz...).
    await act(() => {
      resolveText('baz');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );

    // This will enqueue a stylesheet resource in the intermediate blocked boundary (loading bar...).
    await act(() => {
      resolveText('bar');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );

    // This will complete a segment in the top level boundary that is still blocked on another segment.
    // It will flush the completed segment however the inner boundaries should not emit their style dependencies
    // because they are not going to be revealed yet. instead their dependencies are hoisted to the blocked
    // boundary (top level).
    await act(() => {
      resolveText('foo');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading...</div>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          <link rel="preload" href="baz" as="style" />
        </body>
      </html>,
    );

    // This resolves the last blocked segment on the top level boundary so we see all dependencies of the
    // nested boundaries emitted at this level
    await act(() => {
      resolveText('qux');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="default" />
          <link rel="stylesheet" href="qux" data-precedence="default" />
        </head>
        <body>
          <div>loading...</div>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          <link rel="preload" href="baz" as="style" />
          <link rel="preload" href="qux" as="style" />
        </body>
      </html>,
    );

    // We load all stylesheets and confirm the content is revealed
    await act(() => {
      const event = document.createEvent('Events');
      event.initEvent('load', true, true);
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(
        el => {
          el.dispatchEvent(event);
        },
      );
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="baz" data-precedence="default" />
          <link rel="stylesheet" href="qux" data-precedence="default" />
        </head>
        <body>
          <div>
            <div>
              <div>foo</div>
              <div>bar</div>
              <div>
                <div>baz</div>
              </div>
              <div>qux</div>
            </div>
          </div>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
          <link rel="preload" href="baz" as="style" />
          <link rel="preload" href="qux" as="style" />
        </body>
      </html>,
    );
  });

  it('encodes attributes consistently whether resources are flushed in shell or in late boundaries', async () => {
    function App() {
      return (
        <html>
          <head />
          <body>
            <div>
              <link
                // This preload is explicit so it can flush with a lot of potential attrs
                // We will duplicate this as a style that flushes after the shell
                rel="stylesheet"
                href="foo"
                // precedence is not a special attribute for preloads so this will just flush as is
                precedence="default"
                // Some standard link props
                crossOrigin="anonymous"
                media="all"
                integrity="somehash"
                referrerPolicy="origin"
                // data and non starndard attributes that should flush
                data-foo={'"quoted"'}
                nonStandardAttr="attr"
                properlyformattednonstandardattr="attr"
                // attributes that should be filtered out for violating certain rules
                onSomething="this should be removed b/c event handler"
                shouldnotincludefunctions={() => {}}
                norsymbols={Symbol('foo')}
              />
              <Suspense fallback={'loading...'}>
                <BlockedOn value="unblock">
                  <link
                    // This preload is explicit so it can flush with a lot of potential attrs
                    // We will duplicate this as a style that flushes after the shell
                    rel="stylesheet"
                    href="bar"
                    // opt-in property to get this treated as a resource
                    precedence="default"
                    // Some standard link props
                    crossOrigin="anonymous"
                    media="all"
                    integrity="somehash"
                    referrerPolicy="origin"
                    // data and non starndard attributes that should flush
                    data-foo={'"quoted"'}
                    nonStandardAttr="attr"
                    properlyformattednonstandardattr="attr"
                    // attributes that should be filtered out for violating certain rules
                    onSomething="this should be removed b/c event handler"
                    shouldnotincludefunctions={() => {}}
                    norsymbols={Symbol('foo')}
                  />
                </BlockedOn>
              </Suspense>
            </div>
          </body>
        </html>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            href="foo"
            data-precedence="default"
            crossorigin="anonymous"
            media="all"
            integrity="somehash"
            referrerpolicy="origin"
            data-foo={'"quoted"'}
            nonstandardattr="attr"
            properlyformattednonstandardattr="attr"
          />
        </head>
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );
    assertConsoleErrorDev([
      'React does not recognize the `nonStandardAttr` prop on a DOM element. ' +
        'If you intentionally want it to appear in the DOM as a custom attribute, ' +
        'spell it as lowercase `nonstandardattr` instead. If you accidentally passed it from a ' +
        'parent component, remove it from the DOM element.\n' +
        '    in link (at **)\n' +
        '    in App (at **)',
      'Invalid values for props `shouldnotincludefunctions`, `norsymbols` on <link> tag. ' +
        'Either remove them from the element, or pass a string or number value to keep them in the DOM. ' +
        'For details, see https://react.dev/link/attribute-behavior \n' +
        '    in link (at **)\n' +
        '    in App (at **)',
    ]);

    // Now we flush the stylesheet with the boundary
    await act(() => {
      resolveText('unblock');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            href="foo"
            data-precedence="default"
            crossorigin="anonymous"
            media="all"
            integrity="somehash"
            referrerpolicy="origin"
            data-foo={'"quoted"'}
            nonstandardattr="attr"
            properlyformattednonstandardattr="attr"
          />
          <link
            rel="stylesheet"
            href="bar"
            data-precedence="default"
            crossorigin="anonymous"
            media="all"
            integrity="somehash"
            referrerpolicy="origin"
            data-foo={'"quoted"'}
            nonstandardattr="attr"
            properlyformattednonstandardattr="attr"
          />
        </head>
        <body>
          <div>loading...</div>
          <link
            rel="preload"
            as="style"
            href="bar"
            crossorigin="anonymous"
            media="all"
            integrity="somehash"
            referrerpolicy="origin"
          />
        </body>
      </html>,
    );
  });

  it('boundary stylesheet resource dependencies hoist to a parent boundary when flushed inline', async () => {
    await act(() => {
      const {pipe} = renderToPipeableStream(
        <html>
          <head />
          <body>
            <div>
              <Suspense fallback="loading A...">
                <BlockedOn value="unblock">
                  <AsyncText text="A" />
                  <link rel="stylesheet" href="A" precedence="A" />
                  <Suspense fallback="loading AA...">
                    <AsyncText text="AA" />
                    <link rel="stylesheet" href="AA" precedence="AA" />
                    <Suspense fallback="loading AAA...">
                      <AsyncText text="AAA" />
                      <link rel="stylesheet" href="AAA" precedence="AAA" />
                      <Suspense fallback="loading AAAA...">
                        <AsyncText text="AAAA" />
                        <link rel="stylesheet" href="AAAA" precedence="AAAA" />
                      </Suspense>
                    </Suspense>
                  </Suspense>
                </BlockedOn>
              </Suspense>
            </div>
          </body>
        </html>,
      );
      pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading A...</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('unblock');
      resolveText('AAAA');
      resolveText('AA');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading A...</div>
          <link rel="preload" as="style" href="A" />
          <link rel="preload" as="style" href="AA" />
          <link rel="preload" as="style" href="AAA" />
          <link rel="preload" as="style" href="AAAA" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('A');
    });
    await act(() => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const event = document.createEvent('Events');
        event.initEvent('load', true, true);
        l.dispatchEvent(event);
      });
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="A" data-precedence="A" />
          <link rel="stylesheet" href="AA" data-precedence="AA" />
        </head>
        <body>
          <div>
            {'A'}
            {'AA'}
            {'loading AAA...'}
          </div>
          <link rel="preload" as="style" href="A" />
          <link rel="preload" as="style" href="AA" />
          <link rel="preload" as="style" href="AAA" />
          <link rel="preload" as="style" href="AAAA" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('AAA');
    });
    await act(() => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const event = document.createEvent('Events');
        event.initEvent('load', true, true);
        l.dispatchEvent(event);
      });
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="A" data-precedence="A" />
          <link rel="stylesheet" href="AA" data-precedence="AA" />
          <link rel="stylesheet" href="AAA" data-precedence="AAA" />
          <link rel="stylesheet" href="AAAA" data-precedence="AAAA" />
        </head>
        <body>
          <div>
            {'A'}
            {'AA'}
            {'AAA'}
            {'AAAA'}
          </div>
          <link rel="preload" as="style" href="A" />
          <link rel="preload" as="style" href="AA" />
          <link rel="preload" as="style" href="AAA" />
          <link rel="preload" as="style" href="AAAA" />
        </body>
      </html>,
    );
  });

  it('always enforces crossOrigin "anonymous" for font preloads', async () => {
    function App() {
      ReactDOM.preload('foo', {as: 'font', type: 'font/woff2'});
      ReactDOM.preload('bar', {as: 'font', crossOrigin: 'foo'});
      ReactDOM.preload('baz', {as: 'font', crossOrigin: 'use-credentials'});
      ReactDOM.preload('qux', {as: 'font', crossOrigin: 'anonymous'});
      return (
        <html>
          <head />
          <body />
        </html>
      );
    }
    await act(() => {
      const {pipe} = renderToPipeableStream(<App />);
      pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="font"
            href="foo"
            crossorigin=""
            type="font/woff2"
          />
          <link rel="preload" as="font" href="bar" crossorigin="" />
          <link rel="preload" as="font" href="baz" crossorigin="" />
          <link rel="preload" as="font" href="qux" crossorigin="" />
        </head>
        <body />
      </html>,
    );
  });

  it('does not hoist anything with an itemprop prop', async () => {
    function App() {
      return (
        <html>
          <head>
            <meta itemProp="outside" content="unscoped" />
            <link itemProp="link" rel="foo" href="foo" />
            <title itemProp="outside-title">title</title>
            <link
              itemProp="outside-stylesheet"
              rel="stylesheet"
              href="bar"
              precedence="default"
            />
            <style itemProp="outside-style" href="baz" precedence="default">
              outside style
            </style>
            <script itemProp="outside-script" async={true} src="qux" />
          </head>
          <body>
            <div itemScope={true}>
              <div>
                <meta itemProp="inside-meta" content="scoped" />
                <link itemProp="inside-link" rel="foo" href="foo" />
                <title itemProp="inside-title">title</title>
                <link
                  itemProp="inside-stylesheet"
                  rel="stylesheet"
                  href="bar"
                  precedence="default"
                />
                <style itemProp="inside-style" href="baz" precedence="default">
                  inside style
                </style>
                <script itemProp="inside-script" async={true} src="qux" />
              </div>
            </div>
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="outside" content="unscoped" />
          <link itemprop="link" rel="foo" href="foo" />
          <title itemprop="outside-title">title</title>
          <link
            itemprop="outside-stylesheet"
            rel="stylesheet"
            href="bar"
            precedence="default"
          />
          <style itemprop="outside-style" href="baz" precedence="default">
            outside style
          </style>
          <script itemprop="outside-script" async="" src="qux" />
        </head>
        <body>
          <div itemscope="">
            <div>
              <meta itemprop="inside-meta" content="scoped" />
              <link itemprop="inside-link" rel="foo" href="foo" />
              <title itemprop="inside-title">title</title>
              <link
                itemprop="inside-stylesheet"
                rel="stylesheet"
                href="bar"
                precedence="default"
              />
              <style itemprop="inside-style" href="baz" precedence="default">
                inside style
              </style>
              <script itemprop="inside-script" async="" src="qux" />
            </div>
          </div>
        </body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta itemprop="outside" content="unscoped" />
          <link itemprop="link" rel="foo" href="foo" />
          <title itemprop="outside-title">title</title>
          <link
            itemprop="outside-stylesheet"
            rel="stylesheet"
            href="bar"
            precedence="default"
          />
          <style itemprop="outside-style" href="baz" precedence="default">
            outside style
          </style>
          <script itemprop="outside-script" async="" src="qux" />
        </head>
        <body>
          <div itemscope="">
            <div>
              <meta itemprop="inside-meta" content="scoped" />
              <link itemprop="inside-link" rel="foo" href="foo" />
              <title itemprop="inside-title">title</title>
              <link
                itemprop="inside-stylesheet"
                rel="stylesheet"
                href="bar"
                precedence="default"
              />
              <style itemprop="inside-style" href="baz" precedence="default">
                inside style
              </style>
              <script itemprop="inside-script" async="" src="qux" />
            </div>
          </div>
        </body>
      </html>,
    );
  });

  it('warns if you render <meta> tag with itemProp outside <body> or <head>', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <meta itemProp="foo" />
      </html>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <meta> outside the main document if it has an `itemProp` prop. ' +
        '`itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. ' +
        'If you were intending for React to hoist this <meta> remove the `itemProp` prop. ' +
        'Otherwise, try moving this tag into the <head> or <body> of the Document.\n' +
        '    in html (at **)',
      'In HTML, <meta> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '>   <meta itemProp="foo">' +
        '\n' +
        '\n    in meta (at **)',
    ]);
  });

  it('warns if you render a <title> tag with itemProp outside <body> or <head>', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <title itemProp="foo">title</title>
      </html>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <title> outside the main document if it has an `itemProp` prop. ' +
        '`itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. ' +
        'If you were intending for React to hoist this <title> remove the `itemProp` prop. ' +
        'Otherwise, try moving this tag into the <head> or <body> of the Document.\n' +
        '    in html (at **)',
      'In HTML, <title> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '>   <title itemProp="foo">' +
        '\n' +
        '\n    in title (at **)',
    ]);
  });

  it('warns if you render a <style> tag with itemProp outside <body> or <head>', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <style itemProp="foo">style</style>
      </html>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <style> outside the main document if it has an `itemProp` prop. ' +
        '`itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. ' +
        'If you were intending for React to hoist this <style> remove the `itemProp` prop. ' +
        'Otherwise, try moving this tag into the <head> or <body> of the Document.\n' +
        '    in html (at **)',
      'In HTML, <style> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '>   <style itemProp="foo">' +
        '\n' +
        '\n    in style (at **)',
    ]);
  });

  it('warns if you render a <link> tag with itemProp outside <body> or <head>', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <link itemProp="foo" />
      </html>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <link> outside the main document if it has an `itemProp` prop. ' +
        '`itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. ' +
        'If you were intending for React to hoist this <link> remove the `itemProp` prop. ' +
        'Otherwise, try moving this tag into the <head> or <body> of the Document.\n' +
        '    in html (at **)',
      'In HTML, <link> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '>   <link itemProp="foo">\n' +
        '\n' +
        '    in link (at **)',
    ]);
  });

  it('warns if you render a <script> tag with itemProp outside <body> or <head>', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <script itemProp="foo" />
      </html>,
    );

    await waitForAll([]);
    assertConsoleErrorDev([
      'Cannot render a <script> outside the main document if it has an `itemProp` prop. ' +
        '`itemProp` suggests the tag belongs to an `itemScope` which can appear anywhere in the DOM. ' +
        'If you were intending for React to hoist this <script> remove the `itemProp` prop. ' +
        'Otherwise, try moving this tag into the <head> or <body> of the Document.\n' +
        '    in html (at **)',
      'In HTML, <script> cannot be a child of <html>.\n' +
        'This will cause a hydration error.\n' +
        '\n' +
        '> <html>\n' +
        '>   <script itemProp="foo">\n' +
        '\n' +
        '    in script (at **)',
      ...(gate('enableTrustedTypesIntegration')
        ? [
            'Encountered a script tag while rendering React component. ' +
              'Scripts inside React components are never executed when rendering on the client. ' +
              'Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).\n' +
              '     in script (at **)',
          ]
        : []),
    ]);
  });

  it('can hydrate resources and components in the head and body even if a browser or 3rd party script injects extra html nodes', async () => {
    // This is a stress test case for hydrating a complex combination of hoistable elements, hoistable resources and host components
    // in an environment that has been manipulated by 3rd party scripts/extensions to modify the <head> and <body>
    function App() {
      return (
        <>
          <link rel="foo" href="foo" />
          <script async={true} src="rendered" />
          <link rel="stylesheet" href="stylesheet" precedence="default" />
          <html itemScope={true}>
            <head>
              {/* Component */}
              <link rel="stylesheet" href="stylesheet" />
              <script src="sync rendered" data-meaningful="" />
              <style>{'body { background-color: red; }'}</style>
              <script src="async rendered" async={true} onLoad={() => {}} />
              <noscript>
                <meta name="noscript" content="noscript" />
              </noscript>
              <link rel="foo" href="foo" onLoad={() => {}} />
            </head>
            <body>
              {/* Component because it has itemProp */}
              <meta name="foo" content="foo" itemProp="a prop" />
              {/* regular Hoistable */}
              <meta name="foo" content="foo" />
              {/* regular Hoistable */}
              <title>title</title>
              <div itemScope={true}>
                <div>
                  <div>deep hello</div>
                  {/* Component because it has itemProp */}
                  <meta name="foo" content="foo" itemProp="a prop" />
                </div>
              </div>
            </body>
          </html>
          <link rel="foo" href="foo" />
        </>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html itemscope="">
        <head>
          {/* Hoisted Resources and elements */}
          <link rel="stylesheet" href="stylesheet" data-precedence="default" />
          <script async="" src="rendered" />
          <link rel="foo" href="foo" />
          <meta name="foo" content="foo" />
          <title>title</title>
          <link rel="foo" href="foo" />
          {/* rendered host components */}
          <link rel="stylesheet" href="stylesheet" />
          <script src="sync rendered" data-meaningful="" />
          <style>{'body { background-color: red; }'}</style>
          <script src="async rendered" async="" />
          <noscript>&lt;meta name="noscript" content="noscript"&gt;</noscript>
          <link rel="foo" href="foo" />
        </head>
        <body>
          <meta name="foo" content="foo" itemprop="a prop" />
          <div itemscope="">
            <div>
              <div>deep hello</div>
              <meta name="foo" content="foo" itemprop="a prop" />
            </div>
          </div>
        </body>
      </html>,
    );

    // We inject some styles, divs, scripts into the begginning, middle, and end
    // of the head / body.
    const injectedStyle = document.createElement('style');
    injectedStyle.textContent = 'body { background-color: blue; }';
    document.head.prepend(injectedStyle.cloneNode(true));
    document.head.appendChild(injectedStyle.cloneNode(true));
    document.body.prepend(injectedStyle.cloneNode(true));
    document.body.appendChild(injectedStyle.cloneNode(true));

    const injectedDiv = document.createElement('div');
    document.head.prepend(injectedDiv);
    document.head.appendChild(injectedDiv.cloneNode(true));
    // We do not prepend a <div> in body because this will conflict with hyration
    // We still mostly hydrate by matchign tag and <div> does not have any attributes to
    // differentiate between likely-inject and likely-rendered cases. If a <div> is prepended
    // in the <body> and you render a <div> as the first child of <body> there will be a conflict.
    // We consider this a rare edge case and even if it does happen the fallback to client rendering
    // should patch up the DOM correctly
    document.body.appendChild(injectedDiv.cloneNode(true));

    const injectedScript = document.createElement('script');
    injectedScript.setAttribute('async', '');
    injectedScript.setAttribute('src', 'injected');
    document.head.prepend(injectedScript);
    document.head.appendChild(injectedScript.cloneNode(true));
    document.body.prepend(injectedScript.cloneNode(true));
    document.body.appendChild(injectedScript.cloneNode(true));

    // We hydrate the same App and confirm the output is identical except for the async
    // script insertion that happens because we do not SSR async scripts with load handlers.
    // All the extra inject nodes are preset
    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html itemscope="">
        <head>
          <script async="" src="injected" />
          <div />
          <style>{'body { background-color: blue; }'}</style>
          <link rel="stylesheet" href="stylesheet" data-precedence="default" />
          <script async="" src="rendered" />
          <link rel="foo" href="foo" />
          <meta name="foo" content="foo" />
          <title>title</title>
          <link rel="foo" href="foo" />
          <link rel="stylesheet" href="stylesheet" />
          <script src="sync rendered" data-meaningful="" />
          <style>{'body { background-color: red; }'}</style>
          <script src="async rendered" async="" />
          <noscript>&lt;meta name="noscript" content="noscript"&gt;</noscript>
          <link rel="foo" href="foo" />
          <style>{'body { background-color: blue; }'}</style>
          <div />
          <script async="" src="injected" />
        </head>
        <body>
          <script async="" src="injected" />
          <style>{'body { background-color: blue; }'}</style>
          <meta name="foo" content="foo" itemprop="a prop" />
          <div itemscope="">
            <div>
              <div>deep hello</div>
              <meta name="foo" content="foo" itemprop="a prop" />
            </div>
          </div>
          <style>{'body { background-color: blue; }'}</style>
          <div />
          <script async="" src="injected" />
        </body>
      </html>,
    );

    // We unmount. The nodes that remain are
    // 1. Hoisted resources (we don't clean these up on unmount to address races with streaming suspense and navigation)
    // 2. preloads that are injected to hint the browser to load a resource but are not associated to Fibers directly
    // 3. Nodes that React skipped over during hydration
    root.unmount();
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <script async="" src="injected" />
          <div />
          <style>{'body { background-color: blue; }'}</style>
          <link rel="stylesheet" href="stylesheet" data-precedence="default" />
          <script async="" src="rendered" />
          <style>{'body { background-color: blue; }'}</style>
          <div />
          <script async="" src="injected" />
        </head>
        <body>
          <script async="" src="injected" />
          <style>{'body { background-color: blue; }'}</style>
          <style>{'body { background-color: blue; }'}</style>
          <div />
          <script async="" src="injected" />
        </body>
      </html>,
    );
  });

  it('does not preload nomodule scripts', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <script src="foo" noModule={true} data-meaningful="" />
            <script async={true} src="bar" noModule={true} data-meaningful="" />
          </body>
        </html>,
      ).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <script async="" src="bar" nomodule="" data-meaningful="" />
        </head>
        <body>
          <script src="foo" nomodule="" data-meaningful="" />
        </body>
      </html>,
    );
  });

  it('can delay commit until css resources load', async () => {
    const root = ReactDOMClient.createRoot(container);
    expect(getMeaningfulChildren(container)).toBe(undefined);
    React.startTransition(() => {
      root.render(
        <>
          <link rel="stylesheet" href="foo" precedence="default" />
          <div>hello</div>
        </>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(container)).toBe(undefined);
    expect(getMeaningfulChildren(document.head)).toEqual(
      <link rel="preload" as="style" href="foo" />,
    );

    loadPreloads();
    assertLog(['load preload: foo']);

    // We expect that the stylesheet is inserted now but the commit has not happened yet.
    expect(getMeaningfulChildren(container)).toBe(undefined);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="foo" data-precedence="default" />,
      <link rel="preload" as="style" href="foo" />,
    ]);

    loadStylesheets();
    assertLog(['load stylesheet: foo']);

    // We expect that the commit finishes synchronously after the stylesheet loads.
    expect(getMeaningfulChildren(container)).toEqual(<div>hello</div>);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="foo" data-precedence="default" />,
      <link rel="preload" as="style" href="foo" />,
    ]);
  });

  // https://github.com/facebook/react/issues/27585
  it('does not reinsert already inserted stylesheets during a delayed commit', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <link rel="stylesheet" href="first" precedence="default" />
            <link rel="stylesheet" href="second" precedence="default" />
            server
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="first" data-precedence="default" />
          <link rel="stylesheet" href="second" data-precedence="default" />
        </head>
        <body>server</body>
      </html>,
    );

    const root = ReactDOMClient.createRoot(document.body);
    expect(getMeaningfulChildren(container)).toBe(undefined);
    root.render(
      <>
        <link rel="stylesheet" href="first" precedence="default" />
        <link rel="stylesheet" href="third" precedence="default" />
        <div>client</div>
      </>,
    );
    await waitForAll([]);
    await act(() => {
      loadPreloads();
      loadStylesheets();
    });
    await assertLog([
      'load preload: third',
      'load stylesheet: first',
      'load stylesheet: second',
      'load stylesheet: third',
    ]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="first" data-precedence="default" />
          <link rel="stylesheet" href="second" data-precedence="default" />
          <link rel="stylesheet" href="third" data-precedence="default" />
          <link rel="preload" href="third" as="style" />
        </head>
        <body>
          <div>client</div>
        </body>
      </html>,
    );

    // In a transition we add another reference to an already loaded resource
    // https://github.com/facebook/react/issues/27585
    React.startTransition(() => {
      root.render(
        <>
          <link rel="stylesheet" href="first" precedence="default" />
          <link rel="stylesheet" href="third" precedence="default" />
          <div>client</div>
          <link rel="stylesheet" href="first" precedence="default" />
        </>,
      );
    });
    await waitForAll([]);
    // In https://github.com/facebook/react/issues/27585 the order updated
    // to second, third, first
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="first" data-precedence="default" />
          <link rel="stylesheet" href="second" data-precedence="default" />
          <link rel="stylesheet" href="third" data-precedence="default" />
          <link rel="preload" href="third" as="style" />
        </head>
        <body>
          <div>client</div>
        </body>
      </html>,
    );
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can delay commit until css resources error', async () => {
    // TODO: This test fails and crashes jest. need to figure out why before unskipping.
    const root = ReactDOMClient.createRoot(container);
    expect(getMeaningfulChildren(container)).toBe(undefined);
    React.startTransition(() => {
      root.render(
        <>
          <link rel="stylesheet" href="foo" precedence="default" />
          <link rel="stylesheet" href="bar" precedence="default" />
          <div>hello</div>
        </>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(container)).toBe(undefined);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="preload" as="style" href="foo" />,
      <link rel="preload" as="style" href="bar" />,
    ]);

    loadPreloads(['foo']);
    errorPreloads(['bar']);
    assertLog(['load preload: foo', 'error preload: bar']);

    // We expect that the stylesheet is inserted now but the commit has not happened yet.
    expect(getMeaningfulChildren(container)).toBe(undefined);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="foo" data-precedence="default" />,
      <link rel="stylesheet" href="bar" data-precedence="default" />,
      <link rel="preload" as="style" href="foo" />,
      <link rel="preload" as="style" href="bar" />,
    ]);

    errorStylesheets(['bar']);

    loadStylesheets(['foo']);
    assertLog(['load stylesheet: foo', 'error stylesheet: bar']);

    // We expect that the commit finishes synchronously after the stylesheet loads.
    expect(getMeaningfulChildren(container)).toEqual(<div>hello</div>);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="foo" data-precedence="default" />,
      <link rel="stylesheet" href="bar" data-precedence="default" />,
      <link rel="preload" as="style" href="foo" />,
      <link rel="preload" as="style" href="bar" />,
    ]);
  });

  it('assumes stylesheets that load in the shell loaded already', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <link rel="stylesheet" href="foo" precedence="default" />
            hello
          </body>
        </html>,
      ).pipe(writable);
    });

    let root;
    React.startTransition(() => {
      root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <link rel="stylesheet" href="foo" precedence="default" />
            hello
          </body>
        </html>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>hello</body>
      </html>,
    );

    React.startTransition(() => {
      root.render(
        <html>
          <body>
            <link rel="stylesheet" href="foo" precedence="default" />
            hello2
          </body>
        </html>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>hello2</body>
      </html>,
    );

    React.startTransition(() => {
      root.render(
        <html>
          <body>
            <link rel="stylesheet" href="foo" precedence="default" />
            hello3
            <link rel="stylesheet" href="bar" precedence="default" />
          </body>
        </html>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello2</body>
      </html>,
    );

    loadPreloads();
    assertLog(['load preload: bar']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello2</body>
      </html>,
    );

    loadStylesheets(['bar']);
    assertLog(['load stylesheet: bar']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello3</body>
      </html>,
    );
  });

  it('can interrupt a suspended commit with a new update', async () => {
    function App({children}) {
      return (
        <html>
          <body>{children}</body>
        </html>
      );
    }
    const root = ReactDOMClient.createRoot(document);

    // Do an initial render. This means subsequent insertions will suspend,
    // unless they are wrapped inside a fresh Suspense boundary.
    root.render(<App />);
    await waitForAll([]);

    // Insert a stylesheet. This will suspend because it's a transition.
    React.startTransition(() => {
      root.render(
        <App>
          hello
          <link rel="stylesheet" href="foo" precedence="default" />
        </App>,
      );
    });
    await waitForAll([]);
    // Although the commit suspended, a preload was inserted.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="style" />
        </head>
        <body />
      </html>,
    );

    // Before the stylesheet has loaded, do an urgent update. This will insert a
    // different stylesheet, and cancel the first one. This stylesheet will not
    // suspend, even though it hasn't loaded, because it's an urgent update.
    root.render(
      <App>
        hello2
        {null}
        <link rel="stylesheet" href="bar" precedence="default" />
      </App>,
    );
    await waitForAll([]);
    await act(() => {
      loadPreloads(['bar']);
      loadStylesheets(['bar']);
    });
    await assertLog(['load preload: bar', 'load stylesheet: bar']);

    // The bar stylesheet was inserted. There's still a "foo" preload, even
    // though that update was superseded.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello2</body>
      </html>,
    );

    // When "foo" finishes loading, nothing happens, because "foo" was not
    // included in the last root update. However, if we insert "foo" again
    // later, it should immediately commit without suspending, because it's
    // been preloaded.
    loadPreloads(['foo']);
    assertLog(['load preload: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello2</body>
      </html>,
    );

    // Now insert "foo" again.
    React.startTransition(() => {
      root.render(
        <App>
          hello3
          <link rel="stylesheet" href="foo" precedence="default" />
          <link rel="stylesheet" href="bar" precedence="default" />
        </App>,
      );
    });
    await waitForAll([]);
    // Commits without suspending because "foo" was preloaded.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello3</body>
      </html>,
    );

    loadStylesheets(['foo']);
    assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>hello3</body>
      </html>,
    );
  });

  it('will put a Suspense boundary into fallback if it contains a stylesheet not loaded during a sync update', async () => {
    function App({children}) {
      return (
        <html>
          <body>{children}</body>
        </html>
      );
    }
    const root = ReactDOMClient.createRoot(document);

    await clientAct(() => {
      root.render(<App />);
    });
    await waitForAll([]);

    await clientAct(() => {
      root.render(
        <App>
          <Suspense fallback="loading...">
            <div>
              hello
              <link rel="stylesheet" href="foo" precedence="default" />
            </div>
          </Suspense>
        </App>,
      );
    });
    await waitForAll([]);

    if (gate(flags => flags.alwaysThrottleRetries)) {
      // Although the commit suspended, a preload was inserted.
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preload" href="foo" as="style" />
          </head>
          <body>loading...</body>
        </html>,
      );

      loadPreloads(['foo']);
      assertLog(['load preload: foo']);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="preload" href="foo" as="style" />
          </head>
          <body>loading...</body>
        </html>,
      );
    }

    loadStylesheets(['foo']);
    assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
        </head>
        <body>
          <div>hello</div>
        </body>
      </html>,
    );

    await clientAct(() => {
      root.render(
        <App>
          <Suspense fallback="loading...">
            <div>
              hello
              <link rel="stylesheet" href="foo" precedence="default" />
              <link rel="stylesheet" href="bar" precedence="default" />
            </div>
          </Suspense>
        </App>,
      );
    });
    await waitForAll([]);
    if (gate(flags => flags.alwaysThrottleRetries)) {
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="preload" href="foo" as="style" />
            <link rel="preload" href="bar" as="style" />
          </head>
          <body>
            <div style="display: none;">hello</div>loading...
          </body>
        </html>,
      );

      loadPreloads(['bar']);
      assertLog(['load preload: bar']);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="stylesheet" href="bar" data-precedence="default" />
            <link rel="preload" href="foo" as="style" />
            <link rel="preload" href="bar" as="style" />
          </head>
          <body>
            <div style="display: none;">hello</div>loading...
          </body>
        </html>,
      );
    }
    loadStylesheets(['bar']);
    assertLog(['load stylesheet: bar']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="bar" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="bar" as="style" />
        </head>
        <body>
          <div style="">hello</div>
        </body>
      </html>,
    );
  });

  it('will assume stylesheets already in the document have loaded if it cannot confirm it is not yet loaded', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
          </head>
          <body>
            <div id="foo" />
          </body>
        </html>,
      ).pipe(writable);
    });

    const root = ReactDOMClient.createRoot(document.querySelector('#foo'));

    root.render(
      <div>
        <Suspense fallback="loading...">
          <link rel="stylesheet" href="foo" precedence="default" />
          hello world
        </Suspense>
      </div>,
    );

    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>
          <div id="foo">
            <div>hello world</div>
          </div>
        </body>
      </html>,
    );
  });

  it('will assume wait for loading stylesheets to load before continuing', async () => {
    let ssr = true;
    function Component() {
      if (ssr) {
        return null;
      } else {
        return (
          <>
            <link rel="stylesheet" href="foo" precedence="default" />
            <div>hello client</div>
          </>
        );
      }
    }

    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <div>
              <Suspense fallback="loading...">
                <BlockedOn value="reveal">
                  <link rel="stylesheet" href="foo" precedence="default" />
                  <div>hello world</div>
                </BlockedOn>
              </Suspense>
            </div>
            <div>
              <Suspense fallback="loading 2...">
                <Component />
              </Suspense>
            </div>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>loading...</div>
          <div />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('reveal');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>
          <div>loading...</div>
          <div />
          <link rel="preload" href="foo" as="style" />
        </body>
      </html>,
    );

    ssr = false;

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <body>
          <div>
            <Suspense fallback="loading...">
              <BlockedOn value="reveal">
                <link rel="stylesheet" href="foo" precedence="default" />
                <div>hello world</div>
              </BlockedOn>
            </Suspense>
          </div>
          <div>
            <Suspense fallback="loading 2...">
              <Component />
            </Suspense>
          </div>
        </body>
      </html>,
    );
    await waitForAll([]);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>
          <div>loading...</div>
          <div />
          <link rel="preload" href="foo" as="style" />
        </body>
      </html>,
    );

    loadStylesheets();
    assertLog(['load stylesheet: foo']);
    await waitForAll([]);
    assertConsoleErrorDev([
      "Error: Hydration failed because the server rendered HTML didn't match the client. " +
        'As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:\n\n' +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\n' +
        'It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.\n\n' +
        'https://react.dev/link/hydration-mismatch\n\n' +
        '  <html>\n' +
        '    <body>\n' +
        '      <div>\n' +
        '      <div>\n' +
        '        <Suspense fallback="loading 2...">\n' +
        '          <Component>\n' +
        '            <link>\n' +
        '+           <div>' +
        '\n    in <stack>',
    ]);
    jest.runAllTimers();

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
        </head>
        <body>
          <div>
            <div>hello world</div>
          </div>
          <div>
            <div>hello client</div>
          </div>
          <link rel="preload" href="foo" as="style" />
        </body>
      </html>,
    );
  });

  it('does not suspend a transition on a stylesheet whose preload has already loaded', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <body>
          <Suspense fallback="loading...">initial</Suspense>
        </body>
      </html>,
    );
    await waitForAll([]);

    ReactDOM.preload('route.css', {as: 'style'});
    expect(getMeaningfulChildren(document.head)).toEqual(
      <link rel="preload" href="route.css" as="style" />,
    );
    expect(getMeaningfulChildren(document.body)).toEqual('initial');

    loadPreloads(['route.css']);
    assertLog(['load preload: route.css']);

    React.startTransition(() => {
      root.render(
        <html>
          <body>
            <Suspense fallback="loading...">
              <link rel="stylesheet" href="route.css" precedence="default" />
              next
            </Suspense>
          </body>
        </html>,
      );
    });
    await waitForAll([]);

    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="route.css" data-precedence="default" />,
      <link rel="preload" href="route.css" as="style" />,
    ]);
    expect(getMeaningfulChildren(document.body)).toEqual('next');

    loadStylesheets(['route.css']);
    assertLog(['load stylesheet: route.css']);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="route.css" data-precedence="default" />,
      <link rel="preload" href="route.css" as="style" />,
    ]);
    expect(getMeaningfulChildren(document.body)).toEqual('next');
  });

  it('suspends a transition on a stylesheet whose preload has not loaded yet', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <body>
          <Suspense fallback="loading...">initial</Suspense>
        </body>
      </html>,
    );
    await waitForAll([]);

    ReactDOM.preload('route.css', {as: 'style'});
    expect(getMeaningfulChildren(document.head)).toEqual(
      <link rel="preload" href="route.css" as="style" />,
    );
    expect(getMeaningfulChildren(document.body)).toEqual('initial');

    React.startTransition(() => {
      root.render(
        <html>
          <body>
            <Suspense fallback="loading...">
              <link rel="stylesheet" href="route.css" precedence="default" />
              next
            </Suspense>
          </body>
        </html>,
      );
    });
    await waitForAll([]);

    expect(getMeaningfulChildren(document.head)).toEqual(
      <link rel="preload" href="route.css" as="style" />,
    );
    expect(getMeaningfulChildren(document.body)).toEqual('initial');

    loadPreloads(['route.css']);
    assertLog(['load preload: route.css']);
    await waitForAll([]);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="route.css" data-precedence="default" />,
      <link rel="preload" href="route.css" as="style" />,
    ]);
    expect(getMeaningfulChildren(document.body)).toEqual('initial');

    loadStylesheets(['route.css']);
    assertLog(['load stylesheet: route.css']);
    await waitForAll([]);
    expect(getMeaningfulChildren(document.head)).toEqual([
      <link rel="stylesheet" href="route.css" data-precedence="default" />,
      <link rel="preload" href="route.css" as="style" />,
    ]);
    expect(getMeaningfulChildren(document.body)).toEqual('next');
  });

  it('can suspend commits on more than one root for the same resource at the same time', async () => {
    document.body.innerHTML = '';
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    const root1 = ReactDOMClient.createRoot(container1);
    const root2 = ReactDOMClient.createRoot(container2);

    React.startTransition(() => {
      root1.render(
        <div>
          one
          <link rel="stylesheet" href="foo" precedence="default" />
          <link rel="stylesheet" href="one" precedence="default" />
        </div>,
      );
    });
    await waitForAll([]);
    React.startTransition(() => {
      root2.render(
        <div>
          two
          <link rel="stylesheet" href="foo" precedence="default" />
          <link rel="stylesheet" href="two" precedence="default" />
        </div>,
      );
    });
    await waitForAll([]);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="one" as="style" />
          <link rel="preload" href="two" as="style" />
        </head>
        <body>
          <div />
          <div />
        </body>
      </html>,
    );

    loadPreloads(['foo', 'two']);
    assertLog(['load preload: foo', 'load preload: two']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="two" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="one" as="style" />
          <link rel="preload" href="two" as="style" />
        </head>
        <body>
          <div />
          <div />
        </body>
      </html>,
    );

    loadStylesheets(['foo', 'two']);
    assertLog(['load stylesheet: foo', 'load stylesheet: two']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="two" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="one" as="style" />
          <link rel="preload" href="two" as="style" />
        </head>
        <body>
          <div />
          <div>
            <div>two</div>
          </div>
        </body>
      </html>,
    );

    loadPreloads();
    loadStylesheets();
    assertLog(['load preload: one', 'load stylesheet: one']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="stylesheet" href="two" data-precedence="default" />
          <link rel="stylesheet" href="one" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
          <link rel="preload" href="one" as="style" />
          <link rel="preload" href="two" as="style" />
        </head>
        <body>
          <div>
            <div>one</div>
          </div>
          <div>
            <div>two</div>
          </div>
        </body>
      </html>,
    );
  });

  it('stylesheets block render, with a really long timeout', async () => {
    function App({children}) {
      return (
        <html>
          <body>{children}</body>
        </html>
      );
    }
    const root = ReactDOMClient.createRoot(document);
    root.render(<App />);
    React.startTransition(() => {
      root.render(
        <App>
          hello
          <link rel="stylesheet" href="foo" precedence="default" />
        </App>,
      );
    });
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="style" />
        </head>
        <body />
      </html>,
    );

    // Advance time by 50 seconds. Even still, the transition is suspended.
    jest.advanceTimersByTime(50000);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="style" />
        </head>
        <body />
      </html>,
    );

    // Advance time by 10 seconds more. A full minute total has elapsed. At this
    // point, something must have really gone wrong, so we time out and allow
    // unstyled content to be displayed.
    jest.advanceTimersByTime(10000);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
        </head>
        <body>hello</body>
      </html>,
    );

    // We will load these after the commit finishes to ensure nothing errors and nothing new inserts
    loadPreloads(['foo']);
    loadStylesheets(['foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" href="foo" as="style" />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  it('can interrupt a suspended commit with a new transition', async () => {
    function App({children}) {
      return (
        <html>
          <body>{children}</body>
        </html>
      );
    }
    const root = ReactDOMClient.createRoot(document);
    root.render(<App>(empty)</App>);

    // Start a transition to "A"
    React.startTransition(() => {
      root.render(
        <App>
          A
          <link rel="stylesheet" href="A" precedence="default" />
        </App>,
      );
    });
    await waitForAll([]);

    // "A" hasn't loaded yet, so we remain on the initial UI. Its preload
    // has been inserted into the head, though.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="A" as="style" />
        </head>
        <body>(empty)</body>
      </html>,
    );

    // Interrupt the "A" transition with a new one, "B"
    React.startTransition(() => {
      root.render(
        <App>
          B
          <link rel="stylesheet" href="B" precedence="default" />
        </App>,
      );
    });
    await waitForAll([]);

    // Still on the initial UI because "B" hasn't loaded, but its preload
    // is now in the head, too.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="A" as="style" />
          <link rel="preload" href="B" as="style" />
        </head>
        <body>(empty)</body>
      </html>,
    );

    // Finish loading
    loadPreloads();
    loadStylesheets();
    assertLog(['load preload: A', 'load preload: B', 'load stylesheet: B']);
    // The "B" transition has finished.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="B" data-precedence="default" />
          <link rel="preload" href="A" as="style" />
          <link rel="preload" href="B" as="style" />
        </head>
        <body>B</body>
      </html>,
    );
  });

  it('loading a stylesheet as part of an error boundary UI, during initial render', async () => {
    class ErrorBoundary extends React.Component {
      state = {error: null};
      static getDerivedStateFromError(error) {
        return {error};
      }
      render() {
        const error = this.state.error;
        if (error !== null) {
          return (
            <>
              <link rel="stylesheet" href="A" precedence="default" />
              {error.message}
            </>
          );
        }
        return this.props.children;
      }
    }

    function Throws() {
      throw new Error('Oops!');
    }

    function App() {
      return (
        <html>
          <body>
            <ErrorBoundary>
              <Suspense fallback="Loading...">
                <Throws />
              </Suspense>
            </ErrorBoundary>
          </body>
        </html>
      );
    }

    // Initial server render. Because something threw, a Suspense fallback
    // is shown.
    await act(() => {
      renderToPipeableStream(<App />, {
        onError(x) {
          Scheduler.log('Caught server error: ' + x.message);
        },
      }).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>Loading...</body>
      </html>,
    );
    assertLog(['Caught server error: Oops!']);

    // Hydrate the tree. The error boundary will capture the error and attempt
    // to show an error screen. However, the error screen includes a stylesheet,
    // so the commit should suspend until the stylesheet loads.
    ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);

    // A preload for the stylesheet is inserted, but we still haven't committed
    // the error screen.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link as="style" href="A" rel="preload" />
        </head>
        <body>Loading...</body>
      </html>,
    );

    // Finish loading the stylesheets. The commit should be unblocked, and the
    // error screen should appear.
    await clientAct(() => loadStylesheets());
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link data-precedence="default" href="A" rel="stylesheet" />
          <link as="style" href="A" rel="preload" />
        </head>
        <body>Oops!</body>
      </html>,
    );
  });

  it('will not flush a preload for a new rendered Stylesheet Resource if one was already flushed', async () => {
    function Component() {
      ReactDOM.preload('foo', {as: 'style'});
      return (
        <div>
          <Suspense fallback="loading...">
            <BlockedOn value="blocked">
              <link rel="stylesheet" href="foo" precedence="default" />
              hello
            </BlockedOn>
          </Suspense>
        </div>
      );
    }
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Component />
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="style" href="foo" />
        </head>
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );
    await act(() => {
      resolveText('blocked');
    });
    await act(loadStylesheets);
    assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <link rel="preload" as="style" href="foo" />
        </head>
        <body>
          <div>hello</div>
        </body>
      </html>,
    );
  });

  it('will not flush a preload for a new preinitialized Stylesheet Resource if one was already flushed', async () => {
    function Component() {
      ReactDOM.preload('foo', {as: 'style'});
      return (
        <div>
          <Suspense fallback="loading...">
            <BlockedOn value="blocked">
              <Preinit />
              hello
            </BlockedOn>
          </Suspense>
        </div>
      );
    }

    function Preinit() {
      ReactDOM.preinit('foo', {as: 'style'});
    }
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Component />
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="style" href="foo" />
        </head>
        <body>
          <div>loading...</div>
        </body>
      </html>,
    );
    await act(() => {
      resolveText('blocked');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="style" href="foo" />
        </head>
        <body>
          <div>hello</div>
        </body>
      </html>,
    );
  });

  it('will not insert a preload if the underlying resource already exists in the Document', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <head>
            <link rel="stylesheet" href="foo" precedence="default" />
            <script async={true} src="bar" />
            <link rel="preload" href="baz" as="font" />
          </head>
          <body>
            <div id="container" />
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <script async="" src="bar" />
          <link rel="preload" href="baz" as="font" />
        </head>
        <body>
          <div id="container" />
        </body>
      </html>,
    );

    container = document.getElementById('container');

    function ClientApp() {
      ReactDOM.preload('foo', {as: 'style'});
      ReactDOM.preload('bar', {as: 'script'});
      ReactDOM.preload('baz', {as: 'font'});
      return 'foo';
    }

    const root = ReactDOMClient.createRoot(container);

    await clientAct(() => root.render(<ClientApp />));
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="default" />
          <script async="" src="bar" />
          <link rel="preload" href="baz" as="font" />
        </head>
        <body>
          <div id="container">foo</div>
        </body>
      </html>,
    );
  });

  it('uses imageSrcSet and imageSizes when keying image preloads', async () => {
    function App({isClient}) {
      // Will key off href in absense of imageSrcSet
      ReactDOM.preload('foo', {as: 'image'});
      ReactDOM.preload('foo', {as: 'image'});

      // Will key off imageSrcSet + imageSizes
      ReactDOM.preload('foo', {as: 'image', imageSrcSet: 'fooset'});
      ReactDOM.preload('foo2', {as: 'image', imageSrcSet: 'fooset'});

      // Will key off imageSrcSet + imageSizes
      ReactDOM.preload('foo', {
        as: 'image',
        imageSrcSet: 'fooset',
        imageSizes: 'foosizes',
      });
      ReactDOM.preload('foo2', {
        as: 'image',
        imageSrcSet: 'fooset',
        imageSizes: 'foosizes',
      });

      // Will key off href in absense of imageSrcSet, imageSizes is ignored. these should match the
      // first preloads not not emit a new preload tag
      ReactDOM.preload('foo', {as: 'image', imageSizes: 'foosizes'});
      ReactDOM.preload('foo', {as: 'image', imageSizes: 'foosizes'});

      // These preloads are for something that isn't an image
      // They should all key off the href
      ReactDOM.preload('bar', {as: 'somethingelse'});
      ReactDOM.preload('bar', {
        as: 'somethingelse',
        imageSrcSet: 'makes no sense',
      });
      ReactDOM.preload('bar', {
        as: 'somethingelse',
        imageSrcSet: 'makes no sense',
        imageSizes: 'makes no sense',
      });

      if (isClient) {
        // Will key off href in absense of imageSrcSet
        ReactDOM.preload('client', {as: 'image'});
        ReactDOM.preload('client', {as: 'image'});

        // Will key off imageSrcSet + imageSizes
        ReactDOM.preload('client', {as: 'image', imageSrcSet: 'clientset'});
        ReactDOM.preload('client2', {as: 'image', imageSrcSet: 'clientset'});

        // Will key off imageSrcSet + imageSizes
        ReactDOM.preload('client', {
          as: 'image',
          imageSrcSet: 'clientset',
          imageSizes: 'clientsizes',
        });
        ReactDOM.preload('client2', {
          as: 'image',
          imageSrcSet: 'clientset',
          imageSizes: 'clientsizes',
        });

        // Will key off href in absense of imageSrcSet, imageSizes is ignored. these should match the
        // first preloads not not emit a new preload tag
        ReactDOM.preload('client', {as: 'image', imageSizes: 'clientsizes'});
        ReactDOM.preload('client', {as: 'image', imageSizes: 'clientsizes'});
      }

      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" href="foo" />
          <link rel="preload" as="image" imagesrcset="fooset" />
          <link
            rel="preload"
            as="image"
            imagesrcset="fooset"
            imagesizes="foosizes"
          />
          <link rel="preload" as="somethingelse" href="bar" />
        </head>
        <body>hello</body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" href="foo" />
          <link rel="preload" as="image" imagesrcset="fooset" />
          <link
            rel="preload"
            as="image"
            imagesrcset="fooset"
            imagesizes="foosizes"
          />
          <link rel="preload" as="somethingelse" href="bar" />
        </head>
        <body>hello</body>
      </html>,
    );

    root.render(<App isClient={true} />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" href="foo" />
          <link rel="preload" as="image" imagesrcset="fooset" />
          <link
            rel="preload"
            as="image"
            imagesrcset="fooset"
            imagesizes="foosizes"
          />
          <link rel="preload" as="somethingelse" href="bar" />
          <link rel="preload" as="image" href="client" />
          <link rel="preload" as="image" imagesrcset="clientset" />
          <link
            rel="preload"
            as="image"
            imagesrcset="clientset"
            imagesizes="clientsizes"
          />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  it('should handle referrerPolicy on image preload', async () => {
    function App({isClient}) {
      ReactDOM.preload('/server', {
        as: 'image',
        imageSrcSet: '/server',
        imageSizes: '100vw',
        referrerPolicy: 'no-referrer',
      });

      if (isClient) {
        ReactDOM.preload('/client', {
          as: 'image',
          imageSrcSet: '/client',
          imageSizes: '100vw',
          referrerPolicy: 'no-referrer',
        });
      }

      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            referrerpolicy="no-referrer"
          />
        </head>
        <body>hello</body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            referrerpolicy="no-referrer"
          />
        </head>
        <body>hello</body>
      </html>,
    );

    root.render(<App isClient={true} />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            referrerpolicy="no-referrer"
          />
          <link
            rel="preload"
            as="image"
            imagesrcset="/client"
            imagesizes="100vw"
            referrerpolicy="no-referrer"
          />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  it('can emit preloads for non-lazy images that are rendered', async () => {
    function App() {
      ReactDOM.preload('script', {as: 'script'});
      ReactDOM.preload('a', {as: 'image'});
      ReactDOM.preload('b', {as: 'image'});
      return (
        <html>
          <body>
            <img src="a" />
            <img src="b" loading="lazy" />
            <img src="b2" loading="lazy" />
            <img src="c" srcSet="srcsetc" />
            <img src="d" srcSet="srcsetd" sizes="sizesd" />
            <img src="d" srcSet="srcsetd" sizes="sizesd2" />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    // non-lazy images are first, then arbitrary preloads like for the script and lazy images
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="a" as="image" />
          <link rel="preload" as="image" imagesrcset="srcsetc" />
          <link
            rel="preload"
            as="image"
            imagesrcset="srcsetd"
            imagesizes="sizesd"
          />
          <link
            rel="preload"
            as="image"
            imagesrcset="srcsetd"
            imagesizes="sizesd2"
          />
          <link rel="preload" href="script" as="script" />
          <link rel="preload" href="b" as="image" />
        </head>
        <body>
          <img src="a" />
          <img src="b" loading="lazy" />
          <img src="b2" loading="lazy" />
          <img src="c" srcset="srcsetc" />
          <img src="d" srcset="srcsetd" sizes="sizesd" />
          <img src="d" srcset="srcsetd" sizes="sizesd2" />
        </body>
      </html>,
    );
  });

  it('Does not preload lazy images', async () => {
    function App() {
      ReactDOM.preload('a', {as: 'image'});
      return (
        <html>
          <body>
            <img src="a" fetchPriority="low" />
            <img src="b" fetchPriority="low" />
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" href="a" />
        </head>
        <body>
          <img src="a" fetchpriority="low" />
          <img src="b" fetchpriority="low" />
        </body>
      </html>,
    );
  });

  it('preloads up to 10 suspensey images as high priority when fetchPriority is not specified', async () => {
    function App() {
      ReactDOM.preload('1', {as: 'image', fetchPriority: 'high'});
      ReactDOM.preload('auto', {as: 'image'});
      ReactDOM.preload('low', {as: 'image', fetchPriority: 'low'});
      ReactDOM.preload('9', {as: 'image', fetchPriority: 'high'});
      ReactDOM.preload('10', {as: 'image', fetchPriority: 'high'});
      return (
        <html>
          <body>
            {/* skipping 1 */}
            <img src="2" />
            <img src="3" fetchPriority="auto" />
            <img src="4" fetchPriority="high" />
            <img src="5" />
            <img src="5low" fetchPriority="low" />
            <img src="6" />
            <img src="7" />
            <img src="8" />
            <img src="9" />
            {/* skipping 10 */}
            <img src="11" />
            <img src="12" fetchPriority="high" />
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          {/* First we see the preloads calls that made it to the high priority image queue */}
          <link rel="preload" as="image" href="1" fetchpriority="high" />
          <link rel="preload" as="image" href="9" fetchpriority="high" />
          <link rel="preload" as="image" href="10" fetchpriority="high" />
          {/* Next we see up to 7 more images qualify for high priority image queue */}
          <link rel="preload" as="image" href="2" />
          <link rel="preload" as="image" href="3" fetchpriority="auto" />
          <link rel="preload" as="image" href="4" fetchpriority="high" />
          <link rel="preload" as="image" href="5" />
          <link rel="preload" as="image" href="6" />
          <link rel="preload" as="image" href="7" />
          <link rel="preload" as="image" href="8" />
          {/* Next we see images that are explicitly high priority and thus make it to the high priority image queue */}
          <link rel="preload" as="image" href="12" fetchpriority="high" />
          {/* Next we see the remaining preloads that did not make it to the high priority image queue */}
          <link rel="preload" as="image" href="auto" />
          <link rel="preload" as="image" href="low" fetchpriority="low" />
          <link rel="preload" as="image" href="11" />
        </head>
        <body>
          {/* skipping 1 */}
          <img src="2" />
          <img src="3" fetchpriority="auto" />
          <img src="4" fetchpriority="high" />
          <img src="5" />
          <img src="5low" fetchpriority="low" />
          <img src="6" />
          <img src="7" />
          <img src="8" />
          <img src="9" />
          {/* skipping 10 */}
          <img src="11" />
          <img src="12" fetchpriority="high" />
        </body>
      </html>,
    );
  });

  it('can promote images to high priority when at least one instance specifies a high fetchPriority', async () => {
    function App() {
      // If a ends up in a higher priority queue than b it will flush first
      ReactDOM.preload('a', {as: 'image'});
      ReactDOM.preload('b', {as: 'image'});
      return (
        <html>
          <body>
            <link rel="stylesheet" href="foo" precedence="default" />
            <img src="1" />
            <img src="2" />
            <img src="3" />
            <img src="4" />
            <img src="5" />
            <img src="6" />
            <img src="7" />
            <img src="8" />
            <img src="9" />
            <img src="10" />
            <img src="11" />
            <img src="12" />
            <img src="a" fetchPriority="low" />
            <img src="a" />
            <img src="a" fetchPriority="high" />
            <img src="a" />
            <img src="a" />
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          {/* The First 10 high priority images were just the first 10 rendered images */}
          <link rel="preload" as="image" href="1" />
          <link rel="preload" as="image" href="2" />
          <link rel="preload" as="image" href="3" />
          <link rel="preload" as="image" href="4" />
          <link rel="preload" as="image" href="5" />
          <link rel="preload" as="image" href="6" />
          <link rel="preload" as="image" href="7" />
          <link rel="preload" as="image" href="8" />
          <link rel="preload" as="image" href="9" />
          <link rel="preload" as="image" href="10" />
          {/* The "a" image was rendered a few times but since at least one of those was with
          fetchPriorty="high" it ends up in the high priority queue */}
          <link rel="preload" as="image" href="a" />
          {/* Stylesheets come in between high priority images and regular preloads */}
          <link rel="stylesheet" href="foo" data-precedence="default" />
          {/* The remainig images that preloaded at regular priority */}
          <link rel="preload" as="image" href="b" />
          <link rel="preload" as="image" href="11" />
          <link rel="preload" as="image" href="12" />
        </head>
        <body>
          <img src="1" />
          <img src="2" />
          <img src="3" />
          <img src="4" />
          <img src="5" />
          <img src="6" />
          <img src="7" />
          <img src="8" />
          <img src="9" />
          <img src="10" />
          <img src="11" />
          <img src="12" />
          <img src="a" fetchpriority="low" />
          <img src="a" />
          <img src="a" fetchpriority="high" />
          <img src="a" />
          <img src="a" />
        </body>
      </html>,
    );
  });

  it('preloads from rendered images properly use srcSet and sizes', async () => {
    function App() {
      ReactDOM.preload('1', {as: 'image', imageSrcSet: 'ss1'});
      ReactDOM.preload('2', {
        as: 'image',
        imageSrcSet: 'ss2',
        imageSizes: 's2',
      });
      return (
        <html>
          <body>
            <img src="1" srcSet="ss1" />
            <img src="2" srcSet="ss2" sizes="s2" />
            <img src="3" srcSet="ss3" />
            <img src="4" srcSet="ss4" sizes="s4" />
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" as="image" imagesrcset="ss1" />
          <link rel="preload" as="image" imagesrcset="ss2" imagesizes="s2" />
          <link rel="preload" as="image" imagesrcset="ss3" />
          <link rel="preload" as="image" imagesrcset="ss4" imagesizes="s4" />
        </head>
        <body>
          <img src="1" srcset="ss1" />
          <img src="2" srcset="ss2" sizes="s2" />
          <img src="3" srcset="ss3" />
          <img src="4" srcset="ss4" sizes="s4" />
        </body>
      </html>,
    );
  });

  it('should not preload images that have a data URIs for src or srcSet', async () => {
    function App() {
      return (
        <html>
          <body>
            <img src="data:1" />
            <img src="data:2" srcSet="ss2" />
            <img srcSet="data:3a, data:3b 2x" />
            <img src="4" srcSet="data:4a, data4b 2x" />
          </body>
        </html>
      );
    }
    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <img src="data:1" />
          <img src="data:2" srcset="ss2" />
          <img srcset="data:3a, data:3b 2x" />
          <img src="4" srcset="data:4a, data4b 2x" />
        </body>
      </html>,
    );
  });

  // https://github.com/vercel/next.js/discussions/54799
  it('omits preloads when an <img> is inside a <picture>', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <picture>
              <img src="foo" />
            </picture>
            <picture>
              <source type="image/webp" srcSet="webpsrc" />
              <img src="jpg fallback" />
            </picture>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <picture>
            <img src="foo" />
          </picture>
          <picture>
            <source type="image/webp" srcset="webpsrc" />
            <img src="jpg fallback" />
          </picture>
        </body>
      </html>,
    );
  });

  // Fixes: https://github.com/facebook/react/issues/27910
  it('omits preloads for images inside noscript tags', async () => {
    function App() {
      return (
        <html>
          <body>
            <img src="foo" />
            <noscript>
              <img src="bar" />
            </noscript>
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="preload" href="foo" as="image" />
        </head>
        <body>
          <img src="foo" />
          <noscript>&lt;img src="bar"&gt;</noscript>
        </body>
      </html>,
    );
  });

  it('should handle media on image preload', async () => {
    function App({isClient}) {
      ReactDOM.preload('/server', {
        as: 'image',
        imageSrcSet: '/server',
        imageSizes: '100vw',
        media: 'print and (min-width: 768px)',
      });

      if (isClient) {
        ReactDOM.preload('/client', {
          as: 'image',
          imageSrcSet: '/client',
          imageSizes: '100vw',
          media: 'screen and (max-width: 480px)',
        });
      }

      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            media="print and (min-width: 768px)"
          />
        </head>
        <body>hello</body>
      </html>,
    );

    const root = ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            media="print and (min-width: 768px)"
          />
        </head>
        <body>hello</body>
      </html>,
    );

    root.render(<App isClient={true} />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="preload"
            as="image"
            imagesrcset="/server"
            imagesizes="100vw"
            media="print and (min-width: 768px)"
          />
          <link
            rel="preload"
            as="image"
            imagesrcset="/client"
            imagesizes="100vw"
            media="screen and (max-width: 480px)"
          />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  it('should warn if you preload a stylesheet and then render a style tag with the same href', async () => {
    const style = 'body { color: red; }';
    function App() {
      ReactDOM.preload('foo', {as: 'style'});
      return (
        <html>
          <body>
            hello
            <style precedence="default" href="foo">
              {style}
            </style>
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    assertConsoleErrorDev([
      'React encountered a hoistable style tag for the same href as a preload: "foo". ' +
        'When using a style tag to inline styles you should not also preload it as a stylsheet.\n' +
        '    in style (at **)\n' +
        '    in App (at **)',
    ]);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <style data-precedence="default" data-href="foo">
            {style}
          </style>
          <link rel="preload" as="style" href="foo" />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  it('should preload only once even if you discover a stylesheet, script, or moduleScript late', async () => {
    function App() {
      // We start with preinitializing some resources first
      ReactDOM.preinit('shell preinit/shell', {as: 'style'});
      ReactDOM.preinit('shell preinit/shell', {as: 'script'});
      ReactDOM.preinitModule('shell preinit/shell', {as: 'script'});

      // We initiate all the shell preloads
      ReactDOM.preload('shell preinit/shell', {as: 'style'});
      ReactDOM.preload('shell preinit/shell', {as: 'script'});
      ReactDOM.preloadModule('shell preinit/shell', {as: 'script'});

      ReactDOM.preload('shell/shell preinit', {as: 'style'});
      ReactDOM.preload('shell/shell preinit', {as: 'script'});
      ReactDOM.preloadModule('shell/shell preinit', {as: 'script'});

      ReactDOM.preload('shell/shell render', {as: 'style'});
      ReactDOM.preload('shell/shell render', {as: 'script'});
      ReactDOM.preloadModule('shell/shell render');

      ReactDOM.preload('shell/late preinit', {as: 'style'});
      ReactDOM.preload('shell/late preinit', {as: 'script'});
      ReactDOM.preloadModule('shell/late preinit');

      ReactDOM.preload('shell/late render', {as: 'style'});
      ReactDOM.preload('shell/late render', {as: 'script'});
      ReactDOM.preloadModule('shell/late render');

      // we preinit later ones that should be created by
      ReactDOM.preinit('shell/shell preinit', {as: 'style'});
      ReactDOM.preinit('shell/shell preinit', {as: 'script'});
      ReactDOM.preinitModule('shell/shell preinit');

      ReactDOM.preinit('late/shell preinit', {as: 'style'});
      ReactDOM.preinit('late/shell preinit', {as: 'script'});
      ReactDOM.preinitModule('late/shell preinit');
      return (
        <html>
          <body>
            <link
              rel="stylesheet"
              precedence="default"
              href="shell/shell render"
            />
            <script async={true} src="shell/shell render" />
            <script type="module" async={true} src="shell/shell render" />
            <link
              rel="stylesheet"
              precedence="default"
              href="late/shell render"
            />
            <script async={true} src="late/shell render" />
            <script type="module" async={true} src="late/shell render" />
            <Suspense fallback="late...">
              <BlockedOn value="late">
                <Late />
              </BlockedOn>
            </Suspense>
            <Suspense fallback="later...">
              <BlockedOn value="later">
                <Later />
              </BlockedOn>
            </Suspense>
          </body>
        </html>
      );
    }

    function Late() {
      ReactDOM.preload('late/later preinit', {as: 'style'});
      ReactDOM.preload('late/later preinit', {as: 'script'});
      ReactDOM.preloadModule('late/later preinit');

      ReactDOM.preload('late/later render', {as: 'style'});
      ReactDOM.preload('late/later render', {as: 'script'});
      ReactDOM.preloadModule('late/later render');

      ReactDOM.preload('late/shell preinit', {as: 'style'});
      ReactDOM.preload('late/shell preinit', {as: 'script'});
      ReactDOM.preloadModule('late/shell preinit');

      ReactDOM.preload('late/shell render', {as: 'style'});
      ReactDOM.preload('late/shell render', {as: 'script'});
      ReactDOM.preloadModule('late/shell render');

      // late preinits don't actually flush so we won't see this in the DOM as a stylesehet but we should see
      // the preload for this resource
      ReactDOM.preinit('shell/late preinit', {as: 'style'});
      ReactDOM.preinit('shell/late preinit', {as: 'script'});
      ReactDOM.preinitModule('shell/late preinit');
      return (
        <>
          Late
          <link
            rel="stylesheet"
            precedence="default"
            href="shell/late render"
          />
          <script async={true} src="shell/late render" />
          <script type="module" async={true} src="shell/late render" />
        </>
      );
    }

    function Later() {
      // late preinits don't actually flush so we won't see this in the DOM as a stylesehet but we should see
      // the preload for this resource
      ReactDOM.preinit('late/later preinit', {as: 'style'});
      ReactDOM.preinit('late/later preinit', {as: 'script'});
      ReactDOM.preinitModule('late/later preinit');
      return (
        <>
          Later
          <link
            rel="stylesheet"
            precedence="default"
            href="late/later render"
          />
          <script async={true} src="late/later render" />
          <script type="module" async={true} src="late/later render" />
        </>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell preinit/shell"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell render"
          />
          <script async="" src="shell preinit/shell" />
          <script async="" src="shell preinit/shell" type="module" />
          <script async="" src="shell/shell preinit" />
          <script async="" src="shell/shell preinit" type="module" />
          <script async="" src="late/shell preinit" />
          <script async="" src="late/shell preinit" type="module" />
          <script async="" src="shell/shell render" />
          <script async="" src="shell/shell render" type="module" />
          <script async="" src="late/shell render" />
          <script async="" src="late/shell render" type="module" />
          <link rel="preload" as="style" href="shell/late preinit" />
          <link rel="preload" as="script" href="shell/late preinit" />
          <link rel="modulepreload" href="shell/late preinit" />
          <link rel="preload" as="style" href="shell/late render" />
          <link rel="preload" as="script" href="shell/late render" />
          <link rel="modulepreload" href="shell/late render" />
        </head>
        <body>
          {'late...'}
          {'later...'}
        </body>
      </html>,
    );

    await act(() => {
      resolveText('late');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell preinit/shell"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell render"
          />
          {/* FROM HERE */}
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/late render"
          />
          {/** TO HERE:
           * This was hoisted by boundary complete instruction. The preload was already emitted in the
           * shell but we see it below because this was inserted clientside by precedence.
           * We don't observe the "shell/late preinit" because these do not flush unless they are flushing
           * with the shell
           * */}
          <script async="" src="shell preinit/shell" />
          <script async="" src="shell preinit/shell" type="module" />
          <script async="" src="shell/shell preinit" />
          <script async="" src="shell/shell preinit" type="module" />
          <script async="" src="late/shell preinit" />
          <script async="" src="late/shell preinit" type="module" />
          <script async="" src="shell/shell render" />
          <script async="" src="shell/shell render" type="module" />
          <script async="" src="late/shell render" />
          <script async="" src="late/shell render" type="module" />
          <link rel="preload" as="style" href="shell/late preinit" />
          <link rel="preload" as="script" href="shell/late preinit" />
          <link rel="modulepreload" href="shell/late preinit" />
          <link rel="preload" as="style" href="shell/late render" />
          <link rel="preload" as="script" href="shell/late render" />
          <link rel="modulepreload" href="shell/late render" />
        </head>
        <body>
          {'late...'}
          {'later...'}
          {/* FROM HERE */}
          <script async="" src="shell/late preinit" />
          <script async="" src="shell/late preinit" type="module" />
          <script async="" src="shell/late render" />
          <script async="" src="shell/late render" type="module" />
          <link rel="preload" as="style" href="late/later preinit" />
          <link rel="preload" as="script" href="late/later preinit" />
          <link rel="modulepreload" href="late/later preinit" />
          <link rel="preload" as="style" href="late/later render" />
          <link rel="preload" as="script" href="late/later render" />
          <link rel="modulepreload" href="late/later render" />
          {/** TO HERE:
           * These resources streamed into the body during the boundary flush. Scripts go first then
           * preloads according to our streaming queue priorities. Note also that late/shell resources
           * where the resource already emitted in the shell and the preload is invoked later do not
           * end up with a preload in the document at all.
           * */}
        </body>
      </html>,
    );

    await act(() => {
      resolveText('later');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell preinit/shell"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/late render"
          />
          {/* FROM HERE */}
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/later render"
          />
          {/** TO HERE:
           * This was hoisted by boundary complete instruction. The preload was already emitted in the
           * shell but we see it below because this was inserted clientside by precedence
           * We don't observe the "late/later preinit" because these do not flush unless they are flushing
           * with the shell
           * */}
          <script async="" src="shell preinit/shell" />
          <script async="" src="shell preinit/shell" type="module" />
          <script async="" src="shell/shell preinit" />
          <script async="" src="shell/shell preinit" type="module" />
          <script async="" src="late/shell preinit" />
          <script async="" src="late/shell preinit" type="module" />
          <script async="" src="shell/shell render" />
          <script async="" src="shell/shell render" type="module" />
          <script async="" src="late/shell render" />
          <script async="" src="late/shell render" type="module" />
          <link rel="preload" as="style" href="shell/late preinit" />
          <link rel="preload" as="script" href="shell/late preinit" />
          <link rel="modulepreload" href="shell/late preinit" />
          <link rel="preload" as="style" href="shell/late render" />
          <link rel="preload" as="script" href="shell/late render" />
          <link rel="modulepreload" href="shell/late render" />
        </head>
        <body>
          {'late...'}
          {'later...'}
          <script async="" src="shell/late preinit" />
          <script async="" src="shell/late preinit" type="module" />
          <script async="" src="shell/late render" />
          <script async="" src="shell/late render" type="module" />
          <link rel="preload" as="style" href="late/later preinit" />
          <link rel="preload" as="script" href="late/later preinit" />
          <link rel="modulepreload" href="late/later preinit" />
          <link rel="preload" as="style" href="late/later render" />
          <link rel="preload" as="script" href="late/later render" />
          <link rel="modulepreload" href="late/later render" />
          {/* FROM HERE */}
          <script async="" src="late/later preinit" />
          <script async="" src="late/later preinit" type="module" />
          <script async="" src="late/later render" />
          <script async="" src="late/later render" type="module" />
          {/** TO HERE:
           * These resources streamed into the body during the boundary flush. Scripts go first then
           * preloads according to our streaming queue priorities
           * */}
        </body>
      </html>,
    );
    loadStylesheets();
    // Let the styles flush and then flush the boundaries
    await 0;
    await 0;
    jest.runAllTimers();
    assertLog([
      'load stylesheet: shell preinit/shell',
      'load stylesheet: shell/shell preinit',
      'load stylesheet: late/shell preinit',
      'load stylesheet: shell/shell render',
      'load stylesheet: late/shell render',
      'load stylesheet: shell/late render',
      'load stylesheet: late/later render',
    ]);

    ReactDOMClient.hydrateRoot(document, <App />);
    await waitForAll([]);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell preinit/shell"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/shell render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/late render"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/later render"
          />
          {/* FROM HERE */}
          <link
            rel="stylesheet"
            data-precedence="default"
            href="shell/late preinit"
          />
          <link
            rel="stylesheet"
            data-precedence="default"
            href="late/later preinit"
          />
          {/** TO HERE:
           * The client render patches in the two missing preinit stylesheets when hydration happens
           * Note that this is only because we repeated the calls to preinit on the client
           * */}
          <script async="" src="shell preinit/shell" />
          <script async="" src="shell preinit/shell" type="module" />
          <script async="" src="shell/shell preinit" />
          <script async="" src="shell/shell preinit" type="module" />
          <script async="" src="late/shell preinit" />
          <script async="" src="late/shell preinit" type="module" />
          <script async="" src="shell/shell render" />
          <script async="" src="shell/shell render" type="module" />
          <script async="" src="late/shell render" />
          <script async="" src="late/shell render" type="module" />
          <link rel="preload" as="style" href="shell/late preinit" />
          <link rel="preload" as="script" href="shell/late preinit" />
          <link rel="modulepreload" href="shell/late preinit" />
          <link rel="preload" as="style" href="shell/late render" />
          <link rel="preload" as="script" href="shell/late render" />
          <link rel="modulepreload" href="shell/late render" />
        </head>
        <body>
          {'Late'}
          {'Later'}
          <script async="" src="shell/late preinit" />
          <script async="" src="shell/late preinit" type="module" />
          <script async="" src="shell/late render" />
          <script async="" src="shell/late render" type="module" />
          <link rel="preload" as="style" href="late/later preinit" />
          <link rel="preload" as="script" href="late/later preinit" />
          <link rel="modulepreload" href="late/later preinit" />
          <link rel="preload" as="style" href="late/later render" />
          <link rel="preload" as="script" href="late/later render" />
          <link rel="modulepreload" href="late/later render" />
          <script async="" src="late/later preinit" />
          <script async="" src="late/later preinit" type="module" />
          <script async="" src="late/later render" />
          <script async="" src="late/later render" type="module" />
        </body>
      </html>,
    );
  });

  it('does not flush hoistables for fallbacks', async () => {
    function App() {
      return (
        <html>
          <body>
            <Suspense
              fallback={
                <>
                  <div>fallback1</div>
                  <meta name="fallback1" />
                  <title>foo</title>
                </>
              }>
              <>
                <div>primary1</div>
                <meta name="primary1" />
              </>
            </Suspense>
            <Suspense
              fallback={
                <>
                  <div>fallback2</div>
                  <meta name="fallback2" />
                  <link rel="foo" href="bar" />
                </>
              }>
              <>
                <div>primary2</div>
                <BlockedOn value="first">
                  <meta name="primary2" />
                </BlockedOn>
              </>
            </Suspense>
            <Suspense
              fallback={
                <>
                  <div>fallback3</div>
                  <meta name="fallback3" />
                  <Suspense fallback="deep">
                    <div>deep fallback ... primary content</div>
                    <meta name="deep fallback" />
                  </Suspense>
                </>
              }>
              <>
                <div>primary3</div>
                <BlockedOn value="second">
                  <meta name="primary3" />
                </BlockedOn>
              </>
            </Suspense>
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
      resolveText('first');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta name="primary1" />
          <meta name="primary2" />
        </head>
        <body>
          <div>primary1</div>
          <div>primary2</div>
          <div>fallback3</div>
          <div>deep fallback ... primary content</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('second');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta name="primary1" />
          <meta name="primary2" />
        </head>
        <body>
          <div>primary1</div>
          <div>primary2</div>
          <div>primary3</div>
          <meta name="primary3" />
        </body>
      </html>,
    );
  });

  it('avoids flushing hoistables from completed boundaries nested inside fallbacks', async () => {
    function App() {
      return (
        <html>
          <body>
            <Suspense
              fallback={
                <Suspense
                  fallback={
                    <>
                      <div>nested fallback1</div>
                      <meta name="nested fallback1" />
                    </>
                  }>
                  <>
                    <div>nested primary1</div>
                    <meta name="nested primary1" />
                  </>
                </Suspense>
              }>
              <BlockedOn value="release" />
              <>
                <div>primary1</div>
                <meta name="primary1" />
              </>
            </Suspense>
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          {/* The primary content hoistables emit */}
          <meta name="primary1" />
        </head>
        <body>
          {/* The fallback content emits but the hoistables do not even if they
              inside a nested suspense boundary that is resolved */}
          <div>nested primary1</div>
        </body>
      </html>,
    );

    await act(() => {
      resolveText('release');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <meta name="primary1" />
        </head>
        <body>
          <div>primary1</div>
        </body>
      </html>,
    );
  });

  it('should never flush hoistables before the preamble', async () => {
    let resolve;
    const promise = new Promise(res => {
      resolve = res;
    });

    function App() {
      ReactDOM.preinit('foo', {as: 'script'});
      React.use(promise);
      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    // we assert the default JSDOM still in tact
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div id="container" />
        </body>
      </html>,
    );

    await act(() => {
      resolve();
    });

    // we assert the DOM was replaced entirely because we streamed an opening html tag
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <script async="" src="foo" />
        </head>
        <body>hello</body>
      </html>,
    );
  });

  describe('ReactDOM.prefetchDNS(href)', () => {
    it('creates a dns-prefetch resource when called', async () => {
      function App({url}) {
        ReactDOM.prefetchDNS(url);
        ReactDOM.prefetchDNS(url);
        ReactDOM.prefetchDNS(url, {});
        ReactDOM.prefetchDNS(url, {crossOrigin: 'use-credentials'});
        return (
          <html>
            <body>hello world</body>
          </html>
        );
      }

      await act(() => {
        renderToPipeableStream(<App url="foo" />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.\n' +
          '    in App (at **)',
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. ' +
          'Browsers do not perform DNS queries using CORS and setting this attribute ' +
          'on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just ' +
          'a single string argument, `href`.\n' +
          '    in App (at **)',
      ]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="dns-prefetch" href="foo" />
          </head>
          <body>hello world</body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(document, <App url="foo" />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.\n' +
          '    in App (at **)',
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. ' +
          'Browsers do not perform DNS queries using CORS and setting this attribute ' +
          'on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just ' +
          'a single string argument, `href`.\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="dns-prefetch" href="foo" />
          </head>
          <body>hello world</body>
        </html>,
      );

      root.render(<App url="bar" />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.\n' +
          '    in App (at **)',
        'ReactDOM.prefetchDNS(): Expected only one argument, `href`, ' +
          'but encountered something with type "object" as a second argument instead. ' +
          'This argument is reserved for future options and is currently disallowed. ' +
          'It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. ' +
          'Browsers do not perform DNS queries using CORS and setting this attribute ' +
          'on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just ' +
          'a single string argument, `href`.\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="dns-prefetch" href="foo" />
            <link rel="dns-prefetch" href="bar" />
          </head>
          <body>hello world</body>
        </html>,
      );
    });
  });

  it('does not wait for stylesheets of completed fallbacks', async () => {
    function Unblock({value}) {
      resolveText(value);
      return null;
    }
    function App() {
      return (
        <html>
          <body>
            <Suspense fallback="loading...">
              <div>hello world</div>
              <BlockedOn value="unblock inner boundaries">
                <Suspense
                  fallback={
                    <>
                      <link
                        rel="stylesheet"
                        href="completed inner"
                        precedence="default"
                      />
                      <div>inner fallback</div>
                      <Unblock value="completed inner" />
                    </>
                  }>
                  <BlockedOn value="completed inner" />
                  <div>inner boundary</div>
                </Suspense>
                <Suspense
                  fallback={
                    <>
                      <link
                        rel="stylesheet"
                        href="in fallback inner"
                        precedence="default"
                      />
                      <div>inner blocked fallback</div>
                    </>
                  }>
                  <BlockedOn value="in fallback inner" />
                  <div>inner blocked boundary</div>
                </Suspense>
              </BlockedOn>
              <BlockedOn value="complete root" />
            </Suspense>
          </body>
        </html>
      );
    }

    await act(() => {
      renderToPipeableStream(<App />).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>loading...</body>
      </html>,
    );

    await act(async () => {
      resolveText('unblock inner boundaries');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          loading...
          <link rel="preload" href="completed inner" as="style" />
          <link rel="preload" href="in fallback inner" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('completed inner');
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          loading...
          <link rel="preload" href="completed inner" as="style" />
          <link rel="preload" href="in fallback inner" as="style" />
        </body>
      </html>,
    );

    await act(() => {
      resolveText('complete root');
    });
    await act(() => {
      loadStylesheets();
    });
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link
            rel="stylesheet"
            href="in fallback inner"
            data-precedence="default"
          />
        </head>
        <body>
          <div>hello world</div>
          <div>inner boundary</div>
          <div>inner blocked fallback</div>
          <link rel="preload" href="completed inner" as="style" />
          <link rel="preload" href="in fallback inner" as="style" />
        </body>
      </html>,
    );
  });

  // @gate enableSuspenseList
  it('delays "forwards" SuspenseList rows until the css of previous rows have completed', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Suspense fallback="loading...">
              <SuspenseList revealOrder="forwards" tail="visible">
                <Suspense fallback="loading foo...">
                  <BlockedOn value="foo">
                    <link rel="stylesheet" href="foo" precedence="foo" />
                    foo
                  </BlockedOn>
                </Suspense>
                <Suspense fallback="loading bar...">bar</Suspense>
                <BlockedOn value="bar">
                  <Suspense fallback="loading baz...">
                    <BlockedOn value="baz">baz</BlockedOn>
                  </Suspense>
                </BlockedOn>
              </SuspenseList>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>loading...</body>
      </html>,
    );

    // unblock css loading
    await act(() => {
      resolveText('foo');
    });

    // bar is still blocking the whole list
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'loading...'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );

    // unblock inner loading states
    await act(() => {
      resolveText('bar');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'loading foo...'}
          {'loading bar...'}
          {'loading baz...'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );

    // resolve the last boundary
    await act(() => {
      resolveText('baz');
    });

    // still blocked on the css of the first row
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'loading foo...'}
          {'loading bar...'}
          {'loading baz...'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );

    await act(() => {
      loadStylesheets();
    });
    await assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'foo'}
          {'bar'}
          {'baz'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );
  });

  // @gate enableSuspenseList
  it('delays "together" SuspenseList rows until the css of previous rows have completed', async () => {
    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <SuspenseList revealOrder="together">
              <Suspense fallback="loading foo...">
                <BlockedOn value="foo">
                  <link rel="stylesheet" href="foo" precedence="foo" />
                  foo
                </BlockedOn>
              </Suspense>
              <Suspense fallback="loading bar...">bar</Suspense>
            </SuspenseList>
          </body>
        </html>,
      ).pipe(writable);
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>
          {'loading foo...'}
          {'loading bar...'}
        </body>
      </html>,
    );

    await act(() => {
      resolveText('foo');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'loading foo...'}
          {'loading bar...'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );

    await act(() => {
      loadStylesheets();
    });
    await assertLog(['load stylesheet: foo']);
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="foo" data-precedence="foo" />
        </head>
        <body>
          {'foo'}
          {'bar'}
          <link as="style" href="foo" rel="preload" />
        </body>
      </html>,
    );
  });

  describe('ReactDOM.preconnect(href, { crossOrigin })', () => {
    it('creates a preconnect resource when called', async () => {
      function App({url}) {
        ReactDOM.preconnect(url);
        ReactDOM.preconnect(url);
        ReactDOM.preconnect(url, {crossOrigin: true});
        ReactDOM.preconnect(url, {crossOrigin: ''});
        ReactDOM.preconnect(url, {crossOrigin: 'anonymous'});
        ReactDOM.preconnect(url, {crossOrigin: 'use-credentials'});
        return (
          <html>
            <body>hello world</body>
          </html>
        );
      }

      await act(() => {
        renderToPipeableStream(<App url="foo" />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) ' +
          'to be a string but encountered something with type "boolean" instead. ' +
          'Try removing this option or passing a string value instead.\n' +
          '    in App (at **)',
      ]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preconnect" href="foo" />
            <link rel="preconnect" href="foo" crossorigin="" />
            <link rel="preconnect" href="foo" crossorigin="use-credentials" />
          </head>
          <body>hello world</body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(document, <App url="foo" />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) ' +
          'to be a string but encountered something with type "boolean" instead. ' +
          'Try removing this option or passing a string value instead.\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preconnect" href="foo" />
            <link rel="preconnect" href="foo" crossorigin="" />
            <link rel="preconnect" href="foo" crossorigin="use-credentials" />
          </head>
          <body>hello world</body>
        </html>,
      );

      root.render(<App url="bar" />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) ' +
          'to be a string but encountered something with type "boolean" instead. ' +
          'Try removing this option or passing a string value instead.\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preconnect" href="foo" />
            <link rel="preconnect" href="foo" crossorigin="" />
            <link rel="preconnect" href="foo" crossorigin="use-credentials" />
            <link rel="preconnect" href="bar" />
            <link rel="preconnect" href="bar" crossorigin="" />
            <link rel="preconnect" href="bar" crossorigin="use-credentials" />
          </head>
          <body>hello world</body>
        </html>,
      );
    });
  });

  describe('ReactDOM.preload(href, { as: ... })', () => {
    it('creates a preload resource when called', async () => {
      function App() {
        ReactDOM.preload('foo', {as: 'style'});
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="blocked">
                  <Component />
                </BlockedOn>
              </Suspense>
            </body>
          </html>
        );
      }
      function Component() {
        ReactDOM.preload('bar', {as: 'script'});
        return <div>hello</div>;
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preload" as="style" href="foo" />
          </head>
          <body>loading...</body>
        </html>,
      );

      await act(() => {
        resolveText('blocked');
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preload" as="style" href="foo" />
          </head>
          <body>
            <div>hello</div>
            <link rel="preload" as="script" href="bar" />
          </body>
        </html>,
      );

      function ClientApp() {
        ReactDOM.preload('foo', {as: 'style'});
        ReactDOM.preload('font', {as: 'font', type: 'font/woff2'});
        React.useInsertionEffect(() => ReactDOM.preload('bar', {as: 'script'}));
        React.useLayoutEffect(() => ReactDOM.preload('baz', {as: 'font'}));
        React.useEffect(() => ReactDOM.preload('qux', {as: 'style'}));
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <div>hello</div>
              </Suspense>
            </body>
          </html>
        );
      }
      ReactDOMClient.hydrateRoot(document, <ClientApp />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preload" as="style" href="foo" />
            <link
              rel="preload"
              as="font"
              href="font"
              crossorigin=""
              type="font/woff2"
            />
            <link rel="preload" as="font" href="baz" crossorigin="" />
            <link rel="preload" as="style" href="qux" />
          </head>
          <body>
            <div>hello</div>
            <link rel="preload" as="script" href="bar" />
          </body>
        </html>,
      );
    });

    it('can seed connection props for stylesheet and script resources', async () => {
      function App() {
        ReactDOM.preload('foo', {
          as: 'style',
          crossOrigin: 'use-credentials',
          integrity: 'some hash',
          fetchPriority: 'low',
        });
        return (
          <html>
            <body>
              <div>hello</div>
              <link rel="stylesheet" href="foo" precedence="default" />
            </body>
          </html>
        );
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="foo"
              data-precedence="default"
              crossorigin="use-credentials"
              integrity="some hash"
            />
          </head>
          <body>
            <div>hello</div>
          </body>
        </html>,
      );
    });

    it('warns if you do not pass in a valid href argument or options argument', async () => {
      function App() {
        ReactDOM.preload();
        ReactDOM.preload('');
        ReactDOM.preload('foo', null);
        ReactDOM.preload('foo', {});
        ReactDOM.preload('foo', {as: 'foo'});
        return <div>foo</div>;
      }

      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an ' +
          '`options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag. ' +
          'The `href` argument encountered was `undefined`. ' +
          'The `options` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an ' +
          '`options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag. ' +
          'The `href` argument encountered was an empty string. ' +
          'The `options` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an ' +
          '`options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag. ' +
          'The `options` argument encountered was `null`.\n' +
          '    in App (at **)',
        'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an ' +
          '`options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag. ' +
          'The `as` option encountered was `undefined`.\n' +
          '    in App (at **)',
      ]);
    });

    it('supports fetchPriority', async () => {
      function Component({isServer}) {
        ReactDOM.preload(isServer ? 'highserver' : 'highclient', {
          as: 'script',
          fetchPriority: 'high',
        });
        ReactDOM.preload(isServer ? 'lowserver' : 'lowclient', {
          as: 'style',
          fetchPriority: 'low',
        });
        ReactDOM.preload(isServer ? 'autoserver' : 'autoclient', {
          as: 'style',
          fetchPriority: 'auto',
        });
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Component isServer={true} />
            </body>
          </html>,
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="preload"
              as="script"
              href="highserver"
              fetchpriority="high"
            />
            <link
              rel="preload"
              as="style"
              href="lowserver"
              fetchpriority="low"
            />
            <link
              rel="preload"
              as="style"
              href="autoserver"
              fetchpriority="auto"
            />
          </head>
          <body>hello</body>
        </html>,
      );

      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <Component />
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="preload"
              as="script"
              href="highserver"
              fetchpriority="high"
            />
            <link
              rel="preload"
              as="style"
              href="lowserver"
              fetchpriority="low"
            />
            <link
              rel="preload"
              as="style"
              href="autoserver"
              fetchpriority="auto"
            />
            <link
              rel="preload"
              as="script"
              href="highclient"
              fetchpriority="high"
            />
            <link
              rel="preload"
              as="style"
              href="lowclient"
              fetchpriority="low"
            />
            <link
              rel="preload"
              as="style"
              href="autoclient"
              fetchpriority="auto"
            />
          </head>
          <body>hello</body>
        </html>,
      );
    });

    it('supports nonce', async () => {
      function App({url}) {
        ReactDOM.preload(url, {as: 'script', nonce: 'abc'});
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(<App url="server" />).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <div id="container">
              <link rel="preload" as="script" href="server" nonce="abc" />
              hello
            </div>
          </body>
        </html>,
      );

      ReactDOMClient.hydrateRoot(container, <App url="client" />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="preload" as="script" href="client" nonce="abc" />
          </head>
          <body>
            <div id="container">
              <link rel="preload" as="script" href="server" nonce="abc" />
              hello
            </div>
          </body>
        </html>,
      );
    });
  });

  describe('ReactDOM.preloadModule(href, options)', () => {
    it('preloads scripts as modules', async () => {
      function App({ssr}) {
        const prefix = ssr ? 'ssr ' : 'browser ';
        ReactDOM.preloadModule(prefix + 'plain');
        ReactDOM.preloadModule(prefix + 'default', {as: 'script'});
        ReactDOM.preloadModule(prefix + 'cors', {
          crossOrigin: 'use-credentials',
        });
        ReactDOM.preloadModule(prefix + 'integrity', {integrity: 'some hash'});
        ReactDOM.preloadModule(prefix + 'serviceworker', {as: 'serviceworker'});
        return <div>hello</div>;
      }
      await act(() => {
        renderToPipeableStream(<App ssr={true} />).pipe(writable);
      });
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div id="container">
          <link rel="modulepreload" href="ssr plain" />
          <link rel="modulepreload" href="ssr default" />
          <link
            rel="modulepreload"
            href="ssr cors"
            crossorigin="use-credentials"
          />
          <link
            rel="modulepreload"
            href="ssr integrity"
            integrity="some hash"
          />
          <link
            rel="modulepreload"
            href="ssr serviceworker"
            as="serviceworker"
          />
          <div>hello</div>
        </div>,
      );

      ReactDOMClient.hydrateRoot(container, <App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="modulepreload" href="browser plain" />
            <link rel="modulepreload" href="browser default" />
            <link
              rel="modulepreload"
              href="browser cors"
              crossorigin="use-credentials"
            />
            <link
              rel="modulepreload"
              href="browser integrity"
              integrity="some hash"
            />
            <link
              rel="modulepreload"
              href="browser serviceworker"
              as="serviceworker"
            />
          </head>
          <body>
            <div id="container">
              <link rel="modulepreload" href="ssr plain" />
              <link rel="modulepreload" href="ssr default" />
              <link
                rel="modulepreload"
                href="ssr cors"
                crossorigin="use-credentials"
              />
              <link
                rel="modulepreload"
                href="ssr integrity"
                integrity="some hash"
              />
              <link
                rel="modulepreload"
                href="ssr serviceworker"
                as="serviceworker"
              />
              <div>hello</div>
            </div>
          </body>
        </html>,
      );
    });

    it('preloads multiple modules with the same custom as value', async () => {
      function App() {
        ReactDOM.preloadModule('worker-a', {as: 'serviceworker'});
        ReactDOM.preloadModule('worker-b', {as: 'serviceworker'});
        return <div>hello</div>;
      }

      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });

      expect(getMeaningfulChildren(document.body)).toEqual(
        <div id="container">
          <link rel="modulepreload" href="worker-a" as="serviceworker" />
          <link rel="modulepreload" href="worker-b" as="serviceworker" />
          <div>hello</div>
        </div>,
      );
    });

    it('warns if you provide invalid arguments', async () => {
      function App() {
        ReactDOM.preloadModule();
        ReactDOM.preloadModule(() => {});
        ReactDOM.preloadModule('');
        ReactDOM.preloadModule('1', true);
        ReactDOM.preloadModule('2', {as: true});
        return <div>hello</div>;
      }
      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was something with type "function".\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was an empty string.\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `options` argument encountered was something with type "boolean".\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally,' +
          ' an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `as` option encountered was something with type "boolean".\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div id="container">
          <link rel="modulepreload" href="1" />
          <link rel="modulepreload" href="2" />
          <div>hello</div>
        </div>,
      );

      const root = ReactDOMClient.createRoot(
        document.getElementById('container'),
      );
      root.render(<App />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, ' +
          'an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was something with type "function".\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an ' +
          '`options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `href` argument encountered was an empty string.\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an ' +
          '`options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `options` argument encountered was something with type "boolean".\n' +
          '    in App (at **)',
        'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an ' +
          '`options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag. ' +
          'The `as` option encountered was something with type "boolean".\n' +
          '    in App (at **)',
      ]);
    });
  });

  describe('ReactDOM.preinit(href, { as: ... })', () => {
    it('creates a stylesheet resource when ReactDOM.preinit(..., {as: "style" }) is called', async () => {
      function App() {
        ReactDOM.preinit('foo', {as: 'style'});
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="bar">
                  <Component />
                </BlockedOn>
              </Suspense>
            </body>
          </html>
        );
      }

      function Component() {
        ReactDOM.preinit('bar', {as: 'style'});
        return <div>hello</div>;
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
          </head>
          <body>loading...</body>
        </html>,
      );

      await act(() => {
        resolveText('bar');
      });
      // The reason we do not see the "bar" stylesheet here is that ReactDOM.preinit is not about
      // encoding a resource dependency but is a hint that a resource will be used in the near future.
      // If we call preinit on the server after the shell has flushed the best we can do is emit a preload
      // because any flushing suspense boundaries are not actually dependent on that resource and we don't
      // want to delay reveal based on when that resource loads.
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
          </head>
          <body>
            <div>hello</div>
            <link rel="preload" href="bar" as="style" />
          </body>
        </html>,
      );

      function ClientApp() {
        ReactDOM.preinit('bar', {as: 'style'});
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <div>hello</div>
              </Suspense>
            </body>
          </html>
        );
      }

      ReactDOMClient.hydrateRoot(document, <ClientApp />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="stylesheet" href="bar" data-precedence="default" />
          </head>
          <body>
            <div>hello</div>
            <link rel="preload" href="bar" as="style" />
          </body>
        </html>,
      );
    });

    it('creates a stylesheet resource in the ownerDocument when ReactDOM.preinit(..., {as: "style" }) is called outside of render on the client', async () => {
      function App() {
        React.useEffect(() => {
          ReactDOM.preinit('foo', {as: 'style'});
        }, []);
        return (
          <html>
            <body>foo</body>
          </html>
        );
      }

      const root = ReactDOMClient.createRoot(document);
      root.render(<App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
          </head>
          <body>foo</body>
        </html>,
      );
    });

    it('creates a stylesheet resource in the ownerDocument when ReactDOM.preinit(..., {as: "style" }) is called in shadowRoot', async () => {
      // This is testing behavior, but it shows that it is not a good idea to preinit inside a shadowRoot. The point is we are asserting a behavior
      // you would want to avoid in a real app.
      const shadow = document.body.attachShadow({mode: 'open'});
      function ShadowComponent() {
        ReactDOM.preinit('bar', {as: 'style'});
        return null;
      }
      function App() {
        React.useEffect(() => {
          ReactDOM.preinit('foo', {as: 'style'});
        }, []);
        return (
          <html>
            <body>
              foo
              {ReactDOM.createPortal(
                <div>
                  <ShadowComponent />
                  shadow
                </div>,
                shadow,
              )}
            </body>
          </html>
        );
      }

      const root = ReactDOMClient.createRoot(document);
      root.render(<App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="bar" data-precedence="default" />
            <link rel="stylesheet" href="foo" data-precedence="default" />
          </head>
          <body>foo</body>
        </html>,
      );
      expect(getMeaningfulChildren(shadow)).toEqual(<div>shadow</div>);
    });

    it('creates a script resource when ReactDOM.preinit(..., {as: "script" }) is called', async () => {
      function App() {
        ReactDOM.preinit('foo', {as: 'script'});
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="bar">
                  <Component />
                </BlockedOn>
              </Suspense>
            </body>
          </html>
        );
      }

      function Component() {
        ReactDOM.preinit('bar', {as: 'script'});
        return <div>hello</div>;
      }

      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" />
          </head>
          <body>loading...</body>
        </html>,
      );

      await act(() => {
        resolveText('bar');
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" />
          </head>
          <body>
            <div>hello</div>
            <script async="" src="bar" />
          </body>
        </html>,
      );

      function ClientApp() {
        ReactDOM.preinit('bar', {as: 'script'});
        return (
          <html>
            <body>
              <Suspense fallback="loading...">
                <div>hello</div>
              </Suspense>
            </body>
          </html>
        );
      }

      ReactDOMClient.hydrateRoot(document, <ClientApp />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" />
          </head>
          <body>
            <div>hello</div>
            <script async="" src="bar" />
          </body>
        </html>,
      );
    });

    it('creates a script resource when ReactDOM.preinit(..., {as: "script" }) is called outside of render on the client', async () => {
      function App() {
        React.useEffect(() => {
          ReactDOM.preinit('foo', {as: 'script'});
        }, []);
        return (
          <html>
            <body>foo</body>
          </html>
        );
      }

      const root = ReactDOMClient.createRoot(document);
      root.render(<App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" />
          </head>
          <body>foo</body>
        </html>,
      );
    });

    it('warns if you do not pass in a valid href argument or options argument', async () => {
      function App() {
        ReactDOM.preinit();
        ReactDOM.preinit('');
        ReactDOM.preinit('foo', null);
        ReactDOM.preinit('foo', {});
        ReactDOM.preinit('foo', {as: 'foo'});
        return <div>foo</div>;
      }

      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string ' +
          'but encountered `undefined` instead.\n' +
          '    in App (at **)',
        'ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string ' +
          'but encountered an empty string instead.\n' +
          '    in App (at **)',
        'ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` ' +
          'property describing the type of resource to be preinitialized but encountered `null` instead.\n' +
          '    in App (at **)',
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain ' +
          'a valid value describing the type of resource to be preinitialized but encountered `undefined` instead. ' +
          'Valid values for `as` are "style" and "script".\n' +
          '    in App (at **)',
        'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain ' +
          'a valid value describing the type of resource to be preinitialized but encountered "foo" instead. ' +
          'Valid values for `as` are "style" and "script".\n' +
          '    in App (at **)',
      ]);
    });

    it('accepts a `nonce` option for `as: "script"`', async () => {
      function Component({src}) {
        ReactDOM.preinit(src, {as: 'script', nonce: 'R4nD0m'});
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Component src="foo" />
            </body>
          </html>,
          {
            nonce: 'R4nD0m',
          },
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" nonce="R4nD0m" />
          </head>
          <body>hello</body>
        </html>,
      );

      await clientAct(() => {
        ReactDOMClient.hydrateRoot(
          document,
          <html>
            <body>
              <Component src="bar" />
            </body>
          </html>,
        );
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" nonce="R4nD0m" />
            <script async="" src="bar" nonce="R4nD0m" />
          </head>
          <body>hello</body>
        </html>,
      );
    });

    it('accepts an `integrity` option for `as: "script"`', async () => {
      function Component({src, hash}) {
        ReactDOM.preinit(src, {as: 'script', integrity: hash});
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Component src="foo" hash="foo hash" />
            </body>
          </html>,
          {
            nonce: 'R4nD0m',
          },
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" integrity="foo hash" />
          </head>
          <body>hello</body>
        </html>,
      );

      await clientAct(() => {
        ReactDOMClient.hydrateRoot(
          document,
          <html>
            <body>
              <Component src="bar" hash="bar hash" />
            </body>
          </html>,
        );
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="foo" integrity="foo hash" />
            <script async="" src="bar" integrity="bar hash" />
          </head>
          <body>hello</body>
        </html>,
      );
    });

    it('accepts an `integrity` option for `as: "style"`', async () => {
      function Component({src, hash}) {
        ReactDOM.preinit(src, {as: 'style', integrity: hash});
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Component src="foo" hash="foo hash" />
            </body>
          </html>,
          {
            nonce: 'R4nD0m',
          },
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="foo"
              integrity="foo hash"
              data-precedence="default"
            />
          </head>
          <body>hello</body>
        </html>,
      );
      await clientAct(() => {
        ReactDOMClient.hydrateRoot(
          document,
          <html>
            <body>
              <Component src="bar" hash="bar hash" />
            </body>
          </html>,
        );
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="foo"
              integrity="foo hash"
              data-precedence="default"
            />
            <link
              rel="stylesheet"
              href="bar"
              integrity="bar hash"
              data-precedence="default"
            />
          </head>
          <body>hello</body>
        </html>,
      );
    });

    it('supports fetchPriority', async () => {
      function Component({isServer}) {
        ReactDOM.preinit(isServer ? 'highserver' : 'highclient', {
          as: 'script',
          fetchPriority: 'high',
        });
        ReactDOM.preinit(isServer ? 'lowserver' : 'lowclient', {
          as: 'style',
          fetchPriority: 'low',
        });
        ReactDOM.preinit(isServer ? 'autoserver' : 'autoclient', {
          as: 'style',
          fetchPriority: 'auto',
        });
        return 'hello';
      }

      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Component isServer={true} />
            </body>
          </html>,
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="lowserver"
              fetchpriority="low"
              data-precedence="default"
            />
            <link
              rel="stylesheet"
              href="autoserver"
              fetchpriority="auto"
              data-precedence="default"
            />
            <script async="" src="highserver" fetchpriority="high" />
          </head>
          <body>hello</body>
        </html>,
      );
      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <Component />
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="lowserver"
              fetchpriority="low"
              data-precedence="default"
            />
            <link
              rel="stylesheet"
              href="autoserver"
              fetchpriority="auto"
              data-precedence="default"
            />
            <link
              rel="stylesheet"
              href="lowclient"
              fetchpriority="low"
              data-precedence="default"
            />
            <link
              rel="stylesheet"
              href="autoclient"
              fetchpriority="auto"
              data-precedence="default"
            />
            <script async="" src="highserver" fetchpriority="high" />
            <script async="" src="highclient" fetchpriority="high" />
          </head>
          <body>hello</body>
        </html>,
      );
    });
  });

  describe('ReactDOM.preinitModule(href, options)', () => {
    it('creates a script module resources', async () => {
      function App({ssr}) {
        const prefix = ssr ? 'ssr ' : 'browser ';
        ReactDOM.preinitModule(prefix + 'plain');
        ReactDOM.preinitModule(prefix + 'default', {as: 'script'});
        ReactDOM.preinitModule(prefix + 'cors', {
          crossOrigin: 'use-credentials',
        });
        ReactDOM.preinitModule(prefix + 'integrity', {integrity: 'some hash'});
        ReactDOM.preinitModule(prefix + 'warning', {as: 'style'});
        return <div>hello</div>;
      }
      await act(() => {
        renderToPipeableStream(<App ssr={true} />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `as` option encountered was "style".\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div id="container">
          <script type="module" src="ssr plain" async="" />
          <script type="module" src="ssr default" async="" />
          <script
            type="module"
            src="ssr cors"
            crossorigin="use-credentials"
            async=""
          />
          <script
            type="module"
            src="ssr integrity"
            integrity="some hash"
            async=""
          />
          <div>hello</div>
        </div>,
      );

      ReactDOMClient.hydrateRoot(container, <App />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `as` option encountered was "style".\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script type="module" src="browser plain" async="" />
            <script type="module" src="browser default" async="" />
            <script
              type="module"
              src="browser cors"
              crossorigin="use-credentials"
              async=""
            />
            <script
              type="module"
              src="browser integrity"
              integrity="some hash"
              async=""
            />
          </head>
          <body>
            <div id="container">
              <script type="module" src="ssr plain" async="" />
              <script type="module" src="ssr default" async="" />
              <script
                type="module"
                src="ssr cors"
                crossorigin="use-credentials"
                async=""
              />
              <script
                type="module"
                src="ssr integrity"
                integrity="some hash"
                async=""
              />
              <div>hello</div>
            </div>
          </body>
        </html>,
      );
    });

    it('warns if you provide invalid arguments', async () => {
      function App() {
        ReactDOM.preinitModule();
        ReactDOM.preinitModule(() => {});
        ReactDOM.preinitModule('');
        ReactDOM.preinitModule('1', true);
        ReactDOM.preinitModule('2', {as: true});
        return <div>hello</div>;
      }
      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });
      assertConsoleErrorDev([
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was something with type "function".\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was an empty string.\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `options` argument encountered was something with type "boolean".\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `as` option encountered was something with type "boolean".\n' +
          '    in App (at **)',
      ]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div id="container">
          <div>hello</div>
        </div>,
      );

      const root = ReactDOMClient.createRoot(
        document.getElementById('container'),
      );
      root.render(<App />);
      await waitForAll([]);
      assertConsoleErrorDev([
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was `undefined`.\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was something with type "function".\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `href` argument encountered was an empty string.\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `options` argument encountered was something with type "boolean".\n' +
          '    in App (at **)',
        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` ' +
          'string and, optionally, an `options` object with a valid `as` property. ' +
          'The `as` option encountered was something with type "boolean".\n' +
          '    in App (at **)',
      ]);
    });
  });

  describe('Stylesheet Resources', () => {
    it('treats link rel stylesheet elements as a stylesheet resource when it includes a precedence when server rendering', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <link rel="stylesheet" href="aresource" precedence="foo" />
              <div>hello world</div>
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="aresource" data-precedence="foo" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
      );
    });

    it('treats link rel stylesheet elements as a stylesheet resource when it includes a precedence when client rendering', async () => {
      const root = ReactDOMClient.createRoot(document);
      root.render(
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="aresource" precedence="foo" />
            <div>hello world</div>
          </body>
        </html>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog([
        'load preload: aresource',
        'load stylesheet: aresource',
      ]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="aresource" data-precedence="foo" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
      );
    });

    it('treats link rel stylesheet elements as a stylesheet resource when it includes a precedence when hydrating', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <link rel="stylesheet" href="aresource" precedence="foo" />
              <div>hello world</div>
            </body>
          </html>,
        );
        pipe(writable);
      });
      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="aresource" precedence="foo" />
            <div>hello world</div>
          </body>
        </html>,
      );
      await waitForAll([]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="aresource" data-precedence="foo" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
      );
    });

    it('hoists stylesheet resources to the correct precedence', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <link rel="stylesheet" href="foo1" precedence="foo" />
              <link rel="stylesheet" href="default1" precedence="default" />
              <link rel="stylesheet" href="foo2" precedence="foo" />
              <div>hello world</div>
            </body>
          </html>,
        );
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo1" data-precedence="foo" />
            <link rel="stylesheet" href="foo2" data-precedence="foo" />
            <link rel="stylesheet" href="default1" data-precedence="default" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
      );

      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="bar1" precedence="bar" />
            <link rel="stylesheet" href="foo3" precedence="foo" />
            <link rel="stylesheet" href="default2" precedence="default" />
            <div>hello world</div>
          </body>
        </html>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog([
        'load preload: bar1',
        'load preload: foo3',
        'load preload: default2',
        'load stylesheet: foo1',
        'load stylesheet: foo2',
        'load stylesheet: foo3',
        'load stylesheet: default1',
        'load stylesheet: default2',
        'load stylesheet: bar1',
      ]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo1" data-precedence="foo" />
            <link rel="stylesheet" href="foo2" data-precedence="foo" />
            <link rel="stylesheet" href="foo3" data-precedence="foo" />
            <link rel="stylesheet" href="default1" data-precedence="default" />
            <link rel="stylesheet" href="default2" data-precedence="default" />
            <link rel="stylesheet" href="bar1" data-precedence="bar" />
            <link rel="preload" as="style" href="bar1" />
            <link rel="preload" as="style" href="foo3" />
            <link rel="preload" as="style" href="default2" />
          </head>
          <body>
            <div>hello world</div>
          </body>
        </html>,
      );
    });

    it('retains styles even after the last referring Resource unmounts', async () => {
      // This test is true until a future update where there is some form of garbage collection.
      const root = ReactDOMClient.createRoot(document);

      root.render(
        <html>
          <head />
          <body>
            hello world
            <link rel="stylesheet" href="foo" precedence="foo" />
          </body>
        </html>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog(['load preload: foo', 'load stylesheet: foo']);

      root.render(
        <html>
          <head />
          <body>hello world</body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="foo" />
          </head>
          <body>hello world</body>
        </html>,
      );
    });

    it('retains styles even when a new html, head, and/body mount', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <link rel="stylesheet" href="foo" precedence="foo" />
              <link rel="stylesheet" href="bar" precedence="bar" />
              server
            </body>
          </html>,
        );
        pipe(writable);
      });
      const errors = [];
      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <head>
            <link rel="stylesheet" href="qux" precedence="qux" />
            <link rel="stylesheet" href="foo" precedence="foo" />
          </head>
          <body>client</body>
        </html>,
        {
          onRecoverableError(error) {
            errors.push(error.message);
          },
        },
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog([
        'load preload: qux',
        'load stylesheet: foo',
        'load stylesheet: bar',
        'load stylesheet: qux',
      ]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="foo" />
            <link rel="stylesheet" href="bar" data-precedence="bar" />
            <link rel="stylesheet" href="qux" data-precedence="qux" />
          </head>
          <body>client</body>
        </html>,
      );
    });

    it('retains styles in head through head remounts', async () => {
      const root = ReactDOMClient.createRoot(document);
      root.render(
        <html>
          <head key={1} />
          <body>
            <link rel="stylesheet" href="foo" precedence="foo" />
            <link rel="stylesheet" href="bar" precedence="bar" />
            {null}
            hello
          </body>
        </html>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog([
        'load preload: foo',
        'load preload: bar',
        'load stylesheet: foo',
        'load stylesheet: bar',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="foo" />
            <link rel="stylesheet" href="bar" data-precedence="bar" />
          </head>
          <body>hello</body>
        </html>,
      );

      root.render(
        <html>
          <head key={2} />
          <body>
            <link rel="stylesheet" href="foo" precedence="foo" />
            {null}
            <link rel="stylesheet" href="baz" precedence="baz" />
            hello
          </body>
        </html>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog(['load preload: baz', 'load stylesheet: baz']);

      // The reason we do not see preloads in the head is they are inserted synchronously
      // during render and then when the new singleton mounts it resets it's content, retaining only styles
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="foo" />
            <link rel="stylesheet" href="bar" data-precedence="bar" />
            <link rel="stylesheet" href="baz" data-precedence="baz" />
            <link rel="preload" href="baz" as="style" />
          </head>
          <body>hello</body>
        </html>,
      );
    });

    it('can support styles inside portals to a shadowRoot', async () => {
      const shadow = document.body.attachShadow({mode: 'open'});
      const root = ReactDOMClient.createRoot(container);
      root.render(
        <>
          <link rel="stylesheet" href="foo" precedence="default" />
          {ReactDOM.createPortal(
            <div>
              <link
                rel="stylesheet"
                href="foo"
                data-extra-prop="foo"
                precedence="different"
              />
              shadow
            </div>,
            shadow,
          )}
          container
        </>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
        loadStylesheetsFrom(shadow);
      });
      await assertLog([
        'load preload: foo',
        'load stylesheet: foo',
        'load stylesheet: foo',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="preload" href="foo" as="style" />
          </head>
          <body>
            <div id="container">container</div>
          </body>
        </html>,
      );
      expect(getMeaningfulChildren(shadow)).toEqual([
        <link
          rel="stylesheet"
          href="foo"
          data-precedence="different"
          data-extra-prop="foo"
        />,
        <div>shadow</div>,
      ]);
    });

    it('can support styles inside portals to an element in shadowRoots', async () => {
      const template = document.createElement('template');
      template.innerHTML =
        "<div><div id='shadowcontainer1'></div><div id='shadowcontainer2'></div></div>";
      const shadow = document.body.attachShadow({mode: 'open'});
      shadow.appendChild(template.content);

      const shadowContainer1 = shadow.getElementById('shadowcontainer1');
      const shadowContainer2 = shadow.getElementById('shadowcontainer2');
      const root = ReactDOMClient.createRoot(container);
      root.render(
        <>
          <link rel="stylesheet" href="foo" precedence="default" />
          {ReactDOM.createPortal(
            <div>
              <link rel="stylesheet" href="foo" precedence="one" />
              <link rel="stylesheet" href="bar" precedence="two" />1
            </div>,
            shadow,
          )}
          {ReactDOM.createPortal(
            <div>
              <link rel="stylesheet" href="foo" precedence="one" />
              <link rel="stylesheet" href="baz" precedence="one" />2
            </div>,
            shadowContainer1,
          )}
          {ReactDOM.createPortal(
            <div>
              <link rel="stylesheet" href="bar" precedence="two" />
              <link rel="stylesheet" href="qux" precedence="three" />3
            </div>,
            shadowContainer2,
          )}
          container
        </>,
      );
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
        loadStylesheetsFrom(shadow);
        loadStylesheetsFrom(shadowContainer2);
        loadStylesheetsFrom(shadowContainer2);
      });
      await assertLog([
        'load preload: foo',
        'load preload: bar',
        'load preload: baz',
        'load preload: qux',
        'load stylesheet: foo',
        'load stylesheet: foo',
        'load stylesheet: baz',
        'load stylesheet: bar',
        'load stylesheet: qux',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="foo" data-precedence="default" />
            <link rel="preload" href="foo" as="style" />
            <link rel="preload" href="bar" as="style" />
            <link rel="preload" href="baz" as="style" />
            <link rel="preload" href="qux" as="style" />
          </head>
          <body>
            <div id="container">container</div>
          </body>
        </html>,
      );
      expect(getMeaningfulChildren(shadow)).toEqual([
        <link rel="stylesheet" href="foo" data-precedence="one" />,
        <link rel="stylesheet" href="baz" data-precedence="one" />,
        <link rel="stylesheet" href="bar" data-precedence="two" />,
        <link rel="stylesheet" href="qux" data-precedence="three" />,
        <div>
          <div id="shadowcontainer1">
            <div>2</div>
          </div>
          <div id="shadowcontainer2">
            <div>3</div>
          </div>
        </div>,
        <div>1</div>,
      ]);
    });

    it('escapes hrefs when selecting matching elements in the document when rendering Resources', async () => {
      function App() {
        ReactDOM.preload('preload', {as: 'style'});
        ReactDOM.preload('with\nnewline', {as: 'style'});
        return (
          <html>
            <head />
            <body>
              <link rel="stylesheet" href="style" precedence="style" />
              <link rel="stylesheet" href="with\slashes" precedence="style" />
              <div id="container" />
            </body>
          </html>
        );
      }
      await act(() => {
        const {pipe} = renderToPipeableStream(<App />);
        pipe(writable);
      });

      container = document.getElementById('container');
      const root = ReactDOMClient.createRoot(container);

      function ClientApp() {
        ReactDOM.preload('preload', {as: 'style'});
        ReactDOM.preload('with\nnewline', {as: 'style'});
        return (
          <div>
            <link
              rel="stylesheet"
              href={'style"][rel="stylesheet'}
              precedence="style"
            />
            <link rel="stylesheet" href="with\slashes" precedence="style" />
            foo
          </div>
        );
      }
      root.render(<ClientApp />);
      await waitForAll([]);
      await act(() => {
        loadPreloads();
        loadStylesheets();
      });
      await assertLog([
        'load preload: preload',
        'load preload: with\nnewline',
        'load preload: style"][rel="stylesheet',
        'load stylesheet: style',
        'load stylesheet: with\\slashes',
        'load stylesheet: style"][rel="stylesheet',
      ]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="style" data-precedence="style" />
            <link
              rel="stylesheet"
              href="with\slashes"
              data-precedence="style"
            />
            <link
              rel="stylesheet"
              href={'style"][rel="stylesheet'}
              data-precedence="style"
            />
            <link rel="preload" as="style" href="preload" />
            <link rel="preload" href={'with\nnewline'} as="style" />
            <link rel="preload" href={'style"][rel="stylesheet'} as="style" />
          </head>
          <body>
            <div id="container">
              <div>foo</div>
            </div>
          </body>
        </html>,
      );
    });

    it('escapes hrefs when selecting matching elements in the document when using preload and preinit', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <link rel="preload" href="preload" as="style" />
              <link rel="stylesheet" href="style" precedence="style" />
              <link rel="stylesheet" href="with\slashes" precedence="style" />
              <link rel="preload" href={'with\nnewline'} as="style" />
              <div id="container" />
            </body>
          </html>,
        );
        pipe(writable);
      });

      function App() {
        ReactDOM.preload('preload"][rel="preload', {as: 'style'});
        ReactDOM.preinit('style"][rel="stylesheet', {
          as: 'style',
          precedence: 'style',
        });
        ReactDOM.preinit('with\\slashes', {
          as: 'style',
          precedence: 'style',
        });
        ReactDOM.preload('with\nnewline', {as: 'style'});
        return <div>foo</div>;
      }

      container = document.getElementById('container');
      const root = ReactDOMClient.createRoot(container);
      root.render(<App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="style" data-precedence="style" />
            <link
              rel="stylesheet"
              href="with\slashes"
              data-precedence="style"
            />
            <link
              rel="stylesheet"
              href={'style"][rel="stylesheet'}
              data-precedence="style"
            />
            <link rel="preload" as="style" href="preload" />
            <link rel="preload" href={'with\nnewline'} as="style" />
            <link rel="preload" href={'preload"][rel="preload'} as="style" />
          </head>
          <body>
            <div id="container">
              <div>foo</div>
            </div>
          </body>
        </html>,
      );
    });

    it('does not create stylesheet resources when inside an <svg> context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <svg>
                <path>
                  <link rel="stylesheet" href="foo" precedence="default" />
                </path>
                <foreignObject>
                  <link rel="stylesheet" href="bar" precedence="default" />
                </foreignObject>
              </svg>
            </body>
          </html>,
        );
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="stylesheet" href="bar" data-precedence="default" />
          </head>
          <body>
            <svg>
              <path>
                <link rel="stylesheet" href="foo" precedence="default" />
              </path>
              <foreignobject />
            </svg>
          </body>
        </html>,
      );

      const root = ReactDOMClient.createRoot(document.body);
      root.render(
        <div>
          <svg>
            <path>
              <link rel="stylesheet" href="foo" precedence="default" />
            </path>
            <foreignObject>
              <link rel="stylesheet" href="bar" precedence="default" />
            </foreignObject>
          </svg>
        </div>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div>
          <svg>
            <path>
              <link rel="stylesheet" href="foo" precedence="default" />
            </path>
            <foreignobject />
          </svg>
        </div>,
      );
    });

    it('does not create stylesheet resources when inside a <noscript> context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <noscript>
                <link rel="stylesheet" href="foo" precedence="default" />
              </noscript>
            </body>
          </html>,
        );
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <noscript>
              &lt;link rel="stylesheet" href="foo" precedence="default"&gt;
            </noscript>
          </body>
        </html>,
      );

      const root = ReactDOMClient.createRoot(document.body);
      root.render(
        <div>
          <noscript>
            <link rel="stylesheet" href="foo" precedence="default" />
          </noscript>
        </div>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div>
          {/* On the client, <noscript> never renders children */}
          <noscript />
        </div>,
      );
    });

    it('warns if you provide a `precedence` prop with other props that invalidate the creation of a stylesheet resource', async () => {
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <link rel="stylesheet" precedence="default" />
              <link rel="stylesheet" href="" precedence="default" />
              <link
                rel="stylesheet"
                href="foo"
                precedence="default"
                onLoad={() => {}}
                onError={() => {}}
              />
              <link
                rel="stylesheet"
                href="foo"
                precedence="default"
                onLoad={() => {}}
              />
              <link
                rel="stylesheet"
                href="foo"
                precedence="default"
                onError={() => {}}
              />
              <link
                rel="stylesheet"
                href="foo"
                precedence="default"
                disabled={false}
              />
            </body>
          </html>,
        ).pipe(writable);
      });
      assertConsoleErrorDev(
        [
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and ' +
            'expected the `href` prop to be a non-empty string but ecountered `undefined` instead. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the ' +
            '`precedence` prop ensure there is a non-empty string `href` prop as well, ' +
            'otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and ' +
            'expected the `href` prop to be a non-empty string but ecountered an empty string instead. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the ' +
            '`precedence` prop ensure there is a non-empty string `href` prop as well, ' +
            'otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
          'An empty string ("") was passed to the href attribute. ' +
            'To fix this, either do not render the element at all or ' +
            'pass null to href instead of an empty string.\n' +
            '    in link (at **)',
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and ' +
            '`onLoad` and `onError` props. The presence of loading and error handlers indicates ' +
            'an intent to manage the stylesheet loading state from your from your Component code ' +
            'and React will not hoist or deduplicate this stylesheet. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the ' +
            '`precedence` prop remove the `onLoad` and `onError` props, otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and ' +
            '`onLoad` prop. The presence of loading and error handlers indicates an intent to ' +
            'manage the stylesheet loading state from your from your Component code and ' +
            'React will not hoist or deduplicate this stylesheet. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the ' +
            '`precedence` prop remove the `onLoad` prop, otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and `onError` prop. ' +
            'The presence of loading and error handlers indicates an intent to manage the stylesheet loading state ' +
            'from your from your Component code and React will not hoist or deduplicate this stylesheet. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` ' +
            'prop remove the `onError` prop, otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
          'React encountered a `<link rel="stylesheet" .../>` with a `precedence` prop and a `disabled` prop. ' +
            'The presence of the `disabled` prop indicates an intent to manage the stylesheet active state from ' +
            'your from your Component code and React will not hoist or deduplicate this stylesheet. ' +
            'If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` ' +
            'prop remove the `disabled` prop, otherwise remove the `precedence` prop.\n' +
            '    in link (at **)',
        ].filter(Boolean),
      );

      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <link
              rel="stylesheet"
              href="foo"
              precedence="default"
              onLoad={() => {}}
              onError={() => {}}
            />
          </body>
        </html>,
      );
      await waitForAll([]);
      assertConsoleErrorDev([
        'React encountered a <link rel="stylesheet" href="foo" ... /> with a `precedence` ' +
          'prop that also included the `onLoad` and `onError` props. ' +
          'The presence of loading and error handlers indicates an intent to manage the stylesheet ' +
          'loading state from your from your Component code and React will not hoist or deduplicate this stylesheet. ' +
          'If your intent was to have React hoist and deduplciate this stylesheet using the `precedence` ' +
          'prop remove the `onLoad` and `onError` props, otherwise remove the `precedence` prop.\n' +
          '    in body (at **)',
      ]);
    });

    it('will not block displaying a Suspense boundary on a stylesheet with media that does not match', async () => {
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="block">
                  foo
                  <link
                    rel="stylesheet"
                    href="print"
                    media="print"
                    precedence="print"
                  />
                  <link
                    rel="stylesheet"
                    href="all"
                    media="all"
                    precedence="all"
                  />
                </BlockedOn>
              </Suspense>
              <Suspense fallback="loading...">
                <BlockedOn value="block">
                  bar
                  <link
                    rel="stylesheet"
                    href="print"
                    media="print"
                    precedence="print"
                  />
                  <link
                    rel="stylesheet"
                    href="all"
                    media="all"
                    precedence="all"
                  />
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
        ).pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            {'loading...'}
            {'loading...'}
          </body>
        </html>,
      );

      await act(() => {
        resolveText('block');
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="print"
              media="print"
              data-precedence="print"
            />
            <link
              rel="stylesheet"
              href="all"
              media="all"
              data-precedence="all"
            />
          </head>
          <body>
            {'loading...'}
            {'loading...'}
            <link rel="preload" href="print" media="print" as="style" />
            <link rel="preload" href="all" media="all" as="style" />
          </body>
        </html>,
      );

      await act(() => {
        const allStyle = document.querySelector('link[href="all"]');
        const event = document.createEvent('Events');
        event.initEvent('load', true, true);
        allStyle.dispatchEvent(event);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link
              rel="stylesheet"
              href="print"
              media="print"
              data-precedence="print"
            />
            <link
              rel="stylesheet"
              href="all"
              media="all"
              data-precedence="all"
            />
          </head>
          <body>
            {'foo'}
            {'bar'}
            <link rel="preload" href="print" media="print" as="style" />
            <link rel="preload" href="all" media="all" as="style" />
          </body>
        </html>,
      );
    });
  });

  describe('Style Resource', () => {
    it('treats <style href="..." precedence="..."> elements as a style resource when server rendering', async () => {
      const css = `
body {
  background-color: red;
}`;
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <style href="foo" precedence="foo">
                {css}
              </style>
            </body>
          </html>,
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="foo">
              {css}
            </style>
          </head>
          <body />
        </html>,
      );
    });

    it('can insert style resources as part of a boundary reveal', async () => {
      const cssRed = `
body {
  background-color: red;
}`;
      const cssBlue = `
body {
background-color: blue;
}`;
      const cssGreen = `
body {
background-color: green;
}`;
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="blocked">
                  <style href="foo" precedence="foo">
                    {cssRed}
                  </style>
                  loaded
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>loading...</body>
        </html>,
      );

      await act(() => {
        resolveText('blocked');
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="foo">
              {cssRed}
            </style>
          </head>
          <body>loaded</body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <Suspense fallback="loading...">
              <style href="foo" precedence="foo">
                {cssRed}
              </style>
              loaded
            </Suspense>
          </body>
        </html>,
      );
      await waitForAll([]);

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="foo">
              {cssRed}
            </style>
          </head>
          <body>loaded</body>
        </html>,
      );

      root.render(
        <html>
          <body>
            <Suspense fallback="loading...">
              <style href="foo" precedence="foo">
                {cssRed}
              </style>
              loaded
            </Suspense>
            <style href="bar" precedence="bar">
              {cssBlue}
            </style>
            <style href="baz" precedence="foo">
              {cssGreen}
            </style>
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="foo">
              {cssRed}
            </style>
            <style data-href="baz" data-precedence="foo">
              {cssGreen}
            </style>
            <style data-href="bar" data-precedence="bar">
              {cssBlue}
            </style>
          </head>
          <body>loaded</body>
        </html>,
      );
    });

    it('can emit styles early when a partial boundary flushes', async () => {
      const css = 'body { background-color: red; }';
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Suspense>
                <BlockedOn value="first">
                  <div>first</div>
                  <style href="foo" precedence="default">
                    {css}
                  </style>
                  <BlockedOn value="second">
                    <div>second</div>
                    <style href="bar" precedence="default">
                      {css}
                    </style>
                  </BlockedOn>
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body />
        </html>,
      );

      await act(() => {
        resolveText('first');
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <style data-href="foo" data-precedence="default" media="not all">
              {css}
            </style>
          </body>
        </html>,
      );

      await act(() => {
        resolveText('second');
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="default">
              {css}
            </style>
            <style data-href="bar" data-precedence="default">
              {css}
            </style>
          </head>
          <body>
            <div>first</div>
            <div>second</div>
          </body>
        </html>,
      );
    });

    it('can hoist styles flushed early even when no other style dependencies are flushed on completion', async () => {
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Suspense fallback="loading...">
                <BlockedOn value="first">
                  <style href="foo" precedence="default">
                    some css
                  </style>
                  <div>first</div>
                  <BlockedOn value="second">
                    <div>second</div>
                  </BlockedOn>
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
        ).pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>loading...</body>
        </html>,
      );

      // When we resolve first we flush the style tag because it is ready but we aren't yet ready to
      // flush the entire boundary and reveal it.
      await act(() => {
        resolveText('first');
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            loading...
            <style data-href="foo" data-precedence="default" media="not all">
              some css
            </style>
          </body>
        </html>,
      );

      // When we resolve second we flush the rest of the boundary segments and reveal the boundary. The style tag
      // is hoisted during this reveal process even though no other styles flushed during this tick
      await act(() => {
        resolveText('second');
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo" data-precedence="default">
              some css
            </style>
          </head>
          <body>
            <div>first</div>
            <div>second</div>
          </body>
        </html>,
      );
    });

    it('can emit multiple style rules into a single style tag for a given precedence', async () => {
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <style href="1" precedence="default">
                1
              </style>
              <style href="2" precedence="foo">
                foo2
              </style>
              <style href="3" precedence="default">
                3
              </style>
              <style href="4" precedence="default">
                4
              </style>
              <style href="5" precedence="foo">
                foo5
              </style>
              <div>initial</div>
              <Suspense fallback="loading...">
                <BlockedOn value="first">
                  <style href="6" precedence="default">
                    6
                  </style>
                  <style href="7" precedence="foo">
                    foo7
                  </style>
                  <style href="8" precedence="default">
                    8
                  </style>
                  <style href="9" precedence="default">
                    9
                  </style>
                  <style href="10" precedence="foo">
                    foo10
                  </style>
                  <div>first</div>
                  <BlockedOn value="second">
                    <style href="11" precedence="default">
                      11
                    </style>
                    <style href="12" precedence="foo">
                      foo12
                    </style>
                    <style href="13" precedence="default">
                      13
                    </style>
                    <style href="14" precedence="default">
                      14
                    </style>
                    <style href="15" precedence="foo">
                      foo15
                    </style>
                    <div>second</div>
                  </BlockedOn>
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
        ).pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="1 3 4" data-precedence="default">
              134
            </style>
            <style data-href="2 5" data-precedence="foo">
              foo2foo5
            </style>
          </head>
          <body>
            <div>initial</div>loading...
          </body>
        </html>,
      );

      // When we resolve first we flush the style tag because it is ready but we aren't yet ready to
      // flush the entire boundary and reveal it.
      await act(() => {
        resolveText('first');
      });
      await act(() => {
        resolveText('second');
      });

      // Some sets of styles were ready before the entire boundary and they got emitted as early as they were
      // ready. The remaining styles were ready when the boundary finished and they got grouped as well
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="1 3 4" data-precedence="default">
              134
            </style>
            <style data-href="6 8 9" data-precedence="default">
              689
            </style>
            <style data-href="11 13 14" data-precedence="default">
              111314
            </style>
            <style data-href="2 5" data-precedence="foo">
              foo2foo5
            </style>
            <style data-href="7 10" data-precedence="foo">
              foo7foo10
            </style>
            <style data-href="12 15" data-precedence="foo">
              foo12foo15
            </style>
          </head>
          <body>
            <div>initial</div>
            <div>first</div>
            <div>second</div>
          </body>
        </html>,
      );

      // Client inserted style tags are not grouped together but can hydrate against a grouped set
      ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <style href="1" precedence="default">
              1
            </style>
            <style href="2" precedence="foo">
              foo2
            </style>
            <style href="16" precedence="default">
              16
            </style>
            <style href="17" precedence="default">
              17
            </style>
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="1 3 4" data-precedence="default">
              134
            </style>
            <style data-href="6 8 9" data-precedence="default">
              689
            </style>
            <style data-href="11 13 14" data-precedence="default">
              111314
            </style>
            <style data-href="16" data-precedence="default">
              16
            </style>
            <style data-href="17" data-precedence="default">
              17
            </style>
            <style data-href="2 5" data-precedence="foo">
              foo2foo5
            </style>
            <style data-href="7 10" data-precedence="foo">
              foo7foo10
            </style>
            <style data-href="12 15" data-precedence="foo">
              foo12foo15
            </style>
          </head>
          <body>
            <div>initial</div>
            <div>first</div>
            <div>second</div>
          </body>
        </html>,
      );
    });

    it('warns if you render a <style> with an href with a space on the server', async () => {
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <style href="foo bar" precedence="default">
                style
              </style>
            </body>
          </html>,
        ).pipe(writable);
      });
      assertConsoleErrorDev([
        'React expected the `href` prop for a <style> tag opting into hoisting semantics ' +
          'using the `precedence` prop to not have any spaces but ecountered spaces instead. ' +
          'using spaces in this prop will cause hydration of this style to fail on the client. ' +
          'The href for the <style> where this ocurred is "foo bar".\n' +
          '    in style (at **)',
      ]);
    });

    it('can emit styles with nonce', async () => {
      const nonce = 'R4nD0m';
      const fooCss = '.foo { color: hotpink; }';
      const barCss = '.bar { background-color: blue; }';
      const bazCss = '.baz { border: 1px solid black; }';
      await act(() => {
        renderToPipeableStream(
          <html>
            <body>
              <Suspense>
                <BlockedOn value="first">
                  <div>first</div>
                  <style href="foo" precedence="default" nonce={nonce}>
                    {fooCss}
                  </style>
                  <style href="bar" precedence="default" nonce={nonce}>
                    {barCss}
                  </style>
                  <BlockedOn value="second">
                    <div>second</div>
                    <style href="baz" precedence="default" nonce={nonce}>
                      {bazCss}
                    </style>
                  </BlockedOn>
                </BlockedOn>
              </Suspense>
            </body>
          </html>,
          {nonce: {style: nonce}},
        ).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body />
        </html>,
      );

      await act(() => {
        resolveText('first');
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <style
              data-href="foo bar"
              data-precedence="default"
              media="not all"
              nonce={nonce}>
              {`${fooCss}${barCss}`}
            </style>
          </body>
        </html>,
      );

      await act(() => {
        resolveText('second');
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <style data-href="foo bar" data-precedence="default" nonce={nonce}>
              {`${fooCss}${barCss}`}
            </style>
            <style data-href="baz" data-precedence="default" nonce={nonce}>
              {bazCss}
            </style>
          </head>
          <body>
            <div>first</div>
            <div>second</div>
          </body>
        </html>,
      );
    });
  });

  describe('Script Resources', () => {
    it('treats async scripts without onLoad or onError as Resources', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <head />
            <body>
              <script src="foo" async={true} />
              <script src="bar" async={true} onLoad={() => {}} />
              <script src="baz" data-meaningful="" />
              <script src="qux" defer={true} data-meaningful="" />
              hello world
            </body>
          </html>,
        );
        pipe(writable);
      });
      // The plain async script is converted to a resource and emitted as part of the shell
      // The async script with onLoad is preloaded in the shell but is expecting to be added
      // during hydration. This is novel, the script is NOT a HostHoistable but it also will
      // never hydrate
      // The regular script is just a normal html that should hydrate with a HostComponent
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script src="foo" async="" />
          </head>
          <body>
            <script src="bar" async="" />
            <script src="baz" data-meaningful="" />
            <script src="qux" defer="" data-meaningful="" />
            hello world
          </body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <head />
          <body>
            <script src="foo" async={true} />
            <script src="bar" async={true} onLoad={() => {}} />
            <script src="baz" data-meaningful="" />
            <script src="qux" defer={true} data-meaningful="" />
            hello world
          </body>
        </html>,
      );
      await waitForAll([]);
      // The async script with onLoad is inserted in the right place but does not cause the hydration
      // to fail.
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script src="foo" async="" />
          </head>
          <body>
            <script src="bar" async="" />
            <script src="baz" data-meaningful="" />
            <script src="qux" defer="" data-meaningful="" />
            hello world
          </body>
        </html>,
      );

      root.unmount();
      // When we unmount we expect to retain singletons and any content that is not cleared within them.
      // The foo script is a resource so it sticks around. The other scripts are regular HostComponents
      // so they unmount and are removed from the DOM.
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script src="foo" async="" />
          </head>
          <body />
        </html>,
      );
    });

    it('does not create script resources when inside an <svg> context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <svg>
                <path>
                  <script async={true} src="foo" />
                </path>
                <foreignObject>
                  <script async={true} src="bar" />
                </foreignObject>
              </svg>
            </body>
          </html>,
        );
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <script async="" src="bar" />
          </head>
          <body>
            <svg>
              <path>
                <script async="" src="foo" />
              </path>
              <foreignobject />
            </svg>
          </body>
        </html>,
      );

      const root = ReactDOMClient.createRoot(document.body);
      root.render(
        <div>
          <svg>
            <path>
              <script async={true} src="foo" />
            </path>
            <foreignObject>
              <script async={true} src="bar" />
            </foreignObject>
          </svg>
        </div>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div>
          <svg>
            <path>
              <script async="" src="foo" />
            </path>
            <foreignobject />
          </svg>
        </div>,
      );
    });

    it('does not create script resources when inside a <noscript> context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <noscript>
                <script async={true} src="foo" />
              </noscript>
            </body>
          </html>,
        );
        pipe(writable);
      });
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <noscript>
              &lt;script async="" src="foo"&gt;&lt;/script&gt;
            </noscript>
          </body>
        </html>,
      );

      const root = ReactDOMClient.createRoot(document.body);
      root.render(
        <div>
          <noscript>
            <script async={true} src="foo" />
          </noscript>
        </div>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document.body)).toEqual(
        <div>
          {/* On the client, <noscript> never renders children */}
          <noscript />
        </div>,
      );
    });
  });

  describe('Hoistables', () => {
    it('can hoist meta tags on the server and hydrate them on the client', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <meta name="foo" data-foo="data" content="bar" />
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <meta name="foo" data-foo="data" content="bar" />
          </head>
          <body />
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <meta name="foo" data-foo="data" content="bar" />
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <meta name="foo" data-foo="data" content="bar" />
          </head>
          <body />
        </html>,
      );

      root.render(
        <html>
          <body />
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body />
        </html>,
      );
    });

    it('can hoist meta tags on the client', async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <meta name="foo" data-foo="data" content="bar" />
          </div>,
        );
      });
      await waitForAll([]);

      expect(getMeaningfulChildren(document.head)).toEqual(
        <meta name="foo" data-foo="data" content="bar" />,
      );
      expect(getMeaningfulChildren(container)).toEqual(<div />);

      root.render(<div />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document.head)).toEqual(undefined);
    });

    it('can hoist link (non-stylesheet) tags on the server and hydrate them on the client', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <link rel="foo" data-foo="data" href="foo" />
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="foo" data-foo="data" href="foo" />
          </head>
          <body />
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <link rel="foo" data-foo="data" href="foo" />
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="foo" data-foo="data" href="foo" />
          </head>
          <body />
        </html>,
      );

      root.render(
        <html>
          <body />
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body />
        </html>,
      );
    });

    it('can hoist link (non-stylesheet) tags on the client', async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <link rel="foo" data-foo="data" href="foo" />
          </div>,
        );
      });
      await waitForAll([]);

      expect(getMeaningfulChildren(document.head)).toEqual(
        <link rel="foo" data-foo="data" href="foo" />,
      );
      expect(getMeaningfulChildren(container)).toEqual(<div />);

      root.render(<div />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document.head)).toEqual(undefined);
    });

    it('can hoist title tags on the server and hydrate them on the client', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <title data-foo="foo">a title</title>
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <title data-foo="foo">a title</title>
          </head>
          <body />
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <html>
          <body>
            <title data-foo="foo">a title</title>
          </body>
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <title data-foo="foo">a title</title>
          </head>
          <body />
        </html>,
      );

      root.render(
        <html>
          <body />
        </html>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body />
        </html>,
      );
    });

    it('can hoist title tags on the client', async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(
          <div>
            <title data-foo="foo">a title</title>
          </div>,
        );
      });
      await waitForAll([]);

      expect(getMeaningfulChildren(document.head)).toEqual(
        <title data-foo="foo">a title</title>,
      );
      expect(getMeaningfulChildren(container)).toEqual(<div />);

      root.render(<div />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document.head)).toEqual(undefined);
    });

    it('prioritizes ordering for certain hoistables over others when rendering on the server', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <link rel="foo" href="foo" />
              <meta name="bar" />
              <title>a title</title>
              <link rel="preload" href="foo" as="style" />
              <link rel="preconnect" href="bar" />
              <link rel="dns-prefetch" href="baz" />
              <meta name="viewport" />
              <meta charSet="utf-8" />
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            {/* charset first */}
            <meta charset="utf-8" />
            {/* viewport meta next */}
            <meta name="viewport" />
            {/* Everything else last */}
            <link rel="foo" href="foo" />
            <meta name="bar" />
            <title>a title</title>
            <link rel="preload" href="foo" as="style" />
            <link rel="preconnect" href="bar" />
            <link rel="dns-prefetch" href="baz" />
          </head>
          <body />
        </html>,
      );
    });

    it('supports rendering hoistables outside of <html> scope', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <>
            <meta name="before" />
            <html>
              <body>foo</body>
            </html>
            <meta name="after" />
          </>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <meta name="before" />
            <meta name="after" />
          </head>
          <body>foo</body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(
        document,
        <>
          <meta name="before" />
          <html>
            <body>foo</body>
          </html>
          <meta name="after" />
        </>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <meta name="before" />
            <meta name="after" />
          </head>
          <body>foo</body>
        </html>,
      );

      root.render(
        <>
          {null}
          <html>
            <body>foo</body>
          </html>
          {null}
        </>,
      );
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>foo</body>
        </html>,
      );
    });

    it('can hydrate hoistable tags inside late suspense boundaries', async () => {
      function App() {
        return (
          <html>
            <body>
              <link rel="rel1" href="linkhref" />
              <link rel="rel2" href="linkhref" />
              <meta name="name1" content="metacontent" />
              <meta name="name2" content="metacontent" />
              <Suspense fallback="loading...">
                <link rel="rel3" href="linkhref" />
                <link rel="rel4" href="linkhref" />
                <meta name="name3" content="metacontent" />
                <meta name="name4" content="metacontent" />
                <BlockedOn value="release">
                  <link rel="rel5" href="linkhref" />
                  <link rel="rel6" href="linkhref" />
                  <meta name="name5" content="metacontent" />
                  <meta name="name6" content="metacontent" />
                  <div>hello world</div>
                </BlockedOn>
              </Suspense>
            </body>
          </html>
        );
      }
      await act(() => {
        renderToPipeableStream(<App />).pipe(writable);
      });

      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="rel1" href="linkhref" />
            <link rel="rel2" href="linkhref" />
            <meta name="name1" content="metacontent" />
            <meta name="name2" content="metacontent" />
            <link rel="rel3" href="linkhref" />
            <link rel="rel4" href="linkhref" />
            <meta name="name3" content="metacontent" />
            <meta name="name4" content="metacontent" />
          </head>
          <body>loading...</body>
        </html>,
      );

      const root = ReactDOMClient.hydrateRoot(document, <App />);
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="rel1" href="linkhref" />
            <link rel="rel2" href="linkhref" />
            <meta name="name1" content="metacontent" />
            <meta name="name2" content="metacontent" />
            <link rel="rel3" href="linkhref" />
            <link rel="rel4" href="linkhref" />
            <meta name="name3" content="metacontent" />
            <meta name="name4" content="metacontent" />
          </head>
          <body>loading...</body>
        </html>,
      );

      const thirdPartyLink = document.createElement('link');
      thirdPartyLink.setAttribute('href', 'linkhref');
      thirdPartyLink.setAttribute('rel', '3rdparty');
      document.body.prepend(thirdPartyLink);

      const thirdPartyMeta = document.createElement('meta');
      thirdPartyMeta.setAttribute('content', 'metacontent');
      thirdPartyMeta.setAttribute('name', '3rdparty');
      document.body.prepend(thirdPartyMeta);

      await act(() => {
        resolveText('release');
      });
      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <link rel="rel1" href="linkhref" />
            <link rel="rel2" href="linkhref" />
            <meta name="name1" content="metacontent" />
            <meta name="name2" content="metacontent" />
            <link rel="rel3" href="linkhref" />
            <link rel="rel4" href="linkhref" />
            <meta name="name3" content="metacontent" />
            <meta name="name4" content="metacontent" />
          </head>
          <body>
            <meta name="3rdparty" content="metacontent" />
            <link rel="3rdparty" href="linkhref" />
            <div>hello world</div>
            <link rel="rel5" href="linkhref" />
            <link rel="rel6" href="linkhref" />
            <meta name="name5" content="metacontent" />
            <meta name="name6" content="metacontent" />
          </body>
        </html>,
      );

      root.unmount();
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head />
          <body>
            <meta name="3rdparty" content="metacontent" />
            <link rel="3rdparty" href="linkhref" />
          </body>
        </html>,
      );
    });

    it('does not hoist inside an <svg> context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <svg>
                <title>svg title</title>
                <link rel="svg link" href="a" />
                <meta name="svg meta" />
                <path>
                  <title>deep svg title</title>
                  <meta name="deep svg meta" />
                  <link rel="deep svg link" href="a" />
                </path>
                <foreignObject>
                  <title>hoistable title</title>
                  <meta name="hoistable" />
                  <link rel="hoistable" href="a" />
                </foreignObject>
              </svg>
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document.head)).toEqual([
        <title>hoistable title</title>,
        <meta name="hoistable" />,
        <link rel="hoistable" href="a" />,
      ]);
    });

    it('does not hoist inside noscript context', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <html>
            <body>
              <title>title</title>
              <link rel="link" href="a" />
              <meta name="meta" />
              <noscript>
                <title>noscript title</title>
                <link rel="noscript link" href="a" />
                <meta name="noscript meta" />
              </noscript>
            </body>
          </html>,
        );
        pipe(writable);
      });

      expect(getMeaningfulChildren(document.head)).toEqual([
        <title>title</title>,
        <link rel="link" href="a" />,
        <meta name="meta" />,
      ]);
    });

    it('can render a title before a singleton even if that singleton clears its contents', async () => {
      await act(() => {
        const {pipe} = renderToPipeableStream(
          <>
            <title>foo</title>
            <html>
              <head />
              <body>
                <div>server</div>
              </body>
            </html>
          </>,
        );
        pipe(writable);
      });

      const errors = [];
      ReactDOMClient.hydrateRoot(
        document,
        <>
          <title>foo</title>
          <html>
            <head />
            <body>
              <div>client</div>
            </body>
          </html>
        </>,
        {
          onRecoverableError(err) {
            errors.push(err.message);
          },
        },
      );

      await waitForAll([]);
      expect(getMeaningfulChildren(document)).toEqual(
        <html>
          <head>
            <title>foo</title>
          </head>
          <body>
            <div>client</div>
          </body>
        </html>,
      );
    });

    it('can update title tags', async () => {
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<title data-foo="foo">a title</title>);
      });
      await waitForAll([]);

      expect(getMeaningfulChildren(document.head)).toEqual(
        <title data-foo="foo">a title</title>,
      );

      await act(() => {
        root.render(<title data-foo="bar">another title</title>);
      });
      await waitForAll([]);
      expect(getMeaningfulChildren(document.head)).toEqual(
        <title data-foo="bar">another title</title>,
      );
    });
  });

  it('does not outline a boundary with suspensey CSS when flushing the shell', async () => {
    // When flushing the shell, stylesheets with precedence are emitted in the
    // <head> which blocks paint anyway. So there's no benefit to outlining the
    // boundary — it would just show a higher-level fallback unnecessarily.
    // Instead, the boundary should be inlined so the innermost fallback is shown.
    let streamedContent = '';
    writable.on('data', chunk => (streamedContent += chunk));

    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Suspense fallback="Outer Fallback">
              <Suspense fallback="Middle Fallback">
                <link rel="stylesheet" href="style.css" precedence="default" />
                <Suspense fallback="Inner Fallback">
                  <BlockedOn value="content">Async Content</BlockedOn>
                </Suspense>
              </Suspense>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    // The middle boundary should have been inlined (not outlined) so the
    // middle fallback text should never appear in the streamed HTML.
    expect(streamedContent).not.toContain('Middle Fallback');

    // The stylesheet is in the head (blocks paint), and the innermost
    // fallback is visible.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="style.css" data-precedence="default" />
        </head>
        <body>Inner Fallback</body>
      </html>,
    );

    // Resolve the async content — streams in without needing to load CSS
    // since the stylesheet was already in the head.
    await act(() => {
      resolveText('content');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="style.css" data-precedence="default" />
        </head>
        <body>Async Content</body>
      </html>,
    );
  });

  it('outlines a boundary with suspensey CSS when flushing a streamed completion', async () => {
    // When a boundary completes via streaming (not as part of the shell),
    // suspensey CSS should cause the boundary to be outlined. The parent
    // content can show sooner while the CSS loads separately.
    let streamedContent = '';
    writable.on('data', chunk => (streamedContent += chunk));

    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <Suspense fallback="Root Fallback">
              <BlockedOn value="shell">
                <Suspense fallback="Outer Fallback">
                  <Suspense fallback="Middle Fallback">
                    <link
                      rel="stylesheet"
                      href="style.css"
                      precedence="default"
                    />
                    <Suspense fallback="Inner Fallback">
                      <BlockedOn value="content">Async Content</BlockedOn>
                    </Suspense>
                  </Suspense>
                </Suspense>
              </BlockedOn>
            </Suspense>
          </body>
        </html>,
      ).pipe(writable);
    });

    // Shell is showing root fallback
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head />
        <body>Root Fallback</body>
      </html>,
    );

    // Unblock the shell — content streams in. The middle boundary should
    // be outlined because the CSS arrived via streaming, not in the shell head.
    streamedContent = '';
    await act(() => {
      resolveText('shell');
    });

    // The middle fallback should appear in the streamed HTML because the
    // boundary was outlined.
    expect(streamedContent).toContain('Middle Fallback');

    // The CSS needs to load before the boundary reveals. Until then
    // the middle fallback is visible.
    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="style.css" data-precedence="default" />
        </head>
        <body>
          {'Middle Fallback'}
          <link rel="preload" href="style.css" as="style" />
        </body>
      </html>,
    );

    // Load the stylesheet — now the middle boundary can reveal
    await act(() => {
      loadStylesheets();
    });
    assertLog(['load stylesheet: style.css']);

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="style.css" data-precedence="default" />
        </head>
        <body>
          {'Inner Fallback'}
          <link rel="preload" href="style.css" as="style" />
        </body>
      </html>,
    );

    // Resolve the async content
    await act(() => {
      resolveText('content');
    });

    expect(getMeaningfulChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="style.css" data-precedence="default" />
        </head>
        <body>
          {'Async Content'}
          <link rel="preload" href="style.css" as="style" />
        </body>
      </html>,
    );
  });

  // @gate enableViewTransition
  it('still outlines a boundary with a suspensey image inside a ViewTransition when flushing the shell', async () => {
    // Unlike stylesheets (which block paint from the <head> anyway), images
    // inside ViewTransitions are outlined to enable animation reveals. This
    // should happen even during the shell flush.
    const ViewTransition = React.ViewTransition;

    let streamedContent = '';
    writable.on('data', chunk => (streamedContent += chunk));

    await act(() => {
      renderToPipeableStream(
        <html>
          <body>
            <ViewTransition>
              <Suspense fallback="Image Fallback">
                <link rel="stylesheet" href="style.css" precedence="default" />
                <img src="large-image.jpg" />
                <div>Content</div>
              </Suspense>
            </ViewTransition>
          </body>
        </html>,
      ).pipe(writable);
    });

    // The boundary should be outlined because the suspensey image motivates
    // outlining for animation reveals, even during the shell flush.
    expect(streamedContent).toContain('Image Fallback');
  });
});
