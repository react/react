/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import styles from './SuspenseEnvironmentColors.css';

export function getClassNameForEnvironment(environment: null | string): string {
  if (environment === null) {
    return styles.SuspenseEnvironmentDefault;
  }
  if (environment === 'Server') {
    return styles.SuspenseEnvironmentServer;
  }
  return styles.SuspenseEnvironmentOther;
}
