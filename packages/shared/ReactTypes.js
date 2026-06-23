/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactOptimisticKey} from './ReactSymbols';

export type {ReactOptimisticKey};

export type ReactKey = null | string | ReactOptimisticKey;

export type ReactNode =
  | React$Element<any>
  | ReactPortal
  | ReactText
  | ReactFragment
  | ReactProvider<any>
  | ReactConsumer<any>;

export type ReactEmpty = null | void | boolean;

export type ReactFragment = ReactEmpty | Iterable<React$Node>;

export type ReactNodeList = ReactEmpty | React$Node;

export type ReactText = string | number;

export type ReactProvider<T> = {
  $$typeof: symbol | number,
  type: ReactContext<T>,
  key: ReactKey,
  ref: null,
  props: {
    value: T,
    children?: ReactNodeList,
  },
};

export type ReactConsumerType<T> = {
  $$typeof: symbol | number,
  _context: ReactContext<T>,
};

export type ReactConsumer<T> = {
  $$typeof: symbol | number,
  type: ReactConsumerType<T>,
  key: ReactKey,
  ref: null,
  props: {
    children: (value: T) => ReactNodeList,
  },
};

export type ReactContext<T> = {
  $$typeof: symbol | number,
  Consumer: ReactConsumerType<T>,
  Provider: ReactContext<T>,
  _currentValue: T,
  _currentValue2: T,
  _threadCount: number,
  // DEV only
  _currentRenderer?: Object | null,
  _currentRenderer2?: Object | null,
  // This value may be added by application code
  // to improve DEV tooling display names
  displayName?: string,
};

export type ReactPortal = {
  $$typeof: symbol | number,
  key: ReactKey,
  containerInfo: any,
  children: ReactNodeList,
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any,
};

export type RefObject = {
  current: any,
};

export type ReactScope = {
  $$typeof: symbol | number,
};

export type ReactScopeQuery = (
  type: string,
  props: {[string]: mixed},
  instance: mixed,
) => boolean;

export type ReactScopeInstance = {
  DO_NOT_USE_queryAllNodes(ReactScopeQuery): null | Array<Object>,
  DO_NOT_USE_queryFirstNode(ReactScopeQuery): null | Object,
  containsNode(Object): boolean,
  getChildContextValues: <T>(context: ReactContext<T>) => Array<T>,
};

// The subset of a Thenable required by things thrown by Suspense.
// This doesn't require a value to be passed to either handler.
export interface Wakeable {
  then(onFulfill: () => mixed, onReject: () => mixed): void | Wakeable;
}

// The subset of a Promise that React APIs rely on. This resolves a value.
// This doesn't require a return value neither from the handler nor the
// then function.
interface ThenableImpl<T> {
  then(
    onFulfill: (value: T) => mixed,
    onReject: (error: mixed) => mixed,
  ): void | Wakeable;
  displayName?: string;
}
interface UntrackedThenable<T> extends ThenableImpl<T> {
  status?: void;
  _debugInfo?: null | ReactDebugInfo;
}

export interface PendingThenable<T> extends ThenableImpl<T> {
  status: 'pending';
  _debugInfo?: null | ReactDebugInfo;
}

export interface FulfilledThenable<T> extends ThenableImpl<T> {
  status: 'fulfilled';
  value: T;
  _debugInfo?: null | ReactDebugInfo;
}

export interface RejectedThenable<T> extends ThenableImpl<T> {
  status: 'rejected';
  reason: mixed;
  _debugInfo?: null | ReactDebugInfo;
}

export type Thenable<T> =
  | UntrackedThenable<T>
  | PendingThenable<T>
  | FulfilledThenable<T>
  | RejectedThenable<T>;

export type StartTransitionOptions = {
  name?: string,
};

export type Usable<T> = Thenable<T> | ReactContext<T>;

export type ReactCustomFormAction = {
  name?: string,
  action?: string,
  encType?: string,
  method?: string,
  target?: string,
  data?: null | FormData,
};

// This is an opaque type returned by decodeFormState on the server, but it's
// defined in this shared file because the same type is used by React on
// the client.
export type ReactFormState<S, ReferenceId> = [
  S /* actual state value */,
  string /* key path */,
  ReferenceId /* Server Reference ID */,
  number /* number of bound arguments */,
];

// Intrinsic GestureProvider. This type varies by Environment whether a particular
// renderer supports it.
export type GestureProvider = any;

export type GestureOptions = {
  rangeStart?: number,
  rangeEnd?: number,
};

export type Awaited<T> = T extends null | void
  ? T // special case for `null | undefined` when not in `--strictNullChecks` mode
  : T extends Object // `await` only unwraps object types with a callable then. Non-object types are not unwrapped.
    ? T extends {then(onfulfilled: infer F): any} // thenable, extracts the first argument to `then()`
      ? F extends (value: infer V) => any // if the argument to `then` is callable, extracts the argument
        ? Awaited<V> // recursively unwrap the value
        : empty // the argument to `then` was not callable.
      : T // argument was not an object
    : T; // non-thenable

export type ReactCallSite = [
  string, // function name
  string, // file name TODO: model nested eval locations as nested arrays
  number, // line number
  number, // column number
  number, // enclosing line number
  number, // enclosing column number
  boolean, // async resume
];

export type ReactStackTrace = Array<ReactCallSite>;

export type ReactFunctionLocation = [
  string, // function name
  string, // file name TODO: model nested eval locations as nested arrays
  number, // enclosing line number
  number, // enclosing column number
];

export type ReactComponentInfo = {
  +name: string,
  +env?: string,
  +key?: ReactKey,
  +owner?: null | ReactComponentInfo,
  +stack?: null | ReactStackTrace,
  +props?: null | {[name: string]: mixed},
  // Stashed Data for the Specific Execution Environment. Not part of the transport protocol
  +debugStack?: null | Error,
  +debugTask?: null | ConsoleTask,
  debugLocation?: null | Error,
};

export type ReactEnvironmentInfo = {
  +env: string,
};

export type ReactErrorInfoProd = {
  +digest: string,
};

export type JSONValue =
  | string
  | boolean
  | number
  | null
  | {+[key: string]: JSONValue}
  | $ReadOnlyArray<JSONValue>;

export type ReactErrorInfoDev = {
  +digest?: string,
  +name: string,
  +message: string,
  +stack: ReactStackTrace,
  +env: string,
  +owner?: null | string,
  cause?: JSONValue,
  errors?: JSONValue,
};

export type ReactErrorInfo = ReactErrorInfoProd | ReactErrorInfoDev;

// The point where the Async Info started which might not be the same place it was awaited.
export type ReactIOInfo = {
  +name: string, // the name of the async function being called (e.g. "fetch")
  +start: number, // the start time
  +end: number, // the end time (this might be different from the time the await was unblocked)
  +byteSize?: number, // the byte size of this resource across the network. (should only be included if affecting the client.)
  +value?: null | Promise<mixed>, // the Promise that was awaited if any, may be rejected
  +env?: string, // the environment where this I/O was spawned.
  +owner?: null | ReactComponentInfo,
  +stack?: null | ReactStackTrace,
  // Stashed Data for the Specific Execution Environment. Not part of the transport protocol
  +debugStack?: null | Error,
  +debugTask?: null | ConsoleTask,
};

export type ReactAsyncInfo = {
  +awaited: ReactIOInfo,
  +env?: string, // the environment where this was awaited. This might not be the same as where it was spawned.
  +owner?: null | ReactComponentInfo,
  +stack?: null | ReactStackTrace,
  // Stashed Data for the Specific Execution Environment. Not part of the transport protocol
  +debugStack?: null | Error,
  +debugTask?: null | ConsoleTask,
};

export type ReactTimeInfo = {
  +time: number, // performance.now
};

export type ReactDebugInfoEntry =
  | ReactComponentInfo
  | ReactEnvironmentInfo
  | ReactAsyncInfo
  | ReactTimeInfo;

export type ReactDebugInfo = Array<ReactDebugInfoEntry>;

// Intrinsic ViewTransitionInstance. This type varies by Environment whether a particular
// renderer supports it.
export type ViewTransitionInstance = any;

export type ViewTransitionClassPerType = {
  [transitionType: 'default' | string]: 'none' | 'auto' | string,
};

export type ViewTransitionClass =
  | 'none'
  | 'auto'
  | string
  | ViewTransitionClassPerType;

export type GestureOptionsRequired = {
  rangeStart: number,
  rangeEnd: number,
};

export type ViewTransitionProps = {
  name?: string,
  children?: ReactNodeList,
  default?: ViewTransitionClass,
  enter?: ViewTransitionClass,
  exit?: ViewTransitionClass,
  share?: ViewTransitionClass,
  update?: ViewTransitionClass,
  onEnter?: (
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onExit?: (
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onShare?: (
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onUpdate?: (
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onGestureEnter?: (
    timeline: GestureProvider,
    options: GestureOptionsRequired,
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onGestureExit?: (
    timeline: GestureProvider,
    options: GestureOptionsRequired,
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onGestureShare?: (
    timeline: GestureProvider,
    options: GestureOptionsRequired,
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
  onGestureUpdate?: (
    timeline: GestureProvider,
    options: GestureOptionsRequired,
    instance: ViewTransitionInstance,
    types: Array<string>,
  ) => void | (() => void),
};

export type ActivityProps = {
  mode?: 'hidden' | 'visible' | null | void,
  children?: ReactNodeList,
  name?: string,
};

export type SuspenseProps = {
  children?: ReactNodeList,
  fallback?: ReactNodeList,

  // TODO: Add "unstable_" prefix?
  suspenseCallback?: (Set<Wakeable> | null) => mixed,

  unstable_avoidThisFallback?: boolean,
  defer?: boolean,
  name?: string,
};

export type SuspenseListRevealOrder =
  | 'forwards'
  | 'backwards'
  | 'unstable_legacy-backwards'
  | 'together'
  | 'independent'
  | void;

export type SuspenseListTailMode = 'visible' | 'collapsed' | 'hidden' | void;

// A SuspenseList row cannot include a nested Array since it's an easy mistake to not realize it
// is treated as a single row. A Fragment can be used to intentionally have multiple children as
// a single row.
type SuspenseListRow = Exclude<
  ReactNodeList,
  Iterable<React$Node> | AsyncIterable<React$Node>,
>;

type DirectionalSuspenseListProps = {
  // Directional SuspenseList are defined by an array of children or multiple slots to JSX
  // It does not allow a single element child.
  children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
  revealOrder: 'forwards' | 'backwards' | 'unstable_legacy-backwards',
  tail?: SuspenseListTailMode,
};

type NonDirectionalSuspenseListProps = {
  children?: ReactNodeList,
  revealOrder?: 'independent' | 'together' | void,
  tail?: void,
};

export type SuspenseListProps =
  | DirectionalSuspenseListProps
  | NonDirectionalSuspenseListProps;

export type TracingMarkerProps = {
  name: string,
  children?: ReactNodeList,
};

export type CacheProps = {
  children?: ReactNodeList,
};

export type ProfilerPhase = 'mount' | 'update' | 'nested-update';

export type ProfilerProps = {
  id?: string,
  onRender?: (
    id: void | string,
    phase: ProfilerPhase,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
  ) => void,
  onCommit?: (
    id: void | string,
    phase: ProfilerPhase,
    effectDuration: number,
    commitTime: number,
  ) => void,
  children?: ReactNodeList,
};
