/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @nolint
 * @preventMunge
 * @generated SignedSource<<77d6f62957408b689e0ecd0a0336db1d>>
 */

"use strict";
"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
  "function" ===
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart &&
  __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
require("react-native/Libraries/ReactPrivate/ReactNativePrivateInitializeCore");
var ReactNativePrivateInterface = require("react-native/Libraries/ReactPrivate/ReactNativePrivateInterface"),
  dynamicFlagsUntyped = require("ReactNativeInternalFeatureFlags"),
  Scheduler = require("scheduler"),
  React = require("react"),
  isArrayImpl = Array.isArray,
  ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  alwaysThrottleRetries = dynamicFlagsUntyped.alwaysThrottleRetries,
  enableEffectEventMutationPhase =
    dynamicFlagsUntyped.enableEffectEventMutationPhase,
  enableObjectFiber = dynamicFlagsUntyped.enableObjectFiber,
  passChildrenWhenCloningPersistedNodes =
    dynamicFlagsUntyped.passChildrenWhenCloningPersistedNodes,
  enableFragmentRefs = dynamicFlagsUntyped.enableFragmentRefs,
  enableFragmentRefsInstanceHandles =
    dynamicFlagsUntyped.enableFragmentRefsInstanceHandles,
  enableFragmentRefsTextNodes = dynamicFlagsUntyped.enableFragmentRefsTextNodes,
  enableViewTransitionForPersistenceMode =
    dynamicFlagsUntyped.enableViewTransitionForPersistenceMode,
  assign = Object.assign,
  prefix,
  suffix;
function describeBuiltInComponentFrame(name) {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn, construct) {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$1) {
                control = x$1;
              }
              Fake = !1;
              try {
                var prevProps = Object.getOwnPropertyDescriptor(
                  fn.prototype,
                  "props"
                );
                Object.defineProperty(fn.prototype, "props", {
                  configurable: !0,
                  set: function () {
                    throw Error();
                  }
                });
                Fake = !0;
                new fn();
              } finally {
                Fake &&
                  (void 0 !== prevProps
                    ? Object.defineProperty(fn.prototype, "props", prevProps)
                    : delete fn.prototype.props);
              }
            }
          } else {
            try {
              throw Error();
            } catch (x$2) {
              control = x$2;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame].replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace)
    : "";
}
function describeFiber(fiber, childFiber) {
  switch (fiber.tag) {
    case 26:
    case 27:
    case 5:
      return describeBuiltInComponentFrame(fiber.type);
    case 16:
      return describeBuiltInComponentFrame("Lazy");
    case 13:
      return fiber.child !== childFiber && null !== childFiber
        ? describeBuiltInComponentFrame("Suspense Fallback")
        : describeBuiltInComponentFrame("Suspense");
    case 19:
      return describeBuiltInComponentFrame("SuspenseList");
    case 0:
    case 15:
      return describeNativeComponentFrame(fiber.type, !1);
    case 11:
      return describeNativeComponentFrame(fiber.type.render, !1);
    case 1:
      return describeNativeComponentFrame(fiber.type, !0);
    case 31:
      return describeBuiltInComponentFrame("Activity");
    case 30:
      return describeBuiltInComponentFrame("ViewTransition");
    default:
      return "";
  }
}
function getStackByFiberInDevAndProd(workInProgress) {
  try {
    var info = "",
      previous = null;
    do
      (info += describeFiber(workInProgress, previous)),
        (previous = workInProgress),
        (workInProgress = workInProgress.return);
    while (workInProgress);
    return info;
  } catch (x) {
    return "\nError generating stack: " + x.message + "\n" + x.stack;
  }
}
var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
  REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy");
Symbol.for("react.scope");
var REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
Symbol.for("react.tracing_marker");
var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
  REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type) {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
    case REACT_VIEW_TRANSITION_TYPE:
      return "ViewTransition";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
function getComponentNameFromFiber(fiber) {
  var type = fiber.type;
  switch (fiber.tag) {
    case 31:
      return "Activity";
    case 24:
      return "Cache";
    case 9:
      return (type._context.displayName || "Context") + ".Consumer";
    case 10:
      return type.displayName || "Context";
    case 18:
      return "DehydratedFragment";
    case 11:
      return (
        (fiber = type.render),
        (fiber = fiber.displayName || fiber.name || ""),
        type.displayName ||
          ("" !== fiber ? "ForwardRef(" + fiber + ")" : "ForwardRef")
      );
    case 7:
      return "Fragment";
    case 26:
    case 27:
    case 5:
      return type;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return getComponentNameFromType(type);
    case 8:
      return type === REACT_STRICT_MODE_TYPE ? "StrictMode" : "Mode";
    case 22:
      if (null !== fiber.return) return getComponentNameFromFiber(fiber.return);
      break;
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 30:
      return "ViewTransition";
    case 17:
    case 28:
    case 1:
    case 0:
    case 14:
    case 15:
      if ("function" === typeof type)
        return type.displayName || type.name || null;
      if ("string" === typeof type) return type;
  }
  return null;
}
var hasError = !1,
  caughtError = null,
  getFiberCurrentPropsFromNode$1 = null,
  getInstanceFromNode$1 = null,
  getNodeFromInstance$1 = null;
function executeDispatch(event, listener, inst) {
  event.currentTarget = getNodeFromInstance$1(inst);
  inst = global.event;
  global.event = event;
  try {
    listener(event);
  } catch (error) {
    hasError || ((hasError = !0), (caughtError = error));
  }
  global.event = inst;
  event.currentTarget = null;
}
function executeDirectDispatch(event) {
  var dispatchListener = event._dispatchListeners,
    dispatchInstance = event._dispatchInstances;
  if (isArrayImpl(dispatchListener)) throw Error("Invalid `event`.");
  event.currentTarget = dispatchListener
    ? getNodeFromInstance$1(dispatchInstance)
    : null;
  dispatchListener = dispatchListener ? dispatchListener(event) : null;
  event.currentTarget = null;
  event._dispatchListeners = null;
  event._dispatchInstances = null;
  return dispatchListener;
}
function currentTimeStamp() {
  currentTimeStamp =
    "object" === typeof performance &&
    null !== performance &&
    "function" === typeof performance.now
      ? function () {
          return performance.now();
        }
      : function () {
          return Date.now();
        };
  return currentTimeStamp();
}
function functionThatReturnsTrue() {
  return !0;
}
function functionThatReturnsFalse() {
  return !1;
}
function SyntheticEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeEventTarget
) {
  this.dispatchConfig = dispatchConfig;
  this._targetInst = targetInst;
  this.nativeEvent = nativeEvent;
  this._dispatchInstances = this._dispatchListeners = null;
  dispatchConfig = this.constructor.Interface;
  for (var propName in dispatchConfig)
    dispatchConfig.hasOwnProperty(propName) &&
      ((targetInst = dispatchConfig[propName])
        ? (this[propName] = targetInst(nativeEvent))
        : "target" === propName
          ? (this.target = nativeEventTarget)
          : (this[propName] = nativeEvent[propName]));
  this.isDefaultPrevented = (
    null != nativeEvent.defaultPrevented
      ? nativeEvent.defaultPrevented
      : !1 === nativeEvent.returnValue
  )
    ? functionThatReturnsTrue
    : functionThatReturnsFalse;
  this.isPropagationStopped = functionThatReturnsFalse;
  return this;
}
assign(SyntheticEvent.prototype, {
  preventDefault: function () {
    this.defaultPrevented = !0;
    var event = this.nativeEvent;
    event &&
      (event.preventDefault
        ? event.preventDefault()
        : "unknown" !== typeof event.returnValue && (event.returnValue = !1),
      (this.isDefaultPrevented = functionThatReturnsTrue));
  },
  stopPropagation: function () {
    var event = this.nativeEvent;
    event &&
      (event.stopPropagation
        ? event.stopPropagation()
        : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = !0),
      (this.isPropagationStopped = functionThatReturnsTrue));
  },
  persist: function () {
    this.isPersistent = functionThatReturnsTrue;
  },
  isPersistent: functionThatReturnsFalse,
  destructor: function () {
    var Interface = this.constructor.Interface,
      propName;
    for (propName in Interface) this[propName] = null;
    this.nativeEvent = this._targetInst = this.dispatchConfig = null;
    this.isPropagationStopped = this.isDefaultPrevented =
      functionThatReturnsFalse;
    this._dispatchInstances = this._dispatchListeners = null;
  }
});
SyntheticEvent.Interface = {
  type: null,
  target: null,
  currentTarget: function () {
    return null;
  },
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: function (event) {
    return event.timeStamp || event.timestamp || currentTimeStamp();
  },
  defaultPrevented: null,
  isTrusted: null
};
SyntheticEvent.extend = function (Interface) {
  function E() {}
  function Class() {
    return Super.apply(this, arguments);
  }
  var Super = this;
  E.prototype = Super.prototype;
  var prototype = new E();
  assign(prototype, Class.prototype);
  Class.prototype = prototype;
  Class.prototype.constructor = Class;
  Class.Interface = assign({}, Super.Interface, Interface);
  Class.extend = Super.extend;
  addEventPoolingTo(Class);
  return Class;
};
addEventPoolingTo(SyntheticEvent);
function createOrGetPooledEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeInst
) {
  if (this.eventPool.length) {
    var instance = this.eventPool.pop();
    this.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
    return instance;
  }
  return new this(dispatchConfig, targetInst, nativeEvent, nativeInst);
}
function releasePooledEvent(event) {
  if (!(event instanceof this))
    throw Error(
      "Trying to release an event instance into a pool of a different type."
    );
  event.destructor();
  10 > this.eventPool.length && this.eventPool.push(event);
}
function addEventPoolingTo(EventConstructor) {
  EventConstructor.getPooled = createOrGetPooledEvent;
  EventConstructor.eventPool = [];
  EventConstructor.release = releasePooledEvent;
}
var ResponderSyntheticEvent = SyntheticEvent.extend({
  touchHistory: function () {
    return null;
  }
});
function isStartish(topLevelType) {
  return "topTouchStart" === topLevelType;
}
function isMoveish(topLevelType) {
  return "topTouchMove" === topLevelType;
}
var startDependencies = ["topTouchStart"],
  moveDependencies = ["topTouchMove"],
  endDependencies = ["topTouchCancel", "topTouchEnd"],
  touchBank = [],
  touchHistory = {
    touchBank: touchBank,
    numberActiveTouches: 0,
    indexOfSingleActiveTouch: -1,
    mostRecentTimeStamp: 0
  };
function timestampForTouch(touch) {
  return touch.timeStamp || touch.timestamp;
}
function getTouchIdentifier(_ref) {
  _ref = _ref.identifier;
  if (null == _ref) throw Error("Touch object is missing identifier.");
  return _ref;
}
function recordTouchStart(touch) {
  var identifier = getTouchIdentifier(touch),
    touchRecord = touchBank[identifier];
  touchRecord
    ? ((touchRecord.touchActive = !0),
      (touchRecord.startPageX = touch.pageX),
      (touchRecord.startPageY = touch.pageY),
      (touchRecord.startTimeStamp = timestampForTouch(touch)),
      (touchRecord.currentPageX = touch.pageX),
      (touchRecord.currentPageY = touch.pageY),
      (touchRecord.currentTimeStamp = timestampForTouch(touch)),
      (touchRecord.previousPageX = touch.pageX),
      (touchRecord.previousPageY = touch.pageY),
      (touchRecord.previousTimeStamp = timestampForTouch(touch)))
    : ((touchRecord = {
        touchActive: !0,
        startPageX: touch.pageX,
        startPageY: touch.pageY,
        startTimeStamp: timestampForTouch(touch),
        currentPageX: touch.pageX,
        currentPageY: touch.pageY,
        currentTimeStamp: timestampForTouch(touch),
        previousPageX: touch.pageX,
        previousPageY: touch.pageY,
        previousTimeStamp: timestampForTouch(touch)
      }),
      (touchBank[identifier] = touchRecord));
  touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
}
function recordTouchMove(touch) {
  var touchRecord = touchBank[getTouchIdentifier(touch)];
  touchRecord &&
    ((touchRecord.touchActive = !0),
    (touchRecord.previousPageX = touchRecord.currentPageX),
    (touchRecord.previousPageY = touchRecord.currentPageY),
    (touchRecord.previousTimeStamp = touchRecord.currentTimeStamp),
    (touchRecord.currentPageX = touch.pageX),
    (touchRecord.currentPageY = touch.pageY),
    (touchRecord.currentTimeStamp = timestampForTouch(touch)),
    (touchHistory.mostRecentTimeStamp = timestampForTouch(touch)));
}
function recordTouchEnd(touch) {
  var touchRecord = touchBank[getTouchIdentifier(touch)];
  touchRecord &&
    ((touchRecord.touchActive = !1),
    (touchRecord.previousPageX = touchRecord.currentPageX),
    (touchRecord.previousPageY = touchRecord.currentPageY),
    (touchRecord.previousTimeStamp = touchRecord.currentTimeStamp),
    (touchRecord.currentPageX = touch.pageX),
    (touchRecord.currentPageY = touch.pageY),
    (touchRecord.currentTimeStamp = timestampForTouch(touch)),
    (touchHistory.mostRecentTimeStamp = timestampForTouch(touch)));
}
var instrumentationCallback,
  ResponderTouchHistoryStore = {
    instrument: function (callback) {
      instrumentationCallback = callback;
    },
    recordTouchTrack: function (topLevelType, nativeEvent) {
      null != instrumentationCallback &&
        instrumentationCallback(topLevelType, nativeEvent);
      if (isMoveish(topLevelType))
        nativeEvent.changedTouches.forEach(recordTouchMove);
      else if (isStartish(topLevelType))
        nativeEvent.changedTouches.forEach(recordTouchStart),
          (touchHistory.numberActiveTouches = nativeEvent.touches.length),
          1 === touchHistory.numberActiveTouches &&
            (touchHistory.indexOfSingleActiveTouch =
              nativeEvent.touches[0].identifier);
      else if (
        "topTouchEnd" === topLevelType ||
        "topTouchCancel" === topLevelType
      )
        if (
          (nativeEvent.changedTouches.forEach(recordTouchEnd),
          (touchHistory.numberActiveTouches = nativeEvent.touches.length),
          1 === touchHistory.numberActiveTouches)
        )
          for (
            topLevelType = 0;
            topLevelType < touchBank.length;
            topLevelType++
          )
            if (
              ((nativeEvent = touchBank[topLevelType]),
              null != nativeEvent && nativeEvent.touchActive)
            ) {
              touchHistory.indexOfSingleActiveTouch = topLevelType;
              break;
            }
    },
    touchHistory: touchHistory
  };
function accumulate(current, next) {
  if (null == next)
    throw Error("Accumulated items must not be null or undefined.");
  return null == current
    ? next
    : isArrayImpl(current)
      ? current.concat(next)
      : isArrayImpl(next)
        ? [current].concat(next)
        : [current, next];
}
function accumulateInto(current, next) {
  if (null == next)
    throw Error("Accumulated items must not be null or undefined.");
  if (null == current) return next;
  if (isArrayImpl(current)) {
    if (isArrayImpl(next)) return current.push.apply(current, next), current;
    current.push(next);
    return current;
  }
  return isArrayImpl(next) ? [current].concat(next) : [current, next];
}
function forEachAccumulated(arr, cb, scope) {
  Array.isArray(arr) ? arr.forEach(cb, scope) : arr && cb.call(scope, arr);
}
var responderInst = null,
  trackedTouchCount = 0;
function changeResponder(nextResponderInst, blockHostResponder) {
  var oldResponderInst = responderInst;
  responderInst = nextResponderInst;
  if (null !== ResponderEventPlugin.GlobalResponderHandler)
    ResponderEventPlugin.GlobalResponderHandler.onChange(
      oldResponderInst,
      nextResponderInst,
      blockHostResponder
    );
}
var eventTypes = {
  startShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onStartShouldSetResponder",
      captured: "onStartShouldSetResponderCapture"
    },
    dependencies: startDependencies
  },
  scrollShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onScrollShouldSetResponder",
      captured: "onScrollShouldSetResponderCapture"
    },
    dependencies: ["topScroll"]
  },
  selectionChangeShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onSelectionChangeShouldSetResponder",
      captured: "onSelectionChangeShouldSetResponderCapture"
    },
    dependencies: ["topSelectionChange"]
  },
  moveShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onMoveShouldSetResponder",
      captured: "onMoveShouldSetResponderCapture"
    },
    dependencies: moveDependencies
  },
  responderStart: {
    registrationName: "onResponderStart",
    dependencies: startDependencies
  },
  responderMove: {
    registrationName: "onResponderMove",
    dependencies: moveDependencies
  },
  responderEnd: {
    registrationName: "onResponderEnd",
    dependencies: endDependencies
  },
  responderRelease: {
    registrationName: "onResponderRelease",
    dependencies: endDependencies
  },
  responderTerminationRequest: {
    registrationName: "onResponderTerminationRequest",
    dependencies: []
  },
  responderGrant: { registrationName: "onResponderGrant", dependencies: [] },
  responderReject: { registrationName: "onResponderReject", dependencies: [] },
  responderTerminate: {
    registrationName: "onResponderTerminate",
    dependencies: []
  }
};
function getParent$1(inst) {
  do inst = inst.return;
  while (inst && 5 !== inst.tag);
  return inst ? inst : null;
}
function traverseTwoPhase$1(inst, fn, arg) {
  for (var path = []; inst; ) path.push(inst), (inst = getParent$1(inst));
  for (inst = path.length; 0 < inst--; ) fn(path[inst], "captured", arg);
  for (inst = 0; inst < path.length; inst++) fn(path[inst], "bubbled", arg);
}
function getListener$1(inst, registrationName) {
  inst = inst.stateNode;
  if (null === inst) return null;
  inst = getFiberCurrentPropsFromNode$1(inst);
  if (null === inst) return null;
  if ((inst = inst[registrationName]) && "function" !== typeof inst)
    throw Error(
      "Expected `" +
        registrationName +
        "` listener to be a function, instead got a value of `" +
        typeof inst +
        "` type."
    );
  return inst;
}
function accumulateDirectionalDispatches$1(inst, phase, event) {
  if (
    (phase = getListener$1(
      inst,
      event.dispatchConfig.phasedRegistrationNames[phase]
    ))
  )
    (event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      phase
    )),
      (event._dispatchInstances = accumulateInto(
        event._dispatchInstances,
        inst
      ));
}
function accumulateDirectDispatchesSingle$1(event) {
  if (event && event.dispatchConfig.registrationName) {
    var inst = event._targetInst;
    if (inst && event && event.dispatchConfig.registrationName) {
      var listener = getListener$1(inst, event.dispatchConfig.registrationName);
      listener &&
        ((event._dispatchListeners = accumulateInto(
          event._dispatchListeners,
          listener
        )),
        (event._dispatchInstances = accumulateInto(
          event._dispatchInstances,
          inst
        )));
    }
  }
}
function accumulateTwoPhaseDispatchesSingleSkipTarget(event) {
  if (event && event.dispatchConfig.phasedRegistrationNames) {
    var targetInst = event._targetInst;
    targetInst = targetInst ? getParent$1(targetInst) : null;
    traverseTwoPhase$1(targetInst, accumulateDirectionalDispatches$1, event);
  }
}
function accumulateTwoPhaseDispatchesSingle$1(event) {
  event &&
    event.dispatchConfig.phasedRegistrationNames &&
    traverseTwoPhase$1(
      event._targetInst,
      accumulateDirectionalDispatches$1,
      event
    );
}
var ResponderEventPlugin = {
    _getResponder: function () {
      return responderInst;
    },
    eventTypes: eventTypes,
    extractEvents: function (
      topLevelType,
      targetInst,
      nativeEvent,
      nativeEventTarget
    ) {
      if (isStartish(topLevelType)) trackedTouchCount += 1;
      else if (
        "topTouchEnd" === topLevelType ||
        "topTouchCancel" === topLevelType
      )
        if (0 <= trackedTouchCount) --trackedTouchCount;
        else return null;
      ResponderTouchHistoryStore.recordTouchTrack(topLevelType, nativeEvent);
      if (
        targetInst &&
        (("topScroll" === topLevelType && !nativeEvent.responderIgnoreScroll) ||
          (0 < trackedTouchCount && "topSelectionChange" === topLevelType) ||
          isStartish(topLevelType) ||
          isMoveish(topLevelType))
      ) {
        var shouldSetEventType = isStartish(topLevelType)
          ? eventTypes.startShouldSetResponder
          : isMoveish(topLevelType)
            ? eventTypes.moveShouldSetResponder
            : "topSelectionChange" === topLevelType
              ? eventTypes.selectionChangeShouldSetResponder
              : eventTypes.scrollShouldSetResponder;
        if (responderInst)
          b: {
            var JSCompiler_temp = responderInst;
            for (
              var depthA = 0, tempA = JSCompiler_temp;
              tempA;
              tempA = getParent$1(tempA)
            )
              depthA++;
            tempA = 0;
            for (var tempB = targetInst; tempB; tempB = getParent$1(tempB))
              tempA++;
            for (; 0 < depthA - tempA; )
              (JSCompiler_temp = getParent$1(JSCompiler_temp)), depthA--;
            for (; 0 < tempA - depthA; )
              (targetInst = getParent$1(targetInst)), tempA--;
            for (; depthA--; ) {
              if (
                JSCompiler_temp === targetInst ||
                JSCompiler_temp === targetInst.alternate
              )
                break b;
              JSCompiler_temp = getParent$1(JSCompiler_temp);
              targetInst = getParent$1(targetInst);
            }
            JSCompiler_temp = null;
          }
        else JSCompiler_temp = targetInst;
        targetInst = JSCompiler_temp;
        JSCompiler_temp = targetInst === responderInst;
        shouldSetEventType = ResponderSyntheticEvent.getPooled(
          shouldSetEventType,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
        shouldSetEventType.touchHistory =
          ResponderTouchHistoryStore.touchHistory;
        JSCompiler_temp
          ? forEachAccumulated(
              shouldSetEventType,
              accumulateTwoPhaseDispatchesSingleSkipTarget
            )
          : forEachAccumulated(
              shouldSetEventType,
              accumulateTwoPhaseDispatchesSingle$1
            );
        b: {
          JSCompiler_temp = shouldSetEventType._dispatchListeners;
          targetInst = shouldSetEventType._dispatchInstances;
          if (isArrayImpl(JSCompiler_temp))
            for (
              depthA = 0;
              depthA < JSCompiler_temp.length &&
              !shouldSetEventType.isPropagationStopped();
              depthA++
            ) {
              if (
                JSCompiler_temp[depthA](shouldSetEventType, targetInst[depthA])
              ) {
                JSCompiler_temp = targetInst[depthA];
                break b;
              }
            }
          else if (
            JSCompiler_temp &&
            JSCompiler_temp(shouldSetEventType, targetInst)
          ) {
            JSCompiler_temp = targetInst;
            break b;
          }
          JSCompiler_temp = null;
        }
        shouldSetEventType._dispatchInstances = null;
        shouldSetEventType._dispatchListeners = null;
        shouldSetEventType.isPersistent() ||
          shouldSetEventType.constructor.release(shouldSetEventType);
        if (JSCompiler_temp && JSCompiler_temp !== responderInst)
          if (
            ((shouldSetEventType = ResponderSyntheticEvent.getPooled(
              eventTypes.responderGrant,
              JSCompiler_temp,
              nativeEvent,
              nativeEventTarget
            )),
            (shouldSetEventType.touchHistory =
              ResponderTouchHistoryStore.touchHistory),
            forEachAccumulated(
              shouldSetEventType,
              accumulateDirectDispatchesSingle$1
            ),
            (targetInst = !0 === executeDirectDispatch(shouldSetEventType)),
            responderInst)
          )
            if (
              ((depthA = ResponderSyntheticEvent.getPooled(
                eventTypes.responderTerminationRequest,
                responderInst,
                nativeEvent,
                nativeEventTarget
              )),
              (depthA.touchHistory = ResponderTouchHistoryStore.touchHistory),
              forEachAccumulated(depthA, accumulateDirectDispatchesSingle$1),
              (tempA =
                !depthA._dispatchListeners || executeDirectDispatch(depthA)),
              depthA.isPersistent() || depthA.constructor.release(depthA),
              tempA)
            ) {
              depthA = ResponderSyntheticEvent.getPooled(
                eventTypes.responderTerminate,
                responderInst,
                nativeEvent,
                nativeEventTarget
              );
              depthA.touchHistory = ResponderTouchHistoryStore.touchHistory;
              forEachAccumulated(depthA, accumulateDirectDispatchesSingle$1);
              var JSCompiler_temp$jscomp$0 = accumulate(
                JSCompiler_temp$jscomp$0,
                [shouldSetEventType, depthA]
              );
              changeResponder(JSCompiler_temp, targetInst);
            } else
              (shouldSetEventType = ResponderSyntheticEvent.getPooled(
                eventTypes.responderReject,
                JSCompiler_temp,
                nativeEvent,
                nativeEventTarget
              )),
                (shouldSetEventType.touchHistory =
                  ResponderTouchHistoryStore.touchHistory),
                forEachAccumulated(
                  shouldSetEventType,
                  accumulateDirectDispatchesSingle$1
                ),
                (JSCompiler_temp$jscomp$0 = accumulate(
                  JSCompiler_temp$jscomp$0,
                  shouldSetEventType
                ));
          else
            (JSCompiler_temp$jscomp$0 = accumulate(
              JSCompiler_temp$jscomp$0,
              shouldSetEventType
            )),
              changeResponder(JSCompiler_temp, targetInst);
        else JSCompiler_temp$jscomp$0 = null;
      } else JSCompiler_temp$jscomp$0 = null;
      shouldSetEventType = responderInst && isStartish(topLevelType);
      JSCompiler_temp = responderInst && isMoveish(topLevelType);
      targetInst =
        responderInst &&
        ("topTouchEnd" === topLevelType || "topTouchCancel" === topLevelType);
      if (
        (shouldSetEventType = shouldSetEventType
          ? eventTypes.responderStart
          : JSCompiler_temp
            ? eventTypes.responderMove
            : targetInst
              ? eventTypes.responderEnd
              : null)
      )
        (shouldSetEventType = ResponderSyntheticEvent.getPooled(
          shouldSetEventType,
          responderInst,
          nativeEvent,
          nativeEventTarget
        )),
          (shouldSetEventType.touchHistory =
            ResponderTouchHistoryStore.touchHistory),
          forEachAccumulated(
            shouldSetEventType,
            accumulateDirectDispatchesSingle$1
          ),
          (JSCompiler_temp$jscomp$0 = accumulate(
            JSCompiler_temp$jscomp$0,
            shouldSetEventType
          ));
      shouldSetEventType = responderInst && "topTouchCancel" === topLevelType;
      if (
        (topLevelType =
          responderInst &&
          !shouldSetEventType &&
          ("topTouchEnd" === topLevelType || "topTouchCancel" === topLevelType))
      )
        a: {
          if ((topLevelType = nativeEvent.touches) && 0 !== topLevelType.length)
            for (
              JSCompiler_temp = 0;
              JSCompiler_temp < topLevelType.length;
              JSCompiler_temp++
            )
              if (
                ((targetInst = topLevelType[JSCompiler_temp].target),
                null !== targetInst &&
                  void 0 !== targetInst &&
                  0 !== targetInst)
              ) {
                depthA = getInstanceFromNode$1(targetInst);
                b: {
                  for (targetInst = responderInst; depthA; ) {
                    if (
                      targetInst === depthA ||
                      targetInst === depthA.alternate
                    ) {
                      targetInst = !0;
                      break b;
                    }
                    depthA = getParent$1(depthA);
                  }
                  targetInst = !1;
                }
                if (targetInst) {
                  topLevelType = !1;
                  break a;
                }
              }
          topLevelType = !0;
        }
      if (
        (topLevelType = shouldSetEventType
          ? eventTypes.responderTerminate
          : topLevelType
            ? eventTypes.responderRelease
            : null)
      )
        (nativeEvent = ResponderSyntheticEvent.getPooled(
          topLevelType,
          responderInst,
          nativeEvent,
          nativeEventTarget
        )),
          (nativeEvent.touchHistory = ResponderTouchHistoryStore.touchHistory),
          forEachAccumulated(nativeEvent, accumulateDirectDispatchesSingle$1),
          (JSCompiler_temp$jscomp$0 = accumulate(
            JSCompiler_temp$jscomp$0,
            nativeEvent
          )),
          changeResponder(null);
      return JSCompiler_temp$jscomp$0;
    },
    GlobalResponderHandler: null,
    injection: {
      injectGlobalResponderHandler: function (GlobalResponderHandler) {
        ResponderEventPlugin.GlobalResponderHandler = GlobalResponderHandler;
      }
    }
  },
  eventPluginOrder = null,
  namesToPlugins = {};
function recomputePluginOrdering() {
  if (eventPluginOrder)
    for (var pluginName in namesToPlugins) {
      var pluginModule = namesToPlugins[pluginName],
        pluginIndex = eventPluginOrder.indexOf(pluginName);
      if (-1 >= pluginIndex)
        throw Error(
          "EventPluginRegistry: Cannot inject event plugins that do not exist in the plugin ordering, `" +
            (pluginName + "`.")
        );
      if (!plugins[pluginIndex]) {
        if (!pluginModule.extractEvents)
          throw Error(
            "EventPluginRegistry: Event plugins must implement an `extractEvents` method, but `" +
              (pluginName + "` does not.")
          );
        plugins[pluginIndex] = pluginModule;
        pluginIndex = pluginModule.eventTypes;
        for (var eventName in pluginIndex) {
          var JSCompiler_inline_result = void 0;
          var dispatchConfig = pluginIndex[eventName];
          if (eventNameDispatchConfigs.hasOwnProperty(eventName))
            throw Error(
              "EventPluginRegistry: More than one plugin attempted to publish the same event name, `" +
                (eventName + "`.")
            );
          eventNameDispatchConfigs[eventName] = dispatchConfig;
          var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
          if (phasedRegistrationNames) {
            for (JSCompiler_inline_result in phasedRegistrationNames)
              phasedRegistrationNames.hasOwnProperty(
                JSCompiler_inline_result
              ) &&
                publishRegistrationName(
                  phasedRegistrationNames[JSCompiler_inline_result],
                  pluginModule
                );
            JSCompiler_inline_result = !0;
          } else
            dispatchConfig.registrationName
              ? (publishRegistrationName(
                  dispatchConfig.registrationName,
                  pluginModule
                ),
                (JSCompiler_inline_result = !0))
              : (JSCompiler_inline_result = !1);
          if (!JSCompiler_inline_result)
            throw Error(
              "EventPluginRegistry: Failed to publish event `" +
                eventName +
                "` for plugin `" +
                pluginName +
                "`."
            );
        }
      }
    }
}
function publishRegistrationName(registrationName, pluginModule) {
  if (registrationNameModules[registrationName])
    throw Error(
      "EventPluginRegistry: More than one plugin attempted to publish the same registration name, `" +
        (registrationName + "`.")
    );
  registrationNameModules[registrationName] = pluginModule;
}
var plugins = [],
  eventNameDispatchConfigs = {},
  registrationNameModules = {};
function getListener(inst, registrationName) {
  inst = inst.stateNode;
  if (null === inst) return null;
  inst = getFiberCurrentPropsFromNode$1(inst);
  if (null === inst) return null;
  if ((inst = inst[registrationName]) && "function" !== typeof inst)
    throw Error(
      "Expected `" +
        registrationName +
        "` listener to be a function, instead got a value of `" +
        typeof inst +
        "` type."
    );
  return inst;
}
var customBubblingEventTypes =
    ReactNativePrivateInterface.ReactNativeViewConfigRegistry
      .customBubblingEventTypes,
  customDirectEventTypes =
    ReactNativePrivateInterface.ReactNativeViewConfigRegistry
      .customDirectEventTypes;
function accumulateDirectionalDispatches(inst, phase, event) {
  if (
    (phase = getListener(
      inst,
      event.dispatchConfig.phasedRegistrationNames[phase]
    ))
  )
    (event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      phase
    )),
      (event._dispatchInstances = accumulateInto(
        event._dispatchInstances,
        inst
      ));
}
function traverseTwoPhase(inst, fn, arg, skipBubbling) {
  for (var path = []; inst; ) {
    path.push(inst);
    do inst = inst.return;
    while (inst && 5 !== inst.tag);
    inst = inst ? inst : null;
  }
  for (inst = path.length; 0 < inst--; ) fn(path[inst], "captured", arg);
  if (skipBubbling) fn(path[0], "bubbled", arg);
  else
    for (inst = 0; inst < path.length; inst++) fn(path[inst], "bubbled", arg);
}
function accumulateTwoPhaseDispatchesSingle(event) {
  event &&
    event.dispatchConfig.phasedRegistrationNames &&
    traverseTwoPhase(
      event._targetInst,
      accumulateDirectionalDispatches,
      event,
      !1
    );
}
function accumulateDirectDispatchesSingle(event) {
  if (event && event.dispatchConfig.registrationName) {
    var inst = event._targetInst;
    if (inst && event && event.dispatchConfig.registrationName) {
      var listener = getListener(inst, event.dispatchConfig.registrationName);
      listener &&
        ((event._dispatchListeners = accumulateInto(
          event._dispatchListeners,
          listener
        )),
        (event._dispatchInstances = accumulateInto(
          event._dispatchInstances,
          inst
        )));
    }
  }
}
if (eventPluginOrder)
  throw Error(
    "EventPluginRegistry: Cannot inject event plugin ordering more than once. You are likely trying to load more than one copy of React."
  );
eventPluginOrder = Array.prototype.slice.call([
  "ResponderEventPlugin",
  "ReactNativeBridgeEventPlugin"
]);
recomputePluginOrdering();
var injectedNamesToPlugins$jscomp$inline_335 = {
    ResponderEventPlugin: ResponderEventPlugin,
    ReactNativeBridgeEventPlugin: {
      eventTypes: {},
      extractEvents: function (
        topLevelType,
        targetInst,
        nativeEvent,
        nativeEventTarget
      ) {
        if (null == targetInst) return null;
        var bubbleDispatchConfig = customBubblingEventTypes[topLevelType],
          directDispatchConfig = customDirectEventTypes[topLevelType];
        if (!bubbleDispatchConfig && !directDispatchConfig)
          throw Error(
            'Unsupported top level event type "' + topLevelType + '" dispatched'
          );
        topLevelType = SyntheticEvent.getPooled(
          bubbleDispatchConfig || directDispatchConfig,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
        if (bubbleDispatchConfig)
          null != topLevelType &&
          null != topLevelType.dispatchConfig.phasedRegistrationNames &&
          topLevelType.dispatchConfig.phasedRegistrationNames.skipBubbling
            ? topLevelType &&
              topLevelType.dispatchConfig.phasedRegistrationNames &&
              traverseTwoPhase(
                topLevelType._targetInst,
                accumulateDirectionalDispatches,
                topLevelType,
                !0
              )
            : forEachAccumulated(
                topLevelType,
                accumulateTwoPhaseDispatchesSingle
              );
        else if (directDispatchConfig)
          forEachAccumulated(topLevelType, accumulateDirectDispatchesSingle);
        else return null;
        return topLevelType;
      }
    }
  },
  isOrderingDirty$jscomp$inline_336 = !1,
  pluginName$jscomp$inline_337;
for (pluginName$jscomp$inline_337 in injectedNamesToPlugins$jscomp$inline_335)
  if (
    injectedNamesToPlugins$jscomp$inline_335.hasOwnProperty(
      pluginName$jscomp$inline_337
    )
  ) {
    var pluginModule$jscomp$inline_338 =
      injectedNamesToPlugins$jscomp$inline_335[pluginName$jscomp$inline_337];
    if (
      !namesToPlugins.hasOwnProperty(pluginName$jscomp$inline_337) ||
      namesToPlugins[pluginName$jscomp$inline_337] !==
        pluginModule$jscomp$inline_338
    ) {
      if (namesToPlugins[pluginName$jscomp$inline_337])
        throw Error(
          "EventPluginRegistry: Cannot inject two different event plugins using the same name, `" +
            (pluginName$jscomp$inline_337 + "`.")
        );
      namesToPlugins[pluginName$jscomp$inline_337] =
        pluginModule$jscomp$inline_338;
      isOrderingDirty$jscomp$inline_336 = !0;
    }
  }
isOrderingDirty$jscomp$inline_336 && recomputePluginOrdering();
function batchedUpdatesImpl(fn, bookkeeping) {
  return fn(bookkeeping);
}
var isInsideEventHandler = !1;
function batchedUpdates$1(fn, bookkeeping) {
  if (isInsideEventHandler) return fn(bookkeeping);
  isInsideEventHandler = !0;
  try {
    return batchedUpdatesImpl(fn, bookkeeping);
  } finally {
    isInsideEventHandler = !1;
  }
}
var eventQueue = null;
function executeDispatchesAndReleaseTopLevel(e) {
  if (e) {
    var dispatchListeners = e._dispatchListeners,
      dispatchInstances = e._dispatchInstances;
    if (isArrayImpl(dispatchListeners))
      for (
        var i = 0;
        i < dispatchListeners.length && !e.isPropagationStopped();
        i++
      )
        executeDispatch(e, dispatchListeners[i], dispatchInstances[i]);
    else
      dispatchListeners &&
        executeDispatch(e, dispatchListeners, dispatchInstances);
    e._dispatchListeners = null;
    e._dispatchInstances = null;
    e.isPersistent() || e.constructor.release(e);
  }
}
var _enableNativeEventTargetEventDispatching = null;
function dispatchEvent(target, topLevelType, nativeEventParam) {
  var nativeEvent =
      null != nativeEventParam && "object" === typeof nativeEventParam
        ? nativeEventParam
        : {},
    eventTarget = null;
  null != target &&
    ((nativeEventParam = target.stateNode),
    null != nativeEventParam &&
      (eventTarget = getPublicInstance(nativeEventParam)));
  batchedUpdates$1(function () {
    var event = { eventName: topLevelType, nativeEvent: nativeEvent };
    ReactNativePrivateInterface.RawEventEmitter.emit(topLevelType, event);
    ReactNativePrivateInterface.RawEventEmitter.emit("*", event);
    null == _enableNativeEventTargetEventDispatching &&
      (_enableNativeEventTargetEventDispatching =
        "function" === typeof RN$isNativeEventTargetEventDispatchingEnabled &&
        RN$isNativeEventTargetEventDispatchingEnabled());
    if (_enableNativeEventTargetEventDispatching)
      null != eventTarget &&
        ReactNativePrivateInterface.dispatchNativeEvent(
          eventTarget,
          topLevelType,
          nativeEvent
        );
    else {
      event = eventTarget;
      for (
        var events = null, legacyPlugins = plugins, i = 0;
        i < legacyPlugins.length;
        i++
      ) {
        var possiblePlugin = legacyPlugins[i];
        possiblePlugin &&
          (possiblePlugin = possiblePlugin.extractEvents(
            topLevelType,
            target,
            nativeEvent,
            event
          )) &&
          (events = accumulateInto(events, possiblePlugin));
      }
      event = events;
      null !== event && (eventQueue = accumulateInto(eventQueue, event));
      event = eventQueue;
      eventQueue = null;
      if (event) {
        forEachAccumulated(event, executeDispatchesAndReleaseTopLevel);
        if (eventQueue)
          throw Error(
            "processEventQueue(): Additional events were enqueued while processing an event queue. Support for this has not yet been implemented."
          );
        if (hasError)
          throw (
            ((event = caughtError),
            (hasError = !1),
            (caughtError = null),
            event)
          );
      }
    }
  });
}
var BeforeMutationMask = 1024 | (enableEffectEventMutationPhase ? 0 : 4),
  scheduleCallback$3 = Scheduler.unstable_scheduleCallback,
  cancelCallback$1 = Scheduler.unstable_cancelCallback,
  shouldYield = Scheduler.unstable_shouldYield,
  requestPaint = Scheduler.unstable_requestPaint,
  now$1 = Scheduler.unstable_now,
  ImmediatePriority = Scheduler.unstable_ImmediatePriority,
  UserBlockingPriority = Scheduler.unstable_UserBlockingPriority,
  NormalPriority$1 = Scheduler.unstable_NormalPriority,
  IdlePriority = Scheduler.unstable_IdlePriority,
  log$1 = Scheduler.log,
  unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,
  rendererID = null,
  injectedHook = null,
  injectedProfilingHooks = null,
  isDevToolsPresent = "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__;
function setIsStrictModeForDevtools(newIsStrictMode) {
  "function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
  if (injectedHook && "function" === typeof injectedHook.setStrictMode)
    try {
      injectedHook.setStrictMode(rendererID, newIsStrictMode);
    } catch (err) {}
}
function markCommitStopped() {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markCommitStopped &&
    injectedProfilingHooks.markCommitStopped();
}
function markComponentRenderStarted(fiber) {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markComponentRenderStarted &&
    injectedProfilingHooks.markComponentRenderStarted(fiber);
}
function markComponentRenderStopped() {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markComponentRenderStopped &&
    injectedProfilingHooks.markComponentRenderStopped();
}
function markRenderStarted(lanes) {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markRenderStarted &&
    injectedProfilingHooks.markRenderStarted(lanes);
}
function markRenderStopped() {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markRenderStopped &&
    injectedProfilingHooks.markRenderStopped();
}
function markStateUpdateScheduled(fiber, lane) {
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markStateUpdateScheduled &&
    injectedProfilingHooks.markStateUpdateScheduled(fiber, lane);
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x) {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
function getLabelForLane(lane) {
  if (lane & 1) return "SyncHydrationLane";
  if (lane & 2) return "Sync";
  if (lane & 4) return "InputContinuousHydration";
  if (lane & 8) return "InputContinuous";
  if (lane & 16) return "DefaultHydration";
  if (lane & 32) return "Default";
  if (lane & 128) return "TransitionHydration";
  if (lane & 4194048) return "Transition";
  if (lane & 62914560) return "Retry";
  if (lane & 67108864) return "SelectiveHydration";
  if (lane & 134217728) return "IdleHydration";
  if (lane & 268435456) return "Idle";
  if (lane & 536870912) return "Offscreen";
  if (lane & 1073741824) return "Deferred";
}
var nextTransitionUpdateLane = 256,
  nextTransitionDeferredLane = 262144,
  nextRetryLane = 4194304;
function getHighestPriorityLanes(lanes) {
  var pendingSyncLanes = lanes & 42;
  if (0 !== pendingSyncLanes) return pendingSyncLanes;
  switch (lanes & -lanes) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
      return 64;
    case 128:
      return 128;
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
      return lanes & 261888;
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return lanes & 3932160;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
      return lanes & 62914560;
    case 67108864:
      return 67108864;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 0;
    default:
      return lanes;
  }
}
function getNextLanes(root, wipLanes, rootHasPendingCommit) {
  var pendingLanes = root.pendingLanes;
  if (0 === pendingLanes) return 0;
  var nextLanes = 0,
    suspendedLanes = root.suspendedLanes,
    pingedLanes = root.pingedLanes;
  root = root.warmLanes;
  var nonIdlePendingLanes = pendingLanes & 134217727;
  0 !== nonIdlePendingLanes
    ? ((pendingLanes = nonIdlePendingLanes & ~suspendedLanes),
      0 !== pendingLanes
        ? (nextLanes = getHighestPriorityLanes(pendingLanes))
        : ((pingedLanes &= nonIdlePendingLanes),
          0 !== pingedLanes
            ? (nextLanes = getHighestPriorityLanes(pingedLanes))
            : rootHasPendingCommit ||
              ((rootHasPendingCommit = nonIdlePendingLanes & ~root),
              0 !== rootHasPendingCommit &&
                (nextLanes = getHighestPriorityLanes(rootHasPendingCommit)))))
    : ((nonIdlePendingLanes = pendingLanes & ~suspendedLanes),
      0 !== nonIdlePendingLanes
        ? (nextLanes = getHighestPriorityLanes(nonIdlePendingLanes))
        : 0 !== pingedLanes
          ? (nextLanes = getHighestPriorityLanes(pingedLanes))
          : rootHasPendingCommit ||
            ((rootHasPendingCommit = pendingLanes & ~root),
            0 !== rootHasPendingCommit &&
              (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
  return 0 === nextLanes
    ? 0
    : 0 !== wipLanes &&
        wipLanes !== nextLanes &&
        0 === (wipLanes & suspendedLanes) &&
        ((suspendedLanes = nextLanes & -nextLanes),
        (rootHasPendingCommit = wipLanes & -wipLanes),
        suspendedLanes >= rootHasPendingCommit ||
          (32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)))
      ? wipLanes
      : nextLanes;
}
function checkIfRootIsPrerendering(root, renderLanes) {
  return (
    0 ===
    (root.pendingLanes &
      ~(root.suspendedLanes & ~root.pingedLanes) &
      renderLanes)
  );
}
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case 1:
    case 2:
    case 4:
    case 8:
    case 64:
      return currentTime + 250;
    case 16:
    case 32:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return currentTime + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
      return -1;
    case 67108864:
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function claimNextRetryLane() {
  var lane = nextRetryLane;
  nextRetryLane <<= 1;
  0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
  return lane;
}
function createLaneMap(initial) {
  for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
  return laneMap;
}
function markRootUpdated$1(root, updateLane) {
  root.pendingLanes |= updateLane;
  root.indicatorLanes |= updateLane & 4194048;
  268435456 !== updateLane &&
    ((root.suspendedLanes = 0), (root.pingedLanes = 0), (root.warmLanes = 0));
}
function markRootFinished(
  root,
  finishedLanes,
  remainingLanes,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes
) {
  var previouslyPendingLanes = root.pendingLanes;
  root.pendingLanes = remainingLanes;
  root.suspendedLanes = 0;
  root.pingedLanes = 0;
  root.warmLanes = 0;
  root.indicatorLanes &= remainingLanes;
  root.expiredLanes &= remainingLanes;
  root.entangledLanes &= remainingLanes;
  root.errorRecoveryDisabledLanes &= remainingLanes;
  root.shellSuspendCounter = 0;
  var entanglements = root.entanglements,
    expirationTimes = root.expirationTimes,
    hiddenUpdates = root.hiddenUpdates;
  for (
    remainingLanes = previouslyPendingLanes & ~remainingLanes;
    0 < remainingLanes;

  ) {
    var index$9 = 31 - clz32(remainingLanes),
      lane = 1 << index$9;
    entanglements[index$9] = 0;
    expirationTimes[index$9] = -1;
    var hiddenUpdatesForLane = hiddenUpdates[index$9];
    if (null !== hiddenUpdatesForLane)
      for (
        hiddenUpdates[index$9] = null, index$9 = 0;
        index$9 < hiddenUpdatesForLane.length;
        index$9++
      ) {
        var update = hiddenUpdatesForLane[index$9];
        null !== update && (update.lane &= -536870913);
      }
    remainingLanes &= ~lane;
  }
  0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, 0);
  0 !== suspendedRetryLanes &&
    0 === updatedLanes &&
    (root.suspendedLanes |=
      suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
}
function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
  root.pendingLanes |= spawnedLane;
  root.suspendedLanes &= ~spawnedLane;
  var spawnedLaneIndex = 31 - clz32(spawnedLane);
  root.entangledLanes |= spawnedLane;
  root.entanglements[spawnedLaneIndex] =
    root.entanglements[spawnedLaneIndex] |
    1073741824 |
    (entangledLanes & 261930);
}
function markRootEntangled(root, entangledLanes) {
  var rootEntangledLanes = (root.entangledLanes |= entangledLanes);
  for (root = root.entanglements; rootEntangledLanes; ) {
    var index$10 = 31 - clz32(rootEntangledLanes),
      lane = 1 << index$10;
    (lane & entangledLanes) | (root[index$10] & entangledLanes) &&
      (root[index$10] |= entangledLanes);
    rootEntangledLanes &= ~lane;
  }
}
function getBumpedLaneForHydration(root, renderLanes) {
  var renderLane = renderLanes & -renderLanes;
  if (0 !== (renderLane & 42)) renderLane = 1;
  else
    switch (renderLane) {
      case 2:
        renderLane = 1;
        break;
      case 8:
        renderLane = 4;
        break;
      case 32:
        renderLane = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        renderLane = 128;
        break;
      case 268435456:
        renderLane = 134217728;
        break;
      default:
        renderLane = 0;
    }
  return 0 !== (renderLane & (root.suspendedLanes | renderLanes))
    ? 0
    : renderLane;
}
function addFiberToLanesMap(root, fiber, lanes) {
  if (isDevToolsPresent)
    for (root = root.pendingUpdatersLaneMap; 0 < lanes; ) {
      var index$11 = 31 - clz32(lanes),
        lane = 1 << index$11;
      root[index$11].add(fiber);
      lanes &= ~lane;
    }
}
function movePendingFibersToMemoized(root, lanes) {
  if (isDevToolsPresent)
    for (
      var pendingUpdatersLaneMap = root.pendingUpdatersLaneMap,
        memoizedUpdaters = root.memoizedUpdaters;
      0 < lanes;

    ) {
      var index$12 = 31 - clz32(lanes);
      root = 1 << index$12;
      index$12 = pendingUpdatersLaneMap[index$12];
      0 < index$12.size &&
        (index$12.forEach(function (fiber) {
          var alternate = fiber.alternate;
          (null !== alternate && memoizedUpdaters.has(alternate)) ||
            memoizedUpdaters.add(fiber);
        }),
        index$12.clear());
      lanes &= ~root;
    }
}
function lanesToEventPriority(lanes) {
  lanes &= -lanes;
  return 2 < lanes
    ? 8 < lanes
      ? 0 !== (lanes & 134217727)
        ? 32
        : 268435456
      : 8
    : 2;
}
function getNearestMountedFiber(fiber) {
  for (var node = fiber, nextNode = node; nextNode && !nextNode.alternate; )
    (node = nextNode),
      0 !== (node.flags & 4098) && (fiber = node.return),
      (nextNode = node.return);
  for (; node.return; ) node = node.return;
  return 3 === node.tag ? fiber : null;
}
function assertIsMounted(fiber) {
  if (getNearestMountedFiber(fiber) !== fiber)
    throw Error("Unable to find node on an unmounted component.");
}
function findCurrentFiberUsingSlowPath(fiber) {
  var alternate = fiber.alternate;
  if (!alternate) {
    alternate = getNearestMountedFiber(fiber);
    if (null === alternate)
      throw Error("Unable to find node on an unmounted component.");
    return alternate !== fiber ? null : fiber;
  }
  for (var a = fiber, b = alternate; ; ) {
    var parentA = a.return;
    if (null === parentA) break;
    var parentB = parentA.alternate;
    if (null === parentB) {
      b = parentA.return;
      if (null !== b) {
        a = b;
        continue;
      }
      break;
    }
    if (parentA.child === parentB.child) {
      for (parentB = parentA.child; parentB; ) {
        if (parentB === a) return assertIsMounted(parentA), fiber;
        if (parentB === b) return assertIsMounted(parentA), alternate;
        parentB = parentB.sibling;
      }
      throw Error("Unable to find node on an unmounted component.");
    }
    if (a.return !== b.return) (a = parentA), (b = parentB);
    else {
      for (var didFindChild = !1, child$13 = parentA.child; child$13; ) {
        if (child$13 === a) {
          didFindChild = !0;
          a = parentA;
          b = parentB;
          break;
        }
        if (child$13 === b) {
          didFindChild = !0;
          b = parentA;
          a = parentB;
          break;
        }
        child$13 = child$13.sibling;
      }
      if (!didFindChild) {
        for (child$13 = parentB.child; child$13; ) {
          if (child$13 === a) {
            didFindChild = !0;
            a = parentB;
            b = parentA;
            break;
          }
          if (child$13 === b) {
            didFindChild = !0;
            b = parentB;
            a = parentA;
            break;
          }
          child$13 = child$13.sibling;
        }
        if (!didFindChild)
          throw Error(
            "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue."
          );
      }
    }
    if (a.alternate !== b)
      throw Error(
        "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue."
      );
  }
  if (3 !== a.tag)
    throw Error("Unable to find node on an unmounted component.");
  return a.stateNode.current === a ? fiber : alternate;
}
function findCurrentHostFiberImpl(node) {
  var tag = node.tag;
  if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
  for (node = node.child; null !== node; ) {
    tag = findCurrentHostFiberImpl(node);
    if (null !== tag) return tag;
    node = node.sibling;
  }
  return null;
}
function traverseVisibleHostChildren(child, searchWithinHosts, fn, a, b, c) {
  for (; null !== child; ) {
    if (
      ((5 === child.tag || (enableFragmentRefsTextNodes && 6 === child.tag)) &&
        fn(child, a, b, c)) ||
      ((22 !== child.tag || null === child.memoizedState) &&
        (searchWithinHosts || 5 !== child.tag) &&
        traverseVisibleHostChildren(
          child.child,
          searchWithinHosts,
          fn,
          a,
          b,
          c
        ))
    )
      return !0;
    child = child.sibling;
  }
  return !1;
}
function getFragmentParentHostFiber(fiber) {
  for (fiber = fiber.return; null !== fiber; ) {
    if (3 === fiber.tag || 5 === fiber.tag) return fiber;
    fiber = fiber.return;
  }
  return null;
}
var searchTarget = null;
function findNextSibling(child) {
  searchTarget = child;
  return !0;
}
var valueStack = [],
  index = -1;
function createCursor(defaultValue) {
  return { current: defaultValue };
}
function pop(cursor) {
  0 > index ||
    ((cursor.current = valueStack[index]), (valueStack[index] = null), index--);
}
function push(cursor, value) {
  index++;
  valueStack[index] = cursor.current;
  cursor.current = value;
}
var emptyContextObject = {},
  contextStackCursor$1 = createCursor(emptyContextObject),
  didPerformWorkStackCursor = createCursor(!1),
  previousContext = emptyContextObject;
function getMaskedContext(workInProgress, unmaskedContext) {
  var contextTypes = workInProgress.type.contextTypes;
  if (!contextTypes) return emptyContextObject;
  var instance = workInProgress.stateNode;
  if (
    instance &&
    instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext
  )
    return instance.__reactInternalMemoizedMaskedChildContext;
  var context = {},
    key;
  for (key in contextTypes) context[key] = unmaskedContext[key];
  instance &&
    ((workInProgress = workInProgress.stateNode),
    (workInProgress.__reactInternalMemoizedUnmaskedChildContext =
      unmaskedContext),
    (workInProgress.__reactInternalMemoizedMaskedChildContext = context));
  return context;
}
function isContextProvider(type) {
  type = type.childContextTypes;
  return null !== type && void 0 !== type;
}
function popContext() {
  pop(didPerformWorkStackCursor);
  pop(contextStackCursor$1);
}
function pushTopLevelContextObject(fiber, context, didChange) {
  if (contextStackCursor$1.current !== emptyContextObject)
    throw Error(
      "Unexpected context found on stack. This error is likely caused by a bug in React. Please file an issue."
    );
  push(contextStackCursor$1, context);
  push(didPerformWorkStackCursor, didChange);
}
function processChildContext(fiber, type, parentContext) {
  var instance = fiber.stateNode;
  type = type.childContextTypes;
  if ("function" !== typeof instance.getChildContext) return parentContext;
  instance = instance.getChildContext();
  for (var contextKey in instance)
    if (!(contextKey in type))
      throw Error(
        (getComponentNameFromFiber(fiber) || "Unknown") +
          '.getChildContext(): key "' +
          contextKey +
          '" is not defined in childContextTypes.'
      );
  return assign({}, parentContext, instance);
}
function pushContextProvider(workInProgress) {
  workInProgress =
    ((workInProgress = workInProgress.stateNode) &&
      workInProgress.__reactInternalMemoizedMergedChildContext) ||
    emptyContextObject;
  previousContext = contextStackCursor$1.current;
  push(contextStackCursor$1, workInProgress);
  push(didPerformWorkStackCursor, didPerformWorkStackCursor.current);
  return !0;
}
function invalidateContextProvider(workInProgress, type, didChange) {
  var instance = workInProgress.stateNode;
  if (!instance)
    throw Error(
      "Expected to have an instance by this point. This error is likely caused by a bug in React. Please file an issue."
    );
  didChange
    ? ((workInProgress = processChildContext(
        workInProgress,
        type,
        previousContext
      )),
      (instance.__reactInternalMemoizedMergedChildContext = workInProgress),
      pop(didPerformWorkStackCursor),
      pop(contextStackCursor$1),
      push(contextStackCursor$1, workInProgress))
    : pop(didPerformWorkStackCursor);
  push(didPerformWorkStackCursor, didChange);
}
var globalClientIdCounter$1 = 0;
function getViewTransitionName(props, instance) {
  if (null != props.name && "auto" !== props.name) return props.name;
  if (null !== instance.autoName) return instance.autoName;
  props = pendingEffectsRoot.identifierPrefix;
  var globalClientId = globalClientIdCounter$1++;
  props = "_" + props + "t_" + globalClientId.toString(32) + "_";
  return (instance.autoName = props);
}
function getClassNameByType(classByType) {
  if (null == classByType || "string" === typeof classByType)
    return classByType;
  var className = null,
    activeTypes = pendingTransitionTypes;
  if (null !== activeTypes)
    for (var i = 0; i < activeTypes.length; i++) {
      var match = classByType[activeTypes[i]];
      if (null != match) {
        if ("none" === match) return "none";
        className = null == className ? match : className + (" " + match);
      }
    }
  return null == className ? classByType.default : className;
}
function getViewTransitionClassName(defaultClass, eventClass) {
  defaultClass = getClassNameByType(defaultClass);
  eventClass = getClassNameByType(eventClass);
  return null == eventClass
    ? "auto" === defaultClass
      ? null
      : defaultClass
    : "auto" === eventClass
      ? null
      : eventClass;
}
function is(x, y) {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is,
  reportGlobalError =
    "function" === typeof reportError
      ? reportError
      : function (error) {
          if (
            "object" === typeof window &&
            "function" === typeof window.ErrorEvent
          ) {
            var event = new window.ErrorEvent("error", {
              bubbles: !0,
              cancelable: !0,
              message:
                "object" === typeof error &&
                null !== error &&
                "string" === typeof error.message
                  ? String(error.message)
                  : String(error),
              error: error
            });
            if (!window.dispatchEvent(event)) return;
          } else if (
            "object" === typeof process &&
            "function" === typeof process.emit
          ) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        },
  hasOwnProperty = Object.prototype.hasOwnProperty,
  supportsUserTiming =
    "undefined" !== typeof console &&
    "function" === typeof console.timeStamp &&
    !0,
  currentTrack = "Blocking";
function setCurrentTrackFromLanes(lanes) {
  currentTrack =
    lanes & 63
      ? "Blocking"
      : lanes & 64
        ? "Gesture"
        : lanes & 4194176
          ? "Transition"
          : lanes & 62914560
            ? "Suspense"
            : lanes & 2080374784
              ? "Idle"
              : "Other";
}
function logComponentTrigger(fiber, startTime, endTime, trigger) {
  supportsUserTiming &&
    ((reusableComponentOptions.start = startTime),
    (reusableComponentOptions.end = endTime),
    (reusableComponentDevToolDetails.color = "warning"),
    (reusableComponentDevToolDetails.tooltipText = trigger),
    (reusableComponentDevToolDetails.properties = null),
    performance.measure(trigger, reusableComponentOptions),
    performance.clearMeasures(trigger));
}
function logComponentReappeared(fiber, startTime, endTime) {
  logComponentTrigger(fiber, startTime, endTime, "Reconnect");
}
var reusableComponentDevToolDetails = {
    color: "primary",
    properties: null,
    tooltipText: "",
    track: "Components \u269b"
  },
  reusableComponentOptions = {
    start: -0,
    end: -0,
    detail: { devtools: reusableComponentDevToolDetails }
  };
function logComponentRender(fiber, startTime, endTime, wasHydrated) {
  var name = getComponentNameFromFiber(fiber);
  if (null !== name && supportsUserTiming) {
    var alternate = fiber.alternate,
      selfTime = fiber.actualDuration;
    if (null === alternate || alternate.child !== fiber.child)
      for (fiber = fiber.child; null !== fiber; fiber = fiber.sibling)
        selfTime -= fiber.actualDuration;
    console.timeStamp(
      name,
      startTime,
      endTime,
      "Components \u269b",
      void 0,
      0.5 > selfTime
        ? wasHydrated
          ? "tertiary-light"
          : "primary-light"
        : 10 > selfTime
          ? wasHydrated
            ? "tertiary"
            : "primary"
          : 100 > selfTime
            ? wasHydrated
              ? "tertiary-dark"
              : "primary-dark"
            : "error"
    );
  }
}
function logComponentErrored(fiber, startTime, endTime) {
  supportsUserTiming &&
    ((fiber = getComponentNameFromFiber(fiber)),
    null !== fiber &&
      console.timeStamp(
        fiber,
        startTime,
        endTime,
        "Components \u269b",
        void 0,
        "error"
      ));
}
function logComponentEffect(fiber, startTime, endTime, selfTime, errors) {
  null !== errors
    ? supportsUserTiming &&
      ((selfTime = getComponentNameFromFiber(fiber)),
      null !== selfTime &&
        console.timeStamp(
          selfTime,
          startTime,
          endTime,
          "Components \u269b",
          void 0,
          "error"
        ))
    : ((fiber = getComponentNameFromFiber(fiber)),
      null !== fiber &&
        supportsUserTiming &&
        console.timeStamp(
          fiber,
          startTime,
          endTime,
          "Components \u269b",
          void 0,
          1 > selfTime
            ? "secondary-light"
            : 100 > selfTime
              ? "secondary"
              : 500 > selfTime
                ? "secondary-dark"
                : "error"
        ));
}
function logSuspendedRenderPhase(startTime, endTime, lanes) {
  !supportsUserTiming ||
    endTime <= startTime ||
    console.timeStamp(
      "Prewarm",
      startTime,
      endTime,
      currentTrack,
      "Scheduler \u269b",
      (lanes & 738197653) === lanes ? "tertiary-dark" : "primary-dark"
    );
}
function logSuspendedWithDelayPhase(startTime, endTime, lanes) {
  !supportsUserTiming ||
    endTime <= startTime ||
    console.timeStamp(
      "Suspended",
      startTime,
      endTime,
      currentTrack,
      "Scheduler \u269b",
      (lanes & 738197653) === lanes ? "tertiary-dark" : "primary-dark"
    );
}
function logErroredRenderPhase(startTime, endTime) {
  !supportsUserTiming ||
    endTime <= startTime ||
    console.timeStamp(
      "Errored",
      startTime,
      endTime,
      currentTrack,
      "Scheduler \u269b",
      "error"
    );
}
function logCommitErrored(startTime, endTime) {
  !supportsUserTiming ||
    endTime <= startTime ||
    console.timeStamp(
      "Errored",
      startTime,
      endTime,
      currentTrack,
      "Scheduler \u269b",
      "error"
    );
}
function logCommitPhase(startTime, endTime, errors, abortedViewTransition) {
  null !== errors
    ? logCommitErrored(startTime, endTime)
    : !supportsUserTiming ||
      endTime <= startTime ||
      console.timeStamp(
        abortedViewTransition ? "Commit Interrupted View Transition" : "Commit",
        startTime,
        endTime,
        currentTrack,
        "Scheduler \u269b",
        abortedViewTransition ? "error" : "secondary-dark"
      );
}
function logAnimatingPhase(startTime, endTime) {
  !supportsUserTiming ||
    endTime <= startTime ||
    console.timeStamp(
      "Animating",
      startTime,
      endTime,
      currentTrack,
      "Scheduler \u269b",
      "secondary-dark"
    );
}
var CapturedStacks = new WeakMap();
function createCapturedValueAtFiber(value, source) {
  if ("object" === typeof value && null !== value) {
    var existing = CapturedStacks.get(value);
    if (void 0 !== existing) return existing;
    source = {
      value: value,
      source: source,
      stack: getStackByFiberInDevAndProd(source)
    };
    CapturedStacks.set(value, source);
    return source;
  }
  return {
    value: value,
    source: source,
    stack: getStackByFiberInDevAndProd(source)
  };
}
var contextStackCursor = createCursor(null),
  contextFiberStackCursor = createCursor(null),
  rootInstanceStackCursor = createCursor(null),
  hostTransitionProviderCursor = createCursor(null);
function pushHostContainer(fiber, nextRootInstance) {
  push(rootInstanceStackCursor, nextRootInstance);
  push(contextFiberStackCursor, fiber);
  push(contextStackCursor, null);
  fiber = PROD_HOST_CONTEXT;
  pop(contextStackCursor);
  push(contextStackCursor, fiber);
}
function popHostContainer() {
  pop(contextStackCursor);
  pop(contextFiberStackCursor);
  pop(rootInstanceStackCursor);
}
function pushHostContext(fiber) {
  var stateHook = fiber.memoizedState;
  null !== stateHook &&
    ((HostTransitionContext._currentValue2 = stateHook.memoizedState),
    push(hostTransitionProviderCursor, fiber));
  stateHook = contextStackCursor.current;
  stateHook !== stateHook &&
    (push(contextFiberStackCursor, fiber), push(contextStackCursor, stateHook));
}
function popHostContext(fiber) {
  contextFiberStackCursor.current === fiber &&
    (pop(contextStackCursor), pop(contextFiberStackCursor));
  hostTransitionProviderCursor.current === fiber &&
    (pop(hostTransitionProviderCursor),
    (HostTransitionContext._currentValue2 = null));
}
var hydrationErrors = null;
function upgradeHydrationErrorsToRecoverable() {
  var queuedErrors = hydrationErrors;
  null !== queuedErrors &&
    (null === workInProgressRootRecoverableErrors
      ? (workInProgressRootRecoverableErrors = queuedErrors)
      : workInProgressRootRecoverableErrors.push.apply(
          workInProgressRootRecoverableErrors,
          queuedErrors
        ),
    (hydrationErrors = null));
  return queuedErrors;
}
var valueCursor = createCursor(null),
  currentlyRenderingFiber$1 = null,
  lastContextDependency = null;
function pushProvider(providerFiber, context, nextValue) {
  push(valueCursor, context._currentValue2);
  context._currentValue2 = nextValue;
}
function popProvider(context) {
  context._currentValue2 = valueCursor.current;
  pop(valueCursor);
}
function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
  for (; null !== parent; ) {
    var alternate = parent.alternate;
    (parent.childLanes & renderLanes) !== renderLanes
      ? ((parent.childLanes |= renderLanes),
        null !== alternate && (alternate.childLanes |= renderLanes))
      : null !== alternate &&
        (alternate.childLanes & renderLanes) !== renderLanes &&
        (alternate.childLanes |= renderLanes);
    if (parent === propagationRoot) break;
    parent = parent.return;
  }
}
function propagateContextChanges(
  workInProgress,
  contexts,
  renderLanes,
  forcePropagateEntireTree
) {
  var fiber = workInProgress.child;
  null !== fiber && (fiber.return = workInProgress);
  for (; null !== fiber; ) {
    var list = fiber.dependencies;
    if (null !== list) {
      var nextFiber = fiber.child;
      list = list.firstContext;
      a: for (; null !== list; ) {
        var dependency = list;
        list = fiber;
        for (var i = 0; i < contexts.length; i++)
          if (dependency.context === contexts[i]) {
            list.lanes |= renderLanes;
            dependency = list.alternate;
            null !== dependency && (dependency.lanes |= renderLanes);
            scheduleContextWorkOnParentPath(
              list.return,
              renderLanes,
              workInProgress
            );
            forcePropagateEntireTree || (nextFiber = null);
            break a;
          }
        list = dependency.next;
      }
    } else if (18 === fiber.tag) {
      nextFiber = fiber.return;
      if (null === nextFiber)
        throw Error(
          "We just came from a parent so we must have had a parent. This is a bug in React."
        );
      nextFiber.lanes |= renderLanes;
      list = nextFiber.alternate;
      null !== list && (list.lanes |= renderLanes);
      scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
      nextFiber = null;
    } else
      13 === fiber.tag &&
      null !== fiber.memoizedState &&
      null === fiber.memoizedState.dehydrated
        ? ((fiber.lanes |= renderLanes),
          (nextFiber = fiber.alternate),
          null !== nextFiber && (nextFiber.lanes |= renderLanes),
          scheduleContextWorkOnParentPath(
            fiber.return,
            renderLanes,
            workInProgress
          ),
          (nextFiber = fiber.child),
          (nextFiber = null !== nextFiber ? nextFiber.sibling : null))
        : (nextFiber = fiber.child);
    if (null !== nextFiber) nextFiber.return = fiber;
    else
      for (nextFiber = fiber; null !== nextFiber; ) {
        if (nextFiber === workInProgress) {
          nextFiber = null;
          break;
        }
        fiber = nextFiber.sibling;
        if (null !== fiber) {
          fiber.return = nextFiber.return;
          nextFiber = fiber;
          break;
        }
        nextFiber = nextFiber.return;
      }
    fiber = nextFiber;
  }
}
function propagateParentContextChanges(
  current,
  workInProgress,
  renderLanes,
  forcePropagateEntireTree
) {
  current = null;
  for (
    var parent = workInProgress, isInsidePropagationBailout = !1;
    null !== parent;

  ) {
    if (!isInsidePropagationBailout)
      if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = !0;
      else if (0 !== (parent.flags & 262144)) break;
    if (10 === parent.tag) {
      var currentParent = parent.alternate;
      if (null === currentParent)
        throw Error("Should have a current fiber. This is a bug in React.");
      currentParent = currentParent.memoizedProps;
      if (null !== currentParent) {
        var context = parent.type;
        objectIs(parent.pendingProps.value, currentParent.value) ||
          (null !== current ? current.push(context) : (current = [context]));
      }
    } else if (parent === hostTransitionProviderCursor.current) {
      currentParent = parent.alternate;
      if (null === currentParent)
        throw Error("Should have a current fiber. This is a bug in React.");
      currentParent.memoizedState.memoizedState !==
        parent.memoizedState.memoizedState &&
        (null !== current
          ? current.push(HostTransitionContext)
          : (current = [HostTransitionContext]));
    }
    parent = parent.return;
  }
  null !== current &&
    propagateContextChanges(
      workInProgress,
      current,
      renderLanes,
      forcePropagateEntireTree
    );
  workInProgress.flags |= 262144;
  return null !== current;
}
function checkIfContextChanged(currentDependencies) {
  for (
    currentDependencies = currentDependencies.firstContext;
    null !== currentDependencies;

  ) {
    if (
      !objectIs(
        currentDependencies.context._currentValue2,
        currentDependencies.memoizedValue
      )
    )
      return !0;
    currentDependencies = currentDependencies.next;
  }
  return !1;
}
function prepareToReadContext(workInProgress) {
  currentlyRenderingFiber$1 = workInProgress;
  lastContextDependency = null;
  workInProgress = workInProgress.dependencies;
  null !== workInProgress && (workInProgress.firstContext = null);
}
function readContext(context) {
  return readContextForConsumer(currentlyRenderingFiber$1, context);
}
function readContextDuringReconciliation(consumer, context) {
  null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
  return readContextForConsumer(consumer, context);
}
function readContextForConsumer(consumer, context) {
  var value = context._currentValue2;
  context = { context: context, memoizedValue: value, next: null };
  if (null === lastContextDependency) {
    if (null === consumer)
      throw Error(
        "Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()."
      );
    lastContextDependency = context;
    consumer.dependencies = { lanes: 0, firstContext: context };
    consumer.flags |= 524288;
  } else lastContextDependency = lastContextDependency.next = context;
  return value;
}
var AbortControllerLocal =
    "undefined" !== typeof AbortController
      ? AbortController
      : function () {
          var listeners = [],
            signal = (this.signal = {
              aborted: !1,
              addEventListener: function (type, listener) {
                listeners.push(listener);
              }
            });
          this.abort = function () {
            signal.aborted = !0;
            listeners.forEach(function (listener) {
              return listener();
            });
          };
        },
  scheduleCallback$2 = Scheduler.unstable_scheduleCallback,
  NormalPriority = Scheduler.unstable_NormalPriority,
  CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
function createCache() {
  return {
    controller: new AbortControllerLocal(),
    data: new Map(),
    refCount: 0
  };
}
function releaseCache(cache) {
  cache.refCount--;
  0 === cache.refCount &&
    scheduleCallback$2(NormalPriority, function () {
      cache.controller.abort();
    });
}
function queueTransitionTypes(root, transitionTypes) {
  if (0 !== (root.pendingLanes & 4194048)) {
    var queued = root.transitionTypes;
    null === queued && (queued = root.transitionTypes = []);
    for (root = 0; root < transitionTypes.length; root++) {
      var transitionType = transitionTypes[root];
      -1 === queued.indexOf(transitionType) && queued.push(transitionType);
    }
  }
}
var entangledTransitionTypes = null;
function claimQueuedTransitionTypes(root) {
  var claimed = root.transitionTypes;
  root.transitionTypes = null;
  return claimed;
}
var now = Scheduler.unstable_now,
  renderStartTime = -0,
  commitStartTime = -0,
  commitEndTime = -0,
  commitErrors = null,
  profilerStartTime = -1.1,
  profilerEffectDuration = -0,
  componentEffectDuration = -0,
  componentEffectStartTime = -1.1,
  componentEffectEndTime = -1.1,
  componentEffectErrors = null,
  componentEffectSpawnedUpdate = !1,
  blockingClampTime = -0,
  blockingUpdateTime = -1.1,
  blockingUpdateType = 0,
  blockingEventTime = -1.1,
  blockingEventType = null,
  blockingEventRepeatTime = -1.1,
  blockingSuspendedTime = -1.1,
  transitionClampTime = -0,
  transitionStartTime = -1.1,
  transitionUpdateTime = -1.1,
  transitionUpdateType = 0,
  transitionEventTime = -1.1,
  transitionEventType = null,
  transitionEventRepeatTime = -1.1,
  transitionSuspendedTime = -1.1,
  retryClampTime = -0,
  idleClampTime = -0,
  animatingLanes = 0,
  yieldReason = 0,
  yieldStartTime = -1.1;
function startUpdateTimerByLane(lane) {
  if (0 !== (lane & 127)) {
    if (0 > blockingUpdateTime) {
      blockingUpdateTime = now();
      0 !== (executionContext & 6) &&
        ((componentEffectSpawnedUpdate = !0), (blockingUpdateType = 1));
      lane = resolveEventTimeStamp();
      var newEventType$19 = resolveEventType();
      lane !== blockingEventRepeatTime || newEventType$19 !== blockingEventType
        ? (blockingEventRepeatTime = -1.1)
        : null !== newEventType$19 && (blockingUpdateType = 1);
      blockingEventTime = lane;
      blockingEventType = newEventType$19;
    }
  } else if (
    0 !== (lane & 4194048) &&
    0 > transitionUpdateTime &&
    ((transitionUpdateTime = now()), 0 > transitionStartTime)
  ) {
    lane = resolveEventTimeStamp();
    newEventType$19 = resolveEventType();
    if (
      lane !== transitionEventRepeatTime ||
      newEventType$19 !== transitionEventType
    )
      transitionEventRepeatTime = -1.1;
    transitionEventTime = lane;
    transitionEventType = newEventType$19;
  }
}
function pushNestedEffectDurations() {
  var prevEffectDuration = profilerEffectDuration;
  profilerEffectDuration = 0;
  return prevEffectDuration;
}
function popNestedEffectDurations(prevEffectDuration) {
  var elapsedTime = profilerEffectDuration;
  profilerEffectDuration = prevEffectDuration;
  return elapsedTime;
}
function bubbleNestedEffectDurations(prevEffectDuration) {
  var elapsedTime = profilerEffectDuration;
  profilerEffectDuration += prevEffectDuration;
  return elapsedTime;
}
function resetComponentEffectTimers() {
  componentEffectEndTime = componentEffectStartTime = -1.1;
}
function pushComponentEffectStart() {
  var prevEffectStart = componentEffectStartTime;
  componentEffectStartTime = -1.1;
  return prevEffectStart;
}
function popComponentEffectStart(prevEffectStart) {
  0 <= prevEffectStart && (componentEffectStartTime = prevEffectStart);
}
function pushComponentEffectDuration() {
  var prevEffectDuration = componentEffectDuration;
  componentEffectDuration = -0;
  return prevEffectDuration;
}
function popComponentEffectDuration(prevEffectDuration) {
  0 <= prevEffectDuration && (componentEffectDuration = prevEffectDuration);
}
function pushComponentEffectErrors() {
  var prevErrors = componentEffectErrors;
  componentEffectErrors = null;
  return prevErrors;
}
function pushComponentEffectDidSpawnUpdate() {
  var prev = componentEffectSpawnedUpdate;
  componentEffectSpawnedUpdate = !1;
  return prev;
}
var currentUpdateIsNested = !1,
  nestedUpdateScheduled = !1;
function startProfilerTimer(fiber) {
  profilerStartTime = now();
  0 > fiber.actualStartTime && (fiber.actualStartTime = profilerStartTime);
}
function stopProfilerTimerIfRunningAndRecordDuration(fiber) {
  if (0 <= profilerStartTime) {
    var elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    fiber.selfBaseDuration = elapsedTime;
    profilerStartTime = -1;
  }
}
function stopProfilerTimerIfRunningAndRecordIncompleteDuration(fiber) {
  if (0 <= profilerStartTime) {
    var elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    profilerStartTime = -1;
  }
}
function recordEffectDuration() {
  if (0 <= profilerStartTime) {
    var endTime = now(),
      elapsedTime = endTime - profilerStartTime;
    profilerStartTime = -1;
    profilerEffectDuration += elapsedTime;
    componentEffectDuration += elapsedTime;
    componentEffectEndTime = endTime;
  }
}
function recordEffectError(errorInfo) {
  null === componentEffectErrors && (componentEffectErrors = []);
  componentEffectErrors.push(errorInfo);
  null === commitErrors && (commitErrors = []);
  commitErrors.push(errorInfo);
}
function startEffectTimer() {
  profilerStartTime = now();
  0 > componentEffectStartTime &&
    (componentEffectStartTime = profilerStartTime);
}
function transferActualDuration(fiber) {
  for (var child = fiber.child; child; )
    (fiber.actualDuration += child.actualDuration), (child = child.sibling);
}
function noop() {}
var firstScheduledRoot = null,
  lastScheduledRoot = null,
  didScheduleMicrotask = !1,
  mightHavePendingSyncWork = !1,
  isFlushingWork = !1,
  currentEventTransitionLane = 0;
function ensureRootIsScheduled(root) {
  root !== lastScheduledRoot &&
    null === root.next &&
    (null === lastScheduledRoot
      ? (firstScheduledRoot = lastScheduledRoot = root)
      : (lastScheduledRoot = lastScheduledRoot.next = root));
  mightHavePendingSyncWork = !0;
  didScheduleMicrotask ||
    ((didScheduleMicrotask = !0), scheduleImmediateRootScheduleTask());
}
function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
  if (!isFlushingWork && mightHavePendingSyncWork) {
    isFlushingWork = !0;
    do {
      var didPerformSomeWork = !1;
      for (var root = firstScheduledRoot; null !== root; ) {
        if (!onlyLegacy || 0 === root.tag)
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result = 0;
            else {
              var suspendedLanes = root.suspendedLanes,
                pingedLanes = root.pingedLanes;
              JSCompiler_inline_result =
                (1 << (31 - clz32(42 | syncTransitionLanes) + 1)) - 1;
              JSCompiler_inline_result &=
                pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result =
                JSCompiler_inline_result & 201326741
                  ? (JSCompiler_inline_result & 201326741) | 1
                  : JSCompiler_inline_result
                    ? JSCompiler_inline_result | 2
                    : 0;
            }
            0 !== JSCompiler_inline_result &&
              ((didPerformSomeWork = !0),
              performSyncWorkOnRoot(root, JSCompiler_inline_result));
          } else
            (JSCompiler_inline_result = workInProgressRootRenderLanes),
              (JSCompiler_inline_result = getNextLanes(
                root,
                root === workInProgressRoot ? JSCompiler_inline_result : 0,
                null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
              )),
              0 === (JSCompiler_inline_result & 3) ||
                checkIfRootIsPrerendering(root, JSCompiler_inline_result) ||
                ((didPerformSomeWork = !0),
                performSyncWorkOnRoot(root, JSCompiler_inline_result));
        root = root.next;
      }
    } while (didPerformSomeWork);
    isFlushingWork = !1;
  }
}
function processRootScheduleInImmediateTask() {
  schedulerEvent = global.event;
  processRootScheduleInMicrotask();
}
function processRootScheduleInMicrotask() {
  mightHavePendingSyncWork = didScheduleMicrotask = !1;
  var syncTransitionLanes = 0;
  0 !== currentEventTransitionLane && (syncTransitionLanes = 32);
  for (
    var currentTime = now$1(), prev = null, root = firstScheduledRoot;
    null !== root;

  ) {
    var next = root.next,
      nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
    if (0 === nextLanes)
      (root.next = null),
        null === prev ? (firstScheduledRoot = next) : (prev.next = next),
        null === next && (lastScheduledRoot = prev);
    else if (
      ((prev = root), 0 !== syncTransitionLanes || 0 !== (nextLanes & 3))
    )
      mightHavePendingSyncWork = !0;
    root = next;
  }
  (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus) ||
    flushSyncWorkAcrossRoots_impl(syncTransitionLanes, !1);
  if (0 !== currentEventTransitionLane) {
    currentEventTransitionLane = 0;
    if (
      needsIsomorphicIndicator &&
      null != isomorphicDefaultTransitionIndicator &&
      null === pendingIsomorphicIndicator
    )
      try {
        pendingIsomorphicIndicator =
          isomorphicDefaultTransitionIndicator() || noop;
      } catch (x) {
        (pendingIsomorphicIndicator = noop), reportGlobalError(x);
      }
    for (
      syncTransitionLanes = firstScheduledRoot;
      null !== syncTransitionLanes;

    ) {
      if (
        0 !== syncTransitionLanes.indicatorLanes &&
        null === syncTransitionLanes.pendingIndicator
      )
        if (null !== pendingIsomorphicIndicator)
          (currentTime = syncTransitionLanes),
            pendingEntangledRoots++,
            (currentTime.pendingIndicator = releaseIsomorphicIndicator);
        else
          try {
            var onDefaultTransitionIndicator =
              syncTransitionLanes.onDefaultTransitionIndicator;
            syncTransitionLanes.pendingIndicator =
              onDefaultTransitionIndicator() || noop;
          } catch (x) {
            (syncTransitionLanes.pendingIndicator = noop), reportGlobalError(x);
          }
      syncTransitionLanes = syncTransitionLanes.next;
    }
  }
}
function scheduleTaskForRootDuringMicrotask(root, currentTime) {
  for (
    var suspendedLanes = root.suspendedLanes,
      pingedLanes = root.pingedLanes,
      expirationTimes = root.expirationTimes,
      lanes = root.pendingLanes & -62914561;
    0 < lanes;

  ) {
    var index$7 = 31 - clz32(lanes),
      lane = 1 << index$7,
      expirationTime = expirationTimes[index$7];
    if (-1 === expirationTime) {
      if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
        expirationTimes[index$7] = computeExpirationTime(lane, currentTime);
    } else expirationTime <= currentTime && (root.expiredLanes |= lane);
    lanes &= ~lane;
  }
  currentTime = workInProgressRoot;
  suspendedLanes = workInProgressRootRenderLanes;
  suspendedLanes = getNextLanes(
    root,
    root === currentTime ? suspendedLanes : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  pingedLanes = root.callbackNode;
  if (
    0 === suspendedLanes ||
    (root === currentTime &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    return (
      null !== pingedLanes &&
        null !== pingedLanes &&
        cancelCallback$1(pingedLanes),
      (root.callbackNode = null),
      (root.callbackPriority = 0)
    );
  if (
    0 === (suspendedLanes & 3) ||
    checkIfRootIsPrerendering(root, suspendedLanes)
  ) {
    currentTime = suspendedLanes & -suspendedLanes;
    if (currentTime === root.callbackPriority) return currentTime;
    null !== pingedLanes && cancelCallback$1(pingedLanes);
    switch (lanesToEventPriority(suspendedLanes)) {
      case 2:
      case 8:
        suspendedLanes = UserBlockingPriority;
        break;
      case 32:
        suspendedLanes = NormalPriority$1;
        break;
      case 268435456:
        suspendedLanes = IdlePriority;
        break;
      default:
        suspendedLanes = NormalPriority$1;
    }
    pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root);
    suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
    root.callbackPriority = currentTime;
    root.callbackNode = suspendedLanes;
    return currentTime;
  }
  null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
  root.callbackPriority = 2;
  root.callbackNode = null;
  return 2;
}
function performWorkOnRootViaSchedulerTask(root, didTimeout) {
  nestedUpdateScheduled = currentUpdateIsNested = !1;
  schedulerEvent = global.event;
  if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
    return (root.callbackNode = null), (root.callbackPriority = 0), null;
  var originalCallbackNode = root.callbackNode;
  0 === pendingDelayedCommitReason && (pendingDelayedCommitReason = 2);
  if (flushPendingEffects() && root.callbackNode !== originalCallbackNode)
    return null;
  var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
  workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
  performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
  scheduleTaskForRootDuringMicrotask(root, now$1());
  return null != root.callbackNode && root.callbackNode === originalCallbackNode
    ? performWorkOnRootViaSchedulerTask.bind(null, root)
    : null;
}
function performSyncWorkOnRoot(root, lanes) {
  if (flushPendingEffects()) return null;
  currentUpdateIsNested = nestedUpdateScheduled;
  nestedUpdateScheduled = !1;
  performWorkOnRoot(root, lanes, !0);
}
function scheduleImmediateRootScheduleTask() {
  supportsMicrotasks
    ? scheduleMicrotask(function () {
        0 !== (executionContext & 6)
          ? scheduleCallback$3(
              ImmediatePriority,
              processRootScheduleInImmediateTask
            )
          : processRootScheduleInMicrotask();
      })
    : scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask);
}
function requestTransitionLane() {
  if (0 === currentEventTransitionLane) {
    var actionScopeLane = currentEntangledLane;
    0 === actionScopeLane &&
      ((actionScopeLane = nextTransitionUpdateLane),
      (nextTransitionUpdateLane <<= 1),
      0 === (nextTransitionUpdateLane & 261888) &&
        (nextTransitionUpdateLane = 256));
    currentEventTransitionLane = actionScopeLane;
  }
  return currentEventTransitionLane;
}
var currentEntangledListeners = null,
  currentEntangledPendingCount = 0,
  currentEntangledLane = 0,
  currentEntangledActionThenable = null,
  isomorphicDefaultTransitionIndicator = void 0,
  pendingIsomorphicIndicator = null,
  pendingEntangledRoots = 0,
  needsIsomorphicIndicator = !1;
function entangleAsyncAction(transition, thenable) {
  if (null === currentEntangledListeners) {
    var entangledListeners = (currentEntangledListeners = []);
    currentEntangledPendingCount = 0;
    currentEntangledLane = requestTransitionLane();
    currentEntangledActionThenable = {
      status: "pending",
      value: void 0,
      then: function (resolve) {
        entangledListeners.push(resolve);
      }
    };
    needsIsomorphicIndicator = !0;
    didScheduleMicrotask ||
      ((didScheduleMicrotask = !0), scheduleImmediateRootScheduleTask());
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}
function pingEngtangledActionScope() {
  if (
    0 === --currentEntangledPendingCount &&
    (-1 < transitionUpdateTime || (transitionStartTime = -1.1),
    (entangledTransitionTypes = null),
    0 === pendingEntangledRoots && stopIsomorphicDefaultIndicator(),
    null !== currentEntangledListeners)
  ) {
    null !== currentEntangledActionThenable &&
      (currentEntangledActionThenable.status = "fulfilled");
    var listeners = currentEntangledListeners;
    currentEntangledListeners = null;
    currentEntangledLane = 0;
    currentEntangledActionThenable = null;
    needsIsomorphicIndicator = !1;
    for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
  }
}
function chainThenableValue(thenable, result) {
  var listeners = [],
    thenableWithOverride = {
      status: "pending",
      value: null,
      reason: null,
      then: function (resolve) {
        listeners.push(resolve);
      }
    };
  thenable.then(
    function () {
      thenableWithOverride.status = "fulfilled";
      thenableWithOverride.value = result;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
    },
    function (error) {
      thenableWithOverride.status = "rejected";
      thenableWithOverride.reason = error;
      for (error = 0; error < listeners.length; error++)
        (0, listeners[error])(void 0);
    }
  );
  return thenableWithOverride;
}
function stopIsomorphicDefaultIndicator() {
  if (null !== pendingIsomorphicIndicator) {
    var cleanup = pendingIsomorphicIndicator;
    pendingIsomorphicIndicator = null;
    cleanup();
  }
}
function releaseIsomorphicIndicator() {
  0 === --pendingEntangledRoots && stopIsomorphicDefaultIndicator();
}
var prevOnStartTransitionFinish = ReactSharedInternals.S;
ReactSharedInternals.S = function (transition, returnValue) {
  globalMostRecentTransitionTime = now$1();
  if (
    "object" === typeof returnValue &&
    null !== returnValue &&
    "function" === typeof returnValue.then
  ) {
    if (0 > transitionStartTime && 0 > transitionUpdateTime) {
      transitionStartTime = now();
      var newEventTime = resolveEventTimeStamp(),
        newEventType = resolveEventType();
      if (
        newEventTime !== transitionEventRepeatTime ||
        newEventType !== transitionEventType
      )
        transitionEventRepeatTime = -1.1;
      transitionEventTime = newEventTime;
      transitionEventType = newEventType;
    }
    entangleAsyncAction(transition, returnValue);
  }
  if (null !== entangledTransitionTypes)
    for (newEventTime = firstScheduledRoot; null !== newEventTime; )
      queueTransitionTypes(newEventTime, entangledTransitionTypes),
        (newEventTime = newEventTime.next);
  newEventTime = transition.types;
  if (null !== newEventTime) {
    for (newEventType = firstScheduledRoot; null !== newEventType; )
      queueTransitionTypes(newEventType, newEventTime),
        (newEventType = newEventType.next);
    if (0 !== currentEntangledLane) {
      newEventType = entangledTransitionTypes;
      null === newEventType && (newEventType = entangledTransitionTypes = []);
      for (var i = 0; i < newEventTime.length; i++) {
        var transitionType = newEventTime[i];
        -1 === newEventType.indexOf(transitionType) &&
          newEventType.push(transitionType);
      }
    }
  }
  null !== prevOnStartTransitionFinish &&
    prevOnStartTransitionFinish(transition, returnValue);
};
var resumedCache = createCursor(null);
function peekCacheFromPool() {
  var cacheResumedFromPreviousRender = resumedCache.current;
  return null !== cacheResumedFromPreviousRender
    ? cacheResumedFromPreviousRender
    : workInProgressRoot.pooledCache;
}
function pushTransition(offscreenWorkInProgress, prevCachePool) {
  null === prevCachePool
    ? push(resumedCache, resumedCache.current)
    : push(resumedCache, prevCachePool.pool);
}
function getSuspendedCache() {
  var cacheFromPool = peekCacheFromPool();
  return null === cacheFromPool
    ? null
    : { parent: CacheContext._currentValue2, pool: cacheFromPool };
}
function shallowEqual(objA, objB) {
  if (objectIs(objA, objB)) return !0;
  if (
    "object" !== typeof objA ||
    null === objA ||
    "object" !== typeof objB ||
    null === objB
  )
    return !1;
  var keysA = Object.keys(objA),
    keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return !1;
  for (keysB = 0; keysB < keysA.length; keysB++) {
    var currentKey = keysA[keysB];
    if (
      !hasOwnProperty.call(objB, currentKey) ||
      !objectIs(objA[currentKey], objB[currentKey])
    )
      return !1;
  }
  return !0;
}
var SuspenseException = Error(
    "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
  ),
  SuspenseyCommitException = Error(
    "Suspense Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."
  ),
  SuspenseActionException = Error(
    "Suspense Exception: This is not a real error! It's an implementation detail of `useActionState` to interrupt the current render. You must either rethrow it immediately, or move the `useActionState` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary."
  ),
  noopSuspenseyCommitThenable = { then: function () {} };
function isThenableResolved(thenable) {
  thenable = thenable.status;
  return "fulfilled" === thenable || "rejected" === thenable;
}
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
      checkIfUseWrappedInAsyncCatch(thenableState);
      if (void 0 === thenableState && !("reason" in thenable))
        throw Error(
          "A rejected Promise was passed to React without a `reason` property. React threw a generic error from where the Promise was used to assist in identifying the problematic Promise. Make sure that instrumented Promises correctly set the `reason` property when setting `status` to `'rejected'`."
        );
      throw thenableState;
    default:
      if ("string" === typeof thenable.status) thenable.then(noop, noop);
      else {
        thenableState = workInProgressRoot;
        if (null !== thenableState && 100 < thenableState.shellSuspendCounter)
          throw Error(
            "An unknown Component is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server."
          );
        thenableState = thenable;
        thenableState.status = "pending";
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
        );
      }
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw (
            ((thenableState = thenable.reason),
            checkIfUseWrappedInAsyncCatch(thenableState),
            thenableState)
          );
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
function resolveLazy(lazyType) {
  try {
    var init = lazyType._init;
    return init(lazyType._payload);
  } catch (x) {
    if (null !== x && "object" === typeof x && "function" === typeof x.then)
      throw ((suspendedThenable = x), SuspenseException);
    throw x;
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
function checkIfUseWrappedInAsyncCatch(rejectedReason) {
  if (
    rejectedReason === SuspenseException ||
    rejectedReason === SuspenseActionException
  )
    throw Error(
      "Hooks are not supported inside an async component. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server."
    );
}
var thenableState$1 = null,
  thenableIndexCounter$1 = 0;
function unwrapThenable(thenable) {
  var index = thenableIndexCounter$1;
  thenableIndexCounter$1 += 1;
  null === thenableState$1 && (thenableState$1 = []);
  return trackUsedThenable(thenableState$1, thenable, index);
}
function coerceRef(workInProgress, element) {
  element = element.props.ref;
  workInProgress.ref = void 0 !== element ? element : null;
}
function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
  if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
    throw Error(
      'A React Element from an older version of React was rendered. This is not supported. It can happen if:\n- Multiple copies of the "react" package is used.\n- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n- A compiler tries to "inline" JSX instead of using the runtime.'
    );
  returnFiber = Object.prototype.toString.call(newChild);
  throw Error(
    "Objects are not valid as a React child (found: " +
      ("[object Object]" === returnFiber
        ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
        : returnFiber) +
      "). If you meant to render a collection of children, use an array instead."
  );
}
function createChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (shouldTrackSideEffects) {
      var deletions = returnFiber.deletions;
      null === deletions
        ? ((returnFiber.deletions = [childToDelete]), (returnFiber.flags |= 16))
        : deletions.push(childToDelete);
    }
  }
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return null;
    for (; null !== currentFirstChild; )
      deleteChild(returnFiber, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return null;
  }
  function mapRemainingChildren(currentFirstChild) {
    for (var existingChildren = new Map(); null !== currentFirstChild; )
      null === currentFirstChild.key
        ? existingChildren.set(currentFirstChild.index, currentFirstChild)
        : existingChildren.set(currentFirstChild.key, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return existingChildren;
  }
  function useFiber(fiber, pendingProps) {
    fiber = createWorkInProgress(fiber, pendingProps);
    fiber.index = 0;
    fiber.sibling = null;
    return fiber;
  }
  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects)
      return (newFiber.flags |= 1048576), lastPlacedIndex;
    newIndex = newFiber.alternate;
    if (null !== newIndex)
      return (
        (newIndex = newIndex.index),
        newIndex < lastPlacedIndex
          ? ((newFiber.flags |= 2), lastPlacedIndex)
          : newIndex
      );
    newFiber.flags |= 134217730;
    return lastPlacedIndex;
  }
  function placeSingleChild(newFiber) {
    shouldTrackSideEffects &&
      null === newFiber.alternate &&
      (newFiber.flags |= 134217730);
    return newFiber;
  }
  function updateTextNode(returnFiber, current, textContent, lanes) {
    if (null === current || 6 !== current.tag)
      return (
        (current = createFiberFromText(textContent, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, textContent);
    current.return = returnFiber;
    return current;
  }
  function updateElement(returnFiber, current, element, lanes) {
    var elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE)
      return (
        (returnFiber = updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        )),
        enableFragmentRefs && coerceRef(returnFiber, element),
        returnFiber
      );
    if (
      null !== current &&
      (current.elementType === elementType ||
        ("object" === typeof elementType &&
          null !== elementType &&
          elementType.$$typeof === REACT_LAZY_TYPE &&
          resolveLazy(elementType) === current.type))
    )
      return (
        (current = useFiber(current, element.props)),
        coerceRef(current, element),
        (current.return = returnFiber),
        current
      );
    current = createFiberFromTypeAndProps(
      element.type,
      element.key,
      element.props,
      null,
      returnFiber.mode,
      lanes
    );
    coerceRef(current, element);
    current.return = returnFiber;
    return current;
  }
  function updatePortal(returnFiber, current, portal, lanes) {
    if (
      null === current ||
      4 !== current.tag ||
      current.stateNode.containerInfo !== portal.containerInfo ||
      current.stateNode.implementation !== portal.implementation
    )
      return (
        (current = createFiberFromPortal(portal, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, portal.children || []);
    current.return = returnFiber;
    return current;
  }
  function updateFragment(returnFiber, current, fragment, lanes, key) {
    if (null === current || 7 !== current.tag)
      return (
        (current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        )),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, fragment);
    current.return = returnFiber;
    return current;
  }
  function createChild(returnFiber, newChild, lanes) {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          lanes
        )),
        (newChild.return = returnFiber),
        newChild
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (lanes = createFiberFromTypeAndProps(
              newChild.type,
              newChild.key,
              newChild.props,
              null,
              returnFiber.mode,
              lanes
            )),
            coerceRef(lanes, newChild),
            (lanes.return = returnFiber),
            lanes
          );
        case REACT_PORTAL_TYPE:
          return (
            (newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              lanes
            )),
            (newChild.return = returnFiber),
            newChild
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            createChild(returnFiber, newChild, lanes)
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            lanes,
            null
          )),
          (newChild.return = returnFiber),
          newChild
        );
      if ("function" === typeof newChild.then)
        return createChild(returnFiber, unwrapThenable(newChild), lanes);
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return createChild(
          returnFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateSlot(returnFiber, oldFiber, newChild, lanes) {
    var key = null !== oldFiber ? oldFiber.key : null;
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return null !== key
        ? null
        : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return newChild.key === key
            ? updateElement(returnFiber, oldFiber, newChild, lanes)
            : null;
        case REACT_PORTAL_TYPE:
          return newChild.key === key
            ? updatePortal(returnFiber, oldFiber, newChild, lanes)
            : null;
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateSlot(returnFiber, oldFiber, newChild, lanes)
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return null !== key
          ? null
          : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
      if ("function" === typeof newChild.then)
        return updateSlot(
          returnFiber,
          oldFiber,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateSlot(
          returnFiber,
          oldFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateFromMap(
    existingChildren,
    returnFiber,
    newIdx,
    newChild,
    lanes
  ) {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (existingChildren = existingChildren.get(newIdx) || null),
        updateTextNode(returnFiber, existingChildren, "" + newChild, lanes)
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (existingChildren =
              existingChildren.get(
                null === newChild.key ? newIdx : newChild.key
              ) || null),
            updateElement(returnFiber, existingChildren, newChild, lanes)
          );
        case REACT_PORTAL_TYPE:
          return (
            (existingChildren =
              existingChildren.get(
                null === newChild.key ? newIdx : newChild.key
              ) || null),
            updatePortal(returnFiber, existingChildren, newChild, lanes)
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            )
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (existingChildren = existingChildren.get(newIdx) || null),
          updateFragment(returnFiber, existingChildren, newChild, lanes, null)
        );
      if ("function" === typeof newChild.then)
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function reconcileChildrenArray(
    returnFiber,
    currentFirstChild,
    newChildren,
    lanes
  ) {
    for (
      var resultingFirstChild = null,
        previousNewFiber = null,
        oldFiber = currentFirstChild,
        newIdx = (currentFirstChild = 0),
        nextOldFiber = null;
      null !== oldFiber && newIdx < newChildren.length;
      newIdx++
    ) {
      oldFiber.index > newIdx
        ? ((nextOldFiber = oldFiber), (oldFiber = null))
        : (nextOldFiber = oldFiber.sibling);
      var newFiber = updateSlot(
        returnFiber,
        oldFiber,
        newChildren[newIdx],
        lanes
      );
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, oldFiber);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (newIdx === newChildren.length)
      return (
        deleteRemainingChildren(returnFiber, oldFiber), resultingFirstChild
      );
    if (null === oldFiber) {
      for (; newIdx < newChildren.length; newIdx++)
        (oldFiber = createChild(returnFiber, newChildren[newIdx], lanes)),
          null !== oldFiber &&
            ((currentFirstChild = placeChild(
              oldFiber,
              currentFirstChild,
              newIdx
            )),
            null === previousNewFiber
              ? (resultingFirstChild = oldFiber)
              : (previousNewFiber.sibling = oldFiber),
            (previousNewFiber = oldFiber));
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren(oldFiber);
      newIdx < newChildren.length;
      newIdx++
    )
      (nextOldFiber = updateFromMap(
        oldFiber,
        returnFiber,
        newIdx,
        newChildren[newIdx],
        lanes
      )),
        null !== nextOldFiber &&
          (shouldTrackSideEffects &&
            ((newFiber = nextOldFiber.alternate),
            null !== newFiber &&
              oldFiber.delete(null === newFiber.key ? newIdx : newFiber.key)),
          (currentFirstChild = placeChild(
            nextOldFiber,
            currentFirstChild,
            newIdx
          )),
          null === previousNewFiber
            ? (resultingFirstChild = nextOldFiber)
            : (previousNewFiber.sibling = nextOldFiber),
          (previousNewFiber = nextOldFiber));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    return resultingFirstChild;
  }
  function reconcileChildrenIterator(
    returnFiber,
    currentFirstChild,
    newChildren,
    lanes
  ) {
    if (null == newChildren)
      throw Error("An iterable object provided no iterator.");
    for (
      var resultingFirstChild = null,
        previousNewFiber = null,
        oldFiber = currentFirstChild,
        newIdx = (currentFirstChild = 0),
        nextOldFiber = null,
        step = newChildren.next();
      null !== oldFiber && !step.done;
      newIdx++, step = newChildren.next()
    ) {
      oldFiber.index > newIdx
        ? ((nextOldFiber = oldFiber), (oldFiber = null))
        : (nextOldFiber = oldFiber.sibling);
      var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, oldFiber);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (step.done)
      return (
        deleteRemainingChildren(returnFiber, oldFiber), resultingFirstChild
      );
    if (null === oldFiber) {
      for (; !step.done; newIdx++, step = newChildren.next())
        (step = createChild(returnFiber, step.value, lanes)),
          null !== step &&
            ((currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
            null === previousNewFiber
              ? (resultingFirstChild = step)
              : (previousNewFiber.sibling = step),
            (previousNewFiber = step));
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren(oldFiber);
      !step.done;
      newIdx++, step = newChildren.next()
    )
      (step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes)),
        null !== step &&
          (shouldTrackSideEffects &&
            ((nextOldFiber = step.alternate),
            null !== nextOldFiber &&
              oldFiber.delete(
                null === nextOldFiber.key ? newIdx : nextOldFiber.key
              )),
          (currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
          null === previousNewFiber
            ? (resultingFirstChild = step)
            : (previousNewFiber.sibling = step),
          (previousNewFiber = step));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    return resultingFirstChild;
  }
  function reconcileChildFibersImpl(
    returnFiber,
    currentFirstChild,
    newChild,
    lanes
  ) {
    "object" === typeof newChild &&
      null !== newChild &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      null === newChild.key &&
      (enableFragmentRefs ? void 0 === newChild.props.ref : 1) &&
      (newChild = newChild.props.children);
    if ("object" === typeof newChild && null !== newChild) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          a: {
            for (var key = newChild.key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key) {
                key = newChild.type;
                if (key === REACT_FRAGMENT_TYPE) {
                  if (7 === currentFirstChild.tag) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(
                      currentFirstChild,
                      newChild.props.children
                    );
                    enableFragmentRefs && coerceRef(lanes, newChild);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                } else if (
                  currentFirstChild.elementType === key ||
                  ("object" === typeof key &&
                    null !== key &&
                    key.$$typeof === REACT_LAZY_TYPE &&
                    resolveLazy(key) === currentFirstChild.type)
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, newChild.props);
                  coerceRef(lanes, newChild);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                }
                deleteRemainingChildren(returnFiber, currentFirstChild);
                break;
              } else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            newChild.type === REACT_FRAGMENT_TYPE
              ? ((lanes = createFiberFromFragment(
                  newChild.props.children,
                  returnFiber.mode,
                  lanes,
                  newChild.key
                )),
                enableFragmentRefs && coerceRef(lanes, newChild),
                (lanes.return = returnFiber),
                (returnFiber = lanes))
              : ((lanes = createFiberFromTypeAndProps(
                  newChild.type,
                  newChild.key,
                  newChild.props,
                  null,
                  returnFiber.mode,
                  lanes
                )),
                coerceRef(lanes, newChild),
                (lanes.return = returnFiber),
                (returnFiber = lanes));
          }
          return placeSingleChild(returnFiber);
        case REACT_PORTAL_TYPE:
          a: {
            for (key = newChild.key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key)
                if (
                  4 === currentFirstChild.tag &&
                  currentFirstChild.stateNode.containerInfo ===
                    newChild.containerInfo &&
                  currentFirstChild.stateNode.implementation ===
                    newChild.implementation
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, newChild.children || []);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                } else {
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                }
              else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
            lanes.return = returnFiber;
            returnFiber = lanes;
          }
          return placeSingleChild(returnFiber);
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            )
          );
      }
      if (isArrayImpl(newChild))
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
      if (getIteratorFn(newChild)) {
        key = getIteratorFn(newChild);
        if ("function" !== typeof key)
          throw Error(
            "An object is not an iterable. This error is likely caused by a bug in React. Please file an issue."
          );
        newChild = key.call(newChild);
        return reconcileChildrenIterator(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
      }
      if ("function" === typeof newChild.then)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
      ? ((newChild = "" + newChild),
        null !== currentFirstChild && 6 === currentFirstChild.tag
          ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
            (lanes = useFiber(currentFirstChild, newChild)),
            (lanes.return = returnFiber),
            (returnFiber = lanes))
          : (deleteRemainingChildren(returnFiber, currentFirstChild),
            (lanes = createFiberFromText(newChild, returnFiber.mode, lanes)),
            (lanes.return = returnFiber),
            (returnFiber = lanes)),
        placeSingleChild(returnFiber))
      : deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  return function (returnFiber, currentFirstChild, newChild, lanes) {
    try {
      thenableIndexCounter$1 = 0;
      var firstChildFiber = reconcileChildFibersImpl(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes
      );
      thenableState$1 = null;
      return firstChildFiber;
    } catch (x) {
      if (
        x === SuspenseException ||
        x === SuspenseActionException ||
        (0 === (returnFiber.mode & 1) &&
          "object" === typeof x &&
          null !== x &&
          "function" === typeof x.then)
      )
        throw x;
      var fiber = createFiber(29, x, null, returnFiber.mode);
      fiber.lanes = lanes;
      fiber.return = returnFiber;
      return fiber;
    } finally {
    }
  };
}
var reconcileChildFibers = createChildReconciler(!0),
  mountChildFibers = createChildReconciler(!1),
  concurrentQueues = [],
  concurrentQueuesIndex = 0,
  concurrentlyUpdatedLanes = 0;
function finishQueueingConcurrentUpdates() {
  for (
    var endIndex = concurrentQueuesIndex,
      i = (concurrentlyUpdatedLanes = concurrentQueuesIndex = 0);
    i < endIndex;

  ) {
    var fiber = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var queue = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var update = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var lane = concurrentQueues[i];
    concurrentQueues[i++] = null;
    if (null !== queue && null !== update) {
      var pending = queue.pending;
      null === pending
        ? (update.next = update)
        : ((update.next = pending.next), (pending.next = update));
      queue.pending = update;
    }
    0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
  }
}
function enqueueUpdate$1(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
  concurrentlyUpdatedLanes |= lane;
  fiber.lanes |= lane;
  fiber = fiber.alternate;
  null !== fiber && (fiber.lanes |= lane);
}
function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate$1(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function enqueueConcurrentRenderForLane(fiber, lane) {
  enqueueUpdate$1(fiber, null, null, lane);
  return getRootForUpdatedFiber(fiber);
}
function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
  sourceFiber.lanes |= lane;
  var alternate = sourceFiber.alternate;
  null !== alternate && (alternate.lanes |= lane);
  for (var isHidden = !1, parent = sourceFiber.return; null !== parent; )
    (parent.childLanes |= lane),
      (alternate = parent.alternate),
      null !== alternate && (alternate.childLanes |= lane),
      22 === parent.tag &&
        ((sourceFiber = parent.stateNode),
        null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = !0)),
      (sourceFiber = parent),
      (parent = parent.return);
  return 3 === sourceFiber.tag
    ? ((parent = sourceFiber.stateNode),
      isHidden &&
        null !== update &&
        ((isHidden = 31 - clz32(lane)),
        (sourceFiber = parent.hiddenUpdates),
        (alternate = sourceFiber[isHidden]),
        null === alternate
          ? (sourceFiber[isHidden] = [update])
          : alternate.push(update),
        (update.lane = lane | 536870912)),
      parent)
    : null;
}
function getRootForUpdatedFiber(sourceFiber) {
  if (50 < nestedUpdateCount)
    throw (
      ((nestedUpdateCount = 0),
      (rootWithNestedUpdates = null),
      Error(
        "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops."
      ))
    );
  for (var parent = sourceFiber.return; null !== parent; )
    (sourceFiber = parent), (parent = sourceFiber.return);
  return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
}
var hasForceUpdate = !1;
function initializeUpdateQueue(fiber) {
  fiber.updateQueue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, lanes: 0, hiddenCallbacks: null },
    callbacks: null
  };
}
function cloneUpdateQueue(current, workInProgress) {
  current = current.updateQueue;
  workInProgress.updateQueue === current &&
    (workInProgress.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    });
}
function createUpdate(lane) {
  return { lane: lane, tag: 0, payload: null, callback: null, next: null };
}
function enqueueUpdate(fiber, update, lane) {
  var updateQueue = fiber.updateQueue;
  if (null === updateQueue) return null;
  updateQueue = updateQueue.shared;
  if (0 !== (executionContext & 2)) {
    var pending = updateQueue.pending;
    null === pending
      ? (update.next = update)
      : ((update.next = pending.next), (pending.next = update));
    updateQueue.pending = update;
    update = getRootForUpdatedFiber(fiber);
    markUpdateLaneFromFiberToRoot(fiber, null, lane);
    return update;
  }
  enqueueUpdate$1(fiber, updateQueue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function entangleTransitions(root, fiber, lane) {
  fiber = fiber.updateQueue;
  if (null !== fiber && ((fiber = fiber.shared), 0 !== (lane & 4194048))) {
    var queueLanes = fiber.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    fiber.lanes = lane;
    markRootEntangled(root, lane);
  }
}
function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
  var queue = workInProgress.updateQueue,
    current = workInProgress.alternate;
  if (
    null !== current &&
    ((current = current.updateQueue), queue === current)
  ) {
    var newFirst = null,
      newLast = null;
    queue = queue.firstBaseUpdate;
    if (null !== queue) {
      do {
        var clone = {
          lane: queue.lane,
          tag: queue.tag,
          payload: queue.payload,
          callback: null,
          next: null
        };
        null === newLast
          ? (newFirst = newLast = clone)
          : (newLast = newLast.next = clone);
        queue = queue.next;
      } while (null !== queue);
      null === newLast
        ? (newFirst = newLast = capturedUpdate)
        : (newLast = newLast.next = capturedUpdate);
    } else newFirst = newLast = capturedUpdate;
    queue = {
      baseState: current.baseState,
      firstBaseUpdate: newFirst,
      lastBaseUpdate: newLast,
      shared: current.shared,
      callbacks: current.callbacks
    };
    workInProgress.updateQueue = queue;
    return;
  }
  workInProgress = queue.lastBaseUpdate;
  null === workInProgress
    ? (queue.firstBaseUpdate = capturedUpdate)
    : (workInProgress.next = capturedUpdate);
  queue.lastBaseUpdate = capturedUpdate;
}
var didReadFromEntangledAsyncAction = !1;
function suspendIfUpdateReadFromEntangledAsyncAction() {
  if (didReadFromEntangledAsyncAction) {
    var entangledActionThenable = currentEntangledActionThenable;
    if (null !== entangledActionThenable) throw entangledActionThenable;
  }
}
function processUpdateQueue(
  workInProgress$jscomp$0,
  props,
  instance$jscomp$0,
  renderLanes
) {
  didReadFromEntangledAsyncAction = !1;
  var queue = workInProgress$jscomp$0.updateQueue;
  hasForceUpdate = !1;
  var firstBaseUpdate = queue.firstBaseUpdate,
    lastBaseUpdate = queue.lastBaseUpdate,
    pendingQueue = queue.shared.pending;
  if (null !== pendingQueue) {
    queue.shared.pending = null;
    var lastPendingUpdate = pendingQueue,
      firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    null === lastBaseUpdate
      ? (firstBaseUpdate = firstPendingUpdate)
      : (lastBaseUpdate.next = firstPendingUpdate);
    lastBaseUpdate = lastPendingUpdate;
    var current = workInProgress$jscomp$0.alternate;
    null !== current &&
      ((current = current.updateQueue),
      (pendingQueue = current.lastBaseUpdate),
      pendingQueue !== lastBaseUpdate &&
        (null === pendingQueue
          ? (current.firstBaseUpdate = firstPendingUpdate)
          : (pendingQueue.next = firstPendingUpdate),
        (current.lastBaseUpdate = lastPendingUpdate)));
  }
  if (null !== firstBaseUpdate) {
    var newState = queue.baseState;
    lastBaseUpdate = 0;
    current = firstPendingUpdate = lastPendingUpdate = null;
    pendingQueue = firstBaseUpdate;
    do {
      var updateLane = pendingQueue.lane & -536870913,
        isHiddenUpdate = updateLane !== pendingQueue.lane;
      if (
        isHiddenUpdate
          ? (workInProgressRootRenderLanes & updateLane) === updateLane
          : (renderLanes & updateLane) === updateLane
      ) {
        0 !== updateLane &&
          updateLane === currentEntangledLane &&
          (didReadFromEntangledAsyncAction = !0);
        null !== current &&
          (current = current.next =
            {
              lane: 0,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: null,
              next: null
            });
        a: {
          var workInProgress = workInProgress$jscomp$0,
            update = pendingQueue;
          updateLane = props;
          var instance = instance$jscomp$0;
          switch (update.tag) {
            case 1:
              workInProgress = update.payload;
              if ("function" === typeof workInProgress) {
                newState = workInProgress.call(instance, newState, updateLane);
                break a;
              }
              newState = workInProgress;
              break a;
            case 3:
              workInProgress.flags = (workInProgress.flags & -65537) | 128;
            case 0:
              workInProgress = update.payload;
              updateLane =
                "function" === typeof workInProgress
                  ? workInProgress.call(instance, newState, updateLane)
                  : workInProgress;
              if (null === updateLane || void 0 === updateLane) break a;
              newState = assign({}, newState, updateLane);
              break a;
            case 2:
              hasForceUpdate = !0;
          }
        }
        updateLane = pendingQueue.callback;
        null !== updateLane &&
          ((workInProgress$jscomp$0.flags |= 64),
          isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192),
          (isHiddenUpdate = queue.callbacks),
          null === isHiddenUpdate
            ? (queue.callbacks = [updateLane])
            : isHiddenUpdate.push(updateLane));
      } else
        (isHiddenUpdate = {
          lane: updateLane,
          tag: pendingQueue.tag,
          payload: pendingQueue.payload,
          callback: pendingQueue.callback,
          next: null
        }),
          null === current
            ? ((firstPendingUpdate = current = isHiddenUpdate),
              (lastPendingUpdate = newState))
            : (current = current.next = isHiddenUpdate),
          (lastBaseUpdate |= updateLane);
      pendingQueue = pendingQueue.next;
      if (null === pendingQueue)
        if (((pendingQueue = queue.shared.pending), null === pendingQueue))
          break;
        else
          (isHiddenUpdate = pendingQueue),
            (pendingQueue = isHiddenUpdate.next),
            (isHiddenUpdate.next = null),
            (queue.lastBaseUpdate = isHiddenUpdate),
            (queue.shared.pending = null);
    } while (1);
    null === current && (lastPendingUpdate = newState);
    queue.baseState = lastPendingUpdate;
    queue.firstBaseUpdate = firstPendingUpdate;
    queue.lastBaseUpdate = current;
    null === firstBaseUpdate && (queue.shared.lanes = 0);
    workInProgressRootSkippedLanes |= lastBaseUpdate;
    workInProgress$jscomp$0.lanes = lastBaseUpdate;
    workInProgress$jscomp$0.memoizedState = newState;
  }
}
function callCallback(callback, context) {
  if ("function" !== typeof callback)
    throw Error(
      "Invalid argument passed as callback. Expected a function. Instead received: " +
        callback
    );
  callback.call(context);
}
function commitCallbacks(updateQueue, context) {
  var callbacks = updateQueue.callbacks;
  if (null !== callbacks)
    for (
      updateQueue.callbacks = null, updateQueue = 0;
      updateQueue < callbacks.length;
      updateQueue++
    )
      callCallback(callbacks[updateQueue], context);
}
var currentTreeHiddenStackCursor = createCursor(null),
  prevEntangledRenderLanesCursor = createCursor(0);
function pushHiddenContext(fiber, context) {
  fiber = entangledRenderLanes;
  push(prevEntangledRenderLanesCursor, fiber);
  push(currentTreeHiddenStackCursor, context);
  entangledRenderLanes = fiber | context.baseLanes;
}
function reuseHiddenContextOnStack() {
  push(prevEntangledRenderLanesCursor, entangledRenderLanes);
  push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
}
function popHiddenContext() {
  entangledRenderLanes = prevEntangledRenderLanesCursor.current;
  pop(currentTreeHiddenStackCursor);
  pop(prevEntangledRenderLanesCursor);
}
var suspenseHandlerStackCursor = createCursor(null),
  shellBoundary = null;
function pushPrimaryTreeSuspenseHandler(handler) {
  var current = handler.alternate;
  push(suspenseStackCursor, suspenseStackCursor.current & 1);
  push(suspenseHandlerStackCursor, handler);
  null === shellBoundary &&
    (null === current || null !== currentTreeHiddenStackCursor.current
      ? (shellBoundary = handler)
      : null !== current.memoizedState && (shellBoundary = handler));
}
function pushDehydratedActivitySuspenseHandler(fiber) {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, fiber);
  null === shellBoundary && (shellBoundary = fiber);
}
function pushOffscreenSuspenseHandler(fiber) {
  22 === fiber.tag
    ? (push(suspenseStackCursor, suspenseStackCursor.current),
      push(suspenseHandlerStackCursor, fiber),
      null === shellBoundary && (shellBoundary = fiber))
    : reuseSuspenseHandlerOnStack();
}
function reuseSuspenseHandlerOnStack() {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
}
function popSuspenseHandler(fiber) {
  pop(suspenseHandlerStackCursor);
  shellBoundary === fiber && (shellBoundary = null);
  pop(suspenseStackCursor);
}
var suspenseStackCursor = createCursor(0);
function pushSuspenseListContext(fiber, newContext) {
  push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  push(suspenseStackCursor, newContext);
}
function popSuspenseListContext(fiber) {
  pop(suspenseStackCursor);
  pop(suspenseHandlerStackCursor);
  shellBoundary === fiber && (shellBoundary = null);
}
function findFirstSuspended(row) {
  for (var node = row; null !== node; ) {
    if (13 === node.tag) {
      var state = node.memoizedState;
      if (null !== state && (null === state.dehydrated || shim$1() || shim$1()))
        return node;
    } else if (
      19 === node.tag &&
      "independent" !== node.memoizedProps.revealOrder
    ) {
      if (0 !== (node.flags & 128)) return node;
    } else if (null !== node.child) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === row) return null;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
var renderLanes = 0,
  currentlyRenderingFiber = null,
  currentHook = null,
  workInProgressHook = null,
  didScheduleRenderPhaseUpdate = !1,
  didScheduleRenderPhaseUpdateDuringThisPass = !1,
  shouldDoubleInvokeUserFnsInHooksDEV = !1,
  thenableIndexCounter = 0,
  thenableState = null,
  globalClientIdCounter = 0;
function throwInvalidHookError() {
  throw Error(
    "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
  );
}
function areHookInputsEqual(nextDeps, prevDeps) {
  if (null === prevDeps) return !1;
  for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
    if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
  return !0;
}
function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  secondArg,
  nextRenderLanes
) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = 0;
  ReactSharedInternals.H =
    null === current || null === current.memoizedState
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  nextRenderLanes = Component(props, secondArg);
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  didScheduleRenderPhaseUpdateDuringThisPass &&
    (nextRenderLanes = renderWithHooksAgain(
      workInProgress,
      Component,
      props,
      secondArg
    ));
  finishRenderingHooks(current);
  return nextRenderLanes;
}
function finishRenderingHooks(current) {
  ReactSharedInternals.H = ContextOnlyDispatcher;
  var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdate = !1;
  thenableIndexCounter = 0;
  thenableState = null;
  if (didRenderTooFewHooks)
    throw Error(
      "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
    );
  null === current ||
    didReceiveUpdate ||
    ((current = current.dependencies),
    null !== current &&
      checkIfContextChanged(current) &&
      (didReceiveUpdate = !0));
}
function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
  currentlyRenderingFiber = workInProgress;
  var numberOfReRenders = 0;
  do {
    didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
    thenableIndexCounter = 0;
    didScheduleRenderPhaseUpdateDuringThisPass = !1;
    if (25 <= numberOfReRenders)
      throw Error(
        "Too many re-renders. React limits the number of renders to prevent an infinite loop."
      );
    numberOfReRenders += 1;
    workInProgressHook = currentHook = null;
    if (null != workInProgress.updateQueue) {
      var children = workInProgress.updateQueue;
      children.lastEffect = null;
      children.events = null;
      children.stores = null;
      null != children.memoCache && (children.memoCache.index = 0);
    }
    ReactSharedInternals.H = HooksDispatcherOnRerender;
    children = Component(props, secondArg);
  } while (didScheduleRenderPhaseUpdateDuringThisPass);
  return children;
}
function TransitionAwareHostComponent() {
  var dispatcher = ReactSharedInternals.H,
    maybeThenable = dispatcher.useState()[0];
  maybeThenable =
    "function" === typeof maybeThenable.then
      ? useThenable(maybeThenable)
      : maybeThenable;
  dispatcher = dispatcher.useState()[0];
  (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher &&
    (currentlyRenderingFiber.flags |= 1024);
  return maybeThenable;
}
function bailoutHooks(current, workInProgress, lanes) {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.flags &= -2053;
  current.lanes &= ~lanes;
}
function resetHooksOnUnwind(workInProgress) {
  if (didScheduleRenderPhaseUpdate) {
    for (
      workInProgress = workInProgress.memoizedState;
      null !== workInProgress;

    ) {
      var queue = workInProgress.queue;
      null !== queue && (queue.pending = null);
      workInProgress = workInProgress.next;
    }
    didScheduleRenderPhaseUpdate = !1;
  }
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdateDuringThisPass = !1;
  thenableIndexCounter = 0;
  thenableState = null;
}
function mountWorkInProgressHook() {
  var hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };
  null === workInProgressHook
    ? (currentlyRenderingFiber.memoizedState = workInProgressHook = hook)
    : (workInProgressHook = workInProgressHook.next = hook);
  return workInProgressHook;
}
function updateWorkInProgressHook() {
  if (null === currentHook) {
    var nextCurrentHook = currentlyRenderingFiber.alternate;
    nextCurrentHook =
      null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
  } else nextCurrentHook = currentHook.next;
  var nextWorkInProgressHook =
    null === workInProgressHook
      ? currentlyRenderingFiber.memoizedState
      : workInProgressHook.next;
  if (null !== nextWorkInProgressHook)
    (workInProgressHook = nextWorkInProgressHook),
      (currentHook = nextCurrentHook);
  else {
    if (null === nextCurrentHook) {
      if (null === currentlyRenderingFiber.alternate)
        throw Error(
          "Update hook called on initial render. This is likely a bug in React. Please file an issue."
        );
      throw Error("Rendered more hooks than during the previous render.");
    }
    currentHook = nextCurrentHook;
    nextCurrentHook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null
    };
    null === workInProgressHook
      ? (currentlyRenderingFiber.memoizedState = workInProgressHook =
          nextCurrentHook)
      : (workInProgressHook = workInProgressHook.next = nextCurrentHook);
  }
  return workInProgressHook;
}
function createFunctionComponentUpdateQueue() {
  return { lastEffect: null, events: null, stores: null, memoCache: null };
}
function useThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  thenable = trackUsedThenable(thenableState, thenable, index);
  index = currentlyRenderingFiber;
  null ===
    (null === workInProgressHook
      ? index.memoizedState
      : workInProgressHook.next) &&
    ((index = index.alternate),
    (ReactSharedInternals.H =
      null === index || null === index.memoizedState
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate));
  return thenable;
}
function use(usable) {
  if (null !== usable && "object" === typeof usable) {
    if ("function" === typeof usable.then) return useThenable(usable);
    if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
  }
  throw Error("An unsupported type was passed to use(): " + String(usable));
}
function useMemoCache(size) {
  var memoCache = null,
    updateQueue = currentlyRenderingFiber.updateQueue;
  null !== updateQueue && (memoCache = updateQueue.memoCache);
  if (null == memoCache) {
    var current = currentlyRenderingFiber.alternate;
    null !== current &&
      ((current = current.updateQueue),
      null !== current &&
        ((current = current.memoCache),
        null != current &&
          (memoCache = {
            data: current.data.map(function (array) {
              return array.slice();
            }),
            index: 0
          })));
  }
  null == memoCache && (memoCache = { data: [], index: 0 });
  null === updateQueue &&
    ((updateQueue = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber.updateQueue = updateQueue));
  updateQueue.memoCache = memoCache;
  updateQueue = memoCache.data[memoCache.index];
  if (void 0 === updateQueue)
    for (
      updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0;
      current < size;
      current++
    )
      updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
  memoCache.index++;
  return updateQueue;
}
function basicStateReducer(state, action) {
  return "function" === typeof action ? action(state) : action;
}
function updateReducer(reducer) {
  var hook = updateWorkInProgressHook();
  return updateReducerImpl(hook, currentHook, reducer);
}
function updateReducerImpl(hook, current, reducer) {
  var queue = hook.queue;
  if (null === queue)
    throw Error(
      "Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)"
    );
  queue.lastRenderedReducer = reducer;
  var baseQueue = hook.baseQueue,
    pendingQueue = queue.pending;
  if (null !== pendingQueue) {
    if (null !== baseQueue) {
      var baseFirst = baseQueue.next;
      baseQueue.next = pendingQueue.next;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  pendingQueue = hook.baseState;
  if (null === baseQueue) hook.memoizedState = pendingQueue;
  else {
    current = baseQueue.next;
    var newBaseQueueFirst = (baseFirst = null),
      newBaseQueueLast = null,
      update = current,
      didReadFromEntangledAsyncAction$55 = !1;
    do {
      var updateLane = update.lane & -536870913;
      if (
        updateLane !== update.lane
          ? (workInProgressRootRenderLanes & updateLane) === updateLane
          : (renderLanes & updateLane) === updateLane
      ) {
        var revertLane = update.revertLane;
        if (0 === revertLane)
          null !== newBaseQueueLast &&
            (newBaseQueueLast = newBaseQueueLast.next =
              {
                lane: 0,
                revertLane: 0,
                gesture: null,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }),
            updateLane === currentEntangledLane &&
              (didReadFromEntangledAsyncAction$55 = !0);
        else if ((renderLanes & revertLane) === revertLane) {
          update = update.next;
          revertLane === currentEntangledLane &&
            (didReadFromEntangledAsyncAction$55 = !0);
          continue;
        } else
          (updateLane = {
            lane: 0,
            revertLane: update.revertLane,
            gesture: null,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }),
            null === newBaseQueueLast
              ? ((newBaseQueueFirst = newBaseQueueLast = updateLane),
                (baseFirst = pendingQueue))
              : (newBaseQueueLast = newBaseQueueLast.next = updateLane),
            (currentlyRenderingFiber.lanes |= revertLane),
            (workInProgressRootSkippedLanes |= revertLane);
        updateLane = update.action;
        shouldDoubleInvokeUserFnsInHooksDEV &&
          reducer(pendingQueue, updateLane);
        pendingQueue = update.hasEagerState
          ? update.eagerState
          : reducer(pendingQueue, updateLane);
      } else
        (revertLane = {
          lane: updateLane,
          revertLane: update.revertLane,
          gesture: update.gesture,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null
        }),
          null === newBaseQueueLast
            ? ((newBaseQueueFirst = newBaseQueueLast = revertLane),
              (baseFirst = pendingQueue))
            : (newBaseQueueLast = newBaseQueueLast.next = revertLane),
          (currentlyRenderingFiber.lanes |= updateLane),
          (workInProgressRootSkippedLanes |= updateLane);
      update = update.next;
    } while (null !== update && update !== current);
    null === newBaseQueueLast
      ? (baseFirst = pendingQueue)
      : (newBaseQueueLast.next = newBaseQueueFirst);
    if (
      !objectIs(pendingQueue, hook.memoizedState) &&
      ((didReceiveUpdate = !0),
      didReadFromEntangledAsyncAction$55 &&
        ((reducer = currentEntangledActionThenable), null !== reducer))
    )
      throw reducer;
    hook.memoizedState = pendingQueue;
    hook.baseState = baseFirst;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = pendingQueue;
  }
  null === baseQueue && (queue.lanes = 0);
  return [hook.memoizedState, queue.dispatch];
}
function rerenderReducer(reducer) {
  var hook = updateWorkInProgressHook(),
    queue = hook.queue;
  if (null === queue)
    throw Error(
      "Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)"
    );
  queue.lastRenderedReducer = reducer;
  var dispatch = queue.dispatch,
    lastRenderPhaseUpdate = queue.pending,
    newState = hook.memoizedState;
  if (null !== lastRenderPhaseUpdate) {
    queue.pending = null;
    var update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
    do (newState = reducer(newState, update.action)), (update = update.next);
    while (update !== lastRenderPhaseUpdate);
    objectIs(newState, hook.memoizedState) || (didReceiveUpdate = !0);
    hook.memoizedState = newState;
    null === hook.baseQueue && (hook.baseState = newState);
    queue.lastRenderedState = newState;
  }
  return [newState, dispatch];
}
function updateSyncExternalStore(subscribe, getSnapshot) {
  var fiber = currentlyRenderingFiber,
    hook = updateWorkInProgressHook();
  var nextSnapshot = getSnapshot();
  var snapshotChanged = !objectIs(
    (currentHook || hook).memoizedState,
    nextSnapshot
  );
  snapshotChanged &&
    ((hook.memoizedState = nextSnapshot), (didReceiveUpdate = !0));
  hook = hook.queue;
  updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
    subscribe
  ]);
  if (
    hook.getSnapshot !== getSnapshot ||
    snapshotChanged ||
    (null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1)
  ) {
    fiber.flags |= 2048;
    pushSimpleEffect(
      9,
      { destroy: void 0 },
      updateStoreInstance.bind(null, fiber, hook, nextSnapshot, getSnapshot),
      null
    );
    if (null === workInProgressRoot)
      throw Error(
        "Expected a work-in-progress root. This is a bug in React. Please file an issue."
      );
    0 !== (renderLanes & 127) ||
      pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
  }
  return nextSnapshot;
}
function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
  fiber.flags |= 16384;
  fiber = { getSnapshot: getSnapshot, value: renderedSnapshot };
  getSnapshot = currentlyRenderingFiber.updateQueue;
  null === getSnapshot
    ? ((getSnapshot = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber.updateQueue = getSnapshot),
      (getSnapshot.stores = [fiber]))
    : ((renderedSnapshot = getSnapshot.stores),
      null === renderedSnapshot
        ? (getSnapshot.stores = [fiber])
        : renderedSnapshot.push(fiber));
}
function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;
  checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
}
function subscribeToStore(fiber, inst, subscribe) {
  return subscribe(function () {
    checkIfSnapshotChanged(inst) &&
      (startUpdateTimerByLane(2), forceStoreRerender(fiber));
  });
}
function checkIfSnapshotChanged(inst) {
  var latestGetSnapshot = inst.getSnapshot;
  inst = inst.value;
  try {
    var nextValue = latestGetSnapshot();
    return !objectIs(inst, nextValue);
  } catch (error) {
    return !0;
  }
}
function forceStoreRerender(fiber) {
  var root = enqueueConcurrentRenderForLane(fiber, 2);
  null !== root && scheduleUpdateOnFiber(root, fiber, 2);
}
function mountStateImpl(initialState) {
  var hook = mountWorkInProgressHook();
  if ("function" === typeof initialState) {
    var initialStateInitializer = initialState;
    initialState = initialStateInitializer();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(!0);
      try {
        initialStateInitializer();
      } finally {
        setIsStrictModeForDevtools(!1);
      }
    }
  }
  hook.memoizedState = hook.baseState = initialState;
  hook.queue = {
    pending: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState
  };
  return hook;
}
function updateOptimisticImpl(hook, current, passthrough, reducer) {
  hook.baseState = passthrough;
  return updateReducerImpl(
    hook,
    currentHook,
    "function" === typeof reducer ? reducer : basicStateReducer
  );
}
function dispatchActionState(
  fiber,
  actionQueue,
  setPendingState,
  setState,
  payload
) {
  if (isRenderPhaseUpdate(fiber))
    throw Error("Cannot update action state while rendering.");
  fiber = actionQueue.action;
  if (null !== fiber) {
    var actionNode = {
      payload: payload,
      action: fiber,
      next: null,
      isTransition: !0,
      status: "pending",
      value: null,
      reason: null,
      listeners: [],
      then: function (listener) {
        actionNode.listeners.push(listener);
      }
    };
    null !== ReactSharedInternals.T
      ? setPendingState(!0)
      : (actionNode.isTransition = !1);
    setState(actionNode);
    setPendingState = actionQueue.pending;
    null === setPendingState
      ? ((actionNode.next = actionQueue.pending = actionNode),
        runActionStateAction(actionQueue, actionNode))
      : ((actionNode.next = setPendingState.next),
        (actionQueue.pending = setPendingState.next = actionNode));
  }
}
function runActionStateAction(actionQueue, node) {
  var action = node.action,
    payload = node.payload,
    prevState = actionQueue.state;
  if (node.isTransition) {
    var prevTransition = ReactSharedInternals.T,
      currentTransition = {};
    currentTransition.types =
      null !== prevTransition ? prevTransition.types : null;
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = action(prevState, payload),
        onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish &&
        onStartTransitionFinish(currentTransition, returnValue);
      handleActionReturnValue(actionQueue, node, returnValue);
    } catch (error) {
      onActionError(actionQueue, node, error);
    } finally {
      null !== prevTransition &&
        null !== currentTransition.types &&
        (prevTransition.types = currentTransition.types),
        (ReactSharedInternals.T = prevTransition);
    }
  } else
    try {
      (prevTransition = action(prevState, payload)),
        handleActionReturnValue(actionQueue, node, prevTransition);
    } catch (error$59) {
      onActionError(actionQueue, node, error$59);
    }
}
function handleActionReturnValue(actionQueue, node, returnValue) {
  null !== returnValue &&
  "object" === typeof returnValue &&
  "function" === typeof returnValue.then
    ? returnValue.then(
        function (nextState) {
          onActionSuccess(actionQueue, node, nextState);
        },
        function (error) {
          return onActionError(actionQueue, node, error);
        }
      )
    : onActionSuccess(actionQueue, node, returnValue);
}
function onActionSuccess(actionQueue, actionNode, nextState) {
  actionNode.status = "fulfilled";
  actionNode.value = nextState;
  notifyActionListeners(actionNode);
  actionQueue.state = nextState;
  actionNode = actionQueue.pending;
  null !== actionNode &&
    ((nextState = actionNode.next),
    nextState === actionNode
      ? (actionQueue.pending = null)
      : ((nextState = nextState.next),
        (actionNode.next = nextState),
        runActionStateAction(actionQueue, nextState)));
}
function onActionError(actionQueue, actionNode, error) {
  var last = actionQueue.pending;
  actionQueue.pending = null;
  if (null !== last) {
    last = last.next;
    do
      (actionNode.status = "rejected"),
        (actionNode.reason = error),
        notifyActionListeners(actionNode),
        (actionNode = actionNode.next);
    while (actionNode !== last);
  }
  actionQueue.action = null;
}
function notifyActionListeners(actionNode) {
  actionNode = actionNode.listeners;
  for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
}
function actionStateReducer(oldState, newState) {
  return newState;
}
function mountActionState(action, initialStateProp) {
  var stateHook = mountWorkInProgressHook();
  stateHook.memoizedState = stateHook.baseState = initialStateProp;
  var stateQueue = {
    pending: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: actionStateReducer,
    lastRenderedState: initialStateProp
  };
  stateHook.queue = stateQueue;
  stateHook = dispatchSetState.bind(null, currentlyRenderingFiber, stateQueue);
  stateQueue.dispatch = stateHook;
  stateQueue = mountStateImpl(!1);
  var setPendingState = dispatchOptimisticSetState.bind(
    null,
    currentlyRenderingFiber,
    !1,
    stateQueue.queue
  );
  stateQueue = mountWorkInProgressHook();
  var actionQueue = {
    state: initialStateProp,
    dispatch: null,
    action: action,
    pending: null
  };
  stateQueue.queue = actionQueue;
  stateHook = dispatchActionState.bind(
    null,
    currentlyRenderingFiber,
    actionQueue,
    setPendingState,
    stateHook
  );
  actionQueue.dispatch = stateHook;
  stateQueue.memoizedState = action;
  return [initialStateProp, stateHook, !1];
}
function updateActionState(action) {
  var stateHook = updateWorkInProgressHook();
  return updateActionStateImpl(stateHook, currentHook, action);
}
function updateActionStateImpl(stateHook, currentStateHook, action) {
  currentStateHook = updateReducerImpl(
    stateHook,
    currentStateHook,
    actionStateReducer
  )[0];
  stateHook = updateReducer(basicStateReducer)[0];
  if (
    "object" === typeof currentStateHook &&
    null !== currentStateHook &&
    "function" === typeof currentStateHook.then
  )
    try {
      var state = useThenable(currentStateHook);
    } catch (x) {
      if (x === SuspenseException) throw SuspenseActionException;
      throw x;
    }
  else state = currentStateHook;
  currentStateHook = updateWorkInProgressHook();
  var actionQueue = currentStateHook.queue,
    dispatch = actionQueue.dispatch;
  action !== currentStateHook.memoizedState &&
    ((currentlyRenderingFiber.flags |= 2048),
    pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
  return [state, dispatch, stateHook];
}
function actionStateActionEffect(actionQueue, action) {
  actionQueue.action = action;
}
function rerenderActionState(action) {
  var stateHook = updateWorkInProgressHook(),
    currentStateHook = currentHook;
  if (null !== currentStateHook)
    return updateActionStateImpl(stateHook, currentStateHook, action);
  updateWorkInProgressHook();
  stateHook = stateHook.memoizedState;
  currentStateHook = updateWorkInProgressHook();
  var dispatch = currentStateHook.queue.dispatch;
  currentStateHook.memoizedState = action;
  return [stateHook, dispatch, !1];
}
function pushSimpleEffect(tag, inst, create, deps) {
  tag = { tag: tag, create: create, deps: deps, inst: inst, next: null };
  inst = currentlyRenderingFiber.updateQueue;
  null === inst &&
    ((inst = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber.updateQueue = inst));
  create = inst.lastEffect;
  null === create
    ? (inst.lastEffect = tag.next = tag)
    : ((deps = create.next),
      (create.next = tag),
      (tag.next = deps),
      (inst.lastEffect = tag));
  return tag;
}
function updateRef() {
  return updateWorkInProgressHook().memoizedState;
}
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  var hook = mountWorkInProgressHook();
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    1 | hookFlags,
    { destroy: void 0 },
    create,
    void 0 === deps ? null : deps
  );
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var inst = hook.memoizedState.inst;
  null !== currentHook &&
  null !== deps &&
  areHookInputsEqual(deps, currentHook.memoizedState.deps)
    ? (hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps))
    : ((currentlyRenderingFiber.flags |= fiberFlags),
      (hook.memoizedState = pushSimpleEffect(
        1 | hookFlags,
        inst,
        create,
        deps
      )));
}
function mountEffect(create, deps) {
  mountEffectImpl(8390656, 8, create, deps);
}
function updateEffect(create, deps) {
  updateEffectImpl(2048, 8, create, deps);
}
function useEffectEventImpl(payload) {
  currentlyRenderingFiber.flags |= 4;
  var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (null === componentUpdateQueue)
    (componentUpdateQueue = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber.updateQueue = componentUpdateQueue),
      (componentUpdateQueue.events = [payload]);
  else {
    var events = componentUpdateQueue.events;
    null === events
      ? (componentUpdateQueue.events = [payload])
      : events.push(payload);
  }
}
function updateEvent(callback) {
  var ref = updateWorkInProgressHook().memoizedState;
  useEffectEventImpl({ ref: ref, nextImpl: callback });
  return function () {
    if (0 !== (executionContext & 2))
      throw Error(
        "A function wrapped in useEffectEvent can't be called during rendering."
      );
    return ref.impl.apply(void 0, arguments);
  };
}
function updateInsertionEffect(create, deps) {
  return updateEffectImpl(4, 2, create, deps);
}
function updateLayoutEffect(create, deps) {
  return updateEffectImpl(4, 4, create, deps);
}
function imperativeHandleEffect(create, ref) {
  if ("function" === typeof ref) {
    create = create();
    var refCleanup = ref(create);
    return function () {
      "function" === typeof refCleanup ? refCleanup() : ref(null);
    };
  }
  if (null !== ref && void 0 !== ref)
    return (
      (create = create()),
      (ref.current = create),
      function () {
        ref.current = null;
      }
    );
}
function updateImperativeHandle(ref, create, deps) {
  deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
  updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
}
function mountDebugValue() {}
function updateCallback(callback, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState = hook.memoizedState;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  hook.memoizedState = [callback, deps];
  return callback;
}
function updateMemo(nextCreate, deps) {
  var hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState = hook.memoizedState;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  prevState = nextCreate();
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    setIsStrictModeForDevtools(!0);
    try {
      nextCreate();
    } finally {
      setIsStrictModeForDevtools(!1);
    }
  }
  hook.memoizedState = [prevState, deps];
  return prevState;
}
function mountDeferredValueImpl(hook, value, initialValue) {
  if (
    void 0 === initialValue ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return (hook.memoizedState = value);
  hook.memoizedState = initialValue;
  hook = requestDeferredLane();
  currentlyRenderingFiber.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return initialValue;
}
function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
  if (objectIs(value, prevValue)) return value;
  if (null !== currentTreeHiddenStackCursor.current)
    return (
      (hook = mountDeferredValueImpl(hook, value, initialValue)),
      objectIs(hook, prevValue) || (didReceiveUpdate = !0),
      hook
    );
  if (
    0 === (renderLanes & 106) ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return (didReceiveUpdate = !0), (hook.memoizedState = value);
  hook = requestDeferredLane();
  currentlyRenderingFiber.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return prevValue;
}
function startTransition(fiber, queue, pendingState, finishedState, callback) {
  var previousPriority = currentUpdatePriority;
  currentUpdatePriority =
    0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
  var prevTransition = ReactSharedInternals.T,
    currentTransition = {};
  currentTransition.types =
    null !== prevTransition ? prevTransition.types : null;
  ReactSharedInternals.T = currentTransition;
  dispatchOptimisticSetState(fiber, !1, queue, pendingState);
  try {
    var returnValue = callback(),
      onStartTransitionFinish = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    if (
      null !== returnValue &&
      "object" === typeof returnValue &&
      "function" === typeof returnValue.then
    ) {
      var thenableForFinishedState = chainThenableValue(
        returnValue,
        finishedState
      );
      dispatchSetStateInternal(
        fiber,
        queue,
        thenableForFinishedState,
        requestUpdateLane(fiber)
      );
    } else
      dispatchSetStateInternal(
        fiber,
        queue,
        finishedState,
        requestUpdateLane(fiber)
      );
  } catch (error) {
    dispatchSetStateInternal(
      fiber,
      queue,
      { then: function () {}, status: "rejected", reason: error },
      requestUpdateLane(fiber)
    );
  } finally {
    (currentUpdatePriority = previousPriority),
      null !== prevTransition &&
        null !== currentTransition.types &&
        (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
}
function useHostTransitionStatus() {
  return readContext(HostTransitionContext);
}
function updateId() {
  return updateWorkInProgressHook().memoizedState;
}
function updateRefresh() {
  return updateWorkInProgressHook().memoizedState;
}
function refreshCache(fiber) {
  for (var provider = fiber.return; null !== provider; ) {
    switch (provider.tag) {
      case 24:
      case 3:
        var lane = requestUpdateLane(provider);
        fiber = createUpdate(lane);
        var root = enqueueUpdate(provider, fiber, lane);
        null !== root &&
          (startUpdateTimerByLane(lane),
          scheduleUpdateOnFiber(root, provider, lane),
          entangleTransitions(root, provider, lane));
        provider = { cache: createCache() };
        fiber.payload = provider;
        return;
    }
    provider = provider.return;
  }
}
function dispatchReducerAction(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  action = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  isRenderPhaseUpdate(fiber)
    ? enqueueRenderPhaseUpdate(queue, action)
    : ((action = enqueueConcurrentHookUpdate(fiber, queue, action, lane)),
      null !== action &&
        (startUpdateTimerByLane(lane),
        scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane)));
  markStateUpdateScheduled(fiber, lane);
}
function dispatchSetState(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  dispatchSetStateInternal(fiber, queue, action, lane) &&
    startUpdateTimerByLane(lane);
  markStateUpdateScheduled(fiber, lane);
}
function dispatchSetStateInternal(fiber, queue, action, lane) {
  var update = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
  else {
    var alternate = fiber.alternate;
    if (
      0 === fiber.lanes &&
      (null === alternate || 0 === alternate.lanes) &&
      ((alternate = queue.lastRenderedReducer), null !== alternate)
    )
      try {
        var currentState = queue.lastRenderedState,
          eagerState = alternate(currentState, action);
        update.hasEagerState = !0;
        update.eagerState = eagerState;
        if (objectIs(eagerState, currentState))
          return (
            enqueueUpdate$1(fiber, queue, update, 0),
            null === workInProgressRoot && finishQueueingConcurrentUpdates(),
            !1
          );
      } catch (error) {
      } finally {
      }
    action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (null !== action)
      return (
        scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane),
        !0
      );
  }
  return !1;
}
function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
  action = {
    lane: 2,
    revertLane: requestTransitionLane(),
    gesture: null,
    action: action,
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (isRenderPhaseUpdate(fiber)) {
    if (throwIfDuringRender)
      throw Error("Cannot update optimistic state while rendering.");
  } else
    (throwIfDuringRender = enqueueConcurrentHookUpdate(
      fiber,
      queue,
      action,
      2
    )),
      null !== throwIfDuringRender &&
        (startUpdateTimerByLane(2),
        scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2));
  markStateUpdateScheduled(fiber, 2);
}
function isRenderPhaseUpdate(fiber) {
  var alternate = fiber.alternate;
  return (
    fiber === currentlyRenderingFiber ||
    (null !== alternate && alternate === currentlyRenderingFiber)
  );
}
function enqueueRenderPhaseUpdate(queue, update) {
  didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
    !0;
  var pending = queue.pending;
  null === pending
    ? (update.next = update)
    : ((update.next = pending.next), (pending.next = update));
  queue.pending = update;
}
function entangleTransitionUpdate(root, queue, lane) {
  if (0 !== (lane & 4194048)) {
    var queueLanes = queue.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    queue.lanes = lane;
    markRootEntangled(root, lane);
  }
}
var ContextOnlyDispatcher = {
    readContext: readContext,
    use: use,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    useHostTransitionStatus: throwInvalidHookError,
    useFormState: throwInvalidHookError,
    useActionState: throwInvalidHookError,
    useOptimistic: throwInvalidHookError,
    useMemoCache: throwInvalidHookError,
    useCacheRefresh: throwInvalidHookError,
    useEffectEvent: throwInvalidHookError
  },
  HooksDispatcherOnMount = {
    readContext: readContext,
    use: use,
    useCallback: function (callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function (ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function (create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function (create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function (nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(!0);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(!1);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function (reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(!0);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(!1);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function (initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return (hook.memoizedState = initialValue);
    },
    useState: function (initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue,
        dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function () {
      var stateHook = mountStateImpl(!1);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        !0,
        !1
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [!1, stateHook];
    },
    useSyncExternalStore: function (subscribe, getSnapshot) {
      var fiber = currentlyRenderingFiber,
        hook = mountWorkInProgressHook();
      var nextSnapshot = getSnapshot();
      if (null === workInProgressRoot)
        throw Error(
          "Expected a work-in-progress root. This is a bug in React. Please file an issue."
        );
      0 !== (workInProgressRootRenderLanes & 127) ||
        pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
      hook.memoizedState = nextSnapshot;
      var inst = { value: nextSnapshot, getSnapshot: getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
        null
      );
      return nextSnapshot;
    },
    useId: function () {
      var hook = mountWorkInProgressHook(),
        identifierPrefix = workInProgressRoot.identifierPrefix,
        globalClientId = globalClientIdCounter++;
      identifierPrefix =
        "_" + identifierPrefix + "r_" + globalClientId.toString(32) + "_";
      return (hook.memoizedState = identifierPrefix);
    },
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function (passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        !0,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: function () {
      return (mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      ));
    },
    useEffectEvent: function (callback) {
      var hook = mountWorkInProgressHook(),
        ref = { impl: callback };
      hook.memoizedState = ref;
      return function () {
        if (0 !== (executionContext & 2))
          throw Error(
            "A function wrapped in useEffectEvent can't be called during rendering."
          );
        return ref.impl.apply(void 0, arguments);
      };
    }
  },
  HooksDispatcherOnUpdate = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function () {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function () {
      var booleanOrThenable = updateReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function (passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  },
  HooksDispatcherOnRerender = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function () {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook
        ? mountDeferredValueImpl(hook, value, initialValue)
        : updateDeferredValueImpl(
            hook,
            currentHook.memoizedState,
            value,
            initialValue
          );
    },
    useTransition: function () {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: rerenderActionState,
    useActionState: rerenderActionState,
    useOptimistic: function (passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (null !== currentHook)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  };
function applyDerivedStateFromProps(
  workInProgress,
  ctor,
  getDerivedStateFromProps,
  nextProps
) {
  ctor = workInProgress.memoizedState;
  getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
  getDerivedStateFromProps =
    null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps
      ? ctor
      : assign({}, ctor, getDerivedStateFromProps);
  workInProgress.memoizedState = getDerivedStateFromProps;
  0 === workInProgress.lanes &&
    (workInProgress.updateQueue.baseState = getDerivedStateFromProps);
}
var classComponentUpdater = {
  enqueueSetState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (startUpdateTimerByLane(lane),
      scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
    markStateUpdateScheduled(inst, lane);
  },
  enqueueReplaceState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.tag = 1;
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (startUpdateTimerByLane(lane),
      scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
    markStateUpdateScheduled(inst, lane);
  },
  enqueueForceUpdate: function (inst, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.tag = 2;
    void 0 !== callback && null !== callback && (update.callback = callback);
    callback = enqueueUpdate(inst, update, lane);
    null !== callback &&
      (startUpdateTimerByLane(lane),
      scheduleUpdateOnFiber(callback, inst, lane),
      entangleTransitions(callback, inst, lane));
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markForceUpdateScheduled &&
      injectedProfilingHooks.markForceUpdateScheduled(inst, lane);
  }
};
function checkShouldComponentUpdate(
  workInProgress,
  ctor,
  oldProps,
  newProps,
  oldState,
  newState,
  nextContext
) {
  workInProgress = workInProgress.stateNode;
  return "function" === typeof workInProgress.shouldComponentUpdate
    ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext)
    : ctor.prototype && ctor.prototype.isPureReactComponent
      ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
      : !0;
}
function constructClassInstance(workInProgress, ctor, props) {
  var isLegacyContextConsumer = !1,
    unmaskedContext = emptyContextObject;
  var context = ctor.contextType;
  "object" === typeof context && null !== context
    ? (context = readContext(context))
    : ((unmaskedContext = isContextProvider(ctor)
        ? previousContext
        : contextStackCursor$1.current),
      (isLegacyContextConsumer = ctor.contextTypes),
      (context = (isLegacyContextConsumer =
        null !== isLegacyContextConsumer && void 0 !== isLegacyContextConsumer)
        ? getMaskedContext(workInProgress, unmaskedContext)
        : emptyContextObject));
  ctor = new ctor(props, context);
  workInProgress.memoizedState =
    null !== ctor.state && void 0 !== ctor.state ? ctor.state : null;
  ctor.updater = classComponentUpdater;
  workInProgress.stateNode = ctor;
  ctor._reactInternals = workInProgress;
  isLegacyContextConsumer &&
    ((workInProgress = workInProgress.stateNode),
    (workInProgress.__reactInternalMemoizedUnmaskedChildContext =
      unmaskedContext),
    (workInProgress.__reactInternalMemoizedMaskedChildContext = context));
  return ctor;
}
function callComponentWillReceiveProps(
  workInProgress,
  instance,
  newProps,
  nextContext
) {
  workInProgress = instance.state;
  "function" === typeof instance.componentWillReceiveProps &&
    instance.componentWillReceiveProps(newProps, nextContext);
  "function" === typeof instance.UNSAFE_componentWillReceiveProps &&
    instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
  instance.state !== workInProgress &&
    classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
}
function mountClassInstance(workInProgress, ctor, newProps, renderLanes) {
  var instance = workInProgress.stateNode;
  instance.props = newProps;
  instance.state = workInProgress.memoizedState;
  instance.refs = {};
  initializeUpdateQueue(workInProgress);
  var contextType = ctor.contextType;
  "object" === typeof contextType && null !== contextType
    ? (instance.context = readContext(contextType))
    : ((contextType = isContextProvider(ctor)
        ? previousContext
        : contextStackCursor$1.current),
      (instance.context = getMaskedContext(workInProgress, contextType)));
  instance.state = workInProgress.memoizedState;
  contextType = ctor.getDerivedStateFromProps;
  "function" === typeof contextType &&
    (applyDerivedStateFromProps(workInProgress, ctor, contextType, newProps),
    (instance.state = workInProgress.memoizedState));
  "function" === typeof ctor.getDerivedStateFromProps ||
    "function" === typeof instance.getSnapshotBeforeUpdate ||
    ("function" !== typeof instance.UNSAFE_componentWillMount &&
      "function" !== typeof instance.componentWillMount) ||
    ((ctor = instance.state),
    "function" === typeof instance.componentWillMount &&
      instance.componentWillMount(),
    "function" === typeof instance.UNSAFE_componentWillMount &&
      instance.UNSAFE_componentWillMount(),
    ctor !== instance.state &&
      classComponentUpdater.enqueueReplaceState(instance, instance.state, null),
    processUpdateQueue(workInProgress, newProps, instance, renderLanes),
    suspendIfUpdateReadFromEntangledAsyncAction(),
    (instance.state = workInProgress.memoizedState));
  "function" === typeof instance.componentDidMount &&
    (workInProgress.flags |= 4194308);
}
function resolveClassComponentProps(Component, baseProps) {
  var newProps = baseProps;
  if ("ref" in baseProps) {
    newProps = {};
    for (var propName in baseProps)
      "ref" !== propName && (newProps[propName] = baseProps[propName]);
  }
  if ((Component = Component.defaultProps)) {
    newProps === baseProps && (newProps = assign({}, newProps));
    for (var propName$61 in Component)
      void 0 === newProps[propName$61] &&
        (newProps[propName$61] = Component[propName$61]);
  }
  return newProps;
}
function defaultOnRecoverableError(error) {
  reportGlobalError(error);
}
function logUncaughtError(root, errorInfo) {
  try {
    var onUncaughtError = root.onUncaughtError;
    onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
  } catch (e) {
    setTimeout(function () {
      throw e;
    });
  }
}
function logCaughtError(root, boundary, errorInfo) {
  try {
    var onCaughtError = root.onCaughtError;
    onCaughtError(errorInfo.value, {
      componentStack: errorInfo.stack,
      errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
    });
  } catch (e) {
    setTimeout(function () {
      throw e;
    });
  }
}
function createRootErrorUpdate(root, errorInfo, lane) {
  lane = createUpdate(lane);
  lane.tag = 3;
  lane.payload = { element: null };
  lane.callback = function () {
    logUncaughtError(root, errorInfo);
  };
  return lane;
}
function createClassErrorUpdate(lane) {
  lane = createUpdate(lane);
  lane.tag = 3;
  return lane;
}
function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
  var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if ("function" === typeof getDerivedStateFromError) {
    var error = errorInfo.value;
    update.payload = function () {
      return getDerivedStateFromError(error);
    };
    update.callback = function () {
      logCaughtError(root, fiber, errorInfo);
    };
  }
  var inst = fiber.stateNode;
  null !== inst &&
    "function" === typeof inst.componentDidCatch &&
    (update.callback = function () {
      logCaughtError(root, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError &&
        (null === legacyErrorBoundariesThatAlreadyFailed
          ? (legacyErrorBoundariesThatAlreadyFailed = new Set([this]))
          : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
}
function throwException(
  root,
  returnFiber,
  sourceFiber,
  value,
  rootRenderLanes
) {
  sourceFiber.flags |= 32768;
  isDevToolsPresent && restorePendingUpdaters(root, rootRenderLanes);
  if (
    null !== value &&
    "object" === typeof value &&
    "function" === typeof value.then
  ) {
    var currentSourceFiber = sourceFiber.alternate;
    null !== currentSourceFiber &&
      propagateParentContextChanges(
        currentSourceFiber,
        sourceFiber,
        rootRenderLanes,
        !0
      );
    currentSourceFiber = sourceFiber.tag;
    0 !== (sourceFiber.mode & 1) ||
      (0 !== currentSourceFiber &&
        11 !== currentSourceFiber &&
        15 !== currentSourceFiber) ||
      ((currentSourceFiber = sourceFiber.alternate)
        ? ((sourceFiber.updateQueue = currentSourceFiber.updateQueue),
          (sourceFiber.memoizedState = currentSourceFiber.memoizedState),
          (sourceFiber.lanes = currentSourceFiber.lanes))
        : ((sourceFiber.updateQueue = null),
          (sourceFiber.memoizedState = null)));
    currentSourceFiber = suspenseHandlerStackCursor.current;
    if (null !== currentSourceFiber) {
      switch (currentSourceFiber.tag) {
        case 31:
        case 13:
        case 19:
          return (
            sourceFiber.mode & 1 &&
              (null === shellBoundary
                ? renderDidSuspendDelayIfPossible()
                : null === currentSourceFiber.alternate &&
                  0 === workInProgressRootExitStatus &&
                  (workInProgressRootExitStatus = 3)),
            (currentSourceFiber.flags &= -257),
            0 === (currentSourceFiber.mode & 1)
              ? currentSourceFiber === returnFiber
                ? (currentSourceFiber.flags |= 65536)
                : ((currentSourceFiber.flags |= 128),
                  (sourceFiber.flags |= 131072),
                  (sourceFiber.flags &= -52805),
                  1 === sourceFiber.tag
                    ? null === sourceFiber.alternate
                      ? (sourceFiber.tag = 17)
                      : ((returnFiber = createUpdate(2)),
                        (returnFiber.tag = 2),
                        enqueueUpdate(sourceFiber, returnFiber, 2))
                    : 0 === sourceFiber.tag &&
                      null === sourceFiber.alternate &&
                      (sourceFiber.tag = 28),
                  (sourceFiber.lanes |= 2))
              : ((currentSourceFiber.flags |= 65536),
                (currentSourceFiber.lanes = rootRenderLanes)),
            value === noopSuspenseyCommitThenable
              ? (currentSourceFiber.flags |= 16384)
              : ((returnFiber = currentSourceFiber.updateQueue),
                null === returnFiber
                  ? (currentSourceFiber.updateQueue = new Set([value]))
                  : returnFiber.add(value),
                currentSourceFiber.mode & 1 &&
                  attachPingListener(root, value, rootRenderLanes)),
            !1
          );
        case 22:
          if (currentSourceFiber.mode & 1)
            return (
              (currentSourceFiber.flags |= 65536),
              value === noopSuspenseyCommitThenable
                ? (currentSourceFiber.flags |= 16384)
                : ((returnFiber = currentSourceFiber.updateQueue),
                  null === returnFiber
                    ? ((returnFiber = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([value])
                      }),
                      (currentSourceFiber.updateQueue = returnFiber))
                    : ((sourceFiber = returnFiber.retryQueue),
                      null === sourceFiber
                        ? (returnFiber.retryQueue = new Set([value]))
                        : sourceFiber.add(value)),
                  attachPingListener(root, value, rootRenderLanes)),
              !1
            );
      }
      throw Error(
        "Unexpected Suspense handler tag (" +
          currentSourceFiber.tag +
          "). This is a bug in React."
      );
    }
    if (1 === root.tag)
      return (
        attachPingListener(root, value, rootRenderLanes),
        renderDidSuspendDelayIfPossible(),
        !1
      );
    value = Error(
      "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."
    );
  }
  currentSourceFiber = createCapturedValueAtFiber(
    Error(
      "There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.",
      { cause: value }
    ),
    sourceFiber
  );
  null === workInProgressRootConcurrentErrors
    ? (workInProgressRootConcurrentErrors = [currentSourceFiber])
    : workInProgressRootConcurrentErrors.push(currentSourceFiber);
  4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
  if (null === returnFiber) return !0;
  value = createCapturedValueAtFiber(value, sourceFiber);
  do {
    switch (returnFiber.tag) {
      case 3:
        return (
          (returnFiber.flags |= 65536),
          (root = rootRenderLanes & -rootRenderLanes),
          (returnFiber.lanes |= root),
          (root = createRootErrorUpdate(returnFiber.stateNode, value, root)),
          enqueueCapturedUpdate(returnFiber, root),
          !1
        );
      case 1:
        sourceFiber = returnFiber.type;
        currentSourceFiber = returnFiber.stateNode;
        if (
          0 === (returnFiber.flags & 128) &&
          ("function" === typeof sourceFiber.getDerivedStateFromError ||
            (null !== currentSourceFiber &&
              "function" === typeof currentSourceFiber.componentDidCatch &&
              (null === legacyErrorBoundariesThatAlreadyFailed ||
                !legacyErrorBoundariesThatAlreadyFailed.has(
                  currentSourceFiber
                ))))
        )
          return (
            (returnFiber.flags |= 65536),
            (rootRenderLanes &= -rootRenderLanes),
            (returnFiber.lanes |= rootRenderLanes),
            (rootRenderLanes = createClassErrorUpdate(rootRenderLanes)),
            initializeClassErrorUpdate(
              rootRenderLanes,
              root,
              returnFiber,
              value
            ),
            enqueueCapturedUpdate(returnFiber, rootRenderLanes),
            !1
          );
        break;
      case 22:
        if (null !== returnFiber.memoizedState)
          return (returnFiber.flags |= 65536), !1;
    }
    returnFiber = returnFiber.return;
  } while (null !== returnFiber);
  return !1;
}
var SelectiveHydrationException = Error(
    "This is not a real error. It's an implementation detail of React's selective hydration feature. If this leaks into userspace, it's a bug in React. Please file an issue."
  ),
  didReceiveUpdate = !1;
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  workInProgress.child =
    null === current
      ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
      : reconcileChildFibers(
          workInProgress,
          current.child,
          nextChildren,
          renderLanes
        );
}
function updateForwardRef(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  Component = Component.render;
  var ref = workInProgress.ref;
  if ("ref" in nextProps) {
    var propsWithoutRef = {};
    for (var key in nextProps)
      "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
  } else propsWithoutRef = nextProps;
  prepareToReadContext(workInProgress);
  markComponentRenderStarted(workInProgress);
  nextProps = renderWithHooks(
    current,
    workInProgress,
    Component,
    propsWithoutRef,
    ref,
    renderLanes
  );
  markComponentRenderStopped();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateMemoComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  if (null === current) {
    var type = Component.type;
    if (
      "function" === typeof type &&
      !shouldConstruct(type) &&
      void 0 === type.defaultProps &&
      null === Component.compare
    )
      return (
        (workInProgress.tag = 15),
        (workInProgress.type = type),
        updateSimpleMemoComponent(
          current,
          workInProgress,
          type,
          nextProps,
          renderLanes
        )
      );
    current = createFiberFromTypeAndProps(
      Component.type,
      null,
      nextProps,
      workInProgress,
      workInProgress.mode,
      renderLanes
    );
    current.ref = workInProgress.ref;
    current.return = workInProgress;
    return (workInProgress.child = current);
  }
  type = current.child;
  if (!checkScheduledUpdateOrContext(current, renderLanes)) {
    var prevProps = type.memoizedProps;
    Component = Component.compare;
    Component = null !== Component ? Component : shallowEqual;
    if (Component(prevProps, nextProps) && current.ref === workInProgress.ref)
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  workInProgress.flags |= 1;
  current = createWorkInProgress(type, nextProps);
  current.ref = workInProgress.ref;
  current.return = workInProgress;
  return (workInProgress.child = current);
}
function updateSimpleMemoComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  if (null !== current) {
    var prevProps = current.memoizedProps;
    if (
      shallowEqual(prevProps, nextProps) &&
      current.ref === workInProgress.ref
    )
      if (
        ((didReceiveUpdate = !1),
        (workInProgress.pendingProps = nextProps = prevProps),
        checkScheduledUpdateOrContext(current, renderLanes))
      )
        0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
      else
        return (
          (workInProgress.lanes = current.lanes),
          bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
        );
  }
  return updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  );
}
function updateOffscreenComponent(
  current,
  workInProgress,
  renderLanes,
  nextProps
) {
  var nextChildren = nextProps.children,
    prevState = null !== current ? current.memoizedState : null;
  null === current &&
    null === workInProgress.stateNode &&
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
  if ("hidden" === nextProps.mode) {
    if (0 !== (workInProgress.flags & 128)) {
      prevState =
        null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
      if (null !== current) {
        nextProps = workInProgress.child = current.child;
        for (nextChildren = 0; null !== nextProps; )
          (nextChildren =
            nextChildren | nextProps.lanes | nextProps.childLanes),
            (nextProps = nextProps.sibling);
        nextProps = nextChildren & ~prevState;
      } else (nextProps = 0), (workInProgress.child = null);
      return deferHiddenOffscreenComponent(
        current,
        workInProgress,
        prevState,
        renderLanes,
        nextProps
      );
    }
    if (0 === (workInProgress.mode & 1))
      (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
        null !== current && pushTransition(workInProgress, null),
        reuseHiddenContextOnStack(),
        pushOffscreenSuspenseHandler(workInProgress);
    else if (0 !== (renderLanes & 536870912))
      (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
        null !== current &&
          pushTransition(
            workInProgress,
            null !== prevState ? prevState.cachePool : null
          ),
        null !== prevState
          ? pushHiddenContext(workInProgress, prevState)
          : reuseHiddenContextOnStack(),
        pushOffscreenSuspenseHandler(workInProgress);
    else
      return (
        (nextProps = workInProgress.lanes = 536870912),
        deferHiddenOffscreenComponent(
          current,
          workInProgress,
          null !== prevState ? prevState.baseLanes | renderLanes : renderLanes,
          renderLanes,
          nextProps
        )
      );
  } else
    null !== prevState
      ? (pushTransition(workInProgress, prevState.cachePool),
        pushHiddenContext(workInProgress, prevState),
        reuseSuspenseHandlerOnStack(),
        (workInProgress.memoizedState = null))
      : (null !== current && pushTransition(workInProgress, null),
        reuseHiddenContextOnStack(),
        reuseSuspenseHandlerOnStack());
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
function bailoutOffscreenComponent(current, workInProgress) {
  (null !== current && 22 === current.tag) ||
    null !== workInProgress.stateNode ||
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
  return workInProgress.sibling;
}
function deferHiddenOffscreenComponent(
  current,
  workInProgress,
  nextBaseLanes,
  renderLanes,
  remainingChildLanes
) {
  var JSCompiler_inline_result = peekCacheFromPool();
  JSCompiler_inline_result =
    null === JSCompiler_inline_result
      ? null
      : { parent: CacheContext._currentValue2, pool: JSCompiler_inline_result };
  workInProgress.memoizedState = {
    baseLanes: nextBaseLanes,
    cachePool: JSCompiler_inline_result
  };
  null !== current && pushTransition(workInProgress, null);
  reuseHiddenContextOnStack();
  pushOffscreenSuspenseHandler(workInProgress);
  null !== current &&
    propagateParentContextChanges(current, workInProgress, renderLanes, !0);
  workInProgress.childLanes = remainingChildLanes;
  return null;
}
function mountActivityChildren(workInProgress, nextProps) {
  nextProps = mountWorkInProgressOffscreenFiber(
    { mode: nextProps.mode, children: nextProps.children },
    workInProgress.mode
  );
  nextProps.ref = workInProgress.ref;
  workInProgress.child = nextProps;
  nextProps.return = workInProgress;
  return nextProps;
}
function retryActivityComponentWithoutHydrating(
  current,
  workInProgress,
  renderLanes
) {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountActivityChildren(workInProgress, workInProgress.pendingProps);
  current.flags |= 2;
  popSuspenseHandler(workInProgress);
  workInProgress.memoizedState = null;
  return current;
}
function markRef(current, workInProgress) {
  var ref = workInProgress.ref;
  if (null === ref)
    null !== current &&
      null !== current.ref &&
      (workInProgress.flags |= 4194816);
  else {
    if ("function" !== typeof ref && "object" !== typeof ref)
      throw Error(
        "Expected ref to be a function, an object returned by React.createRef(), or undefined/null."
      );
    if (null === current || current.ref !== ref)
      workInProgress.flags |= 4194816;
  }
}
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  var context = isContextProvider(Component)
    ? previousContext
    : contextStackCursor$1.current;
  context = getMaskedContext(workInProgress, context);
  prepareToReadContext(workInProgress);
  markComponentRenderStarted(workInProgress);
  Component = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    context,
    renderLanes
  );
  markComponentRenderStopped();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, Component, renderLanes);
  return workInProgress.child;
}
function replayFunctionComponent(
  current,
  workInProgress,
  nextProps,
  Component,
  secondArg,
  renderLanes
) {
  prepareToReadContext(workInProgress);
  markComponentRenderStarted(workInProgress);
  workInProgress.updateQueue = null;
  nextProps = renderWithHooksAgain(
    workInProgress,
    Component,
    nextProps,
    secondArg
  );
  finishRenderingHooks(current);
  markComponentRenderStopped();
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateClassComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes
) {
  if (isContextProvider(Component)) {
    var hasContext = !0;
    pushContextProvider(workInProgress);
  } else hasContext = !1;
  prepareToReadContext(workInProgress);
  if (null === workInProgress.stateNode)
    resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
      constructClassInstance(workInProgress, Component, nextProps),
      mountClassInstance(workInProgress, Component, nextProps, renderLanes),
      (nextProps = !0);
  else if (null === current) {
    var instance = workInProgress.stateNode,
      unresolvedOldProps = workInProgress.memoizedProps,
      oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
    instance.props = oldProps;
    var oldContext = instance.context,
      contextType = Component.contextType;
    "object" === typeof contextType && null !== contextType
      ? (contextType = readContext(contextType))
      : ((contextType = isContextProvider(Component)
          ? previousContext
          : contextStackCursor$1.current),
        (contextType = getMaskedContext(workInProgress, contextType)));
    var getDerivedStateFromProps = Component.getDerivedStateFromProps,
      hasNewLifecycles =
        "function" === typeof getDerivedStateFromProps ||
        "function" === typeof instance.getSnapshotBeforeUpdate;
    unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
    hasNewLifecycles ||
      ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof instance.componentWillReceiveProps) ||
      ((unresolvedOldProps || oldContext !== contextType) &&
        callComponentWillReceiveProps(
          workInProgress,
          instance,
          nextProps,
          contextType
        ));
    hasForceUpdate = !1;
    var oldState = workInProgress.memoizedState;
    instance.state = oldState;
    processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    oldContext = workInProgress.memoizedState;
    unresolvedOldProps ||
    oldState !== oldContext ||
    didPerformWorkStackCursor.current ||
    hasForceUpdate
      ? ("function" === typeof getDerivedStateFromProps &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            getDerivedStateFromProps,
            nextProps
          ),
          (oldContext = workInProgress.memoizedState)),
        (oldProps =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            oldProps,
            nextProps,
            oldState,
            oldContext,
            contextType
          ))
          ? (hasNewLifecycles ||
              ("function" !== typeof instance.UNSAFE_componentWillMount &&
                "function" !== typeof instance.componentWillMount) ||
              ("function" === typeof instance.componentWillMount &&
                instance.componentWillMount(),
              "function" === typeof instance.UNSAFE_componentWillMount &&
                instance.UNSAFE_componentWillMount()),
            "function" === typeof instance.componentDidMount &&
              (workInProgress.flags |= 4194308))
          : ("function" === typeof instance.componentDidMount &&
              (workInProgress.flags |= 4194308),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = oldContext)),
        (instance.props = nextProps),
        (instance.state = oldContext),
        (instance.context = contextType),
        (nextProps = oldProps))
      : ("function" === typeof instance.componentDidMount &&
          (workInProgress.flags |= 4194308),
        (nextProps = !1));
  } else {
    instance = workInProgress.stateNode;
    cloneUpdateQueue(current, workInProgress);
    oldProps = workInProgress.memoizedProps;
    contextType = resolveClassComponentProps(Component, oldProps);
    instance.props = contextType;
    hasNewLifecycles = workInProgress.pendingProps;
    unresolvedOldProps = instance.context;
    oldContext = Component.contextType;
    "object" === typeof oldContext && null !== oldContext
      ? (oldContext = readContext(oldContext))
      : ((oldContext = isContextProvider(Component)
          ? previousContext
          : contextStackCursor$1.current),
        (oldContext = getMaskedContext(workInProgress, oldContext)));
    oldState = Component.getDerivedStateFromProps;
    (getDerivedStateFromProps =
      "function" === typeof oldState ||
      "function" === typeof instance.getSnapshotBeforeUpdate) ||
      ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof instance.componentWillReceiveProps) ||
      ((oldProps !== hasNewLifecycles || unresolvedOldProps !== oldContext) &&
        callComponentWillReceiveProps(
          workInProgress,
          instance,
          nextProps,
          oldContext
        ));
    hasForceUpdate = !1;
    unresolvedOldProps = workInProgress.memoizedState;
    instance.state = unresolvedOldProps;
    processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    var newState = workInProgress.memoizedState;
    oldProps !== hasNewLifecycles ||
    unresolvedOldProps !== newState ||
    didPerformWorkStackCursor.current ||
    hasForceUpdate ||
    (null !== current &&
      null !== current.dependencies &&
      checkIfContextChanged(current.dependencies))
      ? ("function" === typeof oldState &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            oldState,
            nextProps
          ),
          (newState = workInProgress.memoizedState)),
        (contextType =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            contextType,
            nextProps,
            unresolvedOldProps,
            newState,
            oldContext
          ) ||
          (null !== current &&
            null !== current.dependencies &&
            checkIfContextChanged(current.dependencies)))
          ? (getDerivedStateFromProps ||
              ("function" !== typeof instance.UNSAFE_componentWillUpdate &&
                "function" !== typeof instance.componentWillUpdate) ||
              ("function" === typeof instance.componentWillUpdate &&
                instance.componentWillUpdate(nextProps, newState, oldContext),
              "function" === typeof instance.UNSAFE_componentWillUpdate &&
                instance.UNSAFE_componentWillUpdate(
                  nextProps,
                  newState,
                  oldContext
                )),
            "function" === typeof instance.componentDidUpdate &&
              (workInProgress.flags |= 4),
            "function" === typeof instance.getSnapshotBeforeUpdate &&
              (workInProgress.flags |= 1024))
          : ("function" !== typeof instance.componentDidUpdate ||
              (oldProps === current.memoizedProps &&
                unresolvedOldProps === current.memoizedState) ||
              (workInProgress.flags |= 4),
            "function" !== typeof instance.getSnapshotBeforeUpdate ||
              (oldProps === current.memoizedProps &&
                unresolvedOldProps === current.memoizedState) ||
              (workInProgress.flags |= 1024),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = newState)),
        (instance.props = nextProps),
        (instance.state = newState),
        (instance.context = oldContext),
        (nextProps = contextType))
      : ("function" !== typeof instance.componentDidUpdate ||
          (oldProps === current.memoizedProps &&
            unresolvedOldProps === current.memoizedState) ||
          (workInProgress.flags |= 4),
        "function" !== typeof instance.getSnapshotBeforeUpdate ||
          (oldProps === current.memoizedProps &&
            unresolvedOldProps === current.memoizedState) ||
          (workInProgress.flags |= 1024),
        (nextProps = !1));
  }
  return finishClassComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    hasContext,
    renderLanes
  );
}
function finishClassComponent(
  current,
  workInProgress,
  Component,
  shouldUpdate,
  hasContext,
  renderLanes
) {
  markRef(current, workInProgress);
  var didCaptureError = 0 !== (workInProgress.flags & 128);
  if (!shouldUpdate && !didCaptureError)
    return (
      hasContext && invalidateContextProvider(workInProgress, Component, !1),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  shouldUpdate = workInProgress.stateNode;
  if (
    didCaptureError &&
    "function" !== typeof Component.getDerivedStateFromError
  ) {
    var nextChildren = null;
    profilerStartTime = -1;
  } else
    markComponentRenderStarted(workInProgress),
      (nextChildren = shouldUpdate.render()),
      markComponentRenderStopped();
  workInProgress.flags |= 1;
  null !== current && didCaptureError
    ? ((didCaptureError = nextChildren),
      (workInProgress.child = reconcileChildFibers(
        workInProgress,
        current.child,
        null,
        renderLanes
      )),
      (workInProgress.child = reconcileChildFibers(
        workInProgress,
        null,
        didCaptureError,
        renderLanes
      )))
    : reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  workInProgress.memoizedState = shouldUpdate.state;
  hasContext && invalidateContextProvider(workInProgress, Component, !0);
  return workInProgress.child;
}
function pushHostRootContext(workInProgress) {
  var root = workInProgress.stateNode;
  root.pendingContext
    ? pushTopLevelContextObject(
        workInProgress,
        root.pendingContext,
        root.pendingContext !== root.context
      )
    : root.context &&
      pushTopLevelContextObject(workInProgress, root.context, !1);
  pushHostContainer(workInProgress, root.containerInfo);
}
var SUSPENDED_MARKER = {
  dehydrated: null,
  treeContext: null,
  retryLane: 0,
  hydrationErrors: null
};
function mountSuspenseOffscreenState(renderLanes) {
  return { baseLanes: renderLanes, cachePool: getSuspendedCache() };
}
function getRemainingWorkInPrimaryTree(
  current,
  primaryTreeDidDefer,
  renderLanes
) {
  current = null !== current ? current.childLanes & ~renderLanes : 0;
  primaryTreeDidDefer && (current |= workInProgressDeferredLane);
  return current;
}
function updateSuspenseComponent(current, workInProgress, renderLanes) {
  var nextProps = workInProgress.pendingProps,
    showFallback = !1,
    didSuspend = 0 !== (workInProgress.flags & 128),
    JSCompiler_temp;
  (JSCompiler_temp = didSuspend) ||
    (JSCompiler_temp =
      null !== current && null === current.memoizedState
        ? !1
        : 0 !== (suspenseStackCursor.current & 2));
  JSCompiler_temp && ((showFallback = !0), (workInProgress.flags &= -129));
  JSCompiler_temp = 0 !== (workInProgress.flags & 32);
  workInProgress.flags &= -33;
  if (null === current) {
    var nextPrimaryChildren = nextProps.children;
    didSuspend = nextProps.fallback;
    if (showFallback)
      return (
        reuseSuspenseHandlerOnStack(),
        mountSuspenseFallbackChildren(
          workInProgress,
          nextPrimaryChildren,
          didSuspend,
          renderLanes
        ),
        (nextProps = workInProgress.child),
        (nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes)),
        (nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes
        )),
        (workInProgress.memoizedState = SUSPENDED_MARKER),
        bailoutOffscreenComponent(null, nextProps)
      );
    if (!0 === nextProps.defer)
      return (
        reuseSuspenseHandlerOnStack(),
        mountSuspenseFallbackChildren(
          workInProgress,
          nextPrimaryChildren,
          didSuspend,
          renderLanes
        ),
        (nextProps = workInProgress.child),
        (nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes)),
        (nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes
        )),
        (workInProgress.memoizedState = SUSPENDED_MARKER),
        (workInProgress.lanes = 4194304),
        bailoutOffscreenComponent(null, nextProps)
      );
    pushPrimaryTreeSuspenseHandler(workInProgress);
    return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
  }
  nextPrimaryChildren = current.memoizedState;
  if (null !== nextPrimaryChildren && null !== nextPrimaryChildren.dehydrated) {
    if (didSuspend)
      workInProgress.flags & 256
        ? (pushPrimaryTreeSuspenseHandler(workInProgress),
          (workInProgress.flags &= -257),
          (workInProgress = retrySuspenseComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes
          )))
        : null !== workInProgress.memoizedState
          ? (reuseSuspenseHandlerOnStack(),
            (workInProgress.child = current.child),
            (workInProgress.flags |= 128),
            (workInProgress = null))
          : (reuseSuspenseHandlerOnStack(),
            (showFallback = nextProps.fallback),
            (nextPrimaryChildren = workInProgress.mode),
            (nextProps = mountWorkInProgressOffscreenFiber(
              { mode: "visible", children: nextProps.children },
              nextPrimaryChildren
            )),
            (showFallback = createFiberFromFragment(
              showFallback,
              nextPrimaryChildren,
              renderLanes,
              null
            )),
            (showFallback.flags |= 2),
            (nextProps.return = workInProgress),
            (showFallback.return = workInProgress),
            (nextProps.sibling = showFallback),
            (workInProgress.child = nextProps),
            0 !== (workInProgress.mode & 1) &&
              reconcileChildFibers(
                workInProgress,
                current.child,
                null,
                renderLanes
              ),
            (nextProps = workInProgress.child),
            (nextProps.memoizedState =
              mountSuspenseOffscreenState(renderLanes)),
            (nextProps.childLanes = getRemainingWorkInPrimaryTree(
              current,
              JSCompiler_temp,
              renderLanes
            )),
            (workInProgress.memoizedState = SUSPENDED_MARKER),
            (workInProgress = bailoutOffscreenComponent(null, nextProps)));
    else if ((pushPrimaryTreeSuspenseHandler(workInProgress), shim$1()))
      (JSCompiler_temp = shim$1().digest),
        (nextProps = Error(
          "The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering."
        )),
        (nextProps.stack = ""),
        (nextProps.digest = JSCompiler_temp),
        (JSCompiler_temp = { value: nextProps, source: null, stack: null }),
        null === hydrationErrors
          ? (hydrationErrors = [JSCompiler_temp])
          : hydrationErrors.push(JSCompiler_temp),
        (workInProgress = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress,
          renderLanes
        ));
    else if (
      (didReceiveUpdate ||
        propagateParentContextChanges(current, workInProgress, renderLanes, !1),
      (JSCompiler_temp = 0 !== (renderLanes & current.childLanes)),
      didReceiveUpdate || JSCompiler_temp)
    ) {
      JSCompiler_temp = workInProgressRoot;
      if (
        null !== JSCompiler_temp &&
        ((nextProps = getBumpedLaneForHydration(JSCompiler_temp, renderLanes)),
        0 !== nextProps && nextProps !== nextPrimaryChildren.retryLane)
      )
        throw (
          ((nextPrimaryChildren.retryLane = nextProps),
          enqueueConcurrentRenderForLane(current, nextProps),
          scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps),
          SelectiveHydrationException)
        );
      shim$1() || renderDidSuspendDelayIfPossible();
      workInProgress = retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      );
    } else
      shim$1()
        ? ((workInProgress.flags |= 192),
          (workInProgress.child = current.child),
          (workInProgress = null))
        : ((workInProgress = mountSuspensePrimaryChildren(
            workInProgress,
            nextProps.children
          )),
          (workInProgress.flags |= 134221824));
    return workInProgress;
  }
  if (showFallback) {
    reuseSuspenseHandlerOnStack();
    showFallback = nextProps.fallback;
    nextPrimaryChildren = workInProgress.mode;
    didSuspend = current.child;
    var currentFallbackChildFragment = didSuspend.sibling,
      primaryChildProps = { mode: "hidden", children: nextProps.children };
    0 === (nextPrimaryChildren & 1) && workInProgress.child !== didSuspend
      ? ((nextProps = workInProgress.child),
        (nextProps.childLanes = 0),
        (nextProps.pendingProps = primaryChildProps),
        workInProgress.mode & 2 &&
          ((nextProps.actualDuration = -0),
          (nextProps.actualStartTime = -1.1),
          (nextProps.selfBaseDuration = didSuspend.selfBaseDuration),
          (nextProps.treeBaseDuration = didSuspend.treeBaseDuration)),
        (workInProgress.deletions = null))
      : ((nextProps = createWorkInProgress(didSuspend, primaryChildProps)),
        (nextProps.subtreeFlags = didSuspend.subtreeFlags & 1206910976));
    null !== currentFallbackChildFragment
      ? (showFallback = createWorkInProgress(
          currentFallbackChildFragment,
          showFallback
        ))
      : ((showFallback = createFiberFromFragment(
          showFallback,
          nextPrimaryChildren,
          renderLanes,
          null
        )),
        (showFallback.flags |= 2));
    showFallback.return = workInProgress;
    nextProps.return = workInProgress;
    nextProps.sibling = showFallback;
    workInProgress.child = nextProps;
    bailoutOffscreenComponent(null, nextProps);
    nextProps = workInProgress.child;
    showFallback = current.child.memoizedState;
    null === showFallback
      ? (showFallback = mountSuspenseOffscreenState(renderLanes))
      : ((nextPrimaryChildren = showFallback.cachePool),
        null !== nextPrimaryChildren
          ? ((didSuspend = CacheContext._currentValue2),
            (nextPrimaryChildren =
              nextPrimaryChildren.parent !== didSuspend
                ? { parent: didSuspend, pool: didSuspend }
                : nextPrimaryChildren))
          : (nextPrimaryChildren = getSuspendedCache()),
        (showFallback = {
          baseLanes: showFallback.baseLanes | renderLanes,
          cachePool: nextPrimaryChildren
        }));
    nextProps.memoizedState = showFallback;
    nextProps.childLanes = getRemainingWorkInPrimaryTree(
      current,
      JSCompiler_temp,
      renderLanes
    );
    workInProgress.memoizedState = SUSPENDED_MARKER;
    return bailoutOffscreenComponent(current.child, nextProps);
  }
  pushPrimaryTreeSuspenseHandler(workInProgress);
  JSCompiler_temp = current.child;
  current = JSCompiler_temp.sibling;
  JSCompiler_temp = createWorkInProgress(JSCompiler_temp, {
    mode: "visible",
    children: nextProps.children
  });
  0 === (workInProgress.mode & 1) && (JSCompiler_temp.lanes = renderLanes);
  JSCompiler_temp.return = workInProgress;
  JSCompiler_temp.sibling = null;
  null !== current &&
    ((renderLanes = workInProgress.deletions),
    null === renderLanes
      ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
      : renderLanes.push(current));
  workInProgress.child = JSCompiler_temp;
  workInProgress.memoizedState = null;
  return JSCompiler_temp;
}
function mountSuspensePrimaryChildren(workInProgress, primaryChildren) {
  primaryChildren = mountWorkInProgressOffscreenFiber(
    { mode: "visible", children: primaryChildren },
    workInProgress.mode
  );
  primaryChildren.return = workInProgress;
  return (workInProgress.child = primaryChildren);
}
function mountSuspenseFallbackChildren(
  workInProgress,
  primaryChildren,
  fallbackChildren,
  renderLanes
) {
  var mode = workInProgress.mode,
    progressedPrimaryFragment = workInProgress.child;
  primaryChildren = { mode: "hidden", children: primaryChildren };
  0 === (mode & 1) && null !== progressedPrimaryFragment
    ? ((progressedPrimaryFragment.childLanes = 0),
      (progressedPrimaryFragment.pendingProps = primaryChildren),
      workInProgress.mode & 2 &&
        ((progressedPrimaryFragment.actualDuration = -0),
        (progressedPrimaryFragment.actualStartTime = -1.1),
        (progressedPrimaryFragment.selfBaseDuration = -0),
        (progressedPrimaryFragment.treeBaseDuration = -0)))
    : (progressedPrimaryFragment = mountWorkInProgressOffscreenFiber(
        primaryChildren,
        mode
      ));
  fallbackChildren = createFiberFromFragment(
    fallbackChildren,
    mode,
    renderLanes,
    null
  );
  progressedPrimaryFragment.return = workInProgress;
  fallbackChildren.return = workInProgress;
  progressedPrimaryFragment.sibling = fallbackChildren;
  workInProgress.child = progressedPrimaryFragment;
  return fallbackChildren;
}
function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
  offscreenProps = createFiber(22, offscreenProps, null, mode);
  offscreenProps.lanes = 0;
  return offscreenProps;
}
function retrySuspenseComponentWithoutHydrating(
  current,
  workInProgress,
  renderLanes
) {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountSuspensePrimaryChildren(
    workInProgress,
    workInProgress.pendingProps.children
  );
  current.flags |= 2;
  workInProgress.memoizedState = null;
  return current;
}
function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
  fiber.lanes |= renderLanes;
  var alternate = fiber.alternate;
  null !== alternate && (alternate.lanes |= renderLanes);
  scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
}
function findLastContentRow(firstChild) {
  for (var lastContentRow = null; null !== firstChild; ) {
    var currentRow = firstChild.alternate;
    null !== currentRow &&
      null === findFirstSuspended(currentRow) &&
      (lastContentRow = firstChild);
    firstChild = firstChild.sibling;
  }
  return lastContentRow;
}
function initSuspenseListRenderState(
  workInProgress,
  isBackwards,
  tail,
  lastContentRow,
  tailMode,
  treeForkCount
) {
  var renderState = workInProgress.memoizedState;
  null === renderState
    ? (workInProgress.memoizedState = {
        isBackwards: isBackwards,
        rendering: null,
        renderingStartTime: 0,
        last: lastContentRow,
        tail: tail,
        tailMode: tailMode,
        treeForkCount: treeForkCount
      })
    : ((renderState.isBackwards = isBackwards),
      (renderState.rendering = null),
      (renderState.renderingStartTime = 0),
      (renderState.last = lastContentRow),
      (renderState.tail = tail),
      (renderState.tailMode = tailMode),
      (renderState.treeForkCount = treeForkCount));
}
function reverseChildren(fiber) {
  var row = fiber.child;
  for (fiber.child = null; null !== row; ) {
    var nextRow = row.sibling;
    row.sibling = fiber.child;
    fiber.child = row;
    row = nextRow;
  }
}
function updateSuspenseListComponent(current, workInProgress, renderLanes) {
  var nextProps = workInProgress.pendingProps,
    revealOrder = nextProps.revealOrder,
    tailMode = nextProps.tail;
  nextProps = nextProps.children;
  var suspenseContext = suspenseStackCursor.current;
  if (workInProgress.flags & 128)
    return pushSuspenseListContext(workInProgress, suspenseContext), null;
  var shouldForceFallback = 0 !== (suspenseContext & 2);
  shouldForceFallback
    ? ((suspenseContext = (suspenseContext & 1) | 2),
      (workInProgress.flags |= 128))
    : (suspenseContext &= 1);
  pushSuspenseListContext(workInProgress, suspenseContext);
  "backwards" === revealOrder && null !== current
    ? (reverseChildren(current),
      reconcileChildren(current, workInProgress, nextProps, renderLanes),
      reverseChildren(current))
    : reconcileChildren(current, workInProgress, nextProps, renderLanes);
  if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
    a: for (current = workInProgress.child; null !== current; ) {
      if (13 === current.tag)
        null !== current.memoizedState &&
          scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (19 === current.tag)
        scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (null !== current.child) {
        current.child.return = current;
        current = current.child;
        continue;
      }
      if (current === workInProgress) break a;
      for (; null === current.sibling; ) {
        if (null === current.return || current.return === workInProgress)
          break a;
        current = current.return;
      }
      current.sibling.return = current.return;
      current = current.sibling;
    }
  if (0 === (workInProgress.mode & 1)) workInProgress.memoizedState = null;
  else
    switch (revealOrder) {
      case "backwards":
        renderLanes = findLastContentRow(workInProgress.child);
        null === renderLanes
          ? ((revealOrder = workInProgress.child),
            (workInProgress.child = null))
          : ((revealOrder = renderLanes.sibling),
            (renderLanes.sibling = null),
            reverseChildren(workInProgress));
        initSuspenseListRenderState(
          workInProgress,
          !0,
          revealOrder,
          null,
          tailMode,
          0
        );
        break;
      case "unstable_legacy-backwards":
        renderLanes = null;
        revealOrder = workInProgress.child;
        for (workInProgress.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes;
          renderLanes = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress,
          !0,
          renderLanes,
          null,
          tailMode,
          0
        );
        break;
      case "together":
        initSuspenseListRenderState(workInProgress, !1, null, null, void 0, 0);
        break;
      case "independent":
        workInProgress.memoizedState = null;
        break;
      default:
        (renderLanes = findLastContentRow(workInProgress.child)),
          null === renderLanes
            ? ((revealOrder = workInProgress.child),
              (workInProgress.child = null))
            : ((revealOrder = renderLanes.sibling),
              (renderLanes.sibling = null)),
          initSuspenseListRenderState(
            workInProgress,
            !1,
            revealOrder,
            renderLanes,
            tailMode,
            0
          );
    }
  return workInProgress.child;
}
function updateContextProvider(current, workInProgress, renderLanes) {
  var newProps = workInProgress.pendingProps;
  pushProvider(workInProgress, workInProgress.type, newProps.value);
  reconcileChildren(current, workInProgress, newProps.children, renderLanes);
  return workInProgress.child;
}
function resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress) {
  0 === (workInProgress.mode & 1) &&
    null !== current &&
    ((current.alternate = null),
    (workInProgress.alternate = null),
    (workInProgress.flags |= 2));
}
function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
  null !== current && (workInProgress.dependencies = current.dependencies);
  profilerStartTime = -1;
  workInProgressRootSkippedLanes |= workInProgress.lanes;
  if (0 === (renderLanes & workInProgress.childLanes))
    if (null !== current) {
      if (
        (propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        ),
        0 === (renderLanes & workInProgress.childLanes))
      )
        return null;
    } else return null;
  if (null !== current && workInProgress.child !== current.child)
    throw Error("Resuming work not yet implemented.");
  if (null !== workInProgress.child) {
    current = workInProgress.child;
    renderLanes = createWorkInProgress(current, current.pendingProps);
    workInProgress.child = renderLanes;
    for (renderLanes.return = workInProgress; null !== current.sibling; )
      (current = current.sibling),
        (renderLanes = renderLanes.sibling =
          createWorkInProgress(current, current.pendingProps)),
        (renderLanes.return = workInProgress);
    renderLanes.sibling = null;
  }
  return workInProgress.child;
}
function checkScheduledUpdateOrContext(current, renderLanes) {
  if (0 !== (current.lanes & renderLanes)) return !0;
  current = current.dependencies;
  return null !== current && checkIfContextChanged(current) ? !0 : !1;
}
function attemptEarlyBailoutIfNoScheduledUpdate(
  current,
  workInProgress,
  renderLanes
) {
  switch (workInProgress.tag) {
    case 3:
      pushHostRootContext(workInProgress);
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
      break;
    case 27:
    case 5:
      pushHostContext(workInProgress);
      break;
    case 1:
      isContextProvider(workInProgress.type) &&
        pushContextProvider(workInProgress);
      break;
    case 4:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      break;
    case 10:
      pushProvider(
        workInProgress,
        workInProgress.type,
        workInProgress.memoizedProps.value
      );
      break;
    case 12:
      0 !== (renderLanes & workInProgress.childLanes) &&
        (workInProgress.flags |= 4);
      workInProgress.flags |= 2048;
      var stateNode = workInProgress.stateNode;
      stateNode.effectDuration = -0;
      stateNode.passiveEffectDuration = -0;
      break;
    case 31:
      if (null !== workInProgress.memoizedState)
        return (
          (workInProgress.flags |= 128),
          pushDehydratedActivitySuspenseHandler(workInProgress),
          null
        );
      break;
    case 13:
      stateNode = workInProgress.memoizedState;
      if (null !== stateNode) {
        if (null !== stateNode.dehydrated)
          return (
            pushPrimaryTreeSuspenseHandler(workInProgress),
            (workInProgress.flags |= 128),
            null
          );
        stateNode = propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        );
        var primaryChildLanes = workInProgress.child.childLanes;
        if (stateNode || 0 !== (renderLanes & primaryChildLanes))
          return updateSuspenseComponent(current, workInProgress, renderLanes);
        pushPrimaryTreeSuspenseHandler(workInProgress);
        current = bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
        return null !== current ? current.sibling : null;
      }
      pushPrimaryTreeSuspenseHandler(workInProgress);
      break;
    case 19:
      if (workInProgress.flags & 128)
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes
        );
      primaryChildLanes = 0 !== (current.flags & 128);
      stateNode = 0 !== (renderLanes & workInProgress.childLanes);
      stateNode ||
        (propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        ),
        (stateNode = 0 !== (renderLanes & workInProgress.childLanes)));
      if (primaryChildLanes) {
        if (stateNode)
          return updateSuspenseListComponent(
            current,
            workInProgress,
            renderLanes
          );
        workInProgress.flags |= 128;
      }
      primaryChildLanes = workInProgress.memoizedState;
      null !== primaryChildLanes &&
        ((primaryChildLanes.rendering = null),
        (primaryChildLanes.tail = null),
        (primaryChildLanes.lastEffect = null));
      pushSuspenseListContext(workInProgress, suspenseStackCursor.current);
      if (stateNode) break;
      else return null;
    case 22:
      return (
        (workInProgress.lanes = 0),
        updateOffscreenComponent(
          current,
          workInProgress,
          renderLanes,
          workInProgress.pendingProps
        )
      );
    case 24:
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}
function beginWork(current, workInProgress, renderLanes) {
  if (null !== current)
    if (
      current.memoizedProps !== workInProgress.pendingProps ||
      didPerformWorkStackCursor.current
    )
      didReceiveUpdate = !0;
    else {
      if (
        !checkScheduledUpdateOrContext(current, renderLanes) &&
        0 === (workInProgress.flags & 128)
      )
        return (
          (didReceiveUpdate = !1),
          attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress,
            renderLanes
          )
        );
      didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
    }
  else didReceiveUpdate = !1;
  workInProgress.lanes = 0;
  switch (workInProgress.tag) {
    case 16:
      var elementType = workInProgress.elementType;
      a: if (
        (resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (current = workInProgress.pendingProps),
        (elementType = resolveLazy(elementType)),
        (workInProgress.type = elementType),
        "function" === typeof elementType)
      )
        shouldConstruct(elementType)
          ? ((current = resolveClassComponentProps(elementType, current)),
            (workInProgress.tag = 1),
            (workInProgress = updateClassComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            )))
          : ((workInProgress.tag = 0),
            (workInProgress = updateFunctionComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            )));
      else {
        if (void 0 !== elementType && null !== elementType) {
          var $$typeof = elementType.$$typeof;
          if ($$typeof === REACT_FORWARD_REF_TYPE) {
            workInProgress.tag = 11;
            workInProgress = updateForwardRef(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            );
            break a;
          } else if ($$typeof === REACT_MEMO_TYPE) {
            workInProgress.tag = 14;
            workInProgress = updateMemoComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            );
            break a;
          } else if ($$typeof === REACT_CONTEXT_TYPE) {
            workInProgress.tag = 10;
            workInProgress.type = elementType;
            workInProgress = updateContextProvider(
              null,
              workInProgress,
              renderLanes
            );
            break a;
          }
        }
        workInProgress = getComponentNameFromType(elementType) || elementType;
        throw Error(
          "Element type is invalid. Received a promise that resolves to: " +
            workInProgress +
            ". Lazy element type must resolve to a class or function."
        );
      }
      return workInProgress;
    case 0:
      return updateFunctionComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 1:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        updateClassComponent(
          current,
          workInProgress,
          elementType,
          $$typeof,
          renderLanes
        )
      );
    case 3:
      pushHostRootContext(workInProgress);
      if (null === current)
        throw Error("Should have a current fiber. This is a bug in React.");
      var nextProps = workInProgress.pendingProps;
      $$typeof = workInProgress.memoizedState;
      elementType = $$typeof.element;
      cloneUpdateQueue(current, workInProgress);
      processUpdateQueue(workInProgress, nextProps, null, renderLanes);
      nextProps = workInProgress.memoizedState;
      var nextCache = nextProps.cache;
      pushProvider(workInProgress, CacheContext, nextCache);
      nextCache !== $$typeof.cache &&
        propagateContextChanges(
          workInProgress,
          [CacheContext],
          renderLanes,
          !0
        );
      suspendIfUpdateReadFromEntangledAsyncAction();
      $$typeof = nextProps.element;
      $$typeof === elementType
        ? (workInProgress = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes
          ))
        : (reconcileChildren(current, workInProgress, $$typeof, renderLanes),
          (workInProgress = workInProgress.child));
      return workInProgress;
    case 26:
    case 27:
    case 5:
      return (
        pushHostContext(workInProgress),
        (elementType = workInProgress.pendingProps.children),
        null !== workInProgress.memoizedState &&
          (($$typeof = renderWithHooks(
            current,
            workInProgress,
            TransitionAwareHostComponent,
            null,
            null,
            renderLanes
          )),
          (HostTransitionContext._currentValue2 = $$typeof)),
        markRef(current, workInProgress),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 6:
      return null;
    case 13:
      return updateSuspenseComponent(current, workInProgress, renderLanes);
    case 4:
      return (
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        ),
        (elementType = workInProgress.pendingProps),
        null === current
          ? (workInProgress.child = reconcileChildFibers(
              workInProgress,
              null,
              elementType,
              renderLanes
            ))
          : reconcileChildren(
              current,
              workInProgress,
              elementType,
              renderLanes
            ),
        workInProgress.child
      );
    case 11:
      return updateForwardRef(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 7:
      return (
        (elementType = workInProgress.pendingProps),
        enableFragmentRefs && markRef(current, workInProgress),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 8:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 12:
      return (
        (workInProgress.flags |= 4),
        (workInProgress.flags |= 2048),
        (elementType = workInProgress.stateNode),
        (elementType.effectDuration = -0),
        (elementType.passiveEffectDuration = -0),
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 10:
      return updateContextProvider(current, workInProgress, renderLanes);
    case 9:
      return (
        ($$typeof = workInProgress.type._context),
        (elementType = workInProgress.pendingProps.children),
        prepareToReadContext(workInProgress),
        ($$typeof = readContext($$typeof)),
        markComponentRenderStarted(workInProgress),
        (elementType = elementType($$typeof)),
        markComponentRenderStopped(),
        (workInProgress.flags |= 1),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 14:
      return updateMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 15:
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 17:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (workInProgress.tag = 1),
        isContextProvider(elementType)
          ? ((current = !0), pushContextProvider(workInProgress))
          : (current = !1),
        prepareToReadContext(workInProgress),
        constructClassInstance(workInProgress, elementType, $$typeof),
        mountClassInstance(workInProgress, elementType, $$typeof, renderLanes),
        finishClassComponent(
          null,
          workInProgress,
          elementType,
          !0,
          current,
          renderLanes
        )
      );
    case 28:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (workInProgress.tag = 0),
        updateFunctionComponent(
          null,
          workInProgress,
          elementType,
          $$typeof,
          renderLanes
        )
      );
    case 19:
      return updateSuspenseListComponent(current, workInProgress, renderLanes);
    case 31:
      $$typeof = workInProgress.pendingProps;
      nextProps = 0 !== (workInProgress.flags & 128);
      workInProgress.flags &= -129;
      if (null === current)
        workInProgress = mountActivityChildren(workInProgress, $$typeof);
      else if (((elementType = current.memoizedState), null !== elementType))
        b: {
          pushDehydratedActivitySuspenseHandler(workInProgress);
          if (nextProps) {
            if (workInProgress.flags & 256) {
              workInProgress.flags &= -257;
              workInProgress = retryActivityComponentWithoutHydrating(
                current,
                workInProgress,
                renderLanes
              );
              break b;
            }
            if (null !== workInProgress.memoizedState) {
              workInProgress.child = current.child;
              workInProgress.flags |= 128;
              workInProgress = null;
              break b;
            }
            throw Error(
              "Client rendering an Activity suspended it again. This is a bug in React."
            );
          }
          didReceiveUpdate ||
            propagateParentContextChanges(
              current,
              workInProgress,
              renderLanes,
              !1
            );
          nextProps = 0 !== (renderLanes & current.childLanes);
          if (didReceiveUpdate || nextProps) {
            $$typeof = workInProgressRoot;
            if (
              null !== $$typeof &&
              ((nextProps = getBumpedLaneForHydration($$typeof, renderLanes)),
              0 !== nextProps && nextProps !== elementType.retryLane)
            )
              throw (
                ((elementType.retryLane = nextProps),
                enqueueConcurrentRenderForLane(current, nextProps),
                scheduleUpdateOnFiber($$typeof, current, nextProps),
                SelectiveHydrationException)
              );
            renderDidSuspendDelayIfPossible();
            workInProgress = retryActivityComponentWithoutHydrating(
              current,
              workInProgress,
              renderLanes
            );
          } else
            (workInProgress = mountActivityChildren(workInProgress, $$typeof)),
              (workInProgress.flags |= 134221824);
        }
      else
        (renderLanes = createWorkInProgress(current.child, {
          mode: $$typeof.mode,
          children: $$typeof.children
        })),
          (renderLanes.ref = workInProgress.ref),
          (workInProgress.child = renderLanes),
          (renderLanes.return = workInProgress),
          (workInProgress = renderLanes);
      return workInProgress;
    case 22:
      return updateOffscreenComponent(
        current,
        workInProgress,
        renderLanes,
        workInProgress.pendingProps
      );
    case 24:
      return (
        prepareToReadContext(workInProgress),
        (elementType = readContext(CacheContext)),
        null === current
          ? (($$typeof = peekCacheFromPool()),
            null === $$typeof &&
              (($$typeof = workInProgressRoot),
              (nextProps = createCache()),
              ($$typeof.pooledCache = nextProps),
              nextProps.refCount++,
              null !== nextProps && ($$typeof.pooledCacheLanes |= renderLanes),
              ($$typeof = nextProps)),
            (workInProgress.memoizedState = {
              parent: elementType,
              cache: $$typeof
            }),
            initializeUpdateQueue(workInProgress),
            pushProvider(workInProgress, CacheContext, $$typeof))
          : (0 !== (current.lanes & renderLanes) &&
              (cloneUpdateQueue(current, workInProgress),
              processUpdateQueue(workInProgress, null, null, renderLanes),
              suspendIfUpdateReadFromEntangledAsyncAction()),
            ($$typeof = current.memoizedState),
            (nextProps = workInProgress.memoizedState),
            $$typeof.parent !== elementType
              ? (($$typeof = { parent: elementType, cache: elementType }),
                (workInProgress.memoizedState = $$typeof),
                0 === workInProgress.lanes &&
                  (workInProgress.memoizedState =
                    workInProgress.updateQueue.baseState =
                      $$typeof),
                pushProvider(workInProgress, CacheContext, elementType))
              : ((elementType = nextProps.cache),
                pushProvider(workInProgress, CacheContext, elementType),
                elementType !== $$typeof.cache &&
                  propagateContextChanges(
                    workInProgress,
                    [CacheContext],
                    renderLanes,
                    !0
                  ))),
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 30:
      return (
        null === workInProgress.stateNode &&
          (workInProgress.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }),
        (elementType = workInProgress.pendingProps),
        null != elementType.name &&
          "auto" !== elementType.name &&
          (workInProgress.flags |= null === current ? 18882560 : 18874368),
        null !== current && current.memoizedProps.name !== elementType.name
          ? (workInProgress.flags |= 4194816)
          : markRef(current, workInProgress),
        reconcileChildren(
          current,
          workInProgress,
          elementType.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 29:
      throw workInProgress.pendingProps;
  }
  throw Error(
    "Unknown unit of work tag (" +
      workInProgress.tag +
      "). This error is likely caused by a bug in React. Please file an issue."
  );
}
function markCloned(workInProgress) {
  workInProgress.flags |= 8;
}
function doesRequireClone(current, completedWork) {
  if (null !== current && current.child === completedWork.child) return !1;
  if (0 !== (completedWork.flags & 16)) return !0;
  for (current = completedWork.child; null !== current; ) {
    if (0 !== (current.flags & 8218) || 0 !== (current.subtreeFlags & 8218))
      return !0;
    current = current.sibling;
  }
  return !1;
}
function appendAllChildren(
  parent,
  workInProgress,
  needsVisibilityToggle,
  isHidden
) {
  for (var node = workInProgress.child; null !== node; ) {
    if (5 === node.tag) {
      var instance = node.stateNode;
      needsVisibilityToggle &&
        isHidden &&
        (instance = cloneHiddenInstance(instance));
      appendChildNode(parent.node, instance.node);
    } else if (6 === node.tag) {
      instance = node.stateNode;
      if (needsVisibilityToggle && isHidden)
        throw Error("Not yet implemented.");
      appendChildNode(parent.node, instance.node);
    } else if (4 !== node.tag)
      if (22 === node.tag && null !== node.memoizedState)
        (instance = node.child),
          null !== instance && (instance.return = node),
          appendAllChildren(parent, node, !0, !0);
      else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    if (node === workInProgress) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
function appendAllChildrenToContainer(
  containerChildSet,
  workInProgress,
  needsVisibilityToggle,
  isHidden
) {
  for (
    var hasOffscreenComponentChild = !1, node = workInProgress.child;
    null !== node;

  ) {
    if (5 === node.tag) {
      var instance = node.stateNode;
      needsVisibilityToggle &&
        isHidden &&
        (instance = cloneHiddenInstance(instance));
      var childSet = containerChildSet;
      passChildrenWhenCloningPersistedNodes
        ? childSet.push(instance.node)
        : appendChildNodeToSet(childSet, instance.node);
    } else if (6 === node.tag) {
      instance = node.stateNode;
      if (needsVisibilityToggle && isHidden)
        throw Error("Not yet implemented.");
      childSet = containerChildSet;
      passChildrenWhenCloningPersistedNodes
        ? childSet.push(instance.node)
        : appendChildNodeToSet(childSet, instance.node);
    } else if (4 !== node.tag)
      if (22 === node.tag && null !== node.memoizedState)
        (hasOffscreenComponentChild = node.child),
          null !== hasOffscreenComponentChild &&
            (hasOffscreenComponentChild.return = node),
          appendAllChildrenToContainer(containerChildSet, node, !0, !0),
          (hasOffscreenComponentChild = !0);
      else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    if (node === workInProgress) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === workInProgress)
        return hasOffscreenComponentChild;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return hasOffscreenComponentChild;
}
function updateHostContainer(current, workInProgress) {
  if (doesRequireClone(current, workInProgress)) {
    current = workInProgress.stateNode;
    var newChildSet = passChildrenWhenCloningPersistedNodes
      ? []
      : createChildNodeSet();
    appendAllChildrenToContainer(newChildSet, workInProgress, !1, !1);
    current.pendingChildren = newChildSet;
    workInProgress.flags |= 4;
  }
}
function scheduleRetryEffect(workInProgress, retryQueue) {
  null !== retryQueue && (workInProgress.flags |= 4);
  workInProgress.flags & 16384 &&
    ((retryQueue =
      22 !== workInProgress.tag ? claimNextRetryLane() : 536870912),
    (workInProgress.lanes |= retryQueue),
    (workInProgressSuspendedRetryLanes |= retryQueue));
}
function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
  switch (renderState.tailMode) {
    case "visible":
      break;
    case "collapsed":
      for (
        var tailNode = renderState.tail, lastTailNode = null;
        null !== tailNode;

      )
        null !== tailNode.alternate && (lastTailNode = tailNode),
          (tailNode = tailNode.sibling);
      null === lastTailNode
        ? hasRenderedATailFallback || null === renderState.tail
          ? (renderState.tail = null)
          : (renderState.tail.sibling = null)
        : (lastTailNode.sibling = null);
      break;
    default:
      hasRenderedATailFallback = renderState.tail;
      for (tailNode = null; null !== hasRenderedATailFallback; )
        null !== hasRenderedATailFallback.alternate &&
          (tailNode = hasRenderedATailFallback),
          (hasRenderedATailFallback = hasRenderedATailFallback.sibling);
      null === tailNode ? (renderState.tail = null) : (tailNode.sibling = null);
  }
}
function bubbleProperties(completedWork) {
  var didBailout =
      null !== completedWork.alternate &&
      completedWork.alternate.child === completedWork.child,
    newChildLanes = 0,
    subtreeFlags = 0;
  if (didBailout)
    if (0 !== (completedWork.mode & 2)) {
      for (
        var treeBaseDuration$99 = completedWork.selfBaseDuration,
          child$100 = completedWork.child;
        null !== child$100;

      )
        (newChildLanes |= child$100.lanes | child$100.childLanes),
          (subtreeFlags |= child$100.subtreeFlags & 1206910976),
          (subtreeFlags |= child$100.flags & 1206910976),
          (treeBaseDuration$99 += child$100.treeBaseDuration),
          (child$100 = child$100.sibling);
      completedWork.treeBaseDuration = treeBaseDuration$99;
    } else
      for (
        treeBaseDuration$99 = completedWork.child;
        null !== treeBaseDuration$99;

      )
        (newChildLanes |=
          treeBaseDuration$99.lanes | treeBaseDuration$99.childLanes),
          (subtreeFlags |= treeBaseDuration$99.subtreeFlags & 1206910976),
          (subtreeFlags |= treeBaseDuration$99.flags & 1206910976),
          (treeBaseDuration$99.return = completedWork),
          (treeBaseDuration$99 = treeBaseDuration$99.sibling);
  else if (0 !== (completedWork.mode & 2)) {
    treeBaseDuration$99 = completedWork.actualDuration;
    child$100 = completedWork.selfBaseDuration;
    for (var child = completedWork.child; null !== child; )
      (newChildLanes |= child.lanes | child.childLanes),
        (subtreeFlags |= child.subtreeFlags),
        (subtreeFlags |= child.flags),
        (treeBaseDuration$99 += child.actualDuration),
        (child$100 += child.treeBaseDuration),
        (child = child.sibling);
    completedWork.actualDuration = treeBaseDuration$99;
    completedWork.treeBaseDuration = child$100;
  } else
    for (
      treeBaseDuration$99 = completedWork.child;
      null !== treeBaseDuration$99;

    )
      (newChildLanes |=
        treeBaseDuration$99.lanes | treeBaseDuration$99.childLanes),
        (subtreeFlags |= treeBaseDuration$99.subtreeFlags),
        (subtreeFlags |= treeBaseDuration$99.flags),
        (treeBaseDuration$99.return = completedWork),
        (treeBaseDuration$99 = treeBaseDuration$99.sibling);
  completedWork.subtreeFlags |= subtreeFlags;
  completedWork.childLanes = newChildLanes;
  return didBailout;
}
function completeWork(current, workInProgress, renderLanes) {
  var newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case 28:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return bubbleProperties(workInProgress), null;
    case 1:
      return (
        isContextProvider(workInProgress.type) && popContext(),
        bubbleProperties(workInProgress),
        null
      );
    case 3:
      return (
        (newProps = workInProgress.stateNode),
        (renderLanes = null),
        null !== current && (renderLanes = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== renderLanes &&
          (workInProgress.flags |= 2048),
        popProvider(CacheContext),
        popHostContainer(),
        pop(didPerformWorkStackCursor),
        pop(contextStackCursor$1),
        newProps.pendingContext &&
          ((newProps.context = newProps.pendingContext),
          (newProps.pendingContext = null)),
        (null !== current && null !== current.child) ||
          null === current ||
          (current.memoizedState.isDehydrated &&
            0 === (workInProgress.flags & 256)) ||
          ((workInProgress.flags |= 1024),
          upgradeHydrationErrorsToRecoverable()),
        updateHostContainer(current, workInProgress),
        bubbleProperties(workInProgress),
        null
      );
    case 26:
    case 27:
    case 5:
      popHostContext(workInProgress);
      var type = workInProgress.type;
      if (null !== current && null != workInProgress.stateNode) {
        renderLanes = current.stateNode;
        var oldProps = current.memoizedProps;
        if (
          (current = doesRequireClone(current, workInProgress)) ||
          oldProps !== newProps
        ) {
          var newChildSet = null;
          type = !1;
          current &&
            passChildrenWhenCloningPersistedNodes &&
            (markCloned(workInProgress),
            (newChildSet = passChildrenWhenCloningPersistedNodes
              ? []
              : createChildNodeSet()),
            (type = appendAllChildrenToContainer(
              newChildSet,
              workInProgress,
              !1,
              !1
            )));
          b: {
            newChildSet = type ? void 0 : newChildSet;
            oldProps = ReactNativePrivateInterface.diffAttributePayloads(
              oldProps,
              newProps,
              renderLanes.canonical.viewConfig.validAttributes
            );
            renderLanes.canonical.currentProps = newProps;
            newProps = renderLanes.node;
            if (current)
              newProps =
                null != newChildSet
                  ? null !== oldProps
                    ? cloneNodeWithNewChildrenAndProps(
                        newProps,
                        newChildSet,
                        oldProps
                      )
                    : cloneNodeWithNewChildren(newProps, newChildSet)
                  : null !== oldProps
                    ? cloneNodeWithNewChildrenAndProps(newProps, oldProps)
                    : cloneNodeWithNewChildren(newProps);
            else if (null !== oldProps)
              newProps = cloneNodeWithNewProps(newProps, oldProps);
            else {
              newProps = renderLanes;
              break b;
            }
            newProps = { node: newProps, canonical: renderLanes.canonical };
          }
          newProps === renderLanes
            ? (workInProgress.stateNode = renderLanes)
            : (markCloned(workInProgress),
              (workInProgress.stateNode = newProps),
              !current ||
                (passChildrenWhenCloningPersistedNodes && !type) ||
                appendAllChildren(newProps, workInProgress, !1, !1));
        } else workInProgress.stateNode = renderLanes;
      } else {
        if (!newProps) {
          if (null === workInProgress.stateNode)
            throw Error(
              "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
            );
          bubbleProperties(workInProgress);
          workInProgress.subtreeFlags &= -33554433;
          return null;
        }
        current = rootInstanceStackCursor.current;
        renderLanes = allocateTag();
        type = getViewConfigForType(type);
        oldProps = ReactNativePrivateInterface.createAttributePayload(
          newProps,
          type.validAttributes
        );
        current = {
          node: createNode(
            renderLanes,
            type.uiViewClassName,
            current.containerTag,
            oldProps,
            workInProgress
          ),
          canonical: {
            nativeTag: renderLanes,
            viewConfig: type,
            currentProps: newProps,
            internalInstanceHandle: workInProgress,
            publicInstance: null,
            publicRootInstance: current.publicInstance
          }
        };
        markCloned(workInProgress);
        appendAllChildren(current, workInProgress, !1, !1);
        workInProgress.stateNode = current;
      }
      bubbleProperties(workInProgress);
      workInProgress.subtreeFlags &= -33554433;
      workInProgress.flags &= -16777217;
      return null;
    case 6:
      if (current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps
          ? ((current = rootInstanceStackCursor.current),
            (renderLanes = contextStackCursor.current),
            markCloned(workInProgress),
            (workInProgress.stateNode = createTextInstance(
              newProps,
              current,
              renderLanes,
              workInProgress
            )))
          : (workInProgress.stateNode = current.stateNode);
      else {
        if ("string" !== typeof newProps && null === workInProgress.stateNode)
          throw Error(
            "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
          );
        current = rootInstanceStackCursor.current;
        renderLanes = contextStackCursor.current;
        markCloned(workInProgress);
        workInProgress.stateNode = createTextInstance(
          newProps,
          current,
          renderLanes,
          workInProgress
        );
      }
      bubbleProperties(workInProgress);
      return null;
    case 31:
      newProps = workInProgress.memoizedState;
      if (null === current || null !== current.memoizedState) {
        if (null !== newProps) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostActivityInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (newProps = workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          0 !== (workInProgress.mode & 2) &&
            null !== newProps &&
            ((current = workInProgress.child),
            null !== current &&
              (workInProgress.treeBaseDuration -= current.treeBaseDuration));
          current = !1;
        } else
          (newProps = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = newProps),
            (current = !0);
        if (!current) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
        if (0 !== (workInProgress.flags & 128))
          throw Error(
            "Client rendering an Activity suspended it again. This is a bug in React."
          );
      }
      bubbleProperties(workInProgress);
      return null;
    case 13:
      newProps = workInProgress.memoizedState;
      if (
        null === current ||
        (null !== current.memoizedState &&
          null !== current.memoizedState.dehydrated)
      ) {
        type = newProps;
        if (null !== type && null !== type.dehydrated) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostSuspenseInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (type = workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          0 !== (workInProgress.mode & 2) &&
            null !== type &&
            ((type = workInProgress.child),
            null !== type &&
              (workInProgress.treeBaseDuration -= type.treeBaseDuration));
          type = !1;
        } else
          (type = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = type),
            (type = !0);
        if (!type) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
      }
      popSuspenseHandler(workInProgress);
      if (0 !== (workInProgress.flags & 128))
        return (
          (workInProgress.lanes = renderLanes),
          0 !== (workInProgress.mode & 2) &&
            transferActualDuration(workInProgress),
          workInProgress
        );
      newProps = null !== newProps;
      current = null !== current && null !== current.memoizedState;
      newProps &&
        ((renderLanes = workInProgress.child),
        (type = null),
        null !== renderLanes.alternate &&
          null !== renderLanes.alternate.memoizedState &&
          null !== renderLanes.alternate.memoizedState.cachePool &&
          (type = renderLanes.alternate.memoizedState.cachePool.pool),
        (oldProps = null),
        null !== renderLanes.memoizedState &&
          null !== renderLanes.memoizedState.cachePool &&
          (oldProps = renderLanes.memoizedState.cachePool.pool),
        oldProps !== type && (renderLanes.flags |= 2048));
      newProps !== current && newProps && (workInProgress.child.flags |= 8192);
      scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
      null !== workInProgress.updateQueue &&
        null != workInProgress.memoizedProps.suspenseCallback &&
        (workInProgress.flags |= 4);
      bubbleProperties(workInProgress);
      0 !== (workInProgress.mode & 2) &&
        newProps &&
        ((current = workInProgress.child),
        null !== current &&
          (workInProgress.treeBaseDuration -= current.treeBaseDuration));
      return null;
    case 4:
      return (
        popHostContainer(),
        updateHostContainer(current, workInProgress),
        (workInProgress.flags |= 67108864),
        bubbleProperties(workInProgress),
        null
      );
    case 10:
      return (
        popProvider(workInProgress.type), bubbleProperties(workInProgress), null
      );
    case 17:
      return (
        isContextProvider(workInProgress.type) && popContext(),
        bubbleProperties(workInProgress),
        null
      );
    case 19:
      popSuspenseListContext(workInProgress);
      newProps = workInProgress.memoizedState;
      if (null === newProps) return bubbleProperties(workInProgress), null;
      type = 0 !== (workInProgress.flags & 128);
      oldProps = newProps.rendering;
      if (null === oldProps)
        if (type) cutOffTailIfNeeded(newProps, !1);
        else {
          if (
            0 !== workInProgressRootExitStatus ||
            (null !== current && 0 !== (current.flags & 128))
          )
            for (current = workInProgress.child; null !== current; ) {
              oldProps = findFirstSuspended(current);
              if (null !== oldProps) {
                workInProgress.flags |= 128;
                cutOffTailIfNeeded(newProps, !1);
                current = oldProps.updateQueue;
                workInProgress.updateQueue = current;
                scheduleRetryEffect(workInProgress, current);
                workInProgress.subtreeFlags = 0;
                current = renderLanes;
                for (newProps = workInProgress.child; null !== newProps; )
                  resetWorkInProgress(newProps, current),
                    (newProps = newProps.sibling);
                pushSuspenseListContext(
                  workInProgress,
                  (suspenseStackCursor.current & 1) | 2
                );
                return workInProgress.child;
              }
              current = current.sibling;
            }
          null !== newProps.tail &&
            now$1() > workInProgressRootRenderTargetTime &&
            ((workInProgress.flags |= 128),
            (type = !0),
            cutOffTailIfNeeded(newProps, !1),
            (workInProgress.lanes = 4194304));
        }
      else {
        if (!type)
          if (((current = findFirstSuspended(oldProps)), null !== current)) {
            if (
              ((workInProgress.flags |= 128),
              (type = !0),
              (current = current.updateQueue),
              (workInProgress.updateQueue = current),
              scheduleRetryEffect(workInProgress, current),
              cutOffTailIfNeeded(newProps, !0),
              null === newProps.tail &&
                "collapsed" !== newProps.tailMode &&
                "visible" !== newProps.tailMode &&
                !oldProps.alternate)
            )
              return bubbleProperties(workInProgress), null;
          } else
            2 * now$1() - newProps.renderingStartTime >
              workInProgressRootRenderTargetTime &&
              536870912 !== renderLanes &&
              ((workInProgress.flags |= 128),
              (type = !0),
              cutOffTailIfNeeded(newProps, !1),
              (workInProgress.lanes = 4194304));
        newProps.isBackwards
          ? ((oldProps.sibling = workInProgress.child),
            (workInProgress.child = oldProps))
          : ((current = newProps.last),
            null !== current
              ? (current.sibling = oldProps)
              : (workInProgress.child = oldProps),
            (newProps.last = oldProps));
      }
      if (null !== newProps.tail) {
        current = newProps.tail;
        a: {
          for (renderLanes = current; null !== renderLanes; ) {
            if (null !== renderLanes.alternate) {
              renderLanes = !1;
              break a;
            }
            renderLanes = renderLanes.sibling;
          }
          renderLanes = !0;
        }
        newProps.rendering = current;
        newProps.tail = current.sibling;
        newProps.renderingStartTime = now$1();
        current.sibling = null;
        oldProps = suspenseStackCursor.current;
        oldProps = type ? (oldProps & 1) | 2 : oldProps & 1;
        "visible" !== newProps.tailMode &&
        "collapsed" !== newProps.tailMode &&
        renderLanes
          ? ((newProps = oldProps),
            push(suspenseHandlerStackCursor, workInProgress),
            push(suspenseStackCursor, newProps),
            null === shellBoundary && (shellBoundary = workInProgress))
          : pushSuspenseListContext(workInProgress, oldProps);
        return current;
      }
      bubbleProperties(workInProgress);
      return null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        (newProps = null !== workInProgress.memoizedState),
        null !== current
          ? (null !== current.memoizedState) !== newProps &&
            (workInProgress.flags |= 8192)
          : newProps && (workInProgress.flags |= 8192),
        newProps && 0 !== (workInProgress.mode & 1)
          ? 0 !== (renderLanes & 536870912) &&
            0 === (workInProgress.flags & 128) &&
            (bubbleProperties(workInProgress),
            workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192))
          : bubbleProperties(workInProgress),
        (newProps = workInProgress.updateQueue),
        null !== newProps &&
          scheduleRetryEffect(workInProgress, newProps.retryQueue),
        (newProps = null),
        null !== current &&
          null !== current.memoizedState &&
          null !== current.memoizedState.cachePool &&
          (newProps = current.memoizedState.cachePool.pool),
        (renderLanes = null),
        null !== workInProgress.memoizedState &&
          null !== workInProgress.memoizedState.cachePool &&
          (renderLanes = workInProgress.memoizedState.cachePool.pool),
        renderLanes !== newProps && (workInProgress.flags |= 2048),
        null !== current && pop(resumedCache),
        null
      );
    case 24:
      return (
        (newProps = null),
        null !== current && (newProps = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== newProps &&
          (workInProgress.flags |= 2048),
        popProvider(CacheContext),
        bubbleProperties(workInProgress),
        null
      );
    case 25:
      return null;
    case 30:
      return (
        (workInProgress.flags |= 33554432),
        (current = workInProgress.pendingProps),
        (workInProgress.flags =
          void 0 !== current.parentEnter ||
          void 0 !== current.parentExit ||
          null != current.onParentEnter ||
          null != current.onParentExit ||
          null != current.onGestureParentEnter ||
          null != current.onGestureParentExit
            ? workInProgress.flags | 1073741824
            : workInProgress.flags & -1073741825),
        bubbleProperties(workInProgress),
        null
      );
    case 29:
      return null;
  }
  throw Error(
    "Unknown unit of work tag (" +
      workInProgress.tag +
      "). This error is likely caused by a bug in React. Please file an issue."
  );
}
function unwindWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case 1:
      return (
        isContextProvider(workInProgress.type) && popContext(),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128),
            0 !== (workInProgress.mode & 2) &&
              transferActualDuration(workInProgress),
            workInProgress)
          : null
      );
    case 3:
      return (
        popProvider(CacheContext),
        popHostContainer(),
        pop(didPerformWorkStackCursor),
        pop(contextStackCursor$1),
        (current = workInProgress.flags),
        0 !== (current & 65536) && 0 === (current & 128)
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 26:
    case 27:
    case 5:
      return popHostContext(workInProgress), null;
    case 31:
      if (
        null !== workInProgress.memoizedState &&
        (popSuspenseHandler(workInProgress), null === workInProgress.alternate)
      )
        throw Error(
          "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue."
        );
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128),
          0 !== (workInProgress.mode & 2) &&
            transferActualDuration(workInProgress),
          workInProgress)
        : null;
    case 13:
      popSuspenseHandler(workInProgress);
      current = workInProgress.memoizedState;
      if (
        null !== current &&
        null !== current.dehydrated &&
        null === workInProgress.alternate
      )
        throw Error(
          "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue."
        );
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128),
          0 !== (workInProgress.mode & 2) &&
            transferActualDuration(workInProgress),
          workInProgress)
        : null;
    case 19:
      return (
        popSuspenseListContext(workInProgress),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128),
            (current = workInProgress.memoizedState),
            null !== current &&
              ((current.rendering = null), (current.tail = null)),
            (workInProgress.flags |= 4),
            workInProgress)
          : null
      );
    case 4:
      return popHostContainer(), null;
    case 10:
      return popProvider(workInProgress.type), null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        null !== current && pop(resumedCache),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128),
            0 !== (workInProgress.mode & 2) &&
              transferActualDuration(workInProgress),
            workInProgress)
          : null
      );
    case 24:
      return popProvider(CacheContext), null;
    case 25:
      return null;
    default:
      return null;
  }
}
function unwindInterruptedWork(current, interruptedWork) {
  switch (interruptedWork.tag) {
    case 1:
      current = interruptedWork.type.childContextTypes;
      null !== current && void 0 !== current && popContext();
      break;
    case 3:
      popProvider(CacheContext);
      popHostContainer();
      pop(didPerformWorkStackCursor);
      pop(contextStackCursor$1);
      break;
    case 26:
    case 27:
    case 5:
      popHostContext(interruptedWork);
      break;
    case 4:
      popHostContainer();
      break;
    case 31:
      null !== interruptedWork.memoizedState &&
        popSuspenseHandler(interruptedWork);
      break;
    case 13:
      popSuspenseHandler(interruptedWork);
      break;
    case 19:
      popSuspenseListContext(interruptedWork);
      break;
    case 10:
      popProvider(interruptedWork.type);
      break;
    case 22:
    case 23:
      popSuspenseHandler(interruptedWork);
      popHiddenContext();
      null !== current && pop(resumedCache);
      break;
    case 24:
      popProvider(CacheContext);
  }
}
function shouldProfile(current) {
  return 0 !== (current.mode & 2);
}
function commitHookLayoutEffects(finishedWork, hookFlags) {
  shouldProfile(finishedWork)
    ? (startEffectTimer(),
      commitHookEffectListMount(hookFlags, finishedWork),
      recordEffectDuration())
    : commitHookEffectListMount(hookFlags, finishedWork);
}
function commitHookLayoutUnmountEffects(
  finishedWork,
  nearestMountedAncestor,
  hookFlags
) {
  shouldProfile(finishedWork)
    ? (startEffectTimer(),
      commitHookEffectListUnmount(
        hookFlags,
        finishedWork,
        nearestMountedAncestor
      ),
      recordEffectDuration())
    : commitHookEffectListUnmount(
        hookFlags,
        finishedWork,
        nearestMountedAncestor
      );
}
function commitHookEffectListMount(flags, finishedWork) {
  try {
    var updateQueue = finishedWork.updateQueue,
      lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue.tag & flags) === flags) {
          0 !== (flags & 8)
            ? null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentPassiveEffectMountStarted &&
              injectedProfilingHooks.markComponentPassiveEffectMountStarted(
                finishedWork
              )
            : 0 !== (flags & 4) &&
              null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentLayoutEffectMountStarted &&
              injectedProfilingHooks.markComponentLayoutEffectMountStarted(
                finishedWork
              );
          lastEffect = void 0;
          var create = updateQueue.create,
            inst = updateQueue.inst;
          lastEffect = create();
          inst.destroy = lastEffect;
          0 !== (flags & 8)
            ? null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentPassiveEffectMountStopped &&
              injectedProfilingHooks.markComponentPassiveEffectMountStopped()
            : 0 !== (flags & 4) &&
              null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentLayoutEffectMountStopped &&
              injectedProfilingHooks.markComponentLayoutEffectMountStopped();
        }
        updateQueue = updateQueue.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitHookEffectListUnmount(
  flags,
  finishedWork,
  nearestMountedAncestor$jscomp$0
) {
  try {
    var updateQueue = finishedWork.updateQueue,
      lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue.tag & flags) === flags) {
          var inst = updateQueue.inst,
            destroy = inst.destroy;
          if (void 0 !== destroy) {
            inst.destroy = void 0;
            0 !== (flags & 8)
              ? null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStarted &&
                injectedProfilingHooks.markComponentPassiveEffectUnmountStarted(
                  finishedWork
                )
              : 0 !== (flags & 4) &&
                null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStarted &&
                injectedProfilingHooks.markComponentLayoutEffectUnmountStarted(
                  finishedWork
                );
            lastEffect = finishedWork;
            var nearestMountedAncestor = nearestMountedAncestor$jscomp$0,
              destroy_ = destroy;
            try {
              destroy_();
            } catch (error) {
              captureCommitPhaseError(
                lastEffect,
                nearestMountedAncestor,
                error
              );
            }
            0 !== (flags & 8)
              ? null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStopped &&
                injectedProfilingHooks.markComponentPassiveEffectUnmountStopped()
              : 0 !== (flags & 4) &&
                null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStopped &&
                injectedProfilingHooks.markComponentLayoutEffectUnmountStopped();
          }
        }
        updateQueue = updateQueue.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  shouldProfile(finishedWork)
    ? (startEffectTimer(),
      commitHookEffectListMount(hookFlags, finishedWork),
      recordEffectDuration())
    : commitHookEffectListMount(hookFlags, finishedWork);
}
function commitHookPassiveUnmountEffects(
  finishedWork,
  nearestMountedAncestor,
  hookFlags
) {
  shouldProfile(finishedWork)
    ? (startEffectTimer(),
      commitHookEffectListUnmount(
        hookFlags,
        finishedWork,
        nearestMountedAncestor
      ),
      recordEffectDuration())
    : commitHookEffectListUnmount(
        hookFlags,
        finishedWork,
        nearestMountedAncestor
      );
}
function commitClassCallbacks(finishedWork) {
  var updateQueue = finishedWork.updateQueue;
  if (null !== updateQueue) {
    var instance = finishedWork.stateNode;
    try {
      commitCallbacks(updateQueue, instance);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
function safelyCallComponentWillUnmount(
  current,
  nearestMountedAncestor,
  instance
) {
  instance.props = resolveClassComponentProps(
    current.type,
    current.memoizedProps
  );
  instance.state = current.memoizedState;
  if (shouldProfile(current)) {
    startEffectTimer();
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
    recordEffectDuration();
  } else
    try {
      instance.componentWillUnmount();
    } catch (error$135) {
      captureCommitPhaseError(current, nearestMountedAncestor, error$135);
    }
}
function safelyAttachRef(current, nearestMountedAncestor) {
  try {
    var ref = current.ref;
    if (null !== ref) {
      switch (current.tag) {
        case 26:
        case 27:
        case 5:
          var instanceToUse = getPublicInstance(current.stateNode);
          break;
        case 30:
          var instance = current.stateNode,
            name = getViewTransitionName(current.memoizedProps, instance);
          if (null === instance.ref || instance.ref.name !== name)
            instance.ref = createViewTransitionInstance(name);
          instanceToUse = instance.ref;
          break;
        case 7:
          if (enableFragmentRefs) {
            if (null === current.stateNode) {
              var fragmentInstance = new FragmentInstance(current);
              enableFragmentRefsInstanceHandles &&
                traverseVisibleHostChildren(
                  current.child,
                  !1,
                  addFragmentHandleToFiber,
                  fragmentInstance,
                  void 0,
                  void 0
                );
              current.stateNode = fragmentInstance;
            }
            instanceToUse = current.stateNode;
            break;
          }
        default:
          instanceToUse = current.stateNode;
      }
      if ("function" === typeof ref)
        if (shouldProfile(current))
          try {
            startEffectTimer(), (current.refCleanup = ref(instanceToUse));
          } finally {
            recordEffectDuration();
          }
        else current.refCleanup = ref(instanceToUse);
      else ref.current = instanceToUse;
    }
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
function safelyDetachRef(current, nearestMountedAncestor) {
  var ref = current.ref,
    refCleanup = current.refCleanup;
  if (null !== ref)
    if ("function" === typeof refCleanup)
      try {
        if (shouldProfile(current))
          try {
            startEffectTimer(), refCleanup();
          } finally {
            recordEffectDuration(current);
          }
        else refCleanup();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      } finally {
        (current.refCleanup = null),
          (current = current.alternate),
          null != current && (current.refCleanup = null);
      }
    else if ("function" === typeof ref)
      try {
        if (shouldProfile(current))
          try {
            startEffectTimer(), ref(null);
          } finally {
            recordEffectDuration(current);
          }
        else ref(null);
      } catch (error$137) {
        captureCommitPhaseError(current, nearestMountedAncestor, error$137);
      }
    else ref.current = null;
}
function commitProfilerUpdate(
  finishedWork,
  current,
  commitStartTime,
  effectDuration
) {
  try {
    var _finishedWork$memoize = finishedWork.memoizedProps,
      id = _finishedWork$memoize.id,
      onCommit = _finishedWork$memoize.onCommit,
      onRender = _finishedWork$memoize.onRender;
    current = null === current ? "mount" : "update";
    currentUpdateIsNested && (current = "nested-update");
    "function" === typeof onRender &&
      onRender(
        id,
        current,
        finishedWork.actualDuration,
        finishedWork.treeBaseDuration,
        finishedWork.actualStartTime,
        commitStartTime
      );
    "function" === typeof onCommit &&
      onCommit(id, current, effectDuration, commitStartTime);
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
var rootMutationContext = !1,
  viewTransitionMutationContext = !1;
function pushMutationContext() {
  var prev = viewTransitionMutationContext;
  viewTransitionMutationContext = !1;
  return prev;
}
function commitHostMount(finishedWork) {
  try {
    throw Error(
      "The current renderer does not support mutation. This error is likely caused by a bug in React. Please file an issue."
    );
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitFragmentInstanceDeletionEffects(fiber) {
  for (var parent = fiber.return; null !== parent; ) {
    if (isFragmentInstanceParent(parent)) {
      var fragmentInstance = parent.stateNode;
      var childInstance = fiber.stateNode;
      (enableFragmentRefsTextNodes && null == childInstance.canonical) ||
        ((childInstance = getPublicInstance(childInstance)),
        enableFragmentRefsInstanceHandles &&
          null != childInstance.reactFragments &&
          childInstance.reactFragments.delete(fragmentInstance));
    }
    if (isHostParent(parent)) break;
    parent = parent.return;
  }
}
function isHostParent(fiber) {
  return 5 === fiber.tag || 3 === fiber.tag || 4 === fiber.tag;
}
function isFragmentInstanceParent(fiber) {
  return fiber && 7 === fiber.tag && null !== fiber.stateNode;
}
function commitImmutablePlacementNodeToFragmentInstances(
  finishedWork,
  parentFragmentInstances
) {
  if (enableFragmentRefs)
    if (5 === finishedWork.tag) {
      if (
        (5 === finishedWork.tag ||
          (enableFragmentRefsTextNodes && 6 === finishedWork.tag)) &&
        null === finishedWork.alternate &&
        null !== parentFragmentInstances
      )
        for (var i = 0; i < parentFragmentInstances.length; i++)
          commitNewChildToFragmentInstance(
            finishedWork.stateNode,
            parentFragmentInstances[i]
          );
    } else if (
      4 !== finishedWork.tag &&
      ((finishedWork = finishedWork.child), null !== finishedWork)
    )
      for (
        commitImmutablePlacementNodeToFragmentInstances(
          finishedWork,
          parentFragmentInstances
        ),
          finishedWork = finishedWork.sibling;
        null !== finishedWork;

      )
        commitImmutablePlacementNodeToFragmentInstances(
          finishedWork,
          parentFragmentInstances
        ),
          (finishedWork = finishedWork.sibling);
}
function commitHostPortalContainerChildren(
  portal,
  finishedWork,
  pendingChildren
) {
  portal = portal.containerInfo;
  try {
    completeRoot(portal.containerTag, pendingChildren);
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
var shouldStartViewTransition = !1,
  appearingViewTransitions = null;
function trackEnterViewTransitions(placement) {
  if (30 === placement.tag || 0 !== (placement.subtreeFlags & 33554432))
    shouldStartViewTransition = !0;
}
var viewTransitionCancelableChildren = null;
function pushViewTransitionCancelableScope() {
  var prevChildren = viewTransitionCancelableChildren;
  viewTransitionCancelableChildren = null;
  return prevChildren;
}
var viewTransitionHostInstanceIdx = 0;
function applyViewTransitionToHostInstances(
  fiber,
  name,
  className,
  collectMeasurements,
  stopAtNestedViewTransitions
) {
  viewTransitionHostInstanceIdx = 0;
  return applyViewTransitionToHostInstancesRecursive(
    fiber.child,
    name,
    className,
    collectMeasurements,
    stopAtNestedViewTransitions
  );
}
function applyViewTransitionToHostInstancesRecursive(
  child,
  name,
  className,
  collectMeasurements,
  stopAtNestedViewTransitions
) {
  if (enableViewTransitionForPersistenceMode) {
    for (; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        shouldStartViewTransition = !0;
        fabricApplyViewTransitionName(
          instance.node,
          0 === viewTransitionHostInstanceIdx
            ? name
            : name + "_" + viewTransitionHostInstanceIdx,
          className
        );
        viewTransitionHostInstanceIdx++;
      } else if (22 !== child.tag || null === child.memoizedState)
        (30 === child.tag && stopAtNestedViewTransitions) ||
          applyViewTransitionToHostInstancesRecursive(
            child.child,
            name,
            className,
            collectMeasurements,
            stopAtNestedViewTransitions
          );
      child = child.sibling;
    }
    return !0;
  }
  return !1;
}
function commitAppearingPairViewTransitions(placement) {
  if (0 !== (placement.subtreeFlags & 18874368))
    for (placement = placement.child; null !== placement; ) {
      if (22 !== placement.tag || null === placement.memoizedState)
        if (
          (commitAppearingPairViewTransitions(placement),
          30 === placement.tag &&
            0 !== (placement.flags & 18874368) &&
            placement.stateNode.paired)
        ) {
          var props = placement.memoizedProps;
          if (null == props.name || "auto" === props.name)
            throw Error(
              "Found a pair with an auto name. This is a bug in React."
            );
          var name = props.name;
          props = getViewTransitionClassName(props.default, props.share);
          "none" !== props &&
            applyViewTransitionToHostInstances(
              placement,
              name,
              props,
              null,
              !1
            );
        }
      placement = placement.sibling;
    }
}
function commitParentEnterViewTransitions(parent, gesture) {
  for (parent = parent.child; null !== parent; ) {
    if (22 !== parent.tag || null === parent.memoizedState)
      if (30 === parent.tag) {
        var props = parent.memoizedProps,
          hasParentClass = void 0 !== props.parentEnter,
          hasParentHandler = gesture
            ? null != props.onGestureParentEnter
            : null != props.onParentEnter;
        if (hasParentClass || hasParentHandler) {
          var relay = !0;
          if (hasParentClass) {
            hasParentClass = getViewTransitionName(props, parent.stateNode);
            var className = getViewTransitionClassName(
              props.default,
              props.parentEnter
            );
            "none" === className
              ? (relay = !1)
              : (applyViewTransitionToHostInstances(
                  parent,
                  hasParentClass,
                  className,
                  null,
                  !1
                ),
                hasParentHandler &&
                  !gesture &&
                  scheduleViewTransitionEvent(parent, props.onParentEnter));
          } else
            gesture || scheduleViewTransitionEvent(parent, props.onParentEnter);
          relay && commitParentEnterViewTransitions(parent, gesture);
        }
      } else
        0 !== (parent.subtreeFlags & 1073741824) &&
          commitParentEnterViewTransitions(parent, gesture);
    parent = parent.sibling;
  }
}
function commitParentExitViewTransitions(parent, gesture) {
  for (parent = parent.child; null !== parent; ) {
    if (22 !== parent.tag || null === parent.memoizedState)
      if (30 === parent.tag) {
        var props = parent.memoizedProps,
          hasParentClass = void 0 !== props.parentExit,
          hasParentHandler = gesture
            ? null != props.onGestureParentExit
            : null != props.onParentExit;
        if (hasParentClass || hasParentHandler) {
          var relay = !0;
          if (hasParentClass) {
            hasParentClass = getViewTransitionName(props, parent.stateNode);
            var className = getViewTransitionClassName(
              props.default,
              props.parentExit
            );
            "none" === className
              ? (relay = !1)
              : (applyViewTransitionToHostInstances(
                  parent,
                  hasParentClass,
                  className,
                  null,
                  !1
                ),
                hasParentHandler &&
                  !gesture &&
                  scheduleViewTransitionEvent(parent, props.onParentExit));
          } else
            gesture || scheduleViewTransitionEvent(parent, props.onParentExit);
          relay && commitParentExitViewTransitions(parent, gesture);
        }
      } else
        0 !== (parent.subtreeFlags & 1073741824) &&
          commitParentExitViewTransitions(parent, gesture);
    parent = parent.sibling;
  }
}
function commitEnterViewTransitions(placement, gesture) {
  if (30 === placement.tag) {
    var state = placement.stateNode,
      props = placement.memoizedProps,
      name = getViewTransitionName(props, state),
      className = getViewTransitionClassName(
        props.default,
        state.paired ? props.share : props.enter
      );
    "none" !== className
      ? applyViewTransitionToHostInstances(
          placement,
          name,
          className,
          null,
          !1
        ) &&
        (commitAppearingPairViewTransitions(placement),
        state.paired ||
          (gesture || scheduleViewTransitionEvent(placement, props.onEnter),
          commitParentEnterViewTransitions(placement, gesture)))
      : commitAppearingPairViewTransitions(placement);
  } else if (0 !== (placement.subtreeFlags & 33554432))
    for (placement = placement.child; null !== placement; )
      commitEnterViewTransitions(placement, gesture),
        (placement = placement.sibling);
  else commitAppearingPairViewTransitions(placement);
}
function commitDeletedPairViewTransitions(deletion) {
  if (
    null !== appearingViewTransitions &&
    0 !== appearingViewTransitions.size
  ) {
    var pairs = appearingViewTransitions;
    if (0 !== (deletion.subtreeFlags & 18874368))
      for (deletion = deletion.child; null !== deletion; ) {
        if (22 !== deletion.tag || null === deletion.memoizedState) {
          if (30 === deletion.tag && 0 !== (deletion.flags & 18874368)) {
            var props = deletion.memoizedProps,
              name = props.name;
            if (null != name && "auto" !== name) {
              var pair = pairs.get(name);
              if (void 0 !== pair) {
                var className = getViewTransitionClassName(
                  props.default,
                  props.share
                );
                "none" !== className &&
                  applyViewTransitionToHostInstances(
                    deletion,
                    name,
                    className,
                    null,
                    !1
                  ) &&
                  ((className = deletion.stateNode),
                  (pair.paired = className),
                  (className.paired = pair),
                  scheduleViewTransitionEvent(deletion, props.onShare));
                pairs.delete(name);
                if (0 === pairs.size) break;
              }
            }
          }
          commitDeletedPairViewTransitions(deletion);
        }
        deletion = deletion.sibling;
      }
  }
}
function commitExitViewTransitions(deletion) {
  if (30 === deletion.tag) {
    var props = deletion.memoizedProps,
      name = getViewTransitionName(props, deletion.stateNode),
      pair =
        null !== appearingViewTransitions
          ? appearingViewTransitions.get(name)
          : void 0,
      className = getViewTransitionClassName(
        props.default,
        void 0 !== pair ? props.share : props.exit
      );
    "none" !== className &&
      applyViewTransitionToHostInstances(deletion, name, className, null, !1) &&
      (void 0 !== pair
        ? ((className = deletion.stateNode),
          (pair.paired = className),
          (className.paired = pair),
          appearingViewTransitions.delete(name),
          scheduleViewTransitionEvent(deletion, props.onShare))
        : (scheduleViewTransitionEvent(deletion, props.onExit),
          commitParentExitViewTransitions(deletion, !1)));
    null !== appearingViewTransitions &&
      commitDeletedPairViewTransitions(deletion);
  } else if (0 !== (deletion.subtreeFlags & 33554432))
    for (deletion = deletion.child; null !== deletion; )
      commitExitViewTransitions(deletion), (deletion = deletion.sibling);
  else
    null !== appearingViewTransitions &&
      commitDeletedPairViewTransitions(deletion);
}
function commitNestedViewTransitions(changedParent) {
  for (changedParent = changedParent.child; null !== changedParent; ) {
    if (30 === changedParent.tag) {
      var props = changedParent.memoizedProps,
        name = getViewTransitionName(props, changedParent.stateNode);
      props = getViewTransitionClassName(props.default, props.update);
      changedParent.flags &= -5;
      "none" !== props &&
        applyViewTransitionToHostInstances(
          changedParent,
          name,
          props,
          (changedParent.memoizedState = []),
          !1
        );
    } else
      0 !== (changedParent.subtreeFlags & 33554432) &&
        commitNestedViewTransitions(changedParent);
    changedParent = changedParent.sibling;
  }
}
function restorePairedViewTransitions(parent) {
  if (0 !== (parent.subtreeFlags & 18874368))
    for (parent = parent.child; null !== parent; ) {
      if (22 !== parent.tag || null === parent.memoizedState) {
        if (30 === parent.tag && 0 !== (parent.flags & 18874368)) {
          var instance = parent.stateNode;
          null !== instance.paired && (instance.paired = null);
        }
        restorePairedViewTransitions(parent);
      }
      parent = parent.sibling;
    }
}
function restoreEnterOrExitViewTransitions(fiber) {
  if (30 === fiber.tag)
    (fiber.stateNode.paired = null), restorePairedViewTransitions(fiber);
  else if (0 !== (fiber.subtreeFlags & 33554432))
    for (fiber = fiber.child; null !== fiber; )
      restoreEnterOrExitViewTransitions(fiber), (fiber = fiber.sibling);
  else restorePairedViewTransitions(fiber);
}
function measureViewTransitionHostInstancesRecursive(
  parentViewTransition,
  child,
  newName,
  oldName,
  className,
  previousMeasurements,
  stopAtNestedViewTransitions
) {
  if (enableViewTransitionForPersistenceMode) {
    for (; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        if (
          null == previousMeasurements ||
          viewTransitionHostInstanceIdx >= previousMeasurements.length
        )
          parentViewTransition.flags |= 32;
        0 !== (parentViewTransition.flags & 4) &&
          fabricApplyViewTransitionName(
            instance.node,
            0 === viewTransitionHostInstanceIdx
              ? newName
              : newName + "_" + viewTransitionHostInstanceIdx,
            className
          );
        viewTransitionHostInstanceIdx++;
      } else if (22 !== child.tag || null === child.memoizedState)
        30 === child.tag && stopAtNestedViewTransitions
          ? (parentViewTransition.flags |= child.flags & 32)
          : measureViewTransitionHostInstancesRecursive(
              parentViewTransition,
              child.child,
              newName,
              oldName,
              className,
              previousMeasurements,
              stopAtNestedViewTransitions
            );
      child = child.sibling;
    }
    return !0;
  }
  return !1;
}
function measureNestedViewTransitions(changedParent, gesture) {
  for (changedParent = changedParent.child; null !== changedParent; ) {
    if (30 === changedParent.tag) {
      var props = changedParent.memoizedProps,
        state = changedParent.stateNode,
        name = getViewTransitionName(props, state),
        className = getViewTransitionClassName(props.default, props.update);
      if (gesture) {
        state = state.clones;
        var previousMeasurements =
          null === state ? null : state.map(measureClonedInstance);
      } else
        (previousMeasurements = changedParent.memoizedState),
          (changedParent.memoizedState = null);
      state = changedParent;
      var child = changedParent.child;
      viewTransitionHostInstanceIdx = 0;
      name = measureViewTransitionHostInstancesRecursive(
        state,
        child,
        name,
        name,
        className,
        previousMeasurements,
        !1
      );
      0 !== (changedParent.flags & 4) &&
        name &&
        (gesture || scheduleViewTransitionEvent(changedParent, props.onUpdate));
    } else
      0 !== (changedParent.subtreeFlags & 33554432) &&
        measureNestedViewTransitions(changedParent, gesture);
    changedParent = changedParent.sibling;
  }
}
var offscreenSubtreeIsHidden = !1,
  offscreenSubtreeWasHidden = !1,
  PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
  nextEffect = null,
  inProgressLanes = null,
  inProgressRoot = null,
  viewTransitionContextChanged = !1;
function isHydratingParent(current, finishedWork) {
  return 31 === finishedWork.tag
    ? ((finishedWork = finishedWork.memoizedState),
      null !== current.memoizedState && null === finishedWork)
    : 13 === finishedWork.tag
      ? ((current = current.memoizedState),
        (finishedWork = finishedWork.memoizedState),
        null !== current &&
          null !== current.dehydrated &&
          (null === finishedWork || null === finishedWork.dehydrated))
      : 3 === finishedWork.tag
        ? current.memoizedState.isDehydrated && 0 === (finishedWork.flags & 256)
        : !1;
}
function commitBeforeMutationEffects(root, firstChild, committedLanes) {
  root = (committedLanes & 335544064) === committedLanes;
  nextEffect = firstChild;
  for (firstChild = root ? 9270 : BeforeMutationMask; null !== nextEffect; ) {
    committedLanes = nextEffect;
    if (root) {
      var deletions = committedLanes.deletions;
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++)
          root && commitExitViewTransitions(deletions[i]);
    }
    if (null === committedLanes.alternate && 0 !== (committedLanes.flags & 2))
      root && trackEnterViewTransitions(committedLanes),
        commitBeforeMutationEffects_complete(root);
    else {
      if (22 === committedLanes.tag && 0 !== (committedLanes.mode & 1))
        if (
          ((deletions = committedLanes.alternate),
          null !== committedLanes.memoizedState)
        ) {
          null !== deletions &&
            null === deletions.memoizedState &&
            root &&
            commitExitViewTransitions(deletions);
          commitBeforeMutationEffects_complete(root);
          continue;
        } else if (null !== deletions && null !== deletions.memoizedState) {
          root && trackEnterViewTransitions(committedLanes);
          commitBeforeMutationEffects_complete(root);
          continue;
        }
      deletions = committedLanes.child;
      0 !== (committedLanes.subtreeFlags & firstChild) && null !== deletions
        ? ((deletions.return = committedLanes), (nextEffect = deletions))
        : (root && commitNestedViewTransitions(committedLanes),
          commitBeforeMutationEffects_complete(root));
    }
  }
  appearingViewTransitions = null;
}
function commitBeforeMutationEffects_complete(
  isViewTransitionEligible$jscomp$0
) {
  for (; null !== nextEffect; ) {
    var fiber = nextEffect,
      isViewTransitionEligible = isViewTransitionEligible$jscomp$0,
      current = fiber.alternate,
      flags = fiber.flags;
    switch (fiber.tag) {
      case 0:
      case 11:
      case 15:
        if (
          !enableEffectEventMutationPhase &&
          0 !== (flags & 4) &&
          ((current = fiber.updateQueue),
          (current = null !== current ? current.events : null),
          null !== current)
        )
          for (
            isViewTransitionEligible = 0;
            isViewTransitionEligible < current.length;
            isViewTransitionEligible++
          )
            (flags = current[isViewTransitionEligible]),
              (flags.ref.impl = flags.nextImpl);
        break;
      case 1:
        if (0 !== (flags & 1024) && null !== current) {
          isViewTransitionEligible = void 0;
          flags = current.memoizedProps;
          current = current.memoizedState;
          var instance = fiber.stateNode;
          try {
            var resolvedPrevProps = resolveClassComponentProps(
              fiber.type,
              flags
            );
            isViewTransitionEligible = instance.getSnapshotBeforeUpdate(
              resolvedPrevProps,
              current
            );
            instance.__reactInternalSnapshotBeforeUpdate =
              isViewTransitionEligible;
          } catch (error) {
            captureCommitPhaseError(fiber, fiber.return, error);
          }
        }
        break;
      case 3:
        break;
      case 5:
      case 26:
      case 27:
      case 6:
      case 4:
      case 17:
        break;
      case 30:
        isViewTransitionEligible &&
          null !== current &&
          ((isViewTransitionEligible = getViewTransitionName(
            current.memoizedProps,
            current.stateNode
          )),
          (flags = fiber.memoizedProps),
          (flags = getViewTransitionClassName(flags.default, flags.update)),
          "none" !== flags &&
            applyViewTransitionToHostInstances(
              current,
              isViewTransitionEligible,
              flags,
              (current.memoizedState = []),
              !0
            ));
        break;
      default:
        if (0 !== (flags & 1024))
          throw Error(
            "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue."
          );
    }
    current = fiber.sibling;
    if (null !== current) {
      current.return = fiber.return;
      nextEffect = current;
      break;
    }
    nextEffect = fiber.return;
  }
}
function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  var prevEffectStart = pushComponentEffectStart(),
    prevEffectDuration = pushComponentEffectDuration(),
    prevEffectErrors = pushComponentEffectErrors(),
    prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate(),
    flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 4 && commitHookLayoutEffects(finishedWork, 5);
      break;
    case 1:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & 4)
        if (((finishedRoot = finishedWork.stateNode), null === current))
          if (shouldProfile(finishedWork)) {
            startEffectTimer();
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
            recordEffectDuration();
          } else
            try {
              finishedRoot.componentDidMount();
            } catch (error$132) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$132
              );
            }
        else {
          var prevProps = resolveClassComponentProps(
            finishedWork.type,
            current.memoizedProps
          );
          current = current.memoizedState;
          if (shouldProfile(finishedWork)) {
            startEffectTimer();
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$133) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$133
              );
            }
            recordEffectDuration();
          } else
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$134) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$134
              );
            }
        }
      flags & 64 && commitClassCallbacks(finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 3:
      current = pushNestedEffectDurations();
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & 64 && ((flags = finishedWork.updateQueue), null !== flags)) {
        prevProps = null;
        if (null !== finishedWork.child)
          switch (finishedWork.child.tag) {
            case 27:
            case 5:
              prevProps = getPublicInstance(finishedWork.child.stateNode);
              break;
            case 1:
              prevProps = finishedWork.child.stateNode;
          }
        try {
          commitCallbacks(flags, prevProps);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      finishedRoot.effectDuration += popNestedEffectDurations(current);
      break;
    case 27:
    case 26:
    case 5:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (null === current)
        if (flags & 4) commitHostMount(finishedWork);
        else if (flags & 64) {
          finishedRoot = finishedWork.type;
          current = finishedWork.memoizedProps;
          prevProps = finishedWork.stateNode;
          try {
            shim$1(prevProps, finishedRoot, current, finishedWork);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 12:
      flags & 4
        ? ((flags = pushNestedEffectDurations()),
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork),
          (finishedRoot = finishedWork.stateNode),
          (finishedRoot.effectDuration += bubbleNestedEffectDurations(flags)),
          commitProfilerUpdate(
            finishedWork,
            current,
            commitStartTime,
            finishedRoot.effectDuration
          ))
        : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 31:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 13:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 64 &&
        ((finishedRoot = finishedWork.memoizedState),
        null !== finishedRoot &&
          null !== finishedRoot.dehydrated &&
          (retryDehydratedSuspenseBoundary.bind(null, finishedWork), shim$1()));
      break;
    case 22:
      if (0 !== (finishedWork.mode & 1)) {
        if (
          ((flags =
            null !== finishedWork.memoizedState || offscreenSubtreeIsHidden),
          !flags)
        ) {
          current =
            (null !== current && null !== current.memoizedState) ||
            offscreenSubtreeWasHidden;
          prevProps = offscreenSubtreeIsHidden;
          var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = flags;
          (offscreenSubtreeWasHidden = current) &&
          !prevOffscreenSubtreeWasHidden
            ? (recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                0 !== (finishedWork.subtreeFlags & 8772)
              ),
              0 !== (finishedWork.mode & 2) &&
                0 <= componentEffectStartTime &&
                0 <= componentEffectEndTime &&
                0.05 < componentEffectEndTime - componentEffectStartTime &&
                logComponentReappeared(
                  finishedWork,
                  componentEffectStartTime,
                  componentEffectEndTime
                ))
            : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = prevProps;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
      } else recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 30:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 7:
      enableFragmentRefs &&
        flags & 512 &&
        safelyAttachRef(finishedWork, finishedWork.return);
    default:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
  }
  0 !== (finishedWork.mode & 2) &&
    0 <= componentEffectStartTime &&
    0 <= componentEffectEndTime &&
    ((componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      ),
    null === finishedWork.alternate &&
      null !== finishedWork.return &&
      null !== finishedWork.return.alternate &&
      0.05 < componentEffectEndTime - componentEffectStartTime &&
      (isHydratingParent(finishedWork.return.alternate, finishedWork.return) ||
        logComponentTrigger(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
          "Mount"
        )));
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  componentEffectErrors = prevEffectErrors;
  componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
}
function detachFiberAfterEffects(fiber) {
  var alternate = fiber.alternate;
  null !== alternate &&
    ((fiber.alternate = null), detachFiberAfterEffects(alternate));
  fiber.child = null;
  fiber.deletions = null;
  fiber.sibling = null;
  fiber.stateNode = null;
  fiber.return = null;
  fiber.dependencies = null;
  fiber.memoizedProps = null;
  fiber.memoizedState = null;
  fiber.pendingProps = null;
  fiber.stateNode = null;
  fiber.updateQueue = null;
}
function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAncestor,
  parent
) {
  for (parent = parent.child; null !== parent; )
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent),
      (parent = parent.sibling);
}
function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor,
  deletedFiber
) {
  if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
    try {
      injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
    } catch (err) {}
  var prevEffectStart = pushComponentEffectStart(),
    prevEffectDuration = pushComponentEffectDuration(),
    prevEffectErrors = pushComponentEffectErrors(),
    prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  switch (deletedFiber.tag) {
    case 26:
    case 27:
    case 5:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor),
        enableFragmentRefs &&
          (5 === deletedFiber.tag ||
            (enableFragmentRefsTextNodes && 6 === deletedFiber.tag)) &&
          commitFragmentInstanceDeletionEffects(deletedFiber);
    case 6:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 18:
      finishedRoot = finishedRoot.hydrationCallbacks;
      if (null !== finishedRoot)
        try {
          var onDeleted = finishedRoot.onDeleted;
          onDeleted && onDeleted(deletedFiber.stateNode);
        } catch (error) {
          captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
        }
      break;
    case 4:
      commitHostPortalContainerChildren(
        deletedFiber.stateNode,
        deletedFiber,
        passChildrenWhenCloningPersistedNodes ? [] : createChildNodeSet()
      );
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
      offscreenSubtreeWasHidden ||
        commitHookLayoutUnmountEffects(deletedFiber, nearestMountedAncestor, 4);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 1:
      offscreenSubtreeWasHidden ||
        (safelyDetachRef(deletedFiber, nearestMountedAncestor),
        (onDeleted = deletedFiber.stateNode),
        "function" === typeof onDeleted.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            deletedFiber,
            nearestMountedAncestor,
            onDeleted
          ));
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 21:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 22:
      deletedFiber.mode & 1
        ? ((offscreenSubtreeWasHidden =
            (onDeleted = offscreenSubtreeWasHidden) ||
            null !== deletedFiber.memoizedState),
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          ),
          (offscreenSubtreeWasHidden = onDeleted))
        : recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
      break;
    case 30:
      safelyDetachRef(deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 7:
      if (enableFragmentRefs) {
        offscreenSubtreeWasHidden ||
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      }
    default:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
  }
  0 !== (deletedFiber.mode & 2) &&
    0 <= componentEffectStartTime &&
    0 <= componentEffectEndTime &&
    (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
    logComponentEffect(
      deletedFiber,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors
    );
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  componentEffectErrors = prevEffectErrors;
  componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
}
function getRetryCache(finishedWork) {
  switch (finishedWork.tag) {
    case 31:
    case 13:
    case 19:
      var retryCache = finishedWork.stateNode;
      null === retryCache &&
        (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
      return retryCache;
    case 22:
      return (
        (finishedWork = finishedWork.stateNode),
        (retryCache = finishedWork._retryCache),
        null === retryCache &&
          (retryCache = finishedWork._retryCache = new PossiblyWeakSet()),
        retryCache
      );
    default:
      throw Error(
        "Unexpected Suspense handler tag (" +
          finishedWork.tag +
          "). This is a bug in React."
      );
  }
}
function attachSuspenseRetryListeners(finishedWork, wakeables) {
  var retryCache = getRetryCache(finishedWork);
  wakeables.forEach(function (wakeable) {
    if (!retryCache.has(wakeable)) {
      retryCache.add(wakeable);
      if (isDevToolsPresent)
        if (null !== inProgressLanes && null !== inProgressRoot)
          restorePendingUpdaters(inProgressRoot, inProgressLanes);
        else
          throw Error(
            "Expected finished root and lanes to be set. This is a bug in React."
          );
      var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      wakeable.then(retry, retry);
    }
  });
}
function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber, lanes) {
  var deletions = parentFiber.deletions;
  if (null !== deletions)
    for (var i = 0; i < deletions.length; i++) {
      var childToDelete = deletions[i],
        root = root$jscomp$0,
        returnFiber = parentFiber,
        prevEffectStart = pushComponentEffectStart();
      commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
      0 !== (childToDelete.mode & 2) &&
        0 <= componentEffectStartTime &&
        0 <= componentEffectEndTime &&
        0.05 < componentEffectEndTime - componentEffectStartTime &&
        logComponentTrigger(
          childToDelete,
          componentEffectStartTime,
          componentEffectEndTime,
          "Unmount"
        );
      popComponentEffectStart(prevEffectStart);
      root = childToDelete.alternate;
      null !== root && (root.return = null);
      childToDelete.return = null;
    }
  if (parentFiber.subtreeFlags & 13886)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitMutationEffectsOnFiber(parentFiber, root$jscomp$0, lanes),
        (parentFiber = parentFiber.sibling);
}
function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
  var prevEffectStart = pushComponentEffectStart(),
    prevEffectDuration = pushComponentEffectDuration(),
    prevEffectErrors = pushComponentEffectErrors(),
    prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate(),
    current = finishedWork.alternate,
    flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (
        enableEffectEventMutationPhase &&
        flags & 4 &&
        ((current = finishedWork.updateQueue),
        (current = null !== current ? current.events : null),
        null !== current)
      )
        for (var ii = 0; ii < current.length; ii++) {
          var _eventPayloads$ii2 = current[ii];
          _eventPayloads$ii2.ref.impl = _eventPayloads$ii2.nextImpl;
        }
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        (commitHookEffectListUnmount(3, finishedWork, finishedWork.return),
        commitHookEffectListMount(3, finishedWork),
        commitHookLayoutUnmountEffects(finishedWork, finishedWork.return, 5));
      break;
    case 1:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      flags & 64 &&
        offscreenSubtreeIsHidden &&
        ((root = finishedWork.updateQueue),
        null !== root &&
          ((lanes = root.callbacks),
          null !== lanes &&
            ((flags = root.shared.hiddenCallbacks),
            (root.shared.hiddenCallbacks =
              null === flags ? lanes : flags.concat(lanes)))));
      break;
    case 26:
    case 27:
    case 5:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      null !== finishedWork.alternate &&
        (finishedWork.alternate.stateNode = finishedWork.stateNode);
      break;
    case 6:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      break;
    case 3:
      current = pushNestedEffectDurations();
      viewTransitionMutationContext = rootMutationContext = !1;
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      if (flags & 4) {
        flags = root.containerInfo;
        ii = root.pendingChildren;
        try {
          completeRoot(flags.containerTag, ii),
            (viewTransitionMutationContext = !0);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      root.effectDuration += popNestedEffectDurations(current);
      viewTransitionMutationContext && (rootMutationContext = !0);
      viewTransitionMutationContext = !1;
      rootMutationContext &&
        0 !== (lanes & 34) &&
        ((root.indicatorLanes &= ~currentEventTransitionLane),
        (needsIsomorphicIndicator = !1));
      break;
    case 4:
      current = pushMutationContext();
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      viewTransitionMutationContext && (rootMutationContext = !0);
      viewTransitionMutationContext = current;
      flags & 4 &&
        commitHostPortalContainerChildren(
          finishedWork.stateNode,
          finishedWork,
          finishedWork.stateNode.pendingChildren
        );
      break;
    case 12:
      flags = pushNestedEffectDurations();
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      finishedWork.stateNode.effectDuration +=
        bubbleNestedEffectDurations(flags);
      break;
    case 31:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((root = finishedWork.updateQueue),
        null !== root &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, root)));
      break;
    case 13:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      finishedWork.child.flags & 8192 &&
        ((root = null !== finishedWork.memoizedState),
        (lanes = null !== current && null !== current.memoizedState),
        alwaysThrottleRetries
          ? root !== lanes && (globalMostRecentFallbackTime = now$1())
          : root && !lanes && (globalMostRecentFallbackTime = now$1()));
      if (flags & 4) {
        try {
          null !== finishedWork.memoizedState &&
            ((ii = finishedWork.memoizedProps.suspenseCallback),
            "function" === typeof ii &&
              ((_eventPayloads$ii2 = finishedWork.updateQueue),
              null !== _eventPayloads$ii2 && ii(new Set(_eventPayloads$ii2))));
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        root = finishedWork.updateQueue;
        null !== root &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, root));
      }
      break;
    case 22:
      ii = null !== finishedWork.memoizedState;
      _eventPayloads$ii2 = null !== current && null !== current.memoizedState;
      if (finishedWork.mode & 1) {
        var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
          prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
        offscreenSubtreeWasHidden =
          prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        _eventPayloads$ii2 &&
          !ii &&
          !prevOffscreenSubtreeIsHidden &&
          !prevOffscreenSubtreeWasHidden &&
          0 !== (finishedWork.mode & 2) &&
          0 <= componentEffectStartTime &&
          0 <= componentEffectEndTime &&
          0.05 < componentEffectEndTime - componentEffectStartTime &&
          logComponentReappeared(
            finishedWork,
            componentEffectStartTime,
            componentEffectEndTime
          );
      } else recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 8192 &&
        ((root = finishedWork.stateNode),
        (root._visibility = ii ? root._visibility & -2 : root._visibility | 1),
        !ii ||
          null === current ||
          _eventPayloads$ii2 ||
          offscreenSubtreeIsHidden ||
          offscreenSubtreeWasHidden ||
          0 === (finishedWork.mode & 1) ||
          (recursivelyTraverseDisappearLayoutEffects(finishedWork),
          0 !== (finishedWork.mode & 2) &&
            0 <= componentEffectStartTime &&
            0 <= componentEffectEndTime &&
            0.05 < componentEffectEndTime - componentEffectStartTime &&
            logComponentTrigger(
              finishedWork,
              componentEffectStartTime,
              componentEffectEndTime,
              "Disconnect"
            )));
      flags & 4 &&
        ((root = finishedWork.updateQueue),
        null !== root &&
          ((lanes = root.retryQueue),
          null !== lanes &&
            ((root.retryQueue = null),
            attachSuspenseRetryListeners(finishedWork, lanes))));
      break;
    case 19:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((root = finishedWork.updateQueue),
        null !== root &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, root)));
      break;
    case 30:
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      flags = pushMutationContext();
      ii = (lanes & 335544064) === lanes;
      _eventPayloads$ii2 = finishedWork.memoizedProps;
      ii &&
        "none" !==
          getViewTransitionClassName(
            _eventPayloads$ii2.default,
            _eventPayloads$ii2.update
          );
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      ii &&
        null !== current &&
        viewTransitionMutationContext &&
        (finishedWork.flags |= 4);
      viewTransitionMutationContext && (rootMutationContext = !0);
      viewTransitionMutationContext = flags;
      break;
    case 21:
      break;
    case 7:
      enableFragmentRefs &&
        current &&
        null !== current.stateNode &&
        (current.stateNode._fragmentFiber = finishedWork);
    default:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes),
        commitReconciliationEffects(finishedWork);
  }
  0 !== (finishedWork.mode & 2) &&
    0 <= componentEffectStartTime &&
    0 <= componentEffectEndTime &&
    ((componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      ),
    null === finishedWork.alternate &&
      null !== finishedWork.return &&
      null !== finishedWork.return.alternate &&
      0.05 < componentEffectEndTime - componentEffectStartTime &&
      (isHydratingParent(finishedWork.return.alternate, finishedWork.return) ||
        logComponentTrigger(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
          "Mount"
        )));
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  componentEffectErrors = prevEffectErrors;
  componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
}
function commitReconciliationEffects(finishedWork) {
  var flags = finishedWork.flags;
  if (flags & 2) {
    try {
      for (
        var parentFragmentInstances = null, parentFiber = finishedWork.return;
        null !== parentFiber;

      ) {
        if (enableFragmentRefs && isFragmentInstanceParent(parentFiber)) {
          var fragmentInstance = parentFiber.stateNode;
          null === parentFragmentInstances
            ? (parentFragmentInstances = [fragmentInstance])
            : parentFragmentInstances.push(fragmentInstance);
        }
        if (isHostParent(parentFiber)) break;
        parentFiber = parentFiber.return;
      }
      enableFragmentRefs &&
        commitImmutablePlacementNodeToFragmentInstances(
          finishedWork,
          parentFragmentInstances
        );
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    finishedWork.flags &= -3;
  }
  flags & 4096 && (finishedWork.flags &= -4097);
}
function recursivelyTraverseAfterMutationEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & 9270)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitAfterMutationEffectsOnFiber(parentFiber, root),
        (parentFiber = parentFiber.sibling);
  else measureNestedViewTransitions(parentFiber, !1);
}
function commitAfterMutationEffectsOnFiber(finishedWork, root) {
  var current = finishedWork.alternate;
  if (null === current) commitEnterViewTransitions(finishedWork, !1);
  else
    switch (finishedWork.tag) {
      case 3:
        viewTransitionContextChanged = !1;
        pushViewTransitionCancelableScope();
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionCancelableChildren = null;
        break;
      case 5:
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        break;
      case 4:
        var prevContextChanged = viewTransitionContextChanged;
        viewTransitionContextChanged = !1;
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionContextChanged = prevContextChanged;
        break;
      case 22:
        0 !== (finishedWork.mode & 1)
          ? null === finishedWork.memoizedState &&
            (null !== current.memoizedState
              ? commitEnterViewTransitions(finishedWork, !1)
              : recursivelyTraverseAfterMutationEffects(root, finishedWork))
          : recursivelyTraverseAfterMutationEffects(root, finishedWork);
        break;
      case 30:
        prevContextChanged = viewTransitionContextChanged;
        var prevCancelableChildren = pushViewTransitionCancelableScope();
        viewTransitionContextChanged = !1;
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionContextChanged && (finishedWork.flags |= 4);
        var props = finishedWork.memoizedProps,
          state = finishedWork.stateNode;
        root = getViewTransitionName(props, state);
        state = getViewTransitionName(current.memoizedProps, state);
        var className = getViewTransitionClassName(props.default, props.update);
        "none" === className
          ? (current = !1)
          : ((props = current.memoizedState),
            (current.memoizedState = null),
            (current = finishedWork.child),
            (viewTransitionHostInstanceIdx = 0),
            (current = measureViewTransitionHostInstancesRecursive(
              finishedWork,
              current,
              root,
              state,
              className,
              props,
              !0
            )),
            viewTransitionHostInstanceIdx !==
              (null === props ? 0 : props.length) &&
              (finishedWork.flags |= 32));
        0 !== (finishedWork.flags & 4) && current
          ? (scheduleViewTransitionEvent(
              finishedWork,
              finishedWork.memoizedProps.onUpdate
            ),
            (viewTransitionCancelableChildren = prevCancelableChildren))
          : null !== prevCancelableChildren &&
            (prevCancelableChildren.push.apply(
              prevCancelableChildren,
              viewTransitionCancelableChildren
            ),
            (viewTransitionCancelableChildren = prevCancelableChildren));
        viewTransitionContextChanged =
          0 !== (finishedWork.flags & 32) ? !0 : prevContextChanged;
        break;
      default:
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
    }
}
function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & 8772)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber),
        (parentFiber = parentFiber.sibling);
}
function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var finishedWork = parentFiber,
      prevEffectStart = pushComponentEffectStart(),
      prevEffectDuration = pushComponentEffectDuration(),
      prevEffectErrors = pushComponentEffectErrors(),
      prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookLayoutUnmountEffects(finishedWork, finishedWork.return, 4);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 1:
        safelyDetachRef(finishedWork, finishedWork.return);
        var instance = finishedWork.stateNode;
        "function" === typeof instance.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 27:
      case 26:
      case 5:
        safelyDetachRef(finishedWork, finishedWork.return);
        enableFragmentRefs &&
          (5 === finishedWork.tag ||
            (enableFragmentRefsTextNodes && 6 === finishedWork.tag)) &&
          commitFragmentInstanceDeletionEffects(finishedWork);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 30:
        safelyDetachRef(finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 7:
        enableFragmentRefs &&
          safelyDetachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
    }
    0 !== (finishedWork.mode & 2) &&
      0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      );
    popComponentEffectStart(prevEffectStart);
    popComponentEffectDuration(prevEffectDuration);
    componentEffectErrors = prevEffectErrors;
    componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseReappearLayoutEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  includeWorkInProgressEffects
) {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 8772);
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var current = parentFiber.alternate,
      finishedRoot = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      prevEffectStart = pushComponentEffectStart(),
      prevEffectDuration = pushComponentEffectDuration(),
      prevEffectErrors = pushComponentEffectErrors(),
      prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate(),
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        commitHookLayoutEffects(finishedWork, 4);
        break;
      case 1:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        current = finishedWork;
        finishedRoot = current.stateNode;
        if ("function" === typeof finishedRoot.componentDidMount)
          try {
            finishedRoot.componentDidMount();
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        current = finishedWork;
        finishedRoot = current.updateQueue;
        if (null !== finishedRoot) {
          var instance = current.stateNode;
          try {
            var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
            if (null !== hiddenCallbacks)
              for (
                finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0;
                finishedRoot < hiddenCallbacks.length;
                finishedRoot++
              )
                callCallback(hiddenCallbacks[finishedRoot], instance);
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        }
        includeWorkInProgressEffects &&
          flags & 64 &&
          commitClassCallbacks(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 27:
      case 26:
      case 5:
        if (enableFragmentRefs && 5 === finishedWork.tag) {
          instance = finishedWork;
          for (var parent = instance.return; null !== parent; ) {
            isFragmentInstanceParent(parent) &&
              commitNewChildToFragmentInstance(
                instance.stateNode,
                parent.stateNode
              );
            if (isHostParent(parent)) break;
            parent = parent.return;
          }
        }
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          null === current &&
          flags & 4 &&
          commitHostMount(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        includeWorkInProgressEffects && flags & 4
          ? ((flags = pushNestedEffectDurations()),
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects
            ),
            (finishedRoot = finishedWork.stateNode),
            (finishedRoot.effectDuration += bubbleNestedEffectDurations(flags)),
            commitProfilerUpdate(
              finishedWork,
              current,
              commitStartTime,
              finishedRoot.effectDuration
            ))
          : recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects
            );
        break;
      case 31:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        break;
      case 13:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 30:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 7:
        enableFragmentRefs &&
          safelyAttachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
    }
    0 !== (finishedWork.mode & 2) &&
      0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        finishedWork,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      );
    popComponentEffectStart(prevEffectStart);
    popComponentEffectDuration(prevEffectDuration);
    componentEffectErrors = prevEffectErrors;
    componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
    parentFiber = parentFiber.sibling;
  }
}
function commitOffscreenPassiveMountEffects(current, finishedWork) {
  var previousCache = null;
  null !== current &&
    null !== current.memoizedState &&
    null !== current.memoizedState.cachePool &&
    (previousCache = current.memoizedState.cachePool.pool);
  current = null;
  null !== finishedWork.memoizedState &&
    null !== finishedWork.memoizedState.cachePool &&
    (current = finishedWork.memoizedState.cachePool.pool);
  current !== previousCache &&
    (null != current && current.refCount++,
    null != previousCache && releaseCache(previousCache));
}
function commitCachePassiveMountEffect(current, finishedWork) {
  current = null;
  null !== finishedWork.alternate &&
    (current = finishedWork.alternate.memoizedState.cache);
  finishedWork = finishedWork.memoizedState.cache;
  finishedWork !== current &&
    (finishedWork.refCount++, null != current && releaseCache(current));
}
function recursivelyTraversePassiveMountEffects(
  root,
  parentFiber,
  committedLanes,
  committedTransitions,
  endTime
) {
  if (
    parentFiber.subtreeFlags &
      ((committedLanes & 335544064) === committedLanes ? 10262 : 10256) ||
    (0 !== parentFiber.actualDuration &&
      (null === parentFiber.alternate ||
        parentFiber.alternate.child !== parentFiber.child))
  )
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var nextSibling = parentFiber.sibling;
      commitPassiveMountOnFiber(
        root,
        parentFiber,
        committedLanes,
        committedTransitions,
        null !== nextSibling ? nextSibling.actualStartTime : endTime
      );
      parentFiber = nextSibling;
    }
}
var inHydratedSubtree = !1;
function commitPassiveMountOnFiber(
  finishedRoot,
  finishedWork,
  committedLanes,
  committedTransitions,
  endTime
) {
  var prevEffectStart = pushComponentEffectStart(),
    prevEffectDuration = pushComponentEffectDuration(),
    prevEffectErrors = pushComponentEffectErrors(),
    prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate(),
    isViewTransitionEligible = (committedLanes & 335544064) === committedLanes;
  isViewTransitionEligible &&
    null === finishedWork.alternate &&
    null !== finishedWork.return &&
    null !== finishedWork.return.alternate &&
    restoreEnterOrExitViewTransitions(finishedWork);
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      0 !== (finishedWork.mode & 2) &&
        0 < finishedWork.actualStartTime &&
        0 !== (finishedWork.flags & 1) &&
        logComponentRender(
          finishedWork,
          finishedWork.actualStartTime,
          endTime,
          inHydratedSubtree
        );
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      flags & 2048 && commitHookPassiveMountEffects(finishedWork, 9);
      break;
    case 1:
      0 !== (finishedWork.mode & 2) &&
        0 < finishedWork.actualStartTime &&
        (0 !== (finishedWork.flags & 128)
          ? logComponentErrored(
              finishedWork,
              finishedWork.actualStartTime,
              endTime
            )
          : 0 !== (finishedWork.flags & 1) &&
            logComponentRender(
              finishedWork,
              finishedWork.actualStartTime,
              endTime,
              inHydratedSubtree
            ));
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      break;
    case 3:
      isViewTransitionEligible = pushNestedEffectDurations();
      var wasInHydratedSubtree = inHydratedSubtree;
      inHydratedSubtree =
        null !== finishedWork.alternate &&
        finishedWork.alternate.memoizedState.isDehydrated &&
        0 === (finishedWork.flags & 256);
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      inHydratedSubtree = wasInHydratedSubtree;
      flags & 2048 &&
        ((committedLanes = null),
        null !== finishedWork.alternate &&
          (committedLanes = finishedWork.alternate.memoizedState.cache),
        (committedTransitions = finishedWork.memoizedState.cache),
        committedTransitions !== committedLanes &&
          (committedTransitions.refCount++,
          null != committedLanes && releaseCache(committedLanes)));
      finishedRoot.passiveEffectDuration += popNestedEffectDurations(
        isViewTransitionEligible
      );
      break;
    case 12:
      if (flags & 2048) {
        flags = pushNestedEffectDurations();
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime
        );
        finishedRoot = finishedWork.stateNode;
        finishedRoot.passiveEffectDuration +=
          bubbleNestedEffectDurations(flags);
        try {
          wasInHydratedSubtree = finishedWork.memoizedProps;
          var id = wasInHydratedSubtree.id,
            onPostCommit = wasInHydratedSubtree.onPostCommit,
            phase = null === finishedWork.alternate ? "mount" : "update";
          currentUpdateIsNested && (phase = "nested-update");
          "function" === typeof onPostCommit &&
            onPostCommit(
              id,
              phase,
              finishedRoot.passiveEffectDuration,
              commitStartTime
            );
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      } else
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          endTime
        );
      break;
    case 31:
      flags = inHydratedSubtree;
      isViewTransitionEligible =
        null !== finishedWork.alternate
          ? finishedWork.alternate.memoizedState
          : null;
      wasInHydratedSubtree = finishedWork.memoizedState;
      null !== isViewTransitionEligible && null === wasInHydratedSubtree
        ? ((wasInHydratedSubtree = finishedWork.deletions),
          null !== wasInHydratedSubtree &&
          0 < wasInHydratedSubtree.length &&
          18 === wasInHydratedSubtree[0].tag
            ? ((inHydratedSubtree = !1),
              null !== isViewTransitionEligible.hydrationErrors &&
                logComponentErrored(
                  finishedWork,
                  finishedWork.actualStartTime,
                  endTime
                ))
            : (inHydratedSubtree = !0))
        : (inHydratedSubtree = !1);
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      inHydratedSubtree = flags;
      break;
    case 13:
      flags = inHydratedSubtree;
      isViewTransitionEligible =
        null !== finishedWork.alternate
          ? finishedWork.alternate.memoizedState
          : null;
      wasInHydratedSubtree = finishedWork.memoizedState;
      null === isViewTransitionEligible ||
      null === isViewTransitionEligible.dehydrated ||
      (null !== wasInHydratedSubtree &&
        null !== wasInHydratedSubtree.dehydrated)
        ? (inHydratedSubtree = !1)
        : ((wasInHydratedSubtree = finishedWork.deletions),
          null !== wasInHydratedSubtree &&
          0 < wasInHydratedSubtree.length &&
          18 === wasInHydratedSubtree[0].tag
            ? ((inHydratedSubtree = !1),
              null !== isViewTransitionEligible.hydrationErrors &&
                logComponentErrored(
                  finishedWork,
                  finishedWork.actualStartTime,
                  endTime
                ))
            : (inHydratedSubtree = !0));
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      inHydratedSubtree = flags;
      break;
    case 23:
      break;
    case 22:
      id = finishedWork.stateNode;
      wasInHydratedSubtree = finishedWork.alternate;
      null !== finishedWork.memoizedState
        ? (isViewTransitionEligible &&
            null !== wasInHydratedSubtree &&
            null === wasInHydratedSubtree.memoizedState &&
            restoreEnterOrExitViewTransitions(wasInHydratedSubtree),
          id._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                endTime
              )
            : finishedWork.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  endTime
                )
              : ((id._visibility |= 2),
                recursivelyTraversePassiveMountEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  endTime
                )))
        : (isViewTransitionEligible &&
            null !== wasInHydratedSubtree &&
            null !== wasInHydratedSubtree.memoizedState &&
            restoreEnterOrExitViewTransitions(finishedWork),
          id._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                endTime
              )
            : ((id._visibility |= 2),
              recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                0 !== (finishedWork.subtreeFlags & 10256) ||
                  (0 !== finishedWork.actualDuration &&
                    (null === finishedWork.alternate ||
                      finishedWork.alternate.child !== finishedWork.child)),
                endTime
              ),
              0 === (finishedWork.mode & 2) ||
                inHydratedSubtree ||
                ((finishedRoot = finishedWork.actualStartTime),
                0 <= finishedRoot &&
                  0.05 < endTime - finishedRoot &&
                  logComponentReappeared(finishedWork, finishedRoot, endTime),
                0 <= componentEffectStartTime &&
                  0 <= componentEffectEndTime &&
                  0.05 < componentEffectEndTime - componentEffectStartTime &&
                  logComponentReappeared(
                    finishedWork,
                    componentEffectStartTime,
                    componentEffectEndTime
                  ))));
      flags & 2048 &&
        commitOffscreenPassiveMountEffects(wasInHydratedSubtree, finishedWork);
      break;
    case 24:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      flags & 2048 &&
        commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
      break;
    case 30:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
      break;
    default:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions,
        endTime
      );
  }
  if (0 !== (finishedWork.mode & 2)) {
    if (
      (finishedRoot =
        !inHydratedSubtree &&
        null === finishedWork.alternate &&
        null !== finishedWork.return &&
        null !== finishedWork.return.alternate)
    )
      (committedLanes = finishedWork.actualStartTime),
        0 <= committedLanes &&
          0.05 < endTime - committedLanes &&
          logComponentTrigger(finishedWork, committedLanes, endTime, "Mount");
    0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      ((componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
        logComponentEffect(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
          componentEffectDuration,
          componentEffectErrors
        ),
      finishedRoot &&
        0.05 < componentEffectEndTime - componentEffectStartTime &&
        logComponentTrigger(
          finishedWork,
          componentEffectStartTime,
          componentEffectEndTime,
          "Mount"
        ));
  }
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  componentEffectErrors = prevEffectErrors;
  componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
}
function recursivelyTraverseReconnectPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  committedLanes$jscomp$0,
  committedTransitions$jscomp$0,
  includeWorkInProgressEffects,
  endTime$jscomp$0
) {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    (0 !== (parentFiber.subtreeFlags & 10256) ||
      (0 !== parentFiber.actualDuration &&
        (null === parentFiber.alternate ||
          parentFiber.alternate.child !== parentFiber.child)));
  for (var child = parentFiber.child; null !== child; ) {
    parentFiber = child.sibling;
    var finishedRoot = finishedRoot$jscomp$0,
      committedLanes = committedLanes$jscomp$0,
      committedTransitions = committedTransitions$jscomp$0,
      endTime =
        null !== parentFiber ? parentFiber.actualStartTime : endTime$jscomp$0,
      prevEffectStart = pushComponentEffectStart(),
      prevEffectDuration = pushComponentEffectDuration(),
      prevEffectErrors = pushComponentEffectErrors(),
      prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
    includeWorkInProgressEffects &&
      0 !== (child.mode & 2) &&
      0 < child.actualStartTime &&
      0 !== (child.flags & 1) &&
      logComponentRender(
        child,
        child.actualStartTime,
        endTime,
        inHydratedSubtree
      );
    var flags = child.flags;
    switch (child.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          child,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime
        );
        commitHookPassiveMountEffects(child, 8);
        break;
      case 23:
        break;
      case 22:
        var instance = child.stateNode;
        null !== child.memoizedState
          ? instance._visibility & 2
            ? recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                child,
                committedLanes,
                committedTransitions,
                includeWorkInProgressEffects,
                endTime
              )
            : child.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  child,
                  committedLanes,
                  committedTransitions,
                  endTime
                )
              : ((instance._visibility |= 2),
                recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  child,
                  committedLanes,
                  committedTransitions,
                  includeWorkInProgressEffects,
                  endTime
                ))
          : ((instance._visibility |= 2),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              child,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects,
              endTime
            ));
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitOffscreenPassiveMountEffects(child.alternate, child);
        break;
      case 24:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          child,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime
        );
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitCachePassiveMountEffect(child.alternate, child);
        break;
      default:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          child,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects,
          endTime
        );
    }
    0 !== (child.mode & 2) &&
      0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        child,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      );
    popComponentEffectStart(prevEffectStart);
    popComponentEffectDuration(prevEffectDuration);
    componentEffectErrors = prevEffectErrors;
    componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
    child = parentFiber;
  }
}
function recursivelyTraverseAtomicPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  committedLanes$jscomp$0,
  committedTransitions$jscomp$0,
  endTime$jscomp$0
) {
  if (
    parentFiber.subtreeFlags & 10256 ||
    (0 !== parentFiber.actualDuration &&
      (null === parentFiber.alternate ||
        parentFiber.alternate.child !== parentFiber.child))
  )
    for (var child = parentFiber.child; null !== child; ) {
      parentFiber = child.sibling;
      var finishedRoot = finishedRoot$jscomp$0,
        committedLanes = committedLanes$jscomp$0,
        committedTransitions = committedTransitions$jscomp$0,
        endTime =
          null !== parentFiber ? parentFiber.actualStartTime : endTime$jscomp$0;
      0 !== (child.mode & 2) &&
        0 < child.actualStartTime &&
        0 !== (child.flags & 1) &&
        logComponentRender(
          child,
          child.actualStartTime,
          endTime,
          inHydratedSubtree
        );
      var flags = child.flags;
      switch (child.tag) {
        case 22:
          recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            child,
            committedLanes,
            committedTransitions,
            endTime
          );
          flags & 2048 &&
            commitOffscreenPassiveMountEffects(child.alternate, child);
          break;
        case 24:
          recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            child,
            committedLanes,
            committedTransitions,
            endTime
          );
          flags & 2048 && commitCachePassiveMountEffect(child.alternate, child);
          break;
        default:
          recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            child,
            committedLanes,
            committedTransitions,
            endTime
          );
      }
      child = parentFiber;
    }
}
var suspenseyCommitFlag = 8192;
function recursivelyAccumulateSuspenseyCommit(parentFiber) {
  if (parentFiber.subtreeFlags & suspenseyCommitFlag)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      accumulateSuspenseyCommitOnFiber(parentFiber),
        (parentFiber = parentFiber.sibling);
}
function accumulateSuspenseyCommitOnFiber(fiber) {
  switch (fiber.tag) {
    case 26:
      recursivelyAccumulateSuspenseyCommit(fiber);
      fiber.flags & suspenseyCommitFlag &&
        null !== fiber.memoizedState &&
        shim();
      break;
    case 5:
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    case 3:
    case 4:
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    case 22:
      if (null === fiber.memoizedState) {
        var current = fiber.alternate;
        null !== current && null !== current.memoizedState
          ? ((current = suspenseyCommitFlag),
            (suspenseyCommitFlag = 16777216),
            recursivelyAccumulateSuspenseyCommit(fiber),
            (suspenseyCommitFlag = current))
          : recursivelyAccumulateSuspenseyCommit(fiber);
      }
      break;
    case 30:
      if (
        0 !== (fiber.flags & suspenseyCommitFlag) &&
        ((current = fiber.memoizedProps.name),
        null != current && "auto" !== current)
      ) {
        var state = fiber.stateNode;
        state.paired = null;
        null === appearingViewTransitions &&
          (appearingViewTransitions = new Map());
        appearingViewTransitions.set(current, state);
      }
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    default:
      recursivelyAccumulateSuspenseyCommit(fiber);
  }
}
function detachAlternateSiblings(parentFiber) {
  var previousFiber = parentFiber.alternate;
  if (
    null !== previousFiber &&
    ((parentFiber = previousFiber.child), null !== parentFiber)
  ) {
    previousFiber.child = null;
    do
      (previousFiber = parentFiber.sibling),
        (parentFiber.sibling = null),
        (parentFiber = previousFiber);
    while (null !== parentFiber);
  }
}
function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  var deletions = parentFiber.deletions;
  if (0 !== (parentFiber.flags & 16)) {
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i],
          prevEffectStart = pushComponentEffectStart();
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber
        );
        0 !== (childToDelete.mode & 2) &&
          0 <= componentEffectStartTime &&
          0 <= componentEffectEndTime &&
          0.05 < componentEffectEndTime - componentEffectStartTime &&
          logComponentTrigger(
            childToDelete,
            componentEffectStartTime,
            componentEffectEndTime,
            "Unmount"
          );
        popComponentEffectStart(prevEffectStart);
      }
    detachAlternateSiblings(parentFiber);
  }
  if (parentFiber.subtreeFlags & 10256)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitPassiveUnmountOnFiber(parentFiber),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveUnmountOnFiber(finishedWork) {
  var prevEffectStart = pushComponentEffectStart(),
    prevEffectDuration = pushComponentEffectDuration(),
    prevEffectErrors = pushComponentEffectErrors(),
    prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      finishedWork.flags & 2048 &&
        commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, 9);
      break;
    case 3:
      var prevProfilerEffectDuration = pushNestedEffectDurations();
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      finishedWork.stateNode.passiveEffectDuration += popNestedEffectDurations(
        prevProfilerEffectDuration
      );
      break;
    case 12:
      prevProfilerEffectDuration = pushNestedEffectDurations();
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      finishedWork.stateNode.passiveEffectDuration +=
        bubbleNestedEffectDurations(prevProfilerEffectDuration);
      break;
    case 22:
      prevProfilerEffectDuration = finishedWork.stateNode;
      null !== finishedWork.memoizedState &&
      prevProfilerEffectDuration._visibility & 2 &&
      (null === finishedWork.return || 13 !== finishedWork.return.tag)
        ? ((prevProfilerEffectDuration._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(finishedWork),
          0 !== (finishedWork.mode & 2) &&
            0 <= componentEffectStartTime &&
            0 <= componentEffectEndTime &&
            0.05 < componentEffectEndTime - componentEffectStartTime &&
            logComponentTrigger(
              finishedWork,
              componentEffectStartTime,
              componentEffectEndTime,
              "Disconnect"
            ))
        : recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    default:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
  }
  0 !== (finishedWork.mode & 2) &&
    0 <= componentEffectStartTime &&
    0 <= componentEffectEndTime &&
    (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
    logComponentEffect(
      finishedWork,
      componentEffectStartTime,
      componentEffectEndTime,
      componentEffectDuration,
      componentEffectErrors
    );
  popComponentEffectStart(prevEffectStart);
  popComponentEffectDuration(prevEffectDuration);
  componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
  componentEffectErrors = prevEffectErrors;
}
function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
  var deletions = parentFiber.deletions;
  if (0 !== (parentFiber.flags & 16)) {
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i],
          prevEffectStart = pushComponentEffectStart();
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          parentFiber
        );
        0 !== (childToDelete.mode & 2) &&
          0 <= componentEffectStartTime &&
          0 <= componentEffectEndTime &&
          0.05 < componentEffectEndTime - componentEffectStartTime &&
          logComponentTrigger(
            childToDelete,
            componentEffectStartTime,
            componentEffectEndTime,
            "Unmount"
          );
        popComponentEffectStart(prevEffectStart);
      }
    detachAlternateSiblings(parentFiber);
  }
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    deletions = parentFiber;
    i = pushComponentEffectStart();
    childToDelete = pushComponentEffectDuration();
    prevEffectStart = pushComponentEffectErrors();
    var prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
    switch (deletions.tag) {
      case 0:
      case 11:
      case 15:
        commitHookPassiveUnmountEffects(deletions, deletions.return, 8);
        recursivelyTraverseDisconnectPassiveEffects(deletions);
        break;
      case 22:
        var instance = deletions.stateNode;
        instance._visibility & 2 &&
          ((instance._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(deletions));
        break;
      default:
        recursivelyTraverseDisconnectPassiveEffects(deletions);
    }
    0 !== (deletions.mode & 2) &&
      0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        deletions,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      );
    popComponentEffectStart(i);
    popComponentEffectDuration(childToDelete);
    componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
    componentEffectErrors = prevEffectStart;
    parentFiber = parentFiber.sibling;
  }
}
function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot,
  nearestMountedAncestor$jscomp$0
) {
  for (; null !== nextEffect; ) {
    var fiber = nextEffect,
      nearestMountedAncestor = nearestMountedAncestor$jscomp$0,
      prevEffectStart = pushComponentEffectStart(),
      prevEffectDuration = pushComponentEffectDuration(),
      prevEffectErrors = pushComponentEffectErrors(),
      prevEffectDidSpawnUpdate = pushComponentEffectDidSpawnUpdate();
    switch (fiber.tag) {
      case 0:
      case 11:
      case 15:
        commitHookPassiveUnmountEffects(fiber, nearestMountedAncestor, 8);
        break;
      case 23:
      case 22:
        null !== fiber.memoizedState &&
          null !== fiber.memoizedState.cachePool &&
          ((nearestMountedAncestor = fiber.memoizedState.cachePool.pool),
          null != nearestMountedAncestor && nearestMountedAncestor.refCount++);
        break;
      case 24:
        releaseCache(fiber.memoizedState.cache);
    }
    0 !== (fiber.mode & 2) &&
      0 <= componentEffectStartTime &&
      0 <= componentEffectEndTime &&
      (componentEffectSpawnedUpdate || 0.05 < componentEffectDuration) &&
      logComponentEffect(
        fiber,
        componentEffectStartTime,
        componentEffectEndTime,
        componentEffectDuration,
        componentEffectErrors
      );
    popComponentEffectStart(prevEffectStart);
    popComponentEffectDuration(prevEffectDuration);
    componentEffectSpawnedUpdate = prevEffectDidSpawnUpdate;
    componentEffectErrors = prevEffectErrors;
    prevEffectStart = fiber.child;
    if (null !== prevEffectStart)
      (prevEffectStart.return = fiber), (nextEffect = prevEffectStart);
    else
      a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
        prevEffectStart = nextEffect;
        prevEffectDuration = prevEffectStart.sibling;
        prevEffectErrors = prevEffectStart.return;
        detachFiberAfterEffects(prevEffectStart);
        if (prevEffectStart === fiber) {
          nextEffect = null;
          break a;
        }
        if (null !== prevEffectDuration) {
          prevEffectDuration.return = prevEffectErrors;
          nextEffect = prevEffectDuration;
          break a;
        }
        nextEffect = prevEffectErrors;
      }
  }
}
var DefaultAsyncDispatcher = {
    getCacheForType: function (resourceType) {
      var cache = readContext(CacheContext),
        cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType &&
        ((cacheForType = resourceType()),
        cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function () {
      return readContext(CacheContext).controller.signal;
    }
  },
  PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map,
  executionContext = 0,
  workInProgressRoot = null,
  workInProgress = null,
  workInProgressRootRenderLanes = 0,
  workInProgressSuspendedReason = 0,
  workInProgressThrownValue = null,
  workInProgressRootDidSkipSuspendedSiblings = !1,
  workInProgressRootIsPrerendering = !1,
  workInProgressRootDidAttachPingListener = !1,
  entangledRenderLanes = 0,
  workInProgressRootExitStatus = 0,
  workInProgressRootSkippedLanes = 0,
  workInProgressRootInterleavedUpdatedLanes = 0,
  workInProgressRootPingedLanes = 0,
  workInProgressDeferredLane = 0,
  workInProgressSuspendedRetryLanes = 0,
  workInProgressRootConcurrentErrors = null,
  workInProgressRootRecoverableErrors = null,
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1,
  globalMostRecentFallbackTime = 0,
  globalMostRecentTransitionTime = 0,
  workInProgressRootRenderTargetTime = Infinity,
  workInProgressTransitions = null,
  legacyErrorBoundariesThatAlreadyFailed = null,
  pendingEffectsStatus = 0,
  pendingEffectsRoot = null,
  pendingFinishedWork = null,
  pendingEffectsLanes = 0,
  pendingEffectsRemainingLanes = 0,
  pendingEffectsRenderEndTime = -0,
  pendingPassiveTransitions = null,
  pendingRecoverableErrors = null,
  pendingViewTransition = null,
  pendingViewTransitionEvents = null,
  pendingTransitionTypes = null,
  pendingSuspendedCommitReason = null,
  pendingDelayedCommitReason = 0,
  pendingSuspendedViewTransitionReason = null,
  nestedUpdateCount = 0,
  rootWithNestedUpdates = null;
function requestUpdateLane(fiber) {
  return 0 === (fiber.mode & 1)
    ? 2
    : 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes
      ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes
      : null !== ReactSharedInternals.T
        ? requestTransitionLane()
        : resolveUpdatePriority();
}
function requestDeferredLane() {
  if (0 === workInProgressDeferredLane)
    if (0 !== (workInProgressRootRenderLanes & 536870912))
      workInProgressDeferredLane = 536870912;
    else {
      var lane = nextTransitionDeferredLane;
      nextTransitionDeferredLane <<= 1;
      0 === (nextTransitionDeferredLane & 3932160) &&
        (nextTransitionDeferredLane = 262144);
      workInProgressDeferredLane = lane;
    }
  lane = suspenseHandlerStackCursor.current;
  null !== lane && (lane.flags |= 32);
  return workInProgressDeferredLane;
}
function scheduleViewTransitionEvent(fiber, callback) {
  if (null != callback) {
    var state = fiber.stateNode,
      instance = state.ref;
    null === instance &&
      (instance = state.ref =
        createViewTransitionInstance(
          getViewTransitionName(fiber.memoizedProps, state)
        ));
    null === pendingViewTransitionEvents && (pendingViewTransitionEvents = []);
    pendingViewTransitionEvents.push(callback.bind(null, instance));
  }
}
function scheduleUpdateOnFiber(root, fiber, lane) {
  if (
    (root === workInProgressRoot &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    prepareFreshStack(root, 0),
      markRootSuspended(
        root,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        !1
      );
  markRootUpdated$1(root, lane);
  if (0 === (executionContext & 2) || root !== workInProgressRoot)
    isDevToolsPresent && addFiberToLanesMap(root, fiber, lane),
      root === workInProgressRoot &&
        (0 === (executionContext & 2) &&
          (workInProgressRootInterleavedUpdatedLanes |= lane),
        4 === workInProgressRootExitStatus &&
          markRootSuspended(
            root,
            workInProgressRootRenderLanes,
            workInProgressDeferredLane,
            !1
          )),
      ensureRootIsScheduled(root),
      2 === lane &&
        0 === executionContext &&
        0 === (fiber.mode & 1) &&
        ((workInProgressRootRenderTargetTime = now$1() + 500),
        flushSyncWorkAcrossRoots_impl(0, !0));
}
function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
  if (0 !== (executionContext & 6))
    throw Error("Should not already be working.");
  if (0 !== workInProgressRootRenderLanes && null !== workInProgress) {
    var yieldEndTime = now$1();
    switch (yieldReason) {
      case 3:
      case 2:
        supportsUserTiming &&
          console.timeStamp(
            "Suspended",
            yieldStartTime,
            yieldEndTime,
            "Components \u269b",
            void 0,
            "primary-light"
          );
        break;
      case 9:
        supportsUserTiming &&
          console.timeStamp(
            "Action",
            yieldStartTime,
            yieldEndTime,
            "Components \u269b",
            void 0,
            "primary-light"
          );
        break;
      default:
        if (supportsUserTiming) {
          var yieldDuration = yieldEndTime - yieldStartTime;
          3 > yieldDuration ||
            console.timeStamp(
              "Blocked",
              yieldStartTime,
              yieldEndTime,
              "Components \u269b",
              void 0,
              5 > yieldDuration
                ? "primary-light"
                : 10 > yieldDuration
                  ? "primary"
                  : 100 > yieldDuration
                    ? "primary-dark"
                    : "error"
            );
        }
    }
  }
  var exitStatus = (yieldEndTime =
      (!forceSync &&
        0 === (lanes & 127) &&
        0 === (lanes & root$jscomp$0.expiredLanes)) ||
      checkIfRootIsPrerendering(root$jscomp$0, lanes))
      ? renderRootConcurrent(root$jscomp$0, lanes)
      : renderRootSync(root$jscomp$0, lanes, !0),
    renderWasConcurrent = yieldEndTime;
  do {
    if (0 === exitStatus) {
      workInProgressRootIsPrerendering &&
        !yieldEndTime &&
        markRootSuspended(root$jscomp$0, lanes, 0, !1);
      lanes = workInProgressSuspendedReason;
      yieldStartTime = now();
      yieldReason = lanes;
      break;
    } else {
      yieldDuration = now$1();
      forceSync = root$jscomp$0.current.alternate;
      if (
        renderWasConcurrent &&
        !isRenderConsistentWithExternalStores(forceSync)
      ) {
        setCurrentTrackFromLanes(lanes);
        !supportsUserTiming ||
          yieldDuration <= renderStartTime ||
          console.timeStamp(
            "Teared Render",
            renderStartTime,
            yieldDuration,
            currentTrack,
            "Scheduler \u269b",
            "error"
          );
        finalizeRender(lanes, yieldDuration);
        exitStatus = renderRootSync(root$jscomp$0, lanes, !1);
        renderWasConcurrent = !1;
        continue;
      }
      if (0 !== root$jscomp$0.tag && 2 === exitStatus) {
        renderWasConcurrent = lanes;
        if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
          var JSCompiler_inline_result = 0;
        else
          (JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913),
            (JSCompiler_inline_result =
              0 !== JSCompiler_inline_result
                ? JSCompiler_inline_result
                : JSCompiler_inline_result & 536870912
                  ? 536870912
                  : 0);
        if (0 !== JSCompiler_inline_result) {
          setCurrentTrackFromLanes(lanes);
          logErroredRenderPhase(renderStartTime, yieldDuration);
          finalizeRender(lanes, yieldDuration);
          lanes = JSCompiler_inline_result;
          var root = root$jscomp$0;
          yieldDuration = workInProgressRootConcurrentErrors;
          exitStatus = renderRootSync(root, JSCompiler_inline_result, !1);
          2 !== exitStatus &&
            6 !== exitStatus &&
            (workInProgressRootDidAttachPingListener
              ? ((root.errorRecoveryDisabledLanes |= renderWasConcurrent),
                (workInProgressRootInterleavedUpdatedLanes |=
                  renderWasConcurrent),
                (exitStatus = 4))
              : ((renderWasConcurrent = workInProgressRootRecoverableErrors),
                (workInProgressRootRecoverableErrors = yieldDuration),
                null !== renderWasConcurrent &&
                  ((yieldDuration = renderWasConcurrent),
                  null === workInProgressRootRecoverableErrors
                    ? (workInProgressRootRecoverableErrors = yieldDuration)
                    : workInProgressRootRecoverableErrors.push.apply(
                        workInProgressRootRecoverableErrors,
                        yieldDuration
                      ))));
          renderWasConcurrent = !1;
          if (2 !== exitStatus) continue;
          else yieldDuration = now$1();
        }
      }
      if (1 === exitStatus) {
        setCurrentTrackFromLanes(lanes);
        logErroredRenderPhase(renderStartTime, yieldDuration);
        finalizeRender(lanes, yieldDuration);
        prepareFreshStack(root$jscomp$0, 0);
        markRootSuspended(root$jscomp$0, lanes, 0, !0);
        break;
      }
      a: {
        yieldEndTime = root$jscomp$0;
        renderWasConcurrent = exitStatus;
        switch (renderWasConcurrent) {
          case 0:
          case 1:
            throw Error("Root did not complete. This is a bug in React.");
          case 4:
            if ((lanes & 4194048) !== lanes && (lanes & 62914560) !== lanes)
              break;
          case 6:
            setCurrentTrackFromLanes(lanes);
            logSuspendedRenderPhase(renderStartTime, yieldDuration, lanes);
            finalizeRender(lanes, yieldDuration);
            forceSync = lanes;
            0 !== (forceSync & 127)
              ? (blockingSuspendedTime = yieldDuration)
              : 0 !== (forceSync & 4194048) &&
                (transitionSuspendedTime = yieldDuration);
            markRootSuspended(
              yieldEndTime,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            break a;
          case 2:
            workInProgressRootRecoverableErrors = null;
            break;
          case 3:
          case 5:
            break;
          default:
            throw Error("Unknown root exit status.");
        }
        if (
          (lanes & 62914560) === lanes &&
          (alwaysThrottleRetries || 3 === renderWasConcurrent) &&
          ((exitStatus = globalMostRecentFallbackTime + 300 - now$1()),
          10 < exitStatus)
        ) {
          markRootSuspended(
            yieldEndTime,
            lanes,
            workInProgressDeferredLane,
            !workInProgressRootDidSkipSuspendedSiblings
          );
          if (0 !== getNextLanes(yieldEndTime, 0, !0)) break a;
          pendingEffectsLanes = lanes;
          yieldEndTime.timeoutHandle = scheduleTimeout(
            completeRootWhenReady.bind(
              null,
              yieldEndTime,
              forceSync,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions,
              workInProgressRootDidIncludeRecursiveRenderUpdate,
              lanes,
              workInProgressDeferredLane,
              workInProgressRootInterleavedUpdatedLanes,
              workInProgressSuspendedRetryLanes,
              workInProgressRootDidSkipSuspendedSiblings,
              renderWasConcurrent,
              "Throttled",
              renderStartTime,
              yieldDuration
            ),
            exitStatus
          );
          break a;
        }
        completeRootWhenReady(
          yieldEndTime,
          forceSync,
          workInProgressRootRecoverableErrors,
          workInProgressTransitions,
          workInProgressRootDidIncludeRecursiveRenderUpdate,
          lanes,
          workInProgressDeferredLane,
          workInProgressRootInterleavedUpdatedLanes,
          workInProgressSuspendedRetryLanes,
          workInProgressRootDidSkipSuspendedSiblings,
          renderWasConcurrent,
          null,
          renderStartTime,
          yieldDuration
        );
      }
    }
    break;
  } while (1);
  ensureRootIsScheduled(root$jscomp$0);
}
function completeRootWhenReady(
  root,
  finishedWork,
  recoverableErrors,
  transitions,
  didIncludeRenderPhaseUpdate,
  lanes,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes,
  didSkipSuspendedSiblings,
  exitStatus,
  suspendedCommitReason,
  completedRenderStartTime,
  completedRenderEndTime
) {
  root.timeoutHandle = -1;
  didIncludeRenderPhaseUpdate = finishedWork.subtreeFlags;
  didSkipSuspendedSiblings = (lanes & 335544064) === lanes;
  var suspendedState = null;
  if (
    didSkipSuspendedSiblings ||
    didIncludeRenderPhaseUpdate & 8192 ||
    16785408 === (didIncludeRenderPhaseUpdate & 16785408)
  )
    (appearingViewTransitions = suspendedState = null),
      accumulateSuspenseyCommitOnFiber(finishedWork),
      didSkipSuspendedSiblings &&
        null != fabricSuspendOnActiveViewTransition &&
        fabricSuspendOnActiveViewTransition(),
      (lanes & 62914560) === lanes
        ? globalMostRecentFallbackTime - now$1()
        : (lanes & 4194048) === lanes
          ? globalMostRecentTransitionTime - now$1()
          : 0;
  didIncludeRenderPhaseUpdate = suspendedState;
  root.cancelPendingCommit = null;
  do flushPendingEffects();
  while (0 !== pendingEffectsStatus);
  if (0 !== (executionContext & 6))
    throw Error("Should not already be working.");
  setCurrentTrackFromLanes(lanes);
  2 === exitStatus
    ? logErroredRenderPhase(completedRenderStartTime, completedRenderEndTime)
    : null !== recoverableErrors
      ? !supportsUserTiming ||
        completedRenderEndTime <= completedRenderStartTime ||
        console.timeStamp(
          "Recovered",
          completedRenderStartTime,
          completedRenderEndTime,
          currentTrack,
          "Scheduler \u269b",
          "error"
        )
      : !supportsUserTiming ||
        completedRenderEndTime <= completedRenderStartTime ||
        console.timeStamp(
          (lanes & 536870912) === lanes
            ? "Prepared"
            : (lanes & 201326741) === lanes
              ? "Hydrated"
              : "Render",
          completedRenderStartTime,
          completedRenderEndTime,
          currentTrack,
          "Scheduler \u269b",
          (lanes & 738197653) === lanes ? "tertiary-dark" : "primary-dark"
        );
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markCommitStarted &&
    injectedProfilingHooks.markCommitStarted(lanes);
  if (null === finishedWork) markCommitStopped();
  else {
    if (finishedWork === root.current)
      throw Error(
        "Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue."
      );
    root === workInProgressRoot &&
      ((workInProgress = workInProgressRoot = null),
      (workInProgressRootRenderLanes = 0));
    pendingFinishedWork = finishedWork;
    pendingEffectsRoot = root;
    pendingEffectsLanes = lanes;
    pendingPassiveTransitions = transitions;
    pendingRecoverableErrors = recoverableErrors;
    pendingEffectsRenderEndTime = completedRenderEndTime;
    pendingSuspendedCommitReason = suspendedCommitReason;
    pendingDelayedCommitReason = 0;
    pendingSuspendedViewTransitionReason = null;
    commitRoot(
      root,
      finishedWork,
      lanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didIncludeRenderPhaseUpdate,
      suspendedCommitReason,
      completedRenderEndTime
    );
  }
}
function isRenderConsistentWithExternalStores(finishedWork) {
  for (var node = finishedWork; ; ) {
    var tag = node.tag;
    if (
      (0 === tag || 11 === tag || 15 === tag) &&
      node.flags & 16384 &&
      ((tag = node.updateQueue),
      null !== tag && ((tag = tag.stores), null !== tag))
    )
      for (var i = 0; i < tag.length; i++) {
        var check = tag[i],
          getSnapshot = check.getSnapshot;
        check = check.value;
        try {
          if (!objectIs(getSnapshot(), check)) return !1;
        } catch (error) {
          return !1;
        }
      }
    tag = node.child;
    if (node.subtreeFlags & 16384 && null !== tag)
      (tag.return = node), (node = tag);
    else {
      if (node === finishedWork) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === finishedWork) return !0;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
  return !0;
}
function markRootSuspended(
  root,
  suspendedLanes,
  spawnedLane,
  didAttemptEntireTree
) {
  suspendedLanes &= ~workInProgressRootPingedLanes;
  suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
  root.suspendedLanes |= suspendedLanes;
  root.pingedLanes &= ~suspendedLanes;
  didAttemptEntireTree && (root.warmLanes |= suspendedLanes);
  didAttemptEntireTree = root.expirationTimes;
  for (var lanes = suspendedLanes; 0 < lanes; ) {
    var index$8 = 31 - clz32(lanes),
      lane = 1 << index$8;
    didAttemptEntireTree[index$8] = -1;
    lanes &= ~lane;
  }
  0 !== spawnedLane &&
    markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
}
function resetWorkInProgressStack() {
  if (null !== workInProgress) {
    if (0 === workInProgressSuspendedReason)
      var interruptedWork = workInProgress.return;
    else
      (interruptedWork = workInProgress),
        (lastContextDependency = currentlyRenderingFiber$1 = null),
        resetHooksOnUnwind(interruptedWork),
        (thenableState$1 = null),
        (thenableIndexCounter$1 = 0),
        (interruptedWork = workInProgress);
    for (; null !== interruptedWork; )
      unwindInterruptedWork(interruptedWork.alternate, interruptedWork),
        (interruptedWork = interruptedWork.return);
    workInProgress = null;
  }
}
function finalizeRender(lanes, finalizationTime) {
  0 !== (lanes & 127) && (blockingClampTime = finalizationTime);
  0 !== (lanes & 4194048) && (transitionClampTime = finalizationTime);
  0 !== (lanes & 62914560) && (retryClampTime = finalizationTime);
  0 !== (lanes & 2080374784) && (idleClampTime = finalizationTime);
}
function prepareFreshStack(root, lanes) {
  supportsUserTiming &&
    (console.timeStamp(
      "Blocking Track",
      0.003,
      0.003,
      "Blocking",
      "Scheduler \u269b",
      "primary-light"
    ),
    console.timeStamp(
      "Transition Track",
      0.003,
      0.003,
      "Transition",
      "Scheduler \u269b",
      "primary-light"
    ),
    console.timeStamp(
      "Suspense Track",
      0.003,
      0.003,
      "Suspense",
      "Scheduler \u269b",
      "primary-light"
    ),
    console.timeStamp(
      "Idle Track",
      0.003,
      0.003,
      "Idle",
      "Scheduler \u269b",
      "primary-light"
    ));
  var previousRenderStartTime = renderStartTime;
  renderStartTime = now();
  if (0 !== workInProgressRootRenderLanes && 0 < previousRenderStartTime) {
    setCurrentTrackFromLanes(workInProgressRootRenderLanes);
    if (
      3 === workInProgressRootExitStatus ||
      4 === workInProgressRootExitStatus
    )
      logSuspendedRenderPhase(previousRenderStartTime, renderStartTime, lanes);
    else {
      var endTime = renderStartTime;
      !supportsUserTiming ||
        endTime <= previousRenderStartTime ||
        console.timeStamp(
          (lanes & 536870912) === lanes
            ? "Prewarm"
            : (lanes & 201326741) === lanes
              ? "Interrupted Hydration"
              : "Interrupted Render",
          previousRenderStartTime,
          endTime,
          currentTrack,
          "Scheduler \u269b",
          (lanes & 738197653) === lanes ? "tertiary-dark" : "primary-dark"
        );
    }
    finalizeRender(workInProgressRootRenderLanes, renderStartTime);
  }
  if (0 !== (lanes & 127)) {
    previousRenderStartTime =
      0 <= blockingUpdateTime && blockingUpdateTime < blockingClampTime
        ? blockingClampTime
        : blockingUpdateTime;
    endTime =
      0 <= blockingEventTime && blockingEventTime < blockingClampTime
        ? blockingClampTime
        : blockingEventTime;
    var clampedRenderStartTime$171 =
      0 <= endTime
        ? endTime
        : 0 <= previousRenderStartTime
          ? previousRenderStartTime
          : renderStartTime;
    0 <= blockingSuspendedTime
      ? (setCurrentTrackFromLanes(2),
        logSuspendedWithDelayPhase(
          blockingSuspendedTime,
          clampedRenderStartTime$171,
          lanes
        ))
      : 0 !== (animatingLanes & 127) &&
        (setCurrentTrackFromLanes(2),
        logAnimatingPhase(blockingClampTime, clampedRenderStartTime$171));
    clampedRenderStartTime$171 = blockingEventType;
    var eventIsRepeat = 0 < blockingEventRepeatTime,
      isSpawnedUpdate = 1 === blockingUpdateType,
      isPingedUpdate = 2 === blockingUpdateType,
      renderStartTime$jscomp$0 = renderStartTime;
    supportsUserTiming &&
      ((currentTrack = "Blocking"),
      0 < previousRenderStartTime
        ? previousRenderStartTime > renderStartTime$jscomp$0 &&
          (previousRenderStartTime = renderStartTime$jscomp$0)
        : (previousRenderStartTime = renderStartTime$jscomp$0),
      0 < endTime
        ? endTime > previousRenderStartTime &&
          (endTime = previousRenderStartTime)
        : (endTime = previousRenderStartTime),
      null !== clampedRenderStartTime$171 &&
        previousRenderStartTime > endTime &&
        console.timeStamp(
          eventIsRepeat
            ? "Consecutive"
            : "Event: " + clampedRenderStartTime$171,
          endTime,
          previousRenderStartTime,
          currentTrack,
          "Scheduler \u269b",
          eventIsRepeat ? "secondary-light" : "warning"
        ),
      renderStartTime$jscomp$0 > previousRenderStartTime &&
        console.timeStamp(
          isPingedUpdate
            ? "Promise Resolved"
            : isSpawnedUpdate
              ? "Cascading Update"
              : 5 < renderStartTime$jscomp$0 - previousRenderStartTime
                ? "Update Blocked"
                : "Update",
          previousRenderStartTime,
          renderStartTime$jscomp$0,
          currentTrack,
          "Scheduler \u269b",
          isSpawnedUpdate
            ? "error"
            : (lanes & 738197653) === lanes
              ? "tertiary-light"
              : "primary-light"
        ));
    blockingUpdateTime = -1.1;
    blockingUpdateType = 0;
    blockingSuspendedTime = -1.1;
    blockingEventRepeatTime = blockingEventTime;
    blockingEventTime = -1.1;
    blockingClampTime = now();
  }
  0 !== (lanes & 4194048) &&
    ((previousRenderStartTime =
      0 <= transitionStartTime && transitionStartTime < transitionClampTime
        ? transitionClampTime
        : transitionStartTime),
    (endTime =
      0 <= transitionUpdateTime && transitionUpdateTime < transitionClampTime
        ? transitionClampTime
        : transitionUpdateTime),
    (clampedRenderStartTime$171 =
      0 <= transitionEventTime && transitionEventTime < transitionClampTime
        ? transitionClampTime
        : transitionEventTime),
    (eventIsRepeat =
      0 <= clampedRenderStartTime$171
        ? clampedRenderStartTime$171
        : 0 <= endTime
          ? endTime
          : renderStartTime),
    0 <= transitionSuspendedTime
      ? (setCurrentTrackFromLanes(256),
        logSuspendedWithDelayPhase(
          transitionSuspendedTime,
          eventIsRepeat,
          lanes
        ))
      : 0 !== (animatingLanes & 4194048) &&
        (setCurrentTrackFromLanes(256),
        logAnimatingPhase(transitionClampTime, eventIsRepeat)),
    (eventIsRepeat = transitionEventType),
    (isSpawnedUpdate = 0 < transitionEventRepeatTime),
    (isPingedUpdate = 2 === transitionUpdateType),
    (renderStartTime$jscomp$0 = renderStartTime),
    supportsUserTiming &&
      ((currentTrack = "Transition"),
      0 < endTime
        ? endTime > renderStartTime$jscomp$0 &&
          (endTime = renderStartTime$jscomp$0)
        : (endTime = renderStartTime$jscomp$0),
      0 < previousRenderStartTime
        ? previousRenderStartTime > endTime &&
          (previousRenderStartTime = endTime)
        : (previousRenderStartTime = endTime),
      0 < clampedRenderStartTime$171
        ? clampedRenderStartTime$171 > previousRenderStartTime &&
          (clampedRenderStartTime$171 = previousRenderStartTime)
        : (clampedRenderStartTime$171 = previousRenderStartTime),
      previousRenderStartTime > clampedRenderStartTime$171 &&
        null !== eventIsRepeat &&
        console.timeStamp(
          isSpawnedUpdate ? "Consecutive" : "Event: " + eventIsRepeat,
          clampedRenderStartTime$171,
          previousRenderStartTime,
          currentTrack,
          "Scheduler \u269b",
          isSpawnedUpdate ? "secondary-light" : "warning"
        ),
      endTime > previousRenderStartTime &&
        console.timeStamp(
          "Action",
          previousRenderStartTime,
          endTime,
          currentTrack,
          "Scheduler \u269b",
          "primary-dark"
        ),
      renderStartTime$jscomp$0 > endTime &&
        console.timeStamp(
          isPingedUpdate
            ? "Promise Resolved"
            : 5 < renderStartTime$jscomp$0 - endTime
              ? "Update Blocked"
              : "Update",
          endTime,
          renderStartTime$jscomp$0,
          currentTrack,
          "Scheduler \u269b",
          "primary-light"
        )),
    (transitionUpdateTime = transitionStartTime = -1.1),
    (transitionUpdateType = 0),
    (transitionSuspendedTime = -1.1),
    (transitionEventRepeatTime = transitionEventTime),
    (transitionEventTime = -1.1),
    (transitionClampTime = now()));
  0 !== (lanes & 62914560) &&
    0 !== (animatingLanes & 62914560) &&
    (setCurrentTrackFromLanes(4194304),
    logAnimatingPhase(retryClampTime, renderStartTime));
  0 !== (lanes & 2080374784) &&
    0 !== (animatingLanes & 2080374784) &&
    (setCurrentTrackFromLanes(268435456),
    logAnimatingPhase(idleClampTime, renderStartTime));
  previousRenderStartTime = root.timeoutHandle;
  -1 !== previousRenderStartTime &&
    ((root.timeoutHandle = -1), cancelTimeout(previousRenderStartTime));
  previousRenderStartTime = root.cancelPendingCommit;
  null !== previousRenderStartTime &&
    ((root.cancelPendingCommit = null), previousRenderStartTime());
  pendingEffectsLanes = 0;
  resetWorkInProgressStack();
  workInProgressRoot = root;
  workInProgress = previousRenderStartTime = createWorkInProgress(
    root.current,
    null
  );
  workInProgressRootRenderLanes = lanes;
  workInProgressSuspendedReason = 0;
  workInProgressThrownValue = null;
  workInProgressRootDidSkipSuspendedSiblings = !1;
  workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
  workInProgressRootDidAttachPingListener = !1;
  workInProgressSuspendedRetryLanes =
    workInProgressDeferredLane =
    workInProgressRootPingedLanes =
    workInProgressRootInterleavedUpdatedLanes =
    workInProgressRootSkippedLanes =
    workInProgressRootExitStatus =
      0;
  workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors =
    null;
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
  0 !== (lanes & 8) && (lanes |= lanes & 32);
  endTime = root.entangledLanes;
  if (0 !== endTime)
    for (root = root.entanglements, endTime &= lanes; 0 < endTime; )
      (clampedRenderStartTime$171 = 31 - clz32(endTime)),
        (eventIsRepeat = 1 << clampedRenderStartTime$171),
        (lanes |= root[clampedRenderStartTime$171]),
        (endTime &= ~eventIsRepeat);
  entangledRenderLanes = lanes;
  finishQueueingConcurrentUpdates();
  return previousRenderStartTime;
}
function handleThrow(root, thrownValue) {
  currentlyRenderingFiber = null;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  thrownValue === SuspenseException || thrownValue === SuspenseActionException
    ? ((thrownValue = getSuspendedThenable()),
      (workInProgressSuspendedReason = 3))
    : thrownValue === SuspenseyCommitException
      ? ((thrownValue = getSuspendedThenable()),
        (workInProgressSuspendedReason = 4))
      : (workInProgressSuspendedReason =
          thrownValue === SelectiveHydrationException
            ? 8
            : null !== thrownValue &&
                "object" === typeof thrownValue &&
                "function" === typeof thrownValue.then
              ? 6
              : 1);
  workInProgressThrownValue = thrownValue;
  var erroredWork = workInProgress;
  if (null === erroredWork)
    (workInProgressRootExitStatus = 1),
      logUncaughtError(
        root,
        createCapturedValueAtFiber(thrownValue, root.current)
      );
  else
    switch (
      (erroredWork.mode & 2 &&
        stopProfilerTimerIfRunningAndRecordDuration(erroredWork),
      markComponentRenderStopped(),
      workInProgressSuspendedReason)
    ) {
      case 1:
        null !== injectedProfilingHooks &&
          "function" === typeof injectedProfilingHooks.markComponentErrored &&
          injectedProfilingHooks.markComponentErrored(
            erroredWork,
            thrownValue,
            workInProgressRootRenderLanes
          );
        break;
      case 2:
      case 9:
      case 3:
      case 6:
      case 7:
        null !== injectedProfilingHooks &&
          "function" === typeof injectedProfilingHooks.markComponentSuspended &&
          injectedProfilingHooks.markComponentSuspended(
            erroredWork,
            thrownValue,
            workInProgressRootRenderLanes
          );
    }
}
function pushDispatcher() {
  var prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
}
function pushAsyncDispatcher() {
  var prevAsyncDispatcher = ReactSharedInternals.A;
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  return prevAsyncDispatcher;
}
function renderDidSuspendDelayIfPossible() {
  workInProgressRootExitStatus = 4;
  workInProgressRootDidSkipSuspendedSiblings ||
    ((workInProgressRootRenderLanes & 4194048) !==
      workInProgressRootRenderLanes &&
      null !== suspenseHandlerStackCursor.current) ||
    (workInProgressRootIsPrerendering = !0);
  (0 === (workInProgressRootSkippedLanes & 134217727) &&
    0 === (workInProgressRootInterleavedUpdatedLanes & 134217727)) ||
    null === workInProgressRoot ||
    markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      !1
    );
}
function renderRootSync(root, lanes, shouldYieldForPrerendering) {
  var prevExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher = pushDispatcher(),
    prevAsyncDispatcher = pushAsyncDispatcher();
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    if (isDevToolsPresent) {
      var memoizedUpdaters = root.memoizedUpdaters;
      0 < memoizedUpdaters.size &&
        (restorePendingUpdaters(root, workInProgressRootRenderLanes),
        memoizedUpdaters.clear());
      movePendingFibersToMemoized(root, lanes);
    }
    workInProgressTransitions = null;
    prepareFreshStack(root, lanes);
  }
  markRenderStarted(lanes);
  lanes = !1;
  memoizedUpdaters = workInProgressRootExitStatus;
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        var unitOfWork = workInProgress,
          thrownValue = workInProgressThrownValue;
        switch (workInProgressSuspendedReason) {
          case 8:
            resetWorkInProgressStack();
            memoizedUpdaters = 6;
            break a;
          case 3:
          case 2:
          case 9:
          case 6:
            null === suspenseHandlerStackCursor.current && (lanes = !0);
            var reason = workInProgressSuspendedReason;
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
            if (
              shouldYieldForPrerendering &&
              workInProgressRootIsPrerendering
            ) {
              memoizedUpdaters = 0;
              break a;
            }
            break;
          default:
            (reason = workInProgressSuspendedReason),
              (workInProgressSuspendedReason = 0),
              (workInProgressThrownValue = null),
              throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
        }
      }
      workLoopSync();
      memoizedUpdaters = workInProgressRootExitStatus;
      break;
    } catch (thrownValue$176) {
      handleThrow(root, thrownValue$176);
    }
  while (1);
  lanes && root.shellSuspendCounter++;
  lastContextDependency = currentlyRenderingFiber$1 = null;
  executionContext = prevExecutionContext;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  markRenderStopped();
  null === workInProgress &&
    ((workInProgressRoot = null),
    (workInProgressRootRenderLanes = 0),
    finishQueueingConcurrentUpdates());
  return memoizedUpdaters;
}
function workLoopSync() {
  for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
}
function renderRootConcurrent(root, lanes) {
  var prevExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher = pushDispatcher(),
    prevAsyncDispatcher = pushAsyncDispatcher();
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    if (isDevToolsPresent) {
      var memoizedUpdaters = root.memoizedUpdaters;
      0 < memoizedUpdaters.size &&
        (restorePendingUpdaters(root, workInProgressRootRenderLanes),
        memoizedUpdaters.clear());
      movePendingFibersToMemoized(root, lanes);
    }
    workInProgressTransitions = null;
    workInProgressRootRenderTargetTime = now$1() + 500;
    prepareFreshStack(root, lanes);
  } else
    workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
  markRenderStarted(lanes);
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress)
        b: switch (
          ((lanes = workInProgress),
          (memoizedUpdaters = workInProgressThrownValue),
          workInProgressSuspendedReason)
        ) {
          case 1:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, 1);
            break;
          case 2:
          case 9:
            if (isThenableResolved(memoizedUpdaters)) {
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              replaySuspendedUnitOfWork(lanes);
              break;
            }
            lanes = function () {
              (2 !== workInProgressSuspendedReason &&
                9 !== workInProgressSuspendedReason) ||
                workInProgressRoot !== root ||
                (workInProgressSuspendedReason = 7);
              ensureRootIsScheduled(root);
            };
            memoizedUpdaters.then(lanes, lanes);
            break a;
          case 3:
            workInProgressSuspendedReason = 7;
            break a;
          case 4:
            workInProgressSuspendedReason = 5;
            break a;
          case 7:
            isThenableResolved(memoizedUpdaters)
              ? ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                replaySuspendedUnitOfWork(lanes))
              : ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, 7));
            break;
          case 5:
            var resource = null;
            switch (workInProgress.tag) {
              case 26:
                resource = workInProgress.memoizedState;
              case 5:
              case 27:
                var hostFiber = workInProgress;
                if (resource ? shim(resource) : 1) {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  var sibling = hostFiber.sibling;
                  if (null !== sibling) workInProgress = sibling;
                  else {
                    var returnFiber = hostFiber.return;
                    null !== returnFiber
                      ? ((workInProgress = returnFiber),
                        completeUnitOfWork(returnFiber))
                      : (workInProgress = null);
                  }
                  break b;
                }
            }
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, 5);
            break;
          case 6:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, 6);
            break;
          case 8:
            resetWorkInProgressStack();
            workInProgressRootExitStatus = 6;
            break a;
          default:
            throw Error("Unexpected SuspendedReason. This is a bug in React.");
        }
      workLoopConcurrentByScheduler();
      break;
    } catch (thrownValue$178) {
      handleThrow(root, thrownValue$178);
    }
  while (1);
  lastContextDependency = currentlyRenderingFiber$1 = null;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  executionContext = prevExecutionContext;
  if (null !== workInProgress)
    return (
      null !== injectedProfilingHooks &&
        "function" === typeof injectedProfilingHooks.markRenderYielded &&
        injectedProfilingHooks.markRenderYielded(),
      0
    );
  markRenderStopped();
  workInProgressRoot = null;
  workInProgressRootRenderLanes = 0;
  finishQueueingConcurrentUpdates();
  return workInProgressRootExitStatus;
}
function workLoopConcurrentByScheduler() {
  for (; null !== workInProgress && !shouldYield(); )
    performUnitOfWork(workInProgress);
}
function performUnitOfWork(unitOfWork) {
  var current = unitOfWork.alternate;
  0 !== (unitOfWork.mode & 2)
    ? (startProfilerTimer(unitOfWork),
      (current = beginWork(current, unitOfWork, entangledRenderLanes)),
      stopProfilerTimerIfRunningAndRecordDuration(unitOfWork))
    : (current = beginWork(current, unitOfWork, entangledRenderLanes));
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === current
    ? completeUnitOfWork(unitOfWork)
    : (workInProgress = current);
}
function replaySuspendedUnitOfWork(unitOfWork) {
  var next = unitOfWork;
  var current = next.alternate,
    isProfilingMode = 0 !== (next.mode & 2);
  isProfilingMode && startProfilerTimer(next);
  switch (next.tag) {
    case 15:
    case 0:
      var Component = next.type;
      var context = isContextProvider(Component)
        ? previousContext
        : contextStackCursor$1.current;
      context = getMaskedContext(next, context);
      current = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        Component,
        context,
        workInProgressRootRenderLanes
      );
      break;
    case 11:
      current = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        next.type.render,
        next.ref,
        workInProgressRootRenderLanes
      );
      break;
    case 5:
      resetHooksOnUnwind(next);
    default:
      unwindInterruptedWork(current, next),
        (next = workInProgress =
          resetWorkInProgress(next, entangledRenderLanes)),
        (current = beginWork(current, next, entangledRenderLanes));
  }
  isProfilingMode && stopProfilerTimerIfRunningAndRecordDuration(next);
  next = current;
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
}
function throwAndUnwindWorkLoop(
  root,
  unitOfWork,
  thrownValue,
  suspendedReason
) {
  lastContextDependency = currentlyRenderingFiber$1 = null;
  resetHooksOnUnwind(unitOfWork);
  thenableState$1 = null;
  thenableIndexCounter$1 = 0;
  var returnFiber = unitOfWork.return;
  try {
    if (
      throwException(
        root,
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )
    ) {
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root,
        createCapturedValueAtFiber(thrownValue, root.current)
      );
      workInProgress = null;
      return;
    }
  } catch (error) {
    if (null !== returnFiber) throw ((workInProgress = returnFiber), error);
    workInProgressRootExitStatus = 1;
    logUncaughtError(
      root,
      createCapturedValueAtFiber(thrownValue, root.current)
    );
    workInProgress = null;
    return;
  }
  if (unitOfWork.flags & 32768) {
    if (1 === suspendedReason) root = !0;
    else if (
      workInProgressRootIsPrerendering ||
      0 !== (workInProgressRootRenderLanes & 536870912)
    )
      root = !1;
    else if (
      ((workInProgressRootDidSkipSuspendedSiblings = root = !0),
      2 === suspendedReason ||
        9 === suspendedReason ||
        3 === suspendedReason ||
        6 === suspendedReason)
    )
      (suspendedReason = suspenseHandlerStackCursor.current),
        null !== suspendedReason &&
          13 === suspendedReason.tag &&
          (suspendedReason.flags |= 16384);
    unwindUnitOfWork(unitOfWork, root);
  } else completeUnitOfWork(unitOfWork);
}
function completeUnitOfWork(unitOfWork) {
  var completedWork = unitOfWork;
  do {
    if (0 !== (completedWork.flags & 32768)) {
      unwindUnitOfWork(
        completedWork,
        workInProgressRootDidSkipSuspendedSiblings
      );
      return;
    }
    var current = completedWork.alternate;
    unitOfWork = completedWork.return;
    startProfilerTimer(completedWork);
    current = completeWork(current, completedWork, entangledRenderLanes);
    0 !== (completedWork.mode & 2) &&
      stopProfilerTimerIfRunningAndRecordIncompleteDuration(completedWork);
    if (null !== current) {
      workInProgress = current;
      return;
    }
    completedWork = completedWork.sibling;
    if (null !== completedWork) {
      workInProgress = completedWork;
      return;
    }
    workInProgress = completedWork = unitOfWork;
  } while (null !== completedWork);
  0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
}
function unwindUnitOfWork(unitOfWork, skipSiblings) {
  do {
    var next = unwindWork(unitOfWork.alternate, unitOfWork);
    if (null !== next) {
      next.flags &= 32767;
      workInProgress = next;
      return;
    }
    if (0 !== (unitOfWork.mode & 2)) {
      stopProfilerTimerIfRunningAndRecordIncompleteDuration(unitOfWork);
      next = unitOfWork.actualDuration;
      for (var child = unitOfWork.child; null !== child; )
        (next += child.actualDuration), (child = child.sibling);
      unitOfWork.actualDuration = next;
    }
    next = unitOfWork.return;
    null !== next &&
      ((next.flags |= 32768), (next.subtreeFlags = 0), (next.deletions = null));
    if (
      !skipSiblings &&
      ((unitOfWork = unitOfWork.sibling), null !== unitOfWork)
    ) {
      workInProgress = unitOfWork;
      return;
    }
    workInProgress = unitOfWork = next;
  } while (null !== unitOfWork);
  workInProgressRootExitStatus = 6;
  workInProgress = null;
}
function commitRoot(
  root,
  finishedWork,
  lanes,
  spawnedLane,
  updatedLanes,
  suspendedRetryLanes,
  suspendedState,
  suspendedCommitReason,
  completedRenderEndTime
) {
  var remainingLanes = finishedWork.lanes | finishedWork.childLanes;
  pendingEffectsRemainingLanes = remainingLanes;
  remainingLanes |= concurrentlyUpdatedLanes;
  markRootFinished(
    root,
    lanes,
    remainingLanes,
    spawnedLane,
    updatedLanes,
    suspendedRetryLanes
  );
  pendingViewTransitionEvents = null;
  (lanes & 335544064) === lanes
    ? ((pendingTransitionTypes = claimQueuedTransitionTypes(root)),
      (spawnedLane = 10262))
    : ((pendingTransitionTypes = null), (spawnedLane = 10256));
  0 !== finishedWork.actualDuration ||
  0 !== (finishedWork.subtreeFlags & spawnedLane) ||
  0 !== (finishedWork.flags & spawnedLane)
    ? ((root.callbackNode = null),
      (root.callbackPriority = 0),
      scheduleCallback(NormalPriority$1, function () {
        schedulerEvent = global.event;
        0 === pendingDelayedCommitReason && (pendingDelayedCommitReason = 2);
        flushPassiveEffects();
        return null;
      }))
    : ((root.callbackNode = null), (root.callbackPriority = 0));
  commitErrors = null;
  commitStartTime = now();
  null !== suspendedCommitReason &&
    (!supportsUserTiming ||
      commitStartTime <= completedRenderEndTime ||
      console.timeStamp(
        suspendedCommitReason,
        completedRenderEndTime,
        commitStartTime,
        currentTrack,
        "Scheduler \u269b",
        "secondary-light"
      ));
  shouldStartViewTransition = !1;
  suspendedCommitReason =
    0 !== (finishedWork.flags & (BeforeMutationMask | 13878));
  if (
    0 !== (finishedWork.subtreeFlags & (BeforeMutationMask | 13878)) ||
    suspendedCommitReason
  ) {
    suspendedCommitReason = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    completedRenderEndTime = currentUpdatePriority;
    currentUpdatePriority = 2;
    spawnedLane = executionContext;
    executionContext |= 4;
    try {
      commitBeforeMutationEffects(root, finishedWork, lanes);
    } finally {
      (executionContext = spawnedLane),
        (currentUpdatePriority = completedRenderEndTime),
        (ReactSharedInternals.T = suspendedCommitReason);
    }
  }
  pendingEffectsStatus = 1;
  shouldStartViewTransition
    ? ((animatingLanes |= lanes),
      (pendingViewTransition = startViewTransition(
        suspendedState,
        root.containerInfo,
        pendingTransitionTypes,
        flushMutationEffects,
        flushLayoutEffects,
        flushAfterMutationEffects,
        flushSpawnedWork,
        flushPassiveEffects,
        reportViewTransitionError,
        suspendedViewTransition,
        finishedViewTransition.bind(null, lanes)
      )))
    : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
}
function reportViewTransitionError(error) {
  if (0 !== pendingEffectsStatus) {
    var onRecoverableError = pendingEffectsRoot.onRecoverableError;
    onRecoverableError(error, { componentStack: null });
  }
}
function suspendedViewTransition(reason) {
  commitEndTime = now();
  logCommitPhase(
    null === pendingSuspendedCommitReason
      ? pendingEffectsRenderEndTime
      : commitStartTime,
    commitEndTime,
    commitErrors,
    1 === pendingDelayedCommitReason
  );
  pendingSuspendedCommitReason = pendingSuspendedViewTransitionReason = reason;
}
function finishedViewTransition(lanes) {
  0 !== (animatingLanes & lanes) &&
    ((animatingLanes &= ~lanes),
    0 !== (lanes & 4194048) &&
      0 === (workInProgressRootRenderLanes & 4194048) &&
      0 === (pendingEffectsLanes & 4194048) &&
      (setCurrentTrackFromLanes(256),
      logAnimatingPhase(transitionClampTime, now$1())),
    0 !== (lanes & 62914560) &&
      0 === (workInProgressRootRenderLanes & 62914560) &&
      0 === (pendingEffectsLanes & 62914560) &&
      (setCurrentTrackFromLanes(4194304),
      logAnimatingPhase(retryClampTime, now$1())),
    0 !== (lanes & 2080374784) &&
      0 === (workInProgressRootRenderLanes & 2080374784) &&
      0 === (pendingEffectsLanes & 2080374784) &&
      (setCurrentTrackFromLanes(268435456),
      logAnimatingPhase(idleClampTime, now$1())));
}
function flushAfterMutationEffects() {
  3 === pendingEffectsStatus &&
    ((pendingEffectsStatus = 0),
    commitAfterMutationEffectsOnFiber(pendingFinishedWork, pendingEffectsRoot),
    (pendingEffectsStatus = 4));
}
function flushMutationEffects() {
  if (1 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
      rootMutationHasEffect = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      try {
        (inProgressLanes = lanes),
          (inProgressRoot = root),
          resetComponentEffectTimers(),
          commitMutationEffectsOnFiber(finishedWork, root, lanes),
          (inProgressRoot = inProgressLanes = null);
      } finally {
        (executionContext = prevExecutionContext),
          (currentUpdatePriority = previousPriority),
          (ReactSharedInternals.T = rootMutationHasEffect);
      }
    }
    root.current = finishedWork;
    pendingEffectsStatus = 2;
  }
}
function flushLayoutEffects() {
  if (2 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var suspendedViewTransitionReason = pendingSuspendedViewTransitionReason;
    null !== suspendedViewTransitionReason &&
      ((commitStartTime = now()),
      !supportsUserTiming ||
        commitStartTime <= commitEndTime ||
        console.timeStamp(
          suspendedViewTransitionReason,
          commitEndTime,
          commitStartTime,
          currentTrack,
          "Scheduler \u269b",
          "secondary-light"
        ));
    suspendedViewTransitionReason = pendingEffectsRoot;
    var finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      cleanUpIndicator = suspendedViewTransitionReason.pendingIndicator;
    if (
      null !== cleanUpIndicator &&
      0 === suspendedViewTransitionReason.indicatorLanes
    ) {
      var prevTransition = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      suspendedViewTransitionReason.pendingIndicator = null;
      try {
        cleanUpIndicator();
      } catch (x) {
        reportGlobalError(x);
      } finally {
        (executionContext = prevExecutionContext),
          (currentUpdatePriority = previousPriority),
          (ReactSharedInternals.T = prevTransition);
      }
    }
    cleanUpIndicator = 0 !== (finishedWork.flags & 8772);
    if (0 !== (finishedWork.subtreeFlags & 8772) || cleanUpIndicator) {
      cleanUpIndicator = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      prevTransition = currentUpdatePriority;
      currentUpdatePriority = 2;
      previousPriority = executionContext;
      executionContext |= 4;
      try {
        null !== injectedProfilingHooks &&
          "function" ===
            typeof injectedProfilingHooks.markLayoutEffectsStarted &&
          injectedProfilingHooks.markLayoutEffectsStarted(lanes),
          (inProgressLanes = lanes),
          (inProgressRoot = suspendedViewTransitionReason),
          resetComponentEffectTimers(),
          commitLayoutEffectOnFiber(
            suspendedViewTransitionReason,
            finishedWork.alternate,
            finishedWork
          ),
          (inProgressRoot = inProgressLanes = null),
          null !== injectedProfilingHooks &&
            "function" ===
              typeof injectedProfilingHooks.markLayoutEffectsStopped &&
            injectedProfilingHooks.markLayoutEffectsStopped();
      } finally {
        (executionContext = previousPriority),
          (currentUpdatePriority = prevTransition),
          (ReactSharedInternals.T = cleanUpIndicator);
      }
    }
    suspendedViewTransitionReason = pendingEffectsRenderEndTime;
    finishedWork = pendingSuspendedCommitReason;
    commitEndTime = now();
    logCommitPhase(
      null === finishedWork ? suspendedViewTransitionReason : commitStartTime,
      commitEndTime,
      commitErrors,
      1 === pendingDelayedCommitReason
    );
    pendingEffectsStatus = 3;
  }
}
function flushSpawnedWork() {
  if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
    if (4 === pendingEffectsStatus) {
      var startViewTransitionStartTime = commitEndTime;
      commitEndTime = now();
      var abortedViewTransition = 1 === pendingDelayedCommitReason;
      !supportsUserTiming ||
        commitEndTime <= startViewTransitionStartTime ||
        console.timeStamp(
          abortedViewTransition
            ? "Interrupted View Transition"
            : "Starting Animation",
          startViewTransitionStartTime,
          commitEndTime,
          currentTrack,
          "Scheduler \u269b",
          abortedViewTransition ? " error" : "secondary-light"
        );
      1 !== pendingDelayedCommitReason && (pendingDelayedCommitReason = 3);
    }
    pendingEffectsStatus = 0;
    startViewTransitionStartTime = pendingViewTransition;
    pendingViewTransition = null;
    requestPaint();
    abortedViewTransition = pendingEffectsRoot;
    var finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      recoverableErrors = pendingRecoverableErrors,
      passiveSubtreeMask = (lanes & 335544064) === lanes ? 10262 : 10256;
    (passiveSubtreeMask =
      0 !== finishedWork.actualDuration ||
      0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) ||
      0 !== (finishedWork.flags & passiveSubtreeMask))
      ? (pendingEffectsStatus = 5)
      : ((pendingEffectsStatus = 0),
        (pendingFinishedWork = pendingEffectsRoot = null),
        releaseRootPooledCache(
          abortedViewTransition,
          abortedViewTransition.pendingLanes
        ));
    var remainingLanes = abortedViewTransition.pendingLanes;
    0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
    remainingLanes = lanesToEventPriority(lanes);
    finishedWork = finishedWork.stateNode;
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        var didError = 128 === (finishedWork.current.flags & 128);
        switch (remainingLanes) {
          case 2:
            var schedulerPriority = ImmediatePriority;
            break;
          case 8:
            schedulerPriority = UserBlockingPriority;
            break;
          case 32:
            schedulerPriority = NormalPriority$1;
            break;
          case 268435456:
            schedulerPriority = IdlePriority;
            break;
          default:
            schedulerPriority = NormalPriority$1;
        }
        injectedHook.onCommitFiberRoot(
          rendererID,
          finishedWork,
          schedulerPriority,
          didError
        );
      } catch (err) {}
    isDevToolsPresent && abortedViewTransition.memoizedUpdaters.clear();
    if (null !== recoverableErrors) {
      didError = ReactSharedInternals.T;
      schedulerPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      ReactSharedInternals.T = null;
      try {
        var onRecoverableError = abortedViewTransition.onRecoverableError;
        for (
          finishedWork = 0;
          finishedWork < recoverableErrors.length;
          finishedWork++
        ) {
          var recoverableError = recoverableErrors[finishedWork];
          onRecoverableError(recoverableError.value, {
            componentStack: recoverableError.stack
          });
        }
      } finally {
        (ReactSharedInternals.T = didError),
          (currentUpdatePriority = schedulerPriority);
      }
    }
    onRecoverableError = pendingViewTransitionEvents;
    recoverableError = pendingTransitionTypes;
    pendingTransitionTypes = null;
    if (
      null !== onRecoverableError &&
      ((pendingViewTransitionEvents = null),
      null === recoverableError && (recoverableError = []),
      null !== startViewTransitionStartTime)
    )
      for (
        recoverableErrors = 0;
        recoverableErrors < onRecoverableError.length;
        recoverableErrors++
      )
        (didError = (0, onRecoverableError[recoverableErrors])(
          recoverableError
        )),
          void 0 !== didError &&
            startViewTransitionStartTime.finished.finally(didError);
    0 !== (pendingEffectsLanes & 3) &&
      0 !== abortedViewTransition.tag &&
      flushPendingEffects();
    ensureRootIsScheduled(abortedViewTransition);
    remainingLanes = abortedViewTransition.pendingLanes;
    0 !== (lanes & 261930) && 0 !== (remainingLanes & 42)
      ? ((nestedUpdateScheduled = !0),
        abortedViewTransition === rootWithNestedUpdates
          ? nestedUpdateCount++
          : ((nestedUpdateCount = 0),
            (rootWithNestedUpdates = abortedViewTransition)))
      : ((nestedUpdateCount = 0), (rootWithNestedUpdates = null));
    passiveSubtreeMask || finalizeRender(lanes, commitEndTime);
    flushSyncWorkAcrossRoots_impl(0, !1);
    markCommitStopped();
  }
}
function releaseRootPooledCache(root, remainingLanes) {
  0 === (root.pooledCacheLanes &= remainingLanes) &&
    ((remainingLanes = root.pooledCache),
    null != remainingLanes &&
      ((root.pooledCache = null), releaseCache(remainingLanes)));
}
function flushPendingEffects() {
  null !== pendingViewTransition &&
    ((pendingViewTransition = null), (pendingDelayedCommitReason = 1));
  flushMutationEffects();
  flushLayoutEffects();
  flushSpawnedWork();
  return flushPassiveEffects();
}
function flushPassiveEffects() {
  if (5 !== pendingEffectsStatus) return !1;
  var root = pendingEffectsRoot,
    remainingLanes = pendingEffectsRemainingLanes;
  pendingEffectsRemainingLanes = 0;
  var renderPriority = lanesToEventPriority(pendingEffectsLanes),
    prevTransition = ReactSharedInternals.T,
    previousPriority = currentUpdatePriority;
  try {
    currentUpdatePriority = 32 > renderPriority ? 32 : renderPriority;
    ReactSharedInternals.T = null;
    var transitions = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    renderPriority = pendingEffectsRoot;
    var lanes = pendingEffectsLanes;
    pendingEffectsStatus = 0;
    pendingFinishedWork = pendingEffectsRoot = null;
    pendingEffectsLanes = 0;
    if (0 !== (executionContext & 6))
      throw Error("Cannot flush passive effects while already rendering.");
    setCurrentTrackFromLanes(lanes);
    var passiveEffectStartTime = 0;
    commitErrors = null;
    passiveEffectStartTime = now$1();
    3 === pendingDelayedCommitReason
      ? logAnimatingPhase(commitEndTime, passiveEffectStartTime)
      : !supportsUserTiming ||
        passiveEffectStartTime <= commitEndTime ||
        console.timeStamp(
          2 === pendingDelayedCommitReason ? "Waiting for Paint" : "Waiting",
          commitEndTime,
          passiveEffectStartTime,
          currentTrack,
          "Scheduler \u269b",
          "secondary-light"
        );
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markPassiveEffectsStarted &&
      injectedProfilingHooks.markPassiveEffectsStarted(lanes);
    var prevExecutionContext = executionContext;
    executionContext |= 4;
    var finishedWork = renderPriority.current;
    resetComponentEffectTimers();
    commitPassiveUnmountOnFiber(finishedWork);
    var finishedWork$jscomp$0 = renderPriority.current;
    finishedWork = pendingEffectsRenderEndTime;
    resetComponentEffectTimers();
    commitPassiveMountOnFiber(
      renderPriority,
      finishedWork$jscomp$0,
      lanes,
      transitions,
      finishedWork
    );
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markPassiveEffectsStopped &&
      injectedProfilingHooks.markPassiveEffectsStopped();
    executionContext = prevExecutionContext;
    var passiveEffectsEndTime = now$1();
    finishedWork$jscomp$0 = passiveEffectStartTime;
    null !== commitErrors
      ? logCommitErrored(finishedWork$jscomp$0, passiveEffectsEndTime)
      : !supportsUserTiming ||
        passiveEffectsEndTime <= finishedWork$jscomp$0 ||
        console.timeStamp(
          "Remaining Effects",
          finishedWork$jscomp$0,
          passiveEffectsEndTime,
          currentTrack,
          "Scheduler \u269b",
          "secondary-dark"
        );
    finalizeRender(lanes, passiveEffectsEndTime);
    flushSyncWorkAcrossRoots_impl(0, !1);
    if (
      injectedHook &&
      "function" === typeof injectedHook.onPostCommitFiberRoot
    )
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, renderPriority);
      } catch (err) {}
    var stateNode = renderPriority.current.stateNode;
    stateNode.effectDuration = 0;
    stateNode.passiveEffectDuration = 0;
    return !0;
  } finally {
    (currentUpdatePriority = previousPriority),
      (ReactSharedInternals.T = prevTransition),
      releaseRootPooledCache(root, remainingLanes);
  }
}
function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
  sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
  recordEffectError(sourceFiber);
  sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
  rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
  null !== rootFiber &&
    (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
}
function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
  if (3 === sourceFiber.tag)
    captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
  else
    for (; null !== nearestMountedAncestor; ) {
      if (3 === nearestMountedAncestor.tag) {
        captureCommitPhaseErrorOnRoot(
          nearestMountedAncestor,
          sourceFiber,
          error
        );
        break;
      } else if (1 === nearestMountedAncestor.tag) {
        var instance = nearestMountedAncestor.stateNode;
        if (
          "function" ===
            typeof nearestMountedAncestor.type.getDerivedStateFromError ||
          ("function" === typeof instance.componentDidCatch &&
            (null === legacyErrorBoundariesThatAlreadyFailed ||
              !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
        ) {
          sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
          recordEffectError(sourceFiber);
          error = createClassErrorUpdate(2);
          instance = enqueueUpdate(nearestMountedAncestor, error, 2);
          null !== instance &&
            (initializeClassErrorUpdate(
              error,
              instance,
              nearestMountedAncestor,
              sourceFiber
            ),
            markRootUpdated$1(instance, 2),
            ensureRootIsScheduled(instance));
          break;
        }
      }
      nearestMountedAncestor = nearestMountedAncestor.return;
    }
}
function attachPingListener(root, wakeable, lanes) {
  var pingCache = root.pingCache;
  if (null === pingCache) {
    pingCache = root.pingCache = new PossiblyWeakMap();
    var threadIDs = new Set();
    pingCache.set(wakeable, threadIDs);
  } else
    (threadIDs = pingCache.get(wakeable)),
      void 0 === threadIDs &&
        ((threadIDs = new Set()), pingCache.set(wakeable, threadIDs));
  threadIDs.has(lanes) ||
    ((workInProgressRootDidAttachPingListener = !0),
    threadIDs.add(lanes),
    (pingCache = pingSuspendedRoot.bind(null, root, wakeable, lanes)),
    isDevToolsPresent && restorePendingUpdaters(root, lanes),
    wakeable.then(pingCache, pingCache));
}
function pingSuspendedRoot(root, wakeable, pingedLanes) {
  var pingCache = root.pingCache;
  null !== pingCache && pingCache.delete(wakeable);
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
  root.warmLanes &= ~pingedLanes;
  0 !== (pingedLanes & 127)
    ? 0 > blockingUpdateTime &&
      ((blockingClampTime = blockingUpdateTime = now()),
      (blockingUpdateType = 2))
    : 0 !== (pingedLanes & 4194048) &&
      0 > transitionUpdateTime &&
      ((transitionClampTime = transitionUpdateTime = now()),
      (transitionUpdateType = 2));
  workInProgressRoot === root &&
    (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
    (4 === workInProgressRootExitStatus ||
    (3 === workInProgressRootExitStatus &&
      (workInProgressRootRenderLanes & 62914560) ===
        workInProgressRootRenderLanes &&
      300 > now$1() - globalMostRecentFallbackTime)
      ? 0 === (executionContext & 2)
        ? prepareFreshStack(root, 0)
        : (workInProgressRootPingedLanes |= pingedLanes)
      : (workInProgressRootPingedLanes |= pingedLanes),
    workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes &&
      (workInProgressSuspendedRetryLanes = 0));
  ensureRootIsScheduled(root);
}
function retryTimedOutBoundary(boundaryFiber, retryLane) {
  0 === retryLane &&
    (retryLane = 0 === (boundaryFiber.mode & 1) ? 2 : claimNextRetryLane());
  boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
  null !== boundaryFiber &&
    (markRootUpdated$1(boundaryFiber, retryLane),
    ensureRootIsScheduled(boundaryFiber));
}
function retryDehydratedSuspenseBoundary(boundaryFiber) {
  var suspenseState = boundaryFiber.memoizedState,
    retryLane = 0;
  null !== suspenseState && (retryLane = suspenseState.retryLane);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function resolveRetryWakeable(boundaryFiber, wakeable) {
  var retryLane = 0;
  switch (boundaryFiber.tag) {
    case 31:
    case 13:
      var retryCache = boundaryFiber.stateNode;
      var suspenseState = boundaryFiber.memoizedState;
      null !== suspenseState && (retryLane = suspenseState.retryLane);
      break;
    case 19:
      retryCache = boundaryFiber.stateNode;
      break;
    case 22:
      retryCache = boundaryFiber.stateNode._retryCache;
      break;
    default:
      throw Error(
        "Pinged unknown suspense boundary type. This is probably a bug in React."
      );
  }
  null !== retryCache && retryCache.delete(wakeable);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function restorePendingUpdaters(root, lanes) {
  isDevToolsPresent &&
    root.memoizedUpdaters.forEach(function (schedulingFiber) {
      addFiberToLanesMap(root, schedulingFiber, lanes);
    });
}
function scheduleCallback(priorityLevel, callback) {
  return scheduleCallback$3(priorityLevel, callback);
}
function FiberNode(tag, pendingProps, key, mode) {
  this.tag = tag;
  this.key = key;
  this.sibling =
    this.child =
    this.return =
    this.stateNode =
    this.type =
    this.elementType =
      null;
  this.index = 0;
  this.refCleanup = this.ref = null;
  this.pendingProps = pendingProps;
  this.dependencies =
    this.memoizedState =
    this.updateQueue =
    this.memoizedProps =
      null;
  this.mode = mode;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
  this.actualDuration = -0;
  this.actualStartTime = -1.1;
  this.treeBaseDuration = this.selfBaseDuration = -0;
}
function createFiberImplClass(tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}
function createFiberImplObject(tag, pendingProps, key, mode) {
  return {
    elementType: null,
    type: null,
    stateNode: null,
    return: null,
    child: null,
    sibling: null,
    index: 0,
    ref: null,
    refCleanup: null,
    memoizedProps: null,
    updateQueue: null,
    memoizedState: null,
    dependencies: null,
    flags: 0,
    subtreeFlags: 0,
    deletions: null,
    lanes: 0,
    childLanes: 0,
    alternate: null,
    tag: tag,
    key: key,
    pendingProps: pendingProps,
    mode: mode,
    actualDuration: -0,
    actualStartTime: -1.1,
    selfBaseDuration: -0,
    treeBaseDuration: -0
  };
}
var createFiber = enableObjectFiber
  ? createFiberImplObject
  : createFiberImplClass;
function shouldConstruct(Component) {
  Component = Component.prototype;
  return !(!Component || !Component.isReactComponent);
}
function createWorkInProgress(current, pendingProps) {
  var workInProgress = current.alternate;
  null === workInProgress
    ? ((workInProgress = createFiber(
        current.tag,
        pendingProps,
        current.key,
        current.mode
      )),
      (workInProgress.elementType = current.elementType),
      (workInProgress.type = current.type),
      (workInProgress.stateNode = current.stateNode),
      (workInProgress.alternate = current),
      (current.alternate = workInProgress))
    : ((workInProgress.pendingProps = pendingProps),
      (workInProgress.type = current.type),
      (workInProgress.flags = 0),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null),
      (workInProgress.actualDuration = -0),
      (workInProgress.actualStartTime = -1.1));
  workInProgress.flags = current.flags & 1206910976;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  pendingProps = current.dependencies;
  workInProgress.dependencies =
    null === pendingProps
      ? null
      : { lanes: pendingProps.lanes, firstContext: pendingProps.firstContext };
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;
  workInProgress.selfBaseDuration = current.selfBaseDuration;
  workInProgress.treeBaseDuration = current.treeBaseDuration;
  return workInProgress;
}
function resetWorkInProgress(workInProgress, renderLanes) {
  workInProgress.flags &= 1206910978;
  var current = workInProgress.alternate;
  null === current
    ? ((workInProgress.childLanes = 0),
      (workInProgress.lanes = renderLanes),
      (workInProgress.child = null),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.memoizedProps = null),
      (workInProgress.memoizedState = null),
      (workInProgress.updateQueue = null),
      (workInProgress.dependencies = null),
      (workInProgress.stateNode = null),
      (workInProgress.selfBaseDuration = 0),
      (workInProgress.treeBaseDuration = 0))
    : ((workInProgress.childLanes = current.childLanes),
      (workInProgress.lanes = current.lanes),
      (workInProgress.child = current.child),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null),
      (workInProgress.memoizedProps = current.memoizedProps),
      (workInProgress.memoizedState = current.memoizedState),
      (workInProgress.updateQueue = current.updateQueue),
      (workInProgress.type = current.type),
      (renderLanes = current.dependencies),
      (workInProgress.dependencies =
        null === renderLanes
          ? null
          : {
              lanes: renderLanes.lanes,
              firstContext: renderLanes.firstContext
            }),
      (workInProgress.selfBaseDuration = current.selfBaseDuration),
      (workInProgress.treeBaseDuration = current.treeBaseDuration));
  return workInProgress;
}
function createFiberFromTypeAndProps(
  type,
  key,
  pendingProps,
  owner,
  mode,
  lanes
) {
  var fiberTag = 0;
  owner = type;
  if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
  else if ("string" === typeof type) fiberTag = 5;
  else
    a: switch (type) {
      case REACT_ACTIVITY_TYPE:
        return (
          (type = createFiber(31, pendingProps, key, mode)),
          (type.elementType = REACT_ACTIVITY_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = 8;
        mode |= 8;
        0 !== (mode & 1) && (mode |= 16);
        break;
      case REACT_PROFILER_TYPE:
        return (
          (type = createFiber(12, pendingProps, key, mode | 2)),
          (type.elementType = REACT_PROFILER_TYPE),
          (type.lanes = lanes),
          (type.stateNode = { effectDuration: 0, passiveEffectDuration: 0 }),
          type
        );
      case REACT_SUSPENSE_TYPE:
        return (
          (type = createFiber(13, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_LIST_TYPE:
        return (
          (type = createFiber(19, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_LIST_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_VIEW_TRANSITION_TYPE:
        return (
          (type = mode | 32),
          (type = createFiber(30, pendingProps, key, type)),
          (type.elementType = REACT_VIEW_TRANSITION_TYPE),
          (type.lanes = lanes),
          (type.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }),
          type
        );
      default:
        if ("object" === typeof type && null !== type)
          switch (type.$$typeof) {
            case REACT_CONTEXT_TYPE:
              fiberTag = 10;
              break a;
            case REACT_CONSUMER_TYPE:
              fiberTag = 9;
              break a;
            case REACT_FORWARD_REF_TYPE:
              fiberTag = 11;
              break a;
            case REACT_MEMO_TYPE:
              fiberTag = 14;
              break a;
            case REACT_LAZY_TYPE:
              fiberTag = 16;
              owner = null;
              break a;
          }
        fiberTag = 29;
        pendingProps = Error(
          "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " +
            ((null === type ? "null" : typeof type) + ".")
        );
        owner = null;
    }
  key = createFiber(fiberTag, pendingProps, key, mode);
  key.elementType = type;
  key.type = owner;
  key.lanes = lanes;
  return key;
}
function createFiberFromFragment(elements, mode, lanes, key) {
  elements = createFiber(7, elements, key, mode);
  elements.lanes = lanes;
  return elements;
}
function createFiberFromText(content, mode, lanes) {
  content = createFiber(6, content, null, mode);
  content.lanes = lanes;
  return content;
}
function createFiberFromPortal(portal, mode, lanes) {
  mode = createFiber(
    4,
    null !== portal.children ? portal.children : [],
    portal.key,
    mode
  );
  mode.lanes = lanes;
  mode.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null,
    implementation: portal.implementation
  };
  return mode;
}
function FiberRootNode(
  containerInfo,
  tag,
  hydrate,
  identifierPrefix,
  onUncaughtError,
  onCaughtError,
  onRecoverableError,
  onDefaultTransitionIndicator,
  formState
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode =
    this.next =
    this.pendingContext =
    this.context =
    this.cancelPendingCommit =
      null;
  this.callbackPriority = 0;
  this.expirationTimes = createLaneMap(-1);
  this.entangledLanes =
    this.shellSuspendCounter =
    this.errorRecoveryDisabledLanes =
    this.indicatorLanes =
    this.expiredLanes =
    this.warmLanes =
    this.pingedLanes =
    this.suspendedLanes =
    this.pendingLanes =
      0;
  this.entanglements = createLaneMap(0);
  this.hiddenUpdates = createLaneMap(null);
  this.identifierPrefix = identifierPrefix;
  this.onUncaughtError = onUncaughtError;
  this.onCaughtError = onCaughtError;
  this.onRecoverableError = onRecoverableError;
  this.onDefaultTransitionIndicator = onDefaultTransitionIndicator;
  this.pooledCache = this.pendingIndicator = null;
  this.pooledCacheLanes = 0;
  this.hydrationCallbacks = null;
  this.formState = formState;
  this.transitionTypes = null;
  this.incompleteTransitions = new Map();
  this.passiveEffectDuration = this.effectDuration = -0;
  this.memoizedUpdaters = new Set();
  containerInfo = this.pendingUpdatersLaneMap = [];
  for (tag = 0; 31 > tag; tag++) containerInfo.push(new Set());
}
function createPortal$1(children, containerInfo, implementation) {
  var key =
    3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key:
      null == key
        ? null
        : key === REACT_OPTIMISTIC_KEY
          ? REACT_OPTIMISTIC_KEY
          : "" + key,
    children: children,
    containerInfo: containerInfo,
    implementation: implementation
  };
}
function findHostInstance(component) {
  var fiber = component._reactInternals;
  if (void 0 === fiber) {
    if ("function" === typeof component.render)
      throw Error("Unable to find node on an unmounted component.");
    component = Object.keys(component).join(",");
    throw Error(
      "Argument appears to not be a ReactComponent. Keys: " + component
    );
  }
  component = findCurrentFiberUsingSlowPath(fiber);
  component = null !== component ? findCurrentHostFiberImpl(component) : null;
  return null === component ? null : getPublicInstance(component.stateNode);
}
function updateContainer(element, container, parentComponent, callback) {
  var current = container.current,
    lane = requestUpdateLane(current);
  null !== injectedProfilingHooks &&
    "function" === typeof injectedProfilingHooks.markRenderScheduled &&
    injectedProfilingHooks.markRenderScheduled(lane);
  a: if (parentComponent) {
    parentComponent = parentComponent._reactInternals;
    b: {
      var JSCompiler_inline_result = parentComponent;
      do {
        switch (JSCompiler_inline_result.tag) {
          case 3:
            JSCompiler_inline_result =
              JSCompiler_inline_result.stateNode.context;
            break b;
          case 1:
            if (isContextProvider(JSCompiler_inline_result.type)) {
              JSCompiler_inline_result =
                JSCompiler_inline_result.stateNode
                  .__reactInternalMemoizedMergedChildContext;
              break b;
            }
        }
        JSCompiler_inline_result = JSCompiler_inline_result.return;
      } while (null !== JSCompiler_inline_result);
      throw Error(
        "Found unexpected detached subtree parent. This error is likely caused by a bug in React. Please file an issue."
      );
    }
    if (1 === parentComponent.tag) {
      var Component = parentComponent.type;
      if (isContextProvider(Component)) {
        parentComponent = processChildContext(
          parentComponent,
          Component,
          JSCompiler_inline_result
        );
        break a;
      }
    }
    parentComponent = JSCompiler_inline_result;
  } else parentComponent = emptyContextObject;
  null === container.context
    ? (container.context = parentComponent)
    : (container.pendingContext = parentComponent);
  container = createUpdate(lane);
  container.payload = { element: element };
  callback = void 0 === callback ? null : callback;
  null !== callback && (container.callback = callback);
  element = enqueueUpdate(current, container, lane);
  null !== element &&
    (startUpdateTimerByLane(lane),
    scheduleUpdateOnFiber(element, current, lane),
    entangleTransitions(element, current, lane));
  return lane;
}
function shim$1() {
  throw Error(
    "The current renderer does not support hydration. This error is likely caused by a bug in React. Please file an issue."
  );
}
function shim() {
  throw Error(
    "The current renderer does not support Resources. This error is likely caused by a bug in React. Please file an issue."
  );
}
var _nativeFabricUIManage$1 = nativeFabricUIManager,
  fabricApplyViewTransitionName =
    _nativeFabricUIManage$1.applyViewTransitionName,
  fabricCreateViewTransitionInstance =
    _nativeFabricUIManage$1.createViewTransitionInstance,
  fabricStartViewTransition = _nativeFabricUIManage$1.startViewTransition,
  fabricStartViewTransitionReadyFinished =
    _nativeFabricUIManage$1.startViewTransitionReadyFinished;
function ViewTransitionPseudoElement(pseudo, name) {
  this._pseudo = pseudo;
  this._name = name;
}
function measureClonedInstance() {
  return {
    rect: { x: 0, y: 0, width: 0, height: 0 },
    abs: !1,
    clip: !1,
    view: !0
  };
}
function createViewTransitionInstance(name) {
  var tag = allocateTag();
  fabricCreateViewTransitionInstance(name, tag);
  return {
    name: name,
    old: new ViewTransitionPseudoElement("old", name),
    new: new ViewTransitionPseudoElement("new", name)
  };
}
function startViewTransition(
  suspendedState,
  rootContainer,
  transitionTypes,
  mutationCallback,
  layoutCallback,
  afterMutationCallback,
  spawnedWorkCallback,
  passiveCallback
) {
  suspendedState = fabricStartViewTransition(function () {
    mutationCallback();
    layoutCallback();
    afterMutationCallback();
  });
  if (null == suspendedState)
    return mutationCallback(), layoutCallback(), spawnedWorkCallback(), null;
  suspendedState.ready.then(function () {
    spawnedWorkCallback();
    fabricStartViewTransitionReadyFinished();
  });
  suspendedState.finished.finally(function () {
    passiveCallback();
  });
  return suspendedState;
}
var _nativeFabricUIManage = nativeFabricUIManager,
  createNode = _nativeFabricUIManage.createNode,
  cloneNodeWithNewChildren = _nativeFabricUIManage.cloneNodeWithNewChildren,
  cloneNodeWithNewChildrenAndProps =
    _nativeFabricUIManage.cloneNodeWithNewChildrenAndProps,
  cloneNodeWithNewProps = _nativeFabricUIManage.cloneNodeWithNewProps,
  createChildNodeSet = _nativeFabricUIManage.createChildSet,
  appendChildNode = _nativeFabricUIManage.appendChild,
  appendChildNodeToSet = _nativeFabricUIManage.appendChildToSet,
  completeRoot = _nativeFabricUIManage.completeRoot,
  registerEventHandler = _nativeFabricUIManage.registerEventHandler,
  FabricDiscretePriority = _nativeFabricUIManage.unstable_DiscreteEventPriority,
  FabricContinuousPriority =
    _nativeFabricUIManage.unstable_ContinuousEventPriority,
  FabricIdlePriority = _nativeFabricUIManage.unstable_IdleEventPriority,
  fabricGetCurrentEventPriority =
    _nativeFabricUIManage.unstable_getCurrentEventPriority,
  fabricSuspendOnActiveViewTransition =
    _nativeFabricUIManage.suspendOnActiveViewTransition,
  extraDevToolsConfig = {
    getInspectorDataForInstance: void 0,
    getInspectorDataForViewAtPoint: function () {
      throw Error(
        "getInspectorDataForViewAtPoint() is not available in production."
      );
    }
  },
  getViewConfigForType =
    ReactNativePrivateInterface.ReactNativeViewConfigRegistry.get,
  nextReactTag = 2;
function allocateTag() {
  var tag = nextReactTag;
  nextReactTag += 2;
  return tag;
}
registerEventHandler && registerEventHandler(dispatchEvent);
var PROD_HOST_CONTEXT = { isInAParentText: !0 };
function createTextInstance(
  text,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle
) {
  hostContext = allocateTag();
  return {
    node: createNode(
      hostContext,
      "RCTRawText",
      rootContainerInstance.containerTag,
      { text: text },
      internalInstanceHandle
    )
  };
}
function getPublicInstance(instance) {
  if (null != instance.canonical) {
    if (null == instance.canonical.publicInstance) {
      var $jscomp$nullish$tmp0;
      instance.canonical.publicInstance =
        ReactNativePrivateInterface.createPublicInstance(
          instance.canonical.nativeTag,
          instance.canonical.viewConfig,
          instance.canonical.internalInstanceHandle,
          null != ($jscomp$nullish$tmp0 = instance.canonical.publicRootInstance)
            ? $jscomp$nullish$tmp0
            : null
        );
      instance.canonical.publicRootInstance = null;
    }
    return instance.canonical.publicInstance;
  }
  return null != instance.containerInfo
    ? instance.containerInfo.publicInstance
    : null;
}
function getPublicInstanceFromHostFiber(fiber) {
  fiber = getPublicInstance(fiber.stateNode);
  if (null === fiber)
    throw Error("Expected to find a host node. This is a bug in React.");
  return fiber;
}
var currentUpdatePriority = 0;
function resolveUpdatePriority() {
  if (0 !== currentUpdatePriority) return currentUpdatePriority;
  var currentEventPriority = fabricGetCurrentEventPriority
    ? fabricGetCurrentEventPriority()
    : null;
  if (null != currentEventPriority)
    switch (currentEventPriority) {
      case FabricDiscretePriority:
        return 2;
      case FabricContinuousPriority:
        return 8;
      case FabricIdlePriority:
        return 268435456;
    }
  return 32;
}
var schedulerEvent = void 0;
function resolveEventType() {
  var event = global.event;
  event && event !== schedulerEvent
    ? event.type
      ? (event = event.type)
      : ((event = event.dispatchConfig),
        (event =
          null == event || null == event.phasedRegistrationNames
            ? null
            : (event =
                  event.phasedRegistrationNames.bubbled ||
                  event.phasedRegistrationNames.captured)
              ? event.startsWith("on")
                ? event.slice(2).toLowerCase()
                : event.toLowerCase()
              : null))
    : (event = null);
  return event;
}
function resolveEventTimeStamp() {
  var event = global.event;
  return event && event !== schedulerEvent ? event.timeStamp : -1.1;
}
var scheduleTimeout = setTimeout,
  cancelTimeout = clearTimeout;
function cloneHiddenInstance(instance) {
  var node = instance.node,
    updatePayload = ReactNativePrivateInterface.createAttributePayload(
      { style: { display: "none" } },
      instance.canonical.viewConfig.validAttributes
    );
  return {
    node: cloneNodeWithNewProps(node, updatePayload),
    canonical: instance.canonical
  };
}
function FragmentInstance(fragmentFiber) {
  this._fragmentFiber = fragmentFiber;
  this._observers = null;
}
FragmentInstance.prototype.observeUsing = function (observer) {
  null === this._observers && (this._observers = new Set());
  this._observers.add(observer);
  traverseVisibleHostChildren(
    this._fragmentFiber.child,
    !1,
    observeChild,
    observer,
    void 0,
    void 0
  );
};
function observeChild(child, observer) {
  child = getPublicInstanceFromHostFiber(child);
  observer.observe(child);
  return !1;
}
FragmentInstance.prototype.unobserveUsing = function (observer) {
  var observers = this._observers;
  null !== observers &&
    observers.has(observer) &&
    (observers.delete(observer),
    traverseVisibleHostChildren(
      this._fragmentFiber.child,
      !1,
      unobserveChild,
      observer,
      void 0,
      void 0
    ));
};
function unobserveChild(child, observer) {
  child = getPublicInstanceFromHostFiber(child);
  observer.unobserve(child);
  return !1;
}
FragmentInstance.prototype.compareDocumentPosition = function (otherNode) {
  var parentHostFiber = getFragmentParentHostFiber(this._fragmentFiber);
  if (null === parentHostFiber) return Node.DOCUMENT_POSITION_DISCONNECTED;
  var children = [];
  traverseVisibleHostChildren(
    this._fragmentFiber.child,
    !1,
    collectChildren,
    children,
    void 0,
    void 0
  );
  if (0 === children.length) {
    children = getPublicInstanceFromHostFiber(parentHostFiber);
    var fragmentFiber = this._fragmentFiber;
    parentHostFiber = getPublicInstanceFromHostFiber;
    var parentResult = children.compareDocumentPosition(otherNode);
    var result = parentResult;
    children === otherNode
      ? (result = Node.DOCUMENT_POSITION_CONTAINS)
      : parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY &&
        (traverseVisibleHostChildren(
          fragmentFiber.sibling,
          !1,
          findNextSibling
        ),
        (children = searchTarget),
        (searchTarget = null),
        null === children
          ? (result = Node.DOCUMENT_POSITION_PRECEDING)
          : ((otherNode =
              parentHostFiber(children).compareDocumentPosition(otherNode)),
            (result =
              0 === otherNode || otherNode & Node.DOCUMENT_POSITION_FOLLOWING
                ? Node.DOCUMENT_POSITION_FOLLOWING
                : Node.DOCUMENT_POSITION_PRECEDING)));
    return (result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC);
  }
  parentHostFiber = getPublicInstanceFromHostFiber(children[0]);
  children = getPublicInstanceFromHostFiber(children[children.length - 1]);
  fragmentFiber = parentHostFiber.compareDocumentPosition(otherNode);
  parentResult = children.compareDocumentPosition(otherNode);
  result =
    fragmentFiber & Node.DOCUMENT_POSITION_CONTAINED_BY ||
    parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY;
  parentResult =
    fragmentFiber & Node.DOCUMENT_POSITION_FOLLOWING &&
    parentResult & Node.DOCUMENT_POSITION_PRECEDING;
  return parentHostFiber === otherNode ||
    children === otherNode ||
    result ||
    parentResult
    ? Node.DOCUMENT_POSITION_CONTAINED_BY
    : fragmentFiber;
};
function collectChildren(child, collection) {
  collection.push(child);
  return !1;
}
FragmentInstance.prototype.getRootNode = function (getRootNodeOptions) {
  var parentHostFiber = getFragmentParentHostFiber(this._fragmentFiber);
  return null === parentHostFiber
    ? this
    : getPublicInstanceFromHostFiber(parentHostFiber).getRootNode(
        getRootNodeOptions
      );
};
FragmentInstance.prototype.getClientRects = function () {
  var rects = [];
  traverseVisibleHostChildren(
    this._fragmentFiber.child,
    !1,
    collectClientRects,
    rects,
    void 0,
    void 0
  );
  return rects;
};
function collectClientRects(child, rects) {
  child = getPublicInstanceFromHostFiber(child);
  rects.push(child.getBoundingClientRect());
  return !1;
}
function addFragmentHandleToFiber(child, fragmentInstance) {
  enableFragmentRefsInstanceHandles &&
    ((child = getPublicInstanceFromHostFiber(child)),
    null != child && addFragmentHandleToInstance(child, fragmentInstance));
  return !1;
}
function addFragmentHandleToInstance(instance, fragmentInstance) {
  enableFragmentRefsInstanceHandles &&
    (null == instance.reactFragments && (instance.reactFragments = new Set()),
    instance.reactFragments.add(fragmentInstance));
}
function commitNewChildToFragmentInstance(childInstance, fragmentInstance) {
  if (!enableFragmentRefsTextNodes || null != childInstance.canonical) {
    var publicInstance = getPublicInstance(childInstance);
    if (null !== fragmentInstance._observers) {
      if (null == publicInstance)
        throw Error("Expected to find a host node. This is a bug in React.");
      fragmentInstance._observers.forEach(function (observer) {
        observer.observe(publicInstance);
      });
    }
    enableFragmentRefsInstanceHandles &&
      addFragmentHandleToInstance(publicInstance, fragmentInstance);
  }
}
var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  },
  supportsMicrotasks =
    "undefined" !== typeof RN$enableMicrotasksInReact &&
    !!RN$enableMicrotasksInReact,
  scheduleMicrotask =
    "function" === typeof queueMicrotask ? queueMicrotask : scheduleTimeout;
getFiberCurrentPropsFromNode$1 = function (instance) {
  return instance.canonical.currentProps;
};
getInstanceFromNode$1 = function (node) {
  return null != node.canonical && null != node.canonical.internalInstanceHandle
    ? node.canonical.internalInstanceHandle
    : node;
};
getNodeFromInstance$1 = function (fiber) {
  fiber = getPublicInstance(fiber.stateNode);
  if (null == fiber) throw Error("Could not find host instance from fiber");
  return fiber;
};
ResponderEventPlugin.injection.injectGlobalResponderHandler({
  onChange: function (from, to, blockNativeResponder) {
    from &&
      from.stateNode &&
      nativeFabricUIManager.setIsJSResponder(
        from.stateNode.node,
        !1,
        blockNativeResponder || !1
      );
    to &&
      to.stateNode &&
      nativeFabricUIManager.setIsJSResponder(
        to.stateNode.node,
        !0,
        blockNativeResponder || !1
      );
  }
});
if (
  "function" !==
  typeof ReactNativePrivateInterface.ReactFiberErrorDialog.showErrorDialog
)
  throw Error(
    "Expected ReactFiberErrorDialog.showErrorDialog to be a function."
  );
function nativeOnUncaughtError(error, errorInfo) {
  !1 !==
    ReactNativePrivateInterface.ReactFiberErrorDialog.showErrorDialog({
      errorBoundary: null,
      error: error,
      componentStack:
        null != errorInfo.componentStack ? errorInfo.componentStack : ""
    }) && reportGlobalError(error);
}
function nativeOnCaughtError(error, errorInfo) {
  !1 !==
    ReactNativePrivateInterface.ReactFiberErrorDialog.showErrorDialog({
      errorBoundary: errorInfo.errorBoundary,
      error: error,
      componentStack:
        null != errorInfo.componentStack ? errorInfo.componentStack : ""
    }) && console.error(error);
}
function nativeOnDefaultTransitionIndicator() {}
batchedUpdatesImpl = function (fn, a) {
  var prevExecutionContext = executionContext;
  executionContext |= 1;
  try {
    return fn(a);
  } finally {
    (executionContext = prevExecutionContext),
      0 === executionContext &&
        ((workInProgressRootRenderTargetTime = now$1() + 500),
        flushSyncWorkAcrossRoots_impl(0, !0));
  }
};
var roots = new Map(),
  internals$jscomp$inline_1686 = {
    bundleType: 0,
    version: "19.3.0-native-fb-eb343c7c-20260707",
    rendererPackageName: "react-native-renderer",
    currentDispatcherRef: ReactSharedInternals,
    reconcilerVersion: "19.3.0-native-fb-eb343c7c-20260707"
  };
null !== extraDevToolsConfig &&
  (internals$jscomp$inline_1686.rendererConfig = extraDevToolsConfig);
internals$jscomp$inline_1686.getLaneLabelMap = function () {
  for (
    var map = new Map(), lane = 1, index$184 = 0;
    31 > index$184;
    index$184++
  ) {
    var label = getLabelForLane(lane);
    map.set(lane, label);
    lane *= 2;
  }
  return map;
};
internals$jscomp$inline_1686.injectProfilingHooks = function (profilingHooks) {
  injectedProfilingHooks = profilingHooks;
};
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var hook$jscomp$inline_2080 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (
    !hook$jscomp$inline_2080.isDisabled &&
    hook$jscomp$inline_2080.supportsFiber
  )
    try {
      (rendererID = hook$jscomp$inline_2080.inject(
        internals$jscomp$inline_1686
      )),
        (injectedHook = hook$jscomp$inline_2080);
    } catch (err) {}
}
exports.createPortal = function (children, containerTag) {
  return createPortal$1(
    children,
    containerTag,
    null,
    2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null
  );
};
exports.dispatchCommand = function (handle, command, args) {
  handle = ReactNativePrivateInterface.getNodeFromPublicInstance(handle);
  null != handle &&
    nativeFabricUIManager.dispatchCommand(handle, command, args);
};
exports.findHostInstance_DEPRECATED = function (componentOrHandle) {
  return null == componentOrHandle
    ? null
    : componentOrHandle.canonical && componentOrHandle.canonical.publicInstance
      ? componentOrHandle.canonical.publicInstance
      : findHostInstance(componentOrHandle);
};
exports.findNodeHandle = function (componentOrHandle) {
  if (null == componentOrHandle) return null;
  if ("number" === typeof componentOrHandle) return componentOrHandle;
  if (
    null != componentOrHandle.canonical &&
    null != componentOrHandle.canonical.nativeTag
  )
    return componentOrHandle.canonical.nativeTag;
  var nativeTag =
    ReactNativePrivateInterface.getNativeTagFromPublicInstance(
      componentOrHandle
    );
  if (nativeTag) return nativeTag;
  componentOrHandle = findHostInstance(componentOrHandle);
  return null == componentOrHandle
    ? componentOrHandle
    : ReactNativePrivateInterface.getNativeTagFromPublicInstance(
        componentOrHandle
      );
};
exports.getNodeFromInternalInstanceHandle = function (internalInstanceHandle) {
  return (
    internalInstanceHandle &&
    internalInstanceHandle.stateNode &&
    internalInstanceHandle.stateNode.node
  );
};
exports.getPublicInstanceFromInternalInstanceHandle = function (
  internalInstanceHandle
) {
  var instance = internalInstanceHandle.stateNode;
  return null == instance
    ? null
    : 6 === internalInstanceHandle.tag
      ? (null == instance.publicInstance &&
          (instance.publicInstance =
            ReactNativePrivateInterface.createPublicTextInstance(
              internalInstanceHandle
            )),
        instance.publicInstance)
      : getPublicInstance(internalInstanceHandle.stateNode);
};
exports.getPublicInstanceFromRootTag = function (rootTag) {
  return (rootTag = roots.get(rootTag))
    ? rootTag.containerInfo.publicInstance
    : null;
};
exports.isChildPublicInstance = function () {
  throw Error("isChildPublicInstance() is not available in production.");
};
exports.render = function (
  element,
  containerTag,
  callback,
  concurrentRoot,
  options
) {
  var root = roots.get(containerTag);
  if (!root) {
    root = nativeOnUncaughtError;
    var onCaughtError = nativeOnCaughtError,
      onRecoverableError = defaultOnRecoverableError;
    options &&
      void 0 !== options.onUncaughtError &&
      (root = options.onUncaughtError);
    options &&
      void 0 !== options.onCaughtError &&
      (onCaughtError = options.onCaughtError);
    options &&
      void 0 !== options.onRecoverableError &&
      (onRecoverableError = options.onRecoverableError);
    var onDefaultTransitionIndicator = nativeOnDefaultTransitionIndicator;
    options &&
      void 0 !== options.onDefaultTransitionIndicator &&
      (onDefaultTransitionIndicator = options.onDefaultTransitionIndicator);
    var rootInstance = {
      publicInstance:
        ReactNativePrivateInterface.createPublicRootInstance(containerTag),
      containerTag: containerTag
    };
    options = onDefaultTransitionIndicator;
    concurrentRoot = concurrentRoot ? 1 : 0;
    root = new FiberRootNode(
      rootInstance,
      concurrentRoot,
      !1,
      "",
      root,
      onCaughtError,
      onRecoverableError,
      options,
      null
    );
    root.hydrationCallbacks = null;
    concurrentRoot = 1 === concurrentRoot ? 1 : 0;
    isDevToolsPresent && (concurrentRoot |= 2);
    concurrentRoot = createFiber(3, null, null, concurrentRoot);
    root.current = concurrentRoot;
    concurrentRoot.stateNode = root;
    onCaughtError = createCache();
    onCaughtError.refCount++;
    root.pooledCache = onCaughtError;
    onCaughtError.refCount++;
    concurrentRoot.memoizedState = {
      element: null,
      isDehydrated: !1,
      cache: onCaughtError
    };
    initializeUpdateQueue(concurrentRoot);
    void 0 === isomorphicDefaultTransitionIndicator
      ? (isomorphicDefaultTransitionIndicator = options)
      : isomorphicDefaultTransitionIndicator !== options &&
        ((isomorphicDefaultTransitionIndicator = null),
        stopIsomorphicDefaultIndicator());
    roots.set(containerTag, root);
  }
  updateContainer(element, root, null, callback);
  a: if (((element = root.current), element.child))
    switch (element.child.tag) {
      case 27:
      case 5:
        element = getPublicInstance(element.child.stateNode);
        break a;
      default:
        element = element.child.stateNode;
    }
  else element = null;
  return element;
};
exports.sendAccessibilityEvent = function (handle, eventType) {
  handle = ReactNativePrivateInterface.getNodeFromPublicInstance(handle);
  null != handle &&
    nativeFabricUIManager.sendAccessibilityEvent(handle, eventType);
};
exports.stopSurface = function (containerTag) {
  var root = roots.get(containerTag);
  root &&
    updateContainer(null, root, null, function () {
      root.containerInfo.publicInstance = null;
      roots.delete(containerTag);
    });
};
exports.unmountComponentAtNode = function (containerTag) {
  this.stopSurface(containerTag);
};
"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ &&
  "function" ===
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop &&
  __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
