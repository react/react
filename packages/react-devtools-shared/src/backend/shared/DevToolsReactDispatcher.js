/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {CurrentDispatcherRef, LegacyDispatcherRef} from '../types';

export function getDispatcherRef(renderer: {
  +currentDispatcherRef?: LegacyDispatcherRef | CurrentDispatcherRef,
  ...
}): void | CurrentDispatcherRef {
  if (renderer.currentDispatcherRef === undefined) {
    return undefined;
  }
  const injectedRef = renderer.currentDispatcherRef;
  if (
    typeof injectedRef.H === 'undefined' &&
    typeof injectedRef.current !== 'undefined'
  ) {
    // We got a legacy dispatcher injected, let's create a wrapper proxy to translate.
    return {
      get H() {
        return (injectedRef as any).current;
      },
      set H(value) {
        (injectedRef as any).current = value;
      },
    };
  }
  return injectedRef as any;
}
