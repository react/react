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
module.exports = function ($$$config) {
  function noop() {}
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return (
      "Minified React error #" +
      code +
      "; visit " +
      url +
      " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    );
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
      throw Error(formatProdErrorMessage(188));
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate) throw Error(formatProdErrorMessage(188));
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
        throw Error(formatProdErrorMessage(188));
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
          if (!didFindChild) throw Error(formatProdErrorMessage(189));
        }
      }
      if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
    }
    if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
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
  function findCurrentHostFiberWithNoPortalsImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      if (
        4 !== node.tag &&
        ((tag = findCurrentHostFiberWithNoPortalsImpl(node)), null !== tag)
      )
        return tag;
      node = node.sibling;
    }
    return null;
  }
  function isFiberSuspenseAndTimedOut(fiber) {
    var memoizedState = fiber.memoizedState;
    return (
      13 === fiber.tag &&
      null !== memoizedState &&
      null === memoizedState.dehydrated
    );
  }
  function doesFiberContain(parentFiber, childFiber) {
    for (
      var parentFiberAlternate = parentFiber.alternate;
      null !== childFiber;

    ) {
      if (childFiber === parentFiber || childFiber === parentFiberAlternate)
        return !0;
      childFiber = childFiber.return;
    }
    return !1;
  }
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable)
      return null;
    maybeIterable =
      (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
      maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
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
        if (enableViewTransition) return "ViewTransition";
      case REACT_TRACING_MARKER_TYPE:
        if (enableTransitionTracing) return "TracingMarker";
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
        if (null !== fiber.return)
          return getComponentNameFromFiber(fiber.return);
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
        if (enableViewTransition) return "ViewTransition";
      case 17:
      case 28:
        break;
      case 1:
      case 0:
      case 14:
      case 15:
        if ("function" === typeof type)
          return type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        break;
      case 23:
        return "LegacyHidden";
    }
    return null;
  }
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor) {
    0 > index$jscomp$0 ||
      ((cursor.current = valueStack[index$jscomp$0]),
      (valueStack[index$jscomp$0] = null),
      index$jscomp$0--);
  }
  function push(cursor, value) {
    index$jscomp$0++;
    valueStack[index$jscomp$0] = cursor.current;
    cursor.current = value;
  }
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
  function pushTopLevelContextObject(fiber, context, didChange) {
    if (contextStackCursor$1.current !== emptyContextObject)
      throw Error(formatProdErrorMessage(168));
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
          formatProdErrorMessage(
            108,
            getComponentNameFromFiber(fiber) || "Unknown",
            contextKey
          )
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
    if (!instance) throw Error(formatProdErrorMessage(169));
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
  function clz32Fallback(x) {
    x >>>= 0;
    return 0 === x ? 32 : (31 - ((log$1(x) / LN2) | 0)) | 0;
  }
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
        return enableParallelTransitions ? lanes & -lanes : lanes & 261888;
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
  function getEntangledLanes(root, renderLanes) {
    0 !== (renderLanes & 8) && (renderLanes |= renderLanes & 32);
    var allEntangledLanes = root.entangledLanes;
    if (0 !== allEntangledLanes)
      for (
        root = root.entanglements, allEntangledLanes &= renderLanes;
        0 < allEntangledLanes;

      ) {
        var index$2 = 31 - clz32(allEntangledLanes),
          lane = 1 << index$2;
        renderLanes |= root[index$2];
        allEntangledLanes &= ~lane;
      }
    return renderLanes;
  }
  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return currentTime + syncLaneExpirationMs;
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
        return currentTime + transitionLaneExpirationMs;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return enableRetryLaneExpiration
          ? currentTime + retryLaneExpirationMs
          : -1;
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
      0 !== root.tag &&
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
    renderLane =
      0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
    return 0 !== (renderLane & (root.suspendedLanes | renderLanes))
      ? 0
      : renderLane;
  }
  function getBumpedLaneForHydrationByLane(lane) {
    switch (lane) {
      case 2:
        lane = 1;
        break;
      case 8:
        lane = 4;
        break;
      case 32:
        lane = 16;
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
        lane = 128;
        break;
      case 268435456:
        lane = 134217728;
        break;
      default:
        lane = 0;
    }
    return lane;
  }
  function getTransitionsForLanes(root, lanes) {
    if (!enableTransitionTracing) return null;
    for (var transitionsForLanes = []; 0 < lanes; ) {
      var index$9 = 31 - clz32(lanes),
        lane = 1 << index$9;
      index$9 = root.transitionLanes[index$9];
      null !== index$9 &&
        index$9.forEach(function (transition) {
          transitionsForLanes.push(transition);
        });
      lanes &= ~lane;
    }
    return 0 === transitionsForLanes.length ? null : transitionsForLanes;
  }
  function clearTransitionsForLanes(root, lanes) {
    if (enableTransitionTracing)
      for (; 0 < lanes; ) {
        var index$10 = 31 - clz32(lanes),
          lane = 1 << index$10;
        null !== root.transitionLanes[index$10] &&
          (root.transitionLanes[index$10] = null);
        lanes &= ~lane;
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
  function onCommitRoot(root) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        injectedHook.onCommitFiberRoot(
          rendererID,
          root,
          void 0,
          128 === (root.current.flags & 128)
        );
      } catch (err) {}
  }
  function setIsStrictModeForDevtools(newIsStrictMode) {
    "function" === typeof log && unstable_setDisableYieldValue(newIsStrictMode);
    if (injectedHook && "function" === typeof injectedHook.setStrictMode)
      try {
        injectedHook.setStrictMode(rendererID, newIsStrictMode);
      } catch (err) {}
  }
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
                } catch (x$11) {
                  control = x$11;
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
              } catch (x$12) {
                control = x$12;
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
          if (
            sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]
          ) {
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
        if (enableViewTransition)
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
  function pushTreeFork(workInProgress, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress, totalChildren, index) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - (baseLength % 5);
      length = (
        baseIdWithLeadingBit &
        ((1 << numberOfOverflowBits) - 1)
      ).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId =
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress;
    } else
      (treeContextId =
        (1 << length) | (index << baseLength) | baseIdWithLeadingBit),
        (treeContextOverflow = workInProgress);
  }
  function pushMaterializedTreeId(workInProgress) {
    null !== workInProgress.return &&
      (pushTreeFork(workInProgress, 1), pushTreeId(workInProgress, 1, 0));
  }
  function popTreeContext(workInProgress) {
    for (; workInProgress === treeForkProvider; )
      (treeForkProvider = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null),
        (treeForkCount = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null);
    for (; workInProgress === treeContextProvider; )
      (treeContextProvider = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextOverflow = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextId = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null);
  }
  function restoreSuspendedTreeContext(workInProgress, suspendedContext) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextId = suspendedContext.id;
    treeContextOverflow = suspendedContext.overflow;
    treeContextProvider = workInProgress;
  }
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, null);
    fiber = getRootHostContext(nextRootInstance);
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
      ((stateHook = stateHook.memoizedState),
      isPrimaryRenderer
        ? (HostTransitionContext._currentValue = stateHook)
        : (HostTransitionContext._currentValue2 = stateHook),
      push(hostTransitionProviderCursor, fiber));
    stateHook = contextStackCursor.current;
    var nextContext = getChildHostContext(stateHook, fiber.type);
    stateHook !== nextContext &&
      (push(contextFiberStackCursor, fiber),
      push(contextStackCursor, nextContext));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber &&
      (pop(contextStackCursor), pop(contextFiberStackCursor));
    hostTransitionProviderCursor.current === fiber &&
      (pop(hostTransitionProviderCursor),
      isPrimaryRenderer
        ? (HostTransitionContext._currentValue = NotPendingTransition)
        : (HostTransitionContext._currentValue2 = NotPendingTransition));
  }
  function throwOnHydrationMismatch(fiber) {
    var error = Error(
      formatProdErrorMessage(
        418,
        1 < arguments.length && void 0 !== arguments[1] && arguments[1]
          ? "text"
          : "HTML",
        ""
      )
    );
    queueHydrationError(createCapturedValueAtFiber(error, fiber));
    throw HydrationMismatchException;
  }
  function prepareToHydrateHostInstance(fiber, hostContext) {
    if (!supportsHydration) throw Error(formatProdErrorMessage(175));
    hydrateInstance(
      fiber.stateNode,
      fiber.type,
      fiber.memoizedProps,
      hostContext,
      fiber
    ) || throwOnHydrationMismatch(fiber, !0);
  }
  function popToNextHostParent(fiber) {
    for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
      switch (hydrationParentFiber.tag) {
        case 5:
        case 31:
        case 13:
          rootOrSingletonContext = !1;
          return;
        case 27:
        case 3:
          rootOrSingletonContext = !0;
          return;
        default:
          hydrationParentFiber = hydrationParentFiber.return;
      }
  }
  function popHydrationState(fiber) {
    if (!supportsHydration || fiber !== hydrationParentFiber) return !1;
    if (!isHydrating) return popToNextHostParent(fiber), (isHydrating = !0), !1;
    var tag = fiber.tag;
    supportsSingletons
      ? 3 !== tag &&
        27 !== tag &&
        (5 !== tag ||
          (shouldDeleteUnhydratedTailInstances(fiber.type) &&
            !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
        nextHydratableInstance &&
        throwOnHydrationMismatch(fiber)
      : 3 !== tag &&
        (5 !== tag ||
          (shouldDeleteUnhydratedTailInstances(fiber.type) &&
            !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
        nextHydratableInstance &&
        throwOnHydrationMismatch(fiber);
    popToNextHostParent(fiber);
    if (13 === tag) {
      if (!supportsHydration) throw Error(formatProdErrorMessage(316));
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance =
        getNextHydratableInstanceAfterSuspenseInstance(fiber);
    } else if (31 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance =
        getNextHydratableInstanceAfterActivityInstance(fiber);
    } else
      nextHydratableInstance =
        supportsSingletons && 27 === tag
          ? getNextHydratableSiblingAfterSingleton(
              fiber.type,
              nextHydratableInstance
            )
          : hydrationParentFiber
            ? getNextHydratableSibling(fiber.stateNode)
            : null;
    return !0;
  }
  function resetHydrationState() {
    supportsHydration &&
      ((nextHydratableInstance = hydrationParentFiber = null),
      (isHydrating = !1));
  }
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
  function queueHydrationError(error) {
    null === hydrationErrors
      ? (hydrationErrors = [error])
      : hydrationErrors.push(error);
  }
  function pushProvider(providerFiber, context, nextValue) {
    isPrimaryRenderer
      ? (push(valueCursor, context._currentValue),
        (context._currentValue = nextValue))
      : (push(valueCursor, context._currentValue2),
        (context._currentValue2 = nextValue));
  }
  function popProvider(context) {
    var currentValue = valueCursor.current;
    isPrimaryRenderer
      ? (context._currentValue = currentValue)
      : (context._currentValue2 = currentValue);
    pop(valueCursor);
  }
  function scheduleContextWorkOnParentPath(
    parent,
    renderLanes,
    propagationRoot
  ) {
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
        if (null === nextFiber) throw Error(formatProdErrorMessage(341));
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
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent = currentParent.memoizedProps;
        if (null !== currentParent) {
          var context = parent.type;
          objectIs(parent.pendingProps.value, currentParent.value) ||
            (null !== current ? current.push(context) : (current = [context]));
        }
      } else if (parent === hostTransitionProviderCursor.current) {
        currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
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
      var context = currentDependencies.context;
      if (
        !objectIs(
          isPrimaryRenderer ? context._currentValue : context._currentValue2,
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
    var value = isPrimaryRenderer
      ? context._currentValue
      : context._currentValue2;
    context = { context: context, memoizedValue: value, next: null };
    if (null === lastContextDependency) {
      if (null === consumer) throw Error(formatProdErrorMessage(308));
      lastContextDependency = context;
      consumer.dependencies = { lanes: 0, firstContext: context };
      consumer.flags |= 524288;
    } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
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
    if (enableViewTransition && 0 !== (root.pendingLanes & 4194048)) {
      var queued = root.transitionTypes;
      null === queued && (queued = root.transitionTypes = []);
      for (root = 0; root < transitionTypes.length; root++) {
        var transitionType = transitionTypes[root];
        -1 === queued.indexOf(transitionType) && queued.push(transitionType);
      }
    }
  }
  function claimQueuedTransitionTypes(root) {
    var claimed = root.transitionTypes;
    root.transitionTypes = null;
    return claimed;
  }
  function noop$1() {}
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
          if (!onlyLegacy)
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
                  null !== root.cancelPendingCommit ||
                    root.timeoutHandle !== noTimeout
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
    processRootScheduleInMicrotask();
  }
  function processRootScheduleInMicrotask() {
    mightHavePendingSyncWork = didScheduleMicrotask = !1;
    var syncTransitionLanes = 0;
    0 !== currentEventTransitionLane &&
      (syncTransitionLanes = shouldAttemptEagerTransition()
        ? currentEventTransitionLane
        : 32);
    for (
      var currentTime = now(), prev = null, root = firstScheduledRoot;
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
            isomorphicDefaultTransitionIndicator() || noop$1;
        } catch (x) {
          (pendingIsomorphicIndicator = noop$1), reportGlobalError(x);
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
                onDefaultTransitionIndicator() || noop$1;
            } catch (x) {
              (syncTransitionLanes.pendingIndicator = noop$1),
                reportGlobalError(x);
            }
        syncTransitionLanes = syncTransitionLanes.next;
      }
    }
  }
  function scheduleTaskForRootDuringMicrotask(root, currentTime) {
    var pendingLanes = root.pendingLanes,
      suspendedLanes = root.suspendedLanes,
      pingedLanes = root.pingedLanes,
      expirationTimes = root.expirationTimes;
    for (
      pendingLanes = enableRetryLaneExpiration
        ? pendingLanes
        : pendingLanes & -62914561;
      0 < pendingLanes;

    ) {
      var index$3 = 31 - clz32(pendingLanes),
        lane = 1 << index$3,
        expirationTime = expirationTimes[index$3];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index$3] = computeExpirationTime(lane, currentTime);
      } else expirationTime <= currentTime && (root.expiredLanes |= lane);
      pendingLanes &= ~lane;
    }
    currentTime = workInProgressRoot;
    suspendedLanes = workInProgressRootRenderLanes;
    suspendedLanes = getNextLanes(
      root,
      root === currentTime ? suspendedLanes : 0,
      null !== root.cancelPendingCommit || root.timeoutHandle !== noTimeout
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
    null !== pingedLanes &&
      null !== pingedLanes &&
      cancelCallback$1(pingedLanes);
    root.callbackPriority = 2;
    root.callbackNode = null;
    return 2;
  }
  function performWorkOnRootViaSchedulerTask(root, didTimeout) {
    if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
      return (root.callbackNode = null), (root.callbackPriority = 0), null;
    var originalCallbackNode = root.callbackNode;
    if (flushPendingEffects() && root.callbackNode !== originalCallbackNode)
      return null;
    var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
    workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
      root,
      root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
      null !== root.cancelPendingCommit || root.timeoutHandle !== noTimeout
    );
    if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
    performWorkOnRoot(
      root,
      workInProgressRootRenderLanes$jscomp$0,
      !disableSchedulerTimeoutInWorkLoop && didTimeout
    );
    scheduleTaskForRootDuringMicrotask(root, now());
    return null != root.callbackNode &&
      root.callbackNode === originalCallbackNode
      ? performWorkOnRootViaSchedulerTask.bind(null, root)
      : null;
  }
  function performSyncWorkOnRoot(root, lanes) {
    if (flushPendingEffects()) return null;
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
      : scheduleCallback$3(
          ImmediatePriority,
          processRootScheduleInImmediateTask
        );
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
  function registerDefaultIndicator(onDefaultTransitionIndicator) {
    void 0 === isomorphicDefaultTransitionIndicator
      ? (isomorphicDefaultTransitionIndicator = onDefaultTransitionIndicator)
      : isomorphicDefaultTransitionIndicator !== onDefaultTransitionIndicator &&
        ((isomorphicDefaultTransitionIndicator = null),
        stopIsomorphicDefaultIndicator());
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
  function peekCacheFromPool() {
    var cacheResumedFromPreviousRender = resumedCache.current;
    return null !== cacheResumedFromPreviousRender
      ? cacheResumedFromPreviousRender
      : workInProgressRoot.pooledCache;
  }
  function pushTransition(
    offscreenWorkInProgress,
    prevCachePool,
    newTransitions
  ) {
    null === prevCachePool
      ? push(resumedCache, resumedCache.current)
      : push(resumedCache, prevCachePool.pool);
    enableTransitionTracing &&
      (null === transitionStack.current
        ? push(transitionStack, newTransitions)
        : null === newTransitions
          ? push(transitionStack, transitionStack.current)
          : push(
              transitionStack,
              transitionStack.current.concat(newTransitions)
            ));
  }
  function popTransition(workInProgress, current) {
    null !== current &&
      (enableTransitionTracing && pop(transitionStack), pop(resumedCache));
  }
  function getSuspendedCache() {
    var cacheFromPool = peekCacheFromPool();
    return null === cacheFromPool
      ? null
      : {
          parent: isPrimaryRenderer
            ? CacheContext._currentValue
            : CacheContext._currentValue2,
          pool: cacheFromPool
        };
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
  function isThenableResolved(thenable) {
    thenable = thenable.status;
    return "fulfilled" === thenable || "rejected" === thenable;
  }
  function trackUsedThenable(thenableState, thenable, index) {
    index = thenableState[index];
    void 0 === index
      ? thenableState.push(thenable)
      : index !== thenable &&
        (thenable.then(noop$1, noop$1), (thenable = index));
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        thenableState = thenable.reason;
        checkIfUseWrappedInAsyncCatch(thenableState);
        if (void 0 === thenableState && !("reason" in thenable))
          throw Error(formatProdErrorMessage(600));
        throw thenableState;
      default:
        if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
        else {
          thenableState = workInProgressRoot;
          if (null !== thenableState && 100 < thenableState.shellSuspendCounter)
            throw Error(formatProdErrorMessage(482));
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
  function getSuspendedThenable() {
    if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function checkIfUseWrappedInAsyncCatch(rejectedReason) {
    if (
      rejectedReason === SuspenseException ||
      rejectedReason === SuspenseActionException
    )
      throw Error(formatProdErrorMessage(483));
  }
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
      throw Error(formatProdErrorMessage(525));
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      formatProdErrorMessage(
        31,
        "[object Object]" === returnFiber
          ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
          : returnFiber
      )
    );
  }
  function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions
          ? ((returnFiber.deletions = [childToDelete]),
            (returnFiber.flags |= 16))
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
            ? ((newFiber.flags |= 134217730), lastPlacedIndex)
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
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          resultingFirstChild
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
        isHydrating && pushTreeFork(returnFiber, newIdx);
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
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(
      returnFiber,
      currentFirstChild,
      newChildren,
      lanes
    ) {
      if (null == newChildren) throw Error(formatProdErrorMessage(151));
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
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          resultingFirstChild
        );
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildren.next())
          (step = createChild(returnFiber, step.value, lanes)),
            null !== step &&
              ((currentFirstChild = placeChild(
                step,
                currentFirstChild,
                newIdx
              )),
              null === previousNewFiber
                ? (resultingFirstChild = step)
                : (previousNewFiber.sibling = step),
              (previousNewFiber = step));
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (
        oldFiber = mapRemainingChildren(oldFiber);
        !step.done;
        newIdx++, step = newChildren.next()
      )
        (step = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          step.value,
          lanes
        )),
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
      isHydrating && pushTreeFork(returnFiber, newIdx);
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
                    lanes = useFiber(
                      currentFirstChild,
                      newChild.children || []
                    );
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
            throw Error(formatProdErrorMessage(150));
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
        if (x === SuspenseException || x === SuspenseActionException) throw x;
        var fiber = createFiber(29, x, null, returnFiber.mode);
        fiber.lanes = lanes;
        fiber.return = returnFiber;
        return fiber;
      } finally {
      }
    };
  }
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
          null === sourceFiber ||
            sourceFiber._visibility & 1 ||
            (isHidden = !0)),
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
    throwIfInfiniteUpdateLoopDetected(!1);
    for (var parent = sourceFiber.return; null !== parent; )
      (sourceFiber = parent), (parent = sourceFiber.return);
    return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
  }
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
                  newState = workInProgress.call(
                    instance,
                    newState,
                    updateLane
                  );
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
      throw Error(formatProdErrorMessage(191, callback));
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
  function pushPrimaryTreeSuspenseHandler(handler) {
    var current = handler.alternate,
      props = handler.pendingProps;
    push(suspenseStackCursor, suspenseStackCursor.current & 1);
    !0 !== props.unstable_avoidThisFallback ||
    (null !== current && null === currentTreeHiddenStackCursor.current)
      ? (push(suspenseHandlerStackCursor, handler),
        null === shellBoundary &&
          (null === current || null !== currentTreeHiddenStackCursor.current
            ? (shellBoundary = handler)
            : null !== current.memoizedState && (shellBoundary = handler)))
      : null === shellBoundary
        ? push(suspenseHandlerStackCursor, handler)
        : push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
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
        if (
          null !== state &&
          ((state = state.dehydrated),
          null === state ||
            isSuspenseInstancePending(state) ||
            isSuspenseInstanceFallback(state))
        )
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
  function throwInvalidHookError() {
    throw Error(formatProdErrorMessage(321));
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
    var didRenderTooFewHooks =
      null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdate = !1;
    thenableIndexCounter = 0;
    thenableState = null;
    if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
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
      if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
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
  function checkDidRenderIdHook() {
    var didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
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
    thenableIndexCounter = localIdCounter = 0;
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
          throw Error(formatProdErrorMessage(467));
        throw Error(formatProdErrorMessage(310));
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
    throw Error(formatProdErrorMessage(438, String(usable)));
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
              data: enableNoCloningMemoCache
                ? current.data
                : current.data.map(function (array) {
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
        updateQueue = memoCache.data[memoCache.index] = Array(size),
          current = 0;
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
    if (null === queue) throw Error(formatProdErrorMessage(311));
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
        didReadFromEntangledAsyncAction$57 = !1;
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
                (didReadFromEntangledAsyncAction$57 = !0);
          else if ((renderLanes & revertLane) === revertLane) {
            update = update.next;
            revertLane === currentEntangledLane &&
              (didReadFromEntangledAsyncAction$57 = !0);
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
        didReadFromEntangledAsyncAction$57 &&
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
    if (null === queue) throw Error(formatProdErrorMessage(311));
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
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber,
      hook = updateWorkInProgressHook(),
      isHydrating$jscomp$0 = isHydrating;
    if (isHydrating$jscomp$0) {
      if (void 0 === getServerSnapshot)
        throw Error(formatProdErrorMessage(407));
      getServerSnapshot = getServerSnapshot();
    } else getServerSnapshot = getSnapshot();
    var snapshotChanged = !objectIs(
      (currentHook || hook).memoizedState,
      getServerSnapshot
    );
    snapshotChanged &&
      ((hook.memoizedState = getServerSnapshot), (didReceiveUpdate = !0));
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
        updateStoreInstance.bind(
          null,
          fiber,
          hook,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
      isHydrating$jscomp$0 ||
        0 !== (renderLanes & 127) ||
        pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
    }
    return getServerSnapshot;
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
    if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
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
      enableViewTransition &&
        (currentTransition.types =
          null !== prevTransition ? prevTransition.types : null);
      enableTransitionTracing &&
        ((currentTransition.name = null), (currentTransition.startTime = -1));
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
      } catch (error$61) {
        onActionError(actionQueue, node, error$61);
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
    if (isHydrating) {
      var ssrFormState = workInProgressRoot.formState;
      if (null !== ssrFormState) {
        a: {
          var JSCompiler_inline_result = currentlyRenderingFiber;
          if (isHydrating) {
            if (nextHydratableInstance) {
              var markerInstance = canHydrateFormStateMarker(
                nextHydratableInstance,
                rootOrSingletonContext
              );
              if (markerInstance) {
                nextHydratableInstance =
                  getNextHydratableSibling(markerInstance);
                JSCompiler_inline_result =
                  isFormStateMarkerMatching(markerInstance);
                break a;
              }
            }
            throwOnHydrationMismatch(JSCompiler_inline_result);
          }
          JSCompiler_inline_result = !1;
        }
        JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
      }
    }
    ssrFormState = mountWorkInProgressHook();
    ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
    JSCompiler_inline_result = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: actionStateReducer,
      lastRenderedState: initialStateProp
    };
    ssrFormState.queue = JSCompiler_inline_result;
    ssrFormState = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result
    );
    JSCompiler_inline_result.dispatch = ssrFormState;
    JSCompiler_inline_result = mountStateImpl(!1);
    var setPendingState = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber,
      !1,
      JSCompiler_inline_result.queue
    );
    JSCompiler_inline_result = mountWorkInProgressHook();
    markerInstance = {
      state: initialStateProp,
      dispatch: null,
      action: action,
      pending: null
    };
    JSCompiler_inline_result.queue = markerInstance;
    ssrFormState = dispatchActionState.bind(
      null,
      currentlyRenderingFiber,
      markerInstance,
      setPendingState,
      ssrFormState
    );
    markerInstance.dispatch = ssrFormState;
    JSCompiler_inline_result.memoizedState = action;
    return [initialStateProp, ssrFormState, !1];
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
        throw Error(formatProdErrorMessage(440));
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
    updateEffectImpl(
      4,
      4,
      imperativeHandleEffect.bind(null, create, ref),
      deps
    );
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
  function startTransition(
    fiber,
    queue,
    pendingState,
    finishedState,
    callback,
    options
  ) {
    var previousPriority = getCurrentUpdatePriority();
    setCurrentUpdatePriority(
      0 !== previousPriority && 8 > previousPriority ? previousPriority : 8
    );
    var prevTransition = ReactSharedInternals.T,
      currentTransition = {};
    enableViewTransition &&
      (currentTransition.types =
        null !== prevTransition ? prevTransition.types : null);
    enableTransitionTracing &&
      ((currentTransition.name =
        void 0 !== options && void 0 !== options.name ? options.name : null),
      (currentTransition.startTime = now()));
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
        requestUpdateLane()
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        null !== prevTransition &&
          null !== currentTransition.types &&
          (prevTransition.types = currentTransition.types),
        (ReactSharedInternals.T = prevTransition);
    }
  }
  function ensureFormComponentIsStateful(formFiber) {
    var existingStateHook = formFiber.memoizedState;
    if (null !== existingStateHook) return existingStateHook;
    existingStateHook = {
      memoizedState: NotPendingTransition,
      baseState: NotPendingTransition,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: NotPendingTransition
      },
      next: null
    };
    var initialResetState = {};
    existingStateHook.next = {
      memoizedState: initialResetState,
      baseState: initialResetState,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialResetState
      },
      next: null
    };
    formFiber.memoizedState = existingStateHook;
    formFiber = formFiber.alternate;
    null !== formFiber && (formFiber.memoizedState = existingStateHook);
    return existingStateHook;
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
  function refreshCache(fiber, seedKey, seedValue) {
    for (var provider = fiber.return; null !== provider; ) {
      switch (provider.tag) {
        case 24:
        case 3:
          var lane = requestUpdateLane();
          fiber = createUpdate(lane);
          var root = enqueueUpdate(provider, fiber, lane);
          null !== root &&
            (scheduleUpdateOnFiber(root, provider, lane),
            entangleTransitions(root, provider, lane));
          provider = createCache();
          null !== seedKey &&
            void 0 !== seedKey &&
            null !== root &&
            provider.data.set(seedKey, seedValue);
          fiber.payload = { cache: provider };
          return;
      }
      provider = provider.return;
    }
  }
  function dispatchReducerAction(fiber, queue, action) {
    var lane = requestUpdateLane();
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
  }
  function dispatchSetState(fiber, queue, action) {
    var lane = requestUpdateLane();
    dispatchSetStateInternal(fiber, queue, action, lane);
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
  function dispatchOptimisticSetState(
    fiber,
    throwIfDuringRender,
    queue,
    action
  ) {
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
      if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
    } else
      (throwIfDuringRender = enqueueConcurrentHookUpdate(
        fiber,
        queue,
        action,
        2
      )),
        null !== throwIfDuringRender &&
          scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
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
  function resolveClassComponentProps(Component, baseProps) {
    var newProps = baseProps;
    if ("ref" in baseProps) {
      newProps = {};
      for (var propName in baseProps)
        "ref" !== propName && (newProps[propName] = baseProps[propName]);
    }
    if ((Component = Component.defaultProps)) {
      newProps === baseProps && (newProps = assign({}, newProps));
      for (var propName$63 in Component)
        void 0 === newProps[propName$63] &&
          (newProps[propName$63] = Component[propName$63]);
    }
    return newProps;
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
      returnFiber = sourceFiber.alternate;
      null !== returnFiber &&
        propagateParentContextChanges(
          returnFiber,
          sourceFiber,
          rootRenderLanes,
          !0
        );
      sourceFiber = suspenseHandlerStackCursor.current;
      if (null !== sourceFiber) {
        switch (sourceFiber.tag) {
          case 31:
          case 13:
          case 19:
            return (
              null === shellBoundary
                ? renderDidSuspendDelayIfPossible()
                : null === sourceFiber.alternate &&
                  0 === workInProgressRootExitStatus &&
                  (workInProgressRootExitStatus = 3),
              (sourceFiber.flags &= -257),
              (sourceFiber.flags |= 65536),
              (sourceFiber.lanes = rootRenderLanes),
              value === noopSuspenseyCommitThenable
                ? (sourceFiber.flags |= 16384)
                : ((returnFiber = sourceFiber.updateQueue),
                  null === returnFiber
                    ? (sourceFiber.updateQueue = new Set([value]))
                    : returnFiber.add(value),
                  attachPingListener(root, value, rootRenderLanes)),
              !1
            );
          case 22:
            return (
              (sourceFiber.flags |= 65536),
              value === noopSuspenseyCommitThenable
                ? (sourceFiber.flags |= 16384)
                : ((returnFiber = sourceFiber.updateQueue),
                  null === returnFiber
                    ? ((returnFiber = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([value])
                      }),
                      (sourceFiber.updateQueue = returnFiber))
                    : ((sourceFiber = returnFiber.retryQueue),
                      null === sourceFiber
                        ? (returnFiber.retryQueue = new Set([value]))
                        : sourceFiber.add(value)),
                  attachPingListener(root, value, rootRenderLanes)),
              !1
            );
        }
        throw Error(formatProdErrorMessage(435, sourceFiber.tag));
      }
      attachPingListener(root, value, rootRenderLanes);
      renderDidSuspendDelayIfPossible();
      return !1;
    }
    if (isHydrating)
      return (
        (returnFiber = suspenseHandlerStackCursor.current),
        null !== returnFiber
          ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256),
            (returnFiber.flags |= 65536),
            (returnFiber.lanes = rootRenderLanes),
            value !== HydrationMismatchException &&
              ((root = Error(formatProdErrorMessage(422), { cause: value })),
              queueHydrationError(
                createCapturedValueAtFiber(root, sourceFiber)
              )))
          : (value !== HydrationMismatchException &&
              ((returnFiber = Error(formatProdErrorMessage(423), {
                cause: value
              })),
              queueHydrationError(
                createCapturedValueAtFiber(returnFiber, sourceFiber)
              )),
            (root = root.current.alternate),
            (root.flags |= 65536),
            (rootRenderLanes &= -rootRenderLanes),
            (root.lanes |= rootRenderLanes),
            (value = createCapturedValueAtFiber(value, sourceFiber)),
            (rootRenderLanes = createRootErrorUpdate(
              root.stateNode,
              value,
              rootRenderLanes
            )),
            enqueueCapturedUpdate(root, rootRenderLanes),
            4 !== workInProgressRootExitStatus &&
              (workInProgressRootExitStatus = 2)),
        !1
      );
    var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
    wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
    null === workInProgressRootConcurrentErrors
      ? (workInProgressRootConcurrentErrors = [wrapperError])
      : workInProgressRootConcurrentErrors.push(wrapperError);
    4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
    if (null === returnFiber) return !0;
    value = createCapturedValueAtFiber(value, sourceFiber);
    sourceFiber = returnFiber;
    do {
      switch (sourceFiber.tag) {
        case 3:
          return (
            (sourceFiber.flags |= 65536),
            (root = rootRenderLanes & -rootRenderLanes),
            (sourceFiber.lanes |= root),
            (root = createRootErrorUpdate(sourceFiber.stateNode, value, root)),
            enqueueCapturedUpdate(sourceFiber, root),
            !1
          );
        case 1:
          returnFiber = sourceFiber.type;
          wrapperError = sourceFiber.stateNode;
          if (
            0 === (sourceFiber.flags & 128) &&
            ("function" === typeof returnFiber.getDerivedStateFromError ||
              (null !== wrapperError &&
                "function" === typeof wrapperError.componentDidCatch &&
                (null === legacyErrorBoundariesThatAlreadyFailed ||
                  !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError))))
          )
            return (
              (sourceFiber.flags |= 65536),
              (rootRenderLanes &= -rootRenderLanes),
              (sourceFiber.lanes |= rootRenderLanes),
              (rootRenderLanes = createClassErrorUpdate(rootRenderLanes)),
              initializeClassErrorUpdate(
                rootRenderLanes,
                root,
                sourceFiber,
                value
              ),
              enqueueCapturedUpdate(sourceFiber, rootRenderLanes),
              !1
            );
          break;
        case 22:
          if (null !== sourceFiber.memoizedState)
            return (sourceFiber.flags |= 65536), !1;
      }
      sourceFiber = sourceFiber.return;
    } while (null !== sourceFiber);
    return !1;
  }
  function processTransitionCallbacks(pendingTransitions, endTime, callbacks) {
    if (enableTransitionTracing && null !== pendingTransitions) {
      var transitionStart = pendingTransitions.transitionStart,
        onTransitionStart = callbacks.onTransitionStart;
      null !== transitionStart &&
        null != onTransitionStart &&
        transitionStart.forEach(function (transition) {
          null != transition.name &&
            onTransitionStart(transition.name, transition.startTime);
        });
      transitionStart = pendingTransitions.markerProgress;
      var onMarkerProgress = callbacks.onMarkerProgress;
      null != onMarkerProgress &&
        null !== transitionStart &&
        transitionStart.forEach(function (markerInstance, markerName) {
          if (null !== markerInstance.transitions) {
            var pending =
              null !== markerInstance.pendingBoundaries
                ? Array.from(markerInstance.pendingBoundaries.values())
                : [];
            markerInstance.transitions.forEach(function (transition) {
              null != transition.name &&
                onMarkerProgress(
                  transition.name,
                  markerName,
                  transition.startTime,
                  endTime,
                  pending
                );
            });
          }
        });
      transitionStart = pendingTransitions.markerComplete;
      var onMarkerComplete = callbacks.onMarkerComplete;
      null !== transitionStart &&
        null != onMarkerComplete &&
        transitionStart.forEach(function (transitions, markerName) {
          transitions.forEach(function (transition) {
            null != transition.name &&
              onMarkerComplete(
                transition.name,
                markerName,
                transition.startTime,
                endTime
              );
          });
        });
      transitionStart = pendingTransitions.markerIncomplete;
      var onMarkerIncomplete = callbacks.onMarkerIncomplete;
      null != onMarkerIncomplete &&
        null !== transitionStart &&
        transitionStart.forEach(function (_ref, markerName) {
          var aborts = _ref.aborts;
          _ref.transitions.forEach(function (transition) {
            var filteredAborts = [];
            aborts.forEach(function (abort) {
              switch (abort.reason) {
                case "marker":
                  filteredAborts.push({
                    type: "marker",
                    name: abort.name,
                    endTime: endTime
                  });
                  break;
                case "suspense":
                  filteredAborts.push({
                    type: "suspense",
                    name: abort.name,
                    endTime: endTime
                  });
              }
            });
            0 < filteredAborts.length &&
              null != transition.name &&
              onMarkerIncomplete(
                transition.name,
                markerName,
                transition.startTime,
                filteredAborts
              );
          });
        });
      transitionStart = pendingTransitions.transitionProgress;
      var onTransitionProgress = callbacks.onTransitionProgress;
      null != onTransitionProgress &&
        null !== transitionStart &&
        transitionStart.forEach(function (pending, transition) {
          null != transition.name &&
            onTransitionProgress(
              transition.name,
              transition.startTime,
              endTime,
              Array.from(pending.values())
            );
        });
      pendingTransitions = pendingTransitions.transitionComplete;
      var onTransitionComplete = callbacks.onTransitionComplete;
      null !== pendingTransitions &&
        null != onTransitionComplete &&
        pendingTransitions.forEach(function (transition) {
          null != transition.name &&
            onTransitionComplete(
              transition.name,
              transition.startTime,
              endTime
            );
        });
    }
  }
  function pushRootMarkerInstance(workInProgress) {
    if (enableTransitionTracing) {
      var transitions = workInProgressTransitions,
        root = workInProgress.stateNode;
      null !== transitions &&
        transitions.forEach(function (transition) {
          if (!root.incompleteTransitions.has(transition)) {
            var markerInstance = {
              tag: 0,
              transitions: new Set([transition]),
              pendingBoundaries: null,
              aborts: null,
              name: null
            };
            root.incompleteTransitions.set(transition, markerInstance);
          }
        });
      var markerInstances = [];
      root.incompleteTransitions.forEach(function (markerInstance) {
        markerInstances.push(markerInstance);
      });
      push(markerInstanceStack, markerInstances);
    }
  }
  function pushMarkerInstance(workInProgress, markerInstance) {
    enableTransitionTracing &&
      (null === markerInstanceStack.current
        ? push(markerInstanceStack, [markerInstance])
        : push(
            markerInstanceStack,
            markerInstanceStack.current.concat(markerInstance)
          ));
  }
  function reconcileChildren(
    current,
    workInProgress,
    nextChildren,
    renderLanes
  ) {
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
    nextProps = renderWithHooks(
      current,
      workInProgress,
      Component,
      propsWithoutRef,
      ref,
      renderLanes
    );
    key = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && key && pushMaterializedTreeId(workInProgress);
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
        return bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
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
    if (
      "hidden" === nextProps.mode ||
      "unstable-defer-without-hiding" === nextProps.mode
    ) {
      if (0 !== (workInProgress.flags & 128)) {
        prevState =
          null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
        if (null !== current) {
          nextChildren = workInProgress.child = current.child;
          for (nextProps = 0; null !== nextChildren; )
            (nextProps =
              nextProps | nextChildren.lanes | nextChildren.childLanes),
              (nextChildren = nextChildren.sibling);
          nextChildren = nextProps & ~prevState;
        } else (nextChildren = 0), (workInProgress.child = null);
        return deferHiddenOffscreenComponent(
          current,
          workInProgress,
          prevState,
          renderLanes,
          nextChildren
        );
      }
      if (0 !== (renderLanes & 536870912))
        (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
          null !== current &&
            pushTransition(
              workInProgress,
              null !== prevState ? prevState.cachePool : null,
              null
            ),
          null !== prevState
            ? pushHiddenContext(workInProgress, prevState)
            : reuseHiddenContextOnStack(),
          pushOffscreenSuspenseHandler(workInProgress);
      else
        return (
          (nextChildren = workInProgress.lanes = 536870912),
          deferHiddenOffscreenComponent(
            current,
            workInProgress,
            null !== prevState
              ? prevState.baseLanes | renderLanes
              : renderLanes,
            renderLanes,
            nextChildren
          )
        );
    } else if (null !== prevState) {
      nextProps = prevState.cachePool;
      var transitions = null;
      if (enableTransitionTracing) {
        var instance = workInProgress.stateNode;
        null !== instance &&
          null != instance._transitions &&
          (transitions = Array.from(instance._transitions));
      }
      pushTransition(workInProgress, nextProps, transitions);
      pushHiddenContext(workInProgress, prevState);
      reuseSuspenseHandlerOnStack();
      workInProgress.memoizedState = null;
    } else
      null !== current && pushTransition(workInProgress, null, null),
        reuseHiddenContextOnStack(),
        reuseSuspenseHandlerOnStack();
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
        : {
            parent: isPrimaryRenderer
              ? CacheContext._currentValue
              : CacheContext._currentValue2,
            pool: JSCompiler_inline_result
          };
    workInProgress.memoizedState = {
      baseLanes: nextBaseLanes,
      cachePool: JSCompiler_inline_result
    };
    null !== current && pushTransition(workInProgress, null, null);
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
    current = mountActivityChildren(
      workInProgress,
      workInProgress.pendingProps
    );
    current.flags |= 2;
    popSuspenseHandler(workInProgress);
    workInProgress.memoizedState = null;
    return current;
  }
  function updateActivityComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      didSuspend = 0 !== (workInProgress.flags & 128);
    workInProgress.flags &= -129;
    if (null === current) {
      if (isHydrating) {
        if ("hidden" === nextProps.mode)
          return (
            (current = mountActivityChildren(workInProgress, nextProps)),
            (workInProgress.lanes = 536870912),
            bailoutOffscreenComponent(null, current)
          );
        pushDehydratedActivitySuspenseHandler(workInProgress);
        (current = nextHydratableInstance)
          ? ((current = canHydrateActivityInstance(
              current,
              rootOrSingletonContext
            )),
            null !== current &&
              ((workInProgress.memoizedState = {
                dehydrated: current,
                treeContext:
                  null !== treeContextProvider
                    ? { id: treeContextId, overflow: treeContextOverflow }
                    : null,
                retryLane: 536870912,
                hydrationErrors: null
              }),
              (renderLanes = createFiberFromDehydratedFragment(current)),
              (renderLanes.return = workInProgress),
              (workInProgress.child = renderLanes),
              (hydrationParentFiber = workInProgress),
              (nextHydratableInstance = null)))
          : (current = null);
        if (null === current) throw throwOnHydrationMismatch(workInProgress);
        workInProgress.lanes = 536870912;
        return null;
      }
      return mountActivityChildren(workInProgress, nextProps);
    }
    var prevState = current.memoizedState;
    if (null !== prevState) {
      var dehydrated = prevState.dehydrated;
      pushDehydratedActivitySuspenseHandler(workInProgress);
      if (didSuspend)
        if (workInProgress.flags & 256)
          (workInProgress.flags &= -257),
            (workInProgress = retryActivityComponentWithoutHydrating(
              current,
              workInProgress,
              renderLanes
            ));
        else if (null !== workInProgress.memoizedState)
          (workInProgress.child = current.child),
            (workInProgress.flags |= 128),
            (workInProgress = null);
        else throw Error(formatProdErrorMessage(558));
      else if (
        (didReceiveUpdate ||
          propagateParentContextChanges(
            current,
            workInProgress,
            renderLanes,
            !1
          ),
        (didSuspend = 0 !== (renderLanes & current.childLanes)),
        didReceiveUpdate || didSuspend)
      ) {
        nextProps = workInProgressRoot;
        if (
          null !== nextProps &&
          ((dehydrated = getBumpedLaneForHydration(nextProps, renderLanes)),
          0 !== dehydrated && dehydrated !== prevState.retryLane)
        )
          throw (
            ((prevState.retryLane = dehydrated),
            enqueueConcurrentRenderForLane(current, dehydrated),
            scheduleUpdateOnFiber(nextProps, current, dehydrated),
            SelectiveHydrationException)
          );
        renderDidSuspendDelayIfPossible();
        workInProgress = retryActivityComponentWithoutHydrating(
          current,
          workInProgress,
          renderLanes
        );
      } else
        (current = prevState.treeContext),
          supportsHydration &&
            ((nextHydratableInstance =
              getFirstHydratableChildWithinActivityInstance(dehydrated)),
            (hydrationParentFiber = workInProgress),
            (isHydrating = !0),
            (hydrationErrors = null),
            (rootOrSingletonContext = !1),
            null !== current &&
              restoreSuspendedTreeContext(workInProgress, current)),
          (workInProgress = mountActivityChildren(workInProgress, nextProps)),
          (workInProgress.flags |= 134221824);
      return workInProgress;
    }
    current = createWorkInProgress(current.child, {
      mode: nextProps.mode,
      children: nextProps.children
    });
    current.ref = workInProgress.ref;
    workInProgress.child = current;
    current.return = workInProgress;
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
        throw Error(formatProdErrorMessage(284));
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
    if (!disableLegacyContextForFunctionComponents) {
      var context = isContextProvider(Component)
        ? previousContext
        : contextStackCursor$1.current;
      context = getMaskedContext(workInProgress, context);
    }
    prepareToReadContext(workInProgress);
    Component = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes
    );
    nextProps = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress);
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
    workInProgress.updateQueue = null;
    nextProps = renderWithHooksAgain(
      workInProgress,
      Component,
      nextProps,
      secondArg
    );
    finishRenderingHooks(current);
    Component = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && Component && pushMaterializedTreeId(workInProgress);
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
    if (null === workInProgress.stateNode) {
      var isLegacyContextConsumer = !1,
        unmaskedContext = emptyContextObject;
      var context = Component.contextType;
      "object" === typeof context && null !== context
        ? (context = readContext(context))
        : ((unmaskedContext = isContextProvider(Component)
            ? previousContext
            : contextStackCursor$1.current),
          (isLegacyContextConsumer = Component.contextTypes),
          (context = (isLegacyContextConsumer =
            null !== isLegacyContextConsumer &&
            void 0 !== isLegacyContextConsumer)
            ? getMaskedContext(workInProgress, unmaskedContext)
            : emptyContextObject));
      var instance = new Component(nextProps, context);
      workInProgress.memoizedState =
        null !== instance.state && void 0 !== instance.state
          ? instance.state
          : null;
      instance.updater = classComponentUpdater;
      workInProgress.stateNode = instance;
      instance._reactInternals = workInProgress;
      isLegacyContextConsumer &&
        ((isLegacyContextConsumer = workInProgress.stateNode),
        (isLegacyContextConsumer.__reactInternalMemoizedUnmaskedChildContext =
          unmaskedContext),
        (isLegacyContextConsumer.__reactInternalMemoizedMaskedChildContext =
          context));
      unmaskedContext = workInProgress.stateNode;
      unmaskedContext.props = nextProps;
      unmaskedContext.state = workInProgress.memoizedState;
      unmaskedContext.refs = {};
      initializeUpdateQueue(workInProgress);
      isLegacyContextConsumer = Component.contextType;
      "object" === typeof isLegacyContextConsumer &&
      null !== isLegacyContextConsumer
        ? (unmaskedContext.context = readContext(isLegacyContextConsumer))
        : ((isLegacyContextConsumer = isContextProvider(Component)
            ? previousContext
            : contextStackCursor$1.current),
          (unmaskedContext.context = getMaskedContext(
            workInProgress,
            isLegacyContextConsumer
          )));
      unmaskedContext.state = workInProgress.memoizedState;
      isLegacyContextConsumer = Component.getDerivedStateFromProps;
      "function" === typeof isLegacyContextConsumer &&
        (applyDerivedStateFromProps(
          workInProgress,
          Component,
          isLegacyContextConsumer,
          nextProps
        ),
        (unmaskedContext.state = workInProgress.memoizedState));
      "function" === typeof Component.getDerivedStateFromProps ||
        "function" === typeof unmaskedContext.getSnapshotBeforeUpdate ||
        ("function" !== typeof unmaskedContext.UNSAFE_componentWillMount &&
          "function" !== typeof unmaskedContext.componentWillMount) ||
        ((isLegacyContextConsumer = unmaskedContext.state),
        "function" === typeof unmaskedContext.componentWillMount &&
          unmaskedContext.componentWillMount(),
        "function" === typeof unmaskedContext.UNSAFE_componentWillMount &&
          unmaskedContext.UNSAFE_componentWillMount(),
        isLegacyContextConsumer !== unmaskedContext.state &&
          classComponentUpdater.enqueueReplaceState(
            unmaskedContext,
            unmaskedContext.state,
            null
          ),
        processUpdateQueue(
          workInProgress,
          nextProps,
          unmaskedContext,
          renderLanes
        ),
        suspendIfUpdateReadFromEntangledAsyncAction(),
        (unmaskedContext.state = workInProgress.memoizedState));
      "function" === typeof unmaskedContext.componentDidMount &&
        (workInProgress.flags |= 4194308);
      nextProps = !0;
    } else if (null === current) {
      unmaskedContext = workInProgress.stateNode;
      var unresolvedOldProps = workInProgress.memoizedProps;
      isLegacyContextConsumer = resolveClassComponentProps(
        Component,
        unresolvedOldProps
      );
      unmaskedContext.props = isLegacyContextConsumer;
      var oldContext = unmaskedContext.context;
      context = Component.contextType;
      "object" === typeof context && null !== context
        ? (context = readContext(context))
        : ((context = isContextProvider(Component)
            ? previousContext
            : contextStackCursor$1.current),
          (context = getMaskedContext(workInProgress, context)));
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;
      instance =
        "function" === typeof getDerivedStateFromProps ||
        "function" === typeof unmaskedContext.getSnapshotBeforeUpdate;
      unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
      instance ||
        ("function" !==
          typeof unmaskedContext.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof unmaskedContext.componentWillReceiveProps) ||
        ((unresolvedOldProps || oldContext !== context) &&
          callComponentWillReceiveProps(
            workInProgress,
            unmaskedContext,
            nextProps,
            context
          ));
      hasForceUpdate = !1;
      var oldState = workInProgress.memoizedState;
      unmaskedContext.state = oldState;
      processUpdateQueue(
        workInProgress,
        nextProps,
        unmaskedContext,
        renderLanes
      );
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
          (isLegacyContextConsumer =
            hasForceUpdate ||
            checkShouldComponentUpdate(
              workInProgress,
              Component,
              isLegacyContextConsumer,
              nextProps,
              oldState,
              oldContext,
              context
            ))
            ? (instance ||
                ("function" !==
                  typeof unmaskedContext.UNSAFE_componentWillMount &&
                  "function" !== typeof unmaskedContext.componentWillMount) ||
                ("function" === typeof unmaskedContext.componentWillMount &&
                  unmaskedContext.componentWillMount(),
                "function" ===
                  typeof unmaskedContext.UNSAFE_componentWillMount &&
                  unmaskedContext.UNSAFE_componentWillMount()),
              "function" === typeof unmaskedContext.componentDidMount &&
                (workInProgress.flags |= 4194308))
            : ("function" === typeof unmaskedContext.componentDidMount &&
                (workInProgress.flags |= 4194308),
              (workInProgress.memoizedProps = nextProps),
              (workInProgress.memoizedState = oldContext)),
          (unmaskedContext.props = nextProps),
          (unmaskedContext.state = oldContext),
          (unmaskedContext.context = context),
          (nextProps = isLegacyContextConsumer))
        : ("function" === typeof unmaskedContext.componentDidMount &&
            (workInProgress.flags |= 4194308),
          (nextProps = !1));
    } else {
      unmaskedContext = workInProgress.stateNode;
      cloneUpdateQueue(current, workInProgress);
      isLegacyContextConsumer = workInProgress.memoizedProps;
      context = resolveClassComponentProps(Component, isLegacyContextConsumer);
      unmaskedContext.props = context;
      instance = workInProgress.pendingProps;
      unresolvedOldProps = unmaskedContext.context;
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
        "function" === typeof unmaskedContext.getSnapshotBeforeUpdate) ||
        ("function" !==
          typeof unmaskedContext.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof unmaskedContext.componentWillReceiveProps) ||
        ((isLegacyContextConsumer !== instance ||
          unresolvedOldProps !== oldContext) &&
          callComponentWillReceiveProps(
            workInProgress,
            unmaskedContext,
            nextProps,
            oldContext
          ));
      hasForceUpdate = !1;
      unresolvedOldProps = workInProgress.memoizedState;
      unmaskedContext.state = unresolvedOldProps;
      processUpdateQueue(
        workInProgress,
        nextProps,
        unmaskedContext,
        renderLanes
      );
      suspendIfUpdateReadFromEntangledAsyncAction();
      var newState = workInProgress.memoizedState;
      isLegacyContextConsumer !== instance ||
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
          (context =
            hasForceUpdate ||
            checkShouldComponentUpdate(
              workInProgress,
              Component,
              context,
              nextProps,
              unresolvedOldProps,
              newState,
              oldContext
            ) ||
            (null !== current &&
              null !== current.dependencies &&
              checkIfContextChanged(current.dependencies)))
            ? (getDerivedStateFromProps ||
                ("function" !==
                  typeof unmaskedContext.UNSAFE_componentWillUpdate &&
                  "function" !== typeof unmaskedContext.componentWillUpdate) ||
                ("function" === typeof unmaskedContext.componentWillUpdate &&
                  unmaskedContext.componentWillUpdate(
                    nextProps,
                    newState,
                    oldContext
                  ),
                "function" ===
                  typeof unmaskedContext.UNSAFE_componentWillUpdate &&
                  unmaskedContext.UNSAFE_componentWillUpdate(
                    nextProps,
                    newState,
                    oldContext
                  )),
              "function" === typeof unmaskedContext.componentDidUpdate &&
                (workInProgress.flags |= 4),
              "function" === typeof unmaskedContext.getSnapshotBeforeUpdate &&
                (workInProgress.flags |= 1024))
            : ("function" !== typeof unmaskedContext.componentDidUpdate ||
                (isLegacyContextConsumer === current.memoizedProps &&
                  unresolvedOldProps === current.memoizedState) ||
                (workInProgress.flags |= 4),
              "function" !== typeof unmaskedContext.getSnapshotBeforeUpdate ||
                (isLegacyContextConsumer === current.memoizedProps &&
                  unresolvedOldProps === current.memoizedState) ||
                (workInProgress.flags |= 1024),
              (workInProgress.memoizedProps = nextProps),
              (workInProgress.memoizedState = newState)),
          (unmaskedContext.props = nextProps),
          (unmaskedContext.state = newState),
          (unmaskedContext.context = oldContext),
          (nextProps = context))
        : ("function" !== typeof unmaskedContext.componentDidUpdate ||
            (isLegacyContextConsumer === current.memoizedProps &&
              unresolvedOldProps === current.memoizedState) ||
            (workInProgress.flags |= 4),
          "function" !== typeof unmaskedContext.getSnapshotBeforeUpdate ||
            (isLegacyContextConsumer === current.memoizedProps &&
              unresolvedOldProps === current.memoizedState) ||
            (workInProgress.flags |= 1024),
          (nextProps = !1));
    }
    unmaskedContext = nextProps;
    markRef(current, workInProgress);
    nextProps = 0 !== (workInProgress.flags & 128);
    unmaskedContext || nextProps
      ? ((unmaskedContext = workInProgress.stateNode),
        (isLegacyContextConsumer =
          nextProps && "function" !== typeof Component.getDerivedStateFromError
            ? null
            : unmaskedContext.render()),
        (workInProgress.flags |= 1),
        null !== current && nextProps
          ? ((workInProgress.child = reconcileChildFibers(
              workInProgress,
              current.child,
              null,
              renderLanes
            )),
            (workInProgress.child = reconcileChildFibers(
              workInProgress,
              null,
              isLegacyContextConsumer,
              renderLanes
            )))
          : reconcileChildren(
              current,
              workInProgress,
              isLegacyContextConsumer,
              renderLanes
            ),
        (workInProgress.memoizedState = unmaskedContext.state),
        hasContext && invalidateContextProvider(workInProgress, Component, !0),
        (current = workInProgress.child))
      : (hasContext && invalidateContextProvider(workInProgress, Component, !1),
        (current = bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        )));
    return current;
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
  function mountHostRootWithoutHydrating(
    current,
    workInProgress,
    nextChildren,
    renderLanes
  ) {
    resetHydrationState();
    workInProgress.flags |= 256;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
  }
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
      if (isHydrating) {
        showFallback
          ? pushPrimaryTreeSuspenseHandler(workInProgress)
          : reuseSuspenseHandlerOnStack();
        (current = nextHydratableInstance)
          ? ((current = canHydrateSuspenseInstance(
              current,
              rootOrSingletonContext
            )),
            null !== current &&
              ((workInProgress.memoizedState = {
                dehydrated: current,
                treeContext:
                  null !== treeContextProvider
                    ? { id: treeContextId, overflow: treeContextOverflow }
                    : null,
                retryLane: 536870912,
                hydrationErrors: null
              }),
              (renderLanes = createFiberFromDehydratedFragment(current)),
              (renderLanes.return = workInProgress),
              (workInProgress.child = renderLanes),
              (hydrationParentFiber = workInProgress),
              (nextHydratableInstance = null)))
          : (current = null);
        if (null === current) throw throwOnHydrationMismatch(workInProgress);
        isSuspenseInstanceFallback(current)
          ? (workInProgress.lanes = 32)
          : (workInProgress.lanes = 536870912);
        return null;
      }
      var nextPrimaryChildren = nextProps.children,
        nextFallbackChildren = nextProps.fallback;
      if (showFallback)
        return (
          reuseSuspenseHandlerOnStack(),
          mountSuspenseFallbackChildren(
            workInProgress,
            nextPrimaryChildren,
            nextFallbackChildren,
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
          enableTransitionTracing &&
            ((workInProgress = enableTransitionTracing
              ? transitionStack.current
              : null),
            null !== workInProgress &&
              ((current = enableTransitionTracing
                ? markerInstanceStack.current
                : null),
              (renderLanes = nextProps.updateQueue),
              null === renderLanes
                ? (nextProps.updateQueue = {
                    transitions: workInProgress,
                    markerInstances: current,
                    retryQueue: null
                  })
                : ((renderLanes.transitions = workInProgress),
                  (renderLanes.markerInstances = current)))),
          bailoutOffscreenComponent(null, nextProps)
        );
      if (!0 === nextProps.defer)
        return (
          reuseSuspenseHandlerOnStack(),
          mountSuspenseFallbackChildren(
            workInProgress,
            nextPrimaryChildren,
            nextFallbackChildren,
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
    nextFallbackChildren = current.memoizedState;
    if (
      null !== nextFallbackChildren &&
      ((nextPrimaryChildren = nextFallbackChildren.dehydrated),
      null !== nextPrimaryChildren)
    ) {
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
              (nextPrimaryChildren = nextProps.fallback),
              (showFallback = workInProgress.mode),
              (nextProps = mountWorkInProgressOffscreenFiber(
                { mode: "visible", children: nextProps.children },
                showFallback
              )),
              (nextPrimaryChildren = createFiberFromFragment(
                nextPrimaryChildren,
                showFallback,
                renderLanes,
                null
              )),
              (nextPrimaryChildren.flags |= 2),
              (nextProps.return = workInProgress),
              (nextPrimaryChildren.return = workInProgress),
              (nextProps.sibling = nextPrimaryChildren),
              (workInProgress.child = nextProps),
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
      else if (
        (pushPrimaryTreeSuspenseHandler(workInProgress),
        isSuspenseInstanceFallback(nextPrimaryChildren))
      )
        (JSCompiler_temp =
          getSuspenseInstanceFallbackErrorDetails(nextPrimaryChildren).digest),
          (nextProps = Error(formatProdErrorMessage(419))),
          (nextProps.stack = ""),
          (nextProps.digest = JSCompiler_temp),
          queueHydrationError({ value: nextProps, source: null, stack: null }),
          (workInProgress = retrySuspenseComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes
          ));
      else if (
        (didReceiveUpdate ||
          propagateParentContextChanges(
            current,
            workInProgress,
            renderLanes,
            !1
          ),
        (JSCompiler_temp = 0 !== (renderLanes & current.childLanes)),
        didReceiveUpdate || JSCompiler_temp)
      ) {
        JSCompiler_temp = workInProgressRoot;
        if (
          null !== JSCompiler_temp &&
          ((nextProps = getBumpedLaneForHydration(
            JSCompiler_temp,
            renderLanes
          )),
          0 !== nextProps && nextProps !== nextFallbackChildren.retryLane)
        )
          throw (
            ((nextFallbackChildren.retryLane = nextProps),
            enqueueConcurrentRenderForLane(current, nextProps),
            scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps),
            SelectiveHydrationException)
          );
        isSuspenseInstancePending(nextPrimaryChildren) ||
          renderDidSuspendDelayIfPossible();
        workInProgress = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress,
          renderLanes
        );
      } else
        isSuspenseInstancePending(nextPrimaryChildren)
          ? ((workInProgress.flags |= 192),
            (workInProgress.child = current.child),
            (workInProgress = null))
          : ((current = nextFallbackChildren.treeContext),
            supportsHydration &&
              ((nextHydratableInstance =
                getFirstHydratableChildWithinSuspenseInstance(
                  nextPrimaryChildren
                )),
              (hydrationParentFiber = workInProgress),
              (isHydrating = !0),
              (hydrationErrors = null),
              (rootOrSingletonContext = !1),
              null !== current &&
                restoreSuspendedTreeContext(workInProgress, current)),
            (workInProgress = mountSuspensePrimaryChildren(
              workInProgress,
              nextProps.children
            )),
            (workInProgress.flags |= 134221824));
      return workInProgress;
    }
    if (showFallback)
      return (
        reuseSuspenseHandlerOnStack(),
        (nextPrimaryChildren = nextProps.fallback),
        (showFallback = workInProgress.mode),
        (nextFallbackChildren = current.child),
        (didSuspend = nextFallbackChildren.sibling),
        (nextProps = createWorkInProgress(nextFallbackChildren, {
          mode: "hidden",
          children: nextProps.children
        })),
        (nextProps.subtreeFlags =
          nextFallbackChildren.subtreeFlags & 1206910976),
        null !== didSuspend
          ? (nextPrimaryChildren = createWorkInProgress(
              didSuspend,
              nextPrimaryChildren
            ))
          : ((nextPrimaryChildren = createFiberFromFragment(
              nextPrimaryChildren,
              showFallback,
              renderLanes,
              null
            )),
            (nextPrimaryChildren.flags |= 2)),
        (nextPrimaryChildren.return = workInProgress),
        (nextProps.return = workInProgress),
        (nextProps.sibling = nextPrimaryChildren),
        (workInProgress.child = nextProps),
        bailoutOffscreenComponent(null, nextProps),
        (nextProps = workInProgress.child),
        (nextPrimaryChildren = current.child.memoizedState),
        null === nextPrimaryChildren
          ? (nextPrimaryChildren = mountSuspenseOffscreenState(renderLanes))
          : ((showFallback = nextPrimaryChildren.cachePool),
            null !== showFallback
              ? ((nextFallbackChildren = isPrimaryRenderer
                  ? CacheContext._currentValue
                  : CacheContext._currentValue2),
                (showFallback =
                  showFallback.parent !== nextFallbackChildren
                    ? {
                        parent: nextFallbackChildren,
                        pool: nextFallbackChildren
                      }
                    : showFallback))
              : (showFallback = getSuspendedCache()),
            (nextPrimaryChildren = {
              baseLanes: nextPrimaryChildren.baseLanes | renderLanes,
              cachePool: showFallback
            })),
        (nextProps.memoizedState = nextPrimaryChildren),
        enableTransitionTracing &&
          ((nextPrimaryChildren = enableTransitionTracing
            ? transitionStack.current
            : null),
          null !== nextPrimaryChildren &&
            ((showFallback = enableTransitionTracing
              ? markerInstanceStack.current
              : null),
            (nextFallbackChildren = nextProps.updateQueue),
            (didSuspend = current.updateQueue),
            null === nextFallbackChildren
              ? (nextProps.updateQueue = {
                  transitions: nextPrimaryChildren,
                  markerInstances: showFallback,
                  retryQueue: null
                })
              : nextFallbackChildren === didSuspend
                ? (nextProps.updateQueue = {
                    transitions: nextPrimaryChildren,
                    markerInstances: showFallback,
                    retryQueue:
                      null !== didSuspend ? didSuspend.retryQueue : null
                  })
                : ((nextFallbackChildren.transitions = nextPrimaryChildren),
                  (nextFallbackChildren.markerInstances = showFallback)))),
        (nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes
        )),
        (workInProgress.memoizedState = SUSPENDED_MARKER),
        bailoutOffscreenComponent(current.child, nextProps)
      );
    pushPrimaryTreeSuspenseHandler(workInProgress);
    renderLanes = current.child;
    current = renderLanes.sibling;
    renderLanes = createWorkInProgress(renderLanes, {
      mode: "visible",
      children: nextProps.children
    });
    renderLanes.return = workInProgress;
    renderLanes.sibling = null;
    null !== current &&
      ((JSCompiler_temp = workInProgress.deletions),
      null === JSCompiler_temp
        ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
        : JSCompiler_temp.push(current));
    workInProgress.child = renderLanes;
    workInProgress.memoizedState = null;
    return renderLanes;
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
    var mode = workInProgress.mode;
    primaryChildren = mountWorkInProgressOffscreenFiber(
      { mode: "hidden", children: primaryChildren },
      mode
    );
    fallbackChildren = createFiberFromFragment(
      fallbackChildren,
      mode,
      renderLanes,
      null
    );
    primaryChildren.return = workInProgress;
    fallbackChildren.return = workInProgress;
    primaryChildren.sibling = fallbackChildren;
    workInProgress.child = primaryChildren;
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
    nextProps = isHydrating ? treeForkCount : 0;
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
          nextProps
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
          nextProps
        );
        break;
      case "together":
        initSuspenseListRenderState(
          workInProgress,
          !1,
          null,
          null,
          void 0,
          nextProps
        );
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
            nextProps
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
  function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
    null !== current && (workInProgress.dependencies = current.dependencies);
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
      throw Error(formatProdErrorMessage(153));
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
        enableTransitionTracing &&
          push(transitionStack, workInProgressTransitions);
        enableTransitionTracing && pushRootMarkerInstance(workInProgress);
        pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
        resetHydrationState();
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
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        );
        break;
      case 10:
        pushProvider(
          workInProgress,
          workInProgress.type,
          workInProgress.memoizedProps.value
        );
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
        var state$96 = workInProgress.memoizedState;
        if (null !== state$96) {
          if (null !== state$96.dehydrated)
            return (
              pushPrimaryTreeSuspenseHandler(workInProgress),
              (workInProgress.flags |= 128),
              null
            );
          state$96 = propagateParentContextChanges(
            current,
            workInProgress,
            renderLanes,
            !1
          );
          var primaryChildLanes = workInProgress.child.childLanes;
          if (state$96 || 0 !== (renderLanes & primaryChildLanes))
            return updateSuspenseComponent(
              current,
              workInProgress,
              renderLanes
            );
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
        state$96 = 0 !== (renderLanes & workInProgress.childLanes);
        state$96 ||
          (propagateParentContextChanges(
            current,
            workInProgress,
            renderLanes,
            !1
          ),
          (state$96 = 0 !== (renderLanes & workInProgress.childLanes)));
        if (primaryChildLanes) {
          if (state$96)
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
        if (state$96) break;
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
        break;
      case 25:
        if (enableTransitionTracing) {
          state$96 = workInProgress.stateNode;
          null !== state$96 && pushMarkerInstance(workInProgress, state$96);
          break;
        }
      case 23:
        return (
          (workInProgress.lanes = 0),
          updateOffscreenComponent(
            current,
            workInProgress,
            renderLanes,
            workInProgress.pendingProps
          )
        );
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
    else
      (didReceiveUpdate = !1),
        isHydrating &&
          0 !== (workInProgress.flags & 1048576) &&
          pushTreeId(workInProgress, treeForkCount, workInProgress.index);
    workInProgress.lanes = 0;
    switch (workInProgress.tag) {
      case 16:
        a: {
          var props = workInProgress.pendingProps;
          current = resolveLazy(workInProgress.elementType);
          workInProgress.type = current;
          if ("function" === typeof current)
            shouldConstruct(current)
              ? ((props = resolveClassComponentProps(current, props)),
                (workInProgress.tag = 1),
                (workInProgress = updateClassComponent(
                  null,
                  workInProgress,
                  current,
                  props,
                  renderLanes
                )))
              : ((workInProgress.tag = 0),
                (workInProgress = updateFunctionComponent(
                  null,
                  workInProgress,
                  current,
                  props,
                  renderLanes
                )));
          else {
            if (void 0 !== current && null !== current) {
              var $$typeof = current.$$typeof;
              if ($$typeof === REACT_FORWARD_REF_TYPE) {
                workInProgress.tag = 11;
                workInProgress = updateForwardRef(
                  null,
                  workInProgress,
                  current,
                  props,
                  renderLanes
                );
                break a;
              } else if ($$typeof === REACT_MEMO_TYPE) {
                workInProgress.tag = 14;
                workInProgress = updateMemoComponent(
                  null,
                  workInProgress,
                  current,
                  props,
                  renderLanes
                );
                break a;
              } else if ($$typeof === REACT_CONTEXT_TYPE) {
                workInProgress.tag = 10;
                workInProgress.type = current;
                workInProgress = updateContextProvider(
                  null,
                  workInProgress,
                  renderLanes
                );
                break a;
              }
            }
            workInProgress = getComponentNameFromType(current) || current;
            throw Error(formatProdErrorMessage(306, workInProgress, ""));
          }
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
          (props = workInProgress.type),
          ($$typeof = resolveClassComponentProps(
            props,
            workInProgress.pendingProps
          )),
          updateClassComponent(
            current,
            workInProgress,
            props,
            $$typeof,
            renderLanes
          )
        );
      case 3:
        a: {
          pushHostRootContext(workInProgress);
          if (null === current) throw Error(formatProdErrorMessage(387));
          var nextProps = workInProgress.pendingProps;
          $$typeof = workInProgress.memoizedState;
          props = $$typeof.element;
          cloneUpdateQueue(current, workInProgress);
          processUpdateQueue(workInProgress, nextProps, null, renderLanes);
          var nextState = workInProgress.memoizedState;
          enableTransitionTracing &&
            push(transitionStack, workInProgressTransitions);
          enableTransitionTracing && pushRootMarkerInstance(workInProgress);
          nextProps = nextState.cache;
          pushProvider(workInProgress, CacheContext, nextProps);
          nextProps !== $$typeof.cache &&
            propagateContextChanges(
              workInProgress,
              [CacheContext],
              renderLanes,
              !0
            );
          suspendIfUpdateReadFromEntangledAsyncAction();
          nextProps = nextState.element;
          if (supportsHydration && $$typeof.isDehydrated)
            if (
              (($$typeof = {
                element: nextProps,
                isDehydrated: !1,
                cache: nextState.cache
              }),
              (workInProgress.updateQueue.baseState = $$typeof),
              (workInProgress.memoizedState = $$typeof),
              workInProgress.flags & 256)
            ) {
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                nextProps,
                renderLanes
              );
              break a;
            } else if (nextProps !== props) {
              props = createCapturedValueAtFiber(
                Error(formatProdErrorMessage(424)),
                workInProgress
              );
              queueHydrationError(props);
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                nextProps,
                renderLanes
              );
              break a;
            } else
              for (
                supportsHydration &&
                  ((nextHydratableInstance =
                    getFirstHydratableChildWithinContainer(
                      workInProgress.stateNode.containerInfo
                    )),
                  (hydrationParentFiber = workInProgress),
                  (isHydrating = !0),
                  (hydrationErrors = null),
                  (rootOrSingletonContext = !0)),
                  renderLanes = mountChildFibers(
                    workInProgress,
                    null,
                    nextProps,
                    renderLanes
                  ),
                  workInProgress.child = renderLanes;
                renderLanes;

              )
                (renderLanes.flags = (renderLanes.flags & -3) | 134221824),
                  (renderLanes = renderLanes.sibling);
          else {
            resetHydrationState();
            if (nextProps === props) {
              workInProgress = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress,
                renderLanes
              );
              break a;
            }
            reconcileChildren(current, workInProgress, nextProps, renderLanes);
          }
          workInProgress = workInProgress.child;
        }
        return workInProgress;
      case 26:
        if (supportsResources)
          return (
            markRef(current, workInProgress),
            null === current
              ? (renderLanes = getResource(
                  workInProgress.type,
                  null,
                  workInProgress.pendingProps,
                  null
                ))
                ? (workInProgress.memoizedState = renderLanes)
                : isHydrating ||
                  (workInProgress.stateNode = createHoistableInstance(
                    workInProgress.type,
                    workInProgress.pendingProps,
                    rootInstanceStackCursor.current,
                    workInProgress
                  ))
              : (workInProgress.memoizedState = getResource(
                  workInProgress.type,
                  current.memoizedProps,
                  workInProgress.pendingProps,
                  current.memoizedState
                )),
            null
          );
      case 27:
        if (supportsSingletons)
          return (
            pushHostContext(workInProgress),
            null === current &&
              supportsSingletons &&
              isHydrating &&
              ((props = workInProgress.stateNode =
                resolveSingletonInstance(
                  workInProgress.type,
                  workInProgress.pendingProps,
                  rootInstanceStackCursor.current,
                  contextStackCursor.current,
                  !1
                )),
              (hydrationParentFiber = workInProgress),
              (rootOrSingletonContext = !0),
              (nextHydratableInstance = getFirstHydratableChildWithinSingleton(
                workInProgress.type,
                props,
                nextHydratableInstance
              ))),
            reconcileChildren(
              current,
              workInProgress,
              workInProgress.pendingProps.children,
              renderLanes
            ),
            markRef(current, workInProgress),
            null === current && (workInProgress.flags |= 4194304),
            workInProgress.child
          );
      case 5:
        if (null === current && isHydrating) {
          validateHydratableInstance(
            workInProgress.type,
            workInProgress.pendingProps,
            contextStackCursor.current
          );
          if (($$typeof = props = nextHydratableInstance))
            (props = canHydrateInstance(
              props,
              workInProgress.type,
              workInProgress.pendingProps,
              rootOrSingletonContext
            )),
              null !== props
                ? ((workInProgress.stateNode = props),
                  (hydrationParentFiber = workInProgress),
                  (nextHydratableInstance = getFirstHydratableChild(props)),
                  (rootOrSingletonContext = !1),
                  ($$typeof = !0))
                : ($$typeof = !1);
          $$typeof || throwOnHydrationMismatch(workInProgress);
        }
        pushHostContext(workInProgress);
        $$typeof = workInProgress.type;
        nextProps = workInProgress.pendingProps;
        nextState = null !== current ? current.memoizedProps : null;
        props = nextProps.children;
        shouldSetTextContent($$typeof, nextProps)
          ? (props = null)
          : null !== nextState &&
            shouldSetTextContent($$typeof, nextState) &&
            (workInProgress.flags |= 32);
        null !== workInProgress.memoizedState &&
          (($$typeof = renderWithHooks(
            current,
            workInProgress,
            TransitionAwareHostComponent,
            null,
            null,
            renderLanes
          )),
          isPrimaryRenderer
            ? (HostTransitionContext._currentValue = $$typeof)
            : (HostTransitionContext._currentValue2 = $$typeof));
        markRef(current, workInProgress);
        reconcileChildren(current, workInProgress, props, renderLanes);
        return workInProgress.child;
      case 6:
        if (null === current && isHydrating) {
          validateHydratableTextInstance(
            workInProgress.pendingProps,
            contextStackCursor.current
          );
          if ((current = renderLanes = nextHydratableInstance))
            (renderLanes = canHydrateTextInstance(
              renderLanes,
              workInProgress.pendingProps,
              rootOrSingletonContext
            )),
              null !== renderLanes
                ? ((workInProgress.stateNode = renderLanes),
                  (hydrationParentFiber = workInProgress),
                  (nextHydratableInstance = null),
                  (current = !0))
                : (current = !1);
          current || throwOnHydrationMismatch(workInProgress);
        }
        return null;
      case 13:
        return updateSuspenseComponent(current, workInProgress, renderLanes);
      case 4:
        return (
          pushHostContainer(
            workInProgress,
            workInProgress.stateNode.containerInfo
          ),
          (props = workInProgress.pendingProps),
          null === current
            ? (workInProgress.child = reconcileChildFibers(
                workInProgress,
                null,
                props,
                renderLanes
              ))
            : reconcileChildren(current, workInProgress, props, renderLanes),
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
          (props = workInProgress.pendingProps),
          enableFragmentRefs && markRef(current, workInProgress),
          reconcileChildren(current, workInProgress, props, renderLanes),
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
          (props = workInProgress.pendingProps.children),
          prepareToReadContext(workInProgress),
          ($$typeof = readContext($$typeof)),
          (props = props($$typeof)),
          (workInProgress.flags |= 1),
          reconcileChildren(current, workInProgress, props, renderLanes),
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
      case 19:
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes
        );
      case 21:
        return (
          (props = workInProgress.pendingProps.children),
          markRef(current, workInProgress),
          reconcileChildren(current, workInProgress, props, renderLanes),
          workInProgress.child
        );
      case 31:
        return updateActivityComponent(current, workInProgress, renderLanes);
      case 22:
        return updateOffscreenComponent(
          current,
          workInProgress,
          renderLanes,
          workInProgress.pendingProps
        );
      case 23:
        return updateOffscreenComponent(
          current,
          workInProgress,
          renderLanes,
          workInProgress.pendingProps
        );
      case 24:
        return (
          prepareToReadContext(workInProgress),
          (props = readContext(CacheContext)),
          null === current
            ? (($$typeof = peekCacheFromPool()),
              null === $$typeof &&
                (($$typeof = workInProgressRoot),
                (nextProps = createCache()),
                ($$typeof.pooledCache = nextProps),
                nextProps.refCount++,
                null !== nextProps &&
                  ($$typeof.pooledCacheLanes |= renderLanes),
                ($$typeof = nextProps)),
              (workInProgress.memoizedState = {
                parent: props,
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
              $$typeof.parent !== props
                ? (($$typeof = { parent: props, cache: props }),
                  (workInProgress.memoizedState = $$typeof),
                  0 === workInProgress.lanes &&
                    (workInProgress.memoizedState =
                      workInProgress.updateQueue.baseState =
                        $$typeof),
                  pushProvider(workInProgress, CacheContext, props))
                : ((props = nextProps.cache),
                  pushProvider(workInProgress, CacheContext, props),
                  props !== $$typeof.cache &&
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
      case 25:
        if (enableTransitionTracing)
          return (
            enableTransitionTracing
              ? ((props = workInProgress.pendingProps),
                null === current &&
                  (($$typeof = enableTransitionTracing
                    ? transitionStack.current
                    : null),
                  null !== $$typeof &&
                    (($$typeof = {
                      tag: 1,
                      transitions: new Set($$typeof),
                      pendingBoundaries: null,
                      name: props.name,
                      aborts: null
                    }),
                    (workInProgress.stateNode = $$typeof),
                    (workInProgress.flags |= 2048))),
                ($$typeof = workInProgress.stateNode),
                null !== $$typeof &&
                  pushMarkerInstance(workInProgress, $$typeof),
                reconcileChildren(
                  current,
                  workInProgress,
                  props.children,
                  renderLanes
                ),
                (workInProgress = workInProgress.child))
              : (workInProgress = null),
            workInProgress
          );
        break;
      case 30:
        if (enableViewTransition)
          return (
            null === workInProgress.stateNode &&
              (workInProgress.stateNode = {
                autoName: null,
                paired: null,
                clones: null,
                ref: null
              }),
            (props = workInProgress.pendingProps),
            null != props.name && "auto" !== props.name
              ? (workInProgress.flags |= null === current ? 18882560 : 18874368)
              : isHydrating && pushMaterializedTreeId(workInProgress),
            null !== current && current.memoizedProps.name !== props.name
              ? (workInProgress.flags |= 4194816)
              : markRef(current, workInProgress),
            reconcileChildren(
              current,
              workInProgress,
              props.children,
              renderLanes
            ),
            workInProgress.child
          );
        break;
      case 29:
        throw workInProgress.pendingProps;
    }
    throw Error(formatProdErrorMessage(156, workInProgress.tag));
  }
  function collectScopedNodesFromChildren(
    startingChild,
    fn$jscomp$0,
    scopedNodes$jscomp$0
  ) {
    for (; null !== startingChild; ) {
      var node = startingChild,
        fn = fn$jscomp$0,
        scopedNodes = scopedNodes$jscomp$0;
      if (5 === node.tag) {
        var type = node.type,
          memoizedProps = node.memoizedProps,
          instance = getPublicInstance(node.stateNode);
        null !== instance &&
          !0 === fn(type, memoizedProps || emptyObject, instance) &&
          scopedNodes.push(instance);
      }
      type = node.child;
      isFiberSuspenseAndTimedOut(node) && (type = node.child.sibling.child);
      null !== type && collectScopedNodesFromChildren(type, fn, scopedNodes);
      startingChild = startingChild.sibling;
    }
  }
  function collectFirstScopedNodeFromChildren(startingChild, fn$jscomp$0) {
    for (; null !== startingChild; ) {
      a: {
        var JSCompiler_inline_result = startingChild;
        var fn = fn$jscomp$0;
        if (5 === JSCompiler_inline_result.tag) {
          var type = JSCompiler_inline_result.type,
            memoizedProps = JSCompiler_inline_result.memoizedProps,
            instance = getPublicInstance(JSCompiler_inline_result.stateNode);
          if (null !== instance && !0 === fn(type, memoizedProps, instance)) {
            JSCompiler_inline_result = instance;
            break a;
          }
        }
        type = JSCompiler_inline_result.child;
        isFiberSuspenseAndTimedOut(JSCompiler_inline_result) &&
          (type = JSCompiler_inline_result.child.sibling.child);
        JSCompiler_inline_result =
          null !== type ? collectFirstScopedNodeFromChildren(type, fn) : null;
      }
      if (null !== JSCompiler_inline_result) return JSCompiler_inline_result;
      startingChild = startingChild.sibling;
    }
    return null;
  }
  function collectNearestChildContextValues(
    startingChild,
    context$jscomp$0,
    childContextValues$jscomp$0
  ) {
    for (; null !== startingChild; ) {
      var node = startingChild,
        context = context$jscomp$0,
        childContextValues = childContextValues$jscomp$0;
      if (10 === node.tag && node.type === context)
        childContextValues.push(node.memoizedProps.value);
      else {
        var child = node.child;
        isFiberSuspenseAndTimedOut(node) && (child = node.child.sibling.child);
        null !== child &&
          collectNearestChildContextValues(child, context, childContextValues);
      }
      startingChild = startingChild.sibling;
    }
  }
  function DO_NOT_USE_queryAllNodes(fn) {
    var currentFiber = getInstanceFromScope(this);
    if (null === currentFiber) return null;
    currentFiber = currentFiber.child;
    var scopedNodes = [];
    null !== currentFiber &&
      collectScopedNodesFromChildren(currentFiber, fn, scopedNodes);
    return 0 === scopedNodes.length ? null : scopedNodes;
  }
  function DO_NOT_USE_queryFirstNode(fn) {
    var currentFiber = getInstanceFromScope(this);
    if (null === currentFiber) return null;
    currentFiber = currentFiber.child;
    return null !== currentFiber
      ? collectFirstScopedNodeFromChildren(currentFiber, fn)
      : null;
  }
  function containsNode(node) {
    for (node = getInstanceFromNode(node); null !== node; ) {
      if (21 === node.tag && node.stateNode === this) return !0;
      node = node.return;
    }
    return !1;
  }
  function getChildContextValues(context) {
    var currentFiber = getInstanceFromScope(this);
    if (null === currentFiber) return [];
    currentFiber = currentFiber.child;
    var childContextValues = [];
    null !== currentFiber &&
      collectNearestChildContextValues(
        currentFiber,
        context,
        childContextValues
      );
    return childContextValues;
  }
  function markUpdate(workInProgress) {
    workInProgress.flags |= 4;
  }
  function markCloned(workInProgress) {
    supportsPersistence && (workInProgress.flags |= 8);
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
    if (supportsMutation)
      for (
        needsVisibilityToggle = workInProgress.child;
        null !== needsVisibilityToggle;

      ) {
        if (5 === needsVisibilityToggle.tag || 6 === needsVisibilityToggle.tag)
          appendInitialChild(parent, needsVisibilityToggle.stateNode);
        else if (
          !(
            4 === needsVisibilityToggle.tag ||
            (supportsSingletons && 27 === needsVisibilityToggle.tag)
          ) &&
          null !== needsVisibilityToggle.child
        ) {
          needsVisibilityToggle.child.return = needsVisibilityToggle;
          needsVisibilityToggle = needsVisibilityToggle.child;
          continue;
        }
        if (needsVisibilityToggle === workInProgress) break;
        for (; null === needsVisibilityToggle.sibling; ) {
          if (
            null === needsVisibilityToggle.return ||
            needsVisibilityToggle.return === workInProgress
          )
            return;
          needsVisibilityToggle = needsVisibilityToggle.return;
        }
        needsVisibilityToggle.sibling.return = needsVisibilityToggle.return;
        needsVisibilityToggle = needsVisibilityToggle.sibling;
      }
    else if (supportsPersistence)
      for (var node$99 = workInProgress.child; null !== node$99; ) {
        if (5 === node$99.tag) {
          var instance = node$99.stateNode;
          needsVisibilityToggle &&
            isHidden &&
            (instance = cloneHiddenInstance(
              instance,
              node$99.type,
              node$99.memoizedProps
            ));
          appendInitialChild(parent, instance);
        } else if (6 === node$99.tag)
          (instance = node$99.stateNode),
            needsVisibilityToggle &&
              isHidden &&
              (instance = cloneHiddenTextInstance(
                instance,
                node$99.memoizedProps
              )),
            appendInitialChild(parent, instance);
        else if (4 !== node$99.tag)
          if (22 === node$99.tag && null !== node$99.memoizedState)
            (instance = node$99.child),
              null !== instance && (instance.return = node$99),
              appendAllChildren(parent, node$99, !0, !0);
          else if (null !== node$99.child) {
            node$99.child.return = node$99;
            node$99 = node$99.child;
            continue;
          }
        if (node$99 === workInProgress) break;
        for (; null === node$99.sibling; ) {
          if (null === node$99.return || node$99.return === workInProgress)
            return;
          node$99 = node$99.return;
        }
        node$99.sibling.return = node$99.return;
        node$99 = node$99.sibling;
      }
  }
  function appendAllChildrenToContainer(
    containerChildSet,
    workInProgress,
    needsVisibilityToggle,
    isHidden
  ) {
    var hasOffscreenComponentChild = !1;
    if (supportsPersistence)
      for (var node = workInProgress.child; null !== node; ) {
        if (5 === node.tag) {
          var instance = node.stateNode;
          needsVisibilityToggle &&
            isHidden &&
            (instance = cloneHiddenInstance(
              instance,
              node.type,
              node.memoizedProps
            ));
          appendChildToContainerChildSet(containerChildSet, instance);
        } else if (6 === node.tag)
          (instance = node.stateNode),
            needsVisibilityToggle &&
              isHidden &&
              (instance = cloneHiddenTextInstance(
                instance,
                node.memoizedProps
              )),
            appendChildToContainerChildSet(containerChildSet, instance);
        else if (4 !== node.tag)
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
    if (supportsPersistence && doesRequireClone(current, workInProgress)) {
      current = workInProgress.stateNode;
      var container = current.containerInfo,
        newChildSet = createContainerChildSet();
      appendAllChildrenToContainer(newChildSet, workInProgress, !1, !1);
      current.pendingChildren = newChildSet;
      markUpdate(workInProgress);
      finalizeContainerChildren(container, newChildSet);
    }
  }
  function updateHostComponent(current, workInProgress, type, newProps) {
    if (supportsMutation)
      current.memoizedProps !== newProps && markUpdate(workInProgress);
    else if (supportsPersistence) {
      var currentInstance = current.stateNode,
        oldProps$102 = current.memoizedProps;
      if (
        (current = doesRequireClone(current, workInProgress)) ||
        oldProps$102 !== newProps
      ) {
        var currentHostContext = contextStackCursor.current;
        oldProps$102 = cloneInstance(
          currentInstance,
          type,
          oldProps$102,
          newProps,
          !current,
          null
        );
        oldProps$102 === currentInstance
          ? (workInProgress.stateNode = currentInstance)
          : (markCloned(workInProgress),
            finalizeInitialChildren(
              oldProps$102,
              type,
              newProps,
              currentHostContext
            ) && markUpdate(workInProgress),
            (workInProgress.stateNode = oldProps$102),
            current && appendAllChildren(oldProps$102, workInProgress, !1, !1));
      } else workInProgress.stateNode = currentInstance;
    }
  }
  function preloadInstanceAndSuspendIfNeeded(
    workInProgress,
    type,
    oldProps,
    newProps,
    renderLanes
  ) {
    if (
      (enableSuspenseyImages || 0 !== (workInProgress.mode & 32)) &&
      (null === oldProps
        ? maySuspendCommit(type, newProps)
        : maySuspendCommitOnUpdate(type, oldProps, newProps))
    ) {
      if (
        ((workInProgress.flags |= 16777216),
        (renderLanes & 335544128) === renderLanes ||
          maySuspendCommitInSyncRender(type, newProps))
      )
        if (preloadInstance(workInProgress.stateNode, type, newProps))
          workInProgress.flags |= 8192;
        else if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
        else
          throw (
            ((suspendedThenable = noopSuspenseyCommitThenable),
            SuspenseyCommitException)
          );
    } else workInProgress.flags &= -16777217;
  }
  function preloadResourceAndSuspendIfNeeded(workInProgress, resource) {
    if (mayResourceSuspendCommit(resource)) {
      if (((workInProgress.flags |= 16777216), !preloadResource(resource)))
        if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
        else
          throw (
            ((suspendedThenable = noopSuspenseyCommitThenable),
            SuspenseyCommitException)
          );
    } else workInProgress.flags &= -16777217;
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
    if (!isHydrating)
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
          null === tailNode
            ? (renderState.tail = null)
            : (tailNode.sibling = null);
      }
  }
  function bubbleProperties(completedWork) {
    var didBailout =
        null !== completedWork.alternate &&
        completedWork.alternate.child === completedWork.child,
      newChildLanes = 0,
      subtreeFlags = 0;
    if (didBailout)
      for (var child$105 = completedWork.child; null !== child$105; )
        (newChildLanes |= child$105.lanes | child$105.childLanes),
          (subtreeFlags |= child$105.subtreeFlags & 1206910976),
          (subtreeFlags |= child$105.flags & 1206910976),
          (child$105.return = completedWork),
          (child$105 = child$105.sibling);
    else
      for (child$105 = completedWork.child; null !== child$105; )
        (newChildLanes |= child$105.lanes | child$105.childLanes),
          (subtreeFlags |= child$105.subtreeFlags),
          (subtreeFlags |= child$105.flags),
          (child$105.return = completedWork),
          (child$105 = child$105.sibling);
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress, renderLanes) {
    var newProps = workInProgress.pendingProps;
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
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
          isContextProvider(workInProgress.type) &&
            (pop(didPerformWorkStackCursor), pop(contextStackCursor$1)),
          bubbleProperties(workInProgress),
          null
        );
      case 3:
        renderLanes = workInProgress.stateNode;
        enableTransitionTracing &&
          null !== workInProgressTransitions &&
          (workInProgress.flags |= 2048);
        newProps = null;
        null !== current && (newProps = current.memoizedState.cache);
        workInProgress.memoizedState.cache !== newProps &&
          (workInProgress.flags |= 2048);
        popProvider(CacheContext);
        enableTransitionTracing &&
          enableTransitionTracing &&
          pop(markerInstanceStack);
        enableTransitionTracing && pop(transitionStack);
        popHostContainer();
        pop(didPerformWorkStackCursor);
        pop(contextStackCursor$1);
        renderLanes.pendingContext &&
          ((renderLanes.context = renderLanes.pendingContext),
          (renderLanes.pendingContext = null));
        if (null === current || null === current.child)
          popHydrationState(workInProgress)
            ? markUpdate(workInProgress)
            : null === current ||
              (current.memoizedState.isDehydrated &&
                0 === (workInProgress.flags & 256)) ||
              ((workInProgress.flags |= 1024),
              upgradeHydrationErrorsToRecoverable());
        updateHostContainer(current, workInProgress);
        bubbleProperties(workInProgress);
        enableTransitionTracing &&
          0 !== (workInProgress.subtreeFlags & 8192) &&
          (workInProgress.flags |= 2048);
        return null;
      case 26:
        if (supportsResources) {
          var type = workInProgress.type,
            nextResource = workInProgress.memoizedState;
          null === current
            ? (markUpdate(workInProgress),
              null !== nextResource
                ? (bubbleProperties(workInProgress),
                  preloadResourceAndSuspendIfNeeded(
                    workInProgress,
                    nextResource
                  ))
                : (bubbleProperties(workInProgress),
                  preloadInstanceAndSuspendIfNeeded(
                    workInProgress,
                    type,
                    null,
                    newProps,
                    renderLanes
                  )))
            : nextResource
              ? nextResource !== current.memoizedState
                ? (markUpdate(workInProgress),
                  bubbleProperties(workInProgress),
                  preloadResourceAndSuspendIfNeeded(
                    workInProgress,
                    nextResource
                  ))
                : (bubbleProperties(workInProgress),
                  (workInProgress.flags &= -16777217))
              : ((nextResource = current.memoizedProps),
                supportsMutation
                  ? nextResource !== newProps && markUpdate(workInProgress)
                  : updateHostComponent(
                      current,
                      workInProgress,
                      type,
                      newProps
                    ),
                bubbleProperties(workInProgress),
                preloadInstanceAndSuspendIfNeeded(
                  workInProgress,
                  type,
                  nextResource,
                  newProps,
                  renderLanes
                ));
          return null;
        }
      case 27:
        if (supportsSingletons) {
          popHostContext(workInProgress);
          renderLanes = rootInstanceStackCursor.current;
          type = workInProgress.type;
          if (null !== current && null != workInProgress.stateNode)
            supportsMutation
              ? current.memoizedProps !== newProps && markUpdate(workInProgress)
              : updateHostComponent(current, workInProgress, type, newProps);
          else {
            if (!newProps) {
              if (null === workInProgress.stateNode)
                throw Error(formatProdErrorMessage(166));
              bubbleProperties(workInProgress);
              enableViewTransition &&
                (workInProgress.subtreeFlags &= -33554433);
              return null;
            }
            current = contextStackCursor.current;
            popHydrationState(workInProgress)
              ? prepareToHydrateHostInstance(workInProgress, current)
              : ((current = resolveSingletonInstance(
                  type,
                  newProps,
                  renderLanes,
                  current,
                  !0
                )),
                (workInProgress.stateNode = current),
                markUpdate(workInProgress));
          }
          bubbleProperties(workInProgress);
          enableViewTransition && (workInProgress.subtreeFlags &= -33554433);
          return null;
        }
      case 5:
        popHostContext(workInProgress);
        type = workInProgress.type;
        if (null !== current && null != workInProgress.stateNode)
          updateHostComponent(current, workInProgress, type, newProps);
        else {
          if (!newProps) {
            if (null === workInProgress.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress);
            enableViewTransition && (workInProgress.subtreeFlags &= -33554433);
            return null;
          }
          nextResource = contextStackCursor.current;
          if (popHydrationState(workInProgress))
            prepareToHydrateHostInstance(workInProgress, nextResource),
              finalizeHydratedChildren(
                workInProgress.stateNode,
                type,
                newProps,
                nextResource
              ) && (workInProgress.flags |= 64);
          else {
            var instance$115 = createInstance(
              type,
              newProps,
              rootInstanceStackCursor.current,
              nextResource,
              workInProgress
            );
            markCloned(workInProgress);
            appendAllChildren(instance$115, workInProgress, !1, !1);
            workInProgress.stateNode = instance$115;
            finalizeInitialChildren(
              instance$115,
              type,
              newProps,
              nextResource
            ) && markUpdate(workInProgress);
          }
        }
        bubbleProperties(workInProgress);
        enableViewTransition && (workInProgress.subtreeFlags &= -33554433);
        preloadInstanceAndSuspendIfNeeded(
          workInProgress,
          workInProgress.type,
          null === current ? null : current.memoizedProps,
          workInProgress.pendingProps,
          renderLanes
        );
        return null;
      case 6:
        if (current && null != workInProgress.stateNode)
          (renderLanes = current.memoizedProps),
            supportsMutation
              ? renderLanes !== newProps && markUpdate(workInProgress)
              : supportsPersistence &&
                (renderLanes !== newProps
                  ? ((current = rootInstanceStackCursor.current),
                    (renderLanes = contextStackCursor.current),
                    markCloned(workInProgress),
                    (workInProgress.stateNode = createTextInstance(
                      newProps,
                      current,
                      renderLanes,
                      workInProgress
                    )))
                  : (workInProgress.stateNode = current.stateNode));
        else {
          if ("string" !== typeof newProps && null === workInProgress.stateNode)
            throw Error(formatProdErrorMessage(166));
          current = rootInstanceStackCursor.current;
          renderLanes = contextStackCursor.current;
          if (popHydrationState(workInProgress)) {
            if (!supportsHydration) throw Error(formatProdErrorMessage(176));
            current = workInProgress.stateNode;
            renderLanes = workInProgress.memoizedProps;
            newProps = null;
            type = hydrationParentFiber;
            if (null !== type)
              switch (type.tag) {
                case 27:
                case 5:
                  newProps = type.memoizedProps;
              }
            hydrateTextInstance(
              current,
              renderLanes,
              workInProgress,
              newProps
            ) || throwOnHydrationMismatch(workInProgress, !0);
          } else
            markCloned(workInProgress),
              (workInProgress.stateNode = createTextInstance(
                newProps,
                current,
                renderLanes,
                workInProgress
              ));
        }
        bubbleProperties(workInProgress);
        return null;
      case 31:
        renderLanes = workInProgress.memoizedState;
        if (null === current || null !== current.memoizedState) {
          newProps = popHydrationState(workInProgress);
          if (null !== renderLanes) {
            if (null === current) {
              if (!newProps) throw Error(formatProdErrorMessage(318));
              if (!supportsHydration) throw Error(formatProdErrorMessage(556));
              current = workInProgress.memoizedState;
              current = null !== current ? current.dehydrated : null;
              if (!current) throw Error(formatProdErrorMessage(557));
              hydrateActivityInstance(current, workInProgress);
            } else
              resetHydrationState(),
                0 === (workInProgress.flags & 128) &&
                  (workInProgress.memoizedState = null),
                (workInProgress.flags |= 4);
            bubbleProperties(workInProgress);
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
            throw Error(formatProdErrorMessage(558));
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
          type = popHydrationState(workInProgress);
          if (null !== newProps && null !== newProps.dehydrated) {
            if (null === current) {
              if (!type) throw Error(formatProdErrorMessage(318));
              if (!supportsHydration) throw Error(formatProdErrorMessage(344));
              type = workInProgress.memoizedState;
              type = null !== type ? type.dehydrated : null;
              if (!type) throw Error(formatProdErrorMessage(317));
              hydrateSuspenseInstance(type, workInProgress);
            } else
              resetHydrationState(),
                0 === (workInProgress.flags & 128) &&
                  (workInProgress.memoizedState = null),
                (workInProgress.flags |= 4);
            bubbleProperties(workInProgress);
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
          return (workInProgress.lanes = renderLanes), workInProgress;
        renderLanes = null !== newProps;
        current = null !== current && null !== current.memoizedState;
        renderLanes &&
          ((newProps = workInProgress.child),
          (type = null),
          null !== newProps.alternate &&
            null !== newProps.alternate.memoizedState &&
            null !== newProps.alternate.memoizedState.cachePool &&
            (type = newProps.alternate.memoizedState.cachePool.pool),
          (nextResource = null),
          null !== newProps.memoizedState &&
            null !== newProps.memoizedState.cachePool &&
            (nextResource = newProps.memoizedState.cachePool.pool),
          nextResource !== type && (newProps.flags |= 2048));
        renderLanes !== current &&
          (enableTransitionTracing && (workInProgress.child.flags |= 2048),
          renderLanes && (workInProgress.child.flags |= 8192));
        scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
        null !== workInProgress.updateQueue &&
          null != workInProgress.memoizedProps.suspenseCallback &&
          (workInProgress.flags |= 4);
        bubbleProperties(workInProgress);
        return null;
      case 4:
        return (
          popHostContainer(),
          updateHostContainer(current, workInProgress),
          null === current &&
            preparePortalMount(workInProgress.stateNode.containerInfo),
          (workInProgress.flags |= 67108864),
          bubbleProperties(workInProgress),
          null
        );
      case 10:
        return (
          popProvider(workInProgress.type),
          bubbleProperties(workInProgress),
          null
        );
      case 19:
        popSuspenseListContext(workInProgress);
        newProps = workInProgress.memoizedState;
        if (null === newProps) return bubbleProperties(workInProgress), null;
        type = 0 !== (workInProgress.flags & 128);
        nextResource = newProps.rendering;
        if (null === nextResource)
          if (type) cutOffTailIfNeeded(newProps, !1);
          else {
            if (
              0 !== workInProgressRootExitStatus ||
              (null !== current && 0 !== (current.flags & 128))
            )
              for (current = workInProgress.child; null !== current; ) {
                nextResource = findFirstSuspended(current);
                if (null !== nextResource) {
                  workInProgress.flags |= 128;
                  cutOffTailIfNeeded(newProps, !1);
                  current = nextResource.updateQueue;
                  workInProgress.updateQueue = current;
                  scheduleRetryEffect(workInProgress, current);
                  workInProgress.subtreeFlags = 0;
                  current = renderLanes;
                  for (
                    renderLanes = workInProgress.child;
                    null !== renderLanes;

                  )
                    resetWorkInProgress(renderLanes, current),
                      (renderLanes = renderLanes.sibling);
                  pushSuspenseListContext(
                    workInProgress,
                    (suspenseStackCursor.current & 1) | 2
                  );
                  isHydrating &&
                    pushTreeFork(workInProgress, newProps.treeForkCount);
                  return workInProgress.child;
                }
                current = current.sibling;
              }
            null !== newProps.tail &&
              now() > workInProgressRootRenderTargetTime &&
              ((workInProgress.flags |= 128),
              (type = !0),
              cutOffTailIfNeeded(newProps, !1),
              (workInProgress.lanes = 4194304));
          }
        else {
          if (!type)
            if (
              ((current = findFirstSuspended(nextResource)), null !== current)
            ) {
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
                  !nextResource.alternate &&
                  !isHydrating)
              )
                return bubbleProperties(workInProgress), null;
            } else
              2 * now() - newProps.renderingStartTime >
                workInProgressRootRenderTargetTime &&
                536870912 !== renderLanes &&
                ((workInProgress.flags |= 128),
                (type = !0),
                cutOffTailIfNeeded(newProps, !1),
                (workInProgress.lanes = 4194304));
          newProps.isBackwards
            ? ((nextResource.sibling = workInProgress.child),
              (workInProgress.child = nextResource))
            : ((current = newProps.last),
              null !== current
                ? (current.sibling = nextResource)
                : (workInProgress.child = nextResource),
              (newProps.last = nextResource));
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
          newProps.renderingStartTime = now();
          current.sibling = null;
          nextResource = suspenseStackCursor.current;
          nextResource = type ? (nextResource & 1) | 2 : nextResource & 1;
          "visible" === newProps.tailMode ||
          "collapsed" === newProps.tailMode ||
          !renderLanes ||
          isHydrating
            ? pushSuspenseListContext(workInProgress, nextResource)
            : ((renderLanes = nextResource),
              push(suspenseHandlerStackCursor, workInProgress),
              push(suspenseStackCursor, renderLanes),
              null === shellBoundary && (shellBoundary = workInProgress));
          isHydrating && pushTreeFork(workInProgress, newProps.treeForkCount);
          return current;
        }
        bubbleProperties(workInProgress);
        return null;
      case 21:
        return (
          null === current &&
            ((current = {
              DO_NOT_USE_queryAllNodes: DO_NOT_USE_queryAllNodes,
              DO_NOT_USE_queryFirstNode: DO_NOT_USE_queryFirstNode,
              containsNode: containsNode,
              getChildContextValues: getChildContextValues
            }),
            (workInProgress.stateNode = current),
            prepareScopeUpdate(current, workInProgress)),
          null !== workInProgress.ref && markUpdate(workInProgress),
          bubbleProperties(workInProgress),
          null
        );
      case 22:
      case 23:
        return (
          popSuspenseHandler(workInProgress),
          popHiddenContext(),
          (newProps = null !== workInProgress.memoizedState),
          23 !== workInProgress.tag &&
            (null !== current
              ? (null !== current.memoizedState) !== newProps &&
                (workInProgress.flags |= 8192)
              : newProps && (workInProgress.flags |= 8192)),
          newProps
            ? 0 !== (renderLanes & 536870912) &&
              0 === (workInProgress.flags & 128) &&
              (bubbleProperties(workInProgress),
              23 !== workInProgress.tag &&
                workInProgress.subtreeFlags & 6 &&
                (workInProgress.flags |= 8192))
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
          popTransition(workInProgress, current),
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
        return (
          enableTransitionTracing &&
            (null !== workInProgress.stateNode &&
              enableTransitionTracing &&
              pop(markerInstanceStack),
            bubbleProperties(workInProgress)),
          null
        );
      case 30:
        return (
          enableViewTransition &&
            ((workInProgress.flags |= 33554432),
            enableViewTransitionParentEnterExit &&
              ((current = workInProgress.pendingProps),
              (workInProgress.flags =
                void 0 !== current.parentEnter ||
                void 0 !== current.parentExit ||
                null != current.onParentEnter ||
                null != current.onParentExit ||
                null != current.onGestureParentEnter ||
                null != current.onGestureParentExit
                  ? workInProgress.flags | 1073741824
                  : workInProgress.flags & -1073741825)),
            bubbleProperties(workInProgress)),
          null
        );
    }
    throw Error(formatProdErrorMessage(156, workInProgress.tag));
  }
  function unwindWork(current, workInProgress) {
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
      case 1:
        return (
          isContextProvider(workInProgress.type) &&
            (pop(didPerformWorkStackCursor), pop(contextStackCursor$1)),
          (current = workInProgress.flags),
          current & 65536
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 3:
        return (
          popProvider(CacheContext),
          enableTransitionTracing &&
            enableTransitionTracing &&
            pop(markerInstanceStack),
          enableTransitionTracing && pop(transitionStack),
          popHostContainer(),
          pop(didPerformWorkStackCursor),
          pop(contextStackCursor$1),
          (current = workInProgress.flags),
          0 !== (current & 65536) && 0 === (current & 128)
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 26:
      case 27:
      case 5:
        return popHostContext(workInProgress), null;
      case 31:
        if (null !== workInProgress.memoizedState) {
          popSuspenseHandler(workInProgress);
          if (null === workInProgress.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress.flags;
        return current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null;
      case 13:
        popSuspenseHandler(workInProgress);
        current = workInProgress.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress.flags;
        return current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
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
          popTransition(workInProgress, current),
          (current = workInProgress.flags),
          current & 65536
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 24:
        return popProvider(CacheContext), null;
      case 25:
        return (
          enableTransitionTracing &&
            null !== workInProgress.stateNode &&
            enableTransitionTracing &&
            pop(markerInstanceStack),
          null
        );
      default:
        return null;
    }
  }
  function unwindInterruptedWork(current, interruptedWork) {
    popTreeContext(interruptedWork);
    switch (interruptedWork.tag) {
      case 1:
        current = interruptedWork.type.childContextTypes;
        null !== current &&
          void 0 !== current &&
          (pop(didPerformWorkStackCursor), pop(contextStackCursor$1));
        break;
      case 3:
        popProvider(CacheContext);
        enableTransitionTracing &&
          enableTransitionTracing &&
          pop(markerInstanceStack);
        enableTransitionTracing && pop(transitionStack);
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
        popTransition(interruptedWork, current);
        break;
      case 24:
        popProvider(CacheContext);
        break;
      case 25:
        enableTransitionTracing &&
          null !== interruptedWork.stateNode &&
          enableTransitionTracing &&
          pop(markerInstanceStack);
    }
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
            lastEffect = void 0;
            var create = updateQueue.create,
              inst = updateQueue.inst;
            lastEffect = create();
            inst.destroy = lastEffect;
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
            }
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
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
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
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
            if (enableViewTransition) {
              var instance = current.stateNode,
                name = getViewTransitionName(current.memoizedProps, instance);
              if (null === instance.ref || instance.ref.name !== name)
                instance.ref = createViewTransitionInstance(name);
              instanceToUse = instance.ref;
              break;
            }
            instanceToUse = current.stateNode;
            break;
          case 7:
            if (enableFragmentRefs) {
              null === current.stateNode &&
                (current.stateNode = createFragmentInstance(current));
              instanceToUse = current.stateNode;
              break;
            }
          default:
            instanceToUse = current.stateNode;
        }
        "function" === typeof ref
          ? (current.refCleanup = ref(instanceToUse))
          : (ref.current = instanceToUse);
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
          refCleanup();
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        } finally {
          (current.refCleanup = null),
            (current = current.alternate),
            null != current && (current.refCleanup = null);
        }
      else if ("function" === typeof ref)
        try {
          ref(null);
        } catch (error$142) {
          captureCommitPhaseError(current, nearestMountedAncestor, error$142);
        }
      else ref.current = null;
  }
  function commitProfilerPostCommit(
    finishedWork,
    current,
    commitStartTime,
    passiveEffectDuration
  ) {
    try {
      var _finishedWork$memoize2 = finishedWork.memoizedProps,
        id = _finishedWork$memoize2.id,
        onPostCommit = _finishedWork$memoize2.onPostCommit;
      "function" === typeof onPostCommit &&
        onPostCommit(
          id,
          null === current ? "mount" : "update",
          passiveEffectDuration,
          commitStartTime
        );
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function pushMutationContext() {
    if (!enableViewTransition) return !1;
    var prev = viewTransitionMutationContext;
    viewTransitionMutationContext = !1;
    return prev;
  }
  function popMutationContext(prev) {
    enableViewTransition &&
      (viewTransitionMutationContext && (rootMutationContext = !0),
      (viewTransitionMutationContext = prev));
  }
  function trackHostMutation() {
    enableViewTransition
      ? (viewTransitionMutationContext = !0)
      : (rootMutationContext = !0);
  }
  function commitHostMount(finishedWork) {
    var type = finishedWork.type,
      props = finishedWork.memoizedProps,
      instance = finishedWork.stateNode;
    try {
      commitMount(instance, type, props, finishedWork);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHostUpdate(finishedWork, newProps, oldProps) {
    try {
      commitUpdate(
        finishedWork.stateNode,
        finishedWork.type,
        oldProps,
        newProps,
        finishedWork
      );
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitNewChildToFragmentInstances(fiber, parentFragmentInstances) {
    if (
      (5 === fiber.tag || (enableFragmentRefsTextNodes && 6 === fiber.tag)) &&
      null === fiber.alternate &&
      null !== parentFragmentInstances
    )
      for (var i = 0; i < parentFragmentInstances.length; i++)
        commitNewChildToFragmentInstance(
          fiber.stateNode,
          parentFragmentInstances[i]
        );
  }
  function commitFragmentInstanceDeletionEffects(fiber) {
    for (var parent = fiber.return; null !== parent; ) {
      isFragmentInstanceParent(parent) &&
        deleteChildFromFragmentInstance(fiber.stateNode, parent.stateNode);
      if (isHostParent(parent)) break;
      parent = parent.return;
    }
  }
  function isHostParent(fiber) {
    return (
      5 === fiber.tag ||
      3 === fiber.tag ||
      (supportsResources ? 26 === fiber.tag : !1) ||
      (supportsSingletons
        ? 27 === fiber.tag && isSingletonScope(fiber.type)
        : !1) ||
      4 === fiber.tag
    );
  }
  function isFragmentInstanceParent(fiber) {
    return fiber && 7 === fiber.tag && null !== fiber.stateNode;
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
        if (
          supportsSingletons &&
          27 === fiber.tag &&
          isSingletonScope(fiber.type)
        )
          continue a;
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else (fiber.child.return = fiber), (fiber = fiber.child);
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(
    node,
    before,
    parent,
    parentFragmentInstances
  ) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      (tag = node.stateNode),
        before
          ? insertInContainerBefore(parent, tag, before)
          : appendChildToContainer(parent, tag),
        enableFragmentRefs &&
          commitNewChildToFragmentInstances(node, parentFragmentInstances),
        trackHostMutation();
    else if (
      4 !== tag &&
      (supportsSingletons &&
        27 === tag &&
        isSingletonScope(node.type) &&
        ((parent = node.stateNode), (before = null)),
      (node = node.child),
      null !== node)
    )
      for (
        insertOrAppendPlacementNodeIntoContainer(
          node,
          before,
          parent,
          parentFragmentInstances
        ),
          node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNodeIntoContainer(
          node,
          before,
          parent,
          parentFragmentInstances
        ),
          (node = node.sibling);
  }
  function insertOrAppendPlacementNode(
    node,
    before,
    parent,
    parentFragmentInstances
  ) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      (tag = node.stateNode),
        before ? insertBefore(parent, tag, before) : appendChild(parent, tag),
        enableFragmentRefs &&
          commitNewChildToFragmentInstances(node, parentFragmentInstances),
        trackHostMutation();
    else if (
      4 !== tag &&
      (supportsSingletons &&
        27 === tag &&
        isSingletonScope(node.type) &&
        (parent = node.stateNode),
      (node = node.child),
      null !== node)
    )
      for (
        insertOrAppendPlacementNode(
          node,
          before,
          parent,
          parentFragmentInstances
        ),
          node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNode(
          node,
          before,
          parent,
          parentFragmentInstances
        ),
          (node = node.sibling);
  }
  function commitImmutablePlacementNodeToFragmentInstances(
    finishedWork,
    parentFragmentInstances
  ) {
    if (enableFragmentRefs)
      if (5 === finishedWork.tag)
        commitNewChildToFragmentInstances(
          finishedWork,
          parentFragmentInstances
        );
      else if (
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
      replaceContainerChildren(portal, pendingChildren);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHostSingletonAcquisition(finishedWork) {
    var singleton = finishedWork.stateNode,
      props = finishedWork.memoizedProps;
    try {
      acquireSingletonInstance(
        finishedWork.type,
        props,
        singleton,
        finishedWork
      );
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function trackEnterViewTransitions(placement) {
    if (30 === placement.tag || 0 !== (placement.subtreeFlags & 33554432))
      shouldStartViewTransition = !0;
  }
  function pushViewTransitionCancelableScope() {
    var prevChildren = viewTransitionCancelableChildren;
    viewTransitionCancelableChildren = null;
    return prevChildren;
  }
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
    if (!supportsMutation) return !1;
    for (var inViewport = !1; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        if (null !== collectMeasurements) {
          var measurement = measureInstance(instance);
          collectMeasurements.push(measurement);
          wasInstanceInViewport(measurement) && (inViewport = !0);
        } else
          inViewport ||
            (wasInstanceInViewport(measureInstance(instance)) &&
              (inViewport = !0));
        shouldStartViewTransition = !0;
        applyViewTransitionName(
          instance,
          0 === viewTransitionHostInstanceIdx
            ? name
            : name + "_" + viewTransitionHostInstanceIdx,
          className
        );
        viewTransitionHostInstanceIdx++;
      } else if (22 !== child.tag || null === child.memoizedState)
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
  function restoreViewTransitionOnHostInstances(
    child,
    stopAtNestedViewTransitions
  ) {
    if (supportsMutation)
      for (; null !== child; ) {
        if (5 === child.tag)
          restoreViewTransitionName(child.stateNode, child.memoizedProps);
        else if (22 !== child.tag || null === child.memoizedState)
          (30 === child.tag && stopAtNestedViewTransitions) ||
            restoreViewTransitionOnHostInstances(
              child.child,
              stopAtNestedViewTransitions
            );
        child = child.sibling;
      }
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
              throw Error(formatProdErrorMessage(544));
            var name = props.name;
            props = getViewTransitionClassName(props.default, props.share);
            "none" !== props &&
              (applyViewTransitionToHostInstances(
                placement,
                name,
                props,
                null,
                !1
              ) ||
                restoreViewTransitionOnHostInstances(placement.child, !1));
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
              gesture ||
                scheduleViewTransitionEvent(parent, props.onParentEnter);
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
              gesture ||
                scheduleViewTransitionEvent(parent, props.onParentExit);
            relay && commitParentExitViewTransitions(parent, gesture);
          }
        } else
          0 !== (parent.subtreeFlags & 1073741824) &&
            commitParentExitViewTransitions(parent, gesture);
      parent = parent.sibling;
    }
  }
  function restoreParentEnterOrExitViewTransitions(parent) {
    for (parent = parent.child; null !== parent; ) {
      if (22 !== parent.tag || null === parent.memoizedState)
        if (30 === parent.tag) {
          var props = parent.memoizedProps,
            hasParentClass =
              void 0 !== props.parentEnter || void 0 !== props.parentExit;
          props =
            null != props.onParentEnter ||
            null != props.onParentExit ||
            null != props.onGestureParentEnter ||
            null != props.onGestureParentExit;
          hasParentClass &&
            restoreViewTransitionOnHostInstances(parent.child, !1);
          (hasParentClass || props) &&
            restoreParentEnterOrExitViewTransitions(parent);
        } else
          0 !== (parent.subtreeFlags & 1073741824) &&
            restoreParentEnterOrExitViewTransitions(parent);
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
          )
          ? (commitAppearingPairViewTransitions(placement),
            state.paired ||
              (gesture || scheduleViewTransitionEvent(placement, props.onEnter),
              enableViewTransitionParentEnterExit &&
                commitParentEnterViewTransitions(placement, gesture)))
          : restoreViewTransitionOnHostInstances(placement.child, !1)
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
                    (applyViewTransitionToHostInstances(
                      deletion,
                      name,
                      className,
                      null,
                      !1
                    )
                      ? ((className = deletion.stateNode),
                        (pair.paired = className),
                        (className.paired = pair),
                        scheduleViewTransitionEvent(deletion, props.onShare))
                      : restoreViewTransitionOnHostInstances(
                          deletion.child,
                          !1
                        ));
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
        (applyViewTransitionToHostInstances(deletion, name, className, null, !1)
          ? void 0 !== pair
            ? ((className = deletion.stateNode),
              (pair.paired = className),
              (className.paired = pair),
              appearingViewTransitions.delete(name),
              scheduleViewTransitionEvent(deletion, props.onShare))
            : (scheduleViewTransitionEvent(deletion, props.onExit),
              enableViewTransitionParentEnterExit &&
                commitParentExitViewTransitions(deletion, !1))
          : restoreViewTransitionOnHostInstances(deletion.child, !1));
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
            null !== instance.paired &&
              ((instance.paired = null),
              restoreViewTransitionOnHostInstances(parent.child, !1));
          }
          restorePairedViewTransitions(parent);
        }
        parent = parent.sibling;
      }
  }
  function restoreEnterOrExitViewTransitions(fiber) {
    if (30 === fiber.tag)
      (fiber.stateNode.paired = null),
        restoreViewTransitionOnHostInstances(fiber.child, !1),
        enableViewTransitionParentEnterExit &&
          restoreParentEnterOrExitViewTransitions(fiber),
        restorePairedViewTransitions(fiber);
    else if (0 !== (fiber.subtreeFlags & 33554432))
      for (fiber = fiber.child; null !== fiber; )
        restoreEnterOrExitViewTransitions(fiber), (fiber = fiber.sibling);
    else restorePairedViewTransitions(fiber);
  }
  function restoreUpdateViewTransition(current, finishedWork) {
    restoreViewTransitionOnHostInstances(current.child, !0);
    restoreViewTransitionOnHostInstances(finishedWork.child, !0);
  }
  function restoreNestedViewTransitions(changedParent) {
    for (changedParent = changedParent.child; null !== changedParent; )
      30 === changedParent.tag
        ? restoreViewTransitionOnHostInstances(changedParent.child, !1)
        : 0 !== (changedParent.subtreeFlags & 33554432) &&
          restoreNestedViewTransitions(changedParent),
        (changedParent = changedParent.sibling);
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
    if (!supportsMutation) return !1;
    for (var inViewport = !1; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        if (
          null !== previousMeasurements &&
          viewTransitionHostInstanceIdx < previousMeasurements.length
        ) {
          var previousMeasurement =
              previousMeasurements[viewTransitionHostInstanceIdx],
            nextMeasurement = measureInstance(instance);
          if (
            wasInstanceInViewport(previousMeasurement) ||
            wasInstanceInViewport(nextMeasurement)
          )
            inViewport = !0;
          0 === (parentViewTransition.flags & 4) &&
            hasInstanceChanged(previousMeasurement, nextMeasurement) &&
            (parentViewTransition.flags |= 4);
          hasInstanceAffectedParent(previousMeasurement, nextMeasurement) &&
            (parentViewTransition.flags |= 32);
        } else parentViewTransition.flags |= 32;
        0 !== (parentViewTransition.flags & 4) &&
          applyViewTransitionName(
            instance,
            0 === viewTransitionHostInstanceIdx
              ? newName
              : newName + "_" + viewTransitionHostInstanceIdx,
            className
          );
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
          (gesture ||
            scheduleViewTransitionEvent(changedParent, props.onUpdate));
      } else
        0 !== (changedParent.subtreeFlags & 33554432) &&
          measureNestedViewTransitions(changedParent, gesture);
      changedParent = changedParent.sibling;
    }
  }
  function commitBeforeMutationEffects(root, firstChild, committedLanes) {
    focusedInstanceHandle = prepareForCommit(root.containerInfo);
    shouldFireAfterActiveInstanceBlur = !1;
    root =
      enableViewTransition && (committedLanes & 335544064) === committedLanes;
    nextEffect = firstChild;
    for (firstChild = root ? 9270 : 9236; null !== nextEffect; ) {
      committedLanes = nextEffect;
      var deletions = committedLanes.deletions;
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var deletion = deletions[i];
          doesFiberContain(deletion, focusedInstanceHandle) &&
            ((shouldFireAfterActiveInstanceBlur = !0),
            beforeActiveInstanceBlur(deletion));
          root && commitExitViewTransitions(deletion);
        }
      if (
        enableViewTransition &&
        null === committedLanes.alternate &&
        0 !== (committedLanes.flags & 2)
      )
        root && trackEnterViewTransitions(committedLanes),
          commitBeforeMutationEffects_complete(root);
      else {
        if (enableViewTransition && 22 === committedLanes.tag)
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
    appearingViewTransitions = focusedInstanceHandle = null;
  }
  function commitBeforeMutationEffects_complete(
    isViewTransitionEligible$jscomp$0
  ) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect,
        isViewTransitionEligible = isViewTransitionEligible$jscomp$0,
        current = fiber.alternate,
        flags = fiber.flags,
        JSCompiler_temp;
      if (
        (JSCompiler_temp =
          !shouldFireAfterActiveInstanceBlur && null !== focusedInstanceHandle)
      ) {
        if ((JSCompiler_temp = 13 === fiber.tag))
          a: {
            if (
              null !== current &&
              ((JSCompiler_temp = current.memoizedState),
              null === JSCompiler_temp || null !== JSCompiler_temp.dehydrated)
            ) {
              JSCompiler_temp = fiber.memoizedState;
              JSCompiler_temp =
                null !== JSCompiler_temp && null === JSCompiler_temp.dehydrated;
              break a;
            }
            JSCompiler_temp = !1;
          }
        JSCompiler_temp =
          JSCompiler_temp && doesFiberContain(fiber, focusedInstanceHandle);
      }
      JSCompiler_temp &&
        ((shouldFireAfterActiveInstanceBlur = !0),
        beforeActiveInstanceBlur(fiber));
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
            JSCompiler_temp = fiber.stateNode;
            try {
              var resolvedPrevProps = resolveClassComponentProps(
                fiber.type,
                flags
              );
              isViewTransitionEligible =
                JSCompiler_temp.getSnapshotBeforeUpdate(
                  resolvedPrevProps,
                  current
                );
              JSCompiler_temp.__reactInternalSnapshotBeforeUpdate =
                isViewTransitionEligible;
            } catch (error) {
              captureCommitPhaseError(fiber, fiber.return, error);
            }
          }
          break;
        case 3:
          0 !== (flags & 1024) &&
            supportsMutation &&
            clearContainer(fiber.stateNode.containerInfo);
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          if (enableViewTransition) {
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
          }
        default:
          if (0 !== (flags & 1024)) throw Error(formatProdErrorMessage(163));
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
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitHookEffectListMount(5, finishedWork);
        break;
      case 1:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 4)
          if (((finishedRoot = finishedWork.stateNode), null === current))
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          else {
            var prevProps = resolveClassComponentProps(
              finishedWork.type,
              current.memoizedProps
            );
            current = current.memoizedState;
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$140) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$140
              );
            }
          }
        flags & 64 && commitClassCallbacks(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (
          flags & 64 &&
          ((flags = finishedWork.updateQueue), null !== flags)
        ) {
          finishedRoot = null;
          if (null !== finishedWork.child)
            switch (finishedWork.child.tag) {
              case 27:
              case 5:
                finishedRoot = getPublicInstance(finishedWork.child.stateNode);
                break;
              case 1:
                finishedRoot = finishedWork.child.stateNode;
            }
          try {
            commitCallbacks(flags, finishedRoot);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 27:
        supportsSingletons &&
          null === current &&
          flags & 4 &&
          commitHostSingletonAcquisition(finishedWork);
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
              commitHydratedInstance(
                prevProps,
                finishedRoot,
                current,
                finishedWork
              );
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        break;
      case 31:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 &&
          commitActivityHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 13:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 &&
          commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        flags & 64 &&
          ((flags = finishedWork.memoizedState),
          null !== flags &&
            ((flags = flags.dehydrated),
            null !== flags &&
              ((finishedWork = retryDehydratedSuspenseBoundary.bind(
                null,
                finishedWork
              )),
              registerSuspenseInstanceRetry(flags, finishedWork))));
        break;
      case 22:
        flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
        if (!flags) {
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
        break;
      case 30:
        enableViewTransition &&
          (recursivelyTraverseLayoutEffects(finishedRoot, finishedWork),
          flags & 512 && safelyAttachRef(finishedWork, finishedWork.return));
        break;
      case 7:
        enableFragmentRefs &&
          flags & 512 &&
          safelyAttachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
    }
  }
  function abortRootTransitions(
    root,
    abort,
    deletedTransitions,
    deletedOffscreenInstance
  ) {
    if (enableTransitionTracing) {
      var rootTransitions = root.incompleteTransitions;
      deletedTransitions.forEach(function (transition) {
        rootTransitions.has(transition) &&
          ((transition = rootTransitions.get(transition)),
          null === transition.aborts && (transition.aborts = []),
          transition.aborts.push(abort),
          null !== deletedOffscreenInstance &&
            null !== transition.pendingBoundaries &&
            transition.pendingBoundaries.has(deletedOffscreenInstance) &&
            transition.pendingBoundaries.delete(deletedOffscreenInstance));
      });
    }
  }
  function abortTracingMarkerTransitions(
    abortedFiber,
    abort,
    deletedTransitions,
    deletedOffscreenInstance,
    isInDeletedTree
  ) {
    if (enableTransitionTracing) {
      var markerInstance = abortedFiber.stateNode,
        markerTransitions = markerInstance.transitions,
        pendingBoundaries = markerInstance.pendingBoundaries;
      null !== markerTransitions &&
        deletedTransitions.forEach(function (transition) {
          if (
            null !== abortedFiber &&
            markerTransitions.has(transition) &&
            (null === markerInstance.aborts ||
              !markerInstance.aborts.includes(abort)) &&
            null !== markerInstance.transitions
          ) {
            if (null === markerInstance.aborts) {
              markerInstance.aborts = [abort];
              transition = abortedFiber.memoizedProps.name;
              var transitions = markerInstance.transitions,
                aborts = markerInstance.aborts;
              enableTransitionTracing &&
                (null === currentPendingTransitionCallbacks &&
                  (currentPendingTransitionCallbacks = {
                    transitionStart: null,
                    transitionProgress: null,
                    transitionComplete: null,
                    markerProgress: null,
                    markerIncomplete: new Map(),
                    markerComplete: null
                  }),
                null === currentPendingTransitionCallbacks.markerIncomplete &&
                  (currentPendingTransitionCallbacks.markerIncomplete =
                    new Map()),
                currentPendingTransitionCallbacks.markerIncomplete.set(
                  transition,
                  { transitions: transitions, aborts: aborts }
                ));
            } else markerInstance.aborts.push(abort);
            null !== deletedOffscreenInstance &&
              !isInDeletedTree &&
              null !== pendingBoundaries &&
              pendingBoundaries.has(deletedOffscreenInstance) &&
              (pendingBoundaries.delete(deletedOffscreenInstance),
              addMarkerProgressCallbackToPendingTransition(
                abortedFiber.memoizedProps.name,
                deletedTransitions,
                pendingBoundaries
              ));
          }
        });
    }
  }
  function abortParentMarkerTransitionsForDeletedFiber(
    abortedFiber,
    abort,
    deletedTransitions,
    deletedOffscreenInstance,
    isInDeletedTree
  ) {
    if (enableTransitionTracing)
      for (; null !== abortedFiber; ) {
        switch (abortedFiber.tag) {
          case 25:
            abortTracingMarkerTransitions(
              abortedFiber,
              abort,
              deletedTransitions,
              deletedOffscreenInstance,
              isInDeletedTree
            );
            break;
          case 3:
            abortRootTransitions(
              abortedFiber.stateNode,
              abort,
              deletedTransitions,
              deletedOffscreenInstance
            );
        }
        abortedFiber = abortedFiber.return;
      }
  }
  function commitTransitionProgress(offscreenFiber) {
    if (enableTransitionTracing) {
      var offscreenInstance = offscreenFiber.stateNode,
        prevState = null,
        previousFiber = offscreenFiber.alternate;
      null !== previousFiber &&
        null !== previousFiber.memoizedState &&
        (prevState = previousFiber.memoizedState);
      prevState = null !== prevState;
      previousFiber = null !== offscreenFiber.memoizedState;
      var pendingMarkers = offscreenInstance._pendingMarkers,
        name = null;
      offscreenFiber = offscreenFiber.return;
      null !== offscreenFiber &&
        13 === offscreenFiber.tag &&
        offscreenFiber.memoizedProps.name &&
        (name = offscreenFiber.memoizedProps.name);
      !prevState && previousFiber
        ? null !== pendingMarkers &&
          pendingMarkers.forEach(function (markerInstance) {
            var pendingBoundaries = markerInstance.pendingBoundaries,
              transitions = markerInstance.transitions,
              markerName = markerInstance.name;
            null === pendingBoundaries ||
              pendingBoundaries.has(offscreenInstance) ||
              (pendingBoundaries.set(offscreenInstance, { name: name }),
              null !== transitions &&
                (1 === markerInstance.tag && null !== markerName
                  ? addMarkerProgressCallbackToPendingTransition(
                      markerName,
                      transitions,
                      pendingBoundaries
                    )
                  : 0 === markerInstance.tag &&
                    transitions.forEach(function (transition) {
                      addTransitionProgressCallbackToPendingTransition(
                        transition,
                        pendingBoundaries
                      );
                    })));
          })
        : prevState &&
          !previousFiber &&
          null !== pendingMarkers &&
          pendingMarkers.forEach(function (markerInstance) {
            var pendingBoundaries = markerInstance.pendingBoundaries,
              transitions = markerInstance.transitions,
              markerName = markerInstance.name;
            null !== pendingBoundaries &&
              pendingBoundaries.has(offscreenInstance) &&
              (pendingBoundaries.delete(offscreenInstance),
              null !== transitions &&
                (1 === markerInstance.tag && null !== markerName
                  ? (addMarkerProgressCallbackToPendingTransition(
                      markerName,
                      transitions,
                      pendingBoundaries
                    ),
                    0 === pendingBoundaries.size &&
                      (null === markerInstance.aborts &&
                        addMarkerCompleteCallbackToPendingTransition(
                          markerName,
                          transitions
                        ),
                      (markerInstance.transitions = null),
                      (markerInstance.pendingBoundaries = null),
                      (markerInstance.aborts = null)))
                  : 0 === markerInstance.tag &&
                    transitions.forEach(function (transition) {
                      addTransitionProgressCallbackToPendingTransition(
                        transition,
                        pendingBoundaries
                      );
                    })));
          });
    }
  }
  function hideOrUnhideAllChildren(parentFiber, isHidden) {
    if (supportsMutation)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        hideOrUnhideAllChildrenOnFiber(parentFiber, isHidden),
          (parentFiber = parentFiber.sibling);
  }
  function hideOrUnhideAllChildrenOnFiber(fiber, isHidden) {
    if (supportsMutation)
      switch (fiber.tag) {
        case 5:
        case 26:
          try {
            var instance = fiber.stateNode;
            isHidden
              ? hideInstance(instance)
              : unhideInstance(fiber.stateNode, fiber.memoizedProps);
          } catch (error) {
            captureCommitPhaseError(fiber, fiber.return, error);
          }
          hideOrUnhideNearestPortals(fiber, isHidden);
          break;
        case 6:
          try {
            var instance$jscomp$0 = fiber.stateNode;
            isHidden
              ? hideTextInstance(instance$jscomp$0)
              : unhideTextInstance(instance$jscomp$0, fiber.memoizedProps);
            trackHostMutation();
          } catch (error) {
            captureCommitPhaseError(fiber, fiber.return, error);
          }
          break;
        case 18:
          try {
            var instance$jscomp$1 = fiber.stateNode;
            isHidden
              ? hideDehydratedBoundary(instance$jscomp$1)
              : unhideDehydratedBoundary(fiber.stateNode);
          } catch (error) {
            captureCommitPhaseError(fiber, fiber.return, error);
          }
          break;
        case 22:
        case 23:
          null === fiber.memoizedState &&
            hideOrUnhideAllChildren(fiber, isHidden);
          break;
        default:
          hideOrUnhideAllChildren(fiber, isHidden);
      }
  }
  function hideOrUnhideNearestPortals(parentFiber, isHidden$jscomp$0) {
    if (supportsMutation && parentFiber.subtreeFlags & 67108864)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber,
          isHidden = isHidden$jscomp$0;
        if (supportsMutation)
          switch (fiber.tag) {
            case 4:
              hideOrUnhideAllChildrenOnFiber(fiber, isHidden);
              break;
            case 22:
              null === fiber.memoizedState &&
                hideOrUnhideNearestPortals(fiber, isHidden);
              break;
            default:
              hideOrUnhideNearestPortals(fiber, isHidden);
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
    5 === fiber.tag &&
      ((alternate = fiber.stateNode),
      null !== alternate && detachDeletedInstance(alternate));
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
      commitDeletionEffectsOnFiber(
        finishedRoot,
        nearestMountedAncestor,
        parent
      ),
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
    switch (deletedFiber.tag) {
      case 26:
        if (supportsResources) {
          offscreenSubtreeWasHidden ||
            safelyDetachRef(deletedFiber, nearestMountedAncestor);
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
          deletedFiber.memoizedState
            ? releaseResource(deletedFiber.memoizedState)
            : deletedFiber.stateNode &&
              unmountHoistable(deletedFiber.stateNode);
          break;
        }
      case 27:
        if (supportsSingletons) {
          offscreenSubtreeWasHidden ||
            safelyDetachRef(deletedFiber, nearestMountedAncestor);
          var prevHostParent = hostParent,
            prevHostParentIsContainer = hostParentIsContainer;
          isSingletonScope(deletedFiber.type) &&
            ((hostParent = deletedFiber.stateNode),
            (hostParentIsContainer = !1));
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
          releaseSingletonInstance(deletedFiber.stateNode);
          hostParent = prevHostParent;
          hostParentIsContainer = prevHostParentIsContainer;
          break;
        }
      case 5:
        offscreenSubtreeWasHidden ||
          safelyDetachRef(deletedFiber, nearestMountedAncestor),
          enableFragmentRefs &&
            (5 === deletedFiber.tag ||
              (enableFragmentRefsTextNodes && 6 === deletedFiber.tag)) &&
            commitFragmentInstanceDeletionEffects(deletedFiber);
      case 6:
        if (supportsMutation) {
          if (
            ((prevHostParent = hostParent),
            (prevHostParentIsContainer = hostParentIsContainer),
            (hostParent = null),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ),
            (hostParent = prevHostParent),
            (hostParentIsContainer = prevHostParentIsContainer),
            null !== hostParent)
          )
            if (hostParentIsContainer)
              try {
                removeChildFromContainer(hostParent, deletedFiber.stateNode),
                  trackHostMutation();
              } catch (error) {
                captureCommitPhaseError(
                  deletedFiber,
                  nearestMountedAncestor,
                  error
                );
              }
            else
              try {
                removeChild(hostParent, deletedFiber.stateNode),
                  trackHostMutation();
              } catch (error) {
                captureCommitPhaseError(
                  deletedFiber,
                  nearestMountedAncestor,
                  error
                );
              }
        } else
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
            (prevHostParent = finishedRoot.onDeleted) &&
              prevHostParent(deletedFiber.stateNode);
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
        supportsMutation &&
          null !== hostParent &&
          (hostParentIsContainer
            ? clearSuspenseBoundaryFromContainer(
                hostParent,
                deletedFiber.stateNode
              )
            : clearSuspenseBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        supportsMutation
          ? ((prevHostParent = hostParent),
            (prevHostParentIsContainer = hostParentIsContainer),
            (hostParent = deletedFiber.stateNode.containerInfo),
            (hostParentIsContainer = !0),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ),
            (hostParent = prevHostParent),
            (hostParentIsContainer = prevHostParentIsContainer))
          : (supportsPersistence &&
              commitHostPortalContainerChildren(
                deletedFiber.stateNode,
                deletedFiber,
                createContainerChildSet()
              ),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ));
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
        offscreenSubtreeWasHidden ||
          commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        offscreenSubtreeWasHidden ||
          (safelyDetachRef(deletedFiber, nearestMountedAncestor),
          (prevHostParent = deletedFiber.stateNode),
          "function" === typeof prevHostParent.componentWillUnmount &&
            safelyCallComponentWillUnmount(
              deletedFiber,
              nearestMountedAncestor,
              prevHostParent
            ));
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        offscreenSubtreeWasHidden ||
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        offscreenSubtreeWasHidden =
          (prevHostParent = offscreenSubtreeWasHidden) ||
          null !== deletedFiber.memoizedState;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        offscreenSubtreeWasHidden = prevHostParent;
        break;
      case 30:
        if (enableViewTransition) {
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
          break;
        }
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
  }
  function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
    if (supportsHydration && null === finishedWork.memoizedState) {
      var current = finishedWork.alternate;
      if (
        null !== current &&
        ((current = current.memoizedState), null !== current)
      ) {
        current = current.dehydrated;
        try {
          commitHydratedActivityInstance(current);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        try {
          var hydrationCallbacks = finishedRoot.hydrationCallbacks;
          if (null !== hydrationCallbacks) {
            var onHydrated = hydrationCallbacks.onHydrated;
            onHydrated && onHydrated(current);
          }
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
  }
  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
    if (supportsHydration && null === finishedWork.memoizedState) {
      var current = finishedWork.alternate;
      if (
        null !== current &&
        ((current = current.memoizedState),
        null !== current && ((current = current.dehydrated), null !== current))
      ) {
        try {
          commitHydratedSuspenseInstance(current);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        try {
          var hydrationCallbacks = finishedRoot.hydrationCallbacks;
          if (null !== hydrationCallbacks) {
            var onHydrated = hydrationCallbacks.onHydrated;
            onHydrated && onHydrated(current);
          }
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
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
        throw Error(formatProdErrorMessage(435, finishedWork.tag));
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
  function recursivelyTraverseMutationEffects(
    root$jscomp$0,
    parentFiber,
    lanes
  ) {
    var deletions = parentFiber.deletions;
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i],
          root = root$jscomp$0,
          returnFiber = parentFiber;
        if (supportsMutation) {
          var parent = returnFiber;
          a: for (; null !== parent; ) {
            switch (parent.tag) {
              case 27:
                if (supportsSingletons) {
                  if (isSingletonScope(parent.type)) {
                    hostParent = parent.stateNode;
                    hostParentIsContainer = !1;
                    break a;
                  }
                  break;
                }
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
          if (null === hostParent) throw Error(formatProdErrorMessage(160));
          commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
          hostParent = null;
          hostParentIsContainer = !1;
        } else commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
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
    var current = finishedWork.alternate,
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
          commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
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
        if (supportsResources) {
          ii = currentHoistableRoot;
          recursivelyTraverseMutationEffects(root, finishedWork, lanes);
          commitReconciliationEffects(finishedWork);
          flags & 512 &&
            (offscreenSubtreeWasHidden ||
              null === current ||
              safelyDetachRef(current, current.return));
          flags & 4 &&
            ((root = null !== current ? current.memoizedState : null),
            (lanes = finishedWork.memoizedState),
            null === current
              ? null === lanes
                ? null === finishedWork.stateNode
                  ? (finishedWork.stateNode = hydrateHoistable(
                      ii,
                      finishedWork.type,
                      finishedWork.memoizedProps,
                      finishedWork
                    ))
                  : mountHoistable(
                      ii,
                      finishedWork.type,
                      finishedWork.stateNode
                    )
                : (finishedWork.stateNode = acquireResource(
                    ii,
                    lanes,
                    finishedWork.memoizedProps
                  ))
              : root !== lanes
                ? (null === root
                    ? null !== current.stateNode &&
                      unmountHoistable(current.stateNode)
                    : releaseResource(root),
                  null === lanes
                    ? mountHoistable(
                        ii,
                        finishedWork.type,
                        finishedWork.stateNode
                      )
                    : acquireResource(ii, lanes, finishedWork.memoizedProps))
                : null === lanes &&
                  null !== finishedWork.stateNode &&
                  commitHostUpdate(
                    finishedWork,
                    finishedWork.memoizedProps,
                    current.memoizedProps
                  ));
          break;
        }
      case 27:
        if (supportsSingletons) {
          recursivelyTraverseMutationEffects(root, finishedWork, lanes);
          commitReconciliationEffects(finishedWork);
          flags & 512 &&
            (offscreenSubtreeWasHidden ||
              null === current ||
              safelyDetachRef(current, current.return));
          null !== current &&
            flags & 4 &&
            commitHostUpdate(
              finishedWork,
              finishedWork.memoizedProps,
              current.memoizedProps
            );
          break;
        }
      case 5:
        ii = offscreenDirectParentIsHidden;
        offscreenDirectParentIsHidden = !1;
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        offscreenDirectParentIsHidden = ii;
        commitReconciliationEffects(finishedWork);
        flags & 512 &&
          (offscreenSubtreeWasHidden ||
            null === current ||
            safelyDetachRef(current, current.return));
        if (supportsMutation) {
          if (finishedWork.flags & 32) {
            root = finishedWork.stateNode;
            try {
              resetTextContent(root), trackHostMutation();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          flags & 4 &&
            null != finishedWork.stateNode &&
            ((root = finishedWork.memoizedProps),
            commitHostUpdate(
              finishedWork,
              root,
              null !== current ? current.memoizedProps : root
            ));
          flags & 1024 && (needsFormReset = !0);
        } else
          supportsPersistence &&
            null !== finishedWork.alternate &&
            (finishedWork.alternate.stateNode = finishedWork.stateNode);
        break;
      case 6:
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        if (flags & 4 && supportsMutation) {
          if (null === finishedWork.stateNode)
            throw Error(formatProdErrorMessage(162));
          root = finishedWork.memoizedProps;
          lanes = null !== current ? current.memoizedProps : root;
          flags = finishedWork.stateNode;
          try {
            commitTextUpdate(flags, lanes, root), trackHostMutation();
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 3:
        rootMutationContext = !1;
        enableViewTransition && (viewTransitionMutationContext = !1);
        supportsResources
          ? (prepareToCommitHoistables(),
            (ii = currentHoistableRoot),
            (currentHoistableRoot = getHoistableRoot(root.containerInfo)),
            recursivelyTraverseMutationEffects(root, finishedWork, lanes),
            (currentHoistableRoot = ii))
          : recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          if (
            supportsMutation &&
            supportsHydration &&
            null !== current &&
            current.memoizedState.isDehydrated
          )
            try {
              commitHydratedContainer(root.containerInfo);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          if (supportsPersistence) {
            flags = root.containerInfo;
            current = root.pendingChildren;
            try {
              replaceContainerChildren(flags, current), trackHostMutation();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
        }
        needsFormReset &&
          ((needsFormReset = !1), recursivelyResetForms(finishedWork));
        popMutationContext(!1);
        rootMutationContext &&
          0 !== (lanes & 34) &&
          ((root.indicatorLanes &= ~currentEventTransitionLane),
          (needsIsomorphicIndicator = !1));
        break;
      case 4:
        current = offscreenDirectParentIsHidden;
        offscreenDirectParentIsHidden = offscreenSubtreeIsHidden;
        ii = pushMutationContext();
        supportsResources
          ? ((_eventPayloads$ii2 = currentHoistableRoot),
            (currentHoistableRoot = getHoistableRoot(
              finishedWork.stateNode.containerInfo
            )),
            recursivelyTraverseMutationEffects(root, finishedWork, lanes),
            commitReconciliationEffects(finishedWork),
            (currentHoistableRoot = _eventPayloads$ii2))
          : (recursivelyTraverseMutationEffects(root, finishedWork, lanes),
            commitReconciliationEffects(finishedWork));
        viewTransitionMutationContext &&
          inUpdateViewTransition &&
          (rootViewTransitionAffected = !0);
        popMutationContext(ii);
        offscreenDirectParentIsHidden = current;
        flags & 4 &&
          supportsPersistence &&
          commitHostPortalContainerChildren(
            finishedWork.stateNode,
            finishedWork,
            finishedWork.stateNode.pendingChildren
          );
        break;
      case 12:
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
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
            ? root !== lanes && (globalMostRecentFallbackTime = now())
            : root && !lanes && (globalMostRecentFallbackTime = now()));
        if (flags & 4) {
          try {
            null !== finishedWork.memoizedState &&
              ((ii = finishedWork.memoizedProps.suspenseCallback),
              "function" === typeof ii &&
                ((_eventPayloads$ii2 = finishedWork.updateQueue),
                null !== _eventPayloads$ii2 &&
                  ii(new Set(_eventPayloads$ii2))));
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
        var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
          prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden,
          prevOffscreenDirectParentIsHidden$158 = offscreenDirectParentIsHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
        offscreenDirectParentIsHidden =
          prevOffscreenDirectParentIsHidden$158 || ii;
        offscreenSubtreeWasHidden =
          prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$158;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        commitReconciliationEffects(finishedWork);
        flags & 8192 &&
          ((root = finishedWork.stateNode),
          (root._visibility = ii
            ? root._visibility & -2
            : root._visibility | 1),
          ii &&
            (null === current ||
              _eventPayloads$ii2 ||
              offscreenSubtreeIsHidden ||
              offscreenSubtreeWasHidden ||
              recursivelyTraverseDisappearLayoutEffects(finishedWork)),
          supportsMutation &&
            (ii || !offscreenDirectParentIsHidden) &&
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
        enableViewTransition &&
          (flags & 512 &&
            (offscreenSubtreeWasHidden ||
              null === current ||
              safelyDetachRef(current, current.return)),
          (flags = pushMutationContext()),
          (ii = inUpdateViewTransition),
          (_eventPayloads$ii2 =
            enableViewTransition && (lanes & 335544064) === lanes),
          (prevOffscreenSubtreeIsHidden = finishedWork.memoizedProps),
          (inUpdateViewTransition =
            _eventPayloads$ii2 &&
            "none" !==
              getViewTransitionClassName(
                prevOffscreenSubtreeIsHidden.default,
                prevOffscreenSubtreeIsHidden.update
              )),
          recursivelyTraverseMutationEffects(root, finishedWork, lanes),
          commitReconciliationEffects(finishedWork),
          _eventPayloads$ii2 &&
            null !== current &&
            viewTransitionMutationContext &&
            (finishedWork.flags |= 4),
          (inUpdateViewTransition = ii),
          popMutationContext(flags));
        break;
      case 21:
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 512 &&
          (offscreenSubtreeWasHidden ||
            null === current ||
            safelyDetachRef(finishedWork, finishedWork.return),
          offscreenSubtreeIsHidden ||
            safelyAttachRef(finishedWork, finishedWork.return));
        flags & 4 && prepareScopeUpdate(finishedWork.stateNode, finishedWork);
        break;
      case 7:
        enableFragmentRefs &&
          current &&
          null !== current.stateNode &&
          updateFragmentInstanceFiber(finishedWork, current.stateNode);
      default:
        recursivelyTraverseMutationEffects(root, finishedWork, lanes),
          commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    var flags = finishedWork.flags;
    if (flags & 2) {
      try {
        for (
          var hostParentFiber,
            parentFragmentInstances = null,
            parentFiber = finishedWork.return;
          null !== parentFiber;

        ) {
          if (enableFragmentRefs && isFragmentInstanceParent(parentFiber)) {
            var fragmentInstance = parentFiber.stateNode;
            null === parentFragmentInstances
              ? (parentFragmentInstances = [fragmentInstance])
              : parentFragmentInstances.push(fragmentInstance);
          }
          if (isHostParent(parentFiber)) {
            hostParentFiber = parentFiber;
            break;
          }
          parentFiber = parentFiber.return;
        }
        if (supportsMutation) {
          if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
          switch (hostParentFiber.tag) {
            case 27:
              if (supportsSingletons) {
                var parent = hostParentFiber.stateNode,
                  before = getHostSibling(finishedWork);
                insertOrAppendPlacementNode(
                  finishedWork,
                  before,
                  parent,
                  parentFragmentInstances
                );
                break;
              }
            case 5:
              var parent$143 = hostParentFiber.stateNode;
              hostParentFiber.flags & 32 &&
                (resetTextContent(parent$143), (hostParentFiber.flags &= -33));
              var before$144 = getHostSibling(finishedWork);
              insertOrAppendPlacementNode(
                finishedWork,
                before$144,
                parent$143,
                parentFragmentInstances
              );
              break;
            case 3:
            case 4:
              var parent$145 = hostParentFiber.stateNode.containerInfo,
                before$146 = getHostSibling(finishedWork);
              insertOrAppendPlacementNodeIntoContainer(
                finishedWork,
                before$146,
                parent$145,
                parentFragmentInstances
              );
              break;
            default:
              throw Error(formatProdErrorMessage(161));
          }
        } else
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
  function recursivelyResetForms(parentFiber) {
    if (parentFiber.subtreeFlags & 1024)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber;
        recursivelyResetForms(fiber);
        5 === fiber.tag &&
          fiber.flags & 1024 &&
          resetFormInstance(fiber.stateNode);
        parentFiber = parentFiber.sibling;
      }
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
          rootViewTransitionNameCanceled = viewTransitionContextChanged = !1;
          pushViewTransitionCancelableScope();
          recursivelyTraverseAfterMutationEffects(root, finishedWork);
          if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
            finishedWork = viewTransitionCancelableChildren;
            if (null !== finishedWork)
              for (var i = 0; i < finishedWork.length; i += 3)
                cancelViewTransitionName(
                  finishedWork[i],
                  finishedWork[i + 1],
                  finishedWork[i + 2]
                );
            cancelRootViewTransitionName(root.containerInfo);
            rootViewTransitionNameCanceled = !0;
          }
          viewTransitionCancelableChildren = null;
          break;
        case 5:
          recursivelyTraverseAfterMutationEffects(root, finishedWork);
          break;
        case 4:
          i = viewTransitionContextChanged;
          viewTransitionContextChanged = !1;
          recursivelyTraverseAfterMutationEffects(root, finishedWork);
          viewTransitionContextChanged && (rootViewTransitionAffected = !0);
          viewTransitionContextChanged = i;
          break;
        case 22:
          null === finishedWork.memoizedState &&
            (null !== current.memoizedState
              ? commitEnterViewTransitions(finishedWork, !1)
              : recursivelyTraverseAfterMutationEffects(root, finishedWork));
          break;
        case 30:
          i = viewTransitionContextChanged;
          var prevCancelableChildren = pushViewTransitionCancelableScope();
          viewTransitionContextChanged = !1;
          recursivelyTraverseAfterMutationEffects(root, finishedWork);
          viewTransitionContextChanged && (finishedWork.flags |= 4);
          var props = finishedWork.memoizedProps,
            state = finishedWork.stateNode;
          root = getViewTransitionName(props, state);
          state = getViewTransitionName(current.memoizedProps, state);
          var className = getViewTransitionClassName(
            props.default,
            props.update
          );
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
            0 !== (finishedWork.flags & 32) ? !0 : i;
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
      var finishedWork = parentFiber;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
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
          supportsSingletons &&
            releaseSingletonInstance(finishedWork.stateNode);
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
          enableViewTransition &&
            safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 7:
          enableFragmentRefs &&
            safelyDetachRef(finishedWork, finishedWork.return);
        default:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
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
          commitHookEffectListMount(4, finishedWork);
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
          supportsSingletons && commitHostSingletonAcquisition(finishedWork);
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
          recursivelyTraverseReappearLayoutEffects(
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
          includeWorkInProgressEffects &&
            flags & 4 &&
            commitActivityHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            flags & 4 &&
            commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
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
          enableViewTransition &&
            (recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects
            ),
            safelyAttachRef(finishedWork, finishedWork.return));
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
      parentFiber = parentFiber.sibling;
    }
  }
  function commitOffscreenPassiveMountEffects(current, finishedWork, instance) {
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
    if (enableTransitionTracing) {
      current = finishedWork.updateQueue;
      previousCache = null !== finishedWork.memoizedState;
      if (null !== current) {
        if (previousCache) {
          var transitions = current.transitions;
          null !== transitions &&
            transitions.forEach(function (transition) {
              null === instance._transitions &&
                (instance._transitions = new Set());
              instance._transitions.add(transition);
            });
          current = current.markerInstances;
          null !== current &&
            current.forEach(function (markerInstance) {
              var markerTransitions = markerInstance.transitions;
              null !== markerTransitions &&
                markerTransitions.forEach(function (transition) {
                  null === instance._transitions
                    ? (instance._transitions = new Set())
                    : instance._transitions.has(transition) &&
                      (null === markerInstance.pendingBoundaries &&
                        (markerInstance.pendingBoundaries = new Map()),
                      null === instance._pendingMarkers &&
                        (instance._pendingMarkers = new Set()),
                      instance._pendingMarkers.add(markerInstance));
                });
            });
        }
        finishedWork.updateQueue = null;
      }
      commitTransitionProgress(finishedWork);
      previousCache ||
        ((instance._transitions = null), (instance._pendingMarkers = null));
    }
  }
  function commitCachePassiveMountEffect(current, finishedWork) {
    current = null;
    null !== finishedWork.alternate &&
      (current = finishedWork.alternate.memoizedState.cache);
    finishedWork = finishedWork.memoizedState.cache;
    finishedWork !== current &&
      (finishedWork.refCount++, null != current && releaseCache(current));
  }
  function commitTracingMarkerPassiveMountEffect(finishedWork) {
    var instance = finishedWork.stateNode;
    null !== instance.transitions &&
      null === instance.pendingBoundaries &&
      (addMarkerCompleteCallbackToPendingTransition(
        finishedWork.memoizedProps.name,
        instance.transitions
      ),
      (instance.transitions = null),
      (instance.pendingBoundaries = null),
      (instance.aborts = null),
      (instance.name = null));
  }
  function recursivelyTraversePassiveMountEffects(
    root,
    parentFiber,
    committedLanes,
    committedTransitions
  ) {
    var isViewTransitionEligible =
      enableViewTransition && (committedLanes & 335544064) === committedLanes;
    if (parentFiber.subtreeFlags & (isViewTransitionEligible ? 10262 : 10256))
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveMountOnFiber(
          root,
          parentFiber,
          committedLanes,
          committedTransitions
        ),
          (parentFiber = parentFiber.sibling);
    else isViewTransitionEligible && restoreNestedViewTransitions(parentFiber);
  }
  function commitPassiveMountOnFiber(
    finishedRoot,
    finishedWork,
    committedLanes,
    committedTransitions
  ) {
    var isViewTransitionEligible = enableViewTransition
      ? (committedLanes & 335544064) === committedLanes
      : !1;
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
        flags & 2048 && commitHookEffectListMount(9, finishedWork);
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
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        isViewTransitionEligible &&
          supportsMutation &&
          rootViewTransitionNameCanceled &&
          restoreRootViewTransitionName(finishedRoot.containerInfo);
        if (
          flags & 2048 &&
          ((isViewTransitionEligible = null),
          null !== finishedWork.alternate &&
            (isViewTransitionEligible =
              finishedWork.alternate.memoizedState.cache),
          (flags = finishedWork.memoizedState.cache),
          flags !== isViewTransitionEligible &&
            (flags.refCount++,
            null != isViewTransitionEligible &&
              releaseCache(isViewTransitionEligible)),
          enableTransitionTracing)
        ) {
          var incompleteTransitions =
            finishedWork.stateNode.incompleteTransitions;
          null !== committedTransitions &&
            (committedTransitions.forEach(function (transition) {
              enableTransitionTracing &&
                (null === currentPendingTransitionCallbacks &&
                  (currentPendingTransitionCallbacks = {
                    transitionStart: [],
                    transitionProgress: null,
                    transitionComplete: null,
                    markerProgress: null,
                    markerIncomplete: null,
                    markerComplete: null
                  }),
                null === currentPendingTransitionCallbacks.transitionStart &&
                  (currentPendingTransitionCallbacks.transitionStart = []),
                currentPendingTransitionCallbacks.transitionStart.push(
                  transition
                ));
            }),
            clearTransitionsForLanes(finishedRoot, committedLanes));
          incompleteTransitions.forEach(function (markerInstance, transition) {
            var pendingBoundaries = markerInstance.pendingBoundaries;
            if (null === pendingBoundaries || 0 === pendingBoundaries.size)
              null === markerInstance.aborts &&
                enableTransitionTracing &&
                (null === currentPendingTransitionCallbacks &&
                  (currentPendingTransitionCallbacks = {
                    transitionStart: null,
                    transitionProgress: null,
                    transitionComplete: [],
                    markerProgress: null,
                    markerIncomplete: null,
                    markerComplete: null
                  }),
                null === currentPendingTransitionCallbacks.transitionComplete &&
                  (currentPendingTransitionCallbacks.transitionComplete = []),
                currentPendingTransitionCallbacks.transitionComplete.push(
                  transition
                )),
                incompleteTransitions.delete(transition);
          });
          clearTransitionsForLanes(finishedRoot, committedLanes);
        }
        break;
      case 12:
        flags & 2048
          ? (recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions
            ),
            commitProfilerPostCommit(
              finishedWork,
              finishedWork.alternate,
              -0,
              finishedWork.stateNode.passiveEffectDuration
            ))
          : recursivelyTraversePassiveMountEffects(
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
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork,
            finishedWork.stateNode
          );
        break;
      case 22:
        var instance$163 = finishedWork.stateNode,
          current$164 = finishedWork.alternate;
        null !== finishedWork.memoizedState
          ? (isViewTransitionEligible &&
              null !== current$164 &&
              null === current$164.memoizedState &&
              restoreEnterOrExitViewTransitions(current$164),
            instance$163._visibility & 2
              ? recursivelyTraversePassiveMountEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions
                )
              : recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                ))
          : (isViewTransitionEligible &&
              null !== current$164 &&
              null !== current$164.memoizedState &&
              restoreEnterOrExitViewTransitions(finishedWork),
            instance$163._visibility & 2
              ? recursivelyTraversePassiveMountEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions
                )
              : ((instance$163._visibility |= 2),
                recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  0 !== (finishedWork.subtreeFlags & 10256) || !1
                )));
        flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            current$164,
            finishedWork,
            instance$163
          );
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
        if (enableViewTransition) {
          isViewTransitionEligible &&
            ((isViewTransitionEligible = finishedWork.alternate),
            null !== isViewTransitionEligible &&
              restoreUpdateViewTransition(
                isViewTransitionEligible,
                finishedWork
              ));
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
          break;
        }
      case 25:
        if (enableTransitionTracing) {
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
          flags & 2048 && commitTracingMarkerPassiveMountEffect(finishedWork);
          break;
        }
      default:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
    }
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
          commitHookEffectListMount(8, finishedWork);
          break;
        case 23:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            flags & 2048 &&
            commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork,
              finishedWork.stateNode
            );
          break;
        case 22:
          var instance$167 = finishedWork.stateNode;
          null !== finishedWork.memoizedState
            ? instance$167._visibility & 2
              ? recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  includeWorkInProgressEffects
                )
              : recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
            : ((instance$167._visibility |= 2),
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
              finishedWork,
              instance$167
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
        case 25:
          if (enableTransitionTracing) {
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects
            );
            includeWorkInProgressEffects &&
              flags & 2048 &&
              commitTracingMarkerPassiveMountEffect(finishedWork);
            break;
          }
        default:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
      }
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
                finishedWork,
                finishedWork.stateNode
              );
            break;
          case 24:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 &&
              commitCachePassiveMountEffect(
                finishedWork.alternate,
                finishedWork
              );
            break;
          default:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
  }
  function recursivelyAccumulateSuspenseyCommit(
    parentFiber,
    committedLanes,
    suspendedState
  ) {
    if (parentFiber.subtreeFlags & suspenseyCommitFlag)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        accumulateSuspenseyCommitOnFiber(
          parentFiber,
          committedLanes,
          suspendedState
        ),
          (parentFiber = parentFiber.sibling);
  }
  function accumulateSuspenseyCommitOnFiber(
    fiber,
    committedLanes,
    suspendedState
  ) {
    switch (fiber.tag) {
      case 26:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        if (fiber.flags & suspenseyCommitFlag)
          if (null !== fiber.memoizedState)
            suspendResource(
              suspendedState,
              currentHoistableRoot,
              fiber.memoizedState,
              fiber.memoizedProps
            );
          else {
            var instance = fiber.stateNode,
              type = fiber.type;
            fiber = fiber.memoizedProps;
            ((committedLanes & 335544128) === committedLanes ||
              maySuspendCommitInSyncRender(type, fiber)) &&
              suspendInstance(suspendedState, instance, type, fiber);
          }
        break;
      case 5:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        fiber.flags & suspenseyCommitFlag &&
          ((instance = fiber.stateNode),
          (type = fiber.type),
          (fiber = fiber.memoizedProps),
          ((committedLanes & 335544128) === committedLanes ||
            maySuspendCommitInSyncRender(type, fiber)) &&
            suspendInstance(suspendedState, instance, type, fiber));
        break;
      case 3:
      case 4:
        supportsResources
          ? ((instance = currentHoistableRoot),
            (currentHoistableRoot = getHoistableRoot(
              fiber.stateNode.containerInfo
            )),
            recursivelyAccumulateSuspenseyCommit(
              fiber,
              committedLanes,
              suspendedState
            ),
            (currentHoistableRoot = instance))
          : recursivelyAccumulateSuspenseyCommit(
              fiber,
              committedLanes,
              suspendedState
            );
        break;
      case 22:
        null === fiber.memoizedState &&
          ((instance = fiber.alternate),
          null !== instance && null !== instance.memoizedState
            ? ((instance = suspenseyCommitFlag),
              (suspenseyCommitFlag = 16777216),
              recursivelyAccumulateSuspenseyCommit(
                fiber,
                committedLanes,
                suspendedState
              ),
              (suspenseyCommitFlag = instance))
            : recursivelyAccumulateSuspenseyCommit(
                fiber,
                committedLanes,
                suspendedState
              ));
        break;
      case 30:
        if (enableViewTransition) {
          0 !== (fiber.flags & suspenseyCommitFlag) &&
            ((instance = fiber.memoizedProps.name),
            null != instance &&
              "auto" !== instance &&
              ((type = fiber.stateNode),
              (type.paired = null),
              null === appearingViewTransitions &&
                (appearingViewTransitions = new Map()),
              appearingViewTransitions.set(instance, type)));
          recursivelyAccumulateSuspenseyCommit(
            fiber,
            committedLanes,
            suspendedState
          );
          break;
        }
      default:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
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
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveUnmountOnFiber(parentFiber),
          (parentFiber = parentFiber.sibling);
  }
  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        finishedWork.flags & 2048 &&
          commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 12:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState &&
        instance._visibility & 2 &&
        (null === finishedWork.return || 13 !== finishedWork.return.tag)
          ? ((instance._visibility &= -3),
            recursivelyTraverseDisconnectPassiveEffects(finishedWork))
          : recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      default:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
    }
  }
  function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      deletions = parentFiber;
      switch (deletions.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, deletions, deletions.return);
          recursivelyTraverseDisconnectPassiveEffects(deletions);
          break;
        case 22:
          i = deletions.stateNode;
          i._visibility & 2 &&
            ((i._visibility &= -3),
            recursivelyTraverseDisconnectPassiveEffects(deletions));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(deletions);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
    deletedSubtreeRoot,
    nearestMountedAncestor$jscomp$0
  ) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect,
        nearestMountedAncestor = nearestMountedAncestor$jscomp$0;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
          break;
        case 23:
        case 22:
          null !== fiber.memoizedState &&
            null !== fiber.memoizedState.cachePool &&
            ((nearestMountedAncestor = fiber.memoizedState.cachePool.pool),
            null != nearestMountedAncestor &&
              nearestMountedAncestor.refCount++);
          break;
        case 13:
          if (enableTransitionTracing) {
            var offscreenFiber = fiber.child,
              instance = offscreenFiber.stateNode,
              transitions = instance._transitions;
            if (null !== transitions) {
              var abortReason = {
                reason: "suspense",
                name: fiber.memoizedProps.name || null
              };
              if (
                null === fiber.memoizedState ||
                null === fiber.memoizedState.dehydrated
              )
                abortParentMarkerTransitionsForDeletedFiber(
                  offscreenFiber,
                  abortReason,
                  transitions,
                  instance,
                  !0
                ),
                  null !== nearestMountedAncestor &&
                    abortParentMarkerTransitionsForDeletedFiber(
                      nearestMountedAncestor,
                      abortReason,
                      transitions,
                      instance,
                      !1
                    );
            }
          }
          break;
        case 24:
          releaseCache(fiber.memoizedState.cache);
          break;
        case 25:
          enableTransitionTracing &&
            ((offscreenFiber = fiber.stateNode.transitions),
            null !== offscreenFiber &&
              ((instance = {
                reason: "marker",
                name: fiber.memoizedProps.name
              }),
              abortParentMarkerTransitionsForDeletedFiber(
                fiber,
                instance,
                offscreenFiber,
                null,
                !0
              ),
              null !== nearestMountedAncestor &&
                abortParentMarkerTransitionsForDeletedFiber(
                  nearestMountedAncestor,
                  instance,
                  offscreenFiber,
                  null,
                  !1
                )));
      }
      nearestMountedAncestor = fiber.child;
      if (null !== nearestMountedAncestor)
        (nearestMountedAncestor.return = fiber),
          (nextEffect = nearestMountedAncestor);
      else
        a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
          nearestMountedAncestor = nextEffect;
          offscreenFiber = nearestMountedAncestor.sibling;
          instance = nearestMountedAncestor.return;
          detachFiberAfterEffects(nearestMountedAncestor);
          if (nearestMountedAncestor === fiber) {
            nextEffect = null;
            break a;
          }
          if (null !== offscreenFiber) {
            offscreenFiber.return = instance;
            nextEffect = offscreenFiber;
            break a;
          }
          nextEffect = instance;
        }
    }
  }
  function findFiberRootForHostRoot(hostRoot) {
    var maybeFiber = getInstanceFromNode(hostRoot);
    if (null != maybeFiber) {
      if ("string" !== typeof maybeFiber.memoizedProps["data-testname"])
        throw Error(formatProdErrorMessage(364));
      return maybeFiber;
    }
    hostRoot = findFiberRoot(hostRoot);
    if (null === hostRoot) throw Error(formatProdErrorMessage(362));
    return hostRoot.stateNode.current;
  }
  function matchSelector(fiber$jscomp$0, selector) {
    var tag = fiber$jscomp$0.tag;
    switch (selector.$$typeof) {
      case COMPONENT_TYPE:
        if (fiber$jscomp$0.type === selector.value) return !0;
        break;
      case HAS_PSEUDO_CLASS_TYPE:
        a: {
          selector = selector.value;
          fiber$jscomp$0 = [fiber$jscomp$0, 0];
          for (tag = 0; tag < fiber$jscomp$0.length; ) {
            var fiber = fiber$jscomp$0[tag++],
              tag$jscomp$0 = fiber.tag,
              selectorIndex = fiber$jscomp$0[tag++],
              selector$jscomp$0 = selector[selectorIndex];
            if (
              (5 !== tag$jscomp$0 &&
                26 !== tag$jscomp$0 &&
                27 !== tag$jscomp$0) ||
              !isHiddenSubtree(fiber)
            ) {
              for (
                ;
                null != selector$jscomp$0 &&
                matchSelector(fiber, selector$jscomp$0);

              )
                selectorIndex++, (selector$jscomp$0 = selector[selectorIndex]);
              if (selectorIndex === selector.length) {
                selector = !0;
                break a;
              } else
                for (fiber = fiber.child; null !== fiber; )
                  fiber$jscomp$0.push(fiber, selectorIndex),
                    (fiber = fiber.sibling);
            }
          }
          selector = !1;
        }
        return selector;
      case ROLE_TYPE:
        if (
          (5 === tag || 26 === tag || 27 === tag) &&
          matchAccessibilityRole(fiber$jscomp$0.stateNode, selector.value)
        )
          return !0;
        break;
      case TEXT_TYPE:
        if (5 === tag || 6 === tag || 26 === tag || 27 === tag)
          if (
            ((fiber$jscomp$0 = getTextContent(fiber$jscomp$0)),
            null !== fiber$jscomp$0 &&
              0 <= fiber$jscomp$0.indexOf(selector.value))
          )
            return !0;
        break;
      case TEST_NAME_TYPE:
        if (5 === tag || 26 === tag || 27 === tag)
          if (
            ((fiber$jscomp$0 = fiber$jscomp$0.memoizedProps["data-testname"]),
            "string" === typeof fiber$jscomp$0 &&
              fiber$jscomp$0.toLowerCase() === selector.value.toLowerCase())
          )
            return !0;
        break;
      default:
        throw Error(formatProdErrorMessage(365));
    }
    return !1;
  }
  function selectorToString(selector) {
    switch (selector.$$typeof) {
      case COMPONENT_TYPE:
        return (
          "<" + (getComponentNameFromType(selector.value) || "Unknown") + ">"
        );
      case HAS_PSEUDO_CLASS_TYPE:
        return ":has(" + (selectorToString(selector) || "") + ")";
      case ROLE_TYPE:
        return '[role="' + selector.value + '"]';
      case TEXT_TYPE:
        return '"' + selector.value + '"';
      case TEST_NAME_TYPE:
        return '[data-testname="' + selector.value + '"]';
      default:
        throw Error(formatProdErrorMessage(365));
    }
  }
  function findPaths(root, selectors) {
    var matchingFibers = [];
    root = [root, 0];
    for (var index = 0; index < root.length; ) {
      var fiber = root[index++],
        tag = fiber.tag,
        selectorIndex = root[index++],
        selector = selectors[selectorIndex];
      if ((5 !== tag && 26 !== tag && 27 !== tag) || !isHiddenSubtree(fiber)) {
        for (; null != selector && matchSelector(fiber, selector); )
          selectorIndex++, (selector = selectors[selectorIndex]);
        if (selectorIndex === selectors.length) matchingFibers.push(fiber);
        else
          for (fiber = fiber.child; null !== fiber; )
            root.push(fiber, selectorIndex), (fiber = fiber.sibling);
      }
    }
    return matchingFibers;
  }
  function findAllNodes(hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findFiberRootForHostRoot(hostRoot);
    hostRoot = findPaths(hostRoot, selectors);
    selectors = [];
    hostRoot = Array.from(hostRoot);
    for (var index = 0; index < hostRoot.length; ) {
      var node = hostRoot[index++],
        tag = node.tag;
      if (5 === tag || 26 === tag || 27 === tag)
        isHiddenSubtree(node) || selectors.push(node.stateNode);
      else
        for (node = node.child; null !== node; )
          hostRoot.push(node), (node = node.sibling);
    }
    return selectors;
  }
  function schedulePostPaintCallback(callback) {
    callbacks.push(callback);
    postPaintCallbackScheduled ||
      ((postPaintCallbackScheduled = !0),
      requestPostPaintCallback(function (endTime) {
        for (var i = 0; i < callbacks.length; i++) callbacks[i](endTime);
        postPaintCallbackScheduled = !1;
        callbacks = [];
      }));
  }
  function addMarkerProgressCallbackToPendingTransition(
    markerName,
    transitions,
    pendingBoundaries
  ) {
    enableTransitionTracing &&
      (null === currentPendingTransitionCallbacks &&
        (currentPendingTransitionCallbacks = {
          transitionStart: null,
          transitionProgress: null,
          transitionComplete: null,
          markerProgress: new Map(),
          markerIncomplete: null,
          markerComplete: null
        }),
      null === currentPendingTransitionCallbacks.markerProgress &&
        (currentPendingTransitionCallbacks.markerProgress = new Map()),
      currentPendingTransitionCallbacks.markerProgress.set(markerName, {
        pendingBoundaries: pendingBoundaries,
        transitions: transitions
      }));
  }
  function addMarkerCompleteCallbackToPendingTransition(
    markerName,
    transitions
  ) {
    enableTransitionTracing &&
      (null === currentPendingTransitionCallbacks &&
        (currentPendingTransitionCallbacks = {
          transitionStart: null,
          transitionProgress: null,
          transitionComplete: null,
          markerProgress: null,
          markerIncomplete: null,
          markerComplete: new Map()
        }),
      null === currentPendingTransitionCallbacks.markerComplete &&
        (currentPendingTransitionCallbacks.markerComplete = new Map()),
      currentPendingTransitionCallbacks.markerComplete.set(
        markerName,
        transitions
      ));
  }
  function addTransitionProgressCallbackToPendingTransition(
    transition,
    boundaries
  ) {
    enableTransitionTracing &&
      (null === currentPendingTransitionCallbacks &&
        (currentPendingTransitionCallbacks = {
          transitionStart: null,
          transitionProgress: new Map(),
          transitionComplete: null,
          markerProgress: null,
          markerIncomplete: null,
          markerComplete: null
        }),
      null === currentPendingTransitionCallbacks.transitionProgress &&
        (currentPendingTransitionCallbacks.transitionProgress = new Map()),
      currentPendingTransitionCallbacks.transitionProgress.set(
        transition,
        boundaries
      ));
  }
  function requestUpdateLane() {
    return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes
      ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes
      : null !== ReactSharedInternals.T
        ? requestTransitionLane()
        : resolveUpdatePriority();
  }
  function requestDeferredLane() {
    if (0 === workInProgressDeferredLane)
      if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
        var lane = nextTransitionDeferredLane;
        nextTransitionDeferredLane <<= 1;
        0 === (nextTransitionDeferredLane & 3932160) &&
          (nextTransitionDeferredLane = 262144);
        workInProgressDeferredLane = lane;
      } else workInProgressDeferredLane = 536870912;
    lane = suspenseHandlerStackCursor.current;
    null !== lane && (lane.flags |= 32);
    return workInProgressDeferredLane;
  }
  function scheduleViewTransitionEvent(fiber, callback) {
    if (enableViewTransition && null != callback) {
      var state = fiber.stateNode,
        instance = state.ref;
      null === instance &&
        (instance = state.ref =
          createViewTransitionInstance(
            getViewTransitionName(fiber.memoizedProps, state)
          ));
      null === pendingViewTransitionEvents &&
        (pendingViewTransitionEvents = []);
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
    markRootUpdated(root, lane);
    if (0 === (executionContext & 2) || root !== workInProgressRoot) {
      if (
        enableTransitionTracing &&
        ((fiber = ReactSharedInternals.T),
        null !== fiber &&
          null != fiber.name &&
          (-1 === fiber.startTime && (fiber.startTime = now()),
          enableTransitionTracing))
      ) {
        var transitionLanesMap = root.transitionLanes,
          index$8 = 31 - clz32(lane),
          transitions = transitionLanesMap[index$8];
        null === transitions && (transitions = new Set());
        transitions.add(fiber);
        transitionLanesMap[index$8] = transitions;
      }
      root === workInProgressRoot &&
        (0 === (executionContext & 2) &&
          (workInProgressRootInterleavedUpdatedLanes |= lane),
        4 === workInProgressRootExitStatus &&
          markRootSuspended(
            root,
            workInProgressRootRenderLanes,
            workInProgressDeferredLane,
            !1
          ));
      ensureRootIsScheduled(root);
    }
  }
  function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
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
        if (2 === exitStatus) {
          renderWasConcurrent = lanes;
          if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
            var JSCompiler_inline_result = 0;
          else
            (JSCompiler_inline_result =
              root$jscomp$0.pendingLanes & -536870913),
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
              var wasRootDehydrated =
                supportsHydration && root.current.memoizedState.isDehydrated;
              wasRootDehydrated &&
                (prepareFreshStack(root, JSCompiler_inline_result).flags |=
                  256);
              JSCompiler_inline_result = renderRootSync(
                root,
                JSCompiler_inline_result,
                !1
              );
              if (
                2 !== JSCompiler_inline_result &&
                6 !== JSCompiler_inline_result
              ) {
                if (
                  workInProgressRootDidAttachPingListener &&
                  !wasRootDehydrated
                ) {
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
                    ? (workInProgressRootRecoverableErrors =
                        renderWasConcurrent)
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
              throw Error(formatProdErrorMessage(345));
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
              throw Error(formatProdErrorMessage(329));
          }
          if (
            (lanes & 62914560) === lanes &&
            (alwaysThrottleRetries || 3 === renderWasConcurrent) &&
            ((exitStatus = globalMostRecentFallbackTime + 300 - now()),
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
            renderWasConcurrent,
            null,
            -0,
            0
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
    root.timeoutHandle = noTimeout;
    var subtreeFlags = finishedWork.subtreeFlags,
      isViewTransitionEligible =
        enableViewTransition && (lanes & 335544064) === lanes;
    suspendedCommitReason = null;
    if (
      isViewTransitionEligible ||
      subtreeFlags & 8192 ||
      16785408 === (subtreeFlags & 16785408)
    )
      if (
        ((suspendedCommitReason = startSuspendingCommit()),
        (appearingViewTransitions = null),
        accumulateSuspenseyCommitOnFiber(
          finishedWork,
          lanes,
          suspendedCommitReason
        ),
        isViewTransitionEligible &&
          suspendOnActiveViewTransition(
            suspendedCommitReason,
            root.containerInfo
          ),
        (subtreeFlags =
          (lanes & 62914560) === lanes
            ? globalMostRecentFallbackTime - now()
            : (lanes & 4194048) === lanes
              ? globalMostRecentTransitionTime - now()
              : 0),
        (subtreeFlags = waitForCommitToBeReady(
          suspendedCommitReason,
          subtreeFlags
        )),
        null !== subtreeFlags)
      ) {
        pendingEffectsLanes = lanes;
        root.cancelPendingCommit = subtreeFlags(
          completeRoot.bind(
            null,
            root,
            finishedWork,
            lanes,
            recoverableErrors,
            transitions,
            didIncludeRenderPhaseUpdate,
            spawnedLane,
            updatedLanes,
            suspendedRetryLanes,
            didSkipSuspendedSiblings,
            exitStatus,
            suspendedCommitReason,
            null,
            completedRenderStartTime,
            completedRenderEndTime
          )
        );
        markRootSuspended(root, lanes, spawnedLane, !didSkipSuspendedSiblings);
        return;
      }
    completeRoot(
      root,
      finishedWork,
      lanes,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didSkipSuspendedSiblings,
      exitStatus,
      suspendedCommitReason
    );
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
  function markRootUpdated(root, updatedLanes) {
    root.pendingLanes |= updatedLanes;
    root.indicatorLanes |= updatedLanes & 4194048;
    268435456 !== updatedLanes &&
      ((root.suspendedLanes = 0), (root.pingedLanes = 0), (root.warmLanes = 0));
    enableInfiniteRenderLoopDetection &&
      (executionContext & 2
        ? (workInProgressRootDidIncludeRecursiveRenderUpdate = !0)
        : executionContext & 4 && (didIncludeCommitPhaseUpdate = !0),
      throwIfInfiniteUpdateLoopDetected(!0));
  }
  function markRootSuspended(
    root,
    suspendedLanes,
    spawnedLane,
    didAttemptEntireTree
  ) {
    enableParallelTransitions &&
      (suspendedLanes = getEntangledLanes(root, suspendedLanes));
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
  function flushSyncWork() {
    return 0 === (executionContext & 6)
      ? (flushSyncWorkAcrossRoots_impl(0, !1), !1)
      : !0;
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
    timeoutHandle !== noTimeout &&
      ((root.timeoutHandle = noTimeout), cancelTimeout(timeoutHandle));
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
    entangledRenderLanes = getEntangledLanes(root, lanes);
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
    null === workInProgress &&
      ((workInProgressRootExitStatus = 1),
      logUncaughtError(
        root,
        createCapturedValueAtFiber(thrownValue, root.current)
      ));
  }
  function shouldRemainOnPreviousScreen() {
    var handler = suspenseHandlerStackCursor.current;
    return null === handler
      ? !0
      : (workInProgressRootRenderLanes & 4194048) ===
          workInProgressRootRenderLanes
        ? null === shellBoundary
          ? !0
          : !1
        : (workInProgressRootRenderLanes & 62914560) ===
              workInProgressRootRenderLanes ||
            0 !== (workInProgressRootRenderLanes & 536870912)
          ? handler === shellBoundary
          : !1;
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
      (workInProgressTransitions = getTransitionsForLanes(root, lanes)),
        prepareFreshStack(root, lanes);
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
      } catch (thrownValue$184) {
        handleThrow(root, thrownValue$184);
      }
    while (1);
    lanes && root.shellSuspendCounter++;
    lastContextDependency = currentlyRenderingFiber$1 = null;
    executionContext = prevExecutionContext;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
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
      ? ((workInProgressTransitions = getTransitionsForLanes(root, lanes)),
        (workInProgressRootRenderTargetTime = now() + 500),
        prepareFreshStack(root, lanes))
      : (workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
          root,
          lanes
        ));
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
                  var hostFiber = workInProgress,
                    type = hostFiber.type,
                    props = hostFiber.pendingProps;
                  if (
                    resource
                      ? preloadResource(resource)
                      : preloadInstance(hostFiber.stateNode, type, props)
                  ) {
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
              throw Error(formatProdErrorMessage(462));
          }
        }
        workLoopConcurrentByScheduler();
        break;
      } catch (thrownValue$186) {
        handleThrow(root, thrownValue$186);
      }
    while (1);
    lastContextDependency = currentlyRenderingFiber$1 = null;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    executionContext = prevExecutionContext;
    if (null !== workInProgress) return 0;
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
    var next = beginWork(
      unitOfWork.alternate,
      unitOfWork,
      entangledRenderLanes
    );
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
  }
  function replaySuspendedUnitOfWork(unitOfWork) {
    var next = unitOfWork;
    var current = next.alternate;
    switch (next.tag) {
      case 15:
      case 0:
        var Component = next.type;
        var context = isContextProvider(Component)
          ? previousContext
          : contextStackCursor$1.current;
        context = getMaskedContext(next, context);
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          Component,
          context,
          workInProgressRootRenderLanes
        );
        break;
      case 11:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type.render,
          next.ref,
          workInProgressRootRenderLanes
        );
        break;
      case 5:
        resetHooksOnUnwind(next),
          (Component = next),
          supportsHydration &&
            Component === hydrationParentFiber &&
            (isHydrating
              ? (popToNextHostParent(Component),
                5 === Component.tag &&
                  null != Component.stateNode &&
                  (nextHydratableInstance = Component.stateNode))
              : (popToNextHostParent(Component), (isHydrating = !0)));
      default:
        unwindInterruptedWork(current, next),
          (next = workInProgress =
            resetWorkInProgress(next, entangledRenderLanes)),
          (next = beginWork(current, next, entangledRenderLanes));
    }
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
      if (isHydrating || 1 === suspendedReason) root = !0;
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
      unitOfWork = completedWork.return;
      var next = completeWork(
        completedWork.alternate,
        completedWork,
        entangledRenderLanes
      );
      if (null !== next) {
        workInProgress = next;
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
      next = unitOfWork.return;
      null !== next &&
        ((next.flags |= 32768),
        (next.subtreeFlags = 0),
        (next.deletions = null));
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
  function completeRoot(
    root,
    finishedWork,
    lanes,
    recoverableErrors,
    transitions,
    didIncludeRenderPhaseUpdate,
    spawnedLane,
    updatedLanes,
    suspendedRetryLanes,
    didSkipSuspendedSiblings,
    exitStatus,
    suspendedState
  ) {
    root.cancelPendingCommit = null;
    do flushPendingEffects();
    while (0 !== pendingEffectsStatus);
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    if (null !== finishedWork) {
      if (finishedWork === root.current)
        throw Error(formatProdErrorMessage(177));
      root === workInProgressRoot &&
        ((workInProgress = workInProgressRoot = null),
        (workInProgressRootRenderLanes = 0));
      pendingFinishedWork = finishedWork;
      pendingEffectsRoot = root;
      pendingEffectsLanes = lanes;
      pendingPassiveTransitions = transitions;
      pendingRecoverableErrors = recoverableErrors;
      pendingDidIncludeRenderPhaseUpdate = didIncludeRenderPhaseUpdate;
      commitRoot(
        root,
        finishedWork,
        lanes,
        spawnedLane,
        updatedLanes,
        suspendedRetryLanes,
        suspendedState
      );
    }
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
    didIncludeCommitPhaseUpdate = !1;
    enableViewTransition
      ? ((pendingViewTransitionEvents = null),
        (lanes & 335544064) === lanes
          ? ((pendingTransitionTypes = claimQueuedTransitionTypes(root)),
            (spawnedLane = 10262))
          : ((pendingTransitionTypes = null), (spawnedLane = 10256)))
      : (spawnedLane = 10256);
    0 !== (finishedWork.subtreeFlags & spawnedLane) ||
    0 !== (finishedWork.flags & spawnedLane)
      ? ((root.callbackNode = null),
        (root.callbackPriority = 0),
        scheduleCallback(NormalPriority$1, function () {
          flushPassiveEffects();
          return null;
        }))
      : ((root.callbackNode = null), (root.callbackPriority = 0));
    shouldStartViewTransition = !1;
    spawnedLane = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || spawnedLane) {
      spawnedLane = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      updatedLanes = getCurrentUpdatePriority();
      setCurrentUpdatePriority(2);
      suspendedRetryLanes = executionContext;
      executionContext |= 4;
      try {
        commitBeforeMutationEffects(root, finishedWork, lanes);
      } finally {
        (executionContext = suspendedRetryLanes),
          setCurrentUpdatePriority(updatedLanes),
          (ReactSharedInternals.T = spawnedLane);
      }
    }
    pendingEffectsStatus = 1;
    enableViewTransition && shouldStartViewTransition
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
          null,
          null
        ))
      : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
  }
  function reportViewTransitionError(error) {
    if (0 !== pendingEffectsStatus) {
      var onRecoverableError = pendingEffectsRoot.onRecoverableError;
      onRecoverableError(error, { componentStack: null });
    }
  }
  function flushAfterMutationEffects() {
    3 === pendingEffectsStatus &&
      ((pendingEffectsStatus = 0),
      enableViewTransition &&
        commitAfterMutationEffectsOnFiber(
          pendingFinishedWork,
          pendingEffectsRoot
        ),
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
        var previousPriority = getCurrentUpdatePriority();
        setCurrentUpdatePriority(2);
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          (inUpdateViewTransition = rootViewTransitionAffected = !1),
            commitMutationEffectsOnFiber(finishedWork, root, lanes),
            shouldFireAfterActiveInstanceBlur && afterActiveInstanceBlur(),
            resetAfterCommit(root.containerInfo);
        } finally {
          (executionContext = prevExecutionContext),
            setCurrentUpdatePriority(previousPriority),
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
        cleanUpIndicator = root.pendingIndicator;
      if (null !== cleanUpIndicator && 0 === root.indicatorLanes) {
        var prevTransition = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = getCurrentUpdatePriority();
        setCurrentUpdatePriority(2);
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        root.pendingIndicator = null;
        try {
          cleanUpIndicator();
        } catch (x) {
          reportGlobalError(x);
        } finally {
          (executionContext = prevExecutionContext),
            setCurrentUpdatePriority(previousPriority),
            (ReactSharedInternals.T = prevTransition);
        }
      }
      cleanUpIndicator = 0 !== (finishedWork.flags & 8772);
      if (0 !== (finishedWork.subtreeFlags & 8772) || cleanUpIndicator) {
        cleanUpIndicator = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        prevTransition = getCurrentUpdatePriority();
        setCurrentUpdatePriority(2);
        previousPriority = executionContext;
        executionContext |= 4;
        try {
          commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
        } finally {
          (executionContext = previousPriority),
            setCurrentUpdatePriority(prevTransition),
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
        didIncludeRenderPhaseUpdate = pendingDidIncludeRenderPhaseUpdate,
        passiveSubtreeMask =
          enableViewTransition && (lanes & 335544064) === lanes ? 10262 : 10256;
      0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) ||
      0 !== (finishedWork.flags & passiveSubtreeMask)
        ? (pendingEffectsStatus = 5)
        : ((pendingEffectsStatus = 0),
          (pendingFinishedWork = pendingEffectsRoot = null),
          releaseRootPooledCache(root, root.pendingLanes));
      passiveSubtreeMask = root.pendingLanes;
      0 === passiveSubtreeMask &&
        (legacyErrorBoundariesThatAlreadyFailed = null);
      passiveSubtreeMask = lanesToEventPriority(lanes);
      onCommitRoot(finishedWork.stateNode, passiveSubtreeMask);
      if (null !== recoverableErrors) {
        finishedWork = ReactSharedInternals.T;
        passiveSubtreeMask = getCurrentUpdatePriority();
        setCurrentUpdatePriority(2);
        ReactSharedInternals.T = null;
        try {
          for (
            var onRecoverableError = root.onRecoverableError, i = 0;
            i < recoverableErrors.length;
            i++
          ) {
            var recoverableError = recoverableErrors[i];
            onRecoverableError(recoverableError.value, {
              componentStack: recoverableError.stack
            });
          }
        } finally {
          (ReactSharedInternals.T = finishedWork),
            setCurrentUpdatePriority(passiveSubtreeMask);
        }
      }
      if (
        enableViewTransition &&
        ((recoverableErrors = pendingViewTransitionEvents),
        (onRecoverableError = pendingTransitionTypes),
        (pendingTransitionTypes = null),
        null !== recoverableErrors &&
          ((pendingViewTransitionEvents = null),
          null === onRecoverableError && (onRecoverableError = []),
          null !== committedViewTransition))
      )
        for (
          recoverableError = 0;
          recoverableError < recoverableErrors.length;
          recoverableError++
        )
          (finishedWork = (0, recoverableErrors[recoverableError])(
            onRecoverableError
          )),
            void 0 !== finishedWork &&
              addViewTransitionFinishedListener(
                committedViewTransition,
                finishedWork
              );
      0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
      ensureRootIsScheduled(root);
      passiveSubtreeMask = root.pendingLanes;
      0 !== (lanes & 261930) && 0 !== (passiveSubtreeMask & 42)
        ? (root === rootWithNestedUpdates
            ? nestedUpdateCount++
            : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root)),
          (nestedUpdateKind = 1))
        : enableInfiniteRenderLoopDetection &&
            (didIncludeRenderPhaseUpdate || didIncludeCommitPhaseUpdate)
          ? (root === rootWithNestedUpdates
              ? nestedUpdateCount++
              : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root)),
            (nestedUpdateKind = 2))
          : ((nestedUpdateCount = 0),
            (rootWithNestedUpdates = null),
            (nestedUpdateKind = 0));
      supportsHydration && flushHydrationEvents();
      flushSyncWorkAcrossRoots_impl(0, !1);
      if (enableTransitionTracing) {
        var prevRootTransitionCallbacks = root.transitionCallbacks;
        null !== prevRootTransitionCallbacks &&
          schedulePostPaintCallback(function (endTime) {
            var prevPendingTransitionCallbacks =
              currentPendingTransitionCallbacks;
            null !== prevPendingTransitionCallbacks
              ? ((currentPendingTransitionCallbacks = null),
                scheduleCallback(IdlePriority, function () {
                  processTransitionCallbacks(
                    prevPendingTransitionCallbacks,
                    endTime,
                    prevRootTransitionCallbacks
                  );
                }))
              : (currentEndTime = endTime);
          });
      }
    }
  }
  function releaseRootPooledCache(root, remainingLanes) {
    0 === (root.pooledCacheLanes &= remainingLanes) &&
      ((remainingLanes = root.pooledCache),
      null != remainingLanes &&
        ((root.pooledCache = null), releaseCache(remainingLanes)));
  }
  function flushPendingEffects() {
    enableViewTransition &&
      null !== pendingViewTransition &&
      (stopViewTransition(pendingViewTransition),
      (pendingViewTransition = null));
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
    var renderPriority = lanesToEventPriority(pendingEffectsLanes);
    renderPriority = 32 > renderPriority ? 32 : renderPriority;
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      return (
        setCurrentUpdatePriority(renderPriority),
        (ReactSharedInternals.T = null),
        flushPassiveEffectsImpl()
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition),
        releaseRootPooledCache(root, remainingLanes);
    }
  }
  function flushPassiveEffectsImpl() {
    var transitions = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    var root = pendingEffectsRoot,
      lanes = pendingEffectsLanes;
    pendingEffectsStatus = 0;
    pendingFinishedWork = pendingEffectsRoot = null;
    pendingEffectsLanes = 0;
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
    var prevExecutionContext = executionContext;
    executionContext |= 4;
    commitPassiveUnmountOnFiber(root.current);
    commitPassiveMountOnFiber(root, root.current, lanes, transitions);
    executionContext = prevExecutionContext;
    flushSyncWorkAcrossRoots_impl(0, !1);
    if (enableTransitionTracing) {
      var prevPendingTransitionCallbacks = currentPendingTransitionCallbacks,
        prevRootTransitionCallbacks = root.transitionCallbacks,
        prevEndTime = currentEndTime;
      null !== prevPendingTransitionCallbacks &&
        null !== prevRootTransitionCallbacks &&
        null !== prevEndTime &&
        ((currentEndTime = currentPendingTransitionCallbacks = null),
        scheduleCallback(IdlePriority, function () {
          processTransitionCallbacks(
            prevPendingTransitionCallbacks,
            prevEndTime,
            prevRootTransitionCallbacks
          );
        }));
    }
    if (
      injectedHook &&
      "function" === typeof injectedHook.onPostCommitFiberRoot
    )
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, root);
      } catch (err) {}
    return !0;
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
    null !== rootFiber &&
      (markRootUpdated(rootFiber, 2), ensureRootIsScheduled(rootFiber));
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
              markRootUpdated(instance, 2),
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
    enableInfiniteRenderLoopDetection &&
      (executionContext & 2
        ? (workInProgressRootDidIncludeRecursiveRenderUpdate = !0)
        : executionContext & 4 && (didIncludeCommitPhaseUpdate = !0),
      throwIfInfiniteUpdateLoopDetected(!0));
    workInProgressRoot === root &&
      (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
      (4 === workInProgressRootExitStatus ||
      (3 === workInProgressRootExitStatus &&
        (workInProgressRootRenderLanes & 62914560) ===
          workInProgressRootRenderLanes &&
        300 > now() - globalMostRecentFallbackTime)
        ? 0 === (executionContext & 2)
          ? prepareFreshStack(root, 0)
          : (workInProgressRootPingedLanes |= pingedLanes)
        : (workInProgressRootPingedLanes |= pingedLanes),
      workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes &&
        (workInProgressSuspendedRetryLanes = 0));
    ensureRootIsScheduled(root);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane && (retryLane = claimNextRetryLane());
    boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    null !== boundaryFiber &&
      (markRootUpdated(boundaryFiber, retryLane),
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
        throw Error(formatProdErrorMessage(314));
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function throwForcedInfiniteRenderLoopError(root, renderLanes) {
    null !== root && (root.errorRecoveryDisabledLanes |= renderLanes);
    throw Error(formatProdErrorMessage(598));
  }
  function throwIfInfiniteUpdateLoopDetected(
    isFromInfiniteRenderLoopDetectionInstrumentation
  ) {
    if (50 < nestedUpdateCount) {
      nestedUpdateCount = 0;
      rootWithNestedUpdates = null;
      var updateKind = nestedUpdateKind;
      nestedUpdateKind = 0;
      if (enableInfiniteRenderLoopDetection)
        if (1 === updateKind)
          if (
            isFromInfiniteRenderLoopDetectionInstrumentation ||
            0 !== (executionContext & 2)
          )
            enableInfiniteRenderLoopDetectionForceThrow &&
              throwForcedInfiniteRenderLoopError(
                workInProgressRoot,
                workInProgressRootRenderLanes
              );
          else throw Error(formatProdErrorMessage(185));
        else
          2 === updateKind &&
            enableInfiniteRenderLoopDetectionForceThrow &&
            throwForcedInfiniteRenderLoopError(
              workInProgressRoot,
              workInProgressRootRenderLanes
            );
      else throw Error(formatProdErrorMessage(185));
    }
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
      mode: mode
    };
  }
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
        (workInProgress.deletions = null));
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
        : {
            lanes: pendingProps.lanes,
            firstContext: pendingProps.firstContext
          };
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;
    workInProgress.refCleanup = current.refCleanup;
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
        (workInProgress.stateNode = null))
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
              }));
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
    else if ("string" === typeof type)
      fiberTag =
        supportsResources && supportsSingletons
          ? isHostHoistableType(type, pendingProps, contextStackCursor.current)
            ? 26
            : isHostSingletonType(type)
              ? 27
              : 5
          : supportsResources
            ? isHostHoistableType(
                type,
                pendingProps,
                contextStackCursor.current
              )
              ? 26
              : 5
            : supportsSingletons
              ? isHostSingletonType(type)
                ? 27
                : 5
              : 5;
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
          return createFiberFromFragment(
            pendingProps.children,
            mode,
            lanes,
            key
          );
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 24;
          break;
        case REACT_PROFILER_TYPE:
          return (
            (type = createFiber(12, pendingProps, key, mode | 2)),
            (type.elementType = REACT_PROFILER_TYPE),
            (type.lanes = lanes),
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
          return (
            (type = createFiber(23, pendingProps, key, mode)),
            (type.elementType = REACT_LEGACY_HIDDEN_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_VIEW_TRANSITION_TYPE:
          if (enableViewTransition)
            return (
              (type = mode),
              enableSuspenseyImages || (type |= 32),
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
        case REACT_SCOPE_TYPE:
          return (
            (key = createFiber(21, pendingProps, key, mode)),
            (key.type = type),
            (key.elementType = type),
            (key.lanes = lanes),
            key
          );
        case REACT_TRACING_MARKER_TYPE:
          if (enableTransitionTracing)
            return (
              (type = pendingProps),
              (key = createFiber(25, type, key, mode)),
              (key.elementType = REACT_TRACING_MARKER_TYPE),
              (key.lanes = lanes),
              (key.stateNode = {
                tag: 1,
                transitions: null,
                pendingBoundaries: null,
                aborts: null,
                name: type.name
              }),
              key
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
            formatProdErrorMessage(
              130,
              null === type ? "null" : typeof type,
              ""
            )
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
  function createFiberFromDehydratedFragment(dehydratedNode) {
    var fiber = createFiber(18, null, null, 0);
    fiber.stateNode = dehydratedNode;
    return fiber;
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
    this.tag = 1;
    this.containerInfo = containerInfo;
    this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = noTimeout;
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
    enableViewTransition && (this.transitionTypes = null);
    this.incompleteTransitions = new Map();
    enableTransitionTracing &&
      ((this.transitionCallbacks = null),
      (this.transitionLanes = createLaneMap(null)));
  }
  function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    identifierPrefix,
    formState,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    transitionCallbacks
  ) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      formState
    );
    containerInfo.hydrationCallbacks = hydrationCallbacks;
    enableTransitionTracing &&
      (containerInfo.transitionCallbacks = transitionCallbacks);
    hydrationCallbacks = 1;
    !0 === isStrictMode && (hydrationCallbacks |= 24);
    isStrictMode = createFiber(3, null, null, hydrationCallbacks);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    hydrationCallbacks = createCache();
    hydrationCallbacks.refCount++;
    containerInfo.pooledCache = hydrationCallbacks;
    hydrationCallbacks.refCount++;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: hydrationCallbacks
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = parentComponent._reactInternals;
    a: {
      var JSCompiler_inline_result = parentComponent;
      do {
        switch (JSCompiler_inline_result.tag) {
          case 3:
            JSCompiler_inline_result =
              JSCompiler_inline_result.stateNode.context;
            break a;
          case 1:
            if (isContextProvider(JSCompiler_inline_result.type)) {
              JSCompiler_inline_result =
                JSCompiler_inline_result.stateNode
                  .__reactInternalMemoizedMergedChildContext;
              break a;
            }
        }
        JSCompiler_inline_result = JSCompiler_inline_result.return;
      } while (null !== JSCompiler_inline_result);
      throw Error(formatProdErrorMessage(171));
    }
    if (1 === parentComponent.tag) {
      var Component = parentComponent.type;
      if (isContextProvider(Component))
        return processChildContext(
          parentComponent,
          Component,
          JSCompiler_inline_result
        );
    }
    return JSCompiler_inline_result;
  }
  function findHostInstance(component) {
    var fiber = component._reactInternals;
    if (void 0 === fiber) {
      if ("function" === typeof component.render)
        throw Error(formatProdErrorMessage(188));
      component = Object.keys(component).join(",");
      throw Error(formatProdErrorMessage(268, component));
    }
    component = findCurrentFiberUsingSlowPath(fiber);
    component = null !== component ? findCurrentHostFiberImpl(component) : null;
    return null === component ? null : getPublicInstance(component.stateNode);
  }
  function updateContainerImpl(
    rootFiber,
    lane,
    element,
    container,
    parentComponent,
    callback
  ) {
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context
      ? (container.context = parentComponent)
      : (container.pendingContext = parentComponent);
    container = createUpdate(lane);
    container.payload = { element: element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(rootFiber, container, lane);
    null !== element &&
      (scheduleUpdateOnFiber(element, rootFiber, lane),
      entangleTransitions(element, rootFiber, lane));
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  var exports = {};
  ("use strict");
  var React = require("react"),
    Scheduler = require("scheduler"),
    assign = Object.assign,
    dynamicFeatureFlags = require("ReactFeatureFlags"),
    alwaysThrottleRetries = dynamicFeatureFlags.alwaysThrottleRetries,
    disableLegacyContextForFunctionComponents =
      dynamicFeatureFlags.disableLegacyContextForFunctionComponents,
    disableSchedulerTimeoutInWorkLoop =
      dynamicFeatureFlags.disableSchedulerTimeoutInWorkLoop,
    enableEffectEventMutationPhase =
      dynamicFeatureFlags.enableEffectEventMutationPhase,
    enableInfiniteRenderLoopDetection =
      dynamicFeatureFlags.enableInfiniteRenderLoopDetection,
    enableInfiniteRenderLoopDetectionForceThrow =
      dynamicFeatureFlags.enableInfiniteRenderLoopDetectionForceThrow,
    enableNoCloningMemoCache = dynamicFeatureFlags.enableNoCloningMemoCache,
    enableObjectFiber = dynamicFeatureFlags.enableObjectFiber,
    enableRetryLaneExpiration = dynamicFeatureFlags.enableRetryLaneExpiration,
    enableTransitionTracing = dynamicFeatureFlags.enableTransitionTracing,
    retryLaneExpirationMs = dynamicFeatureFlags.retryLaneExpirationMs,
    syncLaneExpirationMs = dynamicFeatureFlags.syncLaneExpirationMs,
    transitionLaneExpirationMs = dynamicFeatureFlags.transitionLaneExpirationMs,
    enableSuspenseyImages = dynamicFeatureFlags.enableSuspenseyImages,
    enableViewTransition = dynamicFeatureFlags.enableViewTransition,
    enableFragmentRefs = dynamicFeatureFlags.enableFragmentRefs,
    enableFragmentRefsTextNodes =
      dynamicFeatureFlags.enableFragmentRefsTextNodes,
    enableParallelTransitions = dynamicFeatureFlags.enableParallelTransitions,
    enableViewTransitionParentEnterExit =
      dynamicFeatureFlags.enableViewTransitionParentEnterExit,
    REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
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
    REACT_LAZY_TYPE = Symbol.for("react.lazy"),
    REACT_SCOPE_TYPE = Symbol.for("react.scope"),
    REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
    REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"),
    REACT_TRACING_MARKER_TYPE = Symbol.for("react.tracing_marker"),
    REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
    REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
    MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
    REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
    REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"),
    isArrayImpl = Array.isArray,
    ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    rendererVersion = $$$config.rendererVersion,
    rendererPackageName = $$$config.rendererPackageName,
    extraDevToolsConfig = $$$config.extraDevToolsConfig,
    getPublicInstance = $$$config.getPublicInstance,
    getRootHostContext = $$$config.getRootHostContext,
    getChildHostContext = $$$config.getChildHostContext,
    prepareForCommit = $$$config.prepareForCommit,
    resetAfterCommit = $$$config.resetAfterCommit,
    createInstance = $$$config.createInstance;
  $$$config.cloneMutableInstance;
  var appendInitialChild = $$$config.appendInitialChild,
    finalizeInitialChildren = $$$config.finalizeInitialChildren,
    shouldSetTextContent = $$$config.shouldSetTextContent,
    createTextInstance = $$$config.createTextInstance;
  $$$config.cloneMutableTextInstance;
  var scheduleTimeout = $$$config.scheduleTimeout,
    cancelTimeout = $$$config.cancelTimeout,
    noTimeout = $$$config.noTimeout,
    isPrimaryRenderer = $$$config.isPrimaryRenderer;
  $$$config.warnsIfNotActing;
  var supportsMutation = $$$config.supportsMutation,
    supportsPersistence = $$$config.supportsPersistence,
    supportsHydration = $$$config.supportsHydration,
    getInstanceFromNode = $$$config.getInstanceFromNode,
    beforeActiveInstanceBlur = $$$config.beforeActiveInstanceBlur,
    afterActiveInstanceBlur = $$$config.afterActiveInstanceBlur,
    preparePortalMount = $$$config.preparePortalMount,
    prepareScopeUpdate = $$$config.prepareScopeUpdate,
    getInstanceFromScope = $$$config.getInstanceFromScope,
    setCurrentUpdatePriority = $$$config.setCurrentUpdatePriority,
    getCurrentUpdatePriority = $$$config.getCurrentUpdatePriority,
    resolveUpdatePriority = $$$config.resolveUpdatePriority;
  $$$config.trackSchedulerEvent;
  $$$config.resolveEventType;
  $$$config.resolveEventTimeStamp;
  var shouldAttemptEagerTransition = $$$config.shouldAttemptEagerTransition,
    detachDeletedInstance = $$$config.detachDeletedInstance,
    requestPostPaintCallback = $$$config.requestPostPaintCallback,
    maySuspendCommit = $$$config.maySuspendCommit,
    maySuspendCommitOnUpdate = $$$config.maySuspendCommitOnUpdate,
    maySuspendCommitInSyncRender = $$$config.maySuspendCommitInSyncRender,
    preloadInstance = $$$config.preloadInstance,
    startSuspendingCommit = $$$config.startSuspendingCommit,
    suspendInstance = $$$config.suspendInstance,
    suspendOnActiveViewTransition = $$$config.suspendOnActiveViewTransition,
    waitForCommitToBeReady = $$$config.waitForCommitToBeReady;
  $$$config.getSuspendedCommitReason;
  var NotPendingTransition = $$$config.NotPendingTransition,
    HostTransitionContext = $$$config.HostTransitionContext,
    resetFormInstance = $$$config.resetFormInstance;
  $$$config.bindToConsole;
  var supportsMicrotasks = $$$config.supportsMicrotasks,
    scheduleMicrotask = $$$config.scheduleMicrotask,
    supportsTestSelectors = $$$config.supportsTestSelectors,
    findFiberRoot = $$$config.findFiberRoot,
    getBoundingRect = $$$config.getBoundingRect,
    getTextContent = $$$config.getTextContent,
    isHiddenSubtree = $$$config.isHiddenSubtree,
    matchAccessibilityRole = $$$config.matchAccessibilityRole,
    setFocusIfFocusable = $$$config.setFocusIfFocusable,
    setupIntersectionObserver = $$$config.setupIntersectionObserver,
    appendChild = $$$config.appendChild,
    appendChildToContainer = $$$config.appendChildToContainer,
    commitTextUpdate = $$$config.commitTextUpdate,
    commitMount = $$$config.commitMount,
    commitUpdate = $$$config.commitUpdate,
    insertBefore = $$$config.insertBefore,
    insertInContainerBefore = $$$config.insertInContainerBefore,
    removeChild = $$$config.removeChild,
    removeChildFromContainer = $$$config.removeChildFromContainer,
    resetTextContent = $$$config.resetTextContent,
    hideInstance = $$$config.hideInstance,
    hideTextInstance = $$$config.hideTextInstance,
    unhideInstance = $$$config.unhideInstance,
    unhideTextInstance = $$$config.unhideTextInstance,
    applyViewTransitionName = $$$config.applyViewTransitionName,
    restoreViewTransitionName = $$$config.restoreViewTransitionName,
    cancelViewTransitionName = $$$config.cancelViewTransitionName,
    cancelRootViewTransitionName = $$$config.cancelRootViewTransitionName,
    restoreRootViewTransitionName = $$$config.restoreRootViewTransitionName;
  $$$config.cloneRootViewTransitionContainer;
  $$$config.removeRootViewTransitionClone;
  var measureInstance = $$$config.measureInstance,
    measureClonedInstance = $$$config.measureClonedInstance,
    wasInstanceInViewport = $$$config.wasInstanceInViewport,
    hasInstanceChanged = $$$config.hasInstanceChanged,
    hasInstanceAffectedParent = $$$config.hasInstanceAffectedParent,
    startViewTransition = $$$config.startViewTransition;
  $$$config.startGestureTransition;
  var stopViewTransition = $$$config.stopViewTransition,
    addViewTransitionFinishedListener =
      $$$config.addViewTransitionFinishedListener;
  $$$config.getCurrentGestureOffset;
  var createViewTransitionInstance = $$$config.createViewTransitionInstance,
    clearContainer = $$$config.clearContainer,
    createFragmentInstance = $$$config.createFragmentInstance,
    updateFragmentInstanceFiber = $$$config.updateFragmentInstanceFiber,
    commitNewChildToFragmentInstance =
      $$$config.commitNewChildToFragmentInstance,
    deleteChildFromFragmentInstance = $$$config.deleteChildFromFragmentInstance,
    cloneInstance = $$$config.cloneInstance,
    createContainerChildSet = $$$config.createContainerChildSet,
    appendChildToContainerChildSet = $$$config.appendChildToContainerChildSet,
    finalizeContainerChildren = $$$config.finalizeContainerChildren,
    replaceContainerChildren = $$$config.replaceContainerChildren,
    cloneHiddenInstance = $$$config.cloneHiddenInstance,
    cloneHiddenTextInstance = $$$config.cloneHiddenTextInstance,
    isSuspenseInstancePending = $$$config.isSuspenseInstancePending,
    isSuspenseInstanceFallback = $$$config.isSuspenseInstanceFallback,
    getSuspenseInstanceFallbackErrorDetails =
      $$$config.getSuspenseInstanceFallbackErrorDetails,
    registerSuspenseInstanceRetry = $$$config.registerSuspenseInstanceRetry,
    canHydrateFormStateMarker = $$$config.canHydrateFormStateMarker,
    isFormStateMarkerMatching = $$$config.isFormStateMarkerMatching,
    getNextHydratableSibling = $$$config.getNextHydratableSibling,
    getNextHydratableSiblingAfterSingleton =
      $$$config.getNextHydratableSiblingAfterSingleton,
    getFirstHydratableChild = $$$config.getFirstHydratableChild,
    getFirstHydratableChildWithinContainer =
      $$$config.getFirstHydratableChildWithinContainer,
    getFirstHydratableChildWithinActivityInstance =
      $$$config.getFirstHydratableChildWithinActivityInstance,
    getFirstHydratableChildWithinSuspenseInstance =
      $$$config.getFirstHydratableChildWithinSuspenseInstance,
    getFirstHydratableChildWithinSingleton =
      $$$config.getFirstHydratableChildWithinSingleton,
    canHydrateInstance = $$$config.canHydrateInstance,
    canHydrateTextInstance = $$$config.canHydrateTextInstance,
    canHydrateActivityInstance = $$$config.canHydrateActivityInstance,
    canHydrateSuspenseInstance = $$$config.canHydrateSuspenseInstance,
    hydrateInstance = $$$config.hydrateInstance,
    hydrateTextInstance = $$$config.hydrateTextInstance,
    hydrateActivityInstance = $$$config.hydrateActivityInstance,
    hydrateSuspenseInstance = $$$config.hydrateSuspenseInstance,
    getNextHydratableInstanceAfterActivityInstance =
      $$$config.getNextHydratableInstanceAfterActivityInstance,
    getNextHydratableInstanceAfterSuspenseInstance =
      $$$config.getNextHydratableInstanceAfterSuspenseInstance,
    commitHydratedInstance = $$$config.commitHydratedInstance,
    commitHydratedContainer = $$$config.commitHydratedContainer,
    commitHydratedActivityInstance = $$$config.commitHydratedActivityInstance,
    commitHydratedSuspenseInstance = $$$config.commitHydratedSuspenseInstance,
    finalizeHydratedChildren = $$$config.finalizeHydratedChildren,
    flushHydrationEvents = $$$config.flushHydrationEvents;
  $$$config.clearActivityBoundary;
  var clearSuspenseBoundary = $$$config.clearSuspenseBoundary;
  $$$config.clearActivityBoundaryFromContainer;
  var clearSuspenseBoundaryFromContainer =
      $$$config.clearSuspenseBoundaryFromContainer,
    hideDehydratedBoundary = $$$config.hideDehydratedBoundary,
    unhideDehydratedBoundary = $$$config.unhideDehydratedBoundary,
    shouldDeleteUnhydratedTailInstances =
      $$$config.shouldDeleteUnhydratedTailInstances;
  $$$config.diffHydratedPropsForDevWarnings;
  $$$config.diffHydratedTextForDevWarnings;
  $$$config.describeHydratableInstanceForDevWarnings;
  var validateHydratableInstance = $$$config.validateHydratableInstance,
    validateHydratableTextInstance = $$$config.validateHydratableTextInstance,
    supportsResources = $$$config.supportsResources,
    isHostHoistableType = $$$config.isHostHoistableType,
    getHoistableRoot = $$$config.getHoistableRoot,
    getResource = $$$config.getResource,
    acquireResource = $$$config.acquireResource,
    releaseResource = $$$config.releaseResource,
    hydrateHoistable = $$$config.hydrateHoistable,
    mountHoistable = $$$config.mountHoistable,
    unmountHoistable = $$$config.unmountHoistable,
    createHoistableInstance = $$$config.createHoistableInstance,
    prepareToCommitHoistables = $$$config.prepareToCommitHoistables,
    mayResourceSuspendCommit = $$$config.mayResourceSuspendCommit,
    preloadResource = $$$config.preloadResource,
    suspendResource = $$$config.suspendResource,
    supportsSingletons = $$$config.supportsSingletons,
    resolveSingletonInstance = $$$config.resolveSingletonInstance,
    acquireSingletonInstance = $$$config.acquireSingletonInstance,
    releaseSingletonInstance = $$$config.releaseSingletonInstance,
    isHostSingletonType = $$$config.isHostSingletonType,
    isSingletonScope = $$$config.isSingletonScope,
    valueStack = [],
    index$jscomp$0 = -1,
    emptyContextObject = {},
    contextStackCursor$1 = createCursor(emptyContextObject),
    didPerformWorkStackCursor = createCursor(!1),
    previousContext = emptyContextObject,
    clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
    log$1 = Math.log,
    LN2 = Math.LN2,
    nextTransitionUpdateLane = 256,
    nextTransitionDeferredLane = 262144,
    nextRetryLane = 4194304,
    scheduleCallback$3 = Scheduler.unstable_scheduleCallback,
    cancelCallback$1 = Scheduler.unstable_cancelCallback,
    shouldYield = Scheduler.unstable_shouldYield,
    requestPaint = Scheduler.unstable_requestPaint,
    now = Scheduler.unstable_now,
    ImmediatePriority = Scheduler.unstable_ImmediatePriority,
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority,
    NormalPriority$1 = Scheduler.unstable_NormalPriority,
    IdlePriority = Scheduler.unstable_IdlePriority,
    log = Scheduler.log,
    unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,
    rendererID = null,
    injectedHook = null,
    globalClientIdCounter$1 = 0,
    objectIs = "function" === typeof Object.is ? Object.is : is,
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
    suffix,
    reentry = !1,
    CapturedStacks = new WeakMap(),
    forkStack = [],
    forkStackIndex = 0,
    treeForkProvider = null,
    treeForkCount = 0,
    idStack = [],
    idStackIndex = 0,
    treeContextProvider = null,
    treeContextId = 1,
    treeContextOverflow = "",
    contextStackCursor = createCursor(null),
    contextFiberStackCursor = createCursor(null),
    rootInstanceStackCursor = createCursor(null),
    hostTransitionProviderCursor = createCursor(null),
    hydrationParentFiber = null,
    nextHydratableInstance = null,
    isHydrating = !1,
    hydrationErrors = null,
    rootOrSingletonContext = !1,
    HydrationMismatchException = Error(formatProdErrorMessage(519)),
    valueCursor = createCursor(null),
    currentlyRenderingFiber$1 = null,
    lastContextDependency = null,
    AbortControllerLocal =
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
    },
    entangledTransitionTypes = null,
    firstScheduledRoot = null,
    lastScheduledRoot = null,
    didScheduleMicrotask = !1,
    mightHavePendingSyncWork = !1,
    isFlushingWork = !1,
    currentEventTransitionLane = 0,
    currentEntangledListeners = null,
    currentEntangledPendingCount = 0,
    currentEntangledLane = 0,
    currentEntangledActionThenable = null,
    isomorphicDefaultTransitionIndicator = void 0,
    pendingIsomorphicIndicator = null,
    pendingEntangledRoots = 0,
    needsIsomorphicIndicator = !1,
    prevOnStartTransitionFinish = ReactSharedInternals.S;
  ReactSharedInternals.S = function (transition, returnValue) {
    globalMostRecentTransitionTime = now();
    "object" === typeof returnValue &&
      null !== returnValue &&
      "function" === typeof returnValue.then &&
      entangleAsyncAction(transition, returnValue);
    if (enableViewTransition) {
      if (null !== entangledTransitionTypes)
        for (var root = firstScheduledRoot; null !== root; )
          queueTransitionTypes(root, entangledTransitionTypes),
            (root = root.next);
      root = transition.types;
      if (null !== root) {
        for (var root$22 = firstScheduledRoot; null !== root$22; )
          queueTransitionTypes(root$22, root), (root$22 = root$22.next);
        if (0 !== currentEntangledLane && enableViewTransition) {
          root$22 = entangledTransitionTypes;
          null === root$22 && (root$22 = entangledTransitionTypes = []);
          for (var i = 0; i < root.length; i++) {
            var transitionType = root[i];
            -1 === root$22.indexOf(transitionType) &&
              root$22.push(transitionType);
          }
        }
      }
    }
    null !== prevOnStartTransitionFinish &&
      prevOnStartTransitionFinish(transition, returnValue);
  };
  var resumedCache = createCursor(null),
    transitionStack = createCursor(null),
    SuspenseException = Error(formatProdErrorMessage(460)),
    SuspenseyCommitException = Error(formatProdErrorMessage(474)),
    SuspenseActionException = Error(formatProdErrorMessage(542)),
    noopSuspenseyCommitThenable = { then: function () {} },
    suspendedThenable = null,
    thenableState$1 = null,
    thenableIndexCounter$1 = 0,
    reconcileChildFibers = createChildReconciler(!0),
    mountChildFibers = createChildReconciler(!1),
    concurrentQueues = [],
    concurrentQueuesIndex = 0,
    concurrentlyUpdatedLanes = 0,
    hasForceUpdate = !1,
    didReadFromEntangledAsyncAction = !1,
    currentTreeHiddenStackCursor = createCursor(null),
    prevEntangledRenderLanesCursor = createCursor(0),
    suspenseHandlerStackCursor = createCursor(null),
    shellBoundary = null,
    suspenseStackCursor = createCursor(0),
    renderLanes = 0,
    currentlyRenderingFiber = null,
    currentHook = null,
    workInProgressHook = null,
    didScheduleRenderPhaseUpdate = !1,
    didScheduleRenderPhaseUpdateDuringThisPass = !1,
    shouldDoubleInvokeUserFnsInHooksDEV = !1,
    localIdCounter = 0,
    thenableIndexCounter = 0,
    thenableState = null,
    globalClientIdCounter = 0,
    ContextOnlyDispatcher = {
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
          dispatch = dispatchSetState.bind(
            null,
            currentlyRenderingFiber,
            queue
          );
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
      useSyncExternalStore: function (
        subscribe,
        getSnapshot,
        getServerSnapshot
      ) {
        var fiber = currentlyRenderingFiber,
          hook = mountWorkInProgressHook();
        if (isHydrating) {
          if (void 0 === getServerSnapshot)
            throw Error(formatProdErrorMessage(407));
          getServerSnapshot = getServerSnapshot();
        } else {
          getServerSnapshot = getSnapshot();
          if (null === workInProgressRoot)
            throw Error(formatProdErrorMessage(349));
          0 !== (workInProgressRootRenderLanes & 127) ||
            pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
        }
        hook.memoizedState = getServerSnapshot;
        var inst = { value: getServerSnapshot, getSnapshot: getSnapshot };
        hook.queue = inst;
        mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
          subscribe
        ]);
        fiber.flags |= 2048;
        pushSimpleEffect(
          9,
          { destroy: void 0 },
          updateStoreInstance.bind(
            null,
            fiber,
            inst,
            getServerSnapshot,
            getSnapshot
          ),
          null
        );
        return getServerSnapshot;
      },
      useId: function () {
        var hook = mountWorkInProgressHook(),
          identifierPrefix = workInProgressRoot.identifierPrefix;
        if (isHydrating) {
          var JSCompiler_inline_result = treeContextOverflow;
          var idWithLeadingBit = treeContextId;
          JSCompiler_inline_result =
            (
              idWithLeadingBit & ~(1 << (32 - clz32(idWithLeadingBit) - 1))
            ).toString(32) + JSCompiler_inline_result;
          identifierPrefix =
            "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
          JSCompiler_inline_result = localIdCounter++;
          0 < JSCompiler_inline_result &&
            (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
          identifierPrefix += "_";
        } else
          (JSCompiler_inline_result = globalClientIdCounter++),
            (identifierPrefix =
              "_" +
              identifierPrefix +
              "r_" +
              JSCompiler_inline_result.toString(32) +
              "_");
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
            throw Error(formatProdErrorMessage(440));
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
    },
    classComponentUpdater = {
      enqueueSetState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane),
          entangleTransitions(payload, inst, lane));
      },
      enqueueReplaceState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.tag = 1;
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane),
          entangleTransitions(payload, inst, lane));
      },
      enqueueForceUpdate: function (inst, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.tag = 2;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        callback = enqueueUpdate(inst, update, lane);
        null !== callback &&
          (scheduleUpdateOnFiber(callback, inst, lane),
          entangleTransitions(callback, inst, lane));
      }
    },
    markerInstanceStack = createCursor(null),
    SelectiveHydrationException = Error(formatProdErrorMessage(461)),
    didReceiveUpdate = !1,
    SUSPENDED_MARKER = {
      dehydrated: null,
      treeContext: null,
      retryLane: 0,
      hydrationErrors: null
    },
    emptyObject = {},
    rootMutationContext = !1,
    viewTransitionMutationContext = !1,
    shouldStartViewTransition = !1,
    appearingViewTransitions = null,
    viewTransitionCancelableChildren = null,
    viewTransitionHostInstanceIdx = 0,
    offscreenSubtreeIsHidden = !1,
    offscreenSubtreeWasHidden = !1,
    offscreenDirectParentIsHidden = !1,
    needsFormReset = !1,
    PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
    nextEffect = null,
    focusedInstanceHandle = null,
    shouldFireAfterActiveInstanceBlur = !1,
    viewTransitionContextChanged = !1,
    inUpdateViewTransition = !1,
    rootViewTransitionAffected = !1,
    rootViewTransitionNameCanceled = !1,
    hostParent = null,
    hostParentIsContainer = !1,
    currentHoistableRoot = null,
    suspenseyCommitFlag = 8192,
    DefaultAsyncDispatcher = {
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
    COMPONENT_TYPE = 0,
    HAS_PSEUDO_CLASS_TYPE = 1,
    ROLE_TYPE = 2,
    TEST_NAME_TYPE = 3,
    TEXT_TYPE = 4;
  if ("function" === typeof Symbol && Symbol.for) {
    var symbolFor = Symbol.for;
    COMPONENT_TYPE = symbolFor("selector.component");
    HAS_PSEUDO_CLASS_TYPE = symbolFor("selector.has_pseudo_class");
    ROLE_TYPE = symbolFor("selector.role");
    TEST_NAME_TYPE = symbolFor("selector.test_id");
    TEXT_TYPE = symbolFor("selector.text");
  }
  var postPaintCallbackScheduled = !1,
    callbacks = [],
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
    didIncludeCommitPhaseUpdate = !1,
    globalMostRecentFallbackTime = 0,
    globalMostRecentTransitionTime = 0,
    workInProgressRootRenderTargetTime = Infinity,
    workInProgressTransitions = null,
    currentPendingTransitionCallbacks = null,
    currentEndTime = null,
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
    pendingDidIncludeRenderPhaseUpdate = !1,
    nestedUpdateCount = 0,
    rootWithNestedUpdates = null,
    nestedUpdateKind = 0,
    createFiber = enableObjectFiber
      ? createFiberImplObject
      : createFiberImplClass;
  exports.attemptContinuousHydration = function (fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var root = enqueueConcurrentRenderForLane(fiber, 67108864);
      null !== root && scheduleUpdateOnFiber(root, fiber, 67108864);
      markRetryLaneIfNotHydrated(fiber, 67108864);
    }
  };
  exports.attemptHydrationAtCurrentPriority = function (fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var lane = requestUpdateLane();
      lane = getBumpedLaneForHydrationByLane(lane);
      var root = enqueueConcurrentRenderForLane(fiber, lane);
      null !== root && scheduleUpdateOnFiber(root, fiber, lane);
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  };
  exports.attemptSynchronousHydration = function (fiber) {
    switch (fiber.tag) {
      case 3:
        fiber = fiber.stateNode;
        if (fiber.current.memoizedState.isDehydrated) {
          var lanes = getHighestPriorityLanes(fiber.pendingLanes);
          if (0 !== lanes) {
            fiber.pendingLanes |= 2;
            for (fiber.entangledLanes |= 2; lanes; ) {
              var lane = 1 << (31 - clz32(lanes));
              fiber.entanglements[1] |= lane;
              lanes &= ~lane;
            }
            ensureRootIsScheduled(fiber);
            0 === (executionContext & 6) &&
              ((workInProgressRootRenderTargetTime = now() + 500),
              flushSyncWorkAcrossRoots_impl(0, !1));
          }
        }
        break;
      case 31:
      case 13:
        (lanes = enqueueConcurrentRenderForLane(fiber, 2)),
          null !== lanes && scheduleUpdateOnFiber(lanes, fiber, 2),
          flushSyncWork(),
          markRetryLaneIfNotHydrated(fiber, 2);
    }
  };
  exports.batchedUpdates = function (fn, a) {
    return fn(a);
  };
  exports.createComponentSelector = function (component) {
    return { $$typeof: COMPONENT_TYPE, value: component };
  };
  exports.createContainer = function (
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    transitionCallbacks
  ) {
    containerInfo = createFiberRoot(
      containerInfo,
      tag,
      !1,
      null,
      hydrationCallbacks,
      isStrictMode,
      identifierPrefix,
      null,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      transitionCallbacks
    );
    registerDefaultIndicator(onDefaultTransitionIndicator);
    return containerInfo;
  };
  exports.createHasPseudoClassSelector = function (selectors) {
    return { $$typeof: HAS_PSEUDO_CLASS_TYPE, value: selectors };
  };
  exports.createHydrationContainer = function (
    initialChildren,
    callback,
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    onDefaultTransitionIndicator,
    transitionCallbacks,
    formState
  ) {
    initialChildren = createFiberRoot(
      containerInfo,
      tag,
      !0,
      initialChildren,
      hydrationCallbacks,
      isStrictMode,
      identifierPrefix,
      formState,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      transitionCallbacks
    );
    registerDefaultIndicator(onDefaultTransitionIndicator);
    initialChildren.context = getContextForSubtree(null);
    onDefaultTransitionIndicator = initialChildren.current;
    containerInfo = requestUpdateLane();
    containerInfo = getBumpedLaneForHydrationByLane(containerInfo);
    tag = createUpdate(containerInfo);
    tag.callback = void 0 !== callback && null !== callback ? callback : null;
    enqueueUpdate(onDefaultTransitionIndicator, tag, containerInfo);
    callback = containerInfo;
    initialChildren.current.lanes = callback;
    markRootUpdated(initialChildren, callback);
    ensureRootIsScheduled(initialChildren);
    return initialChildren;
  };
  exports.createPortal = function (children, containerInfo, implementation) {
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
  };
  exports.createRoleSelector = function (role) {
    return { $$typeof: ROLE_TYPE, value: role };
  };
  exports.createTestNameSelector = function (id) {
    return { $$typeof: TEST_NAME_TYPE, value: id };
  };
  exports.createTextSelector = function (text) {
    return { $$typeof: TEXT_TYPE, value: text };
  };
  exports.defaultOnCaughtError = function (error) {
    console.error(error);
  };
  exports.defaultOnRecoverableError = function (error) {
    reportGlobalError(error);
  };
  exports.defaultOnUncaughtError = function (error) {
    reportGlobalError(error);
  };
  exports.deferredUpdates = function (fn) {
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      return (
        setCurrentUpdatePriority(32), (ReactSharedInternals.T = null), fn()
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition);
    }
  };
  exports.discreteUpdates = function (fn, a, b, c, d) {
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      return (
        setCurrentUpdatePriority(2),
        (ReactSharedInternals.T = null),
        fn(a, b, c, d)
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition),
        0 === executionContext &&
          (workInProgressRootRenderTargetTime = now() + 500);
    }
  };
  exports.findAllNodes = findAllNodes;
  exports.findBoundingRects = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    selectors = findAllNodes(hostRoot, selectors);
    hostRoot = [];
    for (var i = 0; i < selectors.length; i++)
      hostRoot.push(getBoundingRect(selectors[i]));
    for (selectors = hostRoot.length - 1; 0 < selectors; selectors--) {
      i = hostRoot[selectors];
      for (
        var targetLeft = i.x,
          targetRight = targetLeft + i.width,
          targetTop = i.y,
          targetBottom = targetTop + i.height,
          j = selectors - 1;
        0 <= j;
        j--
      )
        if (selectors !== j) {
          var otherRect = hostRoot[j],
            otherLeft = otherRect.x,
            otherRight = otherLeft + otherRect.width,
            otherTop = otherRect.y,
            otherBottom = otherTop + otherRect.height;
          if (
            targetLeft >= otherLeft &&
            targetTop >= otherTop &&
            targetRight <= otherRight &&
            targetBottom <= otherBottom
          ) {
            hostRoot.splice(selectors, 1);
            break;
          } else if (
            !(
              targetLeft !== otherLeft ||
              i.width !== otherRect.width ||
              otherBottom < targetTop ||
              otherTop > targetBottom
            )
          ) {
            otherTop > targetTop &&
              ((otherRect.height += otherTop - targetTop),
              (otherRect.y = targetTop));
            otherBottom < targetBottom &&
              (otherRect.height = targetBottom - otherTop);
            hostRoot.splice(selectors, 1);
            break;
          } else if (
            !(
              targetTop !== otherTop ||
              i.height !== otherRect.height ||
              otherRight < targetLeft ||
              otherLeft > targetRight
            )
          ) {
            otherLeft > targetLeft &&
              ((otherRect.width += otherLeft - targetLeft),
              (otherRect.x = targetLeft));
            otherRight < targetRight &&
              (otherRect.width = targetRight - otherLeft);
            hostRoot.splice(selectors, 1);
            break;
          }
        }
    }
    return hostRoot;
  };
  exports.findHostInstance = findHostInstance;
  exports.findHostInstanceWithNoPortals = function (fiber) {
    fiber = findCurrentFiberUsingSlowPath(fiber);
    fiber =
      null !== fiber ? findCurrentHostFiberWithNoPortalsImpl(fiber) : null;
    return null === fiber ? null : getPublicInstance(fiber.stateNode);
  };
  exports.findHostInstanceWithWarning = function (component) {
    return findHostInstance(component);
  };
  exports.flushPassiveEffects = flushPendingEffects;
  exports.flushSyncFromReconciler = function (fn) {
    var prevExecutionContext = executionContext;
    executionContext |= 1;
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      if ((setCurrentUpdatePriority(2), (ReactSharedInternals.T = null), fn))
        return fn();
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition),
        (executionContext = prevExecutionContext),
        0 === (executionContext & 6) && flushSyncWorkAcrossRoots_impl(0, !1);
    }
  };
  exports.flushSyncWork = flushSyncWork;
  exports.focusWithin = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findFiberRootForHostRoot(hostRoot);
    selectors = findPaths(hostRoot, selectors);
    selectors = Array.from(selectors);
    for (hostRoot = 0; hostRoot < selectors.length; ) {
      var fiber = selectors[hostRoot++],
        tag = fiber.tag;
      if (!isHiddenSubtree(fiber)) {
        if (
          (5 === tag || 26 === tag || 27 === tag) &&
          setFocusIfFocusable(fiber.stateNode)
        )
          return !0;
        for (fiber = fiber.child; null !== fiber; )
          selectors.push(fiber), (fiber = fiber.sibling);
      }
    }
    return !1;
  };
  exports.getFindAllNodesFailureDescription = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    var maxSelectorIndex = 0,
      matchedNames = [];
    hostRoot = [findFiberRootForHostRoot(hostRoot), 0];
    for (var index = 0; index < hostRoot.length; ) {
      var fiber = hostRoot[index++],
        tag = fiber.tag,
        selectorIndex = hostRoot[index++],
        selector = selectors[selectorIndex];
      if ((5 !== tag && 26 !== tag && 27 !== tag) || !isHiddenSubtree(fiber))
        if (
          (matchSelector(fiber, selector) &&
            (matchedNames.push(selectorToString(selector)),
            selectorIndex++,
            selectorIndex > maxSelectorIndex &&
              (maxSelectorIndex = selectorIndex)),
          selectorIndex < selectors.length)
        )
          for (fiber = fiber.child; null !== fiber; )
            hostRoot.push(fiber, selectorIndex), (fiber = fiber.sibling);
    }
    if (maxSelectorIndex < selectors.length) {
      for (
        hostRoot = [];
        maxSelectorIndex < selectors.length;
        maxSelectorIndex++
      )
        hostRoot.push(selectorToString(selectors[maxSelectorIndex]));
      return (
        "findAllNodes was able to match part of the selector:\n  " +
        (matchedNames.join(" > ") +
          "\n\nNo matching component was found for:\n  ") +
        hostRoot.join(" > ")
      );
    }
    return null;
  };
  exports.getPublicRootInstance = function (container) {
    container = container.current;
    if (!container.child) return null;
    switch (container.child.tag) {
      case 27:
      case 5:
        return getPublicInstance(container.child.stateNode);
      default:
        return container.child.stateNode;
    }
  };
  exports.injectIntoDevTools = function () {
    var internals = {
      bundleType: 0,
      version: rendererVersion,
      rendererPackageName: rendererPackageName,
      currentDispatcherRef: ReactSharedInternals,
      reconcilerVersion: "19.3.0-www-classic-08725f21-20260706"
    };
    null !== extraDevToolsConfig &&
      (internals.rendererConfig = extraDevToolsConfig);
    if ("undefined" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) internals = !1;
    else {
      var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.isDisabled || !hook.supportsFiber) internals = !0;
      else {
        try {
          (rendererID = hook.inject(internals)), (injectedHook = hook);
        } catch (err) {}
        internals = hook.checkDCE ? !0 : !1;
      }
    }
    return internals;
  };
  exports.isAlreadyRendering = function () {
    return 0 !== (executionContext & 6);
  };
  exports.observeVisibleRects = function (
    hostRoot,
    selectors,
    callback,
    options
  ) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findAllNodes(hostRoot, selectors);
    var disconnect = setupIntersectionObserver(
      hostRoot,
      callback,
      options
    ).disconnect;
    return {
      disconnect: function () {
        disconnect();
      }
    };
  };
  exports.shouldError = function () {
    return null;
  };
  exports.shouldSuspend = function () {
    return !1;
  };
  exports.startHostTransition = function (
    formFiber,
    pendingState,
    action,
    formData
  ) {
    if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
    var queue = ensureFormComponentIsStateful(formFiber).queue;
    startTransition(
      formFiber,
      queue,
      pendingState,
      NotPendingTransition,
      null === action
        ? noop
        : function () {
            var stateHook = ensureFormComponentIsStateful(formFiber);
            null === stateHook.next &&
              (stateHook = formFiber.alternate.memoizedState);
            dispatchSetStateInternal(
              formFiber,
              stateHook.next.queue,
              {},
              requestUpdateLane()
            );
            return action(formData);
          }
    );
  };
  exports.updateContainer = function (
    element,
    container,
    parentComponent,
    callback
  ) {
    var current = container.current,
      lane = requestUpdateLane();
    updateContainerImpl(
      current,
      lane,
      element,
      container,
      parentComponent,
      callback
    );
    return lane;
  };
  exports.updateContainerSync = function (
    element,
    container,
    parentComponent,
    callback
  ) {
    updateContainerImpl(
      container.current,
      2,
      element,
      container,
      parentComponent,
      callback
    );
    return 2;
  };
  return exports;
};
module.exports.default = module.exports;
Object.defineProperty(module.exports, "__esModule", { value: !0 });
