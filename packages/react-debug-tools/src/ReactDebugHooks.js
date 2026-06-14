/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {StackFrame as ParsedStackFrame} from 'error-stack-parser';
import type {
  Awaited,
  ReactContext,
  StartTransitionOptions,
  Usable,
  Thenable,
  ReactDebugInfo,
} from 'shared/ReactTypes';
import type {
  ContextDependency,
  Dependencies,
  Fiber,
  Dispatcher as DispatcherType,
} from 'react-reconciler/src/ReactInternalTypes';
import type {TransitionStatus} from 'react-reconciler/src/ReactFiberConfig';

import ErrorStackParser from 'error-stack-parser';
import assign from 'shared/assign';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  FunctionComponent,
  SimpleMemoComponent,
  ContextProvider,
  ForwardRef,
} from 'react-reconciler/src/ReactWorkTags';
import {
  REACT_MEMO_CACHE_SENTINEL,
  REACT_CONTEXT_TYPE,
} from 'shared/ReactSymbols';
import hasOwnProperty from 'shared/hasOwnProperty';

type CurrentDispatcherRef = typeof ReactSharedInternals;

// Used to track hooks called during a render

type HookLogEntry = {
  displayName: string | null,
  primitive: string,
  stackError: Error,
  value: mixed,
  debugInfo: ReactDebugInfo | null,
  dispatcherHookName: string,
};

let hookLog: Array<HookLogEntry> = [];

// Primitives

type BasicStateAction<S> = (S => S) | S;

type Dispatch<A> = A => void;

let primitiveStackCache: null | Map<string, Array<any>> = null;

type Hook = {
  memoizedState: any,
  next: Hook | null,
};

function getPrimitiveStackCache(): Map<string, Array<any>> {
  // This initializes a cache of all primitive hooks so that the top
  // most stack frames added by calling the primitive hook can be removed.
  if (primitiveStackCache === null) {
    const cache = new Map<string, Array<any>>();
    let readHookLog;
    try {
      // Use all hooks here to add them to the hook log.
      Dispatcher.useContext({_currentValue: null} as any);
      Dispatcher.useState(null);
      Dispatcher.useReducer((s: mixed, a: mixed) => s, null);
      Dispatcher.useRef(null);
      if (typeof Dispatcher.useCacheRefresh === 'function') {
        // This type check is for Flow only.
        Dispatcher.useCacheRefresh();
      }
      Dispatcher.useLayoutEffect(() => {});
      Dispatcher.useInsertionEffect(() => {});
      Dispatcher.useEffect(() => {});
      Dispatcher.useImperativeHandle(undefined, () => null);
      Dispatcher.useDebugValue(null);
      Dispatcher.useCallback(() => {});
      Dispatcher.useTransition();
      Dispatcher.useSyncExternalStore(
        () => () => {},
        () => null,
        () => null,
      );
      Dispatcher.useDeferredValue(null);
      Dispatcher.useMemo(() => null);
      Dispatcher.useOptimistic(null, (s: mixed, a: mixed) => s);
      Dispatcher.useFormState((s: mixed, p: mixed) => s, null);
      Dispatcher.useActionState((s: mixed, p: mixed) => s, null);
      Dispatcher.useHostTransitionStatus();
      if (typeof Dispatcher.useMemoCache === 'function') {
        // This type check is for Flow only.
        Dispatcher.useMemoCache(0);
      }
      if (typeof Dispatcher.use === 'function') {
        // This type check is for Flow only.
        Dispatcher.use({
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: null,
        } as any);
        Dispatcher.use({
          then() {},
          status: 'fulfilled',
          value: null,
        });
        try {
          Dispatcher.use({
            then() {},
          } as any);
        } catch (x) {}
      }

      Dispatcher.useId();

      if (typeof Dispatcher.useEffectEvent === 'function') {
        Dispatcher.useEffectEvent((args: empty) => {});
      }
    } finally {
      readHookLog = hookLog;
      hookLog = [];
    }
    for (let i = 0; i < readHookLog.length; i++) {
      const hook = readHookLog[i];
      cache.set(hook.primitive, ErrorStackParser.parse(hook.stackError));
    }
    primitiveStackCache = cache;
  }
  return primitiveStackCache;
}

let currentFiber: null | Fiber = null;
let currentHook: null | Hook = null;
let currentContextDependency: null | ContextDependency<mixed> = null;
let currentThenableIndex: number = 0;
let currentThenableState: null | Array<Thenable<mixed>> = null;

function nextHook(): null | Hook {
  const hook = currentHook;
  if (hook !== null) {
    currentHook = hook.next;
  }
  return hook;
}

function readContext<T>(context: ReactContext<T>): T {
  if (currentFiber === null) {
    // Hook inspection without access to the Fiber tree
    // e.g. when warming up the primitive stack cache or during `ReactDebugTools.inspectHooks()`.
    return context._currentValue;
  } else {
    if (currentContextDependency === null) {
      throw new Error(
        'Context reads do not line up with context dependencies. This is a bug in React Debug Tools.',
      );
    }

    let value: T;
    // For now we don't expose readContext usage in the hooks debugging info.
    if (hasOwnProperty.call(currentContextDependency, 'memoizedValue')) {
      // $FlowFixMe[incompatible-use] Flow thinks `hasOwnProperty` mutates `currentContextDependency`
      value = currentContextDependency.memoizedValue as any as T;

      // $FlowFixMe[incompatible-use] Flow thinks `hasOwnProperty` mutates `currentContextDependency`
      currentContextDependency = currentContextDependency.next;
    } else {
      // Before React 18, we did not have `memoizedValue` so we rely on `setupContexts` in those versions.
      // Multiple reads of the same context were also only tracked as a single dependency.
      // We just give up on advancing context dependencies and solely rely on `setupContexts`.
      value = context._currentValue;
    }

    return value;
  }
}

const SuspenseException: mixed = new Error(
  "Suspense Exception: This is not a real error! It's an implementation " +
    'detail of `use` to interrupt the current render. You must either ' +
    'rethrow it immediately, or move the `use` call outside of the ' +
    '`try/catch` block. Capturing without rethrowing will lead to ' +
    'unexpected behavior.\n\n' +
    'To handle async errors, wrap your component in an error boundary, or ' +
    "call the promise's `.catch` method and pass the result to `use`.",
);

function use<T>(usable: Usable<T>): T {
  // $FlowFixMe[invalid-compare]
  if (usable !== null && typeof usable === 'object') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      const thenable: Thenable<any> =
        // If we have thenable state, then the actually used thenable will be the one
        // stashed in it. It's possible for uncached Promises to be new each render
        // and in that case the one we're inspecting is the in the thenable state.
        currentThenableState !== null &&
        currentThenableIndex < currentThenableState.length
          ? currentThenableState[currentThenableIndex++]
          : (usable as any);

      switch (thenable.status) {
        case 'fulfilled': {
          const fulfilledValue: T = thenable.value;
          hookLog.push({
            displayName: null,
            primitive: 'Promise',
            stackError: new Error(),
            value: fulfilledValue,
            debugInfo:
              thenable._debugInfo === undefined ? null : thenable._debugInfo,
            dispatcherHookName: 'Use',
          });
          return fulfilledValue;
        }
        case 'rejected': {
          const rejectedError = thenable.reason;
          throw rejectedError;
        }
      }
      // If this was an uncached Promise we have to abandon this attempt
      // but we can still emit anything up until this point.
      hookLog.push({
        displayName: null,
        primitive: 'Unresolved',
        stackError: new Error(),
        value: thenable,
        debugInfo:
          thenable._debugInfo === undefined ? null : thenable._debugInfo,
        dispatcherHookName: 'Use',
      });
      throw SuspenseException;
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      const context: ReactContext<T> = usable as any;
      const value = readContext(context);

      hookLog.push({
        displayName: context.displayName || 'Context',
        primitive: 'Context (use)',
        stackError: new Error(),
        value,
        debugInfo: null,
        dispatcherHookName: 'Use',
      });

      return value;
    }
  }

  // eslint-disable-next-line react-internal/safe-string-coercion
  throw new Error('An unsupported type was passed to use(): ' + String(usable));
}

function useContext<T>(context: ReactContext<T>): T {
  const value = readContext(context);
  hookLog.push({
    displayName: context.displayName || null,
    primitive: 'Context',
    stackError: new Error(),
    value: value,
    debugInfo: null,
    dispatcherHookName: 'Context',
  });
  return value;
}

function useState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  const hook = nextHook();
  const state: S =
    hook !== null
      ? hook.memoizedState
      : typeof initialState === 'function'
        ? // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
          initialState()
        : initialState;
  hookLog.push({
    displayName: null,
    primitive: 'State',
    stackError: new Error(),
    value: state,
    debugInfo: null,
    dispatcherHookName: 'State',
  });
  return [state, (action: BasicStateAction<S>) => {}];
}

function useReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = nextHook();
  let state;
  if (hook !== null) {
    state = hook.memoizedState;
  } else {
    state = init !== undefined ? init(initialArg) : (initialArg as any as S);
  }
  hookLog.push({
    displayName: null,
    primitive: 'Reducer',
    stackError: new Error(),
    value: state,
    debugInfo: null,
    dispatcherHookName: 'Reducer',
  });
  return [state, (action: A) => {}];
}

function useRef<T>(initialValue: T): {current: T} {
  const hook = nextHook();
  const ref = hook !== null ? hook.memoizedState : {current: initialValue};
  hookLog.push({
    displayName: null,
    primitive: 'Ref',
    stackError: new Error(),
    value: ref.current,
    debugInfo: null,
    dispatcherHookName: 'Ref',
  });
  return ref;
}

function useCacheRefresh(): () => void {
  const hook = nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'CacheRefresh',
    stackError: new Error(),
    value: hook !== null ? hook.memoizedState : function refresh() {},
    debugInfo: null,
    dispatcherHookName: 'CacheRefresh',
  });
  return () => {};
}

function useLayoutEffect(
  create: () => (() => void) | void,
  inputs: Array<mixed> | void | null,
): void {
  nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'LayoutEffect',
    stackError: new Error(),
    value: create,
    debugInfo: null,
    dispatcherHookName: 'LayoutEffect',
  });
}

function useInsertionEffect(
  create: () => mixed,
  inputs: Array<mixed> | void | null,
): void {
  nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'InsertionEffect',
    stackError: new Error(),
    value: create,
    debugInfo: null,
    dispatcherHookName: 'InsertionEffect',
  });
}

function useEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'Effect',
    stackError: new Error(),
    value: create,
    debugInfo: null,
    dispatcherHookName: 'Effect',
  });
}

function useImperativeHandle<T>(
  ref: {current: T | null} | ((inst: T | null) => mixed) | null | void,
  create: () => T,
  inputs: Array<mixed> | void | null,
): void {
  nextHook();
  // We don't actually store the instance anywhere if there is no ref callback
  // and if there is a ref callback it might not store it but if it does we
  // have no way of knowing where. So let's only enable introspection of the
  // ref itself if it is using the object form.
  let instance: ?T = undefined;
  if (ref !== null && typeof ref === 'object') {
    instance = ref.current;
  }
  hookLog.push({
    displayName: null,
    primitive: 'ImperativeHandle',
    stackError: new Error(),
    value: instance,
    debugInfo: null,
    dispatcherHookName: 'ImperativeHandle',
  });
}

function useDebugValue(value: any, formatterFn: ?(value: any) => any) {
  hookLog.push({
    displayName: null,
    primitive: 'DebugValue',
    stackError: new Error(),
    value: typeof formatterFn === 'function' ? formatterFn(value) : value,
    debugInfo: null,
    dispatcherHookName: 'DebugValue',
  });
}

function useCallback<T>(callback: T, inputs: Array<mixed> | void | null): T {
  const hook = nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'Callback',
    stackError: new Error(),
    value: hook !== null ? hook.memoizedState[0] : callback,
    debugInfo: null,
    dispatcherHookName: 'Callback',
  });
  return callback;
}

function useMemo<T>(
  nextCreate: () => T,
  inputs: Array<mixed> | void | null,
): T {
  const hook = nextHook();
  const value = hook !== null ? hook.memoizedState[0] : nextCreate();
  hookLog.push({
    displayName: null,
    primitive: 'Memo',
    stackError: new Error(),
    value,
    debugInfo: null,
    dispatcherHookName: 'Memo',
  });
  return value;
}

function useSyncExternalStore<T>(
  subscribe: (() => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  // useSyncExternalStore() composes multiple hooks internally.
  // Advance the current hook index the same number of times
  // so that subsequent hooks have the right memoized state.
  const hook = nextHook(); // SyncExternalStore
  nextHook(); // Effect
  // Read from hook.memoizedState to get the value that was used during render,
  // not the current value from getSnapshot() which may have changed.
  const value = hook !== null ? hook.memoizedState : getSnapshot();
  hookLog.push({
    displayName: null,
    primitive: 'SyncExternalStore',
    stackError: new Error(),
    value,
    debugInfo: null,
    dispatcherHookName: 'SyncExternalStore',
  });
  return value;
}

function useTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  // useTransition() composes multiple hooks internally.
  // Advance the current hook index the same number of times
  // so that subsequent hooks have the right memoized state.
  const stateHook = nextHook();
  nextHook(); // Callback

  const isPending = stateHook !== null ? stateHook.memoizedState : false;

  hookLog.push({
    displayName: null,
    primitive: 'Transition',
    stackError: new Error(),
    value: isPending,
    debugInfo: null,
    dispatcherHookName: 'Transition',
  });
  return [isPending, () => {}];
}

function useDeferredValue<T>(value: T, initialValue?: T): T {
  const hook = nextHook();
  const prevValue = hook !== null ? hook.memoizedState : value;
  hookLog.push({
    displayName: null,
    primitive: 'DeferredValue',
    stackError: new Error(),
    value: prevValue,
    debugInfo: null,
    dispatcherHookName: 'DeferredValue',
  });
  return prevValue;
}

function useId(): string {
  const hook = nextHook();
  const id = hook !== null ? hook.memoizedState : '';
  hookLog.push({
    displayName: null,
    primitive: 'Id',
    stackError: new Error(),
    value: id,
    debugInfo: null,
    dispatcherHookName: 'Id',
  });
  return id;
}

// useMemoCache is an implementation detail of Forget's memoization
// it should not be called directly in user-generated code
function useMemoCache(size: number): Array<mixed> {
  const fiber = currentFiber;
  // Don't throw, in case this is called from getPrimitiveStackCache
  if (fiber == null) {
    return [];
  }

  const memoCache =
    // $FlowFixMe[incompatible-use]: updateQueue is mixed
    fiber.updateQueue != null ? fiber.updateQueue.memoCache : null;
  if (memoCache == null) {
    return [];
  }

  let data = memoCache.data[memoCache.index];
  if (data === undefined) {
    data = memoCache.data[memoCache.index] = new Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    }
  }

  // We don't write anything to hookLog on purpose, so this hook remains invisible to users.

  memoCache.index++;
  return data;
}

function useOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  const hook = nextHook();
  let state;
  if (hook !== null) {
    state = hook.memoizedState;
  } else {
    state = passthrough;
  }
  hookLog.push({
    displayName: null,
    primitive: 'Optimistic',
    stackError: new Error(),
    value: state,
    debugInfo: null,
    dispatcherHookName: 'Optimistic',
  });
  return [state, (action: A) => {}];
}

function useFormState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  const hook = nextHook(); // FormState
  nextHook(); // PendingState
  nextHook(); // ActionQueue
  const stackError = new Error();
  let value;
  let debugInfo = null;
  let error = null;

  if (hook !== null) {
    const actionResult = hook.memoizedState;
    if (
      typeof actionResult === 'object' &&
      actionResult !== null &&
      // $FlowFixMe[method-unbinding]
      typeof actionResult.then === 'function'
    ) {
      const thenable: Thenable<Awaited<S>> = actionResult as any;
      switch (thenable.status) {
        case 'fulfilled': {
          value = thenable.value;
          debugInfo =
            thenable._debugInfo === undefined ? null : thenable._debugInfo;
          break;
        }
        case 'rejected': {
          const rejectedError = thenable.reason;
          error = rejectedError;
          break;
        }
        default:
          // If this was an uncached Promise we have to abandon this attempt
          // but we can still emit anything up until this point.
          error = SuspenseException;
          debugInfo =
            thenable._debugInfo === undefined ? null : thenable._debugInfo;
          value = thenable;
      }
    } else {
      value = actionResult as any;
    }
  } else {
    value = initialState;
  }

  hookLog.push({
    displayName: null,
    primitive: 'FormState',
    stackError: stackError,
    value: value,
    debugInfo: debugInfo,
    dispatcherHookName: 'FormState',
  });

  if (error !== null) {
    throw error;
  }

  // value being a Thenable is equivalent to error being not null
  // i.e. we only reach this point with Awaited<S>
  const state = value as any as Awaited<S>;

  // TODO: support displaying pending value
  return [state, (payload: P) => {}, false];
}

function useActionState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  const hook = nextHook(); // FormState
  nextHook(); // PendingState
  nextHook(); // ActionQueue
  const stackError = new Error();
  let value;
  let debugInfo = null;
  let error = null;

  if (hook !== null) {
    const actionResult = hook.memoizedState;
    if (
      typeof actionResult === 'object' &&
      actionResult !== null &&
      // $FlowFixMe[method-unbinding]
      typeof actionResult.then === 'function'
    ) {
      const thenable: Thenable<Awaited<S>> = actionResult as any;
      switch (thenable.status) {
        case 'fulfilled': {
          value = thenable.value;
          debugInfo =
            thenable._debugInfo === undefined ? null : thenable._debugInfo;
          break;
        }
        case 'rejected': {
          const rejectedError = thenable.reason;
          error = rejectedError;
          break;
        }
        default:
          // If this was an uncached Promise we have to abandon this attempt
          // but we can still emit anything up until this point.
          error = SuspenseException;
          debugInfo =
            thenable._debugInfo === undefined ? null : thenable._debugInfo;
          value = thenable;
      }
    } else {
      value = actionResult as any;
    }
  } else {
    value = initialState;
  }

  hookLog.push({
    displayName: null,
    primitive: 'ActionState',
    stackError: stackError,
    value: value,
    debugInfo: debugInfo,
    dispatcherHookName: 'ActionState',
  });

  if (error !== null) {
    throw error;
  }

  // value being a Thenable is equivalent to error being not null
  // i.e. we only reach this point with Awaited<S>
  const state = value as any as Awaited<S>;

  // TODO: support displaying pending value
  return [state, (payload: P) => {}, false];
}

function useHostTransitionStatus(): TransitionStatus {
  const status = readContext<TransitionStatus>(
    // $FlowFixMe[prop-missing] `readContext` only needs _currentValue
    // $FlowFixMe[incompatible-type]
    {
      // $FlowFixMe[incompatible-type] TODO: Incorrect bottom value without access to Fiber config.
      _currentValue: null,
    } as ReactContext<TransitionStatus>,
  );

  hookLog.push({
    displayName: null,
    primitive: 'HostTransitionStatus',
    stackError: new Error(),
    value: status,
    debugInfo: null,
    dispatcherHookName: 'HostTransitionStatus',
  });

  return status;
}

function useEffectEvent<Args, F: (...Array<Args>) => mixed>(callback: F): F {
  nextHook();
  hookLog.push({
    displayName: null,
    primitive: 'EffectEvent',
    stackError: new Error(),
    value: callback,
    debugInfo: null,
    dispatcherHookName: 'EffectEvent',
  });

  return callback;
}

const Dispatcher: DispatcherType = {
  readContext,

  use,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useInsertionEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useDebugValue,
  useDeferredValue,
  useTransition,
  useSyncExternalStore,
  useId,
  useHostTransitionStatus,
  useFormState,
  useActionState,
  useOptimistic,
  useMemoCache,
  useCacheRefresh,
  useEffectEvent,
};

// create a proxy to throw a custom error
// in case future versions of React adds more hooks
const DispatcherProxyHandler: Proxy$traps<DispatcherType> = {
  get(target: DispatcherType, prop: string) {
    if (target.hasOwnProperty(prop)) {
      // $FlowFixMe[invalid-computed-prop]
      return target[prop];
    }
    const error = new Error('Missing method in Dispatcher: ' + prop);
    // Note: This error name needs to stay in sync with react-devtools-shared
    // TODO: refactor this if we ever combine the devtools and debug tools packages
    error.name = 'ReactDebugToolsUnsupportedHookError';
    throw error;
  },
};

// `Proxy` may not exist on some platforms
const DispatcherProxy =
  typeof Proxy === 'undefined'
    ? Dispatcher
    : new Proxy(Dispatcher, DispatcherProxyHandler);

// Inspect

export type HookSource = {
  lineNumber: number | null,
  columnNumber: number | null,
  fileName: string | null,
  functionName: string | null,
};

export type HooksNode = {
  id: number | null,
  isStateEditable: boolean,
  name: string,
  value: mixed,
  subHooks: Array<HooksNode>,
  debugInfo: null | ReactDebugInfo,
  hookSource: null | HookSource,
};
export type HooksTree = Array<HooksNode>;

// Don't assume
//
// We can't assume that stack frames are nth steps away from anything.
// E.g. we can't assume that the root call shares all frames with the stack
// of a hook call. A simple way to demonstrate this is wrapping `new Error()`
// in a wrapper constructor like a polyfill. That'll add an extra frame.
// Similar things can happen with the call to the dispatcher. The top frame
// may not be the primitive.
//
// We also can't assume that the last frame of the root call is the same
// frame as the last frame of the hook call because long stack traces can be
// truncated to a stack trace limit.

let mostLikelyAncestorIndex = 0;

function findSharedIndex(
  hookStack: ParsedStackFrame[],
  rootStack: ParsedStackFrame[],
  rootIndex: number,
) {
  const source = rootStack[rootIndex].source;
  hookSearch: for (let i = 0; i < hookStack.length; i++) {
    if (hookStack[i].source === source) {
      // This looks like a match. Validate that the rest of both stack match up.
      for (
        let a = rootIndex + 1, b = i + 1;
        a < rootStack.length && b < hookStack.length;
        a++, b++
      ) {
        if (hookStack[b].source !== rootStack[a].source) {
          // If not, give up and try a different match.
          continue hookSearch;
        }
      }
      return i;
    }
  }
  return -1;
}

function findCommonAncestorIndex(
  rootStack: ParsedStackFrame[],
  hookStack: ParsedStackFrame[],
) {
  let rootIndex = findSharedIndex(
    hookStack,
    rootStack,
    mostLikelyAncestorIndex,
  );
  if (rootIndex !== -1) {
    return rootIndex;
  }
  // If the most likely one wasn't a hit, try any other frame to see if it is shared.
  // If that takes more than 5 frames, something probably went wrong.
  for (let i = 0; i < rootStack.length && i < 5; i++) {
    rootIndex = findSharedIndex(hookStack, rootStack, i);
    if (rootIndex !== -1) {
      mostLikelyAncestorIndex = i;
      return rootIndex;
    }
  }
  return -1;
}

function isReactWrapper(functionName: void | string, wrapperName: string) {
  const hookName = parseHookName(functionName);
  if (wrapperName === 'HostTransitionStatus') {
    return hookName === wrapperName || hookName === 'FormStatus';
  }

  return hookName === wrapperName;
}

function findPrimitiveIndex(hookStack: ParsedStackFrame[], hook: HookLogEntry) {
  const stackCache = getPrimitiveStackCache();
  const primitiveStack = stackCache.get(hook.primitive);
  if (primitiveStack === undefined) {
    return -1;
  }
  for (let i = 0; i < primitiveStack.length && i < hookStack.length; i++) {
    // Note: there is no guarantee that we will find the top-most primitive frame in the stack
    // For React Native (uses Hermes), these source fields will be identical and skipped
    if (primitiveStack[i].source !== hookStack[i].source) {
      // If the next two frames are functions called `useX` then we assume that they're part of the
      // wrappers that the React package or other packages adds around the dispatcher.
      if (
        i < hookStack.length - 1 &&
        isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)
      ) {
        i++;
      }
      if (
        i < hookStack.length - 1 &&
        isReactWrapper(hookStack[i].functionName, hook.dispatcherHookName)
      ) {
        i++;
      }

      return i;
    }
  }
  return -1;
}

function parseTrimmedStack(rootStack: ParsedStackFrame[], hook: HookLogEntry) {
  // Get the stack trace between the primitive hook function and
  // the root function call. I.e. the stack frames of custom hooks.
  const hookStack = ErrorStackParser.parse(hook.stackError);
  const rootIndex = findCommonAncestorIndex(rootStack, hookStack);
  const primitiveIndex = findPrimitiveIndex(hookStack, hook);
  if (
    rootIndex === -1 ||
    primitiveIndex === -1 ||
    rootIndex - primitiveIndex < 2
  ) {
    if (primitiveIndex === -1) {
      // Something went wrong. Give up.
      return [null, null];
    } else {
      return [hookStack[primitiveIndex - 1], null];
    }
  }
  return [
    hookStack[primitiveIndex - 1],
    hookStack.slice(primitiveIndex, rootIndex - 1),
  ];
}

function parseHookName(functionName: void | string): string {
  if (!functionName) {
    return '';
  }
  let startIndex = functionName.lastIndexOf('[as ');

  if (startIndex !== -1) {
    // Workaround for sourcemaps in Jest and Chrome.
    // In `node --enable-source-maps`, we don't see "Object.useHostTransitionStatus [as useFormStatus]" but "Object.useFormStatus"
    // "Object.useHostTransitionStatus [as useFormStatus]" -> "useFormStatus"
    return parseHookName(functionName.slice(startIndex + '[as '.length, -1));
  }
  startIndex = functionName.lastIndexOf('.');
  if (startIndex === -1) {
    startIndex = 0;
  } else {
    startIndex += 1;
  }

  if (functionName.slice(startIndex).startsWith('unstable_')) {
    startIndex += 'unstable_'.length;
  }

  if (functionName.slice(startIndex).startsWith('experimental_')) {
    startIndex += 'experimental_'.length;
  }

  if (functionName.slice(startIndex, startIndex + 3) === 'use') {
    if (functionName.length - startIndex === 3) {
      return 'Use';
    }
    startIndex += 3;
  }
  return functionName.slice(startIndex);
}

function buildTree(
  rootStack: ParsedStackFrame[],
  readHookLog: Array<HookLogEntry>,
): HooksTree {
  const rootChildren: Array<HooksNode> = [];
  let prevStack = null;
  let levelChildren = rootChildren;
  let nativeHookID = 0;
  const stackOfChildren = [];
  for (let i = 0; i < readHookLog.length; i++) {
    const hook = readHookLog[i];
    const parseResult = parseTrimmedStack(rootStack, hook);
    const primitiveFrame = parseResult[0];
    const stack = parseResult[1];
    let displayName = hook.displayName;
    if (displayName === null && primitiveFrame !== null) {
      displayName =
        parseHookName(primitiveFrame.functionName) ||
        // Older versions of React do not have sourcemaps.
        // In those versions there was always a 1:1 mapping between wrapper and dispatcher method.
        parseHookName(hook.dispatcherHookName);
    }
    if (stack !== null) {
      // Note: The indices 0 <= n < length-1 will contain the names.
      // The indices 1 <= n < length will contain the source locations.
      // That's why we get the name from n - 1 and don't check the source
      // of index 0.
      let commonSteps = 0;
      if (prevStack !== null) {
        // Compare the current level's stack to the new stack.
        while (commonSteps < stack.length && commonSteps < prevStack.length) {
          const stackSource = stack[stack.length - commonSteps - 1].source;
          const prevSource =
            prevStack[prevStack.length - commonSteps - 1].source;
          if (stackSource !== prevSource) {
            break;
          }
          commonSteps++;
        }
        // Pop back the stack as many steps as were not common.
        for (let j = prevStack.length - 1; j > commonSteps; j--) {
          // $FlowFixMe[incompatible-type]
          levelChildren = stackOfChildren.pop();
        }
      }
      // The remaining part of the new stack are custom hooks. Push them
      // to the tree.
      for (let j = stack.length - commonSteps - 1; j >= 1; j--) {
        const children: Array<HooksNode> = [];
        const stackFrame = stack[j];
        const levelChild: HooksNode = {
          id: null,
          isStateEditable: false,
          name: parseHookName(stack[j - 1].functionName),
          value: undefined,
          subHooks: children,
          debugInfo: null,
          hookSource: {
            lineNumber:
              stackFrame.lineNumber === undefined
                ? null
                : stackFrame.lineNumber,
            columnNumber:
              stackFrame.columnNumber === undefined
                ? null
                : stackFrame.columnNumber,
            functionName:
              stackFrame.functionName === undefined
                ? null
                : stackFrame.functionName,
            fileName:
              stackFrame.fileName === undefined ? null : stackFrame.fileName,
          },
        };

        levelChildren.push(levelChild);
        stackOfChildren.push(levelChildren);
        levelChildren = children;
      }
      prevStack = stack;
    }
    const {primitive, debugInfo} = hook;

    // For now, the "id" of stateful hooks is just the stateful hook index.
    // Custom hooks have no ids, nor do non-stateful native hooks (e.g. Context, DebugValue).
    const id =
      primitive === 'Context' ||
      primitive === 'Context (use)' ||
      primitive === 'DebugValue' ||
      primitive === 'Promise' ||
      primitive === 'Unresolved' ||
      primitive === 'HostTransitionStatus'
        ? null
        : nativeHookID++;

    // For the time being, only State and Reducer hooks support runtime overrides.
    const isStateEditable = primitive === 'Reducer' || primitive === 'State';
    const name = displayName || primitive;
    const levelChild: HooksNode = {
      id,
      isStateEditable,
      name,
      value: hook.value,
      subHooks: [],
      debugInfo: debugInfo,
      hookSource: null,
    };

    const hookSource: HookSource = {
      lineNumber: null,
      functionName: null,
      fileName: null,
      columnNumber: null,
    };
    if (stack && stack.length >= 1) {
      const stackFrame = stack[0];
      hookSource.lineNumber =
        stackFrame.lineNumber === undefined ? null : stackFrame.lineNumber;
      hookSource.functionName =
        stackFrame.functionName === undefined ? null : stackFrame.functionName;
      hookSource.fileName =
        stackFrame.fileName === undefined ? null : stackFrame.fileName;
      hookSource.columnNumber =
        stackFrame.columnNumber === undefined ? null : stackFrame.columnNumber;
    }

    levelChild.hookSource = hookSource;

    levelChildren.push(levelChild);
  }

  // Associate custom hook values (useDebugValue() hook entries) with the correct hooks.
  processDebugValues(rootChildren, null);

  return rootChildren;
}

// Custom hooks support user-configurable labels (via the special useDebugValue() hook).
// That hook adds user-provided values to the hooks tree,
// but these values aren't intended to appear alongside of the other hooks.
// Instead they should be attributed to their parent custom hook.
// This method walks the tree and assigns debug values to their custom hook owners.
function processDebugValues(
  hooksTree: HooksTree,
  parentHooksNode: HooksNode | null,
): void {
  const debugValueHooksNodes: Array<HooksNode> = [];

  for (let i = 0; i < hooksTree.length; i++) {
    const hooksNode = hooksTree[i];
    if (hooksNode.name === 'DebugValue' && hooksNode.subHooks.length === 0) {
      hooksTree.splice(i, 1);
      i--;
      debugValueHooksNodes.push(hooksNode);
    } else {
      processDebugValues(hooksNode.subHooks, hooksNode);
    }
  }

  // Bubble debug value labels to their custom hook owner.
  // If there is no parent hook, just ignore them for now.
  // (We may warn about this in the future.)
  if (parentHooksNode !== null) {
    if (debugValueHooksNodes.length === 1) {
      parentHooksNode.value = debugValueHooksNodes[0].value;
    } else if (debugValueHooksNodes.length > 1) {
      parentHooksNode.value = debugValueHooksNodes.map(({value}) => value);
    }
  }
}

function handleRenderFunctionError(error: any): void {
  // original error might be any type.
  if (error === SuspenseException) {
    // An uncached Promise was used. We can't synchronously resolve the rest of
    // the Hooks but we can at least show what ever we got so far.
    return;
  }
  if (
    error instanceof Error &&
    error.name === 'ReactDebugToolsUnsupportedHookError'
  ) {
    throw error;
  }
  // If the error is not caused by an unsupported feature, it means
  // that the error is caused by user's code in renderFunction.
  // In this case, we should wrap the original error inside a custom error
  // so that devtools can give a clear message about it.
  // $FlowFixMe[extra-arg]: Flow doesn't know about 2nd argument of Error constructor
  const wrapperError = new Error('Error rendering inspected component', {
    cause: error,
  });
  // Note: This error name needs to stay in sync with react-devtools-shared
  // TODO: refactor this if we ever combine the devtools and debug tools packages
  wrapperError.name = 'ReactDebugToolsRenderError';
  // this stage-4 proposal is not supported by all environments yet.
  // $FlowFixMe[prop-missing] Flow doesn't have this type yet.
  wrapperError.cause = error;
  throw wrapperError;
}

export function inspectHooks<Props>(
  renderFunction: Props => React$Node,
  props: Props,
  currentDispatcher: ?CurrentDispatcherRef,
): HooksTree {
  // DevTools will pass the current renderer's injected dispatcher.
  // Other apps might compile debug hooks as part of their app though.
  if (currentDispatcher == null) {
    currentDispatcher = ReactSharedInternals;
  }

  const previousDispatcher = currentDispatcher.H;
  currentDispatcher.H = DispatcherProxy;

  let readHookLog;
  let ancestorStackError;

  try {
    ancestorStackError = new Error();
    renderFunction(props);
  } catch (error) {
    handleRenderFunctionError(error);
  } finally {
    readHookLog = hookLog;
    hookLog = [];
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    currentDispatcher.H = previousDispatcher;
  }
  const rootStack =
    ancestorStackError === undefined
      ? ([] as Array<ParsedStackFrame>)
      : ErrorStackParser.parse(ancestorStackError);
  return buildTree(rootStack, readHookLog);
}

function setupContexts(contextMap: Map<ReactContext<any>, any>, fiber: Fiber) {
  let current: null | Fiber = fiber;
  while (current) {
    if (current.tag === ContextProvider) {
      let context: ReactContext<any> = current.type;
      if ((context as any)._context !== undefined) {
        // Support inspection of pre-19+ providers.
        context = (context as any)._context;
      }
      if (!contextMap.has(context)) {
        // Store the current value that we're going to restore later.
        contextMap.set(context, context._currentValue);
        // Set the inner most provider value on the context.
        context._currentValue = current.memoizedProps.value;
      }
    }
    current = current.return;
  }
}

function restoreContexts(contextMap: Map<ReactContext<any>, any>) {
  contextMap.forEach((value, context) => (context._currentValue = value));
}

function inspectHooksOfForwardRef<Props, Ref>(
  renderFunction: (Props, Ref) => React$Node,
  props: Props,
  ref: Ref,
  currentDispatcher: CurrentDispatcherRef,
): HooksTree {
  const previousDispatcher = currentDispatcher.H;
  let readHookLog;
  currentDispatcher.H = DispatcherProxy;
  let ancestorStackError;
  try {
    ancestorStackError = new Error();
    renderFunction(props, ref);
  } catch (error) {
    handleRenderFunctionError(error);
  } finally {
    readHookLog = hookLog;
    hookLog = [];
    currentDispatcher.H = previousDispatcher;
  }
  const rootStack =
    ancestorStackError === undefined
      ? ([] as Array<ParsedStackFrame>)
      : ErrorStackParser.parse(ancestorStackError);
  return buildTree(rootStack, readHookLog);
}

function resolveDefaultProps(Component: any, baseProps: any) {
  if (Component && Component.defaultProps) {
    // Resolve default props. Taken from ReactElement
    const props = assign({}, baseProps);
    const defaultProps = Component.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
    return props;
  }
  return baseProps;
}

export function inspectHooksOfFiber(
  fiber: Fiber,
  currentDispatcher: ?CurrentDispatcherRef,
): HooksTree {
  // DevTools will pass the current renderer's injected dispatcher.
  // Other apps might compile debug hooks as part of their app though.
  if (currentDispatcher == null) {
    currentDispatcher = ReactSharedInternals;
  }

  if (
    fiber.tag !== FunctionComponent &&
    fiber.tag !== SimpleMemoComponent &&
    fiber.tag !== ForwardRef
  ) {
    throw new Error(
      'Unknown Fiber. Needs to be a function component to inspect hooks.',
    );
  }

  // Warm up the cache so that it doesn't consume the currentHook.
  getPrimitiveStackCache();

  // Set up the current hook so that we can step through and read the
  // current state from them.
  currentHook = fiber.memoizedState as Hook;
  currentFiber = fiber;
  const thenableState =
    fiber.dependencies && fiber.dependencies._debugThenableState;
  // In DEV the thenableState is an inner object.
  const usedThenables: any = thenableState
    ? thenableState.thenables || thenableState
    : null;
  currentThenableState = Array.isArray(usedThenables) ? usedThenables : null;
  currentThenableIndex = 0;

  if (hasOwnProperty.call(currentFiber, 'dependencies')) {
    // $FlowFixMe[incompatible-use]: Flow thinks hasOwnProperty might have nulled `currentFiber`
    const dependencies = currentFiber.dependencies;
    currentContextDependency =
      dependencies !== null ? dependencies.firstContext : null;
  } else if (hasOwnProperty.call(currentFiber, 'dependencies_old')) {
    const dependencies: Dependencies = (currentFiber as any).dependencies_old;
    currentContextDependency =
      // $FlowFixMe[invalid-compare]
      dependencies !== null ? dependencies.firstContext : null;
  } else if (hasOwnProperty.call(currentFiber, 'dependencies_new')) {
    const dependencies: Dependencies = (currentFiber as any).dependencies_new;
    currentContextDependency =
      // $FlowFixMe[invalid-compare]
      dependencies !== null ? dependencies.firstContext : null;
  } else if (hasOwnProperty.call(currentFiber, 'contextDependencies')) {
    const contextDependencies = (currentFiber as any).contextDependencies;
    currentContextDependency =
      contextDependencies !== null ? contextDependencies.first : null;
  } else {
    throw new Error(
      'Unsupported React version. This is a bug in React Debug Tools.',
    );
  }

  const type = fiber.type;
  let props = fiber.memoizedProps;
  if (type !== fiber.elementType) {
    props = resolveDefaultProps(type, props);
  }

  // Only used for versions of React without memoized context value in context dependencies.
  const contextMap = new Map<ReactContext<any>, any>();
  try {
    if (
      currentContextDependency !== null &&
      !hasOwnProperty.call(currentContextDependency, 'memoizedValue')
    ) {
      setupContexts(contextMap, fiber);
    }

    if (fiber.tag === ForwardRef) {
      return inspectHooksOfForwardRef(
        type.render,
        props,
        fiber.ref,
        currentDispatcher,
      );
    }

    return inspectHooks(type, props, currentDispatcher);
  } finally {
    currentFiber = null;
    currentHook = null;
    currentContextDependency = null;
    currentThenableState = null;
    currentThenableIndex = 0;

    restoreContexts(contextMap);
  }
}
