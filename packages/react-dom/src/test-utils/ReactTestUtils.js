/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

import * as React from 'react';

let didWarnAboutUsingAct = false;
export function act(callback) {
  if (didWarnAboutUsingAct === false) {
    didWarnAboutUsingAct = true;
    console.error(
      '`ReactDOMTestUtils.act` is deprecated in favor of `React.act`. ' +
        'Import `act` from `react` instead of `react-dom/test-utils`. ' +
        'See https://react.dev/warnings/react-dom-test-utils for more info.',
    );
  }
  return React.act(callback);
}
