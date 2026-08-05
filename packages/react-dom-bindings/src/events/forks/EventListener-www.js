/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const EventListenerWWW = require('EventListener');

import typeof * as EventListenerType from '../EventListener';
import typeof * as EventListenerShimType from './EventListener-www';

export function addEventBubbleListener(
  target: EventTarget,
  eventType: string,
  listener: Function,
): mixed {
  return EventListenerWWW.listen(target, eventType, listener);
}

export function addEventCaptureListener(
  target: EventTarget,
  eventType: string,
  listener: Function,
): mixed {
  return EventListenerWWW.capture(target, eventType, listener);
}

export function addEventCaptureListenerWithPassiveFlag(
  target: EventTarget,
  eventType: string,
  listener: Function,
  passive: boolean,
): mixed {
  return EventListenerWWW.captureWithPassiveFlag(
    target,
    eventType,
    listener,
    passive,
  );
}

export function addEventBubbleListenerWithPassiveFlag(
  target: EventTarget,
  eventType: string,
  listener: Function,
  passive: boolean,
): mixed {
  return EventListenerWWW.bubbleWithPassiveFlag(
    target,
    eventType,
    listener,
    passive,
  );
}

export function removeEventListener(
  target: EventTarget,
  eventType: string,
  listener: Function,
  capture: boolean,
) {
  listener.remove();
}

// Flow magic to verify the exports of this file match the original version.
null as any as EventListenerType as EventListenerShimType as EventListenerType;
