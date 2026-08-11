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
let ReactDOMFizzStatic;
let Suspense;
let textCache;
let document;
let writable;
let container;
let buffer = '';
let hasErrored = false;
let fatalError = undefined;

describe('ReactDOMFizzStatic', () => {
  beforeEach(() => {
    jest.resetModules();
    JSDOM = require('jsdom').JSDOM;
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMFizzStatic = require('react-dom/static');
    Stream = require('stream');
    Suspense = React.Suspense;

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
    const bufferedContent = buffer;
    buffer = '';
    const fakeBody = document.createElement('body');
    fakeBody.innerHTML = bufferedContent;
    while (fakeBody.firstChild) {
      const node = fakeBody.firstChild;
      if (node.nodeName === 'SCRIPT') {
        const script = document.createElement('script');
        script.textContent = node.textContent;
        for (let i = 0; i < node.attributes.length; i++) {
          const attribute = node.attributes[i];
          script.setAttribute(attribute.name, attribute.value);
        }
        fakeBody.removeChild(node);
        container.appendChild(script);
      } else {
        container.appendChild(node);
      }
    }
  }

  function getVisibleChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          (node.tagName !== 'SCRIPT' || node.hasAttribute('type')) &&
          node.tagName !== 'TEMPLATE' &&
          node.tagName !== 'template' &&
          !node.hasAttribute('hidden') &&
          !node.hasAttribute('aria-hidden') &&
          // Ignore the render blocking expect
          (node.getAttribute('rel') !== 'expect' ||
            node.getAttribute('blocking') !== 'render')
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

  /*
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
  */

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

  it('should render a fully static document, send it and then hydrate it', async () => {
    function App() {
      return (
        <div>
          <Suspense fallback={<Text text="Loading..." />}>
            <AsyncText text="Hello" />
          </Suspense>
        </div>
      );
    }

    const promise = ReactDOMFizzStatic.prerenderToNodeStream(<App />);

    resolveText('Hello');

    const result = await promise;

    expect(result.postponed).toBe(null);

    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);

    await act(async () => {
      ReactDOMClient.hydrateRoot(container, <App />);
    });

    expect(getVisibleChildren(container)).toEqual(<div>Hello</div>);
  });

  it('should support importMap option', async () => {
    const importMap = {
      foo: 'path/to/foo.js',
    };
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(
      <html>
        <body>hello world</body>
      </html>,
      {importMap},
    );

    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual([
      <script type="importmap">{JSON.stringify(importMap)}</script>,
      'hello world',
    ]);
  });

  it('supports onHeaders', async () => {
    let headers;
    function onHeaders(x) {
      headers = x;
    }

    function App() {
      ReactDOM.preload('image', {as: 'image', fetchPriority: 'high'});
      ReactDOM.preload('font', {as: 'font'});
      return (
        <html>
          <body>hello</body>
        </html>
      );
    }

    const result = await ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      onHeaders,
    });
    expect(headers).toEqual({
      Link: `
<font>; rel=preload; as="font"; crossorigin="",
 <image>; rel=preload; as="image"; fetchpriority="high"
`
        .replaceAll('\n', '')
        .trim(),
    });

    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual('hello');
  });

  it('will prerender Suspense fallbacks before children', async () => {
    const values = [];
    function Indirection({children}) {
      values.push(children);
      return children;
    }

    function App() {
      return (
        <div>
          <Suspense
            fallback={
              <div>
                <Indirection>outer loading...</Indirection>
              </div>
            }>
            <Suspense
              fallback={
                <div>
                  <Indirection>first inner loading...</Indirection>
                </div>
              }>
              <div>
                <Indirection>hello world</Indirection>
              </div>
            </Suspense>
            <Suspense
              fallback={
                <div>
                  <Indirection>second inner loading...</Indirection>
                </div>
              }>
              <div>
                <Indirection>goodbye world</Indirection>
              </div>
            </Suspense>
          </Suspense>
        </div>
      );
    }

    const result = await ReactDOMFizzStatic.prerenderToNodeStream(<App />);

    expect(values).toEqual([
      'outer loading...',
      'first inner loading...',
      'second inner loading...',
      'hello world',
      'goodbye world',
    ]);

    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>hello world</div>
        <div>goodbye world</div>
      </div>,
    );
  });

  it('will halt a prerender when aborting with an error during a render', async () => {
    const controller = new AbortController();
    function App() {
      controller.abort('sync');
      return <div>hello world</div>;
    }

    const errors = [];
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      signal: controller.signal,
      onError(error) {
        errors.push(error);
      },
    });
    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(errors).toEqual(['sync']);
    expect(getVisibleChildren(container)).toEqual(undefined);
  });

  it('will halt a prerender when aborting with an error in a microtask', async () => {
    const errors = [];

    const controller = new AbortController();
    function App() {
      React.use(
        new Promise(() => {
          Promise.resolve().then(() => {
            controller.abort('async');
          });
        }),
      );
      return <div>hello world</div>;
    }

    errors.length = 0;
    const result = await ReactDOMFizzStatic.prerenderToNodeStream(<App />, {
      signal: controller.signal,
      onError(error) {
        errors.push(error);
      },
    });
    await act(async () => {
      result.prelude.pipe(writable);
    });
    expect(errors).toEqual(['async']);
    expect(getVisibleChildren(container)).toEqual(undefined);
  });
});
