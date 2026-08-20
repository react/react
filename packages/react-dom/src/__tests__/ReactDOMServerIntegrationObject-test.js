/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @jest-environment ./scripts/jest/ReactDOMServerIntegrationEnvironment
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMClient;
let ReactDOMServer;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  ReactDOMServer = require('react-dom/server');

  // Make them available to the helpers.
  return {
    ReactDOMClient,
    ReactDOMServer,
  };
}

const {resetModules, itRenders} = ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegrationObject', () => {
  beforeEach(() => {
    resetModules();
  });

  itRenders('an object with children', async render => {
    const e = await render(
      <object type="video/mp4" data="/example.webm" width={600} height={400}>
        <div>preview</div>
      </object>,
    );

    expect(e.outerHTML).toBe(
      '<object type="video/mp4" data="/example.webm" width="600" height="400"><div>preview</div></object>',
    );
  });

  itRenders('an object with empty data', async render => {
    const e = await render(<object data="" />, 1);
    expect(e.outerHTML).toBe('<object></object>');
  });
});
