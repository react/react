/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext, ReactConsumerType} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';

import {
  disableLegacyMode,
  enableLegacyHidden,
  enableViewTransition,
} from 'shared/ReactFeatureFlags';

import {
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostPortal,
  HostComponent,
  HostHoistable,
  HostSingleton,
  HostText,
  Fragment,
  Mode,
  ContextConsumer,
  ContextProvider,
  ForwardRef,
  Profiler,
  SuspenseComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  IncompleteClassComponent,
  IncompleteFunctionComponent,
  DehydratedFragment,
  SuspenseListComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
  Throw,
  ViewTransitionComponent,
  ActivityComponent,
} from 'react-reconciler/src/ReactWorkTags';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import {REACT_STRICT_MODE_TYPE} from 'shared/ReactSymbols';
import type {ReactComponentInfo} from '../../shared/ReactTypes';

// Keep in sync with shared/getComponentNameFromType
function getWrappedName(
  outerType: mixed,
  innerType: any,
  wrapperName: string,
): string {
  const functionName = innerType.displayName || innerType.name || '';
  return (
    (outerType as any).displayName ||
    (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
  );
}

// Keep in sync with shared/getComponentNameFromType
function getContextName(type: ReactContext<any>) {
  return type.displayName || 'Context';
}

export function getComponentNameFromOwner(
  owner: Fiber | ReactComponentInfo,
): string | null {
  if (typeof owner.tag === 'number') {
    return getComponentNameFromFiber(owner as any);
  }
  if (typeof owner.name === 'string') {
    return owner.name;
  }
  return null;
}

export default function getComponentNameFromFiber(fiber: Fiber): string | null {
  const {tag, type} = fiber;
  switch (tag) {
    case ActivityComponent:
      return 'Activity';
    case CacheComponent:
      return 'Cache';
    case ContextConsumer:
      const consumer: ReactConsumerType<any> = type as any;
      return getContextName(consumer._context) + '.Consumer';
    case ContextProvider:
      const context: ReactContext<any> = type as any;
      return getContextName(context);
    case DehydratedFragment:
      return 'DehydratedFragment';
    case ForwardRef:
      return getWrappedName(type, type.render, 'ForwardRef');
    case Fragment:
      return 'Fragment';
    case HostHoistable:
    case HostSingleton:
    case HostComponent:
      // Host component type is the display name (e.g. "div", "View")
      return type;
    case HostPortal:
      return 'Portal';
    case HostRoot:
      return 'Root';
    case HostText:
      return 'Text';
    case LazyComponent:
      // Name comes from the type in this case; we don't have a tag.
      return getComponentNameFromType(type);
    case Mode:
      if (type === REACT_STRICT_MODE_TYPE) {
        // Don't be less specific than shared/getComponentNameFromType
        return 'StrictMode';
      }
      return 'Mode';
    case OffscreenComponent:
      if (fiber.return !== null) {
        return getComponentNameFromFiber(fiber.return);
      }
      return null;
    case Profiler:
      return 'Profiler';
    case ScopeComponent:
      return 'Scope';
    case SuspenseComponent:
      return 'Suspense';
    case SuspenseListComponent:
      return 'SuspenseList';
    case TracingMarkerComponent:
      return 'TracingMarker';
    case ViewTransitionComponent:
      if (enableViewTransition) {
        return 'ViewTransition';
      }
    // The display name for these tags come from the user-provided type:
    // Fallthrough
    case IncompleteClassComponent:
    case IncompleteFunctionComponent:
      if (disableLegacyMode) {
        break;
      }
    // Fallthrough
    case ClassComponent:
    case FunctionComponent:
    case MemoComponent:
    case SimpleMemoComponent:
      if (typeof type === 'function') {
        return (type as any).displayName || type.name || null;
      }
      if (typeof type === 'string') {
        return type;
      }
      break;
    case LegacyHiddenComponent:
      if (enableLegacyHidden) {
        return 'LegacyHidden';
      }
      break;
    case Throw: {
      if (__DEV__) {
        // For an error in child position we use the name of the inner most parent component.
        // Whether a Server Component or the parent Fiber.
        const debugInfo = fiber._debugInfo;
        if (debugInfo != null) {
          for (let i = debugInfo.length - 1; i >= 0; i--) {
            if (typeof debugInfo[i].name === 'string') {
              return debugInfo[i].name;
            }
          }
        }
        if (fiber.return === null) {
          return null;
        }
        return getComponentNameFromFiber(fiber.return);
      }
      return null;
    }
  }

  return null;
}
