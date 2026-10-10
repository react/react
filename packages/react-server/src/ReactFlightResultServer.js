/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {Result, ModelReference} from 'shared/ReactFlightResult';
import {createAsyncIterable} from 'shared/ReactFlightResultAsyncIterable';
import {createReadableStream} from 'shared/ReactFlightResultReadableStream';
import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {TemporaryReferenceSet} from './ReactFlightServerTemporaryReferences';
import {
  isOpaqueTemporaryReference,
  resolveTemporaryReference,
} from './ReactFlightServerTemporaryReferences';
import type {ReactClientValue} from './ReactFlightServer';
export type {ReactClientValue} from './ReactFlightServer';
import type {ThenableState} from './ReactFlightThenable';
import type {
  AsyncSequence,
  IONode,
  PromiseNode,
  UnresolvedPromiseNode,
} from './ReactFlightAsyncSequence';
import {
  IO_NODE,
  PROMISE_NODE,
  AWAIT_NODE,
  UNRESOLVED_PROMISE_NODE,
  UNRESOLVED_AWAIT_NODE,
} from './ReactFlightAsyncSequence';
import {isAwaitInUserspace as isAwaitInUserspaceWithFilter} from './ReactFlightStackTraceContext';
import type {
  Thenable,
  PendingThenable,
  FulfilledThenable,
  RejectedThenable,
  ReactKey,
  ReactErrorInfoDev,
  ReactStackTrace,
  ReactCallSite,
  ReactComponentInfo,
  ReactDebugInfo,
  ReactAsyncInfo,
  ReactIOInfo,
} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {
  Hints,
  HintCode,
  HintModel,
  FormatContext,
} from './ReactFlightResultServerConfig';

import {
  REACT_ELEMENT_TYPE,
  REACT_LEGACY_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  getIteratorFn,
  ASYNC_ITERATOR,
  REACT_FRAGMENT_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import ReactSharedInternals from './ReactSharedInternalsServer';
import {
  HooksDispatcher,
  prepareToUseHooksForRequest,
  resetHooksForRequest,
  prepareToUseHooksForComponent,
  getThenableStateAfterSuspending,
  getTrackedThenablesAfterRendering,
} from './ReactFlightResultHooks';
import {SuspenseException, getSuspendedThenable} from './ReactFlightThenable';
import {
  createResult,
  completeResult,
  subscribeToResult,
  pushHint,
  closeHints,
  setErrorDigest,
  setErrorInfo,
  copyErrorReference,
  forwardModelReference,
  createValueReference,
  getValueReference,
  markFormDataWithBlobs,
  setAsyncIterable,
  setReadableStream,
  setIteratorEntries,
  getIteratorEntries,
  setServerReference,
  setTemporaryReference,
  getTemporaryReference,
  setCollectionEntries,
  setModelInfo,
  getModelInfo,
  markHalted,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
  MODEL_KIND_MASK,
} from 'shared/ReactFlightResult';
import {
  createResultModel,
  fulfillResultModel,
  rejectResultModel,
  getResultModelStatus,
  pushDebugInfo,
  subscribeToDebugInfo,
  setDebugModel,
} from 'shared/ReactFlightResultModel';
import {scheduleWork, scheduleMicrotask} from './ReactServerStreamConfig';
import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';
import noop from 'shared/noop';
import {
  enableFlightWeakThenables,
  enableTaint,
  enableFlightObjectReferences,
  enableProfilerTimer,
  enableComponentPerformanceTrack,
  enableAsyncDebugInfo,
} from 'shared/ReactFeatureFlags';
import binaryToComparableString from 'shared/binaryToComparableString';
import {
  describeObjectForErrorMessage,
  jsxPropsParents,
  jsxChildrenParents,
  objectName,
  isSimpleObject,
} from 'shared/ReactSerializationErrors';
import {resolveOwner, setCurrentOwner} from './flight/ReactFlightCurrentOwner';
import {getOwnerStackByComponentInfoInDev} from 'shared/ReactComponentInfoStack';
import {resetOwnerStackLimit} from 'shared/ReactOwnerStackReset';
import {
  callComponentInDEV,
  callLazyInitInDEV,
  callIteratorInDEV,
} from './ReactFlightCallUserSpace';
import {
  createHints,
  createRootFormatContext,
  getChildFormatContext,
} from './ReactFlightResultServerConfig';
import {resolveCache, setCurrentCache} from './flight/ReactFlightCurrentCache';
import {
  isClientReference,
  isServerReference,
  getServerReferenceId,
  parseStackTrace,
  getAsyncSequenceFromPromise,
  initAsyncDebugInfo,
  getCurrentAsyncSequence,
  markAsyncSequenceRootTask,
  supportsComponentStorage,
  componentStorage,
  getServerReferenceBoundArguments,
  supportsRequestStorage,
  cacheStorage,
  requestStorage,
} from './ReactFlightServerConfig';
import {DefaultAsyncDispatcher} from './flight/ReactFlightAsyncDispatcher';

const UNDEFINED_MODEL = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const RENDERING = 5;
const BLOCKED = 6;
const ERRORED = 4;
const OPENING = 10;
const OPEN = 11;
const ABORTING = 12;
const ABORTED = 3;
const RENDER = 20;
const PRERENDER = 21;
const CLOSED = 14;

export type ReactClientObject = {+[key: string]: ReactClientValue};
const ObjectPrototype = Object.prototype;
const DatePrototype = Date.prototype;
// $FlowFixMe[method-unbinding]
const dateToJSON = DatePrototype.toJSON;
// $FlowFixMe[method-unbinding]
const dateToISOString = DatePrototype.toISOString;
// $FlowFixMe[method-unbinding]
const dateValueOf = DatePrototype.valueOf;
const dateToPrimitive = Date.prototype[Symbol.toPrimitive];
// $FlowFixMe[method-unbinding]
const dateGetTime = DatePrototype.getTime;

function isSimpleDate(value: Date): boolean {
  return (
    getPrototypeOf(value) === DatePrototype &&
    !hasOwnProperty.call(value, 'toJSON') &&
    !hasOwnProperty.call(value, 'toISOString') &&
    !hasOwnProperty.call(value, 'valueOf') &&
    !hasOwnProperty.call(value, Symbol.toPrimitive) &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.toJSON === dateToJSON &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.toISOString === dateToISOString &&
    // $FlowFixMe[method-unbinding]
    DatePrototype.valueOf === dateValueOf &&
    Date.prototype[Symbol.toPrimitive] === dateToPrimitive
  );
}
const {getPrototypeOf} = Object;
type Task = {
  model: ReactClientValue,
  promise: ResultModel<ReactClientValue>,
  status: 0 | 1 | 3 | 4 | 5 | 6,
  renderedModel: ReactClientValue,
  modelDependencies: null | Set<ResultModel<ReactClientValue>>,
  reference: ModelReference,
  currentReference: null | ModelReference,
  fieldParentReference: void | null | ModelReference,
  resolve: ReactClientValue => void,
  reject: mixed => void,
  formatContext: FormatContext,
  isModelReference: boolean,
  ping: () => void,
  thenableState: ThenableState | null,
  timed: boolean, // DEV-only
  time: number, // DEV-only
  environmentName: string, // DEV-only
  debugOwner: null | ReactComponentInfo, // DEV-only
  debugStack: null | Error, // DEV-only
  debugTask: null | ConsoleTask, // DEV-only
  keyPath: ReactKey,
  implicitSlot: boolean,
};
interface Reference {}
type ModelParent = ReactClientObject | $ReadOnlyArray<ReactClientValue>;
type AddressedModelEntry = {
  model: ReactClientValue,
  +root: ResultModel<any>,
  +parent: null | ModelReference,
  +key: string,
};
type ModelEntry =
  | AddressedModelEntry
  | {model: ReactClientValue, +root: void, +parent: null, +key: string};

let modelRoot: null | ReactClientValue = null;
let canEmitDebugInfo = false;
let serializedSize = 0;
const MAX_ROW_SIZE = 3200;
const emptyRoot = {};

export type Request = {
  type: 20 | 21,
  onAllReady: () => void,
  onFatalError: mixed => void,
  status: 10 | 11 | 12 | 14,
  fatalError: mixed,
  abortModel: null | ResultModel<ReactClientValue>,
  result: Result<ReactClientValue>,
  pingedTasks: Array<Task>,
  hints: Hints,
  cache: Map<Function, mixed>,
  cacheController: AbortController,
  modelEntries: WeakMap<Reference, ModelEntry>,
  renderedImplicitModels: WeakMap<Reference, ModelEntry>,
  renderedKeyedModels: null | Map<
    ReactKey,
    {
      explicit: WeakMap<Reference, ModelEntry>,
      implicit: WeakMap<Reference, ModelEntry>,
    },
  >,
  publishedModelReferences: null | WeakMap<ModelReference, ModelReference>,
  outlinedModels: null | WeakMap<Reference, Task>,
  outlinedModelDependencies: null | WeakMap<
    Reference,
    null | ResultModel<ReactClientValue>,
  >,
  resolvedOutlinedModels: null | WeakMap<Reference, ReactClientValue>,
  resolvingModelStack: Array<Reference>,
  resolvingModels: null | Set<Reference>,
  hasByValueModels: boolean,
  deferredBlobs: null | Array<Task>,
  taintCleanupQueue: Array<string | bigint>,
  pendingWeakModels: null | Set<Object>,
  abortableTasks: Set<Task>,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  identifierPrefix: string,
  identifierCount: number,
  onError: mixed => ?string,
  completedElements: Array<ReactElement>, // DEV-only
  didWarnForKey: null | WeakSet<ReactComponentInfo>, // DEV-only
  unkeyedElements: WeakSet<ReactElement>, // DEV-only
  debugIONodes: WeakMap<AsyncSequence, ReactIOInfo>, // DEV-only
  debugThenables: WeakMap<Object, Thenable<any>>, // DEV-only
  timeOrigin: number, // DEV-only
  abortTime: number, // DEV-only
  environmentName: () => string, // DEV-only
  filterStackFrame: (string, string, number, number) => boolean, // DEV-only
};

function defaultFilterStackFrame(
  filename: string,
  functionName: string,
): boolean {
  return (
    filename !== '' &&
    !filename.startsWith('node:') &&
    !filename.includes('node_modules')
  );
}

function devirtualizeURL(url: string): string {
  if (url.startsWith('about://React/')) {
    // This callsite is a virtual fake callsite that came from another Flight client.
    // We need to reverse it back into the original location by stripping its prefix
    // and suffix. We don't need the environment name because it's available on the
    // parent object that will contain the stack.
    const envIdx = url.indexOf('/', 'about://React/'.length);
    const suffixIdx = url.lastIndexOf('?');
    if (envIdx > -1 && suffixIdx > -1) {
      return decodeURI(url.slice(envIdx + 1, suffixIdx));
    }
  }
  return url;
}

function filterStackTrace(
  request: Request,
  stack: ReactStackTrace,
): ReactStackTrace {
  // Keep the same owner stack filtering as Flight.
  const filterStackFrame = request.filterStackFrame;
  const filteredStack: ReactStackTrace = [];
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    if (filterStackFrame(url, functionName, lineNumber, columnNumber)) {
      // Preserve the source stack while devirtualizing its URL.
      const clone: ReactCallSite = callsite.slice(0) as any;
      clone[1] = url;
      filteredStack.push(clone);
    }
  }
  return filteredStack;
}

function getCurrentStackInDEV(): string {
  if (__DEV__) {
    const owner: null | ReactComponentInfo = resolveOwner();
    if (owner === null) {
      return '';
    }
    return getOwnerStackByComponentInfoInDev(owner);
  }
  return '';
}

function callWithDebugContextInDEV<A, T>(
  request: Request,
  task: Task,
  callback: A => T,
  arg: A,
): T {
  // Give callbacks the nearest component's owner stack, as in Flight.
  const componentDebugInfo: ReactComponentInfo = {
    name: '',
    env: task.environmentName,
    key: null,
    owner: task.debugOwner,
    stack:
      task.debugStack === null
        ? null
        : filterStackTrace(request, parseStackTrace(task.debugStack, 1)),
    debugStack: task.debugStack,
    debugTask: task.debugTask,
  };
  const debugTask = task.debugTask;
  // We don't need the async component storage context here so we only set the
  // synchronous tracking of owner.
  setCurrentOwner(componentDebugInfo);
  try {
    if (debugTask) {
      return debugTask.run(callback.bind(null, arg));
    }
    return callback(arg);
  } finally {
    setCurrentOwner(null);
  }
}

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

const {
  TaintRegistryObjects,
  TaintRegistryValues,
  TaintRegistryByteLengths,
  TaintRegistryPendingRequests,
} = ReactSharedInternals;

function throwTaintViolation(message: string) {
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error(message);
}

function cleanupTaintQueue(request: Request): void {
  const cleanupQueue = request.taintCleanupQueue;
  TaintRegistryPendingRequests.delete(cleanupQueue);
  for (let i = 0; i < cleanupQueue.length; i++) {
    const entryValue = cleanupQueue[i];
    const entry = TaintRegistryValues.get(entryValue);
    if (entry !== undefined) {
      if (entry.count === 1) {
        TaintRegistryValues.delete(entryValue);
      } else {
        entry.count--;
      }
    }
  }
  cleanupQueue.length = 0;
}

function RequestInstance(
  this: any,
  model: ReactClientValue,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  type: 20 | 21,
  onAllReady: () => void,
  onFatalError: mixed => void,
  environmentName: void | string | (() => string),
  filterStackFrame: void | ((string, string, number, number) => boolean),
) {
  if (
    ReactSharedInternals.A !== null &&
    ReactSharedInternals.A !== DefaultAsyncDispatcher
  ) {
    throw new Error(
      'Currently React only supports one RSC renderer at a time.',
    );
  }
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  this.type = type;
  this.onAllReady = onAllReady;
  this.onFatalError = onFatalError;
  this.status = OPENING;
  this.fatalError = null;
  this.abortModel = null;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.hints = createHints();
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.modelEntries = new WeakMap();
  this.renderedImplicitModels = new WeakMap();
  this.renderedKeyedModels = null;
  this.publishedModelReferences = null;
  this.outlinedModels = null;
  this.outlinedModelDependencies = null;
  this.resolvedOutlinedModels = null;
  this.resolvingModelStack = [];
  this.resolvingModels = null;
  this.hasByValueModels = false;
  if (enableTaint) {
    this.deferredBlobs = null;
  }
  const cleanupQueue: Array<string | bigint> = [];
  if (enableTaint) {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  this.taintCleanupQueue = cleanupQueue;
  this.pendingWeakModels = null;
  this.abortableTasks = new Set();
  this.identifierPrefix = identifierPrefix || '';
  this.temporaryReferences = temporaryReferences;
  this.createServerReference = createServerReference;
  this.identifierCount = 1;
  if (__DEV__) {
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
    this.completedElements = [];
    this.didWarnForKey = null;
    this.unkeyedElements = new WeakSet();
    this.timeOrigin = performance.now();
    this.abortTime = -0.0;
    this.debugIONodes = new WeakMap();
    this.debugThenables = new WeakMap();
    this.environmentName =
      environmentName === undefined
        ? () => 'Server'
        : typeof environmentName !== 'function'
          ? () => environmentName
          : environmentName;
    this.filterStackFrame =
      filterStackFrame === undefined
        ? defaultFilterStackFrame
        : filterStackFrame;
  }
  const rootTask = createTask(
    this,
    model,
    null,
    false,
    createRootFormatContext(),
  );
  const root = rootTask.promise;
  this.result = createResult(
    root,
    reason => abort(this, reason),
    temporaryReferences,
  );
  this.pingedTasks = [rootTask];
}

initAsyncDebugInfo();

export function resolveRequest(): null | Request {
  const cache = resolveCache();
  if (cache instanceof RequestInstance) {
    return cache as any;
  }
  return null;
}

export function getHints(request: Request): Hints {
  return request.hints;
}

export function emitHint<Code: HintCode>(
  request: Request,
  code: Code,
  model: HintModel<Code>,
): void {
  pushHint(request.result, code, model);
}

export function createRequest(
  model: ReactClientValue,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  environmentName?: string | (() => string),
  filterStackFrame?: (string, string, number, number) => boolean,
): Request {
  if (__DEV__) {
    resetOwnerStackLimit();
  }
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(
    model,
    onError,
    identifierPrefix,
    temporaryReferences,
    createServerReference,
    RENDER,
    noop,
    noop,
    environmentName,
    filterStackFrame,
  );
}

export function getResult(request: Request): Result<ReactClientValue> {
  return request.result;
}

function renderFunctionComponent<Props: {[name: string]: mixed}>(
  request: Request,
  task: Task,
  Component: (p: Props, arg: void) => ReactClientValue,
  props: Props,
  element: ReactElement,
): ReactClientValue {
  if (__DEV__ && !canEmitDebugInfo) {
    return outlineTask(request, task);
  }
  const renderedModels = getRenderedModels(
    request,
    element,
    task.keyPath,
    task.implicitSlot,
  );
  const prevThenableState = task.thenableState;
  const key = element.key;
  task.thenableState = null;
  let result: ReactClientValue;
  let debugOwner: null | ReactComponentInfo = null;
  if (__DEV__) {
    let componentDebugInfo: ReactComponentInfo;
    if (prevThenableState !== null) {
      componentDebugInfo = (prevThenableState as any)._componentDebugInfo;
    } else {
      componentDebugInfo = {
        name: (Component as any).displayName || Component.name || '',
        env: (0, request.environmentName)(),
        key: element.key,
        owner: task.debugOwner,
        stack:
          task.debugStack === null
            ? null
            : filterStackTrace(request, parseStackTrace(task.debugStack, 1)),
        props,
        debugStack: task.debugStack,
        debugTask: task.debugTask,
      };
      if (
        element._store.validated === 2 ||
        request.unkeyedElements.has(element)
      ) {
        warnForMissingKey(request, key, componentDebugInfo, task.debugTask);
      }
      if (
        enableProfilerTimer &&
        (enableComponentPerformanceTrack || enableAsyncDebugInfo)
      ) {
        task.time = performance.now();
        pushDebugInfo(task.promise, {time: task.time});
        task.timed = true;
      }
      pushDebugInfo(task.promise, componentDebugInfo);
    }
    prepareToUseHooksForComponent(prevThenableState, componentDebugInfo);
    // $FlowFixMe[constant-condition]
    if (supportsComponentStorage) {
      if (task.debugTask) {
        result = task.debugTask.run(() =>
          componentStorage.run(
            componentDebugInfo,
            callComponentInDEV,
            Component,
            props,
            componentDebugInfo,
          ),
        );
      } else {
        result = componentStorage.run(
          componentDebugInfo,
          callComponentInDEV,
          Component,
          props,
          componentDebugInfo,
        );
      }
    } else {
      if (task.debugTask) {
        result = task.debugTask.run(() =>
          callComponentInDEV(Component, props, componentDebugInfo),
        );
      } else {
        result = callComponentInDEV(Component, props, componentDebugInfo);
      }
    }
    debugOwner = componentDebugInfo;
  } else {
    prepareToUseHooksForComponent(prevThenableState, null);
    result = Component(props, undefined);
  }
  if (request.status === ABORTING || request.status === CLOSED) {
    if (
      result !== null &&
      typeof result === 'object' &&
      !isClientReference(result) &&
      typeof (result as any).then === 'function'
    ) {
      (result as any).then(noop, noop);
    }
    throw request.fatalError;
  }
  if (__DEV__) {
    const trackedThenables = getTrackedThenablesAfterRendering();
    if (trackedThenables !== null) {
      const stacks: Array<Error> = enableAsyncDebugInfo
        ? (trackedThenables as any)._stacks ||
          ((trackedThenables as any)._stacks = [])
        : (null as any);
      for (let i = 0; i < trackedThenables.length; i++) {
        forwardDebugInfoFromThenable(
          request,
          task,
          trackedThenables[i],
          debugOwner,
          enableAsyncDebugInfo ? stacks[i] : null,
        );
      }
    }
  }

  if (__DEV__) {
    if (
      result !== null &&
      typeof result === 'object' &&
      !isClientReference(result) &&
      typeof (result as any).then === 'function'
    ) {
      const thenable: Thenable<ReactClientValue> = result as any;
      if (thenable.status === 'fulfilled') {
        forwardDebugInfoFromThenable(request, task, thenable);
        result = thenable.value;
      } else if (thenable.status === 'rejected') {
        forwardDebugInfoFromThenable(request, task, thenable);
        throw thenable.reason;
      }
    }
    task.debugOwner = debugOwner;
    task.debugStack = null;
    task.debugTask = null;
    if (
      result != null &&
      typeof result === 'object' &&
      (result as any).$$typeof === REACT_ELEMENT_TYPE
    ) {
      (result as any)._store.validated = 1;
    }
  }

  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  if (key !== null) {
    if (key === REACT_OPTIMISTIC_KEY || prevKeyPath === REACT_OPTIMISTIC_KEY) {
      task.keyPath = REACT_OPTIMISTIC_KEY;
    } else {
      task.keyPath = prevKeyPath === null ? key : prevKeyPath + ',' + key;
    }
  } else if (prevKeyPath === null) {
    task.implicitSlot = true;
  }
  if (
    result !== null &&
    typeof result === 'object' &&
    !isClientReference(result) &&
    typeof (result as any).then === 'function'
  ) {
    const thenable: Thenable<ReactClientValue> = result as any;
    if (__DEV__) {
      thenable.then(resolvedValue => {
        if (
          resolvedValue !== null &&
          typeof resolvedValue === 'object' &&
          (resolvedValue as any).$$typeof === REACT_ELEMENT_TYPE
        ) {
          (resolvedValue as any)._store.validated = 1;
        }
      }, noop);
    }
    const expandedThenable: Thenable<ReactClientValue> = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      result,
    ) as any;
    const resolvedModel = createLazyWrapperAroundWakeable(expandedThenable);
    setRenderedModel(renderedModels, element, resolvedModel);
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;
    task.isModelReference = true;
    return resolvedModel;
  }
  if (
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof !== REACT_ELEMENT_TYPE &&
    !isClientReference(result) &&
    !isArray(result) &&
    !(result instanceof Map) &&
    !(result instanceof Set)
  ) {
    const iteratorFn = getIteratorFn(result);
    if (iteratorFn) {
      const iterableChild: any = result;
      result = {
        [Symbol.iterator]: function () {
          return iteratorFn.call(iterableChild) as any;
        },
      };
    } else if (
      typeof (result as any)[ASYNC_ITERATOR] === 'function' &&
      (typeof ReadableStream !== 'function' ||
        !(result instanceof ReadableStream))
    ) {
      const iterableChild: any = result;
      result = {
        [ASYNC_ITERATOR]: function () {
          return iterableChild[ASYNC_ITERATOR]();
        },
      };
    }
  }
  if (
    __DEV__ &&
    result !== null &&
    typeof result === 'object' &&
    (result as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    (result as any)._store.validated = 1;
  }
  const resolvedModel = renderModelDestructive(
    request,
    task,
    emptyRoot,
    '',
    result,
  );
  setRenderedModel(
    renderedModels,
    element,
    resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
  );
  task.keyPath = prevKeyPath;
  task.implicitSlot = prevImplicitSlot;
  return resolvedModel;
}

function renderElement(
  request: Request,
  task: Task,
  type: any,
  element: ReactElement,
): ReactClientValue {
  const key = element.key;
  const props = element.props;
  const ref = props.ref;
  if (ref !== null && ref !== undefined) {
    throw new Error(
      'Refs cannot be used in Server Components, nor passed to Client Components.',
    );
  }
  if (
    typeof type === 'function' &&
    !isClientReference(type) &&
    !isOpaqueTemporaryReference(type)
  ) {
    return renderFunctionComponent(request, task, type, props, element);
  }

  if (type === REACT_FRAGMENT_TYPE && key === null) {
    if (
      __DEV__ &&
      (element._store.validated === 2 || request.unkeyedElements.has(element))
    ) {
      const componentDebugInfo: ReactComponentInfo = {
        name: 'Fragment',
        env: (0, request.environmentName)(),
        key,
        owner: task.debugOwner,
        stack:
          task.debugStack === null
            ? null
            : filterStackTrace(request, parseStackTrace(task.debugStack, 1)),
        props,
        debugStack: task.debugStack,
        debugTask: task.debugTask,
      };
      warnForMissingKey(request, key, componentDebugInfo, task.debugTask);
    }
    const prevImplicitSlot = task.implicitSlot;
    const renderedModels = getRenderedModels(
      request,
      element as any,
      task.keyPath,
      task.implicitSlot,
    );
    if (task.keyPath === null) {
      task.implicitSlot = true;
    }
    const resolvedModel = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      props.children,
    );
    setRenderedModel(
      renderedModels,
      element,
      resolvedModel === undefined ? UNDEFINED_MODEL : resolvedModel,
    );
    task.implicitSlot = prevImplicitSlot;
    return resolvedModel;
  }

  if (type != null && typeof type === 'object' && !isClientReference(type)) {
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE: {
        let wrappedType;
        if (__DEV__) {
          wrappedType = callLazyInitInDEV(type);
        } else {
          const payload = type._payload;
          const init = type._init;
          wrappedType = init(payload);
        }
        if (request.status === ABORTING || request.status === CLOSED) {
          throw request.fatalError;
        }
        return renderElement(request, task, wrappedType, element);
      }
      case REACT_FORWARD_REF_TYPE: {
        return renderFunctionComponent(
          request,
          task,
          type.render,
          props,
          element,
        );
      }
      case REACT_MEMO_TYPE: {
        return renderElement(request, task, type.type, element);
      }
    }
  } else if (typeof type === 'string') {
    const parentFormatContext = task.formatContext;
    const newFormatContext = getChildFormatContext(
      parentFormatContext,
      type,
      props,
    );
    if (parentFormatContext !== newFormatContext && props.children != null) {
      outlineModelWithFormatContext(request, props.children, newFormatContext);
    }
  }

  return renderClientElement(request, task, type, element);
}

function validateSymbol(
  value: symbol,
  parent: ModelParent,
  parentPropertyName: string,
): void {
  // $FlowFixMe[incompatible-type] `description` might be undefined
  const name: string = value.description;
  if (Symbol.for(name) !== value) {
    throw new Error(
      'Only global symbols received from Symbol.for(...) can be passed to Client Components. ' +
        `The symbol Symbol.for(${name}) cannot be found among global symbols.` +
        describeObjectForErrorMessage(parent, parentPropertyName),
    );
  }
}

function createTask(
  request: Request,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  formatContext: FormatContext,
): Task {
  const promise = createResultModel<ReactClientValue>();
  const reference: ModelReference = {root: promise, parent: null, key: ''};
  if (model !== null && typeof model === 'object') {
    setModelReferenceIfAbsent(request, model, reference);
  }
  const task: Task = {
    model,
    promise,
    reference,
    currentReference: reference,
    fieldParentReference: undefined,
    renderedModel: undefined,
    modelDependencies: null,
    resolve: value => fulfillResultModel(promise, value),
    reject: error => rejectResultModel(promise, error),
    status: PENDING,
    formatContext,
    isModelReference: false,
    ping: () => pingTask(request, task),
    thenableState: null,
    keyPath,
    implicitSlot,
  } as Omit<
    Task,
    | 'environmentName'
    | 'debugOwner'
    | 'debugStack'
    | 'debugTask'
    | 'timed'
    | 'time',
  > as any;
  if (__DEV__) {
    task.timed = false;
    task.time = request.timeOrigin;
    promise._debugInfo = [];
    task.environmentName = request.environmentName();
    task.debugOwner = null;
    task.debugStack = null;
    task.debugTask = null;
  }
  request.abortableTasks.add(task);
  return task;
}

function pingTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  if (__DEV__) {
    task.timed = true;
  }
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    if (request.type === PRERENDER || request.status === OPENING) {
      scheduleMicrotask(() => performWork(request));
    } else {
      scheduleWork(() => performWork(request));
    }
  }
}

function outlineModelWithFormatContext(
  request: Request,
  value: ReactClientValue,
  formatContext: FormatContext,
): ReactClientValue {
  const newTask = createTask(request, value, null, false, formatContext);
  if (value !== null && typeof value === 'object') {
    setModelReference(request, value, newTask.reference);
    setRenderedModel(request.modelEntries, value, newTask.promise);
  }
  retryTask(request, newTask);
  const model = newTask.status === COMPLETED ? newTask.model : newTask.promise;
  if (value !== null && typeof value === 'object') {
    setRenderedModel(
      request.modelEntries,
      value,
      model === undefined ? UNDEFINED_MODEL : model,
    );
  }
  if (newTask.status !== COMPLETED) {
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(newTask.promise, newTask);
    request.hasByValueModels = true;
  }
  return model;
}

function outlineModel(
  request: Request,
  value: ReactClientValue,
): ReactClientValue {
  if (value !== null && typeof value === 'object') {
    const existingModel = getRenderedModel(request.modelEntries, value);
    if (existingModel !== undefined) {
      return existingModel === UNDEFINED_MODEL ? undefined : existingModel;
    }
  }
  return outlineModelWithFormatContext(
    request,
    value,
    createRootFormatContext(),
  );
}

function readThenable<T>(thenable: Thenable<T>): T {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  } else if (thenable.status === 'rejected') {
    throw thenable.reason;
  }
  throw thenable;
}

function createLazyWrapperAroundWakeable(
  thenable: Thenable<ReactClientValue>,
): ReactClientValue {
  if (thenable.status === 'fulfilled') {
    return thenable.value;
  }
  const lazy: LazyComponent<ReactClientValue, Thenable<ReactClientValue>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: thenable,
    _init: readThenable,
  };
  return lazy;
}

function erroredTask(request: Request, task: Task, error: mixed): void {
  task.status = ERRORED;
  logRecoverableError(request, error, task);
  if (
    __DEV__ &&
    error instanceof Error &&
    ('cause' in error ||
      (typeof AggregateError !== 'undefined' &&
        error instanceof AggregateError))
  ) {
    const normalized = outlineModel(request, error);
    if (
      normalized !== null &&
      typeof normalized === 'object' &&
      getResultModelStatus(normalized) !== null
    ) {
      (normalized as any).then(task.reject, task.reject);
    } else {
      task.reject(normalized);
    }
  } else {
    task.reject(error);
  }
  const model = task.model;
  if (
    model !== null &&
    typeof model === 'object' &&
    (model as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    const renderedModels = getRenderedModels(
      request,
      model,
      task.keyPath,
      task.implicitSlot,
    );
    if (getRenderedModel(renderedModels, model) === undefined) {
      setRenderedModel(
        renderedModels,
        model,
        createLazyWrapperAroundWakeable(task.promise as any),
      );
    }
  }
  request.abortableTasks.delete(task);
}

function logRecoverableError(
  request: Request,
  error: mixed,
  task: Task | null = null, // DEV-only
): string {
  const prevCache = setCurrentCache(null);
  let errorDigest;
  try {
    const onError = request.onError;
    if (__DEV__ && task !== null) {
      // $FlowFixMe[constant-condition]
      if (supportsRequestStorage) {
        errorDigest = cacheStorage.run(undefined, () =>
          requestStorage.run(
            undefined,
            callWithDebugContextInDEV,
            request,
            task,
            onError,
            error,
          ),
        );
      } else {
        errorDigest = callWithDebugContextInDEV(request, task, onError, error);
      }
      // $FlowFixMe[constant-condition]
    } else if (supportsRequestStorage) {
      // Exit the request context while running callbacks.
      errorDigest = cacheStorage.run(undefined, () =>
        requestStorage.run(undefined, onError, error),
      );
    } else {
      errorDigest = onError(error);
    }
  } finally {
    setCurrentCache(prevCache);
  }
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      `onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "${typeof errorDigest}" instead`,
    );
  }
  const digest = errorDigest || '';
  if (task !== null) {
    setErrorDigest(request.result, task.promise, digest);
  }
  return digest;
}

function fatalError(request: Request, error: mixed): void {
  if (request.status === CLOSED) {
    return;
  }
  request.status = ABORTING;
  request.fatalError = error;
  request.cacheController.abort(error);
  finishAbort(request, error);
  request.onFatalError(error);
}

function renderThenable(
  request: Request,
  task: Task,
  value: ReactClientValue,
): ReactClientValue {
  const thenable: Thenable<ReactClientValue> = value as any;
  if (enableFlightWeakThenables && thenable.status === 'pending_weak') {
    return renderWeakThenable(request, task, thenable);
  }

  const newTask = createTask(
    request,
    value,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  if (__DEV__) {
    newTask.environmentName = task.environmentName;
    newTask.time = task.time;
    newTask.timed = task.timed;
    newTask.debugOwner = task.debugOwner;
    newTask.debugStack = task.debugStack;
    newTask.debugTask = task.debugTask;
  }
  setRenderedModel(
    getRenderedModels(request, value, task.keyPath, task.implicitSlot),
    thenable,
    newTask.promise,
  );
  switch (thenable.status) {
    case 'fulfilled':
      forwardDebugInfoFromThenable(request, newTask, thenable);
      newTask.model = thenable.value;
      pingTask(request, newTask);
      break;
    case 'rejected':
      forwardDebugInfoFromThenable(request, newTask, thenable);
      try {
        erroredTask(request, newTask, thenable.reason);
      } catch (error) {
        fatalError(request, error);
      }
      break;
    default: {
      if (request.status === ABORTING) {
        abortTask(request, newTask);
        return newTask.promise;
      }
      if (typeof thenable.status !== 'string') {
        const pendingThenable: PendingThenable<ReactClientValue> =
          thenable as any;
        pendingThenable.status = 'pending';
        pendingThenable.then(
          fulfilledValue => {
            if (thenable.status === 'pending') {
              const fulfilledThenable: FulfilledThenable<ReactClientValue> =
                thenable as any;
              fulfilledThenable.status = 'fulfilled';
              fulfilledThenable.value = fulfilledValue;
            }
          },
          (error: mixed) => {
            if (thenable.status === 'pending') {
              const rejectedThenable: RejectedThenable<ReactClientValue> =
                thenable as any;
              rejectedThenable.status = 'rejected';
              rejectedThenable.reason = error;
            }
          },
        );
      }
      thenable.then(
        fulfilledValue => {
          if (newTask.status === PENDING) {
            forwardDebugInfoFromCurrentContext(request, newTask, thenable);
            newTask.model = fulfilledValue;
            pingTask(request, newTask);
          }
        },
        reason => {
          if (newTask.status === PENDING) {
            forwardDebugInfoFromCurrentContext(request, newTask, thenable);
            try {
              erroredTask(request, newTask, reason);
            } catch (error) {
              fatalError(request, error);
            }
            scheduleMicrotask(() => performWork(request));
          }
        },
      );
    }
  }
  return newTask.promise;
}

function renderClientElement(
  request: Request,
  task: Task,
  type: any,
  element: ReactElement,
): ReactClientValue {
  let key = element.key;
  const props = element.props;
  const keyPath = task.keyPath;
  if (key === null) {
    key = keyPath;
  } else if (keyPath !== null) {
    if (keyPath === REACT_OPTIMISTIC_KEY || key === REACT_OPTIMISTIC_KEY) {
      key = REACT_OPTIMISTIC_KEY;
    } else {
      key = keyPath + ',' + key;
    }
  }
  if (__DEV__ && task.implicitSlot) {
    element._store.validated = 1;
  }
  if (__DEV__) {
    jsxPropsParents.set(props, type);
    if (typeof props.children === 'object' && props.children !== null) {
      jsxChildrenParents.set(props.children, type);
    }
  }
  let resolvedElement: ReactElement;
  if (__DEV__) {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key: key,
      props,
      _owner: element._owner === undefined ? null : element._owner,
      _store: element._store,
    } as any;
    Object.defineProperties(resolvedElement, {
      ref: {value: null},
      _debugInfo: {value: element._debugInfo, writable: true},
      _debugStack: {
        value: element._debugStack === undefined ? null : element._debugStack,
        writable: true,
      },
      _debugTask: {
        value: element._debugTask === undefined ? null : element._debugTask,
        writable: true,
      },
    });
  } else {
    resolvedElement = {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key: key,
      ref: null,
      props,
    } as any;
  }
  const renderedModels = getRenderedModels(
    request,
    element as any,
    keyPath,
    task.implicitSlot,
  );
  let resolvedModel: ReactClientValue = resolvedElement as any;
  if (task.implicitSlot && key !== null) {
    const children: Array<ReactClientValue> = [resolvedElement as any];
    const copy: Array<ReactClientValue> = [];
    setRenderedModel(request.modelEntries, children, copy);
    const reference = task.currentReference;
    if (reference !== null) {
      setModelReference(request, children, reference);
      setModelReference(request, resolvedElement, {
        root: reference.root,
        parent: reference,
        key: '0',
      });
    }
    task.model = children;
    resolvedModel = copy;
  }
  setRenderedModel(renderedModels, element, resolvedModel);
  const reference = task.currentReference;
  task.fieldParentReference =
    resolvedModel !== resolvedElement
      ? undefined
      : reference === null
        ? null
        : {root: reference.root, parent: reference.parent, key: reference.key};
  task.keyPath = null;
  task.implicitSlot = false;
  task.isModelReference = false;
  return resolvedModel;
}

function renderModelDestructive(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
): ReactClientValue {
  task.model = value;
  task.isModelReference = false;
  if (
    value !== null &&
    typeof value === 'object' &&
    getValueReference(request.result, value) !== undefined
  ) {
    return renderModelReference(task, value);
  }
  if (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function')
  ) {
    if (isClientReference(value)) {
      return renderModelReference(task, value);
    }
    if (
      (typeof value === 'function' || enableFlightObjectReferences) &&
      isServerReference(value)
    ) {
      return renderModelReference(task, renderServerReference(request, value));
    }
    if (request.temporaryReferences !== undefined) {
      const reference = resolveTemporaryReference(
        request.temporaryReferences,
        value as any,
      );
      if (reference !== undefined) {
        setTemporaryReference(request.result, value as any, reference);
        return renderModelReference(task, value);
      }
    }
  }

  if (enableTaint) {
    // Check the source before copying it. A copy does not carry its taint mark.
    if (typeof value === 'string' || typeof value === 'bigint') {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    } else if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function')
    ) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') {
      serializedSize += value.length;
    }
    if (
      typeof value === 'string' &&
      value[value.length - 1] === 'Z' &&
      parent[parentPropertyName as any] instanceof Date
    ) {
      return renderModelReference(task, new Date(value));
    }
    if (typeof value === 'function') {
      if (isOpaqueTemporaryReference(value)) {
        throw new Error(
          'Could not reference an opaque temporary reference. This is likely due to misconfiguring the temporaryReferences options on the server.',
        );
      }
      if (/^on[A-Z]/.test(parentPropertyName)) {
        throw new Error(
          'Event handlers cannot be passed to Client Component props.' +
            describeObjectForErrorMessage(parent, parentPropertyName) +
            '\nIf you need interactivity, consider converting part of this to a Client Component.',
        );
      }
      if (
        __DEV__ &&
        (jsxChildrenParents.has(parent) ||
          (jsxPropsParents.has(parent) && parentPropertyName === 'children'))
      ) {
        const componentName = value.displayName || value.name || 'Component';
        throw new Error(
          'Functions are not valid as a child of Client Components. This may happen if ' +
            'you return ' +
            componentName +
            ' instead of <' +
            componentName +
            ' /> from render. ' +
            'Or maybe you meant to call this function rather than return it.' +
            describeObjectForErrorMessage(parent, parentPropertyName),
        );
      }
      throw new Error(
        'Functions cannot be passed directly to Client Components ' +
          'unless you explicitly expose it by marking it with "use server". ' +
          'Or maybe you meant to call this function rather than return it.' +
          describeObjectForErrorMessage(parent, parentPropertyName),
      );
    }
    if (typeof value === 'symbol') {
      validateSymbol(value, parent, parentPropertyName);
    }
    return value;
  }
  const renderedModels = getRenderedModels(
    request,
    value,
    task.keyPath,
    task.implicitSlot,
  );
  let modelEntry = renderedModels.get(value);
  let existingModel = modelEntry === undefined ? undefined : modelEntry.model;
  const elementType = (value as any).$$typeof;
  const canReference =
    elementType === REACT_ELEMENT_TYPE
      ? task.keyPath === null && !task.implicitSlot
      : (isArray(value) && task.keyPath === null) ||
        value instanceof Map ||
        value instanceof Set ||
        getPrototypeOf(value) === ObjectPrototype;
  const referenceEntry = canReference
    ? renderedModels === request.modelEntries
      ? modelEntry
      : request.modelEntries.get(value)
    : undefined;
  let reference = getEntryReference(referenceEntry);
  if (
    canReference &&
    reference !== undefined &&
    reference.root !== task.promise &&
    existingModel !== undefined &&
    typeof (value as any).then !== 'function'
  ) {
    return renderModelReference(
      task,
      createResultValueReference(request, reference) as any,
    );
  }
  if (existingModel !== undefined) {
    if (
      elementType === REACT_ELEMENT_TYPE &&
      typeof existingModel === 'string' &&
      modelEntry !== undefined &&
      modelEntry.root !== undefined &&
      modelRoot !== value
    ) {
      return renderModelReference(
        task,
        createResultValueReference(request, modelEntry) as any,
      );
    }
    if (existingModel === UNDEFINED_MODEL) {
      existingModel = undefined;
    }
    if (request.hasByValueModels && existingModel !== task.promise) {
      const outlinedModels = request.outlinedModels;
      if (outlinedModels !== null) {
        const dependency = outlinedModels.get(existingModel as any);
        if (dependency !== undefined && dependency.status === COMPLETED) {
          existingModel = dependency.model;
        } else if (dependency === task && task.status === RENDERING) {
          existingModel = task.renderedModel;
        } else {
          const dependencies = getOutlinedModelDependencies(
            request,
            existingModel,
            outlinedModels,
          );
          const iterator = dependencies.values();
          for (
            let entry = iterator.next();
            !entry.done;
            entry = iterator.next()
          ) {
            addModelDependency(task, entry.value);
          }
        }
      }
    }
    if (modelRoot === value) {
      if (
        existingModel !== task.promise &&
        !(
          existingModel !== null &&
          typeof existingModel === 'object' &&
          (existingModel as any).$$typeof === REACT_LAZY_TYPE &&
          (existingModel as any)._payload === task.promise
        )
      ) {
        return renderModelReference(task, existingModel);
      }
      modelRoot = null;
    } else {
      return renderModelReference(task, existingModel);
    }
  }

  if (parentReference === undefined) {
    parentReference =
      parent === emptyRoot
        ? task.currentReference
        : getModelReference(request, parent);
  }
  if (
    reference === undefined &&
    parentReference != null &&
    parentPropertyName.indexOf(':') === -1
  ) {
    if (canReference) {
      const newEntry: AddressedModelEntry = {
        model: referenceEntry === undefined ? undefined : referenceEntry.model,
        root: parentReference.root,
        parent: parent === emptyRoot ? parentReference.parent : parentReference,
        key: parent === emptyRoot ? parentReference.key : parentPropertyName,
      };
      request.modelEntries.set(value, newEntry);
      reference = newEntry;
      if (renderedModels === request.modelEntries) {
        modelEntry = newEntry;
      }
    } else {
      reference =
        parent === emptyRoot
          ? parentReference
          : {
              root: parentReference.root,
              parent: parentReference,
              key: parentPropertyName,
            };
    }
  }
  task.currentReference = reference === undefined ? null : reference;
  if (elementType === REACT_ELEMENT_TYPE) {
    if (serializedSize > MAX_ROW_SIZE) {
      return deferTask(request, task);
    }
    const element: ReactElement = value as any;
    if (__DEV__) {
      const debugInfo: ?ReactDebugInfo = element._debugInfo;
      if (debugInfo) {
        if (!canEmitDebugInfo) {
          return outlineTask(request, task);
        }
        forwardDebugInfo(request, task, debugInfo);
      }
      task.debugOwner = element._owner;
      task.debugStack = element._debugStack;
      task.debugTask = element._debugTask;
    }
    const rendered = renderElement(request, task, element.type, element);
    if (typeof rendered === 'string' && reference !== undefined) {
      const entry = renderedModels.get(value);
      if (entry !== undefined) {
        renderedModels.set(value, createModelEntry(entry.model, reference));
      }
    }
    if (
      rendered !== null &&
      typeof rendered === 'object' &&
      reference != null &&
      (rendered as any).$$typeof === REACT_ELEMENT_TYPE &&
      task.fieldParentReference === null
    ) {
      task.fieldParentReference = {
        root: reference.root,
        parent: reference.parent,
        key: reference.key,
      };
    }
    return rendered;
  }
  if (elementType === REACT_LAZY_TYPE) {
    if (serializedSize > MAX_ROW_SIZE) {
      return deferTask(request, task);
    }
    const lazy: LazyComponent<ReactClientValue, any> = value as any;
    task.thenableState = null;
    const init = lazy._init;
    const payload = lazy._payload;
    const resolvedModel = __DEV__ ? callLazyInitInDEV(lazy) : init(payload);
    if (__DEV__) {
      const debugInfo: ?ReactDebugInfo = lazy._debugInfo;
      if (debugInfo) {
        if (!canEmitDebugInfo) {
          return outlineTask(request, task);
        }
        forwardDebugInfo(request, task, debugInfo);
      }
    }
    if (request.status === ABORTING || request.status === CLOSED) {
      throw request.fatalError;
    }
    return renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      resolvedModel,
      parentReference,
    );
  }
  if (elementType === REACT_LEGACY_ELEMENT_TYPE) {
    throw new Error(
      'A React Element from an older version of React was rendered. ' +
        'This is not supported. It can happen if:\n' +
        '- Multiple copies of the "react" package is used.\n' +
        '- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n' +
        '- A compiler tries to "inline" JSX instead of using the runtime.',
    );
  }
  if (typeof (value as any).then === 'function') {
    return renderModelReference(task, renderThenable(request, task, value));
  }
  if (isArray(value)) {
    return renderFragment(request, task, value);
  }
  if (value instanceof Date) {
    const date: Date = value;
    return renderModelReference(
      task,
      isSimpleDate(date)
        ? new Date(dateGetTime.call(date))
        : // Match Flight's '$D' + date.toJSON() coercion, including Symbols.
          // eslint-disable-next-line react-internal/safe-string-coercion
          new Date('' + date.toJSON()),
    );
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    if (enableTaint) {
      const typedArray: $ArrayBufferView =
        value instanceof ArrayBuffer ? new Uint8Array(value) : (value as any);
      if (TaintRegistryByteLengths.has(typedArray.byteLength)) {
        const tainted = TaintRegistryValues.get(
          binaryToComparableString(typedArray),
        );
        if (tainted !== undefined) {
          throwTaintViolation(tainted.message);
        }
      }
    }
    return renderModelReference(task, value);
  }
  if (value instanceof Map) {
    return renderModelReference(task, renderMap(request, task, value));
  }
  if (value instanceof Set) {
    return renderModelReference(task, renderSet(request, task, value));
  }
  if (typeof FormData === 'function' && value instanceof FormData) {
    return renderModelReference(task, renderFormData(request, task, value));
  }
  if (value instanceof Error) {
    return renderModelReference(task, renderErrorValue(request, task, value));
  }
  if (typeof Blob === 'function' && value instanceof Blob) {
    return renderModelReference(task, renderBlob(request, task, value));
  }
  const iteratorFn = getIteratorFn(value);
  if (iteratorFn) {
    const iterator = iteratorFn.call(value);
    if (iterator === value) {
      return renderModelReference(
        task,
        renderIterator(request, task, iterator as any),
      );
    }
    return renderFragment(
      request,
      task,
      Array.from(iterator as any),
      value as any,
    );
  }
  if (typeof ReadableStream === 'function' && value instanceof ReadableStream) {
    return renderModelReference(
      task,
      renderReadableStream(request, task, value),
    );
  }
  const getAsyncIterator = (value as any)[ASYNC_ITERATOR];
  if (typeof getAsyncIterator === 'function') {
    const model = renderAsyncFragment(
      request,
      task,
      value as any,
      getAsyncIterator,
    );
    return renderModelReference(task, model);
  }
  const prototype = getPrototypeOf(value);
  if (
    prototype !== ObjectPrototype &&
    (prototype === null || getPrototypeOf(prototype) !== null)
  ) {
    throw new Error(
      'Only plain objects, and a few built-ins, can be passed to Client Components ' +
        'from Server Components. Classes or null prototypes are not supported.' +
        describeObjectForErrorMessage(parent, parentPropertyName),
    );
  }
  if (__DEV__) {
    if (objectName(value) !== 'Object') {
      callWithDebugContextInDEV(request, task, () => {
        console.error(
          'Only plain objects can be passed to Client Components from Server Components. ' +
            '%s objects are not supported.%s',
          objectName(value),
          describeObjectForErrorMessage(parent, parentPropertyName),
        );
      });
    } else if (!isSimpleObject(value)) {
      callWithDebugContextInDEV(request, task, () => {
        console.error(
          'Only plain objects can be passed to Client Components from Server Components. ' +
            'Classes or other objects with methods are not supported.%s',
          describeObjectForErrorMessage(parent, parentPropertyName),
        );
      });
    } else if (Object.getOwnPropertySymbols) {
      const symbols = Object.getOwnPropertySymbols(value);
      if (symbols.length > 0) {
        callWithDebugContextInDEV(request, task, () => {
          console.error(
            'Only plain objects can be passed to Client Components from Server Components. ' +
              'Objects with symbol properties like %s are not supported.%s',
            symbols[0].description,
            describeObjectForErrorMessage(parent, parentPropertyName),
          );
        });
      }
    }
  }
  const copy: {[key: string]: ReactClientValue} = {};
  setRenderedModel(request.modelEntries, value, copy);
  task.fieldParentReference = undefined;
  return copy;
}

function resolveModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
  renderedRoot?: ReactClientValue,
): ReactClientValue {
  const prevOwner = __DEV__ ? task.debugOwner : null;
  const prevStack = __DEV__ ? task.debugStack : null;
  const prevDebugTask = __DEV__ ? task.debugTask : null;
  try {
    let jsonValue: ReactClientValue = value;
    if (
      value !== null &&
      typeof value === 'object' &&
      !(enableFlightObjectReferences && isServerReference(value)) &&
      typeof (value as any).toJSON === 'function'
    ) {
      if (enableTaint) {
        const tainted = TaintRegistryObjects.get(value);
        if (tainted !== undefined) {
          throwTaintViolation(tainted);
        }
      }
      if (value instanceof Date && isSimpleDate(value)) {
        const time = dateGetTime.call(value);
        if (enableTaint && !Number.isNaN(time)) {
          const tainted = TaintRegistryValues.get(dateToISOString.call(value));
          if (tainted !== undefined) {
            throwTaintViolation(tainted.message);
          }
        }
        return renderModelReference(
          task,
          Number.isNaN(time) ? null : new Date(time),
        );
      }
      jsonValue = (value as any).toJSON(parentPropertyName);
    }
    if (__DEV__) {
      const originalValue = parent[parentPropertyName as any];
      if (
        typeof originalValue === 'object' &&
        originalValue !== jsonValue &&
        !(originalValue instanceof Date)
      ) {
        // Call with the server component as the currently rendering component
        // for context.
        callWithDebugContextInDEV(request, task, () => {
          if (ArrayBuffer.isView(originalValue)) {
            // Binary data such as a Node.js Buffer carries a toJSON method, so it
            // is serialized through that method rather than as binary. A plain
            // Uint8Array or ArrayBuffer has no toJSON and is serialized as
            // binary.
            console.error(
              'Binary data with a toJSON method, such as a Node.js Buffer, is ' +
                'serialized through toJSON instead of as binary. Pass a ' +
                'Uint8Array or ArrayBuffer to send binary data.%s',
              describeObjectForErrorMessage(parent, parentPropertyName),
            );
          } else if (objectName(originalValue) !== 'Object') {
            const jsxParentType = jsxChildrenParents.get(parent);
            if (typeof jsxParentType === 'string') {
              console.error(
                '%s objects cannot be rendered as text children. Try formatting it using toString().%s',
                objectName(originalValue),
                describeObjectForErrorMessage(parent, parentPropertyName),
              );
            } else {
              console.error(
                'Only plain objects can be passed to Client Components from Server Components. ' +
                  '%s objects are not supported.%s',
                objectName(originalValue),
                describeObjectForErrorMessage(parent, parentPropertyName),
              );
            }
          } else {
            console.error(
              'Only plain objects can be passed to Client Components from Server Components. ' +
                'Objects with toJSON methods are not supported. Convert it manually ' +
                'to a simple value before passing it to props.%s',
              describeObjectForErrorMessage(parent, parentPropertyName),
            );
          }
        });
      }
    }

    const rendered =
      renderedRoot !== undefined && jsonValue === value
        ? renderedRoot
        : renderModel(
            request,
            task,
            parent,
            parentPropertyName,
            jsonValue,
            parentReference,
          );
    if (renderedRoot !== undefined) {
      task.renderedModel = rendered;
      if (jsonValue !== value) {
        let outlinedModels = request.outlinedModels;
        if (outlinedModels === null) {
          request.outlinedModels = outlinedModels = new WeakMap();
        }
        outlinedModels.set(renderedRoot as any, task);
        request.hasByValueModels = true;
      }
    }
    if (
      task.isModelReference ||
      rendered === null ||
      typeof rendered !== 'object'
    ) {
      return rendered;
    }
    const stack = request.resolvingModelStack;
    stack.push(rendered);
    if (request.resolvingModels !== null) {
      request.resolvingModels.add(rendered);
    }
    try {
      return resolveModelFields(request, task, rendered);
    } finally {
      stack.pop();
      if (request.resolvingModels !== null) {
        request.resolvingModels.delete(rendered);
      }
    }
  } finally {
    if (__DEV__) {
      task.debugOwner = prevOwner;
      task.debugStack = prevStack;
      task.debugTask = prevDebugTask;
    }
  }
}
function renderModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | ModelReference,
): ReactClientValue {
  serializedSize +=
    (parent as any).$$typeof === REACT_ELEMENT_TYPE
      ? 1
      : parentPropertyName.length;
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  try {
    return renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      value,
      parentReference,
    );
  } catch (thrownValue) {
    if (request.status === CLOSED) {
      throw request.fatalError;
    }
    const error =
      request.status === ABORTING
        ? request.fatalError
        : thrownValue === SuspenseException
          ? getSuspendedThenable()
          : thrownValue;
    const model = task.model;
    if (
      model !== null &&
      typeof model === 'object' &&
      ((model as any).$$typeof === REACT_ELEMENT_TYPE ||
        (model as any).$$typeof === REACT_LAZY_TYPE)
    ) {
      const newTask = createTask(
        request,
        model,
        task.keyPath,
        task.implicitSlot,
        task.formatContext,
      );
      if (__DEV__) {
        newTask.environmentName = task.environmentName;
        newTask.debugOwner = task.debugOwner;
        newTask.debugStack = task.debugStack;
        newTask.debugTask = task.debugTask;
      }
      const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
      setModelReference(request, model, newTask.reference);
      if ((model as any).$$typeof === REACT_ELEMENT_TYPE) {
        const renderedModels = getRenderedModels(
          request,
          model,
          task.keyPath,
          task.implicitSlot,
        );
        if (getRenderedModel(renderedModels, model) === undefined) {
          setRenderedModel(renderedModels, model, lazy);
        }
      }
      if (
        value !== model &&
        value !== null &&
        typeof value === 'object' &&
        (value as any).$$typeof === REACT_ELEMENT_TYPE
      ) {
        setRenderedModel(
          getRenderedModels(request, value, prevKeyPath, prevImplicitSlot),
          value,
          lazy,
        );
      }
      task.keyPath = prevKeyPath;
      task.implicitSlot = prevImplicitSlot;
      if (request.status === ABORTING) {
        abortTask(request, newTask);
      } else if (
        error != null &&
        typeof error === 'object' &&
        typeof (error as any).then === 'function'
      ) {
        const ping = newTask.ping;
        (error as any).then(ping, ping);
        newTask.thenableState = getThenableStateAfterSuspending();
      } else {
        erroredTask(request, newTask, error);
      }
      return renderModelReference(task, lazy);
    }
    task.keyPath = prevKeyPath;
    task.implicitSlot = prevImplicitSlot;
    const newTask = createTask(
      request,
      model,
      prevKeyPath,
      prevImplicitSlot,
      task.formatContext,
    );
    if (__DEV__) {
      newTask.debugOwner = task.debugOwner;
      newTask.debugStack = task.debugStack;
      newTask.debugTask = task.debugTask;
    }
    // Binding in the recovery path avoids a captured local in every hot call,
    // including after a later bundler inlines this helper.
    newTask.resolve = resolveBoxedModel.bind(null, newTask.resolve);
    if (model !== null && typeof model === 'object') {
      setModelReference(request, model, {
        root: newTask.promise,
        parent: newTask.reference,
        key: 'value',
      });
    }
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(newTask.promise, newTask);
    request.hasByValueModels = true;
    addModelDependency(task, newTask.promise);
    markErroredModel(request, newTask, value, prevKeyPath, prevImplicitSlot);
    if (request.status === ABORTING) {
      abortTask(request, newTask);
    } else if (
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      newTask.thenableState = getThenableStateAfterSuspending();
      const ping = newTask.ping;
      (error as any).then(ping, ping);
    } else {
      erroredTask(request, newTask, error);
    }
    if (__DEV__) {
      const reference = createResultValueReference(request, {
        root: newTask.promise,
        parent: newTask.reference,
        key: 'value',
      });
      outlinedModels.set(reference, newTask);
      return renderModelReference(task, reference);
    }
    return renderModelReference(task, newTask.promise);
  }
}

function resolveModelFields(
  request: Request,
  task: Task,
  rendered: ReactClientValue,
): ReactClientValue {
  const model = task.model;
  const parentReference = task.fieldParentReference;
  const prevKeyPath = task.keyPath;
  const prevImplicitSlot = task.implicitSlot;
  task.keyPath = null;
  task.implicitSlot = false;
  if ((rendered as any).$$typeof === REACT_ELEMENT_TYPE) {
    const element: ReactElement = rendered as any;
    const prevDependencies = task.modelDependencies;
    task.modelDependencies = null;
    try {
      serializedSize += 2;
      if (typeof element.key === 'string') {
        serializedSize += element.key.length;
      }
      element.type = resolveModel(
        request,
        task,
        element as any,
        'type',
        element.type,
        parentReference,
      );
      element.props = resolveModel(
        request,
        task,
        element as any,
        'props',
        element.props,
        parentReference,
      );
      const resolved = renderOutlinedElement(
        request,
        task,
        element,
        model,
        prevKeyPath,
        prevImplicitSlot,
        task.modelDependencies,
      );
      setModelInfo(request.result, element, MODEL_ELEMENT);
      return resolved;
    } catch (error) {
      markErroredModel(
        request,
        task,
        rendered,
        prevKeyPath,
        prevImplicitSlot,
        rendered,
      );
      throw error;
    } finally {
      task.modelDependencies = prevDependencies;
    }
  }
  if (isArray(rendered)) {
    const children: Array<ReactClientValue> = model as any;
    const copy: Array<ReactClientValue> = rendered as any;
    try {
      for (let i = 0; i < children.length; i++) {
        if (i in children) {
          copy[i] = resolveModel(
            request,
            task,
            children,
            '' + i,
            children[i],
            parentReference,
          );
        }
      }
      copy.length = children.length;
      setModelInfo(request.result, copy, MODEL_ARRAY);
      return copy;
    } catch (error) {
      markErroredModel(request, task, model, prevKeyPath, prevImplicitSlot);
      throw error;
    }
  }
  const object: ReactClientObject = model as any;
  const copy: {[key: string]: ReactClientValue} = rendered as any;
  try {
    for (const key in object) {
      if (hasOwnProperty.call(object, key)) {
        const child = resolveModel(
          request,
          task,
          object,
          key,
          object[key],
          parentReference,
        );
        if (key === '__proto__') {
          Object.defineProperty(copy, key, {
            value: child,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        } else {
          copy[key] = child;
        }
      }
    }
    setModelInfo(request.result, copy, MODEL_OBJECT);
    return copy;
  } catch (error) {
    markErroredModel(request, task, model, prevKeyPath, prevImplicitSlot);
    throw error;
  }
}

function retryTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  const originalModel = task.model;
  const originalKeyPath = task.keyPath;
  const originalImplicitSlot = task.implicitSlot;
  const parentSerializedSize = serializedSize;
  const prevCanEmitDebugInfo = canEmitDebugInfo;
  task.currentReference = task.reference;
  try {
    modelRoot = task.model;
    if (__DEV__) {
      canEmitDebugInfo = true;
    }
    const rendered = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      task.model,
    );
    task.renderedModel = rendered;
    const rootModel =
      rendered !== null &&
      typeof rendered === 'object' &&
      (rendered as any).$$typeof === REACT_ELEMENT_TYPE
        ? rendered
        : task.model;
    if (__DEV__) {
      canEmitDebugInfo = false;
    }
    const resolvedModel =
      task.isModelReference || rendered === null || typeof rendered !== 'object'
        ? rendered
        : resolveModel(
            request,
            task,
            {'': rootModel},
            '',
            rootModel,
            undefined,
            rendered,
          );
    if (request.status === CLOSED) {
      return;
    }
    if (enableTaint) {
      validateDeferredBlobs(request);
    }
    const outlinedModels = request.outlinedModels;
    if (
      outlinedModels !== null &&
      waitForOutlinedModel(request, task, resolvedModel, outlinedModels)
    ) {
      return;
    }
    completeTask(request, task, resolvedModel);
  } catch (thrownValue) {
    if (request.status >= ABORTING) {
      if (request.status === ABORTING) {
        abortTask(request, task);
      }
      return;
    }
    const error =
      thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
    const model = task.model;
    if (
      error != null &&
      typeof error === 'object' &&
      typeof (error as any).then === 'function'
    ) {
      markErroredModel(request, task, model, task.keyPath, task.implicitSlot);
      task.status = PENDING;
      task.thenableState = getThenableStateAfterSuspending();
      const ping = task.ping;
      (error as any).then(ping, ping);
      return;
    }
    markErroredModel(
      request,
      task,
      originalModel,
      originalKeyPath,
      originalImplicitSlot,
    );
    erroredTask(request, task, error);
  } finally {
    try {
      if (enableTaint) {
        // A sibling may throw after registering a Blob validation task.
        validateDeferredBlobs(request);
      }
    } finally {
      if (__DEV__) {
        canEmitDebugInfo = prevCanEmitDebugInfo;
      }
      serializedSize = parentSerializedSize;
    }
  }
}

function getRenderedModels(
  request: Request,
  value: ReactClientValue | ReactElement,
  keyPath: ReactKey,
  implicitSlot: boolean,
): WeakMap<Reference, ModelEntry> {
  if (
    keyPath !== null &&
    value !== null &&
    typeof value === 'object' &&
    ((value as any).$$typeof === REACT_ELEMENT_TYPE ||
      typeof (value as any).then === 'function' ||
      isArray(value) ||
      (!(value instanceof Map) &&
        !(value instanceof Set) &&
        (getIteratorFn(value) !== null ||
          typeof (value as any)[ASYNC_ITERATOR] === 'function')))
  ) {
    let keyedModels = request.renderedKeyedModels;
    if (keyedModels === null) {
      request.renderedKeyedModels = keyedModels = new Map();
    }
    let models = keyedModels.get(keyPath);
    if (models === undefined) {
      models = {explicit: new WeakMap(), implicit: new WeakMap()};
      keyedModels.set(keyPath, models);
    }
    return implicitSlot ? models.implicit : models.explicit;
  }
  if (
    implicitSlot &&
    value !== null &&
    typeof value === 'object' &&
    (((value as any).$$typeof === REACT_ELEMENT_TYPE &&
      (value as any).key !== null) ||
      typeof (value as any).then === 'function')
  ) {
    return request.renderedImplicitModels;
  }
  return request.modelEntries;
}

function renderFragment(
  request: Request,
  task: Task,
  children: Array<ReactClientValue>,
  source: Iterable<ReactClientValue> = children,
): ReactClientValue {
  if (__DEV__) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (
        child !== null &&
        typeof child === 'object' &&
        child.$$typeof === REACT_ELEMENT_TYPE
      ) {
        const element: ReactElement = child as any;
        if (element.key === null && !element._store.validated) {
          request.unkeyedElements.add(element);
        }
      }
    }
  }
  const keyPath = task.keyPath;
  let resolvedModel: ReactClientValue;
  if (keyPath !== null) {
    const props = {children};
    let fragment: ReactElement;
    if (__DEV__) {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        props,
        _owner: null,
        _store: {validated: 0},
      } as any;
      Object.defineProperties(fragment, {
        ref: {value: null},
        _debugInfo: {value: null, writable: true},
        _debugStack: {value: null, writable: true},
        _debugTask: {value: null, writable: true},
      });
    } else {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        ref: null,
        props,
      } as any;
    }
    if (task.implicitSlot) {
      const wrappedChildren: Array<ReactClientValue> = [fragment as any];
      const copy: Array<ReactClientValue> = [];
      setRenderedModel(request.modelEntries, wrappedChildren, copy);
      task.model = wrappedChildren;
      resolvedModel = copy;
      task.fieldParentReference = null;
    } else {
      resolvedModel = fragment as any;
      task.fieldParentReference = null;
    }
    setRenderedModel(
      getRenderedModels(request, source, keyPath, task.implicitSlot),
      source,
      resolvedModel,
    );
  } else {
    const copy: Array<ReactClientValue> = new Array(children.length);
    setRenderedModel(request.modelEntries, children, copy);
    if (source !== children) {
      setRenderedModel(request.modelEntries, source, copy);
    }
    task.model = children;
    resolvedModel = copy;
    task.fieldParentReference = source === children ? undefined : null;
  }
  task.isModelReference = false;
  return resolvedModel;
}

function performWork(request: Request): void {
  if (request.status === CLOSED) {
    return;
  }
  if (__DEV__) {
    markAsyncSequenceRootTask();
  }
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevCache = setCurrentCache(request);
  prepareToUseHooksForRequest(request);
  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      retryTask(request, pingedTasks[i]);
    }
  } catch (error) {
    fatalError(request, error);
  } finally {
    modelRoot = null;
    if (__DEV__) {
      const elements = request.completedElements;
      for (let i = 0; i < elements.length; i++) {
        Object.freeze(elements[i].props);
        Object.freeze(elements[i]);
      }
      elements.length = 0;
    }
    if (request.status !== CLOSED && request.abortableTasks.size === 0) {
      request.status = CLOSED;
      closeResult(request);
      if (enableTaint) {
        cleanupTaintQueue(request);
      }
      request.cacheController.abort(
        new Error(
          'This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.',
        ),
      );
      request.onAllReady();
    }
    ReactSharedInternals.H = prevDispatcher;
    resetHooksForRequest();
    setCurrentCache(prevCache);
  }
}

export function startWork(request: Request): void {
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    scheduleMicrotask(() => {
      cacheStorage.run(request, () =>
        requestStorage.run(undefined, performWork, request),
      );
    });
  } else {
    scheduleMicrotask(() => performWork(request));
  }
  scheduleWork(() => {
    if (request.status === OPENING) {
      request.status = OPEN;
    }
  });
}

function createModelEntry(
  model: ReactClientValue,
  reference: void | ModelReference,
): ModelEntry {
  return reference === undefined
    ? {model, root: undefined, parent: null, key: ''}
    : {
        model,
        root: reference.root,
        parent: reference.parent,
        key: reference.key,
      };
}

function getEntryReference(entry: void | ModelEntry): void | ModelReference {
  return entry === undefined || entry.root === undefined ? undefined : entry;
}

function getPublishedModelReference(
  request: Request,
  reference: ModelReference,
): ModelReference {
  // Escaping paths must not retain memo models after their defining region fails.
  if (reference.parent === null && !hasOwnProperty.call(reference, 'model')) {
    return reference;
  }
  let publishedReferences = request.publishedModelReferences;
  if (publishedReferences === null) {
    request.publishedModelReferences = publishedReferences = new WeakMap();
  }
  const cached = publishedReferences.get(reference);
  if (cached !== undefined) {
    return cached;
  }
  const path = [];
  let location: ModelReference = reference;
  let published: ModelReference = reference;
  while (true) {
    const parent = location.parent;
    if (parent === null) {
      if (hasOwnProperty.call(location, 'model')) {
        published = {root: location.root, parent: null, key: location.key};
        publishedReferences.set(location, published);
      } else {
        published = location;
      }
      break;
    }
    path.push(location);
    location = parent;
    const cachedParent = publishedReferences.get(location);
    if (cachedParent !== undefined) {
      published = cachedParent;
      break;
    }
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const source = path[i];
    if (!hasOwnProperty.call(source, 'model') && source.parent === published) {
      published = source;
    } else {
      published = {
        root: source.root,
        parent: published,
        key: source.key,
      };
      publishedReferences.set(source, published);
    }
  }
  return published;
}

function createResultValueReference(
  request: Request,
  reference: ModelReference,
): Object {
  return createValueReference(
    request.result,
    getPublishedModelReference(request, reference),
  );
}

function getRenderedModel(
  models: WeakMap<Reference, ModelEntry>,
  value: Reference,
): ReactClientValue {
  const entry = models.get(value);
  return entry === undefined ? undefined : entry.model;
}

function setRenderedModel(
  models: WeakMap<Reference, ModelEntry>,
  value: Reference,
  model: ReactClientValue,
): void {
  const entry = models.get(value);
  if (entry === undefined) {
    models.set(value, createModelEntry(model, undefined));
  } else {
    entry.model = model;
  }
}

function getModelReference(
  request: Request,
  value: Reference,
): void | ModelReference {
  const entry = request.modelEntries.get(value);
  return getEntryReference(entry);
}

function setModelReference(
  request: Request,
  value: Reference,
  reference: ModelReference,
): void {
  const entry = request.modelEntries.get(value);
  request.modelEntries.set(
    value,
    createModelEntry(entry === undefined ? undefined : entry.model, reference),
  );
}

function setModelReferenceIfAbsent(
  request: Request,
  value: Reference,
  reference: ModelReference,
): void {
  const entry = request.modelEntries.get(value);
  if (entry === undefined) {
    request.modelEntries.set(value, createModelEntry(undefined, reference));
  } else if (entry.root === undefined) {
    request.modelEntries.set(value, createModelEntry(entry.model, reference));
  }
}

function resolveBoxedModel(
  resolve: (model: ReactClientValue) => void,
  model: ReactClientValue,
): void {
  resolve({value: model});
}

function markErroredModel(
  request: Request,
  task: Task,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  rendered: ReactClientValue = undefined,
): void {
  if (model === null || typeof model !== 'object') {
    return;
  }
  const models = getRenderedModels(request, model, keyPath, implicitSlot);
  const copy =
    rendered === undefined ? getRenderedModel(models, model) : rendered;
  if (
    copy !== null &&
    typeof copy === 'object' &&
    copy !== task.promise &&
    (copy as any).$$typeof !== REACT_LAZY_TYPE
  ) {
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(copy, task);
    request.hasByValueModels = true;
  }
  setRenderedModel(
    models,
    model,
    (model as any).$$typeof === REACT_ELEMENT_TYPE
      ? createLazyWrapperAroundWakeable(task.promise as any)
      : task.promise,
  );
}

function renderModelReference(
  task: Task,
  model: ReactClientValue,
): ReactClientValue {
  task.isModelReference = true;
  return model;
}

function addModelDependency(
  task: Task,
  promise: ResultModel<ReactClientValue>,
): void {
  let dependencies = task.modelDependencies;
  if (dependencies === null) {
    task.modelDependencies = dependencies = new Set();
  }
  dependencies.add(promise);
}

function getOutlinedModelDependencies(
  request: Request,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): Set<ResultModel<ReactClientValue>> {
  const resolvingModels =
    request.resolvingModels === null
      ? new Set(request.resolvingModelStack)
      : request.resolvingModels;
  request.resolvingModels = resolvingModels;
  type Record = {
    model: Reference,
    index: number,
    low: number,
    active: boolean,
    stable: boolean,
    dependencies: Set<ResultModel<ReactClientValue>>,
    ready: null | ResultModel<ReactClientValue>,
  };
  const cache: WeakMap<Reference, null | ResultModel<ReactClientValue>> =
    request.outlinedModelDependencies === null
      ? new WeakMap()
      : request.outlinedModelDependencies;
  request.outlinedModelDependencies = cache;
  const records: Map<Reference, Record> = new Map();
  const stack: Array<Record> = [];
  let index = 0;
  function visit(value: any, parent: null | Record): void {
    if (value === null || typeof value !== 'object') {
      return;
    }
    const outlinedTask = outlinedModels.get(value);
    if (outlinedTask !== undefined) {
      if (parent !== null && outlinedTask.status !== COMPLETED) {
        parent.dependencies.add(outlinedTask.promise);
      }
      return;
    }
    const cached = cache.get(value);
    if (cached !== undefined) {
      if (parent !== null && cached !== null && cached.status !== 'fulfilled') {
        parent.dependencies.add(cached);
      }
      return;
    }
    const existing = records.get(value);
    if (existing !== undefined) {
      if (parent !== null) {
        if (existing.active) {
          parent.low = Math.min(parent.low, existing.index);
        } else {
          if (
            existing.ready !== null &&
            existing.ready.status !== 'fulfilled'
          ) {
            parent.dependencies.add(existing.ready);
          }
          parent.stable = parent.stable && existing.stable;
        }
      }
      return;
    }
    const record: Record = {
      model: value,
      index,
      low: index++,
      active: true,
      stable: !resolvingModels.has(value),
      dependencies: new Set(),
      ready: null,
    };
    records.set(value, record);
    stack.push(record);
    visitFields(value, record);
    if (record.low === record.index) {
      const members: Array<Record> = [];
      let member;
      do {
        member = stack[stack.length - 1];
        stack.length--;
        members.push(member);
        member.dependencies.forEach(dependency =>
          record.dependencies.add(dependency),
        );
        record.stable = record.stable && member.stable;
      } while (member !== record);
      const dependencies = record.dependencies;
      dependencies.forEach(dependency => {
        if (dependency.status === 'fulfilled') {
          dependencies.delete(dependency);
        }
      });
      if (dependencies.size === 1) {
        dependencies.forEach(dependency => {
          record.ready = dependency;
        });
      } else if (dependencies.size > 1) {
        const ready = createResultModel<ReactClientValue>();
        record.ready = ready;
        let remaining = dependencies.size;
        dependencies.forEach(dependency => {
          dependency.then(
            () => {
              if (--remaining === 0) {
                fulfillResultModel(ready, undefined);
              }
            },
            error => {
              copyErrorReference(request.result, ready, dependency);
              rejectResultModel(ready, error);
            },
          );
        });
      }
      for (let i = 0; i < members.length; i++) {
        member = members[i];
        member.active = false;
        member.stable = record.stable;
        member.ready = record.ready;
        member.dependencies.clear();
        if (record.stable) {
          cache.set(member.model, record.ready);
        }
      }
    }
    if (parent !== null) {
      if (record.active) {
        parent.low = Math.min(parent.low, record.low);
      } else {
        if (record.ready !== null && record.ready.status !== 'fulfilled') {
          parent.dependencies.add(record.ready);
        }
        parent.stable = parent.stable && record.stable;
      }
    }
  }
  function visitFields(value: any, record: Record): void {
    const kind = getModelInfo(request.result, value) & MODEL_KIND_MASK;
    if (
      kind === 0 &&
      (isClientReference(value) ||
        isServerReference(value) ||
        getTemporaryReference(request.result, value) !== undefined ||
        getValueReference(request.result, value) !== undefined)
    ) {
      return;
    }
    if (
      kind === MODEL_ELEMENT ||
      (kind === 0 && value.$$typeof === REACT_ELEMENT_TYPE)
    ) {
      visit(value.type, record);
      visit(value.props, record);
    } else if (
      kind === 0 &&
      (value.$$typeof === REACT_LAZY_TYPE ||
        typeof value.then === 'function' ||
        value instanceof Date ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value))
    ) {
      return;
    } else if (kind === MODEL_ARRAY || (kind === 0 && isArray(value))) {
      for (let i = 0; i < value.length; i++) {
        visit(value[i], record);
      }
    } else if (kind === 0 && value instanceof Map) {
      value.forEach((child: ReactClientValue, key: ReactClientValue) => {
        visit(key, record);
        visit(child, record);
      });
    } else if (kind === 0 && value instanceof Set) {
      value.forEach((child: ReactClientValue) => visit(child, record));
    } else {
      if (kind === 0 && getPrototypeOf(value) !== ObjectPrototype) {
        if (typeof FormData === 'function' && value instanceof FormData) {
          const iterator = value.entries();
          for (
            let entry = iterator.next();
            !entry.done;
            entry = iterator.next()
          ) {
            visit(entry.value[1], record);
          }
          return;
        }
        if (typeof Blob === 'function' && value instanceof Blob) {
          return;
        }
        const entries = getIteratorEntries(request.result, value);
        if (entries !== undefined) {
          visit(entries, record);
          return;
        }
        if (value instanceof Error) {
          if (__DEV__ && 'cause' in value) {
            visit(value.cause, record);
          }
          if (
            __DEV__ &&
            typeof AggregateError !== 'undefined' &&
            value instanceof AggregateError
          ) {
            visit(value.errors, record);
          }
          return;
        }
      }
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        visit(value[keys[i]], record);
      }
    }
  }
  visit(model, null);
  const dependencies: Set<ResultModel<ReactClientValue>> = new Set();
  if (model !== null && typeof model === 'object') {
    const ownTask = outlinedModels.get(model);
    if (ownTask !== undefined) {
      if (ownTask.status !== COMPLETED) {
        dependencies.add(ownTask.promise);
      }
    } else {
      const record = records.get(model);
      const ready = record === undefined ? cache.get(model) : record.ready;
      if (
        ready !== undefined &&
        ready !== null &&
        ready.status !== 'fulfilled'
      ) {
        dependencies.add(ready);
      }
    }
  }
  return dependencies;
}

function resolveOutlinedModel(
  request: Request,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): ReactClientValue {
  const visited: WeakMap<Reference, ReactClientValue> =
    request.resolvedOutlinedModels === null
      ? new WeakMap()
      : request.resolvedOutlinedModels;
  request.resolvedOutlinedModels = visited;
  function resolve(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (visited.has(value)) {
      return visited.get(value);
    }
    visited.set(value, value);
    const dependency = outlinedModels.get(value);
    if (dependency !== undefined && value !== dependency.model) {
      visited.set(value, dependency.model);
      const resolved = resolve(dependency.model);
      visited.set(value, resolved);
      return resolved;
    }
    const kind = getModelInfo(request.result, value) & MODEL_KIND_MASK;
    if (
      kind === 0 &&
      (isClientReference(value) ||
        isServerReference(value) ||
        getTemporaryReference(request.result, value) !== undefined ||
        getValueReference(request.result, value) !== undefined)
    ) {
      return value;
    }
    if (
      kind === MODEL_ELEMENT ||
      (kind === 0 && value.$$typeof === REACT_ELEMENT_TYPE)
    ) {
      const type = resolve(value.type);
      if (type !== value.type) {
        value.type = type;
      }
      const props = resolve(value.props);
      if (props !== value.props) {
        value.props = props;
      }
    } else if (
      kind === 0 &&
      (value.$$typeof === REACT_LAZY_TYPE ||
        typeof value.then === 'function' ||
        value instanceof Date ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value))
    ) {
      return value;
    } else if (kind === MODEL_ARRAY || (kind === 0 && isArray(value))) {
      for (let i = 0; i < value.length; i++) {
        if (hasOwnProperty.call(value, i)) {
          const child = resolve(value[i]);
          if (!Object.is(child, value[i])) {
            value[i] = child;
          }
        }
      }
    } else if (kind === 0 && value instanceof Map) {
      const entries: Array<[any, any]> = Array.from(value);
      value.clear();
      for (let i = 0; i < entries.length; i++) {
        value.set(resolve(entries[i][0]), resolve(entries[i][1]));
      }
    } else if (kind === 0 && value instanceof Set) {
      const entries: Array<any> = Array.from(value);
      value.clear();
      for (let i = 0; i < entries.length; i++) {
        value.add(resolve(entries[i]));
      }
    } else {
      if (
        kind === 0 &&
        getPrototypeOf(value) !== ObjectPrototype &&
        ((typeof FormData === 'function' && value instanceof FormData) ||
          (typeof Blob === 'function' && value instanceof Blob))
      ) {
        return value;
      }
      const entries =
        kind === 0 ? getIteratorEntries(request.result, value) : undefined;
      if (kind === 0 && value instanceof Error) {
        if (__DEV__ && 'cause' in value) {
          const cause = resolve(value.cause);
          if (!Object.is(cause, value.cause)) {
            value.cause = cause;
          }
        }
        if (
          __DEV__ &&
          typeof AggregateError !== 'undefined' &&
          value instanceof AggregateError
        ) {
          const errors = resolve(value.errors);
          if (errors !== value.errors) {
            value.errors = errors;
          }
        }
        return value;
      }
      if (entries !== undefined) {
        resolve(entries);
        return value;
      }
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const child = resolve(value[key]);
        if (!Object.is(child, value[key])) {
          value[key] = child;
        }
      }
    }
    return value;
  }
  return resolve(model);
}

function renderOutlinedElement(
  request: Request,
  task: Task,
  element: ReactElement,
  model: ReactClientValue,
  keyPath: ReactKey,
  implicitSlot: boolean,
  dependencies: null | Set<ResultModel<ReactClientValue>>,
): ReactClientValue {
  const outlinedModels = request.outlinedModels;
  const elementModel: ReactClientValue = element as any;
  if (outlinedModels !== null && dependencies !== null) {
    const newTask = createTask(
      request,
      elementModel,
      null,
      false,
      task.formatContext,
    );
    if (__DEV__) {
      newTask.environmentName = task.environmentName;
      newTask.debugOwner = task.debugOwner;
      newTask.debugStack = task.debugStack;
      newTask.debugTask = task.debugTask;
    }
    blockTask(request, newTask, elementModel, dependencies);
    const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
    outlinedModels.set(element, newTask);
    outlinedModels.set(newTask.promise, newTask);
    if (model !== null && typeof model === 'object') {
      setRenderedModel(
        getRenderedModels(request, model, keyPath, implicitSlot),
        model,
        lazy,
      );
    }
    return renderModelReference(task, lazy);
  }
  if (__DEV__) {
    request.completedElements.push(element);
  }
  return elementModel;
}

function waitForOutlinedModel(
  request: Request,
  task: Task,
  model: ReactClientValue,
  outlinedModels: WeakMap<Reference, Task>,
): boolean {
  const dependencies = getOutlinedModelDependencies(
    request,
    model,
    outlinedModels,
  );
  if (dependencies.size === 0) {
    return false;
  }
  blockTask(request, task, model, dependencies);
  return true;
}

function blockTask(
  request: Request,
  task: Task,
  model: ReactClientValue,
  dependencies: Set<ResultModel<ReactClientValue>>,
): void {
  task.model = model;
  task.status = BLOCKED;
  if (
    __DEV__ &&
    model !== null &&
    typeof model === 'object' &&
    (model as any).$$typeof === REACT_ELEMENT_TYPE
  ) {
    setDebugModel(task.promise, model);
  }
  if (request.status === ABORTING) {
    abortTask(request, task);
    return;
  }
  let remaining = dependencies.size;
  dependencies.forEach(dependency => {
    const resolve = () => {
      if (task.status !== BLOCKED) {
        return;
      }
      if (--remaining === 0) {
        const outlinedModels = request.outlinedModels;
        completeTask(
          request,
          task,
          outlinedModels === null
            ? model
            : resolveOutlinedModel(request, model, outlinedModels),
        );
        scheduleMicrotask(() => performWork(request));
      }
    };
    const reject = (error: mixed) => {
      if (task.status !== BLOCKED) {
        return;
      }
      copyErrorReference(request.result, task.promise, dependency);
      task.status = ERRORED;
      task.reject(error);
      request.abortableTasks.delete(task);
      scheduleMicrotask(() => performWork(request));
    };
    if (dependency.status === 'fulfilled') {
      resolve();
    } else if (dependency.status === 'rejected') {
      reject(dependency.reason);
    } else {
      dependency.then(resolve, reject);
    }
  });
}

function completeTask(
  request: Request,
  task: Task,
  resolvedModel: ReactClientValue,
): void {
  task.model = resolvedModel;
  task.status = COMPLETED;
  if (
    resolvedModel !== null &&
    typeof resolvedModel === 'object' &&
    (resolvedModel as any).$$typeof === REACT_LAZY_TYPE &&
    getModelInfo(request.result, resolvedModel) === 0
  ) {
    const lazy: LazyComponent<
      ReactClientValue,
      ResultModel<ReactClientValue>,
    > = resolvedModel as any;
    const outlinedModels = request.outlinedModels;
    if (outlinedModels === null || !outlinedModels.has(lazy._payload)) {
      const source = lazy._payload;
      forwardModelReference(request.result, task.promise, source);
      let unsubscribeDebugInfo = noop;
      if (__DEV__) {
        const unsubscribeSource = subscribeToDebugInfo(source, info => {
          forwardDebugInfo(request, task, [info]);
        });
        const unsubscribeResult = subscribeToResult(
          request.result,
          unsubscribeSource,
        );
        unsubscribeDebugInfo = () => {
          unsubscribeSource();
          unsubscribeResult();
        };
      }
      source.then(
        __DEV__
          ? value => {
              unsubscribeDebugInfo();
              task.resolve(value);
            }
          : task.resolve,
        error => {
          if (__DEV__) {
            unsubscribeDebugInfo();
          }
          copyErrorReference(request.result, task.promise, source);
          task.reject(error);
        },
      );
      request.abortableTasks.delete(task);
      return;
    }
  }
  if (__DEV__) {
    const currentEnv = request.environmentName();
    if (currentEnv !== task.environmentName) {
      pushDebugInfo(task.promise, {env: currentEnv});
    }
    if (
      enableProfilerTimer &&
      (enableComponentPerformanceTrack || enableAsyncDebugInfo) &&
      task.timed
    ) {
      pushDebugInfo(task.promise, {time: performance.now()});
    }
  }
  task.resolve(resolvedModel);
  request.abortableTasks.delete(task);
}

function isAwaitInUserspace(request: Request, stack: ReactStackTrace): boolean {
  return isAwaitInUserspaceWithFilter(request.filterStackFrame, stack);
}

function forwardDebugInfoFromAbortedTask(request: Request, task: Task): void {
  // If a task is aborted, we can still include as much debug info as we can from the
  // value that we have so far.
  const model: any = task.model;
  if (typeof model !== 'object' || model === null) {
    return;
  }
  let debugInfo: ?ReactDebugInfo;
  if (__DEV__) {
    // If this came from Flight, forward any debug info into this new row.
    debugInfo = model._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
  }
  if (enableProfilerTimer && enableAsyncDebugInfo) {
    let thenable: null | Thenable<any> = null;
    if (typeof model.then === 'function') {
      thenable = model as any;
    } else if (model.$$typeof === REACT_LAZY_TYPE) {
      const payload = model._payload;
      if (typeof payload.then === 'function') {
        thenable = payload;
      }
    }
    if (thenable !== null) {
      const sequence = getAsyncSequenceFromPromise(thenable);
      if (sequence !== null) {
        let node = sequence;
        while (node.tag === UNRESOLVED_AWAIT_NODE && node.awaited !== null) {
          // See if any of the dependencies are resolved yet.
          node = node.awaited;
        }
        if (node.tag === UNRESOLVED_PROMISE_NODE) {
          // We don't know what Promise will eventually end up resolving this Promise and if it
          // was I/O at all. However, we assume that it was some kind of I/O since it didn't
          // complete in time before aborting.
          // The best we can do is try to emit the stack of where this Promise was created.
          serializeIONode(request, node, null);
          const env = (0, request.environmentName)();
          const asyncInfo: ReactAsyncInfo = {
            awaited: node as any as ReactIOInfo, // This is deduped by this reference.
            env: env,
          };
          // We don't have a start time for this await but in case there was no start time emitted
          // we need to include something. TODO: We should maybe ideally track the time when we
          // called .then() but without updating the task.time field since that's used for the cutoff.
          advanceTaskTime(request, task, task.time);
          recordAsyncDebugInfo(request, task, asyncInfo);
        } else {
          // We have a resolved Promise. Its debug info can include both awaited data and rejected
          // promises after the abort.
          emitAsyncSequence(request, task, sequence, debugInfo, null, null);
        }
      }
    }
  }
}

function recordAsyncDebugInfo(
  request: Request,
  task: Task,
  info: ReactAsyncInfo,
): void {
  const awaited = request.debugIONodes.get(info.awaited as any);
  if (awaited === undefined) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Missing Result I/O metadata. This is a bug in React.');
  }
  const entry: ReactAsyncInfo = {awaited};
  if (info.env !== undefined) {
    // $FlowFixMe[cannot-write]
    entry.env = info.env;
  }
  if (info.owner !== undefined) {
    // $FlowFixMe[cannot-write]
    entry.owner = info.owner;
  }
  if (info.stack !== undefined) {
    // $FlowFixMe[cannot-write]
    entry.stack = info.stack;
  }
  pushDebugInfo(task.promise, entry);
}

function captureDebugThenable(
  request: Request,
  thenable: Thenable<any>,
): Thenable<any> {
  const existing = request.debugThenables.get(thenable);
  if (existing !== undefined) {
    return existing;
  }
  const value = createResultModel<any>();
  value._debugSource = thenable;
  request.debugThenables.set(thenable, value);
  if (thenable.status === 'fulfilled') {
    fulfillResultModel(value, thenable.value);
  } else if (thenable.status === 'rejected') {
    rejectResultModel(value, thenable.reason);
  } else {
    let cancelled = false;
    thenable.then(
      resolved => {
        if (cancelled) {
          return;
        }
        cancelled = true;
        if (
          (isArray(resolved) && resolved.length > 200) ||
          (ArrayBuffer.isView(resolved) && resolved.byteLength > 1000)
        ) {
          markHalted(request.result, value);
          rejectResultModel(value, null);
        } else {
          fulfillResultModel(value, resolved);
        }
      },
      reason => {
        if (!cancelled) {
          cancelled = true;
          rejectResultModel(value, reason);
        }
      },
    );
    Promise.resolve().then(() => {
      if (!cancelled) {
        cancelled = true;
        markHalted(request.result, value);
        rejectResultModel(value, null);
      }
    });
  }
  return value;
}

function isPromiseCreationInternal(url: string, functionName: string): boolean {
  // Various internals of the JS VM can create Promises but the call frame of the
  // internals are not very interesting for our purposes so we need to skip those.
  if (url === 'node:internal/async_hooks') {
    // Ignore the stack frames from the async hooks themselves.
    return true;
  }
  if (url !== '') {
    return false;
  }
  // V8 used to name the frames of static methods on the Promise constructor
  // "Function.x" but newer versions name them "Promise.x". We match both.
  switch (functionName) {
    case 'new Promise':
    case 'Function.withResolvers':
    case 'Promise.withResolvers':
    case 'Function.reject':
    case 'Promise.reject':
    case 'Function.resolve':
    case 'Promise.resolve':
    case 'Function.all':
    case 'Promise.all':
    case 'Function.allSettled':
    case 'Promise.allSettled':
    case 'Function.race':
    case 'Promise.race':
    case 'Function.try':
    case 'Promise.try':
      return true;
    default:
      return false;
  }
}

function stripLeadingPromiseCreationFrames(
  stack: ReactStackTrace,
): ReactStackTrace {
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = callsite[1];
    if (!isPromiseCreationInternal(url, functionName)) {
      if (i > 0) {
        return stack.slice(i);
      } else {
        return stack;
      }
    }
  }
  return [];
}

function findCalledFunctionNameFromStackTrace(
  request: Request,
  stack: ReactStackTrace,
): string {
  // Gets the name of the first function called from first party code.
  let bestMatch = '';
  const filterStackFrame = request.filterStackFrame;
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    if (
      filterStackFrame(url, functionName, lineNumber, columnNumber) &&
      // Don't consider anonymous code first party even if the filter wants to include them in the stack.
      url !== ''
    ) {
      if (bestMatch === '') {
        // If we had no good stack frames for internal calls, just use the last
        // first party function name.
        return functionName;
      }
      return bestMatch;
    } else {
      bestMatch = functionName;
    }
  }
  return '';
}

function hasUnfilteredFrame(request: Request, stack: ReactStackTrace): boolean {
  const filterStackFrame = request.filterStackFrame;
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    // Ignore async stack frames because they're not "real". We'd expect to have at least
    // one non-async frame if we're actually executing inside a first party function.
    // Otherwise we might just be in the resume of a third party function that resumed
    // inside a first party stack.
    const isAsync = callsite[6];
    if (
      !isAsync &&
      filterStackFrame(url, functionName, lineNumber, columnNumber) &&
      // Ignore anonymous stack frames like internals. They are also not in first party
      // code even though it might be useful to include them in the final stack.
      url !== ''
    ) {
      return true;
    }
  }
  return false;
}

function visitAsyncNode(
  request: Request,
  task: Task,
  node: AsyncSequence,
  visited: Map<
    AsyncSequence | ReactDebugInfo,
    void | null | PromiseNode | IONode,
  >,
  cutOff: number,
): void | null | PromiseNode | IONode {
  // Collect the previous chain iteratively instead of recursively to avoid
  // stack overflow on deep chains. We process from deepest to shallowest so
  // each node has its previousIONode available.
  const chain: Array<AsyncSequence> = [];
  let current: AsyncSequence | null = node;

  while (current !== null) {
    if (visited.has(current)) {
      break;
    }
    chain.push(current);
    current = current.previous;
  }

  let previousIONode: void | null | PromiseNode | IONode =
    current !== null ? visited.get(current) : null;

  // Process from deepest to shallowest (reverse order).
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i];
    // Set it as visited early in case we see the node again before returning.
    visited.set(n, null);

    const result = visitAsyncNodeImpl(
      request,
      task,
      n,
      visited,
      cutOff,
      previousIONode,
    );

    if (result !== null) {
      // If we ended up with a value, let's use that value for future visits.
      visited.set(n, result);
    }

    if (result === undefined) {
      // Undefined is used as a signal that we found a suitable aborted node
      // and we don't have to find further aborted nodes.
      return undefined;
    }

    previousIONode = result;
  }

  return previousIONode;
}

function visitAsyncNodeImpl(
  request: Request,
  task: Task,
  node: AsyncSequence,
  visited: Map<
    AsyncSequence | ReactDebugInfo,
    void | null | PromiseNode | IONode,
  >,
  cutOff: number,
  previousIONode: void | null | PromiseNode | IONode,
): void | null | PromiseNode | IONode {
  if (node.end >= 0 && node.end <= request.timeOrigin) {
    // This was already resolved when we started this render. It must have been either something
    // that's part of a start up sequence or externally cached data. We exclude that information.
    // The technique for debugging the effects of uncached data on the render is to simply uncache it.
    return null;
  }

  // `found` represents the return value of the following switch statement.
  // We can't use multiple `return` statements in the switch statement
  // since that prevents Closure compiler from inlining `visitAsyncImpl`
  // thus doubling the call stack size.
  let found: void | null | PromiseNode | IONode;
  switch (node.tag) {
    case IO_NODE: {
      found = node;
      break;
    }
    case UNRESOLVED_PROMISE_NODE: {
      found = previousIONode;
      break;
    }
    case PROMISE_NODE: {
      const awaited = node.awaited;
      let match: void | null | PromiseNode | IONode = previousIONode;
      const promise = node.promise.deref();
      if (awaited !== null) {
        const ioNode = visitAsyncNode(request, task, awaited, visited, cutOff);
        if (ioNode === undefined) {
          // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
          // further aborted nodes.
          found = undefined;
          break;
        } else if (ioNode !== null) {
          // This Promise was blocked on I/O. That's a signal that this Promise is interesting to log.
          // We don't log it yet though. We return it to be logged by the point where it's awaited.
          // The ioNode might be another PromiseNode in the case where none of the AwaitNode had
          // unfiltered stacks.
          if (ioNode.tag === PROMISE_NODE) {
            // If the ioNode was a Promise, then that means we found one in user space since otherwise
            // we would've returned an IO node. We assume this has the best stack.
            // Note: This might also be a Promise with a displayName but potentially a worse stack.
            // We could potentially favor the outer Promise if it has a stack but not the inner.
            match = ioNode;
          } else if (
            (node.stack !== null && hasUnfilteredFrame(request, node.stack)) ||
            (promise !== undefined &&
              // $FlowFixMe[prop-missing]
              typeof promise.displayName === 'string' &&
              (ioNode.stack === null ||
                !hasUnfilteredFrame(request, ioNode.stack)))
          ) {
            // If this Promise has a stack trace then we favor that over the I/O node since we're
            // mainly dealing with Promises as the abstraction.
            // If it has no stack but at least has a displayName and the io doesn't have a better
            // stack anyway, then also use this Promise instead since at least it has a name.
            match = node;
          } else {
            // If this Promise was created inside only third party code, then try to use
            // the inner I/O node instead. This could happen if third party calls into first
            // party to perform some I/O.
            match = ioNode;
          }
        } else if (request.status === ABORTING) {
          if (node.start < request.abortTime && node.end > request.abortTime) {
            // We aborted this render. If this Promise spanned the abort time it was probably the
            // Promise that was aborted. This won't necessarily have I/O associated with it but
            // it's a point of interest.
            if (
              (node.stack !== null &&
                hasUnfilteredFrame(request, node.stack)) ||
              (promise !== undefined &&
                // $FlowFixMe[prop-missing]
                typeof promise.displayName === 'string')
            ) {
              match = node;
            }
          }
        }
      }
      // We need to forward after we visit awaited nodes because what ever I/O we requested that's
      // the thing that generated this node and its virtual children.
      if (promise !== undefined) {
        const debugInfo = promise._debugInfo;
        if (debugInfo != null && !visited.has(debugInfo)) {
          visited.set(debugInfo, null);
          forwardDebugInfo(request, task, debugInfo);
        }
      }
      found = match;
      break;
    }
    case UNRESOLVED_AWAIT_NODE: {
      found = previousIONode;
      break;
    }
    case AWAIT_NODE: {
      const awaited = node.awaited;
      let match: void | null | PromiseNode | IONode = previousIONode;
      if (awaited !== null) {
        const ioNode = visitAsyncNode(request, task, awaited, visited, cutOff);
        if (ioNode === undefined) {
          // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
          // further aborted nodes.
          found = undefined;
          break;
        } else if (ioNode !== null) {
          const startTime: number = node.start;
          const endTime: number = node.end;
          if (startTime < cutOff) {
            // We started awaiting this node before we started rendering this sequence.
            // This means that this particular await was never part of the current sequence.
            // If we have another await higher up in the chain it might have a more actionable stack
            // from the perspective of this component. If we end up here from the "previous" path,
            // then this gets I/O ignored, which is what we want because it means it was likely
            // just part of a previous component's rendering.
            match = ioNode;
            if (
              node.stack !== null &&
              isAwaitInUserspace(request, node.stack)
            ) {
              // This await happened earlier but it was done in user space. This is the first time
              // that user space saw the value of the I/O. We know we'll emit the I/O eventually
              // but if we do it now we can override the promise value of the I/O entry to the
              // one observed by this await which will be a better value than the internals of
              // the I/O entry. If it's still alive that is.
              const promise =
                awaited.promise === null ? undefined : awaited.promise.deref();
              if (promise !== undefined) {
                serializeIONode(request, ioNode, awaited.promise);
              }
            }
          } else {
            if (
              node.stack === null ||
              !isAwaitInUserspace(request, node.stack)
            ) {
              // If this await was fully filtered out, then it was inside third party code
              // such as in an external library. We return the I/O node and try another await.
              match = ioNode;
            } else if (
              request.status === ABORTING &&
              startTime > request.abortTime
            ) {
              // This was awaited after aborting so we skip it.
            } else {
              // We found a user space await.

              // Outline the IO node.
              // The ioNode is where the I/O was initiated, but after that it could have been
              // processed through various awaits in the internals of the third party code.
              // Therefore we don't use the inner most Promise as the conceptual value but the
              // Promise that was ultimately awaited by the user space await.
              serializeIONode(request, ioNode, awaited.promise);

              // If we ever visit this I/O node again, skip it because we already emitted this
              // exact entry and we don't need two awaits on the same thing.
              visited.set(ioNode, null);

              // We log the environment at the time when the last promise pigned ping which may
              // be later than what the environment was when we actually started awaiting.
              const env = (0, request.environmentName)();
              advanceTaskTime(request, task, startTime);
              // Then emit a reference to us awaiting it in the current task.
              recordAsyncDebugInfo(request, task, {
                awaited: ioNode as any as ReactIOInfo, // This is deduped by this reference.
                env: env,
                owner: node.owner,
                stack:
                  node.stack === null
                    ? null
                    : filterStackTrace(request, node.stack),
              });
              // Mark the end time of the await. If we're aborting then we don't emit this
              // to signal that this never resolved inside this render.
              markOperationEndTime(request, task, endTime);
              if (request.status === ABORTING) {
                // Undefined is used as a signal that we found a suitable aborted node and we don't have to find
                // further aborted nodes.
                match = undefined;
              }
            }
          }
        }
      }
      // We need to forward after we visit awaited nodes because what ever I/O we requested that's
      // the thing that generated this node and its virtual children.
      const promise = node.promise.deref();
      if (promise !== undefined) {
        const debugInfo = promise._debugInfo;
        if (debugInfo != null && !visited.has(debugInfo)) {
          visited.set(debugInfo, null);
          forwardDebugInfo(request, task, debugInfo);
        }
      }
      found = match;
      break;
    }
    default: {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error('Unknown AsyncSequence tag. This is a bug in React.');
    }
  }
  return found;
}

function emitAsyncSequence(
  request: Request,
  task: Task,
  node: AsyncSequence,
  alreadyForwardedDebugInfo: ?ReactDebugInfo,
  owner: null | ReactComponentInfo,
  stack: null | Error,
): void {
  const visited: Map<
    AsyncSequence | ReactDebugInfo,
    void | null | PromiseNode | IONode,
  > = new Map();
  if (__DEV__ && alreadyForwardedDebugInfo) {
    visited.set(alreadyForwardedDebugInfo, null);
  }
  const awaitedNode = visitAsyncNode(request, task, node, visited, task.time);
  if (awaitedNode === undefined) {
    // Undefined is used as a signal that we found an aborted await and that's good enough
    // anything derived from that aborted node might be irrelevant.
  } else if (awaitedNode !== null) {
    // Nothing in user space (unfiltered stack) awaited this.
    serializeIONode(request, awaitedNode, awaitedNode.promise);
    // We log the environment at the time when we ping which may be later than what the
    // environment was when we actually started awaiting.
    const env = (0, request.environmentName)();
    // If we don't have any thing awaited, the time we started awaiting was internal
    // when we yielded after rendering. The current task time is basically that.
    const debugInfo: ReactAsyncInfo = {
      awaited: awaitedNode as any as ReactIOInfo, // This is deduped by this reference.
      env: env,
    };
    if (__DEV__) {
      if (owner === null && stack === null) {
        // We have no location for the await. We can use the JSX callsite of the parent
        // as the await if this was just passed as a prop.
        if (task.debugOwner !== null) {
          // $FlowFixMe[cannot-write]
          debugInfo.owner = task.debugOwner;
        }
        if (task.debugStack !== null) {
          // $FlowFixMe[cannot-write]
          debugInfo.stack = filterStackTrace(
            request,
            parseStackTrace(task.debugStack, 1),
          );
        }
      } else {
        if (owner != null) {
          // $FlowFixMe[cannot-write]
          debugInfo.owner = owner;
        }
        if (stack != null) {
          // $FlowFixMe[cannot-write]
          debugInfo.stack = filterStackTrace(
            request,
            parseStackTrace(stack, 1),
          );
        }
      }
    }
    // We don't have a start time for this await but in case there was no start time emitted
    // we need to include something. TODO: We should maybe ideally track the time when we
    // called .then() but without updating the task.time field since that's used for the cutoff.
    advanceTaskTime(request, task, task.time);
    recordAsyncDebugInfo(request, task, debugInfo);
    // Mark the end time of the await. If we're aborting then we don't emit this
    // to signal that this never resolved inside this render.
    // If we're currently aborting, then this never resolved into user space.
    markOperationEndTime(request, task, awaitedNode.end);
  }
}

function serializeIONode(
  request: Request,
  ioNode: IONode | PromiseNode | UnresolvedPromiseNode,
  promiseRef: null | WeakRef<Promise<mixed>>,
): ReactIOInfo {
  const existingRef = request.debugIONodes.get(ioNode);
  if (existingRef !== undefined) {
    // Already written
    return existingRef;
  }

  let stack = null;
  let name = '';
  if (ioNode.promise !== null) {
    // Pick an explicit name from the Promise itself if it exists.
    // Note that we don't use the promiseRef passed in since that's sometimes the awaiting Promise
    // which is the value observed but it's likely not the one with the name on it.
    const promise = ioNode.promise.deref();
    if (
      promise !== undefined &&
      // $FlowFixMe[prop-missing]
      typeof promise.displayName === 'string'
    ) {
      name = promise.displayName;
    }
  }
  if (ioNode.stack !== null) {
    // The stack can contain some leading internal frames for the construction of the promise that we skip.
    const fullStack = stripLeadingPromiseCreationFrames(ioNode.stack);
    stack = filterStackTrace(request, fullStack);
    if (name === '') {
      // If we didn't have an explicit name, try finding one from the stack.
      name = findCalledFunctionNameFromStackTrace(request, fullStack);
      // The name can include the object that this was called on but sometimes that's
      // just unnecessary context.
      if (name.startsWith('Window.')) {
        name = name.slice(7);
      } else if (name.startsWith('<anonymous>.')) {
        name = name.slice(7);
      }
    }
  }
  const owner = ioNode.owner;

  let value: void | Promise<mixed> = undefined;
  if (promiseRef !== null) {
    value = promiseRef.deref();
  }

  // We log the environment at the time when we serialize the I/O node.
  // The environment name may have changed from when the I/O was actually started.
  const env = (0, request.environmentName)();

  const endTime =
    ioNode.tag === UNRESOLVED_PROMISE_NODE
      ? // Mark the end time as now. It's arbitrary since it's not resolved but this
        // marks when we called abort and therefore stopped trying.
        request.abortTime
      : ioNode.end;

  const info: ReactIOInfo = {
    name,
    start: ioNode.start,
    end: endTime,
    env,
    owner,
    stack,
  };
  if (value !== undefined) {
    // $FlowFixMe[cannot-write]
    info.value = captureDebugThenable(request, value);
  }
  request.debugIONodes.set(ioNode, info);
  return info;
}

function advanceTaskTime(
  request: Request,
  task: Task,
  timestamp: number,
): void {
  if (
    !enableProfilerTimer ||
    (!enableComponentPerformanceTrack && !enableAsyncDebugInfo)
  ) {
    return;
  }
  // Emits a timing chunk, if the new timestamp is higher than the previous timestamp of this task.
  if (timestamp > task.time) {
    recordTimingInfo(task, timestamp);
    task.time = timestamp;
  } else if (!task.timed) {
    // If it wasn't timed before, e.g. an outlined object, we need to emit the first timestamp and
    // it is now timed.
    recordTimingInfo(task, task.time);
  }
  task.timed = true;
}

function forwardDebugInfoFromThenable(
  request: Request,
  task: Task,
  thenable: Thenable<any>,
  owner: null | ReactComponentInfo = null,
  stack: null | Error = null,
): void {
  if (__DEV__) {
    const debugInfo = thenable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
    if (enableProfilerTimer && enableAsyncDebugInfo) {
      const sequence = getAsyncSequenceFromPromise(thenable);
      if (sequence !== null) {
        emitAsyncSequence(request, task, sequence, debugInfo, owner, stack);
      }
    }
  }
}

function forwardDebugInfoFromCurrentContext(
  request: Request,
  task: Task,
  thenable: Thenable<any>,
): void {
  if (__DEV__) {
    const debugInfo = thenable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
    if (enableProfilerTimer && enableAsyncDebugInfo) {
      const sequence = getCurrentAsyncSequence();
      if (sequence !== null) {
        emitAsyncSequence(request, task, sequence, debugInfo, null, null);
      }
    }
  }
}

function recordTimingInfo(task: Task, time: number): void {
  pushDebugInfo(task.promise, {time});
}

function markOperationEndTime(request: Request, task: Task, timestamp: number) {
  if (
    !enableProfilerTimer ||
    (!enableComponentPerformanceTrack && !enableAsyncDebugInfo)
  ) {
    return;
  }
  // Always emit a timing chunk even if it doesn't advance.
  // This ensures that the end time of the previous entry isn't implied to be the start of the next one.
  if (request.status === ABORTING && timestamp > request.abortTime) {
    // If we're aborting then we don't emit any end times that happened after.
    return;
  }
  if (timestamp > task.time) {
    recordTimingInfo(task, timestamp);
    task.time = timestamp;
  } else {
    recordTimingInfo(task, task.time);
  }
}

function forwardDebugInfo(
  request: Request,
  task: Task,
  debugInfo: ReactDebugInfo,
): void {
  for (let i = 0; i < debugInfo.length; i++) {
    const info = debugInfo[i];
    if (typeof info.time === 'number') {
      markOperationEndTime(request, task, info.time);
    } else {
      pushDebugInfo(task.promise, info);
    }
  }
}

function outlineTask(request: Request, task: Task): ReactClientValue {
  const source = task.model;
  const renderedModels = getRenderedModels(
    request,
    source,
    task.keyPath,
    task.implicitSlot,
  );
  const newTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  if (task.model !== null && typeof task.model === 'object') {
    setModelReference(request, task.model, newTask.reference);
  }
  if (__DEV__) {
    newTask.debugOwner = task.debugOwner;
    newTask.debugStack = task.debugStack;
    newTask.debugTask = task.debugTask;
  }
  retryTask(request, newTask);
  const model =
    newTask.promise.status === 'fulfilled'
      ? createResultValueReference(request, newTask.reference)
      : createLazyWrapperAroundWakeable(newTask.promise as any);
  if (source !== null && typeof source === 'object') {
    setRenderedModel(renderedModels, source, model);
  }
  return renderModelReference(task, model);
}

function deferTask(request: Request, task: Task): ReactClientValue {
  const newTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  if (__DEV__) {
    newTask.debugOwner = task.debugOwner;
    newTask.debugStack = task.debugStack;
    newTask.debugTask = task.debugTask;
  }
  const lazy = createLazyWrapperAroundWakeable(newTask.promise as any);
  const model = task.model;
  if (model !== null && typeof model === 'object') {
    setModelReference(request, model, newTask.reference);
    setRenderedModel(
      getRenderedModels(request, model, task.keyPath, task.implicitSlot),
      model,
      lazy,
    );
  }
  pingTask(request, newTask);
  return renderModelReference(task, lazy);
}

function abortTask(request: Request, task: Task): void {
  if (__DEV__) {
    forwardDebugInfoFromAbortedTask(request, task);
  }
  task.status = ABORTED;
  if (request.type === PRERENDER) {
    markHalted(request.result, task.promise);
  } else {
    const abortModel = request.abortModel;
    if (abortModel !== null) {
      copyErrorReference(request.result, task.promise, abortModel);
    }
    task.reject(request.fatalError);
  }
  request.abortableTasks.delete(task);
}

function finishAbort(
  request: Request,
  error: mixed,
  preserveRendering: boolean = false,
): void {
  request.abortableTasks.forEach(task => {
    if (preserveRendering) {
      if (task.status !== RENDERING) {
        if (__DEV__ && request.type === PRERENDER) {
          task.status = ABORTED;
        } else {
          abortTask(request, task);
        }
      }
    } else {
      task.status = ABORTED;
      task.reject(error);
      request.abortableTasks.delete(task);
    }
  });
  request.pingedTasks.length = 0;
  if (
    __DEV__ &&
    request.type === PRERENDER &&
    preserveRendering &&
    request.abortableTasks.size > 0
  ) {
    scheduleWork(() => finishAbortedTasks(request));
    return;
  }
  if (request.abortableTasks.size === 0) {
    request.status = CLOSED;
    closeResult(request);
    if (enableTaint) {
      cleanupTaintQueue(request);
    }
  }
}

function renderAsyncIterable(
  request: Request,
  task: Task,
  iterable: $AsyncIterable<ReactClientValue, ReactClientValue, void>,
  iterator: $AsyncIterator<ReactClientValue, ReactClientValue, void>,
): ReactClientValue {
  const controller = createAsyncIterable<ReactClientValue>(
    iterable === iterator,
  );
  const streamTask = createTask(
    request,
    task.model,
    null,
    false,
    task.formatContext,
  );
  if (__DEV__) {
    streamTask.environmentName = task.environmentName;
    streamTask.debugOwner = task.debugOwner;
    streamTask.debugStack = task.debugStack;
    streamTask.debugTask = task.debugTask;
  }
  const resolvedIterable = controller.iterable;
  setRenderedModel(
    request.modelEntries,
    iterable as any,
    resolvedIterable as any,
  );
  setAsyncIterable(request.result, controller);

  function progress(entry: IteratorResult<ReactClientValue, ReactClientValue>) {
    if (streamTask.status !== PENDING) {
      return;
    }
    const entryTask = createTask(
      request,
      entry.value,
      null,
      false,
      entry.done ? createRootFormatContext() : streamTask.formatContext,
    );
    if (__DEV__) {
      entryTask.environmentName = streamTask.environmentName;
      entryTask.debugOwner = entry.done ? null : streamTask.debugOwner;
      entryTask.debugStack = entry.done ? null : streamTask.debugStack;
      entryTask.debugTask = entry.done ? null : streamTask.debugTask;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener(
        'abort',
        abortIterable,
      );
      controller.close(entryTask.promise as any);
    } else {
      controller.enqueue(entryTask.promise as any);
    }
    request.pingedTasks.push(entryTask);
    performWork(request);
    if (!entry.done && streamTask.status === PENDING) {
      next();
    }
  }

  function throwIntoIterator(reason: mixed): void {
    if (typeof (iterator as any).throw === 'function') {
      try {
        // $FlowFixMe[prop-missing] The optional iterator method accepts the reason.
        iterator.throw(reason).then(noop, noop);
      } catch (x) {
        // The stream already contains the original error.
      }
    }
  }

  function error(reason: mixed): void {
    if (streamTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortIterable);
    try {
      erroredTask(request, streamTask, reason);
      copyErrorReference(request.result, resolvedIterable, streamTask.promise);
      controller.error(reason);
    } catch (callbackError) {
      controller.error(callbackError);
      fatalError(request, callbackError);
    } finally {
      throwIntoIterator(reason);
      scheduleMicrotask(() => performWork(request));
    }
  }

  function abortIterable(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortIterable);
    const reason = signal.reason;
    if (request.type === PRERENDER) {
      markHalted(request.result, resolvedIterable);
      controller.halt();
    } else {
      streamTask.promise.then(noop, abortError => {
        copyErrorReference(
          request.result,
          resolvedIterable,
          streamTask.promise,
        );
        controller.error(abortError);
      });
    }
    throwIntoIterator(reason);
  }

  function next(): void {
    try {
      if (__DEV__) {
        callIteratorInDEV(iterator, progress, error);
      } else {
        iterator.next().then(progress, error);
      }
    } catch (x) {
      error(x);
    }
  }

  request.cacheController.signal.addEventListener('abort', abortIterable);
  next();
  return resolvedIterable as any;
}

function renderAsyncFragment(
  request: Request,
  task: Task,
  children: $AsyncIterable<ReactClientValue, ReactClientValue, void>,
  getAsyncIterator: () => $AsyncIterator<
    ReactClientValue,
    ReactClientValue,
    void,
  >,
): ReactClientValue {
  const keyPath = task.keyPath;
  const implicitSlot = task.implicitSlot;
  task.keyPath = null;
  task.implicitSlot = false;
  const existingIterable = getRenderedModel(request.modelEntries, children);
  const resolvedIterable =
    existingIterable === undefined || existingIterable === task.promise
      ? renderAsyncIterable(
          request,
          task,
          children,
          getAsyncIterator.call(children),
        )
      : existingIterable;
  if (keyPath !== null) {
    const props = {children: resolvedIterable};
    let fragment: ReactElement;
    if (__DEV__) {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        props,
        _owner: null,
        _store: {validated: 0},
      } as any;
      Object.defineProperties(fragment, {
        ref: {value: null},
        _debugInfo: {value: null, writable: true},
        _debugStack: {value: null, writable: true},
        _debugTask: {value: null, writable: true},
      });
      request.completedElements.push(fragment);
    } else {
      fragment = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: keyPath,
        ref: null,
        props,
      } as any;
    }
    const resolvedModel = implicitSlot ? [fragment as any] : (fragment as any);
    setRenderedModel(
      getRenderedModels(request, children, keyPath, implicitSlot),
      children,
      resolvedModel,
    );
    return resolvedModel;
  }
  return resolvedIterable;
}

export function attachAbortSignal(request: Request, signal: AbortSignal): void {
  if (signal.aborted) {
    abort(request, signal.reason);
    return;
  }
  const cacheSignal = request.cacheController.signal;
  if (cacheSignal.aborted) {
    return;
  }
  const subscription: {request: null | Request} = {request};
  function onAbort(): void {
    const current = subscription.request;
    if (current !== null) {
      abort(current, signal.reason);
    }
  }
  function detach(): void {
    subscription.request = null;
    signal.removeEventListener('abort', onAbort);
  }
  signal.addEventListener('abort', onAbort);
  cacheSignal.addEventListener('abort', detach, {once: true});
}

export function abort(request: Request, reason: mixed): void {
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    if (__DEV__) {
      request.abortTime = performance.now();
    }
    request.cacheController.abort(reason);
    if (request.type === PRERENDER) {
      finishAbort(request, reason, true);
      if (request.status === CLOSED) {
        request.onAllReady();
      }
      return;
    }
    const error =
      reason === undefined
        ? new Error('The render was aborted by the server without a reason.')
        : typeof reason === 'object' &&
            reason !== null &&
            typeof (reason as any).then === 'function'
          ? new Error('The render was aborted by the server with a promise.')
          : reason;
    request.fatalError = error;
    if (request.abortableTasks.size > 0) {
      const digest = logRecoverableError(request, error);
      const abortModel = createResultModel<ReactClientValue>();
      request.abortModel = abortModel;
      setErrorDigest(request.result, abortModel, digest);
      rejectResultModel(abortModel, error);
    }
    finishAbort(request, error, true);
    if (request.status === CLOSED) {
      request.onAllReady();
    }
  } catch (error) {
    fatalError(request, error);
  }
}

export function createPrerenderRequest(
  model: ReactClientValue,
  onAllReady: () => void,
  onFatalError: mixed => void,
  onError: void | (mixed => ?string),
  identifierPrefix: void | string,
  temporaryReferences: void | TemporaryReferenceSet,
  createServerReference: (Function, Promise<Array<any>>) => Function,
  environmentName?: string | (() => string),
  filterStackFrame?: (string, string, number, number) => boolean,
): Request {
  if (__DEV__) {
    resetOwnerStackLimit();
  }
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(
    model,
    onError,
    identifierPrefix,
    temporaryReferences,
    createServerReference,
    PRERENDER,
    onAllReady,
    onFatalError,
    environmentName,
    filterStackFrame,
  );
}

function finishAbortedTasks(request: Request): void {
  request.abortableTasks.forEach(task => {
    if (task.status === ABORTED) {
      abortTask(request, task);
    }
  });
  if (request.abortableTasks.size === 0 && request.status !== CLOSED) {
    request.status = CLOSED;
    closeResult(request);
    if (enableTaint) {
      cleanupTaintQueue(request);
    }
    request.onAllReady();
  }
}

function renderMap(
  request: Request,
  task: Task,
  map: Map<ReactClientValue, ReactClientValue>,
): Map<ReactClientValue, ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, map) as any;
  }
  const entries = Array.from(map);
  const copy: Map<ReactClientValue, ReactClientValue> = new Map();
  setRenderedModel(request.modelEntries, map, copy);
  const model = renderCollectionEntries(request, task, copy, entries);
  const populate = (values: Array<[ReactClientValue, ReactClientValue]>) => {
    for (let i = 0; i < values.length; i++) {
      copy.set(values[i][0], values[i][1]);
    }
  };
  const values = model.value;
  if (model.status === 'fulfilled' && values !== undefined) {
    populate(values);
  } else {
    model.then(populate, noop);
  }
  return copy;
}

function renderSet(
  request: Request,
  task: Task,
  set: Set<ReactClientValue>,
): Set<ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, set) as any;
  }
  const entries = Array.from(set);
  const copy: Set<ReactClientValue> = new Set();
  setRenderedModel(request.modelEntries, set, copy);
  const model = renderCollectionEntries(request, task, copy, entries);
  const populate = (values: Array<ReactClientValue>) => {
    for (let i = 0; i < values.length; i++) {
      copy.add(values[i]);
    }
  };
  const values = model.value;
  if (model.status === 'fulfilled' && values !== undefined) {
    populate(values);
  } else {
    model.then(populate, noop);
  }
  return copy;
}

function renderCollectionEntries(
  request: Request,
  task: Task,
  collection: Object,
  entries: Array<any>,
): ResultModel<Array<any>> {
  const reference = task.currentReference;
  if (reference !== null) {
    setModelReference(request, collection, reference);
  }
  const newTask = createTask(request, entries, null, false, task.formatContext);
  setCollectionEntries(request.result, collection, newTask.promise as any);
  retryTask(request, newTask);
  return newTask.promise as any;
}

function renderFormData(
  request: Request,
  task: Task,
  formData: FormData,
): FormData {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, formData) as any;
  }
  const entries: Array<[ReactClientValue, ReactClientValue]> = Array.from(
    formData.entries(),
  ) as any;
  let hasBlob = false;
  let hasOutlinedEntry = false;
  setRenderedModel(request.modelEntries, formData, formData);
  task.keyPath = null;
  task.implicitSlot = false;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = resolveModel(request, task, entry, '0', entry[0]);
    const value = resolveModel(request, task, entry, '1', entry[1] as any);
    if (typeof entry[1] !== 'string') {
      hasBlob = true;
    }
    if (key !== entry[0] || value !== entry[1]) {
      hasOutlinedEntry = true;
      entry[0] = key;
      entry[1] = value;
    }
  }
  if (hasBlob) {
    markFormDataWithBlobs(request.result, formData);
  }
  if (hasOutlinedEntry) {
    blockModelOnDependencies(request, formData, entries);
  }
  return formData;
}

function blockModelOnDependencies(
  request: Request,
  model: ReactClientValue,
  dependencyModel: ReactClientValue,
): void {
  const outlinedModels = request.outlinedModels;
  if (outlinedModels === null) {
    return;
  }
  const dependencies = getOutlinedModelDependencies(
    request,
    dependencyModel,
    outlinedModels,
  );
  if (dependencies.size > 0) {
    const newTask = createTask(
      request,
      model,
      null,
      false,
      createRootFormatContext(),
    );
    outlinedModels.set(model as any, newTask);
    blockTask(request, newTask, model, dependencies);
  }
}

function renderErrorValue(request: Request, task: Task, error: Error): Error {
  if (__DEV__) {
    if (task.formatContext !== createRootFormatContext()) {
      return outlineModel(request, error) as any;
    }
    const isAggregateError =
      typeof AggregateError !== 'undefined' && error instanceof AggregateError;
    let name: string = 'Error';
    let message: string;
    let stack: ReactStackTrace;
    let rawStack: void | string;
    let env = (0, request.environmentName)();
    try {
      name = error.name;
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error.message);
      stack = filterStackTrace(request, parseStackTrace(error, 0));
      const errorEnv = (error as any).environmentName;
      if (typeof errorEnv === 'string') {
        env = errorEnv;
      }
      if ('cause' in error || isAggregateError) {
        rawStack = error.stack;
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
      rawStack = '';
    }
    const errorInfo: ReactErrorInfoDev = {name, message, stack, env};
    let copy = error;
    if ('cause' in error || isAggregateError) {
      const descriptors = Object.getOwnPropertyDescriptors(error as any);
      delete descriptors.message;
      delete descriptors.cause;
      if ('cause' in error) {
        descriptors.cause = {
          value: null,
          configurable: true,
          writable: true,
        };
      }
      if (isAggregateError) {
        delete descriptors.errors;
      }
      descriptors.name = {value: name, configurable: true, writable: true};
      descriptors.stack = {value: rawStack, configurable: true, writable: true};
      descriptors.environmentName = {
        value: env,
        configurable: true,
        writable: true,
      };
      copy = isAggregateError
        ? new AggregateError([], message)
        : // eslint-disable-next-line react-internal/prod-error-codes
          new Error(message);
      Object.setPrototypeOf(copy, getPrototypeOf(error));
      Object.defineProperties(copy, descriptors);
    }
    setRenderedModel(request.modelEntries, error, copy);
    task.keyPath = null;
    task.implicitSlot = false;
    task.debugOwner = null;
    task.debugStack = null;
    task.debugTask = null;
    if ('cause' in error) {
      copy.cause = outlineModel(request, error.cause as any);
    }
    if (isAggregateError) {
      (copy as any).errors = outlineModel(request, (error as any).errors);
    }
    const resolvedInfo = resolveModel(request, task, emptyRoot, '', errorInfo);
    blockModelOnDependencies(request, copy, resolvedInfo);
    setErrorInfo(request.result, copy, errorInfo);
    return copy;
  }
  setRenderedModel(request.modelEntries, error, error);
  return error;
}

function renderBlob(request: Request, task: Task, blob: Blob): Blob {
  setRenderedModel(request.modelEntries, blob, blob);
  if (enableTaint) {
    const newTask = createTask(
      request,
      blob,
      null,
      false,
      createRootFormatContext(),
    );
    if (__DEV__) {
      newTask.environmentName = task.environmentName;
      newTask.debugOwner = task.debugOwner;
      newTask.debugStack = task.debugStack;
      newTask.debugTask = task.debugTask;
    }
    let outlinedModels = request.outlinedModels;
    if (outlinedModels === null) {
      request.outlinedModels = outlinedModels = new WeakMap();
    }
    outlinedModels.set(blob, newTask);
    request.hasByValueModels = true;
    addModelDependency(task, newTask.promise);
    const deferredBlobs = request.deferredBlobs;
    if (deferredBlobs === null) {
      request.deferredBlobs = [newTask];
    } else {
      deferredBlobs.push(newTask);
    }
  }
  return blob;
}

function validateBlob(request: Request, newTask: Task): void {
  if (newTask.status !== PENDING) {
    return;
  }
  const blob: Blob = newTask.model as any;
  try {
    const taintedType = TaintRegistryValues.get(blob.type);
    if (taintedType !== undefined) {
      throwTaintViolation(taintedType.message);
    }
    if (TaintRegistryByteLengths.size === 0) {
      completeTask(request, newTask, blob);
      return;
    }
  } catch (x) {
    erroredTask(request, newTask, x);
    return;
  }
  const copy = new Blob([blob], {type: blob.type});
  const reader = copy.stream().getReader();

  function progress(entry: {
    done: boolean,
    value: any,
    ...
  }): Promise<void> | void {
    if (newTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      request.cacheController.signal.removeEventListener('abort', abortBlob);
      scheduleMicrotask(() => performWork(request));
      completeTask(request, newTask, blob);
      return;
    }
    const chunk: Uint8Array = entry.value;
    if (TaintRegistryByteLengths.has(chunk.byteLength)) {
      const tainted = TaintRegistryValues.get(binaryToComparableString(chunk));
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    return reader.read().then(progress).catch(error);
  }
  function error(reason: mixed): void {
    if (newTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortBlob);
    scheduleMicrotask(() => performWork(request));
    try {
      erroredTask(request, newTask, reason);
    } catch (callbackError) {
      fatalError(request, callbackError);
    } finally {
      // $FlowFixMe[incompatible-type] Stream cancellation accepts any reason.
      reader.cancel(reason).then(noop, noop);
    }
  }
  function abortBlob(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortBlob);
    reader.cancel(signal.reason).then(noop, noop);
  }
  request.cacheController.signal.addEventListener('abort', abortBlob);
  reader.read().then(progress).catch(error);
}

function validateDeferredBlobs(request: Request): void {
  const deferredBlobs = request.deferredBlobs;
  request.deferredBlobs = null;
  if (deferredBlobs !== null) {
    for (let i = 0; i < deferredBlobs.length; i++) {
      validateBlob(request, deferredBlobs[i]);
    }
  }
}

function renderServerReference(request: Request, reference: Object): Object {
  const existingReference = getRenderedModel(request.modelEntries, reference);
  if (existingReference !== undefined) {
    return existingReference;
  }
  const id = getServerReferenceId(null as any, reference as any);
  if (typeof reference !== 'function') {
    setServerReference(request.result, reference, {
      id,
      bound: null,
      isObjectReference: true,
    });
    setRenderedModel(request.modelEntries, reference, reference);
    return reference;
  }
  const boundArgs = getServerReferenceBoundArguments(
    null as any,
    reference as any,
  );
  if (boundArgs === null) {
    setServerReference(request.result, reference, {
      id,
      bound: null,
      isObjectReference: false,
    });
    setRenderedModel(request.modelEntries, reference, reference);
    return reference;
  }
  const newTask = createTask(
    request,
    boundArgs as any,
    null,
    false,
    createRootFormatContext(),
  );
  newTask.promise.then(noop, noop);
  const copy = request.createServerReference(reference, newTask.promise as any);
  setServerReference(request.result, copy, {
    id,
    bound: newTask.promise as any,
    isObjectReference: false,
  });
  setRenderedModel(request.modelEntries, reference, copy);
  pingTask(request, newTask);
  return copy;
}

function renderIterator(
  request: Request,
  task: Task,
  iterator: Iterator<ReactClientValue>,
): Iterator<ReactClientValue> {
  if (task.formatContext !== createRootFormatContext()) {
    return outlineModel(request, iterator as any) as any;
  }
  const existingModel = getRenderedModel(request.modelEntries, iterator as any);
  if (existingModel !== undefined && existingModel !== task.promise) {
    return existingModel as any;
  }
  const entries = Array.from(iterator);
  const copy: Array<ReactClientValue> = [];
  const resolvedIterator = copy.values();
  setRenderedModel(
    request.modelEntries,
    iterator as any,
    resolvedIterator as any,
  );
  setIteratorEntries(request.result, resolvedIterator, copy);
  task.keyPath = null;
  task.implicitSlot = false;
  if (__DEV__) {
    task.debugOwner = null;
    task.debugStack = null;
    task.debugTask = null;
  }
  for (let i = 0; i < entries.length; i++) {
    copy[i] = resolveModel(request, task, entries, '' + i, entries[i]);
  }
  return resolvedIterator;
}

function renderReadableStream(
  request: Request,
  task: Task,
  stream: ReadableStream,
): ReactClientValue {
  // $FlowFixMe[prop-missing] This is a Node.js extension.
  let supportsBYOB: void | boolean = stream.supportsBYOB;
  if (supportsBYOB === undefined) {
    try {
      // $FlowFixMe[extra-arg] This argument is accepted.
      stream.getReader({mode: 'byob'}).releaseLock();
      supportsBYOB = true;
    } catch (x) {
      supportsBYOB = false;
    }
  }
  const isByteStream: boolean = supportsBYOB;
  const reader = stream.getReader();
  const controller = createReadableStream<ReactClientValue>(isByteStream);
  const streamTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
  );
  if (__DEV__) {
    streamTask.environmentName = task.environmentName;
    streamTask.debugOwner = task.debugOwner;
    streamTask.debugStack = task.debugStack;
    streamTask.debugTask = task.debugTask;
  }
  const resolvedStream = controller.stream;
  setRenderedModel(request.modelEntries, stream, resolvedStream);
  setReadableStream(request.result, controller);

  function progress(entry: {done: boolean, value: ReactClientValue, ...}) {
    if (streamTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      request.abortableTasks.delete(streamTask);
      request.cacheController.signal.removeEventListener('abort', abortStream);
      controller.close();
      scheduleMicrotask(() => performWork(request));
      return;
    }
    let entryTask: Task | null = null;
    try {
      streamTask.model = entry.value;
      if (isByteStream) {
        const value = renderModelDestructive(
          request,
          streamTask,
          emptyRoot,
          '',
          entry.value,
        );
        controller.enqueue(Promise.resolve(value));
      } else {
        entryTask = createTask(
          request,
          entry.value,
          streamTask.keyPath,
          streamTask.implicitSlot,
          streamTask.formatContext,
        );
        if (__DEV__) {
          entryTask.environmentName = streamTask.environmentName;
          entryTask.debugOwner = streamTask.debugOwner;
          entryTask.debugStack = streamTask.debugStack;
          entryTask.debugTask = streamTask.debugTask;
        }
        controller.enqueue(entryTask.promise as any);
        tryStreamTask(request, entryTask);
      }
      if (streamTask.status === PENDING) {
        reader.read().then(progress, error);
      }
    } catch (x) {
      error(x);
      if (entryTask !== null && entryTask.status === RENDERING) {
        copyErrorReference(
          request.result,
          entryTask.promise,
          streamTask.promise,
        );
        entryTask.status = ERRORED;
        entryTask.reject(x);
        request.abortableTasks.delete(entryTask);
      }
    }
  }

  function cancelReader(reason: mixed): void {
    // $FlowFixMe[incompatible-type] Stream cancellation accepts any reason.
    reader.cancel(reason).then(noop, noop);
  }

  function error(reason: mixed): void {
    if (streamTask.status !== PENDING) {
      return;
    }
    request.cacheController.signal.removeEventListener('abort', abortStream);
    try {
      erroredTask(request, streamTask, reason);
      copyErrorReference(request.result, resolvedStream, streamTask.promise);
      controller.error(reason);
    } catch (callbackError) {
      controller.error(callbackError);
      fatalError(request, callbackError);
    } finally {
      cancelReader(reason);
      scheduleMicrotask(() => performWork(request));
    }
  }

  function abortStream(): void {
    const signal = request.cacheController.signal;
    signal.removeEventListener('abort', abortStream);
    const reason = signal.reason;
    if (request.type === PRERENDER) {
      markHalted(request.result, resolvedStream);
      controller.halt();
    } else {
      streamTask.promise.then(noop, abortError => {
        copyErrorReference(request.result, resolvedStream, streamTask.promise);
        controller.error(abortError);
      });
    }
    cancelReader(reason);
  }

  request.cacheController.signal.addEventListener('abort', abortStream);
  reader.read().then(progress, error);
  return resolvedStream;
}

function tryStreamTask(request: Request, task: Task): void {
  const parentSerializedSize = serializedSize;
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevCache = setCurrentCache(request);
  prepareToUseHooksForRequest(request);
  task.status = RENDERING;
  try {
    const value = resolveModel(request, task, emptyRoot, '', task.model);
    const model = value;
    if (request.status === CLOSED) {
      return;
    }
    if (enableTaint) {
      validateDeferredBlobs(request);
    }
    const outlinedModels = request.outlinedModels;
    if (
      outlinedModels !== null &&
      waitForOutlinedModel(request, task, model, outlinedModels)
    ) {
      return;
    }
    completeTask(request, task, model);
  } catch (error) {
    if (request.status === ABORTING) {
      abortTask(request, task);
      return;
    }
    throw error;
  } finally {
    modelRoot = null;
    try {
      if (__DEV__) {
        const elements = request.completedElements;
        for (let i = 0; i < elements.length; i++) {
          Object.freeze(elements[i].props);
          Object.freeze(elements[i]);
        }
        elements.length = 0;
      }
      if (enableTaint) {
        validateDeferredBlobs(request);
      }
      if (request.status !== CLOSED && request.abortableTasks.size === 0) {
        request.status = CLOSED;
        closeResult(request);
        if (enableTaint) {
          cleanupTaintQueue(request);
        }
        request.cacheController.abort(
          new Error(
            'This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.',
          ),
        );
        request.onAllReady();
      }
    } finally {
      serializedSize = parentSerializedSize;
      ReactSharedInternals.H = prevDispatcher;
      resetHooksForRequest();
      setCurrentCache(prevCache);
    }
  }
}

function renderWeakThenable(
  request: Request,
  task: Task,
  thenable: Thenable<ReactClientValue>,
): ReactClientValue {
  const promise = createResultModel<ReactClientValue>(true);
  let pendingWeakModels = request.pendingWeakModels;
  if (pendingWeakModels === null) {
    request.pendingWeakModels = pendingWeakModels = new Set();
  }
  pendingWeakModels.add(promise);
  const weakModels = pendingWeakModels;
  const keyPath = task.keyPath;
  const implicitSlot = task.implicitSlot;
  const formatContext = task.formatContext;
  const debugOwner = __DEV__ ? task.debugOwner : null;
  const debugStack = __DEV__ ? task.debugStack : null;
  const debugTask = __DEV__ ? task.debugTask : null;
  const environmentName = __DEV__ ? task.environmentName : '';
  setRenderedModel(
    getRenderedModels(request, thenable as any, keyPath, implicitSlot),
    thenable as any,
    promise,
  );
  let settled = false;
  function createThenableTask(model: ReactClientValue): Task {
    settled = true;
    weakModels.delete(promise);
    const newTask = createTask(
      request,
      model,
      keyPath,
      implicitSlot,
      formatContext,
    );
    if (__DEV__) {
      newTask.debugOwner = debugOwner;
      newTask.debugStack = debugStack;
      newTask.debugTask = debugTask;
      newTask.environmentName = environmentName;
    }
    newTask.promise.then(
      value => {
        fulfillResultModel(promise, value);
      },
      error => {
        copyErrorReference(request.result, promise, newTask.promise);
        rejectResultModel(promise, error);
      },
    );
    return newTask;
  }
  thenable.then(
    value => {
      if (settled || request.status > OPEN) {
        return;
      }
      const newTask = createThenableTask(value);
      pingTask(request, newTask);
    },
    reason => {
      if (settled || request.status > OPEN) {
        return;
      }
      const newTask = createThenableTask(thenable as any);
      try {
        erroredTask(request, newTask, reason);
      } catch (error) {
        fatalError(request, error);
      }
      scheduleMicrotask(() => performWork(request));
    },
  );
  return promise;
}

function closeResult(request: Request): void {
  const pendingWeakModels = request.pendingWeakModels;
  if (pendingWeakModels !== null) {
    pendingWeakModels.forEach(model => markHalted(request.result, model));
    pendingWeakModels.clear();
    request.pendingWeakModels = null;
  }
  closeHints(request.result);
  completeResult(request.result);
}

function warnForMissingKey(
  request: Request,
  key: ReactKey,
  componentDebugInfo: ReactComponentInfo,
  debugTask: null | ConsoleTask,
): void {
  if (__DEV__) {
    let didWarnForKey = request.didWarnForKey;
    if (didWarnForKey == null) {
      didWarnForKey = request.didWarnForKey = new WeakSet();
    }
    const parentOwner = componentDebugInfo.owner;
    if (parentOwner != null) {
      if (didWarnForKey.has(parentOwner)) {
        // We already warned for other children in this parent.
        return;
      }
      didWarnForKey.add(parentOwner);
    }

    // Call with the server component as the currently rendering component
    // for context.
    const logKeyError = () => {
      console.error(
        'Each child in a list should have a unique "key" prop.' +
          '%s%s See https://react.dev/link/warning-keys for more information.',
        '',
        '',
      );
    };

    // $FlowFixMe[constant-condition]
    if (supportsComponentStorage) {
      // Run the component in an Async Context that tracks the current owner.
      if (debugTask) {
        debugTask.run(
          // $FlowFixMe[method-unbinding]
          componentStorage.run.bind(
            componentStorage,
            componentDebugInfo,
            callComponentInDEV,
            logKeyError,
            null,
            componentDebugInfo,
          ),
        );
      } else {
        componentStorage.run(
          componentDebugInfo,
          callComponentInDEV,
          logKeyError,
          null,
          componentDebugInfo,
        );
      }
    } else {
      if (debugTask) {
        debugTask.run(
          callComponentInDEV.bind(null, logKeyError, null, componentDebugInfo),
        );
      } else {
        callComponentInDEV(logKeyError, null, componentDebugInfo);
      }
    }
  }
}
