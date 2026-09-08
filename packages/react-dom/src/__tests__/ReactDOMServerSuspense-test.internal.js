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
let ReactDOM;
let ReactDOMClient;
let ReactDOMServer;
let act;
let SuspenseList;

describe('ReactDOMServerSuspense', () => {
  beforeEach(() => {
    // Reset warning cache.
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;
    if (gate(flags => flags.enableSuspenseList)) {
      SuspenseList = React.unstable_SuspenseList;
    }
  });

  function Text(props) {
    return <div>{props.text}</div>;
  }

  function AsyncText(props) {
    throw new Promise(() => {});
  }

  function getVisibleChildren(element) {
    const children = [];
    let node = element.firstChild;
    while (node) {
      if (node.nodeType === 1) {
        if (
          node.tagName !== 'SCRIPT' &&
          node.tagName !== 'TEMPLATE' &&
          node.tagName !== 'template' &&
          !node.hasAttribute('hidden') &&
          !node.hasAttribute('aria-hidden')
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

  it('should render the children when no promise is thrown', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <Text text="Children" />
      </React.Suspense>,
    );
    container.innerHTML = html;
    expect(getVisibleChildren(container)).toEqual(<div>Children</div>);
  });

  it('should render the fallback when a promise thrown', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <AsyncText text="Children" />
      </React.Suspense>,
    );
    container.innerHTML = html;
    expect(getVisibleChildren(container)).toEqual(<div>Fallback</div>);
  });

  // @gate enableBrowserAPI
  it('hydrates browser-only content rendered with renderToString', async () => {
    function BrowserOnly() {
      React.use(ReactDOM.browser('Only render this content in the browser'));
      return <Text text="Children" />;
    }

    const app = (
      <React.Suspense fallback={<Text text="Fallback" />}>
        <BrowserOnly />
      </React.Suspense>
    );
    const container = document.createElement('div');
    container.innerHTML = ReactDOMServer.renderToString(app);
    expect(getVisibleChildren(container)).toEqual(<div>Fallback</div>);

    const recoverableErrors = [];
    await act(() => {
      ReactDOMClient.hydrateRoot(container, app, {
        onRecoverableError(error) {
          recoverableErrors.push(error);
        },
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(getVisibleChildren(container)).toEqual(<div>Children</div>);
  });

  // @gate enableBrowserAPI
  it('renders only the browser-only fallback with renderToStaticMarkup', () => {
    function BrowserOnly() {
      React.use(ReactDOM.browser('Only render this content in the browser'));
      return <Text text="Children" />;
    }

    const html = ReactDOMServer.renderToStaticMarkup(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <BrowserOnly />
      </React.Suspense>,
    );

    expect(html).toBe('<div>Fallback</div>');
  });

  it('should work with nested suspense components', async () => {
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(
      <React.Suspense fallback={<Text text="Fallback" />}>
        <div>
          <Text text="Children" />
          <React.Suspense fallback={<Text text="Fallback" />}>
            <AsyncText text="Children" />
          </React.Suspense>
        </div>
      </React.Suspense>,
    );
    container.innerHTML = html;

    expect(getVisibleChildren(container)).toEqual(
      <div>
        <div>Children</div>
        <div>Fallback</div>
      </div>,
    );
  });

  // @gate enableSuspenseList
  it('server renders a SuspenseList component and its children', async () => {
    const example = (
      <SuspenseList revealOrder="forwards" tail="visible">
        <React.Suspense fallback="Loading A">
          <div>A</div>
        </React.Suspense>
        <React.Suspense fallback="Loading B">
          <div>B</div>
        </React.Suspense>
      </SuspenseList>
    );
    const container = document.createElement('div');
    const html = ReactDOMServer.renderToString(example);
    container.innerHTML = html;

    const divA = container.children[0];
    expect(divA.tagName).toBe('DIV');
    expect(divA.textContent).toBe('A');
    const divB = container.children[1];
    expect(divB.tagName).toBe('DIV');
    expect(divB.textContent).toBe('B');

    await act(() => {
      ReactDOMClient.hydrateRoot(container, example);
    });

    const divA2 = container.children[0];
    const divB2 = container.children[1];
    expect(divA).toBe(divA2);
    expect(divB).toBe(divB2);
  });

  it('throws when rendering a suspending component outside a Suspense node', async () => {
    expect(() => {
      ReactDOMServer.renderToString(
        <div>
          <React.Suspense />
          <AsyncText text="Children" />
          <React.Suspense />
        </div>,
      );
    }).toThrow('A component suspended while responding to synchronous input.');
  });

  it('does not get confused by throwing null', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw null;
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe(null);
  });

  it('does not get confused by throwing undefined', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw undefined;
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe(undefined);
  });

  it('does not get confused by throwing a primitive', () => {
    function Bad() {
      // eslint-disable-next-line no-throw-literal
      throw 'foo';
    }

    let didError;
    let error;
    try {
      ReactDOMServer.renderToString(<Bad />);
    } catch (err) {
      didError = true;
      error = err;
    }
    expect(didError).toBe(true);
    expect(error).toBe('foo');
  });
});
