/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

describe('ReactMismatchedVersions-test', () => {
  // Polyfills for test environment
  global.ReadableStream =
    require('web-streams-polyfill/ponyfill/es6').ReadableStream;
  global.TextEncoder = require('util').TextEncoder;

  let React;
  let actualReactVersion;

  beforeEach(() => {
    jest.resetModules();

    patchMessageChannel();

    jest.mock('react', () => {
      const actualReact = jest.requireActual('react');
      return {
        ...actualReact,
        version: '18.0.0-whoa-this-aint-the-right-react',
        __actualVersion: actualReact.version,
      };
    });
    React = require('react');
    actualReactVersion = React.__actualVersion;
  });

  it('importing "react-dom/client" throws if version does not match React version', async () => {
    expect(() => require('react-dom/client')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // When running in source mode, we lazily require the implementation to
  // simulate the static config dependency injection we do at build time. So it
  // only errors once you call something and trigger the require. Running the
  // test in build mode is sufficient.
  // @gate !source
  it('importing "react-dom/server" throws if version does not match React version', async () => {
    expect(() => require('react-dom/server')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // @gate !source
  it('importing "react-dom/server.node" throws if version does not match React version', async () => {
    expect(() => require('react-dom/server.node')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // @gate !source
  it('importing "react-dom/server.browser" throws if version does not match React version', async () => {
    expect(() => require('react-dom/server.browser')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // @gate !source
  it('importing "react-dom/server.bun" throws if version does not match React version', async () => {
    expect(() => require('react-dom/server.bun')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // @gate !source
  it('importing "react-dom/server.edge" throws if version does not match React version', async () => {
    expect(() => require('react-dom/server.edge')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  it('importing "react-dom/static" throws if version does not match React version', async () => {
    expect(() => require('react-dom/static')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  // @gate !source
  it('importing "react-dom/static.node" throws if version does not match React version', async () => {
    expect(() => require('react-dom/static.node')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  it('importing "react-dom/static.browser" throws if version does not match React version', async () => {
    expect(() => require('react-dom/static.browser')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });

  it('importing "react-dom/static.edge" throws if version does not match React version', async () => {
    expect(() => require('react-dom/static.edge')).toThrow(
      'Incompatible React versions: The "react" and "react-dom" packages ' +
        'must have the exact same version. Instead got:\n' +
        '  - react:      18.0.0-whoa-this-aint-the-right-react\n' +
        `  - react-dom:  ${actualReactVersion}`,
    );
  });
});
