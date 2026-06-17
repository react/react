/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher} from 'react-reconciler/src/ReactInternalTypes';
import type {Request} from './ReactFlightServer';
import type {Thenable, Usable, ReactComponentInfo} from 'shared/ReactTypes';
import type {ThenableState} from './ReactFlightThenable';
import {
  REACT_MEMO_CACHE_SENTINEL,
  REACT_CONTEXT_TYPE,
} from 'shared/ReactSymbols';
import {createThenableState, trackUsedThenable} from './ReactFlightThenable';
import {isClientReference} from './ReactFlightServerConfig';

let currentRequest = null;
let thenableIndexCounter = 0;
let thenableState = null;
let currentComponentDebugInfo = null;

export function prepareToUseHooksForRequest(request: Request) {
  currentRequest = request;
}

export function resetHooksForRequest() {
  currentRequest = null;
}

export function prepareToUseHooksForComponent(
  prevThenableState: ThenableState | null,
  componentDebugInfo: null | ReactComponentInfo,
) {
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  if (__DEV__) {
    currentComponentDebugInfo = componentDebugInfo;
  }
}

export function getThenableStateAfterSuspending(): ThenableState {
  // If you use() to Suspend this should always exist but if you throw a Promise instead,
  // which is not really supported anymore, it will be empty. We use the empty set as a
  // marker to know if this was a replay of the same component or first attempt.
  const state = thenableState || createThenableState();
  if (__DEV__) {
    // This is a hack but we stash the debug info here so that we don't need a completely
    // different data structure just for this in DEV. Not too happy about it.
    (state as any)._componentDebugInfo = currentComponentDebugInfo;
    currentComponentDebugInfo = null;
  }
  thenableState = null;
  return state;
}

export function getTrackedThenablesAfterRendering(): null | Array<
  Thenable<any>,
> {
  return thenableState;
}

export const HooksDispatcher: Dispatcher = {
  readContext: unsupportedContext as any,

  use,
  useCallback<T>(callback: T): T {
    return callback;
  },
  useContext: unsupportedContext as any,
  useEffect: unsupportedHook as any,
  useImperativeHandle: unsupportedHook as any,
  useLayoutEffect: unsupportedHook as any,
  useInsertionEffect: unsupportedHook as any,
  useMemo<T>(nextCreate: () => T): T {
    return nextCreate();
  },
  useReducer: unsupportedHook as any,
  useRef: unsupportedHook as any,
  useState: unsupportedHook as any,
  useDebugValue(): void {},
  useDeferredValue: unsupportedHook as any,
  useTransition: unsupportedHook as any,
  useSyncExternalStore: unsupportedHook as any,
  useId,
  useHostTransitionStatus: unsupportedHook as any,
  useFormState: unsupportedHook as any,
  useActionState: unsupportedHook as any,
  useOptimistic: unsupportedHook as any,
  useMemoCache(size: number): Array<any> {
    const data = new Array<any>(size);
    for (let i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }
    return data;
  },
  useCacheRefresh(): <T>(?() => T, ?T) => void {
    return unsupportedRefresh;
  },
  useEffectEvent: unsupportedHook as any,
};

function unsupportedHook(): void {
  throw new Error('This Hook is not supported in Server Components.');
}

function unsupportedRefresh(): void {
  throw new Error(
    'Refreshing the cache is not supported in Server Components.',
  );
}

function unsupportedContext(): void {
  throw new Error('Cannot read a Client Context from a Server Component.');
}

function useId(): string {
  if (currentRequest === null) {
    throw new Error('useId can only be used while React is rendering');
  }
  const id = currentRequest.identifierCount++;
  // use 'S' for Flight components to distinguish from 'R' and 'r' in Fizz/Client
  return '_' + currentRequest.identifierPrefix + 'S_' + id.toString(32) + '_';
}

function use<T>(usable: Usable<T>): T {
  if (
    // $FlowFixMe[invalid-compare]
    (usable !== null && typeof usable === 'object') ||
    typeof usable === 'function'
  ) {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      const thenable: Thenable<T> = usable as any;

      // Track the position of the thenable within this fiber.
      const index = thenableIndexCounter;
      thenableIndexCounter += 1;

      if (thenableState === null) {
        thenableState = createThenableState();
      }
      return trackUsedThenable(thenableState, thenable, index);
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      unsupportedContext();
    }
  }

  if (isClientReference(usable)) {
    if (usable.value != null && usable.value.$$typeof === REACT_CONTEXT_TYPE) {
      // Show a more specific message since it's a common mistake.
      throw new Error('Cannot read a Client Context from a Server Component.');
    } else {
      throw new Error('Cannot use() an already resolved Client Reference.');
    }
  } else {
    throw new Error(
      // eslint-disable-next-line react-internal/safe-string-coercion
      'An unsupported type was passed to use(): ' + String(usable),
    );
  }
}
