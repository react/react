/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Regression coverage for the ancestor-resolution loop in
// dispatchEventForPluginEventSystem (DOMPluginEventSystem.js).
//
// When invalid HTML such as a nested <body> is rendered into a container, a
// real browser's HTML parser normalizes the structure and desynchronizes
// React's fiber references from the actual DOM. In that state the loop that
// walks up from the target to find the matching root container can stop making
// progress and spin forever, freezing the main thread (see facebook/react
// issue #35480).
//
// NOTE ON SCOPE (please read before extending): The desynchronization that
// triggers the original freeze depends on a real browser parser's
// normalization of nested <body>/<html> tags. jsdom does NOT reproduce that
// normalization for programmatic DOM mutations (which is how React builds the
// tree), so this suite cannot reproduce the actual infinite loop, and it does
// not fail if the guard in DOMPluginEventSystem.js is removed. It is a smoke
// test that documents the reported scenario and asserts that rendering and
// focusing an <input> inside a nested <body> terminates and dispatches
// normally. The real freeze must be verified manually in a browser using the
// reproduction in issue #35480. Treat the guard's correctness as being upheld
// by code review of DOMPluginEventSystem.js, not by this test alone.

describe('ReactDOMEventTraversalGuard', () => {
  let React;
  let ReactDOMClient;
  let act;
  let assertConsoleErrorDev;
  let container;

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  // A hang would surface as a Jest timeout; the explicit timeout keeps the
  // failure fast and readable instead of waiting for the default.
  it('does not hang when focusing an input rendered inside a nested <body>', async () => {
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <body>
          <input type="text" />
        </body>,
      );
    });
    // React warns that <body> cannot be nested inside <div>. This is the
    // invalid-HTML condition that leads to the browser normalization and the
    // reported freeze.
    assertConsoleErrorDev([
      'In HTML, <body> cannot be a child of <div>.\n' +
        'This will cause a hydration error.\n' +
        '    in body (at **)',
    ]);

    const input = container.querySelector('input');
    expect(input).not.toBe(null);

    // Focusing is what triggers the ancestor-resolution walk in the original
    // report. This must return control to the test rather than spinning.
    await act(() => {
      input.focus();
      input.dispatchEvent(
        new FocusEvent('focusin', {bubbles: true, cancelable: false}),
      );
    });

    // Reaching this assertion at all means the traversal terminated.
    expect(document.activeElement).toBe(input);
  }, 5000);
});
