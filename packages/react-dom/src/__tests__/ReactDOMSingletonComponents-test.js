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

let JSDOM;
let Stream;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactDOMFizzServer;
let document;
let writable;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;
let waitForAll;
let assertConsoleErrorDev;

function normalizeError(msg) {
  // Take the first sentence to make it easier to assert on.
  const idx = msg.indexOf('.');
  if (idx > -1) {
    return msg.slice(0, idx + 1);
  }
  return msg;
}

describe('ReactDOM HostSingleton', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzServer = require('react-dom/server');
    Stream = require('stream');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;

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

  async function actIntoEmptyDocument(callback) {
    await callback();
    // Await one turn around the event loop.
    // This assumes that we'll flush everything we have so far.
    await new Promise(resolve => {
      setImmediate(resolve);
    });
    if (hasErrored) {
      throw fatalError;
    }

    const bufferedContent = buffer;
    buffer = '';

    const jsdom = new JSDOM(bufferedContent, {
      runScripts: 'dangerously',
    });
    document = jsdom.window.document;
    container = document;
  }

  function getVisibleChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        const el: Element = (node: any);
        if (
          (el.tagName !== 'SCRIPT' &&
            el.tagName !== 'TEMPLATE' &&
            el.tagName !== 'template' &&
            !el.hasAttribute('hidden') &&
            !el.hasAttribute('aria-hidden') &&
            // Ignore the render blocking expect
            (node.getAttribute('rel') !== 'expect' ||
              node.getAttribute('blocking') !== 'render')) ||
          el.hasAttribute('data-meaningful')
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
          props.children = getVisibleChildren(node);
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

  it('warns if you render the same singleton twice at the same time', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <head lang="en">
          <title>Hello</title>
        </head>
        <body />
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="en">
          <title>Hello</title>
        </head>
        <body />
      </html>,
    );
    root.render(
      <html>
        <head lang="en">
          <title>Hello</title>
        </head>
        <head lang="es" data-foo="foo">
          <title>Hola</title>
        </head>
        <body />
      </html>,
    );
    await waitForAll([]);
    assertConsoleErrorDev([
      'You are mounting a new head component when a previous one has not first unmounted. ' +
        'It is an error to render more than one head component at a time and attributes and ' +
        'children of these components will likely fail in unpredictable ways. ' +
        'Please only render a single instance of <head> and if you need to mount a new one, ' +
        'ensure any previous ones have unmounted first.\n' +
        '    in head (at **)',
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="es" data-foo="foo">
          <title>Hola</title>
          <title>Hello</title>
        </head>
        <body />
      </html>,
    );

    root.render(
      <html>
        {null}
        {null}
        <head lang="fr">
          <title>Bonjour</title>
        </head>
        <body />
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="fr">
          <title>Bonjour</title>
        </head>
        <body />
      </html>,
    );

    root.render(
      <html>
        <head lang="en">
          <title>Hello</title>
        </head>
        <body />
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head lang="en">
          <title>Hello</title>
        </head>
        <body />
      </html>,
    );
  });

  it('renders into html, head, and body persistently so the node identities never change and extraneous styles are retained', async () => {
    // Server render some html that will get replaced with a client render
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html data-foo="foo">
          <head data-bar="bar">
            <link rel="stylesheet" href="resource" />
            <title>a server title</title>
            <link rel="stylesheet" href="3rdparty" />
            <link rel="stylesheet" href="3rdparty2" />
          </head>
          <body data-baz="baz">
            <div>hello world</div>
            <style>
              {`
                body: {
                  background-color: red;
                }`}
            </style>
            <div>goodbye</div>
          </body>
        </html>,
      );
      pipe(writable);
    });
    expect(getVisibleChildren(document)).toEqual(
      <html data-foo="foo">
        <head data-bar="bar">
          <title>a server title</title>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
        </head>
        <body data-baz="baz">
          <div>hello world</div>
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
          <div>goodbye</div>
        </body>
      </html>,
    );
    const {documentElement, head, body} = document;
    const persistentElements = [documentElement, head, body];

    // Render into the document completely different html. Observe that styles
    // are retained as are html, body, and head referential identities. Because this was
    // server rendered and we are not hydrating we lose the semantic placement of the original
    // head contents and everything gets prepended. In a future update we might emit an insertion
    // edge from the server and make client rendering reslilient to interstitial placement
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html data-client-foo="foo">
        <head>
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <div>hello client</div>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    // Similar to Hydration we don't reset attributes on the instance itself even on a fresh render.
    expect(getVisibleChildren(document)).toEqual(
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
          <div>hello client</div>
        </body>
      </html>,
    );

    // Render new children and assert they append in the correct locations
    root.render(
      <html data-client-foo="foo">
        <head>
          <title>a client title</title>
          <meta />
        </head>
        <body data-client-baz="baz">
          <p>hello client again</p>
          <div>hello client</div>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
          <title>a client title</title>
          <meta />
        </head>
        <body data-client-baz="baz">
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
          <p>hello client again</p>
          <div>hello client</div>
        </body>
      </html>,
    );

    // Remove some children
    root.render(
      <html data-client-foo="foo">
        <head>
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <p>hello client again</p>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
          <p>hello client again</p>
        </body>
      </html>,
    );

    // Remove a persistent component
    // @TODO figure out whether to clean up attributes. restoring them is likely
    // not possible.
    root.render(
      <html data-client-foo="foo">
        <head>
          <title>a client title</title>
        </head>
      </html>,
    );
    await waitForAll([]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
          <title>a client title</title>
        </head>
        <body>
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
        </body>
      </html>,
    );

    // unmount the root
    root.unmount();
    await waitForAll([]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
        </head>
        <body>
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
        </body>
      </html>,
    );

    // Now let's hydrate the document with known mismatching content
    // We assert that the identities of html, head, and body still haven't changed
    // and that the embedded styles are still retained
    const hydrationErrors = [];
    let hydrateRoot = ReactDOMClient.hydrateRoot(
      document,
      <html data-client-foo="foo">
        <head>
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <div>hello client</div>
        </body>
      </html>,
      {
        onRecoverableError(error, errorInfo) {
          hydrationErrors.push([
            normalizeError(error.message),
            errorInfo.componentStack
              ? errorInfo.componentStack.split('\n')[1].trim()
              : null,
          ]);
        },
      },
    );
    await waitForAll([]);
    expect(hydrationErrors).toEqual([
      [
        "Hydration failed because the server rendered HTML didn't match the client.",
        'at div (<anonymous>)',
      ],
    ]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
          <title>a client title</title>
        </head>
        <body data-client-baz="baz">
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
          <div>hello client</div>
        </body>
      </html>,
    );

    // Reset the tree
    hydrationErrors.length = 0;
    hydrateRoot.unmount();

    // Now we try hydrating again with matching nodes and we ensure
    // the retained styles are bound to the hydrated fibers
    const link = document.querySelector('link[rel="stylesheet"]');
    const style = document.querySelector('style');
    hydrateRoot = ReactDOMClient.hydrateRoot(
      document,
      <html data-client-foo="foo">
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
        </head>
        <body data-client-baz="baz">
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
        </body>
      </html>,
      {
        onRecoverableError(error, errorInfo) {
          hydrationErrors.push([
            error.message,
            errorInfo.componentStack
              ? errorInfo.componentStack.split('\n')[1].trim()
              : null,
          ]);
        },
      },
    );
    expect(hydrationErrors).toEqual([]);
    await waitForAll([]);
    assertConsoleErrorDev([
      "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. " +
        "This won't be patched up. This can happen if a SSR-ed Client Component used:\n" +
        '\n' +
        "- A server/client branch `if (typeof window !== 'undefined')`.\n" +
        "- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.\n" +
        "- Date formatting in a user's locale which doesn't match the server.\n" +
        '- External changing data without sending a snapshot of it along with the HTML.\n' +
        '- Invalid HTML tag nesting.\n\nIt can also happen if the client has a browser extension installed ' +
        'which messes with the HTML before React loaded.\n' +
        '\n' +
        'https://react.dev/link/hydration-mismatch\n' +
        '\n' +
        '  <html\n' +
        '+   data-client-foo="foo"\n' +
        '-   data-client-foo={null}\n' +
        '  >\n' +
        '    <head>\n' +
        '    <body\n' +
        '+     data-client-baz="baz"\n' +
        '-     data-client-baz={null}\n' +
        '    >\n' +
        '\n    in body (at **)',
    ]);
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect([link, style]).toEqual([
      document.querySelector('link[rel="stylesheet"]'),
      document.querySelector('style'),
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="resource" />
          <link rel="stylesheet" href="3rdparty" />
          <link rel="stylesheet" href="3rdparty2" />
        </head>
        <body>
          <style>
            {`
                body: {
                  background-color: red;
                }`}
          </style>
        </body>
      </html>,
    );

    // We unmount a final time and observe that still we retain our persistent nodes
    // but they style contents which matched in hydration is removed
    hydrateRoot.unmount();
    expect(persistentElements).toEqual([
      document.documentElement,
      document.head,
      document.body,
    ]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body />
      </html>,
    );
  });

  // This test is not supported in this implementation. If we reintroduce insertion edge we should revisit
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('is able to maintain insertions in head and body between tree-adjacent Nodes', async () => {
    // Server render some html and hydrate on the client
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <head>
            <title>title</title>
          </head>
          <body>
            <div>hello</div>
          </body>
        </html>,
      );
      pipe(writable);
    });
    const root = ReactDOMClient.hydrateRoot(
      document,
      <html>
        <head>
          <title>title</title>
        </head>
        <body>
          <div>hello</div>
        </body>
      </html>,
    );
    await waitForAll([]);

    // We construct and insert some artificial stylesheets mimicking what a 3rd party script might do
    // In the future we could hydrate with these already in the document but the rules are restrictive
    // still so it would fail and fall back to client rendering
    const [a, b, c, d, e, f, g, h] = 'abcdefgh'.split('').map(letter => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = letter;
      return link;
    });

    const head = document.head;
    const title = head.firstChild;
    head.insertBefore(a, title);
    head.insertBefore(b, title);
    head.appendChild(c);
    head.appendChild(d);

    const bodyContent = document.body.firstChild;
    const body = document.body;
    body.insertBefore(e, bodyContent);
    body.insertBefore(f, bodyContent);
    body.appendChild(g);
    body.appendChild(h);

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="a" />
          <link rel="stylesheet" href="b" />
          <title>title</title>
          <link rel="stylesheet" href="c" />
          <link rel="stylesheet" href="d" />
        </head>
        <body>
          <link rel="stylesheet" href="e" />
          <link rel="stylesheet" href="f" />
          <div>hello</div>
          <link rel="stylesheet" href="g" />
          <link rel="stylesheet" href="h" />
        </body>
      </html>,
    );

    // Unmount head and change children of body
    root.render(
      <html>
        {null}
        <body>
          <div>hello</div>
          <div>world</div>
        </body>
      </html>,
    );

    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="a" />
          <link rel="stylesheet" href="b" />
          <link rel="stylesheet" href="c" />
          <link rel="stylesheet" href="d" />
        </head>
        <body>
          <link rel="stylesheet" href="e" />
          <link rel="stylesheet" href="f" />
          <div>hello</div>
          <div>world</div>
          <link rel="stylesheet" href="g" />
          <link rel="stylesheet" href="h" />
        </body>
      </html>,
    );

    // Mount new head and unmount body
    root.render(
      <html>
        <head>
          <title>a new title</title>
        </head>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <title>a new title</title>
          <link rel="stylesheet" href="a" />
          <link rel="stylesheet" href="b" />
          <link rel="stylesheet" href="c" />
          <link rel="stylesheet" href="d" />
        </head>
        <body>
          <link rel="stylesheet" href="e" />
          <link rel="stylesheet" href="f" />
          <link rel="stylesheet" href="g" />
          <link rel="stylesheet" href="h" />
        </body>
      </html>,
    );
  });

  it('clears persistent head and body when html is the container', async () => {
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <head>
            <link rel="stylesheet" href="headbefore" />
            <title>this should be removed</title>
            <link rel="stylesheet" href="headafter" />
            <script data-meaningful="">true</script>
          </head>
          <body>
            <link rel="stylesheet" href="bodybefore" />
            <div>this should be removed</div>
            <link rel="stylesheet" href="bodyafter" />
            <script data-meaningful="">true</script>
          </body>
        </html>,
      );
      pipe(writable);
    });
    container = document.documentElement;

    const root = ReactDOMClient.createRoot(container);
    root.render(
      <>
        <head>
          <title>something new</title>
        </head>
        <body>
          <div>something new</div>
        </body>
      </>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="headbefore" />
          <link rel="stylesheet" href="headafter" />
          <script data-meaningful="">true</script>
          <title>something new</title>
        </head>
        <body>
          <link rel="stylesheet" href="bodybefore" />
          <link rel="stylesheet" href="bodyafter" />
          <script data-meaningful="">true</script>
          <div>something new</div>
        </body>
      </html>,
    );
  });

  it('clears persistent head when it is the container', async () => {
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <head>
            <link rel="stylesheet" href="before" />
            <title>this should be removed</title>
            <link rel="stylesheet" href="after" />
          </head>
          <body />
        </html>,
      );
      pipe(writable);
    });
    container = document.head;

    const root = ReactDOMClient.createRoot(container);
    root.render(<title>something new</title>);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head>
          <link rel="stylesheet" href="before" />
          <link rel="stylesheet" href="after" />
          <title>something new</title>
        </head>
        <body />
      </html>,
    );
  });

  it('clears persistent body when it is the container', async () => {
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <head />
          <body>
            <link rel="stylesheet" href="before" />
            <div>this should be removed</div>
            <link rel="stylesheet" href="after" />
          </body>
        </html>,
      );
      pipe(writable);
    });
    container = document.body;

    const root = ReactDOMClient.createRoot(container);
    root.render(<div>something new</div>);
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <link rel="stylesheet" href="before" />
          <link rel="stylesheet" href="after" />
          <div>something new</div>
        </body>
      </html>,
    );
  });

  it('renders single Text children into HostSingletons correctly', async () => {
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <head />
          <body>foo</body>
        </html>,
      );
      pipe(writable);
    });

    let root = ReactDOMClient.hydrateRoot(
      document,
      <html>
        <head />
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );

    root.render(
      <html>
        <head />
        <body>bar</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>bar</body>
      </html>,
    );

    root.unmount();

    root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <head />
        <body>baz</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>baz</body>
      </html>,
    );
  });

  it('supports going from single text child to many children back to single text child in body', async () => {
    const root = ReactDOMClient.createRoot(document);
    root.render(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );

    root.render(
      <html>
        <head />
        <body>
          <div>foo</div>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>foo</div>
        </body>
      </html>,
    );

    root.render(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );

    root.render(
      <html>
        <head />
        <body>
          <div>foo</div>
        </body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>
          <div>foo</div>
        </body>
      </html>,
    );
  });

  it('allows for hydrating without a head', async () => {
    await actIntoEmptyDocument(() => {
      const {pipe} = ReactDOMFizzServer.renderToPipeableStream(
        <html>
          <body>foo</body>
        </html>,
      );
      pipe(writable);
    });

    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );

    ReactDOMClient.hydrateRoot(
      document,
      <html>
        <body>foo</body>
      </html>,
    );
    await waitForAll([]);
    expect(getVisibleChildren(document)).toEqual(
      <html>
        <head />
        <body>foo</body>
      </html>,
    );
  });

  // https://github.com/facebook/react/issues/26128
  // @gate !disableLegacyMode
  it('(#26128) does not throw when rendering at body in legacy mode', async () => {
    ReactDOM.render(<div />, document.body);
  });

  // https://github.com/facebook/react/issues/26128
  // @gate !disableLegacyMode
  it('(#26128) does not throw when rendering at <html> in legacy mode', async () => {
    ReactDOM.render(<body />, document.documentElement);
  });

  // https://github.com/facebook/react/issues/26128
  // @gate !disableLegacyMode
  it('(#26128) does not throw when rendering at document in legacy mode', async () => {
    ReactDOM.render(<html />, document);
  });
});
