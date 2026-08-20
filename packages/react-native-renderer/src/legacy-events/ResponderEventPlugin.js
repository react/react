/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

import {
  executeDirectDispatch,
  hasDispatches,
  executeDispatchesInOrderStopAtTrue,
  getInstanceFromNode,
  getFiberCurrentPropsFromNode,
} from './EventPluginUtils';
import ResponderSyntheticEvent from './ResponderSyntheticEvent';
import ResponderTouchHistoryStore from './ResponderTouchHistoryStore';
import accumulate from './accumulate';
import {
  TOP_SCROLL,
  TOP_SELECTION_CHANGE,
  TOP_TOUCH_CANCEL,
  isStartish,
  isMoveish,
  isEndish,
  startDependencies,
  moveDependencies,
  endDependencies,
} from './ResponderTopLevelEventTypes';
import accumulateInto from './accumulateInto';
import forEachAccumulated from './forEachAccumulated';
import {HostComponent} from 'react-reconciler/src/ReactWorkTags';

/**
 * Instance of element that should respond to touch/move types of interactions,
 * as indicated explicitly by relevant callbacks.
 */
let responderInst = null;

/**
 * Count of current touches. A textInput should become responder iff the
 * selection changes while there is a touch on the screen.
 */
let trackedTouchCount = 0;

function changeResponder(nextResponderInst, blockHostResponder) {
  const oldResponderInst = responderInst;
  responderInst = nextResponderInst;
  if (ResponderEventPlugin.GlobalResponderHandler !== null) {
    ResponderEventPlugin.GlobalResponderHandler.onChange(
      oldResponderInst,
      nextResponderInst,
      blockHostResponder,
    );
  }
}

const eventTypes = {
  /**
   * On a `touchStart`/`mouseDown`, is it desired that this element become the
   * responder?
   */
  startShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: 'onStartShouldSetResponder',
      captured: 'onStartShouldSetResponderCapture',
    },
    dependencies: startDependencies,
  },

  /**
   * On a `scroll`, is it desired that this element become the responder? This
   * is usually not needed, but should be used to retroactively infer that a
   * `touchStart` had occurred during momentum scroll. During a momentum scroll,
   * a touch start will be immediately followed by a scroll event if the view is
   * currently scrolling.
   *
   * TODO: This shouldn't bubble.
   */
  scrollShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: 'onScrollShouldSetResponder',
      captured: 'onScrollShouldSetResponderCapture',
    },
    dependencies: [TOP_SCROLL],
  },

  /**
   * On text selection change, should this element become the responder? This
   * is needed for text inputs or other views with native selection, so the
   * JS view can claim the responder.
   *
   * TODO: This shouldn't bubble.
   */
  selectionChangeShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: 'onSelectionChangeShouldSetResponder',
      captured: 'onSelectionChangeShouldSetResponderCapture',
    },
    dependencies: [TOP_SELECTION_CHANGE],
  },

  /**
   * On a `touchMove`/`mouseMove`, is it desired that this element become the
   * responder?
   */
  moveShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: 'onMoveShouldSetResponder',
      captured: 'onMoveShouldSetResponderCapture',
    },
    dependencies: moveDependencies,
  },

  /**
   * Direct responder events dispatched directly to responder. Do not bubble.
   */
  responderStart: {
    registrationName: 'onResponderStart',
    dependencies: startDependencies,
  },
  responderMove: {
    registrationName: 'onResponderMove',
    dependencies: moveDependencies,
  },
  responderEnd: {
    registrationName: 'onResponderEnd',
    dependencies: endDependencies,
  },
  responderRelease: {
    registrationName: 'onResponderRelease',
    dependencies: endDependencies,
  },
  responderTerminationRequest: {
    registrationName: 'onResponderTerminationRequest',
    dependencies: [],
  },
  responderGrant: {
    registrationName: 'onResponderGrant',
    dependencies: [],
  },
  responderReject: {
    registrationName: 'onResponderReject',
    dependencies: [],
  },
  responderTerminate: {
    registrationName: 'onResponderTerminate',
    dependencies: [],
  },
};

// Start of inline: the below functions were inlined from
// EventPropagator.js, as they deviated from ReactDOM's newer
// implementations.

function getParent(inst) {
  do {
    inst = inst.return;
    // TODO: If this is a HostRoot we might want to bail out.
    // That is depending on if we want nested subtrees (layers) to bubble
    // events to their parent. We could also go through parentNode on the
    // host node but that wouldn't work for React Native and doesn't let us
    // do the portal feature.
  } while (inst && inst.tag !== HostComponent);
  if (inst) {
    return inst;
  }
  return null;
}

/**
 * Return the lowest common ancestor of A and B, or null if they are in
 * different trees.
 */
export function getLowestCommonAncestor(instA, instB) {
  let depthA = 0;
  for (let tempA = instA; tempA; tempA = getParent(tempA)) {
    depthA++;
  }
  let depthB = 0;
  for (let tempB = instB; tempB; tempB = getParent(tempB)) {
    depthB++;
  }

  // If A is deeper, crawl up.
  while (depthA - depthB > 0) {
    instA = getParent(instA);
    depthA--;
  }

  // If B is deeper, crawl up.
  while (depthB - depthA > 0) {
    instB = getParent(instB);
    depthB--;
  }

  // Walk in lockstep until we find a match.
  let depth = depthA;
  while (depth--) {
    if (instA === instB || instA === instB.alternate) {
      return instA;
    }
    instA = getParent(instA);
    instB = getParent(instB);
  }
  return null;
}

/**
 * Return if A is an ancestor of B.
 */
function isAncestor(instA, instB) {
  while (instB) {
    if (instA === instB || instA === instB.alternate) {
      return true;
    }
    instB = getParent(instB);
  }
  return false;
}

/**
 * Simulates the traversal of a two-phase, capture/bubble event dispatch.
 */
function traverseTwoPhase(inst, fn, arg) {
  const path = [];
  while (inst) {
    path.push(inst);
    inst = getParent(inst);
  }
  let i;
  for (i = path.length; i-- > 0; ) {
    fn(path[i], 'captured', arg);
  }
  for (i = 0; i < path.length; i++) {
    fn(path[i], 'bubbled', arg);
  }
}

function getListener(inst, registrationName) {
  const stateNode = inst.stateNode;
  if (stateNode === null) {
    // Work in progress (ex: onload events in incremental mode).
    return null;
  }
  const props = getFiberCurrentPropsFromNode(stateNode);
  if (props === null) {
    // Work in progress.
    return null;
  }
  const listener = props[registrationName];

  if (listener && typeof listener !== 'function') {
    throw new Error(
      `Expected \`${registrationName}\` listener to be a function, instead got a value of \`${typeof listener}\` type.`,
    );
  }

  return listener;
}

function listenerAtPhase(inst, event, propagationPhase: PropagationPhases) {
  const registrationName =
    event.dispatchConfig.phasedRegistrationNames[propagationPhase];
  return getListener(inst, registrationName);
}

function accumulateDirectionalDispatches(inst, phase, event) {
  if (__DEV__) {
    if (!inst) {
      console.error('Dispatching inst must not be null');
    }
  }
  const listener = listenerAtPhase(inst, event, phase);
  if (listener) {
    event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      listener,
    );
    event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
  }
}

/**
 * Accumulates without regard to direction, does not look for phased
 * registration names. Same as `accumulateDirectDispatchesSingle` but without
 * requiring that the `dispatchMarker` be the same as the dispatched ID.
 */
function accumulateDispatches(
  inst: Object,
  ignoredDirection: ?boolean,
  event: Object,
): void {
  if (inst && event && event.dispatchConfig.registrationName) {
    const registrationName = event.dispatchConfig.registrationName;
    const listener = getListener(inst, registrationName);
    if (listener) {
      event._dispatchListeners = accumulateInto(
        event._dispatchListeners,
        listener,
      );
      event._dispatchInstances = accumulateInto(event._dispatchInstances, inst);
    }
  }
}

/**
 * Accumulates dispatches on an `SyntheticEvent`, but only for the
 * `dispatchMarker`.
 * @param {SyntheticEvent} event
 */
function accumulateDirectDispatchesSingle(event: Object) {
  if (event && event.dispatchConfig.registrationName) {
    accumulateDispatches(event._targetInst, null, event);
  }
}

function accumulateDirectDispatches(events: ?(Array<Object> | Object)) {
  forEachAccumulated(events, accumulateDirectDispatchesSingle);
}

function accumulateTwoPhaseDispatchesSingleSkipTarget(event) {
  if (event && event.dispatchConfig.phasedRegistrationNames) {
    const targetInst = event._targetInst;
    const parentInst = targetInst ? getParent(targetInst) : null;
    traverseTwoPhase(parentInst, accumulateDirectionalDispatches, event);
  }
}

function accumulateTwoPhaseDispatchesSkipTarget(events) {
  forEachAccumulated(events, accumulateTwoPhaseDispatchesSingleSkipTarget);
}

function accumulateTwoPhaseDispatchesSingle(event) {
  if (event && event.dispatchConfig.phasedRegistrationNames) {
    traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event);
  }
}

function accumulateTwoPhaseDispatches(events) {
  forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle);
}
// End of inline

/**
 *
 * Responder System:
 * ----------------
 *
 * - A global, solitary "interaction lock" on a view.
 * - If a node becomes the responder, it should convey visual feedback
 *   immediately to indicate so, either by highlighting or moving accordingly.
 * - To be the responder means, that touches are exclusively important to that
 *   responder view, and no other view.
 * - While touches are still occurring, the responder lock can be transferred to
 *   a new view, but only to increasingly "higher" views (meaning ancestors of
 *   the current responder).
 *
 * Responder being granted:
 * ------------------------
 *
 * - Touch starts, moves, and scrolls can cause an ID to become the responder.
 * - We capture/bubble `startShouldSetResponder`/`moveShouldSetResponder` to
 *   the "appropriate place".
 * - If nothing is currently the responder, the "appropriate place" is the
 *   initiating event's `targetID`.
 * - If something *is* already the responder, the "appropriate place" is the
 *   first common ancestor of the event target and the current `responderInst`.
 * - Some negotiation happens: See the timing diagram below.
 * - Scrolled views automatically become responder. The reasoning is that a
 *   platform scroll view that isn't built on top of the responder system has
 *   began scrolling, and the active responder must now be notified that the
 *   interaction is no longer locked to it - the system has taken over.
 *
 * - Responder being released:
 *   As soon as no more touches that *started* inside of descendants of the
 *   *current* responderInst, an `onResponderRelease` event is dispatched to the
 *   current responder, and the responder lock is released.
 *
 * TODO:
 * - on "end", a callback hook for `onResponderEndShouldRemainResponder` that
 *   determines if the responder lock should remain.
 * - If a view shouldn't "remain" the responder, any active touches should by
 *   default be considered "dead" and do not influence future negotiations or
 *   bubble paths. It should be as if those touches do not exist.
 * -- For multitouch: Usually a translate-z will choose to "remain" responder
 *  after one out of many touches ended. For translate-y, usually the view
 *  doesn't wish to "remain" responder after one of many touches end.
 * - Consider building this on top of a `stopPropagation` model similar to
 *   `W3C` events.
 * - Ensure that `onResponderTerminate` is called on touch cancels, whether or
 *   not `onResponderTerminationRequest` returns `true` or `false`.
 *
 */

/*                                             Negotiation Performed
                                             +-----------------------+
                                            /                         \
Process low level events to    +     Current Responder      +   wantsResponderID
determine who to perform negot-|   (if any exists at all)   |
iation/transition              | Otherwise just pass through|
-------------------------------+----------------------------+------------------+
Bubble to find first ID        |                            |
to return true:wantsResponderID|                            |
                               |                            |
     +-------------+           |                            |
     | onTouchStart|           |                            |
     +------+------+     none  |                            |
            |            return|                            |
+-----------v-------------+true| +------------------------+ |
|onStartShouldSetResponder|----->|onResponderStart (cur)  |<-----------+
+-----------+-------------+    | +------------------------+ |          |
            |                  |                            | +--------+-------+
            | returned true for|       false:REJECT +-------->|onResponderReject
            | wantsResponderID |                    |       | +----------------+
            | (now attempt     | +------------------+-----+ |
            |  handoff)        | |   onResponder          | |
            +------------------->|      TerminationRequest| |
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |         true:GRANT +-------->|onResponderGrant|
                               |                            | +--------+-------+
                               | +------------------------+ |          |
                               | |   onResponderTerminate |<-----------+
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |                    +-------->|onResponderStart|
                               |                            | +----------------+
Bubble to find first ID        |                            |
to return true:wantsResponderID|                            |
                               |                            |
     +-------------+           |                            |
     | onTouchMove |           |                            |
     +------+------+     none  |                            |
            |            return|                            |
+-----------v-------------+true| +------------------------+ |
|onMoveShouldSetResponder |----->|onResponderMove (cur)   |<-----------+
+-----------+-------------+    | +------------------------+ |          |
            |                  |                            | +--------+-------+
            | returned true for|       false:REJECT +-------->|onResponderRejec|
            | wantsResponderID |                    |       | +----------------+
            | (now attempt     | +------------------+-----+ |
            |  handoff)        | |   onResponder          | |
            +------------------->|      TerminationRequest| |
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |         true:GRANT +-------->|onResponderGrant|
                               |                            | +--------+-------+
                               | +------------------------+ |          |
                               | |   onResponderTerminate |<-----------+
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |                    +-------->|onResponderMove |
                               |                            | +----------------+
                               |                            |
                               |                            |
      Some active touch started|                            |
      inside current responder | +------------------------+ |
      +------------------------->|      onResponderEnd    | |
      |                        | +------------------------+ |
  +---+---------+              |                            |
  | onTouchEnd  |              |                            |
  +---+---------+              |                            |
      |                        | +------------------------+ |
      +------------------------->|     onResponderEnd     | |
      No active touches started| +-----------+------------+ |
      inside current responder |             |              |
                               |             v              |
                               | +------------------------+ |
                               | |    onResponderRelease  | |
                               | +------------------------+ |
                               |                            |
                               +                            + */

/**
 * A note about event ordering in the `EventPluginRegistry`.
 *
 * Suppose plugins are injected in the following order:
 *
 * `[R, S, C]`
 *
 * To help illustrate the example, assume `S` is `SimpleEventPlugin` (for
 * `onClick` etc) and `R` is `ResponderEventPlugin`.
 *
 * "Deferred-Dispatched Events":
 *
 * - The current event plugin system will traverse the list of injected plugins,
 *   in order, and extract events by collecting the plugin's return value of
 *   `extractEvents()`.
 * - These events that are returned from `extractEvents` are "deferred
 *   dispatched events".
 * - When returned from `extractEvents`, deferred-dispatched events contain an
 *   "accumulation" of deferred dispatches.
 * - These deferred dispatches are accumulated/collected before they are
 *   returned, but processed at a later time by the `EventPluginRegistry` (hence the
 *   name deferred).
 *
 * In the process of returning their deferred-dispatched events, event plugins
 * themselves can dispatch events on-demand without returning them from
 * `extractEvents`. Plugins might want to do this, so that they can use event
 * dispatching as a tool that helps them decide which events should be extracted
 * in the first place.
 *
 * "On-Demand-Dispatched Events":
 *
 * - On-demand-dispatched events are not returned from `extractEvents`.
 * - On-demand-dispatched events are dispatched during the process of returning
 *   the deferred-dispatched events.
 * - They should not have side effects.
 * - They should be avoided, and/or eventually be replaced with another
 *   abstraction that allows event plugins to perform multiple "rounds" of event
 *   extraction.
 *
 * Therefore, the sequence of event dispatches becomes:
 *
 * - `R`s on-demand events (if any)   (dispatched by `R` on-demand)
 * - `S`s on-demand events (if any)   (dispatched by `S` on-demand)
 * - `C`s on-demand events (if any)   (dispatched by `C` on-demand)
 * - `R`s extracted events (if any)   (dispatched by `EventPluginRegistry`)
 * - `S`s extracted events (if any)   (dispatched by `EventPluginRegistry`)
 * - `C`s extracted events (if any)   (dispatched by `EventPluginRegistry`)
 *
 * In the case of `ResponderEventPlugin`: If the `startShouldSetResponder`
 * on-demand dispatch returns `true` (and some other details are satisfied) the
 * `onResponderGrant` deferred dispatched event is returned from
 * `extractEvents`. The sequence of dispatch executions in this case
 * will appear as follows:
 *
 * - `startShouldSetResponder` (`ResponderEventPlugin` dispatches on-demand)
 * - `touchStartCapture`       (`EventPluginRegistry` dispatches as usual)
 * - `touchStart`              (`EventPluginRegistry` dispatches as usual)
 * - `responderGrant/Reject`   (`EventPluginRegistry` dispatches as usual)
 */

function setResponderAndExtractTransfer(
  topLevelType,
  targetInst,
  nativeEvent,
  nativeEventTarget,
) {
  const shouldSetEventType = isStartish(topLevelType)
    ? eventTypes.startShouldSetResponder
    : isMoveish(topLevelType)
      ? eventTypes.moveShouldSetResponder
      : topLevelType === TOP_SELECTION_CHANGE
        ? eventTypes.selectionChangeShouldSetResponder
        : eventTypes.scrollShouldSetResponder;

  // TODO: stop one short of the current responder.
  const bubbleShouldSetFrom = !responderInst
    ? targetInst
    : getLowestCommonAncestor(responderInst, targetInst);

  // When capturing/bubbling the "shouldSet" event, we want to skip the target
  // (deepest ID) if it happens to be the current responder. The reasoning:
  // It's strange to get an `onMoveShouldSetResponder` when you're *already*
  // the responder.
  const skipOverBubbleShouldSetFrom = bubbleShouldSetFrom === responderInst;
  const shouldSetEvent = ResponderSyntheticEvent.getPooled(
    shouldSetEventType,
    bubbleShouldSetFrom,
    nativeEvent,
    nativeEventTarget,
  );
  shouldSetEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
  if (skipOverBubbleShouldSetFrom) {
    accumulateTwoPhaseDispatchesSkipTarget(shouldSetEvent);
  } else {
    accumulateTwoPhaseDispatches(shouldSetEvent);
  }
  const wantsResponderInst = executeDispatchesInOrderStopAtTrue(shouldSetEvent);
  if (!shouldSetEvent.isPersistent()) {
    shouldSetEvent.constructor.release(shouldSetEvent);
  }

  if (!wantsResponderInst || wantsResponderInst === responderInst) {
    return null;
  }
  let extracted;
  const grantEvent = ResponderSyntheticEvent.getPooled(
    eventTypes.responderGrant,
    wantsResponderInst,
    nativeEvent,
    nativeEventTarget,
  );
  grantEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;

  accumulateDirectDispatches(grantEvent);
  const blockHostResponder = executeDirectDispatch(grantEvent) === true;
  if (responderInst) {
    const terminationRequestEvent = ResponderSyntheticEvent.getPooled(
      eventTypes.responderTerminationRequest,
      responderInst,
      nativeEvent,
      nativeEventTarget,
    );
    terminationRequestEvent.touchHistory =
      ResponderTouchHistoryStore.touchHistory;
    accumulateDirectDispatches(terminationRequestEvent);
    const shouldSwitch =
      !hasDispatches(terminationRequestEvent) ||
      executeDirectDispatch(terminationRequestEvent);
    if (!terminationRequestEvent.isPersistent()) {
      terminationRequestEvent.constructor.release(terminationRequestEvent);
    }

    if (shouldSwitch) {
      const terminateEvent = ResponderSyntheticEvent.getPooled(
        eventTypes.responderTerminate,
        responderInst,
        nativeEvent,
        nativeEventTarget,
      );
      terminateEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
      accumulateDirectDispatches(terminateEvent);
      extracted = accumulate(extracted, [grantEvent, terminateEvent]);
      changeResponder(wantsResponderInst, blockHostResponder);
    } else {
      const rejectEvent = ResponderSyntheticEvent.getPooled(
        eventTypes.responderReject,
        wantsResponderInst,
        nativeEvent,
        nativeEventTarget,
      );
      rejectEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
      accumulateDirectDispatches(rejectEvent);
      extracted = accumulate(extracted, rejectEvent);
    }
  } else {
    extracted = accumulate(extracted, grantEvent);
    changeResponder(wantsResponderInst, blockHostResponder);
  }
  return extracted;
}

/**
 * A transfer is a negotiation between a currently set responder and the next
 * element to claim responder status. Any start event could trigger a transfer
 * of responderInst. Any move event could trigger a transfer.
 *
 * @param {string} topLevelType Record from `BrowserEventConstants`.
 * @return {boolean} True if a transfer of responder could possibly occur.
 */
function canTriggerTransfer(topLevelType, topLevelInst, nativeEvent) {
  return (
    topLevelInst &&
    // responderIgnoreScroll: We are trying to migrate away from specifically
    // tracking native scroll events here and responderIgnoreScroll indicates we
    // will send topTouchCancel to handle canceling touch events instead
    ((topLevelType === TOP_SCROLL && !nativeEvent.responderIgnoreScroll) ||
      (trackedTouchCount > 0 && topLevelType === TOP_SELECTION_CHANGE) ||
      isStartish(topLevelType) ||
      isMoveish(topLevelType))
  );
}

/**
 * Returns whether or not this touch end event makes it such that there are no
 * longer any touches that started inside of the current `responderInst`.
 *
 * @param {NativeEvent} nativeEvent Native touch end event.
 * @return {boolean} Whether or not this touch end event ends the responder.
 */
function noResponderTouches(nativeEvent) {
  const touches = nativeEvent.touches;
  if (!touches || touches.length === 0) {
    return true;
  }
  for (let i = 0; i < touches.length; i++) {
    const activeTouch = touches[i];
    const target = activeTouch.target;
    if (target !== null && target !== undefined && target !== 0) {
      // Is the original touch location inside of the current responder?
      const targetInst = getInstanceFromNode(target);
      if (isAncestor(responderInst, targetInst)) {
        return false;
      }
    }
  }
  return true;
}

const ResponderEventPlugin = {
  /* For unit testing only */
  _getResponder: function () {
    return responderInst;
  },

  eventTypes: eventTypes,

  /**
   * We must be resilient to `targetInst` being `null` on `touchMove` or
   * `touchEnd`. On certain platforms, this means that a native scroll has
   * assumed control and the original touch targets are destroyed.
   */
  extractEvents: function (
    topLevelType,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
  ) {
    if (isStartish(topLevelType)) {
      trackedTouchCount += 1;
    } else if (isEndish(topLevelType)) {
      if (trackedTouchCount >= 0) {
        trackedTouchCount -= 1;
      } else {
        if (__DEV__) {
          console.warn(
            'Ended a touch event which was not counted in `trackedTouchCount`.',
          );
        }
        return null;
      }
    }

    ResponderTouchHistoryStore.recordTouchTrack(topLevelType, nativeEvent);

    let extracted = canTriggerTransfer(topLevelType, targetInst, nativeEvent)
      ? setResponderAndExtractTransfer(
          topLevelType,
          targetInst,
          nativeEvent,
          nativeEventTarget,
        )
      : null;
    // Responder may or may not have transferred on a new touch start/move.
    // Regardless, whoever is the responder after any potential transfer, we
    // direct all touch start/move/ends to them in the form of
    // `onResponderMove/Start/End`. These will be called for *every* additional
    // finger that move/start/end, dispatched directly to whoever is the
    // current responder at that moment, until the responder is "released".
    //
    // These multiple individual change touch events are are always bookended
    // by `onResponderGrant`, and one of
    // (`onResponderRelease/onResponderTerminate`).
    const isResponderTouchStart = responderInst && isStartish(topLevelType);
    const isResponderTouchMove = responderInst && isMoveish(topLevelType);
    const isResponderTouchEnd = responderInst && isEndish(topLevelType);
    const incrementalTouch = isResponderTouchStart
      ? eventTypes.responderStart
      : isResponderTouchMove
        ? eventTypes.responderMove
        : isResponderTouchEnd
          ? eventTypes.responderEnd
          : null;

    if (incrementalTouch) {
      const gesture = ResponderSyntheticEvent.getPooled(
        incrementalTouch,
        responderInst,
        nativeEvent,
        nativeEventTarget,
      );
      gesture.touchHistory = ResponderTouchHistoryStore.touchHistory;
      accumulateDirectDispatches(gesture);
      extracted = accumulate(extracted, gesture);
    }

    const isResponderTerminate =
      responderInst && topLevelType === TOP_TOUCH_CANCEL;
    const isResponderRelease =
      responderInst &&
      !isResponderTerminate &&
      isEndish(topLevelType) &&
      noResponderTouches(nativeEvent);
    const finalTouch = isResponderTerminate
      ? eventTypes.responderTerminate
      : isResponderRelease
        ? eventTypes.responderRelease
        : null;
    if (finalTouch) {
      const finalEvent = ResponderSyntheticEvent.getPooled(
        finalTouch,
        responderInst,
        nativeEvent,
        nativeEventTarget,
      );
      finalEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
      accumulateDirectDispatches(finalEvent);
      extracted = accumulate(extracted, finalEvent);
      changeResponder(null);
    }

    return extracted;
  },

  GlobalResponderHandler: null,

  injection: {
    /**
     * @param {{onChange: (ReactID, ReactID) => void} GlobalResponderHandler
     * Object that handles any change in responder. Use this to inject
     * integration with an existing touch handling system etc.
     */
    injectGlobalResponderHandler(GlobalResponderHandler) {
      ResponderEventPlugin.GlobalResponderHandler = GlobalResponderHandler;
    },
  },
};

export default ResponderEventPlugin;
