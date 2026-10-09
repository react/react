/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {ErrorReference, ModelReference} from 'shared/ReactFlightResult';
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
import type {Chunk, Destination} from './ReactServerStreamConfig';
import type {HintCode, HintModel} from './ReactFlightResultServerConfig';
import type {
  ClientManifest,
  ClientReference,
  ClientReferenceKey,
  ClientReferenceMetadata,
} from './ReactFlightServerConfig';
import {
  beginWriting,
  writeChunkAndReturn,
  completeWriting,
  flushBuffered,
  close,
  closeWithError,
  stringToChunk,
  scheduleWork,
} from './ReactServerStreamConfig';
import {REACT_ELEMENT_TYPE, REACT_LAZY_TYPE} from 'shared/ReactSymbols';
import type {LazyComponent} from 'react/src/ReactLazy';
import isArray from 'shared/isArray';
import hasOwnProperty from 'shared/hasOwnProperty';
import noop from 'shared/noop';
import {
  isClientReference,
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
  completedRegularChunks: Array<Chunk>,
  pendingChunks: number,
  completedHintChunks: Array<Chunk>,
  flushScheduled: boolean,
  bundlerConfig: ClientManifest,
  writtenClientReferences: Map<ClientReferenceKey, number>,
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
};

function RequestInstance(
  this: any,
  input: Input,
  bundlerConfig: ClientManifest,
  onError: void | (mixed => ?string),
) {
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
  if (value === null) {
    return null;
  }
  if (typeof value === 'object') {
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
      return serializePromiseID(serializeThenable(request, value as any));
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
    return value as any;
  }
  if (typeof value === 'string') {
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
  throw new Error('Not implemented.');
}

function serializeDate(date: Date): string {
  // JSON.stringify automatically calls Date.prototype.toJSON which calls toISOString.
  // We need only tack on a $D prefix.
  return '$D' + date.toJSON();
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
  cleanupInput(request);
  const destination = request.destination;
  if (destination !== null) {
    request.status = CLOSED;
    closeWithError(destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
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
      request.pendingChunks--;
      const keepWriting = writeChunkAndReturn(destination, regularChunks[i]);
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
