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

let React;
let ReactDOMFizzServer;

describe('ReactDOMFloat', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOMFizzServer = require('react-dom/server');
  });

  // fixes #27177
  it('does not hoist above the <html> tag', async () => {
    const result = ReactDOMFizzServer.renderToString(
      <html>
        <head>
          <script src="foo" />
          <meta charSet="utf-8" />
          <title>title</title>
        </head>
      </html>,
    );

    expect(result).toEqual(
      '<html><head><meta charSet="utf-8"/>' +
        '<title>title</title><script src="foo"></script></head>' +
        '</html>',
    );
  });
});
