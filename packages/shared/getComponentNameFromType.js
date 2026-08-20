/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {LazyComponent} from 'react/src/ReactLazy';
import type {ReactContext, ReactConsumerType} from 'shared/ReactTypes';

import {
  REACT_CONTEXT_TYPE,
  REACT_CONSUMER_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PORTAL_TYPE,
  REACT_MEMO_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_LAZY_TYPE,
  REACT_TRACING_MARKER_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
  REACT_ACTIVITY_TYPE,
} from 'shared/ReactSymbols';

import {
  enableTransitionTracing,
  enableViewTransition,
} from './ReactFeatureFlags';

// Keep in sync with react-reconciler/getComponentNameFromFiber
function getWrappedName(
  outerType: mixed,
  innerType: any,
  wrapperName: string,
): string {
  const displayName = (outerType as any).displayName;
  if (displayName) {
    return displayName;
  }
  const functionName = innerType.displayName || innerType.name || '';
  return functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName;
}

// Keep in sync with react-reconciler/getComponentNameFromFiber
function getContextName(type: ReactContext<any>) {
  return type.displayName || 'Context';
}

const REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference');

// Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.
export default function getComponentNameFromType(type: mixed): string | null {
  if (type == null) {
    // Host root, text node or just invalid type.
    return null;
  }
  if (typeof type === 'function') {
    if ((type as any).$$typeof === REACT_CLIENT_REFERENCE) {
      // TODO: Create a convention for naming client references with debug info.
      return null;
    }
    return (type as any).displayName || type.name || null;
  }
  if (typeof type === 'string') {
    return type;
  }
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return 'Fragment';
    case REACT_PROFILER_TYPE:
      return 'Profiler';
    case REACT_STRICT_MODE_TYPE:
      return 'StrictMode';
    case REACT_SUSPENSE_TYPE:
      return 'Suspense';
    case REACT_SUSPENSE_LIST_TYPE:
      return 'SuspenseList';
    case REACT_ACTIVITY_TYPE:
      return 'Activity';
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) {
        return 'ViewTransition';
      }
    // Fall through
    case REACT_TRACING_MARKER_TYPE:
      if (enableTransitionTracing) {
        return 'TracingMarker';
      }
  }
  if (typeof type === 'object') {
    if (__DEV__) {
      if (typeof (type as any).tag === 'number') {
        console.error(
          'Received an unexpected object in getComponentNameFromType(). ' +
            'This is likely a bug in React. Please file an issue.',
        );
      }
    }
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return 'Portal';
      case REACT_CONTEXT_TYPE:
        const context: ReactContext<any> = type as any;
        return getContextName(context);
      case REACT_CONSUMER_TYPE:
        const consumer: ReactConsumerType<any> = type as any;
        return getContextName(consumer._context) + '.Consumer';
      case REACT_FORWARD_REF_TYPE:
        return getWrappedName(type, type.render, 'ForwardRef');
      case REACT_MEMO_TYPE:
        const outerName = (type as any).displayName || null;
        if (outerName !== null) {
          return outerName;
        }
        return getComponentNameFromType(type.type) || 'Memo';
      case REACT_LAZY_TYPE: {
        const lazyComponent: LazyComponent<any, any> = type as any;
        const payload = lazyComponent._payload;
        const init = lazyComponent._init;
        try {
          return getComponentNameFromType(init(payload));
        } catch (x) {
          return null;
        }
      }
    }
  }
  return null;
}
