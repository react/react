/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from 'shared/ReactFlightResultModel';
import {getResultModelStatus} from 'shared/ReactFlightResultModel';
import type {
  ServerReferenceMetadata,
  ErrorReference,
  ModelReference,
} from 'shared/ReactFlightResult';
import type {ConsoleEntry} from 'shared/ReactFlightResult';
import type {
  ReactStackTrace,
  ReactCallSite,
  ReactKey,
  Thenable,
  ReactComponentInfo,
  ReactDebugInfo,
  ReactDebugInfoEntry,
  ReactAsyncInfo,
  ReactIOInfo,
  ReactErrorInfoDev,
} from 'shared/ReactTypes';
import {
  MODEL_KIND_MASK,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
} from 'shared/ReactFlightResult';
import {
  isGetter,
  describeObjectForErrorMessage,
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
  byteLengthOfChunk,
  completeWriting,
  flushBuffered,
  close,
  closeWithError,
  stringToChunk,
  scheduleWork,
  scheduleMicrotask,
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
  enableFlightWeakThenables,
  enableTaint,
  enableFlightObjectReferences,
  enableProfilerTimer,
  enableComponentPerformanceTrack,
  enableAsyncDebugInfo,
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
  supportsRequestStorage,
  cacheStorage,
  requestStorage,
} from './ReactFlightServerConfig';
import {setCurrentCache} from './flight/ReactFlightCurrentCache';

const stringify = JSON.stringify;
interface Reference {}
const doNotLimit: WeakSet<Reference> = __DEV__ ? new WeakSet() : (null as any);
const CONSTRUCTOR_MARKER: symbol = __DEV__ ? Symbol() : (null as any);
let debugModelRoot: mixed = null;
let debugNoOutline: mixed = null;
const OPENING = 10;
const OPEN = 11;
const ABORTING = 12;
const CLOSING = 13;
const CLOSED = 14;
const NEXT_TWO_CHUNKS_ARE_ATOMIC: symbol = Symbol();
const PENDING = 0;
const COMPLETED = 1;
const ERRORED = 4;
const ABORTED = 3;
const RENDERING = 6;
const ObjectPrototype = Object.prototype;
const {getPrototypeOf} = Object;

type Task = {
  timed: boolean, // DEV-only
  time: number, // DEV-only
  debugPendingTime: null | number, // DEV-only
  debugInfoRecorded: boolean, // DEV-only
  debugOwner: null | ReactComponentInfo, // DEV-only
  debugStack: null | Error, // DEV-only
  id: number,
  model: ReactClientValue,
  status: 0 | 1 | 3 | 4 | 6,
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
  debug?: ReactDebugInfoEntry => void, // DEV-only
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
  debugStartTime?: number, // DEV-only
  +root: ResultModel<ReactClientValue>,
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
  getValueReference: Object => void | ModelReference,
  getModelInfo: Object => number,
  getErrorInfo: Error => void | ReactErrorInfoDev,
  getCollectionEntries: Object => void | ResultModel<Array<any>>,
  subscribe: ({
    hint: (HintCode, HintModel<any>) => void,
    console?: ConsoleEntry => void, // DEV-only
    complete: () => void,
  }) => () => void,
  subscribeToThenable: (
    Thenable<ReactClientValue> | Promise<ReactClientValue>,
    InputThenableReader,
  ) => () => void,
};
export type Request = {
  input: null | Input,
  destination: null | Destination,
  status: 10 | 11 | 12 | 13 | 14,
  abortController: AbortController,
  abortableTasks: Set<Task>,
  abortTime: number, // DEV-only
  fatalError: mixed,
  completedRegularChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >,
  pendingChunks: number,
  completedHintChunks: Array<Chunk>,
  flushScheduled: boolean,
  bundlerConfig: ClientManifest,
  writtenClientReferences: Map<ClientReferenceKey, number>,
  writtenServerReferences: Map<ServerReference<any>, number>,
  temporaryReferences: void | TemporaryReferenceSet,
  nextChunkId: number,
  completedImportChunks: Array<Chunk>,
  writtenModels: WeakMap<Object, number>,
  writtenObjects: WeakMap<Object, string>,
  pingedTasks: Array<Task>,
  inputSubscriptions: Set<() => void>,
  writtenSymbols: Map<symbol, number>,
  writtenErrors: WeakMap<ErrorReference, number>,
  completedErrorChunks: Array<Chunk>,
  onError: mixed => ?string,
  debugDestination: null | Destination, // DEV-only
  pendingDebugChunks: number, // DEV-only
  completedDebugChunks: Array<
    Chunk | BinaryChunk | typeof NEXT_TWO_CHUNKS_ARE_ATOMIC,
  >, // DEV-only
  writtenDebugObjects: WeakMap<Object, string>, // DEV-only
  timeOrigin: number, // DEV-only
  environmentName: () => string, // DEV-only
  filterStackFrame: (string, string, number, number) => boolean, // DEV-only
  taintCleanupQueue: Array<string | bigint>,
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
  this: any,
  input: Input,
  bundlerConfig: ClientManifest,
  onError: void | (mixed => ?string),
  temporaryReferences: void | TemporaryReferenceSet,
  debugStartTime: void | number,
  environmentName: void | string | (() => string),
  filterStackFrame: void | ((string, string) => boolean),
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
  this.abortableTasks = new Set();
  if (__DEV__) {
    this.debugDestination = null;
    this.abortTime = -0.0;
    this.pendingDebugChunks = 0;
    this.completedDebugChunks = [];
    this.writtenDebugObjects = new WeakMap();
    if (debugStartTime === undefined) {
      debugStartTime = input.debugStartTime;
    }
    this.timeOrigin =
      typeof debugStartTime === 'number'
        ? debugStartTime -
          // $FlowFixMe[prop-missing]
          performance.timeOrigin
        : performance.now();
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
  this.destination = null;
  this.status = OPENING;
  this.fatalError = null;
  this.completedRegularChunks = [];
  this.completedHintChunks = [];
  this.flushScheduled = false;
  this.pendingChunks = 1;
  this.bundlerConfig = bundlerConfig;
  this.writtenClientReferences = new Map();
  this.nextChunkId = 0;
  this.completedImportChunks = [];
  this.writtenModels = new WeakMap();
  this.writtenObjects = new WeakMap();
  this.pingedTasks = [];
  this.inputSubscriptions = new Set();
  this.writtenSymbols = new Map();
  this.writtenErrors = new WeakMap();
  this.completedErrorChunks = [];
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  if (
    __DEV__ &&
    enableProfilerTimer &&
    (enableComponentPerformanceTrack || enableAsyncDebugInfo)
  ) {
    emitTimeOriginChunk(
      this,
      this.timeOrigin +
        // $FlowFixMe[prop-missing]
        performance.timeOrigin,
    );
  }
  const rootTask = createTask(this, null);
  this.writtenModels.set(input.root, rootTask.id);
  subscribeHints(this);
  if (this.status <= OPEN) {
    subscribeToThenable(this, rootTask, input.root);
  }
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

  if (request.status >= ABORTING) {
    // Ensure that we have time to emit the halt chunk if we're sync aborting.
    emitDebugHaltChunk(request, id);
    return ref;
  }

  let cancelled = false;

  thenable.then(
    value => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      if (request.status >= ABORTING) {
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
      if (request.status >= ABORTING) {
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
    const json = JSON.stringify(clientReferenceMetadata);
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

function escapeStringValue(value: string): string {
  if (value[0] === '$') {
    // We need to escape $ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

function serializeTemporaryReference(
  request: Request,
  reference: string,
): string {
  return '$T' + reference;
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
      {objectLimit: stack.length * 2 + 1},
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
  const objectLimit = 500;
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

function markOperationEndTime(request: Request, task: Task, timestamp: number) {
  if (
    !enableProfilerTimer ||
    (!enableComponentPerformanceTrack && !enableAsyncDebugInfo)
  ) {
    return;
  }
  if (request.status === ABORTING && timestamp > request.abortTime) {
    return;
  }
  if (timestamp > task.time) {
    emitTimingChunk(request, task.id, timestamp);
    task.time = timestamp;
  } else {
    emitTimingChunk(request, task.id, task.time);
  }
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
  value: ReactClientValue,
): string {
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

function outlineModel(request: Request, value: ReactClientValue): number {
  const task = createTask(request, value);
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
    const parentReference = writtenObjects.get(parent);
    if (parentReference !== undefined) {
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

function renderModelDestructive(
  request: Request,
  task: Task,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
): ReactJSONValue {
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
      const id = serializeThenable(request, reference.root);
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
      input === null ? 0 : input.getModelInfo(value) & MODEL_KIND_MASK;
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
      return serializeLazyID(serializeThenable(request, lazy._payload));
    }
    if (typeof (value as any).then === 'function') {
      const id = serializeThenable(request, value as any);
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
      if (elementReference !== undefined) {
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
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
): ReactJSONValue {
  const rendered = renderModelDestructive(
    request,
    task,
    parent,
    parentPropertyName,
    value,
  );
  if (rendered === null || typeof rendered !== 'object') {
    return rendered;
  }
  if (isArray(rendered)) {
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

function encodeReferenceChunk(
  request: Request,
  id: number,
  reference: string,
): Chunk {
  const json = JSON.stringify(reference);
  const row = id.toString(16) + ':' + json + '\n';
  return stringToChunk(row);
}

function createTask(request: Request, model: ReactClientValue): Task {
  request.pendingChunks++;
  const task = {id: request.nextChunkId++, model, status: PENDING} as Omit<
    Task,
    | 'timed'
    | 'time'
    | 'debugPendingTime'
    | 'debugInfoRecorded'
    | 'debugOwner'
    | 'debugStack',
  > as any;
  if (__DEV__) {
    task.timed = false;
    task.time = request.timeOrigin;
    task.debugPendingTime = null;
    task.debugInfoRecorded = false;
    task.debugOwner = null;
    task.debugStack = null;
  }
  request.abortableTasks.add(task);
  return task;
}

function pingTask(request: Request, task: Task): void {
  if (request.status === CLOSED || task.status !== PENDING) {
    return;
  }
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  if (pingedTasks.length === 1) {
    scheduleWork(() => performWork(request));
  }
}

function subscribeToThenable(
  request: Request,
  task: Task,
  thenable: ResultModel<ReactClientValue>,
): void {
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
          task.status = ABORTED;
          request.abortableTasks.delete(task);
          request.pendingChunks--;
          enqueueFlush(request);
        }
      },
      resolve(value) {
        if (__DEV__) {
          flushInputDebugTime(request, task);
        }
        detach();
        if (request.status <= OPEN && task.status === PENDING) {
          task.model = value;
          pingTask(request, task);
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
  thenable: ResultModel<ReactClientValue>,
): number {
  const existingId = request.writtenModels.get(thenable);
  if (existingId !== undefined) {
    return existingId;
  }
  const newTask = createTask(request, null);
  request.writtenModels.set(thenable, newTask.id);
  subscribeToThenable(request, newTask, thenable);
  return newTask.id;
}

function retryTask(request: Request, task: Task): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = RENDERING;
  try {
    const model = task.model;
    modelRoot = model;
    if (
      model !== null &&
      typeof model === 'object' &&
      !request.writtenObjects.has(model)
    ) {
      request.writtenObjects.set(model, serializeByValueID(task.id));
    }
    const resolvedModel = resolveModel(request, task, {'': model}, '', model);
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
  }
}

function performWork(request: Request): void {
  if (request.status === CLOSED || request.status === CLOSING) {
    return;
  }
  const pingedTasks = request.pingedTasks;
  request.pingedTasks = [];
  for (let i = 0; i < pingedTasks.length; i++) {
    retryTask(request, pingedTasks[i]);
    if (request.status === CLOSED || request.status === CLOSING) {
      return;
    }
  }
  try {
    flushCompletedChunks(request);
  } catch (error) {
    fatalError(request, error);
  }
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
    const model: ReactClientValue = clientReferenceMetadata as any;
    const metadata = resolveModel(request, task, {'': model}, '', model);
    const json: string = JSON.stringify(metadata);
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
    const digest = logRecoverableError(request, error);
    emitErrorChunk(request, errorId, digest, error);
    return serializeByValueID(errorId);
  }
}

function emitImportChunk(
  request: Request,
  id: number,
  json: string,
  debug: boolean = false,
): void {
  const row = id.toString(16) + ':I' + json + '\n';
  const processedChunk = stringToChunk(row);
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(processedChunk);
    return;
  }
  request.completedImportChunks.push(processedChunk);
}

function logRecoverableError(request: Request, error: mixed): string {
  const prevCache = setCurrentCache(null);
  let errorDigest;
  try {
    const onError = request.onError;
    // $FlowFixMe[constant-condition]
    if (supportsRequestStorage) {
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
  return errorDigest || '';
}

function erroredTask(request: Request, task: Task, error: mixed): void {
  task.status = ERRORED;
  request.abortableTasks.delete(task);
  const digest = logRecoverableError(request, error);
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
  owner: null | ReactComponentInfo = null, // DEV-only
): void {
  let errorInfo;
  if (__DEV__) {
    let name = 'Error';
    let message;
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
          env = errorEnv;
        }
        if ('cause' in error) {
          const cause: ReactClientValue = error.cause as any;
          causeReference = serializeByValueID(
            debug
              ? outlineDebugModel(request, {objectLimit: 5}, cause)
              : outlineModel(request, cause),
          );
        }
        if (
          typeof AggregateError !== 'undefined' &&
          error instanceof AggregateError
        ) {
          const errors: ReactClientValue = error.errors as any;
          errorsReference = serializeByValueID(
            debug
              ? outlineDebugModel(request, {objectLimit: 5}, errors)
              : outlineModel(request, errors),
          );
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
    const info: ReactErrorInfoDev = {
      digest,
      name,
      message,
      stack,
      env,
      owner: owner === null ? null : outlineComponentInfo(request, owner),
    };
    if (causeReference !== null) {
      info.cause = causeReference;
    }
    if (errorsReference !== null) {
      info.errors = errorsReference;
    }
    errorInfo = info;
  } else {
    errorInfo = {digest};
  }
  const row = id.toString(16) + ':E' + JSON.stringify(errorInfo) + '\n';
  if (__DEV__ && debug) {
    request.completedDebugChunks.push(stringToChunk(row));
    return;
  }
  request.completedErrorChunks.push(stringToChunk(row));
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

function cleanupInput(request: Request): void {
  request.input = null;
  request.inputSubscriptions.forEach(detach => detach());
  request.inputSubscriptions.clear();
  if (enableTaint) {
    cleanupTaintQueue(request);
  }
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
}

function fatalError(request: Request, error: mixed): void {
  request.fatalError = error;
  request.abortController.abort(error);
  cleanupInput(request);
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
  if (destination === null || request.status === CLOSED) {
    return;
  }
  beginWriting(destination);
  try {
    const importsChunks = request.completedImportChunks;
    let i = 0;
    for (; i < importsChunks.length; i++) {
      request.pendingChunks--;
      const keepWriting = writeChunkAndReturn(destination, importsChunks[i]);
      if (!keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }
    importsChunks.splice(0, i);
    const hintChunks = request.completedHintChunks;
    i = 0;
    for (; i < hintChunks.length; i++) {
      const keepWriting = writeChunkAndReturn(destination, hintChunks[i]);
      if (!keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }
    hintChunks.splice(0, i);
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
    const errorChunks = request.completedErrorChunks;
    i = 0;
    for (; i < errorChunks.length; i++) {
      request.pendingChunks--;
      const keepWriting = writeChunkAndReturn(destination, errorChunks[i]);
      if (!keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }
    errorChunks.splice(0, i);
  } finally {
    completeWriting(destination);
  }
  flushBuffered(destination);
  if (
    request.pendingChunks === 0 &&
    (!__DEV__ || request.pendingDebugChunks === 0) &&
    request.destination !== null
  ) {
    const currentDestination = request.destination;
    request.status = CLOSED;
    request.abortController.abort();
    cleanupInput(request);
    request.destination = null;
    close(currentDestination);
    if (__DEV__ && request.debugDestination !== null) {
      close(request.debugDestination);
      request.debugDestination = null;
    }
  }
}

export function startWork(request: Request): void {
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
  if (__DEV__) {
    flushInputDebugTime(request, task);
  }
  // Track when we aborted this task as its end time.
  if (
    enableProfilerTimer &&
    (enableComponentPerformanceTrack || enableAsyncDebugInfo)
  ) {
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
  // We define any status below OPEN as OPEN equivalent
  if (request.status > OPEN) {
    return;
  }
  try {
    request.status = ABORTING;
    if (
      enableProfilerTimer &&
      (enableComponentPerformanceTrack || enableAsyncDebugInfo)
    ) {
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
    logRecoverableError(request, error);
    fatalError(request, error);
  }
}

function serializeMap(
  request: Request,
  map: Map<ReactClientValue, ReactClientValue>,
): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(map);
  if (model !== undefined) {
    const id = serializeThenable(request, model as any);
    return '$Q' + id.toString(16);
  }
  const entries = Array.from(map);
  const id = outlineModel(request, entries);
  return '$Q' + id.toString(16);
}

function serializeSet(request: Request, set: Set<ReactClientValue>): string {
  const input = request.input;
  const model = input === null ? undefined : input.getCollectionEntries(set);
  if (model !== undefined) {
    const id = serializeThenable(request, model as any);
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
  emitTypedArrayChunk(request, bufferId, tag, typedArray);
  request.pendingChunks++;
  return serializeByValueID(bufferId);
}

function emitTypedArrayChunk(
  request: Request,
  id: number,
  tag: string,
  typedArray: $ArrayBufferView,
  debug: boolean = false, // DEV-only
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
  if (__DEV__ && debug) {
    request.pendingDebugChunks++;
  } else {
    request.pendingChunks++;
  }
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
  const chunks =
    __DEV__ && debug
      ? request.completedDebugChunks
      : request.completedRegularChunks;
  chunks.push(NEXT_TWO_CHUNKS_ARE_ATOMIC, stringToChunk(row), binaryChunk);
}

function serializeFormData(request: Request, formData: FormData): string {
  const entries = Array.from(formData.entries());
  const id = outlineModel(request, entries as any);
  return '$K' + id.toString(16);
}

function serializeBlob(request: Request, blob: Blob): string {
  const model: Array<string | Uint8Array> = [blob.type];
  const reader = blob.stream().getReader();
  const newTask = createTask(request, model);

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
  reference: ServerReference<any>,
): string {
  const objectReference =
    enableFlightObjectReferences && typeof reference === 'object';
  const existingId = request.writtenServerReferences.get(reference);
  if (existingId !== undefined) {
    return objectReference
      ? serializeServerObjectReferenceID(existingId)
      : serializeServerReferenceID(existingId);
  }
  const id: ServerReferenceId = getServerReferenceId(
    request.bundlerConfig,
    reference,
  );
  const input = request.input;
  const metadata =
    input === null ? undefined : input.getServerReference(reference);
  if (metadata === undefined) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'A Result must record server references before serialization.',
    );
  }
  const value = objectReference ? {id} : {id, bound: metadata.bound};
  const metadataId = outlineModel(request, value);
  request.writtenServerReferences.set(reference, metadataId);
  return objectReference
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

  const streamTask = createTask(request, task.model);
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
      request.abortableTasks.delete(streamTask);
      const endStreamRow = streamTask.id.toString(16) + ':C\n';
      request.completedRegularChunks.push(stringToChunk(endStreamRow));
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
  const previousModelRoot = modelRoot;
  try {
    modelRoot = null;
    const resolvedModel = resolveModel(
      request,
      task,
      {'': task.model},
      '',
      task.model,
    );
    emitModelChunk(request, task.id, JSON.stringify(resolvedModel));
  } finally {
    modelRoot = previousModelRoot;
  }
}

function haltInputTask(request: Request, task: Task): void {
  if (task.status === PENDING) {
    task.status = ABORTED;
    request.abortableTasks.delete(task);
    request.pendingChunks--;
    enqueueFlush(request);
  }
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
  const streamTask = createTask(request, task.model);
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
          const entryId = serializeThenable(request, entry as any);
          const reference = serializeByValueID(entryId);
          if (done) {
            streamTask.status = COMPLETED;
            request.abortableTasks.delete(streamTask);
            const endStreamRow =
              streamTask.id.toString(16) +
              ':C' +
              JSON.stringify(reference) +
              '\n';
            request.completedRegularChunks.push(stringToChunk(endStreamRow));
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
