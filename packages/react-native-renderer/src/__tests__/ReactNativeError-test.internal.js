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

let createReactNativeComponentClass;

describe('ReactNativeError', () => {
  beforeEach(() => {
    jest.resetModules();

    createReactNativeComponentClass =
      require('react-native/react-private-interface')
        .ReactNativeViewConfigRegistry.register;
  });

  it('should throw error if null component registration getter is used', () => {
    expect(() => {
      try {
        createReactNativeComponentClass('View', null);
      } catch (e) {
        throw new Error(e.toString());
      }
    }).toThrow(
      'View config getter callback for component `View` must be a function (received `null`)',
    );
  });
});
