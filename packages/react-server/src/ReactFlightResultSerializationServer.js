/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from 'shared/ReactFlightResultModel';
import {
  getResultModelStatus,
  getResultModel,
} from 'shared/ReactFlightResultModel';
import type {
  ServerReferenceMetadata,
  ErrorReference,
  ModelReference,
} from 'shared/ReactFlightResult';
import type {ConsoleEntry} from 'shared/ReactFlightResult';
import type {
  Thenable,
  ReactDebugInfo,
  ReactDebugInfoEntry,
  ReactComponentInfo,
  ReactIOInfo,
  ReactAsyncInfo,
  ReactCallSite,
  ReactErrorInfo,
  ReactStackTrace,
  ReactKey,
  ReactFunctionLocation,
  ReactErrorInfoDev,
} from 'shared/ReactTypes';
import {
  MODEL_KIND_MASK,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
  getJSONModelWork,
} from 'shared/ReactFlightResult';
import {
  describeObjectForErrorMessage,
  isGetter,
} from 'shared/ReactSerializationErrors';
import type {
  ReactClientValue,
  ReactClientObject,
} from './ReactFlightResultServer';
import type {ReactElement} from 'shared/ReactElementType';
import type {Chunk, BinaryChunk, Destination} from './ReactServerStreamConfig';
import type {HintCode, HintModel} from './ReactFlightResultServerConfig';
import type {
  ClientManifest,
  ClientReference,
  ClientReferenceKey,
  ClientReferenceMetadata,
  ServerReference,
  ServerReferenceId,
} from './ReactFlightServerConfig';
import {
  beginWriting,
  writeChunk,
  writeChunkAndReturn,
  typedArrayToBinaryChunk,
  byteLengthOfBinaryChunk,
  completeWriting,
  flushBuffered,
  close,
  closeWithError,
  stringToChunk,
  byteLengthOfChunk,
  scheduleMicrotask,
  scheduleWork,
} from './ReactServerStreamConfig';
import {
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  getIteratorFn,
} from 'shared/ReactSymbols';
import type {LazyComponent} from 'react/src/ReactLazy';
import isArray from 'shared/isArray';
import hasOwnProperty from 'shared/hasOwnProperty';
import noop from 'shared/noop';
import type {TemporaryReferenceSet} from './ReactFlightServerTemporaryReferences';
import {resolveTemporaryReference} from './ReactFlightServerTemporaryReferences';
import {
  enableProfilerTimer,
  enableComponentPerformanceTrack,
  enableFlightWeakThenables,
  enableTaint,
  enableFlightObjectReferences,
} from 'shared/ReactFeatureFlags';
import ReactSharedInternals from './ReactSharedInternalsServer';
import binaryToComparableString from 'shared/binaryToComparableString';
import {
  isClientReference,
  isServerReference,
  getServerReferenceId,
  getClientReferenceKey,
  resolveClientReferenceMetadata,
  parseStackTrace,
  parseStackTracePrivate,
  unbadgeConsole,
  supportsRequestStorage,
  cacheStorage,
  requestStorage,
} from './ReactFlightServerConfig';
import {setCurrentCache} from './flight/ReactFlightCurrentCache';
import {setCurrentOwner, resolveOwner} from './flight/ReactFlightCurrentOwner';

const stringify = JSON.stringify;
const getPrototypeOf = Object.getPrototypeOf;
const ObjectPrototype = Object.prototype;
let importStringRequest: null | Request = null;

// Bundler metadata repeats the same chunk URLs across every client reference of
// a route, so strings in it at least this long get outlined and deduplicated
// when they repeat. The threshold is bounded away from zero because outlining
// something as short as an export name costs more than copying it.
const MIN_DEDUPLICATED_IMPORT_STRING_LENGTH = 16;

// Tracked strings are retained for the rest of the request, so their combined
// length is capped.
const MAX_DEDUPLICATED_IMPORT_STRINGS_SIZE = 32768;

// Bundler metadata is two or three levels deep. The bound is only there so a
// cycle ends up in stringify itself, which throws its own error for it.
const MAX_IMPORT_METADATA_DEPTH = 16;
const NOT_PLAIN_IMPORT_METADATA = {};
interface Reference {}
type ReactClientReference = Reference & ReactClientValue;
const doNotLimit: WeakSet<Reference> = __DEV__ ? new WeakSet() : (null as any);
const CONSTRUCTOR_MARKER: symbol = __DEV__ ? Symbol() : (null as any);
let debugModelRoot: mixed = null;
let debugNoOutline: mixed = null;
let currentRequest: null | Request = null;

const OPENING = 10;
const OPEN = 11;
const ABORTING = 12;
const CLOSING = 13;
const CLOSED = 14;
const NEXT_TWO_CHUNKS_ARE_ATOMIC: symbol = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const ABORTED = 3;
const ERRORED = 4;
const RENDERING = 6;

type DeferredDebugStore = {
  retained: Map<number, ReactClientValue>,
  existing: Map<ReactClientValue, number>,
};

type Task = {
  id: number,
  model: ReactClientValue,
  status: 0 | 1 | 3 | 4 | 6,
  returnedTupleReference: null | string,
  time: number, // DEV-only
  debugPendingTime: null | number, // DEV-only
  debugOwner: null | ReactComponentInfo, // DEV-only
  debugStack: null | Error, // DEV-only
  debugTask: null | ConsoleTask, // DEV-only
  environmentName: string, // DEV-only
};
export type InputSequenceEntry = {done?: boolean, value: ReactClientValue};
export type InputSequenceReader = {
  progress: InputSequenceEntry => void,
  error: (mixed, void | ErrorReference) => void,
  rejectEntry: (mixed, void | ErrorReference) => void,
  halt: () => void,
};

export type InputAsyncIterableReader = {
  enqueue: (Promise<ReactClientValue>, boolean) => void,
  close: () => void,
  error: (mixed, void | ErrorReference) => void,
  halt: () => void,
};

export type InputThenableReader = {
  debug?: ReactDebugInfoEntry => void,
  halt: () => void,
  resolve: ReactClientValue => void,
  reject: (mixed, void | ErrorReference) => void,
};

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | Array<ReactClientValue>
  | ReactClientObject;
type ModelParent = ReactClientObject | $ReadOnlyArray<ReactClientValue>;

export type Input = {
  +root: ResultModel<ReactClientValue>,
  debugStartTime?: number, // DEV-only
  getReadableStream: Object => void | {
    isByteStream: boolean,
    subscribe: InputSequenceReader => () => void,
  },
  getAsyncIterable: Object => void | {
    isIterator: boolean,
    subscribe: InputAsyncIterableReader => () => void,
  },
  getIteratorEntries: Object => void | $ReadOnlyArray<mixed>,
  temporaryReferences: void | TemporaryReferenceSet,
  getServerReference: Object => void | ServerReferenceMetadata,
  getValueReference: Object => void | ModelReference,
  getModelInfo: Object => number,
  getJSONWorkCredit: () => number,
  getErrorInfo: Error => void | ReactErrorInfoDev,
  getCollectionEntries: Object => void | ResultModel<Array<any>>,
  subscribe: ({
    hint: (HintCode, HintModel<any>) => void,
    console?: ConsoleEntry => void, // DEV-only
    complete: () => void,
  }) => () => void,
  subscribeToThenable: (
    Thenable<ReactClientValue>,
    InputThenableReader,
  ) => () => void,
};
export type Request = {
  input: null | Input,
  destination: null | Destination,
  status: 10 | 11 | 12 | 13 | 14,
  abortController: AbortController,
  fatalError: mixed,
  completedRegularChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >,
  pendingChunks: number,
  jsonWorkSpent: number,
  nextChunkId: number,
  abortableTasks: Set<Task>,
  pingedTasks: Array<Task>,
  completedHintChunks: Array<Chunk>,
  flushScheduled: boolean,
  bundlerConfig: ClientManifest,
  writtenClientReferences: Map<ClientReferenceKey, number>,
  writtenImportStrings: Map<string, string>,
  writtenImportStringsSize: number,
  writtenServerReferences: Map<ServerReference<any>, number>,
  temporaryReferences: void | TemporaryReferenceSet,
  completedImportChunks: Array<Chunk>,
  writtenModels: WeakMap<Object, number>,
  writtenObjects: WeakMap<Object, string>,
  inputSubscriptions: Set<() => void>,
  writtenSymbols: Map<symbol, number>,
  writtenErrors: WeakMap<ErrorReference, number>,
  completedErrorChunks: Array<Chunk>,
  onError: mixed => ?string,
  environmentName: () => string, // DEV-only
  filterStackFrame: (string, string, number, number) => boolean, // DEV-only
  taintCleanupQueue: Array<string | bigint>,
  writtenDebugObjects: WeakMap<Reference, string>, // DEV-only
  deferredDebugObjects: null | DeferredDebugStore, // DEV-only
  debugDestination: null | Destination, // DEV-only
  pendingDebugChunks: number, // DEV-only
  completedDebugChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >, // DEV-only
  timeOrigin: number, // DEV-only
  abortTime: number, // DEV-only
};

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
  // Since stacks can be quite large and we pass a lot of them, we filter them out eagerly
  // to save bandwidth even in DEV. We'll also replay these stacks on the client so by
  // stripping them early we avoid that overhead. Otherwise we'd normally just rely on
  // the DevTools or framework's ignore lists to filter them out.
  const filterStackFrame = request.filterStackFrame;
  const filteredStack: ReactStackTrace = [];
  for (let i = 0; i < stack.length; i++) {
    const callsite = stack[i];
    const functionName = callsite[0];
    const url = devirtualizeURL(callsite[1]);
    const lineNumber = callsite[2];
    const columnNumber = callsite[3];
    if (filterStackFrame(url, functionName, lineNumber, columnNumber)) {
      // Use a clone because the Flight protocol isn't yet resilient to deduping
      // objects in the debug info. TODO: Support deduping stacks.
      const clone: ReactCallSite = callsite.slice(0) as any;
      clone[1] = url;
      filteredStack.push(clone);
    }
  }
  return filteredStack;
}

function RequestInstance(
  this: any,
  input: Input,
  bundlerConfig: ClientManifest,
  onError: void | (mixed => ?string),
  temporaryReferences: void | TemporaryReferenceSet,
  debugStartTime: void | number,
  environmentName: void | string | (() => string),
  filterStackFrame: void | ((string, string) => boolean),
  keepDebugAlive: boolean,
) {
  const cleanupQueue: Array<string | bigint> = [];
  if (enableTaint) {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  this.taintCleanupQueue = cleanupQueue;
  this.temporaryReferences = input.temporaryReferences || temporaryReferences;
  this.writtenServerReferences = new Map();
  this.input = input;
  this.abortController = new AbortController();
  this.destination = null;
  this.status = OPENING;
  this.fatalError = null;
  this.completedRegularChunks = [];
  this.completedHintChunks = [];
  this.flushScheduled = false;
  this.bundlerConfig = bundlerConfig;
  this.writtenClientReferences = new Map();
  this.writtenImportStrings = new Map();
  this.writtenImportStringsSize = 0;
  this.completedImportChunks = [];
  this.writtenModels = new WeakMap();
  this.writtenObjects = new WeakMap();
  this.inputSubscriptions = new Set();
  this.writtenSymbols = new Map();
  this.writtenErrors = new WeakMap();
  this.completedErrorChunks = [];
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  if (__DEV__) {
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
  this.pendingChunks = 0;
  this.jsonWorkSpent = 0;
  this.nextChunkId = 0;
  this.abortableTasks = new Set();
  this.pingedTasks = [];
  if (__DEV__) {
    this.debugDestination = null;
    this.deferredDebugObjects = keepDebugAlive
      ? {retained: new Map(), existing: new Map()}
      : null;
    this.writtenDebugObjects = new WeakMap();
    this.pendingDebugChunks = 0;
    this.completedDebugChunks = [];
    if (debugStartTime === undefined) {
      debugStartTime = input.debugStartTime;
    }
    this.timeOrigin = enableProfilerTimer
      ? typeof debugStartTime === 'number'
        ? debugStartTime -
          // $FlowFixMe[prop-missing]
          performance.timeOrigin
        : performance.now()
      : 0;
    this.abortTime = -0.0;
    if (enableProfilerTimer) {
      emitTimeOriginChunk(
        this,
        this.timeOrigin +
          // $FlowFixMe[prop-missing]
          performance.timeOrigin,
      );
    }
  }
  const rootTask = createTask(
    this,
    null,
    this.abortableTasks,
    __DEV__ ? this.timeOrigin : 0,
  );
  subscribeToInput(this, input, rootTask);
}

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

export function createRequest(
  input: Input,
  bundlerConfig: ClientManifest,
  onError?: mixed => ?string,
  temporaryReferences?: TemporaryReferenceSet,
  debugStartTime?: number,
  environmentName?: string | (() => string),
  filterStackFrame?: (string, string) => boolean,
  keepDebugAlive: boolean = false,
): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(
    input,
    bundlerConfig,
    onError,
    temporaryReferences,
    debugStartTime,
    environmentName,
    filterStackFrame,
    keepDebugAlive,
  );
}

function renderClientElement(
  request: Request,
  task: Task,
  type: any,
  key: ReactKey,
  props: ReactClientValue,
  validated: number, // DEV-only
): ReactJSONValue {
  let debugOwner = null;
  let debugStack = null;
  if (__DEV__) {
    debugOwner = task.debugOwner;
    if (debugOwner !== null) {
      // Ensure we outline this owner if it is the first time we see it.
      // So that we can refer to it directly.
      outlineComponentInfo(request, debugOwner);
    }
    if (task.debugStack !== null) {
      // Outline the debug stack so that we write to the completedDebugChunks instead.
      debugStack = filterStackTrace(
        request,
        parseStackTrace(task.debugStack, 1),
      );
      const id = outlineDebugModel(
        request,
        {objectLimit: debugStack.length * 2 + 1},
        debugStack,
      );
      // We also store this in the main dedupe set so that it can be referenced by inline React Elements.
      request.writtenObjects.set(debugStack, serializeByValueID(id));
    }
  }
  const element = __DEV__
    ? [REACT_ELEMENT_TYPE, type, key, props, debugOwner, debugStack, validated]
    : [REACT_ELEMENT_TYPE, type, key, props];
  return element;
}

function serializeNumber(number: number): string | number {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}

function serializeUndefined(): string {
  return '$undefined';
}

let modelRoot: null | ReactClientValue = null;
// Approximate string length of the currently serializing row.
// Used to power outlining heuristics.
let serializedSize = 0;
const MAX_ROW_SIZE = 3200;

function deferTask(request: Request, task: Task): ReactJSONValue {
  // The item is scheduled to be serialized after its parent in the stream.
  const newTask = createTask(
    request,
    task.model, // the currently rendering element
    request.abortableTasks,
    __DEV__ ? task.time : 0,
    __DEV__ ? task.debugOwner : null,
    __DEV__ ? task.debugStack : null,
    __DEV__ ? task.debugTask : null,
  );
  if (typeof task.model === 'object' && task.model !== null) {
    // This defining occurrence moves to the new row; aliases must follow it.
    request.writtenObjects.set(task.model, serializeByValueID(newTask.id));
  }

  pingTask(request, newTask);
  return serializeLazyID(newTask.id);
}

function outlineModel(request: Request, value: ReactClientValue): number {
  const task = createTask(
    request,
    value,
    request.abortableTasks,
    __DEV__ ? performance.now() : 0,
  );
  if (value !== null && typeof value === 'object') {
    request.writtenObjects.set(value, serializeByValueID(task.id));
  }
  retryTask(request, task);
  return task.id;
}

function renderObjectReference(
  request: Request,
  task: Task,
  parent: ModelParent,
  key: string,
  value: Object,
  parentReference?: null | string,
): null | string {
  const writtenObjects = request.writtenObjects;
  const existingReference = writtenObjects.get(value);
  if (existingReference !== undefined) {
    if (modelRoot === value) {
      if (existingReference !== serializeByValueID(task.id)) {
        return existingReference;
      }
      modelRoot = null;
    } else {
      return existingReference;
    }
  } else if (key.indexOf(':') !== -1) {
    return serializeByValueID(outlineModel(request, value));
  } else {
    if (parentReference === undefined) {
      parentReference = writtenObjects.get(parent);
    }
    if (parentReference != null) {
      let propertyName = key;
      if (isArray(parent) && parent[0] === REACT_ELEMENT_TYPE) {
        switch (key) {
          case '1':
            propertyName = 'type';
            break;
          case '2':
            propertyName = 'key';
            break;
          case '3':
            propertyName = 'props';
            break;
          case '4':
            propertyName = '_owner';
            break;
        }
      }
      writtenObjects.set(value, parentReference + ':' + propertyName);
    }
  }
  return null;
}

function getStructuralReferenceAddress(
  request: Request,
  task: Task,
  reference: ModelReference,
): string {
  const root = reference.root;
  if (root.status === 'fulfilled') {
    const value: mixed = root.value;
    if (value !== null && typeof value === 'object') {
      const address = request.writtenObjects.get(value);
      if (address !== undefined) {
        return address;
      }
    }
  }
  return serializeByValueID(serializeThenable(request, task, root));
}

function renderModelDestructive(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  parentReference?: null | string,
  modelInfo?: number,
): ReactJSONValue {
  task.model = value;
  if (__DEV__) {
    if (parentPropertyName === '__proto__') {
      callWithDebugContextInDEV(request, task, () => {
        console.error(
          'Expected not to serialize an object with own property `__proto__`. When parsed this property will be omitted.%s',
          describeObjectForErrorMessage(parent, parentPropertyName),
        );
      });
    }
  }
  if (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    isClientReference(value)
  ) {
    const clientReference: ClientReference<any> = value as any;
    return serializeClientReference(
      request,
      task,
      parent,
      parentPropertyName,
      clientReference,
    );
  }
  if (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function')
  ) {
    if (
      (typeof value === 'function' || enableFlightObjectReferences) &&
      isServerReference(value)
    ) {
      return serializeServerReference(request, value as any);
    }
    if (request.temporaryReferences !== undefined) {
      const reference = resolveTemporaryReference(
        request.temporaryReferences,
        value as any,
      );
      if (reference !== undefined) {
        return '$T' + reference;
      }
    }
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'object') {
    if (enableTaint) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
    const input = request.input;
    const reference =
      input === null ? undefined : input.getValueReference(value);
    if (reference !== undefined) {
      let name = getStructuralReferenceAddress(request, task, reference);
      const path = [];
      let location = reference;
      let ancestor = location.parent;
      while (ancestor !== null) {
        path.push(location.key);
        location = ancestor;
        ancestor = location.parent;
      }
      for (let i = path.length - 1; i >= 0; i--) {
        name += ':' + path[i];
      }
      return name;
    }
    const kind =
      (modelInfo === undefined
        ? input === null
          ? 0
          : input.getModelInfo(value)
        : modelInfo) & MODEL_KIND_MASK;
    if (
      kind === MODEL_OBJECT ||
      kind === MODEL_ARRAY ||
      kind === MODEL_ELEMENT ||
      (kind === 0 &&
        (isArray(value) ||
          (value as any).$$typeof === REACT_ELEMENT_TYPE ||
          value instanceof Map ||
          value instanceof Set ||
          value instanceof Error ||
          (typeof FormData === 'function' && value instanceof FormData) ||
          (typeof Blob === 'function' && value instanceof Blob) ||
          value instanceof ArrayBuffer ||
          ArrayBuffer.isView(value) ||
          (input !== null &&
            (input.getReadableStream(value) !== undefined ||
              input.getAsyncIterable(value) !== undefined ||
              input.getIteratorEntries(value) !== undefined)) ||
          getPrototypeOf(value) === ObjectPrototype))
    ) {
      const objectReference = renderObjectReference(
        request,
        task,
        parent,
        parentPropertyName,
        value,
        parentReference,
      );
      if (objectReference !== null) {
        return objectReference;
      }
    }
    if (kind === MODEL_OBJECT || kind === MODEL_ARRAY) {
      return value as any;
    }
    if ((value as any).$$typeof === REACT_LAZY_TYPE) {
      const lazy: LazyComponent<ReactClientValue, any> = value as any;
      return serializeLazyID(serializeThenable(request, task, lazy._payload));
    }
    if (typeof (value as any).then === 'function') {
      const id = serializeThenable(request, task, value as any);
      return enableFlightWeakThenables &&
        (value as any).status === 'pending_weak'
        ? serializeWeakPromiseID(id)
        : serializePromiseID(id);
    }
    if (value instanceof Date) {
      return serializeDate(value);
    }
    if (
      kind === MODEL_ELEMENT ||
      (value as any).$$typeof === REACT_ELEMENT_TYPE
    ) {
      const element: ReactElement = value as any;
      if (__DEV__) {
        task.debugOwner = element._owner;
        task.debugStack = element._debugStack;
        task.debugTask = element._debugTask;
      }
      if (serializedSize > MAX_ROW_SIZE) {
        return deferTask(request, task);
      }
      const tuple = renderClientElement(
        request,
        task,
        element.type,
        element.key,
        element.props,
        __DEV__ ? element._store.validated : 0,
      );
      const elementReference = request.writtenObjects.get(value);
      if (!__DEV__) {
        task.returnedTupleReference =
          elementReference === undefined ? null : elementReference;
      } else if (elementReference !== undefined) {
        request.writtenObjects.set(tuple as any, elementReference);
      }
      return tuple;
    }
    if (value instanceof Map) {
      return serializeMap(request, value);
    }
    if (value instanceof Set) {
      return serializeSet(request, value);
    }
    if (value instanceof ArrayBuffer) {
      return serializeTypedArray(request, 'A', new Uint8Array(value));
    }
    if (value instanceof Int8Array) {
      // char
      return serializeTypedArray(request, 'O', value);
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      return serializeTypedArray(request, 'o', value);
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      return serializeTypedArray(request, 'U', value);
    }
    if (value instanceof Int16Array) {
      // sort
      return serializeTypedArray(request, 'S', value);
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      return serializeTypedArray(request, 's', value);
    }
    if (value instanceof Int32Array) {
      // long
      return serializeTypedArray(request, 'L', value);
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      return serializeTypedArray(request, 'l', value);
    }
    if (value instanceof Float32Array) {
      // float
      return serializeTypedArray(request, 'G', value);
    }
    if (value instanceof Float64Array) {
      // double
      return serializeTypedArray(request, 'g', value);
    }
    if (value instanceof BigInt64Array) {
      // number
      return serializeTypedArray(request, 'M', value);
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      return serializeTypedArray(request, 'm', value);
    }
    if (value instanceof DataView) {
      return serializeTypedArray(request, 'V', value);
    }
    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeFormData(request, value);
    }
    if (typeof Blob === 'function' && value instanceof Blob) {
      return serializeBlob(request, value);
    }
    if (value instanceof Error) {
      return serializeErrorValue(request, value);
    }
    if (isArray(value)) {
      return value as any;
    }
    const iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      const entries =
        input === null ? undefined : input.getIteratorEntries(value);
      if (entries === undefined) {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('A Result must record iterators before serialization.');
      }
      return serializeIterator(request, entries as any);
    }
    if (input !== null && input.getReadableStream(value) !== undefined) {
      return serializeReadableStream(request, task, value);
    }
    if (input !== null && input.getAsyncIterable(value) !== undefined) {
      return serializeAsyncIterable(request, task, value);
    }
    return value as any;
  }
  if (typeof value === 'string') {
    if (enableTaint) {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    serializedSize += value.length;
    // $FlowFixMe[invalid-compare]
    if (value.length >= 1024 && byteLengthOfChunk !== null) {
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeLargeTextString(request, value);
    }
    return escapeStringValue(value);
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  if (typeof value === 'undefined') {
    return serializeUndefined();
  }
  if (
    value === REACT_ELEMENT_TYPE &&
    parentPropertyName === '0' &&
    isArray(parent)
  ) {
    return '$';
  }
  if (typeof value === 'symbol') {
    const writtenSymbols = request.writtenSymbols;
    const existingId = writtenSymbols.get(value);
    if (existingId !== undefined) {
      return serializeByValueID(existingId);
    }
    // $FlowFixMe[incompatible-type] `description` might be undefined
    const name: string = value.description;
    request.pendingChunks++;
    const symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    writtenSymbols.set(value, symbolId);
    return serializeByValueID(symbolId);
  }
  if (typeof value === 'bigint') {
    if (enableTaint) {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    return serializeBigInt(value);
  }
  // eslint-disable-next-line react-internal/prod-error-codes
  throw new Error('A Result must validate models before serialization.');
}

function patchConsole(consoleInst: typeof console, methodName: string) {
  const descriptor = Object.getOwnPropertyDescriptor(consoleInst, methodName);
  if (
    descriptor &&
    (descriptor.configurable || descriptor.writable) &&
    typeof descriptor.value === 'function'
  ) {
    const originalMethod = descriptor.value;
    const originalName = Object.getOwnPropertyDescriptor(
      // $FlowFixMe[incompatible-type]: We should be able to get descriptors from any function.
      originalMethod,
      'name',
    );
    const wrapperMethod = function (this: typeof console) {
      const request = currentRequest;
      if (methodName === 'assert' && arguments[0]) {
        // assert doesn't emit anything unless first argument is falsy so we can skip it.
      } else if (request !== null) {
        // Extract the stack. Not all console logs print the full stack but they have at
        // least the line it was called from. We could optimize transfer by keeping just
        // one stack frame but keeping it simple for now and include all frames.
        const stack = filterStackTrace(
          request,
          parseStackTracePrivate(new Error('react-stack-top-frame'), 1) || [],
        );
        request.pendingDebugChunks++;
        const owner: null | ReactComponentInfo = resolveOwner();
        const args = Array.from(arguments);
        // Extract the env if this is a console log that was replayed from another env.
        let env = unbadgeConsole(methodName, args);
        if (env === null) {
          // Otherwise add the current environment.
          env = (0, request.environmentName)();
        }

        emitConsoleChunk(request, methodName, owner, env, stack, args);
      }
      // $FlowFixMe[incompatible-call]
      // $FlowFixMe[incompatible-type]
      return originalMethod.apply(this, arguments);
    };
    if (originalName) {
      Object.defineProperty(
        wrapperMethod,
        // $FlowFixMe[cannot-write] yes it is
        'name',
        originalName,
      );
    }
    Object.defineProperty(consoleInst, methodName, {
      value: wrapperMethod,
    });
  }
}

// $FlowFixMe[invalid-compare]
if (__DEV__ && typeof console === 'object' && console !== null) {
  // Instrument console to capture logs for replaying on the client.
  patchConsole(console, 'assert');
  patchConsole(console, 'debug');
  patchConsole(console, 'dir');
  patchConsole(console, 'dirxml');
  patchConsole(console, 'error');
  patchConsole(console, 'group');
  patchConsole(console, 'groupCollapsed');
  patchConsole(console, 'groupEnd');
  patchConsole(console, 'info');
  patchConsole(console, 'log');
  patchConsole(console, 'table');
  patchConsole(console, 'trace');
  patchConsole(console, 'warn');
}

function renderModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  key: string,
  value: ReactClientValue,
  parentReference?: null | string,
  modelInfo?: number,
): ReactJSONValue {
  // First time we're serializing the key, we should add it to the size.
  serializedSize += key.length;

  try {
    return renderModelDestructive(
      request,
      task,
      parent,
      key,
      value,
      parentReference,
      modelInfo,
    );
  } catch (thrownValue) {
    const model = task.model;
    const kind =
      model !== null && typeof model === 'object' && request.input !== null
        ? request.input.getModelInfo(model) & MODEL_KIND_MASK
        : 0;
    const wasReactNode =
      typeof model === 'object' &&
      model !== null &&
      (kind === MODEL_ELEMENT ||
        (kind === 0 &&
          ((model as any).$$typeof === REACT_ELEMENT_TYPE ||
            (model as any).$$typeof === REACT_LAZY_TYPE)));
    if (request.status === ABORTING) {
      task.status = ABORTED;
      const errorId = request.fatalError as any;
      return wasReactNode
        ? serializeLazyID(errorId)
        : serializeByValueID(errorId);
    }
    request.pendingChunks++;
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, thrownValue, task);
    emitErrorChunk(request, errorId, digest, thrownValue);
    return wasReactNode
      ? serializeLazyID(errorId)
      : serializeByValueID(errorId);
  }
}

function serializeDate(date: Date): string {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  const dateJSON = date.toJSON();
  if (enableTaint && typeof dateJSON === 'string') {
    const tainted = TaintRegistryValues.get(dateJSON);
    if (tainted !== undefined) {
      throwTaintViolation(tainted.message);
    }
  }
  return '$D' + dateJSON;
}

function serializeBigInt(n: bigint): string {
  return '$n' + n.toString(10);
}

function resolveModel(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
  rowRoot: boolean = false,
  parentReference?: null | string,
): ReactJSONValue {
  const input = request.input;
  const modelInfo =
    value !== null && typeof value === 'object' && input !== null
      ? input.getModelInfo(value)
      : 0;
  const rendered = renderModel(
    request,
    task,
    parent,
    parentPropertyName,
    value,
    parentReference,
    modelInfo,
  );
  if (rendered === null || typeof rendered !== 'object') {
    return rendered;
  }
  // A pure row has no outlining decisions. After the threshold, omitted size
  // cannot change its truth in this traversal, so a skip adds no serializedSize.
  // Directly projected objects can acquire object taints before encoding.
  // A certificate cannot replace live nested taint checks when taint is enabled.
  if (
    !__DEV__ &&
    !enableTaint &&
    rendered === value &&
    (rowRoot || serializedSize > MAX_ROW_SIZE) &&
    input !== null
  ) {
    const work = getJSONModelWork(modelInfo);
    if (
      work !== 0 &&
      request.jsonWorkSpent + work <= input.getJSONWorkCredit()
    ) {
      request.jsonWorkSpent += work;
      return rendered;
    }
  }
  if (isArray(rendered)) {
    // In production, only renderClientElement returns an array distinct from its input.
    if (!__DEV__ && rendered !== value) {
      return resolveElementTuple(
        request,
        task,
        rendered,
        task.returnedTupleReference,
      );
    }
    let resolved: null | Array<ReactClientValue> = null;
    for (let i = 0; i < rendered.length; i++) {
      const child = rendered[i];
      const resolvedValue = resolveModel(
        request,
        task,
        rendered,
        '' + i,
        child,
      );
      if (resolved === null && resolvedValue !== child) {
        resolved = i === 0 ? [] : rendered.slice(0, i);
      }
      if (resolved !== null) {
        resolved[i] = resolvedValue;
      }
    }
    return resolved === null ? rendered : resolved;
  }
  let resolved: null | {[key: string]: ReactClientValue} = null;
  for (const key in rendered) {
    if (hasOwnProperty.call(rendered, key)) {
      const child = rendered[key];
      const resolvedValue = resolveModel(request, task, rendered, key, child);
      if (resolved === null && resolvedValue !== child) {
        resolved = {} as {[key: string]: ReactClientValue};
        for (const previousKey in rendered) {
          if (previousKey === key) {
            break;
          }
          if (hasOwnProperty.call(rendered, previousKey)) {
            if (previousKey === '__proto__') {
              Object.defineProperty(resolved, previousKey, {
                value: rendered[previousKey],
                enumerable: true,
                writable: true,
                configurable: true,
              });
            } else {
              resolved[previousKey] = rendered[previousKey];
            }
          }
        }
      }
      if (resolved !== null) {
        if (key === '__proto__') {
          Object.defineProperty(resolved, key, {
            value: resolvedValue,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        } else {
          resolved[key] = resolvedValue;
        }
      }
    }
  }
  return resolved === null ? rendered : resolved;
}

function resolveElementTuple(
  request: Request,
  task: Task,
  tuple: Array<ReactClientValue>,
  tupleReference: null | string,
): Array<ReactClientValue> {
  // The fresh tuple is private. Keep its element marker intact until all fields
  // have used it to classify client types and lower type/props property paths.
  const marker = resolveModel(
    request,
    task,
    tuple,
    '0',
    tuple[0],
    false,
    tupleReference,
  );
  const type = resolveModel(
    request,
    task,
    tuple,
    '1',
    tuple[1],
    false,
    tupleReference,
  );
  const key = resolveModel(
    request,
    task,
    tuple,
    '2',
    tuple[2],
    false,
    tupleReference,
  );
  const props = resolveModel(
    request,
    task,
    tuple,
    '3',
    tuple[3],
    false,
    tupleReference,
  );
  tuple[0] = marker;
  tuple[1] = type;
  tuple[2] = key;
  tuple[3] = props;
  return tuple;
}

function serializeLargeTextString(request: Request, text: string): string {
  request.pendingChunks++;
  const textId = request.nextChunkId++;
  emitTextChunk(request, textId, text);
  return serializeByValueID(textId);
}

function emitTextChunk(
  request: Request,
  id: number,
  text: string,
  debug: boolean = false,
): void {
  // $FlowFixMe[invalid-compare]
  if (byteLengthOfChunk === null) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'Existence of byteLengthOfChunk should have already been checked. This is a bug in React.',
    );
  }
  if (debug) {
    request.pendingDebugChunks++;
  } else {
    request.pendingChunks++; // Extra chunk for the header.
  }
  const textChunk = stringToChunk(text);
  const binaryLength = byteLengthOfChunk(textChunk);
  const row = id.toString(16) + ':T' + binaryLength.toString(16) + ',';
  const headerChunk = stringToChunk(row);
  // See emitTypedArrayChunk for why the pair is preceded by a sentinel.
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(
      NEXT_TWO_CHUNKS_ARE_ATOMIC,
      headerChunk,
      textChunk,
    );
  } else {
    request.completedRegularChunks.push(
      NEXT_TWO_CHUNKS_ARE_ATOMIC,
      headerChunk,
      textChunk,
    );
  }
}

function serializeEval(source: string): string {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'serializeEval should never be called in production mode. This is a bug in React.',
    );
  }
  return '$E' + source;
}

function renderDebugModel(
  request: Request,
  counter: {objectLimit: number},
  parent:
    | {+[propertyName: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  parentPropertyName: string,
  value: ReactClientValue,
): ReactJSONValue {
  if (value === null) {
    return null;
  }

  // Special Symbol, that's very common.
  if (value === REACT_ELEMENT_TYPE) {
    return '$';
  }

  if (typeof value === 'object') {
    if (isClientReference(value)) {
      // We actually have this value on the client so we could import it.
      // This might be confusing though because on the Server it won't actually
      // be this value, so if you're debugging client references maybe you'd be
      // better with a place holder.
      return serializeDebugClientReference(
        request,
        parent,
        parentPropertyName,
        value as any,
      );
    }
    if (value.$$typeof === CONSTRUCTOR_MARKER) {
      const constructor: Function = (value as any).constructor;
      let ref = request.writtenDebugObjects.get(constructor);
      if (ref === undefined) {
        const id = outlineDebugModel(request, counter, constructor);
        ref = serializeByValueID(id);
      }
      return '$P' + ref.slice(1);
    }

    if (request.temporaryReferences !== undefined) {
      const tempRef = resolveTemporaryReference(
        request.temporaryReferences,
        value,
      );
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }

    const writtenDebugObjects = request.writtenDebugObjects;
    const existingDebugReference = writtenDebugObjects.get(value);
    if (existingDebugReference !== undefined) {
      if (debugModelRoot === value) {
        // This is the ID we're currently emitting so we need to write it
        // once but if we discover it again, we refer to it by id.
        debugModelRoot = null;
      } else {
        // We've already emitted this as a debug object. We favor that version if available.
        return existingDebugReference;
      }
    } else if (parentPropertyName.indexOf(':') === -1) {
      // TODO: If the property name contains a colon, we don't dedupe. Escape instead.
      const parentReference = writtenDebugObjects.get(parent);
      if (parentReference !== undefined) {
        // If the parent has a reference, we can refer to this object indirectly
        // through the property name inside that parent.
        if (counter.objectLimit <= 0 && !doNotLimit.has(value)) {
          // If we are going to defer this, don't dedupe it since then we'd dedupe it to be
          // deferred in future reference.
          return serializeDeferredObject(request, value);
        }

        let propertyName = parentPropertyName;
        if (isArray(parent) && parent[0] === REACT_ELEMENT_TYPE) {
          // For elements, we've converted it to an array but we'll have converted
          // it back to an element before we read the references so the property
          // needs to be aliased.
          switch (parentPropertyName) {
            case '1':
              propertyName = 'type';
              break;
            case '2':
              propertyName = 'key';
              break;
            case '3':
              propertyName = 'props';
              break;
            case '4':
              propertyName = '_owner';
              break;
          }
        }
        writtenDebugObjects.set(value, parentReference + ':' + propertyName);
      } else if (debugNoOutline !== value) {
        // If this isn't the root object (like meta data) and we don't have an id for it, outline
        // it so that we can dedupe it by reference later.
        // $FlowFixMe[method-unbinding]
        if (typeof value.then === 'function') {
          // If this is a Promise we're going to assign it an external ID anyway which can be deduped.
          const thenable: Thenable<any> = value as any;
          return serializeDebugThenable(request, counter, thenable);
        } else {
          const outlinedId = outlineDebugModel(request, counter, value);
          return serializeByValueID(outlinedId);
        }
      }
    }

    const writtenObjects = request.writtenObjects;
    const existingReference = writtenObjects.get(value);
    if (existingReference !== undefined) {
      // We've already emitted this as a real object, so we can refer to that by its existing reference.
      // This might be slightly different serialization than what renderDebugModel would've produced.
      return existingReference;
    }

    if (counter.objectLimit <= 0 && !doNotLimit.has(value)) {
      // We've reached our max number of objects to serialize across the wire so we serialize this
      // as a marker so that the client can error or lazy load this when accessed by the console.
      return serializeDeferredObject(request, value);
    }

    counter.objectLimit--;

    const deferredDebugObjects = request.deferredDebugObjects;
    if (deferredDebugObjects !== null) {
      const deferredId = deferredDebugObjects.existing.get(value);
      // We earlier deferred this same object. We're now going to eagerly emit it so let's emit it
      // at the same ID that we already used to refer to it.
      if (deferredId !== undefined) {
        deferredDebugObjects.existing.delete(value);
        deferredDebugObjects.retained.delete(deferredId);
        emitOutlinedDebugModelChunk(request, deferredId, counter, value);
        return serializeByValueID(deferredId);
      }
    }

    switch ((value as any).$$typeof) {
      case REACT_ELEMENT_TYPE: {
        const element: ReactElement = value as any;

        if (element._owner != null) {
          outlineComponentInfo(request, element._owner);
        }
        if (typeof element.type === 'object' && element.type !== null) {
          // If the type is an object it can get cut off which shouldn't happen here.
          doNotLimit.add(element.type);
        }
        if (typeof element.key === 'object' && element.key !== null) {
          // This should never happen but just in case.
          doNotLimit.add(element.key);
        }
        doNotLimit.add(element.props);
        if (element._owner !== null) {
          doNotLimit.add(element._owner);
        }

        let debugStack: null | ReactStackTrace = null;
        if (element._debugStack != null) {
          // Outline the debug stack so that it doesn't get cut off.
          debugStack = filterStackTrace(
            request,
            parseStackTrace(element._debugStack, 1),
          );
          doNotLimit.add(debugStack);
          for (let i = 0; i < debugStack.length; i++) {
            doNotLimit.add(debugStack[i]);
          }
        }
        return [
          REACT_ELEMENT_TYPE,
          element.type,
          element.key,
          element.props,
          element._owner,
          debugStack,
          element._store.validated,
        ];
      }
      case REACT_LAZY_TYPE: {
        // To avoid actually initializing a lazy causing a side-effect, we make
        // some assumptions about the structure of the payload even though
        // that's not really part of the contract. In practice, this is really
        // just coming from React.lazy helper or Flight.
        const lazy: LazyComponent<any, any> = value as any;
        const payload = lazy._payload;

        if (payload !== null && typeof payload === 'object') {
          // React.lazy constructor
          switch (payload._status) {
            case -1 /* Uninitialized */:
            case 0 /* Pending */:
              break;
            case 1 /* Resolved */: {
              const id = outlineDebugModel(request, counter, payload._result);
              return serializeLazyID(id);
            }
            case 2 /* Rejected */: {
              // We don't log these errors since they didn't actually throw into
              // Flight.
              const digest = '';
              const id = request.nextChunkId++;
              emitErrorChunk(request, id, digest, payload._result, true, null);
              return serializeLazyID(id);
            }
          }

          // React Flight
          switch (payload.status) {
            case 'pending':
            case 'blocked':
            case 'resolved_model':
              // The value is an uninitialized model from the Flight client.
              // It's not very useful to emit that.
              break;
            case 'resolved_module':
              // The value is client reference metadata from the Flight client.
              // It's likely for SSR, so we choose not to emit it.
              break;
            case 'fulfilled': {
              const id = outlineDebugModel(request, counter, payload.value);
              return serializeLazyID(id);
            }
            case 'rejected': {
              // We don't log these errors since they didn't actually throw into
              // Flight.
              const digest = '';
              const id = request.nextChunkId++;
              emitErrorChunk(request, id, digest, payload.reason, true, null);
              return serializeLazyID(id);
            }
          }
        }

        // We couldn't emit a resolved or rejected value synchronously. For now,
        // we emit this as a halted chunk. TODO: We could maybe also handle
        // pending lazy debug models like we do in serializeDebugThenable,
        // if/when we determine that it's worth the added complexity.
        request.pendingDebugChunks++;
        const id = request.nextChunkId++;
        emitDebugHaltChunk(request, id);
        return serializeLazyID(id);
      }
    }

    // $FlowFixMe[method-unbinding]
    if (typeof value.then === 'function') {
      const thenable: Thenable<any> = value as any;
      return serializeDebugThenable(request, counter, thenable);
    }

    if (isArray(value)) {
      if (value.length > 200 && !doNotLimit.has(value)) {
        // Defer large arrays. They're heavy to serialize.
        // TODO: Consider doing the same for objects with many properties too.
        return serializeDeferredObject(request, value);
      }
      return value;
    }

    if (value instanceof Date) {
      return serializeDate(value);
    }
    if (value instanceof Map) {
      return serializeDebugMap(request, counter, value);
    }
    if (value instanceof Set) {
      return serializeDebugSet(request, counter, value);
    }
    // TODO: FormData is not available in old Node. Remove the typeof later.
    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeDebugFormData(request, value);
    }
    if (value instanceof Error) {
      return serializeDebugErrorValue(request, counter, value);
    }
    if (value instanceof ArrayBuffer) {
      return serializeDebugTypedArray(request, 'A', new Uint8Array(value));
    }
    if (value instanceof Int8Array) {
      // char
      return serializeDebugTypedArray(request, 'O', value);
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      return serializeDebugTypedArray(request, 'o', value);
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      return serializeDebugTypedArray(request, 'U', value);
    }
    if (value instanceof Int16Array) {
      // sort
      return serializeDebugTypedArray(request, 'S', value);
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      return serializeDebugTypedArray(request, 's', value);
    }
    if (value instanceof Int32Array) {
      // long
      return serializeDebugTypedArray(request, 'L', value);
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      return serializeDebugTypedArray(request, 'l', value);
    }
    if (value instanceof Float32Array) {
      // float
      return serializeDebugTypedArray(request, 'G', value);
    }
    if (value instanceof Float64Array) {
      // double
      return serializeDebugTypedArray(request, 'g', value);
    }
    if (value instanceof BigInt64Array) {
      // number
      return serializeDebugTypedArray(request, 'M', value);
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      return serializeDebugTypedArray(request, 'm', value);
    }
    if (value instanceof DataView) {
      return serializeDebugTypedArray(request, 'V', value);
    }
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof Blob === 'function' && value instanceof Blob) {
      return serializeDebugBlob(request, value);
    }

    const iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      return Array.from(value as any);
    }

    const proto = getPrototypeOf(value);
    if (proto !== ObjectPrototype && proto !== null) {
      const object: Object = value;
      const instanceDescription: Object = Object.create(null);
      for (const propName in object) {
        if (hasOwnProperty.call(value, propName) || isGetter(proto, propName)) {
          // We intentionally invoke getters on the prototype to read any enumerable getters.
          instanceDescription[propName] = object[propName];
        }
      }
      const constructor = proto.constructor;
      if (
        typeof constructor === 'function' &&
        constructor.prototype === proto
      ) {
        // This is a simple class shape.
        if (hasOwnProperty.call(object, '') || isGetter(proto, '')) {
          // This object already has an empty property name. Skip encoding its prototype.
        } else {
          instanceDescription[''] = {
            $$typeof: CONSTRUCTOR_MARKER,
            constructor: constructor,
          };
        }
      }
      return instanceDescription;
    }

    // $FlowFixMe[incompatible-type]
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > 1000000) {
      // Reconstructing a multi-megabyte string on the client blocks the main
      // thread for too long. We omit the actual value and send a placeholder
      // instead.
      return (
        'This string of length ' +
        value.length +
        ' has been omitted by React to avoid sending too much data from the ' +
        'server.'
      );
    }
    if (value.length >= 1024) {
      // Large strings are counted towards the object limit.
      if (counter.objectLimit <= 0) {
        // We've reached our max number of objects to serialize across the wire so we serialize this
        // as a marker so that the client can error or lazy load this when accessed by the console.
        return serializeDeferredObject(request, value);
      }
      counter.objectLimit--;
      // For large strings, we encode them outside the JSON payload so that we
      // don't have to double encode and double parse the strings. This can also
      // be more compact in case the string has a lot of escaped characters.
      return serializeDebugLargeTextString(request, value);
    }
    return value[0] === '$' ? '$' + value : value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return serializeNumber(value);
  }

  if (typeof value === 'undefined') {
    return serializeUndefined();
  }

  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeDebugClientReference(
        request,
        parent,
        parentPropertyName,
        value as any,
      );
    }
    if (request.temporaryReferences !== undefined) {
      const tempRef = resolveTemporaryReference(
        request.temporaryReferences,
        value,
      );
      if (tempRef !== undefined) {
        return serializeTemporaryReference(request, tempRef);
      }
    }

    // Serialize the body of the function as an eval so it can be printed.
    const writtenDebugObjects = request.writtenDebugObjects;
    const existingReference = writtenDebugObjects.get(value);
    if (existingReference !== undefined) {
      // We've already emitted this function, so we can
      // just refer to that by its existing reference.
      return existingReference;
    }

    // $FlowFixMe[method-unbinding]
    const functionBody: string = Function.prototype.toString.call(value);

    const name = value.name;
    const serializedValue = serializeEval(
      typeof name === 'string'
        ? 'Object.defineProperty(' +
            functionBody +
            ',"name",{value:' +
            JSON.stringify(name) +
            '})'
        : '(' + functionBody + ')',
    );
    request.pendingDebugChunks++;
    const id = request.nextChunkId++;
    const processedChunk = encodeReferenceChunk(request, id, serializedValue);
    request.completedDebugChunks.push(processedChunk);
    const reference = serializeByValueID(id);
    writtenDebugObjects.set(value, reference);
    return reference;
  }

  if (typeof value === 'symbol') {
    const writtenSymbols = request.writtenSymbols;
    const existingId = writtenSymbols.get(value);
    if (existingId !== undefined) {
      return serializeByValueID(existingId);
    }
    // $FlowFixMe[incompatible-type] `description` might be undefined
    const name: string = value.description;
    // We use the Symbol.for version if it's not a global symbol. Close enough.
    request.pendingChunks++;
    const symbolId = request.nextChunkId++;
    emitSymbolChunk(request, symbolId, name);
    return serializeByValueID(symbolId);
  }

  if (typeof value === 'bigint') {
    return serializeBigInt(value);
  }

  return 'unknown type ' + typeof value;
}

function serializeDebugModel(
  request: Request,
  objectLimit: number,
  model: mixed,
): string {
  const counter = {objectLimit: objectLimit};

  function replacer(
    this:
      | {+[key: string | number]: ReactClientValue}
      | $ReadOnlyArray<ReactClientValue>,
    parentPropertyName: string,
    value: ReactClientValue,
  ): ReactJSONValue {
    try {
      // By-pass toJSON and use the original value.
      // $FlowFixMe[incompatible-use]
      const originalValue = this[parentPropertyName];
      return renderDebugModel(
        request,
        counter,
        this,
        parentPropertyName,
        originalValue,
      );
    } catch (x) {
      return (
        'Unknown Value: React could not send it from the server.\n' + x.message
      );
    }
  }

  const prevNoOutline = debugNoOutline;
  debugNoOutline = model;
  try {
    // $FlowFixMe[incompatible-cast] stringify can return null
    // $FlowFixMe[incompatible-type]
    return stringify(model, replacer) as string;
  } catch (x) {
    // $FlowFixMe[incompatible-cast] stringify can return null
    return stringify(
      'Unknown Value: React could not send it from the server.\n' + x.message,
    ) as string;
  } finally {
    debugNoOutline = prevNoOutline;
  }
}

function emitOutlinedDebugModelChunk(
  request: Request,
  id: number,
  counter: {objectLimit: number},
  model: ReactClientValue,
): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'emitOutlinedDebugModel should never be called in production mode. This is a bug in React.',
    );
  }

  if (typeof model === 'object' && model !== null) {
    // We can't limit outlined values.
    doNotLimit.add(model);
  }

  function replacer(
    this:
      | {+[key: string | number]: ReactClientValue}
      | $ReadOnlyArray<ReactClientValue>,
    parentPropertyName: string,
    value: ReactClientValue,
  ): ReactJSONValue {
    try {
      // By-pass toJSON and use the original value.
      // $FlowFixMe[incompatible-use]
      const originalValue = this[parentPropertyName];
      return renderDebugModel(
        request,
        counter,
        this,
        parentPropertyName,
        originalValue,
      );
    } catch (x) {
      return (
        'Unknown Value: React could not send it from the server.\n' + x.message
      );
    }
  }

  const prevModelRoot = debugModelRoot;
  debugModelRoot = model;
  if (typeof model === 'object' && model !== null) {
    // Future references can refer to this object by id.
    request.writtenDebugObjects.set(model, serializeByValueID(id));
  }
  let json: string;
  try {
    // $FlowFixMe[incompatible-type] stringify can return null
    json = stringify(model, replacer) as string;
  } catch (x) {
    // $FlowFixMe[incompatible-type] stringify can return null
    json = stringify(
      'Unknown Value: React could not send it from the server.\n' + x.message,
    ) as string;
  } finally {
    debugModelRoot = prevModelRoot;
  }

  const row = id.toString(16) + ':' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}

function outlineDebugModel(
  request: Request,
  counter: {objectLimit: number},
  model: ReactClientValue,
): number {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'outlineDebugModel should never be called in production mode. This is a bug in React.',
    );
  }

  const id = request.nextChunkId++;
  request.pendingDebugChunks++;
  emitOutlinedDebugModelChunk(request, id, counter, model);
  return id;
}

function serializeDeferredObject(
  request: Request,
  value: ReactClientReference | string,
): string {
  const deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects !== null) {
    // This client supports a long lived connection. We can assign this object
    // an ID to be lazy loaded later.
    // This keeps the connection alive until we ask for it or release it.
    request.pendingDebugChunks++;
    const id = request.nextChunkId++;
    deferredDebugObjects.existing.set(value, id);
    deferredDebugObjects.retained.set(id, value);
    return '$Y' + id.toString(16);
  }
  return '$Y';
}

function emitModelChunk(request: Request, id: number, json: string): void {
  const row = id.toString(16) + ':' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}

function emitTimingChunk(
  request: Request,
  id: number,
  timestamp: number,
): void {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  request.pendingChunks++;
  const relativeTimestamp = timestamp - request.timeOrigin;
  const json = '{"time":' + relativeTimestamp + '}';
  if (request.debugDestination !== null) {
    // Outline the actual timing information to the debug channel.
    const outlinedId = request.nextChunkId++;
    const debugRow = outlinedId.toString(16) + ':' + json + '\n';
    request.pendingDebugChunks++;
    request.completedDebugChunks.push(stringToChunk(debugRow));
    const row =
      serializeRowHeader('D', id) + '"$' + outlinedId.toString(16) + '"\n';
    request.completedRegularChunks.push(stringToChunk(row));
  } else {
    const row = serializeRowHeader('D', id) + json + '\n';
    request.completedRegularChunks.push(stringToChunk(row));
  }
}

function emitConsoleChunk(
  request: Request,
  methodName: string,
  owner: null | ReactComponentInfo,
  env: string,
  stackTrace: ReactStackTrace,
  args: Array<any>,
): void {
  if (owner != null) {
    outlineComponentInfo(request, owner);
  }
  const payload = [methodName, stackTrace, owner, env];
  // $FlowFixMe[method-unbinding]
  payload.push.apply(payload, args);
  const objectLimit = request.deferredDebugObjects === null ? 500 : 10;
  let json = serializeDebugModel(
    request,
    objectLimit + stackTrace.length,
    payload,
  );
  if (json[0] !== '[') {
    json = serializeDebugModel(request, 10 + stackTrace.length, [
      methodName,
      stackTrace,
      owner,
      env,
      'Unknown Value: React could not send it from the server.',
    ]);
  }
  request.completedDebugChunks.push(stringToChunk(':W' + json + '\n'));
}

function emitTimeOriginChunk(request: Request, timeOrigin: number): void {
  // We emit the time origin once. All ReactTimeInfo timestamps later in the stream
  // are relative to this time origin. This allows for more compact number encoding
  // and lower precision loss.
  request.pendingDebugChunks++;
  const row = ':N' + timeOrigin + '\n';
  const processedChunk = stringToChunk(row);
  // TODO: Move to its own priority queue.
  request.completedDebugChunks.push(processedChunk);
}

function createTask(
  request: Request,
  model: ReactClientValue,
  abortSet: Set<Task>,
  lastTimestamp: number = 0, // DEV-only
  debugOwner: null | ReactComponentInfo = null, // DEV-only
  debugStack: null | Error = null, // DEV-only
  debugTask: null | ConsoleTask = null, // DEV-only
): Task {
  const id = request.nextChunkId++;
  request.pendingChunks++;
  const task: Task = {
    id,
    status: PENDING,
    model,
    returnedTupleReference: null,
  } as Omit<
    Task,
    | 'time'
    | 'debugPendingTime'
    | 'debugOwner'
    | 'debugStack'
    | 'debugTask'
    | 'environmentName',
  > as any;
  if (__DEV__) {
    task.time = lastTimestamp;
    task.debugPendingTime = null;
    task.debugOwner = debugOwner;
    task.debugStack = debugStack;
    task.debugTask = debugTask;
    task.environmentName = request.environmentName();
  }
  abortSet.add(task);
  return task;
}

function retryTask(request: Request, task: Task): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  // We stash the outer parent size so we can restore it when we exit.
  const parentSerializedSize = serializedSize;
  // We don't reset the serialized size counter from reentry because that indicates that we
  // are outlining a model and we actually want to include that size into the parent since
  // it will still block the parent row. It only restores to zero at the top of the stack.
  try {
    const model = task.model;
    if (__DEV__) {
      flushInputDebugTime(request, task);
    }
    modelRoot = model;
    if (
      model !== null &&
      typeof model === 'object' &&
      !request.writtenObjects.has(model)
    ) {
      request.writtenObjects.set(model, serializeByValueID(task.id));
    }
    const resolvedModel = resolveModel(
      request,
      task,
      {'': model},
      '',
      model,
      true,
    );
    const json = JSON.stringify(resolvedModel);
    emitModelChunk(request, task.id, json);
    task.status = COMPLETED;
    request.abortableTasks.delete(task);
  } catch (error) {
    if (request.status === ABORTING) {
      request.abortableTasks.delete(task);
      task.status = PENDING;
      const errorId: number = request.fatalError as any;
      abortTask(task, request, errorId);
      finishAbortedTask(task, request, errorId);
      return;
    }
    try {
      erroredTask(request, task, error);
    } catch (fatal) {
      fatalError(request, fatal);
    }
  } finally {
    serializedSize = parentSerializedSize;
  }
}

function performWork(request: Request): void {
  if (request.status === CLOSED || request.status === CLOSING) {
    return;
  }
  const prevRequest = currentRequest;
  if (__DEV__) {
    currentRequest = request;
  }
  const prevCache = setCurrentCache(null);
  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      retryTask(request, pingedTasks[i]);
      if (request.status === CLOSED || request.status === CLOSING) {
        return;
      }
    }
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  } finally {
    setCurrentCache(prevCache);
    if (__DEV__) {
      currentRequest = prevRequest;
    }
  }
}

function performWorkWithContext(request: Request): void {
  // Leave expansion's request/cache context, including work queued
  // synchronously while subscribing to input.
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    cacheStorage.run(undefined, () =>
      requestStorage.run(undefined, performWork, request),
    );
  } else {
    performWork(request);
  }
}

function pingTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    if (request.status === OPENING) {
      scheduleMicrotask(() => performWorkWithContext(request));
    } else {
      scheduleWork(() => performWorkWithContext(request));
    }
  }
}

function serializeTemporaryReference(
  request: Request,
  reference: string,
): string {
  return '$T' + reference;
}

function serializeByValueID(id: number): string {
  return '$' + id.toString(16);
}

function serializeLazyID(id: number): string {
  return '$L' + id.toString(16);
}

function escapeStringValue(value: string): string {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

function serializeImportString(request: Request, value: string): string {
  // No maximum length because import strings are short and repeat often.
  // Deduping model strings too would need one to skip very long strings.
  if (value.length < MIN_DEDUPLICATED_IMPORT_STRING_LENGTH) {
    return escapeStringValue(value);
  }
  const writtenStrings = request.writtenImportStrings;
  const existing = writtenStrings.get(value);
  if (existing !== undefined) {
    return existing;
  }
  const size = request.writtenImportStringsSize + value.length;
  if (size > MAX_DEDUPLICATED_IMPORT_STRINGS_SIZE) {
    // The map is full. Strings already outlined keep deduping; new ones are
    // written out every time.
    return escapeStringValue(value);
  }
  request.writtenImportStringsSize = size;
  // Chunk names are almost always shared, so the first occurrence is outlined
  // right away instead of waiting for a repeat.
  request.pendingChunks++;
  const outlinedId = request.nextChunkId++;
  // $FlowFixMe[incompatible-type] stringify can return null
  const json: string = stringify(escapeStringValue(value));
  // The client reads import metadata synchronously, so this row has to have
  // been written by the time the referencing row arrives. Import chunks are
  // flushed ahead of regular ones, which regular chunks can't guarantee.
  request.completedImportChunks.push(
    stringToChunk(outlinedId.toString(16) + ':' + json + '\n'),
  );
  const ref = serializeByValueID(outlinedId);
  writtenStrings.set(value, ref);
  return ref;
}

function importMetadataReplacer(key: string, value: mixed): mixed {
  if (typeof value === 'string') {
    const request = importStringRequest;
    if (request === null) {
      return escapeStringValue(value);
    }
    return serializeImportString(request, value);
  }
  return value;
}

function stringifyImportMetadataWithReplacer(
  request: Request,
  clientReferenceMetadata: ClientReferenceMetadata,
  debug: boolean,
): string {
  const prevRequest = importStringRequest;
  // The debug channel cannot reference string rows in the main stream.
  importStringRequest = __DEV__ && debug ? null : request;
  try {
    // $FlowFixMe[incompatible-type] stringify can return null
    return stringify(clientReferenceMetadata, importMetadataReplacer);
  } finally {
    importStringRequest = prevRequest;
  }
}

function transformImportMetadata(
  request: Request,
  value: mixed,
  depth: number,
): mixed {
  switch (typeof value) {
    case 'string':
      return serializeImportString(request, value);
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
    case 'object': {
      if (value === null) {
        return null;
      }
      if (depth > MAX_IMPORT_METADATA_DEPTH) {
        return NOT_PLAIN_IMPORT_METADATA;
      }
      const object = value as {+[string]: mixed};
      if (typeof object.toJSON === 'function') {
        return NOT_PLAIN_IMPORT_METADATA;
      }
      if (isArray(value)) {
        const length = value.length;
        const copy: Array<mixed> = new Array(length);
        for (let i = 0; i < length; i++) {
          const element = value[i];
          if (typeof element === 'string') {
            copy[i] = serializeImportString(request, element);
            continue;
          }
          const child = transformImportMetadata(request, element, depth + 1);
          if (child === NOT_PLAIN_IMPORT_METADATA) {
            return NOT_PLAIN_IMPORT_METADATA;
          }
          copy[i] = child;
        }
        return copy;
      }
      const proto = getPrototypeOf(value);
      if (proto !== ObjectPrototype && proto !== null) {
        return NOT_PLAIN_IMPORT_METADATA;
      }
      const keys = Object.keys(value);
      const copy: {[string]: mixed} = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key in ObjectPrototype) {
          // The copy inherits from Object.prototype, so assigning this key would
          // hit an accessor like __proto__ or, if the prototype is frozen, throw.
          return NOT_PLAIN_IMPORT_METADATA;
        }
        const element = object[key];
        if (typeof element === 'string') {
          copy[key] = serializeImportString(request, element);
          continue;
        }
        const child = transformImportMetadata(request, element, depth + 1);
        if (child === NOT_PLAIN_IMPORT_METADATA) {
          return NOT_PLAIN_IMPORT_METADATA;
        }
        copy[key] = child;
      }
      return copy;
    }
    default:
      return NOT_PLAIN_IMPORT_METADATA;
  }
}

function stringifyImportMetadata(
  request: Request,
  clientReferenceMetadata: ClientReferenceMetadata,
  debug: boolean,
): string {
  if (!(__DEV__ && debug)) {
    const copy = transformImportMetadata(request, clientReferenceMetadata, 0);
    if (copy !== NOT_PLAIN_IMPORT_METADATA) {
      // $FlowFixMe[incompatible-type] stringify can return null
      return stringify(copy);
    }
  }
  return stringifyImportMetadataWithReplacer(
    request,
    clientReferenceMetadata,
    debug,
  );
}

function serializePromiseID(id: number): string {
  return '$@' + id.toString(16);
}

function serializeSymbolReference(name: string): string {
  return '$S' + name;
}

function emitSymbolChunk(request: Request, id: number, name: string): void {
  const symbolReference = serializeSymbolReference(name);
  const processedChunk = encodeReferenceChunk(request, id, symbolReference);
  request.completedImportChunks.push(processedChunk);
}

function serializeRowHeader(tag: string, id: number) {
  return id.toString(16) + ':' + tag;
}

function encodeReferenceChunk(
  request: Request,
  id: number,
  reference: string,
): Chunk {
  const json = JSON.stringify(reference);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

function subscribeToThenable(
  request: Request,
  task: Task,
  thenable: ResultModel<ReactClientValue>,
  outlineNow?: boolean,
): void {
  let synchronous = outlineNow === true;
  try {
    const input = request.input;
    if (input === null) {
      return;
    }
    subscribeInput(request, detach =>
      input.subscribeToThenable(thenable, {
        debug: __DEV__
          ? info => forwardInputDebugInfo(request, task, info)
          : undefined,
        halt() {
          if (__DEV__) {
            flushInputDebugTime(request, task);
          }
          detach();
          if (task.status === PENDING) {
            haltTask(task, request);
            request.abortableTasks.delete(task);
            finishHaltedTask(task, request);
            enqueueFlush(request);
          }
        },
        resolve(value) {
          detach();
          if (request.status <= OPEN && task.status === PENDING) {
            task.model = value;
            if (synchronous) {
              outlineResolvedTask(request, task);
            } else {
              pingTask(request, task);
            }
          }
        },
        reject(error, reference) {
          if (__DEV__) {
            flushInputDebugTime(request, task);
          }
          detach();
          if (request.status <= OPEN && task.status === PENDING) {
            try {
              erroredInputTask(request, task, error, reference);
              enqueueFlush(request);
            } catch (fatal) {
              fatalError(request, fatal);
            }
          }
        },
      }),
    );
  } finally {
    synchronous = false;
  }
}

function serializeDebugThenable(
  request: Request,
  counter: {objectLimit: number},
  thenable: Thenable<any>,
): string {
  // Like serializeThenable but for renderDebugModel
  const model = __DEV__ ? getResultModel<any>(thenable) : null;
  const source = model === null ? undefined : model._debugSource;
  if (source !== undefined) {
    const existing = request.writtenDebugObjects.get(source);
    if (existing !== undefined) {
      request.writtenDebugObjects.set(thenable, existing);
      return existing;
    }
  }
  request.pendingDebugChunks++;
  const id = request.nextChunkId++;
  const ref = serializePromiseID(id);
  request.writtenDebugObjects.set(thenable, ref);
  if (source !== undefined) {
    request.writtenDebugObjects.set(source, ref);
  }

  if (__DEV__ && getResultModelStatus(thenable) !== null) {
    const input = request.input;
    if (input !== null) {
      let settled = false;
      subscribeInput(request, detach => {
        const unsubscribe = input.subscribeToThenable(thenable, {
          resolve(value) {
            settled = true;
            detach();
            emitOutlinedDebugModelChunk(request, id, counter, value);
            enqueueFlush(request);
          },
          reject(error) {
            settled = true;
            detach();
            emitErrorChunk(request, id, '', error, true, null);
            enqueueFlush(request);
          },
          halt() {
            settled = true;
            detach();
            emitDebugHaltChunk(request, id);
            enqueueFlush(request);
          },
        });
        return () => {
          unsubscribe();
          if (!settled) {
            settled = true;
            emitDebugHaltChunk(request, id);
            enqueueFlush(request);
          }
        };
      });
      return ref;
    }
  }

  switch (thenable.status) {
    case 'fulfilled': {
      emitOutlinedDebugModelChunk(request, id, counter, thenable.value);
      return ref;
    }
    case 'rejected': {
      const x = thenable.reason;
      // We don't log these errors since they didn't actually throw into Flight.
      const digest = '';
      emitErrorChunk(request, id, digest, x, true, null);
      return ref;
    }
  }

  if (request.status === ABORTING) {
    // Ensure that we have time to emit the halt chunk if we're sync aborting.
    emitDebugHaltChunk(request, id);
    return ref;
  }

  const deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects !== null) {
    // For Promises that are not yet resolved, we always defer them. They are async anyway so it's
    // safe to defer them. This also ensures that we don't eagerly call .then() on a Promise that
    // otherwise wouldn't have initialized. It also ensures that we don't "handle" a rejection
    // that otherwise would have triggered unhandled rejection.
    deferredDebugObjects.retained.set(id, thenable as any);
    const deferredRef = '$Y@' + id.toString(16);
    // We can now refer to the deferred object in the future.
    request.writtenDebugObjects.set(thenable, deferredRef);
    return deferredRef;
  }

  let cancelled = false;

  thenable.then(
    value => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      if (request.status === ABORTING) {
        emitDebugHaltChunk(request, id);
        enqueueFlush(request);
        return;
      }
      if (
        (isArray(value) && value.length > 200) ||
        (isTypedArray(value) && value.byteLength > 1000)
      ) {
        // If this should be deferred, but we don't have a debug channel installed
        // it would get omitted. We can't omit outlined models but we can avoid
        // resolving the Promise at all by halting it.
        emitDebugHaltChunk(request, id);
        enqueueFlush(request);
        return;
      }
      emitOutlinedDebugModelChunk(request, id, counter, value);
      enqueueFlush(request);
    },
    reason => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      if (request.status === ABORTING) {
        emitDebugHaltChunk(request, id);
        enqueueFlush(request);
        return;
      }
      // We don't log these errors since they didn't actually throw into Flight.
      const digest = '';
      emitErrorChunk(request, id, digest, reason, true, null);
      enqueueFlush(request);
    },
  );

  // We don't use scheduleMicrotask here because it doesn't actually schedule a microtask
  // in all our configs which is annoying.
  Promise.resolve().then(() => {
    // If we don't resolve the Promise within a microtask. Leave it as hanging since we
    // don't want to block the render forever on a Promise that might never resolve.
    if (cancelled) {
      return;
    }
    cancelled = true;
    emitDebugHaltChunk(request, id);
    enqueueFlush(request);
    // Clean up the request so we don't leak this forever.
    request = null as any;
    counter = null as any;
  });

  return ref;
}

function emitRequestedDebugThenable(
  request: Request,
  id: number,
  counter: {objectLimit: number},
  thenable: Thenable<any>,
): void {
  thenable.then(
    value => {
      if (request.status === ABORTING) {
        emitDebugHaltChunk(request, id);
        enqueueFlush(request);
        return;
      }
      emitOutlinedDebugModelChunk(request, id, counter, value);
      enqueueFlush(request);
    },
    reason => {
      if (request.status === ABORTING) {
        emitDebugHaltChunk(request, id);
        enqueueFlush(request);
        return;
      }
      // We don't log these errors since they didn't actually throw into Flight.
      const digest = '';
      emitErrorChunk(request, id, digest, reason, true, null);
      enqueueFlush(request);
    },
  );
}

function forwardInputDebugInfo(
  request: Request,
  task: Task,
  info: ReactDebugInfoEntry,
): void {
  const time = info.time;
  if (typeof time === 'number') {
    flushInputDebugTime(request, task);
    task.time = time;
    task.debugPendingTime = time;
  } else {
    if (typeof info.name === 'string') {
      outlineComponentInfo(request, info as any);
    }
    flushInputDebugTime(request, task);
    forwardDebugInfo(request, task, [info]);
  }
  enqueueFlush(request);
}

function flushInputDebugTime(request: Request, task: Task): void {
  const time = task.debugPendingTime;
  if (time !== null) {
    task.debugPendingTime = null;
    emitTimingChunk(request, task.id, time);
  }
}

function forwardDebugInfo(
  request: Request,
  task: Task,
  debugInfo: ReactDebugInfo,
) {
  const id = task.id;
  for (let i = 0; i < debugInfo.length; i++) {
    const info = debugInfo[i];
    if (typeof info.time === 'number') {
      // When forwarding time we need to ensure to convert it to the time space of the payload.
      // We clamp the time to the starting render of the current component. It's as if it took
      // no time to render and await if we reuse cached content.
      markOperationEndTime(request, task, info.time);
    } else {
      if (typeof info.name === 'string') {
        // We outline this model eagerly so that we can refer to by reference as an owner.
        // If we had a smarter way to dedupe we might not have to do this if there ends up
        // being no references to this as an owner.
        outlineComponentInfo(request, info as any);
        // Emit a reference to the outlined one.
        request.pendingChunks++;
        emitDebugChunk(request, id, info);
      } else if (info.awaited) {
        const ioInfo = info.awaited;
        // Outline the IO info in case the same I/O is awaited in more than one place.
        outlineIOInfo(request, ioInfo);
        // Ensure the owner is already outlined.
        if (info.owner != null) {
          outlineComponentInfo(request, info.owner);
        }
        // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
        let debugStack;
        if (info.stack == null && info.debugStack != null) {
          // If we have a debugStack but no parsed stack we should parse it.
          debugStack = filterStackTrace(
            request,
            parseStackTrace(info.debugStack, 1),
          );
        } else {
          debugStack = info.stack;
        }
        const debugAsyncInfo: Omit<ReactAsyncInfo, 'debugTask' | 'debugStack'> =
          {
            awaited: ioInfo,
          };
        if (info.env != null) {
          // $FlowFixMe[cannot-write]
          debugAsyncInfo.env = info.env;
        } else {
          // If we're forwarding IO info from this environment, an empty env is effectively the "client" side.
          // The "client" from the perspective of our client will be this current environment.
          // $FlowFixMe[cannot-write]
          debugAsyncInfo.env = (0, request.environmentName)();
        }
        if (info.owner != null) {
          // $FlowFixMe[cannot-write]
          debugAsyncInfo.owner = info.owner;
        }
        if (debugStack != null) {
          // $FlowFixMe[cannot-write]
          debugAsyncInfo.stack = debugStack;
        }
        request.pendingChunks++;
        emitDebugChunk(request, id, debugAsyncInfo);
      } else {
        request.pendingChunks++;
        emitDebugChunk(request, id, info);
      }
    }
  }
}

function markOperationEndTime(request: Request, task: Task, timestamp: number) {
  if (!enableProfilerTimer) {
    return;
  }
  // This is like advanceTaskTime() but always emits a timing chunk even if it doesn't advance.
  // This ensures that the end time of the previous entry isn't implied to be the start of the next one.
  if (request.status === ABORTING && timestamp > request.abortTime) {
    // If we're aborting then we don't emit any end times that happened after.
    return;
  }
  if (timestamp > task.time) {
    emitTimingChunk(request, task.id, timestamp);
    task.time = timestamp;
  } else {
    emitTimingChunk(request, task.id, task.time);
  }
}

function subscribeInput(
  request: Request,
  subscribe: (detach: () => void) => () => void,
): void {
  let unsubscribe = noop;
  let active = true;
  function detach(): void {
    active = false;
    request.inputSubscriptions.delete(detach);
    unsubscribe();
  }
  request.inputSubscriptions.add(detach);
  unsubscribe = subscribe(detach);
  if (!active || request.status > OPEN) {
    detach();
  }
}

function serializeThenable(
  request: Request,
  task: null | Task,
  thenable: ResultModel<ReactClientValue>,
): number {
  if (request.input === null) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Cannot serialize a detached Result.');
  }
  const existingId = request.writtenModels.get(thenable);
  if (existingId !== undefined) {
    return existingId;
  }
  const newTask = createTask(
    request,
    null,
    request.abortableTasks,
    __DEV__ && task !== null ? task.time : __DEV__ ? request.timeOrigin : 0,
    __DEV__ && task !== null ? task.debugOwner : null,
    __DEV__ && task !== null ? task.debugStack : null,
    __DEV__ && task !== null ? task.debugTask : null,
  );
  request.writtenModels.set(thenable, newTask.id);
  subscribeToThenable(request, newTask, thenable);
  return newTask.id;
}

function serializeClientReference(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  clientReference: ClientReference<any>,
): string {
  const clientReferenceKey = getClientReferenceKey(clientReference);
  const writtenClientReferences = request.writtenClientReferences;
  const existingId = writtenClientReferences.get(clientReferenceKey);
  if (existingId !== undefined) {
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      return serializeLazyID(existingId);
    }
    return serializeByValueID(existingId);
  }
  try {
    const clientReferenceMetadata: ClientReferenceMetadata =
      resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    const json = stringifyImportMetadata(
      request,
      clientReferenceMetadata,
      false,
    );
    request.pendingChunks++;
    const importId = request.nextChunkId++;
    emitImportChunk(request, importId, json);
    writtenClientReferences.set(clientReferenceKey, importId);
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      return serializeLazyID(importId);
    }
    return serializeByValueID(importId);
  } catch (error) {
    request.pendingChunks++;
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, error, task);
    emitErrorChunk(request, errorId, digest, error);
    return serializeByValueID(errorId);
  }
}

function serializeDebugClientReference(
  request: Request,
  parent:
    | {+[propertyName: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  parentPropertyName: string,
  clientReference: ClientReference<any>,
): string {
  // Like serializeDebugClientReference but it doesn't dedupe in the regular set
  // and it writes to completedDebugChunk instead of imports.
  const clientReferenceKey: ClientReferenceKey =
    getClientReferenceKey(clientReference);
  const writtenClientReferences = request.writtenClientReferences;
  const existingId = writtenClientReferences.get(clientReferenceKey);
  if (existingId !== undefined) {
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(existingId);
    }
    return serializeByValueID(existingId);
  }
  try {
    const clientReferenceMetadata: ClientReferenceMetadata =
      resolveClientReferenceMetadata(request.bundlerConfig, clientReference);
    const json = stringifyImportMetadata(
      request,
      clientReferenceMetadata,
      true,
    );
    request.pendingDebugChunks++;
    const importId = request.nextChunkId++;
    emitImportChunk(request, importId, json, true);
    if (parent[0] === REACT_ELEMENT_TYPE && parentPropertyName === '1') {
      // If we're encoding the "type" of an element, we can refer
      // to that by a lazy reference instead of directly since React
      // knows how to deal with lazy values. This lets us suspend
      // on this component rather than its parent until the code has
      // loaded.
      return serializeLazyID(importId);
    }
    return serializeByValueID(importId);
  } catch (x) {
    request.pendingDebugChunks++;
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, x);
    emitErrorChunk(request, errorId, digest, x, true, null);
    return serializeByValueID(errorId);
  }
}

function emitImportChunk(
  request: Request,
  id: number,
  json: string,
  debug: boolean = false,
): void {
  const row = serializeRowHeader('I', id) + json + '\n';
  const processedChunk = stringToChunk(row);
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(processedChunk);
  } else {
    request.completedImportChunks.push(processedChunk);
  }
}

function callWithDebugContextInDEV<A, T>(
  request: Request,
  task: Task,
  callback: A => T,
  arg: A,
): T {
  // We don't have a Server Component instance associated with this callback and
  // the nearest context is likely a Client Component being serialized. We create
  // a fake owner during this callback so we can get the stack trace from it.
  // This also gets sent to the client as the owner for the replaying log.
  const componentDebugInfo: ReactComponentInfo = {
    name: '',
    env: task.environmentName,
    key: null,
    owner: task.debugOwner,
  };
  // $FlowFixMe[cannot-write]
  componentDebugInfo.stack =
    task.debugStack === null
      ? null
      : filterStackTrace(request, parseStackTrace(task.debugStack, 1));
  // $FlowFixMe[cannot-write]
  componentDebugInfo.debugStack = task.debugStack;
  // $FlowFixMe[cannot-write]
  componentDebugInfo.debugTask = task.debugTask;
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

function logRecoverableError(
  request: Request,
  error: mixed,
  task: Task | null = null, // DEV-only
): string {
  const prevCache = setCurrentCache(null);
  const prevRequest = currentRequest;
  if (__DEV__) {
    currentRequest = null;
  }
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
    if (__DEV__) {
      currentRequest = prevRequest;
    }
  }
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      `onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "${typeof errorDigest}" instead`,
    );
  }
  return errorDigest || '';
}

function erroredTask(request: Request, task: Task, error: mixed): void {
  task.status = ERRORED;
  request.abortableTasks.delete(task);
  const digest = logRecoverableError(request, error, task);
  emitErrorChunk(request, task.id, digest, error);
}

function erroredInputTask(
  request: Request,
  task: Task,
  error: mixed,
  reference: void | ErrorReference,
): void {
  if (reference === undefined) {
    erroredTask(request, task, error);
    return;
  }
  task.status = ERRORED;
  request.abortableTasks.delete(task);
  const existingId = request.writtenErrors.get(reference);
  if (existingId === undefined) {
    request.writtenErrors.set(reference, task.id);
    emitErrorChunk(request, task.id, reference.digest, error);
  } else {
    const ref = serializeByValueID(existingId);
    request.completedErrorChunks.push(
      encodeReferenceChunk(request, task.id, ref),
    );
  }
}

function emitErrorChunk(
  request: Request,
  id: number,
  digest: string,
  error: mixed,
  debug: boolean = false, // DEV-only
  owner: ?ReactComponentInfo = null, // DEV-only
): void {
  let errorInfo: ReactErrorInfo;
  if (__DEV__) {
    let name: string = 'Error';
    let message: string;
    let stack: ReactStackTrace;
    let env = (0, request.environmentName)();
    let causeReference: null | string = null;
    let errorsReference: null | string = null;
    try {
      if (error instanceof Error) {
        const input = request.input;
        const capturedInfo =
          input === null ? undefined : input.getErrorInfo(error);
        if (capturedInfo !== undefined) {
          name = capturedInfo.name;
          message = capturedInfo.message;
          stack = capturedInfo.stack;
          env = capturedInfo.env;
        } else {
          name = error.name;
          // eslint-disable-next-line react-internal/safe-string-coercion
          message = String(error.message);
          stack = filterStackTrace(request, parseStackTrace(error, 0));
          const errorEnv = (error as any).environmentName;
          if (typeof errorEnv === 'string') {
            env = errorEnv;
          }
        }
        if ('cause' in error) {
          const cause: ReactClientValue = error.cause as any;
          const causeId = debug
            ? outlineDebugModel(request, {objectLimit: 5}, cause)
            : outlineModel(request, cause);
          causeReference = serializeByValueID(causeId);
        }
        if (
          typeof AggregateError !== 'undefined' &&
          error instanceof AggregateError
        ) {
          const errors: ReactClientValue = error.errors as any;
          const errorsId = debug
            ? outlineDebugModel(request, {objectLimit: 5}, errors)
            : outlineModel(request, errors);
          errorsReference = serializeByValueID(errorsId);
        }
      } else if (typeof error === 'object' && error !== null) {
        message = describeObjectForErrorMessage(error);
        stack = [];
      } else {
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error);
        stack = [];
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
    }
    const ownerRef =
      owner == null ? null : outlineComponentInfo(request, owner);
    errorInfo = {digest, name, message, stack, env, owner: ownerRef};
    if (causeReference !== null) {
      (errorInfo as ReactErrorInfoDev).cause = causeReference;
    }
    if (errorsReference !== null) {
      (errorInfo as ReactErrorInfoDev).errors = errorsReference;
    }
  } else {
    errorInfo = {digest};
  }
  const row = serializeRowHeader('E', id) + stringify(errorInfo) + '\n';
  const processedChunk = stringToChunk(row);
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(processedChunk);
  } else {
    request.completedErrorChunks.push(processedChunk);
  }
}

function emitHintChunk<Code: HintCode>(
  request: Request,
  code: Code,
  model: HintModel<Code>,
): void {
  const json: string = JSON.stringify(model);
  const row = ':H' + code + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedHintChunks.push(processedChunk);
}

function emitHint<Code: HintCode>(
  request: Request,
  code: Code,
  model: HintModel<Code>,
): void {
  emitHintChunk(request, code, model);
  enqueueFlush(request);
}

function enqueueFlush(request: Request): void {
  if (
    !request.flushScheduled &&
    (request.destination !== null ||
      (__DEV__ && request.debugDestination !== null))
  ) {
    request.flushScheduled = true;
    scheduleWork(() => {
      request.flushScheduled = false;
      flushCompletedChunks(request);
    });
  }
}

function emitDebugHaltChunk(request: Request, id: number): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'emitDebugHaltChunk should never be called in production mode. This is a bug in React.',
    );
  }
  // This emits a marker that this row will never complete and should intentionally never resolve
  // even when the client stream is closed. We use just the lack of data to indicate this.
  const row = id.toString(16) + ':\n';
  const processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}

function emitDebugChunk(
  request: Request,
  id: number,
  debugInfo: ReactDebugInfoEntry,
): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'emitDebugChunk should never be called in production mode. This is a bug in React.',
    );
  }

  const json: string = serializeDebugModel(request, 500, debugInfo);
  if (request.debugDestination !== null) {
    if (json[0] === '"' && json[1] === '$') {
      // This is already an outlined reference so we can just emit it directly,
      // without an unnecessary indirection.
      const row = serializeRowHeader('D', id) + json + '\n';
      request.completedRegularChunks.push(stringToChunk(row));
    } else {
      // Outline the debug information to the debug channel.
      const outlinedId = request.nextChunkId++;
      const debugRow = outlinedId.toString(16) + ':' + json + '\n';
      request.pendingDebugChunks++;
      request.completedDebugChunks.push(stringToChunk(debugRow));
      const row =
        serializeRowHeader('D', id) + '"$' + outlinedId.toString(16) + '"\n';
      request.completedRegularChunks.push(stringToChunk(row));
    }
  } else {
    const row = serializeRowHeader('D', id) + json + '\n';
    request.completedRegularChunks.push(stringToChunk(row));
  }
}

function outlineComponentInfo(
  request: Request,
  componentInfo: ReactComponentInfo,
): string {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'outlineComponentInfo should never be called in production mode. This is a bug in React.',
    );
  }

  const existingRef = request.writtenDebugObjects.get(componentInfo);
  if (existingRef !== undefined) {
    // Already written
    return existingRef;
  }

  if (componentInfo.owner != null) {
    // Ensure the owner is already outlined.
    outlineComponentInfo(request, componentInfo.owner);
  }

  // Limit the number of objects we write to prevent emitting giant props objects.
  let objectLimit = 10;
  if (componentInfo.stack != null) {
    // Ensure we have enough object limit to encode the stack trace.
    objectLimit += componentInfo.stack.length;
  }

  // We use the console encoding so that we can dedupe objects but don't necessarily
  // use the full serialization that requires a task.
  const counter = {objectLimit};

  // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
  const componentDebugInfo: Omit<
    ReactComponentInfo,
    'debugTask' | 'debugStack',
  > = {
    name: componentInfo.name,
    key: componentInfo.key,
  };
  if (componentInfo.env != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.env = componentInfo.env;
  }
  if (componentInfo.owner != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.owner = componentInfo.owner;
  }
  if (componentInfo.stack == null && componentInfo.debugStack != null) {
    // If we have a debugStack but no parsed stack we should parse it.
    // $FlowFixMe[cannot-write]
    componentDebugInfo.stack = filterStackTrace(
      request,
      parseStackTrace(componentInfo.debugStack, 1),
    );
  } else if (componentInfo.stack != null) {
    // $FlowFixMe[cannot-write]
    componentDebugInfo.stack = componentInfo.stack;
  }
  // Ensure we serialize props after the stack to favor the stack being complete.
  // $FlowFixMe[cannot-write]
  componentDebugInfo.props = componentInfo.props;

  const id = outlineDebugModel(request, counter, componentDebugInfo);
  const ref = serializeByValueID(id);
  request.writtenDebugObjects.set(componentInfo, ref);
  // We also store this in the main dedupe set so that it can be referenced by inline React Elements.
  request.writtenObjects.set(componentInfo, ref);
  return ref;
}

function cleanupInput(request: Request): void {
  request.input = null;
  request.inputSubscriptions.forEach(detach => detach());
  request.inputSubscriptions.clear();
}

function subscribeHints(request: Request): void {
  const input = request.input;
  if (input === null) {
    return;
  }
  let sourceComplete = false;
  function completeInput(): void {
    if (!sourceComplete) {
      sourceComplete = true;
      request.pendingChunks--;
      enqueueFlush(request);
    }
  }
  request.abortController.signal.addEventListener(
    'abort',
    () => {
      completeInput();
      cleanupInput(request);
    },
    {once: true},
  );
  subscribeInput(request, detach =>
    input.subscribe({
      hint(code, model) {
        try {
          emitHint(request, code, model);
        } catch (error) {
          fatalError(request, error);
        }
      },
      console(entry) {
        if (__DEV__) {
          request.pendingDebugChunks++;
          emitConsoleChunk(
            request,
            entry.methodName,
            entry.owner,
            entry.env,
            entry.stack,
            entry.args,
          );
          enqueueFlush(request);
        }
      },
      complete() {
        detach();
        completeInput();
      },
    }),
  );
}

function fatalError(request: Request, error: mixed): void {
  request.abortController.abort(error);
  request.fatalError = error;
  cleanupInput(request);
  if (enableTaint) {
    cleanupTaintQueue(request);
  }
  const destination = request.destination;
  if (__DEV__ && request.debugDestination !== null) {
    closeWithError(request.debugDestination, error);
    request.debugDestination = null;
  }
  if (destination !== null) {
    request.status = CLOSED;
    closeWithError(destination, error);
  } else {
    request.status = CLOSING;
  }
}

function flushCompletedChunks(request: Request): void {
  if (__DEV__ && request.debugDestination !== null) {
    const debugDestination = request.debugDestination;
    beginWriting(debugDestination);
    try {
      const debugChunks = request.completedDebugChunks;
      let i = 0;
      for (; i < debugChunks.length; i++) {
        const item = debugChunks[i];
        if (typeof item === 'symbol') {
          const headerChunk = debugChunks[i + 1];
          const contentChunk = debugChunks[i + 2];
          if (
            i + 2 >= debugChunks.length ||
            typeof headerChunk === 'symbol' ||
            typeof contentChunk === 'symbol'
          ) {
            throw new Error(
              'A chunk pair is incomplete. This is a bug in React.',
            );
          }
          request.pendingDebugChunks -= 2;
          writeChunk(debugDestination, headerChunk);
          writeChunk(debugDestination, contentChunk);
          i += 2;
        } else {
          request.pendingDebugChunks--;
          writeChunk(debugDestination, item);
        }
      }
      debugChunks.splice(0, i);
    } finally {
      completeWriting(debugDestination);
    }
    flushBuffered(debugDestination);
  }
  const destination = request.destination;
  if (destination !== null) {
    beginWriting(destination);
    try {
      // We emit module chunks first in the stream so that
      // they can be preloaded as early as possible.
      const importsChunks = request.completedImportChunks;
      let i = 0;
      for (; i < importsChunks.length; i++) {
        request.pendingChunks--;
        const chunk = importsChunks[i];
        const keepWriting: boolean = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) {
          request.destination = null;
          i++;
          break;
        }
      }
      importsChunks.splice(0, i);

      // Next comes hints.
      const hintChunks = request.completedHintChunks;
      i = 0;
      for (; i < hintChunks.length; i++) {
        const chunk = hintChunks[i];
        const keepWriting: boolean = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) {
          request.destination = null;
          i++;
          break;
        }
      }
      hintChunks.splice(0, i);

      // Debug meta data comes before the model data because it will often end up blocking the model from
      // completing since the JSX will reference the debug data.
      if (__DEV__ && request.debugDestination === null) {
        const debugChunks = request.completedDebugChunks;
        i = 0;
        for (; i < debugChunks.length; i++) {
          const item = debugChunks[i];
          let keepWriting: boolean;
          if (typeof item === 'symbol') {
            const headerChunk = debugChunks[i + 1];
            const contentChunk = debugChunks[i + 2];
            if (
              i + 2 >= debugChunks.length ||
              typeof headerChunk === 'symbol' ||
              typeof contentChunk === 'symbol'
            ) {
              throw new Error(
                'A chunk pair is incomplete. This is a bug in React.',
              );
            }
            request.pendingDebugChunks -= 2;
            writeChunk(destination, headerChunk);
            keepWriting = writeChunkAndReturn(destination, contentChunk);
            i += 2;
          } else {
            request.pendingDebugChunks--;
            keepWriting = writeChunkAndReturn(destination, item);
          }
          if (!keepWriting) {
            request.destination = null;
            i++;
            break;
          }
        }
        debugChunks.splice(0, i);
      }

      // Next comes model data.
      const regularChunks = request.completedRegularChunks;
      i = 0;
      for (; i < regularChunks.length; i++) {
        const item = regularChunks[i];
        let keepWriting: boolean;
        if (typeof item === 'symbol') {
          const headerChunk = regularChunks[i + 1];
          const contentChunk = regularChunks[i + 2];
          if (
            i + 2 >= regularChunks.length ||
            typeof headerChunk === 'symbol' ||
            typeof contentChunk === 'symbol'
          ) {
            throw new Error(
              'A chunk pair is incomplete. This is a bug in React.',
            );
          }
          request.pendingChunks -= 2;
          writeChunk(destination, headerChunk);
          keepWriting = writeChunkAndReturn(destination, contentChunk);
          i += 2;
        } else {
          request.pendingChunks--;
          keepWriting = writeChunkAndReturn(destination, item);
        }
        if (!keepWriting) {
          request.destination = null;
          i++;
          break;
        }
      }
      regularChunks.splice(0, i);

      // Finally, errors are sent. The idea is that it's ok to delay
      // any error messages and prioritize display of other parts of
      // the page.
      const errorChunks = request.completedErrorChunks;
      i = 0;
      for (; i < errorChunks.length; i++) {
        request.pendingChunks--;
        const chunk = errorChunks[i];
        const keepWriting: boolean = writeChunkAndReturn(destination, chunk);
        if (!keepWriting) {
          request.destination = null;
          i++;
          break;
        }
      }
      errorChunks.splice(0, i);
    } finally {
      request.flushScheduled = false;
      completeWriting(destination);
    }
    flushBuffered(destination);
  }
  if (request.pendingChunks === 0) {
    // There are no pending chunks left, so encoding is complete and its input
    // signal is aborted here. Debug chunks can still be pending, but they carry
    // development-only instrumentation rather than the render's output.
    //
    // This runs before the stream bookkeeping below, because that bookkeeping
    // can close the main stream and set the status to CLOSED while debug chunks
    // are outstanding. The abort only happens below ABORTING, so a later flush
    // would skip it. Repeated flushes are safe, because aborting an aborted
    // controller does nothing a second time.
    //
    // The taint queue stays untouched here. Debug chunks are checked against
    // the taint registry as they are written, and a deferred debug object can
    // be written long after this point.
    cleanupInput(request);
    if (request.status < ABORTING) {
      request.abortController.abort();
    }
    if (__DEV__) {
      const debugDestination = request.debugDestination;
      if (request.pendingDebugChunks === 0) {
        // Continue fully closing both streams.
        if (debugDestination !== null) {
          close(debugDestination);
          request.debugDestination = null;
        }
      } else {
        // We still have debug information to write.
        if (debugDestination === null) {
          // We'll continue writing on this stream so nothing closes.
          return;
        } else {
          // We'll close the main stream but keep the debug stream open.
          // TODO: If this destination is not currently flowing we'll not close it when it resumes flowing.
          // We should keep a separate status for this.
          if (request.destination !== null) {
            request.status = CLOSED;
            close(request.destination);
            request.destination = null;
          }
          return;
        }
      }
    }
    // We're done.
    if (enableTaint) {
      cleanupTaintQueue(request);
    }
    if (request.destination !== null) {
      request.status = CLOSED;
      close(request.destination);
      request.destination = null;
    }
    if (__DEV__ && request.debugDestination !== null) {
      close(request.debugDestination);
      request.debugDestination = null;
    }
  }
}

function subscribeToInput(
  request: Request,
  input: Input,
  rootTask: Task,
): void {
  request.pendingChunks++;
  subscribeHints(request);
  if (request.status > OPEN) {
    return;
  }
  request.writtenModels.set(input.root, rootTask.id);
  subscribeToThenable(request, rootTask, input.root);
}

export function startWork(request: Request): void {
  scheduleMicrotask(() => performWorkWithContext(request));
  scheduleWork(() => {
    if (request.status === OPENING) {
      request.status = OPEN;
    }
  });
}

export function startFlowing(request: Request, destination: Destination): void {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }
  if (request.status === CLOSED || request.destination !== null) {
    return;
  }
  request.destination = destination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    fatalError(request, error);
  }
}

export function startFlowingDebug(
  request: Request,
  debugDestination: Destination,
): void {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(debugDestination, request.fatalError);
    return;
  }
  if (request.status === CLOSED) {
    return;
  }
  if (request.debugDestination !== null) {
    // We're already flowing.
    return;
  }
  request.debugDestination = debugDestination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    fatalError(request, error);
  }
}

export function stopFlowing(request: Request): void {
  request.destination = null;
}

function abortTask(task: Task, request: Request, errorId: number): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = ABORTED;
}

function finishAbortedTask(
  task: Task,
  request: Request,
  errorId: number,
): void {
  if (task.status !== ABORTED) {
    return;
  }
  const ref = serializeByValueID(errorId);
  const processedChunk = encodeReferenceChunk(request, task.id, ref);
  request.completedErrorChunks.push(processedChunk);
}

function haltTask(task: Task, request: Request): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = ABORTED;
}

function finishHaltedTask(task: Task, request: Request): void {
  if (task.status !== ABORTED) {
    return;
  }
  request.pendingChunks--;
}

function finishAbort(
  request: Request,
  abortedTasks: Set<Task>,
  errorId: number,
): void {
  try {
    abortedTasks.forEach(task => finishAbortedTask(task, request, errorId));
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error);
    fatalError(request, error);
  }
}

export function attachAbortSignal(request: Request, signal: AbortSignal): void {
  if (signal.aborted) {
    abort(request, signal.reason);
    return;
  }
  signal.addEventListener(
    'abort',
    () => {
      abort(request, signal.reason);
    },
    {signal: request.abortController.signal},
  );
}

export function abort(request: Request, reason: mixed): void {
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    if (__DEV__ && enableProfilerTimer) {
      request.abortTime = performance.now();
    }
    request.abortController.abort(reason);
    const abortableTasks = request.abortableTasks;
    if (abortableTasks.size > 0) {
      const error =
        reason === undefined
          ? new Error('The render was aborted by the server without a reason.')
          : typeof reason === 'object' &&
              reason !== null &&
              typeof reason.then === 'function'
            ? new Error('The render was aborted by the server with a promise.')
            : reason;
      const digest = logRecoverableError(request, error);
      const errorId = request.nextChunkId++;
      request.fatalError = errorId;
      request.pendingChunks++;
      emitErrorChunk(request, errorId, digest, error);
      abortableTasks.forEach(task => abortTask(task, request, errorId));
      scheduleWork(() => finishAbort(request, abortableTasks, errorId));
    } else {
      flushCompletedChunks(request);
    }
  } catch (error) {
    logRecoverableError(request, error);
    fatalError(request, error);
  }
}

function serializeCollectionEntries(
  request: Request,
  model: ResultModel<ReactClientValue>,
): number {
  if (request.input === null) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Cannot serialize a detached Result.');
  }
  const existingId = request.writtenModels.get(model);
  if (existingId !== undefined) {
    return existingId;
  }
  const task = createTask(
    request,
    null,
    request.abortableTasks,
    __DEV__ ? request.timeOrigin : 0,
  );
  request.writtenModels.set(model, task.id);
  subscribeToThenable(request, task, model, true);
  return task.id;
}

function outlineResolvedTask(request: Request, task: Task): void {
  const value = task.model;
  if (value !== null && typeof value === 'object') {
    request.writtenObjects.set(value, serializeByValueID(task.id));
  }
  const previousModelRoot = modelRoot;
  try {
    retryTask(request, task);
  } finally {
    modelRoot = previousModelRoot;
  }
}

function serializeMap(
  request: Request,
  map: Map<ReactClientValue, ReactClientValue>,
): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(map);
  if (model !== undefined) {
    const id = serializeCollectionEntries(request, model as any);
    return '$Q' + id.toString(16);
  }
  const entries = Array.from(map);
  const id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}

function serializeDebugMap(
  request: Request,
  counter: {objectLimit: number},
  map: Map<ReactClientValue, ReactClientValue>,
): string {
  // Like serializeMap but for renderDebugModel.
  const entries = Array.from(map);
  // The Map itself doesn't take up any space but the outlined object does.
  counter.objectLimit++;
  for (let i = 0; i < entries.length; i++) {
    // Outline every object entry in case we run out of space to serialize them.
    // Because we can't mark these values as limited.
    const entry = entries[i];
    doNotLimit.add(entry);
    const key = entry[0];
    const value = entry[1];
    if (typeof key === 'object' && key !== null) {
      doNotLimit.add(key);
    }
    if (typeof value === 'object' && value !== null) {
      doNotLimit.add(value);
    }
  }
  const id = outlineDebugModel(request, counter, entries);
  return '$Q' + id.toString(16);
}

function serializeSet(request: Request, set: Set<ReactClientValue>): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(set);
  if (model !== undefined) {
    const id = serializeCollectionEntries(request, model as any);
    return '$W' + id.toString(16);
  }
  const entries = Array.from(set);
  const id = outlineModel(request, entries);
  return '$W' + id.toString(16);
}

function isTypedArray(value: any): boolean {
  if (value instanceof ArrayBuffer) {
    return true;
  }
  if (value instanceof Int8Array) {
    return true;
  }
  if (value instanceof Uint8Array) {
    return true;
  }
  if (value instanceof Uint8ClampedArray) {
    return true;
  }
  if (value instanceof Int16Array) {
    return true;
  }
  if (value instanceof Uint16Array) {
    return true;
  }
  if (value instanceof Int32Array) {
    return true;
  }
  if (value instanceof Uint32Array) {
    return true;
  }
  if (value instanceof Float32Array) {
    return true;
  }
  if (value instanceof Float64Array) {
    return true;
  }
  if (value instanceof BigInt64Array) {
    return true;
  }
  if (value instanceof BigUint64Array) {
    return true;
  }
  if (value instanceof DataView) {
    return true;
  }
  return false;
}

function serializeDebugSet(
  request: Request,
  counter: {objectLimit: number},
  set: Set<ReactClientValue>,
): string {
  // Like serializeMap but for renderDebugModel.
  const entries = Array.from(set);
  // The Set itself doesn't take up any space but the outlined object does.
  counter.objectLimit++;
  for (let i = 0; i < entries.length; i++) {
    // Outline every object entry in case we run out of space to serialize them.
    // Because we can't mark these values as limited.
    const entry = entries[i];
    if (typeof entry === 'object' && entry !== null) {
      doNotLimit.add(entry);
    }
  }
  const id = outlineDebugModel(request, counter, entries);
  return '$W' + id.toString(16);
}

function serializeTypedArray(
  request: Request,
  tag: string,
  typedArray: $ArrayBufferView,
): string {
  const bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray);
  request.pendingChunks++;
  return serializeByValueID(bufferId);
}

function emitTypedArrayChunk(
  request: Request,
  id: number,
  tag: string,
  typedArray: $ArrayBufferView,
  debug: boolean = false,
): void {
  if (enableTaint) {
    if (TaintRegistryByteLengths.has(typedArray.byteLength)) {
      // If we have had any tainted values of this length, we check
      // to see if these bytes matches any entries in the registry.
      const tainted = TaintRegistryValues.get(
        binaryToComparableString(typedArray),
      );
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
  }
  if (debug) {
    request.pendingDebugChunks++;
  } else {
    request.pendingChunks++; // Extra chunk for the header.
  }
  // TODO: Convert to little endian if that's not the server default.
  const bytes = new Uint8Array(
    new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    ),
  );
  const binaryChunk = typedArrayToBinaryChunk(bytes);
  const binaryLength = byteLengthOfBinaryChunk(binaryChunk);
  const row = id.toString(16) + ':' + tag + binaryLength.toString(16) + ',';
  const headerChunk = stringToChunk(row);
  // Push a NEXT_TWO_CHUNKS_ARE_ATOMIC sentinel before the header so that
  // flushCompletedChunks can write the header and binary chunks atomically.
  // Otherwise, if the destination's backpressure flips between the two writes,
  // the content chunk would be stranded at the front of the queue and the next
  // drain would emit Import or Hint chunks between the header and the content —
  // and the Flight Client would frame those intervening bytes as this row's
  // content.
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(
      NEXT_TWO_CHUNKS_ARE_ATOMIC,
      headerChunk,
      binaryChunk,
    );
  } else {
    request.completedRegularChunks.push(
      NEXT_TWO_CHUNKS_ARE_ATOMIC,
      headerChunk,
      binaryChunk,
    );
  }
}

function serializeFormData(request: Request, formData: FormData): string {
  const entries = Array.from(formData.entries());
  const id = outlineModel(request, entries as any);
  return '$K' + id.toString(16);
}

function serializeBlob(request: Request, blob: Blob): string {
  const model: Array<string | Uint8Array> = [blob.type];
  const reader = blob.stream().getReader();
  const newTask = createTask(
    request,
    model,
    request.abortableTasks,
    __DEV__ ? performance.now() : 0,
    null,
    null,
    null,
  );

  function progress(
    entry: {done: false, value: Uint8Array} | {done: true, value: void},
  ): Promise<void> | void {
    if (newTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      request.abortController.signal.removeEventListener('abort', abortBlob);
      pingTask(request, newTask);
      return;
    }
    // TODO: Emit the chunk early and refer to it later by dedupe.
    model.push(entry.value);
    // $FlowFixMe[incompatible-type]
    return reader.read().then(progress).catch(error);
  }
  function error(reason: mixed) {
    if (newTask.status !== PENDING) {
      return;
    }
    request.abortController.signal.removeEventListener('abort', abortBlob);
    erroredTask(request, newTask, reason);
    enqueueFlush(request);
    // $FlowFixMe[incompatible-type] should be able to pass mixed
    // $FlowFixMe[incompatible-use]
    reader.cancel(reason).then(error, error);
  }
  function abortBlob() {
    if (newTask.status !== PENDING) {
      return;
    }
    const signal = request.abortController.signal;
    signal.removeEventListener('abort', abortBlob);
    const reason = signal.reason;
    // TODO: Make this use abortTask() instead.
    erroredTask(request, newTask, reason);
    enqueueFlush(request);
    // $FlowFixMe[incompatible-use] should be able to pass mixed
    reader.cancel(reason).then(error, error);
  }

  request.abortController.signal.addEventListener('abort', abortBlob);

  // $FlowFixMe[incompatible-type]
  reader.read().then(progress).catch(error);

  return '$B' + newTask.id.toString(16);
}

function serializeIterator(
  request: Request,
  entries: $ReadOnlyArray<ReactClientValue>,
): string {
  const id = outlineModel(request, entries);
  return '$i' + id.toString(16);
}

function serializeServerReference(
  request: Request,
  serverReference: ServerReference<any>,
): string {
  const isObjectReference =
    enableFlightObjectReferences && typeof serverReference === 'object';
  const writtenServerReferences = request.writtenServerReferences;
  const existingId = writtenServerReferences.get(serverReference);
  if (existingId !== undefined) {
    return isObjectReference
      ? serializeServerObjectReferenceID(existingId)
      : serializeServerReferenceID(existingId);
  }
  const id = getServerReferenceId(request.bundlerConfig, serverReference);
  let serverReferenceMetadata: {
    id: ServerReferenceId,
    bound?: null | Promise<Array<any>>,
    name?: string, // DEV-only
    env?: string, // DEV-only
    location?: ReactFunctionLocation, // DEV-only
  };
  if (isObjectReference) {
    serverReferenceMetadata = {id};
  } else {
    const input = request.input;
    const metadata =
      input === null ? undefined : input.getServerReference(serverReference);
    if (metadata === undefined) {
      // eslint-disable-next-line react-internal/prod-error-codes
      throw new Error(
        'A Result must record server references before serialization.',
      );
    }
    const bound = metadata.bound;
    const location = __DEV__ ? metadata.location : undefined;
    serverReferenceMetadata =
      __DEV__ && location != null
        ? {
            id,
            bound,
            name: metadata.name,
            env: metadata.env,
            location,
          }
        : {id, bound};
  }
  const metadataId = outlineModel(request, serverReferenceMetadata);
  writtenServerReferences.set(serverReference, metadataId);
  return isObjectReference
    ? serializeServerObjectReferenceID(metadataId)
    : serializeServerReferenceID(metadataId);
}

function serializeServerReferenceID(id: number): string {
  return '$h' + id.toString(16);
}

function serializeServerObjectReferenceID(id: number): string {
  return '$H' + id.toString(16);
}

function emitIOInfoChunk(
  request: Request,
  id: number,
  name: string,
  start: number,
  end: number,
  value: ?Promise<mixed>,
  env: ?string,
  owner: ?ReactComponentInfo,
  stack: ?ReactStackTrace,
): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'emitIOInfoChunk should never be called in production mode. This is a bug in React.',
    );
  }

  let objectLimit = 10;
  if (stack) {
    objectLimit += stack.length;
  }

  const relativeStartTimestamp = start - request.timeOrigin;
  const relativeEndTimestamp = end - request.timeOrigin;
  const debugIOInfo: Omit<ReactIOInfo, 'debugTask' | 'debugStack'> = {
    name: name,
    start: relativeStartTimestamp,
    end: relativeEndTimestamp,
  };
  if (env != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.env = env;
  }
  if (stack != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.stack = stack;
  }
  if (owner != null) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.owner = owner;
  }
  if (value !== undefined) {
    // $FlowFixMe[cannot-write]
    debugIOInfo.value = value;
  }
  const json: string = serializeDebugModel(request, objectLimit, debugIOInfo);
  const row = id.toString(16) + ':J' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedDebugChunks.push(processedChunk);
}

function outlineIOInfo(request: Request, ioInfo: ReactIOInfo): void {
  if (request.writtenDebugObjects.has(ioInfo)) {
    // Already written
    return;
  }
  // We can't serialize the ConsoleTask/Error objects so we need to omit them before serializing.
  request.pendingDebugChunks++;
  const id = request.nextChunkId++;
  const owner = ioInfo.owner;
  // Ensure the owner is already outlined.
  if (owner != null) {
    outlineComponentInfo(request, owner);
  }
  let debugStack;
  if (ioInfo.stack == null && ioInfo.debugStack != null) {
    // If we have a debugStack but no parsed stack we should parse it.
    debugStack = filterStackTrace(
      request,
      parseStackTrace(ioInfo.debugStack, 1),
    );
  } else {
    debugStack = ioInfo.stack;
  }
  let env = ioInfo.env;
  if (env == null) {
    // If we're forwarding IO info from this environment, an empty env is effectively the "client" side.
    // The "client" from the perspective of our client will be this current environment.
    env = (0, request.environmentName)();
  }
  emitIOInfoChunk(
    request,
    id,
    ioInfo.name,
    ioInfo.start,
    ioInfo.end,
    ioInfo.value,
    env,
    owner,
    debugStack,
  );
  request.writtenDebugObjects.set(ioInfo, serializeByValueID(id));
}

function emitChunk(
  request: Request,
  task: Task,
  value: ReactClientValue,
): void {
  const id = task.id;
  // For certain types we have special types, we typically outlined them but
  // we can emit them directly for this row instead of through an indirection.
  // $FlowFixMe[invalid-compare]
  if (typeof value === 'string' && byteLengthOfChunk !== null) {
    if (enableTaint) {
      const tainted = TaintRegistryValues.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted.message);
      }
    }
    emitTextChunk(request, id, value);
    return;
  }
  const input = request.input;
  const kind =
    value !== null && typeof value === 'object' && input !== null
      ? input.getModelInfo(value) & MODEL_KIND_MASK
      : 0;
  if (kind === 0) {
    if (
      enableFlightObjectReferences &&
      typeof value === 'object' &&
      value !== null &&
      isServerReference(value)
    ) {
      // Streamed values reach this function before model serialization. Keep
      // registered binary objects opaque instead of emitting their bytes.
      const json = JSON.stringify(
        serializeServerReference(request, value as any),
      );
      emitModelChunk(request, id, json);
      return;
    }
    if (value instanceof ArrayBuffer) {
      emitTypedArrayChunk(request, id, 'A', new Uint8Array(value));
      return;
    }
    if (value instanceof Int8Array) {
      // char
      emitTypedArrayChunk(request, id, 'O', value);
      return;
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      emitTypedArrayChunk(request, id, 'o', value);
      return;
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      emitTypedArrayChunk(request, id, 'U', value);
      return;
    }
    if (value instanceof Int16Array) {
      // sort
      emitTypedArrayChunk(request, id, 'S', value);
      return;
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      emitTypedArrayChunk(request, id, 's', value);
      return;
    }
    if (value instanceof Int32Array) {
      // long
      emitTypedArrayChunk(request, id, 'L', value);
      return;
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      emitTypedArrayChunk(request, id, 'l', value);
      return;
    }
    if (value instanceof Float32Array) {
      // float
      emitTypedArrayChunk(request, id, 'G', value);
      return;
    }
    if (value instanceof Float64Array) {
      // double
      emitTypedArrayChunk(request, id, 'g', value);
      return;
    }
    if (value instanceof BigInt64Array) {
      // number
      emitTypedArrayChunk(request, id, 'M', value);
      return;
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      emitTypedArrayChunk(request, id, 'm', value);
      return;
    }
    if (value instanceof DataView) {
      emitTypedArrayChunk(request, id, 'V', value);
      return;
    }
  }
  // For anything else we need to try to serialize it using JSON.
  // We resolve the model tree first in pure JS to avoid the C++->JS boundary
  // overhead of JSON.stringify's replacer callback.
  const resolvedModel = resolveModel(
    request,
    task,
    {'': value},
    '',
    value,
    true,
  );
  // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do
  const json: string = JSON.stringify(resolvedModel);
  emitModelChunk(request, task.id, json);
}

function serializeDebugTypedArray(
  request: Request,
  tag: string,
  typedArray: $ArrayBufferView,
): string {
  if (typedArray.byteLength > 1000 && !doNotLimit.has(typedArray)) {
    // Defer large typed arrays.
    return serializeDeferredObject(request, typedArray);
  }
  const bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, true);
  request.pendingDebugChunks++;
  return serializeByValueID(bufferId);
}

function serializeReadableStream(
  request: Request,
  task: Task,
  stream: Object,
): string {
  const input = request.input;
  const source = input === null ? undefined : input.getReadableStream(stream);
  if (source === undefined) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('A Result must record streams before serialization.');
  }
  const isByteStream = source.isByteStream;

  const streamTask = createTask(
    request,
    task.model,
    request.abortableTasks,
    __DEV__ ? task.time : 0,
    __DEV__ ? task.debugOwner : null,
    __DEV__ ? task.debugStack : null,
    __DEV__ ? task.debugTask : null,
  );
  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  const startStreamRow =
    streamTask.id.toString(16) + ':' + (isByteStream ? 'r' : 'R') + '\n';
  request.writtenObjects.set(stream, serializeByValueID(streamTask.id));
  request.completedRegularChunks.push(stringToChunk(startStreamRow));

  function progress(entry: InputSequenceEntry): void {
    if (streamTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      streamTask.status = COMPLETED;
      const endStreamRow = streamTask.id.toString(16) + ':C\n';
      request.completedRegularChunks.push(stringToChunk(endStreamRow));
      request.abortableTasks.delete(streamTask);
      enqueueFlush(request);
    } else {
      request.pendingChunks++;
      let pendingEntry = true;
      try {
        streamTask.model = entry.value;
        if (isByteStream) {
          const chunk: Uint8Array = streamTask.model as any;
          emitTypedArrayChunk(request, streamTask.id, 'b', chunk);
        } else {
          tryStreamTask(request, streamTask);
        }
        pendingEntry = false;
        enqueueFlush(request);
      } catch (reason) {
        if (pendingEntry) {
          request.pendingChunks--;
        }
        error(reason, undefined);
      }
    }
  }
  function error(reason: mixed, reference: void | ErrorReference): void {
    if (streamTask.status === PENDING) {
      try {
        erroredInputTask(request, streamTask, reason, reference);
        scheduleMicrotask(() => flushCompletedChunks(request));
      } catch (fatal) {
        fatalError(request, fatal);
      }
    }
  }

  subscribeInput(request, detach =>
    source.subscribe({
      progress(entry) {
        progress(entry);
        if (streamTask.status !== PENDING) {
          detach();
        }
      },
      error(reason, reference) {
        detach();
        error(reason, reference);
      },
      rejectEntry(reason, reference) {
        detach();
        error(reason, reference);
      },
      halt() {
        detach();
        if (streamTask.status === PENDING) {
          haltInputTask(request, streamTask);
        }
      },
    }),
  );
  return serializeByValueID(streamTask.id);
}

function fromHex(str: string): number {
  return parseInt(str, 16);
}

export function resolveDebugMessage(request: Request, message: string): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'resolveDebugMessage should never be called in production mode. This is a bug in React.',
    );
  }
  const deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects === null) {
    throw new Error(
      "resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React.",
    );
  }
  if (message === '') {
    closeDebugChannel(request);
    return;
  }
  // This function lets the client ask for more data lazily through the debug channel.
  const command = message.charCodeAt(0);
  const ids = message.slice(2).split(',').map(fromHex);
  switch (command) {
    case 82 /* "R" */:
      // Release IDs
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const retainedValue = deferredDebugObjects.retained.get(id);
        if (retainedValue !== undefined) {
          // We're no longer blocked on this. We won't emit it.
          request.pendingDebugChunks--;
          deferredDebugObjects.retained.delete(id);
          deferredDebugObjects.existing.delete(retainedValue);
          enqueueFlush(request);
        }
      }
      break;
    case 81 /* "Q" */:
      // Query IDs
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const retainedValue = deferredDebugObjects.retained.get(id);
        if (retainedValue !== undefined) {
          // If we still have this object, and haven't emitted it before, emit it on the stream.
          const counter = {objectLimit: 10};
          deferredDebugObjects.retained.delete(id);
          deferredDebugObjects.existing.delete(retainedValue);
          emitOutlinedDebugModelChunk(request, id, counter, retainedValue);
          enqueueFlush(request);
        }
      }
      break;
    case 80 /* "P" */:
      // Query Promise IDs
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const retainedValue = deferredDebugObjects.retained.get(id);
        if (retainedValue !== undefined) {
          // If we still have this Promise, and haven't emitted it before, wait for it
          // and then emit it on the stream.
          const counter = {objectLimit: 10};
          deferredDebugObjects.retained.delete(id);
          emitRequestedDebugThenable(
            request,
            id,
            counter,
            retainedValue as any,
          );
        }
      }
      break;
    default:
      throw new Error(
        'Unknown command. The debugChannel was not wired up properly.',
      );
  }
}

export function closeDebugChannel(request: Request): void {
  if (!__DEV__) {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'closeDebugChannel should never be called in production mode. This is a bug in React.',
    );
  }
  // This clears all remaining deferred objects, potentially resulting in the completion of the Request.
  const deferredDebugObjects = request.deferredDebugObjects;
  if (deferredDebugObjects === null) {
    throw new Error(
      "resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React.",
    );
  }
  deferredDebugObjects.retained.forEach((value, id) => {
    request.pendingDebugChunks--;
    deferredDebugObjects.retained.delete(id);
    deferredDebugObjects.existing.delete(value);
  });
  enqueueFlush(request);
}

function serializeDebugFormData(request: Request, formData: FormData): string {
  const entries = Array.from(formData.entries());
  const id = outlineDebugModel(
    request,
    {objectLimit: entries.length * 2 + 1},
    entries as any,
  );
  return '$K' + id.toString(16);
}

function serializeErrorValue(request: Request, error: Error): string {
  if (__DEV__) {
    let name: string = 'Error';
    let message: string;
    let stack: ReactStackTrace;
    let env = (0, request.environmentName)();
    const input = request.input;
    const capturedInfo = input === null ? undefined : input.getErrorInfo(error);
    if (capturedInfo !== undefined) {
      name = capturedInfo.name;
      message = capturedInfo.message;
      stack = capturedInfo.stack;
      env = capturedInfo.env;
    } else {
      try {
        name = error.name;
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error.message);
        stack = filterStackTrace(request, parseStackTrace(error, 0));
        const errorEnv = (error as any).environmentName;
        if (typeof errorEnv === 'string') {
          // This probably came from another FlightClient as a pass through.
          // Keep the environment name.
          env = errorEnv;
        }
      } catch (x) {
        message = 'An error occurred but serializing the error message failed.';
        stack = [];
      }
    }
    const errorInfo: ReactErrorInfoDev = {name, message, stack, env};
    if ('cause' in error) {
      const cause: ReactClientValue = error.cause as any;
      const causeId = outlineModel(request, cause);
      errorInfo.cause = serializeByValueID(causeId);
    }
    if (
      typeof AggregateError !== 'undefined' &&
      error instanceof AggregateError
    ) {
      const errors: ReactClientValue = error.errors as any;
      const errorsId = outlineModel(request, errors);
      errorInfo.errors = serializeByValueID(errorsId);
    }
    const id = outlineModel(request, errorInfo);
    return '$Z' + id.toString(16);
  } else {
    // In prod we don't emit any information about this Error object to avoid
    // unintentional leaks. Since this doesn't actually throw on the server
    // we don't go through onError and so don't register any digest neither.
    return '$Z';
  }
}

function serializeDebugErrorValue(
  request: Request,
  counter: {objectLimit: number},
  error: Error,
): string {
  if (__DEV__) {
    let name: string = 'Error';
    let message: string;
    let stack: ReactStackTrace;
    let env = (0, request.environmentName)();
    try {
      name = error.name;
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error.message);
      stack = filterStackTrace(request, parseStackTrace(error, 0));
      const errorEnv = (error as any).environmentName;
      if (typeof errorEnv === 'string') {
        // This probably came from another FlightClient as a pass through.
        // Keep the environment name.
        env = errorEnv;
      }
    } catch (x) {
      message = 'An error occurred but serializing the error message failed.';
      stack = [];
    }
    const errorInfo: ReactErrorInfoDev = {name, message, stack, env};
    if ('cause' in error) {
      counter.objectLimit--;
      const cause: ReactClientValue = error.cause as any;
      const causeId = outlineDebugModel(request, counter, cause);
      errorInfo.cause = serializeByValueID(causeId);
    }
    if (
      typeof AggregateError !== 'undefined' &&
      error instanceof AggregateError
    ) {
      counter.objectLimit--;
      const errors: ReactClientValue = error.errors as any;
      const errorsId = outlineDebugModel(request, counter, errors);
      errorInfo.errors = serializeByValueID(errorsId);
    }
    const id = outlineDebugModel(
      request,
      {objectLimit: stack.length * 2 + 2},
      errorInfo,
    );
    return '$Z' + id.toString(16);
  } else {
    // In prod we don't emit any information about this Error object to avoid
    // unintentional leaks. Since this doesn't actually throw on the server
    // we don't go through onError and so don't register any digest neither.
    return '$Z';
  }
}

function serializeWeakPromiseID(id: number): string {
  return '$w' + id.toString(16);
}

function tryStreamTask(request: Request, task: Task): void {
  const previousModelRoot = modelRoot;
  const parentSerializedSize = serializedSize;
  try {
    modelRoot = null;
    emitChunk(request, task, task.model);
  } finally {
    modelRoot = previousModelRoot;
    serializedSize = parentSerializedSize;
  }
}

function haltInputTask(request: Request, task: Task): void {
  request.abortableTasks.delete(task);
  haltTask(task, request);
  finishHaltedTask(task, request);
  enqueueFlush(request);
}

function serializeDebugLargeTextString(request: Request, text: string): string {
  request.pendingDebugChunks++;
  const textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, true);
  return serializeByValueID(textId);
}

function serializeDebugBlob(request: Request, blob: Blob): string {
  const model: Array<string | Uint8Array> = [blob.type];
  const reader = blob.stream().getReader();
  request.pendingDebugChunks++;
  const id = request.nextChunkId++;
  function progress(
    entry: {done: false, value: Uint8Array} | {done: true, value: void},
  ): Promise<void> | void {
    if (entry.done) {
      emitOutlinedDebugModelChunk(
        request,
        id,
        {objectLimit: model.length + 2},
        model,
      );
      enqueueFlush(request);
      return;
    }
    // TODO: Emit the chunk early and refer to it later by dedupe.
    model.push(entry.value);
    // $FlowFixMe[incompatible-type]
    return reader.read().then(progress).catch(error);
  }
  function error(reason: mixed) {
    const digest = '';
    emitErrorChunk(request, id, digest, reason, true, null);
    enqueueFlush(request);
    // $FlowFixMe[incompatible-type] should be able to pass mixed
    reader.cancel(reason).then(noop, noop);
  }
  // $FlowFixMe[incompatible-type]
  reader.read().then(progress).catch(error);
  return '$B' + id.toString(16);
}

function serializeAsyncIterable(
  request: Request,
  task: Task,
  iterable: Object,
): string {
  const input = request.input;
  const source = input === null ? undefined : input.getAsyncIterable(iterable);
  if (source === undefined) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'A Result must record async iterables before serialization.',
    );
  }
  const streamTask = createTask(
    request,
    task.model,
    request.abortableTasks,
    __DEV__ ? task.time : 0,
    __DEV__ ? task.debugOwner : null,
    __DEV__ ? task.debugStack : null,
    __DEV__ ? task.debugTask : null,
  );
  // The task represents the Stop row. This adds a Start row.
  request.pendingChunks++;
  const startStreamRow =
    streamTask.id.toString(16) + ':' + (source.isIterator ? 'x' : 'X') + '\n';
  request.writtenObjects.set(iterable, serializeByValueID(streamTask.id));
  request.completedRegularChunks.push(stringToChunk(startStreamRow));

  function error(reason: mixed, reference: void | ErrorReference): void {
    if (streamTask.status === PENDING) {
      try {
        erroredInputTask(request, streamTask, reason, reference);
        scheduleMicrotask(() => flushCompletedChunks(request));
      } catch (fatal) {
        fatalError(request, fatal);
      }
    }
  }

  subscribeInput(request, detach =>
    source.subscribe({
      enqueue(entry, done) {
        if (streamTask.status !== PENDING) {
          return;
        }
        try {
          const entryId = serializeThenable(request, streamTask, entry as any);
          const reference = serializeByValueID(entryId);
          if (done) {
            streamTask.status = COMPLETED;
            const endStreamRow =
              streamTask.id.toString(16) +
              ':C' +
              JSON.stringify(reference) +
              '\n';
            request.completedRegularChunks.push(stringToChunk(endStreamRow));
            request.abortableTasks.delete(streamTask);
            detach();
          } else {
            request.pendingChunks++;
            emitModelChunk(request, streamTask.id, JSON.stringify(reference));
          }
          enqueueFlush(request);
        } catch (reason) {
          detach();
          error(reason, undefined);
        }
      },
      close() {
        detach();
      },
      error(reason, reference) {
        detach();
        error(reason, reference);
      },
      halt() {
        detach();
        if (streamTask.status === PENDING) {
          haltInputTask(request, streamTask);
        }
      },
    }),
  );
  return serializeByValueID(streamTask.id);
}
