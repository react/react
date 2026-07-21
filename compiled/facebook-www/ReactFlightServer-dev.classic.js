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
__DEV__ &&
  (function () {
    function voidHandler() {}
    function flushBuffered(destination) {
      "function" === typeof destination.flush && destination.flush();
    }
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
    function completeWriting(destination) {
      currentView &&
        0 < writtenBytes &&
        destination.write(currentView.subarray(0, writtenBytes));
      currentView = null;
      writtenBytes = 0;
      destinationHasCapacity = !0;
    }
    function byteLengthOfChunk(chunk) {
      return "string" === typeof chunk
        ? Buffer.byteLength(chunk, "utf8")
        : chunk.byteLength;
    }
    function isClientReference(reference) {
      return reference.$$typeof === CLIENT_REFERENCE_TAG$1;
    }
    function bind() {
      var newFn = FunctionBind.apply(this, arguments);
      if (this.$$typeof === SERVER_REFERENCE_TAG) {
        null != arguments[0] &&
          console.error(
            'Cannot bind "this" of a Server Action. Pass null or undefined as the first argument to .bind().'
          );
        var args = ArraySlice.call(arguments, 1),
          $$typeof = { value: SERVER_REFERENCE_TAG },
          $$id = { value: this.$$id };
        args = { value: this.$$bound ? this.$$bound.concat(args) : args };
        return Object.defineProperties(newFn, {
          $$typeof: $$typeof,
          $$id: $$id,
          $$bound: args,
          $$location: { value: this.$$location, configurable: !0 },
          bind: { value: bind, configurable: !0 }
        });
      }
      return newFn;
    }
    function collectStackTracePrivate(error, structuredStackTrace) {
      error = [];
      for (var i = framesToSkip; i < structuredStackTrace.length; i++) {
        var callSite = structuredStackTrace[i],
          name = callSite.getFunctionName() || "<anonymous>";
        if (name.includes("react_stack_bottom_frame")) break;
        else if (callSite.isNative())
          (callSite = callSite.isAsync()),
            error.push([name, "", 0, 0, 0, 0, callSite]);
        else {
          if (callSite.isConstructor()) name = "new " + name;
          else if (!callSite.isToplevel()) {
            var callSite$jscomp$0 = callSite;
            name = callSite$jscomp$0.getTypeName();
            var methodName = callSite$jscomp$0.getMethodName();
            callSite$jscomp$0 = callSite$jscomp$0.getFunctionName();
            var result = "";
            callSite$jscomp$0
              ? (name &&
                  identifierRegExp.test(callSite$jscomp$0) &&
                  callSite$jscomp$0 !== name &&
                  (result += name + "."),
                (result += callSite$jscomp$0),
                !methodName ||
                  callSite$jscomp$0 === methodName ||
                  callSite$jscomp$0.endsWith("." + methodName) ||
                  callSite$jscomp$0.endsWith(" " + methodName) ||
                  (result += " [as " + methodName + "]"))
              : (name && (result += name + "."),
                (result = methodName
                  ? result + methodName
                  : result + "<anonymous>"));
            name = result;
          }
          "<anonymous>" === name && (name = "");
          methodName = callSite.getScriptNameOrSourceURL() || "<anonymous>";
          "<anonymous>" === methodName &&
            ((methodName = ""),
            callSite.isEval() &&
              (callSite$jscomp$0 = callSite.getEvalOrigin()) &&
              (methodName = callSite$jscomp$0.toString() + ", <anonymous>"));
          callSite$jscomp$0 = callSite.getLineNumber() || 0;
          result = callSite.getColumnNumber() || 0;
          var enclosingLine =
              "function" === typeof callSite.getEnclosingLineNumber
                ? callSite.getEnclosingLineNumber() || 0
                : 0,
            enclosingCol =
              "function" === typeof callSite.getEnclosingColumnNumber
                ? callSite.getEnclosingColumnNumber() || 0
                : 0;
          callSite = callSite.isAsync();
          error.push([
            name,
            methodName,
            callSite$jscomp$0,
            result,
            enclosingLine,
            enclosingCol,
            callSite
          ]);
        }
      }
      collectedStackTrace = error;
      return "";
    }
    function collectStackTrace(error, structuredStackTrace) {
      collectStackTracePrivate(error, structuredStackTrace);
      error = (error.name || "Error") + ": " + (error.message || "");
      for (var i = 0; i < structuredStackTrace.length; i++)
        error += "\n    at " + structuredStackTrace[i].toString();
      return error;
    }
    function parseStackTrace(error, skipFrames) {
      var existing = stackTraceCache.get(error);
      if (void 0 !== existing) return existing;
      collectedStackTrace = null;
      framesToSkip = skipFrames;
      existing = Error.prepareStackTrace;
      Error.prepareStackTrace = collectStackTrace;
      try {
        var stack = String(error.stack);
      } finally {
        Error.prepareStackTrace = existing;
      }
      if (null !== collectedStackTrace)
        return (
          (stack = collectedStackTrace),
          (collectedStackTrace = null),
          stackTraceCache.set(error, stack),
          stack
        );
      stack.startsWith("Error: react-stack-top-frame\n") &&
        (stack = stack.slice(29));
      existing = stack.indexOf("react_stack_bottom_frame");
      -1 !== existing && (existing = stack.lastIndexOf("\n", existing));
      -1 !== existing && (stack = stack.slice(0, existing));
      stack = stack.split("\n");
      for (existing = []; skipFrames < stack.length; skipFrames++) {
        var parsed = frameRegExp.exec(stack[skipFrames]);
        if (parsed) {
          var name = parsed[1] || "",
            isAsync = "async " === parsed[8];
          "<anonymous>" === name
            ? (name = "")
            : name.startsWith("async ") &&
              ((name = name.slice(5)), (isAsync = !0));
          var filename = parsed[2] || parsed[5] || "";
          "<anonymous>" === filename && (filename = "");
          existing.push([
            name,
            filename,
            +(parsed[3] || parsed[6]),
            +(parsed[4] || parsed[7]),
            0,
            0,
            isAsync
          ]);
        }
      }
      stackTraceCache.set(error, existing);
      return existing;
    }
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
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable)
        return null;
      maybeIterable =
        (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
        maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    function noop() {}
    function trackUsedThenable(thenableState, thenable, index) {
      index = thenableState[index];
      void 0 === index
        ? (thenableState.push(thenable),
          (thenableState._stacks || (thenableState._stacks = [])).push(Error()))
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
    function getSuspendedThenable() {
      if (null === suspendedThenable)
        throw Error(
          "Expected a suspended thenable. This is a bug in React. Please file an issue."
        );
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function getThenableStateAfterSuspending() {
      var state = thenableState || [];
      state._componentDebugInfo = currentComponentDebugInfo;
      thenableState = currentComponentDebugInfo = null;
      return state;
    }
    function unsupportedHook() {
      throw Error("This Hook is not supported in Server Components.");
    }
    function unsupportedRefresh() {
      throw Error(
        "Refreshing the cache is not supported in Server Components."
      );
    }
    function unsupportedContext() {
      throw Error("Cannot read a Client Context from a Server Component.");
    }
    function resolveOwner() {
      return currentOwner ? currentOwner : null;
    }
    function prepareStackTrace(error, structuredStackTrace) {
      error = (error.name || "Error") + ": " + (error.message || "");
      for (var i = 0; i < structuredStackTrace.length; i++)
        error += "\n    at " + structuredStackTrace[i].toString();
      return error;
    }
    function isObjectPrototype(object) {
      if (!object) return !1;
      var ObjectPrototype = Object.prototype;
      if (object === ObjectPrototype) return !0;
      if (getPrototypeOf(object)) return !1;
      object = Object.getOwnPropertyNames(object);
      for (var i = 0; i < object.length; i++)
        if (!(object[i] in ObjectPrototype)) return !1;
      return !0;
    }
    function isGetter(object, name) {
      if (object === Object.prototype || null === object) return !1;
      var descriptor = Object.getOwnPropertyDescriptor(object, name);
      return void 0 === descriptor
        ? isGetter(getPrototypeOf(object), name)
        : "function" === typeof descriptor.get;
    }
    function isSimpleObject(object) {
      if (!isObjectPrototype(getPrototypeOf(object))) return !1;
      for (
        var names = Object.getOwnPropertyNames(object), i = 0;
        i < names.length;
        i++
      ) {
        var descriptor = Object.getOwnPropertyDescriptor(object, names[i]);
        if (
          !descriptor ||
          (!descriptor.enumerable &&
            (("key" !== names[i] && "ref" !== names[i]) ||
              "function" !== typeof descriptor.get))
        )
          return !1;
      }
      return !0;
    }
    function objectName(object) {
      object = Object.prototype.toString.call(object);
      return object.slice(8, object.length - 1);
    }
    function describeKeyForErrorMessage(key) {
      var encodedKey = JSON.stringify(key);
      return '"' + key + '"' === encodedKey ? key : encodedKey;
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
    function describeObjectForErrorMessage(objectOrArray, expandedName) {
      var objKind = objectName(objectOrArray);
      if ("Object" !== objKind && "Array" !== objKind) return objKind;
      var start = -1,
        length = 0;
      if (isArrayImpl(objectOrArray))
        if (jsxChildrenParents.has(objectOrArray)) {
          var type = jsxChildrenParents.get(objectOrArray);
          objKind = "<" + describeElementType(type) + ">";
          for (var i = 0; i < objectOrArray.length; i++) {
            var value = objectOrArray[i];
            value =
              "string" === typeof value
                ? value
                : "object" === typeof value && null !== value
                  ? "{" + describeObjectForErrorMessage(value) + "}"
                  : "{" + describeValueForErrorMessage(value) + "}";
            "" + i === expandedName
              ? ((start = objKind.length),
                (length = value.length),
                (objKind += value))
              : (objKind =
                  15 > value.length && 40 > objKind.length + value.length
                    ? objKind + value
                    : objKind + "{...}");
          }
          objKind += "</" + describeElementType(type) + ">";
        } else {
          objKind = "[";
          for (type = 0; type < objectOrArray.length; type++)
            0 < type && (objKind += ", "),
              (i = objectOrArray[type]),
              (i =
                "object" === typeof i && null !== i
                  ? describeObjectForErrorMessage(i)
                  : describeValueForErrorMessage(i)),
              "" + type === expandedName
                ? ((start = objKind.length),
                  (length = i.length),
                  (objKind += i))
                : (objKind =
                    10 > i.length && 40 > objKind.length + i.length
                      ? objKind + i
                      : objKind + "...");
          objKind += "]";
        }
      else if (objectOrArray.$$typeof === REACT_ELEMENT_TYPE)
        objKind = "<" + describeElementType(objectOrArray.type) + "/>";
      else {
        if (objectOrArray.$$typeof === CLIENT_REFERENCE_TAG) return "client";
        if (jsxPropsParents.has(objectOrArray)) {
          objKind = jsxPropsParents.get(objectOrArray);
          objKind = "<" + (describeElementType(objKind) || "...");
          type = Object.keys(objectOrArray);
          for (i = 0; i < type.length; i++) {
            objKind += " ";
            value = type[i];
            objKind += describeKeyForErrorMessage(value) + "=";
            var _value2 = objectOrArray[value];
            var _substr2 =
              value === expandedName &&
              "object" === typeof _value2 &&
              null !== _value2
                ? describeObjectForErrorMessage(_value2)
                : describeValueForErrorMessage(_value2);
            "string" !== typeof _value2 && (_substr2 = "{" + _substr2 + "}");
            value === expandedName
              ? ((start = objKind.length),
                (length = _substr2.length),
                (objKind += _substr2))
              : (objKind =
                  10 > _substr2.length && 40 > objKind.length + _substr2.length
                    ? objKind + _substr2
                    : objKind + "...");
          }
          objKind += ">";
        } else {
          objKind = "{";
          type = Object.keys(objectOrArray);
          for (i = 0; i < type.length; i++)
            0 < i && (objKind += ", "),
              (value = type[i]),
              (objKind += describeKeyForErrorMessage(value) + ": "),
              (_value2 = objectOrArray[value]),
              (_value2 =
                "object" === typeof _value2 && null !== _value2
                  ? describeObjectForErrorMessage(_value2)
                  : describeValueForErrorMessage(_value2)),
              value === expandedName
                ? ((start = objKind.length),
                  (length = _value2.length),
                  (objKind += _value2))
                : (objKind =
                    10 > _value2.length && 40 > objKind.length + _value2.length
                      ? objKind + _value2
                      : objKind + "...");
          objKind += "}";
        }
      }
      return void 0 === expandedName
        ? objKind
        : -1 < start && 0 < length
          ? ((objectOrArray = " ".repeat(start) + "^".repeat(length)),
            "\n  " + objKind + "\n  " + objectOrArray)
          : "\n  " + objKind;
    }
    function defaultFilterStackFrame(filename) {
      return (
        "" !== filename &&
        !filename.startsWith("node:") &&
        !filename.includes("node_modules")
      );
    }
    function filterStackTrace(request, stack) {
      request = request.filterStackFrame;
      for (var filteredStack = [], i = 0; i < stack.length; i++) {
        var callsite = stack[i],
          functionName = callsite[0];
        var url = callsite[1];
        if (url.startsWith("about://React/")) {
          var envIdx = url.indexOf("/", 14),
            suffixIdx = url.lastIndexOf("?");
          -1 < envIdx &&
            -1 < suffixIdx &&
            (url = decodeURI(url.slice(envIdx + 1, suffixIdx)));
        }
        request(url, functionName, callsite[2], callsite[3]) &&
          ((callsite = callsite.slice(0)),
          (callsite[1] = url),
          filteredStack.push(callsite));
      }
      return filteredStack;
    }
    function patchConsole(consoleInst, methodName) {
      var descriptor = Object.getOwnPropertyDescriptor(consoleInst, methodName);
      if (
        descriptor &&
        (descriptor.configurable || descriptor.writable) &&
        "function" === typeof descriptor.value
      ) {
        var originalMethod = descriptor.value;
        descriptor = Object.getOwnPropertyDescriptor(originalMethod, "name");
        var wrapperMethod = function () {
          var request = currentRequest ? currentRequest : null;
          if (("assert" !== methodName || !arguments[0]) && null !== request) {
            a: {
              var error = Error("react-stack-top-frame");
              collectedStackTrace = null;
              framesToSkip = 1;
              var previousPrepare = Error.prepareStackTrace;
              Error.prepareStackTrace = collectStackTracePrivate;
              try {
                if ("" !== error.stack) {
                  var JSCompiler_inline_result = null;
                  break a;
                }
              } finally {
                Error.prepareStackTrace = previousPrepare;
              }
              JSCompiler_inline_result = collectedStackTrace;
            }
            JSCompiler_inline_result = filterStackTrace(
              request,
              JSCompiler_inline_result || []
            );
            request.pendingDebugChunks++;
            error = resolveOwner();
            previousPrepare = Array.from(arguments);
            a: {
              var env = 0;
              switch (methodName) {
                case "dir":
                case "dirxml":
                case "groupEnd":
                case "table":
                  env = null;
                  break a;
                case "assert":
                  env = 1;
              }
              var format = previousPrepare[env],
                style = previousPrepare[env + 1],
                badge = previousPrepare[env + 2];
              "string" === typeof format &&
              format.startsWith("\u001b[0m\u001b[7m%c%s\u001b[0m%c") &&
              "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px" ===
                style &&
              "string" === typeof badge
                ? ((format = format.slice(18)),
                  " " === format[0] && (format = format.slice(1)),
                  previousPrepare.splice(env, 4, format),
                  (env = badge.slice(1, badge.length - 1)))
                : (env = null);
            }
            null === env && (env = (0, request.environmentName)());
            null != error && outlineComponentInfo(request, error);
            badge = [methodName, JSCompiler_inline_result, error, env];
            badge.push.apply(badge, previousPrepare);
            previousPrepare = serializeDebugModel(
              request,
              (null === request.deferredDebugObjects ? 500 : 10) +
                JSCompiler_inline_result.length,
              badge
            );
            "[" !== previousPrepare[0] &&
              (previousPrepare = serializeDebugModel(
                request,
                10 + JSCompiler_inline_result.length,
                [
                  methodName,
                  JSCompiler_inline_result,
                  error,
                  env,
                  "Unknown Value: React could not send it from the server."
                ]
              ));
            request.completedDebugChunks.push(":W" + previousPrepare + "\n");
          }
          return originalMethod.apply(this, arguments);
        };
        descriptor && Object.defineProperty(wrapperMethod, "name", descriptor);
        Object.defineProperty(consoleInst, methodName, {
          value: wrapperMethod
        });
      }
    }
    function getCurrentStackInDEV() {
      var owner = resolveOwner();
      if (null === owner) return "";
      try {
        var info = "";
        if (owner.owner || "string" !== typeof owner.name) {
          for (; owner; ) {
            var ownerStack = owner.debugStack;
            if (null != ownerStack) {
              if ((owner = owner.owner)) {
                var JSCompiler_temp_const = info;
                var error = ownerStack,
                  prevPrepareStackTrace = Error.prepareStackTrace;
                Error.prepareStackTrace = prepareStackTrace;
                var stack = error.stack;
                Error.prepareStackTrace = prevPrepareStackTrace;
                stack.startsWith("Error: react-stack-top-frame\n") &&
                  (stack = stack.slice(29));
                var idx = stack.indexOf("\n");
                -1 !== idx && (stack = stack.slice(idx + 1));
                idx = stack.indexOf("react_stack_bottom_frame");
                -1 !== idx && (idx = stack.lastIndexOf("\n", idx));
                var JSCompiler_inline_result =
                  -1 !== idx ? (stack = stack.slice(0, idx)) : "";
                info =
                  JSCompiler_temp_const + ("\n" + JSCompiler_inline_result);
              }
            } else break;
          }
          var JSCompiler_inline_result$jscomp$0 = info;
        } else {
          JSCompiler_temp_const = owner.name;
          if (void 0 === prefix)
            try {
              throw Error();
            } catch (x) {
              (prefix =
                ((error = x.stack.trim().match(/\n( *(at )?)/)) && error[1]) ||
                ""),
                (suffix =
                  -1 < x.stack.indexOf("\n    at")
                    ? " (<anonymous>)"
                    : -1 < x.stack.indexOf("@")
                      ? "@unknown:0:0"
                      : "");
            }
          JSCompiler_inline_result$jscomp$0 =
            "\n" + prefix + JSCompiler_temp_const + suffix;
        }
      } catch (x) {
        JSCompiler_inline_result$jscomp$0 =
          "\nError generating stack: " + x.message + "\n" + x.stack;
      }
      return JSCompiler_inline_result$jscomp$0;
    }
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
      temporaryReferences,
      debugStartTime,
      environmentName,
      filterStackFrame,
      keepDebugAlive
    ) {
      if (
        null !== ReactSharedInternalsServer.A &&
        ReactSharedInternalsServer.A !== DefaultAsyncDispatcher
      )
        throw Error(
          "Currently React only supports one RSC renderer at a time."
        );
      ReactSharedInternalsServer.A = DefaultAsyncDispatcher;
      ReactSharedInternalsServer.getCurrentStack = getCurrentStackInDEV;
      var abortSet = new Set(),
        pingedTasks = [],
        hints = new Set();
      this.type = type;
      this.status = OPENING;
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
      this.pendingDebugChunks = 0;
      this.completedDebugChunks = [];
      this.debugDestination = null;
      this.environmentName =
        void 0 === environmentName
          ? function () {
              return "Server";
            }
          : "function" !== typeof environmentName
            ? function () {
                return environmentName;
              }
            : environmentName;
      this.filterStackFrame =
        void 0 === filterStackFrame
          ? defaultFilterStackFrame
          : filterStackFrame;
      this.didWarnForKey = null;
      this.writtenDebugObjects = new WeakMap();
      this.deferredDebugObjects = keepDebugAlive
        ? { retained: new Map(), existing: new Map() }
        : null;
      type =
        "number" === typeof debugStartTime
          ? (this.timeOrigin = debugStartTime - performance.timeOrigin)
          : (this.timeOrigin = performance.now());
      emitTimeOriginChunk(this, type + performance.timeOrigin);
      this.abortTime = -0;
      model = createTask(
        this,
        model,
        null,
        !1,
        0,
        abortSet,
        type,
        null,
        null,
        null
      );
      pingedTasks.push(model);
    }
    function createRequest(
      model,
      bundlerConfig,
      onError,
      identifierPrefix,
      temporaryReferences,
      debugStartTime,
      environmentName,
      filterStackFrame,
      keepDebugAlive
    ) {
      var now = getCurrentTime();
      1e3 < now - lastResetTime &&
        ((ReactSharedInternalsServer.recentlyCreatedOwnerStacks = 0),
        (lastResetTime = now));
      return new RequestInstance(
        20,
        model,
        bundlerConfig,
        onError,
        noop,
        noop,
        identifierPrefix,
        temporaryReferences,
        debugStartTime,
        environmentName,
        filterStackFrame,
        keepDebugAlive
      );
    }
    function serializeDebugThenable(request, counter, thenable) {
      request.pendingDebugChunks++;
      var id = request.nextChunkId++,
        ref = "$@" + id.toString(16);
      request.writtenDebugObjects.set(thenable, ref);
      switch (thenable.status) {
        case "fulfilled":
          return (
            emitOutlinedDebugModelChunk(request, id, counter, thenable.value),
            ref
          );
        case "rejected":
          return (
            emitErrorChunk(request, id, "", thenable.reason, !0, null), ref
          );
      }
      if (request.status === ABORTING)
        return emitDebugHaltChunk(request, id), ref;
      var deferredDebugObjects = request.deferredDebugObjects;
      if (null !== deferredDebugObjects)
        return (
          deferredDebugObjects.retained.set(id, thenable),
          (ref = "$Y@" + id.toString(16)),
          request.writtenDebugObjects.set(thenable, ref),
          ref
        );
      var cancelled = !1;
      thenable.then(
        function (value) {
          cancelled ||
            ((cancelled = !0),
            request.status === ABORTING
              ? emitDebugHaltChunk(request, id)
              : (isArrayImpl(value) && 200 < value.length) ||
                  ((value instanceof ArrayBuffer ||
                    value instanceof Int8Array ||
                    value instanceof Uint8Array ||
                    value instanceof Uint8ClampedArray ||
                    value instanceof Int16Array ||
                    value instanceof Uint16Array ||
                    value instanceof Int32Array ||
                    value instanceof Uint32Array ||
                    value instanceof Float32Array ||
                    value instanceof Float64Array ||
                    value instanceof BigInt64Array ||
                    value instanceof BigUint64Array ||
                    value instanceof DataView) &&
                    1e3 < value.byteLength)
                ? emitDebugHaltChunk(request, id)
                : emitOutlinedDebugModelChunk(request, id, counter, value),
            enqueueFlush(request));
        },
        function (reason) {
          cancelled ||
            ((cancelled = !0),
            request.status === ABORTING
              ? emitDebugHaltChunk(request, id)
              : emitErrorChunk(request, id, "", reason, !0, null),
            enqueueFlush(request));
        }
      );
      Promise.resolve().then(function () {
        cancelled ||
          ((cancelled = !0),
          emitDebugHaltChunk(request, id),
          enqueueFlush(request),
          (counter = request = null));
      });
      return ref;
    }
    function emitRequestedDebugThenable(request, id, counter, thenable) {
      thenable.then(
        function (value) {
          request.status === ABORTING
            ? emitDebugHaltChunk(request, id)
            : emitOutlinedDebugModelChunk(request, id, counter, value);
          enqueueFlush(request);
        },
        function (reason) {
          request.status === ABORTING
            ? emitDebugHaltChunk(request, id)
            : emitErrorChunk(request, id, "", reason, !0, null);
          enqueueFlush(request);
        }
      );
    }
    function serializeThenable(request, task, thenable) {
      var newTask = createTask(
        request,
        thenable,
        task.keyPath,
        task.implicitSlot,
        task.formatContext,
        request.abortableTasks,
        task.time,
        task.debugOwner,
        task.debugStack,
        task.debugTask
      );
      switch (thenable.status) {
        case "fulfilled":
          return (
            forwardDebugInfoFromThenable(
              request,
              newTask,
              thenable,
              null,
              null
            ),
            (newTask.model = thenable.value),
            pingTask(request, newTask),
            newTask.id
          );
        case "rejected":
          return (
            forwardDebugInfoFromThenable(
              request,
              newTask,
              thenable,
              null,
              null
            ),
            erroredTask(request, newTask, thenable.reason),
            newTask.id
          );
        default:
          if (request.status === ABORTING)
            return (
              request.abortableTasks.delete(newTask),
              request.type === PRERENDER
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
          forwardDebugInfoFromCurrentContext(request, newTask, thenable);
          newTask.model = value;
          pingTask(request, newTask);
        },
        function (reason) {
          newTask.status === PENDING$1 &&
            ((newTask.timed = !0),
            erroredTask(request, newTask, reason),
            enqueueFlush(request));
        }
      );
      return newTask.id;
    }
    function serializeReadableStream(request, task, stream) {
      function progress(entry) {
        if (streamTask.status === PENDING$1)
          if (entry.done)
            (streamTask.status = COMPLETED),
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
            } catch (x$6) {
              error(x$6);
            }
      }
      function error(reason) {
        streamTask.status === PENDING$1 &&
          (request.cacheController.signal.removeEventListener(
            "abort",
            abortStream
          ),
          erroredTask(request, streamTask, reason),
          enqueueFlush(request),
          reader.cancel(reason).then(error, error));
      }
      function abortStream() {
        if (streamTask.status === PENDING$1) {
          var signal = request.cacheController.signal;
          signal.removeEventListener("abort", abortStream);
          signal = signal.reason;
          request.type === PRERENDER
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
          request.abortableTasks,
          task.time,
          task.debugOwner,
          task.debugStack,
          task.debugTask
        );
      request.pendingChunks++;
      task =
        streamTask.id.toString(16) + ":" + (isByteStream ? "r" : "R") + "\n";
      request.completedRegularChunks.push(task);
      request.cacheController.signal.addEventListener("abort", abortStream);
      reader.read().then(progress, error);
      return serializeByValueID(streamTask.id);
    }
    function serializeAsyncIterable(request, task, iterable, iterator) {
      function progress(entry) {
        if (streamTask.status === PENDING$1)
          if (entry.done) {
            streamTask.status = COMPLETED;
            if (void 0 === entry.value)
              var endStreamRow = streamTask.id.toString(16) + ":C\n";
            else
              try {
                var chunkId = outlineModel(request, entry.value);
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
                callIteratorInDEV(iterator, progress, error);
            } catch (x$7) {
              error(x$7);
            }
      }
      function error(reason) {
        streamTask.status === PENDING$1 &&
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
        if (streamTask.status === PENDING$1) {
          var signal = request.cacheController.signal;
          signal.removeEventListener("abort", abortIterable);
          var reason = signal.reason;
          request.type === PRERENDER
            ? (request.abortableTasks.delete(streamTask),
              haltTask(streamTask),
              finishHaltedTask(streamTask, request))
            : (erroredTask(request, streamTask, signal.reason),
              enqueueFlush(request));
          "function" === typeof iterator.throw &&
            iterator.throw(reason).then(noop, noop);
        }
      }
      var isIterator = iterable === iterator,
        streamTask = createTask(
          request,
          task.model,
          task.keyPath,
          task.implicitSlot,
          task.formatContext,
          request.abortableTasks,
          task.time,
          task.debugOwner,
          task.debugStack,
          task.debugTask
        );
      (task = iterable._debugInfo) &&
        forwardDebugInfo(request, streamTask, task);
      request.pendingChunks++;
      isIterator =
        streamTask.id.toString(16) + ":" + (isIterator ? "x" : "X") + "\n";
      request.completedRegularChunks.push(isIterator);
      request.cacheController.signal.addEventListener("abort", abortIterable);
      callIteratorInDEV(iterator, progress, error);
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
          return (
            forwardDebugInfoFromThenable(request, task, wakeable, null, null),
            wakeable.value
          );
        case "rejected":
          forwardDebugInfoFromThenable(request, task, wakeable, null, null);
          break;
        default:
          "string" !== typeof wakeable.status &&
            ((wakeable.status = "pending"),
            wakeable.then(
              function (fulfilledValue) {
                forwardDebugInfoFromCurrentContext(request, task, wakeable);
                "pending" === wakeable.status &&
                  ((wakeable.status = "fulfilled"),
                  (wakeable.value = fulfilledValue));
              },
              function (error) {
                forwardDebugInfoFromCurrentContext(request, task, wakeable);
                "pending" === wakeable.status &&
                  ((wakeable.status = "rejected"), (wakeable.reason = error));
              }
            ));
      }
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: wakeable,
        _init: readThenable
      };
    }
    function callWithDebugContextInDEV(request, task, callback, arg) {
      var componentDebugInfo = {
        name: "",
        env: task.environmentName,
        key: null,
        owner: task.debugOwner
      };
      componentDebugInfo.stack =
        null === task.debugStack
          ? null
          : filterStackTrace(request, parseStackTrace(task.debugStack, 1));
      componentDebugInfo.debugStack = task.debugStack;
      request = componentDebugInfo.debugTask = task.debugTask;
      currentOwner = componentDebugInfo;
      try {
        return request ? request.run(callback.bind(null, arg)) : callback(arg);
      } finally {
        currentOwner = null;
      }
    }
    function processServerComponentReturnValue(
      request,
      task,
      Component,
      result
    ) {
      if (
        "object" !== typeof result ||
        null === result ||
        isClientReference(result)
      )
        return result;
      if ("function" === typeof result.then)
        return (
          result.then(function (resolvedValue) {
            "object" === typeof resolvedValue &&
              null !== resolvedValue &&
              resolvedValue.$$typeof === REACT_ELEMENT_TYPE &&
              (resolvedValue._store.validated = 1);
          }, voidHandler),
          createLazyWrapperAroundWakeable(request, task, result)
        );
      result.$$typeof === REACT_ELEMENT_TYPE && (result._store.validated = 1);
      var iteratorFn = getIteratorFn(result);
      if (iteratorFn) {
        var $jscomp$compprop0 = {};
        $jscomp$compprop0 =
          (($jscomp$compprop0[Symbol.iterator] = function () {
            var iterator = iteratorFn.call(result);
            iterator !== result ||
              ("[object GeneratorFunction]" ===
                Object.prototype.toString.call(Component) &&
                "[object Generator]" ===
                  Object.prototype.toString.call(result)) ||
              callWithDebugContextInDEV(request, task, function () {
                console.error(
                  "Returning an Iterator from a Server Component is not supported since it cannot be looped over more than once. "
                );
              });
            return iterator;
          }),
          $jscomp$compprop0);
        $jscomp$compprop0._debugInfo = result._debugInfo;
        return $jscomp$compprop0;
      }
      return "function" !== typeof result[ASYNC_ITERATOR] ||
        ("function" === typeof ReadableStream &&
          result instanceof ReadableStream)
        ? result
        : (($jscomp$compprop0 = {}),
          ($jscomp$compprop0 =
            (($jscomp$compprop0[ASYNC_ITERATOR] = function () {
              var iterator = result[ASYNC_ITERATOR]();
              iterator !== result ||
                ("[object AsyncGeneratorFunction]" ===
                  Object.prototype.toString.call(Component) &&
                  "[object AsyncGenerator]" ===
                    Object.prototype.toString.call(result)) ||
                callWithDebugContextInDEV(request, task, function () {
                  console.error(
                    "Returning an AsyncIterator from a Server Component is not supported since it cannot be looped over more than once. "
                  );
                });
              return iterator;
            }),
            $jscomp$compprop0)),
          ($jscomp$compprop0._debugInfo = result._debugInfo),
          $jscomp$compprop0);
    }
    function renderFunctionComponent(
      request,
      task,
      key,
      Component,
      props,
      validated
    ) {
      var prevThenableState = task.thenableState;
      task.thenableState = null;
      if (canEmitDebugInfo)
        if (null !== prevThenableState)
          var componentDebugInfo = prevThenableState._componentDebugInfo;
        else {
          var componentDebugID = task.id;
          componentDebugInfo = Component.displayName || Component.name || "";
          var componentEnv = (0, request.environmentName)();
          request.pendingChunks++;
          componentDebugInfo = {
            name: componentDebugInfo,
            env: componentEnv,
            key: key,
            owner: task.debugOwner
          };
          componentDebugInfo.stack =
            null === task.debugStack
              ? null
              : filterStackTrace(request, parseStackTrace(task.debugStack, 1));
          componentDebugInfo.props = props;
          componentDebugInfo.debugStack = task.debugStack;
          componentDebugInfo.debugTask = task.debugTask;
          outlineComponentInfo(request, componentDebugInfo);
          var timestamp = performance.now();
          timestamp > task.time
            ? (emitTimingChunk(request, task.id, timestamp),
              (task.time = timestamp))
            : task.timed || emitTimingChunk(request, task.id, task.time);
          task.timed = !0;
          emitDebugChunk(request, componentDebugID, componentDebugInfo);
          task.environmentName = componentEnv;
          2 === validated &&
            warnForMissingKey(request, key, componentDebugInfo, task.debugTask);
        }
      else return outlineTask(request, task);
      thenableIndexCounter = 0;
      thenableState = prevThenableState;
      currentComponentDebugInfo = componentDebugInfo;
      props = task.debugTask
        ? task.debugTask.run(
            callComponentInDEV.bind(null, Component, props, componentDebugInfo)
          )
        : callComponentInDEV(Component, props, componentDebugInfo);
      if (request.status === ABORTING)
        throw (
          ("object" !== typeof props ||
            null === props ||
            "function" !== typeof props.then ||
            isClientReference(props) ||
            props.then(voidHandler, voidHandler),
          null)
        );
      validated = thenableState;
      if (null !== validated)
        for (
          prevThenableState = validated._stacks || (validated._stacks = []),
            componentDebugID = 0;
          componentDebugID < validated.length;
          componentDebugID++
        )
          forwardDebugInfoFromThenable(
            request,
            task,
            validated[componentDebugID],
            componentDebugInfo,
            prevThenableState[componentDebugID]
          );
      props = processServerComponentReturnValue(
        request,
        task,
        Component,
        props
      );
      task.debugOwner = componentDebugInfo;
      task.debugStack = null;
      task.debugTask = null;
      Component = task.keyPath;
      componentDebugInfo = task.implicitSlot;
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
      task.implicitSlot = componentDebugInfo;
      return request;
    }
    function warnForMissingKey(request, key, componentDebugInfo, debugTask) {
      function logKeyError() {
        console.error(
          'Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.',
          "",
          ""
        );
      }
      key = request.didWarnForKey;
      null == key && (key = request.didWarnForKey = new WeakSet());
      request = componentDebugInfo.owner;
      if (null != request) {
        if (key.has(request)) return;
        key.add(request);
      }
      debugTask
        ? debugTask.run(
            callComponentInDEV.bind(null, logKeyError, null, componentDebugInfo)
          )
        : callComponentInDEV(logKeyError, null, componentDebugInfo);
    }
    function renderFragment(request, task, children) {
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        null === child ||
          "object" !== typeof child ||
          child.$$typeof !== REACT_ELEMENT_TYPE ||
          null !== child.key ||
          child._store.validated ||
          (child._store.validated = 2);
      }
      if (null !== task.keyPath)
        return (
          (request = [
            REACT_ELEMENT_TYPE,
            REACT_FRAGMENT_TYPE,
            task.keyPath,
            { children: children },
            null,
            null,
            0
          ]),
          task.implicitSlot ? [request] : request
        );
      if ((i = children._debugInfo)) {
        if (canEmitDebugInfo) forwardDebugInfo(request, task, i);
        else return outlineTask(request, task);
        children = Array.from(children);
      }
      return children;
    }
    function renderAsyncFragment(request, task, children, getAsyncIterator) {
      if (null !== task.keyPath)
        return (
          (request = [
            REACT_ELEMENT_TYPE,
            REACT_FRAGMENT_TYPE,
            task.keyPath,
            { children: children },
            null,
            null,
            0
          ]),
          task.implicitSlot ? [request] : request
        );
      getAsyncIterator = getAsyncIterator.call(children);
      return serializeAsyncIterable(request, task, children, getAsyncIterator);
    }
    function deferTask(request, task) {
      task = createTask(
        request,
        task.model,
        task.keyPath,
        task.implicitSlot,
        task.formatContext,
        request.abortableTasks,
        task.time,
        task.debugOwner,
        task.debugStack,
        task.debugTask
      );
      pingTask(request, task);
      return serializeLazyID(task.id);
    }
    function outlineTask(request, task) {
      task = createTask(
        request,
        task.model,
        task.keyPath,
        task.implicitSlot,
        task.formatContext,
        request.abortableTasks,
        task.time,
        task.debugOwner,
        task.debugStack,
        task.debugTask
      );
      retryTask(request, task);
      return task.status === COMPLETED
        ? serializeByValueID(task.id)
        : serializeLazyID(task.id);
    }
    function renderElement(request, task, type, key, ref, props, validated) {
      if (null !== ref && void 0 !== ref)
        throw Error(
          "Refs cannot be used in Server Components, nor passed to Client Components."
        );
      jsxPropsParents.set(props, type);
      "object" === typeof props.children &&
        null !== props.children &&
        jsxChildrenParents.set(props.children, type);
      if (
        "function" !== typeof type ||
        isClientReference(type) ||
        type.$$typeof === TEMPORARY_REFERENCE_TAG
      ) {
        if (type === REACT_FRAGMENT_TYPE && null === key)
          return (
            2 === validated &&
              ((validated = {
                name: "Fragment",
                env: (0, request.environmentName)(),
                key: key,
                owner: task.debugOwner,
                stack:
                  null === task.debugStack
                    ? null
                    : filterStackTrace(
                        request,
                        parseStackTrace(task.debugStack, 1)
                      ),
                props: props,
                debugStack: task.debugStack,
                debugTask: task.debugTask
              }),
              warnForMissingKey(request, key, validated, task.debugTask)),
            (validated = task.implicitSlot),
            null === task.keyPath && (task.implicitSlot = !0),
            (request = renderModelDestructive(
              request,
              task,
              emptyRoot,
              "",
              props.children
            )),
            (task.implicitSlot = validated),
            request
          );
        if (null == type || "object" !== typeof type || isClientReference(type))
          "string" === typeof type &&
            ((ref = task.formatContext),
            ref !== ref &&
              null != props.children &&
              outlineModelWithFormatContext(request, props.children, ref));
        else
          switch (type.$$typeof) {
            case REACT_LAZY_TYPE:
              type = callLazyInitInDEV(type);
              if (request.status === ABORTING) throw null;
              return renderElement(
                request,
                task,
                type,
                key,
                ref,
                props,
                validated
              );
            case REACT_FORWARD_REF_TYPE:
              return renderFunctionComponent(
                request,
                task,
                key,
                type.render,
                props,
                validated
              );
            case REACT_MEMO_TYPE:
              return renderElement(
                request,
                task,
                type.type,
                key,
                ref,
                props,
                validated
              );
            case REACT_ELEMENT_TYPE:
              type._store.validated = 1;
          }
      } else
        return renderFunctionComponent(
          request,
          task,
          key,
          type,
          props,
          validated
        );
      ref = task.keyPath;
      null === key
        ? (key = ref)
        : null !== ref &&
          (key =
            ref === REACT_OPTIMISTIC_KEY || key === REACT_OPTIMISTIC_KEY
              ? REACT_OPTIMISTIC_KEY
              : ref + "," + key);
      var debugStack = null;
      ref = task.debugOwner;
      null !== ref && outlineComponentInfo(request, ref);
      if (null !== task.debugStack) {
        debugStack = filterStackTrace(
          request,
          parseStackTrace(task.debugStack, 1)
        );
        var id = outlineDebugModel(
          request,
          { objectLimit: 2 * debugStack.length + 1 },
          debugStack
        );
        request.writtenObjects.set(debugStack, serializeByValueID(id));
      }
      request = [
        REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        ref,
        debugStack,
        validated
      ];
      task = task.implicitSlot && null !== key ? [request] : request;
      return task;
    }
    function pingTask(request, task) {
      task.timed = !0;
      var pingedTasks = request.pingedTasks;
      pingedTasks.push(task);
      1 === pingedTasks.length &&
        ((request.flushScheduled = null !== request.destination),
        request.type === PRERENDER || request.status === OPENING
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
      abortSet,
      lastTimestamp,
      debugOwner,
      debugStack,
      debugTask
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
        status: PENDING$1,
        model: model,
        keyPath: keyPath,
        implicitSlot: implicitSlot,
        formatContext: formatContext,
        ping: function () {
          return pingTask(request, task);
        },
        thenableState: null,
        timed: !1
      };
      task.time = lastTimestamp;
      task.environmentName = request.environmentName();
      task.debugOwner = debugOwner;
      task.debugStack = debugStack;
      task.debugTask = debugTask;
      abortSet.add(task);
      return task;
    }
    function resolveModel(request, task, parent, parentPropertyName, value) {
      var jsonValue = value;
      null !== value &&
        "object" === typeof value &&
        "function" === typeof value.toJSON &&
        (jsonValue = value.toJSON(parentPropertyName));
      var originalValue = parent[parentPropertyName];
      "object" !== typeof originalValue ||
        originalValue === jsonValue ||
        originalValue instanceof Date ||
        callWithDebugContextInDEV(request, task, function () {
          ArrayBuffer.isView(originalValue)
            ? console.error(
                "Binary data with a toJSON method, such as a Node.js Buffer, is serialized through toJSON instead of as binary. Pass a Uint8Array or ArrayBuffer to send binary data.%s",
                describeObjectForErrorMessage(parent, parentPropertyName)
              )
            : "Object" !== objectName(originalValue)
              ? "string" === typeof jsxChildrenParents.get(parent)
                ? console.error(
                    "%s objects cannot be rendered as text children. Try formatting it using toString().%s",
                    objectName(originalValue),
                    describeObjectForErrorMessage(parent, parentPropertyName)
                  )
                : console.error(
                    "Only plain objects can be passed to Client Components from Server Components. %s objects are not supported.%s",
                    objectName(originalValue),
                    describeObjectForErrorMessage(parent, parentPropertyName)
                  )
              : console.error(
                  "Only plain objects can be passed to Client Components from Server Components. Objects with toJSON methods are not supported. Convert it manually to a simple value before passing it to props.%s",
                  describeObjectForErrorMessage(parent, parentPropertyName)
                );
        });
      value = renderModel(request, task, parent, parentPropertyName, jsonValue);
      if (null === value || "object" !== typeof value) return value;
      if (isArrayImpl(value)) {
        var _resolved = [];
        for (jsonValue = 0; jsonValue < value.length; jsonValue++)
          _resolved[jsonValue] = resolveModel(
            request,
            task,
            value,
            "" + jsonValue,
            value[jsonValue]
          );
        return _resolved;
      }
      jsonValue = {};
      for (_resolved in value)
        if (hasOwnProperty.call(value, _resolved)) {
          var resolvedValue = resolveModel(
            request,
            task,
            value,
            _resolved,
            value[_resolved]
          );
          _resolved === __PROTO__$1
            ? Object.defineProperty(jsonValue, _resolved, {
                value: resolvedValue,
                enumerable: !0,
                writable: !0,
                configurable: !0
              })
            : (jsonValue[_resolved] = resolvedValue);
        }
      return jsonValue;
    }
    function serializeByValueID(id) {
      return "$" + id.toString(16);
    }
    function serializeLazyID(id) {
      return "$L" + id.toString(16);
    }
    function serializeDeferredObject(request, value) {
      var deferredDebugObjects = request.deferredDebugObjects;
      return null !== deferredDebugObjects
        ? (request.pendingDebugChunks++,
          (request = request.nextChunkId++),
          deferredDebugObjects.existing.set(value, request),
          deferredDebugObjects.retained.set(request, value),
          "$Y" + request.toString(16))
        : "$Y";
    }
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
        var importId = request.nextChunkId++;
        emitImportChunk(request, importId, clientReference, !1);
        writtenClientReferences.set(clientReferenceKey, importId);
        return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
          ? serializeLazyID(importId)
          : serializeByValueID(importId);
      } catch (x) {
        return (
          request.pendingChunks++,
          (parent = request.nextChunkId++),
          (parentPropertyName = logRecoverableError(request, x, null)),
          emitErrorChunk(request, parent, parentPropertyName, x, !1, null),
          serializeByValueID(parent)
        );
      }
    }
    function serializeDebugClientReference(
      request,
      parent,
      parentPropertyName,
      clientReference
    ) {
      var existingId = request.writtenClientReferences.get(
        clientReference.$$id
      );
      if (void 0 !== existingId)
        return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
          ? serializeLazyID(existingId)
          : serializeByValueID(existingId);
      try {
        request.pendingDebugChunks++;
        var importId = request.nextChunkId++;
        emitImportChunk(request, importId, clientReference, !0);
        return parent[0] === REACT_ELEMENT_TYPE && "1" === parentPropertyName
          ? serializeLazyID(importId)
          : serializeByValueID(importId);
      } catch (x) {
        return (
          request.pendingDebugChunks++,
          (parent = request.nextChunkId++),
          (parentPropertyName = logRecoverableError(request, x, null)),
          emitErrorChunk(request, parent, parentPropertyName, x, !0, null),
          serializeByValueID(parent)
        );
      }
    }
    function outlineModel(request, value) {
      return outlineModelWithFormatContext(request, value, 0);
    }
    function outlineModelWithFormatContext(request, value, formatContext) {
      value = createTask(
        request,
        value,
        null,
        !1,
        formatContext,
        request.abortableTasks,
        performance.now(),
        null,
        null,
        null
      );
      retryTask(request, value);
      return value.id;
    }
    function serializeServerReference(request, serverReference) {
      var writtenServerReferences = request.writtenServerReferences,
        existingId = writtenServerReferences.get(serverReference);
      if (void 0 !== existingId) return "$h" + existingId.toString(16);
      existingId = serverReference.$$bound;
      existingId = null === existingId ? null : Promise.resolve(existingId);
      var id = serverReference.$$id,
        location = null,
        error = serverReference.$$location;
      error &&
        ((error = parseStackTrace(error, 1)),
        0 < error.length &&
          ((location = error[0]),
          (location = [location[0], location[1], location[2], location[3]])));
      existingId =
        null !== location
          ? {
              id: id,
              bound: existingId,
              name:
                "function" === typeof serverReference
                  ? serverReference.name
                  : "",
              env: (0, request.environmentName)(),
              location: location
            }
          : { id: id, bound: existingId };
      request = outlineModel(request, existingId);
      writtenServerReferences.set(serverReference, request);
      return "$h" + request.toString(16);
    }
    function serializeLargeTextString(request, text) {
      request.pendingChunks++;
      var textId = request.nextChunkId++;
      emitTextChunk(request, textId, text, !1);
      return serializeByValueID(textId);
    }
    function serializeMap(request, map) {
      map = Array.from(map);
      return "$Q" + outlineModel(request, map).toString(16);
    }
    function serializeFormData(request, formData) {
      formData = Array.from(formData.entries());
      return "$K" + outlineModel(request, formData).toString(16);
    }
    function serializeSet(request, set) {
      set = Array.from(set);
      return "$W" + outlineModel(request, set).toString(16);
    }
    function serializeTypedArray(request, tag, typedArray) {
      request.pendingChunks++;
      var bufferId = request.nextChunkId++;
      emitTypedArrayChunk(request, bufferId, tag, typedArray, !1);
      return serializeByValueID(bufferId);
    }
    function serializeDebugTypedArray(request, tag, typedArray) {
      if (1e3 < typedArray.byteLength && !doNotLimit.has(typedArray))
        return serializeDeferredObject(request, typedArray);
      request.pendingDebugChunks++;
      var bufferId = request.nextChunkId++;
      emitTypedArrayChunk(request, bufferId, tag, typedArray, !0);
      return serializeByValueID(bufferId);
    }
    function serializeDebugBlob(request, blob) {
      function progress(entry) {
        if (entry.done)
          emitOutlinedDebugModelChunk(
            request,
            id,
            { objectLimit: model.length + 2 },
            model
          ),
            enqueueFlush(request);
        else
          return (
            model.push(entry.value), reader.read().then(progress).catch(error)
          );
      }
      function error(reason) {
        emitErrorChunk(request, id, "", reason, !0, null);
        enqueueFlush(request);
        reader.cancel(reason).then(noop, noop);
      }
      var model = [blob.type],
        reader = blob.stream().getReader();
      request.pendingDebugChunks++;
      var id = request.nextChunkId++;
      reader.read().then(progress).catch(error);
      return "$B" + id.toString(16);
    }
    function serializeBlob(request, blob) {
      function progress(entry) {
        if (newTask.status === PENDING$1)
          if (entry.done)
            request.cacheController.signal.removeEventListener(
              "abort",
              abortBlob
            ),
              pingTask(request, newTask);
          else
            return (
              model.push(entry.value), reader.read().then(progress).catch(error)
            );
      }
      function error(reason) {
        newTask.status === PENDING$1 &&
          (request.cacheController.signal.removeEventListener(
            "abort",
            abortBlob
          ),
          erroredTask(request, newTask, reason),
          enqueueFlush(request),
          reader.cancel(reason).then(error, error));
      }
      function abortBlob() {
        if (newTask.status === PENDING$1) {
          var signal = request.cacheController.signal;
          signal.removeEventListener("abort", abortBlob);
          signal = signal.reason;
          request.type === PRERENDER
            ? (request.abortableTasks.delete(newTask),
              haltTask(newTask),
              finishHaltedTask(newTask, request))
            : (erroredTask(request, newTask, signal), enqueueFlush(request));
          reader.cancel(signal).then(error, error);
        }
      }
      var model = [blob.type],
        newTask = createTask(
          request,
          model,
          null,
          !1,
          0,
          request.abortableTasks,
          performance.now(),
          null,
          null,
          null
        ),
        reader = blob.stream().getReader();
      request.cacheController.signal.addEventListener("abort", abortBlob);
      reader.read().then(progress).catch(error);
      return "$B" + newTask.id.toString(16);
    }
    function renderModel(request, task, parent, key, value) {
      serializedSize += key.length;
      var prevKeyPath = task.keyPath,
        prevImplicitSlot = task.implicitSlot;
      try {
        return renderModelDestructive(request, task, parent, key, value);
      } catch (thrownValue) {
        parent = task.model;
        parent =
          "object" === typeof parent &&
          null !== parent &&
          (parent.$$typeof === REACT_ELEMENT_TYPE ||
            parent.$$typeof === REACT_LAZY_TYPE);
        if (request.status === ABORTING) {
          task.status = ABORTED;
          if (request.type === PRERENDER)
            return (
              (task = request.nextChunkId++),
              (task = parent
                ? serializeLazyID(task)
                : serializeByValueID(task)),
              task
            );
          task = request.fatalError;
          return parent ? serializeLazyID(task) : serializeByValueID(task);
        }
        key =
          thrownValue === SuspenseException
            ? getSuspendedThenable()
            : thrownValue;
        if (
          "object" === typeof key &&
          null !== key &&
          "function" === typeof key.then
        )
          return (
            (request = createTask(
              request,
              task.model,
              task.keyPath,
              task.implicitSlot,
              task.formatContext,
              request.abortableTasks,
              task.time,
              task.debugOwner,
              task.debugStack,
              task.debugTask
            )),
            (value = request.ping),
            key.then(value, value),
            (request.thenableState = getThenableStateAfterSuspending()),
            (task.keyPath = prevKeyPath),
            (task.implicitSlot = prevImplicitSlot),
            parent
              ? serializeLazyID(request.id)
              : serializeByValueID(request.id)
          );
        task.keyPath = prevKeyPath;
        task.implicitSlot = prevImplicitSlot;
        request.pendingChunks++;
        prevKeyPath = request.nextChunkId++;
        prevImplicitSlot = logRecoverableError(request, key, task);
        emitErrorChunk(
          request,
          prevKeyPath,
          prevImplicitSlot,
          key,
          !1,
          task.debugOwner
        );
        return parent
          ? serializeLazyID(prevKeyPath)
          : serializeByValueID(prevKeyPath);
      }
    }
    function renderModelDestructive(
      request,
      task,
      parent,
      parentPropertyName,
      value
    ) {
      task.model = value;
      parentPropertyName === __PROTO__$1 &&
        callWithDebugContextInDEV(request, task, function () {
          console.error(
            "Expected not to serialize an object with own property `__proto__`. When parsed this property will be omitted.%s",
            describeObjectForErrorMessage(parent, parentPropertyName)
          );
        });
      if (value === REACT_ELEMENT_TYPE) return "$";
      if (null === value) return null;
      if ("object" === typeof value) {
        switch (value.$$typeof) {
          case REACT_ELEMENT_TYPE:
            var elementReference = null,
              _writtenObjects = request.writtenObjects;
            if (null === task.keyPath && !task.implicitSlot) {
              var _existingReference = _writtenObjects.get(value);
              if (void 0 !== _existingReference)
                if (modelRoot === value) modelRoot = null;
                else return _existingReference;
              else
                -1 === parentPropertyName.indexOf(":") &&
                  ((_existingReference = _writtenObjects.get(parent)),
                  void 0 !== _existingReference &&
                    ((elementReference =
                      _existingReference + ":" + parentPropertyName),
                    _writtenObjects.set(value, elementReference)));
            }
            if (serializedSize > MAX_ROW_SIZE) return deferTask(request, task);
            if ((_existingReference = value._debugInfo))
              if (canEmitDebugInfo)
                forwardDebugInfo(request, task, _existingReference);
              else return outlineTask(request, task);
            _existingReference = value.props;
            var refProp = _existingReference.ref;
            refProp = void 0 !== refProp ? refProp : null;
            task.debugOwner = value._owner;
            task.debugStack = value._debugStack;
            task.debugTask = value._debugTask;
            if (
              void 0 === value._owner ||
              void 0 === value._debugStack ||
              void 0 === value._debugTask
            ) {
              var key = "";
              null !== value.key &&
                value.key !== REACT_OPTIMISTIC_KEY &&
                (key = ' key="' + value.key + '"');
              console.error(
                "Attempted to render <%s%s> without development properties. This is not supported. It can happen if:\n- The element is created with a production version of React but rendered in development.\n- The element was cloned with a custom function instead of `React.cloneElement`.\nThe props of this element may help locate this element: %o",
                value.type,
                key,
                value.props
              );
            }
            request = renderElement(
              request,
              task,
              value.type,
              value.key,
              refProp,
              _existingReference,
              value._store.validated
            );
            "object" === typeof request &&
              null !== request &&
              null !== elementReference &&
              (_writtenObjects.has(request) ||
                _writtenObjects.set(request, elementReference));
            return request;
          case REACT_LAZY_TYPE:
            if (serializedSize > MAX_ROW_SIZE) return deferTask(request, task);
            task.thenableState = null;
            elementReference = callLazyInitInDEV(value);
            if (request.status === ABORTING) throw null;
            if ((_writtenObjects = value._debugInfo))
              if (canEmitDebugInfo)
                forwardDebugInfo(request, task, _writtenObjects);
              else return outlineTask(request, task);
            return renderModelDestructive(
              request,
              task,
              parent,
              parentPropertyName,
              elementReference
            );
          case REACT_LEGACY_ELEMENT_TYPE:
            throw Error(
              'A React Element from an older version of React was rendered. This is not supported. It can happen if:\n- Multiple copies of the "react" package is used.\n- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n- A compiler tries to "inline" JSX instead of using the runtime.'
            );
        }
        if (isClientReference(value))
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
        _writtenObjects = elementReference.get(value);
        if ("function" === typeof value.then) {
          if (void 0 !== _writtenObjects) {
            if (null !== task.keyPath || task.implicitSlot)
              return (
                "$@" + serializeThenable(request, task, value).toString(16)
              );
            if (modelRoot === value) modelRoot = null;
            else return _writtenObjects;
          }
          request = "$@" + serializeThenable(request, task, value).toString(16);
          elementReference.set(value, request);
          return request;
        }
        if (void 0 !== _writtenObjects)
          if (modelRoot === value) {
            if (_writtenObjects !== serializeByValueID(task.id))
              return _writtenObjects;
            modelRoot = null;
          } else return _writtenObjects;
        else if (
          -1 === parentPropertyName.indexOf(":") &&
          ((_writtenObjects = elementReference.get(parent)),
          void 0 !== _writtenObjects)
        ) {
          _existingReference = parentPropertyName;
          if (isArrayImpl(parent) && parent[0] === REACT_ELEMENT_TYPE)
            switch (parentPropertyName) {
              case "1":
                _existingReference = "type";
                break;
              case "2":
                _existingReference = "key";
                break;
              case "3":
                _existingReference = "props";
                break;
              case "4":
                _existingReference = "_owner";
            }
          elementReference.set(
            value,
            _writtenObjects + ":" + _existingReference
          );
        }
        if (isArrayImpl(value)) return renderFragment(request, task, value);
        if (value instanceof Map) return serializeMap(request, value);
        if (value instanceof Set) return serializeSet(request, value);
        if ("function" === typeof FormData && value instanceof FormData)
          return serializeFormData(request, value);
        if (value instanceof Error) return serializeErrorValue(request, value);
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
            (elementReference = elementReference.call(value)),
            elementReference === value
              ? "$i" +
                outlineModel(request, Array.from(elementReference)).toString(16)
              : renderFragment(request, task, Array.from(elementReference))
          );
        if (
          "function" === typeof ReadableStream &&
          value instanceof ReadableStream
        )
          return serializeReadableStream(request, task, value);
        elementReference = value[ASYNC_ITERATOR];
        if ("function" === typeof elementReference)
          return renderAsyncFragment(request, task, value, elementReference);
        if (value instanceof Date) return "$D" + value.toJSON();
        elementReference = getPrototypeOf(value);
        if (
          elementReference !== ObjectPrototype$1 &&
          (null === elementReference ||
            null !== getPrototypeOf(elementReference))
        )
          throw Error(
            "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported." +
              describeObjectForErrorMessage(parent, parentPropertyName)
          );
        if ("Object" !== objectName(value))
          callWithDebugContextInDEV(request, task, function () {
            console.error(
              "Only plain objects can be passed to Client Components from Server Components. %s objects are not supported.%s",
              objectName(value),
              describeObjectForErrorMessage(parent, parentPropertyName)
            );
          });
        else if (!isSimpleObject(value))
          callWithDebugContextInDEV(request, task, function () {
            console.error(
              "Only plain objects can be passed to Client Components from Server Components. Classes or other objects with methods are not supported.%s",
              describeObjectForErrorMessage(parent, parentPropertyName)
            );
          });
        else if (Object.getOwnPropertySymbols) {
          var symbols = Object.getOwnPropertySymbols(value);
          0 < symbols.length &&
            callWithDebugContextInDEV(request, task, function () {
              console.error(
                "Only plain objects can be passed to Client Components from Server Components. Objects with symbol properties like %s are not supported.%s",
                symbols[0].description,
                describeObjectForErrorMessage(parent, parentPropertyName)
              );
            });
        }
        return value;
      }
      if ("string" === typeof value)
        return (
          (serializedSize += value.length),
          "Z" === value[value.length - 1] &&
          parent[parentPropertyName] instanceof Date
            ? "$D" + value
            : 1024 <= value.length && null !== byteLengthOfChunk
              ? serializeLargeTextString(request, value)
              : "$" === value[0]
                ? "$" + value
                : value
        );
      if ("boolean" === typeof value) return value;
      if ("number" === typeof value) return serializeNumber(value);
      if ("undefined" === typeof value) return "$undefined";
      if ("function" === typeof value) {
        if (isClientReference(value))
          return serializeClientReference(
            request,
            parent,
            parentPropertyName,
            value
          );
        if (value.$$typeof === SERVER_REFERENCE_TAG)
          return serializeServerReference(request, value);
        if (
          void 0 !== request.temporaryReferences &&
          ((request = request.temporaryReferences.get(value)),
          void 0 !== request)
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
        if (
          jsxChildrenParents.has(parent) ||
          (jsxPropsParents.has(parent) && "children" === parentPropertyName)
        )
          throw (
            ((request = value.displayName || value.name || "Component"),
            Error(
              "Functions are not valid as a child of Client Components. This may happen if you return " +
                request +
                " instead of <" +
                request +
                " /> from render. Or maybe you meant to call this function rather than return it." +
                describeObjectForErrorMessage(parent, parentPropertyName)
            ))
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
        _writtenObjects = request.nextChunkId++;
        emitSymbolChunk(request, _writtenObjects, elementReference);
        task.set(value, _writtenObjects);
        return serializeByValueID(_writtenObjects);
      }
      if ("bigint" === typeof value) return "$n" + value.toString(10);
      throw Error(
        "Type " +
          typeof value +
          " is not supported in Client Component props." +
          describeObjectForErrorMessage(parent, parentPropertyName)
      );
    }
    function logRecoverableError(request, error, task) {
      var prevRequest = currentRequest;
      currentRequest = null;
      try {
        var onError = request.onError;
        var errorDigest =
          null !== task
            ? callWithDebugContextInDEV(request, task, onError, error)
            : onError(error);
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
        ? ((request.status = CLOSED), request.destination.destroy(error))
        : ((request.status = CLOSING), (request.fatalError = error));
      request.cacheController.abort(
        Error("The render was aborted due to a fatal error.", { cause: error })
      );
    }
    function serializeErrorValue(request, error) {
      var name = "Error",
        env = (0, request.environmentName)();
      try {
        name = error.name;
        var message = String(error.message);
        var stack = filterStackTrace(request, parseStackTrace(error, 0));
        var errorEnv = error.environmentName;
        "string" === typeof errorEnv && (env = errorEnv);
      } catch (x) {
        (message =
          "An error occurred but serializing the error message failed."),
          (stack = []);
      }
      name = { name: name, message: message, stack: stack, env: env };
      "cause" in error &&
        ((message = outlineModel(request, error.cause)),
        (name.cause = serializeByValueID(message)));
      "undefined" !== typeof AggregateError &&
        error instanceof AggregateError &&
        ((error = outlineModel(request, error.errors)),
        (name.errors = serializeByValueID(error)));
      return "$Z" + outlineModel(request, name).toString(16);
    }
    function emitErrorChunk(request, id, digest, error, debug, owner) {
      var name = "Error",
        env = (0, request.environmentName)(),
        causeReference = null,
        errorsReference = null;
      try {
        if (error instanceof Error) {
          name = error.name;
          var message = String(error.message);
          var stack = filterStackTrace(request, parseStackTrace(error, 0));
          var errorEnv = error.environmentName;
          "string" === typeof errorEnv && (env = errorEnv);
          if ("cause" in error) {
            var cause = error.cause,
              causeId = debug
                ? outlineDebugModel(request, { objectLimit: 5 }, cause)
                : outlineModel(request, cause);
            causeReference = serializeByValueID(causeId);
          }
          if (
            "undefined" !== typeof AggregateError &&
            error instanceof AggregateError
          ) {
            var errors = error.errors,
              errorsId = debug
                ? outlineDebugModel(request, { objectLimit: 5 }, errors)
                : outlineModel(request, errors);
            errorsReference = serializeByValueID(errorsId);
          }
        } else
          (message =
            "object" === typeof error && null !== error
              ? describeObjectForErrorMessage(error)
              : String(error)),
            (stack = []);
      } catch (x) {
        (message =
          "An error occurred but serializing the error message failed."),
          (stack = []);
      }
      error = null == owner ? null : outlineComponentInfo(request, owner);
      digest = {
        digest: digest,
        name: name,
        message: message,
        stack: stack,
        env: env,
        owner: error
      };
      null !== causeReference && (digest.cause = causeReference);
      null !== errorsReference && (digest.errors = errorsReference);
      id = id.toString(16) + ":E" + stringify(digest) + "\n";
      debug
        ? request.completedDebugChunks.push(id)
        : request.completedErrorChunks.push(id);
    }
    function emitImportChunk(request, id, clientReferenceMetadata, debug) {
      clientReferenceMetadata = stringify(clientReferenceMetadata);
      id = id.toString(16) + ":I" + clientReferenceMetadata + "\n";
      debug
        ? request.completedDebugChunks.push(id)
        : request.completedImportChunks.push(id);
    }
    function emitSymbolChunk(request, id, name) {
      id = encodeReferenceChunk(request, id, "$S" + name);
      request.completedImportChunks.push(id);
    }
    function emitDebugHaltChunk(request, id) {
      id = id.toString(16) + ":\n";
      request.completedDebugChunks.push(id);
    }
    function emitDebugChunk(request, id, debugInfo) {
      var json = serializeDebugModel(request, 500, debugInfo);
      null !== request.debugDestination
        ? '"' === json[0] && "$" === json[1]
          ? ((id = id.toString(16) + ":D" + json + "\n"),
            request.completedRegularChunks.push(id))
          : ((debugInfo = request.nextChunkId++),
            (json = debugInfo.toString(16) + ":" + json + "\n"),
            request.pendingDebugChunks++,
            request.completedDebugChunks.push(json),
            (id = id.toString(16) + ':D"$' + debugInfo.toString(16) + '"\n'),
            request.completedRegularChunks.push(id))
        : ((id = id.toString(16) + ":D" + json + "\n"),
          request.completedRegularChunks.push(id));
    }
    function outlineComponentInfo(request, componentInfo) {
      var existingRef = request.writtenDebugObjects.get(componentInfo);
      if (void 0 !== existingRef) return existingRef;
      null != componentInfo.owner &&
        outlineComponentInfo(request, componentInfo.owner);
      existingRef = 10;
      null != componentInfo.stack &&
        (existingRef += componentInfo.stack.length);
      existingRef = { objectLimit: existingRef };
      var componentDebugInfo = {
        name: componentInfo.name,
        key: componentInfo.key
      };
      null != componentInfo.env && (componentDebugInfo.env = componentInfo.env);
      null != componentInfo.owner &&
        (componentDebugInfo.owner = componentInfo.owner);
      null == componentInfo.stack && null != componentInfo.debugStack
        ? (componentDebugInfo.stack = filterStackTrace(
            request,
            parseStackTrace(componentInfo.debugStack, 1)
          ))
        : null != componentInfo.stack &&
          (componentDebugInfo.stack = componentInfo.stack);
      componentDebugInfo.props = componentInfo.props;
      existingRef = outlineDebugModel(request, existingRef, componentDebugInfo);
      existingRef = serializeByValueID(existingRef);
      request.writtenDebugObjects.set(componentInfo, existingRef);
      request.writtenObjects.set(componentInfo, existingRef);
      return existingRef;
    }
    function emitTypedArrayChunk(request, id, tag, typedArray, debug) {
      debug ? request.pendingDebugChunks++ : request.pendingChunks++;
      typedArray = new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength
      );
      var binaryLength = typedArray.byteLength;
      id = id.toString(16) + ":" + tag + binaryLength.toString(16) + ",";
      debug
        ? request.completedDebugChunks.push(
            NEXT_TWO_CHUNKS_ARE_ATOMIC,
            id,
            typedArray
          )
        : request.completedRegularChunks.push(
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
      var binaryLength = byteLengthOfChunk(text);
      id = id.toString(16) + ":T" + binaryLength.toString(16) + ",";
      debug
        ? request.completedDebugChunks.push(
            NEXT_TWO_CHUNKS_ARE_ATOMIC,
            id,
            text
          )
        : request.completedRegularChunks.push(
            NEXT_TWO_CHUNKS_ARE_ATOMIC,
            id,
            text
          );
    }
    function renderDebugModel(
      request,
      counter,
      parent,
      parentPropertyName,
      value
    ) {
      if (null === value) return null;
      if (value === REACT_ELEMENT_TYPE) return "$";
      if ("object" === typeof value) {
        if (isClientReference(value))
          return serializeDebugClientReference(
            request,
            parent,
            parentPropertyName,
            value
          );
        if (value.$$typeof === CONSTRUCTOR_MARKER) {
          value = value.constructor;
          var ref = request.writtenDebugObjects.get(value);
          void 0 === ref &&
            ((request = outlineDebugModel(request, counter, value)),
            (ref = serializeByValueID(request)));
          return "$P" + ref.slice(1);
        }
        if (void 0 !== request.temporaryReferences) {
          var tempRef = request.temporaryReferences.get(value);
          if (void 0 !== tempRef) return "$T" + tempRef;
        }
        tempRef = request.writtenDebugObjects;
        var existingDebugReference = tempRef.get(value);
        if (void 0 !== existingDebugReference)
          if (debugModelRoot === value) debugModelRoot = null;
          else return existingDebugReference;
        else if (-1 === parentPropertyName.indexOf(":"))
          if (
            ((existingDebugReference = tempRef.get(parent)),
            void 0 !== existingDebugReference)
          ) {
            if (0 >= counter.objectLimit && !doNotLimit.has(value))
              return serializeDeferredObject(request, value);
            var propertyName = parentPropertyName;
            if (isArrayImpl(parent) && parent[0] === REACT_ELEMENT_TYPE)
              switch (parentPropertyName) {
                case "1":
                  propertyName = "type";
                  break;
                case "2":
                  propertyName = "key";
                  break;
                case "3":
                  propertyName = "props";
                  break;
                case "4":
                  propertyName = "_owner";
              }
            tempRef.set(value, existingDebugReference + ":" + propertyName);
          } else if (debugNoOutline !== value) {
            if ("function" === typeof value.then)
              return serializeDebugThenable(request, counter, value);
            request = outlineDebugModel(request, counter, value);
            return serializeByValueID(request);
          }
        parent = request.writtenObjects.get(value);
        if (void 0 !== parent) return parent;
        if (0 >= counter.objectLimit && !doNotLimit.has(value))
          return serializeDeferredObject(request, value);
        counter.objectLimit--;
        parent = request.deferredDebugObjects;
        if (
          null !== parent &&
          ((parentPropertyName = parent.existing.get(value)),
          void 0 !== parentPropertyName)
        )
          return (
            parent.existing.delete(value),
            parent.retained.delete(parentPropertyName),
            emitOutlinedDebugModelChunk(
              request,
              parentPropertyName,
              counter,
              value
            ),
            serializeByValueID(parentPropertyName)
          );
        switch (value.$$typeof) {
          case REACT_ELEMENT_TYPE:
            null != value._owner && outlineComponentInfo(request, value._owner);
            "object" === typeof value.type &&
              null !== value.type &&
              doNotLimit.add(value.type);
            "object" === typeof value.key &&
              null !== value.key &&
              doNotLimit.add(value.key);
            doNotLimit.add(value.props);
            null !== value._owner && doNotLimit.add(value._owner);
            counter = null;
            if (null != value._debugStack)
              for (
                counter = filterStackTrace(
                  request,
                  parseStackTrace(value._debugStack, 1)
                ),
                  doNotLimit.add(counter),
                  request = 0;
                request < counter.length;
                request++
              )
                doNotLimit.add(counter[request]);
            return [
              REACT_ELEMENT_TYPE,
              value.type,
              value.key,
              value.props,
              value._owner,
              counter,
              value._store.validated
            ];
          case REACT_LAZY_TYPE:
            value = value._payload;
            if (null !== value && "object" === typeof value) {
              switch (value._status) {
                case 1:
                  return (
                    (request = outlineDebugModel(
                      request,
                      counter,
                      value._result
                    )),
                    serializeLazyID(request)
                  );
                case 2:
                  return (
                    (counter = request.nextChunkId++),
                    emitErrorChunk(
                      request,
                      counter,
                      "",
                      value._result,
                      !0,
                      null
                    ),
                    serializeLazyID(counter)
                  );
              }
              switch (value.status) {
                case "fulfilled":
                  return (
                    (request = outlineDebugModel(
                      request,
                      counter,
                      value.value
                    )),
                    serializeLazyID(request)
                  );
                case "rejected":
                  return (
                    (counter = request.nextChunkId++),
                    emitErrorChunk(
                      request,
                      counter,
                      "",
                      value.reason,
                      !0,
                      null
                    ),
                    serializeLazyID(counter)
                  );
              }
            }
            request.pendingDebugChunks++;
            value = request.nextChunkId++;
            emitDebugHaltChunk(request, value);
            return serializeLazyID(value);
        }
        if ("function" === typeof value.then)
          return serializeDebugThenable(request, counter, value);
        if (isArrayImpl(value))
          return 200 < value.length && !doNotLimit.has(value)
            ? serializeDeferredObject(request, value)
            : value;
        if (value instanceof Date) return "$D" + value.toJSON();
        if (value instanceof Map) {
          value = Array.from(value);
          counter.objectLimit++;
          for (ref = 0; ref < value.length; ref++) {
            var entry = value[ref];
            doNotLimit.add(entry);
            var key = entry[0];
            entry = entry[1];
            "object" === typeof key && null !== key && doNotLimit.add(key);
            "object" === typeof entry &&
              null !== entry &&
              doNotLimit.add(entry);
          }
          return "$Q" + outlineDebugModel(request, counter, value).toString(16);
        }
        if (value instanceof Set) {
          value = Array.from(value);
          counter.objectLimit++;
          for (ref = 0; ref < value.length; ref++)
            (key = value[ref]),
              "object" === typeof key && null !== key && doNotLimit.add(key);
          return "$W" + outlineDebugModel(request, counter, value).toString(16);
        }
        if ("function" === typeof FormData && value instanceof FormData)
          return (
            (value = Array.from(value.entries())),
            "$K" +
              outlineDebugModel(
                request,
                { objectLimit: 2 * value.length + 1 },
                value
              ).toString(16)
          );
        if (value instanceof Error) {
          var name = "Error";
          parent = (0, request.environmentName)();
          try {
            (name = value.name),
              (key = String(value.message)),
              (ref = filterStackTrace(request, parseStackTrace(value, 0))),
              (entry = value.environmentName),
              "string" === typeof entry && (parent = entry);
          } catch (x) {
            (key =
              "An error occurred but serializing the error message failed."),
              (ref = []);
          }
          key = { name: name, message: key, stack: ref, env: parent };
          "cause" in value &&
            (counter.objectLimit--,
            (entry = outlineDebugModel(request, counter, value.cause)),
            (key.cause = serializeByValueID(entry)));
          "undefined" !== typeof AggregateError &&
            value instanceof AggregateError &&
            (counter.objectLimit--,
            (value = outlineDebugModel(request, counter, value.errors)),
            (key.errors = serializeByValueID(value)));
          request =
            "$Z" +
            outlineDebugModel(
              request,
              { objectLimit: 2 * ref.length + 1 },
              key
            ).toString(16);
          return request;
        }
        if (value instanceof ArrayBuffer)
          return serializeDebugTypedArray(request, "A", new Uint8Array(value));
        if (value instanceof Int8Array)
          return serializeDebugTypedArray(request, "O", value);
        if (value instanceof Uint8Array)
          return serializeDebugTypedArray(request, "o", value);
        if (value instanceof Uint8ClampedArray)
          return serializeDebugTypedArray(request, "U", value);
        if (value instanceof Int16Array)
          return serializeDebugTypedArray(request, "S", value);
        if (value instanceof Uint16Array)
          return serializeDebugTypedArray(request, "s", value);
        if (value instanceof Int32Array)
          return serializeDebugTypedArray(request, "L", value);
        if (value instanceof Uint32Array)
          return serializeDebugTypedArray(request, "l", value);
        if (value instanceof Float32Array)
          return serializeDebugTypedArray(request, "G", value);
        if (value instanceof Float64Array)
          return serializeDebugTypedArray(request, "g", value);
        if (value instanceof BigInt64Array)
          return serializeDebugTypedArray(request, "M", value);
        if (value instanceof BigUint64Array)
          return serializeDebugTypedArray(request, "m", value);
        if (value instanceof DataView)
          return serializeDebugTypedArray(request, "V", value);
        if ("function" === typeof Blob && value instanceof Blob)
          return serializeDebugBlob(request, value);
        if (getIteratorFn(value)) return Array.from(value);
        request = getPrototypeOf(value);
        if (request !== ObjectPrototype$1 && null !== request) {
          counter = Object.create(null);
          for (name in value)
            if (hasOwnProperty.call(value, name) || isGetter(request, name))
              counter[name] = value[name];
          ref = request.constructor;
          "function" !== typeof ref ||
            ref.prototype !== request ||
            hasOwnProperty.call(value, "") ||
            isGetter(request, "") ||
            (counter[""] = { $$typeof: CONSTRUCTOR_MARKER, constructor: ref });
          return counter;
        }
        return value;
      }
      if ("string" === typeof value) {
        if (1e6 < value.length)
          return (
            "This string of length " +
            value.length +
            " has been omitted by React to avoid sending too much data from the server."
          );
        if (1024 <= value.length) {
          if (0 >= counter.objectLimit)
            return serializeDeferredObject(request, value);
          counter.objectLimit--;
          request.pendingDebugChunks++;
          counter = request.nextChunkId++;
          emitTextChunk(request, counter, value, !0);
          return serializeByValueID(counter);
        }
        return "$" === value[0] ? "$" + value : value;
      }
      if ("boolean" === typeof value) return value;
      if ("number" === typeof value) return serializeNumber(value);
      if ("undefined" === typeof value) return "$undefined";
      if ("function" === typeof value) {
        if (isClientReference(value))
          return serializeDebugClientReference(
            request,
            parent,
            parentPropertyName,
            value
          );
        if (
          void 0 !== request.temporaryReferences &&
          ((counter = request.temporaryReferences.get(value)),
          void 0 !== counter)
        )
          return "$T" + counter;
        counter = request.writtenDebugObjects;
        ref = counter.get(value);
        if (void 0 !== ref) return ref;
        ref = Function.prototype.toString.call(value);
        key = value.name;
        key =
          "$E" +
          ("string" === typeof key
            ? "Object.defineProperty(" +
              ref +
              ',"name",{value:' +
              JSON.stringify(key) +
              "})"
            : "(" + ref + ")");
        request.pendingDebugChunks++;
        ref = request.nextChunkId++;
        key = encodeReferenceChunk(request, ref, key);
        request.completedDebugChunks.push(key);
        request = serializeByValueID(ref);
        counter.set(value, request);
        return request;
      }
      if ("symbol" === typeof value) {
        counter = request.writtenSymbols.get(value);
        if (void 0 !== counter) return serializeByValueID(counter);
        value = value.description;
        request.pendingChunks++;
        counter = request.nextChunkId++;
        emitSymbolChunk(request, counter, value);
        return serializeByValueID(counter);
      }
      return "bigint" === typeof value
        ? "$n" + value.toString(10)
        : "unknown type " + typeof value;
    }
    function serializeDebugModel(request, objectLimit, model) {
      function replacer(parentPropertyName) {
        try {
          return renderDebugModel(
            request,
            counter,
            this,
            parentPropertyName,
            this[parentPropertyName]
          );
        } catch (x) {
          return (
            "Unknown Value: React could not send it from the server.\n" +
            x.message
          );
        }
      }
      var counter = { objectLimit: objectLimit };
      objectLimit = debugNoOutline;
      debugNoOutline = model;
      try {
        return stringify(model, replacer);
      } catch (x) {
        return stringify(
          "Unknown Value: React could not send it from the server.\n" +
            x.message
        );
      } finally {
        debugNoOutline = objectLimit;
      }
    }
    function emitOutlinedDebugModelChunk(request, id, counter, model) {
      function replacer(parentPropertyName) {
        try {
          return renderDebugModel(
            request,
            counter,
            this,
            parentPropertyName,
            this[parentPropertyName]
          );
        } catch (x) {
          return (
            "Unknown Value: React could not send it from the server.\n" +
            x.message
          );
        }
      }
      "object" === typeof model && null !== model && doNotLimit.add(model);
      var prevModelRoot = debugModelRoot;
      debugModelRoot = model;
      "object" === typeof model &&
        null !== model &&
        request.writtenDebugObjects.set(model, serializeByValueID(id));
      try {
        var json = stringify(model, replacer);
      } catch (x) {
        json = stringify(
          "Unknown Value: React could not send it from the server.\n" +
            x.message
        );
      } finally {
        debugModelRoot = prevModelRoot;
      }
      id = id.toString(16) + ":" + json + "\n";
      request.completedDebugChunks.push(id);
    }
    function outlineDebugModel(request, counter, model) {
      var id = request.nextChunkId++;
      request.pendingDebugChunks++;
      emitOutlinedDebugModelChunk(request, id, counter, model);
      return id;
    }
    function emitTimeOriginChunk(request, timeOrigin) {
      request.pendingDebugChunks++;
      request.completedDebugChunks.push(":N" + timeOrigin + "\n");
    }
    function forwardDebugInfo(request$jscomp$1, task, debugInfo) {
      for (var id = task.id, i = 0; i < debugInfo.length; i++) {
        var info = debugInfo[i];
        if ("number" === typeof info.time)
          markOperationEndTime(request$jscomp$1, task, info.time);
        else if ("string" === typeof info.name)
          outlineComponentInfo(request$jscomp$1, info),
            request$jscomp$1.pendingChunks++,
            emitDebugChunk(request$jscomp$1, id, info);
        else if (info.awaited) {
          var ioInfo = info.awaited;
          if (!(ioInfo.end <= request$jscomp$1.timeOrigin)) {
            var request = request$jscomp$1,
              ioInfo$jscomp$0 = ioInfo;
            if (!request.writtenObjects.has(ioInfo$jscomp$0)) {
              request.pendingDebugChunks++;
              var id$jscomp$0 = request.nextChunkId++,
                owner = ioInfo$jscomp$0.owner;
              null != owner && outlineComponentInfo(request, owner);
              var debugStack =
                null == ioInfo$jscomp$0.stack &&
                null != ioInfo$jscomp$0.debugStack
                  ? filterStackTrace(
                      request,
                      parseStackTrace(ioInfo$jscomp$0.debugStack, 1)
                    )
                  : ioInfo$jscomp$0.stack;
              var env = ioInfo$jscomp$0.env;
              null == env && (env = (0, request.environmentName)());
              var request$jscomp$0 = request,
                id$jscomp$1 = id$jscomp$0,
                value = ioInfo$jscomp$0.value,
                objectLimit = 10;
              debugStack && (objectLimit += debugStack.length);
              var debugIOInfo = {
                name: ioInfo$jscomp$0.name,
                start: ioInfo$jscomp$0.start - request$jscomp$0.timeOrigin,
                end: ioInfo$jscomp$0.end - request$jscomp$0.timeOrigin
              };
              null != env && (debugIOInfo.env = env);
              null != debugStack && (debugIOInfo.stack = debugStack);
              null != owner && (debugIOInfo.owner = owner);
              void 0 !== value && (debugIOInfo.value = value);
              env = serializeDebugModel(
                request$jscomp$0,
                objectLimit,
                debugIOInfo
              );
              id$jscomp$1 = id$jscomp$1.toString(16) + ":J" + env + "\n";
              request$jscomp$0.completedDebugChunks.push(id$jscomp$1);
              request.writtenDebugObjects.set(
                ioInfo$jscomp$0,
                serializeByValueID(id$jscomp$0)
              );
            }
            null != info.owner &&
              outlineComponentInfo(request$jscomp$1, info.owner);
            request =
              null == info.stack && null != info.debugStack
                ? filterStackTrace(
                    request$jscomp$1,
                    parseStackTrace(info.debugStack, 1)
                  )
                : info.stack;
            ioInfo = { awaited: ioInfo };
            ioInfo.env =
              null != info.env
                ? info.env
                : (0, request$jscomp$1.environmentName)();
            null != info.owner && (ioInfo.owner = info.owner);
            null != request && (ioInfo.stack = request);
            request$jscomp$1.pendingChunks++;
            emitDebugChunk(request$jscomp$1, id, ioInfo);
          }
        } else
          request$jscomp$1.pendingChunks++,
            emitDebugChunk(request$jscomp$1, id, info);
      }
    }
    function forwardDebugInfoFromThenable(request, task, thenable) {
      (thenable = thenable._debugInfo) &&
        forwardDebugInfo(request, task, thenable);
    }
    function forwardDebugInfoFromCurrentContext(request, task, thenable) {
      (thenable = thenable._debugInfo) &&
        forwardDebugInfo(request, task, thenable);
    }
    function forwardDebugInfoFromAbortedTask(request, task) {
      var model = task.model;
      "object" === typeof model &&
        null !== model &&
        (model = model._debugInfo) &&
        forwardDebugInfo(request, task, model);
    }
    function emitTimingChunk(request, id, timestamp) {
      request.pendingChunks++;
      var json = '{"time":' + (timestamp - request.timeOrigin) + "}";
      null !== request.debugDestination
        ? ((timestamp = request.nextChunkId++),
          (json = timestamp.toString(16) + ":" + json + "\n"),
          request.pendingDebugChunks++,
          request.completedDebugChunks.push(json),
          (id = id.toString(16) + ':D"$' + timestamp.toString(16) + '"\n'),
          request.completedRegularChunks.push(id))
        : ((id = id.toString(16) + ":D" + json + "\n"),
          request.completedRegularChunks.push(id));
    }
    function markOperationEndTime(request, task, timestamp) {
      (request.status === ABORTING && timestamp > request.abortTime) ||
        (timestamp > task.time
          ? (emitTimingChunk(request, task.id, timestamp),
            (task.time = timestamp))
          : emitTimingChunk(request, task.id, task.time));
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
                                ? emitTypedArrayChunk(
                                    request,
                                    id,
                                    "m",
                                    value,
                                    !1
                                  )
                                : value instanceof DataView
                                  ? emitTypedArrayChunk(
                                      request,
                                      id,
                                      "V",
                                      value,
                                      !1
                                    )
                                  : ((value = resolveModel(
                                      request,
                                      task,
                                      { "": value },
                                      "",
                                      value
                                    )),
                                    (value = stringify(value)),
                                    (task =
                                      task.id.toString(16) +
                                      ":" +
                                      value +
                                      "\n"),
                                    request.completedRegularChunks.push(task));
    }
    function erroredTask(request, task, error) {
      task.timed && markOperationEndTime(request, task, performance.now());
      task.status = ERRORED$1;
      var digest = logRecoverableError(request, error, task);
      emitErrorChunk(request, task.id, digest, error, !1, task.debugOwner);
      request.abortableTasks.delete(task);
      callOnAllReadyIfReady(request);
    }
    function retryTask(request, task) {
      if (task.status === PENDING$1) {
        var prevCanEmitDebugInfo = canEmitDebugInfo;
        task.status = RENDERING;
        var parentSerializedSize = serializedSize;
        try {
          modelRoot = task.model;
          canEmitDebugInfo = !0;
          var resolvedModel = renderModelDestructive(
            request,
            task,
            emptyRoot,
            "",
            task.model
          );
          canEmitDebugInfo = !1;
          modelRoot = resolvedModel;
          task.keyPath = null;
          task.implicitSlot = !1;
          var currentEnv = (0, request.environmentName)();
          currentEnv !== task.environmentName &&
            (request.pendingChunks++,
            emitDebugChunk(request, task.id, { env: currentEnv }));
          task.timed && markOperationEndTime(request, task, performance.now());
          if ("object" === typeof resolvedModel && null !== resolvedModel)
            request.writtenObjects.set(
              resolvedModel,
              serializeByValueID(task.id)
            ),
              emitChunk(request, task, resolvedModel);
          else {
            var json = stringify(resolvedModel),
              processedChunk = task.id.toString(16) + ":" + json + "\n";
            request.completedRegularChunks.push(processedChunk);
          }
          task.status = COMPLETED;
          request.abortableTasks.delete(task);
          callOnAllReadyIfReady(request);
        } catch (thrownValue) {
          if (request.status === ABORTING)
            if (
              (request.abortableTasks.delete(task),
              (task.status = PENDING$1),
              request.type === PRERENDER)
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
              task.status = PENDING$1;
              task.thenableState = getThenableStateAfterSuspending();
              var ping = task.ping;
              x.then(ping, ping);
            } else erroredTask(request, task, x);
          }
        } finally {
          (canEmitDebugInfo = prevCanEmitDebugInfo),
            (serializedSize = parentSerializedSize);
        }
      }
    }
    function tryStreamTask(request, task) {
      var prevCanEmitDebugInfo = canEmitDebugInfo;
      canEmitDebugInfo = !1;
      var parentSerializedSize = serializedSize;
      try {
        emitChunk(request, task, task.model);
      } finally {
        (serializedSize = parentSerializedSize),
          (canEmitDebugInfo = prevCanEmitDebugInfo);
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
      task.status === PENDING$1 && (task.status = ABORTED);
    }
    function finishAbortedTask(task, request, errorId) {
      task.status === ABORTED &&
        (forwardDebugInfoFromAbortedTask(request, task),
        task.timed && markOperationEndTime(request, task, request.abortTime),
        (errorId = serializeByValueID(errorId)),
        (task = encodeReferenceChunk(request, task.id, errorId)),
        request.completedErrorChunks.push(task));
    }
    function haltTask(task) {
      task.status === PENDING$1 && (task.status = ABORTED);
    }
    function finishHaltedTask(task, request) {
      task.status === ABORTED &&
        (forwardDebugInfoFromAbortedTask(request, task),
        request.pendingChunks--);
    }
    function flushCompletedChunks(request) {
      if (null !== request.debugDestination) {
        var debugDestination = request.debugDestination;
        currentView = new Uint8Array(4096);
        writtenBytes = 0;
        destinationHasCapacity = !0;
        try {
          for (
            var debugChunks = request.completedDebugChunks, i = 0;
            i < debugChunks.length;
            i++
          ) {
            var item = debugChunks[i];
            if (item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
              if (i + 2 >= debugChunks.length)
                throw Error(
                  "A chunk pair is incomplete. This is a bug in React."
                );
              request.pendingDebugChunks -= 2;
              writeChunk(debugDestination, debugChunks[i + 1]);
              writeChunk(debugDestination, debugChunks[i + 2]);
              i += 2;
            } else
              request.pendingDebugChunks--, writeChunk(debugDestination, item);
          }
          debugChunks.splice(0, i);
        } finally {
          completeWriting(debugDestination);
        }
        flushBuffered(debugDestination);
      }
      debugDestination = request.destination;
      if (null !== debugDestination) {
        currentView = new Uint8Array(4096);
        writtenBytes = 0;
        destinationHasCapacity = !0;
        try {
          var importsChunks = request.completedImportChunks;
          for (
            debugChunks = 0;
            debugChunks < importsChunks.length;
            debugChunks++
          )
            if (
              (request.pendingChunks--,
              !writeChunkAndReturn(
                debugDestination,
                importsChunks[debugChunks]
              ))
            ) {
              request.destination = null;
              debugChunks++;
              break;
            }
          importsChunks.splice(0, debugChunks);
          var hintChunks = request.completedHintChunks;
          for (debugChunks = 0; debugChunks < hintChunks.length; debugChunks++)
            if (
              !writeChunkAndReturn(debugDestination, hintChunks[debugChunks])
            ) {
              request.destination = null;
              debugChunks++;
              break;
            }
          hintChunks.splice(0, debugChunks);
          if (null === request.debugDestination) {
            var _debugChunks = request.completedDebugChunks;
            for (
              debugChunks = 0;
              debugChunks < _debugChunks.length;
              debugChunks++
            ) {
              var _item = _debugChunks[debugChunks];
              importsChunks = void 0;
              if (_item === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
                if (debugChunks + 2 >= _debugChunks.length)
                  throw Error(
                    "A chunk pair is incomplete. This is a bug in React."
                  );
                request.pendingDebugChunks -= 2;
                writeChunk(debugDestination, _debugChunks[debugChunks + 1]);
                importsChunks = writeChunkAndReturn(
                  debugDestination,
                  _debugChunks[debugChunks + 2]
                );
                debugChunks += 2;
              } else
                request.pendingDebugChunks--,
                  (importsChunks = writeChunkAndReturn(
                    debugDestination,
                    _item
                  ));
              if (!importsChunks) {
                request.destination = null;
                debugChunks++;
                break;
              }
            }
            _debugChunks.splice(0, debugChunks);
          }
          var regularChunks = request.completedRegularChunks;
          for (
            debugChunks = 0;
            debugChunks < regularChunks.length;
            debugChunks++
          ) {
            var _item2 = regularChunks[debugChunks];
            _debugChunks = void 0;
            if (_item2 === NEXT_TWO_CHUNKS_ARE_ATOMIC) {
              if (debugChunks + 2 >= regularChunks.length)
                throw Error(
                  "A chunk pair is incomplete. This is a bug in React."
                );
              request.pendingChunks -= 2;
              writeChunk(debugDestination, regularChunks[debugChunks + 1]);
              _debugChunks = writeChunkAndReturn(
                debugDestination,
                regularChunks[debugChunks + 2]
              );
              debugChunks += 2;
            } else
              request.pendingChunks--,
                (_debugChunks = writeChunkAndReturn(debugDestination, _item2));
            if (!_debugChunks) {
              request.destination = null;
              debugChunks++;
              break;
            }
          }
          regularChunks.splice(0, debugChunks);
          var errorChunks = request.completedErrorChunks;
          for (debugChunks = 0; debugChunks < errorChunks.length; debugChunks++)
            if (
              (request.pendingChunks--,
              !writeChunkAndReturn(debugDestination, errorChunks[debugChunks]))
            ) {
              request.destination = null;
              debugChunks++;
              break;
            }
          errorChunks.splice(0, debugChunks);
        } finally {
          (request.flushScheduled = !1), completeWriting(debugDestination);
        }
        flushBuffered(debugDestination);
      }
      0 === request.pendingChunks &&
        ((regularChunks = request.debugDestination),
        0 === request.pendingDebugChunks
          ? (null !== regularChunks &&
              (regularChunks.end(), (request.debugDestination = null)),
            request.status < ABORTING &&
              request.cacheController.abort(
                Error(
                  "This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."
                )
              ),
            null !== request.destination &&
              ((request.status = CLOSED),
              request.destination.end(),
              (request.destination = null)),
            null !== request.debugDestination &&
              (request.debugDestination.end(),
              (request.debugDestination = null)))
          : null !== regularChunks &&
            null !== request.destination &&
            ((request.status = CLOSED),
            request.destination.end(),
            (request.destination = null)));
    }
    function startWork(request) {
      request.flushScheduled = null !== request.destination;
      Promise.resolve().then(function () {
        return performWork(request);
      });
      setImmediate(function () {
        request.status === OPENING && (request.status = 11);
      });
    }
    function enqueueFlush(request) {
      !1 !== request.flushScheduled ||
        0 !== request.pingedTasks.length ||
        (null === request.destination && null === request.debugDestination) ||
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
      if (request.status === CLOSING)
        (request.status = CLOSED), destination.destroy(request.fatalError);
      else if (request.status !== CLOSED && null === request.destination) {
        request.destination = destination;
        try {
          flushCompletedChunks(request);
        } catch (error) {
          logRecoverableError(request, error, null), fatalError(request, error);
        }
      }
    }
    function startFlowingDebug(request, debugDestination) {
      if (request.status === CLOSING)
        (request.status = CLOSED), debugDestination.destroy(request.fatalError);
      else if (request.status !== CLOSED && null === request.debugDestination) {
        request.debugDestination = debugDestination;
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
          request.status = ABORTING;
          request.abortTime = performance.now();
          request.cacheController.abort(reason);
          var abortableTasks = request.abortableTasks;
          if (0 < abortableTasks.size)
            if (request.type === PRERENDER)
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
        } catch (error$8) {
          logRecoverableError(request, error$8, null),
            fatalError(request, error$8);
        }
    }
    function fromHex(str) {
      return parseInt(str, 16);
    }
    function closeDebugChannel(request) {
      var deferredDebugObjects = request.deferredDebugObjects;
      if (null === deferredDebugObjects)
        throw Error(
          "resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React."
        );
      deferredDebugObjects.retained.forEach(function (value, id) {
        request.pendingDebugChunks--;
        deferredDebugObjects.retained.delete(id);
        deferredDebugObjects.existing.delete(value);
      });
      enqueueFlush(request);
    }
    function resolveServerReference(config, id) {
      return {
        $$typeof: Symbol.for("react.client.reference"),
        $$id: id,
        $$hblp: null
      };
    }
    function preloadModule(metadata) {
      if (!canUseDOM) return null;
      var jsr = require("JSResource")(metadata.$$id);
      if (null != jsr.getModuleIfRequireable()) return null;
      null != metadata.$$hblp &&
        window.Bootloader.handlePayload(metadata.$$hblp);
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
    function ReactPromise(status, value, reason) {
      this.status = status;
      this.value = value;
      this.reason = reason;
    }
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
                for (
                  response = 0;
                  response < resolveListeners.length;
                  response++
                )
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
        (done ? '{"done":true,"value":' : '{"done":false,"value":') +
          value +
          "}",
        (($jscomp$compprop4.id = -1),
        ($jscomp$compprop4[RESPONSE_SYMBOL] = response),
        $jscomp$compprop4)
      );
    }
    function resolveIteratorResultChunk(response, chunk, value, done) {
      resolveModelChunk(
        response,
        chunk,
        (done ? '{"done":true,"value":' : '{"done":false,"value":') +
          value +
          "}",
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
        null !== rejectListeners &&
          rejectChunk(response, rejectListeners, error);
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
          if (promiseValue.length > MAX_BOUND_ARGS) {
            reject(
              Error(
                "Server Function has too many bound arguments. Received " +
                  promiseValue.length +
                  " but the limit is " +
                  MAX_BOUND_ARGS +
                  "."
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
    function initializeModelChunk(chunk) {
      var prevHandler = initializingHandler;
      initializingHandler = null;
      var _chunk$reason = chunk.reason,
        response = _chunk$reason[RESPONSE_SYMBOL];
      _chunk$reason = _chunk$reason.id;
      _chunk$reason =
        -1 === _chunk$reason ? void 0 : _chunk$reason.toString(16);
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
    function resolveReference(
      response,
      handler,
      parentObject,
      key,
      resolvedValue
    ) {
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
          null !== key &&
            wakeChunk(response, key, handler.value, parentObject)));
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
              ? ((localLength = 0),
                (chunk = rootArrayContexts.get(id) || chunk))
              : ((chunk = null),
                "string" === typeof id
                  ? (localLength = id.length)
                  : "bigint" === typeof id
                    ? ((localLength = Math.abs(Number(id))),
                      (localLength =
                        0 === localLength
                          ? 1
                          : Math.floor(Math.log10(localLength)) + 1))
                    : (localLength = ArrayBuffer.isView(id)
                        ? id.byteLength
                        : 0));
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
                  {
                    chunk: null,
                    value: null,
                    reason: null,
                    deps: 1,
                    errored: !1
                  }),
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
              ? controller.close(
                  "C" === chunks ? '"$undefined"' : chunks.slice(1)
                )
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
              var _chunk = new ReactPromise("pending", null, null);
              _chunk.then(enqueue, flightController.error);
              previousBlockedChunk = _chunk;
              chunk.then(function () {
                previousBlockedChunk === _chunk &&
                  (previousBlockedChunk = null);
                resolveModelChunk(response, _chunk, json, -1);
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
      iterator = iterator
        ? $jscomp$compprop5[ASYNC_ITERATOR]()
        : $jscomp$compprop5;
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
            return (
              (obj = parseInt(value.slice(2), 16)), getChunk(response, obj)
            );
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
            if (
              void 0 === reference ||
              void 0 === response._temporaryReferences
            )
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
              value = response;
              reference = value.keys;
              null === reference &&
                ((reference = value.keys = Array.from(value.data.keys())),
                (value.keyPointer = 0));
              value = reference[value.keyPointer];
              if (void 0 === value) break;
              if (value.startsWith(key)) {
                reference = response.data.getAll(value);
                for (
                  var referencedFormDataKey = value.slice(key.length), i = 0;
                  i < reference.length;
                  i++
                )
                  arrayRoot.append(referencedFormDataKey, reference[i]);
                reference = response;
                reference.data.delete(value);
                reference.keyPointer++;
              } else if (value.startsWith(obj)) break;
              else response.keyPointer++;
            }
            return arrayRoot;
          case "i":
            return (
              (arrayRoot = value.slice(2)),
              getOutlinedModel(
                response,
                arrayRoot,
                obj,
                key,
                null,
                extractIterator
              )
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
            if (obj.length > MAX_BIGINT_DIGITS)
              throw Error(
                "BigInt is too large. Received " +
                  obj.length +
                  " digits but the limit is " +
                  MAX_BIGINT_DIGITS +
                  "."
              );
            null !== arrayRoot &&
              bumpArrayCount(arrayRoot, obj.length, response);
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
        return getOutlinedModel(
          response,
          value,
          obj,
          key,
          arrayRoot,
          createModel
        );
      }
      null !== arrayRoot && bumpArrayCount(arrayRoot, value.length, response);
      return value;
    }
    function createResponse(
      bundlerConfig,
      formFieldPrefix,
      temporaryReferences
    ) {
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
            if (_ref.length > MAX_BOUND_ARGS)
              throw Error(
                "Server Function has too many bound arguments. Received " +
                  _ref.length +
                  " but the limit is " +
                  MAX_BOUND_ARGS +
                  "."
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
    function startReadingFromDebugChannelReadable(request, stream) {
      function onData(chunk) {
        if ("string" === typeof chunk) {
          if (lastWasPartial) {
            var JSCompiler_temp_const = stringBuffer;
            var JSCompiler_inline_result = new Uint8Array(0);
            JSCompiler_inline_result = Buffer.from(
              JSCompiler_inline_result.buffer,
              JSCompiler_inline_result.byteOffset,
              JSCompiler_inline_result.byteLength
            ).toString("utf8");
            stringBuffer = JSCompiler_temp_const + JSCompiler_inline_result;
            lastWasPartial = !1;
          }
          stringBuffer += chunk;
        } else
          (stringBuffer += Buffer.from(
            chunk.buffer,
            chunk.byteOffset,
            chunk.byteLength
          ).toString("utf8")),
            (lastWasPartial = !0);
        chunk = stringBuffer.split("\n");
        for (
          JSCompiler_temp_const = 0;
          JSCompiler_temp_const < chunk.length - 1;
          JSCompiler_temp_const++
        ) {
          JSCompiler_inline_result = request;
          var message = chunk[JSCompiler_temp_const],
            deferredDebugObjects =
              JSCompiler_inline_result.deferredDebugObjects;
          if (null === deferredDebugObjects)
            throw Error(
              "resolveDebugMessage/closeDebugChannel should not be called for a Request that wasn't kept alive. This is a bug in React."
            );
          if ("" === message) closeDebugChannel(JSCompiler_inline_result);
          else {
            var command = message.charCodeAt(0);
            message = message.slice(2).split(",").map(fromHex);
            switch (command) {
              case 82:
                for (command = 0; command < message.length; command++) {
                  var id = message[command],
                    retainedValue = deferredDebugObjects.retained.get(id);
                  void 0 !== retainedValue &&
                    (JSCompiler_inline_result.pendingDebugChunks--,
                    deferredDebugObjects.retained.delete(id),
                    deferredDebugObjects.existing.delete(retainedValue),
                    enqueueFlush(JSCompiler_inline_result));
                }
                break;
              case 81:
                for (command = 0; command < message.length; command++)
                  (id = message[command]),
                    (retainedValue = deferredDebugObjects.retained.get(id)),
                    void 0 !== retainedValue &&
                      (deferredDebugObjects.retained.delete(id),
                      deferredDebugObjects.existing.delete(retainedValue),
                      emitOutlinedDebugModelChunk(
                        JSCompiler_inline_result,
                        id,
                        { objectLimit: 10 },
                        retainedValue
                      ),
                      enqueueFlush(JSCompiler_inline_result));
                break;
              case 80:
                for (command = 0; command < message.length; command++)
                  (id = message[command]),
                    (retainedValue = deferredDebugObjects.retained.get(id)),
                    void 0 !== retainedValue &&
                      (deferredDebugObjects.retained.delete(id),
                      emitRequestedDebugThenable(
                        JSCompiler_inline_result,
                        id,
                        { objectLimit: 10 },
                        retainedValue
                      ));
                break;
              default:
                throw Error(
                  "Unknown command. The debugChannel was not wired up properly."
                );
            }
          }
        }
        stringBuffer = chunk[chunk.length - 1];
      }
      function onError(error) {
        abort(
          request,
          Error("Lost connection to the Debug Channel.", { cause: error })
        );
      }
      function onClose() {
        closeDebugChannel(request);
      }
      var lastWasPartial = !1,
        stringBuffer = "";
      "function" === typeof stream.addEventListener &&
      "string" === typeof stream.binaryType
        ? ((stream.binaryType = "arraybuffer"),
          stream.addEventListener("message", function (event) {
            onData(event.data);
          }),
          stream.addEventListener("error", function (event) {
            onError(event.error);
          }),
          stream.addEventListener("close", onClose))
        : (stream.on("data", onData),
          stream.on("error", onError),
          stream.on("end", onClose));
    }
    function createFakeWritableFromWebSocket(webSocket) {
      return {
        write: function (chunk) {
          webSocket.send(chunk);
          return !0;
        },
        end: function () {
          webSocket.close();
        },
        destroy: function (reason) {
          "object" === typeof reason &&
            null !== reason &&
            (reason = reason.message);
          "string" === typeof reason
            ? webSocket.close(1011, reason)
            : webSocket.close(1011);
        }
      };
    }
    var React = require("react"),
      enableViewTransition = require("ReactFeatureFlags").enableViewTransition,
      currentView = null,
      writtenBytes = 0,
      destinationHasCapacity = !0,
      textEncoder = new TextEncoder(),
      CLIENT_REFERENCE_TAG$1 = Symbol.for("react.client.reference"),
      SERVER_REFERENCE_TAG = Symbol.for("react.server.reference"),
      FunctionBind = Function.prototype.bind,
      ArraySlice = Array.prototype.slice,
      serverReferenceToString = {
        value: function () {
          return "function () { [omitted code] }";
        },
        configurable: !0,
        writable: !0
      },
      framesToSkip = 0,
      collectedStackTrace = null,
      identifierRegExp = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/,
      frameRegExp =
        /^ {3} at (?:(.+) \((?:(.+):(\d+):(\d+)|<anonymous>)\)|(?:async )?(.+):(\d+):(\d+)|<anonymous>)$/,
      stackTraceCache = new WeakMap(),
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
      },
      REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
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
      MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
      ASYNC_ITERATOR = Symbol.asyncIterator,
      REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
      SuspenseException = Error(
        "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
      ),
      suspendedThenable = null,
      currentRequest$1 = null,
      thenableIndexCounter = 0,
      thenableState = null,
      currentComponentDebugInfo = null,
      HooksDispatcher = {
        readContext: unsupportedContext,
        use: function (usable) {
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
          if (isClientReference(usable)) {
            if (
              null != usable.value &&
              usable.value.$$typeof === REACT_CONTEXT_TYPE
            )
              throw Error(
                "Cannot read a Client Context from a Server Component."
              );
            throw Error("Cannot use() an already resolved Client Reference.");
          }
          throw Error(
            "An unsupported type was passed to use(): " + String(usable)
          );
        },
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
        useId: function () {
          if (null === currentRequest$1)
            throw Error("useId can only be used while React is rendering");
          var id = currentRequest$1.identifierCount++;
          return (
            "_" +
            currentRequest$1.identifierPrefix +
            "S_" +
            id.toString(32) +
            "_"
          );
        },
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
      },
      currentOwner = null,
      DefaultAsyncDispatcher = {
        getCacheForType: function (resourceType) {
          var cache = (cache = currentRequest ? currentRequest : null)
            ? cache.cache
            : new Map();
          var entry = cache.get(resourceType);
          void 0 === entry &&
            ((entry = resourceType()), cache.set(resourceType, entry));
          return entry;
        },
        cacheSignal: function () {
          var request = currentRequest ? currentRequest : null;
          return request ? request.cacheController.signal : null;
        }
      };
    DefaultAsyncDispatcher.getOwner = resolveOwner;
    var ReactSharedInternalsServer =
      React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    if (!ReactSharedInternalsServer)
      throw Error(
        'The "react" package in this environment is not configured correctly. The "react-server" condition must be enabled in any environment that runs React Server Components.'
      );
    var prefix, suffix;
    new ("function" === typeof WeakMap ? WeakMap : Map)();
    var lastResetTime = 0;
    if (
      "object" === typeof performance &&
      "function" === typeof performance.now
    ) {
      var localPerformance = performance;
      var getCurrentTime = function () {
        return localPerformance.now();
      };
    } else {
      var localDate = Date;
      getCurrentTime = function () {
        return localDate.now();
      };
    }
    var callComponent = {
        react_stack_bottom_frame: function (
          Component,
          props,
          componentDebugInfo
        ) {
          currentOwner = componentDebugInfo;
          try {
            return Component(props, void 0);
          } finally {
            currentOwner = null;
          }
        }
      },
      callComponentInDEV =
        callComponent.react_stack_bottom_frame.bind(callComponent),
      callLazyInit = {
        react_stack_bottom_frame: function (lazy) {
          var init = lazy._init;
          return init(lazy._payload);
        }
      },
      callLazyInitInDEV =
        callLazyInit.react_stack_bottom_frame.bind(callLazyInit),
      callIterator = {
        react_stack_bottom_frame: function (iterator, progress, error) {
          iterator.next().then(progress, error);
        }
      },
      callIteratorInDEV =
        callIterator.react_stack_bottom_frame.bind(callIterator),
      isArrayImpl = Array.isArray,
      getPrototypeOf = Object.getPrototypeOf,
      jsxPropsParents = new WeakMap(),
      jsxChildrenParents = new WeakMap(),
      CLIENT_REFERENCE_TAG = Symbol.for("react.client.reference"),
      hasOwnProperty = Object.prototype.hasOwnProperty,
      doNotLimit = new WeakSet();
    "object" === typeof console &&
      null !== console &&
      (patchConsole(console, "assert"),
      patchConsole(console, "debug"),
      patchConsole(console, "dir"),
      patchConsole(console, "dirxml"),
      patchConsole(console, "error"),
      patchConsole(console, "group"),
      patchConsole(console, "groupCollapsed"),
      patchConsole(console, "groupEnd"),
      patchConsole(console, "info"),
      patchConsole(console, "log"),
      patchConsole(console, "table"),
      patchConsole(console, "trace"),
      patchConsole(console, "warn"));
    var ObjectPrototype$1 = Object.prototype,
      stringify = JSON.stringify,
      PENDING$1 = 0,
      COMPLETED = 1,
      ABORTED = 3,
      ERRORED$1 = 4,
      RENDERING = 5,
      __PROTO__$1 = "__proto__",
      OPENING = 10,
      ABORTING = 12,
      CLOSING = 13,
      CLOSED = 14,
      PRERENDER = 21,
      NEXT_TWO_CHUNKS_ARE_ATOMIC = Symbol(),
      currentRequest = null,
      canEmitDebugInfo = !1,
      serializedSize = 0,
      MAX_ROW_SIZE = 3200,
      modelRoot = !1,
      CONSTRUCTOR_MARKER = Symbol(),
      debugModelRoot = null,
      debugNoOutline = null,
      emptyRoot = {},
      canUseDOM = !(
        "undefined" === typeof window ||
        "undefined" === typeof window.document ||
        "undefined" === typeof window.document.createElement
      ),
      asyncModuleCache = new Map(),
      RESPONSE_SYMBOL = Symbol();
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
            (null === this.value && (this.value = []),
            this.value.push(resolve));
          "function" === typeof reject &&
            (null === this.reason && (this.reason = []),
            this.reason.push(reject));
          break;
        default:
          "function" === typeof reject && reject(this.reason);
      }
    };
    var ObjectPrototype = Object.prototype,
      ArrayPrototype = Array.prototype,
      initializingHandler = null;
    FlightIterator.prototype = {};
    FlightIterator.prototype[ASYNC_ITERATOR] = function () {
      return this;
    };
    var MAX_BIGINT_DIGITS = 300,
      MAX_BOUND_ARGS = 1e3;
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
          (action = loadServerReference(serverManifest, {
            id: body,
            bound: null
          }));
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
        $$location: { value: Error("react-stack-top-frame"), configurable: !0 },
        bind: { value: bind, configurable: !0 },
        toString: serverReferenceToString
      });
    };
    exports.renderToPipeableStream = function (model, options) {
      var debugChannel = options ? options.debugChannel : void 0,
        debugChannelReadable =
          void 0 === debugChannel ||
          ("function" !== typeof debugChannel.read &&
            "number" !== typeof debugChannel.readyState)
            ? void 0
            : debugChannel;
      debugChannel =
        void 0 !== debugChannel
          ? "function" === typeof debugChannel.write
            ? debugChannel
            : "function" === typeof debugChannel.send
              ? createFakeWritableFromWebSocket(debugChannel)
              : void 0
          : void 0;
      var request = createRequest(
          model,
          null,
          options ? options.onError : void 0,
          options ? options.identifierPrefix : void 0,
          options ? options.temporaryReferences : void 0,
          options ? options.startTime : void 0,
          options ? options.environmentName : void 0,
          options ? options.filterStackFrame : void 0,
          void 0 !== debugChannelReadable
        ),
        hasStartedFlowing = !1;
      startWork(request);
      void 0 !== debugChannel && startFlowingDebug(request, debugChannel);
      void 0 !== debugChannelReadable &&
        startReadingFromDebugChannelReadable(request, debugChannelReadable);
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
          if (void 0 === debugChannelReadable)
            destination.on(
              "close",
              createCancelHandler(
                request,
                "The destination stream closed early."
              )
            );
          return destination;
        },
        abort: function (reason) {
          abort(request, reason);
        }
      };
    };
  })();
