/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {LazyComponent} from 'react/src/ReactLazy';

import type {ReactComponentInfo} from 'shared/ReactTypes';

import type {ReactClientValue} from './ReactFlightServer';

import {setCurrentOwner} from './flight/ReactFlightCurrentOwner';

// These indirections exists so we can exclude its stack frame in DEV (and anything below it).
// TODO: Consider marking the whole bundle instead of these boundaries.

const callComponent = {
  react_stack_bottom_frame: function <Props, R>(
    Component: (p: Props, arg: void) => R,
    props: Props,
    componentDebugInfo: ReactComponentInfo,
  ): R {
    // The secondArg is always undefined in Server Components since refs error early.
    const secondArg = undefined;
    setCurrentOwner(componentDebugInfo);
    try {
      return Component(props, secondArg);
    } finally {
      setCurrentOwner(null);
    }
  },
};

export const callComponentInDEV: <Props, R>(
  Component: (p: Props, arg: void) => R,
  props: Props,
  componentDebugInfo: ReactComponentInfo,
) => R = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponent.react_stack_bottom_frame.bind(callComponent) as any)
  : (null as any);

const callLazyInit = {
  react_stack_bottom_frame: function (lazy: LazyComponent<any, any>): any {
    const payload = lazy._payload;
    const init = lazy._init;
    return init(payload);
  },
};

export const callLazyInitInDEV: (lazy: LazyComponent<any, any>) => any = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callLazyInit.react_stack_bottom_frame.bind(callLazyInit) as any)
  : (null as any);

const callIterator = {
  react_stack_bottom_frame: function (
    iterator: $AsyncIterator<ReactClientValue, ReactClientValue, void>,
    progress: (
      entry:
        | {done: false, +value: ReactClientValue, ...}
        | {done: true, +value: ReactClientValue, ...},
    ) => void,
    error: (reason: mixed) => void,
  ): void {
    iterator.next().then(progress, error);
  },
};

export const callIteratorInDEV: (
  iterator: $AsyncIterator<ReactClientValue, ReactClientValue, void>,
  progress: (
    entry:
      | {done: false, +value: ReactClientValue, ...}
      | {done: true, +value: ReactClientValue, ...},
  ) => void,
  error: (reason: mixed) => void,
) => void = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callIterator.react_stack_bottom_frame.bind(callIterator) as any)
  : (null as any);
