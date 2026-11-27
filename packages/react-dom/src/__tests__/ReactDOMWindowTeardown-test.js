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

// Regression tests for https://github.com/react/react/issues/38161.
//
// Test runners like Jest and Vitest create one DOM environment per test file
// and remove the `window` global when the file is done. Work that React
// scheduled before that can still be queued, and runs after the global is gone.

let React;
let ReactDOMClient;
let waitForAll;
let container;

function tearDownEnvironment() {
  delete global.window;
  delete global.document;
}

describe('ReactDOMWindowTeardown', () => {
  beforeEach(() => {
    jest.resetModules();

    const {JSDOM} = require('jsdom');
    const jsdom = new JSDOM('<div id="root"></div>');
    global.window = jsdom.window;
    global.document = jsdom.window.document;
    container = jsdom.window.document.getElementById('root');

    React = require('react');
    ReactDOMClient = require('react-dom/client');
    waitForAll = require('internal-test-utils').waitForAll;
  });

  afterEach(() => {
    tearDownEnvironment();
  });

  it('does not throw when a render task runs after window is removed', async () => {
    const root = ReactDOMClient.createRoot(container);
    root.render(<div>hello</div>);

    tearDownEnvironment();

    await waitForAll([]);
    expect(container.textContent).toBe('hello');
  });

  it('does not throw when a transition is processed after window is removed', async () => {
    const root = ReactDOMClient.createRoot(container);
    React.startTransition(() => {
      root.render(<div>hello</div>);
    });

    tearDownEnvironment();

    await waitForAll([]);
    expect(container.textContent).toBe('hello');
  });

  it('does not throw when an update is scheduled after window is removed', async () => {
    let setText;
    function App() {
      const [text, _setText] = React.useState('initial');
      setText = _setText;
      return <div>{text}</div>;
    }

    const root = ReactDOMClient.createRoot(container);
    root.render(<App />);
    await waitForAll([]);
    expect(container.textContent).toBe('initial');

    tearDownEnvironment();

    // For example, a timer or a promise that resolves after the test file is
    // done. This is not called from inside React, so there is no current
    // update priority and React falls back to the current event.
    setText('updated');

    await waitForAll([]);
    expect(container.textContent).toBe('updated');
  });
});
