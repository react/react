/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @nolint
 * @preventMunge
 * @generated SignedSource<<cfe661411c44c8ea62d92d9cf6e97fdc>>
 */

"use strict";
var React = require("react"),
  Scheduler = require("scheduler/unstable_mock"),
  Scheduler$1 = require("scheduler");
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || !1;
    descriptor.configurable = !0;
    "value" in descriptor && (descriptor.writable = !0);
    var JSCompiler_temp_const = Object,
      JSCompiler_temp_const$jscomp$0 = JSCompiler_temp_const.defineProperty;
    a: {
      var i$jscomp$0 = descriptor.key;
      if ("object" == typeof i$jscomp$0 && i$jscomp$0) {
        var e = i$jscomp$0[Symbol.toPrimitive];
        if (void 0 !== e) {
          i$jscomp$0 = e.call(i$jscomp$0, "string");
          if ("object" != typeof i$jscomp$0) break a;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        i$jscomp$0 = String(i$jscomp$0);
      }
    }
    JSCompiler_temp_const$jscomp$0.call(
      JSCompiler_temp_const,
      target,
      "symbol" == typeof i$jscomp$0 ? i$jscomp$0 : i$jscomp$0 + "",
      descriptor
    );
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  protoProps && _defineProperties(Constructor.prototype, protoProps);
  staticProps && _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", { writable: !1 });
  return Constructor;
}
var assign = Object.assign;
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
      for (var didFindChild = !1, child$0 = parentA.child; child$0; ) {
        if (child$0 === a) {
          didFindChild = !0;
          a = parentA;
          b = parentB;
          break;
        }
        if (child$0 === b) {
          didFindChild = !0;
          b = parentA;
          a = parentB;
          break;
        }
        child$0 = child$0.sibling;
      }
      if (!didFindChild) {
        for (child$0 = parentB.child; child$0; ) {
          if (child$0 === a) {
            didFindChild = !0;
            a = parentB;
            b = parentA;
            break;
          }
          if (child$0 === b) {
            didFindChild = !0;
            b = parentB;
            a = parentA;
            break;
          }
          child$0 = child$0.sibling;
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
var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
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
var isArrayImpl = Array.isArray,
  ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  scheduleCallback$3 = Scheduler$1.unstable_scheduleCallback,
  cancelCallback$1 = Scheduler$1.unstable_cancelCallback,
  shouldYield = Scheduler$1.unstable_shouldYield,
  requestPaint = Scheduler$1.unstable_requestPaint,
  now$1 = Scheduler$1.unstable_now,
  ImmediatePriority = Scheduler$1.unstable_ImmediatePriority,
  UserBlockingPriority = Scheduler$1.unstable_UserBlockingPriority,
  NormalPriority$1 = Scheduler$1.unstable_NormalPriority,
  IdlePriority = Scheduler$1.unstable_IdlePriority,
  log$1 = Scheduler$1.log,
  unstable_setDisableYieldValue = Scheduler$1.unstable_setDisableYieldValue,
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
    var index$5 = 31 - clz32(remainingLanes),
      lane = 1 << index$5;
    entanglements[index$5] = 0;
    expirationTimes[index$5] = -1;
    var hiddenUpdatesForLane = hiddenUpdates[index$5];
    if (null !== hiddenUpdatesForLane)
      for (
        hiddenUpdates[index$5] = null, index$5 = 0;
        index$5 < hiddenUpdatesForLane.length;
        index$5++
      ) {
        var update = hiddenUpdatesForLane[index$5];
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
    var index$6 = 31 - clz32(rootEntangledLanes),
      lane = 1 << index$6;
    (lane & entangledLanes) | (root[index$6] & entangledLanes) &&
      (root[index$6] |= entangledLanes);
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
var NO_CONTEXT = {},
  nodeToInstanceMap = new WeakMap();
function getPublicInstance(inst) {
  switch (inst.tag) {
    case "INSTANCE":
      var createNodeMock = inst.rootContainerInstance.createNodeMock;
      createNodeMock = createNodeMock({ type: inst.type, props: inst.props });
      "object" === typeof createNodeMock &&
        null !== createNodeMock &&
        nodeToInstanceMap.set(createNodeMock, inst);
      return createNodeMock;
    default:
      return inst;
  }
}
function appendChild(parentInstance, child) {
  var index = parentInstance.children.indexOf(child);
  -1 !== index && parentInstance.children.splice(index, 1);
  parentInstance.children.push(child);
}
function insertBefore(parentInstance, child, beforeChild) {
  var index = parentInstance.children.indexOf(child);
  -1 !== index && parentInstance.children.splice(index, 1);
  beforeChild = parentInstance.children.indexOf(beforeChild);
  parentInstance.children.splice(beforeChild, 0, child);
}
var currentUpdatePriority = 0,
  scheduleTimeout = setTimeout,
  cancelTimeout = clearTimeout;
function measureClonedInstance() {
  return null;
}
function startViewTransition(
  suspendedState,
  rootContainer,
  transitionTypes,
  mutationCallback,
  layoutCallback,
  afterMutationCallback,
  spawnedWorkCallback
) {
  mutationCallback();
  layoutCallback();
  spawnedWorkCallback();
  return null;
}
var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  },
  valueStack = [],
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
              } catch (x$7) {
                control = x$7;
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
            } catch (x$8) {
              control = x$8;
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
  pop(contextStackCursor);
  push(contextStackCursor, NO_CONTEXT);
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
  contextStackCursor.current !== NO_CONTEXT &&
    (push(contextFiberStackCursor, fiber),
    push(contextStackCursor, NO_CONTEXT));
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
  scheduleCallback$2 = Scheduler$1.unstable_scheduleCallback,
  NormalPriority = Scheduler$1.unstable_NormalPriority,
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
var now = Scheduler$1.unstable_now,
  commitStartTime = -0,
  profilerStartTime = -1.1,
  profilerEffectDuration = -0,
  componentEffectStartTime = -1.1;
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
function pushComponentEffectStart() {
  var prevEffectStart = componentEffectStartTime;
  componentEffectStartTime = -1.1;
  return prevEffectStart;
}
function popComponentEffectStart(prevEffectStart) {
  0 <= prevEffectStart && (componentEffectStartTime = prevEffectStart);
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
    var elapsedTime = now() - profilerStartTime;
    profilerStartTime = -1;
    profilerEffectDuration += elapsedTime;
  }
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
    ((didScheduleMicrotask = !0),
    scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask));
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
    var index$3 = 31 - clz32(lanes),
      lane = 1 << index$3,
      expirationTime = expirationTimes[index$3];
    if (-1 === expirationTime) {
      if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
        expirationTimes[index$3] = computeExpirationTime(lane, currentTime);
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
    0 !== (suspendedLanes & 3) &&
    !checkIfRootIsPrerendering(root, suspendedLanes)
  )
    return (
      null !== pingedLanes &&
        null !== pingedLanes &&
        cancelCallback$1(pingedLanes),
      (root.callbackPriority = 2),
      (root.callbackNode = null),
      2
    );
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
function performWorkOnRootViaSchedulerTask(root, didTimeout) {
  nestedUpdateScheduled = currentUpdateIsNested = !1;
  if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
    return (root.callbackNode = null), (root.callbackPriority = 0), null;
  var originalCallbackNode = root.callbackNode;
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
      ((didScheduleMicrotask = !0),
      scheduleCallback$3(
        ImmediatePriority,
        processRootScheduleInImmediateTask
      ));
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}
function pingEngtangledActionScope() {
  if (
    0 === --currentEntangledPendingCount &&
    ((entangledTransitionTypes = null),
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
  "object" === typeof returnValue &&
    null !== returnValue &&
    "function" === typeof returnValue.then &&
    entangleAsyncAction(transition, returnValue);
  if (null !== entangledTransitionTypes)
    for (var root = firstScheduledRoot; null !== root; )
      queueTransitionTypes(root, entangledTransitionTypes), (root = root.next);
  root = transition.types;
  if (null !== root) {
    for (var root$15 = firstScheduledRoot; null !== root$15; )
      queueTransitionTypes(root$15, root), (root$15 = root$15.next);
    if (0 !== currentEntangledLane) {
      root$15 = entangledTransitionTypes;
      null === root$15 && (root$15 = entangledTransitionTypes = []);
      for (var i = 0; i < root.length; i++) {
        var transitionType = root[i];
        -1 === root$15.indexOf(transitionType) && root$15.push(transitionType);
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
      return updateFragment(
        returnFiber,
        current,
        element.props.children,
        lanes,
        element.key
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
      var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
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
      didReadFromEntangledAsyncAction$45 = !1;
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
              (didReadFromEntangledAsyncAction$45 = !0);
        else if ((renderLanes & revertLane) === revertLane) {
          update = update.next;
          revertLane === currentEntangledLane &&
            (didReadFromEntangledAsyncAction$45 = !0);
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
      didReadFromEntangledAsyncAction$45 &&
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
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
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
    } catch (error$49) {
      onActionError(actionQueue, node, error$49);
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
          (scheduleUpdateOnFiber(root, provider, lane),
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
        (scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane)));
  markStateUpdateScheduled(fiber, lane);
}
function dispatchSetState(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  dispatchSetStateInternal(fiber, queue, action, lane);
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
        scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
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
      (scheduleUpdateOnFiber(payload, inst, lane),
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
      (scheduleUpdateOnFiber(payload, inst, lane),
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
      (scheduleUpdateOnFiber(callback, inst, lane),
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
    for (var propName$51 in Component)
      void 0 === newProps[propName$51] &&
        (newProps[propName$51] = Component[propName$51]);
  }
  return newProps;
}
function defaultOnUncaughtError(error) {
  reportGlobalError(error);
}
function defaultOnCaughtError(error) {
  console.error(error);
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
  offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
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
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps,
          renderLanes
        ),
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
        var treeBaseDuration$87 = completedWork.selfBaseDuration,
          child$88 = completedWork.child;
        null !== child$88;

      )
        (newChildLanes |= child$88.lanes | child$88.childLanes),
          (subtreeFlags |= child$88.subtreeFlags & 1206910976),
          (subtreeFlags |= child$88.flags & 1206910976),
          (treeBaseDuration$87 += child$88.treeBaseDuration),
          (child$88 = child$88.sibling);
      completedWork.treeBaseDuration = treeBaseDuration$87;
    } else
      for (
        treeBaseDuration$87 = completedWork.child;
        null !== treeBaseDuration$87;

      )
        (newChildLanes |=
          treeBaseDuration$87.lanes | treeBaseDuration$87.childLanes),
          (subtreeFlags |= treeBaseDuration$87.subtreeFlags & 1206910976),
          (subtreeFlags |= treeBaseDuration$87.flags & 1206910976),
          (treeBaseDuration$87.return = completedWork),
          (treeBaseDuration$87 = treeBaseDuration$87.sibling);
  else if (0 !== (completedWork.mode & 2)) {
    treeBaseDuration$87 = completedWork.actualDuration;
    child$88 = completedWork.selfBaseDuration;
    for (var child = completedWork.child; null !== child; )
      (newChildLanes |= child.lanes | child.childLanes),
        (subtreeFlags |= child.subtreeFlags),
        (subtreeFlags |= child.flags),
        (treeBaseDuration$87 += child.actualDuration),
        (child$88 += child.treeBaseDuration),
        (child = child.sibling);
    completedWork.actualDuration = treeBaseDuration$87;
    completedWork.treeBaseDuration = child$88;
  } else
    for (
      treeBaseDuration$87 = completedWork.child;
      null !== treeBaseDuration$87;

    )
      (newChildLanes |=
        treeBaseDuration$87.lanes | treeBaseDuration$87.childLanes),
        (subtreeFlags |= treeBaseDuration$87.subtreeFlags),
        (subtreeFlags |= treeBaseDuration$87.flags),
        (treeBaseDuration$87.return = completedWork),
        (treeBaseDuration$87 = treeBaseDuration$87.sibling);
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
        (renderLanes = workInProgress.stateNode),
        (newProps = null),
        null !== current && (newProps = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== newProps &&
          (workInProgress.flags |= 2048),
        popProvider(CacheContext),
        popHostContainer(),
        pop(didPerformWorkStackCursor),
        pop(contextStackCursor$1),
        renderLanes.pendingContext &&
          ((renderLanes.context = renderLanes.pendingContext),
          (renderLanes.pendingContext = null)),
        (null !== current && null !== current.child) ||
          null === current ||
          (current.memoizedState.isDehydrated &&
            0 === (workInProgress.flags & 256)) ||
          ((workInProgress.flags |= 1024),
          upgradeHydrationErrorsToRecoverable()),
        bubbleProperties(workInProgress),
        null
      );
    case 26:
    case 27:
    case 5:
      popHostContext(workInProgress);
      renderLanes = workInProgress.type;
      if (null !== current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps && (workInProgress.flags |= 4);
      else {
        if (!newProps) {
          if (null === workInProgress.stateNode)
            throw Error(
              "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
            );
          bubbleProperties(workInProgress);
          workInProgress.subtreeFlags &= -33554433;
          return null;
        }
        current = {
          type: renderLanes,
          props: newProps,
          isHidden: !1,
          children: [],
          internalInstanceHandle: workInProgress,
          rootContainerInstance: rootInstanceStackCursor.current,
          tag: "INSTANCE"
        };
        a: for (renderLanes = workInProgress.child; null !== renderLanes; ) {
          if (5 === renderLanes.tag || 6 === renderLanes.tag) {
            newProps = renderLanes.stateNode;
            var index = current.children.indexOf(newProps);
            -1 !== index && current.children.splice(index, 1);
            current.children.push(newProps);
          } else if (4 !== renderLanes.tag && null !== renderLanes.child) {
            renderLanes.child.return = renderLanes;
            renderLanes = renderLanes.child;
            continue;
          }
          if (renderLanes === workInProgress) break a;
          for (; null === renderLanes.sibling; ) {
            if (
              null === renderLanes.return ||
              renderLanes.return === workInProgress
            )
              break a;
            renderLanes = renderLanes.return;
          }
          renderLanes.sibling.return = renderLanes.return;
          renderLanes = renderLanes.sibling;
        }
        workInProgress.stateNode = current;
      }
      bubbleProperties(workInProgress);
      workInProgress.subtreeFlags &= -33554433;
      workInProgress.flags &= -16777217;
      return null;
    case 6:
      if (current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps && (workInProgress.flags |= 4);
      else {
        if ("string" !== typeof newProps && null === workInProgress.stateNode)
          throw Error(
            "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
          );
        workInProgress.stateNode = {
          text: newProps,
          isHidden: !1,
          tag: "TEXT"
        };
      }
      bubbleProperties(workInProgress);
      return null;
    case 31:
      renderLanes = workInProgress.memoizedState;
      if (null === current || null !== current.memoizedState) {
        if (null !== renderLanes) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostActivityInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (renderLanes = workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          0 !== (workInProgress.mode & 2) &&
            null !== renderLanes &&
            ((current = workInProgress.child),
            null !== current &&
              (workInProgress.treeBaseDuration -= current.treeBaseDuration));
          current = !1;
        } else
          (renderLanes = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = renderLanes),
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
        index = newProps;
        if (null !== index && null !== index.dehydrated) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostSuspenseInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (index = workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          0 !== (workInProgress.mode & 2) &&
            null !== index &&
            ((index = workInProgress.child),
            null !== index &&
              (workInProgress.treeBaseDuration -= index.treeBaseDuration));
          index = !1;
        } else
          (index = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = index),
            (index = !0);
        if (!index) {
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
      renderLanes = null !== newProps;
      current = null !== current && null !== current.memoizedState;
      if (renderLanes) {
        newProps = workInProgress.child;
        index = null;
        null !== newProps.alternate &&
          null !== newProps.alternate.memoizedState &&
          null !== newProps.alternate.memoizedState.cachePool &&
          (index = newProps.alternate.memoizedState.cachePool.pool);
        var cache$100 = null;
        null !== newProps.memoizedState &&
          null !== newProps.memoizedState.cachePool &&
          (cache$100 = newProps.memoizedState.cachePool.pool);
        cache$100 !== index && (newProps.flags |= 2048);
      }
      renderLanes !== current &&
        renderLanes &&
        (workInProgress.child.flags |= 8192);
      scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
      bubbleProperties(workInProgress);
      0 !== (workInProgress.mode & 2) &&
        renderLanes &&
        ((current = workInProgress.child),
        null !== current &&
          (workInProgress.treeBaseDuration -= current.treeBaseDuration));
      return null;
    case 4:
      return (
        popHostContainer(),
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
      index = 0 !== (workInProgress.flags & 128);
      cache$100 = newProps.rendering;
      if (null === cache$100)
        if (index) cutOffTailIfNeeded(newProps, !1);
        else {
          if (
            0 !== workInProgressRootExitStatus ||
            (null !== current && 0 !== (current.flags & 128))
          )
            for (current = workInProgress.child; null !== current; ) {
              cache$100 = findFirstSuspended(current);
              if (null !== cache$100) {
                workInProgress.flags |= 128;
                cutOffTailIfNeeded(newProps, !1);
                current = cache$100.updateQueue;
                workInProgress.updateQueue = current;
                scheduleRetryEffect(workInProgress, current);
                workInProgress.subtreeFlags = 0;
                current = renderLanes;
                for (renderLanes = workInProgress.child; null !== renderLanes; )
                  resetWorkInProgress(renderLanes, current),
                    (renderLanes = renderLanes.sibling);
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
            (index = !0),
            cutOffTailIfNeeded(newProps, !1),
            (workInProgress.lanes = 4194304));
        }
      else {
        if (!index)
          if (((current = findFirstSuspended(cache$100)), null !== current)) {
            if (
              ((workInProgress.flags |= 128),
              (index = !0),
              (current = current.updateQueue),
              (workInProgress.updateQueue = current),
              scheduleRetryEffect(workInProgress, current),
              cutOffTailIfNeeded(newProps, !0),
              null === newProps.tail &&
                "collapsed" !== newProps.tailMode &&
                "visible" !== newProps.tailMode &&
                !cache$100.alternate)
            )
              return bubbleProperties(workInProgress), null;
          } else
            2 * now$1() - newProps.renderingStartTime >
              workInProgressRootRenderTargetTime &&
              536870912 !== renderLanes &&
              ((workInProgress.flags |= 128),
              (index = !0),
              cutOffTailIfNeeded(newProps, !1),
              (workInProgress.lanes = 4194304));
        newProps.isBackwards
          ? ((cache$100.sibling = workInProgress.child),
            (workInProgress.child = cache$100))
          : ((current = newProps.last),
            null !== current
              ? (current.sibling = cache$100)
              : (workInProgress.child = cache$100),
            (newProps.last = cache$100));
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
        cache$100 = suspenseStackCursor.current;
        cache$100 = index ? (cache$100 & 1) | 2 : cache$100 & 1;
        "visible" !== newProps.tailMode &&
        "collapsed" !== newProps.tailMode &&
        renderLanes
          ? ((renderLanes = cache$100),
            push(suspenseHandlerStackCursor, workInProgress),
            push(suspenseStackCursor, renderLanes),
            null === shellBoundary && (shellBoundary = workInProgress))
          : pushSuspenseListContext(workInProgress, cache$100);
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
        (renderLanes = workInProgress.updateQueue),
        null !== renderLanes &&
          scheduleRetryEffect(workInProgress, renderLanes.retryQueue),
        (renderLanes = null),
        null !== current &&
          null !== current.memoizedState &&
          null !== current.memoizedState.cachePool &&
          (renderLanes = current.memoizedState.cachePool.pool),
        (newProps = null),
        null !== workInProgress.memoizedState &&
          null !== workInProgress.memoizedState.cachePool &&
          (newProps = workInProgress.memoizedState.cachePool.pool),
        newProps !== renderLanes && (workInProgress.flags |= 2048),
        null !== current && pop(resumedCache),
        null
      );
    case 24:
      return (
        (renderLanes = null),
        null !== current && (renderLanes = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== renderLanes &&
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
          var create$118 = updateQueue.create,
            inst = updateQueue.inst;
          lastEffect = create$118();
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
    } catch (error$122) {
      captureCommitPhaseError(current, nearestMountedAncestor, error$122);
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
            instance.ref = null;
          instanceToUse = instance.ref;
          break;
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
      } catch (error$123) {
        captureCommitPhaseError(current, nearestMountedAncestor, error$123);
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
function isHostParent(fiber) {
  return 5 === fiber.tag || 3 === fiber.tag || 4 === fiber.tag;
}
function getHostSibling(fiber) {
  a: for (;;) {
    for (; null === fiber.sibling; ) {
      if (null === fiber.return || isHostParent(fiber.return)) return null;
      fiber = fiber.return;
    }
    fiber.sibling.return = fiber.return;
    for (
      fiber = fiber.sibling;
      5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag;

    ) {
      if (fiber.flags & 2) continue a;
      if (null === fiber.child || 4 === fiber.tag) continue a;
      else (fiber.child.return = fiber), (fiber = fiber.child);
    }
    if (!(fiber.flags & 2)) return fiber.stateNode;
  }
}
function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
  var tag = node.tag;
  if (5 === tag || 6 === tag)
    (node = node.stateNode),
      before ? insertBefore(parent, node, before) : appendChild(parent, node),
      (viewTransitionMutationContext = !0);
  else if (4 !== tag && ((node = node.child), null !== node))
    for (
      insertOrAppendPlacementNodeIntoContainer(node, before, parent),
        node = node.sibling;
      null !== node;

    )
      insertOrAppendPlacementNodeIntoContainer(node, before, parent),
        (node = node.sibling);
}
function insertOrAppendPlacementNode(node, before, parent) {
  var tag = node.tag;
  if (5 === tag || 6 === tag)
    (node = node.stateNode),
      before ? insertBefore(parent, node, before) : appendChild(parent, node),
      (viewTransitionMutationContext = !0);
  else if (4 !== tag && ((node = node.child), null !== node))
    for (
      insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
      null !== node;

    )
      insertOrAppendPlacementNode(node, before, parent), (node = node.sibling);
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
  for (var inViewport = !1; null !== child; ) {
    if (5 === child.tag)
      null !== collectMeasurements
        ? (collectMeasurements.push(null), (inViewport = !0))
        : inViewport || (inViewport = !0),
        (shouldStartViewTransition = !0),
        viewTransitionHostInstanceIdx++;
    else if (22 !== child.tag || null === child.memoizedState)
      (30 === child.tag && stopAtNestedViewTransitions) ||
        (applyViewTransitionToHostInstancesRecursive(
          child.child,
          name,
          className,
          collectMeasurements,
          stopAtNestedViewTransitions
        ) &&
          (inViewport = !0));
    child = child.sibling;
  }
  return inViewport;
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
          gesture ||
          scheduleViewTransitionEvent(placement, props.onEnter))
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
        : scheduleViewTransitionEvent(deletion, props.onExit));
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
  for (var inViewport = !1; null !== child; ) {
    if (5 === child.tag) {
      var instance = child.stateNode;
      null !== previousMeasurements &&
      viewTransitionHostInstanceIdx < previousMeasurements.length
        ? (inViewport = !0)
        : (parentViewTransition.flags |= 32);
      (inViewport && 0 !== (parentViewTransition.flags & 4)) ||
        (null === viewTransitionCancelableChildren &&
          (viewTransitionCancelableChildren = []),
        viewTransitionCancelableChildren.push(
          instance,
          0 === viewTransitionHostInstanceIdx
            ? oldName
            : oldName + "_" + viewTransitionHostInstanceIdx,
          child.memoizedProps
        ));
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
          ) && (inViewport = !0);
    child = child.sibling;
  }
  return inViewport;
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
  offscreenDirectParentIsHidden = !1,
  PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
  nextEffect = null,
  viewTransitionContextChanged = !1;
function commitBeforeMutationEffects(root, firstChild, committedLanes) {
  root = (committedLanes & 335544064) === committedLanes;
  nextEffect = firstChild;
  for (firstChild = root ? 9270 : 1024; null !== nextEffect; ) {
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
        0 !== (flags & 1024) &&
          fiber.stateNode.containerInfo.children.splice(0);
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
            } catch (error$119) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$119
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
            } catch (error$120) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$120
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
            } catch (error$121) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$121
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
      if (null === current && !(flags & 4) && flags & 64) {
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
            ? recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                0 !== (finishedWork.subtreeFlags & 8772)
              )
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
    default:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
  }
  popComponentEffectStart(prevEffectStart);
}
function hideOrUnhideAllChildren(parentFiber, isHidden) {
  for (parentFiber = parentFiber.child; null !== parentFiber; )
    hideOrUnhideAllChildrenOnFiber(parentFiber, isHidden),
      (parentFiber = parentFiber.sibling);
}
function hideOrUnhideAllChildrenOnFiber(fiber, isHidden) {
  switch (fiber.tag) {
    case 5:
    case 26:
      try {
        var instance = fiber.stateNode;
        isHidden ? (instance.isHidden = !0) : (fiber.stateNode.isHidden = !1);
      } catch (error) {
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      hideOrUnhideNearestPortals(fiber, isHidden);
      break;
    case 6:
      try {
        (fiber.stateNode.isHidden = isHidden ? !0 : !1),
          (viewTransitionMutationContext = !0);
      } catch (error) {
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      break;
    case 18:
      try {
        var instance$jscomp$0 = fiber.stateNode;
        isHidden ? shim$1(instance$jscomp$0) : shim$1(fiber.stateNode);
      } catch (error) {
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      break;
    case 22:
    case 23:
      null === fiber.memoizedState && hideOrUnhideAllChildren(fiber, isHidden);
      break;
    default:
      hideOrUnhideAllChildren(fiber, isHidden);
  }
}
function hideOrUnhideNearestPortals(parentFiber, isHidden$jscomp$0) {
  if (parentFiber.subtreeFlags & 67108864)
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      a: {
        var fiber = parentFiber,
          isHidden = isHidden$jscomp$0;
        switch (fiber.tag) {
          case 4:
            hideOrUnhideAllChildrenOnFiber(fiber, isHidden);
            break a;
          case 22:
            null === fiber.memoizedState &&
              hideOrUnhideNearestPortals(fiber, isHidden);
            break a;
          default:
            hideOrUnhideNearestPortals(fiber, isHidden);
        }
      }
      parentFiber = parentFiber.sibling;
    }
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
var hostParent = null,
  hostParentIsContainer = !1;
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
  var prevEffectStart = pushComponentEffectStart();
  switch (deletedFiber.tag) {
    case 26:
    case 27:
    case 5:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
    case 6:
      var prevHostParent = hostParent,
        prevHostParentIsContainer = hostParentIsContainer;
      hostParent = null;
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      hostParent = prevHostParent;
      hostParentIsContainer = prevHostParentIsContainer;
      if (null !== hostParent)
        if (hostParentIsContainer)
          try {
            finishedRoot = hostParent;
            var index = finishedRoot.children.indexOf(deletedFiber.stateNode);
            finishedRoot.children.splice(index, 1);
            viewTransitionMutationContext = !0;
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
        else
          try {
            finishedRoot = hostParent;
            var index$jscomp$0 = finishedRoot.children.indexOf(
              deletedFiber.stateNode
            );
            finishedRoot.children.splice(index$jscomp$0, 1);
            viewTransitionMutationContext = !0;
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
      break;
    case 18:
      null !== hostParent && shim$1();
      break;
    case 4:
      index = hostParent;
      index$jscomp$0 = hostParentIsContainer;
      hostParent = deletedFiber.stateNode.containerInfo;
      hostParentIsContainer = !0;
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      hostParent = index;
      hostParentIsContainer = index$jscomp$0;
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
        (index = deletedFiber.stateNode),
        "function" === typeof index.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            deletedFiber,
            nearestMountedAncestor,
            index
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
            (index = offscreenSubtreeWasHidden) ||
            null !== deletedFiber.memoizedState),
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          ),
          (offscreenSubtreeWasHidden = index))
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
    default:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
  }
  popComponentEffectStart(prevEffectStart);
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
        prevEffectStart = pushComponentEffectStart(),
        parent = returnFiber;
      a: for (; null !== parent; ) {
        switch (parent.tag) {
          case 27:
          case 5:
            hostParent = parent.stateNode;
            hostParentIsContainer = !1;
            break a;
          case 3:
          case 4:
            hostParent = parent.stateNode.containerInfo;
            hostParentIsContainer = !0;
            break a;
        }
        parent = parent.return;
      }
      if (null === hostParent)
        throw Error(
          "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue."
        );
      commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
      hostParent = null;
      hostParentIsContainer = !1;
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
    current = finishedWork.alternate,
    flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (
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
        ((finishedWork = finishedWork.updateQueue),
        null !== finishedWork &&
          ((root = finishedWork.callbacks),
          null !== root &&
            ((lanes = finishedWork.shared.hiddenCallbacks),
            (finishedWork.shared.hiddenCallbacks =
              null === lanes ? root : lanes.concat(root)))));
      break;
    case 26:
    case 27:
    case 5:
      _eventPayloads$ii2 = offscreenDirectParentIsHidden;
      offscreenDirectParentIsHidden = !1;
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      offscreenDirectParentIsHidden = _eventPayloads$ii2;
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      if (finishedWork.flags & 32)
        try {
          viewTransitionMutationContext = !0;
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      if (flags & 4 && null != finishedWork.stateNode) {
        root = finishedWork.memoizedProps;
        try {
          (ii = finishedWork.stateNode),
            (ii.type = finishedWork.type),
            (ii.props = root);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      break;
    case 6:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      if (flags & 4) {
        if (null === finishedWork.stateNode)
          throw Error(
            "This should have a text node initialized. This error is likely caused by a bug in React. Please file an issue."
          );
        root = finishedWork.memoizedProps;
        lanes = finishedWork.stateNode;
        try {
          (lanes.text = root), (viewTransitionMutationContext = !0);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      break;
    case 3:
      flags = pushNestedEffectDurations();
      viewTransitionMutationContext = rootMutationContext = !1;
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      root.effectDuration += popNestedEffectDurations(flags);
      viewTransitionMutationContext && (rootMutationContext = !0);
      viewTransitionMutationContext = !1;
      rootMutationContext &&
        0 !== (lanes & 34) &&
        ((root.indicatorLanes &= ~currentEventTransitionLane),
        (needsIsomorphicIndicator = !1));
      break;
    case 4:
      flags = offscreenDirectParentIsHidden;
      offscreenDirectParentIsHidden = offscreenSubtreeIsHidden;
      current = pushMutationContext();
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      viewTransitionMutationContext && (rootMutationContext = !0);
      viewTransitionMutationContext = current;
      offscreenDirectParentIsHidden = flags;
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
        ((root = null !== current && null !== current.memoizedState),
        null === finishedWork.memoizedState ||
          root ||
          (globalMostRecentFallbackTime = now$1()));
      flags & 4 &&
        ((root = finishedWork.updateQueue),
        null !== root &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, root)));
      break;
    case 22:
      ii = null !== finishedWork.memoizedState;
      _eventPayloads$ii2 = null !== current && null !== current.memoizedState;
      if (finishedWork.mode & 1) {
        var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
          prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden,
          prevOffscreenDirectParentIsHidden$134 = offscreenDirectParentIsHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
        offscreenDirectParentIsHidden =
          prevOffscreenDirectParentIsHidden$134 || ii;
        offscreenSubtreeWasHidden =
          prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$134;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
      } else recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 8192 &&
        ((root = finishedWork.stateNode),
        (root._visibility = ii ? root._visibility & -2 : root._visibility | 1),
        ii &&
          (null === current ||
            _eventPayloads$ii2 ||
            offscreenSubtreeIsHidden ||
            offscreenSubtreeWasHidden ||
            (0 !== (finishedWork.mode & 1) &&
              recursivelyTraverseDisappearLayoutEffects(finishedWork))),
        (!ii && offscreenDirectParentIsHidden) ||
          hideOrUnhideAllChildren(finishedWork, ii));
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
    default:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes),
        commitReconciliationEffects(finishedWork);
  }
  popComponentEffectStart(prevEffectStart);
}
function commitReconciliationEffects(finishedWork) {
  var flags = finishedWork.flags;
  if (flags & 2) {
    try {
      for (
        var hostParentFiber, parentFiber = finishedWork.return;
        null !== parentFiber;

      ) {
        if (isHostParent(parentFiber)) {
          hostParentFiber = parentFiber;
          break;
        }
        parentFiber = parentFiber.return;
      }
      if (null == hostParentFiber)
        throw Error(
          "Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue."
        );
      switch (hostParentFiber.tag) {
        case 27:
        case 5:
          var parent = hostParentFiber.stateNode;
          hostParentFiber.flags & 32 && (hostParentFiber.flags &= -33);
          var before = getHostSibling(finishedWork);
          insertOrAppendPlacementNode(finishedWork, before, parent);
          break;
        case 3:
        case 4:
          var parent$124 = hostParentFiber.stateNode.containerInfo,
            before$125 = getHostSibling(finishedWork);
          insertOrAppendPlacementNodeIntoContainer(
            finishedWork,
            before$125,
            parent$124
          );
          break;
        default:
          throw Error(
            "Invalid host parent fiber. This error is likely caused by a bug in React. Please file an issue."
          );
      }
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
      prevEffectStart = pushComponentEffectStart();
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
      default:
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
    }
    popComponentEffectStart(prevEffectStart);
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
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
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
      default:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          includeWorkInProgressEffects
        );
    }
    popComponentEffectStart(prevEffectStart);
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
  committedTransitions
) {
  if (
    parentFiber.subtreeFlags &
    ((committedLanes & 335544064) === committedLanes ? 10262 : 10256)
  )
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitPassiveMountOnFiber(
        root,
        parentFiber,
        committedLanes,
        committedTransitions
      ),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveMountOnFiber(
  finishedRoot,
  finishedWork,
  committedLanes,
  committedTransitions
) {
  var prevEffectStart = pushComponentEffectStart(),
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
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 && commitHookPassiveMountEffects(finishedWork, 9);
      break;
    case 1:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 3:
      isViewTransitionEligible = pushNestedEffectDurations();
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        ((committedLanes = null),
        null !== finishedWork.alternate &&
          (committedLanes = finishedWork.alternate.memoizedState.cache),
        (finishedWork = finishedWork.memoizedState.cache),
        finishedWork !== committedLanes &&
          (finishedWork.refCount++,
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
          committedTransitions
        );
        finishedRoot = finishedWork.stateNode;
        finishedRoot.passiveEffectDuration +=
          bubbleNestedEffectDurations(flags);
        try {
          var _finishedWork$memoize2 = finishedWork.memoizedProps,
            id = _finishedWork$memoize2.id,
            onPostCommit = _finishedWork$memoize2.onPostCommit,
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
          committedTransitions
        );
      break;
    case 31:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 13:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 23:
      break;
    case 22:
      _finishedWork$memoize2 = finishedWork.stateNode;
      id = finishedWork.alternate;
      null !== finishedWork.memoizedState
        ? (isViewTransitionEligible &&
            null !== id &&
            null === id.memoizedState &&
            restoreEnterOrExitViewTransitions(id),
          _finishedWork$memoize2._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions
              )
            : finishedWork.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
              : ((_finishedWork$memoize2._visibility |= 2),
                recursivelyTraversePassiveMountEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions
                )))
        : (isViewTransitionEligible &&
            null !== id &&
            null !== id.memoizedState &&
            restoreEnterOrExitViewTransitions(finishedWork),
          _finishedWork$memoize2._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions
              )
            : ((_finishedWork$memoize2._visibility |= 2),
              recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                0 !== (finishedWork.subtreeFlags & 10256) || !1
              )));
      flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
      break;
    case 24:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
      break;
    case 30:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    default:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
  }
  popComponentEffectStart(prevEffectStart);
}
function recursivelyTraverseReconnectPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber,
  committedLanes$jscomp$0,
  committedTransitions$jscomp$0,
  includeWorkInProgressEffects
) {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    (0 !== (parentFiber.subtreeFlags & 10256) || !1);
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    var finishedRoot = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      committedLanes = committedLanes$jscomp$0,
      committedTransitions = committedTransitions$jscomp$0,
      prevEffectStart = pushComponentEffectStart(),
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        commitHookPassiveMountEffects(finishedWork, 8);
        break;
      case 23:
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState
          ? instance._visibility & 2
            ? recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                includeWorkInProgressEffects
              )
            : finishedWork.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
              : ((instance._visibility |= 2),
                recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  includeWorkInProgressEffects
                ))
          : ((instance._visibility |= 2),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects
            ));
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
        break;
      case 24:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
    }
    popComponentEffectStart(prevEffectStart);
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseAtomicPassiveEffects(
  finishedRoot$jscomp$0,
  parentFiber
) {
  if (parentFiber.subtreeFlags & 10256)
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0,
        finishedWork = parentFiber,
        flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 22:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
          break;
        case 24:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
      }
      parentFiber = parentFiber.sibling;
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
  var prevEffectStart = pushComponentEffectStart();
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
          recursivelyTraverseDisconnectPassiveEffects(finishedWork))
        : recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    default:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
  }
  popComponentEffectStart(prevEffectStart);
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
        popComponentEffectStart(prevEffectStart);
      }
    detachAlternateSiblings(parentFiber);
  }
  for (parentFiber = parentFiber.child; null !== parentFiber; ) {
    deletions = parentFiber;
    i = pushComponentEffectStart();
    switch (deletions.tag) {
      case 0:
      case 11:
      case 15:
        commitHookPassiveUnmountEffects(deletions, deletions.return, 8);
        recursivelyTraverseDisconnectPassiveEffects(deletions);
        break;
      case 22:
        childToDelete = deletions.stateNode;
        childToDelete._visibility & 2 &&
          ((childToDelete._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(deletions));
        break;
      default:
        recursivelyTraverseDisconnectPassiveEffects(deletions);
    }
    popComponentEffectStart(i);
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
      prevEffectStart = pushComponentEffectStart();
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
    popComponentEffectStart(prevEffectStart);
    prevEffectStart = fiber.child;
    if (null !== prevEffectStart)
      (prevEffectStart.return = fiber), (nextEffect = prevEffectStart);
    else
      a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
        prevEffectStart = nextEffect;
        nearestMountedAncestor = prevEffectStart.sibling;
        var returnFiber = prevEffectStart.return;
        detachFiberAfterEffects(prevEffectStart);
        if (prevEffectStart === fiber) {
          nextEffect = null;
          break a;
        }
        if (null !== nearestMountedAncestor) {
          nearestMountedAncestor.return = returnFiber;
          nextEffect = nearestMountedAncestor;
          break a;
        }
        nextEffect = returnFiber;
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
  pendingPassiveTransitions = null,
  pendingRecoverableErrors = null,
  pendingViewTransition = null,
  pendingViewTransitionEvents = null,
  pendingTransitionTypes = null,
  nestedUpdateCount = 0,
  rootWithNestedUpdates = null;
function requestUpdateLane(fiber) {
  if (0 === (fiber.mode & 1)) return 2;
  if (0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes)
    return workInProgressRootRenderLanes & -workInProgressRootRenderLanes;
  if (null !== ReactSharedInternals.T) return requestTransitionLane();
  fiber = 0 !== currentUpdatePriority ? currentUpdatePriority : 32;
  return fiber;
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
      (getViewTransitionName(fiber.memoizedProps, state),
      (instance = state.ref = null));
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
  var shouldTimeSlice =
      (!forceSync &&
        0 === (lanes & 127) &&
        0 === (lanes & root$jscomp$0.expiredLanes)) ||
      checkIfRootIsPrerendering(root$jscomp$0, lanes),
    exitStatus = shouldTimeSlice
      ? renderRootConcurrent(root$jscomp$0, lanes)
      : renderRootSync(root$jscomp$0, lanes, !0),
    renderWasConcurrent = shouldTimeSlice;
  do {
    if (0 === exitStatus) {
      workInProgressRootIsPrerendering &&
        !shouldTimeSlice &&
        markRootSuspended(root$jscomp$0, lanes, 0, !1);
      break;
    } else {
      forceSync = root$jscomp$0.current.alternate;
      if (
        renderWasConcurrent &&
        !isRenderConsistentWithExternalStores(forceSync)
      ) {
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
          lanes = JSCompiler_inline_result;
          a: {
            var root = root$jscomp$0;
            exitStatus = workInProgressRootConcurrentErrors;
            JSCompiler_inline_result = renderRootSync(
              root,
              JSCompiler_inline_result,
              !1
            );
            if (
              2 !== JSCompiler_inline_result &&
              6 !== JSCompiler_inline_result
            ) {
              if (workInProgressRootDidAttachPingListener) {
                root.errorRecoveryDisabledLanes |= renderWasConcurrent;
                workInProgressRootInterleavedUpdatedLanes |=
                  renderWasConcurrent;
                exitStatus = 4;
                break a;
              }
              renderWasConcurrent = workInProgressRootRecoverableErrors;
              workInProgressRootRecoverableErrors = exitStatus;
              null !== renderWasConcurrent &&
                (null === workInProgressRootRecoverableErrors
                  ? (workInProgressRootRecoverableErrors = renderWasConcurrent)
                  : workInProgressRootRecoverableErrors.push.apply(
                      workInProgressRootRecoverableErrors,
                      renderWasConcurrent
                    ));
            }
            exitStatus = JSCompiler_inline_result;
          }
          renderWasConcurrent = !1;
          if (2 !== exitStatus) continue;
        }
      }
      if (1 === exitStatus) {
        prepareFreshStack(root$jscomp$0, 0);
        markRootSuspended(root$jscomp$0, lanes, 0, !0);
        break;
      }
      a: {
        shouldTimeSlice = root$jscomp$0;
        renderWasConcurrent = exitStatus;
        switch (renderWasConcurrent) {
          case 0:
          case 1:
            throw Error("Root did not complete. This is a bug in React.");
          case 4:
            if ((lanes & 4194048) !== lanes && (lanes & 62914560) !== lanes)
              break;
          case 6:
            markRootSuspended(
              shouldTimeSlice,
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
          3 === renderWasConcurrent &&
          ((exitStatus = globalMostRecentFallbackTime + 300 - now$1()),
          10 < exitStatus)
        ) {
          markRootSuspended(
            shouldTimeSlice,
            lanes,
            workInProgressDeferredLane,
            !workInProgressRootDidSkipSuspendedSiblings
          );
          if (0 !== getNextLanes(shouldTimeSlice, 0, !0)) break a;
          pendingEffectsLanes = lanes;
          shouldTimeSlice.timeoutHandle = scheduleTimeout(
            completeRootWhenReady.bind(
              null,
              shouldTimeSlice,
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
              -0,
              0
            ),
            exitStatus
          );
          break a;
        }
        completeRootWhenReady(
          shouldTimeSlice,
          forceSync,
          workInProgressRootRecoverableErrors,
          workInProgressTransitions,
          workInProgressRootDidIncludeRecursiveRenderUpdate,
          lanes,
          workInProgressDeferredLane,
          workInProgressRootInterleavedUpdatedLanes,
          workInProgressSuspendedRetryLanes,
          workInProgressRootDidSkipSuspendedSiblings,
          renderWasConcurrent
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
  suspendedRetryLanes
) {
  root.timeoutHandle = -1;
  didIncludeRenderPhaseUpdate = finishedWork.subtreeFlags;
  var suspendedState = null;
  if (
    (lanes & 335544064) === lanes ||
    didIncludeRenderPhaseUpdate & 8192 ||
    16785408 === (didIncludeRenderPhaseUpdate & 16785408)
  )
    (appearingViewTransitions = suspendedState = null),
      accumulateSuspenseyCommitOnFiber(finishedWork),
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
    commitRoot(
      root,
      finishedWork,
      lanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didIncludeRenderPhaseUpdate
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
    var index$4 = 31 - clz32(lanes),
      lane = 1 << index$4;
    didAttemptEntireTree[index$4] = -1;
    lanes &= ~lane;
  }
  0 !== spawnedLane &&
    markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
}
function flushSyncFromReconciler(fn) {
  0 !== pendingEffectsStatus &&
    0 === pendingEffectsRoot.tag &&
    0 === (executionContext & 6) &&
    flushPendingEffects();
  var prevExecutionContext = executionContext;
  executionContext |= 1;
  var prevTransition = ReactSharedInternals.T,
    previousPriority = currentUpdatePriority;
  try {
    if (((currentUpdatePriority = 2), (ReactSharedInternals.T = null), fn))
      return fn();
  } finally {
    (currentUpdatePriority = previousPriority),
      (ReactSharedInternals.T = prevTransition),
      (executionContext = prevExecutionContext),
      0 === (executionContext & 6) && flushSyncWorkAcrossRoots_impl(0, !1);
  }
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
function prepareFreshStack(root, lanes) {
  var timeoutHandle = root.timeoutHandle;
  -1 !== timeoutHandle &&
    ((root.timeoutHandle = -1), cancelTimeout(timeoutHandle));
  timeoutHandle = root.cancelPendingCommit;
  null !== timeoutHandle &&
    ((root.cancelPendingCommit = null), timeoutHandle());
  pendingEffectsLanes = 0;
  resetWorkInProgressStack();
  workInProgressRoot = root;
  workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
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
  var allEntangledLanes = root.entangledLanes;
  if (0 !== allEntangledLanes)
    for (
      root = root.entanglements, allEntangledLanes &= lanes;
      0 < allEntangledLanes;

    ) {
      var index$2 = 31 - clz32(allEntangledLanes),
        lane = 1 << index$2;
      lanes |= root[index$2];
      allEntangledLanes &= ~lane;
    }
  entangledRenderLanes = lanes;
  finishQueueingConcurrentUpdates();
  return timeoutHandle;
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
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes)
    (workInProgressTransitions = null), prepareFreshStack(root, lanes);
  markRenderStarted(lanes);
  lanes = !1;
  var exitStatus = workInProgressRootExitStatus;
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        var unitOfWork = workInProgress,
          thrownValue = workInProgressThrownValue;
        switch (workInProgressSuspendedReason) {
          case 8:
            resetWorkInProgressStack();
            exitStatus = 6;
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
              exitStatus = 0;
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
      exitStatus = workInProgressRootExitStatus;
      break;
    } catch (thrownValue$149) {
      handleThrow(root, thrownValue$149);
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
  return exitStatus;
}
function workLoopSync() {
  for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
}
function renderRootConcurrent(root, lanes) {
  var prevExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher = pushDispatcher(),
    prevAsyncDispatcher = pushAsyncDispatcher();
  workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes
    ? ((workInProgressTransitions = null),
      (workInProgressRootRenderTargetTime = now$1() + 500),
      prepareFreshStack(root, lanes))
    : (workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
        root,
        lanes
      ));
  markRenderStarted(lanes);
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        lanes = workInProgress;
        var thrownValue = workInProgressThrownValue;
        b: switch (workInProgressSuspendedReason) {
          case 1:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 1);
            break;
          case 2:
          case 9:
            if (isThenableResolved(thrownValue)) {
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
            thrownValue.then(lanes, lanes);
            break a;
          case 3:
            workInProgressSuspendedReason = 7;
            break a;
          case 4:
            workInProgressSuspendedReason = 5;
            break a;
          case 7:
            isThenableResolved(thrownValue)
              ? ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                replaySuspendedUnitOfWork(lanes))
              : ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 7));
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
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 5);
            break;
          case 6:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 6);
            break;
          case 8:
            resetWorkInProgressStack();
            workInProgressRootExitStatus = 6;
            break a;
          default:
            throw Error("Unexpected SuspendedReason. This is a bug in React.");
        }
      }
      workLoopConcurrentByScheduler();
      break;
    } catch (thrownValue$151) {
      handleThrow(root, thrownValue$151);
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
  suspendedState
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
  0 !== (finishedWork.subtreeFlags & spawnedLane) ||
  0 !== (finishedWork.flags & spawnedLane)
    ? ((root.callbackNode = null),
      (root.callbackPriority = 0),
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      }))
    : ((root.callbackNode = null), (root.callbackPriority = 0));
  commitStartTime = now();
  shouldStartViewTransition = !1;
  spawnedLane = 0 !== (finishedWork.flags & 13878);
  if (0 !== (finishedWork.subtreeFlags & 13878) || spawnedLane) {
    spawnedLane = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    updatedLanes = currentUpdatePriority;
    currentUpdatePriority = 2;
    suspendedRetryLanes = executionContext;
    executionContext |= 4;
    try {
      commitBeforeMutationEffects(root, finishedWork, lanes);
    } finally {
      (executionContext = suspendedRetryLanes),
        (currentUpdatePriority = updatedLanes),
        (ReactSharedInternals.T = spawnedLane);
    }
  }
  pendingEffectsStatus = 1;
  shouldStartViewTransition
    ? (pendingViewTransition = startViewTransition(
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
      ))
    : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
}
function reportViewTransitionError(error) {
  if (0 !== pendingEffectsStatus) {
    var onRecoverableError = pendingEffectsRoot.onRecoverableError;
    onRecoverableError(error, { componentStack: null });
  }
}
function suspendedViewTransition() {}
function finishedViewTransition() {}
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
        (componentEffectStartTime = -1.1),
          commitMutationEffectsOnFiber(finishedWork, root, lanes);
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
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      cleanUpIndicator = root.pendingIndicator;
    if (null !== cleanUpIndicator && 0 === root.indicatorLanes) {
      var prevTransition = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      root.pendingIndicator = null;
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
          (componentEffectStartTime = -1.1),
          commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork),
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
    pendingEffectsStatus = 3;
  }
}
function flushSpawnedWork() {
  if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var committedViewTransition = pendingViewTransition;
    pendingViewTransition = null;
    requestPaint();
    var root = pendingEffectsRoot,
      finishedWork = pendingFinishedWork,
      lanes = pendingEffectsLanes,
      recoverableErrors = pendingRecoverableErrors,
      passiveSubtreeMask = (lanes & 335544064) === lanes ? 10262 : 10256;
    0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) ||
    0 !== (finishedWork.flags & passiveSubtreeMask)
      ? (pendingEffectsStatus = 5)
      : ((pendingEffectsStatus = 0),
        (pendingFinishedWork = pendingEffectsRoot = null),
        releaseRootPooledCache(root, root.pendingLanes));
    passiveSubtreeMask = root.pendingLanes;
    0 === passiveSubtreeMask && (legacyErrorBoundariesThatAlreadyFailed = null);
    passiveSubtreeMask = lanesToEventPriority(lanes);
    finishedWork = finishedWork.stateNode;
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        var didError = 128 === (finishedWork.current.flags & 128);
        switch (passiveSubtreeMask) {
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
    if (null !== recoverableErrors) {
      didError = ReactSharedInternals.T;
      schedulerPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      ReactSharedInternals.T = null;
      try {
        var onRecoverableError = root.onRecoverableError;
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
    recoverableErrors = pendingViewTransitionEvents;
    onRecoverableError = pendingTransitionTypes;
    pendingTransitionTypes = null;
    if (
      null !== recoverableErrors &&
      ((pendingViewTransitionEvents = null),
      null === onRecoverableError && (onRecoverableError = []),
      null !== committedViewTransition)
    )
      for (
        committedViewTransition = 0;
        committedViewTransition < recoverableErrors.length;
        committedViewTransition++
      )
        (recoverableError = (0, recoverableErrors[committedViewTransition])(
          onRecoverableError
        )),
          void 0 !== recoverableError && recoverableError();
    0 !== (pendingEffectsLanes & 3) && 0 !== root.tag && flushPendingEffects();
    ensureRootIsScheduled(root);
    passiveSubtreeMask = root.pendingLanes;
    0 !== (lanes & 261930) && 0 !== (passiveSubtreeMask & 42)
      ? ((nestedUpdateScheduled = !0),
        root === rootWithNestedUpdates
          ? nestedUpdateCount++
          : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root)))
      : ((nestedUpdateCount = 0), (rootWithNestedUpdates = null));
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
  null !== pendingViewTransition && (pendingViewTransition = null);
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
    renderPriority = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    var root$jscomp$0 = pendingEffectsRoot,
      lanes = pendingEffectsLanes;
    pendingEffectsStatus = 0;
    pendingFinishedWork = pendingEffectsRoot = null;
    pendingEffectsLanes = 0;
    if (0 !== (executionContext & 6))
      throw Error("Cannot flush passive effects while already rendering.");
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markPassiveEffectsStarted &&
      injectedProfilingHooks.markPassiveEffectsStarted(lanes);
    var prevExecutionContext = executionContext;
    executionContext |= 4;
    var finishedWork = root$jscomp$0.current;
    componentEffectStartTime = -1.1;
    commitPassiveUnmountOnFiber(finishedWork);
    var finishedWork$jscomp$0 = root$jscomp$0.current;
    componentEffectStartTime = -1.1;
    commitPassiveMountOnFiber(
      root$jscomp$0,
      finishedWork$jscomp$0,
      lanes,
      renderPriority
    );
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markPassiveEffectsStopped &&
      injectedProfilingHooks.markPassiveEffectsStopped();
    executionContext = prevExecutionContext;
    flushSyncWorkAcrossRoots_impl(0, !1);
    if (
      injectedHook &&
      "function" === typeof injectedHook.onPostCommitFiberRoot
    )
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
      } catch (err) {}
    var stateNode = root$jscomp$0.current.stateNode;
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
    (root = pingSuspendedRoot.bind(null, root, wakeable, lanes)),
    wakeable.then(root, root));
}
function pingSuspendedRoot(root, wakeable, pingedLanes) {
  var pingCache = root.pingCache;
  null !== pingCache && pingCache.delete(wakeable);
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
  root.warmLanes &= ~pingedLanes;
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
function shouldConstruct(Component) {
  Component = Component.prototype;
  return !(!Component || !Component.isReactComponent);
}
function createWorkInProgress(current, pendingProps) {
  var workInProgress = current.alternate;
  null === workInProgress
    ? ((workInProgress = createFiberImplClass(
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
  if ("function" === typeof owner) shouldConstruct(owner) && (fiberTag = 1);
  else if ("string" === typeof owner) fiberTag = 5;
  else
    a: switch (owner) {
      case REACT_ACTIVITY_TYPE:
        return (
          (type = createFiberImplClass(31, pendingProps, key, mode)),
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
          (type = createFiberImplClass(12, pendingProps, key, mode | 2)),
          (type.elementType = REACT_PROFILER_TYPE),
          (type.lanes = lanes),
          (type.stateNode = { effectDuration: 0, passiveEffectDuration: 0 }),
          type
        );
      case REACT_SUSPENSE_TYPE:
        return (
          (type = createFiberImplClass(13, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_LIST_TYPE:
        return (
          (type = createFiberImplClass(19, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_LIST_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_VIEW_TRANSITION_TYPE:
        return (
          (type = mode | 32),
          (type = createFiberImplClass(30, pendingProps, key, type)),
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
        if ("object" === typeof owner && null !== owner)
          switch (owner.$$typeof) {
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
  key = createFiberImplClass(fiberTag, pendingProps, key, mode);
  key.elementType = type;
  key.type = owner;
  key.lanes = lanes;
  return key;
}
function createFiberFromFragment(elements, mode, lanes, key) {
  elements = createFiberImplClass(7, elements, key, mode);
  elements.lanes = lanes;
  return elements;
}
function createFiberFromText(content, mode, lanes) {
  content = createFiberImplClass(6, content, null, mode);
  content.lanes = lanes;
  return content;
}
function createFiberFromPortal(portal, mode, lanes) {
  mode = createFiberImplClass(
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
  this.formState = formState;
  this.transitionTypes = null;
  this.incompleteTransitions = new Map();
  this.passiveEffectDuration = this.effectDuration = -0;
}
function createContainer(
  containerInfo,
  tag,
  hydrationCallbacks,
  isStrictMode,
  concurrentUpdatesByDefaultOverride,
  identifierPrefix,
  onUncaughtError,
  onCaughtError,
  onRecoverableError,
  onDefaultTransitionIndicator
) {
  containerInfo = new FiberRootNode(
    containerInfo,
    tag,
    !1,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    null
  );
  1 === tag ? ((tag = 1), !0 === isStrictMode && (tag |= 24)) : (tag = 0);
  isDevToolsPresent && (tag |= 2);
  isStrictMode = createFiberImplClass(3, null, null, tag);
  containerInfo.current = isStrictMode;
  isStrictMode.stateNode = containerInfo;
  tag = createCache();
  tag.refCount++;
  containerInfo.pooledCache = tag;
  tag.refCount++;
  isStrictMode.memoizedState = { element: null, isDehydrated: !1, cache: tag };
  initializeUpdateQueue(isStrictMode);
  void 0 === isomorphicDefaultTransitionIndicator
    ? (isomorphicDefaultTransitionIndicator = onDefaultTransitionIndicator)
    : isomorphicDefaultTransitionIndicator !== onDefaultTransitionIndicator &&
      ((isomorphicDefaultTransitionIndicator = null),
      stopIsomorphicDefaultIndicator());
  return containerInfo;
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
    (scheduleUpdateOnFiber(element, current, lane),
    entangleTransitions(element, current, lane));
  return lane;
}
var act = React.act,
  defaultTestOptions = {
    createNodeMock: function () {
      return null;
    }
  };
function toJSON(inst) {
  if (inst.isHidden) return null;
  switch (inst.tag) {
    case "TEXT":
      return inst.text;
    case "INSTANCE":
      var _inst$props = inst.props;
      var excluded = ["children"];
      if (null == _inst$props) _inst$props = {};
      else {
        var target = {};
        for (key in _inst$props)
          !Object.prototype.hasOwnProperty.call(_inst$props, key) ||
            0 <= excluded.indexOf(key) ||
            (target[key] = _inst$props[key]);
        _inst$props = target;
      }
      excluded = null;
      if (inst.children && inst.children.length)
        for (target = 0; target < inst.children.length; target++) {
          var key = toJSON(inst.children[target]);
          null !== key &&
            (null === excluded ? (excluded = [key]) : excluded.push(key));
        }
      inst = { type: inst.type, props: _inst$props, children: excluded };
      Object.defineProperty(inst, "$$typeof", {
        value: Symbol.for("react.test.json")
      });
      return inst;
    default:
      throw Error("Unexpected node type in toJSON: " + inst.tag);
  }
}
function childrenToTree(node) {
  if (!node) return null;
  node = nodeAndSiblingsArray(node);
  return 0 === node.length
    ? null
    : 1 === node.length
      ? toTree(node[0])
      : flatten(node.map(toTree));
}
function nodeAndSiblingsArray(nodeWithSibling) {
  for (var array = []; null != nodeWithSibling; )
    array.push(nodeWithSibling), (nodeWithSibling = nodeWithSibling.sibling);
  return array;
}
function flatten(arr) {
  var result = [];
  for (arr = [{ i: 0, array: arr }]; arr.length; )
    for (var n = arr.pop(); n.i < n.array.length; ) {
      var el = n.array[n.i];
      n.i += 1;
      if (isArrayImpl(el)) {
        arr.push(n);
        arr.push({ i: 0, array: el });
        break;
      }
      result.push(el);
    }
  return result;
}
function toTree(node) {
  if (null == node) return null;
  switch (node.tag) {
    case 3:
      return childrenToTree(node.child);
    case 4:
      return childrenToTree(node.child);
    case 1:
      return {
        nodeType: "component",
        type: node.type,
        props: assign({}, node.memoizedProps),
        instance: node.stateNode,
        rendered: childrenToTree(node.child)
      };
    case 0:
    case 15:
      return {
        nodeType: "component",
        type: node.type,
        props: assign({}, node.memoizedProps),
        instance: null,
        rendered: childrenToTree(node.child)
      };
    case 26:
    case 27:
    case 5:
      return {
        nodeType: "host",
        type: node.type,
        props: assign({}, node.memoizedProps),
        instance: null,
        rendered: flatten(nodeAndSiblingsArray(node.child).map(toTree))
      };
    case 6:
      return node.stateNode.text;
    case 7:
    case 10:
    case 9:
    case 8:
    case 12:
    case 11:
    case 14:
    case 17:
    case 21:
      return childrenToTree(node.child);
    default:
      throw Error(
        "toTree() does not yet know how to handle nodes with tag=" + node.tag
      );
  }
}
var validWrapperTypes = new Set([0, 1, 5, 11, 14, 15, 3]);
function getChildren(parent) {
  var children = [],
    node = parent;
  if (null === node.child) return children;
  node.child.return = node;
  node = node.child;
  a: for (;;) {
    var descend = !1;
    validWrapperTypes.has(node.tag)
      ? children.push(wrapFiber(node))
      : 6 === node.tag
        ? children.push("" + node.memoizedProps)
        : (descend = !0);
    if (descend && null !== node.child)
      (node.child.return = node), (node = node.child);
    else {
      for (; null === node.sibling; ) {
        if (node.return === parent) break a;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
  return children;
}
var ReactTestInstance = (function () {
  function ReactTestInstance(fiber) {
    this._fiber = void 0;
    if (!validWrapperTypes.has(fiber.tag))
      throw Error(
        "Unexpected object passed to ReactTestInstance constructor (tag: " +
          fiber.tag +
          "). This is probably a bug in React."
      );
    this._fiber = fiber;
  }
  var _proto = ReactTestInstance.prototype;
  _proto._currentFiber = function () {
    var fiber = findCurrentFiberUsingSlowPath(this._fiber);
    if (null === fiber)
      throw Error(
        "Can't read from currently-mounting component. This error is likely caused by a bug in React. Please file an issue."
      );
    return fiber;
  };
  _proto.find = function (predicate) {
    return expectOne(
      this.findAll(predicate, { deep: !1 }),
      "matching custom predicate: " + predicate.toString()
    );
  };
  _proto.findByType = function (type) {
    return expectOne(
      this.findAllByType(type, { deep: !1 }),
      'with node type: "' + (getComponentNameFromType(type) || "Unknown") + '"'
    );
  };
  _proto.findByProps = function (props) {
    return expectOne(
      this.findAllByProps(props, { deep: !1 }),
      "with props: " + JSON.stringify(props)
    );
  };
  _proto.findAll = function (predicate) {
    return _findAll(
      this,
      predicate,
      1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null
    );
  };
  _proto.findAllByType = function (type) {
    return _findAll(
      this,
      function (node) {
        return node.type === type;
      },
      1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null
    );
  };
  _proto.findAllByProps = function (props) {
    return _findAll(
      this,
      function (node) {
        var JSCompiler_temp;
        if ((JSCompiler_temp = node.props))
          a: {
            for (var key in props)
              if (node.props[key] !== props[key]) {
                JSCompiler_temp = !1;
                break a;
              }
            JSCompiler_temp = !0;
          }
        return JSCompiler_temp;
      },
      1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null
    );
  };
  return _createClass(ReactTestInstance, [
    {
      key: "instance",
      get: function () {
        var tag = this._fiber.tag;
        return 5 === tag || 26 === tag || 27 === tag
          ? getPublicInstance(this._fiber.stateNode)
          : this._fiber.stateNode;
      }
    },
    {
      key: "type",
      get: function () {
        return this._fiber.type;
      }
    },
    {
      key: "props",
      get: function () {
        return this._currentFiber().memoizedProps;
      }
    },
    {
      key: "parent",
      get: function () {
        for (var parent = this._fiber.return; null !== parent; ) {
          if (validWrapperTypes.has(parent.tag)) {
            if (3 === parent.tag && 2 > getChildren(parent).length) break;
            return wrapFiber(parent);
          }
          parent = parent.return;
        }
        return null;
      }
    },
    {
      key: "children",
      get: function () {
        return getChildren(this._currentFiber());
      }
    }
  ]);
})();
function _findAll(root, predicate, options) {
  var deep = options ? options.deep : !0,
    results = [];
  if (predicate(root) && (results.push(root), !deep)) return results;
  root.children.forEach(function (child) {
    "string" !== typeof child &&
      results.push.apply(results, _findAll(child, predicate, options));
  });
  return results;
}
function expectOne(all, message) {
  if (1 === all.length) return all[0];
  throw Error(
    (0 === all.length
      ? "No instances found "
      : "Expected 1 but found " + all.length + " instances ") + message
  );
}
var fiberToWrapper = new WeakMap();
function wrapFiber(fiber) {
  var wrapper = fiberToWrapper.get(fiber);
  void 0 === wrapper &&
    null !== fiber.alternate &&
    (wrapper = fiberToWrapper.get(fiber.alternate));
  void 0 === wrapper &&
    ((wrapper = new ReactTestInstance(fiber)),
    fiberToWrapper.set(fiber, wrapper));
  return wrapper;
}
var internals$jscomp$inline_1325 = {
  bundleType: 0,
  version: "19.3.0-native-fb-fa5212c1-20260720",
  rendererPackageName: "react-test-renderer",
  currentDispatcherRef: ReactSharedInternals,
  reconcilerVersion: "19.3.0-native-fb-fa5212c1-20260720",
  getLaneLabelMap: function () {
    for (
      var map = new Map(), lane = 1, index$157 = 0;
      31 > index$157;
      index$157++
    ) {
      var label = getLabelForLane(lane);
      map.set(lane, label);
      lane *= 2;
    }
    return map;
  },
  injectProfilingHooks: function (profilingHooks) {
    injectedProfilingHooks = profilingHooks;
  }
};
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var hook$jscomp$inline_1645 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (
    !hook$jscomp$inline_1645.isDisabled &&
    hook$jscomp$inline_1645.supportsFiber
  )
    try {
      (rendererID = hook$jscomp$inline_1645.inject(
        internals$jscomp$inline_1325
      )),
        (injectedHook = hook$jscomp$inline_1645);
    } catch (err) {}
}
exports._Scheduler = Scheduler;
exports.act = act;
exports.create = function (element, options) {
  var createNodeMock = defaultTestOptions.createNodeMock,
    isConcurrent = !1,
    isStrictMode = !1;
  "object" === typeof options &&
    null !== options &&
    ("function" === typeof options.createNodeMock &&
      (createNodeMock = options.createNodeMock),
    (isConcurrent = options.unstable_isConcurrent),
    !0 === options.unstable_strictMode && (isStrictMode = !0));
  var container = {
      children: [],
      createNodeMock: createNodeMock,
      tag: "CONTAINER"
    },
    root = createContainer(
      container,
      isConcurrent ? 1 : 0,
      null,
      isStrictMode,
      !1,
      "",
      defaultOnUncaughtError,
      defaultOnCaughtError,
      defaultOnRecoverableError,
      noop
    );
  if (null == root) throw Error("something went wrong");
  updateContainer(element, root, null, null);
  element = {
    _Scheduler: Scheduler,
    root: void 0,
    toJSON: function () {
      if (
        null == root ||
        null == root.current ||
        null == container ||
        0 === container.children.length
      )
        return null;
      if (1 === container.children.length) return toJSON(container.children[0]);
      if (
        2 === container.children.length &&
        !0 === container.children[0].isHidden &&
        !1 === container.children[1].isHidden
      )
        return toJSON(container.children[1]);
      var renderedChildren = null;
      if (container.children && container.children.length)
        for (var i = 0; i < container.children.length; i++) {
          var renderedChild = toJSON(container.children[i]);
          null !== renderedChild &&
            (null === renderedChildren
              ? (renderedChildren = [renderedChild])
              : renderedChildren.push(renderedChild));
        }
      return renderedChildren;
    },
    toTree: function () {
      return null == root || null == root.current ? null : toTree(root.current);
    },
    update: function (newElement) {
      null != root &&
        null != root.current &&
        updateContainer(newElement, root, null, null);
    },
    unmount: function () {
      null != root &&
        null != root.current &&
        (updateContainer(null, root, null, null), (root = container = null));
    },
    getInstance: function () {
      if (null == root || null == root.current) return null;
      a: {
        var JSCompiler_inline_result = root.current;
        if (JSCompiler_inline_result.child)
          switch (JSCompiler_inline_result.child.tag) {
            case 27:
            case 5:
              JSCompiler_inline_result = getPublicInstance(
                JSCompiler_inline_result.child.stateNode
              );
              break a;
            default:
              JSCompiler_inline_result =
                JSCompiler_inline_result.child.stateNode;
          }
        else JSCompiler_inline_result = null;
      }
      return JSCompiler_inline_result;
    },
    unstable_flushSync: flushSyncFromReconciler
  };
  Object.defineProperty(element, "root", {
    configurable: !0,
    enumerable: !0,
    get: function () {
      if (null === root)
        throw Error("Can't access .root on unmounted test renderer");
      var children = getChildren(root.current);
      if (0 === children.length)
        throw Error("Can't access .root on unmounted test renderer");
      return 1 === children.length ? children[0] : wrapFiber(root.current);
    }
  });
  return element;
};
exports.unstable_batchedUpdates = function (fn, a) {
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
exports.version = "19.3.0-native-fb-fa5212c1-20260720";
