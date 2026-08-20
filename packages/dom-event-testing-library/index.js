/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {buttonType, buttonsType} from './constants';
import * as domEvents from './domEvents';
import * as domEventSequences from './domEventSequences';
import {hasPointerEvent, setPointerEvent, platform} from './domEnvironment';
import {describeWithPointerEvent, testWithPointerType} from './testHelpers';

const createEventTarget = node => ({
  node,
  /**
   * Simple events abstraction.
   */
  blur(payload) {
    node.dispatchEvent(domEvents.blur(payload));
    node.dispatchEvent(domEvents.focusOut(payload));
  },
  click(payload) {
    node.dispatchEvent(domEvents.click(payload));
  },
  focus(payload) {
    node.dispatchEvent(domEvents.focus(payload));
    node.dispatchEvent(domEvents.focusIn(payload));
    node.focus();
  },
  keydown(payload) {
    node.dispatchEvent(domEvents.keydown(payload));
  },
  keyup(payload) {
    node.dispatchEvent(domEvents.keyup(payload));
  },
  scroll(payload) {
    node.dispatchEvent(domEvents.scroll(payload));
  },
  virtualclick(payload) {
    node.dispatchEvent(domEvents.virtualclick(payload));
  },
  /**
   * PointerEvent abstraction.
   * Dispatches the expected sequence of PointerEvents, MouseEvents, and
   * TouchEvents for a given environment.
   */
  contextmenu(payload, options) {
    domEventSequences.contextmenu(node, payload, options);
  },
  // node no longer receives events for the pointer
  pointercancel(payload) {
    domEventSequences.pointercancel(node, payload);
  },
  // node dispatches down events
  pointerdown(payload) {
    domEventSequences.pointerdown(node, payload);
  },
  // node dispatches move events (pointer is not down)
  pointerhover(payload) {
    domEventSequences.pointerhover(node, payload);
  },
  // node dispatches move events (pointer is down)
  pointermove(payload) {
    domEventSequences.pointermove(node, payload);
  },
  // node dispatches enter & over events
  pointerenter(payload) {
    domEventSequences.pointerenter(node, payload);
  },
  // node dispatches exit & leave events
  pointerexit(payload) {
    domEventSequences.pointerexit(node, payload);
  },
  // node dispatches up events
  pointerup(payload) {
    domEventSequences.pointerup(node, payload);
  },
  /**
   * Gesture abstractions.
   * Helpers for event sequences expected in a gesture.
   * target.tap({ pointerType: 'touch' })
   */
  tap(payload) {
    domEventSequences.pointerdown(payload);
    domEventSequences.pointerup(payload);
  },
  /**
   * Utilities
   */
  setBoundingClientRect({x, y, width, height}) {
    node.getBoundingClientRect = function () {
      return {
        width,
        height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
      };
    };
  },
});

const resetActivePointers = domEventSequences.resetActivePointers;

export {
  buttonType,
  buttonsType,
  createEventTarget,
  describeWithPointerEvent,
  platform,
  hasPointerEvent,
  resetActivePointers,
  setPointerEvent,
  testWithPointerType,
};
