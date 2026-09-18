/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {ViewTransitionProps} from 'shared/ReactTypes';
import {runWithFiberInDEV} from './ReactCurrentFiber';

// Use in DEV to track mounted named ViewTransitions. This is used to warn for
// duplicate names. This should technically be tracked per Document because you could
// have two different documents that can have separate namespaces, but to keep things
// simple we just use a global Map. Technically it should also include any manually
// assigned view-transition-name outside React too.
const mountedNamedViewTransitions: Map<string, Fiber> = __DEV__
  ? new Map()
  : (null as any);
const didWarnAboutName: {[string]: boolean} = __DEV__ ? {} : (null as any);

export function trackNamedViewTransition(fiber: Fiber): void {
  if (__DEV__) {
    const name = (fiber.memoizedProps as ViewTransitionProps).name;
    if (name != null && name !== 'auto') {
      const existing = mountedNamedViewTransitions.get(name);
      if (existing !== undefined) {
        if (existing !== fiber && existing !== fiber.alternate) {
          if (!didWarnAboutName[name]) {
            didWarnAboutName[name] = true;
            const stringifiedName = JSON.stringify(name);
            runWithFiberInDEV(fiber, () => {
              console.error(
                'There are two <ViewTransition name=%s> components with the same name mounted ' +
                  'at the same time. This is not supported and will cause View Transitions ' +
                  'to error. Try to use a more unique name e.g. by using a namespace prefix ' +
                  'and adding the id of an item to the name.',
                stringifiedName,
              );
            });
            runWithFiberInDEV(existing, () => {
              console.error(
                'The existing <ViewTransition name=%s> duplicate has this stack trace.',
                stringifiedName,
              );
            });
          }
        }
      } else {
        mountedNamedViewTransitions.set(name, fiber);
      }
    }
  }
}

export function untrackNamedViewTransition(fiber: Fiber): void {
  if (__DEV__) {
    const name = (fiber.memoizedProps as ViewTransitionProps).name;
    if (name != null && name !== 'auto') {
      const existing = mountedNamedViewTransitions.get(name);
      if (
        existing !== undefined &&
        (existing === fiber || existing === fiber.alternate)
      ) {
        mountedNamedViewTransitions.delete(name);
      }
    }
  }
}
