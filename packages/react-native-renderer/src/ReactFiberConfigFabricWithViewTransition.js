/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TransitionTypes} from 'react/src/ReactTransitionType';
import type {
  Instance,
  Props,
  Container,
  SuspendedState,
  GestureTimeline,
} from './ReactFiberConfigFabric';

import {allocateTag} from './ReactFiberConfigFabric';

const {
  applyViewTransitionName: fabricApplyViewTransitionName,
  createViewTransitionInstance: fabricCreateViewTransitionInstance,
  startViewTransition: fabricStartViewTransition,
  startViewTransitionReadyFinished: fabricStartViewTransitionReadyFinished,
} = nativeFabricUIManager;

export type InstanceMeasurement = {
  rect: {x: number, y: number, width: number, height: number},
  abs: boolean,
  clip: boolean,
  view: boolean,
};

export type RunningViewTransition = {
  finished: Promise<void>,
  ready: Promise<void>,
  ...
};

interface ViewTransitionPseudoElementType extends mixin$Animatable {
  _pseudo: string;
  _name: string;
}

function ViewTransitionPseudoElement(
  this: ViewTransitionPseudoElementType,
  pseudo: string,
  name: string,
) {
  // TODO: Get the owner document from the root container.
  this._pseudo = pseudo;
  this._name = name;
}

export type ViewTransitionInstance = null | {
  name: string,
  old: mixin$Animatable,
  new: mixin$Animatable,
  ...
};

export function restoreViewTransitionName(
  instance: Instance,
  props: Props,
): void {
  if (__DEV__) {
    console.warn('restoreViewTransitionName is not implemented');
  }
}

// Cancel the old and new snapshots of viewTransitionName
export function cancelViewTransitionName(
  instance: Instance,
  oldName: string,
  props: Props,
): void {
  if (__DEV__) {
    console.warn('cancelViewTransitionName is not implemented');
  }
}

export function cancelRootViewTransitionName(rootContainer: Container): void {
  // No-op
}

export function restoreRootViewTransitionName(rootContainer: Container): void {
  // No-op
}

export function cloneRootViewTransitionContainer(
  rootContainer: Container,
): Instance {
  if (__DEV__) {
    console.warn('cloneRootViewTransitionContainer is not implemented');
  }
  // $FlowFixMe[incompatible-type] Return empty stub
  return null;
}

export function removeRootViewTransitionClone(
  rootContainer: Container,
  clone: Instance,
): void {
  if (__DEV__) {
    console.warn('removeRootViewTransitionClone is not implemented');
  }
}

export function measureInstance(instance: Instance): InstanceMeasurement {
  if (__DEV__) {
    console.warn('measureInstance is not implemented');
  }
  return {
    rect: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    abs: false,
    clip: false,
    // TODO: properly calculate whether instance is in viewport
    view: true,
  };
}

export function measureClonedInstance(instance: Instance): InstanceMeasurement {
  if (__DEV__) {
    console.warn('measureClonedInstance is not implemented');
  }
  return {
    rect: {x: 0, y: 0, width: 0, height: 0},
    abs: false,
    clip: false,
    view: true,
  };
}

export function wasInstanceInViewport(
  measurement: InstanceMeasurement,
): boolean {
  return measurement.view;
}

export function hasInstanceChanged(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  if (__DEV__) {
    console.warn('hasInstanceChanged is not implemented');
  }
  return false;
}

export function hasInstanceAffectedParent(
  oldMeasurement: InstanceMeasurement,
  newMeasurement: InstanceMeasurement,
): boolean {
  if (__DEV__) {
    console.warn('hasInstanceAffectedParent is not implemented');
  }
  return false;
}

export function startGestureTransition(
  suspendedState: null | SuspendedState,
  rootContainer: Container,
  timeline: GestureTimeline,
  rangeStart: number,
  rangeEnd: number,
  transitionTypes: null | TransitionTypes,
  mutationCallback: () => void,
  animateCallback: () => void,
  errorCallback: (error: mixed) => void,
  finishedAnimation: () => void,
): RunningViewTransition {
  if (__DEV__) {
    console.warn('startGestureTransition is not implemented');
  }
  return {
    finished: Promise.resolve(),
    ready: Promise.resolve(),
  };
}

export function stopViewTransition(transition: RunningViewTransition): void {
  if (__DEV__) {
    console.warn('stopViewTransition is not implemented');
  }
}

export function addViewTransitionFinishedListener(
  transition: RunningViewTransition,
  callback: () => void,
): void {
  transition.finished.finally(callback);
}

export function createViewTransitionInstance(
  name: string,
): ViewTransitionInstance {
  const tag = allocateTag();
  fabricCreateViewTransitionInstance(name, tag);
  return {
    name,
    old: new (ViewTransitionPseudoElement as any)('old', name),
    new: new (ViewTransitionPseudoElement as any)('new', name),
  };
}

export function applyViewTransitionName(
  instance: Instance,
  name: string,
  className: ?string,
): void {
  // add view-transition-name to things that might animate for browser
  fabricApplyViewTransitionName(instance.node, name, className);
}

export function startViewTransition(
  suspendedState: null | SuspendedState,
  rootContainer: Container,
  transitionTypes: null | TransitionTypes,
  mutationCallback: () => void,
  layoutCallback: () => void,
  afterMutationCallback: () => void,
  spawnedWorkCallback: () => void,
  passiveCallback: () => mixed,
  errorCallback: (error: mixed) => void,
  blockedCallback: (name: string) => void,
  finishedAnimation: () => void,
): null | RunningViewTransition {
  const transition = fabricStartViewTransition(
    // mutation
    () => {
      mutationCallback(); // completeRoot should run here
      layoutCallback();
      afterMutationCallback();
    },
  );

  if (transition == null) {
    if (__DEV__) {
      console.warn(
        "startViewTransition didn't kick off transition in Fabric, the ViewTransition ReactNativeFeatureFlag might not be enabled.",
      );
    }
    // Flush remaining work synchronously.
    mutationCallback();
    layoutCallback();
    // Skip afterMutationCallback(). We don't need it since we're not animating.
    spawnedWorkCallback();
    // Skip passiveCallback(). Spawned work will schedule a task.
    return null;
  }

  transition.ready.then(() => {
    spawnedWorkCallback();
    fabricStartViewTransitionReadyFinished();
  });

  transition.finished.finally(() => {
    passiveCallback();
  });

  return transition;
}
