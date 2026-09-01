/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */
'use strict';

describe('ReactSymbols', () => {
  beforeEach(() => jest.resetModules());

  const expectToBeUnique = keyValuePairs => {
    const map = new Map();
    keyValuePairs.forEach(([key, value]) => {
      if (map.has(value)) {
        throw Error(
          `${key} value ${value.toString()} is the same as ${map.get(value)}.`,
        );
      }
      map.set(value, key);
    });
  };

  it('Symbol values should be unique', () => {
    expectToBeUnique(Object.entries(require('shared/ReactSymbols')));
  });
});
