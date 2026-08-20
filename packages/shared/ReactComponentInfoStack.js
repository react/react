/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactComponentInfo} from 'shared/ReactTypes';

import {describeBuiltInComponentFrame} from 'shared/ReactComponentStackFrame';

import {formatOwnerStack} from 'shared/ReactOwnerStackFrames';

export function getOwnerStackByComponentInfoInDev(
  componentInfo: ReactComponentInfo,
): string {
  if (!__DEV__) {
    return '';
  }
  try {
    let info = '';

    // The owner stack of the current component will be where it was created, i.e. inside its owner.
    // There's no actual name of the currently executing component. Instead, that is available
    // on the regular stack that's currently executing. However, if there is no owner at all, then
    // there's no stack frame so we add the name of the root component to the stack to know which
    // component is currently executing.
    if (!componentInfo.owner && typeof componentInfo.name === 'string') {
      return describeBuiltInComponentFrame(componentInfo.name);
    }

    let owner: void | null | ReactComponentInfo = componentInfo;

    while (owner) {
      const ownerStack: ?Error = owner.debugStack;
      if (ownerStack != null) {
        // Server Component
        owner = owner.owner;
        if (owner) {
          // TODO: Should we stash this somewhere for caching purposes?
          info += '\n' + formatOwnerStack(ownerStack);
        }
      } else {
        break;
      }
    }
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}
