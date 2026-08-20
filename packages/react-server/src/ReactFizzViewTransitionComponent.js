/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ViewTransitionProps, ViewTransitionClass} from 'shared/ReactTypes';
import type {TreeContext} from './ReactFizzTreeContext';
import type {ResumableState} from './ReactFizzConfig';

import {getTreeId} from './ReactFizzTreeContext';
import {makeId} from './ReactFizzConfig';

export function getViewTransitionName(
  props: ViewTransitionProps,
  treeContext: TreeContext,
  resumableState: ResumableState,
): string {
  if (props.name != null && props.name !== 'auto') {
    return props.name;
  }
  const treeId = getTreeId(treeContext);
  return makeId(resumableState, treeId, 0);
}

function getClassNameByType(classByType: ?ViewTransitionClass): ?string {
  if (classByType == null || typeof classByType === 'string') {
    return classByType;
  }
  let className: ?string = null;
  const activeTypes = null; // TODO: Support passing active types.
  if (activeTypes !== null) {
    for (let i = 0; i < activeTypes.length; i++) {
      const match = classByType[activeTypes[i]];
      if (match != null) {
        // $FlowFixMe[invalid-compare]
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
