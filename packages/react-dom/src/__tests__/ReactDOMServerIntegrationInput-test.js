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

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');
// Set by `yarn test-fire`.
const {disableInputAttributeSyncing} = require('shared/ReactFeatureFlags');

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

// TODO: Run this in React Fire mode after we figure out the SSR behavior.
const desc = disableInputAttributeSyncing ? xdescribe : describe;
desc('ReactDOMServerIntegrationInput', () => {
  beforeEach(() => {
    resetModules();
  });

  itRenders('an input with a value and an onChange', async render => {
    const e = await render(<input value="foo" onChange={() => {}} />);
    expect(e.value).toBe('foo');
  });

  itRenders('an input with a bigint value and an onChange', async render => {
    const e = await render(<input value={5n} onChange={() => {}} />);
    expect(e.value).toBe('5');
  });

  itRenders('an input with a value and readOnly', async render => {
    const e = await render(<input value="foo" readOnly={true} />);
    expect(e.value).toBe('foo');
  });

  itRenders('an input with a value and no onChange/readOnly', async render => {
    // this configuration should raise a dev warning that value without
    // onChange or readOnly is a mistake.
    const e = await render(<input value="foo" />, 1);
    expect(e.value).toBe('foo');
    expect(e.getAttribute('value')).toBe('foo');
  });

  itRenders('an input with a defaultValue', async render => {
    const e = await render(<input defaultValue="foo" />);
    expect(e.value).toBe('foo');
    expect(e.getAttribute('value')).toBe('foo');
    expect(e.getAttribute('defaultValue')).toBe(null);
  });

  itRenders('an input value overriding defaultValue', async render => {
    const e = await render(
      <input value="foo" defaultValue="bar" readOnly={true} />,
      1,
    );
    expect(e.value).toBe('foo');
    expect(e.getAttribute('value')).toBe('foo');
    expect(e.getAttribute('defaultValue')).toBe(null);
  });

  itRenders(
    'an input value overriding defaultValue no matter the prop order',
    async render => {
      const e = await render(
        <input defaultValue="bar" value="foo" readOnly={true} />,
        1,
      );
      expect(e.value).toBe('foo');
      expect(e.getAttribute('value')).toBe('foo');
      expect(e.getAttribute('defaultValue')).toBe(null);
    },
  );
});
