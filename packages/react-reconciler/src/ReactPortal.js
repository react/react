/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {REACT_PORTAL_TYPE, REACT_OPTIMISTIC_KEY} from 'shared/ReactSymbols';
import {checkKeyStringCoercion} from 'shared/CheckStringCoercion';

import type {
  ReactNodeList,
  ReactPortal,
  ReactOptimisticKey,
} from 'shared/ReactTypes';

export function createPortal(
  children: ReactNodeList,
  containerInfo: any,
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any,
  key: ?string | ReactOptimisticKey = null,
): ReactPortal {
  let resolvedKey;
  if (key == null) {
    resolvedKey = null;
  } else if (key === REACT_OPTIMISTIC_KEY) {
    resolvedKey = REACT_OPTIMISTIC_KEY;
  } else {
    if (__DEV__) {
      checkKeyStringCoercion(key);
    }
    resolvedKey = '' + key;
  }
  return {
    // This tag allow us to uniquely identify this as a React Portal
    $$typeof: REACT_PORTAL_TYPE,
    key: resolvedKey,
    children,
    containerInfo,
    implementation,
  };
}
