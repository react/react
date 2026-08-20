/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  getInstanceFromNode,
  getFiberCurrentPropsFromNode,
} from '../client/ReactDOMComponentTree';

import {restoreControlledState} from 'react-dom-bindings/src/client/ReactDOMComponent';

// Use to restore controlled state after a change event has fired.

let restoreTarget = null;
let restoreQueue = null;

function restoreStateOfTarget(target: Node) {
  // We perform this translation at the end of the event loop so that we
  // always receive the correct fiber here
  const internalInstance = getInstanceFromNode(target);
  if (!internalInstance) {
    // Unmounted
    return;
  }

  const stateNode = internalInstance.stateNode;
  // Guard against Fiber being unmounted.
  if (stateNode) {
    const props = getFiberCurrentPropsFromNode(stateNode);
    restoreControlledState(
      internalInstance.stateNode,
      internalInstance.type,
      props,
    );
  }
}

export function enqueueStateRestore(target: Node): void {
  if (restoreTarget) {
    if (restoreQueue) {
      restoreQueue.push(target);
    } else {
      restoreQueue = [target];
    }
  } else {
    restoreTarget = target;
  }
}

export function needsStateRestore(): boolean {
  return restoreTarget !== null || restoreQueue !== null;
}

export function restoreStateIfNeeded() {
  if (!restoreTarget) {
    return;
  }
  const target = restoreTarget;
  const queuedTargets = restoreQueue;
  restoreTarget = null;
  restoreQueue = null;

  restoreStateOfTarget(target);
  if (queuedTargets) {
    for (let i = 0; i < queuedTargets.length; i++) {
      restoreStateOfTarget(queuedTargets[i]);
    }
  }
}
