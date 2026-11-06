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

describe('ReactDOMFrameScheduling', () => {
  beforeEach(() => {
    jest.resetModules();

    jest.unmock('scheduler');
  });

  // We're just testing importing, not using it.
  // It is important because even isomorphic components may import it.
  it('can import findDOMNode in Node environment', () => {
    expect(typeof window).toBe('undefined');
    expect(() => {
      require('react-dom');
    }).not.toThrow();
  });
});
