/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher} from 'react-reconciler/src/ReactInternalTypes';

import type {
  ReactContext,
  StartTransitionOptions,
  Thenable,
  Usable,
  ReactCustomFormAction,
  Awaited,
} from 'shared/ReactTypes';

import type {ResumableState} from './ReactFizzConfig';
import type {Request, Task, KeyNode} from './ReactFizzServer';
import type {ThenableState} from './ReactFizzThenable';
import type {TransitionStatus} from './ReactFizzConfig';

import {readContext as readContextImpl} from './ReactFizzNewContext';
import {getTreeId} from './ReactFizzTreeContext';
import {
  createThenableState,
  trackUsedThenable,
  readPreviousThenable,
} from './ReactFizzThenable';

import {
  makeId,
  NotPendingTransition,
  supportsClientAPIs,
} from './ReactFizzConfig';
import {createFastHash} from './ReactServerStreamConfig';

import is from 'shared/objectIs';
import {
  REACT_CONTEXT_TYPE,
  REACT_MEMO_CACHE_SENTINEL,
} from 'shared/ReactSymbols';
import {checkAttributeStringCoercion} from 'shared/CheckStringCoercion';
import {getFormState} from './ReactFizzServer';

import noop from 'shared/noop';

type BasicStateAction<S> = (S => S) | S;
type Dispatch<A> = A => void;

type Update<A> = {
  action: A,
  next: Update<A> | null,
};

type UpdateQueue<A> = {
  last: Update<A> | null,
  dispatch: any,
};

type Hook = {
  memoizedState: any,
  queue: UpdateQueue<any> | null,
  next: Hook | null,
};

let currentlyRenderingComponent: Object | null = null;
let currentlyRenderingTask: Task | null = null;
let currentlyRenderingRequest: Request | null = null;
let currentlyRenderingKeyPath: KeyNode | null = null;
let firstWorkInProgressHook: Hook | null = null;
let workInProgressHook: Hook | null = null;
// Whether the work-in-progress hook is a re-rendered hook
let isReRender: boolean = false;
// Whether an update was scheduled during the currently executing render pass.
let didScheduleRenderPhaseUpdate: boolean = false;
// Counts the number of useId hooks in this component
let localIdCounter: number = 0;
// Chunks that should be pushed to the stream once the component
// finishes rendering.
// Counts the number of useActionState calls in this component
let actionStateCounter: number = 0;
// The index of the useActionState hook that matches the one passed in at the
// root during an MPA navigation, if any.
let actionStateMatchingIndex: number = -1;
// Counts the number of use(thenable) calls in this component
let thenableIndexCounter: number = 0;
let thenableState: ThenableState | null = null;
// Lazily created map of render-phase updates
let renderPhaseUpdates: Map<UpdateQueue<any>, Update<any>> | null = null;
// Counter to prevent infinite loops.
let numberOfReRenders: number = 0;
const RE_RENDER_LIMIT = 25;

let isInHookUserCodeInDev = false;

// In DEV, this is the name of the currently executing primitive hook
let currentHookNameInDev: ?string;

function resolveCurrentlyRenderingComponent(): Object {
  if (currentlyRenderingComponent === null) {
    throw new Error(
      'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
        ' one of the following reasons:\n' +
        '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
        '2. You might be breaking the Rules of Hooks\n' +
        '3. You might have more than one copy of React in the same app\n' +
        'See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.',
    );
  }

  if (__DEV__) {
    if (isInHookUserCodeInDev) {
      console.error(
        'Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. ' +
          'You can only call Hooks at the top level of your React function. ' +
          'For more information, see ' +
          'https://react.dev/link/rules-of-hooks',
      );
    }
  }
  return currentlyRenderingComponent;
}

function areHookInputsEqual(
  nextDeps: Array<mixed>,
  prevDeps: Array<mixed> | null,
) {
  if (prevDeps === null) {
    if (__DEV__) {
      console.error(
        '%s received a final argument during this render, but not during ' +
          'the previous render. Even though the final argument is optional, ' +
          'its type cannot change between renders.',
        currentHookNameInDev,
      );
    }
    return false;
  }

  if (__DEV__) {
    // Don't bother comparing lengths in prod because these arrays should be
    // passed inline.
    if (nextDeps.length !== prevDeps.length) {
      console.error(
        'The final argument passed to %s changed size between renders. The ' +
          'order and size of this array must remain constant.\n\n' +
          'Previous: %s\n' +
          'Incoming: %s',
        currentHookNameInDev,
        `[${nextDeps.join(', ')}]`,
        `[${prevDeps.join(', ')}]`,
      );
    }
  }
  // $FlowFixMe[incompatible-use] found when upgrading Flow
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function createHook(): Hook {
  if (numberOfReRenders > 0) {
    throw new Error('Rendered more hooks than during the previous render');
  }
  return {
    memoizedState: null,
    queue: null,
    next: null,
  };
}

function createWorkInProgressHook(): Hook {
  if (workInProgressHook === null) {
    // This is the first hook in the list
    if (firstWorkInProgressHook === null) {
      isReRender = false;
      firstWorkInProgressHook = workInProgressHook = createHook();
    } else {
      // There's already a work-in-progress. Reuse it.
      isReRender = true;
      workInProgressHook = firstWorkInProgressHook;
    }
  } else {
    if (workInProgressHook.next === null) {
      isReRender = false;
      // Append to the end of the list
      workInProgressHook = workInProgressHook.next = createHook();
    } else {
      // There's already a work-in-progress. Reuse it.
      isReRender = true;
      workInProgressHook = workInProgressHook.next;
    }
  }
  return workInProgressHook;
}

export function prepareToUseHooks(
  request: Request,
  task: Task,
  keyPath: KeyNode | null,
  componentIdentity: Object,
  prevThenableState: ThenableState | null,
): void {
  currentlyRenderingComponent = componentIdentity;
  currentlyRenderingTask = task;
  currentlyRenderingRequest = request;
  currentlyRenderingKeyPath = keyPath;
  if (__DEV__) {
    isInHookUserCodeInDev = false;
  }

  // The following should have already been reset
  // didScheduleRenderPhaseUpdate = false;
  // firstWorkInProgressHook = null;
  // numberOfReRenders = 0;
  // renderPhaseUpdates = null;
  // workInProgressHook = null;

  localIdCounter = 0;
  actionStateCounter = 0;
  actionStateMatchingIndex = -1;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
}

export function prepareToUseThenableState(
  prevThenableState: ThenableState | null,
): void {
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
}

export function finishHooks(
  Component: any,
  props: any,
  children: any,
  refOrContext: any,
): any {
  // This must be called after every function component to prevent hooks from
  // being used in classes.

  while (didScheduleRenderPhaseUpdate) {
    // Updates were scheduled during the render phase. They are stored in
    // the `renderPhaseUpdates` map. Call the component again, reusing the
    // work-in-progress hooks and applying the additional updates on top. Keep
    // restarting until no more updates are scheduled.
    didScheduleRenderPhaseUpdate = false;
    localIdCounter = 0;
    actionStateCounter = 0;
    actionStateMatchingIndex = -1;
    thenableIndexCounter = 0;
    numberOfReRenders += 1;

    // Start over from the beginning of the list
    workInProgressHook = null;

    children = Component(props, refOrContext);
  }

  resetHooksState();
  return children;
}

export function getThenableStateAfterSuspending(): null | ThenableState {
  const state = thenableState;
  thenableState = null;
  return state;
}

export function checkDidRenderIdHook(): boolean {
  // This should be called immediately after every finishHooks call.
  // Conceptually, it's part of the return value of finishHooks; it's only a
  // separate function to avoid using an array tuple.
  const didRenderIdHook = localIdCounter !== 0;
  return didRenderIdHook;
}

export function getActionStateCount(): number {
  // This should be called immediately after every finishHooks call.
  // Conceptually, it's part of the return value of finishHooks; it's only a
  // separate function to avoid using an array tuple.
  return actionStateCounter;
}
export function getActionStateMatchingIndex(): number {
  // This should be called immediately after every finishHooks call.
  // Conceptually, it's part of the return value of finishHooks; it's only a
  // separate function to avoid using an array tuple.
  return actionStateMatchingIndex;
}

// Reset the internal hooks state if an error occurs while rendering a component
export function resetHooksState(): void {
  if (__DEV__) {
    isInHookUserCodeInDev = false;
  }

  currentlyRenderingComponent = null;
  currentlyRenderingTask = null;
  currentlyRenderingRequest = null;
  currentlyRenderingKeyPath = null;
  didScheduleRenderPhaseUpdate = false;
  firstWorkInProgressHook = null;
  numberOfReRenders = 0;
  renderPhaseUpdates = null;
  workInProgressHook = null;
}

function readContext<T>(context: ReactContext<T>): T {
  if (__DEV__) {
    if (isInHookUserCodeInDev) {
      console.error(
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );
    }
  }
  return readContextImpl(context);
}

function useContext<T>(context: ReactContext<T>): T {
  if (__DEV__) {
    currentHookNameInDev = 'useContext';
  }
  resolveCurrentlyRenderingComponent();
  return readContextImpl(context);
}

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}

export function useState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  if (__DEV__) {
    currentHookNameInDev = 'useState';
  }
  return useReducer(
    basicStateReducer,
    // useReducer has a special case to support lazy useState initializers
    initialState as any,
  );
}

export function useReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  if (__DEV__) {
    // $FlowFixMe[invalid-compare]
    if (reducer !== basicStateReducer) {
      currentHookNameInDev = 'useReducer';
    }
  }
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  if (isReRender) {
    // This is a re-render. Apply the new render phase updates to the previous
    // current hook.
    const queue: UpdateQueue<A> = workInProgressHook.queue as any;
    const dispatch: Dispatch<A> = queue.dispatch as any;
    if (renderPhaseUpdates !== null) {
      // Render phase updates are stored in a map of queue -> linked list
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
      if (firstRenderPhaseUpdate !== undefined) {
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        renderPhaseUpdates.delete(queue);
        // $FlowFixMe[incompatible-use] found when upgrading Flow
        let newState = workInProgressHook.memoizedState;
        let update: Update<any> = firstRenderPhaseUpdate;
        do {
          // Process this render phase update. We don't have to check the
          // priority because it will always be the same as the current
          // render's.
          const action = update.action;
          if (__DEV__) {
            isInHookUserCodeInDev = true;
          }
          newState = reducer(newState, action);
          if (__DEV__) {
            isInHookUserCodeInDev = false;
          }
          // $FlowFixMe[incompatible-type] we bail out when we get a null
          update = update.next;
        } while (update !== null);

        // $FlowFixMe[incompatible-use] found when upgrading Flow
        workInProgressHook.memoizedState = newState;

        return [newState, dispatch];
      }
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    return [workInProgressHook.memoizedState, dispatch];
  } else {
    if (__DEV__) {
      isInHookUserCodeInDev = true;
    }
    let initialState;
    // $FlowFixMe[invalid-compare]
    if (reducer === basicStateReducer) {
      // Special case for `useState`.
      initialState =
        typeof initialArg === 'function'
          ? (initialArg as any as () => S)()
          : (initialArg as any as S);
    } else {
      initialState =
        init !== undefined ? init(initialArg) : (initialArg as any as S);
    }
    if (__DEV__) {
      isInHookUserCodeInDev = false;
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    workInProgressHook.memoizedState = initialState;
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    const queue: UpdateQueue<A> = (workInProgressHook.queue = {
      last: null,
      dispatch: null,
    });
    const dispatch: Dispatch<A> = (queue.dispatch = dispatchAction.bind(
      null,
      currentlyRenderingComponent,
      queue,
    ) as any);
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    return [workInProgressHook.memoizedState, dispatch];
  }
}

function useMemo<T>(nextCreate: () => T, deps: Array<mixed> | void | null): T {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();

  const nextDeps = deps === undefined ? null : deps;

  // $FlowFixMe[invalid-compare]
  if (workInProgressHook !== null) {
    const prevState = workInProgressHook.memoizedState;
    if (prevState !== null) {
      if (nextDeps !== null) {
        const prevDeps = prevState[1];
        if (areHookInputsEqual(nextDeps, prevDeps)) {
          return prevState[0];
        }
      }
    }
  }

  if (__DEV__) {
    isInHookUserCodeInDev = true;
  }
  const nextValue = nextCreate();
  if (__DEV__) {
    isInHookUserCodeInDev = false;
  }
  // $FlowFixMe[incompatible-use] found when upgrading Flow
  workInProgressHook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function useRef<T>(initialValue: T): {current: T} {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  const previousRef = workInProgressHook.memoizedState;
  if (previousRef === null) {
    const ref = {current: initialValue};
    if (__DEV__) {
      Object.seal(ref);
    }
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    workInProgressHook.memoizedState = ref;
    return ref;
  } else {
    return previousRef;
  }
}

function dispatchAction<A>(
  componentIdentity: Object,
  queue: UpdateQueue<A>,
  action: A,
): void {
  if (numberOfReRenders >= RE_RENDER_LIMIT) {
    throw new Error(
      'Too many re-renders. React limits the number of renders to prevent ' +
        'an infinite loop.',
    );
  }

  if (componentIdentity === currentlyRenderingComponent) {
    // This is a render phase update. Stash it in a lazily-created map of
    // queue -> linked list of updates. After this render pass, we'll restart
    // and apply the stashed updates on top of the work-in-progress hook.
    didScheduleRenderPhaseUpdate = true;
    const update: Update<A> = {
      action,
      next: null,
    };
    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map();
    }
    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
    if (firstRenderPhaseUpdate === undefined) {
      // $FlowFixMe[incompatible-use] found when upgrading Flow
      renderPhaseUpdates.set(queue, update);
    } else {
      // Append the update to the end of the list.
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate;
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      }
      lastRenderPhaseUpdate.next = update;
    }
  } else {
    // This means an update has happened after the function component has
    // returned. On the server this is a no-op. In React Fiber, the update
    // would be scheduled for a future render.
  }
}

export function useCallback<T>(
  callback: T,
  deps: Array<mixed> | void | null,
): T {
  return useMemo(() => callback, deps);
}

function throwOnUseEffectEventCall() {
  throw new Error(
    "A function wrapped in useEffectEvent can't be called during rendering.",
  );
}

export function useEffectEvent<Args, Return, F: (...Array<Args>) => Return>(
  callback: F,
): F {
  // $FlowFixMe[incompatible-type]
  return throwOnUseEffectEventCall;
}

function useSyncExternalStore<T>(
  subscribe: (() => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  if (getServerSnapshot === undefined) {
    throw new Error(
      'Missing getServerSnapshot, which is required for ' +
        'server-rendered content. Will revert to client rendering.',
    );
  }
  return getServerSnapshot();
}

function useDeferredValue<T>(value: T, initialValue?: T): T {
  resolveCurrentlyRenderingComponent();
  return initialValue !== undefined ? initialValue : value;
}

function unsupportedStartTransition() {
  throw new Error('startTransition cannot be called during server rendering.');
}

function useTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  resolveCurrentlyRenderingComponent();
  return [false, unsupportedStartTransition];
}

function useHostTransitionStatus(): TransitionStatus {
  resolveCurrentlyRenderingComponent();
  return NotPendingTransition;
}

function unsupportedSetOptimisticState() {
  throw new Error('Cannot update optimistic state while rendering.');
}

function useOptimistic<S, A>(
  passthrough: S,
  reducer: ?(S, A) => S,
): [S, (A) => void] {
  resolveCurrentlyRenderingComponent();
  return [passthrough, unsupportedSetOptimisticState];
}

function createPostbackActionStateKey(
  permalink: string | void,
  componentKeyPath: KeyNode | null,
  hookIndex: number,
): string {
  if (permalink !== undefined) {
    // Don't bother to hash a permalink-based key since it's already short.
    return 'p' + permalink;
  } else {
    // Append a node to the key path that represents the form state hook.
    const keyPath: KeyNode = [componentKeyPath, null, hookIndex];
    // Key paths are hashed to reduce the size. It does not need to be secure,
    // and it's more important that it's fast than that it's completely
    // collision-free.
    const keyPathHash = createFastHash(JSON.stringify(keyPath));
    return 'k' + keyPathHash;
  }
}

function useActionState<S, P>(
  action: (Awaited<S>, P) => S,
  initialState: Awaited<S>,
  permalink?: string,
): [Awaited<S>, (P) => void, boolean] {
  resolveCurrentlyRenderingComponent();

  // Count the number of useActionState hooks per component. We also use this to
  // track the position of this useActionState hook relative to the other ones in
  // this component, so we can generate a unique key for each one.
  const actionStateHookIndex = actionStateCounter++;
  const request: Request = currentlyRenderingRequest as any;

  // $FlowFixMe[prop-missing]
  const formAction = action.$$FORM_ACTION;
  if (typeof formAction === 'function') {
    // This is a server action. These have additional features to enable
    // MPA-style form submissions with progressive enhancement.

    // TODO: If the same permalink is passed to multiple useActionStates, and
    // they all have the same action signature, Fizz will pass the postback
    // state to all of them. We should probably only pass it to the first one,
    // and/or warn.

    // The key is lazily generated and deduped so the that the keypath doesn't
    // get JSON.stringify-ed unnecessarily, and at most once.
    let nextPostbackStateKey = null;

    // Determine the current form state. If we received state during an MPA form
    // submission, then we will reuse that, if the action identity matches.
    // Otherwise, we'll use the initial state argument. We will emit a comment
    // marker into the stream that indicates whether the state was reused.
    let state = initialState;
    const componentKeyPath = currentlyRenderingKeyPath as any;
    const postbackActionState = getFormState(request);
    // $FlowFixMe[prop-missing]
    const isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
    if (
      postbackActionState !== null &&
      typeof isSignatureEqual === 'function'
    ) {
      const postbackKey = postbackActionState[1];
      const postbackReferenceId = postbackActionState[2];
      const postbackBoundArity = postbackActionState[3];
      if (
        isSignatureEqual.call(action, postbackReferenceId, postbackBoundArity)
      ) {
        nextPostbackStateKey = createPostbackActionStateKey(
          permalink,
          componentKeyPath,
          actionStateHookIndex,
        );
        if (postbackKey === nextPostbackStateKey) {
          // This was a match
          actionStateMatchingIndex = actionStateHookIndex;
          // Reuse the state that was submitted by the form.
          state = postbackActionState[0];
        }
      }
    }

    // Bind the state to the first argument of the action.
    const boundAction = action.bind(null, state);

    // Wrap the action so the return value is void.
    const dispatch = (payload: P): void => {
      boundAction(payload);
    };

    // $FlowIgnore[prop-missing]
    if (typeof boundAction.$$FORM_ACTION === 'function') {
      // $FlowFixMe[prop-missing]
      dispatch.$$FORM_ACTION = (prefix: string) => {
        const metadata: ReactCustomFormAction =
          boundAction.$$FORM_ACTION(prefix);

        // Override the action URL
        if (permalink !== undefined) {
          if (__DEV__) {
            checkAttributeStringCoercion(permalink, 'target');
          }
          permalink += '';
          metadata.action = permalink;
        }

        const formData = metadata.data;
        if (formData) {
          if (nextPostbackStateKey === null) {
            nextPostbackStateKey = createPostbackActionStateKey(
              permalink,
              componentKeyPath,
              actionStateHookIndex,
            );
          }
          formData.append('$ACTION_KEY', nextPostbackStateKey);
        }
        return metadata;
      };
    }

    return [state, dispatch, false];
  } else {
    // This is not a server action, so the implementation is much simpler.

    // Bind the state to the first argument of the action.
    const boundAction = action.bind(null, initialState);
    // Wrap the action so the return value is void.
    const dispatch = (payload: P): void => {
      boundAction(payload);
    };
    return [initialState, dispatch, false];
  }
}

function useId(): string {
  const task: Task = currentlyRenderingTask as any;
  const treeId = getTreeId(task.treeContext);

  const resumableState = currentResumableState;
  if (resumableState === null) {
    throw new Error(
      'Invalid hook call. Hooks can only be called inside of the body of a function component.',
    );
  }

  const localId = localIdCounter++;
  return makeId(resumableState, treeId, localId);
}

function use<T>(usable: Usable<T>): T {
  // $FlowFixMe[invalid-compare]
  if (usable !== null && typeof usable === 'object') {
    // $FlowFixMe[method-unbinding]
    if (typeof usable.then === 'function') {
      // This is a thenable.
      const thenable: Thenable<T> = usable as any;
      return unwrapThenable(thenable);
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      const context: ReactContext<T> = usable as any;
      return readContext(context);
    }
  }

  // eslint-disable-next-line react-internal/safe-string-coercion
  throw new Error('An unsupported type was passed to use(): ' + String(usable));
}

export function unwrapThenable<T>(thenable: Thenable<T>): T {
  const index = thenableIndexCounter;
  thenableIndexCounter += 1;
  if (thenableState === null) {
    thenableState = createThenableState();
  }
  return trackUsedThenable(thenableState, thenable, index);
}

export function readPreviousThenableFromState<T>(): T | void {
  const index = thenableIndexCounter;
  thenableIndexCounter += 1;
  if (thenableState === null) {
    return undefined;
  }
  return readPreviousThenable(thenableState, index);
}

function unsupportedRefresh() {
  throw new Error('Cache cannot be refreshed during server rendering.');
}

function useCacheRefresh(): <T>(?() => T, ?T) => void {
  return unsupportedRefresh;
}

function useMemoCache(size: number): Array<mixed> {
  const data = new Array<any>(size);
  for (let i = 0; i < size; i++) {
    data[i] = REACT_MEMO_CACHE_SENTINEL;
  }
  return data;
}

function clientHookNotSupported() {
  throw new Error(
    'Cannot use state or effect Hooks in renderToHTML because ' +
      'this component will never be hydrated.',
  );
}

// $FlowFixMe[constant-condition]
export const HooksDispatcher: Dispatcher = supportsClientAPIs
  ? {
      readContext,
      use,
      useContext,
      useMemo,
      useReducer,
      useRef,
      useState,
      useInsertionEffect: noop,
      useLayoutEffect: noop,
      useCallback,
      // useImperativeHandle is not run in the server environment
      useImperativeHandle: noop,
      // Effects are not run in the server environment.
      useEffect: noop,
      // Debugging effect
      useDebugValue: noop,
      useDeferredValue,
      useTransition,
      useId,
      // Subscriptions are not setup in a server environment.
      useSyncExternalStore,
      useOptimistic,
      useActionState,
      useFormState: useActionState,
      useHostTransitionStatus,
      useMemoCache,
      useCacheRefresh,
      useEffectEvent,
    }
  : {
      readContext,
      use,
      useCallback,
      useContext,
      useEffect: clientHookNotSupported,
      useImperativeHandle: clientHookNotSupported,
      useInsertionEffect: clientHookNotSupported,
      useLayoutEffect: clientHookNotSupported,
      useMemo,
      useReducer: clientHookNotSupported,
      useRef: clientHookNotSupported,
      useState: clientHookNotSupported,
      useDebugValue: noop,
      useDeferredValue: clientHookNotSupported,
      useTransition: clientHookNotSupported,
      useSyncExternalStore: clientHookNotSupported,
      useId,
      useHostTransitionStatus,
      useFormState: useActionState,
      useActionState,
      useOptimistic,
      useMemoCache,
      useCacheRefresh,
      useEffectEvent,
    };

export let currentResumableState: null | ResumableState = null as any;
export function setCurrentResumableState(
  resumableState: null | ResumableState,
): void {
  currentResumableState = resumableState;
}
