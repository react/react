/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactIOInfo, ReactAsyncInfo} from 'shared/ReactTypes';
import type {SuspenseNode} from './DevToolsFiberTypes';

export function ioExistsInSuspenseAncestor(
  suspenseNode: SuspenseNode,
  ioInfo: ReactIOInfo,
): boolean {
  let ancestor = suspenseNode.parent;
  while (ancestor !== null) {
    if (ancestor.suspendedBy.has(ioInfo)) {
      return true;
    }
    ancestor = ancestor.parent;
  }
  return false;
}

export function getAwaitInSuspendedByFromIO(
  suspensedBy: Array<ReactAsyncInfo>,
  ioInfo: ReactIOInfo,
): null | ReactAsyncInfo {
  for (let i = 0; i < suspensedBy.length; i++) {
    const asyncInfo = suspensedBy[i];
    if (asyncInfo.awaited === ioInfo) {
      return asyncInfo;
    }
  }
  return null;
}

export function getVirtualEndTime(ioInfo: ReactIOInfo): number {
  if (ioInfo.env != null) {
    // Sort client side content first so that scripts and streams don't
    // cover up the effect of server time.
    return ioInfo.end + 1000000;
  }
  return ioInfo.end;
}
