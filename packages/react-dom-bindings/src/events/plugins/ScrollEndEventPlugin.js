/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {AnyNativeEvent} from '../PluginModuleType';
import type {DOMEventName} from '../DOMEventNames';
import type {DispatchQueue} from '../DOMPluginEventSystem';
import type {EventSystemFlags} from '../EventSystemFlags';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {ReactSyntheticEvent} from '../ReactSyntheticEventType';

import {registerTwoPhaseEvent} from '../EventRegistry';
import {SyntheticUIEvent} from '../SyntheticEvent';

import {canUseDOM} from 'shared/ExecutionEnvironment';
import isEventSupported from '../isEventSupported';

import {IS_CAPTURE_PHASE} from '../EventSystemFlags';

import {batchedUpdates} from '../ReactDOMUpdateBatching';
import {
  processDispatchQueue,
  accumulateSinglePhaseListeners,
  accumulateTwoPhaseListeners,
} from '../DOMPluginEventSystem';

import {
  getScrollEndTimer,
  setScrollEndTimer,
  clearScrollEndTimer,
} from '../../client/ReactDOMComponentTree';

import {enableScrollEndPolyfill} from 'shared/ReactFeatureFlags';

const isScrollEndEventSupported =
  enableScrollEndPolyfill && canUseDOM && isEventSupported('scrollend');

let isTouchStarted = false;
let isMouseDown = false;

function registerEvents() {
  registerTwoPhaseEvent('onScrollEnd', [
    'scroll',
    'scrollend',
    'touchstart',
    'touchcancel',
    'touchend',
    'mousedown',
    'mouseup',
  ]);
}

function manualDispatchScrollEndEvent(
  inst: Fiber,
  nativeEvent: AnyNativeEvent,
  target: EventTarget,
) {
  const dispatchQueue: DispatchQueue = [];
  const listeners = accumulateTwoPhaseListeners(inst, 'onScrollEnd');
  if (listeners.length > 0) {
    const event: ReactSyntheticEvent = new SyntheticUIEvent(
      'onScrollEnd',
      'scrollend',
      null,
      nativeEvent, // This will be the "scroll" event.
      target,
    );
    dispatchQueue.push({event, listeners});
  }
  batchedUpdates(runEventInBatch, dispatchQueue);
}

function runEventInBatch(dispatchQueue: DispatchQueue) {
  processDispatchQueue(dispatchQueue, 0);
}

function fireScrollEnd(
  targetInst: Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget,
): void {
  clearScrollEndTimer(nativeEventTarget);
  if (isMouseDown || isTouchStarted) {
    // If mouse or touch is down, try again later in case this is due to having an
    // active scroll but it's not currently moving.
    debounceScrollEnd(targetInst, nativeEvent, nativeEventTarget);
    return;
  }
  manualDispatchScrollEndEvent(targetInst, nativeEvent, nativeEventTarget);
}

// When scrolling slows down the frequency of new scroll events can be quite low.
// This timeout seems high enough to cover those cases but short enough to not
// fire the event way too late.
const DEBOUNCE_TIMEOUT = 200;

function debounceScrollEnd(
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: EventTarget,
) {
  const existingTimer = getScrollEndTimer(nativeEventTarget);
  if (existingTimer != null) {
    clearTimeout(existingTimer);
  }
  if (targetInst !== null) {
    const newTimer = setTimeout(
      fireScrollEnd.bind(null, targetInst, nativeEvent, nativeEventTarget),
      DEBOUNCE_TIMEOUT,
    );
    setScrollEndTimer(nativeEventTarget, newTimer);
  }
}

/**
 * This plugin creates an `onScrollEnd` event polyfill when the native one
 * is not available.
 */
function extractEvents(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
  eventSystemFlags: EventSystemFlags,
  targetContainer: null | EventTarget,
) {
  if (!enableScrollEndPolyfill) {
    return;
  }

  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;

  if (domEventName !== 'scrollend') {
    if (!isScrollEndEventSupported && inCapturePhase) {
      switch (domEventName) {
        case 'scroll': {
          if (nativeEventTarget !== null) {
            debounceScrollEnd(targetInst, nativeEvent, nativeEventTarget);
          }
          break;
        }
        case 'touchstart': {
          isTouchStarted = true;
          break;
        }
        case 'touchcancel':
        case 'touchend': {
          // Note we cannot use pointer events for this because they get
          // cancelled when native scrolling takes control.
          isTouchStarted = false;
          break;
        }
        case 'mousedown': {
          isMouseDown = true;
          break;
        }
        case 'mouseup': {
          isMouseDown = false;
          break;
        }
      }
    }
    return;
  }

  if (!isScrollEndEventSupported && nativeEventTarget !== null) {
    const existingTimer = getScrollEndTimer(nativeEventTarget);
    if (existingTimer != null) {
      // If we do get a native scrollend event fired, we cancel the polyfill.
      // This could happen if our feature detection is broken or if there's another
      // polyfill calling dispatchEvent to fire it before we fire ours.
      clearTimeout(existingTimer);
      clearScrollEndTimer(nativeEventTarget);
    } else {
      // If we didn't receive a 'scroll' event first, we ignore this event to avoid
      // double firing. Such as if we fired our onScrollEnd polyfill and then
      // we also observed a native one afterwards.
      return;
    }
  }

  // In React onScrollEnd doesn't bubble.
  const accumulateTargetOnly = !inCapturePhase;

  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    'onScrollEnd',
    'scrollend',
    inCapturePhase,
    accumulateTargetOnly,
    nativeEvent,
  );

  if (listeners.length > 0) {
    // Intentionally create event lazily.
    const event: ReactSyntheticEvent = new SyntheticUIEvent(
      'onScrollEnd',
      'scrollend',
      null,
      nativeEvent,
      nativeEventTarget,
    );
    dispatchQueue.push({event, listeners});
  }
}

export {registerEvents, extractEvents};
