/*!
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TypeScript Definition File for React.
 *
 * Full type definitions are not yet officially supported. These are mostly
 * just helpers for the unit test.
 */

declare let global: any;

declare module 'react' {
  // ---------------------------------------------------------------------------
  // Core types
  // ---------------------------------------------------------------------------

  type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactNode[]
    | {type: any; props: any; key: any};

  interface Context<T> {
    Provider: any;
    Consumer: any;
    displayName?: string;
  }

  // A value that can be read with the `use()` hook: a Promise or a Context.
  type Usable<T> = PromiseLike<T> | Context<T>;

  // ---------------------------------------------------------------------------
  // Class component (pre-existing)
  // ---------------------------------------------------------------------------

  export class Component {
    props: any;
    state: any;
    context: any;
    static name: string;
    constructor(props?, context?);
    setState(partial: any, callback?: any): void;
    forceUpdate(callback?: any): void;
  }

  export let PropTypes: any;
  export function createElement(tag: any, props?: any, ...children: any[]): any;
  export function createRef(): any;

  // ---------------------------------------------------------------------------
  // React 19.2 — Activity
  // Lets you hide and show part of the UI while preserving state.
  // Hidden subtrees receive lower priority for rendering.
  // @see https://react.dev/reference/react/Activity
  // ---------------------------------------------------------------------------

  export interface ActivityProps {
    children?: ReactNode;
    /**
     * Controls whether the subtree is rendered at full priority (`'visible'`)
     * or deprioritised / hidden (`'hidden'`).
     */
    mode?: 'visible' | 'hidden';
  }

  export const Activity: (props: ActivityProps) => any;

  // ---------------------------------------------------------------------------
  // React 19.2 — ViewTransition
  // Wraps UI transitions with the browser View Transition API.
  // @see https://react.dev/reference/react/ViewTransition
  // ---------------------------------------------------------------------------

  export const ViewTransition: (props: {children?: ReactNode; [key: string]: any}) => any;

  // ---------------------------------------------------------------------------
  // React 19 — use()
  // Reads the value of a resource (Promise or Context).
  // Unlike other hooks, `use` can be called inside loops and conditionals.
  // @see https://react.dev/reference/react/use
  // ---------------------------------------------------------------------------

  export function use<T>(usable: Usable<T>): T;

  // ---------------------------------------------------------------------------
  // React 19 — useActionState()
  // Manages state that is updated by a form action.
  // @see https://react.dev/reference/react/useActionState
  // ---------------------------------------------------------------------------

  // Overload 1: action with no payload
  export function useActionState<State>(
    action: (state: Awaited<State>) => State | Promise<State>,
    initialState: Awaited<State>,
    permalink?: string,
  ): [state: Awaited<State>, dispatch: () => void, isPending: boolean];

  // Overload 2: action with a typed payload
  export function useActionState<State, Payload>(
    action: (
      state: Awaited<State>,
      payload: Payload,
    ) => State | Promise<State>,
    initialState: Awaited<State>,
    permalink?: string,
  ): [
    state: Awaited<State>,
    dispatch: (payload: Payload) => void,
    isPending: boolean,
  ];

  // ---------------------------------------------------------------------------
  // React 19 — useOptimistic()
  // Optimistically updates the UI before an async action completes.
  // @see https://react.dev/reference/react/useOptimistic
  // ---------------------------------------------------------------------------

  // Overload 1: no reducer — pass-through with direct state replacement
  export function useOptimistic<State>(
    passthrough: State,
  ): [State, (action: State | ((pendingState: State) => State)) => void];

  // Overload 2: with a reducer function
  export function useOptimistic<State, Action>(
    passthrough: State,
    reducer: (state: State, action: Action) => State,
  ): [State, (action: Action) => void];

  // ---------------------------------------------------------------------------
  // React 18+ — Concurrent Mode hooks
  // ---------------------------------------------------------------------------

  /**
   * @see https://react.dev/reference/react/useTransition
   */
  export function useTransition(): [isPending: boolean, startTransition: (scope: () => void) => void];

  /**
   * @see https://react.dev/reference/react/startTransition
   */
  export function startTransition(scope: () => void): void;

  /**
   * @see https://react.dev/reference/react/useDeferredValue
   */
  export function useDeferredValue<T>(value: T): T;

  /**
   * @see https://react.dev/reference/react/useId
   */
  export function useId(): string;

  // ---------------------------------------------------------------------------
  // React 19.2 — addTransitionType / captureOwnerStack
  // ---------------------------------------------------------------------------

  /**
   * Adds a named type to the current transition for use with ViewTransition.
   * @see https://react.dev/reference/react/addTransitionType
   */
  export function addTransitionType(type: string): void;

  /**
   * Returns the current component owner stack as a string, or null outside
   * of a render. Useful for debugging and error reporting.
   * @see https://react.dev/reference/react/captureOwnerStack
   */
  export function captureOwnerStack(): string | null;

  // ---------------------------------------------------------------------------
  // Standard hooks (previously undeclared in this stub)
  // ---------------------------------------------------------------------------

  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useInsertionEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initialState: S,
  ): [S, (action: A) => void];
  export function useRef<T>(initialValue: T): {current: T};
  export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
  export function useImperativeHandle<T>(
    ref: {current: T | null} | null,
    init: () => T,
    deps?: readonly any[],
  ): void;
  export function useSyncExternalStore<S>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => S,
    getServerSnapshot?: () => S,
  ): S;
}
