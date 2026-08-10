/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOM.browser', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // @gate enableBrowserAPI
  it('can create browser-only content before the browser renderer is initialized', async () => {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const browserOnly = ReactDOM.browser();
    const ReactDOMClient = require('react-dom/client');
    const {act} = require('internal-test-utils');

    function BrowserOnly() {
      React.use(browserOnly);
      return <span>Browser</span>;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <React.Suspense fallback={<span>Fallback</span>}>
          <BrowserOnly />
        </React.Suspense>,
      );
    });
    expect(container.innerHTML).toBe('<span>Browser</span>');
  });
});
