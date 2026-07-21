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
var React = require("react"),
  enableViewTransition = require("ReactFeatureFlags").enableViewTransition,
  currentView = null,
  writtenBytes = 0,
  destinationHasCapacity = !0;
function writeChunk(destination, chunk) {
  if ("string" === typeof chunk) {
    if (0 !== chunk.length)
      if (4096 < 3 * chunk.length)
        0 < writtenBytes &&
          (writeToDestination(
            destination,
            currentView.subarray(0, writtenBytes)
          ),
          (currentView = new Uint8Array(4096)),
          (writtenBytes = 0)),
          writeToDestination(destination, chunk);
      else {
        var target = currentView;
        0 < writtenBytes && (target = currentView.subarray(writtenBytes));
        target = textEncoder.encodeInto(chunk, target);
        var read = target.read;
        writtenBytes += target.written;
        read < chunk.length &&
          (writeToDestination(
            destination,
            currentView.subarray(0, writtenBytes)
          ),
          (currentView = new Uint8Array(4096)),
          (writtenBytes = textEncoder.encodeInto(
            chunk.slice(read),
            currentView
          ).written));
        4096 === writtenBytes &&
          (writeToDestination(destination, currentView),
          (currentView = new Uint8Array(4096)),
          (writtenBytes = 0));
      }
  } else
    0 !== chunk.byteLength &&
      (4096 < chunk.byteLength
        ? (0 < writtenBytes &&
            (writeToDestination(
              destination,
              currentView.subarray(0, writtenBytes)
            ),
            (currentView = new Uint8Array(4096)),
            (writtenBytes = 0)),
          writeToDestination(destination, chunk))
        : ((target = currentView.length - writtenBytes),
          target < chunk.byteLength &&
            (0 === target
              ? writeToDestination(destination, currentView)
              : (currentView.set(chunk.subarray(0, target), writtenBytes),
                (writtenBytes += target),
                writeToDestination(destination, currentView),
                (chunk = chunk.subarray(target))),
            (currentView = new Uint8Array(4096)),
            (writtenBytes = 0)),
          currentView.set(chunk, writtenBytes),
          (writtenBytes += chunk.byteLength),
          4096 === writtenBytes &&
            (writeToDestination(destination, currentView),
            (currentView = new Uint8Array(4096)),
            (writtenBytes = 0))));
}
function writeToDestination(destination, view) {
  destination = destination.write(view);
  destinationHasCapacity = destinationHasCapacity && destination;
}
function writeChunkAndReturn(destination, chunk) {
  writeChunk(destination, chunk);
  return destinationHasCapacity;
}
var textEncoder = new TextEncoder();
function byteLengthOfChunk(chunk) {
  return "string" === typeof chunk
    ? Buffer.byteLength(chunk, "utf8")
    : chunk.byteLength;
}
var CLIENT_REFERENCE_TAG$1 = Symbol.for("react.client.reference"),
  SERVER_REFERENCE_TAG = Symbol.for("react.server.reference"),
  FunctionBind = Function.prototype.bind,
  ArraySlice = Array.prototype.slice;
function bind() {
  var newFn = FunctionBind.apply(this, arguments);
  if (this.$$typeof === SERVER_REFERENCE_TAG) {
    var args = ArraySlice.call(arguments, 1),
      $$typeof = { value: SERVER_REFERENCE_TAG },
      $$id = { value: this.$$id };
    args = { value: this.$$bound ? this.$$bound.concat(args) : args };
    return Object.defineProperties(newFn, {
      $$typeof: $$typeof,
      $$id: $$id,
      $$bound: args,
      bind: { value: bind, configurable: !0 }
    });
  }
  return newFn;
}
var serverReferenceToString = {
    value: function () {
      return "function () { [omitted code] }";
    },
    configurable: !0,
    writable: !0
  },
  TEMPORARY_REFERENCE_TAG = Symbol.for("react.temporary.reference"),
  proxyHandlers = {
    get: function (target, name, receiver) {
      switch (name) {
        case "$$typeof":
          return target.$$typeof;
        case "name":
          return;
        case "displayName":
          return;
        case "defaultProps":
          return;
        case "_debugInfo":
          return;
        case "toJSON":
          return;
        case Symbol.toPrimitive:
          return Object.prototype[Symbol.toPrimitive];
        case Symbol.toStringTag:
          return Object.prototype[Symbol.toStringTag];
        case "Provider":
          return receiver;
        case "then":
          return;
      }
      throw Error(
        "Cannot access " +
          String(name) +
          " on the server. You cannot dot into a temporary client reference from a server component. You can only pass the value through to the client."
      );
    },
    set: function () {
      throw Error(
        "Cannot assign to a temporary client reference from a server module."
      );
    }
  };
function createTemporaryReference(temporaryReferences, id) {
  var reference = Object.defineProperties(
    function () {
      throw Error(
        "Attempted to call a temporary Client Reference from the server but it is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."
      );
    },
    { $$typeof: { value: TEMPORARY_REFERENCE_TAG } }
  );
  reference = new Proxy(reference, proxyHandlers);
  temporaryReferences.set(reference, id);
  return reference;
}
var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
  REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var ASYNC_ITERATOR = Symbol.asyncIterator,
  REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key");
function noop() {}
var SuspenseException = Error(
  "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
);
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      thenableState = thenable.reason;
      if (void 0 === thenableState && !("reason" in thenable))
        throw Error(
          "A rejected Promise was passed to React without a `reason` property. React threw a generic error from where the Promise was used to assist in identifying the problematic Promise. Make sure that instrumented Promises correctly set the `reason` property when setting `status` to `'rejected'`."
        );
      throw thenableState;
    default:
      "string" === typeof thenable.status
        ? thenable.then(noop, noop)
        : ((thenableState = thenable),
          (thenableState.status = "pending"),
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable)
    throw Error(
      "Expected a suspended thenable. This is a bug in React. Please file an issue."
    );
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
var currentRequest$1 = null,
  thenableIndexCounter = 0,
  thenableState = null;
function getThenableStateAfterSuspending() {
  var state = thenableState || [];
  thenableState = null;
  return state;
}
var HooksDispatcher = {
  readContext: unsupportedContext,
  use: use,
  useCallback: function (callback) {
    return callback;
  },
  useContext: unsupportedContext,
  useEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useInsertionEffect: unsupportedHook,
  useMemo: function (nextCreate) {
    return nextCreate();
  },
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useDebugValue: function () {},
  useDeferredValue: unsupportedHook,
  useTransition: unsupportedHook,
  useSyncExternalStore: unsupportedHook,
  useId: useId,
  useHostTransitionStatus: unsupportedHook,
  useFormState: unsupportedHook,
  useActionState: unsupportedHook,
  useOptimistic: unsupportedHook,
  useMemoCache: function (size) {
    for (var data = Array(size), i = 0; i < size; i++)
      data[i] = REACT_MEMO_CACHE_SENTINEL;
    return data;
  },
  useCacheRefresh: function () {
    return unsupportedRefresh;
  },
  useEffectEvent: unsupportedHook
};
function unsupportedHook() {
  throw Error("This Hook is not supported in Server Components.");
}
function unsupportedRefresh() {
  throw Error("Refreshing the cache is not supported in Server Components.");
}
function unsupportedContext() {
  throw Error("Cannot read a Client Context from a Server Component.");
}
function useId() {
  if (null === currentRequest$1)
    throw Error("useId can only be used while React is rendering");
  var id = currentRequest$1.identifierCount++;
  return "_" + currentRequest$1.identifierPrefix + "S_" + id.toString(32) + "_";
}
function use(usable) {
  if (
    (null !== usable && "object" === typeof usable) ||
    "function" === typeof usable
  ) {
    if ("function" === typeof usable.then) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      null === thenableState && (thenableState = []);
      return trackUsedThenable(thenableState, usable, index);
    }
    usable.$$typeof === REACT_CONTEXT_TYPE && unsupportedContext();
  }
  if (usable.$$typeof === CLIENT_REFERENCE_TAG$1) {
    if (null != usable.value && usable.value.$$typeof === REACT_CONTEXT_TYPE)
      throw Error("Cannot read a Client Context from a Server Component.");
    throw Error("Cannot use() an already resolved Client Reference.");
  }
  throw Error("An unsupported type was passed to use(): " + String(usable));
}
var DefaultAsyncDispatcher = {
    getCacheForType: function (resourceType) {
      var JSCompiler_inline_result = (JSCompiler_inline_result = currentRequest
        ? currentRequest
        : null)
        ? JSCompiler_inline_result.cache
        : new Map();
      var entry = JSCompiler_inline_result.get(resourceType);
      void 0 === entry &&
        ((entry = resourceType()),
        JSCompiler_inline_result.set(resourceType, entry));
      return entry;
    },
    cacheSignal: function () {
      var request = currentRequest ? currentRequest : null;
      return request ? request.cacheController.signal : null;
    }
  },
  ReactSharedInternalsServer =
    React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (!ReactSharedInternalsServer)
  throw Error(
    'The "react" package in this environment is not configured correctly. The "react-server" condition must be enabled in any environment that runs React Server Components.'
  );
var isArrayImpl = Array.isArray,
  getPrototypeOf = Object.getPrototypeOf;
function objectName(object) {
  object = Object.prototype.toString.call(object);
  return object.slice(8, object.length - 1);
}
function describeValueForErrorMessage(value) {
  switch (typeof value) {
    case "string":
      return JSON.stringify(
        10 >= value.length ? value : value.slice(0, 10) + "..."
      );
    case "object":
      if (isArrayImpl(value)) return "[...]";
      if (null !== value && value.$$typeof === CLIENT_REFERENCE_TAG)
        return "client";
      value = objectName(value);
      return "Object" === value ? "{...}" : value;
    case "function":
      return value.$$typeof === CLIENT_REFERENCE_TAG
        ? "client"
        : (value = value.displayName || value.name)
          ? "function " + value
          : "function";
    default:
      return String(value);
  }
}
function describeElementType(type) {
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) return "ViewTransition";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeElementType(type.render);
      case REACT_MEMO_TYPE:
        return describeElementType(type.type);
      case REACT_LAZY_TYPE:
        var payload = type._payload;
        type = type._init;
        try {
          return describeElementType(type(payload));
        } catch (x) {}
    }
  return "";
}
var CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference");
function describeObjectForErrorMessage(objectOrArray, expandedName) {
  var objKind = objectName(objectOrArray);
  if ("Object" !== objKind && "Array" !== objKind) return objKind;
  objKind = -1;
  var length = 0;
  if (isArrayImpl(objectOrArray)) {
    var str = "[";
    for (var i = 0; i < objectOrArray.length; i++) {
      0 < i && (str += ", ");
      var value = objectOrArray[i];
      value =
        "object" === typeof value && null !== value
          ? describeObjectForErrorMessage(value)
          : describeValueForErrorMessage(value);
      "" + i === expandedName
        ? ((objKind = str.length), (length = value.length), (str += value))
        : (str =
            10 > value.length && 40 > str.length + value.length
              ? str + value
              : str + "...");
    }
    str += "]";
  } else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
    str = "<" + describeElementType(objectOrArray.type) + "/>";
  else {
    if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) return "client";
    str = "{";
    i = Object.keys(objectOrArray);
    for (value = 0; value < i.length; value++) {
      0 < value && (str += ", ");
      var name = i[value],
        encodedKey = JSON.stringify(name);
      str += ('"' + name + '"' === encodedKey ? name : encodedKey) + ": ";
      encodedKey = objectOrArray[name];
      encodedKey =
        "object" === typeof encodedKey && null !== encodedKey
          ? describeObjectForErrorMessage(encodedKey)
          : describeValueForErrorMessage(encodedKey);
      name === expandedName
        ? ((objKind = str.length),
          (length = encodedKey.length),
          (str += encodedKey))
        : (str =
            10 > encodedKey.length && 40 > str.length + encodedKey.length
              ? str + encodedKey
              : str + "...");
    }
    str += "}";
  }
  return void 0 === expandedName
    ? str
    : -1 < objKind && 0 < length
      ? ((objectOrArray = " ".repeat(objKind) + "^".repeat(length)),
        "\n  " + str + "\n  " + objectOrArray)
      : "\n  " + str;
}
var hasOwnProperty = Object.prototype.hasOwnProperty,
  ObjectPrototype$1 = Object.prototype,
  stringify = JSON.stringify,
  NEXT_TWO_CHUNKS_ARE_ATOMIC = Symbol();
function defaultErrorHandler(error) {
  console.error(error);
}
function RequestInstance(
  type,
  model,
  bundlerConfig,
  onError,
  onAllReady,
  onFatalError,
  identifierPrefix,
  temporaryReferences
) {
  if (
    null !== ReactSharedInternalsServer.A &&
    ReactSharedInternalsServer.A !== DefaultAsyncDispatcher
  )
    throw Error("Currently React only supports one RSC renderer at a time.");
  ReactSharedInternalsServer.A = DefaultAsyncDispatcher;
  var abortSet = new Set(),
    pingedTasks = [],
    hints = new Set();
  this.type = type;
  this.status = 10;
  this.flushScheduled = !1;
  this.destination = this.fatalError = null;
  this.bundlerConfig = bundlerConfig;
  this.cache = new Map();
  this.cacheController = new AbortController();
  this.pendingChunks = this.nextChunkId = 0;
  this.hints = hints;
  this.abortableTasks = abortSet;
  this.pingedTasks = pingedTasks;
  this.completedImportChunks = [];
  this.completedHintChunks = [];
  this.completedRegularChunks = [];
  this.completedErrorChunks = [];
  this.writtenSymbols = new Map();
  this.writtenClientReferences = new Map();
  this.writtenServerReferences = new Map();
  this.writtenObjects = new WeakMap();
  this.temporaryReferences = temporaryReferences;
  this.identifierPrefix = identifierPrefix || "";
  this.identifierCount = 1;
  this.taintCleanupQueue = [];
  this.onError = void 0 === onError ? defaultErrorHandler : onError;
  this.onAllReady = onAllReady;
  this.onFatalError = onFatalError;
  type = createTask(this, model, null, !1, 0, abortSet);
  pingedTasks.push(type);
}
var currentRequest = null;
function serializeThenable(request, task, thenable) {
  var newTask = createTask(
    request,
    thenable,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
    request.abortableTasks
  );
  switch (thenable.status) {
    case "fulfilled":
      return (
        (newTask.model = thenable.value), pingTask(request, newTask), newTask.id
      );
    case "rejected":
      return erroredTask(request, newTask, thenable.reason), newTask.id;
    default:
      if (12 === request.status)
        return (
          request.abortableTasks.delete(newTask),
          21 === request.type
            ? (haltTask(newTask), finishHaltedTask(newTask, request))
            : ((task = request.fatalError),
              abortTask(newTask),
              finishAbortedTask(newTask, request, task)),
          newTask.id
        );
      "string" !== typeof thenable.status &&
        ((thenable.status = "pending"),
        thenable.then(
          function (fulfilledValue) {
            "pending" === thenable.status &&
              ((thenable.status = "fulfilled"),
              (thenable.value = fulfilledValue));
          },
          function (error) {
            "pending" === thenable.status &&
              ((thenable.status = "rejected"), (thenable.reason = error));
          }
        ));
  }
  thenable.then(
    function (value) {
      newTask.model = value;
      pingTask(request, newTask);
    },
    function (reason) {
      0 === newTask.status &&
        (erroredTask(request, newTask, reason), enqueueFlush(request));
    }
  );
  return newTask.id;
}
function serializeReadableStream(request, task, stream) {
  function progress(entry) {
    if (0 === streamTask.status)
      if (entry.done)
        (streamTask.status = 1),
          (entry = streamTask.id.toString(16) + ":C\n"),
          request.completedRegularChunks.push(entry),
          request.abortableTasks.delete(streamTask),
          request.cacheController.signal.removeEventListener(
            "abort",
            abortStream
          ),
          enqueueFlush(request),
          callOnAllReadyIfReady(request);
      else
        try {
          request.pendingChunks++,
            (streamTask.model = entry.value),
            isByteStream
              ? emitTypedArrayChunk(
                  request,
                  streamTask.id,
                  "b",
                  streamTask.model,
                  !1
                )
              : tryStreamTask(request, streamTask),
            enqueueFlush(request),
            reader.read().then(progress, error);
        } catch (x$11) {
          error(x$11);
        }
  }
  function error(reason) {
    0 === streamTask.status &&
      (request.cacheController.signal.removeEventListener("abort", abortStream),
      erroredTask(request, streamTask, reason),
      enqueueFlush(request),
      reader.cancel(reason).then(error, error));
  }
  function abortStream() {
    if (0 === streamTask.status) {
      var signal = request.cacheController.signal;
      signal.removeEventListener("abort", abortStream);
      signal = signal.reason;
      21 === request.type
        ? (request.abortableTasks.delete(streamTask),
          haltTask(streamTask),
          finishHaltedTask(streamTask, request))
        : (erroredTask(request, streamTask, signal), enqueueFlush(request));
      reader.cancel(signal).then(error, error);
    }
  }
  var supportsBYOB = stream.supportsBYOB;
  if (void 0 === supportsBYOB)
    try {
      stream.getReader({ mode: "byob" }).releaseLock(), (supportsBYOB = !0);
    } catch (x) {
      supportsBYOB = !1;
    }
  var isByteStream = supportsBYOB,
    reader = stream.getReader(),
    streamTask = createTask(
      request,
      task.model,
      task.keyPath,
      task.implicitSlot,
      task.formatContext,
      request.abortableTasks
    );
  request.pendingChunks++;
  task = streamTask.id.toString(16) + ":" + (isByteStream ? "r" : "R") + "\n";
  request.completedRegularChunks.push(task);
  request.cacheController.signal.addEventListener("abort", abortStream);
  reader.read().then(progress, error);
  return serializeByValueID(streamTask.id);
}
function serializeAsyncIterable(request, task, iterable, iterator) {
  function progress(entry) {
    if (0 === streamTask.status)
      if (entry.done) {
        streamTask.status = 1;
        if (void 0 === entry.value)
          var endStreamRow = streamTask.id.toString(16) + ":C\n";
        else
          try {
            var chunkId = outlineModelWithFormatContext(
              request,
              entry.value,
              0
            );
            endStreamRow =
              streamTask.id.toString(16) +
              ":C" +
              stringify(serializeByValueID(chunkId)) +
              "\n";
          } catch (x) {
            error(x);
            return;
          }
        request.completedRegularChunks.push(endStreamRow);
        request.abortableTasks.delete(streamTask);
        request.cacheController.signal.removeEventListener(
          "abort",
          abortIterable
        );
        enqueueFlush(request);
        callOnAllReadyIfReady(request);
      } else
        try {
          (streamTask.model = entry.value),
            request.pendingChunks++,
            tryStreamTask(request, streamTask),
            enqueueFlush(request),
            iterator.next().then(progress, error);
        } catch (x$12) {
          error(x$12);
        }
  }
  function error(reason) {
    0 === streamTask.status &&
      (request.cacheController.signal.removeEventListener(
        "abort",
        abortIterable
      ),
      erroredTask(request, streamTask, reason),
      enqueueFlush(request),
      "function" === typeof iterator.throw &&
        iterator.throw(reason).then(noop, noop));
  }
  function abortIterable() {
    if (0 === streamTask.status) {
      var signal = request.cacheController.signal;
      signal.removeEventListener("abort", abortIterable);
      var reason = signal.reason;
      21 === request.type
        ? (request.abortableTasks.delete(streamTask),
          haltTask(streamTask),
          finishHaltedTask(streamTask, request))
        : (erroredTask(request, streamTask, signal.reason),
          enqueueFlush(request));
      "function" === typeof iterator.throw &&
        iterator.throw(reason).then(noop, noop);
    }
  }
  iterable = iterable === iterator;
  var streamTask = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
    request.abortableTasks
  );
  request.pendingChunks++;
  task = streamTask.id.toString(16) + ":" + (iterable ? "x" : "X") + "\n";
  request.completedRegularChunks.push(task);
  request.cacheController.signal.addEventListener("abort", abortIterable);
  iterator.next().then(progress, error);
  return serializeByValueID(streamTask.id);
}
function readThenable(thenable) {
  if ("fulfilled" === thenable.status) return thenable.value;
  if ("rejected" === thenable.status) throw thenable.reason;
  throw thenable;
}
function createLazyWrapperAroundWakeable(request, task, wakeable) {
  switch (wakeable.status) {
    case "fulfilled":
      return wakeable.value;
    case "rejected":
      break;
    default:
      "string" !== typeof wakeable.status &&
        ((wakeable.status = "pending"),
        wakeable.then(
          function (fulfilledValue) {
            "pending" === wakeable.status &&
              ((wakeable.status = "fulfilled"),
              (wakeable.value = fulfilledValue));
          },
          function (error) {
            "pending" === wakeable.status &&
              ((wakeable.status = "rejected"), (wakeable.reason = error));
          }
        ));
  }
  return { $$typeof: REACT_LAZY_TYPE, _payload: wakeable, _init: readThenable };
}
function voidHandler() {}
function processServerComponentReturnValue(request, task, Component, result) {
  if (
    "object" !== typeof result ||
    null === result ||
    result.$$typeof === CLIENT_REFERENCE_TAG$1
  )
    return result;
  if ("function" === typeof result.then)
    return createLazyWrapperAroundWakeable(request, task, result);
  var iteratorFn = getIteratorFn(result);
  return iteratorFn
    ? ((request = {}),
      (request[Symbol.iterator] = function () {
        return iteratorFn.call(result);
      }),
      request)
    : "function" !== typeof result[ASYNC_ITERATOR] ||
        ("function" === typeof ReadableStream &&
          result instanceof ReadableStream)
      ? result
      : ((request = {}),
        (request[ASYNC_ITERATOR] = function () {
          return result[ASYNC_ITERATOR]();
        }),
        request);
}
function renderFunctionComponent(request, task, key, Component, props) {
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  props = Component(props, void 0);
  if (12 === request.status)
    throw (
      ("object" === typeof props &&
        null !== props &&
        "function" === typeof props.then &&
        props.$$typeof !== CLIENT_REFERENCE_TAG$1 &&
        props.then(voidHandler, voidHandler),
      null)
    );
  props = processServerComponentReturnValue(request, task, Component, props);
  Component = task.keyPath;
  prevThenableState = task.implicitSlot;
  null !== key
    ? (task.keyPath =
        key === REACT_OPTIMISTIC_KEY || Component === REACT_OPTIMISTIC_KEY
          ? REACT_OPTIMISTIC_KEY
          : null === Component
            ? key
            : Component + "," + key)
    : null === Component && (task.implicitSlot = !0);
  request = renderModelDestructive(request, task, emptyRoot, "", props);
  task.keyPath = Component;
  task.implicitSlot = prevThenableState;
  return request;
}
function renderFragment(request, task, children) {
  return null !== task.keyPath
    ? ((request = [
        REACT_ELEMENT_TYPE,
        REACT_FRAGMENT_TYPE,
        task.keyPath,
        { children: children }
      ]),
      task.implicitSlot ? [request] : request)
    : children;
}
var serializedSize = 0;
function deferTask(request, task) {
  task = createTask(
    request,
    task.model,
    task.keyPath,
    task.implicitSlot,
    task.formatContext,
    request.abortableTasks
  );
  pingTask(request, task);
  return serializeLazyID(task.id);
}
function renderElement(request, task, type, key, ref, props) {
  if (null !== ref && void 0 !== ref)
    throw Error(
      "Refs cannot be used in Server Components, nor passed to Client Components."
    );
  if (
    "function" === typeof type &&
    type.$$typeof !== CLIENT_REFERENCE_TAG$1 &&
    type.$$typeof !== TEMPORARY_REFERENCE_TAG
  )
    return renderFunctionComponent(request, task, key, type, props);
  if (type === REACT_FRAGMENT_TYPE && null === key)
    return (
      (type = task.implicitSlot),
      null === task.keyPath && (task.implicitSlot = !0),
      (props = renderModelDestructive(
        request,
        task,
        emptyRoot,
        "",
        props.children
      )),
      (task.implicitSlot = type),
      props
    );
  if (
    null != type &&
    "object" === typeof type &&
    type.$$typeof !== CLIENT_REFERENCE_TAG$1
  )
    switch (type.$$typeof) {
      case REACT_LAZY_TYPE:
        var init = type._init;
        type = init(type._payload);
        if (12 === request.status) throw null;
        return renderElement(request, task, type, key, ref, props);
      case REACT_FORWARD_REF_TYPE:
        return renderFunctionComponent(request, task, key, type.render, props);
      case REACT_MEMO_TYPE:
        return renderElement(request, task, type.type, key, ref, props);
    }
  else
    "string" === typeof type &&
      ((ref = task.formatContext),
      ref !== ref &&
        null != props.children &&
        outlineModelWithFormatContext(request, props.children, ref));
  request = key;
  key = task.keyPath;
  null === request
    ? (request = key)
    : null !== key &&
      (request =
        key === REACT_OPTIMISTIC_KEY || request === REACT_OPTIMISTIC_KEY
          ? REACT_OPTIMISTIC_KEY
          : key + "," + request);
  props = [REACT_ELEMENT_TYPE, type, request, props];
  task = task.implicitSlot && null !== request ? [props] : props;
  return task;
}
function pingTask(request, task) {
  var pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  1 === pingedTasks.length &&
    ((request.flushScheduled = null !== request.destination),
    21 === request.type || 10 === request.status
      ? Promise.resolve().then(function () {
          return performWork(request);
        })
      : setImmediate(function () {
          return performWork(request);
        }));
}
function createTask(
  request,
  model,
  keyPath,
  implicitSlot,
  formatContext,
  abortSet
) {
  request.pendingChunks++;
  var id = request.nextChunkId++;
  "object" !== typeof model ||
    null === model ||
    null !== keyPath ||
    implicitSlot ||
    request.writtenObjects.set(model, serializeByValueID(id));
  var task = {
    id: id,
    status: 0,
    model: model,
    keyPath: keyPath,
    implicitSlot: implicitSlot,
    formatContext: formatContext,
    ping: function () {
      return pingTask(request, task);
    },
    thenableState: null
  };
  abortSet.add(task);
  return task;
}
function resolveModel(request, task, parent, parentPropertyName, value) {
  var jsonValue = value;
  null !== value &&
    "object" === typeof value &&
    "function" === typeof value.toJSON &&
    (jsonValue = value.toJSON(parentPropertyName));
  serializedSize += parentPropertyName.length;
  value = task.keyPath;
  var prevImplicitSlot = task.implicitSlot;
  try {
    var JSCompiler_inline_result = renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      jsonValue
    );
  } catch (thrownValue) {
    (parent = task.model),
      (parent =
        "object" === typeof parent &&
        null !== parent &&
        (parent.$$typeof === REACT_ELEMENT_TYPE ||
          parent.$$typeof === REACT_LAZY_TYPE)),
      12 === request.status
        ? ((task.status = 3),
          21 === request.type
            ? ((value = request.nextChunkId++),
              (value = parent
                ? serializeLazyID(value)
                : serializeByValueID(value)),
              (JSCompiler_inline_result = value))
            : ((value = request.fatalError),
              (JSCompiler_inline_result = parent
                ? serializeLazyID(value)
                : serializeByValueID(value))))
        : ((parentPropertyName =
            thrownValue === SuspenseException
              ? getSuspendedThenable()
              : thrownValue),
          "object" === typeof parentPropertyName &&
          null !== parentPropertyName &&
          "function" === typeof parentPropertyName.then
            ? ((jsonValue = createTask(
                request,
                task.model,
                task.keyPath,
                task.implicitSlot,
                task.formatContext,
                request.abortableTasks
              )),
              (JSCompiler_inline_result = jsonValue.ping),
              parentPropertyName.then(
                JSCompiler_inline_result,
                JSCompiler_inline_result
              ),
              (jsonValue.thenableState = getThenableStateAfterSuspending()),
              (task.keyPath = value),
              (task.implicitSlot = prevImplicitSlot),
              (JSCompiler_inline_result = parent
                ? serializeLazyID(jsonValue.id)
                : serializeByValueID(jsonValue.id)))
            : ((task.keyPath = value),
              (task.implicitSlot = prevImplicitSlot),
              request.pendingChunks++,
              (value = request.nextChunkId++),
              (prevImplicitSlot = logRecoverableError(
                request,
                parentPropertyName,
                task
              )),
              emitErrorChunk(request, value, prevImplicitSlot),
              (JSCompiler_inline_result = parent
                ? serializeLazyID(value)
                : serializeByValueID(value))));
  }
  value = JSCompiler_inline_result;
  if (null === value || "object" !== typeof value) return value;
  if (isArrayImpl(value)) {
    var resolved$14 = [];
    for (
      prevImplicitSlot = 0;
      prevImplicitSlot < value.length;
      prevImplicitSlot++
    )
      resolved$14[prevImplicitSlot] = resolveModel(
        request,
        task,
        value,
        "" + prevImplicitSlot,
        value[prevImplicitSlot]
      );
    return resolved$14;
  }
  prevImplicitSlot = {};
  for (resolved$14 in value)
    hasOwnProperty.call(value, resolved$14) &&
      ((parent = resolveModel(
        request,
        task,
        value,
        resolved$14,
        value[resolved$14]
      )),
      "__proto__" === resolved$14
        ? Object.defineProperty(prevImplicitSlot, resolved$14, {
            value: parent,
            enumerable: !0,
            writable: !0,
            configurable: !0
          })
        : (prevImplicitSlot[resolved$14] = parent));
  return prevImplicitSlot;
}
function serializeByValueID(id) {
  return "$" + id.toString(16);
}
function serializeLazyID(id) {
  return "$L" + id.toString(16);
}
function encodeReferenceChunk(request, id, reference) {
  request = stringify(reference);
  return id.toString(16) + ":" + request + "\n";
}
function serializeClientReference(
  request,
  parent,
  parentPropertyName,
  clientReference
) {
  var clientReferenceKey = clientReference.$$id,
    writtenClientReferences = request.writtenClientReferences,
    existingId = writtenClientReferences.get(clientReferenceKey);
  if (void 0 !== existingId)
    return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
      ? serializeLazyID(existingId)
      : serializeByValueID(existingId);
  try {
    request.pendingChunks++;
    var importId = request.nextChunkId++,
      json = stringify(clientReference),
      processedChunk = importId.toString(16) + ":I" + json + "\n";
    request.completedImportChunks.push(processedChunk);
    writtenClientReferences.set(clientReferenceKey, importId);
    return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
      ? serializeLazyID(importId)
      : serializeByValueID(importId);
  } catch (x) {
    return (
      request.pendingChunks++,
      (parent = request.nextChunkId++),
      (parentPropertyName = logRecoverableError(request, x, null)),
      emitErrorChunk(request, parent, parentPropertyName),
      serializeByValueID(parent)
    );
  }
}
function outlineModelWithFormatContext(request, value, formatContext) {
  value = createTask(
    request,
    value,
    null,
    !1,
    formatContext,
    request.abortableTasks
  );
  retryTask(request, value);
  return value.id;
}
function serializeTypedArray(request, tag, typedArray) {
  request.pendingChunks++;
  var bufferId = request.nextChunkId++;
  emitTypedArrayChunk(request, bufferId, tag, typedArray, !1);
  return serializeByValueID(bufferId);
}
function serializeBlob(request, blob) {
  function progress(entry) {
    if (0 === newTask.status)
      if (entry.done)
        request.cacheController.signal.removeEventListener("abort", abortBlob),
          pingTask(request, newTask);
      else
        return (
          model.push(entry.value), reader.read().then(progress).catch(error)
        );
  }
  function error(reason) {
    0 === newTask.status &&
      (request.cacheController.signal.removeEventListener("abort", abortBlob),
      erroredTask(request, newTask, reason),
      enqueueFlush(request),
      reader.cancel(reason).then(error, error));
  }
  function abortBlob() {
    if (0 === newTask.status) {
      var signal = request.cacheController.signal;
      signal.removeEventListener("abort", abortBlob);
      signal = signal.reason;
      21 === request.type
        ? (request.abortableTasks.delete(newTask),
          haltTask(newTask),
          finishHaltedTask(newTask, request))
        : (erroredTask(request, newTask, signal), enqueueFlush(request));
      reader.cancel(signal).then(error, error);
    }
  }
  var model = [blob.type],
    newTask = createTask(request, model, null, !1, 0, request.abortableTasks),
    reader = blob.stream().getReader();
  request.cacheController.signal.addEventListener("abort", abortBlob);
  reader.read().then(progress).catch(error);
  return "$B" + newTask.id.toString(16);
}
var modelRoot = !1;
function renderModelDestructive(
  request,
  task,
  parent,
  parentPropertyName,
  value
) {
  task.model = value;
  if (value === REACT_ELEMENT_TYPE) return "$";
  if (null === value) return null;
  if ("object" === typeof value) {
    switch (value.$$typeof) {
      case REACT_ELEMENT_TYPE:
        var elementReference = null,
          writtenObjects = request.writtenObjects;
        if (null === task.keyPath && !task.implicitSlot) {
          var existingReference = writtenObjects.get(value);
          if (void 0 !== existingReference)
            if (modelRoot === value) modelRoot = null;
            else return existingReference;
          else
            -1 === parentPropertyName.indexOf(":") &&
              ((parent = writtenObjects.get(parent)),
              void 0 !== parent &&
                ((elementReference = parent + ":" + parentPropertyName),
                writtenObjects.set(value, elementReference)));
        }
        if (3200 < serializedSize) return deferTask(request, task);
        parentPropertyName = value.props;
        parent = parentPropertyName.ref;
        request = renderElement(
          request,
          task,
          value.type,
          value.key,
          void 0 !== parent ? parent : null,
          parentPropertyName
        );
        "object" === typeof request &&
          null !== request &&
          null !== elementReference &&
          (writtenObjects.has(request) ||
            writtenObjects.set(request, elementReference));
        return request;
      case REACT_LAZY_TYPE:
        if (3200 < serializedSize) return deferTask(request, task);
        task.thenableState = null;
        elementReference = value._init;
        value = elementReference(value._payload);
        if (12 === request.status) throw null;
        return renderModelDestructive(
          request,
          task,
          parent,
          parentPropertyName,
          value
        );
      case REACT_LEGACY_ELEMENT_TYPE:
        throw Error(
          'A React Element from an older version of React was rendered. This is not supported. It can happen if:\n- Multiple copies of the "react" package is used.\n- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n- A compiler tries to "inline" JSX instead of using the runtime.'
        );
    }
    if (value.$$typeof === CLIENT_REFERENCE_TAG$1)
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value
      );
    if (
      void 0 !== request.temporaryReferences &&
      ((elementReference = request.temporaryReferences.get(value)),
      void 0 !== elementReference)
    )
      return "$T" + elementReference;
    elementReference = request.writtenObjects;
    writtenObjects = elementReference.get(value);
    if ("function" === typeof value.then) {
      if (void 0 !== writtenObjects) {
        if (null !== task.keyPath || task.implicitSlot)
          return "$@" + serializeThenable(request, task, value).toString(16);
        if (modelRoot === value) modelRoot = null;
        else return writtenObjects;
      }
      request = "$@" + serializeThenable(request, task, value).toString(16);
      elementReference.set(value, request);
      return request;
    }
    if (void 0 !== writtenObjects)
      if (modelRoot === value) {
        if (writtenObjects !== serializeByValueID(task.id))
          return writtenObjects;
        modelRoot = null;
      } else return writtenObjects;
    else if (
      -1 === parentPropertyName.indexOf(":") &&
      ((writtenObjects = elementReference.get(parent)),
      void 0 !== writtenObjects)
    ) {
      existingReference = parentPropertyName;
      if (isArrayImpl(parent) && parent[0] === REACT_ELEMENT_TYPE)
        switch (parentPropertyName) {
          case "1":
            existingReference = "type";
            break;
          case "2":
            existingReference = "key";
            break;
          case "3":
            existingReference = "props";
            break;
          case "4":
            existingReference = "_owner";
        }
      elementReference.set(value, writtenObjects + ":" + existingReference);
    }
    if (isArrayImpl(value)) return renderFragment(request, task, value);
    if (value instanceof Map)
      return (
        (value = Array.from(value)),
        "$Q" + outlineModelWithFormatContext(request, value, 0).toString(16)
      );
    if (value instanceof Set)
      return (
        (value = Array.from(value)),
        "$W" + outlineModelWithFormatContext(request, value, 0).toString(16)
      );
    if ("function" === typeof FormData && value instanceof FormData)
      return (
        (value = Array.from(value.entries())),
        "$K" + outlineModelWithFormatContext(request, value, 0).toString(16)
      );
    if (value instanceof Error) return "$Z";
    if (value instanceof ArrayBuffer)
      return serializeTypedArray(request, "A", new Uint8Array(value));
    if (value instanceof Int8Array)
      return serializeTypedArray(request, "O", value);
    if (value instanceof Uint8Array)
      return serializeTypedArray(request, "o", value);
    if (value instanceof Uint8ClampedArray)
      return serializeTypedArray(request, "U", value);
    if (value instanceof Int16Array)
      return serializeTypedArray(request, "S", value);
    if (value instanceof Uint16Array)
      return serializeTypedArray(request, "s", value);
    if (value instanceof Int32Array)
      return serializeTypedArray(request, "L", value);
    if (value instanceof Uint32Array)
      return serializeTypedArray(request, "l", value);
    if (value instanceof Float32Array)
      return serializeTypedArray(request, "G", value);
    if (value instanceof Float64Array)
      return serializeTypedArray(request, "g", value);
    if (value instanceof BigInt64Array)
      return serializeTypedArray(request, "M", value);
    if (value instanceof BigUint64Array)
      return serializeTypedArray(request, "m", value);
    if (value instanceof DataView)
      return serializeTypedArray(request, "V", value);
    if ("function" === typeof Blob && value instanceof Blob)
      return serializeBlob(request, value);
    if ((elementReference = getIteratorFn(value)))
      return (
        (parentPropertyName = elementReference.call(value)),
        parentPropertyName === value
          ? ((value = Array.from(parentPropertyName)),
            "$i" +
              outlineModelWithFormatContext(request, value, 0).toString(16))
          : renderFragment(request, task, Array.from(parentPropertyName))
      );
    if ("function" === typeof ReadableStream && value instanceof ReadableStream)
      return serializeReadableStream(request, task, value);
    elementReference = value[ASYNC_ITERATOR];
    if ("function" === typeof elementReference)
      return (
        null !== task.keyPath
          ? ((request = [
              REACT_ELEMENT_TYPE,
              REACT_FRAGMENT_TYPE,
              task.keyPath,
              { children: value }
            ]),
            (request = task.implicitSlot ? [request] : request))
          : ((parentPropertyName = elementReference.call(value)),
            (request = serializeAsyncIterable(
              request,
              task,
              value,
              parentPropertyName
            ))),
        request
      );
    if (value instanceof Date) return "$D" + value.toJSON();
    request = getPrototypeOf(value);
    if (
      request !== ObjectPrototype$1 &&
      (null === request || null !== getPrototypeOf(request))
    )
      throw Error(
        "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported." +
          describeObjectForErrorMessage(parent, parentPropertyName)
      );
    return value;
  }
  if ("string" === typeof value) {
    serializedSize += value.length;
    if (
      "Z" === value[value.length - 1] &&
      parent[parentPropertyName] instanceof Date
    )
      return "$D" + value;
    if (1024 <= value.length && null !== byteLengthOfChunk)
      return (
        request.pendingChunks++,
        (task = request.nextChunkId++),
        emitTextChunk(request, task, value, !1),
        serializeByValueID(task)
      );
    request = "$" === value[0] ? "$" + value : value;
    return request;
  }
  if ("boolean" === typeof value) return value;
  if ("number" === typeof value)
    return Number.isFinite(value)
      ? 0 === value && -Infinity === 1 / value
        ? "$-0"
        : value
      : Infinity === value
        ? "$Infinity"
        : -Infinity === value
          ? "$-Infinity"
          : "$NaN";
  if ("undefined" === typeof value) return "$undefined";
  if ("function" === typeof value) {
    if (value.$$typeof === CLIENT_REFERENCE_TAG$1)
      return serializeClientReference(
        request,
        parent,
        parentPropertyName,
        value
      );
    if (value.$$typeof === SERVER_REFERENCE_TAG)
      return (
        (task = request.writtenServerReferences),
        (parentPropertyName = task.get(value)),
        void 0 !== parentPropertyName
          ? (request = "$h" + parentPropertyName.toString(16))
          : ((parentPropertyName = value.$$bound),
            (parentPropertyName =
              null === parentPropertyName
                ? null
                : Promise.resolve(parentPropertyName)),
            (request = outlineModelWithFormatContext(
              request,
              { id: value.$$id, bound: parentPropertyName },
              0
            )),
            task.set(value, request),
            (request = "$h" + request.toString(16))),
        request
      );
    if (
      void 0 !== request.temporaryReferences &&
      ((request = request.temporaryReferences.get(value)), void 0 !== request)
    )
      return "$T" + request;
    if (value.$$typeof === TEMPORARY_REFERENCE_TAG)
      throw Error(
        "Could not reference an opaque temporary reference. This is likely due to misconfiguring the temporaryReferences options on the server."
      );
    if (/^on[A-Z]/.test(parentPropertyName))
      throw Error(
        "Event handlers cannot be passed to Client Component props." +
          describeObjectForErrorMessage(parent, parentPropertyName) +
          "\nIf you need interactivity, consider converting part of this to a Client Component."
      );
    throw Error(
      'Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.' +
        describeObjectForErrorMessage(parent, parentPropertyName)
    );
  }
  if ("symbol" === typeof value) {
    task = request.writtenSymbols;
    elementReference = task.get(value);
    if (void 0 !== elementReference)
      return serializeByValueID(elementReference);
    elementReference = value.description;
    if (Symbol.for(elementReference) !== value)
      throw Error(
        "Only global symbols received from Symbol.for(...) can be passed to Client Components. The symbol Symbol.for(" +
          (value.description + ") cannot be found among global symbols.") +
          describeObjectForErrorMessage(parent, parentPropertyName)
      );
    request.pendingChunks++;
    parentPropertyName = request.nextChunkId++;
    parent = encodeReferenceChunk(
      request,
      parentPropertyName,
      "$S" + elementReference
    );
    request.completedImportChunks.push(parent);
    task.set(value, parentPropertyName);
    return serializeByValueID(parentPropertyName);
  }
  if ("bigint" === typeof value) return "$n" + value.toString(10);
  throw Error(
    "Type " +
      typeof value +
      " is not supported in Client Component props." +
      describeObjectForErrorMessage(parent, parentPropertyName)
  );
}
function logRecoverableError(request, error) {
  var prevRequest = currentRequest;
  currentRequest = null;
  try {
    var onError = request.onError;
    var errorDigest = onError(error);
  } finally {
    currentRequest = prevRequest;
  }
  if (null != errorDigest && "string" !== typeof errorDigest)
    throw Error(
      'onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "' +
        typeof errorDigest +
        '" instead'
    );
  return errorDigest || "";
}
function fatalError(request, error) {
  var onFatalError = request.onFatalError;
  onFatalError(error);
  null !== request.destination
    ? ((request.status = 14), request.destination.destroy(error))
    : ((request.status = 13), (request.fatalError = error));
  request.cacheController.abort(
    Error("The render was aborted due to a fatal error.", { cause: error })
  );
}
function emitErrorChunk(request, id, digest) {
  digest = { digest: digest };
  id = id.toString(16) + ":E" + stringify(digest) + "\n";
  request.completedErrorChunks.push(id);
}
function emitTypedArrayChunk(request, id, tag, typedArray, debug) {
  debug ? request.pendingDebugChunks++ : request.pendingChunks++;
  typedArray = new Uint8Array(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength
  );
  debug = typedArray.byteLength;
  id = id.toString(16) + ":" + tag + debug.toString(16) + ",";
  request.completedRegularChunks.push(
    NEXT_TWO_CHUNKS_ARE_ATOMIC,
    id,
    typedArray
  );
}
function emitTextChunk(request, id, text, debug) {
  if (null === byteLengthOfChunk)
    throw Error(
      "Existence of byteLengthOfChunk should have already been checked. This is a bug in React."
    );
  debug ? request.pendingDebugChunks++ : request.pendingChunks++;
  debug = byteLengthOfChunk(text);
  id = id.toString(16) + ":T" + debug.toString(16) + ",";
  request.completedRegularChunks.push(NEXT_TWO_CHUNKS_ARE_ATOMIC, id, text);
}
function emitChunk(request, task, value) {
  var id = task.id;
  "string" === typeof value && null !== byteLengthOfChunk
    ? emitTextChunk(request, id, value, !1)
    : value instanceof ArrayBuffer
      ? emitTypedArrayChunk(request, id, "A", new Uint8Array(value), !1)
      : value instanceof Int8Array
        ? emitTypedArrayChunk(request, id, "O", value, !1)
        : value instanceof Uint8Array
          ? emitTypedArrayChunk(request, id, "o", value, !1)
          : value instanceof Uint8ClampedArray
            ? emitTypedArrayChunk(request, id, "U", value, !1)
            : value instanceof Int16Array
              ? emitTypedArrayChunk(request, id, "S", value, !1)
              : value instanceof Uint16Array
                ? emitTypedArrayChunk(request, id, "s", value, !1)
                : value instanceof Int32Array
                  ? emitTypedArrayChunk(request, id, "L", value, !1)
                  : value instanceof Uint32Array
                    ? emitTypedArrayChunk(request, id, "l", value, !1)
                    : value instanceof Float32Array
                      ? emitTypedArrayChunk(request, id, "G", value, !1)
                      : value instanceof Float64Array
                        ? emitTypedArrayChunk(request, id, "g", value, !1)
                        : value instanceof BigInt64Array
                          ? emitTypedArrayChunk(request, id, "M", value, !1)
                          : value instanceof BigUint64Array
                            ? emitTypedArrayChunk(request, id, "m", value, !1)
                            : value instanceof DataView
                              ? emitTypedArrayChunk(request, id, "V", value, !1)
                              : ((value = resolveModel(
                                  request,
                                  task,
                                  { "": value },
                                  "",
                                  value
                                )),
                                (value = stringify(value)),
                                (task =
                                  task.id.toString(16) + ":" + value + "\n"),
                                request.completedRegularChunks.push(task));
}
function erroredTask(request, task, error) {
  task.status = 4;
  error = logRecoverableError(request, error, task);
  emitErrorChunk(request, task.id, error);
  request.abortableTasks.delete(task);
  callOnAllReadyIfReady(request);
}
var emptyRoot = {};
function retryTask(request, task) {
  if (0 === task.status) {
    task.status = 5;
    var parentSerializedSize = serializedSize;
    try {
      modelRoot = task.model;
      var resolvedModel = renderModelDestructive(
        request,
        task,
        emptyRoot,
        "",
        task.model
      );
      modelRoot = resolvedModel;
      task.keyPath = null;
      task.implicitSlot = !1;
      if ("object" === typeof resolvedModel && null !== resolvedModel)
        request.writtenObjects.set(resolvedModel, serializeByValueID(task.id)),
          emitChunk(request, task, resolvedModel);
      else {
        var json = stringify(resolvedModel),
          processedChunk = task.id.toString(16) + ":" + json + "\n";
        request.completedRegularChunks.push(processedChunk);
      }
      task.status = 1;
      request.abortableTasks.delete(task);
      callOnAllReadyIfReady(request);
    } catch (thrownValue) {
      if (12 === request.status)
        if (
          (request.abortableTasks.delete(task),
          (task.status = 0),
          21 === request.type)
        )
          haltTask(task), finishHaltedTask(task, request);
        else {
          var errorId = request.fatalError;
          abortTask(task);
          finishAbortedTask(task, request, errorId);
        }
      else {
        var x =
          thrownValue === SuspenseException
            ? getSuspendedThenable()
            : thrownValue;
        if (
          "object" === typeof x &&
          null !== x &&
          "function" === typeof x.then
        ) {
          task.status = 0;
          task.thenableState = getThenableStateAfterSuspending();
          var ping = task.ping;
          x.then(ping, ping);
        } else erroredTask(request, task, x);
      }
    } finally {
      serializedSize = parentSerializedSize;
    }
  }
}
function tryStreamTask(request, task) {
  var parentSerializedSize = serializedSize;
  try {
    emitChunk(request, task, task.model);
  } finally {
    serializedSize = parentSerializedSize;
  }
}
function performWork(request) {
  var prevDispatcher = ReactSharedInternalsServer.H;
  ReactSharedInternalsServer.H = HooksDispatcher;
  var prevRequest = currentRequest;
  currentRequest$1 = currentRequest = request;
  try {
    var pingedTasks = request.pingedTasks;
    request.pingedTasks = [];
    for (var i = 0; i < pingedTasks.length; i++)
      retryTask(request, pingedTasks[i]);
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null), fatalError(request, error);
  } finally {
    (ReactSharedInternalsServer.H = prevDispatcher),
      (currentRequest$1 = null),
      (currentRequest = prevRequest);
  }
}
function abortTask(task) {
  0 === task.status && (task.status = 3);
}
function finishAbortedTask(task, request, errorId) {
  3 === task.status &&
    ((errorId = serializeByValueID(errorId)),
    (task = encodeReferenceChunk(request, task.id, errorId)),
    request.completedErrorChunks.push(task));
}
function haltTask(task) {
  0 === task.status && (task.status = 3);
}
function finishHaltedTask(task, request) {
  3 === task.status && request.pendingChunks--;
}
function flushCompletedChunks(request) {
  var destination = request.destination;
  if (null !== destination) {
    currentView = new Uint8Array(4096);
    writtenBytes = 0;
    destinationHasCapacity = !0;
    try {
      for (
        var importsChunks = request.completedImportChunks, i = 0;
        i < importsChunks.length;
        i++
      )
        if (
          (request.pendingChunks--,
          !writeChunkAndReturn(destination, importsChunks[i]))
        ) {
          request.destination = null;
          i++;
          break;
        }
      importsChunks.splice(0, i);
      var hintChunks = request.completedHintChunks;
      for (i = 0; i < hintChunks.length; i++)
        if (!writeChunkAndReturn(destination, hintChunks[i])) {
          request.destination = null;
          i++;
          break;
        }
      hintChunks.splice(0, i);
      var regularChunks = request.completedRegularChunks;
      for (i = 0; i < regularChunks.length; i++) {
        var item = regularChunks[i];
        importsChunks = void 0;
        if (item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
          if (i + 2 >= regularChunks.length)
            throw Error("A chunk pair is incomplete. This is a bug in React.");
          request.pendingChunks -= 2;
          writeChunk(destination, regularChunks[i + 1]);
          importsChunks = writeChunkAndReturn(
            destination,
            regularChunks[i + 2]
          );
          i += 2;
        } else
          request.pendingChunks--,
            (importsChunks = writeChunkAndReturn(destination, item));
        if (!importsChunks) {
          request.destination = null;
          i++;
          break;
        }
      }
      regularChunks.splice(0, i);
      var errorChunks = request.completedErrorChunks;
      for (i = 0; i < errorChunks.length; i++)
        if (
          (request.pendingChunks--,
          !writeChunkAndReturn(destination, errorChunks[i]))
        ) {
          request.destination = null;
          i++;
          break;
        }
      errorChunks.splice(0, i);
    } finally {
      (request.flushScheduled = !1),
        currentView &&
          0 < writtenBytes &&
          destination.write(currentView.subarray(0, writtenBytes)),
        (currentView = null),
        (writtenBytes = 0),
        (destinationHasCapacity = !0);
    }
    "function" === typeof destination.flush && destination.flush();
  }
  0 === request.pendingChunks &&
    (12 > request.status &&
      request.cacheController.abort(
        Error(
          "This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."
        )
      ),
    null !== request.destination &&
      ((request.status = 14),
      request.destination.end(),
      (request.destination = null)));
}
function startWork(request) {
  request.flushScheduled = null !== request.destination;
  Promise.resolve().then(function () {
    return performWork(request);
  });
  setImmediate(function () {
    10 === request.status && (request.status = 11);
  });
}
function enqueueFlush(request) {
  !1 === request.flushScheduled &&
    0 === request.pingedTasks.length &&
    null !== request.destination &&
    ((request.flushScheduled = !0),
    setImmediate(function () {
      request.flushScheduled = !1;
      flushCompletedChunks(request);
    }));
}
function callOnAllReadyIfReady(request) {
  0 === request.abortableTasks.size &&
    ((request = request.onAllReady), request());
}
function startFlowing(request, destination) {
  if (13 === request.status)
    (request.status = 14), destination.destroy(request.fatalError);
  else if (14 !== request.status && null === request.destination) {
    request.destination = destination;
    try {
      flushCompletedChunks(request);
    } catch (error) {
      logRecoverableError(request, error, null), fatalError(request, error);
    }
  }
}
function finishHalt(request, abortedTasks) {
  try {
    abortedTasks.forEach(function (task) {
      return finishHaltedTask(task, request);
    });
    var onAllReady = request.onAllReady;
    onAllReady();
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null), fatalError(request, error);
  }
}
function finishAbort(request, abortedTasks, errorId) {
  try {
    abortedTasks.forEach(function (task) {
      return finishAbortedTask(task, request, errorId);
    });
    var onAllReady = request.onAllReady;
    onAllReady();
    flushCompletedChunks(request);
  } catch (error) {
    logRecoverableError(request, error, null), fatalError(request, error);
  }
}
function abort(request, reason) {
  if (!(11 < request.status))
    try {
      request.status = 12;
      request.cacheController.abort(reason);
      var abortableTasks = request.abortableTasks;
      if (0 < abortableTasks.size)
        if (21 === request.type)
          abortableTasks.forEach(function (task) {
            return haltTask(task, request);
          }),
            setImmediate(function () {
              return finishHalt(request, abortableTasks);
            });
        else {
          var error =
              void 0 === reason
                ? Error(
                    "The render was aborted by the server without a reason."
                  )
                : "object" === typeof reason &&
                    null !== reason &&
                    "function" === typeof reason.then
                  ? Error(
                      "The render was aborted by the server with a promise."
                    )
                  : reason,
            digest = logRecoverableError(request, error, null),
            errorId = request.nextChunkId++;
          request.fatalError = errorId;
          request.pendingChunks++;
          emitErrorChunk(request, errorId, digest, error, !1, null);
          abortableTasks.forEach(function (task) {
            return abortTask(task, request, errorId);
          });
          setImmediate(function () {
            return finishAbort(request, abortableTasks, errorId);
          });
        }
      else {
        var onAllReady = request.onAllReady;
        onAllReady();
        flushCompletedChunks(request);
      }
    } catch (error$26) {
      logRecoverableError(request, error$26, null),
        fatalError(request, error$26);
    }
}
var canUseDOM = !(
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
var RESPONSE_SYMBOL = Symbol();
function ReactPromise(status, value, reason) {
  this.status = status;
  this.value = value;
  this.reason = reason;
}
ReactPromise.prototype = Object.create(Promise.prototype);
ReactPromise.prototype.then = function (resolve, reject) {
  switch (this.status) {
    case "resolved_model":
      initializeModelChunk(this);
  }
  switch (this.status) {
    case "fulfilled":
      if ("function" === typeof resolve) {
        for (
          var inspectedValue = this.value,
            cycleProtection = 0,
            visited = new Set();
          inspectedValue instanceof ReactPromise;

        ) {
          cycleProtection++;
          if (
            inspectedValue === this ||
            visited.has(inspectedValue) ||
            1e3 < cycleProtection
          ) {
            "function" === typeof reject &&
              reject(Error("Cannot have cyclic thenables."));
            return;
          }
          visited.add(inspectedValue);
          if ("fulfilled" === inspectedValue.status)
            inspectedValue = inspectedValue.value;
          else break;
        }
        resolve(this.value);
      }
      break;
    case "pending":
    case "blocked":
      "function" === typeof resolve &&
        (null === this.value && (this.value = []), this.value.push(resolve));
      "function" === typeof reject &&
        (null === this.reason && (this.reason = []), this.reason.push(reject));
      break;
    default:
      "function" === typeof reject && reject(this.reason);
  }
};
var ObjectPrototype = Object.prototype,
  ArrayPrototype = Array.prototype;
function wakeChunk(response, listeners, value, chunk) {
  for (var i = 0; i < listeners.length; i++) {
    var listener = listeners[i];
    "function" === typeof listener
      ? listener(value)
      : fulfillReference(response, listener, value, chunk.reason);
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
function triggerErrorOnChunk(response, chunk, error) {
  if ("pending" !== chunk.status && "blocked" !== chunk.status)
    chunk.reason.error(error);
  else {
    var listeners = chunk.reason;
    chunk.status = "rejected";
    chunk.reason = error;
    null !== listeners && rejectChunk(response, listeners, error);
  }
}
function createResolvedModelChunk(response, value, id) {
  var $jscomp$compprop2 = {};
  return new ReactPromise(
    "resolved_model",
    value,
    (($jscomp$compprop2.id = id),
    ($jscomp$compprop2[RESPONSE_SYMBOL] = response),
    $jscomp$compprop2)
  );
}
function resolveModelChunk(response, chunk, value, id) {
  if ("pending" !== chunk.status)
    (chunk = chunk.reason),
      "C" === value[0]
        ? chunk.close("C" === value ? '"$undefined"' : value.slice(1))
        : chunk.enqueueModel(value);
  else {
    var resolveListeners = chunk.value,
      rejectListeners = chunk.reason;
    chunk.status = "resolved_model";
    chunk.value = value;
    value = {};
    chunk.reason =
      ((value.id = id), (value[RESPONSE_SYMBOL] = response), value);
    if (null !== resolveListeners)
      switch ((initializeModelChunk(chunk), chunk.status)) {
        case "fulfilled":
          wakeChunk(response, resolveListeners, chunk.value, chunk);
          break;
        case "blocked":
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
          rejectListeners &&
            rejectChunk(response, rejectListeners, chunk.reason);
      }
  }
}
function createResolvedIteratorResultChunk(response, value, done) {
  var $jscomp$compprop4 = {};
  return new ReactPromise(
    "resolved_model",
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + "}",
    (($jscomp$compprop4.id = -1),
    ($jscomp$compprop4[RESPONSE_SYMBOL] = response),
    $jscomp$compprop4)
  );
}
function resolveIteratorResultChunk(response, chunk, value, done) {
  resolveModelChunk(
    response,
    chunk,
    (done ? '{"done":true,"value":' : '{"done":false,"value":') + value + "}",
    -1
  );
}
function loadServerReference$1(response, metaData, parentObject, key) {
  function reject(error) {
    var rejectListeners = blockedPromise.reason,
      erroredPromise = blockedPromise;
    erroredPromise.status = "rejected";
    erroredPromise.value = null;
    erroredPromise.reason = error;
    null !== rejectListeners && rejectChunk(response, rejectListeners, error);
    rejectReference(response, handler, error);
  }
  var id = metaData.id;
  if ("string" !== typeof id || "then" === key) return null;
  var cachedPromise = metaData.$$promise;
  if (void 0 !== cachedPromise) {
    if ("fulfilled" === cachedPromise.status)
      return (
        (cachedPromise = cachedPromise.value),
        "__proto__" === key ? null : (parentObject[key] = cachedPromise)
      );
    initializingHandler
      ? ((id = initializingHandler), id.deps++)
      : (id = initializingHandler =
          { chunk: null, value: null, reason: null, deps: 1, errored: !1 });
    cachedPromise.then(
      resolveReference.bind(null, response, id, parentObject, key),
      rejectReference.bind(null, response, id)
    );
    return null;
  }
  var blockedPromise = new ReactPromise("blocked", null, null);
  metaData.$$promise = blockedPromise;
  var serverReference = resolveServerReference(response._bundlerConfig, id);
  cachedPromise = metaData.bound;
  if ((id = preloadModule(serverReference)))
    cachedPromise instanceof ReactPromise &&
      (id = Promise.all([id, cachedPromise]));
  else if (cachedPromise instanceof ReactPromise)
    id = Promise.resolve(cachedPromise);
  else
    return (
      (cachedPromise = requireModule(serverReference)),
      (id = blockedPromise),
      (id.status = "fulfilled"),
      (id.value = cachedPromise),
      (id.reason = null),
      cachedPromise
    );
  if (initializingHandler) {
    var handler = initializingHandler;
    handler.deps++;
  } else
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: !1
    };
  id.then(function () {
    var resolvedValue = requireModule(serverReference);
    if (metaData.bound) {
      var promiseValue = metaData.bound.value;
      promiseValue = isArrayImpl(promiseValue) ? promiseValue.slice(0) : [];
      if (1e3 < promiseValue.length) {
        reject(
          Error(
            "Server Function has too many bound arguments. Received " +
              promiseValue.length +
              " but the limit is 1000."
          )
        );
        return;
      }
      promiseValue.unshift(null);
      resolvedValue = resolvedValue.bind.apply(resolvedValue, promiseValue);
    }
    promiseValue = blockedPromise.value;
    var initializedPromise = blockedPromise;
    initializedPromise.status = "fulfilled";
    initializedPromise.value = resolvedValue;
    initializedPromise.reason = null;
    null !== promiseValue &&
      wakeChunk(response, promiseValue, resolvedValue, initializedPromise);
    resolveReference(response, handler, parentObject, key, resolvedValue);
  }, reject);
  return null;
}
function reviveModel(
  response,
  parentObj,
  parentKey,
  value,
  reference,
  arrayRoot
) {
  if ("string" === typeof value)
    return parseModelString(
      response,
      parentObj,
      parentKey,
      value,
      reference,
      arrayRoot
    );
  if ("object" === typeof value && null !== value)
    if (
      (void 0 !== reference &&
        void 0 !== response._temporaryReferences &&
        response._temporaryReferences.set(value, reference),
      isArrayImpl(value))
    ) {
      if (null === arrayRoot) {
        var childContext = { count: 0, fork: !1 };
        response._rootArrayContexts.set(value, childContext);
      } else childContext = arrayRoot;
      1 < value.length && (childContext.fork = !0);
      bumpArrayCount(childContext, value.length + 1, response);
      for (parentObj = 0; parentObj < value.length; parentObj++)
        value[parentObj] = reviveModel(
          response,
          value,
          "" + parentObj,
          value[parentObj],
          void 0 !== reference ? reference + ":" + parentObj : void 0,
          childContext
        );
    } else
      for (childContext in value)
        hasOwnProperty.call(value, childContext) &&
          ("__proto__" === childContext
            ? delete value[childContext]
            : ((parentObj =
                void 0 !== reference && -1 === childContext.indexOf(":")
                  ? reference + ":" + childContext
                  : void 0),
              (parentObj = reviveModel(
                response,
                value,
                childContext,
                value[childContext],
                parentObj,
                null
              )),
              void 0 !== parentObj
                ? (value[childContext] = parentObj)
                : delete value[childContext]));
  return value;
}
function bumpArrayCount(arrayContext, slots, response) {
  if (
    (arrayContext.count += slots) > response._arraySizeLimit &&
    arrayContext.fork
  )
    throw Error(
      "Maximum array nesting exceeded. Large nested arrays can be dangerous. Try adding intermediate objects."
    );
}
var initializingHandler = null;
function initializeModelChunk(chunk) {
  var prevHandler = initializingHandler;
  initializingHandler = null;
  var _chunk$reason = chunk.reason,
    response = _chunk$reason[RESPONSE_SYMBOL];
  _chunk$reason = _chunk$reason.id;
  _chunk$reason = -1 === _chunk$reason ? void 0 : _chunk$reason.toString(16);
  var resolvedModel = chunk.value;
  chunk.status = "blocked";
  chunk.value = null;
  chunk.reason = null;
  try {
    var rawModel = JSON.parse(resolvedModel);
    resolvedModel = { count: 0, fork: !1 };
    var value = reviveModel(
        response,
        { "": rawModel },
        "",
        rawModel,
        _chunk$reason,
        resolvedModel
      ),
      resolveListeners = chunk.value;
    if (null !== resolveListeners)
      for (
        chunk.value = null, chunk.reason = null, rawModel = 0;
        rawModel < resolveListeners.length;
        rawModel++
      ) {
        var listener = resolveListeners[rawModel];
        "function" === typeof listener
          ? listener(value)
          : fulfillReference(response, listener, value, resolvedModel);
      }
    if (null !== initializingHandler) {
      if (initializingHandler.errored) throw initializingHandler.reason;
      if (0 < initializingHandler.deps) {
        initializingHandler.value = value;
        initializingHandler.reason = resolvedModel;
        initializingHandler.chunk = chunk;
        return;
      }
    }
    chunk.status = "fulfilled";
    chunk.value = value;
    chunk.reason = resolvedModel;
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  } finally {
    initializingHandler = prevHandler;
  }
}
function reportGlobalError(response, error) {
  response._closed = !0;
  response._closedReason = error;
  response._chunks.forEach(function (chunk) {
    "pending" === chunk.status
      ? triggerErrorOnChunk(response, chunk, error)
      : "fulfilled" === chunk.status &&
        null !== chunk.reason &&
        ((chunk = chunk.reason),
        "function" === typeof chunk.error && chunk.error(error));
  });
}
function getChunk(response, id) {
  var chunks = response._chunks,
    chunk = chunks.get(id);
  chunk ||
    ((chunk = response._formData.data.get(response._prefix + id)),
    (chunk =
      "string" === typeof chunk
        ? createResolvedModelChunk(response, chunk, id)
        : response._closed
          ? new ReactPromise("rejected", null, response._closedReason)
          : new ReactPromise("pending", null, null)),
    chunks.set(id, chunk));
  return chunk;
}
function fulfillReference(response, reference, value, arrayRoot) {
  var handler = reference.handler,
    parentObject = reference.parentObject,
    key = reference.key,
    map = reference.map,
    path = reference.path;
  try {
    for (
      var localLength = 0,
        rootArrayContexts = response._rootArrayContexts,
        i = 1;
      i < path.length;
      i++
    ) {
      var name = path[i];
      if (
        "object" !== typeof value ||
        null === value ||
        (getPrototypeOf(value) !== ObjectPrototype &&
          getPrototypeOf(value) !== ArrayPrototype) ||
        !hasOwnProperty.call(value, name)
      )
        throw Error("Invalid reference.");
      value = value[name];
      if (isArrayImpl(value))
        (localLength = 0),
          (arrayRoot = rootArrayContexts.get(value) || arrayRoot);
      else if (((arrayRoot = null), "string" === typeof value))
        localLength = value.length;
      else if ("bigint" === typeof value) {
        var n = Math.abs(Number(value));
        localLength = 0 === n ? 1 : Math.floor(Math.log10(n)) + 1;
      } else localLength = ArrayBuffer.isView(value) ? value.byteLength : 0;
    }
    var resolvedValue = map(response, value, parentObject, key);
    var referenceArrayRoot = reference.arrayRoot;
    null !== referenceArrayRoot &&
      (null !== arrayRoot
        ? (arrayRoot.fork && (referenceArrayRoot.fork = !0),
          bumpArrayCount(referenceArrayRoot, arrayRoot.count, response))
        : 0 < localLength &&
          bumpArrayCount(referenceArrayRoot, localLength, response));
  } catch (error) {
    rejectReference(response, handler, error);
    return;
  }
  resolveReference(response, handler, parentObject, key, resolvedValue);
}
function resolveReference(response, handler, parentObject, key, resolvedValue) {
  "__proto__" !== key && (parentObject[key] = resolvedValue);
  "" === key && null === handler.value && (handler.value = resolvedValue);
  handler.deps--;
  0 === handler.deps &&
    ((parentObject = handler.chunk),
    null !== parentObject &&
      "blocked" === parentObject.status &&
      ((key = parentObject.value),
      (parentObject.status = "fulfilled"),
      (parentObject.value = handler.value),
      (parentObject.reason = handler.reason),
      null !== key && wakeChunk(response, key, handler.value, parentObject)));
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
function getOutlinedModel(
  response,
  reference,
  parentObject,
  key,
  referenceArrayRoot,
  map
) {
  reference = reference.split(":");
  var id = parseInt(reference[0], 16),
    chunk = getChunk(response, id);
  switch (chunk.status) {
    case "resolved_model":
      initializeModelChunk(chunk);
  }
  switch (chunk.status) {
    case "fulfilled":
      id = chunk.value;
      chunk = chunk.reason;
      if (null !== chunk && "error" in chunk)
        throw Error(
          "Expected an initialized chunk but got an initialized stream chunk instead. This payload may have been submitted by an older version of React."
        );
      for (
        var localLength = 0,
          rootArrayContexts = response._rootArrayContexts,
          i = 1;
        i < reference.length;
        i++
      ) {
        localLength = reference[i];
        if (
          "object" !== typeof id ||
          null === id ||
          (getPrototypeOf(id) !== ObjectPrototype &&
            getPrototypeOf(id) !== ArrayPrototype) ||
          !hasOwnProperty.call(id, localLength)
        )
          throw Error("Invalid reference.");
        id = id[localLength];
        isArrayImpl(id)
          ? ((localLength = 0), (chunk = rootArrayContexts.get(id) || chunk))
          : ((chunk = null),
            "string" === typeof id
              ? (localLength = id.length)
              : "bigint" === typeof id
                ? ((localLength = Math.abs(Number(id))),
                  (localLength =
                    0 === localLength
                      ? 1
                      : Math.floor(Math.log10(localLength)) + 1))
                : (localLength = ArrayBuffer.isView(id) ? id.byteLength : 0));
      }
      parentObject = map(response, id, parentObject, key);
      null !== referenceArrayRoot &&
        (null !== chunk
          ? (chunk.fork && (referenceArrayRoot.fork = !0),
            bumpArrayCount(referenceArrayRoot, chunk.count, response))
          : 0 < localLength &&
            bumpArrayCount(referenceArrayRoot, localLength, response));
      return parentObject;
    case "blocked":
      return (
        initializingHandler
          ? ((response = initializingHandler), response.deps++)
          : (response = initializingHandler =
              { chunk: null, value: null, reason: null, deps: 1, errored: !1 }),
        (referenceArrayRoot = {
          handler: response,
          parentObject: parentObject,
          key: key,
          map: map,
          path: reference,
          arrayRoot: referenceArrayRoot
        }),
        null === chunk.value
          ? (chunk.value = [referenceArrayRoot])
          : chunk.value.push(referenceArrayRoot),
        null === chunk.reason
          ? (chunk.reason = [referenceArrayRoot])
          : chunk.reason.push(referenceArrayRoot),
        null
      );
    case "pending":
      throw Error("Invalid forward reference.");
    default:
      return (
        initializingHandler
          ? ((initializingHandler.errored = !0),
            (initializingHandler.value = null),
            (initializingHandler.reason = chunk.reason))
          : (initializingHandler = {
              chunk: null,
              value: null,
              reason: chunk.reason,
              deps: 0,
              errored: !0
            }),
        null
      );
  }
}
function createMap(response, model) {
  if (!isArrayImpl(model)) throw Error("Invalid Map initializer.");
  if (!0 === model.$$consumed) throw Error("Already initialized Map.");
  model.$$consumed = !0;
  return new Map(model);
}
function createSet(response, model) {
  if (!isArrayImpl(model)) throw Error("Invalid Set initializer.");
  if (!0 === model.$$consumed) throw Error("Already initialized Set.");
  model.$$consumed = !0;
  return new Set(model);
}
function extractIterator(response, model) {
  if (!isArrayImpl(model)) throw Error("Invalid Iterator initializer.");
  if (!0 === model.$$consumed) throw Error("Already initialized Iterator.");
  model.$$consumed = !0;
  return model[Symbol.iterator]();
}
function createModel(response, model, parentObject, key) {
  return "then" === key && "function" === typeof model ? null : model;
}
function parseTypedArray(
  response,
  reference,
  constructor,
  bytesPerElement,
  parentObject,
  parentKey,
  referenceArrayRoot
) {
  function reject(error) {
    if (!handler.errored) {
      handler.errored = !0;
      handler.value = null;
      handler.reason = error;
      var chunk = handler.chunk;
      null !== chunk &&
        "blocked" === chunk.status &&
        triggerErrorOnChunk(response, chunk, error);
    }
  }
  reference = parseInt(reference.slice(2), 16);
  var key = response._prefix + reference;
  bytesPerElement = response._chunks;
  if (bytesPerElement.has(reference))
    throw Error("Already initialized typed array.");
  bytesPerElement.set(
    reference,
    new ReactPromise(
      "rejected",
      null,
      Error("Already initialized typed array.")
    )
  );
  reference = response._formData.data.get(key).arrayBuffer();
  if (initializingHandler) {
    var handler = initializingHandler;
    handler.deps++;
  } else
    handler = initializingHandler = {
      chunk: null,
      value: null,
      reason: null,
      deps: 1,
      errored: !1
    };
  reference.then(function (buffer) {
    try {
      null !== referenceArrayRoot &&
        bumpArrayCount(referenceArrayRoot, buffer.byteLength, response);
      var resolvedValue =
        constructor === ArrayBuffer ? buffer : new constructor(buffer);
      "__proto__" !== key && (parentObject[parentKey] = resolvedValue);
      "" === parentKey &&
        null === handler.value &&
        (handler.value = resolvedValue);
    } catch (x) {
      reject(x);
      return;
    }
    handler.deps--;
    0 === handler.deps &&
      ((buffer = handler.chunk),
      null !== buffer &&
        "blocked" === buffer.status &&
        ((resolvedValue = buffer.value),
        (buffer.status = "fulfilled"),
        (buffer.value = handler.value),
        (buffer.reason = null),
        null !== resolvedValue &&
          wakeChunk(response, resolvedValue, handler.value, buffer)));
  }, reject);
  return null;
}
function resolveStream(response, id, stream, controller) {
  var chunks = response._chunks;
  stream = new ReactPromise("fulfilled", stream, controller);
  chunks.set(id, stream);
  response = response._formData.data.getAll(response._prefix + id);
  for (id = 0; id < response.length; id++)
    (chunks = response[id]),
      "string" === typeof chunks &&
        ("C" === chunks[0]
          ? controller.close("C" === chunks ? '"$undefined"' : chunks.slice(1))
          : controller.enqueueModel(chunks));
}
function parseReadableStream(response, reference, type) {
  function enqueue(value) {
    "bytes" !== type || ArrayBuffer.isView(value)
      ? controller.enqueue(value)
      : flightController.error(Error("Invalid data for bytes stream."));
  }
  reference = parseInt(reference.slice(2), 16);
  if (response._chunks.has(reference))
    throw Error("Already initialized stream.");
  var controller = null,
    closed = !1,
    stream = new ReadableStream({
      type: type,
      start: function (c) {
        controller = c;
      }
    }),
    previousBlockedChunk = null,
    flightController = {
      enqueueModel: function (json) {
        if (null === previousBlockedChunk) {
          var chunk = createResolvedModelChunk(response, json, -1);
          initializeModelChunk(chunk);
          "fulfilled" === chunk.status
            ? enqueue(chunk.value)
            : (chunk.then(enqueue, flightController.error),
              (previousBlockedChunk = chunk));
        } else {
          chunk = previousBlockedChunk;
          var chunk$31 = new ReactPromise("pending", null, null);
          chunk$31.then(enqueue, flightController.error);
          previousBlockedChunk = chunk$31;
          chunk.then(function () {
            previousBlockedChunk === chunk$31 && (previousBlockedChunk = null);
            resolveModelChunk(response, chunk$31, json, -1);
          });
        }
      },
      close: function () {
        if (!closed)
          if (((closed = !0), null === previousBlockedChunk))
            controller.close();
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
    };
  resolveStream(response, reference, stream, flightController);
  return stream;
}
function FlightIterator(next) {
  this.next = next;
}
FlightIterator.prototype = {};
FlightIterator.prototype[ASYNC_ITERATOR] = function () {
  return this;
};
function parseAsyncIterable(response, reference, iterator) {
  reference = parseInt(reference.slice(2), 16);
  if (response._chunks.has(reference))
    throw Error("Already initialized stream.");
  var buffer = [],
    closed = !1,
    nextWriteIndex = 0,
    $jscomp$compprop5 = {};
  $jscomp$compprop5 =
    (($jscomp$compprop5[ASYNC_ITERATOR] = function () {
      var nextReadIndex = 0;
      return new FlightIterator(function (arg) {
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
    }),
    $jscomp$compprop5);
  iterator = iterator ? $jscomp$compprop5[ASYNC_ITERATOR]() : $jscomp$compprop5;
  resolveStream(response, reference, iterator, {
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
  });
  return iterator;
}
function parseModelString(response, obj, key, value, reference, arrayRoot) {
  if ("$" === value[0]) {
    switch (value[1]) {
      case "$":
        return (
          null !== arrayRoot &&
            bumpArrayCount(arrayRoot, value.length - 1, response),
          value.slice(1)
        );
      case "@":
        return (obj = parseInt(value.slice(2), 16)), getChunk(response, obj);
      case "h":
        return (
          (arrayRoot = value.slice(2)),
          getOutlinedModel(
            response,
            arrayRoot,
            obj,
            key,
            null,
            loadServerReference$1
          )
        );
      case "T":
        if (void 0 === reference || void 0 === response._temporaryReferences)
          throw Error(
            "Could not reference an opaque temporary reference. This is likely due to misconfiguring the temporaryReferences options on the server."
          );
        return createTemporaryReference(
          response._temporaryReferences,
          reference
        );
      case "Q":
        return (
          (arrayRoot = value.slice(2)),
          getOutlinedModel(response, arrayRoot, obj, key, null, createMap)
        );
      case "W":
        return (
          (arrayRoot = value.slice(2)),
          getOutlinedModel(response, arrayRoot, obj, key, null, createSet)
        );
      case "K":
        key = value.slice(2);
        obj = response._prefix + "_";
        key = obj + key + "_";
        arrayRoot = new FormData();
        for (response = response._formData; ; ) {
          value = response.keys;
          null === value &&
            ((value = response.keys = Array.from(response.data.keys())),
            (response.keyPointer = 0));
          value = value[response.keyPointer];
          if (void 0 === value) break;
          if (value.startsWith(key)) {
            reference = response.data.getAll(value);
            for (
              var referencedFormDataKey = value.slice(key.length), i = 0;
              i < reference.length;
              i++
            )
              arrayRoot.append(referencedFormDataKey, reference[i]);
            response.data.delete(value);
            response.keyPointer++;
          } else if (value.startsWith(obj)) break;
          else response.keyPointer++;
        }
        return arrayRoot;
      case "i":
        return (
          (arrayRoot = value.slice(2)),
          getOutlinedModel(response, arrayRoot, obj, key, null, extractIterator)
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
        obj = value.slice(2);
        if (300 < obj.length)
          throw Error(
            "BigInt is too large. Received " +
              obj.length +
              " digits but the limit is 300."
          );
        null !== arrayRoot && bumpArrayCount(arrayRoot, obj.length, response);
        return BigInt(obj);
      case "A":
        return parseTypedArray(
          response,
          value,
          ArrayBuffer,
          1,
          obj,
          key,
          arrayRoot
        );
      case "O":
        return parseTypedArray(
          response,
          value,
          Int8Array,
          1,
          obj,
          key,
          arrayRoot
        );
      case "o":
        return parseTypedArray(
          response,
          value,
          Uint8Array,
          1,
          obj,
          key,
          arrayRoot
        );
      case "U":
        return parseTypedArray(
          response,
          value,
          Uint8ClampedArray,
          1,
          obj,
          key,
          arrayRoot
        );
      case "S":
        return parseTypedArray(
          response,
          value,
          Int16Array,
          2,
          obj,
          key,
          arrayRoot
        );
      case "s":
        return parseTypedArray(
          response,
          value,
          Uint16Array,
          2,
          obj,
          key,
          arrayRoot
        );
      case "L":
        return parseTypedArray(
          response,
          value,
          Int32Array,
          4,
          obj,
          key,
          arrayRoot
        );
      case "l":
        return parseTypedArray(
          response,
          value,
          Uint32Array,
          4,
          obj,
          key,
          arrayRoot
        );
      case "G":
        return parseTypedArray(
          response,
          value,
          Float32Array,
          4,
          obj,
          key,
          arrayRoot
        );
      case "g":
        return parseTypedArray(
          response,
          value,
          Float64Array,
          8,
          obj,
          key,
          arrayRoot
        );
      case "M":
        return parseTypedArray(
          response,
          value,
          BigInt64Array,
          8,
          obj,
          key,
          arrayRoot
        );
      case "m":
        return parseTypedArray(
          response,
          value,
          BigUint64Array,
          8,
          obj,
          key,
          arrayRoot
        );
      case "V":
        return parseTypedArray(
          response,
          value,
          DataView,
          1,
          obj,
          key,
          arrayRoot
        );
      case "B":
        obj = parseInt(value.slice(2), 16);
        response = response._formData.data.get(response._prefix + obj);
        if (!(response instanceof Blob))
          throw Error("Referenced Blob is not a Blob.");
        return response;
      case "R":
        return parseReadableStream(response, value, void 0);
      case "r":
        return parseReadableStream(response, value, "bytes");
      case "X":
        return parseAsyncIterable(response, value, !1);
      case "x":
        return parseAsyncIterable(response, value, !0);
    }
    value = value.slice(1);
    return getOutlinedModel(response, value, obj, key, arrayRoot, createModel);
  }
  null !== arrayRoot && bumpArrayCount(arrayRoot, value.length, response);
  return value;
}
function createResponse(bundlerConfig, formFieldPrefix, temporaryReferences) {
  var backingFormData =
      3 < arguments.length && void 0 !== arguments[3]
        ? arguments[3]
        : new FormData(),
    arraySizeLimit =
      4 < arguments.length && void 0 !== arguments[4] ? arguments[4] : 1e6,
    chunks = new Map();
  return {
    _bundlerConfig: bundlerConfig,
    _prefix: formFieldPrefix,
    _formData: { data: backingFormData, keyPointer: -1, keys: null },
    _chunks: chunks,
    _closed: !1,
    _closedReason: null,
    _temporaryReferences: temporaryReferences,
    _rootArrayContexts: new WeakMap(),
    _arraySizeLimit: arraySizeLimit
  };
}
function close(response) {
  reportGlobalError(response, Error("Connection closed."));
}
function loadServerReference(bundlerConfig, metaData) {
  var id = metaData.id;
  if ("string" !== typeof id) return null;
  var serverReference = resolveServerReference(bundlerConfig, id);
  bundlerConfig = preloadModule(serverReference);
  metaData = metaData.bound;
  return metaData instanceof Promise
    ? Promise.all([metaData, bundlerConfig]).then(function (_ref) {
        _ref = _ref[0];
        var fn = requireModule(serverReference);
        if (1e3 < _ref.length)
          throw Error(
            "Server Function has too many bound arguments. Received " +
              _ref.length +
              " but the limit is 1000."
          );
        return fn.bind.apply(fn, [null].concat(_ref));
      })
    : bundlerConfig
      ? Promise.resolve(bundlerConfig).then(function () {
          return requireModule(serverReference);
        })
      : Promise.resolve(requireModule(serverReference));
}
function decodeBoundActionMetaData(
  body,
  serverManifest,
  formFieldPrefix,
  arraySizeLimit
) {
  body = createResponse(
    serverManifest,
    formFieldPrefix,
    void 0,
    body,
    arraySizeLimit
  );
  close(body);
  body = getChunk(body, 0);
  body.then(function () {});
  if ("fulfilled" !== body.status) throw body.reason;
  return body.value;
}
function createDrainHandler(destination, request) {
  return function () {
    return startFlowing(request, destination);
  };
}
function createCancelHandler(request, reason) {
  return function () {
    request.destination = null;
    abort(request, Error(reason));
  };
}
exports.createTemporaryReferenceSet = function () {
  return new WeakMap();
};
exports.decodeAction = function (body, serverManifest) {
  var formData = new FormData(),
    maybeActionKey = null;
  body.forEach(function (value, key) {
    key.startsWith("$ACTION_")
      ? key.startsWith("$ACTION_REF_")
        ? (maybeActionKey = key)
        : key.startsWith("$ACTION_ID_") && (maybeActionKey = key)
      : formData.append(key, value);
  });
  if (null === maybeActionKey) return null;
  var actionKey = maybeActionKey,
    action = null;
  if (actionKey.startsWith("$ACTION_REF_"))
    (actionKey = "$ACTION_" + actionKey.slice(12) + ":"),
      (body = decodeBoundActionMetaData(body, serverManifest, actionKey)),
      (action = loadServerReference(serverManifest, body));
  else if (actionKey.startsWith("$ACTION_ID_"))
    (body = actionKey.slice(11)),
      (action = loadServerReference(serverManifest, { id: body, bound: null }));
  else throw Error("Cannot handle action key. This is a bug in React.");
  return action.then(function (fn) {
    return fn.bind(null, formData);
  });
};
exports.decodeFormState = function (actionResult, body, serverManifest) {
  var keyPath = body.get("$ACTION_KEY");
  if ("string" !== typeof keyPath) return Promise.resolve(null);
  var actionKey = null;
  body.forEach(function (value, key) {
    key.startsWith("$ACTION_REF_") && (actionKey = key);
  });
  if (null === actionKey) return Promise.resolve(null);
  var formFieldPrefix = "$ACTION_" + actionKey.slice(12) + ":";
  body = decodeBoundActionMetaData(body, serverManifest, formFieldPrefix);
  var referenceId = body.id;
  return Promise.resolve(body.bound).then(function (bound) {
    return null === bound
      ? null
      : [actionResult, keyPath, referenceId, bound.length - 1];
  });
};
exports.decodeReply = function (body, options) {
  if ("string" === typeof body) {
    var form = new FormData();
    form.append("0", body);
    body = form;
  }
  body = createResponse(
    null,
    "",
    options ? options.temporaryReferences : void 0,
    body,
    options ? options.arraySizeLimit : void 0
  );
  options = getChunk(body, 0);
  close(body);
  return options;
};
exports.registerClientReference = function (proxyImplementation, id, hblp) {
  return Object.defineProperties(proxyImplementation, {
    $$typeof: { value: CLIENT_REFERENCE_TAG$1 },
    $$id: { value: id },
    $$hblp: { value: hblp }
  });
};
exports.registerServerReference = function (reference, id) {
  return Object.defineProperties(reference, {
    $$typeof: { value: SERVER_REFERENCE_TAG },
    $$id: { value: id, configurable: !0 },
    $$bound: { value: null, configurable: !0 },
    bind: { value: bind, configurable: !0 },
    toString: serverReferenceToString
  });
};
exports.renderToPipeableStream = function (model, options) {
  var request = new RequestInstance(
      20,
      model,
      null,
      options ? options.onError : void 0,
      noop,
      noop,
      options ? options.identifierPrefix : void 0,
      options ? options.temporaryReferences : void 0
    ),
    hasStartedFlowing = !1;
  startWork(request);
  return {
    pipe: function (destination) {
      if (hasStartedFlowing)
        throw Error(
          "React currently only supports piping to one writable stream."
        );
      hasStartedFlowing = !0;
      startFlowing(request, destination);
      destination.on("drain", createDrainHandler(destination, request));
      destination.on(
        "error",
        createCancelHandler(
          request,
          "The destination stream errored while writing data."
        )
      );
      destination.on(
        "close",
        createCancelHandler(request, "The destination stream closed early.")
      );
      return destination;
    },
    abort: function (reason) {
      abort(request, reason);
    }
  };
};
