/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactRecoverable, ReactRecoverableReason} from 'shared/ReactTypes';

import {enableBrowserAPI} from 'shared/ReactFeatureFlags';
import {REACT_RECOVERABLE_TYPE} from 'shared/ReactSymbols';

const browserImpl = function browser(
  reason?: ReactRecoverableReason,
): ReactRecoverable {
  // This also runs in the browser, where the reason is never observed. Keep the
  // value cheap and let an SSR renderer initialize the error if it defers work.
  return {
    $$typeof: REACT_RECOVERABLE_TYPE,
    _reason: reason,
  };
};

export const browser:
  | ((reason?: ReactRecoverableReason) => ReactRecoverable)
  | void = enableBrowserAPI ? browserImpl : undefined;
