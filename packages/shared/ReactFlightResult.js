/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import type {ResultModel} from './ReactFlightResultModel';
import type {Thenable} from './ReactTypes';
import type {
  HintCode,
  HintModel,
} from 'react-server/src/ReactFlightResultServerConfig';
import noop from './noop';

export const MODEL_OBJECT = 1;
export const MODEL_ARRAY = 2;
export const MODEL_ELEMENT = 3;
export const MODEL_KIND_MASK = 3;

export type ModelReference = {
  +root: ResultModel<any>,
  +parent: null | ModelReference,
  +key: string,
  ...
};

export type ServerReferenceMetadata = {
  +id: string,
  +bound: null | Promise<Array<any>>,
  +isObjectReference: boolean,
};

export type Hint = {+code: HintCode, +model: HintModel<any>};
export type ErrorReference = {+digest: string};
export type HintQueue = {
  completedHints: Array<Hint>,
  closed: boolean,
  wakeup: null | Promise<void>,
  resolve: () => void,
};

export opaque type Result<T>: {abort(reason: mixed): void, ...} = {
  +root: ResultModel<T>,
  +temporaryReferenceSet: void | TemporaryReferenceSet,
  closed: boolean,
  completionListeners: null | Set<() => void>,
  hintQueue: null | HintQueue,
  hintsClosed: boolean,
  abortCallback: null | (mixed => void),
  abort: (reason: mixed) => void,
  errorReferences: WeakMap<Object, ErrorReference>,
  haltedModels: null | WeakSet<Object>,
  modelReferences: null | WeakMap<Object, Object>,
  valueReferences: null | WeakSet<Object>,
  temporaryReferences: null | WeakMap<Object, string>,
  serverReferences: null | WeakMap<Object, ServerReferenceMetadata>,
  formDataWithBlobs: null | WeakSet<FormData>,
  collectionEntries: null | WeakMap<Object, ResultModel<Array<any>>>,
  modelInfo: null | Map<Object, number>,
};

function abortResult<T>(result: Result<T>, reason: mixed): void {
  const callback = result.abortCallback;
  if (callback !== null) {
    callback(reason);
  }
}

export function createResult<T>(
  root: ResultModel<T>,
  abort: (reason: mixed) => void,
  temporaryReferenceSet: void | TemporaryReferenceSet,
): Result<T> {
  const result: Result<T> = {
    root,
    temporaryReferenceSet,
    closed: false,
    completionListeners: null,
    hintQueue: null,
    hintsClosed: false,
    abortCallback: abort,
    abort: noop,
    errorReferences: new WeakMap(),
    haltedModels: null,
    modelReferences: null,
    valueReferences: null,
    temporaryReferences: null,
    serverReferences: null,
    formDataWithBlobs: null,
    collectionEntries: null,
    modelInfo: null,
  };
  result.abort = abortResult.bind(null, result);
  return result;
}

export function setErrorDigest<T>(
  result: Result<T>,
  thenable: Object,
  digest: string,
): void {
  result.errorReferences.set(thenable, {digest});
}

export function getErrorReference<T>(
  result: Result<T>,
  thenable: Object,
): void | ErrorReference {
  return result.errorReferences.get(thenable);
}

export function getRoot<T>(result: Result<T>): ResultModel<T> {
  return result.root;
}

export function completeResult<T>(result: Result<T>): void {
  if (result.closed) {
    return;
  }
  result.closed = true;
  result.abortCallback = null;
  const listeners = result.completionListeners;
  result.completionListeners = null;
  if (listeners !== null) {
    listeners.forEach(listener => listener());
    listeners.clear();
  }
}

export function subscribeToResult<T>(
  result: Result<T>,
  listener: () => void,
): () => void {
  if (result.closed) {
    listener();
    return noop;
  }
  let listeners = result.completionListeners;
  if (listeners === null) {
    result.completionListeners = listeners = new Set();
  }
  listeners.add(listener);
  const subscriptions = listeners;
  return () => {
    subscriptions.delete(listener);
  };
}

export function getHintQueue<T>(result: Result<T>): HintQueue {
  let queue = result.hintQueue;
  if (queue === null) {
    result.hintQueue = queue = {
      completedHints: [],
      closed: result.hintsClosed,
      wakeup: null,
      resolve: noop,
    };
  }
  return queue;
}

function wakeHintQueue(queue: HintQueue): void {
  const resolve = queue.resolve;
  queue.wakeup = null;
  queue.resolve = noop;
  resolve();
}

export function pushHint<T, Code: HintCode>(
  result: Result<T>,
  code: Code,
  model: HintModel<Code>,
): void {
  if (result.hintsClosed) {
    return;
  }
  const queue = getHintQueue(result);
  queue.completedHints.push({code, model});
  wakeHintQueue(queue);
}

export function waitForHints(queue: HintQueue): Promise<void> {
  let wakeup = queue.wakeup;
  if (wakeup === null) {
    queue.wakeup = wakeup = new Promise(resolve => {
      queue.resolve = resolve;
    });
  }
  return wakeup;
}

export function closeHints<T>(result: Result<T>): void {
  result.hintsClosed = true;
  const queue = result.hintQueue;
  if (queue !== null) {
    queue.closed = true;
    wakeHintQueue(queue);
  }
}

export function createValueReference<T>(
  result: Result<T>,
  reference: ModelReference,
): Object {
  let references = result.valueReferences;
  if (references === null) {
    result.valueReferences = references = new WeakSet();
  }
  references.add(reference);
  return reference;
}

export function getValueReference<T>(
  result: Result<T>,
  value: Object,
): void | ModelReference {
  const references = result.valueReferences;
  return references !== null && references.has(value)
    ? (value as ModelReference)
    : undefined;
}

export function copyErrorReference<T>(
  result: Result<T>,
  thenable: Object,
  source: Object,
): void {
  const reference = getErrorReference(result, source);
  if (reference !== undefined) {
    result.errorReferences.set(thenable, reference);
  }
}

export function forwardModelReference<T>(
  result: Result<T>,
  promise: Thenable<any>,
  thenable: Thenable<any>,
): void {
  let references = result.modelReferences;
  if (references === null) {
    result.modelReferences = references = new WeakMap();
  }
  references.set(promise, thenable);
  thenable.then(noop, () => {
    copyErrorReference(result, promise, thenable);
  });
}

export function setModelInfo<T>(
  result: Result<T>,
  model: Object,
  info: number,
): void {
  let models = result.modelInfo;
  if (models === null) {
    result.modelInfo = models = new Map();
  }
  models.set(model, info);
}

export function getModelInfo<T>(result: Result<T>, model: Object): number {
  const models = result.modelInfo;
  return models === null ? 0 : models.get(model) || 0;
}

export function markHalted<T>(result: Result<T>, model: Object): void {
  let haltedModels = result.haltedModels;
  if (haltedModels === null) {
    result.haltedModels = haltedModels = new WeakSet();
  }
  haltedModels.add(model);
}

export function isHalted<T>(result: Result<T>, model: Object): boolean {
  const haltedModels = result.haltedModels;
  if (haltedModels === null) {
    return false;
  }
  const references = result.modelReferences;
  const visited: Set<Object> = new Set();
  let current = model;
  while (!visited.has(current)) {
    if (haltedModels.has(current)) {
      return true;
    }
    visited.add(current);
    const reference = references === null ? undefined : references.get(current);
    if (reference === undefined) {
      return false;
    }
    current = reference;
  }
  return false;
}

export function setCollectionEntries<T>(
  result: Result<T>,
  collection: Object,
  entries: ResultModel<Array<any>>,
): void {
  let collections = result.collectionEntries;
  if (collections === null) {
    result.collectionEntries = collections = new WeakMap();
  }
  collections.set(collection, entries);
}

export function getCollectionEntries<T>(
  result: Result<T>,
  collection: Object,
): void | ResultModel<Array<any>> {
  const collections = result.collectionEntries;
  return collections === null ? undefined : collections.get(collection);
}

export function markFormDataWithBlobs<T>(
  result: Result<T>,
  formData: FormData,
): void {
  let formDataWithBlobs = result.formDataWithBlobs;
  if (formDataWithBlobs === null) {
    result.formDataWithBlobs = formDataWithBlobs = new WeakSet();
  }
  formDataWithBlobs.add(formData);
}

export function hasFormDataBlobs<T>(
  result: Result<T>,
  formData: FormData,
): boolean {
  const formDataWithBlobs = result.formDataWithBlobs;
  return formDataWithBlobs !== null && formDataWithBlobs.has(formData);
}

export function setServerReference<T>(
  result: Result<T>,
  value: Object,
  metadata: ServerReferenceMetadata,
): void {
  let serverReferences = result.serverReferences;
  if (serverReferences === null) {
    result.serverReferences = serverReferences = new WeakMap();
  }
  serverReferences.set(value, metadata);
}

export function getServerReference<T>(
  result: Result<T>,
  value: Object,
): void | ServerReferenceMetadata {
  const serverReferences = result.serverReferences;
  return serverReferences === null ? undefined : serverReferences.get(value);
}

export function setTemporaryReference<T>(
  result: Result<T>,
  value: Object,
  reference: string,
): void {
  let temporaryReferences = result.temporaryReferences;
  if (temporaryReferences === null) {
    result.temporaryReferences = temporaryReferences = new WeakMap();
  }
  temporaryReferences.set(value, reference);
}

export function getTemporaryReference<T>(
  result: Result<T>,
  value: Object,
): void | string {
  const temporaryReferences = result.temporaryReferences;
  return temporaryReferences === null
    ? undefined
    : temporaryReferences.get(value);
}

export function getTemporaryReferenceSet<T>(
  result: Result<T>,
): void | TemporaryReferenceSet {
  return result.temporaryReferenceSet;
}
