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
  appendBackingEntry,
  consumeBackingEntries,
  getBackingBlob,
  getBackingString,
  getStreamChunks,
} from './ReactFlightReplyBackingFormData';
import {
  createTemporaryReference,
  registerTemporaryReference,
} from './ReactFlightServerTemporaryReferences';
import {ASYNC_ITERATOR} from 'shared/ReactSymbols';
import {enableFlightObjectReferences} from 'shared/ReactFeatureFlags';

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
function reactPromiseThen<T>(
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
}
// The shadowing `then` must be defined with `Object.defineProperty` instead of
// assignment. Assignment would throw when `Promise.prototype` is frozen (e.g.
// by SES lockdown) because assigning over an inherited non-writable property
// is rejected.
Object.defineProperty(ReactPromise.prototype, 'then', {
  writable: true,
  enumerable: true,
  configurable: true,
  value: reactPromiseThen,
});

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
  _serverReferenceObjects: null | WeakSet<Object>,
  _serverReferenceCache: WeakMap<Object, SomeChunk<any>>,
  _serverObjectReferenceCache: WeakMap<Object, SomeChunk<any>>,
  _rootArrayContexts: WeakMap<$ReadOnlyArray<mixed>, NestedArrayContext>,
  _arraySizeLimit: number,
  // The handler of each chunk that has parsed but is still waiting for
  // references, by chunk.
  _handlers: WeakMap<SomeChunk<any>, InitializationHandler>,
  // A Set or Map that was referenced before its entries chunk had initialized,
  // by that chunk. Every reference to the chunk receives the same collection,
  // including a reference from inside its own entries. The entries are copied
  // in when the chunk initializes.
  _reservedCollections: WeakMap<SomeChunk<any>, Set<any> | Map<any, any>>,
  // The slots of parsed objects that still hold a placeholder, by object and
  // key, with the reference that fills each.
  _pendingSlots: WeakMap<Object, Map<string, InitializationReference>>,
  // The constructors waiting to read an object once its slots are all filled.
  _pendingConstructors: WeakMap<Object, Array<InitializationReference>>,
  // Cycle checks queued by the work in progress, run once it is done; how many
  // references are being released or fulfilled, counting nesting.
  _queuedCycleChecks: Array<BlockedCycle>,
  _flushingCycleChecks: boolean,
  _fulfillingReferences: number,
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
      releaseReference(response, listener, chunk);
    }
  }
  flushCycleChecks(response);
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
      if (chunk.status === BLOCKED) {
        // The model has parsed, so the references can be followed into it.
        const handler = response._handlers.get(chunk);
        if (handler !== undefined) {
          fulfillListenersFromModel(response, resolveListeners, handler);
          flushCycleChecks(response);
        }
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
  // times in the payload. The cache is a response-scoped map keyed by the
  // metadata object rather than a field on it, so a client-supplied metadata
  // field can't inject a resolved value and bypass the manifest lookup below.
  const cachedPromise: SomeChunk<T> | void =
    response._serverReferenceCache.get(metaData);
  if (cachedPromise !== undefined) {
    return readServerReference(
      response,
      cachedPromise,
      parentObject,
      key,
    ) as any;
  }

  // This is the first call for this server reference metadata. Create a cached
  // promise to be used for subsequent calls.
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const blockedPromise: BlockedChunk<T> = new ReactPromise(BLOCKED, null, null);
  response._serverReferenceCache.set(metaData, blockedPromise);

  const serverReference: ServerReference<T> =
    resolveServerReference<$FlowFixMe>(response._bundlerConfig, id);
  const bound = metaData.bound;
  // Bound arguments that are one of our own chunks are read when that chunk
  // has initialized. Anything else could be a foreign thenable whose `then`
  // we must not call.
  const boundChunk: null | SomeChunk<any> =
    bound instanceof ReactPromise ? (bound as any) : null;

  function bindServerReference(args: any): any {
    let value = requireServerReference(response, serverReference) as any;
    if (bound) {
      const boundArgs: Array<any> = isArray(args) ? args.slice(0) : [];
      if (boundArgs.length > MAX_BOUND_ARGS) {
        throw new Error(
          'Server Function has too many bound arguments. Received ' +
            boundArgs.length +
            ' but the limit is ' +
            MAX_BOUND_ARGS +
            '.',
        );
      }
      boundArgs.unshift(null); // this
      value = value.bind.apply(value, boundArgs);
    }
    return value;
  }

  // We expect most servers to not really need this because you'd just have all
  // the relevant modules already loaded but it allows for lazy loading of code
  // if needed.
  const preloading: null | Thenable<any> = preloadModule(serverReference);
  if (boundChunk === null) {
    // The function's chunk initializes once the module has loaded, like a
    // module chunk.
    if (!preloading) {
      try {
        resolveServerReferenceChunk(
          response,
          blockedPromise,
          bindServerReference(null),
        );
      } catch (error) {
        triggerErrorOnChunk(response, blockedPromise, error);
      }
    } else {
      preloading.then(
        () => {
          let value;
          try {
            value = bindServerReference(null);
          } catch (error) {
            triggerErrorOnChunk(response, blockedPromise, error);
            return;
          }
          resolveServerReferenceChunk(response, blockedPromise, value);
        },
        error => {
          triggerErrorOnChunk(response, blockedPromise, error);
        },
      );
    }
    return readServerReference(
      response,
      blockedPromise,
      parentObject,
      key,
    ) as any;
  }

  // The bound arguments are waited for like any reference into their chunk,
  // so that the arguments chunk and the model holding the function wait for
  // each other the way two models do, rather than through a Promise that no
  // model can see. The function's chunk is the model the reference fills.
  // While the module loads, the handler waits for it too and it is one more
  // input the function is constructed from.
  function bindBoundServerReference(_response: Response, args: any): any {
    return bindServerReference(args);
  }
  const chunk: SomeChunk<any> = boundChunk;
  if (chunk.status === RESOLVED_MODEL) {
    initializeModelChunk(chunk);
  }
  const handler = createInitializationHandler(1);
  blockedOn(response, handler, blockedPromise);
  const reference = createInitializationReference(
    response,
    handler,
    chunk,
    {'': null},
    '',
    null,
    bindBoundServerReference,
    EMPTY_REFERENCE_PATH,
  );
  if (preloading) {
    const moduleChunk = createModuleChunk(response, preloading);
    reference.pendingInputs++;
    // Added directly to the listeners to run synchronously, and before the
    // handler's own wait on the chunk, so that the function is constructed
    // before the handler is released.
    const onModuleLoaded = () => {
      if (--reference.pendingInputs === 0 && reference.input !== null) {
        try {
          installReference(
            response,
            reference,
            mapReference(response, reference),
          );
        } catch (error) {
          rejectReference(response, handler, error);
        }
      }
    };
    if (moduleChunk.value === null) {
      moduleChunk.value = [onModuleLoaded];
    } else {
      moduleChunk.value.push(onModuleLoaded);
    }
    waitForChunk(response, handler, moduleChunk);
  }
  switch (chunk.status) {
    case INITIALIZED:
      releaseReference(response, reference, chunk);
      break;
    case ERRORED:
      rejectReference(response, handler, chunk.reason);
      break;
    case BLOCKED:
    case PENDING:
      addReferenceListener(chunk, reference);
      fulfillReferenceIfParsed(response, reference);
      break;
  }
  if ((blockedPromise as SomeChunk<any>).status === BLOCKED) {
    // References to the function made while the arguments parsed, from
    // models nested in that parse, can be followed now. The function's chunk
    // then waits like a parsed model whose references are outstanding: the
    // arguments can wait for the model that holds the function.
    const listeners = blockedPromise.value;
    if (listeners !== null) {
      fulfillListenersFromModel(response, listeners, handler);
    }
    if (handler.deps > 0) {
      queueCycleCheck(response, handler);
    }
  }
  return readServerReference(
    response,
    blockedPromise,
    parentObject,
    key,
  ) as any;
}

function requireServerReference<T>(
  response: Response,
  reference: ServerReference<T>,
): T {
  const value = requireModule(reference);
  if (
    typeof value === 'object' &&
    // $FlowFixMe[invalid-compare] Module exports can be null at runtime.
    value !== null
  ) {
    // A manifest export can be a fresh, untagged object. Remember its origin
    // so reply property paths cannot read it as if it came from the client.
    let serverReferenceObjects = response._serverReferenceObjects;
    if (serverReferenceObjects === null) {
      serverReferenceObjects = response._serverReferenceObjects = new WeakSet();
    }
    serverReferenceObjects.add(value);
  }
  return value;
}

function resolveServerReferenceChunk<T>(
  response: Response,
  chunk: BlockedChunk<T>,
  value: T,
): void {
  initializeBlockedChunk(response, chunk, value, null);
}

function readServerReference<T>(
  response: Response,
  chunk: SomeChunk<T>,
  parentObject: Object,
  key: string,
): T {
  switch (chunk.status) {
    case INITIALIZED:
      return chunk.value;
    case BLOCKED:
      return waitForReference(
        response,
        chunk,
        parentObject,
        key,
        null,
        createModel,
        EMPTY_REFERENCE_PATH,
      );
    default:
      throw chunk.reason;
  }
}

function loadServerObjectReference(
  response: Response,
  metaData: {id: any},
  parentObject: Object,
  key: string,
): mixed {
  const id: ServerReferenceId = metaData.id;
  if (typeof id !== 'string') {
    return null;
  }

  // Object references are cached in a separate response-scoped map from
  // function references. The same metadata object can be referenced both ways,
  // and each path must read only its own cache so it always applies its own
  // validation instead of the other's cached value.
  const cachedPromise: SomeChunk<Object> | void =
    response._serverObjectReferenceCache.get(metaData);
  if (cachedPromise !== undefined) {
    return readServerReference(response, cachedPromise, parentObject, key);
  }

  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  const blockedPromise: BlockedChunk<Object> = new ReactPromise(
    BLOCKED,
    null,
    null,
  );
  response._serverObjectReferenceCache.set(metaData, blockedPromise);

  const serverReference = resolveServerReference<$FlowFixMe>(
    response._bundlerConfig,
    id,
  );
  const serverReferencePromise = preloadModule(serverReference);

  function fulfill(): void {
    let value;
    try {
      value = requireServerReference(response, serverReference);
      // Objects can appear under "then", but a function here would turn
      // the containing object into a thenable during reply decoding.
      if (typeof value !== 'object' || value === null) {
        throw new Error(
          'Expected a Server Reference to an object to resolve to an object.',
        );
      }
    } catch (error) {
      triggerErrorOnChunk(response, blockedPromise, error);
      return;
    }
    resolveServerReferenceChunk(response, blockedPromise, value);
  }
  if (serverReferencePromise === null) {
    fulfill();
  } else {
    serverReferencePromise.then(fulfill, error => {
      triggerErrorOnChunk(response, blockedPromise, error);
    });
  }
  return readServerReference(response, blockedPromise, parentObject, key);
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
  // The slot the reference fills. Null for a reference that fills nothing and
  // only makes the handler wait for a chunk.
  parentObject: null | Object,
  key: string,
  map: (
    response: Response,
    model: any,
    parentObject: Object,
    key: string,
  ) => any,
  path: Array<string>,
  arrayRoot: null | NestedArrayContext,
  // The chunk the reference is queued on. The handler waits for it to
  // initialize, and fails if it fails.
  chunk: SomeChunk<any>,
  // The collection reserved for the chunk this reference waits for, when it
  // constructs a Set or Map. It already sits in the slot; the entries are
  // copied in once they hold their values.
  collection: null | Set<any> | Map<any, any>,
  // Whether the chunk has initialized and the handler no longer counts the
  // reference as outstanding.
  released: boolean,
  // Whether the slot holds its final value. That is known as soon as the
  // referenced model has parsed and the path can be followed to the end,
  // usually before the chunk initializes. Until then, `pathIndex` is where
  // in `path` to continue from, and `listeners` are the references whose own
  // paths lead through this slot and continue once it is filled.
  fulfilled: boolean,
  pathIndex: number,
  listeners: null | Array<InitializationReference>,
  // For a constructor, the value the path led to, while the slots of it that
  // the constructor reads are still being filled, and how many objects it
  // waits for.
  input: any,
  pendingInputs: number,
};
type InitializationHandler = {
  chunk: null | BlockedChunk<any>,
  value: any,
  // TODO: Split type to make it impossible to treat a thrown value as NestedArrayContext.
  // thrown value if errored, otherwise array context
  reason: mixed | NestedArrayContext,
  // Work outstanding before the chunk can initialize: the references that are
  // not done, and other waits like a module loading.
  deps: number,
  references: null | Array<InitializationReference>,
  outstanding: number,
  // The handlers this one waits on that wait on it in turn, once a check for
  // them has run. Null until then.
  cycle: null | BlockedCycle,
  errored: boolean,
};
// Handlers whose chunks wait on each other, directly or through other
// handlers. A check that finds two cycles waiting on each other merges them,
// and the one merged in points at the other through `merged`.
type BlockedCycle = {
  merged: null | BlockedCycle,
  size: number,
  handlers: Array<InitializationHandler>,
  // The references still to be checked, and the one being waited for.
  unchecked: Array<InitializationReference>,
  waitingFor: null | InitializationReference,
  checkQueued: boolean,
  // The cycle's node in the forest of waits. See checkBlockedCycle.
  pathParent: null | BlockedCycle,
  pathLeft: null | BlockedCycle,
  pathRight: null | BlockedCycle,
};

const EMPTY_REFERENCE_PATH: Array<string> = [];

function createInitializationHandler(deps: number): InitializationHandler {
  return {
    chunk: null,
    value: null,
    reason: null,
    deps,
    references: null,
    outstanding: 0,
    cycle: null,
    errored: false,
  };
}

function createErroredInitializationHandler(
  reason: mixed,
): InitializationHandler {
  return {
    chunk: null,
    value: null,
    reason,
    deps: 0,
    references: null,
    outstanding: 0,
    cycle: null,
    errored: true,
  };
}
let initializingHandler: null | InitializationHandler = null;

function initializeModelChunk<T>(chunk: ResolvedModelChunk<T>): void {
  const prevHandler = initializingHandler;
  initializingHandler = null;

  const {[RESPONSE_SYMBOL]: response, id} = chunk.reason;

  const rootReferenceId = id === -1 ? undefined : id.toString(16);

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
      rootReferenceId,
      arrayRoot,
    );

    const handler = initializingHandler;
    if (handler !== null) {
      if (handler.errored) {
        // The handler errored during the parse, so `cyclicChunk` errors with
        // the same reason. `triggerErrorOnChunk` also rejects the references
        // that nested parses queued on `cyclicChunk` during the parse. No
        // value will arrive for them.
        triggerErrorOnChunk(response, cyclicChunk, handler.reason);
        return;
      }
      handler.value = value;
      handler.reason = arrayRoot;
      blockedOn(response, handler, cyclicChunk);
      // References into this model made while it parsed, from models parsed
      // nested inside this parse, can be followed now. They stay queued on
      // `cyclicChunk` until it initializes.
      const listeners = cyclicChunk.value;
      if (listeners !== null) {
        fulfillListenersFromModel(response, listeners, handler);
      }
      if ((cyclicChunk as any).status !== BLOCKED) {
        // Following one of them failed and errored this chunk.
        return;
      }
      if (handler.deps > 0) {
        // The model references chunks that have not resolved yet.
        // `cyclicChunk` stays BLOCKED until the last of them does, or until
        // the chunks waiting on each other are found to be a closed set.
        queueCycleCheck(response, handler);
        return;
      }
    }
    initializeBlockedChunk(response, cyclicChunk, value, arrayRoot);
  } catch (error) {
    const erroredChunk: ErroredChunk<T> = chunk as any;
    erroredChunk.status = ERRORED;
    erroredChunk.reason = error;
  } finally {
    if (prevHandler === null) {
      // The outermost parse has ended.
      flushCycleChecks(response);
    }
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
    const backingEntry = getBackingString(response._formData, key);
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

function createBlockedChunk<T>(response: Response): BlockedChunk<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ReactPromise(BLOCKED, null, null);
}

// A chunk that initializes, with no value, once the module has loaded, or
// errors if the load fails.
function createModuleChunk(
  response: Response,
  loading: Thenable<any>,
): BlockedChunk<any> {
  const chunk: BlockedChunk<any> = createBlockedChunk(response);
  loading.then(
    () => initializeBlockedChunk(response, chunk, null, null),
    error => triggerErrorOnChunk(response, chunk, error),
  );
  return chunk;
}

function initializeBlockedChunk<T>(
  response: Response,
  chunk: BlockedChunk<T>,
  value: T,
  reason: InitializedChunk<T>['reason'],
): void {
  const resolveListeners = markChunkInitialized(response, chunk, value, reason);
  if (resolveListeners !== null) {
    wakeChunk(response, resolveListeners, value, chunk as any);
  }
}

// Moves a blocked chunk to INITIALIZED and returns the listeners that were
// waiting on it, for the caller to wake. A set of chunks that completes
// together is marked in full before any of its listeners wakes, so that
// none of them finds a chunk of the set still blocked.
function markChunkInitialized<T>(
  response: Response,
  chunk: BlockedChunk<T>,
  value: T,
  reason: InitializedChunk<T>['reason'],
): null | Array<InitializationReference | (T => mixed)> {
  const resolveListeners = chunk.value;
  const initializedChunk: InitializedChunk<T> = chunk as any;
  initializedChunk.status = INITIALIZED;
  initializedChunk.value = value;
  initializedChunk.reason = reason;
  return resolveListeners;
}

// Initializes the handler's chunk once the handler has no references left to
// wait on. `handler.chunk` is null while the handler's model is still parsing.
// `initializeModelChunk` handles that case when the parse ends.
function initializeChunkIfUnblocked(
  response: Response,
  handler: InitializationHandler,
): void {
  if (handler.deps !== 0 || handler.errored) {
    return;
  }
  const chunk = handler.chunk;
  if (chunk === null) {
    return;
  }
  // `BlockedChunk` is the chunk's type at the time the handler recorded it.
  // The chunk can have errored since, or a cyclic reference can have completed
  // it, so its status is read again here.
  if ((chunk as SomeChunk<any>).status !== BLOCKED) {
    return;
  }
  releaseHandler(response, handler);
  initializeBlockedChunk(
    response,
    chunk,
    handler.value,
    // $FlowFixMe[incompatible-type] Assuming handler.errored is false.
    handler.reason,
  );
}

// The chunk a reference waits on has initialized. The reference's handler has
// one less thing to wait for. The slot usually holds its value already; if
// not, it is filled from the chunk's value now.
function releaseReference(
  response: Response,
  reference: InitializationReference,
  chunk: InitializedChunk<any>,
): void {
  if (reference.released) {
    return;
  }
  response._fulfillingReferences++;
  const handler = reference.handler;
  reference.released = true;
  handler.outstanding--;
  if (!reference.fulfilled) {
    if (reference.parentObject === null) {
      installReference(response, reference, chunk.value);
    } else if (reference.pathIndex === 0) {
      fulfillReference(response, reference, chunk.value, 1, chunk.reason);
    }
  }
  handler.deps--;
  if (handler.deps === 0) {
    initializeChunkIfUnblocked(response, handler);
  } else {
    const cycle = handler.cycle;
    if (cycle !== null && getBlockedCycle(handler).waitingFor === reference) {
      queueCycleCheck(response, handler);
    }
  }
  response._fulfillingReferences--;
}

// Follows the references queued on a chunk into its model, which has parsed.
function fulfillListenersFromModel(
  response: Response,
  listeners: Array<InitializationReference | (any => mixed)>,
  handler: InitializationHandler,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (typeof listener !== 'function' && !listener.fulfilled) {
      fulfillReferenceFromModel(response, listener, handler);
    }
  }
}

// Begins following the reference's path, if the referenced model has parsed.
// Otherwise it is followed when the parse ends, or when the chunk initializes.
function fulfillReferenceIfParsed(
  response: Response,
  reference: InitializationReference,
): void {
  const chunk = reference.chunk;
  switch (chunk.status) {
    case INITIALIZED:
      fulfillReference(response, reference, chunk.value, 1, chunk.reason);
      break;
    case BLOCKED: {
      const target = response._handlers.get(chunk);
      if (target !== undefined) {
        fulfillReferenceFromModel(response, reference, target);
      }
      break;
    }
  }
}

// Follows the reference's path into a model that has parsed, from its root. A
// reference that fills no slot lets the references waiting on it continue
// into the value instead.
function fulfillReferenceFromModel(
  response: Response,
  reference: InitializationReference,
  target: InitializationHandler,
): void {
  const value = target.value;
  if (value === null) {
    // The model's root is itself a reference that is not filled yet.
    const root = rootReference(target);
    if (root === null) {
      return;
    }
    if (reference.parentObject === null) {
      const waiters = reference.listeners;
      if (waiters !== null) {
        reference.listeners = null;
        for (let i = 0; i < waiters.length; i++) {
          addSlotListener(root, waiters[i]);
        }
      }
      reference.fulfilled = true;
    } else {
      reference.pathIndex = 1;
      addSlotListener(root, reference);
    }
    return;
  }
  if (reference.parentObject === null) {
    installReference(response, reference, value);
  } else {
    fulfillReference(
      response,
      reference,
      value,
      1,
      // $FlowFixMe[incompatible-type] A handler in `_handlers` has not errored.
      target.reason,
    );
  }
}

function rootReference(
  handler: InitializationHandler,
): null | InitializationReference {
  const references = handler.references;
  if (references !== null) {
    for (let i = 0; i < references.length; i++) {
      const reference = references[i];
      if (
        reference.key === '' &&
        reference.parentObject !== null &&
        !reference.fulfilled
      ) {
        return reference;
      }
    }
  }
  return null;
}

function addSlotListener(
  slot: InitializationReference,
  reference: InitializationReference,
): void {
  if (slot.listeners === null) {
    slot.listeners = [reference];
  } else {
    slot.listeners.push(reference);
  }
}

// Follows the reference's path from `value`, the value at `path[cursor - 1]`,
// and fills the slot with what it leads to. The objects on the way are
// parsed, but a slot on the way can be a placeholder for a reference that is
// not filled yet, and then this one waits for that slot and continues from
// it. `arrayRoot` is the array context `value` was revived in, for the array
// size limit; the arrays of the selected value count against the model that
// referenced it.
function fulfillReference(
  response: Response,
  reference: InitializationReference,
  value: any,
  index: number,
  arrayRoot: null | NestedArrayContext,
): void {
  const handler = reference.handler;
  const path = reference.path;
  response._fulfillingReferences++;
  try {
    let localLength: number = 0;
    const rootArrayContexts = response._rootArrayContexts;
    const serverReferenceObjects = response._serverReferenceObjects;
    for (let i = index; i < path.length; i++) {
      const name = path[i];
      if (
        typeof value === 'object' &&
        value !== null &&
        (serverReferenceObjects === null ||
          !serverReferenceObjects.has(value)) &&
        (getPrototypeOf(value) === ObjectPrototype ||
          getPrototypeOf(value) === ArrayPrototype) &&
        hasOwnProperty.call(value, name)
      ) {
        const slot = value[name];
        if (slot === null) {
          const slots = response._pendingSlots.get(value);
          const pending = slots === undefined ? undefined : slots.get(name);
          if (pending !== undefined) {
            reference.pathIndex = i + 1;
            addSlotListener(pending, reference);
            return;
          }
        }
        value = slot;
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

    if (reference.map !== createModel) {
      // A constructor reads the slots of its input, which must be filled.
      reference.input = value;
      if (!waitForInputSlots(response, reference, value)) {
        return;
      }
      value = mapReference(response, reference);
    }
    installReference(response, reference, value);
  } catch (error) {
    rejectReference(response, handler, error);
  } finally {
    response._fulfillingReferences--;
  }
}

// Makes the handler wait for a chunk, like a reference into that chunk, and
// fail if it fails.
function waitForChunk(
  response: Response,
  handler: InitializationHandler,
  chunk: BlockedChunk<any> | PendingChunk<any>,
): InitializationReference {
  const wait = createInitializationReference(
    response,
    handler,
    chunk,
    null,
    '',
    null,
    createModel,
    EMPTY_REFERENCE_PATH,
  );
  handler.deps++;
  addReferenceListener(chunk, wait);
  return wait;
}

// Registers the constructor on each object whose slots it reads that still
// has a slot to be filled. Returns whether there is none.
function waitForInputSlots(
  response: Response,
  reference: InitializationReference,
  input: any,
): boolean {
  if (typeof input !== 'object' || input === null) {
    return true;
  }
  waitForObjectSlots(response, reference, input);
  if (reference.map === createMap && isArray(input)) {
    // Each entry is a pair whose key and value are read too.
    for (let i = 0; i < input.length; i++) {
      const entry = input[i];
      if (typeof entry === 'object' && entry !== null) {
        waitForObjectSlots(response, reference, entry);
      }
    }
  }
  return reference.pendingInputs === 0;
}

function waitForObjectSlots(
  response: Response,
  reference: InitializationReference,
  object: Object,
): void {
  if (!response._pendingSlots.has(object)) {
    return;
  }
  reference.pendingInputs++;
  const gates = response._pendingConstructors.get(object);
  if (gates === undefined) {
    response._pendingConstructors.set(object, [reference]);
  } else {
    gates.push(reference);
  }
}

function mapReference(
  response: Response,
  reference: InitializationReference,
): any {
  const input = reference.input;
  reference.input = null;
  const collection = reference.collection;
  if (collection !== null) {
    return fillReservedCollection(response, collection, input);
  }
  return reference.map(
    response,
    input,
    reference.parentObject as any,
    reference.key,
  );
}

// Writes the value into the slot the reference fills. The slot is final from
// here on: the references whose paths lead through it continue, and a
// constructor that reads the object it is in runs once the object has no
// other slot to be filled.
function installReference(
  response: Response,
  reference: InitializationReference,
  value: any,
): void {
  const {handler, parentObject, key} = reference;
  reference.fulfilled = true;
  if (parentObject !== null) {
    if (key !== __PROTO__) {
      parentObject[key] = value;
    }

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = value;
    }
    markSlotFilled(response, parentObject, key);
  }

  const waiters = reference.listeners;
  if (waiters !== null) {
    reference.listeners = null;
    for (let i = 0; i < waiters.length; i++) {
      const waiter = waiters[i];
      fulfillReference(
        response,
        waiter,
        value,
        waiter.pathIndex,
        isArray(value) ? response._rootArrayContexts.get(value) || null : null,
      );
    }
  }

  const cycle = handler.cycle;
  if (cycle !== null && getBlockedCycle(handler).waitingFor === reference) {
    queueCycleCheck(response, handler);
  }
}

// The slot is no longer a placeholder. Once the object has none left, the
// constructors that read it can run.
function markSlotFilled(response: Response, object: Object, key: string): void {
  const slots = response._pendingSlots.get(object);
  if (slots === undefined || !slots.delete(key) || slots.size > 0) {
    return;
  }
  response._pendingSlots.delete(object);
  const gates = response._pendingConstructors.get(object);
  if (gates === undefined) {
    return;
  }
  response._pendingConstructors.delete(object);
  for (let i = 0; i < gates.length; i++) {
    const reference = gates[i];
    if (--reference.pendingInputs === 0) {
      try {
        installReference(
          response,
          reference,
          mapReference(response, reference),
        );
      } catch (error) {
        rejectReference(response, reference.handler, error);
      }
    }
  }
}

// Handlers whose chunks wait on each other can never initialize one by one:
// each has a reference outstanding into another. They initialize together,
// once every reference out of the cycle has been released and every slot in
// it holds its value.
//
// A handler whose parse ended with references outstanding is checked: its
// references are examined one at a time, and the first that leads to a chunk
// that has not initialized is where it waits. When that chunk is a parsed
// model with references outstanding of its own, the chunk's handler waits
// somewhere too, and the references being waited for lead from handler to
// handler. If they lead back here, these handlers wait on each other and
// become one cycle, which goes on examining the references left; if not, the
// handler waits, and is checked again when the reference it waits for is
// released. A cycle with no reference left to wait for, and so one whose
// references all lead into itself, has nothing else to wait for and
// initializes.
//
// Each reference is examined once per cycle it is in. A cycle waits on one
// reference at a time, so the waits form a forest, kept as a link-cut tree.
// The cycle being checked has no wait while it is checked, so the waits from
// another cycle lead back to it exactly when it is the root of that cycle's
// tree. A wait that leads back is not recorded; the cycles merge instead, so
// the forest has no loops. A recorded wait can be stale until the cycle is
// checked again; at worst it leads to a cycle that has initialized, which is
// a root.
//
// A check runs once the work that queued it is done: a chunk has woken all
// its listeners, or a parse has ended. In the middle of that work a handler's
// counts are in flux.
function queueCycleCheck(
  response: Response,
  handler: InitializationHandler,
): void {
  const cycle = getBlockedCycle(handler);
  if (!cycle.checkQueued) {
    cycle.checkQueued = true;
    response._queuedCycleChecks.push(cycle);
  }
}

function flushCycleChecks(response: Response): void {
  if (response._flushingCycleChecks || response._fulfillingReferences > 0) {
    return;
  }
  response._flushingCycleChecks = true;
  const queued = response._queuedCycleChecks;
  // A check can queue more.
  for (let i = 0; i < queued.length; i++) {
    checkBlockedCycle(response, queued[i]);
  }
  queued.length = 0;
  response._flushingCycleChecks = false;
}

// The cycle the handler is in, which starts out as the handler alone. A
// handler is only given one once its parse has ended and its references are
// all listed.
function getBlockedCycle(handler: InitializationHandler): BlockedCycle {
  let cycle: BlockedCycle;
  if (handler.cycle === null) {
    cycle = handler.cycle = {
      merged: null,
      size: 1,
      handlers: [handler],
      unchecked: handler.references === null ? [] : handler.references.slice(),
      waitingFor: null,
      checkQueued: false,
      pathParent: null,
      pathLeft: null,
      pathRight: null,
    };
    return cycle;
  }
  cycle = handler.cycle;
  while (cycle.merged !== null) {
    cycle = cycle.merged;
  }
  handler.cycle = cycle;
  return cycle;
}

function checkBlockedCycle(response: Response, queued: BlockedCycle): void {
  queued.checkQueued = false;
  let cycle = queued;
  while (cycle.merged !== null) {
    cycle = cycle.merged;
  }
  // The wait recorded by the last check is re-examined with the rest.
  cutWait(cycle);
  cycle.waitingFor = null;
  const first = cycle.handlers[0];
  if (
    first.errored ||
    first.chunk === null ||
    (first.chunk as SomeChunk<any>).status !== BLOCKED
  ) {
    return;
  }
  let unchecked = cycle.unchecked;
  while (unchecked.length > 0) {
    const reference = unchecked[unchecked.length - 1];
    if (reference.released) {
      unchecked.pop();
      continue;
    }
    if (!reference.fulfilled) {
      // The slot is not filled yet. Checked again when it is.
      cycle.waitingFor = reference;
      return;
    }
    const chunk = reference.chunk;
    if (chunk.status !== BLOCKED) {
      // An entry still to arrive, or a chunk that has just completed or
      // failed and is about to release or reject this reference, which
      // checks again.
      cycle.waitingFor = reference;
      return;
    }
    const target = response._handlers.get(chunk);
    if (target === undefined) {
      // Still parsing, or a module that is loading.
      cycle.waitingFor = reference;
      return;
    }
    const other = getBlockedCycle(target);
    if (other === cycle) {
      unchecked.pop();
      continue;
    }
    if (findWaitRoot(other) !== cycle) {
      // The waits from `other` do not lead back here.
      cycle.waitingFor = reference;
      linkWait(cycle, other);
      return;
    }
    // They do: these handlers all wait on each other, and are one cycle from
    // here on. Every wait on the way is into a parsed, blocked chunk, since
    // that is when a wait is recorded.
    const chain: Array<BlockedCycle> = [];
    let largest = cycle;
    for (let current = other; current !== cycle; ) {
      chain.push(current);
      if (current.size > largest.size) {
        largest = current;
      }
      const waitingFor: InitializationReference = current.waitingFor as any;
      const next: InitializationHandler = response._handlers.get(
        waitingFor.chunk,
      ) as any;
      current = getBlockedCycle(next);
    }
    // The waits around the loop are cut before any member is linked to the
    // merged cycle, so that the forest never holds a loop.
    for (let i = 0; i < chain.length; i++) {
      cutWait(chain[i]);
    }
    if (largest !== cycle) {
      mergeBlockedCycles(largest, cycle);
      linkWait(cycle, largest);
    }
    for (let i = 0; i < chain.length; i++) {
      const member = chain[i];
      if (member !== largest) {
        mergeBlockedCycles(largest, member);
        linkWait(member, largest);
      }
    }
    largest.waitingFor = null;
    cycle = largest;
    unchecked = cycle.unchecked;
  }
  // Nothing left to wait for, unless a handler has work outstanding that is
  // not a reference, like a module that is loading. That work queues a check
  // when it ends.
  const handlers = cycle.handlers;
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    if (handler.deps > handler.outstanding) {
      return;
    }
  }
  initializeBlockedCycle(response, handlers);
}

// Link-cut tree over the cycles (Sleator and Tarjan). A cycle's parent is the
// cycle its wait leads into; a merged cycle's parent is the cycle it merged
// into. Each preferred path is a splay tree keyed by depth, and the root of a
// splay tree keeps the path's parent in `pathParent`. No evert and no path
// aggregates. Link, cut and finding the root are O(log n) amortized.
function isPathRoot(x: BlockedCycle): boolean {
  const parent = x.pathParent;
  return parent === null || (parent.pathLeft !== x && parent.pathRight !== x);
}

function rotatePath(x: BlockedCycle): void {
  const parent: BlockedCycle = x.pathParent as any;
  const grandparent = parent.pathParent;
  if (!isPathRoot(parent)) {
    const g: BlockedCycle = grandparent as any;
    if (g.pathLeft === parent) {
      g.pathLeft = x;
    } else {
      g.pathRight = x;
    }
  }
  x.pathParent = grandparent;
  if (parent.pathLeft === x) {
    parent.pathLeft = x.pathRight;
    if (x.pathRight !== null) {
      x.pathRight.pathParent = parent;
    }
    x.pathRight = parent;
  } else {
    parent.pathRight = x.pathLeft;
    if (x.pathLeft !== null) {
      x.pathLeft.pathParent = parent;
    }
    x.pathLeft = parent;
  }
  parent.pathParent = x;
}

function splayPath(x: BlockedCycle): void {
  while (!isPathRoot(x)) {
    const parent: BlockedCycle = x.pathParent as any;
    if (!isPathRoot(parent)) {
      const grandparent: BlockedCycle = parent.pathParent as any;
      if ((grandparent.pathLeft === parent) === (parent.pathLeft === x)) {
        rotatePath(parent);
      } else {
        rotatePath(x);
      }
    }
    rotatePath(x);
  }
}

// Makes the path from the root of x's tree to x one splay tree, with x at its
// top and nothing below x on it.
function accessPath(x: BlockedCycle): void {
  let last = null;
  for (let y: null | BlockedCycle = x; y !== null; y = y.pathParent) {
    splayPath(y);
    y.pathRight = last;
    last = y;
  }
  splayPath(x);
}

function findWaitRoot(x: BlockedCycle): BlockedCycle {
  accessPath(x);
  let root = x;
  while (root.pathLeft !== null) {
    root = root.pathLeft;
  }
  splayPath(root);
  return root;
}

// `child` is the root of its tree.
function linkWait(child: BlockedCycle, parent: BlockedCycle): void {
  accessPath(child);
  child.pathParent = parent;
}

function cutWait(child: BlockedCycle): void {
  accessPath(child);
  const above = child.pathLeft;
  if (above !== null) {
    above.pathParent = null;
    child.pathLeft = null;
  }
}

function mergeBlockedCycles(into: BlockedCycle, other: BlockedCycle): void {
  other.merged = into;
  into.size += other.size;
  const unchecked = into.unchecked;
  const otherUnchecked = other.unchecked;
  for (let i = 0; i < otherUnchecked.length; i++) {
    unchecked.push(otherUnchecked[i]);
  }
  other.unchecked = [];
  const handlers = into.handlers;
  const otherHandlers = other.handlers;
  for (let i = 0; i < otherHandlers.length; i++) {
    handlers.push(otherHandlers[i]);
  }
  other.handlers = [];
}

// Every chunk of the cycle is marked initialized before any listener wakes:
// a listener on one of them can read another through it.
function initializeBlockedCycle(
  response: Response,
  handlers: Array<InitializationHandler>,
): void {
  const initialized: Array<InitializedChunk<any>> = [];
  const listeners = [];
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    const chunk = handler.chunk;
    if (
      handler.errored ||
      chunk === null ||
      (chunk as SomeChunk<any>).status !== BLOCKED
    ) {
      continue;
    }
    releaseHandler(response, handler);
    initialized.push(chunk as any);
    listeners.push(
      markChunkInitialized(
        response,
        chunk,
        handler.value,
        // $FlowFixMe[incompatible-type] Assuming handler.errored is false.
        handler.reason,
      ),
    );
  }
  for (let i = 0; i < initialized.length; i++) {
    const resolveListeners = listeners[i];
    if (resolveListeners !== null) {
      const chunk = initialized[i];
      wakeChunk(response, resolveListeners, chunk.value, chunk);
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
  releaseHandler(response, handler);
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
  const reference = createInitializationReference(
    response,
    addDependency(),
    referencedChunk,
    parentObject,
    key,
    arrayRoot,
    map,
    path,
  );
  addReferenceListener(referencedChunk, reference);

  if ((map as any) === createSet || (map as any) === createMap) {
    // The collection exists before its entries do, so that a reference to it
    // from inside the entries, or from anywhere else before they arrive, is
    // to the final object.
    let collection = response._reservedCollections.get(referencedChunk);
    if (collection === undefined) {
      collection = (map as any) === createSet ? new Set() : new Map();
      response._reservedCollections.set(referencedChunk, collection);
    } else if ((map as any) === createSet && !(collection instanceof Set)) {
      throw new Error('Invalid Set initializer.');
    } else if ((map as any) === createMap && !(collection instanceof Map)) {
      throw new Error('Invalid Map initializer.');
    }
    reference.collection = collection;
    // The slot holds the collection already; only the entries are to come.
    markSlotFilled(response, parentObject, key);
    fulfillReferenceIfParsed(response, reference);
    return collection as any;
  }

  fulfillReferenceIfParsed(response, reference);
  if (reference.fulfilled && key !== __PROTO__) {
    return parentObject[key];
  }
  // Return a place holder value for now.
  return null as any;
}

// Records which chunk the handler initializes once its work is done, where
// anything that walks what the chunks wait for can find it.
function blockedOn(
  response: Response,
  handler: InitializationHandler,
  chunk: BlockedChunk<any>,
): void {
  handler.chunk = chunk;
  response._handlers.set(chunk, handler);
}

// The chunk no longer waits for references.
function releaseHandler(
  response: Response,
  handler: InitializationHandler,
): void {
  const chunk = handler.chunk;
  if (chunk !== null) {
    response._handlers.delete(chunk);
  }
  handler.references = null;
}

// Counts one more outstanding dependency against the handler of the model
// being initialized, creating the handler if the model has none yet.
function addDependency(): InitializationHandler {
  let handler: InitializationHandler;
  if (initializingHandler) {
    handler = initializingHandler;
    handler.deps++;
  } else {
    handler = initializingHandler = createInitializationHandler(1);
  }
  return handler;
}

// Creates a reference that fills `parentObject[key]` once it resolves. It is
// one of the handler's dependencies.
function createInitializationReference<T>(
  response: Response,
  handler: InitializationHandler,
  chunk: SomeChunk<any>,
  parentObject: null | Object,
  key: string,
  arrayRoot: null | NestedArrayContext,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
  path: Array<string>,
): InitializationReference {
  const reference: InitializationReference = {
    handler,
    parentObject,
    key,
    map,
    path,
    arrayRoot,
    chunk,
    collection: null,
    released: false,
    fulfilled: false,
    pathIndex: 0,
    listeners: null,
    input: null,
    pendingInputs: 0,
  };
  if (handler.references === null) {
    handler.references = [reference];
  } else {
    handler.references.push(reference);
  }
  handler.outstanding++;
  if (handler.cycle !== null) {
    // The handler's references are being checked already; this one joins
    // the ones left to check.
    getBlockedCycle(handler).unchecked.push(reference);
  }
  if (parentObject !== null) {
    let slots = response._pendingSlots.get(parentObject);
    if (slots === undefined) {
      slots = new Map();
      response._pendingSlots.set(parentObject, slots);
    }
    slots.set(key, reference);
  }
  return reference;
}

// Queues the reference on a chunk that has not initialized yet. It is fulfilled
// or rejected with the chunk.
function addReferenceListener(
  chunk: PendingChunk<any> | BlockedChunk<any>,
  reference: InitializationReference,
): void {
  reference.chunk = chunk;
  if (chunk.value === null) {
    chunk.value = [reference];
  } else {
    chunk.value.push(reference);
  }
  if (chunk.reason === null) {
    chunk.reason = [reference];
  } else {
    chunk.reason.push(reference);
  }
}

function getOutlinedModel<T>(
  response: Response,
  reference: string,
  parentObject: Object,
  key: string,
  referenceArrayRoot: null | NestedArrayContext,
  map: (response: Response, model: any, parentObject: Object, key: string) => T,
): T {
  // parseInt stops at the ':' so we only need to split when there's a path.
  const id = parseInt(reference, 16);
  const path =
    reference.indexOf(':') === -1 ? EMPTY_REFERENCE_PATH : reference.split(':');
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
      const serverReferenceObjects = response._serverReferenceObjects;
      for (let i = 1; i < path.length; i++) {
        const name = path[i];
        if (
          typeof value === 'object' &&
          // $FlowFixMe[invalid-compare] This check is still needed at runtime.
          value !== null &&
          (serverReferenceObjects === null ||
            !serverReferenceObjects.has(value)) &&
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
      let chunkValue;
      const reservedCollection =
        path.length === 0 &&
        ((map as any) === createSet || (map as any) === createMap)
          ? response._reservedCollections.get(chunk)
          : undefined;
      if (reservedCollection !== undefined) {
        chunkValue = fillReservedCollection(
          response,
          reservedCollection,
          value as any,
        ) as any;
      } else {
        chunkValue = map(response, value, parentObject, key);
      }

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
        initializingHandler = createErroredInitializationHandler(chunk.reason);
      }
      // Placeholder
      return null as any;
  }
}

function isServerReferenceObject(response: Response, value: mixed): boolean {
  // A Server Reference to an object is opaque: the client may only pass it
  // back to the server, never have its contents read out. The consuming
  // decoders below (Map, Set, iterator) read their initializer array directly,
  // without traversing a property path, so the opacity guard in the path
  // walkers doesn't cover them. They reject a server-owned array up front,
  // before consuming or mutating it, by checking this alongside `isArray`.
  const serverReferenceObjects = response._serverReferenceObjects;
  return (
    serverReferenceObjects !== null &&
    typeof value === 'object' &&
    value !== null &&
    serverReferenceObjects.has(value)
  );
}

function createMap(
  response: Response,
  model: Array<[any, any]>,
): Map<any, any> {
  return fillReservedCollection(response, new Map(), model) as any;
}

function createSet(response: Response, model: Array<any>): Set<any> {
  return fillReservedCollection(response, new Set(), model) as any;
}

// Copies the entries into the collection built from them. An initializer is
// read by one collection only; every reference to the collection copies the
// entries in, and after the first the copies find them there already.
function fillReservedCollection(
  response: Response,
  collection: Set<any> | Map<any, any>,
  model: Array<any>,
): Set<any> | Map<any, any> {
  if (!isArray(model) || isServerReferenceObject(response, model)) {
    if (collection instanceof Set) {
      throw new Error('Invalid Set initializer.');
    }
    throw new Error('Invalid Map initializer.');
  }
  const consumedBy = (model as any).$$consumed;
  if (consumedBy !== undefined) {
    if (consumedBy === collection) {
      return collection;
    }
    if (collection instanceof Set) {
      throw new Error('Already initialized Set.');
    }
    throw new Error('Already initialized Map.');
  }
  // This needs to come first to prevent the model from being consumed again in case of a cyclic reference.
  (model as any).$$consumed = collection;
  if (collection instanceof Set) {
    for (let i = 0; i < model.length; i++) {
      collection.add(model[i]);
    }
  } else {
    for (let i = 0; i < model.length; i++) {
      collection.set(model[i][0], model[i][1]);
    }
  }
  return collection;
}

function extractIterator(response: Response, model: Array<any>): Iterator<any> {
  if (!isArray(model) || isServerReferenceObject(response, model)) {
    throw new Error('Invalid Iterator initializer.');
  }
  if ((model as any).$$consumed !== undefined) {
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
): T {
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
  const backingEntry: Blob = getBackingBlob(response._formData, key) as any;

  const promise: Promise<ArrayBuffer> = backingEntry.arrayBuffer();

  // Since loading the buffer is an async operation we'll be blocking the parent
  // chunk. The buffer's bytes count against the array context of the model it
  // is read into.
  const chunk: BlockedChunk<T> = createBlockedChunk(response);
  promise.then(
    (buffer: ArrayBuffer) => {
      let typedArray: T;
      try {
        if (referenceArrayRoot !== null) {
          bumpArrayCount(referenceArrayRoot, buffer.byteLength, response);
        }
        typedArray =
          constructor === ArrayBuffer
            ? (buffer as any)
            : (new constructor(buffer) as any);
      } catch (error) {
        triggerErrorOnChunk(response, chunk, error);
        return;
      }
      initializeBlockedChunk(response, chunk, typedArray, null);
    },
    error => triggerErrorOnChunk(response, chunk, error),
  );
  return waitForReference(
    response,
    chunk,
    parentObject,
    parentKey,
    null,
    createModel,
    EMPTY_REFERENCE_PATH,
  );
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
  // Stream chunks are written under a dedicated namespace so they can be
  // told apart from one-shot chunks at append time.
  const key = prefix + 'S' + id;
  const existingEntries = getStreamChunks(response._formData, key);
  if (existingEntries === undefined) {
    return;
  }
  for (let i = 0; i < existingEntries.length; i++) {
    const value = existingEntries[i];
    if (value[0] === 'C') {
      controller.close(value === 'C' ? '"$undefined"' : value.slice(1));
    } else {
      controller.enqueueModel(value);
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
  let canceled = false;
  const stream = new ReadableStream({
    type: type,
    start(c) {
      controller = c;
    },
    cancel() {
      // The consumer is done with the stream. Entries that are still arriving
      // for it are dropped.
      canceled = true;
      closed = true;
    },
  });
  let previousBlockedChunk: SomeChunk<T> | null = null;
  function enqueue(value: T): void {
    if (canceled) {
      return;
    }
    if (type === 'bytes' && !ArrayBuffer.isView(value)) {
      flightController.error(new Error('Invalid data for bytes stream.'));
      return;
    }
    controller.enqueue(value);
  }
  function fail(error: mixed): void {
    if (!canceled) {
      // $FlowFixMe[incompatible-type]
      controller.error(error);
    }
  }
  function closeStream(): void {
    if (canceled) {
      return;
    }
    controller.close();
    // Closing a byte stream leaves a BYOB read that is already waiting
    // pending. Only responding to its request settles it.
    // $FlowFixMe[prop-missing]
    const byobRequest = type === 'bytes' ? controller.byobRequest : null;
    if (byobRequest != null) {
      byobRequest.respond(0);
    }
  }
  const flightController = {
    enqueueModel(json: string): void {
      if (canceled) {
        return;
      }
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
          chunk.then(enqueue, fail);
          previousBlockedChunk = chunk;
        }
      } else {
        // We're still waiting on a previous chunk so we can't enqueue quite yet.
        const blockedChunk = previousBlockedChunk;
        const chunk: SomeChunk<T> = createPendingChunk(response);
        chunk.then(v => {
          if (previousBlockedChunk === chunk) {
            // We were still the last chunk so we can now clear the queue and return
            // to synchronous emitting.
            previousBlockedChunk = null;
          }
          enqueue(v);
        }, fail);
        previousBlockedChunk = chunk;
        blockedChunk.then(function () {
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
        closeStream();
      } else {
        const blockedChunk = previousBlockedChunk;
        // We shouldn't get any more enqueues after this so we can set it back to null.
        previousBlockedChunk = null;
        blockedChunk.then(closeStream);
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
        blockedChunk.then(() => fail(error));
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
      case 'H': {
        if (enableFlightObjectReferences) {
          // Server Reference to an object. Its metadata carries only an id —
          // no bound arguments — and it resolves through the same manifest
          // lookup as a function reference, which returns the module export
          // without calling it.
          const ref = value.slice(2);
          return getOutlinedModel(
            response,
            ref,
            obj,
            key,
            null,
            loadServerObjectReference,
          );
        }
        return undefined;
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

        // Use the special marker from the Client to distinguish keys that should
        // be consumed by referenced FormData.
        const formPrefix =
          response._prefix + '_' + parseInt(stringId, 16) + '_';
        return consumeBackingEntries(response._formData, formPrefix);
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
        const backingEntry: Blob = getBackingBlob(
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
    _formData: createBackingFormData(backingFormData, formFieldPrefix),
    _chunks: chunks,
    _closed: false,
    _closedReason: null,
    _temporaryReferences: temporaryReferences,
    _serverReferenceObjects: null,
    _serverReferenceCache: new WeakMap(),
    _serverObjectReferenceCache: new WeakMap(),
    _rootArrayContexts: new WeakMap(),
    _arraySizeLimit: arraySizeLimit,
    _handlers: new WeakMap(),
    _reservedCollections: new WeakMap(),
    _pendingSlots: new WeakMap(),
    _pendingConstructors: new WeakMap(),
    _queuedCycleChecks: [],
    _flushingCycleChecks: false,
    _fulfillingReferences: 0,
  };
  return response;
}

export function resolveField(
  response: Response,
  key: string,
  value: string,
): void {
  const prefix = response._prefix;
  if (key.startsWith(prefix)) {
    const chunks = response._chunks;
    if (key[prefix.length] === 'S') {
      // Stream chunks live in a dedicated namespace so that they can be told
      // apart from one-shot chunks.
      if (key.length > prefix.length + 'S'.length) {
        const id = +key.slice(prefix.length + 'S'.length);
        const chunk = chunks.get(id);
        if (chunk) {
          // The stream was already referenced so we can enqueue right away.
          resolveModelChunk(response, chunk, value, id);
          return;
        }
      }
    } else {
      const id = +key.slice(prefix.length);
      const chunk = chunks.get(id);
      if (chunk) {
        // We were waiting on this key so now we can resolve it.
        resolveModelChunk(response, chunk, value, id);
        return;
      }
    }
  }
  // Add this field to the backing store.
  appendBackingEntry(response._formData, value, key);
}

export function resolveFile(response: Response, key: string, file: File): void {
  // Add this field to the backing store.
  appendBackingEntry(response._formData, file, key);
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

// Node.js before v20 doesn't expose a global File constructor, so fall back
// to a scratch single-entry FormData, whose append/get is O(1).
function createFileFromHandle(handle: FileHandle): File {
  if (typeof File === 'function') {
    return new File(handle.chunks, handle.filename, {type: handle.mime});
  }
  const scratch = new FormData();
  scratch.append(
    'file',
    new Blob(handle.chunks, {type: handle.mime}),
    handle.filename,
  );
  return scratch.get('file') as any;
}

export function resolveFileComplete(
  response: Response,
  key: string,
  handle: FileHandle,
): void {
  // Add this file to the backing store.
  appendBackingEntry(response._formData, createFileFromHandle(handle), key);
}

export function close(response: Response): void {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}
