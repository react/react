/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('getVendorPrefixedEventName', () => {
  it('uses prefixed names for all transition events when TransitionEvent is unsupported', () => {
    const TransitionEvent = window.TransitionEvent;
    delete window.TransitionEvent;
    jest.resetModules();
    try {
      const getVendorPrefixedEventName =
        require('react-dom-bindings/src/events/getVendorPrefixedEventName')
          .default;

      expect(getVendorPrefixedEventName('transitionstart')).toBe(
        'webkitTransitionStart',
      );
      expect(getVendorPrefixedEventName('transitionrun')).toBe(
        'webkitTransitionRun',
      );
      expect(getVendorPrefixedEventName('transitioncancel')).toBe(
        'webkitTransitionCancel',
      );
    } finally {
      window.TransitionEvent = TransitionEvent;
    }
  });
});
