/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

/**
 * Change environment support for PointerEvent.
 */

function emptyFunction() {}

export function hasPointerEvent() {
  return global != null && global.PointerEvent != null;
}

export function setPointerEvent(bool) {
  const pointerCaptureFn = name => id => {
    if (typeof id !== 'number') {
      if (__DEV__) {
        console.error('A pointerId must be passed to "%s"', name);
      }
    }
  };
  global.PointerEvent = bool ? emptyFunction : undefined;
  global.HTMLElement.prototype.setPointerCapture = bool
    ? pointerCaptureFn('setPointerCapture')
    : undefined;
  global.HTMLElement.prototype.releasePointerCapture = bool
    ? pointerCaptureFn('releasePointerCapture')
    : undefined;
}

/**
 * Change environment host platform.
 */

const platformGetter = jest.spyOn(global.navigator, 'platform', 'get');

export const platform = {
  clear() {
    platformGetter.mockClear();
  },
  get() {
    return global.navigator.platform === 'MacIntel' ? 'mac' : 'windows';
  },
  set(name: 'mac' | 'windows') {
    switch (name) {
      case 'mac': {
        platformGetter.mockReturnValue('MacIntel');
        break;
      }
      case 'windows': {
        platformGetter.mockReturnValue('Win32');
        break;
      }
      default: {
        break;
      }
    }
  },
};
