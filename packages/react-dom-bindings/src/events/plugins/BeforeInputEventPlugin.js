/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {DOMEventName} from '../../events/DOMEventNames';
import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
import type {AnyNativeEvent} from '../../events/PluginModuleType';
import type {DispatchQueue} from '../DOMPluginEventSystem';
import type {EventSystemFlags} from '../EventSystemFlags';
import type {ReactSyntheticEvent} from '../ReactSyntheticEventType';

import {canUseDOM} from 'shared/ExecutionEnvironment';

import {registerTwoPhaseEvent} from '../EventRegistry';
import {
  getData as FallbackCompositionStateGetData,
  initialize as FallbackCompositionStateInitialize,
  reset as FallbackCompositionStateReset,
} from '../FallbackCompositionState';
import {
  SyntheticCompositionEvent,
  SyntheticInputEvent,
} from '../SyntheticEvent';
import {accumulateTwoPhaseListeners} from '../DOMPluginEventSystem';

const END_KEYCODES = [9, 13, 27, 32]; // Tab, Return, Esc, Space
const START_KEYCODE = 229;

const canUseCompositionEvent = canUseDOM && 'CompositionEvent' in window;

let documentMode = null;
if (canUseDOM && 'documentMode' in document) {
  documentMode = document.documentMode;
}

// Webkit offers a very useful `textInput` event that can be used to
// directly represent `beforeInput`. The IE `textinput` event is not as
// useful, so we don't use it.
const canUseTextInputEvent =
  canUseDOM && 'TextEvent' in window && !documentMode;

// In IE9+, we have access to composition events, but the data supplied
// by the native compositionend event may be incorrect. Japanese ideographic
// spaces, for instance (\u3000) are not recorded correctly.
const useFallbackCompositionData =
  canUseDOM &&
  (!canUseCompositionEvent ||
    (documentMode && documentMode > 8 && documentMode <= 11));

const SPACEBAR_CODE = 32;
const SPACEBAR_CHAR = String.fromCharCode(SPACEBAR_CODE);

function registerEvents() {
  registerTwoPhaseEvent('onBeforeInput', [
    'compositionend',
    'keypress',
    'textInput',
    'paste',
  ]);
  registerTwoPhaseEvent('onCompositionEnd', [
    'compositionend',
    'focusout',
    'keydown',
    'keypress',
    'keyup',
    'mousedown',
  ]);
  registerTwoPhaseEvent('onCompositionStart', [
    'compositionstart',
    'focusout',
    'keydown',
    'keypress',
    'keyup',
    'mousedown',
  ]);
  registerTwoPhaseEvent('onCompositionUpdate', [
    'compositionupdate',
    'focusout',
    'keydown',
    'keypress',
    'keyup',
    'mousedown',
  ]);
}

// Track whether we've ever handled a keypress on the space key.
let hasSpaceKeypress = false;

/**
 * Return whether a native keypress event is assumed to be a command.
 * This is required because Firefox fires `keypress` events for key commands
 * (cut, copy, select-all, etc.) even though no character is inserted.
 */
function isKeypressCommand(nativeEvent: any) {
  return (
    (nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) &&
    // ctrlKey && altKey is equivalent to AltGr, and is not a command.
    !(nativeEvent.ctrlKey && nativeEvent.altKey)
  );
}

/**
 * Translate native top level events into event types.
 */
function getCompositionEventType(domEventName: DOMEventName) {
  switch (domEventName) {
    case 'compositionstart':
      return 'onCompositionStart';
    case 'compositionend':
      return 'onCompositionEnd';
    case 'compositionupdate':
      return 'onCompositionUpdate';
  }
}

/**
 * Does our fallback best-guess model think this event signifies that
 * composition has begun?
 */
function isFallbackCompositionStart(
  domEventName: DOMEventName,
  nativeEvent: any,
): boolean {
  return domEventName === 'keydown' && nativeEvent.keyCode === START_KEYCODE;
}

/**
 * Does our fallback mode think that this event is the end of composition?
 */
function isFallbackCompositionEnd(
  domEventName: DOMEventName,
  nativeEvent: any,
): boolean {
  switch (domEventName) {
    case 'keyup':
      // Command keys insert or clear IME input.
      return END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1;
    case 'keydown':
      // Expect IME keyCode on each keydown. If we get any other
      // code we must have exited earlier.
      return nativeEvent.keyCode !== START_KEYCODE;
    case 'keypress':
    case 'mousedown':
    case 'focusout':
      // Events are not possible without cancelling IME.
      return true;
    default:
      return false;
  }
}

/**
 * Google Input Tools provides composition data via a CustomEvent,
 * with the `data` property populated in the `detail` object. If this
 * is available on the event object, use it. If not, this is a plain
 * composition event and we have nothing special to extract.
 *
 * @param {object} nativeEvent
 * @return {?string}
 */
function getDataFromCustomEvent(nativeEvent: any) {
  const detail = nativeEvent.detail;
  if (typeof detail === 'object' && 'data' in detail) {
    return detail.data;
  }
  return null;
}

/**
 * Check if a composition event was triggered by Korean IME.
 * Our fallback mode does not work well with IE's Korean IME,
 * so just use native composition events when Korean IME is used.
 * Although CompositionEvent.locale property is deprecated,
 * it is available in IE, where our fallback mode is enabled.
 *
 * @param {object} nativeEvent
 * @return {boolean}
 */
function isUsingKoreanIME(nativeEvent: any) {
  return nativeEvent.locale === 'ko';
}

// Track the current IME composition status, if any.
let isComposing = false;

/**
 * @return {?object} A SyntheticCompositionEvent.
 */
function extractCompositionEvent(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
) {
  let eventType;
  let fallbackData;

  if (canUseCompositionEvent) {
    eventType = getCompositionEventType(domEventName);
  } else if (!isComposing) {
    if (isFallbackCompositionStart(domEventName, nativeEvent)) {
      eventType = 'onCompositionStart';
    }
  } else if (isFallbackCompositionEnd(domEventName, nativeEvent)) {
    eventType = 'onCompositionEnd';
  }

  if (!eventType) {
    return null;
  }

  if (useFallbackCompositionData && !isUsingKoreanIME(nativeEvent)) {
    // The current composition is stored statically and must not be
    // overwritten while composition continues.
    if (!isComposing && eventType === 'onCompositionStart') {
      isComposing = FallbackCompositionStateInitialize(nativeEventTarget);
    } else if (eventType === 'onCompositionEnd') {
      if (isComposing) {
        fallbackData = FallbackCompositionStateGetData();
      }
    }
  }

  const listeners = accumulateTwoPhaseListeners(targetInst, eventType);
  if (listeners.length > 0) {
    const event: ReactSyntheticEvent = new SyntheticCompositionEvent(
      eventType,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget,
    );
    dispatchQueue.push({event, listeners});
    if (fallbackData) {
      // Inject data generated from fallback path into the synthetic event.
      // This matches the property of native CompositionEventInterface.
      // $FlowFixMe[incompatible-use]
      event.data = fallbackData;
    } else {
      const customData = getDataFromCustomEvent(nativeEvent);
      if (customData !== null) {
        // $FlowFixMe[incompatible-use]
        event.data = customData;
      }
    }
  }
}

function getNativeBeforeInputChars(
  domEventName: DOMEventName,
  nativeEvent: any,
): ?string {
  switch (domEventName) {
    case 'compositionend':
      return getDataFromCustomEvent(nativeEvent);
    case 'keypress':
      /**
       * If native `textInput` events are available, our goal is to make
       * use of them. However, there is a special case: the spacebar key.
       * In Webkit, preventing default on a spacebar `textInput` event
       * cancels character insertion, but it *also* causes the browser
       * to fall back to its default spacebar behavior of scrolling the
       * page.
       *
       * Tracking at:
       * https://code.google.com/p/chromium/issues/detail?id=355103
       *
       * To avoid this issue, use the keypress event as if no `textInput`
       * event is available.
       */
      const which = nativeEvent.which;
      if (which !== SPACEBAR_CODE) {
        return null;
      }

      hasSpaceKeypress = true;
      return SPACEBAR_CHAR;

    case 'textInput':
      // Record the characters to be added to the DOM.
      const chars = nativeEvent.data;

      // If it's a spacebar character, assume that we have already handled
      // it at the keypress level and bail immediately. Android Chrome
      // doesn't give us keycodes, so we need to ignore it.
      if (chars === SPACEBAR_CHAR && hasSpaceKeypress) {
        return null;
      }

      return chars;

    default:
      // For other native event types, do nothing.
      return null;
  }
}

/**
 * For browsers that do not provide the `textInput` event, extract the
 * appropriate string to use for SyntheticInputEvent.
 */
function getFallbackBeforeInputChars(
  domEventName: DOMEventName,
  nativeEvent: any,
): ?string {
  // If we are currently composing (IME) and using a fallback to do so,
  // try to extract the composed characters from the fallback object.
  // If composition event is available, we extract a string only at
  // compositionevent, otherwise extract it at fallback events.
  if (isComposing) {
    if (
      domEventName === 'compositionend' ||
      (!canUseCompositionEvent &&
        isFallbackCompositionEnd(domEventName, nativeEvent))
    ) {
      const chars = FallbackCompositionStateGetData();
      FallbackCompositionStateReset();
      isComposing = false;
      return chars;
    }
    return null;
  }

  switch (domEventName) {
    case 'paste':
      // If a paste event occurs after a keypress, throw out the input
      // chars. Paste events should not lead to BeforeInput events.
      return null;
    case 'keypress':
      /**
       * As of v27, Firefox may fire keypress events even when no character
       * will be inserted. A few possibilities:
       *
       * - `which` is `0`. Arrow keys, Esc key, etc.
       *
       * - `which` is the pressed key code, but no char is available.
       *   Ex: 'AltGr + d` in Polish. There is no modified character for
       *   this key combination and no character is inserted into the
       *   document, but FF fires the keypress for char code `100` anyway.
       *   No `input` event will occur.
       *
       * - `which` is the pressed key code, but a command combination is
       *   being used. Ex: `Cmd+C`. No character is inserted, and no
       *   `input` event will occur.
       */
      if (!isKeypressCommand(nativeEvent)) {
        // IE fires the `keypress` event when a user types an emoji via
        // Touch keyboard of Windows.  In such a case, the `char` property
        // holds an emoji character like `\uD83D\uDE0A`.  Because its length
        // is 2, the property `which` does not represent an emoji correctly.
        // In such a case, we directly return the `char` property instead of
        // using `which`.
        if (nativeEvent.char && nativeEvent.char.length > 1) {
          return nativeEvent.char;
        } else if (nativeEvent.which) {
          return String.fromCharCode(nativeEvent.which);
        }
      }
      return null;
    case 'compositionend':
      return useFallbackCompositionData && !isUsingKoreanIME(nativeEvent)
        ? null
        : nativeEvent.data;
    default:
      return null;
  }
}

/**
 * Extract a SyntheticInputEvent for `beforeInput`, based on either native
 * `textInput` or fallback behavior.
 *
 * @return {?object} A SyntheticInputEvent.
 */
function extractBeforeInputEvent(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
) {
  let chars;

  if (canUseTextInputEvent) {
    chars = getNativeBeforeInputChars(domEventName, nativeEvent);
  } else {
    chars = getFallbackBeforeInputChars(domEventName, nativeEvent);
  }

  // If no characters are being inserted, no BeforeInput event should
  // be fired.
  if (!chars) {
    return null;
  }

  const listeners = accumulateTwoPhaseListeners(targetInst, 'onBeforeInput');
  if (listeners.length > 0) {
    const event: ReactSyntheticEvent = new SyntheticInputEvent(
      'onBeforeInput',
      'beforeinput',
      null,
      nativeEvent,
      nativeEventTarget,
    );
    dispatchQueue.push({event, listeners});
    // $FlowFixMe[incompatible-use]
    event.data = chars;
  }
}

/**
 * Create an `onBeforeInput` event to match
 * http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105/#events-inputevents.
 *
 * This event plugin is based on the native `textInput` event
 * available in Chrome, Safari, Opera, and IE. This event fires after
 * `onKeyPress` and `onCompositionEnd`, but before `onInput`.
 *
 * `beforeInput` is spec'd but not implemented in any browsers, and
 * the `input` event does not provide any useful information about what has
 * actually been added, contrary to the spec. Thus, `textInput` is the best
 * available event to identify the characters that have actually been inserted
 * into the target node.
 *
 * This plugin is also responsible for emitting `composition` events, thus
 * allowing us to share composition fallback code for both `beforeInput` and
 * `composition` event types.
 */
function extractEvents(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
): void {
  extractCompositionEvent(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
  );
  extractBeforeInputEvent(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
  );
}

export {registerEvents, extractEvents};
