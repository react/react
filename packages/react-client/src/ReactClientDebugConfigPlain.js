/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

let hasConfirmedEval = false;
export function checkEvalAvailabilityOnceDev(): void {
  if (__DEV__) {
    if (!hasConfirmedEval) {
      hasConfirmedEval = true;
      try {
        // eslint-disable-next-line no-eval
        (0, eval)('null');
      } catch {
        console.error(
          'eval() is not supported in this environment. ' +
            'React requires eval() in development mode for various debugging features ' +
            'like reconstructing callstacks from a different environment.\n' +
            'React will never use eval() in production mode',
        );
      }
    }
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'checkEvalAvailabilityOnceDev should never be called in production mode. This is a bug in React.',
    );
  }
}
