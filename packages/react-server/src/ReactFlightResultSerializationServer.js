/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {
  ServerReferenceMetadata,
  ErrorReference,
  ModelReference,
} from 'shared/ReactFlightResult';
import type {ReactStackTrace, ReactKey} from 'shared/ReactTypes';
import {
  MODEL_KIND_MASK,
  MODEL_OBJECT,
  MODEL_ARRAY,
  MODEL_ELEMENT,
} from 'shared/ReactFlightResult';
import {describeObjectForErrorMessage} from 'shared/ReactSerializationErrors';
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

const OPENING = 10;
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
  getCollectionEntries: Object => void | ResultModel<Array<any>>,
  subscribe: ({
    hint: (HintCode, HintModel<any>) => void,
    complete: () => void,
  }) => () => void,
  subscribeToThenable: (
    ResultModel<ReactClientValue>,
    InputThenableReader,
  ) => () => void,
};
export type Request = {
  input: null | Input,
  destination: null | Destination,
  status: 10 | 13 | 14,
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
) {
  const cleanupQueue: Array<string | bigint> = [];
  if (enableTaint) {
    TaintRegistryPendingRequests.add(cleanupQueue);
  }
  this.taintCleanupQueue = cleanupQueue;
  this.temporaryReferences = input.temporaryReferences;
  this.writtenServerReferences = new Map();
  this.input = input;
  this.destination = null;
  this.status = OPENING;
  this.fatalError = null;
  this.completedRegularChunks = [];
  this.completedHintChunks = [];
  this.flushScheduled = false;
  this.pendingChunks = 2;
  this.bundlerConfig = bundlerConfig;
  this.writtenClientReferences = new Map();
  this.nextChunkId = 1;
  this.completedImportChunks = [];
  this.writtenModels = new WeakMap();
  this.writtenObjects = new WeakMap();
  this.pingedTasks = [];
  this.inputSubscriptions = new Set();
  this.writtenSymbols = new Map();
  this.writtenErrors = new WeakMap();
  this.completedErrorChunks = [];
  this.onError = onError === undefined ? defaultErrorHandler : onError;
}

function defaultErrorHandler(error: mixed): void {
  console['error'](error);
}

export function createRequest(
  input: Input,
  bundlerConfig: ClientManifest,
  onError?: mixed => ?string,
): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(input, bundlerConfig, onError);
}

function renderClientElement(
  type: any,
  key: ReactKey,
  props: ReactClientValue,
  validated: number,
): ReactJSONValue {
  return __DEV__
    ? [REACT_ELEMENT_TYPE, type, key, props, null, null, validated]
    : [REACT_ELEMENT_TYPE, type, key, props];
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
      const tuple = renderClientElement(
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
  throw new Error('Not implemented.');
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
  return {id: request.nextChunkId++, model, status: PENDING};
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
      halt() {
        detach();
        if (task.status === PENDING) {
          task.status = ABORTED;
          request.pendingChunks--;
          enqueueFlush(request);
        }
      },
      resolve(value) {
        detach();
        if (request.status === OPENING && task.status === PENDING) {
          task.model = value;
          pingTask(request, task);
        }
      },
      reject(error, reference) {
        detach();
        if (request.status === OPENING && task.status === PENDING) {
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
  if (!active || request.status > OPENING) {
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
  } catch (error) {
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

function emitImportChunk(request: Request, id: number, json: string): void {
  const row = id.toString(16) + ':I' + json + '\n';
  const processedChunk = stringToChunk(row);
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
): void {
  let errorInfo;
  if (__DEV__) {
    let name = 'Error';
    let message;
    let stack: ReactStackTrace;
    let env = 'Server';
    try {
      if (error instanceof Error) {
        name = error.name;
        // eslint-disable-next-line react-internal/safe-string-coercion
        message = String(error.message);
        stack = parseStackTrace(error, 0);
        const errorEnv = (error as any).environmentName;
        if (typeof errorEnv === 'string') {
          env = errorEnv;
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
    errorInfo = {digest, name, message, stack, env, owner: null};
  } else {
    errorInfo = {digest};
  }
  const row = id.toString(16) + ':E' + JSON.stringify(errorInfo) + '\n';
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
  if (!request.flushScheduled && request.destination !== null) {
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
  subscribeInput(request, detach =>
    input.subscribe({
      hint(code, model) {
        try {
          emitHint(request, code, model);
        } catch (error) {
          fatalError(request, error);
        }
      },
      complete() {
        detach();
        request.pendingChunks--;
        enqueueFlush(request);
      },
    }),
  );
}

function fatalError(request: Request, error: mixed): void {
  request.fatalError = error;
  cleanupInput(request);
  const destination = request.destination;
  if (destination !== null) {
    request.status = CLOSED;
    closeWithError(destination, error);
  } else {
    request.status = CLOSING;
  }
}

function flushCompletedChunks(request: Request): void {
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
  if (request.pendingChunks === 0 && request.destination !== null) {
    const currentDestination = request.destination;
    request.status = CLOSED;
    cleanupInput(request);
    request.destination = null;
    close(currentDestination);
  }
}

export function startWork(request: Request): void {
  const input = request.input;
  if (input === null) {
    return;
  }
  subscribeHints(request);
  if (request.status > OPENING) {
    return;
  }
  const rootTask: Task = {id: 0, model: null, status: PENDING};
  subscribeToThenable(request, rootTask, input.root);
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

export function stopFlowing(request: Request): void {
  request.destination = null;
}

export function abort(request: Request, reason: mixed): void {
  if (request.status !== CLOSED) {
    fatalError(request, reason);
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
  request.pendingChunks++;
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
  request.completedRegularChunks.push(
    NEXT_TWO_CHUNKS_ARE_ATOMIC,
    stringToChunk(row),
    binaryChunk,
  );
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
  function progress(entry: {
    done: boolean,
    value: any,
    ...
  }): Promise<void> | void {
    if (newTask.status !== PENDING) {
      return;
    }
    if (entry.done) {
      request.inputSubscriptions.delete(cancel);
      pingTask(request, newTask);
      return;
    }
    model.push(entry.value);
    return reader.read().then(progress).catch(error);
  }
  function error(reason: mixed): void {
    if (newTask.status !== PENDING) {
      return;
    }
    request.inputSubscriptions.delete(cancel);
    erroredTask(request, newTask, reason);
    enqueueFlush(request);
    // $FlowFixMe[incompatible-type] should be able to pass mixed
    reader.cancel(reason).then(noop, noop);
  }
  function cancel(): void {
    if (newTask.status !== PENDING) {
      return;
    }
    newTask.status = ABORTED;
    // $FlowFixMe[incompatible-type] should be able to pass mixed
    reader.cancel(request.fatalError).then(noop, noop);
  }
  request.inputSubscriptions.add(cancel);
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
