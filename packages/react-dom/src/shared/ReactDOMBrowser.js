/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactRecoverable} from 'shared/ReactTypes';

import {enableBrowserAPI} from 'shared/ReactFeatureFlags';
import {REACT_RECOVERABLE_TYPE} from 'shared/ReactSymbols';

const browserImpl = function browser(): ReactRecoverable {
  // Recoverables are Errors so that a renderer can preserve the browser() call
  // site as the cause if no downstream renderer can recover the subtree.
  const recoverable = new Error(
    'Browser-only rendering was requested by `browser()`.',
  );
  Object.defineProperty(recoverable as any, '$$typeof', {
    value: REACT_RECOVERABLE_TYPE,
  });
  return recoverable as any;
};

export const browser: (() => ReactRecoverable) | void = enableBrowserAPI
  ? browserImpl
  : undefined;
