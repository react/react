/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @nolint
 * @preventMunge
 * @preserve-invariant-messages
 */

"use strict";
require("ReactFeatureFlags");
var decoderOptions = { stream: !0 },
  canUseDOM = !(
    "undefined" === typeof window ||
    "undefined" === typeof window.document ||
    "undefined" === typeof window.document.createElement
  );
function resolveServerReference(config, id) {
  return {
    $$typeof: Symbol.for("react.client.reference"),
    $$id: id,
    $$hblp: null
  };
}
var asyncModuleCache = new Map();
function preloadModule(metadata) {
  if (!canUseDOM) return null;
  var jsr = require("JSResource")(metadata.$$id);
  if (null != jsr.getModuleIfRequireable()) return null;
  null != metadata.$$hblp && window.Bootloader.handlePayload(metadata.$$hblp);
  var modulePromise = jsr.load();
  modulePromise.then(
    function (value) {
      modulePromise.status = "fulfilled";
      modulePromise.value = value;
    },
    function (reason) {
      modulePromise.status = "rejected";
      modulePromise.reason = reason;
    }
  );
  asyncModuleCache.set(metadata.$$id, modulePromise);
  return modulePromise;
}
function requireModule(metadata) {
  if (!canUseDOM) {
    var id = metadata.$$id,
      idx = id.lastIndexOf("#");
    return -1 !== idx
      ? ((metadata = id.slice(0, idx)),
        (id = id.slice(idx + 1)),
        (metadata = require.call(null, metadata)),
        "" === id || "default" === id
          ? metadata.__esModule
            ? metadata.default
            : metadata
          : metadata[id])
      : require.call(null, id);
  }
  id = require("JSResource")(metadata.$$id).getModuleIfRequireable();
  if (null != id) return id;
  if (
    (metadata = asyncModuleCache.get(metadata.$$id)) &&
    "fulfilled" === metadata.status
  )
    return metadata.value;
  throw metadata.reason;
}
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var ASYNC_ITERATOR = Symbol.asyncIterator,
  isArrayImpl = Array.isArray,
  getPrototypeOf = Object.getPrototypeOf,
  ObjectPrototype$1 = Object.prototype,
  knownServerReferences = new WeakMap();
function serializeNumber(number) {
  return Number.isFinite(number)
    ? 0 === number && -Infinity === 1 / number
      ? "$-0"
      : number
    : Infinity === number
      ? "$Infinity"
      : -Infinity === number
        ? "$-Infinity"
        : "$NaN";
}
function processReply(
  root,
  formFieldPrefix,
  temporaryReferences,
  onResolve,
  onReject,
  signal
) {
  function endReplyLifetime() {
    null !== replyLifetimeController &&
      replyLifetimeController.abort("The reply ended.");
  }
  function resolve(value) {
    settled = !0;
    endReplyLifetime();
    onResolve(value);
  }
  function reject(error) {
    settled = !0;
    endReplyLifetime();
    onReject(error);
  }
  function attachAbortSignal(abortSignal) {
    abortSignal.aborted
      ? abort()
      : ((replyLifetimeController = new AbortController()),
        abortSignal.addEventListener(
          "abort",
          function () {
            abort();
          },
          { signal: replyLifetimeController.signal }
        ));
  }
  function serializeTypedArray(tag, typedArray) {
    typedArray = new Blob([
      new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength
      )
    ]);
    var blobId = nextPartId++;
    null === formData && (formData = new FormData());
    formData.append(formFieldPrefix + blobId, typedArray);
    return "$" + tag + blobId.toString(16);
  }
  function serializeBinaryReader(reader) {
    function progress(entry) {
      entry.done
        ? ((entry = nextPartId++),
          data.append(formFieldPrefix + entry, new Blob(buffer)),
          data.append(
            formFieldPrefix + streamId,
            '"$o' + entry.toString(16) + '"'
          ),
          data.append(formFieldPrefix + streamId, "C"),
          pendingParts--,
          0 === pendingParts && resolve(data))
        : (buffer.push(entry.value),
          reader.read(new Uint8Array(1024)).then(progress, reject));
    }
    null === formData && (formData = new FormData());
    var data = formData;
    pendingParts++;
    var streamId = nextPartId++,
      buffer = [];
    reader.read(new Uint8Array(1024)).then(progress, reject);
    return "$r" + streamId.toString(16);
  }
  function serializeReader(reader) {
    function progress(entry) {
      if (entry.done)
        data.append(formFieldPrefix + streamId, "C"),
          pendingParts--,
          0 === pendingParts && resolve(data);
      else
        try {
          var partJSON = JSON.stringify(entry.value, resolveToJSON);
          data.append(formFieldPrefix + streamId, partJSON);
          reader.read().then(progress, reject);
        } catch (x) {
          reject(x);
        }
    }
    null === formData && (formData = new FormData());
    var data = formData;
    pendingParts++;
    var streamId = nextPartId++;
    reader.read().then(progress, reject);
    return "$R" + streamId.toString(16);
  }
  function serializeReadableStream(stream) {
    try {
      var binaryReader = stream.getReader({ mode: "byob" });
    } catch (x) {
      return serializeReader(stream.getReader());
    }
    return serializeBinaryReader(binaryReader);
  }
  function serializeAsyncIterable(iterable, iterator) {
    function progress(entry) {
      if (entry.done) {
        if (void 0 === entry.value)
          data.append(formFieldPrefix + streamId, "C");
        else
          try {
            var partJSON = JSON.stringify(entry.value, resolveToJSON);
            data.append(formFieldPrefix + streamId, "C" + partJSON);
          } catch (x) {
            reject(x);
            return;
          }
        pendingParts--;
        0 === pendingParts && resolve(data);
      } else
        try {
          var partJSON$0 = JSON.stringify(entry.value, resolveToJSON);
          data.append(formFieldPrefix + streamId, partJSON$0);
          iterator.next().then(progress, reject);
        } catch (x$1) {
          reject(x$1);
        }
    }
    null === formData && (formData = new FormData());
    var data = formData;
    pendingParts++;
    var streamId = nextPartId++;
    iterable = iterable === iterator;
    iterator.next().then(progress, reject);
    return "$" + (iterable ? "x" : "X") + streamId.toString(16);
  }
  function resolveToJSON(key, value) {
    if (null === value) return null;
    if ("object" === typeof value) {
      switch (value.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (void 0 !== temporaryReferences && -1 === key.indexOf(":")) {
            var parentReference = writtenObjects.get(this);
            if (void 0 !== parentReference)
              return (
                temporaryReferences.set(parentReference + ":" + key, value),
                "$T"
              );
          }
          if (void 0 !== temporaryReferences && modelRoot === value)
            return (modelRoot = null), "$T";
          throw Error(
            "React Element cannot be passed to Server Functions from the Client without a temporary reference set. Pass a TemporaryReferenceSet to the options."
          );
        case REACT_LAZY_TYPE:
          parentReference = value._payload;
          var init = value._init;
          null === formData && (formData = new FormData());
          pendingParts++;
          try {
            var resolvedModel = init(parentReference),
              lazyId = nextPartId++,
              partJSON = serializeModel(resolvedModel, lazyId);
            formData.append(formFieldPrefix + lazyId, partJSON);
            return "$" + lazyId.toString(16);
          } catch (x) {
            if (
              "object" === typeof x &&
              null !== x &&
              "function" === typeof x.then
            ) {
              pendingParts++;
              var lazyId$2 = nextPartId++;
              parentReference = function () {
                try {
                  var partJSON$3 = serializeModel(value, lazyId$2),
                    data$4 = formData;
                  data$4.append(formFieldPrefix + lazyId$2, partJSON$3);
                  pendingParts--;
                  0 === pendingParts && resolve(data$4);
                } catch (reason) {
                  reject(reason);
                }
              };
              x.then(parentReference, parentReference);
              return "$" + lazyId$2.toString(16);
            }
            reject(x);
            return null;
          } finally {
            pendingParts--;
          }
      }
      parentReference = writtenObjects.get(value);
      if ("function" === typeof value.then) {
        if (void 0 !== parentReference)
          if (modelRoot === value) modelRoot = null;
          else return parentReference;
        null === formData && (formData = new FormData());
        pendingParts++;
        var promiseId = nextPartId++;
        key = "$@" + promiseId.toString(16);
        writtenObjects.set(value, key);
        value.then(function (partValue) {
          try {
            var previousReference = writtenObjects.get(partValue);
            var partJSON$6 =
              void 0 !== previousReference
                ? JSON.stringify(previousReference)
                : serializeModel(partValue, promiseId);
            partValue = formData;
            partValue.append(formFieldPrefix + promiseId, partJSON$6);
            pendingParts--;
            0 === pendingParts && resolve(partValue);
          } catch (reason) {
            reject(reason);
          }
        }, reject);
        return key;
      }
      if (void 0 !== parentReference)
        if (modelRoot === value) modelRoot = null;
        else return parentReference;
      else
        -1 === key.indexOf(":") &&
          ((parentReference = writtenObjects.get(this)),
          void 0 !== parentReference &&
            ((key = parentReference + ":" + key),
            writtenObjects.set(value, key),
            void 0 !== temporaryReferences &&
              temporaryReferences.set(key, value)));
      if (isArrayImpl(value)) return value;
      if (value instanceof FormData) {
        null === formData && (formData = new FormData());
        var data$10 = formData;
        key = nextPartId++;
        var prefix = formFieldPrefix + "_" + key + "_";
        value.forEach(function (originalValue, originalKey) {
          data$10.append(prefix + originalKey, originalValue);
        });
        return "$K" + key.toString(16);
      }
      if (value instanceof Map)
        return (
          (key = nextPartId++),
          (parentReference = serializeModel(Array.from(value), key)),
          null === formData && (formData = new FormData()),
          formData.append(formFieldPrefix + key, parentReference),
          "$Q" + key.toString(16)
        );
      if (value instanceof Set)
        return (
          (key = nextPartId++),
          (parentReference = serializeModel(Array.from(value), key)),
          null === formData && (formData = new FormData()),
          formData.append(formFieldPrefix + key, parentReference),
          "$W" + key.toString(16)
        );
      if (value instanceof ArrayBuffer)
        return (
          (key = new Blob([value])),
          (parentReference = nextPartId++),
          null === formData && (formData = new FormData()),
          formData.append(formFieldPrefix + parentReference, key),
          "$A" + parentReference.toString(16)
        );
      if (value instanceof Int8Array) return serializeTypedArray("O", value);
      if (value instanceof Uint8Array) return serializeTypedArray("o", value);
      if (value instanceof Uint8ClampedArray)
        return serializeTypedArray("U", value);
      if (value instanceof Int16Array) return serializeTypedArray("S", value);
      if (value instanceof Uint16Array) return serializeTypedArray("s", value);
      if (value instanceof Int32Array) return serializeTypedArray("L", value);
      if (value instanceof Uint32Array) return serializeTypedArray("l", value);
      if (value instanceof Float32Array) return serializeTypedArray("G", value);
      if (value instanceof Float64Array) return serializeTypedArray("g", value);
      if (value instanceof BigInt64Array)
        return serializeTypedArray("M", value);
      if (value instanceof BigUint64Array)
        return serializeTypedArray("m", value);
      if (value instanceof DataView) return serializeTypedArray("V", value);
      if ("function" === typeof Blob && value instanceof Blob)
        return (
          null === formData && (formData = new FormData()),
          (key = nextPartId++),
          formData.append(formFieldPrefix + key, value),
          "$B" + key.toString(16)
        );
      if ((key = getIteratorFn(value)))
        return (
          (parentReference = key.call(value)),
          parentReference === value
            ? ((key = nextPartId++),
              (parentReference = serializeModel(
                Array.from(parentReference),
                key
              )),
              null === formData && (formData = new FormData()),
              formData.append(formFieldPrefix + key, parentReference),
              "$i" + key.toString(16))
            : Array.from(parentReference)
        );
      if (
        "function" === typeof ReadableStream &&
        value instanceof ReadableStream
      )
        return serializeReadableStream(value);
      key = value[ASYNC_ITERATOR];
      if ("function" === typeof key)
        return serializeAsyncIterable(value, key.call(value));
      key = getPrototypeOf(value);
      if (
        key !== ObjectPrototype$1 &&
        (null === key || null !== getPrototypeOf(key))
      ) {
        if (void 0 === temporaryReferences)
          throw Error(
            "Only plain objects, and a few built-ins, can be passed to Server Functions. Classes or null prototypes are not supported."
          );
        return "$T";
      }
      return value;
    }
    if ("string" === typeof value) {
      if ("Z" === value[value.length - 1] && this[key] instanceof Date)
        return "$D" + value;
      key = "$" === value[0] ? "$" + value : value;
      return key;
    }
    if ("boolean" === typeof value) return value;
    if ("number" === typeof value) return serializeNumber(value);
    if ("undefined" === typeof value) return "$undefined";
    if ("function" === typeof value) {
      parentReference = knownServerReferences.get(value);
      if (void 0 !== parentReference) {
        key = writtenObjects.get(value);
        if (void 0 !== key) return key;
        key = JSON.stringify(
          { id: parentReference.id, bound: parentReference.bound },
          resolveToJSON
        );
        null === formData && (formData = new FormData());
        parentReference = nextPartId++;
        formData.set(formFieldPrefix + parentReference, key);
        key = "$h" + parentReference.toString(16);
        writtenObjects.set(value, key);
        return key;
      }
      if (
        void 0 !== temporaryReferences &&
        -1 === key.indexOf(":") &&
        ((parentReference = writtenObjects.get(this)),
        void 0 !== parentReference)
      )
        return (
          temporaryReferences.set(parentReference + ":" + key, value), "$T"
        );
      throw Error(
        "Client Functions cannot be passed directly to Server Functions. Only Functions passed from the Server can be passed back again."
      );
    }
    if ("symbol" === typeof value) {
      if (
        void 0 !== temporaryReferences &&
        -1 === key.indexOf(":") &&
        ((parentReference = writtenObjects.get(this)),
        void 0 !== parentReference)
      )
        return (
          temporaryReferences.set(parentReference + ":" + key, value), "$T"
        );
      throw Error(
        "Symbols cannot be passed to a Server Function without a temporary reference set. Pass a TemporaryReferenceSet to the options."
      );
    }
    if ("bigint" === typeof value) return "$n" + value.toString(10);
    throw Error(
      "Type " +
        typeof value +
        " is not supported as an argument to a Server Function."
    );
  }
  function serializeModel(model, id) {
    "object" === typeof model &&
      null !== model &&
      ((id = "$" + id.toString(16)),
      writtenObjects.set(model, id),
      void 0 !== temporaryReferences && temporaryReferences.set(id, model));
    modelRoot = model;
    return JSON.stringify(model, resolveToJSON);
  }
  function abort() {
    endReplyLifetime();
    0 < pendingParts &&
      ((pendingParts = 0),
      null === formData ? resolve(json) : resolve(formData));
  }
  var nextPartId = 1,
    pendingParts = 0,
    formData = null,
    writtenObjects = new WeakMap(),
    modelRoot = root,
    settled = !1,
    replyLifetimeController = null,
    json = serializeModel(root, 0);
  null === formData
    ? resolve(json)
    : (formData.set(formFieldPrefix + "0", json),
      0 === pendingParts && resolve(formData));
  void 0 === signal || settled || attachAbortSignal(signal);
}
function registerBoundServerReference(reference, id, bound) {
  knownServerReferences.has(reference) ||
    knownServerReferences.set(reference, {
      id: id,
      originalBind: reference.bind,
      bound: bound
    });
}
function createBoundServerReference(metaData, callServer) {
  function action() {
    var args = Array.prototype.slice.call(arguments);
    return bound
      ? "fulfilled" === bound.status
        ? callServer(id, bound.value.concat(args))
        : Promise.resolve(bound).then(function (boundArgs) {
            return callServer(id, boundArgs.concat(args));
          })
      : callServer(id, args);
  }
  var id = metaData.id,
    bound = metaData.bound;
  registerBoundServerReference(action, id, bound);
  return action;
}
var hasOwnProperty = Object.prototype.hasOwnProperty,
  ObjectPrototype = Object.prototype,
  ArrayPrototype = Array.prototype;
function ReactPromise(status, value, reason) {
  this.status = status;
  this.value = value;
  this.reason = reason;
}
ReactPromise.prototype = Object.create(Promise.prototype);
Object.defineProperty(ReactPromise.prototype, "then", {
  writable: !0,
  enumerable: !0,
  configurable: !0,
  value: function (resolve, reject) {
    switch (this.status) {
      case "resolved_model":
        initializeModelChunk(this);
        break;
      case "resolved_module":
        initializeModuleChunk(this);
    }
    switch (this.status) {
      case "fulfilled":
        "function" === typeof resolve && resolve(this.value);
        break;
      case "pending":
      case "pending_weak":
      case "blocked":
        "function" === typeof resolve &&
          (null === this.value && (this.value = []), this.value.push(resolve));
        "function" === typeof reject &&
          (null === this.reason && (this.reason = []),
          this.reason.push(reject));
        break;
      case "halted":
        break;
      default:
        "function" === typeof reject && reject(this.reason);
    }
  }
});
function readChunk(chunk) {
  switch (chunk.status) {
    case "resolved_model":
      initializeModelChunk(chunk);
      break;
    case "resolved_module":
      initializeModuleChunk(chunk);
  }
  switch (chunk.status) {
    case "fulfilled":
      return chunk.value;
    case "pending":
    case "pending_weak":
    case "blocked":
    case "halted":
      throw chunk;
    default:
      throw chunk.reason;
  }
}
function wakeChunk(response, listeners, value, chunk) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    "function" === typeof listener
      ? listener(value)
      : fulfillReference(response, listener, value, chunk);
  }
}
function rejectChunk(response, listeners, error) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    "function" === typeof listener
      ? listener(error)
      : rejectReference(response, listener.handler, error);
  }
}
function resolveBlockedCycle(resolvedChunk, reference) {
  var referencedChunk = reference.handler.chunk;
  if (null === referencedChunk) return null;
  if (referencedChunk === resolvedChunk) return reference.handler;
  reference = referencedChunk.value;
  if (null !== reference)
    for (
      referencedChunk = 0;
      referencedChunk < reference.length;
      referencedChunk++
    ) {
      var listener = reference[referencedChunk];
      if (
        "function" !== typeof listener &&
        ((listener = resolveBlockedCycle(resolvedChunk, listener)),
        null !== listener)
      )
        return listener;
    }
  return null;
}
function wakeChunkIfInitialized(
  response,
  chunk,
  resolveListeners,
  rejectListeners
) {
  switch (chunk.status) {
    case "fulfilled":
      wakeChunk(response, resolveListeners, chunk.value, chunk);
      break;
    case "blocked":
      for (var i = 0; i < resolveListeners.length; i++) {
        var listener = resolveListeners[i];
        if ("function" !== typeof listener) {
          var cyclicHandler = resolveBlockedCycle(chunk, listener);
          if (null !== cyclicHandler)
            switch (
              (fulfillReference(response, listener, cyclicHandler.value, chunk),
              resolveListeners.splice(i, 1),
              i--,
              null !== rejectListeners &&
                ((listener = rejectListeners.indexOf(listener)),
                -1 !== listener && rejectListeners.splice(listener, 1)),
              chunk.status)
            ) {
              case "fulfilled":
                wakeChunk(response, resolveListeners, chunk.value, chunk);
                return;
              case "rejected":
                null !== rejectListeners &&
                  rejectChunk(response, rejectListeners, chunk.reason);
                return;
            }
        }
      }
    case "pending":
      if (chunk.value)
        for (response = 0; response < resolveListeners.length; response++)
          chunk.value.push(resolveListeners[response]);
      else chunk.value = resolveListeners;
      if (chunk.reason) {
        if (rejectListeners)
          for (
            resolveListeners = 0;
            resolveListeners < rejectListeners.length;
            resolveListeners++
          )
            chunk.reason.push(rejectListeners[resolveListeners]);
      } else chunk.reason = rejectListeners;
      break;
    case "rejected":
      rejectListeners && rejectChunk(response, rejectListeners, chunk.reason);
  }
}
function triggerErrorOnChunk(response, chunk, error) {
  if (
    "pending" !== chunk.status &&
    "pending_weak" !== chunk.status &&
    "blocked" !== chunk.status
  )
    chunk.reason.error(error);
  else {
    var listeners = chunk.reason;
    chunk.status = "rejected";
    chunk.reason = error;
    null !== listeners && rejectChunk(response, listeners, error);
  }
}
function createResolvedIteratorResultChunk(response, value, done) {
  return new ReactPromise(
    "resolved_model",
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + "}",
    response
  );
}
function resolveIteratorResultChunk(response, chunk, value, done) {
  resolveModelChunk(
    response,
    chunk,
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + "}"
  );
}
function resolveModelChunk(response, chunk, value) {
  if ("pending" !== chunk.status && "pending_weak" !== chunk.status)
    chunk.reason.enqueueModel(value);
  else {
    var resolveListeners = chunk.value,
      rejectListeners = chunk.reason;
    chunk.status = "resolved_model";
    chunk.value = value;
    chunk.reason = response;
    null !== resolveListeners &&
      (initializeModelChunk(chunk),
      wakeChunkIfInitialized(
        response,
        chunk,
        resolveListeners,
        rejectListeners
      ));
  }
}
function resolveModuleChunk(response, chunk, value) {
  if (
    "pending" === chunk.status ||
    "pending_weak" === chunk.status ||
    "blocked" === chunk.status
  ) {
    var resolveListeners = chunk.value,
      rejectListeners = chunk.reason;
    chunk.status = "resolved_module";
    chunk.value = value;
    chunk.reason = null;
    null !== resolveListeners &&
      (initializeModuleChunk(chunk),
      wakeChunkIfInitialized(
        response,
        chunk,
        resolveListeners,
        rejectListeners
      ));
  }
}
var initializingHandler = null;
function initializeModelChunk(chunk) {
  var prevHandler = initializingHandler;
  initializingHandler = null;
  var resolvedModel = chunk.value,
    response = chunk.reason;
  chunk.status = "blocked";
  chunk.value = null;
  chunk.reason = null;
  try {
    var value = parseModel(response, resolvedModel);
    resolvedModel = initializingHandler;
    if (null !== resolvedModel) {
      if (resolvedModel.errored) {
        "blocked" === chunk.status &&
          triggerErrorOnChunk(response, chunk, resolvedModel.reason);
        return;
      }
      resolvedModel.value = value;
      resolvedModel.chunk = chunk;
    }
    var listeners = chunk.value,
      rejectListeners = chunk.reason;
    chunk.value = null;
    chunk.reason = null;
    if (null !== listeners) {
      for (
        var cyclic = null, deferred = null, i = 0;
        i < listeners.length;
        i++
      ) {
        var listener = listeners[i];
        if (
          "function" !== typeof listener &&
          null !== resolveBlockedCycle(chunk, listener)
        ) {
          if (
            (null === cyclic && (cyclic = []),
            cyclic.push(listener),
            null !== rejectListeners)
          ) {
            var rejectionIdx = rejectListeners.indexOf(listener);
            -1 !== rejectionIdx && rejectListeners.splice(rejectionIdx, 1);
          }
        } else null === deferred && (deferred = []), deferred.push(listener);
      }
      null !== deferred &&
        ((chunk.value = deferred), (chunk.reason = rejectListeners));
      if (null !== cyclic)
        for (listeners = 0; listeners < cyclic.length; listeners++)
          fulfillReference(response, cyclic[listeners], value, chunk);
    }
    "blocked" !== chunk.status ||
      (null !== resolvedModel && 0 < resolvedModel.deps) ||
      initializeBlockedChunk(response, chunk, value, null);
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  } finally {
    initializingHandler = prevHandler;
  }
}
function initializeModuleChunk(chunk) {
  try {
    var value = requireModule(chunk.value);
    chunk.status = "fulfilled";
    chunk.value = value;
    chunk.reason = null;
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  }
}
function reportGlobalError(weakResponse, error) {
  weakResponse._closed = !0;
  weakResponse._closedReason = error;
  weakResponse._chunks.forEach(function (chunk) {
    "pending" === chunk.status
      ? triggerErrorOnChunk(weakResponse, chunk, error)
      : "fulfilled" === chunk.status &&
        null !== chunk.reason &&
        chunk.reason.error(error);
  });
}
function createLazyChunkWrapper(chunk) {
  return { $$typeof: REACT_LAZY_TYPE, _payload: chunk, _init: readChunk };
}
function getChunk(response, id) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  chunk ||
    ((chunk = response._closed
      ? response._allowPartialStream
        ? new ReactPromise("halted", null, null)
        : new ReactPromise("rejected", null, response._closedReason)
      : new ReactPromise("pending", null, null)),
    chunks.set(id, chunk));
  return chunk;
}
function initializeBlockedChunk(response, chunk, value, reason) {
  var resolveListeners = chunk.value;
  chunk.status = "fulfilled";
  chunk.value = value;
  chunk.reason = reason;
  null !== resolveListeners &&
    wakeChunk(response, resolveListeners, value, chunk);
}
function initializeChunkIfUnblocked(response, handler) {
  if (0 === handler.deps && !handler.errored) {
    var chunk = handler.chunk;
    null !== chunk &&
      "blocked" === chunk.status &&
      initializeBlockedChunk(response, chunk, handler.value, handler.reason);
  }
}
function fulfillReference(response, reference, value) {
  var handler = reference.handler,
    parentObject = reference.parentObject,
    key = reference.key,
    map = reference.map,
    path = reference.path;
  try {
    for (var i = 1; i < path.length; i++) {
      for (
        ;
        "object" === typeof value &&
        null !== value &&
        value.$$typeof === REACT_LAZY_TYPE;

      ) {
        var referencedChunk = value._payload;
        if (referencedChunk === handler.chunk) value = handler.value;
        else {
          switch (referencedChunk.status) {
            case "resolved_model":
              initializeModelChunk(referencedChunk);
              break;
            case "resolved_module":
              initializeModuleChunk(referencedChunk);
          }
          switch (referencedChunk.status) {
            case "fulfilled":
              value = referencedChunk.value;
              continue;
            case "blocked":
              var cyclicHandler = resolveBlockedCycle(
                referencedChunk,
                reference
              );
              if (null !== cyclicHandler) {
                value = cyclicHandler.value;
                continue;
              }
            case "pending":
            case "pending_weak":
              path.splice(0, i - 1);
              null === referencedChunk.value
                ? (referencedChunk.value = [reference])
                : referencedChunk.value.push(reference);
              null === referencedChunk.reason
                ? (referencedChunk.reason = [reference])
                : referencedChunk.reason.push(reference);
              return;
            case "halted":
              return;
            default:
              rejectReference(
                response,
                reference.handler,
                referencedChunk.reason
              );
              return;
          }
        }
      }
      var name = path[i];
      if (
        "object" === typeof value &&
        null !== value &&
        hasOwnProperty.call(value, name)
      )
        value = value[name];
      else throw Error("Invalid reference.");
    }
    for (
      ;
      "object" === typeof value &&
      null !== value &&
      value.$$typeof === REACT_LAZY_TYPE;

    ) {
      var referencedChunk$24 = value._payload;
      if (referencedChunk$24 === handler.chunk) value = handler.value;
      else {
        switch (referencedChunk$24.status) {
          case "resolved_model":
            initializeModelChunk(referencedChunk$24);
            break;
          case "resolved_module":
            initializeModuleChunk(referencedChunk$24);
        }
        switch (referencedChunk$24.status) {
          case "fulfilled":
            value = referencedChunk$24.value;
            continue;
        }
        break;
      }
    }
    var mappedValue = map(response, value, parentObject, key);
    "__proto__" !== key && (parentObject[key] = mappedValue);
    "" === key && null === handler.value && (handler.value = mappedValue);
    if (
      parentObject[0] === REACT_ELEMENT_TYPE &&
      "object" === typeof handler.value &&
      null !== handler.value &&
      handler.value.$$typeof === REACT_ELEMENT_TYPE
    ) {
      var element = handler.value;
      switch (key) {
        case "3":
          element.props = mappedValue;
      }
    }
  } catch (error) {
    rejectReference(response, reference.handler, error);
    return;
  }
  handler.deps--;
  initializeChunkIfUnblocked(response, handler);
}
function rejectReference(response, handler, error) {
  handler.errored ||
    ((handler.errored = !0),
    (handler.value = null),
    (handler.reason = error),
    (handler = handler.chunk),
    null !== handler &&
      "blocked" === handler.status &&
      triggerErrorOnChunk(response, handler, error));
}
function waitForReference(
  referencedChunk,
  parentObject,
  key,
  response,
  map,
  path
) {
  initializingHandler
    ? ((response = initializingHandler), response.deps++)
    : (response = initializingHandler =
        {
          parent: null,
          chunk: null,
          value: null,
          reason: null,
          deps: 1,
          errored: !1
        });
  parentObject = {
    handler: response,
    parentObject: parentObject,
    key: key,
    map: map,
    path: path
  };
  null === referencedChunk.value
    ? (referencedChunk.value = [parentObject])
    : referencedChunk.value.push(parentObject);
  null === referencedChunk.reason
    ? (referencedChunk.reason = [parentObject])
    : referencedChunk.reason.push(parentObject);
  return null;
}
function loadServerReference(response, metaData, parentObject, key) {
  if (!response._serverReferenceConfig)
    return createBoundServerReference(metaData, response._callServer);
  var serverReference = resolveServerReference(
      response._serverReferenceConfig,
      metaData.id
    ),
    promise = preloadModule(serverReference);
  if (promise)
    metaData.bound && (promise = Promise.all([promise, metaData.bound]));
  else if (metaData.bound) promise = Promise.resolve(metaData.bound);
  else
    return (
      (promise = requireModule(serverReference)),
      registerBoundServerReference(promise, metaData.id, metaData.bound),
      promise
    );
  if (initializingHandler) {
    var handler = initializingHandler;
    handler.deps++;
  } else
    handler = initializingHandler = {
      parent: null,
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: !1
    };
  promise.then(
    function () {
      var resolvedValue = requireModule(serverReference);
      if (metaData.bound) {
        var boundArgs = metaData.bound.value.slice(0);
        boundArgs.unshift(null);
        resolvedValue = resolvedValue.bind.apply(resolvedValue, boundArgs);
      }
      registerBoundServerReference(resolvedValue, metaData.id, metaData.bound);
      "__proto__" !== key && (parentObject[key] = resolvedValue);
      "" === key && null === handler.value && (handler.value = resolvedValue);
      if (
        parentObject[0] === REACT_ELEMENT_TYPE &&
        "object" === typeof handler.value &&
        null !== handler.value &&
        handler.value.$$typeof === REACT_ELEMENT_TYPE
      )
        switch (((boundArgs = handler.value), key)) {
          case "3":
            boundArgs.props = resolvedValue;
        }
      handler.deps--;
      initializeChunkIfUnblocked(response, handler);
    },
    function (error) {
      if (!handler.errored) {
        var erroredHandler = handler;
        erroredHandler.errored = !0;
        erroredHandler.value = null;
        erroredHandler.reason = error;
        erroredHandler = handler.chunk;
        null !== erroredHandler &&
          "blocked" === erroredHandler.status &&
          triggerErrorOnChunk(response, erroredHandler, error);
      }
    }
  );
  return null;
}
var EMPTY_REFERENCE_PATH = [];
function getOutlinedModel(response, reference, parentObject, key, map) {
  var id = parseInt(reference, 16);
  reference =
    -1 === reference.indexOf(":") ? EMPTY_REFERENCE_PATH : reference.split(":");
  id = getChunk(response, id);
  switch (id.status) {
    case "resolved_model":
      initializeModelChunk(id);
      break;
    case "resolved_module":
      initializeModuleChunk(id);
  }
  switch (id.status) {
    case "fulfilled":
      id = id.value;
      for (var i = 1; i < reference.length; i++) {
        for (
          ;
          "object" === typeof id &&
          null !== id &&
          id.$$typeof === REACT_LAZY_TYPE;

        ) {
          id = id._payload;
          switch (id.status) {
            case "resolved_model":
              initializeModelChunk(id);
              break;
            case "resolved_module":
              initializeModuleChunk(id);
          }
          switch (id.status) {
            case "fulfilled":
              id = id.value;
              break;
            case "blocked":
            case "pending":
            case "pending_weak":
              return waitForReference(
                id,
                parentObject,
                key,
                response,
                map,
                reference.slice(i - 1)
              );
            case "halted":
              return (
                initializingHandler
                  ? ((response = initializingHandler), response.deps++)
                  : (initializingHandler = {
                      parent: null,
                      chunk: null,
                      value: null,
                      reason: null,
                      deps: 1,
                      errored: !1
                    }),
                null
              );
            default:
              return (
                initializingHandler
                  ? ((response = initializingHandler),
                    (response.errored = !0),
                    (response.value = null),
                    (response.reason = id.reason))
                  : (initializingHandler = {
                      parent: null,
                      chunk: null,
                      value: null,
                      reason: id.reason,
                      deps: 0,
                      errored: !0
                    }),
                null
              );
          }
        }
        var name = reference[i];
        if (
          "object" !== typeof id ||
          null === id ||
          (getPrototypeOf(id) !== ObjectPrototype &&
            getPrototypeOf(id) !== ArrayPrototype) ||
          !hasOwnProperty.call(id, name)
        )
          throw Error("Invalid reference.");
        id = id[name];
      }
      for (
        ;
        "object" === typeof id &&
        null !== id &&
        id.$$typeof === REACT_LAZY_TYPE;

      ) {
        reference = id._payload;
        switch (reference.status) {
          case "resolved_model":
            initializeModelChunk(reference);
            break;
          case "resolved_module":
            initializeModuleChunk(reference);
        }
        switch (reference.status) {
          case "fulfilled":
            id = reference.value;
            continue;
        }
        break;
      }
      return map(response, id, parentObject, key);
    case "pending":
    case "pending_weak":
    case "blocked":
      return waitForReference(id, parentObject, key, response, map, reference);
    case "halted":
      return (
        initializingHandler
          ? ((response = initializingHandler), response.deps++)
          : (initializingHandler = {
              parent: null,
              chunk: null,
              value: null,
              reason: null,
              deps: 1,
              errored: !1
            }),
        null
      );
    default:
      return (
        initializingHandler
          ? ((response = initializingHandler),
            (response.errored = !0),
            (response.value = null),
            (response.reason = id.reason))
          : (initializingHandler = {
              parent: null,
              chunk: null,
              value: null,
              reason: id.reason,
              deps: 0,
              errored: !0
            }),
        null
      );
  }
}
function createMap(response, model) {
  return new Map(model);
}
function createSet(response, model) {
  return new Set(model);
}
function createBlob(response, model) {
  return new Blob(model.slice(1), { type: model[0] });
}
function createFormData(response, model) {
  response = new FormData();
  for (var i = 0; i < model.length; i++)
    response.append(model[i][0], model[i][1]);
  return response;
}
function extractIterator(response, model) {
  return model[Symbol.iterator]();
}
function createModel(response, model) {
  return model;
}
function parseModelString(response, parentObject, key, value) {
  if ("$" === value[0]) {
    if ("$" === value)
      return (
        null !== initializingHandler &&
          "0" === key &&
          (initializingHandler = {
            parent: initializingHandler,
            chunk: null,
            value: null,
            reason: null,
            deps: 0,
            errored: !1
          }),
        REACT_ELEMENT_TYPE
      );
    switch (value[1]) {
      case "$":
        return value.slice(1);
      case "L":
        return (
          (parentObject = parseInt(value.slice(2), 16)),
          (response = getChunk(response, parentObject)),
          createLazyChunkWrapper(response)
        );
      case "@":
        return (
          (parentObject = parseInt(value.slice(2), 16)),
          getChunk(response, parentObject)
        );
      case "w":
        return;
      case "S":
        return Symbol.for(value.slice(2));
      case "h":
        return (
          (value = value.slice(2)),
          getOutlinedModel(
            response,
            value,
            parentObject,
            key,
            loadServerReference
          )
        );
      case "T":
        parentObject = "$" + value.slice(2);
        response = response._tempRefs;
        if (null == response)
          throw Error(
            "Missing a temporary reference set but the RSC response returned a temporary reference. Pass a temporaryReference option with the set that was used with the reply."
          );
        return response.get(parentObject);
      case "Q":
        return (
          (value = value.slice(2)),
          getOutlinedModel(response, value, parentObject, key, createMap)
        );
      case "W":
        return (
          (value = value.slice(2)),
          getOutlinedModel(response, value, parentObject, key, createSet)
        );
      case "B":
        return (
          (value = value.slice(2)),
          getOutlinedModel(response, value, parentObject, key, createBlob)
        );
      case "K":
        return (
          (value = value.slice(2)),
          getOutlinedModel(response, value, parentObject, key, createFormData)
        );
      case "Z":
        return resolveErrorProd();
      case "i":
        return (
          (value = value.slice(2)),
          getOutlinedModel(response, value, parentObject, key, extractIterator)
        );
      case "I":
        return Infinity;
      case "-":
        return "$-0" === value ? -0 : -Infinity;
      case "N":
        return NaN;
      case "u":
        return;
      case "D":
        return new Date(Date.parse(value.slice(2)));
      case "n":
        return BigInt(value.slice(2));
      default:
        return (
          (value = value.slice(1)),
          getOutlinedModel(response, value, parentObject, key, createModel)
        );
    }
  }
  return value;
}
function missingCall() {
  throw Error(
    'Trying to call a function from "use server" but the callServer option was not implemented in your router runtime.'
  );
}
function ResponseInstance(
  bundlerConfig,
  serverReferenceConfig,
  moduleLoading,
  callServer,
  encodeFormAction,
  nonce,
  temporaryReferences,
  allowPartialStream
) {
  var chunks = new Map();
  this._bundlerConfig = bundlerConfig;
  this._serverReferenceConfig = serverReferenceConfig;
  this._moduleLoading = moduleLoading;
  this._callServer = void 0 !== callServer ? callServer : missingCall;
  this._encodeFormAction = encodeFormAction;
  this._nonce = nonce;
  this._chunks = chunks;
  this._stringDecoder = new TextDecoder();
  this._closed = !1;
  this._closedReason = null;
  this._allowPartialStream = allowPartialStream;
  this._tempRefs = temporaryReferences;
}
function resolveBuffer(response, id, buffer) {
  response = response._chunks;
  var chunk = response.get(id);
  chunk && "pending" !== chunk.status
    ? chunk.reason.enqueueValue(buffer)
    : ((buffer = new ReactPromise("fulfilled", buffer, null)),
      response.set(id, buffer));
}
function resolveModule(response, id, model) {
  var chunks = response._chunks,
    chunk = chunks.get(id),
    prevHandler = initializingHandler;
  initializingHandler = null;
  try {
    var clientReferenceMetadata = parseModel(response, model);
    if (null !== initializingHandler)
      throw Error(
        "A client reference was blocked on a row that has not been received yet. This is a bug in React."
      );
  } finally {
    initializingHandler = prevHandler;
  }
  var clientReference = clientReferenceMetadata;
  if ((model = preloadModule(clientReference))) {
    if (chunk) {
      var blockedChunk = chunk;
      blockedChunk.status = "blocked";
    } else
      (blockedChunk = new ReactPromise("blocked", null, null)),
        chunks.set(id, blockedChunk);
    model.then(
      function () {
        return resolveModuleChunk(response, blockedChunk, clientReference);
      },
      function (error) {
        return triggerErrorOnChunk(response, blockedChunk, error);
      }
    );
  } else
    chunk
      ? resolveModuleChunk(response, chunk, clientReference)
      : ((chunk = new ReactPromise("resolved_module", clientReference, null)),
        chunks.set(id, chunk));
}
function resolveStream(response, id, stream, controller) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  chunk
    ? "pending" === chunk.status &&
      ((id = chunk.value),
      (chunk.status = "fulfilled"),
      (chunk.value = stream),
      (chunk.reason = controller),
      null !== id && wakeChunk(response, id, chunk.value, chunk))
    : ((response = new ReactPromise("fulfilled", stream, controller)),
      chunks.set(id, response));
}
function startReadableStream(response, id, type) {
  var controller = null,
    closed = !1;
  type = new ReadableStream({
    type: type,
    start: function (c) {
      controller = c;
    }
  });
  var previousBlockedChunk = null;
  resolveStream(response, id, type, {
    enqueueValue: function (value) {
      null === previousBlockedChunk
        ? controller.enqueue(value)
        : previousBlockedChunk.then(function () {
            controller.enqueue(value);
          });
    },
    enqueueModel: function (json) {
      if (null === previousBlockedChunk) {
        var chunk = new ReactPromise("resolved_model", json, response);
        initializeModelChunk(chunk);
        "fulfilled" === chunk.status
          ? controller.enqueue(chunk.value)
          : (chunk.then(
              function (v) {
                return controller.enqueue(v);
              },
              function (e) {
                return controller.error(e);
              }
            ),
            (previousBlockedChunk = chunk));
      } else {
        chunk = previousBlockedChunk;
        var chunk$36 = new ReactPromise("pending", null, null);
        chunk$36.then(
          function (v) {
            return controller.enqueue(v);
          },
          function (e) {
            return controller.error(e);
          }
        );
        previousBlockedChunk = chunk$36;
        chunk.then(function () {
          previousBlockedChunk === chunk$36 && (previousBlockedChunk = null);
          resolveModelChunk(response, chunk$36, json);
        });
      }
    },
    close: function () {
      if (!closed)
        if (((closed = !0), null === previousBlockedChunk)) controller.close();
        else {
          var blockedChunk = previousBlockedChunk;
          previousBlockedChunk = null;
          blockedChunk.then(function () {
            return controller.close();
          });
        }
    },
    error: function (error) {
      if (!closed)
        if (((closed = !0), null === previousBlockedChunk))
          controller.error(error);
        else {
          var blockedChunk = previousBlockedChunk;
          previousBlockedChunk = null;
          blockedChunk.then(function () {
            return controller.error(error);
          });
        }
    }
  });
}
function asyncIterator() {
  return this;
}
function createIterator(next) {
  next = { next: next };
  next[ASYNC_ITERATOR] = asyncIterator;
  return next;
}
function startAsyncIterable(response, id, iterator) {
  var buffer = [],
    closed = !1,
    nextWriteIndex = 0,
    iterable = {};
  iterable[ASYNC_ITERATOR] = function () {
    var nextReadIndex = 0;
    return createIterator(function (arg) {
      if (void 0 !== arg)
        throw Error(
          "Values cannot be passed to next() of AsyncIterables passed to Client Components."
        );
      if (nextReadIndex === buffer.length) {
        if (closed)
          return new ReactPromise(
            "fulfilled",
            { done: !0, value: void 0 },
            null
          );
        buffer[nextReadIndex] = new ReactPromise("pending", null, null);
      }
      return buffer[nextReadIndex++];
    });
  };
  resolveStream(
    response,
    id,
    iterator ? iterable[ASYNC_ITERATOR]() : iterable,
    {
      enqueueValue: function (value) {
        if (nextWriteIndex === buffer.length)
          buffer[nextWriteIndex] = new ReactPromise(
            "fulfilled",
            { done: !1, value: value },
            null
          );
        else {
          var chunk = buffer[nextWriteIndex],
            resolveListeners = chunk.value,
            rejectListeners = chunk.reason;
          chunk.status = "fulfilled";
          chunk.value = { done: !1, value: value };
          chunk.reason = null;
          null !== resolveListeners &&
            wakeChunkIfInitialized(
              response,
              chunk,
              resolveListeners,
              rejectListeners
            );
        }
        nextWriteIndex++;
      },
      enqueueModel: function (value) {
        nextWriteIndex === buffer.length
          ? (buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
              response,
              value,
              !1
            ))
          : resolveIteratorResultChunk(
              response,
              buffer[nextWriteIndex],
              value,
              !1
            );
        nextWriteIndex++;
      },
      close: function (value) {
        if (!closed)
          for (
            closed = !0,
              nextWriteIndex === buffer.length
                ? (buffer[nextWriteIndex] = createResolvedIteratorResultChunk(
                    response,
                    value,
                    !0
                  ))
                : resolveIteratorResultChunk(
                    response,
                    buffer[nextWriteIndex],
                    value,
                    !0
                  ),
              nextWriteIndex++;
            nextWriteIndex < buffer.length;

          )
            resolveIteratorResultChunk(
              response,
              buffer[nextWriteIndex++],
              '"$undefined"',
              !0
            );
      },
      error: function (error) {
        if (!closed)
          for (
            closed = !0,
              nextWriteIndex === buffer.length &&
                (buffer[nextWriteIndex] = new ReactPromise(
                  "pending",
                  null,
                  null
                ));
            nextWriteIndex < buffer.length;

          )
            triggerErrorOnChunk(response, buffer[nextWriteIndex++], error);
      }
    }
  );
}
function resolveErrorProd() {
  var error = Error(
    "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error."
  );
  error.stack = "Error: " + error.message;
  return error;
}
function mergeBuffer(buffer, lastChunk) {
  for (var l = buffer.length, byteLength = lastChunk.length, i = 0; i < l; i++)
    byteLength += buffer[i].byteLength;
  byteLength = new Uint8Array(byteLength);
  for (var i$37 = (i = 0); i$37 < l; i$37++) {
    var chunk = buffer[i$37];
    byteLength.set(chunk, i);
    i += chunk.byteLength;
  }
  byteLength.set(lastChunk, i);
  return byteLength;
}
function resolveTypedArray(
  response,
  id,
  buffer,
  lastChunk,
  constructor,
  bytesPerElement
) {
  buffer =
    0 === buffer.length && 0 === lastChunk.byteOffset % bytesPerElement
      ? lastChunk
      : mergeBuffer(buffer, lastChunk);
  constructor = new constructor(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / bytesPerElement
  );
  resolveBuffer(response, id, constructor);
}
function processFullBinaryRow(response, streamState, id, tag, buffer, chunk) {
  switch (tag) {
    case 65:
      resolveBuffer(response, id, mergeBuffer(buffer, chunk).buffer);
      return;
    case 79:
      resolveTypedArray(response, id, buffer, chunk, Int8Array, 1);
      return;
    case 111:
      resolveBuffer(
        response,
        id,
        0 === buffer.length ? chunk : mergeBuffer(buffer, chunk)
      );
      return;
    case 85:
      resolveTypedArray(response, id, buffer, chunk, Uint8ClampedArray, 1);
      return;
    case 83:
      resolveTypedArray(response, id, buffer, chunk, Int16Array, 2);
      return;
    case 115:
      resolveTypedArray(response, id, buffer, chunk, Uint16Array, 2);
      return;
    case 76:
      resolveTypedArray(response, id, buffer, chunk, Int32Array, 4);
      return;
    case 108:
      resolveTypedArray(response, id, buffer, chunk, Uint32Array, 4);
      return;
    case 71:
      resolveTypedArray(response, id, buffer, chunk, Float32Array, 4);
      return;
    case 103:
      resolveTypedArray(response, id, buffer, chunk, Float64Array, 8);
      return;
    case 77:
      resolveTypedArray(response, id, buffer, chunk, BigInt64Array, 8);
      return;
    case 109:
      resolveTypedArray(response, id, buffer, chunk, BigUint64Array, 8);
      return;
    case 86:
      resolveTypedArray(response, id, buffer, chunk, DataView, 1);
      return;
  }
  streamState = response._stringDecoder;
  for (var row = "", i = 0; i < buffer.length; i++)
    row += streamState.decode(buffer[i], decoderOptions);
  buffer = row += streamState.decode(chunk);
  switch (tag) {
    case 73:
      resolveModule(response, id, buffer);
      break;
    case 72:
      id = buffer.slice(1);
      parseModel(response, id);
      break;
    case 69:
      tag = response._chunks;
      chunk = tag.get(id);
      buffer = JSON.parse(buffer);
      streamState = resolveErrorProd();
      streamState.digest = buffer.digest;
      chunk
        ? triggerErrorOnChunk(response, chunk, streamState)
        : ((response = new ReactPromise("rejected", null, streamState)),
          tag.set(id, response));
      break;
    case 84:
      response = response._chunks;
      (tag = response.get(id)) && "pending" !== tag.status
        ? tag.reason.enqueueValue(buffer)
        : ((buffer = new ReactPromise("fulfilled", buffer, null)),
          response.set(id, buffer));
      break;
    case 78:
    case 68:
    case 74:
    case 87:
      throw Error(
        "Failed to read a RSC payload created by a development version of React on the server while using a production version on the client. Always use matching versions on the server and the client."
      );
    case 82:
      startReadableStream(response, id, void 0);
      break;
    case 114:
      startReadableStream(response, id, "bytes");
      break;
    case 88:
      startAsyncIterable(response, id, !1);
      break;
    case 120:
      startAsyncIterable(response, id, !0);
      break;
    case 67:
      (id = response._chunks.get(id)) &&
        "fulfilled" === id.status &&
        id.reason.close("" === buffer ? '"$undefined"' : buffer);
      break;
    default:
      (tag = response._chunks),
        (chunk = tag.get(id))
          ? resolveModelChunk(response, chunk, buffer)
          : ((response = new ReactPromise("resolved_model", buffer, response)),
            tag.set(id, response));
  }
}
function parseModel(response, json) {
  json = JSON.parse(json);
  return reviveModel(response, json, { "": json }, "");
}
function reviveModel(response, value, parentObject, key) {
  if ("string" === typeof value)
    return "$" === value[0]
      ? parseModelString(response, parentObject, key, value)
      : value;
  if ("object" !== typeof value || null === value) return value;
  if (isArrayImpl(value)) {
    for (var i = 0; i < value.length; i++)
      value[i] = reviveModel(response, value[i], value, "" + i);
    return value[0] === REACT_ELEMENT_TYPE
      ? (value[0] === REACT_ELEMENT_TYPE
          ? ((response = {
              $$typeof: REACT_ELEMENT_TYPE,
              type: value[1],
              key: value[2],
              ref: null,
              props: value[3]
            }),
            null !== initializingHandler &&
              ((value = initializingHandler),
              (initializingHandler = value.parent),
              value.errored
                ? ((response = new ReactPromise(
                    "rejected",
                    null,
                    value.reason
                  )),
                  (response = createLazyChunkWrapper(response)))
                : 0 < value.deps &&
                  ((i = new ReactPromise("blocked", null, null)),
                  (value.value = response),
                  (value.chunk = i),
                  (response = createLazyChunkWrapper(i)))))
          : (response = value),
        response)
      : value;
  }
  for (i in value)
    hasOwnProperty.call(value, i) &&
      ("__proto__" === i
        ? delete value[i]
        : ((parentObject = reviveModel(response, value[i], value, i)),
          void 0 !== parentObject
            ? (value[i] = parentObject)
            : delete value[i]));
  return value;
}
function close(weakResponse) {
  weakResponse._allowPartialStream
    ? ((weakResponse._closed = !0),
      weakResponse._chunks.forEach(function (chunk) {
        "pending" === chunk.status
          ? ((chunk.status = "halted"),
            (chunk.value = null),
            (chunk.reason = null))
          : "fulfilled" === chunk.status &&
            null !== chunk.reason &&
            chunk.reason.close('"$undefined"');
      }))
    : reportGlobalError(weakResponse, Error("Connection closed."));
}
function createResponseFromOptions(options) {
  return new ResponseInstance(
    null,
    null,
    null,
    options && options.callServer ? options.callServer : void 0,
    void 0,
    void 0,
    options && options.temporaryReferences
      ? options.temporaryReferences
      : void 0,
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : !1
  );
}
function startReadingFromStream(response, stream, onDone) {
  function progress(_ref2) {
    var value = _ref2.value;
    if (_ref2.done) return onDone();
    var i = 0,
      rowState = streamState._rowState;
    _ref2 = streamState._rowID;
    for (
      var rowTag = streamState._rowTag,
        rowLength = streamState._rowLength,
        buffer = streamState._buffer,
        chunkLength = value.length;
      i < chunkLength;

    ) {
      var lastIdx = -1;
      switch (rowState) {
        case 0:
          lastIdx = value[i++];
          58 === lastIdx
            ? (rowState = 1)
            : (_ref2 =
                (_ref2 << 4) | (96 < lastIdx ? lastIdx - 87 : lastIdx - 48));
          continue;
        case 1:
          rowState = value[i];
          84 === rowState ||
          65 === rowState ||
          79 === rowState ||
          111 === rowState ||
          98 === rowState ||
          85 === rowState ||
          83 === rowState ||
          115 === rowState ||
          76 === rowState ||
          108 === rowState ||
          71 === rowState ||
          103 === rowState ||
          77 === rowState ||
          109 === rowState ||
          86 === rowState
            ? ((rowTag = rowState), (rowState = 2), i++)
            : (64 < rowState && 91 > rowState) ||
                35 === rowState ||
                114 === rowState ||
                120 === rowState
              ? ((rowTag = rowState), (rowState = 3), i++)
              : ((rowTag = 0), (rowState = 3));
          continue;
        case 2:
          lastIdx = value[i++];
          44 === lastIdx
            ? (rowState = 4)
            : (rowLength =
                (rowLength << 4) |
                (96 < lastIdx ? lastIdx - 87 : lastIdx - 48));
          continue;
        case 3:
          lastIdx = value.indexOf(10, i);
          break;
        case 4:
          (lastIdx = i + rowLength), lastIdx > value.length && (lastIdx = -1);
      }
      var offset = value.byteOffset + i;
      if (-1 < lastIdx)
        (rowLength = new Uint8Array(value.buffer, offset, lastIdx - i)),
          98 === rowTag
            ? resolveBuffer(
                response,
                _ref2,
                lastIdx === chunkLength ? rowLength : rowLength.slice()
              )
            : processFullBinaryRow(
                response,
                streamState,
                _ref2,
                rowTag,
                buffer,
                rowLength
              ),
          (i = lastIdx),
          3 === rowState && i++,
          (rowLength = _ref2 = rowTag = rowState = 0),
          (buffer.length = 0);
      else {
        value = new Uint8Array(value.buffer, offset, value.byteLength - i);
        98 === rowTag
          ? ((rowLength -= value.byteLength),
            resolveBuffer(response, _ref2, value))
          : (buffer.push(value), (rowLength -= value.byteLength));
        break;
      }
    }
    streamState._rowState = rowState;
    streamState._rowID = _ref2;
    streamState._rowTag = rowTag;
    streamState._rowLength = rowLength;
    return reader.read().then(progress).catch(error);
  }
  function error(e) {
    reportGlobalError(response, e);
  }
  var streamState = {
      _rowState: 0,
      _rowID: 0,
      _rowTag: 0,
      _rowLength: 0,
      _buffer: []
    },
    reader = stream.getReader();
  reader.read().then(progress).catch(error);
}
exports.createFromFetch = function (promiseForResponse, options) {
  var response = createResponseFromOptions(options);
  promiseForResponse.then(
    function (r) {
      startReadingFromStream(response, r.body, close.bind(null, response));
    },
    function (e) {
      reportGlobalError(response, e);
    }
  );
  return getChunk(response, 0);
};
exports.createFromReadableStream = function (stream, options) {
  options = createResponseFromOptions(options);
  startReadingFromStream(options, stream, close.bind(null, options));
  return getChunk(options, 0);
};
exports.createServerReference = function (id, callServer) {
  function action() {
    var args = Array.prototype.slice.call(arguments);
    return callServer(id, args);
  }
  registerBoundServerReference(action, id, null);
  return action;
};
exports.createTemporaryReferenceSet = function () {
  return new Map();
};
exports.encodeReply = function (value, options) {
  return new Promise(function (resolve, reject) {
    processReply(
      value,
      "",
      options && options.temporaryReferences
        ? options.temporaryReferences
        : void 0,
      resolve,
      reject,
      options ? options.signal : void 0
    );
  });
};
exports.registerServerReference = function (reference, id) {
  registerBoundServerReference(reference, id, null);
  return reference;
};
