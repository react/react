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
let ReactDOMClient;
let waitForAll;
let document;

describe('ReactDOMWindowTeardown', () => {
  beforeEach(() => {
    jest.resetModules();
    // Set up a DOM environment the way per-test-file test runners do, so it
    // can be torn down mid-test below.
    const {JSDOM} = require('jsdom');
    const dom = new JSDOM('<div id="root"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    document = dom.window.document;
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    waitForAll = require('internal-test-utils').waitForAll;
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  // Regression test for https://github.com/facebook/react/issues/37100
  // Scheduler tasks run on a deferred tick and can fire after the environment
  // that scheduled them (e.g. a per-test-file jsdom environment) has been
  // torn down. Reading `window.event` at the entry of such a task must not
  // crash when `window` is no longer defined.
  it('does not crash if a scheduler task runs after window is torn down', async () => {
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    root.render(<div>hello</div>);

    // Simulate a test runner tearing down the DOM environment while the
    // scheduled render task is still queued.
    delete global.window;
    delete global.document;

    await waitForAll([]);

    expect(document.getElementById('root').textContent).toBe('hello');
  });
});
