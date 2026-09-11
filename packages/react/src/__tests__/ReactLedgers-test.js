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

describe('ReactLedgers', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react/react.react-server');
  });

  // @gate enableFlightLedgers
  it('creates opaque, frozen ledger types', () => {
    const types = [
      React.createBitLedger(),
      React.createMaskLedger(),
      React.createMinLedger(),
      React.createMaxLedger(),
      React.createSetLedger(),
    ];

    for (let i = 0; i < types.length; i++) {
      if (__DEV__) {
        expect(Object.isFrozen(types[i])).toBe(true);
      }
      for (let j = i + 1; j < types.length; j++) {
        expect(types[i]).not.toBe(types[j]);
      }
    }
  });

  // @gate enableFlightLedgers
  it('is a silent no-op outside a Flight request', () => {
    expect(() => {
      React.addToLedger(React.createBitLedger());
      React.addToLedger(React.createMaskLedger(), 1);
      React.addToLedger(React.createMinLedger(), 1);
      React.addToLedger(React.createMaxLedger(), 1);
      React.addToLedger(React.createSetLedger(), 'tag');
    }).not.toThrow();
  });
});
