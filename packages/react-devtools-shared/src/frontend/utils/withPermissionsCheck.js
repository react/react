/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {PermissionNotGrantedError} from 'react-devtools-shared/src/errors/PermissionNotGrantedError';

type SupportedPermission = 'clipboardWrite';
type Permissions = Array<SupportedPermission>;
type PermissionsOptions = {permissions: Permissions};

// browser.permissions is not available for DevTools pages in Firefox
// https://bugzilla.mozilla.org/show_bug.cgi?id=1796933
// We are going to assume that requested permissions are not optional.
export function withPermissionsCheck<T: (...$ReadOnlyArray<empty>) => mixed>(
  options: PermissionsOptions,
  callback: T,
): T | (() => Promise<ReturnType<T>>) {
  if (!__IS_CHROME__ && !__IS_EDGE__) {
    return callback;
  } else {
    return async () => {
      const granted = await chrome.permissions.request(options);
      if (granted) {
        return callback();
      }

      return Promise.reject(new PermissionNotGrantedError());
    };
  }
}
