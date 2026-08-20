/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import reactDOMPackageVersion from 'shared/ReactVersion';
import * as IsomorphicReactPackage from 'react';

export function ensureCorrectIsomorphicReactVersion() {
  const isomorphicReactPackageVersion = IsomorphicReactPackage.version;
  if (isomorphicReactPackageVersion !== reactDOMPackageVersion) {
    throw new Error(
      'Incompatible React versions: The "react" and "react-dom" packages must ' +
        'have the exact same version. Instead got:\n' +
        `  - react:      ${isomorphicReactPackageVersion}\n` +
        `  - react-dom:  ${reactDOMPackageVersion}\n` +
        'Learn more: https://react.dev/warnings/version-mismatch',
    );
  }
}
