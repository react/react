/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  enableViewTransition,
  enableGestureTransition,
} from 'shared/ReactFeatureFlags';
import {startTransition} from './ReactStartTransition';

export type TransitionTypes = Array<string>;

export function addTransitionType(type: string): void {
  if (enableViewTransition) {
    const transition = ReactSharedInternals.T;
    if (transition !== null) {
      const transitionTypes = transition.types;
      if (transitionTypes === null) {
        transition.types = [type];
      } else if (transitionTypes.indexOf(type) === -1) {
        transitionTypes.push(type);
      }
    } else {
      // We're in the async gap. Simulate an implicit startTransition around it.
      if (__DEV__) {
        if (ReactSharedInternals.asyncTransitions === 0) {
          if (enableGestureTransition) {
            console.error(
              'addTransitionType can only be called inside a `startTransition()` ' +
                'or `startGestureTransition()` callback. ' +
                'It must be associated with a specific Transition.',
            );
          } else {
            console.error(
              'addTransitionType can only be called inside a `startTransition()` ' +
                'callback. It must be associated with a specific Transition.',
            );
          }
        }
      }
      startTransition(addTransitionType.bind(null, type));
    }
  }
}
