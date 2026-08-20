/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */
'use strict';

let formatProdErrorMessage;

describe('ReactErrorProd', () => {
  beforeEach(() => {
    jest.resetModules();
    formatProdErrorMessage = require('shared/formatProdErrorMessage').default;
  });

  it('should throw with the correct number of `%s`s in the URL', () => {
    expect(formatProdErrorMessage(124, 'foo', 'bar')).toEqual(
      'Minified React error #124; visit ' +
        'https://react.dev/errors/124?args[]=foo&args[]=bar' +
        ' for the full message or use the non-minified dev environment' +
        ' for full errors and additional helpful warnings.',
    );

    expect(formatProdErrorMessage(20)).toEqual(
      'Minified React error #20; visit ' +
        'https://react.dev/errors/20' +
        ' for the full message or use the non-minified dev environment' +
        ' for full errors and additional helpful warnings.',
    );

    expect(formatProdErrorMessage(77, '<div>', '&?bar')).toEqual(
      'Minified React error #77; visit ' +
        'https://react.dev/errors/77?args[]=%3Cdiv%3E&args[]=%26%3Fbar' +
        ' for the full message or use the non-minified dev environment' +
        ' for full errors and additional helpful warnings.',
    );
  });
});
