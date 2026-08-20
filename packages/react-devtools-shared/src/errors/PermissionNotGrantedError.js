/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export class PermissionNotGrantedError extends Error {
  constructor() {
    super("User didn't grant the required permission to perform an action");

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionNotGrantedError);
    }

    this.name = 'PermissionNotGrantedError';
  }
}
