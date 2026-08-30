/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ViewTransitionClass, ViewTransitionProps} from 'shared/ReactTypes';
import type {FiberRoot} from './ReactInternalTypes';
import type {ViewTransitionInstance, Instance} from './ReactFiberConfig';

import {
  getCommittingRoot,
  getPendingTransitionTypes,
} from './ReactFiberWorkLoop';

export type ViewTransitionState = {
  autoName: null | string, // the view-transition-name to use when an explicit one is not specified
  paired: null | ViewTransitionState, // a temporary state during the commit phase if we have paired this with another instance
  clones: null | Array<Instance>, // a temporary state during the apply gesture phase if we cloned this boundary
  ref: null | ViewTransitionInstance, // the current ref instance. This can change through the lifetime of the instance.
};

let globalClientIdCounter: number = 0;

export function getViewTransitionName(
  props: ViewTransitionProps,
  instance: ViewTransitionState,
): string {
  if (props.name != null && props.name !== 'auto') {
    return props.name;
  }
  if (instance.autoName !== null) {
    return instance.autoName;
  }

  // We assume we always call this in the commit phase.
  const root = getCommittingRoot() as any as FiberRoot;
  const identifierPrefix = root.identifierPrefix;
  const globalClientId = globalClientIdCounter++;
  const name =
    '_' + identifierPrefix + 't_' + globalClientId.toString(32) + '_';
  instance.autoName = name;
  return name;
}

function getClassNameByType(classByType: ?ViewTransitionClass): ?string {
  if (classByType == null || typeof classByType === 'string') {
    return classByType;
  }
  let className: ?string = null;
  const activeTypes = getPendingTransitionTypes();
  if (activeTypes !== null) {
    for (let i = 0; i < activeTypes.length; i++) {
      const match = classByType[activeTypes[i]];
      if (match != null) {
        if (match === 'none') {
          // If anything matches "none" that takes precedence over any other
          // type that also matches.
          return 'none';
        }
        if (className == null) {
          className = match;
        } else {
          className += ' ' + match;
        }
      }
    }
  }
  if (className == null) {
    // We had no other matches. Match the default for this configuration.
    return classByType.default;
  }
  return className;
}

export function getViewTransitionClassName(
  defaultClass: ?ViewTransitionClass,
  eventClass: ?ViewTransitionClass,
): ?string {
  const className: ?string = getClassNameByType(defaultClass);
  const eventClassName: ?string = getClassNameByType(eventClass);
  if (eventClassName == null) {
    return className === 'auto' ? null : className;
  }
  if (eventClassName === 'auto') {
    return null;
  }
  return eventClassName;
}
