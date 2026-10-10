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
  getDebugModel,
} from 'shared/ReactFlightResultModel';
import type {
  ErrorReference,
  ModelReference,
  ServerReferenceMetadata,
} from 'shared/ReactFlightResult';
import type {ConsoleEntry} from 'shared/ReactFlightResult';
import type {
  Thenable,
  ReactDebugInfo,
  ReactDebugInfoEntry,
  ReactComponentInfo,
  ReactIOInfo,
  ReactAsyncInfo,
  ReactStackTrace,
  ReactCallSite,
  ReactFunctionLocation,
  ReactErrorInfo,
  ReactErrorInfoDev,
  ReactKey,
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
import type {ReactElement} from 'shared/ReactElementType';
import type {Chunk, BinaryChunk, Destination} from './ReactServerStreamConfig';
import type {
  ClientManifest,
  ClientReferenceMetadata,
  ClientReference,
  ClientReferenceKey,
  ServerReference,
  ServerReferenceId,
  HintCode,
  HintModel,
} from './ReactFlightServerConfig';
import {
  scheduleWork,
  scheduleMicrotask,
  flushBuffered,
  beginWriting,
  writeChunk,
  writeChunkAndReturn,
  stringToChunk,
  typedArrayToBinaryChunk,
  byteLengthOfChunk,
  byteLengthOfBinaryChunk,
  completeWriting,
  close,
  closeWithError,
} from './ReactServerStreamConfig';

export type {Destination, Chunk} from './ReactServerStreamConfig';

import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import type {LazyComponent} from 'react/src/ReactLazy';
import isArray from 'shared/isArray';
import getPrototypeOf from 'shared/getPrototypeOf';
import hasOwnProperty from 'shared/hasOwnProperty';
import noop from 'shared/noop';
import type {TemporaryReferenceSet} from './ReactFlightServerTemporaryReferences';
import {resolveTemporaryReference} from './ReactFlightServerTemporaryReferences';
import {
  enableTaint,
  enableProfilerTimer,
  enableComponentPerformanceTrack,
  enableFlightWeakThenables,
  enableFlightObjectReferences,
} from 'shared/ReactFeatureFlags';
import ReactSharedInternals from './ReactSharedInternalsServer';
import binaryToComparableString from 'shared/binaryToComparableString';
import {
  resolveClientReferenceMetadata,
  getServerReferenceId,
  getClientReferenceKey,
  isClientReference,
  isServerReference,
  supportsRequestStorage,
  requestStorage,
  cacheStorage,
  parseStackTrace,
  parseStackTracePrivate,
  unbadgeConsole,
} from './ReactFlightServerConfig';
import {setCurrentCache} from './flight/ReactFlightCurrentCache';
import {setCurrentOwner, resolveOwner} from './flight/ReactFlightCurrentOwner';

const stringify = JSON.stringify;

interface Reference {}

// DEV-only set containing internal objects that should not be limited and turned into getters.
const doNotLimit: WeakSet<Reference> = __DEV__ ? new WeakSet() : (null as any);

const CONSTRUCTOR_MARKER: symbol = __DEV__ ? Symbol() : (null as any);

let debugModelRoot: mixed = null;

let debugNoOutline: mixed = null;

const __PROTO__ = '__proto__';

const OPENING = 10;

const OPEN = 11;

const ABORTING = 12;

const CLOSING = 13;

const CLOSED = 14;

// Marker pushed before a [headerChunk, contentChunk] pair in
// completedRegularChunks / completedDebugChunks to signal that the next two
// entries must be written atomically — see emitTextChunk and
// emitTypedArrayChunk for why, and flushCompletedChunks for how it's read.
const NEXT_TWO_CHUNKS_ARE_ATOMIC: symbol = Symbol();

// task status
const PENDING = 0;

const COMPLETED = 1;

const ERRORED = 4;

const ABORTED = 3;

const RENDERING = 5;

const ObjectPrototype = Object.prototype;

type DeferredDebugStore = {
  retained: Map<number, ReactClientReference | string>,
  existing: Map<ReactClientReference | string, number>,
};

type Task = {
  id: number,
  status: 0 | 1 | 3 | 4 | 5,
  model: ReactClientValue,
  returnedTupleReference: null | string, // Location of the last fresh element tuple returned by the head.
  timed: boolean, // Profiling-only. Whether we need to track the completion time of this task.
  time: number, // Profiling-only. The last time stamp emitted for this task.
  environmentName: string, // DEV-only. Used to track if the environment for this task changed.
  debugOwner: null | ReactComponentInfo, // DEV-only
  debugInfoRecorded: boolean, // DEV-only
  debugPendingTime: null | number, // DEV-only
  debugStack: null | Error, // DEV-only
  debugTask: null | ConsoleTask, // DEV-only
};

export type InputSequenceEntry = {
  +done?: boolean,
  +value: ReactClientValue,
  ...
};

export type InputSequenceReader = {
  progress: InputSequenceEntry => void,
  rejectEntry: (mixed, void | ErrorReference) => void,
  error: (mixed, void | ErrorReference) => void,
  halt: () => void,
};

export type InputAsyncIterableReader = {
  enqueue: (Promise<ReactClientValue>, boolean) => void,
  close: () => void,
  error: (mixed, void | ErrorReference) => void,
  halt: () => void,
};

export type InputThenableReader = {
  debug?: ReactDebugInfoEntry => void, // DEV-only
  resolve: any => void,
  reject: (mixed, void | ErrorReference) => void,
  halt: () => void,
};

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | $ReadOnlyArray<ReactClientValue>
  | ReactClientObject;

// Serializable values
export type ReactClientValue =
  // Lazy values refer to asynchronous outcomes recorded by the producer.
  | React$Element<component(...props: any)>
  | LazyComponent<ReactClientValue, any>
  // References are passed by their value
  | ClientReference<any>
  | ServerReference<any>
  // The rest are passed as is. Sub-types can be passed in but lose their
  // subtype, so the receiver can only accept once of these.
  | React$Element<string>
  | React$Element<ClientReference<any> & any>
  | ReactComponentInfo
  | ReactErrorInfo
  | string
  | boolean
  | number
  | symbol
  | null
  | void
  | bigint
  | ReadableStream
  | $AsyncIterable<ReactClientValue, ReactClientValue, void>
  | $AsyncIterator<ReactClientValue, ReactClientValue, void>
  | Iterable<ReactClientValue>
  | Iterator<ReactClientValue>
  | Array<ReactClientValue>
  | Map<ReactClientValue, ReactClientValue>
  | Set<ReactClientValue>
  | FormData
  | Blob
  | Error
  | $ArrayBufferView
  | ArrayBuffer
  | Date
  | ReactClientObject
  | Promise<ReactClientValue>;

export type Input = {
  root: ResultModel<ReactClientValue>,
  debugStartTime?: number, // DEV-only
  temporaryReferences: void | TemporaryReferenceSet,
  getReadableStream: Object => void | {
    isByteStream: boolean,
    subscribe: InputSequenceReader => () => void,
  },
  getAsyncIterable: Object => void | {
    isIterator: boolean,
    subscribe: InputAsyncIterableReader => () => void,
  },
  getIteratorEntries: Object => void | $ReadOnlyArray<mixed>,
  getServerReference: Object => void | ServerReferenceMetadata,
  getErrorInfo: Error => void | ReactErrorInfoDev,
  getValueReference: Object => void | ModelReference,
  getModelInfo: Object => number,
  getJSONWorkCredit: () => number,
  getCollectionEntries: Object => void | ResultModel<Array<any>>,
  subscribeToThenable: (Thenable<any>, InputThenableReader) => () => void,
  subscribe: ({
    hint: (HintCode, HintModel<any>) => void,
    console?: ConsoleEntry => void,
    complete: () => void,
  }) => () => void,
};

export type Request = {
  status: 10 | 11 | 12 | 13 | 14,
  flushScheduled: boolean,
  fatalError: mixed,
  destination: null | Destination,
  bundlerConfig: ClientManifest,
  abortController: AbortController,
  nextChunkId: number,
  pendingChunks: number,
  jsonWorkSpent: number,
  input: null | Input,
  inputSubscriptions: Set<() => void>,
  writtenModels: WeakMap<Object, number>,
  writtenErrors: WeakMap<ErrorReference, number>,
  abortableTasks: Set<Task>,
  pingedTasks: Array<Task>,
  completedImportChunks: Array<Chunk>,
  completedHintChunks: Array<Chunk>,
  // Text and TypedArray rows are pushed as a NEXT_TWO_CHUNKS_ARE_ATOMIC
  // sentinel followed by their [headerChunk, contentChunk] pair, so that
  // flushCompletedChunks can write the pair atomically and never strand the
  // content chunk on a backpressure break.
  completedRegularChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >,
  completedErrorChunks: Array<Chunk>,
  writtenSymbols: Map<symbol, number>,
  writtenClientReferences: Map<ClientReferenceKey, number>,
  writtenServerReferences: Map<ServerReference<any>, number>,
  writtenObjects: WeakMap<Reference, string>,
  writtenImportStrings: Map<string, string>,
  // The combined length of the keys in writtenImportStrings.
  writtenImportStringsSize: number,
  temporaryReferences: void | TemporaryReferenceSet,
  taintCleanupQueue: Array<string | bigint>,
  onError: (error: mixed) => ?string,
  // Profiling-only
  timeOrigin: number,
  abortTime: number,
  // DEV-only
  pendingDebugChunks: number,
  // See completedRegularChunks for why some entries are preceded by the
  // NEXT_TWO_CHUNKS_ARE_ATOMIC sentinel.
  completedDebugChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >,
  debugDestination: null | Destination,
  environmentName: () => string,
  filterStackFrame: (
    url: string,
    functionName: string,
    lineNumber: number,
    columnNumber: number,
  ) => boolean,
  writtenDebugObjects: WeakMap<Reference, string>,
  unkeyedElements: WeakSet<Reference>,
  deferredDebugObjects: null | DeferredDebugStore,
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

function RequestInstance(
  this: $FlowFixMe,
  input: Input,
  bundlerConfig: ClientManifest,
  onError: void | ((error: mixed) => ?string),
  temporaryReferences: void | TemporaryReferenceSet,
  debugStartTime: void | number, // Profiling-only
  environmentName: void | string | (() => string), // DEV-only
  filterStackFrame: void | ((url: string, functionName: string) => boolean), // DEV-only
  keepDebugAlive: boolean, // DEV-only
) {
  if (__DEV__ && debugStartTime === undefined) {
    debugStartTime = input.debugStartTime;
  }
  const abortSet: Set<Task> = new Set();
  const pingedTasks: Array<Task> = [];
  const cleanupQueue: Array<string | bigint> = [];
  if (enableTaint) {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  this.status = OPENING;
  this.flushScheduled = false;
  this.fatalError = null;
  this.destination = null;
  this.bundlerConfig = bundlerConfig;
  this.abortController = new AbortController();
  this.nextChunkId = 0;
  this.pendingChunks = 0;
  this.jsonWorkSpent = 0;
  this.abortableTasks = abortSet;
  this.pingedTasks = pingedTasks;
  this.completedImportChunks = [] as Array<Chunk>;
  this.completedHintChunks = [] as Array<Chunk>;
  this.completedRegularChunks = [] as Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >;
  this.completedErrorChunks = [] as Array<Chunk>;
  this.writtenSymbols = new Map();
  this.writtenClientReferences = new Map();
  this.writtenServerReferences = new Map();
  this.writtenObjects = new WeakMap();
  this.writtenImportStrings = new Map();
  this.writtenImportStringsSize = 0;
  this.temporaryReferences = input.temporaryReferences || temporaryReferences;
  this.taintCleanupQueue = cleanupQueue;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.input = input;
  this.inputSubscriptions = new Set();
  this.writtenModels = new WeakMap();
  this.writtenErrors = new WeakMap();

  if (__DEV__) {
    this.pendingDebugChunks = 0;
    this.completedDebugChunks = [] as Array<
      Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
    >;
    this.debugDestination = null;
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
    this.writtenDebugObjects = new WeakMap();
    this.unkeyedElements = new WeakSet();
    this.deferredDebugObjects = keepDebugAlive
      ? {
          retained: new Map(),
          existing: new Map(),
        }
      : null;
  }

  let timeOrigin: number;
  if (enableProfilerTimer) {
    // We start by serializing the time origin. Any future timestamps will be
    // emitted relatively to this origin. Instead of using performance.timeOrigin
    // as this origin, we use the timestamp at the start of the request.
    // This avoids leaking unnecessary information like how long the server has
    // been running and allows for more compact representation of each timestamp.
    // The time origin is stored as an offset in the time space of this environment.
    if (typeof debugStartTime === 'number') {
      // We expect `startTime` to be an absolute timestamp, so relativize it to match the other case.
      timeOrigin = this.timeOrigin =
        debugStartTime -
        // $FlowFixMe[prop-missing]
        performance.timeOrigin;
    } else {
      timeOrigin = this.timeOrigin = performance.now();
    }
    emitTimeOriginChunk(
      this,
      timeOrigin +
        // $FlowFixMe[prop-missing]
        performance.timeOrigin,
    );
    this.abortTime = -0.0;
  } else {
    timeOrigin = 0;
  }

  const rootTask = createTask(
    this,
    input.root,
    abortSet,
    timeOrigin,
    null,
    null,
    null,
  );
  subscribeToInput(this, input, rootTask);
}

// Thenable<ReactClientValue>
type ReactClientObject = {+[key: string]: ReactClientValue};

type ReactClientReference = Reference & ReactClientValue;

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

function defaultErrorHandler(error: mixed) {
  console['error'](error);
  // Don't transform to our wrapper
}

export function createRequest(
  input: Input,
  bundlerConfig: ClientManifest,
  onError: void | ((error: mixed) => ?string),
  temporaryReferences: void | TemporaryReferenceSet,
  debugStartTime: void | number, // Profiling-only
  environmentName: void | string | (() => string), // DEV-only
  filterStackFrame: void | ((url: string, functionName: string) => boolean), // DEV-only
  keepDebugAlive: boolean, // DEV-only
): Request {
  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
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

function serializeDebugThenable(
  request: Request,
  counter: {objectLimit: number},
  thenable: Thenable<any>,
): string {
  // Like serializeThenable but for renderDebugModel
  if (__DEV__ && getResultModelStatus(thenable as any) !== null) {
    const source = (thenable as any)._debugSource;
    if (source !== undefined) {
      const existing = request.writtenDebugObjects.get(source);
      if (existing !== undefined) {
        request.writtenDebugObjects.set(thenable, existing);
        return existing;
      }
    }
  }
  request.pendingDebugChunks++;
  const id = request.nextChunkId++;
  const ref = serializePromiseID(id);
  request.writtenDebugObjects.set(thenable, ref);
  if (__DEV__ && getResultModelStatus(thenable as any) !== null) {
    const source = (thenable as any)._debugSource;
    if (source !== undefined) {
      request.writtenDebugObjects.set(source, ref);
    }
  }

  if (__DEV__ && getResultModelStatus(thenable as any) !== null) {
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

function createThenableTask(
  request: Request,
  task: Task,
  thenable: Thenable<any>,
): Task {
  return createTask(
    request,
    thenable as any, // will be replaced by the value before we retry. used for debug info.
    request.abortableTasks,
    enableProfilerTimer ? task.time : 0,
    __DEV__ ? task.debugOwner : null,
    __DEV__ ? task.debugStack : null,
    __DEV__ ? task.debugTask : null,
  );
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

function serializeRowHeader(tag: string, id: number) {
  return id.toString(16) + ':' + tag;
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
    const digest = logRecoverableError(request, x, null);
    emitErrorChunk(request, errorId, digest, x, true, null);
    return serializeByValueID(errorId);
  }
}

function serializeDebugLargeTextString(request: Request, text: string): string {
  request.pendingDebugChunks++;
  const textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, true);
  return serializeByValueID(textId);
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

// Determines if we're currently rendering at the top level of a task and therefore
// is safe to emit debug info associated with that task. Otherwise, if we're in
// a nested context, we need to first outline.
let canEmitDebugInfo: boolean = false;

// Approximate string length of the currently serializing row.
// Used to power outlining heuristics.
let serializedSize = 0;

const MAX_ROW_SIZE = 3200;

// Bundler metadata repeats the same chunk URLs across every client reference of
// a route, so strings in it at least this long get outlined and deduplicated
// when they repeat. The threshold is bounded away from zero because outlining
// something as short as an export name costs more than copying it.
const MIN_DEDUPLICATED_IMPORT_STRING_LENGTH = 16;

// Tracked strings are retained for the rest of the request, so their combined
// length is capped.
const MAX_DEDUPLICATED_IMPORT_STRINGS_SIZE = 32768;

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

function renderModel(
  request: Request,
  task: Task,
  parent:
    | {+[key: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  key: string,
  value: ReactClientValue,
  modelInfo: number,
  parentReference?: null | string,
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
      modelInfo,
      parentReference,
    );
  } catch (thrownValue) {
    // If the errored value was an element or lazy it can be reduced
    // to a lazy reference, so that it doesn't error the parent.
    const model = task.model;
    const kind =
      model === value
        ? modelInfo & MODEL_KIND_MASK
        : model !== null && typeof model === 'object' && request.input !== null
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
      if (wasReactNode) {
        return serializeLazyID(errorId);
      }
      return serializeByValueID(errorId);
    }

    const x = thrownValue;

    // Something errored. We'll still send everything we have up until this point.
    request.pendingChunks++;
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, x, task);
    emitErrorChunk(
      request,
      errorId,
      digest,
      x,
      false,
      __DEV__ ? task.debugOwner : null,
    );
    if (wasReactNode) {
      // We'll replace this element with a lazy reference that throws on the client
      // once it gets rendered.
      return serializeLazyID(errorId);
    }
    // If we don't know if it was a React Node we render a direct reference and let
    // the client deal with it.
    return serializeByValueID(errorId);
  }
}

function serializeTemporaryReference(
  request: Request,
  reference: string,
): string {
  return '$T' + reference;
}

function serializeLargeTextString(request: Request, text: string): string {
  request.pendingChunks++;
  const textId = request.nextChunkId++;
  emitTextChunk(request, textId, text, false);
  return serializeByValueID(textId);
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
  if (request.writtenObjects.has(ioInfo)) {
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

function emitTextChunk(
  request: Request,
  id: number,
  text: string,
  debug: boolean,
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

// This is a forked version of renderModel which should never error, never suspend and is limited
// in the depth it can encode.
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
  task.debugInfoRecorded = true;
  task.timed = false;
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
        if (ioInfo.end <= request.timeOrigin) {
          // This was already resolved when we started this render. It must have been some
          // externally cached data. We exclude that information but we keep components and
          // awaits that happened inside this render but might have been deduped within the
          // render.
        } else {
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
          const debugAsyncInfo: Omit<
            ReactAsyncInfo,
            'debugTask' | 'debugStack',
          > = {
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
        }
      } else {
        request.pendingChunks++;
        emitDebugChunk(request, id, info);
      }
    }
  }
}

function forwardDebugInfoFromThenable(
  request: Request,
  task: Task,
  thenable: Thenable<any>,
): void {
  if (__DEV__) {
    if (getResultModelStatus(thenable as any) !== null) {
      return;
    }
    const debugInfo = thenable._debugInfo;
    if (debugInfo) {
      forwardDebugInfo(request, task, debugInfo);
    }
  }
}

function forwardDebugInfoFromAbortedTask(request: Request, task: Task): void {
  if (__DEV__) {
    const model: any = task.model;
    if (typeof model === 'object' && model !== null) {
      if (getResultModelStatus(model) !== null) {
        return;
      }
      const debugInfo = model._debugInfo;
      if (debugInfo) {
        forwardDebugInfo(request, task, debugInfo);
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
    emitTextChunk(request, id, value, false);
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
      const json = stringify(serializeServerReference(request, value as any));
      emitModelChunk(request, id, json);
      return;
    }
    if (value instanceof ArrayBuffer) {
      emitTypedArrayChunk(request, id, 'A', new Uint8Array(value), false);
      return;
    }
    if (value instanceof Int8Array) {
      // char
      emitTypedArrayChunk(request, id, 'O', value, false);
      return;
    }
    if (value instanceof Uint8Array) {
      // unsigned char
      emitTypedArrayChunk(request, id, 'o', value, false);
      return;
    }
    if (value instanceof Uint8ClampedArray) {
      // unsigned clamped char
      emitTypedArrayChunk(request, id, 'U', value, false);
      return;
    }
    if (value instanceof Int16Array) {
      // sort
      emitTypedArrayChunk(request, id, 'S', value, false);
      return;
    }
    if (value instanceof Uint16Array) {
      // unsigned short
      emitTypedArrayChunk(request, id, 's', value, false);
      return;
    }
    if (value instanceof Int32Array) {
      // long
      emitTypedArrayChunk(request, id, 'L', value, false);
      return;
    }
    if (value instanceof Uint32Array) {
      // unsigned long
      emitTypedArrayChunk(request, id, 'l', value, false);
      return;
    }
    if (value instanceof Float32Array) {
      // float
      emitTypedArrayChunk(request, id, 'G', value, false);
      return;
    }
    if (value instanceof Float64Array) {
      // double
      emitTypedArrayChunk(request, id, 'g', value, false);
      return;
    }
    if (value instanceof BigInt64Array) {
      // number
      emitTypedArrayChunk(request, id, 'M', value, false);
      return;
    }
    if (value instanceof BigUint64Array) {
      // unsigned number
      // We use "m" instead of "n" since JSON can start with "null"
      emitTypedArrayChunk(request, id, 'm', value, false);
      return;
    }
    if (value instanceof DataView) {
      emitTypedArrayChunk(request, id, 'V', value, false);
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
  const json: string = stringify(resolvedModel);
  emitModelChunk(request, task.id, json);
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

function renderClientElement(
  request: Request,
  task: Task,
  type: any,
  key: ReactKey,
  props: any,
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

function deferTask(request: Request, task: Task): ReactJSONValue {
  // Like outlineTask but instead the item is scheduled to be serialized
  // after its parent in the stream.
  const newTask = createTask(
    request,
    task.model, // the currently rendering element
    request.abortableTasks,
    enableProfilerTimer ? task.time : 0,
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

function outlineTask(request: Request, task: Task): ReactJSONValue {
  const newTask = createTask(
    request,
    task.model, // the currently rendering element
    request.abortableTasks,
    enableProfilerTimer ? task.time : 0,
    __DEV__ ? task.debugOwner : null,
    __DEV__ ? task.debugStack : null,
    __DEV__ ? task.debugTask : null,
  );
  if (typeof task.model === 'object' && task.model !== null) {
    request.writtenObjects.set(task.model, serializeByValueID(newTask.id));
  }

  retryTask(request, newTask);
  if (newTask.status === COMPLETED) {
    // We completed synchronously so we can refer to this by reference. This
    // makes it behaves the same as prod during deserialization.
    return serializeByValueID(newTask.id);
  }
  // This didn't complete synchronously so it wouldn't have even if we didn't
  // outline it, so this would reduce to a lazy reference even in prod.
  return serializeLazyID(newTask.id);
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

function outlineModel(request: Request, value: ReactClientValue): number {
  const newTask = createTask(
    request,
    value,
    request.abortableTasks,
    enableProfilerTimer
      ? performance.now() // TODO: This should really inherit the time from the task.
      : 0,
    null, // TODO: Currently we don't associate any debug information with
    null, // this object on the server. If it ends up erroring, it won't
    null, // have any context on the server but can on the client.
  );
  if (typeof value === 'object' && value !== null) {
    request.writtenObjects.set(value, serializeByValueID(newTask.id));
  }
  retryTask(request, newTask);
  return newTask.id;
}

function renderObjectReference(
  request: Request,
  task: Task,
  parent:
    | {+[propertyName: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  parentPropertyName: string,
  value: Object,
  existingReference: void | string,
  parentReference?: null | string,
): null | string {
  if (existingReference !== undefined) {
    if (modelRoot === value) {
      if (existingReference !== serializeByValueID(task.id)) {
        return existingReference;
      }
      modelRoot = null;
    } else {
      return existingReference;
    }
  } else if (parentPropertyName.indexOf(':') !== -1) {
    return serializeByValueID(outlineModel(request, value));
  } else {
    const writtenObjects = request.writtenObjects;
    if (parentReference === undefined) {
      parentReference = writtenObjects.get(parent);
    }
    if (parentReference != null) {
      let propertyName = parentPropertyName;
      if (isArray(parent) && parent[0] === REACT_ELEMENT_TYPE) {
        // Element tuples are reconstructed before their property paths are read.
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
      writtenObjects.set(value, parentReference + ':' + propertyName);
    }
  }
  return null;
}

function renderModelDestructive(
  request: Request,
  task: Task,
  parent:
    | {+[propertyName: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  parentPropertyName: string,
  value: ReactClientValue,
  modelInfo?: number,
  parentReference?: null | string,
): ReactJSONValue {
  // Set the currently rendering model
  task.model = value;

  if (__DEV__) {
    if (parentPropertyName === __PROTO__) {
      callWithDebugContextInDEV(request, task, () => {
        console.error(
          'Expected not to serialize an object with own property `__proto__`. When parsed this property will be omitted.%s',
          describeObjectForErrorMessage(parent, parentPropertyName),
        );
      });
    }
  }

  // Special Symbol, that's very common.
  if (value === REACT_ELEMENT_TYPE) {
    return '$';
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'object') {
    const resultInput = request.input;
    const reference =
      resultInput === null ? undefined : resultInput.getValueReference(value);
    if (reference !== undefined) {
      const id = serializeThenable(
        request,
        task,
        reference.root as any,
        __DEV__,
      );
      const path = [];
      let location = reference;
      let ancestor = location.parent;
      while (ancestor !== null) {
        path.push(location.key);
        location = ancestor;
        ancestor = location.parent;
      }
      let name = serializeByValueID(id);
      for (let i = path.length - 1; i >= 0; i--) {
        name += ':' + path[i];
      }
      return name;
    }
    const kind =
      (modelInfo === undefined
        ? resultInput === null
          ? 0
          : resultInput.getModelInfo(value)
        : modelInfo) & MODEL_KIND_MASK;
    if (kind === MODEL_OBJECT || kind === MODEL_ARRAY) {
      const objectReference = renderObjectReference(
        request,
        task,
        parent,
        parentPropertyName,
        value,
        request.writtenObjects.get(value),
        parentReference,
      );
      if (objectReference !== null) {
        return objectReference;
      }
      return kind === MODEL_ARRAY
        ? renderFragment(request, task, value as any)
        : (value as any);
    }
    switch (
      kind === MODEL_ELEMENT ? REACT_ELEMENT_TYPE : (value as any).$$typeof
    ) {
      case REACT_ELEMENT_TYPE: {
        let elementReference = null;
        const writtenObjects = request.writtenObjects;
        const existingReference = writtenObjects.get(value);
        if (existingReference !== undefined) {
          if (modelRoot === value) {
            if (existingReference !== serializeByValueID(task.id)) {
              return existingReference;
            }
            // This is the ID we're currently emitting so we need to write it
            // once but if we discover it again, we refer to it by id.
            modelRoot = null;
          } else {
            // We've already emitted this as an outlined object, so we can refer to that by its
            // existing ID. TODO: We should use a lazy reference since, unlike plain objects,
            // elements might suspend so it might not have emitted yet even if we have the ID for
            // it. However, this creates an extra wrapper when it's not needed. We should really
            // detect whether this already was emitted and synchronously available. In that
            // case we can refer to it synchronously and only make it lazy otherwise.
            // We currently don't have a data structure that lets us see that though.
            return existingReference;
          }
        } else if (parentPropertyName.indexOf(':') !== -1) {
          return outlineTask(request, task);
        } else {
          if (parentReference === undefined) {
            parentReference = writtenObjects.get(parent);
          }
          if (parentReference != null) {
            // If the parent has a reference, we can refer to this object indirectly
            // through the property name inside that parent.
            elementReference = parentReference + ':' + parentPropertyName;
            writtenObjects.set(value, elementReference);
          }
        }

        const element: ReactElement = value as any;

        if (serializedSize > MAX_ROW_SIZE) {
          return deferTask(request, task);
        }

        if (__DEV__) {
          const debugInfo: ?ReactDebugInfo = (value as any)._debugInfo;
          if (debugInfo && kind !== MODEL_ELEMENT) {
            // If this came from Flight, forward any debug info into this new row.
            if (!canEmitDebugInfo) {
              // We don't have a chunk to assign debug info. We need to outline this
              // component to assign it an ID.
              return outlineTask(request, task);
            } else {
              // Forward any debug info we have the first time we see it.
              forwardDebugInfo(request, task, debugInfo);
            }
          }
        }

        const props = element.props;
        if (__DEV__) {
          task.debugOwner = element._owner;
          task.debugStack = element._debugStack;
          task.debugTask = element._debugTask;
          if (
            element._owner === undefined ||
            element._debugStack === undefined ||
            element._debugTask === undefined
          ) {
            let key = '';
            if (element.key !== null && element.key !== REACT_OPTIMISTIC_KEY) {
              key = ' key="' + element.key + '"';
            }

            console.error(
              'Attempted to render <%s%s> without development properties. ' +
                'This is not supported. It can happen if:' +
                '\n- The element is created with a production version of React but rendered in development.' +
                '\n- The element was cloned with a custom function instead of `React.cloneElement`.\n' +
                'The props of this element may help locate this element: %o',
              element.type,
              key,
              element.props,
            );
          }
          // TODO: Pop this. Since we currently don't have a point where we can pop the stack
          // this debug information will be used for errors inside sibling properties that
          // are not elements. Leading to the wrong attribution on the server. We could fix
          // that if we switch to a proper stack instead of resolveModel's recursive walk.
          // Attribution on the client is still correct since it has a pop.
        }

        const newChild = renderClientElement(
          request,
          task,
          element.type,
          // $FlowFixMe[incompatible-call] the key of an element is null | string | ReactOptimisticKey
          element.key,
          props,
          __DEV__
            ? element._store.validated ||
                (request.unkeyedElements.has(element) ? 2 : 0)
            : 0,
        );
        if (!__DEV__) {
          task.returnedTupleReference = elementReference;
        } else if (
          typeof newChild === 'object' &&
          newChild !== null &&
          elementReference !== null
        ) {
          // If this element renders another object, we can now refer to that object through
          // the same location as this element.
          if (!writtenObjects.has(newChild)) {
            writtenObjects.set(newChild, elementReference);
          }
        }
        return newChild;
      }
      case REACT_LAZY_TYPE: {
        // A normalized lazy already refers to an independent Result cell.
        // serializeThenable schedules its row; deferring again would only
        // allocate another task to emit a forwarding reference to that row.
        const lazy: LazyComponent<any, any> = value as any;
        return serializeLazyID(serializeThenable(request, task, lazy._payload));
      }
    }

    if (isClientReference(value)) {
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value as any,
      );
    }

    if (enableFlightObjectReferences && isServerReference(value)) {
      // An object registered as a Server Reference. This must be checked
      // before the thenable case below so that a reference that happens to
      // be a Promise is serialized by reference instead of being awaited.
      return serializeServerReference(request, value as any);
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

    if (enableTaint) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }

    const writtenObjects = request.writtenObjects;
    const existingReference = writtenObjects.get(value);
    // $FlowFixMe[method-unbinding]
    if (typeof value.then === 'function') {
      // A weak-pending thenable may never emit, so its reference is marked
      // on the wire ($w instead of $@). That way the client knows to leave
      // it forever pending, instead of erroring it, if the stream closes
      // first.
      if (existingReference !== undefined) {
        if (modelRoot === value) {
          // This is the ID we're currently emitting so we need to write it
          // once but if we discover it again, we refer to it by id.
          modelRoot = null;
        } else {
          // We've seen this promise before, so we can just refer to the same result.
          return existingReference;
        }
      }
      // We assume that any object with a .then property is a "Thenable" type,
      // or a Promise type. Either of which can be represented by a Promise.
      const promiseId = serializeThenable(request, task, value as any);
      const promiseReference =
        enableFlightWeakThenables && (value as any).status === 'pending_weak'
          ? serializeWeakPromiseID(promiseId)
          : serializePromiseID(promiseId);
      writtenObjects.set(value, promiseReference);
      return promiseReference;
    }

    if (value instanceof Date) {
      return serializeDate(value);
    }

    const objectReference = renderObjectReference(
      request,
      task,
      parent,
      parentPropertyName,
      value,
      existingReference,
      parentReference,
    );
    if (objectReference !== null) {
      return objectReference;
    }

    if (isArray(value)) {
      return renderFragment(request, task, value);
    }

    if (value instanceof Map) {
      return serializeMap(request, task, value);
    }
    if (value instanceof Set) {
      return serializeSet(request, task, value);
    }
    // TODO: FormData is not available in old Node. Remove the typeof later.
    if (typeof FormData === 'function' && value instanceof FormData) {
      return serializeFormData(request, value);
    }
    if (value instanceof Error) {
      return serializeErrorValue(request, value);
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
    // TODO: Blob is not available in old Node. Remove the typeof check later.
    if (typeof Blob === 'function' && value instanceof Blob) {
      return serializeBlob(request, value);
    }

    const iteratorFn = getIteratorFn(value);
    if (iteratorFn) {
      const input = request.input;
      const entries =
        input === null ? undefined : input.getIteratorEntries(value);
      if (entries === undefined) {
        // eslint-disable-next-line react-internal/prod-error-codes
        throw new Error('A Result must record iterators before serialization.');
      }
      return serializeIterator(request, entries as any);
    }

    // TODO: Blob is not available in old Node. Remove the typeof check later.
    const input = request.input;
    if (input !== null && input.getReadableStream(value) !== undefined) {
      return serializeReadableStream(request, task, value);
    }
    if (input !== null && input.getAsyncIterable(value) !== undefined) {
      return serializeAsyncIterable(request, task, value as any);
    }

    // $FlowFixMe[incompatible-type]
    return value;
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

  if (typeof value === 'function') {
    if (isClientReference(value)) {
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value as any,
      );
    }
    if (isServerReference(value)) {
      return serializeServerReference(request, value as any);
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

    if (enableTaint) {
      const tainted = TaintRegistryObjects.get(value);
      if (tainted !== undefined) {
        throwTaintViolation(tainted);
      }
    }
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

function serializeDate(date: Date): string {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + date.toJSON();
}

function serializeBigInt(n: bigint): string {
  return '$n' + n.toString(10);
}

function resolveModel(
  request: Request,
  task: Task,
  parent:
    | {+[key: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
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
    modelInfo,
    parentReference,
  );

  if (rendered === null || typeof rendered !== 'object') {
    return rendered;
  }

  // A pure row has no outlining decisions. After the threshold, omitted size
  // cannot change its truth in this traversal, so a skip adds no serializedSize.
  if (
    !__DEV__ &&
    rendered === value &&
    (rowRoot || serializedSize > MAX_ROW_SIZE) &&
    !(enableTaint && TaintRegistryValues.size !== 0)
  ) {
    if (input !== null) {
      const work = getJSONModelWork(modelInfo);
      if (
        work !== 0 &&
        request.jsonWorkSpent + work <= input.getJSONWorkCredit()
      ) {
        request.jsonWorkSpent += work;
        return rendered;
      }
    }
  }

  if (isArray(rendered)) {
    // In production, only renderClientElement returns an array distinct from its input.
    if (!__DEV__ && rendered !== value) {
      return resolveElementTuple(
        request,
        task,
        rendered as any,
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

  // Result has already normalized these fields. Keep visiting them to assign
  // references and account for row size, but only copy when lowering changes one.
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
            if (previousKey === __PROTO__) {
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
        if (key === __PROTO__) {
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

let modelRoot: null | ReactClientValue = false;

function emitModelChunk(request: Request, id: number, json: string): void {
  const row = id.toString(16) + ':' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}

function serializeByValueID(id: number): string {
  return '$' + id.toString(16);
}

function serializeLazyID(id: number): string {
  return '$L' + id.toString(16);
}

let currentRequest: null | Request = null;

function serializePromiseID(id: number): string {
  return '$@' + id.toString(16);
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

function serializeSymbolReference(name: string): string {
  return '$S' + name;
}

function emitSymbolChunk(request: Request, id: number, name: string): void {
  const symbolReference = serializeSymbolReference(name);
  const processedChunk = encodeReferenceChunk(request, id, symbolReference);
  request.completedImportChunks.push(processedChunk);
}

function encodeReferenceChunk(
  request: Request,
  id: number,
  reference: string,
): Chunk {
  const json = stringify(reference);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

function createTask(
  request: Request,
  model: ReactClientValue,
  abortSet: Set<Task>,
  lastTimestamp: number, // Profiling-only
  debugOwner: null | ReactComponentInfo, // DEV-only
  debugStack: null | Error, // DEV-only
  debugTask: null | ConsoleTask, // DEV-only
): Task {
  const id = request.nextChunkId++;
  request.pendingChunks++;
  if (typeof model === 'object' && model !== null) {
    // If we're about to write this into a new task we can assign it an ID early so that
    // any other references can refer to the value we're about to write.
    if (!request.writtenObjects.has(model)) {
      request.writtenObjects.set(model, serializeByValueID(id));
    }
  }
  const task: Task = {
    id,
    status: PENDING,
    model,
    returnedTupleReference: null,
  } as Omit<
    Task,
    | 'timed'
    | 'time'
    | 'environmentName'
    | 'debugOwner'
    | 'debugInfoRecorded'
    | 'debugPendingTime'
    | 'debugStack'
    | 'debugTask',
  > as any;
  if (enableProfilerTimer) {
    task.timed = false;
    task.time = lastTimestamp;
  }
  if (__DEV__) {
    task.debugInfoRecorded = false;
    task.debugPendingTime = null;
    task.environmentName = request.environmentName();
    task.debugOwner = debugOwner;
    task.debugStack = debugStack;
    task.debugTask = debugTask;
  }
  abortSet.add(task);
  return task;
}

function resolveElementTuple(
  request: Request,
  task: Task,
  tuple: Array<ReactJSONValue>,
  tupleReference: null | string,
): Array<ReactJSONValue> {
  // The fresh tuple is private. Keep its element marker intact until all fields
  // have used it to classify client types and lower type/props property paths.
  const marker = resolveModel(
    request,
    task,
    tuple as any,
    '0',
    tuple[0] as any,
    false,
    tupleReference,
  );
  const type = resolveModel(
    request,
    task,
    tuple as any,
    '1',
    tuple[1] as any,
    false,
    tupleReference,
  );
  const key = resolveModel(
    request,
    task,
    tuple as any,
    '2',
    tuple[2] as any,
    false,
    tupleReference,
  );
  const props = resolveModel(
    request,
    task,
    tuple as any,
    '3',
    tuple[3] as any,
    false,
    tupleReference,
  );
  tuple[0] = marker;
  tuple[1] = type;
  tuple[2] = key;
  tuple[3] = props;
  return tuple;
}

// Null on the debug channel, which can't reference rows in the main stream.
let importStringRequest: null | Request = null;

function pingTask(request: Request, task: Task): void {
  if (enableProfilerTimer) {
    // If this was async we need to emit the time when it completes.
    task.timed = !__DEV__ || !task.debugInfoRecorded;
  }
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    request.flushScheduled = request.destination !== null;
    if (request.status === OPENING) {
      scheduleMicrotask(() => performWork(request));
    } else {
      scheduleWork(() => performWork(request));
    }
  }
}

function subscribeInput(
  request: Request,
  subscribe: (() => void) => () => void,
): void {
  const input = request.input;
  if (input !== null) {
    const subscriptions = request.inputSubscriptions;
    let active = true;
    let unsubscribe = noop;
    const detach = (): void => {
      active = false;
      subscriptions.delete(detach);
      unsubscribe();
    };
    subscriptions.add(detach);
    unsubscribe = subscribe(detach);
    if (!active || request.status > OPEN) {
      detach();
    }
  }
}

// Bundler metadata is two or three levels deep. The bound is only there so a
// cycle ends up in stringify itself, which throws its own error for it.
const MAX_IMPORT_METADATA_DEPTH = 16;

const NOT_PLAIN_IMPORT_METADATA = {};

function subscribeToInput(
  request: Request,
  input: Input,
  rootTask: Task,
): void {
  request.writtenModels.set(input.root as any, rootTask.id);
  // The source can still produce hints after its root becomes available.
  request.pendingChunks++;
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
      request.input = null;
      request.inputSubscriptions.forEach(detach => detach());
      request.inputSubscriptions.clear();
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
  subscribeInput(request, detach =>
    input.subscribeToThenable(input.root as any, {
      debug: __DEV__
        ? info => {
            if (rootTask.status === PENDING) {
              forwardInputDebugInfo(request, rootTask, info);
            }
          }
        : undefined,
      resolve(value) {
        detach();
        if (rootTask.status === PENDING) {
          forwardDebugInfoFromThenable(request, rootTask, input.root);
          if (__DEV__ && (input.root as any)._debugInfo !== undefined) {
            rootTask.debugInfoRecorded = true;
            rootTask.timed = false;
          }
          rootTask.model = value;
          pingTask(request, rootTask);
        }
      },
      reject(error, reference) {
        detach();
        if (rootTask.status === PENDING) {
          forwardDebugInfoFromThenable(request, rootTask, input.root);
          if (__DEV__) {
            const model = getDebugModel(input.root);
            if (model !== undefined) {
              rootTask.model = model;
              pingTask(request, rootTask);
              return;
            }
          }
          try {
            erroredInputTask(request, rootTask, error, reference);
            scheduleMicrotask(() => flushCompletedChunks(request));
          } catch (fatal) {
            fatalError(request, fatal);
          }
        }
      },
      halt() {
        detach();
        if (rootTask.status === PENDING) {
          haltInputTask(request, rootTask);
        }
      },
    }),
  );
}

function serializeThenable(
  request: Request,
  task: Task,
  thenable: Thenable<any>,
  synchronous: boolean = false,
): number {
  const input = request.input;
  if (input === null) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error('Cannot serialize a detached Result.');
  }
  const writtenModels = request.writtenModels;
  const existingId = writtenModels.get(thenable as any);
  if (existingId !== undefined) {
    return existingId;
  }
  const newTask = createThenableTask(request, task, thenable);
  writtenModels.set(thenable as any, newTask.id);
  // Synchronous DEV component regions correspond to Flight's outlineTask.
  // Pending cells keep the ordinary thenable scheduling path.
  if (__DEV__) {
    synchronous = synchronous && thenable.status === 'fulfilled';
  }
  subscribeInput(request, detach =>
    input.subscribeToThenable(thenable, {
      debug: __DEV__
        ? info => {
            if (newTask.status === PENDING) {
              forwardInputDebugInfo(request, newTask, info);
            }
          }
        : undefined,
      resolve(value) {
        detach();
        if (newTask.status === PENDING) {
          forwardDebugInfoFromThenable(request, newTask, thenable);
          if (__DEV__ && thenable._debugInfo !== undefined) {
            newTask.debugInfoRecorded = true;
            newTask.timed = false;
          }
          newTask.model = value;
          if (__DEV__ && synchronous) {
            retryTask(request, newTask);
          } else {
            pingTask(request, newTask);
          }
        }
      },
      reject(error, reference) {
        detach();
        if (newTask.status === PENDING) {
          forwardDebugInfoFromThenable(request, newTask, thenable);
          if (__DEV__ && getResultModelStatus(thenable) !== null) {
            const model = getDebugModel(thenable as any);
            if (model !== undefined) {
              newTask.model = model;
              pingTask(request, newTask);
              return;
            }
          }
          try {
            if (enableProfilerTimer) {
              newTask.timed = true;
            }
            erroredInputTask(request, newTask, error, reference);
            scheduleMicrotask(() => flushCompletedChunks(request));
          } catch (fatal) {
            fatalError(request, fatal);
          }
        }
      },
      halt() {
        detach();
        if (newTask.status === PENDING) {
          haltInputTask(request, newTask);
        }
      },
    }),
  );
  return newTask.id;
}

function retryTask(request: Request, task: Task): void {
  if (task.status !== PENDING) {
    // We completed this by other means before we had a chance to retry it.
    return;
  }

  const prevCanEmitDebugInfo = canEmitDebugInfo;
  task.status = RENDERING;

  // We stash the outer parent size so we can restore it when we exit.
  const parentSerializedSize = serializedSize;
  // We don't reset the serialized size counter from reentry because that indicates that we
  // are outlining a model and we actually want to include that size into the parent since
  // it will still block the parent row. It only restores to zero at the top of the stack.
  try {
    // Track the root so we know that we have to emit this object even though it
    // already has an ID. This is needed because we might see this object twice
    // in the same resolveModel walk if it is cyclic.
    modelRoot = task.model;

    const model = task.model;
    if (
      typeof model === 'object' &&
      model !== null &&
      !request.writtenObjects.has(model)
    ) {
      request.writtenObjects.set(model, serializeByValueID(task.id));
    }

    if (__DEV__) {
      // Track that we can emit debug info for the current task.
      canEmitDebugInfo = true;
    }

    // The destructive form tracks the current value for encoding errors.
    const resolvedModel = renderModelDestructive(
      request,
      task,
      emptyRoot,
      '',
      task.model,
    );

    if (__DEV__) {
      flushInputDebugTime(request, task);
    }

    if (__DEV__) {
      // We're now past rendering this task and future renders will spawn new tasks for their
      // debug info.
      canEmitDebugInfo = false;
    }

    // Track the root again for the resolved object.
    modelRoot = resolvedModel;

    if (__DEV__) {
      const currentEnv = (0, request.environmentName)();
      if (currentEnv !== task.environmentName) {
        request.pendingChunks++;
        // The environment changed since we last emitted any debug information for this
        // task. We emit an entry that just includes the environment name change.
        emitDebugChunk(request, task.id, {env: currentEnv});
      }
    }
    // We've finished rendering. Log the end time.
    if (enableProfilerTimer) {
      if (task.timed) {
        markOperationEndTime(request, task, performance.now());
      }
    }

    if (typeof resolvedModel === 'object' && resolvedModel !== null) {
      if (!__DEV__ && resolvedModel !== model && isArray(resolvedModel)) {
        // retryTask normally gives the fresh tuple this row's address before
        // emitChunk revisits it. Preserve that location without naming the tuple.
        modelRoot = null;
        const tuple = resolveElementTuple(
          request,
          task,
          resolvedModel as any,
          serializeByValueID(task.id),
        );
        const json: string = stringify(tuple);
        emitModelChunk(request, task.id, json);
      } else {
        if (!request.writtenObjects.has(resolvedModel)) {
          request.writtenObjects.set(
            resolvedModel,
            serializeByValueID(task.id),
          );
        }
        emitChunk(request, task, resolvedModel);
      }
    } else {
      // If the value is a string, it means it's a terminal value and we already escaped it.
      // We don't need to escape it again so it's not passed through resolveModel.
      // $FlowFixMe[incompatible-type] stringify can return null for undefined but we never do
      const json: string = stringify(resolvedModel);
      emitModelChunk(request, task.id, json);
    }

    task.status = COMPLETED;
    request.abortableTasks.delete(task);
  } catch (thrownValue) {
    if (request.status === ABORTING) {
      request.abortableTasks.delete(task);
      task.status = PENDING;
      const errorId: number = request.fatalError as any;
      abortTask(task, request, errorId);
      finishAbortedTask(task, request, errorId);
      return;
    }

    const x = thrownValue;
    erroredTask(request, task, x);
  } finally {
    if (__DEV__) {
      canEmitDebugInfo = prevCanEmitDebugInfo;
    }
    serializedSize = parentSerializedSize;
  }
}

function performWork(request: Request): void {
  const prevRequest = currentRequest;
  if (__DEV__) {
    currentRequest = request;
  }
  const prevCache = setCurrentCache(null);

  try {
    const pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (let i = 0; i < pingedTasks.length; i++) {
      const task = pingedTasks[i];
      retryTask(request, task);
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

function serializeClientReference(
  request: Request,
  parent:
    | {+[propertyName: string | number]: ReactClientValue}
    | $ReadOnlyArray<ReactClientValue>,
  parentPropertyName: string,
  clientReference: ClientReference<any>,
): string {
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
    // Stringify before claiming a chunk id so a throw can't leave it pending.
    const json = stringifyImportMetadata(
      request,
      clientReferenceMetadata,
      false,
    );
    request.pendingChunks++;
    const importId = request.nextChunkId++;
    emitImportChunk(request, importId, json, false);
    writtenClientReferences.set(clientReferenceKey, importId);
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
    request.pendingChunks++;
    const errorId = request.nextChunkId++;
    const digest = logRecoverableError(request, x, null);
    emitErrorChunk(request, errorId, digest, x, false, null);
    return serializeByValueID(errorId);
  }
}

function emitImportChunk(
  request: Request,
  id: number,
  json: string,
  debug: boolean,
): void {
  const row = serializeRowHeader('I', id) + json + '\n';
  const processedChunk = stringToChunk(row);
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(processedChunk);
  } else {
    request.completedImportChunks.push(processedChunk);
  }
}

function logRecoverableError(
  request: Request,
  error: mixed,
  task: Task | null, // DEV-only
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
  if (enableProfilerTimer) {
    if (task.timed) {
      markOperationEndTime(request, task, performance.now());
    }
  }
  task.status = ERRORED;
  const digest = logRecoverableError(request, error, task);
  emitErrorChunk(
    request,
    task.id,
    digest,
    error,
    false,
    __DEV__ ? task.debugOwner : null,
  );
  request.abortableTasks.delete(task);
}

function erroredInputTask(
  request: Request,
  task: Task,
  error: mixed,
  reference: void | ErrorReference,
): void {
  if (__DEV__) {
    flushInputDebugTime(request, task);
  }
  if (reference === undefined) {
    erroredTask(request, task, error);
    return;
  }
  if (enableProfilerTimer) {
    if (task.timed) {
      markOperationEndTime(request, task, performance.now());
    }
  }
  task.status = ERRORED;
  const input = request.input;
  if (input === null) {
    return;
  }
  const writtenErrors = request.writtenErrors;
  const existingId = writtenErrors.get(reference);
  if (existingId === undefined) {
    writtenErrors.set(reference, task.id);
    emitErrorChunk(
      request,
      task.id,
      reference.digest,
      error,
      false,
      __DEV__ ? task.debugOwner : null,
    );
  } else {
    const ref = serializeByValueID(existingId);
    request.completedErrorChunks.push(
      encodeReferenceChunk(request, task.id, ref),
    );
  }
  request.abortableTasks.delete(task);
}

function emitErrorChunk(
  request: Request,
  id: number,
  digest: string,
  error: mixed,
  debug: boolean, // DEV-only
  owner: ?ReactComponentInfo, // DEV-only
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
  importStringRequest = __DEV__ && debug ? null : request;
  try {
    // $FlowFixMe[incompatible-type] stringify can return null
    return stringify(clientReferenceMetadata, importMetadataReplacer);
  } finally {
    importStringRequest = prevRequest;
  }
}

// Copies the metadata with every string replaced by its serialized form, so
// that stringify can run without a replacer. Anything stringify would treat
// specially (toJSON, boxed primitives, class instances) makes this give up
// instead, because the copy would not reproduce that treatment.
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
      if (typeof (value as any).toJSON === 'function') {
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
        const element = (value as any)[key];
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

function emitHintChunk<Code: HintCode>(
  request: Request,
  code: Code,
  model: HintModel<Code>,
): void {
  const json: string = stringify(model);
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

function renderFragment(
  request: Request,
  task: Task,
  children: $ReadOnlyArray<ReactClientValue>,
): ReactJSONValue {
  if (__DEV__) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (
        child !== null &&
        typeof child === 'object' &&
        child.$$typeof === REACT_ELEMENT_TYPE &&
        (request.input === null ||
          (request.input.getModelInfo(child) & MODEL_KIND_MASK) !==
            MODEL_OBJECT)
      ) {
        const element: ReactElement = child as any;
        if (element.key === null && !element._store.validated) {
          request.unkeyedElements.add(element);
        }
      }
    }
  }

  if (__DEV__) {
    const debugInfo: ?ReactDebugInfo = (children as any)._debugInfo;
    if (debugInfo) {
      // If this came from Flight, forward any debug info into this new row.
      if (!canEmitDebugInfo) {
        // We don't have a chunk to assign debug info. We need to outline this
        // component to assign it an ID.
        return outlineTask(request, task);
      } else {
        // Forward any debug info we have the first time we see it.
        // We do this after init so that we have received all the debug info
        // from the server by the time we emit it.
        forwardDebugInfo(request, task, debugInfo);
      }
      // Since we're rendering this array again, create a copy that doesn't
      // have the debug info so we avoid outlining or emitting debug info again.
      children = Array.from(children);
    }
  }
  return children;
}

function enqueueFlush(request: Request): void {
  if (
    request.flushScheduled === false &&
    // If there are pinged tasks we are going to flush anyway after work completes
    request.pingedTasks.length === 0 &&
    // If there is no destination there is nothing we can flush to. A flush will
    // happen when we start flowing again
    (request.destination !== null ||
      (__DEV__ && request.debugDestination !== null))
  ) {
    request.flushScheduled = true;
    // Unlike startWork and pingTask we intetionally use scheduleWork
    // here to allow as much batching as possible
    scheduleWork(() => {
      request.flushScheduled = false;
      flushCompletedChunks(request);
    });
  }
}

function fatalError(request: Request, error: mixed): void {
  if (enableTaint) {
    cleanupTaintQueue(request);
  }
  // This is called outside error handling code such as if an error happens in React internals.
  if (request.destination !== null) {
    request.status = CLOSED;
    closeWithError(request.destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
  }
  const abortReason = new Error(
    'The render was aborted due to a fatal error.',
    {
      cause: error,
    },
  );
  request.abortController.abort(abortReason);
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
        if (item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
          if (i + 2 >= debugChunks.length) {
            throw new Error(
              'A chunk pair is incomplete. This is a bug in React.',
            );
          }
          request.pendingDebugChunks -= 2;
          writeChunk(
            debugDestination,
            debugChunks[i + 1] as any as Chunk | BinaryChunk,
          );
          writeChunk(
            debugDestination,
            debugChunks[i + 2] as any as Chunk | BinaryChunk,
          );
          i += 2;
        } else {
          request.pendingDebugChunks--;
          writeChunk(debugDestination, item as any as Chunk | BinaryChunk);
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
          if (item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
            if (i + 2 >= debugChunks.length) {
              throw new Error(
                'A chunk pair is incomplete. This is a bug in React.',
              );
            }
            request.pendingDebugChunks -= 2;
            writeChunk(
              destination,
              debugChunks[i + 1] as any as Chunk | BinaryChunk,
            );
            keepWriting = writeChunkAndReturn(
              destination,
              debugChunks[i + 2] as any as Chunk | BinaryChunk,
            );
            i += 2;
          } else {
            request.pendingDebugChunks--;
            keepWriting = writeChunkAndReturn(
              destination,
              item as any as Chunk | BinaryChunk,
            );
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
        if (item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
          if (i + 2 >= regularChunks.length) {
            throw new Error(
              'A chunk pair is incomplete. This is a bug in React.',
            );
          }
          request.pendingChunks -= 2;
          writeChunk(
            destination,
            regularChunks[i + 1] as any as Chunk | BinaryChunk,
          );
          keepWriting = writeChunkAndReturn(
            destination,
            regularChunks[i + 2] as any as Chunk | BinaryChunk,
          );
          i += 2;
        } else {
          request.pendingChunks--;
          keepWriting = writeChunkAndReturn(
            destination,
            item as any as Chunk | BinaryChunk,
          );
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

export function startWork(request: Request): void {
  request.flushScheduled = request.destination !== null;
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    scheduleMicrotask(() => {
      cacheStorage.run(undefined, () =>
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

export function startFlowing(request: Request, destination: Destination): void {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }
  if (request.status === CLOSED) {
    return;
  }
  if (request.destination !== null) {
    // We're already flowing.
    return;
  }
  request.destination = destination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
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
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}

export function stopFlowing(request: Request): void {
  request.destination = null;
}

function abortTask(task: Task, request: Request, errorId: number): void {
  if (task.status !== PENDING) {
    // If this is already completed/errored we don't abort it.
    // If currently rendering it will be aborted by the render
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
  forwardDebugInfoFromAbortedTask(request, task);
  // Track when we aborted this task as its end time.
  if (enableProfilerTimer) {
    if (task.timed) {
      markOperationEndTime(request, task, request.abortTime);
    }
  }
  // Instead of emitting an error per task.id, we emit a model that only
  // has a single value referencing the error.
  const ref = serializeByValueID(errorId);
  const processedChunk = encodeReferenceChunk(request, task.id, ref);
  request.completedErrorChunks.push(processedChunk);
}

// "Halting" a task means finishing it without emitting anything into its
// slot: the reference is intentionally left unfulfilled and never resolves
// on the client. This is how an aborted prerender leaves its pending work.
// Source-recorded halts and unsettled weak values both use this outcome.
// Cancelling this output instead emits an error for its pending slots.
function haltTask(task: Task, request: Request): void {
  if (task.status !== PENDING) {
    // If this is already completed/errored we don't abort it.
    // If currently rendering it will be aborted by the render
    return;
  }
  task.status = ABORTED;
}

function finishHaltedTask(task: Task, request: Request): void {
  if (task.status !== ABORTED) {
    return;
  }
  forwardDebugInfoFromAbortedTask(request, task);
  // We don't actually emit anything for this task id because we are intentionally
  // leaving the reference unfulfilled.
  request.pendingChunks--;
}

const emptyRoot = {};

function finishAbort(
  request: Request,
  abortedTasks: Set<Task>,
  errorId: number,
): void {
  try {
    abortedTasks.forEach(task => finishAbortedTask(task, request, errorId));
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}

// Aborts the request when the caller's signal aborts. The abort controller's
// signal bounds the listener's lifetime, so the runtime removes the listener as
// soon as that signal aborts. The abort controller aborts at every point that
// ends the render: a fatal error, the completion of the flush loop, and abort()
// itself. From any of those points on, abort() returns early, so the listener
// has nothing left to do.
//
// The listener has to be removed, because it would otherwise keep the whole
// Request reachable for as long as the caller's signal lives. A composite
// signal from AbortSignal.any() is itself retained by the runtime while it has
// any abort listener attached.
//
// A request whose stream is neither consumed nor cancelled never ends, so its
// listener stays attached for as long as the caller's signal lives.
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
  // We define any status below OPEN as OPEN equivalent
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    if (enableProfilerTimer) {
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
      const digest = logRecoverableError(request, error, null);
      // When rendering we produce a shared error chunk and then
      // fulfill each task with a reference to that chunk.
      const errorId = request.nextChunkId++;
      request.fatalError = errorId;
      request.pendingChunks++;
      emitErrorChunk(request, errorId, digest, error, false, null);
      abortableTasks.forEach(task => abortTask(task, request, errorId));
      scheduleWork(() => finishAbort(request, abortableTasks, errorId));
    } else {
      flushCompletedChunks(request);
    }
  } catch (error) {
    logRecoverableError(request, error, null);
    fatalError(request, error);
  }
}

function serializeMap(
  request: Request,
  task: Task,
  map: Map<ReactClientValue, ReactClientValue>,
): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(map);
  if (model !== undefined) {
    const id = serializeThenable(request, task, model as any);
    return '$Q' + id.toString(16);
  }
  const entries = Array.from(map);
  const id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}

function serializeSet(
  request: Request,
  task: Task,
  set: Set<ReactClientValue>,
): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(set);
  if (model !== undefined) {
    const id = serializeThenable(request, task, model as any);
    return '$W' + id.toString(16);
  }
  const entries = Array.from(set);
  const id = outlineModel(request, entries);
  return '$W' + id.toString(16);
}

function serializeTypedArray(
  request: Request,
  tag: string,
  typedArray: $ArrayBufferView,
): string {
  const bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, false);
  request.pendingChunks++;
  return serializeByValueID(bufferId);
}

function emitTypedArrayChunk(
  request: Request,
  id: number,
  tag: string,
  typedArray: $ArrayBufferView,
  debug: boolean,
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
    enableProfilerTimer
      ? performance.now() // TODO: This should really inherit the time from the task.
      : 0,
    null, // TODO: Currently we don't associate any debug information with
    null, // this object on the server. If it ends up erroring, it won't
    null, // have any context on the server but can on the client.
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
    // Objects share the manifest lookup with functions, but have no bound
    // arguments or function debug metadata.
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
        : {
            id,
            bound,
          };
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

function serializeIterator(
  request: Request,
  entries: $ReadOnlyArray<ReactClientValue>,
): string {
  const id = outlineModel(request, entries);
  return '$i' + id.toString(16);
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
    enableProfilerTimer ? task.time : 0,
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
          emitTypedArrayChunk(request, streamTask.id, 'b', chunk, false);
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

function serializeWeakPromiseID(id: number): string {
  return '$w' + id.toString(16);
}

function tryStreamTask(request: Request, task: Task): void {
  // Encode one replayed sequence entry into the existing stream row.
  const prevCanEmitDebugInfo = canEmitDebugInfo;
  if (__DEV__) {
    // We can't emit debug into to a specific row of a stream task. Instead we leave
    // it false so that we instead outline the row to get a new canEmitDebugInfo if needed.
    canEmitDebugInfo = false;
  }
  const parentSerializedSize = serializedSize;
  const previousModelRoot = modelRoot;
  try {
    modelRoot = null;
    emitChunk(request, task, task.model);
  } finally {
    modelRoot = previousModelRoot;
    serializedSize = parentSerializedSize;
    if (__DEV__) {
      canEmitDebugInfo = prevCanEmitDebugInfo;
    }
  }
}

function haltInputTask(request: Request, task: Task): void {
  if (__DEV__) {
    flushInputDebugTime(request, task);
  }
  request.abortableTasks.delete(task);
  haltTask(task, request);
  if (
    enableFlightWeakThenables &&
    task.model !== null &&
    typeof task.model === 'object' &&
    (task.model as any).status === 'pending_weak'
  ) {
    // Native weak references leave an empty slot without debug rows.
    request.pendingChunks--;
  } else {
    finishHaltedTask(task, request);
  }
  enqueueFlush(request);
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
    enableProfilerTimer ? task.time : 0,
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
              streamTask.id.toString(16) + ':C' + stringify(reference) + '\n';
            request.completedRegularChunks.push(stringToChunk(endStreamRow));
            request.abortableTasks.delete(streamTask);
            detach();
          } else {
            request.pendingChunks++;
            emitModelChunk(request, streamTask.id, stringify(reference));
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
