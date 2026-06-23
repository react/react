/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';

// The server acts as a Client of itself when resolving Server References.
// That's why we import the Client configuration from the Server.
// Everything is aliased as their Server equivalence for clarity.
import type {
  ServerReferenceId,
  ServerManifest,
  ClientReference as ServerReference,
} from 'react-client/src/ReactFlightClientConfig';

import type {BackingFormData} from './ReactFlightReplyBackingFormData';
import type {TemporaryReferenceSet} from './ReactFlightServerTemporaryReferences';

import {
  resolveServerReference,
  preloadModule,
  requireModule,
} from 'react-client/src/ReactFlightClientConfig';

import {
  createBackingFormData,
  advanceBackingEntryIterator,
  appendBackingEntry,
  appendBackingFile,
  consumeBackingEntry,
  getBackingEntry,
  getAllBackingEntries,
  peekBackingEntry,
} from './ReactFlightReplyBackingFormData';
import {
  createTemporaryReference,
  registerTemporaryReference,
} from './ReactFlightServerTemporaryReferences';
import {ASYNC_ITERATOR} from 'shared/ReactSymbols';

import hasOwnProperty from 'shared/hasOwnProperty';
import getPrototypeOf from 'shared/getPrototypeOf';
import isArray from 'shared/isArray';

interface FlightStreamController {
  enqueueModel(json: string): void;
  close(json: string): void;
  error(error: Error): void;
}

export type JSONValue =
  | number
  | null
  | boolean
  | string
  | {+[key: string]: JSONValue}
  | $ReadOnlyArray<JSONValue>;

const PENDING = 'pending';
const BLOCKED = 'blocked';
const RESOLVED_MODEL = 'resolved_model';
const INITIALIZED = 'fulfilled';
const ERRORED = 'rejected';

const __PROTO__ = '__proto__';

type RESPONSE_SYMBOL_TYPE = 'RESPONSE_SYMBOL'; // Fake symbol type.
const RESPONSE_SYMBOL: RESPONSE_SYMBOL_TYPE = Symbol() as any;

type PendingChunk<T> = {
  status: 'pending',
  value: null | Array<InitializationReference | (T => mixed)>,
  reason: null | Array<InitializationReference | (mixed => mixed)>,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type BlockedChunk<T> = {
  status: 'blocked',
  value: null | Array<InitializationReference | (T => mixed)>,
  reason: null | Array<InitializationReference | (mixed => mixed)>,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type ResolvedModelChunk<T> = {
  status: 'resolved_model',
  value: string,
  reason: {id: number, [RESPONSE_SYMBOL_TYPE]: Response},
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type InitializedChunk<T> = {
  status: 'fulfilled',
  value: T,
  reason: null | NestedArrayContext,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type InitializedStreamChunk<
  T: ReadableStream | $AsyncIterable<any, any, void>,
> = {
  status: 'fulfilled',
  value: T,
  reason: FlightStreamController,
  then(resolve: (ReadableStream) => mixed, reject?: (mixed) => mixed): void,
};
type ErroredChunk<T> = {
  status: 'rejected',
  value: null,
  reason: mixed,
  then(resolve: (T) => mixed, reject?: (mixed) => mixed): void,
};
type SomeChunk<T> =
  | PendingChunk<T>
  | BlockedChunk<T>
  | ResolvedModelChunk<T>
  | InitializedChunk<T>
  | ErroredChunk<T>;

// $FlowFixMe[missing-this-annot]
function ReactPromise(status: any, value: any, reason: any) {
  this.status = status;
  this.value = value;
  this.reason = reason;
}
// We subclass Promise.prototype so that we get other methods like .catch
ReactPromise.prototype = Object.create(Promise.prototype) as any;
// TODO: This doesn't return a new Promise chain unlike the real .then
ReactPromise.prototype.then = function <T>(
  this: SomeChunk<T>,
  resolve: (value: T) => mixed,
  reject: ?(reason: mixed) => mixed,
) {
  const chunk: SomeChunk<T> = this;
  // If we have resolved content, we try to initialize it first which
  // might put us back into one of the other states.
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      if (typeof resolve === 'function') {
        let inspectedValue = chunk.value;
        // Recursively check if the value is itself a ReactPromise and if so if it points
        // back to itself. This helps catch recursive thenables early error.
        let cycleProtection = 0;
        const visited = new Set<typeof ReactPromise>();
        while (inspectedValue instanceof ReactPromise) {
          cycleProtection++;
          if (
            // $FlowFixMe[invalid-compare]
            inspectedValue === chunk ||
            visited.has(inspectedValue) ||
            cycleProtection > 1000
          ) {
            if (typeof reject === 'function') {
              reject(new Error('Cannot have cyclic thenables.'));
            }
            return;
          }
          visited.add(inspectedValue);
          // $FlowFixMe[invalid-compare]
          if (inspectedValue.status === INITIALIZED) {
            inspectedValue = inspectedValue.value;
          } else {
            // If this is lazily resolved, pending or blocked, it'll eventually become
            // initialized and break the loop. Rejected also breaks it.
            break;
          }
        }
        resolve(chunk.value);
      }
      break;
    case PENDING:
    case BLOCKED:
      if (typeof resolve === 'function') {
        if (chunk.value === null) {
          chunk.value = [] as Array<InitializationReference | (T => mixed)>;
        }
        chunk.value.push(resolve);
      }
      if (typeof reject === 'function') {
        if (chunk.reason === null) {
          chunk.reason = [] as Array<
            InitializationReference | (mixed => mixed),
          >;
        }
        chunk.reason.push(reject);
      }
      break;
    default:
      if (typeof reject === 'function') {
        reject(chunk.reason);
      }
      break;
  }
};

const ObjectPrototype = Object.prototype;
const ArrayPrototype = Array.prototype;

export type Response = {
  _bundlerConfig: ServerManifest,
  _prefix: string,
  _formData: BackingFormData,
  _chunks: Map<number, SomeChunk<any>>,
  _closed: boolean,
  _closedReason: mixed,
  _temporaryReferences: void | TemporaryReferenceSet,
  _rootArrayContexts: WeakMap<$ReadOnlyArray<mixed>, NestedArrayContext>,
  _arraySizeLimit: number,
};

export function getRoot<T>(response: Response): Thenable<T> {
  const chunk = getChunk(response, 0);
  return chunk as any;
}

function createPendingChunk<T>(response: Response): PendingChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(PENDING, null, null);
}

function wakeChunk<T>(
  response: Response,
  listeners: Array<InitializationReference | (T => mixed)>,
  value: T,
  chunk: InitializedChunk<T>,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(value);
    } else {
      fulfillReference(response, listener, value, chunk.reason);
    }
  }
}

function rejectChunk(
  response: Response,
  listeners: Array<InitializationReference | (mixed => mixed)>,
  error: mixed,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener === 'function') {
      listener(error);
    } else {
      rejectReference(response, listener.handler, error);
    }
  }
}

function wakeChunkIfInitialized<T>(
  response: Response,
  chunk: SomeChunk<T>,
  resolveListeners: Array<InitializationReference | (T => mixed)>,
  rejectListeners: null | Array<InitializationReference | (mixed => mixed)>,
): void {
  switch (chunk.status) {
    case INITIALIZED:
      wakeChunk(response, resolveListeners, chunk.value, chunk);
      break;
    case BLOCKED:
    case PENDING:
      if (chunk.value) {
        for (let i = 0; i < resolveListeners.length; i++) {
          chunk.value.push(resolveListeners[i]);
        }
      } else {
        chunk.value = resolveListeners;
      }

      if (chunk.reason) {
        if (rejectListeners) {
          for (let i = 0; i < rejectListeners.length; i++) {
            chunk.reason.push(rejectListeners[i]);
          }
        }
      } else {
        chunk.reason = rejectListeners;
      }
      break;
    case ERRORED:
      if (rejectListeners) {
        rejectChunk(response, rejectListeners, chunk.reason);
      }
      break;
  }
}

function triggerErrorOnChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  error: mixed,
): void {
  if (chunk.status !== PENDING && chunk.status !== BLOCKED) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    // $FlowFixMe[incompatible-type]: The error method should accept mixed.
    controller.error(error);
    return;
  }
  const listeners = chunk.reason;
  const erroredChunk: ErroredChunk<T> = chunk as any;
  erroredChunk.status = ERRORED;
  erroredChunk.reason = error;
  if (listeners !== null) {
    rejectChunk(response, listeners, error);
  }
}

function createResolvedModelChunk<T>(
  response: Response,
  value: string,
  id: number,
): ResolvedModelChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, value, {
    id,
    [RESPONSE_SYMBOL]: response,
  });
}

function createErroredChunk<T>(
  response: Response,
  reason: mixed,
): ErroredChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(ERRORED, null, reason);
}

function resolveModelChunk<T>(
  response: Response,
  chunk: SomeChunk<T>,
  value: string,
  id: number,
): void {
  if (chunk.status !== PENDING) {
    // If we get more data to an already resolved ID, we assume that it's
    // a stream chunk since any other row shouldn't have more than one entry.
    const streamChunk: InitializedStreamChunk<any> = chunk as any;
    const controller = streamChunk.reason;
    if (value[0] === 'C') {
      controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
    } else {
      controller.enqueueModel(value);
    }
    return;
  }
  const resolveListeners = chunk.value;
  const rejectListeners = chunk.reason;
  const resolvedChunk: ResolvedModelChunk<T> = chunk as any;
  resolvedChunk.status = RESOLVED_MODEL;
  resolvedChunk.value = value;
  resolvedChunk.reason = {id, [RESPONSE_SYMBOL]: response};
  if (resolveListeners !== null) {
    // This is unfortunate that we're reading this eagerly if
    // we already have listeners attached since they might no
    // longer be rendered or might not be the highest pri.
    initializeModelChunk(resolvedChunk);
    // The status might have changed after initialization.
    wakeChunkIfInitialized(response, chunk, resolveListeners, rejectListeners);
  }
}

function createInitializedStreamChunk<
  T: ReadableStream | $AsyncIterable<any, any, void>,
>(
  response: Response,
  value: T,
  controller: FlightStreamController,
): InitializedChunk<T> {
  // We use the reason field to stash the controller since we already have that
  // field. It's a bit of a hack but efficient.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(INITIALIZED, value, controller);
}

function createResolvedIteratorResultChunk<T>(
  response: Response,
  value: string,
  done: boolean,
): ResolvedModelChunk<IteratorResult<T, T>> {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  const iteratorResultJSON =
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(RESOLVED_MODEL, iteratorResultJSON, {
    id: -1,
    [RESPONSE_SYMBOL]: response,
  });
}

function resolveIteratorResultChunk<T>(
  response: Response,
  chunk: SomeChunk<IteratorResult<T, T>>,
  value: string,
  done: boolean,
): void {
  // To reuse code as much code as possible we add the wrapper element as part of the JSON.
  const iteratorResultJSON =
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + '}';
  resolveModelChunk(response, chunk, iteratorResultJSON, -1);
}

function loadServerReference<A: Iterable<any>, T>(
  response: Response,
  metaData: {
    id: any,
    bound: null | Thenable<Array<any>>,
  },
  parentObject: Object,
  key: string,
): (...A) => Promise<T> {
  const id: ServerReferenceId = metaData.id;
  if (typeof id !== 'string') {
    return null as any;
  }
  if (key === 'then') {
    // This should never happen because we always serialize objects with then-functions
    // as "thenable" which reduces to ReactPromise with no other fields.
    return null as any;
  }

  // Check for a cached promise from a previous call with the same metadata.
  // This handles deduplication when the same server reference appears multiple
  // times in the payload.
  const cachedPromise: SomeChunk<T> | void = (metaData as any).$$promise;
  if (cachedPromise !== undefined) {
    if (cachedPromise.status === INITIALIZED) {
      // The value was already resolved by a previous call.
      const resolvedValue: T = cachedPromise.value;
      if (key === __PROTO__) {
        return null as any;
      }
      parentObject[key] = resolvedValue;
      return resolvedValue as any;
    }

    // The promise is still blocked. Increment the handler dependency count ...
    let handler: InitializationHandler;
    if (initializingHandler) {
      handler = initializingHandler;
      handler.deps++;
    } else {
      handler = initializingHandler = {
        chunk: null,
        value: null,
        reason: null,
        deps: 1,
        errored: false,
      };
    }
    // ... and register resolve and reject listeners on the promise.
    cachedPromise.then(
      resolveReference.bind(null, response, handler, parentObject, key),
      rejectReference.bind(null, response, handler),
    );

    // Return a place holder value for now.
    return null as any;
  }

  // This is the first call for this server reference metadata. Create a cached
  // promise to be used for subsequent calls.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const blockedPromise: BlockedChunk<T> = new ReactPromise(BLOCKED, null, null);
  (metaData as any).$$promise = blockedPromise;

  const serverReference: ServerReference<T> =
    resolveServerReference<$FlowFixMe>(response._bundlerConfig, id);
  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  const bound = metaData.bound;
  let serverReferencePromise: null | Thenable<any> =
    preloadModule(serverReference);
  if (!serverReferencePromise) {
    if (bound instanceof ReactPromise) {
      serverReferencePromise = Promise.resolve(bound);
    } else {
      const resolvedValue = requireModule(serverReference) as any;
      // Resolve the cached promise synchronously.
      const initializedPromise: InitializedChunk<T> = blockedPromise as any;
      initializedPromise.status = INITIALIZED;
      initializedPromise.value = resolvedValue;
      initializedPromise.reason = null;
      return resolvedValue;
    }
  } else if (bound instanceof ReactPromise) {
    serverReferencePromise = Promise.all([serverReferencePromise, bound]);
  }

  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false,
    };
  }

  function fulfill(): void {
    let resolvedValue = requireModule(serverReference) as any;

    if (metaData.bound) {
      // This promise is coming from us and should have initialized by now.
      const promiseValue = (metaData.bound as any).value;
      const boundArgs: Array<any> = isArray(promiseValue)
        ? promiseValue.slice(0)
        : [];
      if (boundArgs.length > MAX_BOUND_ARGS) {
        reject(
          new Error(
            'Server Function has too many bound arguments. Received ' +
              boundArgs.length +
              ' but the limit is ' +
              MAX_BOUND_ARGS +
              '.',
          ),
        );
        return;
      }
      boundArgs.unshift(null); // this
      resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
    }

    // Resolve the cached promise so subsequent references can use the value.
    const resolveListeners = blockedPromise.value;
    const initializedPromise: InitializedChunk<T> = blockedPromise as any;
    initializedPromise.status = INITIALIZED;
    initializedPromise.value = resolvedValue;
    initializedPromise.reason = null;
    if (resolveListeners !== null) {
      // Notify any resolve listeners that were added via .then() from
      // subsequent loadServerReference calls for the same reference.
      wakeChunk(response, resolveListeners, resolvedValue, initializedPromise);
    }

    resolveReference(response, handler, parentObject, key, resolvedValue);
  }

  function reject(error: mixed): void {
    // Mark the cached promise as errored so subsequent references fail too.
    const rejectListeners = blockedPromise.reason;
    const erroredPromise: ErroredChunk<T> = blockedPromise as any;
    erroredPromise.status = ERRORED;
    erroredPromise.value = null;
    erroredPromise.reason = error;
    if (rejectListeners !== null) {
      // Notify any reject listeners that were added via .then() from subsequent
      // loadServerReference calls for the same reference.
      rejectChunk(response, rejectListeners, error);
    }

    rejectReference(response, handler, error);
  }

  serverReferencePromise.then(fulfill, reject);

  // Return a place holder value for now.
  return null as any;
}

function reviveModel(
  response: Response,
  parentObj: any,
  parentKey: string,
  value: JSONValue,
  reference: void | string,
  arrayRoot: null | NestedArrayContext,
): any {
  if (typeof value === 'string') {
    // We can't use .bind here because we need the "this" value.
    return parseModelString(
      response,
      parentObj,
      parentKey,
      value,
      reference,
      arrayRoot,
    );
  }
  if (typeof value === 'object' && value !== null) {
    if (
      reference !== undefined &&
      response._temporaryReferences !== undefined
    ) {
      // Store this object's reference in case it's returned later.
      registerTemporaryReference(
        response._temporaryReferences,
        value,
        reference,
      );
    }
    if (isArray(value)) {
      let childContext: NestedArrayContext;
      if (arrayRoot === null) {
        childContext = {
          count: 0,
          fork: false,
        } as NestedArrayContext;
        response._rootArrayContexts.set(value, childContext);
      } else {
        childContext = arrayRoot;
      }
      if (value.length > 1) {
        childContext.fork = true;
      }
      bumpArrayCount(
        childContext,
        // Number of commas + square brackets
        // value.length - 1 + 2
        value.length + 1,
        response,
      );
      for (let i = 0; i < value.length; i++) {
        const childRef =
          reference !== undefined ? reference + ':' + i : undefined;
        // $FlowFixMe[cannot-write]
        value[i] = reviveModel(
          response,
          value,
          '' + i,
          value[i],
          childRef,
          childContext,
        );
      }
    } else {
      for (const key in value) {
        if (hasOwnProperty.call(value, key)) {
          if (key === __PROTO__) {
            // $FlowFixMe[cannot-write]
            delete value[key];
            continue;
          }
          const childRef =
            reference !== undefined && key.indexOf(':') === -1
              ? reference + ':' + key
              : undefined;
          const newValue = reviveModel(
            response,
            value,
            key,
            value[key],
            childRef,
            null, // The array context resets when we're entering a non-array
          );
          if (newValue !== undefined) {
            // $FlowFixMe[cannot-write]
            value[key] = newValue;
          } else {
            // $FlowFixMe[cannot-write]
            delete value[key];
          }
        }
      }
    }
  }
  return value;
}

type NestedArrayContext = {
  // Keeps track of how many slots, bytes or characters are in nested arrays/strings/typed arrays.
  count: number,
  // A single child is itself not harmful. There needs to be at least one parent array with more
  // than one child.
  fork: boolean,
};

function bumpArrayCount(
  arrayContext: NestedArrayContext,
  slots: number,
  response: Response,
): void {
  const newCount = (arrayContext.count += slots);
  if (newCount > response._arraySizeLimit && arrayContext.fork) {
    throw new Error(
      'Maximum array nesting exceeded. Large nested arrays can be dangerous. Try adding intermediate objects.',
    );
  }
}

type InitializationReference = {
  handler: InitializationHandler,
  parentObject: Object,
  key: string,
  map: (
    response: Response,
    model: any,
    parentObject: Object,
    key: string,
  ) => any,
  path: Array<string>,
  arrayRoot: null | NestedArrayContext,
};
type InitializationHandler = {
  chunk: null | BlockedChunk<any>,
  value: any,
  // TODO: Split type to make it impossible to treat a thrown value as NestedArrayContext.
  // thrown value if errored, otherwise array context
  reason: mixed | NestedArrayContext,
  deps: number,
  errored: boolean,
};
let initializingHandler: null | InitializationHandler = null;

function initializeModelChunk<T>(chunk: ResolvedModelChunk<T>): void {
  const prevHandler = initializingHandler;
  initializingHandler = null;

  const {[RESPONSE_SYMBOL]: response, id} = chunk.reason;

  const rootReference = id === -1 ? undefined : id.toString(16);

  const resolvedModel = chunk.value;

  // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.
  const cyclicChunk: BlockedChunk<T> = chunk as any;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = null;
  cyclicChunk.reason = null;

  try {
    const rawModel = JSON.parse(resolvedModel);

    // The root might not be an array but if it is we want to track the count of entries.
    const arrayRoot: NestedArrayContext = {
      count: 0,
      fork: false,
    };

    const value: T = reviveModel(
      response,
      {'': rawModel},
      '',
      rawModel,
      rootReference,
      arrayRoot,
    );

    // Invoke any listeners added while resolving this model. I.e. cyclic
    // references. This may or may not fully resolve the model depending on
    // if they were blocked.
    const resolveListeners = cyclicChunk.value;
    if (resolveListeners !== null) {
      cyclicChunk.value = null;
      cyclicChunk.reason = null;
      for (let i = 0; i < resolveListeners.length; i++) {
        const listener = resolveListeners[i];
        if (typeof listener === 'function') {
          listener(value);
        } else {
          fulfillReference(response, listener, value, arrayRoot);
        }
      }
    }
    if (initializingHandler !== null) {
      if (initializingHandler.errored) {
        throw initializingHandler.reason;
      }
      if (initializingHandler.deps > 0) {
        // We discovered new dependencies on modules that are not yet resolved.
        // We have to keep the BLOCKED state until they're resolved.
        initializingHandler.value = value;
        initializingHandler.reason = arrayRoot;
        initializingHandler.chunk = cyclicChunk;
        return;
      }
    }
    const initializedChunk: InitializedChunk<T> = chunk as any;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = value;
    initializedChunk.reason = arrayRoot;
  } catch (error) {
    const erroredChunk: ErroredChunk<T> = chunk as any;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    initializingHandler = prevHandler;
  }
}

// Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.
export function reportGlobalError(response: Response, error: Error): void {
  response._closed = true;
  response._closedReason = error;
  response._chunks.forEach(chunk => {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    if (chunk.status === PENDING) {
      triggerErrorOnChunk(response, chunk, error);
    } else if (chunk.status === INITIALIZED) {
      const initializedChunk:
        | InitializedChunk<any>
        | InitializedStreamChunk<any> = chunk as any;
      if (initializedChunk.reason !== null) {
        const maybeController = initializedChunk.reason;
        // $FlowFixMe[method-unbinding] Just doing a typeof check
        if (typeof maybeController.error === 'function') {
          maybeController.error(error);
        }
      }
    }
  });
}

function getChunk(response: Response, id: number): SomeChunk<any> {
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  if (!chunk) {
    const prefix = response._prefix;
    const key = prefix + id;
    // Check if we have this field in the backing store already.
    const backingEntry = getBackingEntry(response._formData, key);
    if (typeof backingEntry === 'string') {
      chunk = createResolvedModelChunk(response, backingEntry, id);
    } else if (response._closed) {
      // We have already errored the response and we're not going to get
      // anything more streaming in so this will immediately error.
      chunk = createErroredChunk(response, response._closedReason);
    } else {
      // We're still waiting on this entry to stream in.
      chunk = createPendingChunk(response);
    }
    chunks.set(id, chunk);
  }
  return chunk;
}

function fulfillReference(
  response: Response,
  reference: InitializationReference,
  value: any,
  arrayRoot: null | NestedArrayContext,
): void {
  const {handler, parentObject, key, map, path} = reference;

  let resolvedValue;
  try {
    let localLength: number = 0;
    const rootArrayContexts = response._rootArrayContexts;
    for (let i = 1; i < path.length; i++) {
      // The server doesn't have any lazy references so we don't expect to go through a Promise.
      const name = path[i];
      if (
        typeof value === 'object' &&
        value !== null &&
        (getPrototypeOf(value) === ObjectPrototype ||
          getPrototypeOf(value) === ArrayPrototype) &&
        hasOwnProperty.call(value, name)
      ) {
        value = value[name];
        if (isArray(value)) {
          localLength = 0;
          arrayRoot = rootArrayContexts.get(value) || arrayRoot;
        } else {
          arrayRoot = null;
          if (typeof value === 'string') {
            localLength = value.length;
          } else if (typeof value === 'bigint') {
            // Estimate the length to avoid expensive toString() calls on large
            // BigInt values. If the value is too large, we get Infinity, which
            // will trigger the array size limit error.
            // eslint-disable-next-line react-internal/no-primitive-constructors
            const n = Math.abs(Number(value));
            if (n === 0) {
              localLength = 1;
            } else {
              localLength = Math.floor(Math.log10(n)) + 1;
            }
          } else if (ArrayBuffer.isView(value)) {
            localLength = value.byteLength;
          } else {
            localLength = 0;
          }
        }
      } else {
        throw new Error('Invalid reference.');
      }
    }

    resolvedValue = map(response, value, parentObject, key);

    // Add any array counts to the reference's array root. The value that we're
    // resolving might have deep nesting that we need to resolve.
    const referenceArrayRoot = reference.arrayRoot;
    if (referenceArrayRoot !== null) {
      if (arrayRoot !== null) {
        if (arrayRoot.fork) {
          referenceArrayRoot.fork = true;
        }
        bumpArrayCount(referenceArrayRoot, arrayRoot.count, response);
      } else if (localLength > 0) {
        bumpArrayCount(referenceArrayRoot, localLength, response);
      }
    }
  } catch (error) {
    rejectReference(response, handler, error);
    return;
  }

  // There are no Elements or Debug Info to transfer here.

  resolveReference(response, handler, parentObject, key, resolvedValue);
}

function resolveReference(
  response: Response,
  handler: InitializationHandler,
  parentObject: Object,
  key: string,
  resolvedValue: mixed,
): void {
  if (key !== __PROTO__) {
    parentObject[key] = resolvedValue;
  }

  // If this is the root object for a model reference, where `handler.value`
  // is a stale `null`, the resolved value can be used directly.
  if (key === '' && handler.value === null) {
    handler.value = resolvedValue;
  }

  handler.deps--;

  if (handler.deps === 0) {
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    const resolveListeners = chunk.value;
    const initializedChunk: InitializedChunk<any> = chunk as any;
    initializedChunk.status = INITIALIZED;
    initializedChunk.value = handler.value;
    initializedChunk.reason =
      // $FlowFixMe[incompatible-type] Assuming handler.errored is false.
      handler.reason;
    if (resolveListeners !== null) {
      wakeChunk(response, resolveListeners, handler.value, initializedChunk);
    }
  }
}

function rejectReference(
  response: Response,
  handler: InitializationHandler,
  error: mixed,
): void {
  if (handler.errored) {
    // We've already errored. We could instead build up an AggregateError
    // but if there are multiple errors we just take the first one like
    // Promise.all.
    return;
  }
  handler.errored = true;
  handler.value = null;
  handler.reason = error;
  const chunk = handler.chunk;
  if (chunk === null || chunk.status !== BLOCKED) {
    return;
  }
  // There's no debug info to forward in this direction.
  triggerErrorOnChunk(response, chunk, error);
}

function waitForReference<T>(
  response: Response,
  referencedChunk: BlockedChunk<T>,
  parentObject: Object,
  key: string,
  arrayRoot: null | NestedArrayContext,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
  path: Array<string>,
): T {
  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false,
    };
  }

  const reference: InitializationReference = {
    handler,
    parentObject,
    key,
    map,
    path,
    arrayRoot,
  };

  // Add "listener".
  if (referencedChunk.value === null) {
    referencedChunk.value = [reference];
  } else {
    referencedChunk.value.push(reference);
  }
  if (referencedChunk.reason === null) {
    referencedChunk.reason = [reference];
  } else {
    referencedChunk.reason.push(reference);
  }

  // Return a place holder value for now.
  return null as any;
}

function getOutlinedModel<T>(
  response: Response,
  reference: string,
  parentObject: Object,
  key: string,
  referenceArrayRoot: null | NestedArrayContext,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
): T {
  const path = reference.split(':');
  const id = parseInt(path[0], 16);
  let chunk = getChunk(response, id);
  switch (chunk.status) {
    case RESOLVED_MODEL:
      initializeModelChunk(chunk);
      // $FlowFixMe[incompatible-type] We just initialized this chunk so it can't be a ResolvedModelChunk anymore.
      chunk = chunk as Exclude<SomeChunk<T>, ResolvedModelChunk<T>>;
      break;
  }
  // The status might have changed after initialization.
  switch (chunk.status) {
    case INITIALIZED:
      let value = chunk.value;
      const arrayRootOrController:
        | null
        | NestedArrayContext
        | FlightStreamController = chunk.reason;
      if (arrayRootOrController !== null && 'error' in arrayRootOrController) {
        throw new Error(
          'Expected an initialized chunk but got an initialized stream chunk instead. ' +
            'This payload may have been submitted by an older version of React.',
        );
      }
      let arrayRoot = arrayRootOrController;

      let localLength: number = 0;
      const rootArrayContexts = response._rootArrayContexts;
      for (let i = 1; i < path.length; i++) {
        const name = path[i];
        if (
          typeof value === 'object' &&
          // $FlowFixMe[invalid-compare] This check is still needed at runtime.
          value !== null &&
          (getPrototypeOf(value) === ObjectPrototype ||
            getPrototypeOf(value) === ArrayPrototype) &&
          hasOwnProperty.call(value, name)
        ) {
          value = value[name];
          if (isArray(value)) {
            localLength = 0;
            arrayRoot =
              rootArrayContexts.get(
                // $FlowFixMe[incompatible-type] Our `isArray` typing can't narrow `mixed`
                value as $ReadOnlyArray<mixed>,
              ) || arrayRoot;
          } else {
            arrayRoot = null;
            if (typeof value === 'string') {
              localLength = value.length;
            } else if (typeof value === 'bigint') {
              // Estimate the length to avoid expensive toString() calls on large
              // BigInt values. If the value is too large, we get Infinity, which
              // will trigger the array size limit error.
              // eslint-disable-next-line react-internal/no-primitive-constructors
              const n = Math.abs(Number(value));
              if (n === 0) {
                localLength = 1;
              } else {
                localLength = Math.floor(Math.log10(n)) + 1;
              }
            } else if (ArrayBuffer.isView(value)) {
              localLength = value.byteLength;
            } else {
              localLength = 0;
            }
          }
        } else {
          throw new Error('Invalid reference.');
        }
      }
      const chunkValue = map(response, value, parentObject, key);

      // Add any array counts to the reference's array root. The value that we're
      // resolving might have deep nesting that we need to resolve.
      if (referenceArrayRoot !== null) {
        if (arrayRoot !== null) {
          if (arrayRoot.fork) {
            referenceArrayRoot.fork = true;
          }
          bumpArrayCount(referenceArrayRoot, arrayRoot.count, response);
        } else if (localLength > 0) {
          bumpArrayCount(referenceArrayRoot, localLength, response);
        }
      }
      // There's no Element nor Debug Info in the ReplyServer so we don't have to check those here.
      return chunkValue;
    case BLOCKED:
      return waitForReference(
        response,
        chunk,
        parentObject,
        key,
        referenceArrayRoot,
        map,
        path,
      );
    case PENDING:
      // If we don't have the referenced chunk yet, then this must be a forward reference,
      // which is not allowed.
      throw new Error('Invalid forward reference.');
    default:
      // This is an error. Instead of erroring directly, we're going to encode this on
      // an initialization handler.
      if (initializingHandler) {
        initializingHandler.errored = true;
        initializingHandler.value = null;
        initializingHandler.reason = chunk.reason;
      } else {
        initializingHandler = {
          chunk: null,
          value: null,
          reason: chunk.reason,
          deps: 0,
          errored: true,
        };
      }
      // Placeholder
      return null as any;
  }
}

function createMap(
  response: Response,
  model: Array<[any, any]>,
): Map<any, any> {
  if (!isArray(model)) {
    throw new Error('Invalid Map initializer.');
  }
  if ((model as any).$$consumed === true) {
    throw new Error('Already initialized Map.');
  }
  // This needs to come first to prevent the model from being consumed again in case of a cyclic reference.
  (model as any).$$consumed = true;
  const map = new Map(model);
  return map;
}

function createSet(response: Response, model: Array<any>): Set<any> {
  if (!isArray(model)) {
    throw new Error('Invalid Set initializer.');
  }
  if ((model as any).$$consumed === true) {
    throw new Error('Already initialized Set.');
  }
  // This needs to come first to prevent the model from being consumed again in case of a cyclic reference.
  (model as any).$$consumed = true;
  const set = new Set(model);
  return set;
}

function extractIterator(response: Response, model: Array<any>): Iterator<any> {
  if (!isArray(model)) {
    throw new Error('Invalid Iterator initializer.');
  }
  if ((model as any).$$consumed === true) {
    throw new Error('Already initialized Iterator.');
  }
  // This needs to come first to prevent the model from being consumed again in case of a cyclic reference.
  (model as any).$$consumed = true;
  // $FlowFixMe[incompatible-use]: This uses raw Symbols because we're extracting from a native array.
  const iterator = model[Symbol.iterator]();
  return iterator;
}

function createModel(
  response: Response,
  model: any,
  parentObject: Object,
  key: string,
): any {
  if (key === 'then' && typeof model === 'function') {
    // This should never happen because we always serialize objects with then-functions
    // as "thenable" which reduces to ReactPromise with no other fields.
    return null;
  }
  return model;
}

function parseTypedArray<T: $ArrayBufferView | ArrayBuffer>(
  response: Response,
  reference: string,
  constructor: any,
  bytesPerElement: number,
  parentObject: Object,
  parentKey: string,
  referenceArrayRoot: null | NestedArrayContext,
): null {
  const id = parseInt(reference.slice(2), 16);
  const prefix = response._prefix;
  const key = prefix + id;
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized typed array.');
  }
  chunks.set(
    id,
    // We don't need to put the actual Blob in the chunk,
    // because it shouldn't be accessed by anything else.
    createErroredChunk(response, new Error('Already initialized typed array.')),
  );

  // We should have this backingEntry in the store already because we emitted
  // it before referencing it. It should be a Blob.
  const backingEntry: Blob = getBackingEntry(response._formData, key) as any;

  const promise: Promise<ArrayBuffer> = backingEntry.arrayBuffer();

  // Since loading the buffer is an async operation we'll be blocking the parent
  // chunk.

  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: false,
    };
  }

  function fulfill(buffer: ArrayBuffer): void {
    try {
      if (referenceArrayRoot !== null) {
        bumpArrayCount(referenceArrayRoot, buffer.byteLength, response);
      }

      const resolvedValue: T =
        constructor === ArrayBuffer
          ? (buffer as any)
          : (new constructor(buffer) as any);

      if (key !== __PROTO__) {
        parentObject[parentKey] = resolvedValue;
      }

      // If this is the root object for a model reference, where `handler.value`
      // is a stale `null`, the resolved value can be used directly.
      if (parentKey === '' && handler.value === null) {
        handler.value = resolvedValue;
      }
    } catch (x) {
      reject(x);
      return;
    }

    handler.deps--;

    if (handler.deps === 0) {
      const chunk = handler.chunk;
      if (chunk === null || chunk.status !== BLOCKED) {
        return;
      }
      const resolveListeners = chunk.value;
      const initializedChunk: InitializedChunk<T> = chunk as any;
      initializedChunk.status = INITIALIZED;
      initializedChunk.value = handler.value;
      // We don't keep an array count for this since it won't be referenced again.
      // In fact, we don't really need to store this chunk at all.
      initializedChunk.reason = null;
      if (resolveListeners !== null) {
        wakeChunk(response, resolveListeners, handler.value, initializedChunk);
      }
    }
  }

  function reject(error: mixed): void {
    if (handler.errored) {
      // We've already errored. We could instead build up an AggregateError
      // but if there are multiple errors we just take the first one like
      // Promise.all.
      return;
    }
    handler.errored = true;
    handler.value = null;
    handler.reason = error;
    const chunk = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      return;
    }
    triggerErrorOnChunk(response, chunk, error);
  }

  promise.then(fulfill, reject);

  return null;
}

function resolveStream<T: ReadableStream | $AsyncIterable<any, any, void>>(
  response: Response,
  id: number,
  stream: T,
  controller: FlightStreamController,
): void {
  const chunks = response._chunks;
  const chunk = createInitializedStreamChunk(response, stream, controller);
  chunks.set(id, chunk);

  const prefix = response._prefix;
  const key = prefix + id;
  const existingEntries = getAllBackingEntries(response._formData, key);
  for (let i = 0; i < existingEntries.length; i++) {
    const value = existingEntries[i];
    if (typeof value === 'string') {
      if (value[0] === 'C') {
        controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
      } else {
        controller.enqueueModel(value);
      }
    }
  }
}

function parseReadableStream<T>(
  response: Response,
  reference: string,
  type: void | 'bytes',
  parentObject: Object,
  parentKey: string,
): ReadableStream {
  const id = parseInt(reference.slice(2), 16);
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }

  let controller: ReadableStreamController = null as any;
  let closed = false;
  const stream = new ReadableStream({
    type: type,
    start(c) {
      controller = c;
    },
  });
  let previousBlockedChunk: SomeChunk<T> | null = null;
  function enqueue(value: T): void {
    if (type === 'bytes' && !ArrayBuffer.isView(value)) {
      flightController.error(new Error('Invalid data for bytes stream.'));
      return;
    }
    controller.enqueue(value);
  }
  const flightController = {
    enqueueModel(json: string): void {
      if (previousBlockedChunk === null) {
        // If we're not blocked on any other chunks, we can try to eagerly initialize
        // this as a fast-path to avoid awaiting them.
        const chunk: ResolvedModelChunk<T> = createResolvedModelChunk(
          response,
          json,
          -1,
        );
        initializeModelChunk(chunk);
        const initializedChunk: SomeChunk<T> = chunk;
        if (initializedChunk.status === INITIALIZED) {
          enqueue(initializedChunk.value);
        } else {
          chunk.then(enqueue, flightController.error);
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        const blockedChunk = previousBlockedChunk;
        const chunk: SomeChunk<T> = createPendingChunk(response);
        chunk.then(enqueue, flightController.error);
        previousBlockedChunk = chunk;
        blockedChunk.then(function () {
          if (previousBlockedChunk === chunk) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }
          resolveModelChunk(response, chunk, json, -1);
        });
      }
    },
    close(json: string): void {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        controller.close();
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.close());
      }
    },
    error(error: mixed): void {
      if (closed) {
        return;
      }
      closed = true;
      if (previousBlockedChunk === null) {
        // $FlowFixMe[incompatible-type]
        controller.error(error);
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(() => controller.error(error as any));
      }
    },
  };
  resolveStream(response, id, stream, flightController);
  return stream;
}

function FlightIterator(
  this: {next: (arg: void) => SomeChunk<IteratorResult<any, any>>, ...},
  next: (arg: void) => SomeChunk<IteratorResult<any, any>>,
) {
  this.next = next;
  // TODO: Add return/throw as options for aborting.
}
// TODO: The iterator could inherit the AsyncIterator prototype which is not exposed as
// a global but exists as a prototype of an AsyncGenerator. However, it's not needed
// to satisfy the iterable protocol.
FlightIterator.prototype = {} as any;
FlightIterator.prototype[ASYNC_ITERATOR] = function asyncIterator(
  this: $AsyncIterator<any, any, void>,
) {
  // Self referencing iterator.
  return this;
};

function parseAsyncIterable<T>(
  response: Response,
  reference: string,
  iterator: boolean,
  parentObject: Object,
  parentKey: string,
): $AsyncIterable<T, T, void> | $AsyncIterator<T, T, void> {
  const id = parseInt(reference.slice(2), 16);
  const chunks = response._chunks;
  if (chunks.has(id)) {
    throw new Error('Already initialized stream.');
  }

  const buffer: Array<SomeChunk<IteratorResult<T, T>>> = [];
  let closed = false;
  let nextWriteIndex = 0;
  const flightController = {
    enqueueModel(value: string): void {
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
          response,
          value,
          false,
        );
      } else {
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex],
          value,
          false,
        );
      }
      nextWriteIndex++;
    },
    close(value: string): void {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
          response,
          value,
          true,
        );
      } else {
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex],
          value,
          true,
        );
      }
      nextWriteIndex++;
      while (nextWriteIndex < buffer.length) {
        // In generators, any extra reads from the iterator have the value undefined.
        resolveIteratorResultChunk(
          response,
          buffer[nextWriteIndex++],
          '"$undefined"',
          true,
        );
      }
    },
    error(error: Error): void {
      if (closed) {
        return;
      }
      closed = true;
      if (nextWriteIndex === buffer.length) {
        buffer[nextWriteIndex] =
          createPendingChunk<IteratorResult<T, T>>(response);
      }
      while (nextWriteIndex < buffer.length) {
        triggerErrorOnChunk(response, buffer[nextWriteIndex++], error);
      }
    },
  };
  const iterable: $AsyncIterable<T, T, void> = {
    [ASYNC_ITERATOR](): $AsyncIterator<T, T, void> {
      let nextReadIndex = 0;
      // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
      return new FlightIterator((arg: void) => {
        if (arg !== undefined) {
          throw new Error(
            'Values cannot be passed to next() of AsyncIterables passed to Client Components.',
          );
        }
        if (nextReadIndex === buffer.length) {
          if (closed) {
            // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
            return new ReactPromise(
              INITIALIZED,
              {done: true, value: undefined},
              null,
            );
          }
          buffer[nextReadIndex] =
            createPendingChunk<IteratorResult<T, T>>(response);
        }
        return buffer[nextReadIndex++];
      });
    },
  };
  // TODO: If it's a single shot iterator we can optimize memory by cleaning up the buffer after
  // reading through the end, but currently we favor code size over this optimization.
  const stream = iterator ? iterable[ASYNC_ITERATOR]() : iterable;
  resolveStream(response, id, stream, flightController);
  return stream;
}

function parseModelString(
  response: Response,
  obj: Object,
  key: string,
  value: string,
  reference: void | string,
  arrayRoot: null | NestedArrayContext,
): any {
  if (value[0] === '$') {
    switch (value[1]) {
      case '$': {
        // This was an escaped string value.
        if (arrayRoot !== null) {
          bumpArrayCount(arrayRoot, value.length - 1, response);
        }
        return value.slice(1);
      }
      case '@': {
        // Promise
        const id = parseInt(value.slice(2), 16);
        const chunk = getChunk(response, id);
        return chunk;
      }
      case 'h': {
        // Server Reference
        const ref = value.slice(2);
        return getOutlinedModel(
          response,
          ref,
          obj,
          key,
          null,
          loadServerReference,
        );
      }
      case 'T': {
        // Temporary Reference
        if (
          reference === undefined ||
          response._temporaryReferences === undefined
        ) {
          throw new Error(
            'Could not reference an opaque temporary reference. ' +
              'This is likely due to misconfiguring the temporaryReferences options ' +
              'on the server.',
          );
        }
        return createTemporaryReference(
          response._temporaryReferences,
          reference,
        );
      }
      case 'Q': {
        // Map
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, obj, key, null, createMap);
      }
      case 'W': {
        // Set
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, obj, key, null, createSet);
      }
      case 'K': {
        // FormData
        const stringId = value.slice(2);

        const responsePrefix = response._prefix;
        // Use the special marker from the Client to distinguish keys that should
        // be consumed by referenced FormData.
        const anyFormPrefix = responsePrefix + '_';
        const formPrefix = anyFormPrefix + stringId + '_';

        const data = new FormData();
        const backingFormData = response._formData;
        // We're still transpiling for-of loops, so we have to use the iterator directly instead of a for-of loop.
        while (true) {
          const formDataKey = peekBackingEntry(backingFormData);
          if (formDataKey === undefined) {
            break;
          }
          if (formDataKey.startsWith(formPrefix)) {
            const referencedFormDataValue = getAllBackingEntries(
              backingFormData,
              formDataKey,
            );
            const referencedFormDataKey = formDataKey.slice(formPrefix.length);
            for (let i = 0; i < referencedFormDataValue.length; i++) {
              // $FlowFixMe[incompatible-type]
              data.append(referencedFormDataKey, referencedFormDataValue[i]);
            }
            consumeBackingEntry(backingFormData, formDataKey);
          } else if (formDataKey.startsWith(anyFormPrefix)) {
            // The FormData values are continuous and before the FormData reference.
            // If we see something that doesn't look like a value for a referenced
            // FormData, we can assume we're past the values for this FormData
            // reference and stop iterating.
            break;
          } else {
            // Either an outlined value or something not owned by this Reply.
            advanceBackingEntryIterator(backingFormData);
          }
        }
        return data;
      }
      case 'i': {
        // Iterator
        const ref = value.slice(2);
        return getOutlinedModel(response, ref, obj, key, null, extractIterator);
      }
      case 'I': {
        // $Infinity
        return Infinity;
      }
      case '-': {
        // $-0 or $-Infinity
        if (value === '$-0') {
          return -0;
        } else {
          return -Infinity;
        }
      }
      case 'N': {
        // $NaN
        return NaN;
      }
      case 'u': {
        // matches "$undefined"
        // Special encoding for `undefined` which can't be serialized as JSON otherwise.
        return undefined;
      }
      case 'D': {
        // Date
        return new Date(Date.parse(value.slice(2)));
      }
      case 'n': {
        // BigInt
        const bigIntStr = value.slice(2);
        if (bigIntStr.length > MAX_BIGINT_DIGITS) {
          throw new Error(
            'BigInt is too large. Received ' +
              bigIntStr.length +
              ' digits but the limit is ' +
              MAX_BIGINT_DIGITS +
              '.',
          );
        }
        if (arrayRoot !== null) {
          bumpArrayCount(arrayRoot, bigIntStr.length, response);
        }
        return BigInt(bigIntStr);
      }
      case 'A':
        return parseTypedArray(
          response,
          value,
          ArrayBuffer,
          1,
          obj,
          key,
          arrayRoot,
        );
      case 'O':
        return parseTypedArray(
          response,
          value,
          Int8Array,
          1,
          obj,
          key,
          arrayRoot,
        );
      case 'o':
        return parseTypedArray(
          response,
          value,
          Uint8Array,
          1,
          obj,
          key,
          arrayRoot,
        );
      case 'U':
        return parseTypedArray(
          response,
          value,
          Uint8ClampedArray,
          1,
          obj,
          key,
          arrayRoot,
        );
      case 'S':
        return parseTypedArray(
          response,
          value,
          Int16Array,
          2,
          obj,
          key,
          arrayRoot,
        );
      case 's':
        return parseTypedArray(
          response,
          value,
          Uint16Array,
          2,
          obj,
          key,
          arrayRoot,
        );
      case 'L':
        return parseTypedArray(
          response,
          value,
          Int32Array,
          4,
          obj,
          key,
          arrayRoot,
        );
      case 'l':
        return parseTypedArray(
          response,
          value,
          Uint32Array,
          4,
          obj,
          key,
          arrayRoot,
        );
      case 'G':
        return parseTypedArray(
          response,
          value,
          Float32Array,
          4,
          obj,
          key,
          arrayRoot,
        );
      case 'g':
        return parseTypedArray(
          response,
          value,
          Float64Array,
          8,
          obj,
          key,
          arrayRoot,
        );
      case 'M':
        return parseTypedArray(
          response,
          value,
          BigInt64Array,
          8,
          obj,
          key,
          arrayRoot,
        );
      case 'm':
        return parseTypedArray(
          response,
          value,
          BigUint64Array,
          8,
          obj,
          key,
          arrayRoot,
        );
      case 'V':
        return parseTypedArray(
          response,
          value,
          DataView,
          1,
          obj,
          key,
          arrayRoot,
        );
      case 'B': {
        // Blob
        const id = parseInt(value.slice(2), 16);
        const prefix = response._prefix;
        const blobKey = prefix + id;
        // We should have this backingEntry in the store already because we emitted
        // it before referencing it. It should be a Blob.
        const backingEntry: Blob = getBackingEntry(
          response._formData,
          blobKey,
        ) as any;
        if (!(backingEntry instanceof Blob)) {
          throw new Error('Referenced Blob is not a Blob.');
        }
        return backingEntry;
      }
      case 'R': {
        return parseReadableStream(response, value, undefined, obj, key);
      }
      case 'r': {
        return parseReadableStream(response, value, 'bytes', obj, key);
      }
      case 'X': {
        return parseAsyncIterable(response, value, false, obj, key);
      }
      case 'x': {
        return parseAsyncIterable(response, value, true, obj, key);
      }
    }
    // We assume that anything else is a reference ID.
    const ref = value.slice(1);
    return getOutlinedModel(response, ref, obj, key, arrayRoot, createModel);
  }
  if (arrayRoot !== null) {
    bumpArrayCount(arrayRoot, value.length, response);
  }
  return value;
}

const DEFAULT_MAX_ARRAY_NESTING = 1000000;

// Limit BigInt size to prevent CPU exhaustion from parsing very large values.
// 300 digits covers most practical use cases (even 512-bit integers need only
// ~154 digits) and aligns with the implicit limit from the Number approximation
// checks in fulfillReference and getOutlinedModel.
const MAX_BIGINT_DIGITS = 300;

export const MAX_BOUND_ARGS = 1000;

export function createResponse(
  bundlerConfig: ServerManifest,
  formFieldPrefix: string,
  temporaryReferences: void | TemporaryReferenceSet,
  backingFormData?: FormData = new FormData(),
  arraySizeLimit?: number = DEFAULT_MAX_ARRAY_NESTING,
): Response {
  const chunks: Map<number, SomeChunk<any>> = new Map();

  const response: Response = {
    _bundlerConfig: bundlerConfig,
    _prefix: formFieldPrefix,
    _formData: createBackingFormData(backingFormData),
    _chunks: chunks,
    _closed: false,
    _closedReason: null,
    _temporaryReferences: temporaryReferences,
    _rootArrayContexts: new WeakMap(),
    _arraySizeLimit: arraySizeLimit,
  };
  return response;
}

export function resolveField(
  response: Response,
  key: string,
  value: string,
): void {
  // Add this field to the backing store.
  appendBackingEntry(response._formData, key, value);
  const prefix = response._prefix;
  if (key.startsWith(prefix)) {
    const chunks = response._chunks;
    const id = +key.slice(prefix.length);
    const chunk = chunks.get(id);
    if (chunk) {
      // We were waiting on this key so now we can resolve it.
      resolveModelChunk(response, chunk, value, id);
    }
  }
}

export function resolveFile(response: Response, key: string, file: File): void {
  // Add this field to the backing store.
  appendBackingEntry(response._formData, key, file);
}

export opaque type FileHandle = {
  chunks: Array<Uint8Array>,
  filename: string,
  mime: string,
};

export function resolveFileInfo(
  response: Response,
  key: string,
  filename: string,
  mime: string,
): FileHandle {
  return {
    chunks: [],
    filename,
    mime,
  };
}

export function resolveFileChunk(
  response: Response,
  handle: FileHandle,
  chunk: Uint8Array,
): void {
  handle.chunks.push(chunk);
}

export function resolveFileComplete(
  response: Response,
  key: string,
  handle: FileHandle,
): void {
  // Add this file to the backing store.
  // Node.js doesn't expose a global File constructor so we need to use
  // the append() form that takes the file name as the third argument,
  // to create a File object.
  const blob = new Blob(handle.chunks, {type: handle.mime});
  appendBackingFile(response._formData, key, blob, handle.filename);
}

export function close(response: Response): void {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}
