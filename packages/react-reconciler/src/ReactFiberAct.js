/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactSharedInternals from 'shared/ReactSharedInternals';

export function isConcurrentActEnvironment(): void | boolean {
  if (__DEV__) {
    const isReactActEnvironmentGlobal =
      // $FlowFixMe[cannot-resolve-name] Flow doesn't know about IS_REACT_ACT_ENVIRONMENT global
      typeof IS_REACT_ACT_ENVIRONMENT !== 'undefined'
        ? // $FlowFixMe[cannot-resolve-name]
          IS_REACT_ACT_ENVIRONMENT
        : undefined;

    if (
      !isReactActEnvironmentGlobal &&
      ReactSharedInternals.actQueue !== null
    ) {
      // TODO: Include link to relevant documentation page.
      console.error(
        'The current testing environment is not configured to support ' +
          'act(...)',
      );
    }
    return isReactActEnvironmentGlobal;
  }
  return false;
}
