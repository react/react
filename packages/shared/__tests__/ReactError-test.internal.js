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
let ReactDOMClient;
let act;

describe('ReactError', () => {
  let globalErrorMock;

  beforeEach(() => {
    if (!__DEV__) {
      // In production, our Jest environment overrides the global Error
      // class in order to decode error messages automatically. However
      // this is a single test where we actually *don't* want to decode
      // them. So we assert that the OriginalError exists, and temporarily
      // set the global Error object back to it.
      globalErrorMock = global.Error;
      global.Error = globalErrorMock.OriginalError;
      expect(typeof global.Error).toBe('function');
    }
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  afterEach(() => {
    if (!__DEV__) {
      global.Error = globalErrorMock;
    }
  });

  // @gate build === "production"
  // @gate !source
  it('should error with minified error code', () => {
    expect(() => {
      ReactDOMClient.createRoot(null);
    }).toThrowError(
      'Minified React error #200; visit ' +
        'https://react.dev/errors/200' +
        ' for the full message or use the non-minified dev environment' +
        ' for full errors and additional helpful warnings.',
    );
  });

  // @gate build === "production"
  // @gate !source
  it('should serialize arguments', async () => {
    function Oops() {
      return {};
    }
    Oops.displayName = '#wtf';

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(async () => {
        root.render(<Oops />);
      });
    }).rejects.toThrow(
      'Minified React error #152; visit ' +
        'https://reactjs.org/docs/error-decoder.html?invariant=152&args[]=%23wtf' +
        ' for the full message or use the non-minified dev environment' +
        ' for full errors and additional helpful warnings.',
    );
  });
});
