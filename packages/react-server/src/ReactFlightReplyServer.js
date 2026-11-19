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
import {
  escapePathSegment,
  unescapePathSegment,
} from 'shared/ReactFlightReferencePath';
import type {WaitForestNode} from 'shared/ReactFlightWaitForest';
import {findWaitRoot, linkWait, cutWait} from 'shared/ReactFlightWaitForest';

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

type QueuedReference = {
  reference: InitializationReference,
  value: any,
  arrayRoot: null | NestedArrayContext,
  isConstructor: boolean,
};

// Null `chunk` means rejection, with the error in `value`.
type ChunkListeners = {
  listeners: Array<InitializationReference | (any => mixed)>,
  value: any,
  chunk: null | InitializedChunk<any>,
};

type QueuedCallbacks = {
  callbacks: Array<(any) => mixed>,
  value: any,
};

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
  _handlers: WeakMap<SomeChunk<any>, InitializationHandler>,
  // The chunks that are blocked on references, to reject the ones still
  // blocked when the reply ends.
  _blockedChunks: Set<SomeChunk<any>>,
  // Module loads, Blob reads and bound argument reads in progress. While this
  // is above zero a blocked chunk can still complete.
  _pendingReads: number,
  // The streams the decoder created. One still open when the reply ends is
  // errored.
  _openStreams: Set<FlightStreamController>,
  // Set while rejecting the chunks still blocked when the reply ends.
  _rejectingBlocked: boolean,
  _queuedReferences: null | Array<QueuedReference>,
  _continuingReferences: boolean,
  _queuedChunkListeners: null | Array<ChunkListeners>,
  _flushingChunkListeners: boolean,
  _queuedGroupChecks: Array<BlockedGroup>,
  _queuedCallbacks: Array<QueuedCallbacks>,
  _workDepth: number,
  _flushingGroupChecks: boolean,
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
  chunk: null | InitializedChunk<T>,
): void {
  if (response._flushingChunkListeners) {
    const queued = response._queuedChunkListeners;
    if (queued === null) {
      response._queuedChunkListeners = [{listeners, value, chunk}];
    } else {
      queued.push({listeners, value, chunk});
    }
    return;
  }
  response._flushingChunkListeners = true;
  response._workDepth++;
  let next = 0;
  try {
    for (;;) {
      let callbacks: null | Array<(any) => mixed> = null;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        if (typeof listener === 'function') {
          if (callbacks === null) {
            callbacks = [listener];
          } else {
            callbacks.push(listener);
          }
        } else if (chunk === null) {
          rejectReference(response, listener.handler, value);
        } else {
          releaseReference(response, listener, chunk);
        }
      }
      if (callbacks !== null) {
        response._queuedCallbacks.push({callbacks, value});
      }
      const queued = response._queuedChunkListeners;
      if (queued === null || next === queued.length) {
        break;
      }
      const notification = queued[next++];
      listeners = notification.listeners;
      value = notification.value;
      chunk = notification.chunk;
    }
  } finally {
    response._queuedChunkListeners = null;
    response._flushingChunkListeners = false;
    response._workDepth--;
  }
  flushGroupChecks(response);
}

function rejectChunk(
  response: Response,
  listeners: Array<InitializationReference | (mixed => mixed)>,
  error: mixed,
): void {
  wakeChunk(response, listeners, error, null);
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
    // Only a stream chunk takes more than one field. A repeated field for any
    // other chunk is an error.
    const maybeController: mixed = controller;
    if (
      maybeController === null ||
      typeof maybeController !== 'object' ||
      typeof (maybeController as any).enqueueModel !== 'function'
    ) {
      reportGlobalError(
        response,
        new Error('A reply field was provided more than once.'),
      );
      return;
    }
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
    // The listeners stay on the chunk during the parse. A group check can
    // initialize the chunk later, and has to find them there.
    initializeModelChunk(resolvedChunk, resolveListeners, rejectListeners);
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
    // Only one of our own chunks carries bound arguments. Anything else binds
    // nothing.
    if (boundChunk !== null) {
      if (isArray(args) && args.length > MAX_BOUND_ARGS) {
        throw new Error(
          'Server Function has too many bound arguments. Received ' +
            args.length +
            ' but the limit is ' +
            MAX_BOUND_ARGS +
            '.',
        );
      }
      const boundArgs: Array<any> = isArray(args) ? args.slice(0) : [];
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
      response._pendingReads++;
      preloading.then(
        () => {
          try {
            let value;
            try {
              value = bindServerReference(null);
            } catch (error) {
              triggerErrorOnChunk(response, blockedPromise, error);
              return;
            }
            resolveServerReferenceChunk(response, blockedPromise, value);
          } finally {
            finishPendingRead(response);
          }
        },
        error => {
          try {
            triggerErrorOnChunk(response, blockedPromise, error);
          } finally {
            finishPendingRead(response);
          }
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
  // so the arguments chunk and the model holding the function can wait on
  // each other like two models do. The function's chunk is the model the
  // reference fills.
  function bindBoundServerReference(_response: Response, args: any): any {
    return bindServerReference(args);
  }
  const chunk: SomeChunk<any> = boundChunk;
  const handler = createInitializationHandler(1);
  registerHandler(response, handler, blockedPromise);
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
  handler.root = reference;
  reference.inputLimit = MAX_BOUND_ARGS;
  if (preloading) {
    const moduleChunk = createModuleChunk(response, preloading);
    reference.moduleWait = waitForChunk(response, handler, moduleChunk);
  }
  // This handler is for the function itself. Check it like a model when its
  // parse ends.
  queueGroupCheck(response, handler);
  // The server sends the bound arguments as a Promise. Start reading them in
  // a microtask, as awaiting that Promise would, so that one bound function
  // does not parse another one's arguments in the middle of its own parse.
  // The reference above already exists, so a group check can see that the
  // function waits for its arguments.
  response._pendingReads++;
  Promise.resolve().then(() => {
    try {
      if (chunk.status === RESOLVED_MODEL) {
        initializeModelChunk(chunk);
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
    } catch (error) {
      rejectReference(response, handler, error);
    }
    // The read counts as in progress until here.
    finishPendingRead(response);
  });

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
    response._pendingReads++;
    serverReferencePromise.then(
      () => {
        try {
          fulfill();
        } finally {
          finishPendingRead(response);
        }
      },
      error => {
        try {
          triggerErrorOnChunk(response, blockedPromise, error);
        } finally {
          finishPendingRead(response);
        }
      },
    );
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
          pending: null,
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
            reference !== undefined
              ? reference + ':' + escapePathSegment(key)
              : undefined;
          // Undefined is a value too; keep its property.
          // $FlowFixMe[cannot-write]
          value[key] = reviveModel(
            response,
            value,
            key,
            value[key],
            childRef,
            null, // The array context resets when we're entering a non-array
          );
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
  // Arrays that this one refers to whose count was not final when the
  // reference was fulfilled. See settleArrayCount.
  pending: null | Array<NestedArrayContext>,
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

// Adds the counts that were left for later because the arrays they come from
// were not final yet. This runs when the handler's chunk is initialized. The
// chunks it refers to are initialized by then, or are initialized together
// with it, in which case their counts are settled first. Chunks that are
// initialized together can refer to each other in a cycle. An array that is
// reached again while its own count is being settled adds what it has so far,
// so each reference is counted once.
function settleArrayCounts(
  response: Response,
  handler: InitializationHandler,
): void {
  const references = handler.references;
  if (references === null) {
    return;
  }
  try {
    for (let i = 0; i < references.length; i++) {
      const arrayRoot = references[i].arrayRoot;
      if (arrayRoot !== null && arrayRoot.pending !== null) {
        settleArrayCount(response, arrayRoot);
      }
    }
  } catch (error) {
    rejectReference(response, handler, error);
  }
}

function settleArrayCount(
  response: Response,
  arrayContext: NestedArrayContext,
): void {
  // A loop with its own stack, so that a long chain of references does not
  // overflow the call stack.
  const stack: Array<{
    context: NestedArrayContext,
    list: Array<NestedArrayContext>,
    index: number,
  }> = [];
  let context = arrayContext;
  // $FlowFixMe[incompatible-type] The caller checked that it is not null.
  let list: Array<NestedArrayContext> = context.pending;
  let index = 0;
  context.pending = null;
  for (;;) {
    if (index === list.length) {
      const parent = stack.pop();
      if (parent === undefined) {
        return;
      }
      context = parent.context;
      list = parent.list;
      index = parent.index;
      continue;
    }
    const source = list[index];
    const sourcePending = source.pending;
    if (sourcePending !== null) {
      // Settle the source first, and then come back to this entry.
      stack.push({context, list, index});
      context = source;
      list = sourcePending;
      index = 0;
      source.pending = null;
      continue;
    }
    index++;
    if (source.fork) {
      context.fork = true;
    }
    bumpArrayCount(context, source.count, response);
  }
}

// Arrays use their saved context. Count scalar values after following the
// entire path, including when the path resumes at a slot that was pending.
function getArrayElementSize(value: any): number {
  if (typeof value === 'string') {
    return value.length;
  }
  if (typeof value === 'bigint') {
    // Avoid converting a large BigInt to a string. Infinity exceeds the limit.
    // eslint-disable-next-line react-internal/no-primitive-constructors
    const n = Math.abs(Number(value));
    return n === 0 ? 1 : Math.floor(Math.log10(n)) + 1;
  }
  if (ArrayBuffer.isView(value)) {
    return value.byteLength;
  }
  return 0;
}

// Until a reference is fulfilled, its slot holds the reference object itself.
// This tag tells it apart from a parsed value.
const UNFULFILLED_REFERENCE_TYPE: symbol = Symbol('react.flight.reference');
function isUnfulfilledReference(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === UNFULFILLED_REFERENCE_TYPE
  );
}

type InitializationReference = {
  $$typeof: symbol,
  handler: InitializationHandler,
  // The slot that the reference fills is `parentObject[key]`. `parentObject` is
  // null if the reference only waits for a chunk.
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
  // The chunk the reference waits for.
  chunk: SomeChunk<any>,
  // The Set or Map being constructed. Without a path, it is in the slot
  // before its entries.
  collection: null | Set<any> | Map<any, any>,
  // Whether that chunk has been initialized.
  released: boolean,
  // Whether the slot holds its final value. Until then, `pathIndex` is where
  // to continue in `path`, and `listeners` are the references whose paths go
  // through this slot.
  fulfilled: boolean,
  pathIndex: number,
  listeners: null | Array<InitializationReference>,
  // For a reference whose value is built by `map`, like a Map: the value that
  // `map` reads, how far the search for an unfulfilled slot in it has got,
  // and the wait for a module that `map` needs, if it is still loading.
  input: any,
  inputIndex: number,
  inputLimit: number,
  moduleWait: null | InitializationReference,
};
type InitializationHandler = {
  chunk: null | BlockedChunk<any>,
  value: any,
  // If the whole model is one reference, like `"$1"`, and it is not fulfilled
  // yet, this is that reference.
  root: null | InitializationReference,
  // TODO: Split type to make it impossible to treat a thrown value as NestedArrayContext.
  // thrown value if errored, otherwise array context
  reason: mixed | NestedArrayContext,
  // How many of `references` are not released yet.
  deps: number,
  references: null | Array<InitializationReference>,
  // The group this handler is in. Null until its first group check.
  group: null | BlockedGroup,
  errored: boolean,
};
// Handlers whose chunks wait on each other, directly or through other
// handlers. A check that finds two groups waiting on each other merges them,
// and the one merged in points at the other through `merged`.
type BlockedGroup = {
  merged: null | BlockedGroup,
  size: number,
  handlers: Array<InitializationHandler>,
  // The references of these handlers that a check has not looked at yet, and
  // the one that the group is waiting for now.
  unchecked: Array<InitializationReference>,
  waitingFor: null | InitializationReference,
  checkQueued: boolean,
  // Used by the link-cut tree in ReactFlightWaitForest.
  pathParent: null | WaitForestNode,
  pathLeft: null | WaitForestNode,
  pathRight: null | WaitForestNode,
};

const EMPTY_REFERENCE_PATH: Array<string> = [];

function createInitializationHandler(deps: number): InitializationHandler {
  return {
    chunk: null,
    value: null,
    root: null,
    reason: null,
    deps,
    references: null,
    group: null,
    errored: false,
  };
}

function createErroredInitializationHandler(
  reason: mixed,
): InitializationHandler {
  return {
    chunk: null,
    value: null,
    root: null,
    reason,
    deps: 0,
    references: null,
    group: null,
    errored: true,
  };
}
let initializingHandler: null | InitializationHandler = null;

function initializeModelChunk<T>(
  chunk: ResolvedModelChunk<T>,
  resolveListeners: null | Array<InitializationReference | (T => mixed)> = null,
  rejectListeners: null | Array<
    InitializationReference | (mixed => mixed),
  > = null,
): void {
  const prevHandler = initializingHandler;
  initializingHandler = null;

  const {[RESPONSE_SYMBOL]: response, id} = chunk.reason;
  response._workDepth++;

  const rootReference = id === -1 ? undefined : id.toString(16);

  const resolvedModel = chunk.value;

  // We go to the BLOCKED state until we've fully resolved this.
  // We do this before parsing in case we try to initialize the same chunk
  // while parsing the model. Such as in a cyclic reference.
  const cyclicChunk: BlockedChunk<T> = chunk as any;
  cyclicChunk.status = BLOCKED;
  cyclicChunk.value = resolveListeners;
  cyclicChunk.reason = rejectListeners;
  const parsedChunk: SomeChunk<T> = cyclicChunk;

  try {
    const rawModel = JSON.parse(resolvedModel);

    // The root might not be an array but if it is we want to track the count of entries.
    const arrayRoot: NestedArrayContext = {
      count: 0,
      fork: false,
      pending: null,
    };

    const value: T = reviveModel(
      response,
      {'': rawModel},
      '',
      rawModel,
      rootReference,
      arrayRoot,
    );

    const handler = initializingHandler;
    if (handler !== null) {
      if (handler.errored) {
        // The handler errored during the parse, so the chunk errors too.
        triggerErrorOnChunk(response, cyclicChunk, handler.reason);
        return;
      }
      // The whole model can be one reference that is not fulfilled yet. Its
      // value then arrives through that reference.
      if (isUnfulfilledReference(value)) {
        handler.value = null;
        handler.root = value as any;
      } else {
        handler.value = value;
      }
      handler.reason = arrayRoot;
      registerHandler(response, handler, cyclicChunk);
      // Nested parses can have made references to this chunk while it was
      // being parsed. Its value exists now, so they can be fulfilled.
      const listeners = cyclicChunk.value;
      if (listeners !== null) {
        fulfillListenersFromModel(response, listeners, handler);
      }
      if (parsedChunk.status !== BLOCKED) {
        // Fulfilling one of them failed and errored this chunk.
        return;
      }
      if (handler.deps > 0) {
        // Some references are not released yet. The chunk stays BLOCKED until
        // they are, or until a group check initializes it together with the
        // chunks it waits for.
        queueGroupCheck(response, handler);
        return;
      }
      settleArrayCounts(response, handler);
      if (handler.errored) {
        return;
      }
      unregisterHandler(response, handler);
    }
    initializeBlockedChunk(response, cyclicChunk, value, arrayRoot);
  } catch (error) {
    if (parsedChunk.status === BLOCKED) {
      // The parse failed. Fail the handler, and then the chunk, which also
      // rejects the references that were made to it during the parse.
      const handler = initializingHandler;
      if (handler !== null) {
        rejectReference(response, handler, error);
      }
      if (parsedChunk.status === BLOCKED) {
        triggerErrorOnChunk(response, cyclicChunk, error);
      }
    } else if (parsedChunk.status === INITIALIZED) {
      // Already delivered. A settled chunk does not change.
      throw error;
    } else {
      const erroredChunk: ErroredChunk<T> = chunk as any;
      erroredChunk.status = ERRORED;
      erroredChunk.reason = error;
    }
  } finally {
    initializingHandler = prevHandler;
    response._workDepth--;
    flushGroupChecks(response);
  }
}

// Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.
export function reportGlobalError(response: Response, error: Error): void {
  if (response._closed) {
    // Everything that could be settled was settled by the first report.
    return;
  }
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
  // Reject the chunks that are still blocked, unless something is still
  // loading.
  if (
    response._workDepth === 0 &&
    response._pendingReads === 0 &&
    response._blockedChunks.size > 0
  ) {
    rejectBlockedChunks(response);
  }
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

// Initializes once the module has loaded, or errors if the load fails.
function createModuleChunk(
  response: Response,
  loading: Thenable<any>,
): BlockedChunk<any> {
  const chunk: BlockedChunk<any> = createBlockedChunk(response);
  response._pendingReads++;
  loading.then(
    () => {
      try {
        initializeBlockedChunk(response, chunk, null, null);
      } finally {
        finishPendingRead(response);
      }
    },
    error => {
      try {
        triggerErrorOnChunk(response, chunk, error);
      } finally {
        finishPendingRead(response);
      }
    },
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

// Initializes the handler's chunk once the handler has nothing left to wait
// for.
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
  // The chunk can have settled since the handler recorded it.
  if ((chunk as SomeChunk<any>).status !== BLOCKED) {
    return;
  }
  settleArrayCounts(response, handler);
  if (handler.errored) {
    return;
  }
  unregisterHandler(response, handler);
  initializeBlockedChunk(
    response,
    chunk,
    handler.value,
    // $FlowFixMe[incompatible-type] Assuming handler.errored is false.
    handler.reason,
  );
}

function releaseReference(
  response: Response,
  reference: InitializationReference,
  chunk: InitializedChunk<any>,
): void {
  if (reference.released) {
    return;
  }
  const handler = reference.handler;
  // Nothing left to do if the handler's chunk has settled or the handler
  // has failed.
  const handlerChunk: null | SomeChunk<any> = handler.chunk;
  if (
    handler.errored ||
    (handlerChunk !== null && handlerChunk.status !== BLOCKED)
  ) {
    reference.released = true;
    return;
  }
  if (!reference.fulfilled) {
    if (reference.parentObject === null) {
      fulfillReferenceSlot(response, reference, chunk.value, chunk.reason);
    } else if (reference.pathIndex === 0) {
      fulfillReference(response, reference, chunk.value, 1, chunk.reason);
    }
  }
  // `released` and `deps` change together, and only after the slot is
  // fulfilled, because fulfilling it can run a group check.
  reference.released = true;
  handler.deps--;
  if (handler.deps === 0) {
    initializeChunkIfUnblocked(response, handler);
  } else {
    queueGroupCheckIfWaitingFor(response, reference);
  }
}

function fulfillListenersFromModel(
  response: Response,
  listeners: Array<InitializationReference | (any => mixed)>,
  handler: InitializationHandler,
): void {
  for (let i = 0; i < listeners.length; i++) {
    const chunk: null | SomeChunk<any> = handler.chunk;
    if (chunk === null || chunk.status !== BLOCKED) {
      // Fulfilling a reference failed and errored the chunk, which rejected
      // the rest of the listeners.
      return;
    }
    const listener = listeners[i];
    if (typeof listener === 'function') {
      continue;
    }
    // A reference that was made after the model was parsed has already
    // started on its path.
    if (!listener.fulfilled && listener.pathIndex === 0) {
      fulfillReferenceFromModel(response, listener, handler);
    }
  }
}

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

function fulfillReferenceFromModel(
  response: Response,
  reference: InitializationReference,
  target: InitializationHandler,
): void {
  const value = target.value;
  if (value === null) {
    const root = getUnfulfilledRoot(target);
    if (root !== null) {
      // The whole model is one reference that is not fulfilled yet.
      if (reference.parentObject === null) {
        const waiters = reference.listeners;
        if (waiters !== null) {
          reference.listeners = null;
          for (let i = 0; i < waiters.length; i++) {
            addSlotListener(root, waiters[i]);
          }
        }
        reference.fulfilled = true;
        queueGroupCheckIfWaitingFor(response, reference);
      } else {
        reference.pathIndex = 1;
        addSlotListener(root, reference);
      }
      return;
    }
    // Otherwise the model really is null.
  }
  // $FlowFixMe[incompatible-type] A handler in `_handlers` has not errored.
  const arrayRoot: null | NestedArrayContext = target.reason;
  if (reference.parentObject === null) {
    fulfillReferenceSlot(response, reference, value, arrayRoot);
  } else {
    fulfillReference(response, reference, value, 1, arrayRoot);
  }
}

function getUnfulfilledRoot(
  handler: InitializationHandler,
): null | InitializationReference {
  const root = handler.root;
  return root !== null && !root.fulfilled ? root : null;
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

// Follows the reference's path from `value` and fills the slot with what it
// leads to. If a slot on the way is not filled yet, waits for that slot and
// continues from it. `arrayRoot` is the array context `value` was revived in,
// for the array size limit; the arrays of the selected value count against
// the model that referenced it.
function fulfillReference(
  response: Response,
  reference: InitializationReference,
  value: any,
  index: number,
  arrayRoot: null | NestedArrayContext,
): void {
  const handler = reference.handler;
  const path = reference.path;
  try {
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
        if (isUnfulfilledReference(slot)) {
          reference.pathIndex = i + 1;
          addSlotListener(slot, reference);
          return;
        }
        value = slot;
        if (isArray(value)) {
          arrayRoot = rootArrayContexts.get(value) || arrayRoot;
        } else {
          arrayRoot = null;
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
        if (reference.chunk.status === INITIALIZED) {
          if (arrayRoot.fork) {
            referenceArrayRoot.fork = true;
          }
          bumpArrayCount(referenceArrayRoot, arrayRoot.count, response);
        } else {
          // The chunk is only parsed, so the count of its arrays can still
          // grow. It is added when this handler's chunk is initialized.
          const pending = referenceArrayRoot.pending;
          if (pending === null) {
            referenceArrayRoot.pending = [arrayRoot];
          } else {
            pending.push(arrayRoot);
          }
        }
      } else {
        const size = getArrayElementSize(value);
        if (size > 0) {
          bumpArrayCount(referenceArrayRoot, size, response);
        }
      }
    }

    if (reference.map !== createModel) {
      if (reference.map === createMap || reference.map === createSet) {
        // Claim the initializer before waiting for its slots, so that only
        // one constructor ever waits for them.
        let collection = reference.collection;
        if (collection === null) {
          collection = reference.collection =
            reference.map === createSet ? new Set() : new Map();
        }
        claimCollectionInitializer(response, collection, value);
      }
      reference.input = value;
      constructReference(response, reference);
      return;
    }
    fulfillReferenceSlot(response, reference, value, arrayRoot);
  } catch (error) {
    rejectReference(response, handler, error);
  }
}

// Makes the handler wait for a chunk.
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

function constructReference(
  response: Response,
  reference: InitializationReference,
): void {
  if (reference.fulfilled) {
    return;
  }
  if (!waitForInputSlots(reference, reference.input)) {
    return;
  }
  fulfillReferenceSlot(
    response,
    reference,
    mapReference(response, reference),
    null,
  );
}

function waitForInputSlots(
  reference: InitializationReference,
  input: any,
): boolean {
  if (typeof input === 'object' && input !== null) {
    const pending = findPendingInput(reference, input);
    if (pending !== null) {
      reference.pathIndex = CONSTRUCT;
      addSlotListener(pending, reference);
      return false;
    }
  }
  const moduleWait = reference.moduleWait;
  if (moduleWait !== null && !moduleWait.fulfilled) {
    // `map` also needs its module.
    reference.pathIndex = CONSTRUCT;
    addSlotListener(moduleWait, reference);
    return false;
  }
  return true;
}

// The `pathIndex` of a reference that has finished its path and is waiting to
// call `map`.
const CONSTRUCT = -1;

// The first input slot that is not filled yet. A filled slot stays filled,
// so the scan continues from where the last one stopped. Only the slots the
// constructor reads are scanned, since many constructors can share an input.
function findPendingInput(
  reference: InitializationReference,
  input: Object,
): null | InitializationReference {
  const map = reference.map;
  if (map === extractIterator || !isArray(input)) {
    // An iterator does not read its entries when it is created, and the
    // other constructors only read the entries of an array.
    return null;
  }
  const inputLimit = reference.inputLimit;
  if (inputLimit !== 0 && input.length > inputLimit) {
    // `map` rejects an input this long without reading it.
    return null;
  }
  // A Map reads the key and value of each entry.
  const hasEntryPairs = map === createMap;
  for (let i = reference.inputIndex; i < input.length; i++) {
    const slot = input[i];
    if (isUnfulfilledReference(slot)) {
      reference.inputIndex = i;
      return slot;
    }
    if (hasEntryPairs && typeof slot === 'object' && slot !== null) {
      const entryKey = slot[0];
      if (isUnfulfilledReference(entryKey)) {
        reference.inputIndex = i;
        return entryKey;
      }
      const entryValue = slot[1];
      if (isUnfulfilledReference(entryValue)) {
        reference.inputIndex = i;
        return entryValue;
      }
    }
  }
  reference.inputIndex = input.length;
  return null;
}

function mapReference(
  response: Response,
  reference: InitializationReference,
): any {
  const input = reference.input;
  reference.input = null;
  const collection = reference.collection;
  if (collection !== null) {
    // Every entry is fulfilled now, so they can be added.
    return fillCollection(response, collection, input);
  }
  // `map` is called outside of a parse here. If it starts something that the
  // model has to wait for, like a module load, that has to count against this
  // handler.
  const prevHandler = initializingHandler;
  initializingHandler = reference.handler;
  try {
    return reference.map(
      response,
      input,
      reference.parentObject as any,
      reference.key,
    );
  } finally {
    initializingHandler = prevHandler;
  }
}

// Assigns the value to the slot. The slot does not change after this.
// `arrayRoot` is the array context of `value`, for the references that
// continue their path from this slot.
function fulfillReferenceSlot(
  response: Response,
  reference: InitializationReference,
  value: any,
  arrayRoot: null | NestedArrayContext,
): void {
  const {handler, parentObject, key} = reference;
  reference.fulfilled = true;
  queueGroupCheckIfWaitingFor(response, reference);
  if (key === 'then' && typeof value === 'function') {
    // A function in a `then` slot would make the containing object a thenable.
    // The immediate path drops it in `createModel`. A slot filled later is
    // written here, so drop it here too.
    value = null;
  }
  if (parentObject !== null) {
    if (key !== __PROTO__) {
      parentObject[key] = value;
    }

    // If this is the root object for a model reference, where `handler.value`
    // is a stale `null`, the resolved value can be used directly.
    if (key === '' && handler.value === null) {
      handler.value = value;
    }
  }

  const waiters = reference.listeners;
  if (waiters !== null) {
    reference.listeners = null;
    for (let i = 0; i < waiters.length; i++) {
      const waiter = waiters[i];
      continueReference(
        response,
        waiter,
        value,
        arrayRoot,
        waiter.pathIndex === CONSTRUCT,
      );
    }
  }
}

// Fulfilling one reference can let another one continue, which can let
// another one continue, and so on. They are queued and continued in a loop,
// so that a long chain does not overflow the stack.
function continueReference(
  response: Response,
  reference: InitializationReference,
  value: any,
  arrayRoot: null | NestedArrayContext,
  isConstructor: boolean,
): void {
  if (response._continuingReferences) {
    const queuedReference = {reference, value, arrayRoot, isConstructor};
    const queued = response._queuedReferences;
    if (queued === null) {
      response._queuedReferences = [queuedReference];
    } else {
      queued.push(queuedReference);
    }
    return;
  }
  response._continuingReferences = true;
  let next = 0;
  try {
    for (;;) {
      if (isConstructor) {
        try {
          constructReference(response, reference);
        } catch (error) {
          rejectReference(response, reference.handler, error);
        }
      } else {
        fulfillReference(
          response,
          reference,
          value,
          reference.pathIndex,
          arrayRoot,
        );
      }
      const queued = response._queuedReferences;
      if (queued === null || next === queued.length) {
        break;
      }
      const queuedReference = queued[next++];
      reference = queuedReference.reference;
      value = queuedReference.value;
      arrayRoot = queuedReference.arrayRoot;
      isConstructor = queuedReference.isConstructor;
    }
  } finally {
    response._queuedReferences = null;
    response._continuingReferences = false;
  }
}

// Chunks that wait on each other cannot be initialized one at a time. They
// are initialized together, once every reference in them is fulfilled and
// every reference that leads out of the group has been released.
//
// A check goes through a group's references one at a time, and stops at the
// first one that leads to a chunk that is not initialized. That is the
// reference the group waits for. If that chunk is in another group, and
// following the waits from that group leads back here, all those groups are
// merged into one, and the check goes on with the references that are left.
// A group with nothing left to wait for is initialized.
//
// A group waits on one reference at a time, so the waits form a forest. It
// is kept as a link-cut tree, which tells whether another group's waits
// lead back to the one being checked. Groups that do are merged instead of
// linked, so the forest has no loops.
function queueGroupCheck(
  response: Response,
  handler: InitializationHandler,
): void {
  const group = getBlockedGroup(handler);
  if (!group.checkQueued) {
    group.checkQueued = true;
    response._queuedGroupChecks.push(group);
  }
}

// A group stops at the first reference it has to wait for. When that
// reference is fulfilled or released, the group looks at the rest.
function queueGroupCheckIfWaitingFor(
  response: Response,
  reference: InitializationReference,
): void {
  const handler = reference.handler;
  if (
    handler.group !== null &&
    getBlockedGroup(handler).waitingFor === reference
  ) {
    queueGroupCheck(response, handler);
  }
}

function flushGroupChecks(response: Response): void {
  if (response._flushingGroupChecks || response._flushingChunkListeners) {
    // A wake is delivering listeners, and one of them started a parse. The
    // chunks that the wake has settled have not told all of their listeners
    // yet, so a check now could see a group whose member has failed without
    // the others knowing. The wake runs the checks when it is done.
    return;
  }
  response._flushingGroupChecks = true;
  const queued = response._queuedGroupChecks;
  let i = 0;
  try {
    // A check can queue more.
    for (; i < queued.length; i++) {
      checkBlockedGroup(response, queued[i]);
    }
  } finally {
    // If a check throws, the ones after it stay queued.
    queued.splice(0, i + 1);
    response._flushingGroupChecks = false;
  }
  try {
    for (;;) {
      // All input has arrived and nothing is loading, so a chunk that is
      // still blocked can never complete.
      if (isInputComplete(response) && response._blockedChunks.size > 0) {
        rejectBlockedChunks(response);
      }
      if (response._workDepth > 0 || response._queuedCallbacks.length === 0) {
        break;
      }
      // A callback can parse another row, like the next entry of a stream,
      // and that row can be blocked in turn.
      flushCallbacks(response);
    }
  } finally {
    // A queued callback can still add an entry to a stream, so open streams
    // are errored after the callbacks have run.
    if (isInputComplete(response) && response._openStreams.size > 0) {
      errorOpenStreams(response);
    }
  }
}

function isInputComplete(response: Response): boolean {
  return (
    response._closed &&
    response._workDepth === 0 &&
    response._pendingReads === 0
  );
}

// Rejects the chunks that are still blocked when the reply has ended. They
// only wait on each other. Rejecting one can reject others, so chunks that
// have settled meanwhile are skipped.
function rejectBlockedChunks(response: Response): void {
  if (response._rejectingBlocked) {
    return;
  }
  response._rejectingBlocked = true;
  try {
    const blocked = Array.from(response._blockedChunks);
    const error = response._closedReason;
    for (let i = 0; i < blocked.length; i++) {
      const chunk = blocked[i];
      if (chunk.status !== BLOCKED) {
        continue;
      }
      const handler = response._handlers.get(chunk);
      if (handler !== undefined) {
        unregisterHandler(response, handler);
      } else {
        response._blockedChunks.delete(chunk);
      }
      triggerErrorOnChunk(response, chunk, error);
    }
  } finally {
    response._rejectingBlocked = false;
  }
}

// A stream that is still open when the reply has ended will never be closed.
// Error it like a truncated connection.
function errorOpenStreams(response: Response): void {
  const streams = response._openStreams;
  const open = Array.from(streams);
  // Cleared first in case erroring a stream re-enters.
  streams.clear();
  for (let i = 0; i < open.length; i++) {
    // $FlowFixMe[incompatible-type] The reason is set once the response closed.
    open[i].error(response._closedReason);
  }
}

// An asynchronous read has finished. Flush in case it was the last one, so
// chunks that can no longer complete are rejected.
function finishPendingRead(response: Response): void {
  response._pendingReads--;
  flushGroupChecks(response);
}

function flushCallbacks(response: Response): void {
  if (response._workDepth > 0) {
    // Callbacks are user code. They are called when the outermost parse or
    // wake returns, so that they never run in the middle of one.
    return;
  }
  const queued = response._queuedCallbacks;
  if (queued.length === 0) {
    return;
  }
  // A callback can start a parse or a wake. The callbacks that this queues
  // are called by this loop too.
  response._workDepth++;
  let thrown: null | {value: mixed} = null;
  try {
    for (let i = 0; i < queued.length; i++) {
      const callbacks = queued[i].callbacks;
      const value = queued[i].value;
      for (let j = 0; j < callbacks.length; j++) {
        try {
          callbacks[j](value);
        } catch (error) {
          // The other callbacks are still called.
          if (thrown === null) {
            thrown = {value: error};
          }
        }
      }
    }
  } finally {
    queued.length = 0;
    response._workDepth--;
  }
  if (thrown !== null) {
    throw thrown.value;
  }
}

// The group the handler is in. It starts out as the handler alone.
function getBlockedGroup(handler: InitializationHandler): BlockedGroup {
  let group: BlockedGroup;
  if (handler.group === null) {
    group = handler.group = {
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
    return group;
  }
  group = handler.group;
  while (group.merged !== null) {
    group = group.merged;
  }
  handler.group = group;
  return group;
}

function checkBlockedGroup(response: Response, queued: BlockedGroup): void {
  queued.checkQueued = false;
  let group = queued;
  while (group.merged !== null) {
    group = group.merged;
  }
  // Look again at the reference the group was waiting for, with the rest.
  cutWait(group);
  group.waitingFor = null;
  const first = group.handlers[0];
  if (
    first.errored ||
    first.chunk === null ||
    (first.chunk as SomeChunk<any>).status !== BLOCKED
  ) {
    return;
  }
  let unchecked = group.unchecked;
  while (unchecked.length > 0) {
    const reference = unchecked[unchecked.length - 1];
    if (reference.released) {
      unchecked.pop();
      continue;
    }
    if (!reference.fulfilled) {
      // The slot is not fulfilled yet. The group is checked again when it is.
      group.waitingFor = reference;
      return;
    }
    const target = response._handlers.get(reference.chunk);
    if (target === undefined) {
      // The chunk is not waiting for anything that a group check can see.
      group.waitingFor = reference;
      return;
    }
    const other = getBlockedGroup(target);
    if (other === group) {
      unchecked.pop();
      continue;
    }
    if (findWaitRoot(other) !== group) {
      // The waits from `other` do not lead back here.
      group.waitingFor = reference;
      linkWait(group, other);
      return;
    }
    // They do. These handlers all wait on each other and are one group now.
    const chain: Array<BlockedGroup> = [];
    let largest = group;
    // The live waits should lead back here within one step per blocked chunk.
    let steps = response._blockedChunks.size + 1;
    for (let current = other; current !== group; ) {
      chain.push(current);
      if (current.size > largest.size) {
        largest = current;
      }
      const waitingFor = current.waitingFor;
      const next =
        waitingFor === null || --steps <= 0
          ? undefined
          : response._handlers.get(waitingFor.chunk);
      if (next === undefined) {
        // The waits don't lead back here after all.
        group.waitingFor = reference;
        return;
      }
      current = getBlockedGroup(next);
    }
    // The waits around the loop are cut before any member is linked to the
    // merged group, so that the forest never holds a loop.
    for (let i = 0; i < chain.length; i++) {
      cutWait(chain[i]);
    }
    if (largest !== group) {
      mergeBlockedGroups(largest, group);
      linkWait(group, largest);
    }
    for (let i = 0; i < chain.length; i++) {
      const member = chain[i];
      if (member !== largest) {
        mergeBlockedGroups(largest, member);
        linkWait(member, largest);
      }
    }
    largest.waitingFor = null;
    group = largest;
    unchecked = group.unchecked;
  }
  initializeBlockedGroup(response, group.handlers);
}

// The forest of waits is a link-cut tree in shared/ReactFlightWaitForest.
// A group's parent is the group its wait leads into, or the group it merged
// into.
function mergeBlockedGroups(into: BlockedGroup, other: BlockedGroup): void {
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

// Mark every chunk of the group before waking any listener, since a
// listener can read one chunk through another.
function initializeBlockedGroup(
  response: Response,
  handlers: Array<InitializationHandler>,
): void {
  for (let i = 0; i < handlers.length; i++) {
    const handler = handlers[i];
    if (!handler.errored) {
      settleArrayCounts(response, handler);
    }
  }
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
    unregisterHandler(response, handler);
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
  unregisterHandler(response, handler);
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

  if (
    path.length === 0 &&
    ((map as any) === createSet || (map as any) === createMap)
  ) {
    // The collection exists before its entries do, so a reference to it from
    // inside the entries is to the final object. Only one reference can claim
    // the entries.
    const collection: Set<any> | Map<any, any> =
      (map as any) === createSet ? new Set() : new Map();
    reference.collection = collection;
    fulfillReferenceIfParsed(response, reference);
    return collection as any;
  }

  fulfillReferenceIfParsed(response, reference);
  if (key === __PROTO__) {
    return null as any;
  }
  if (reference.fulfilled) {
    return parentObject[key];
  }
  // The slot holds the reference until it is fulfilled.
  return reference as any;
}

function registerHandler(
  response: Response,
  handler: InitializationHandler,
  chunk: BlockedChunk<any>,
): void {
  handler.chunk = chunk;
  response._handlers.set(chunk, handler);
  response._blockedChunks.add(chunk);
}

function unregisterHandler(
  response: Response,
  handler: InitializationHandler,
): void {
  const chunk = handler.chunk;
  if (chunk !== null) {
    response._handlers.delete(chunk);
    response._blockedChunks.delete(chunk);
  }
  handler.references = null;
}

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
    $$typeof: UNFULFILLED_REFERENCE_TYPE,
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
    inputIndex: 0,
    inputLimit: 0,
    moduleWait: null,
  };
  if (handler.references === null) {
    handler.references = [reference];
  } else {
    handler.references.push(reference);
  }
  if (handler.group !== null) {
    // A group check is already going through the handler's references. Add
    // this one to the ones it has not looked at yet.
    getBlockedGroup(handler).unchecked.push(reference);
  }
  return reference;
}

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

// The property names of a path, with the escaping the encoder applies to a
// name that contains a colon undone.
function splitReferencePath(reference: string): Array<string> {
  const path = reference.split(':');
  for (let i = 1; i < path.length; i++) {
    path[i] = unescapePathSegment(path[i]);
  }
  return path;
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
    reference.indexOf(':') === -1
      ? EMPTY_REFERENCE_PATH
      : splitReferencePath(reference);
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
            arrayRoot =
              rootArrayContexts.get(
                // $FlowFixMe[incompatible-type] Our `isArray` typing can't narrow `mixed`
                value as $ReadOnlyArray<mixed>,
              ) || arrayRoot;
          } else {
            arrayRoot = null;
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
        } else {
          const size = getArrayElementSize(value);
          if (size > 0) {
            bumpArrayCount(referenceArrayRoot, size, response);
          }
        }
      }
      // There's no Element nor Debug Info in the ReplyServer so we don't have to check those here.
      return chunkValue;
    case BLOCKED:
      if (
        (map as any) === loadServerReference ||
        (map as any) === loadServerObjectReference
      ) {
        // The metadata of a Server Reference is written as a part of its
        // own, with nothing in it to wait for, so it is never blocked.
        throw new Error('Invalid reference.');
      }
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
  const collection = new Map<any, any>();
  claimCollectionInitializer(response, collection, model);
  return fillCollection(response, collection, model) as any;
}

function createSet(response: Response, model: Array<any>): Set<any> {
  const collection = new Set<any>();
  claimCollectionInitializer(response, collection, model);
  return fillCollection(response, collection, model) as any;
}

// Claim before waiting for the entries, so only one constructor waits for
// them.
function claimCollectionInitializer(
  response: Response,
  collection: Set<any> | Map<any, any>,
  model: Array<any>,
): void {
  if (!isArray(model) || isServerReferenceObject(response, model)) {
    if (collection instanceof Set) {
      throw new Error('Invalid Set initializer.');
    }
    throw new Error('Invalid Map initializer.');
  }
  if ((model as any).$$consumed !== undefined) {
    if (collection instanceof Set) {
      throw new Error('Already initialized Set.');
    }
    throw new Error('Already initialized Map.');
  }
  // This needs to come first to prevent the model from being consumed again in case of a cyclic reference.
  (model as any).$$consumed = true;
}

function fillCollection(
  response: Response,
  collection: Set<any> | Map<any, any>,
  model: Array<any>,
): Set<any> | Map<any, any> {
  if (collection instanceof Set) {
    for (let i = 0; i < model.length; i++) {
      collection.add(model[i]);
    }
  } else {
    for (let i = 0; i < model.length; i++) {
      const entry = model[i];
      // Match the Map constructor's requirement for an entry object.
      if (
        entry === null ||
        (typeof entry !== 'object' && typeof entry !== 'function')
      ) {
        throw new Error('Invalid Map initializer.');
      }
      collection.set(entry[0], entry[1]);
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
  response._pendingReads++;
  promise.then(
    (buffer: ArrayBuffer) => {
      try {
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
      } finally {
        finishPendingRead(response);
      }
    },
    error => {
      try {
        triggerErrorOnChunk(response, chunk, error);
      } finally {
        finishPendingRead(response);
      }
    },
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
  response._openStreams.add(controller);

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
  // `closed` is set once a close or error has been requested, so no further
  // entry is read. `terminated` is set once the controller has closed or
  // errored. An entry that resolves after that is dropped, since enqueuing
  // would throw.
  let closed = false;
  let terminated = false;
  const stream = new ReadableStream({
    type: type,
    start(c) {
      controller = c;
    },
    cancel() {
      // The consumer is done with the stream. Entries that are still arriving
      // for it are dropped.
      closed = true;
      terminated = true;
    },
  });
  let previousBlockedChunk: SomeChunk<T> | null = null;
  function enqueue(value: T): void {
    if (terminated) {
      return;
    }
    if (type === 'bytes' && !ArrayBuffer.isView(value)) {
      flightController.error(new Error('Invalid data for bytes stream.'));
      return;
    }
    controller.enqueue(value);
  }
  function fail(error: mixed): void {
    if (!terminated) {
      terminated = true;
      // $FlowFixMe[incompatible-type]
      controller.error(error);
    }
  }
  function closeStream(): void {
    if (terminated) {
      return;
    }
    terminated = true;
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
      if (closed) {
        // Once a close or error has been requested no further entry is read,
        // so a late model never parses onto a stream that is ending.
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
        fail(error);
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
    _blockedChunks: new Set(),
    _pendingReads: 0,
    _openStreams: new Set(),
    _rejectingBlocked: false,
    _queuedReferences: null,
    _continuingReferences: false,
    _queuedChunkListeners: null,
    _flushingChunkListeners: false,
    _queuedGroupChecks: [],
    _queuedCallbacks: [],
    _workDepth: 0,
    _flushingGroupChecks: false,
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
