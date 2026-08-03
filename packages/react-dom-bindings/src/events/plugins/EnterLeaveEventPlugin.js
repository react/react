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
import type {KnownReactSyntheticEvent} from '../ReactSyntheticEventType';

import {registerDirectEvent} from '../EventRegistry';
import {isReplayingEvent} from '../CurrentReplayingEvent';
import {SyntheticMouseEvent, SyntheticPointerEvent} from '../SyntheticEvent';
import {
  getClosestInstanceFromNode,
  getNodeFromInstance,
  isContainerMarkedAsRoot,
} from '../../client/ReactDOMComponentTree';
import {accumulateEnterLeaveTwoPhaseListeners} from '../DOMPluginEventSystem';

import {
  HostComponent,
  HostSingleton,
  HostText,
} from 'react-reconciler/src/ReactWorkTags';
import {getNearestMountedFiber} from 'react-reconciler/src/ReactFiberTreeReflection';

function registerEvents() {
  registerDirectEvent('onMouseEnter', ['mouseout', 'mouseover']);
  registerDirectEvent('onMouseLeave', ['mouseout', 'mouseover']);
  registerDirectEvent('onPointerEnter', ['pointerout', 'pointerover']);
  registerDirectEvent('onPointerLeave', ['pointerout', 'pointerover']);
}

/**
 * For almost every interaction we care about, there will be both a top-level
 * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
 * we do not extract duplicate events. However, moving the mouse into the
 * browser from outside will not fire a `mouseout` event. In this case, we use
 * the `mouseover` top-level event.
 */
function extractEvents(
  dispatchQueue: DispatchQueue,
  domEventName: DOMEventName,
  targetInst: null | Fiber,
  nativeEvent: AnyNativeEvent,
  nativeEventTarget: null | EventTarget,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
) {
  const isOverEvent =
    domEventName === 'mouseover' || domEventName === 'pointerover';
  const isOutEvent =
    domEventName === 'mouseout' || domEventName === 'pointerout';

  if (isOverEvent && !isReplayingEvent(nativeEvent)) {
    // If this is an over event with a target, we might have already dispatched
    // the event in the out event of the other target. If this is replayed,
    // then it's because we couldn't dispatch against this target previously
    // so we have to do it now instead.
    const related =
      (nativeEvent as any).relatedTarget || (nativeEvent as any).fromElement;
    if (related) {
      // If the related node is managed by React, we can assume that we have
      // already dispatched the corresponding events during its mouseout.
      if (
        getClosestInstanceFromNode(related) ||
        isContainerMarkedAsRoot(related)
      ) {
        return;
      }
    }
  }

  if (!isOutEvent && !isOverEvent) {
    // Must not be a mouse or pointer in or out - ignoring.
    return;
  }

  let win;
  // TODO: why is this nullable in the types but we read from it?
  if ((nativeEventTarget as any).window === nativeEventTarget) {
    // `nativeEventTarget` is probably a window object.
    win = nativeEventTarget;
  } else {
    // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
    const doc = (nativeEventTarget as any).ownerDocument;
    if (doc) {
      win = doc.defaultView || doc.parentWindow;
    } else {
      win = window;
    }
  }

  let from;
  let to;
  if (isOutEvent) {
    const related = nativeEvent.relatedTarget || (nativeEvent as any).toElement;
    from = targetInst;
    to = related ? getClosestInstanceFromNode(related as any) : null;
    if (to !== null) {
      const nearestMounted = getNearestMountedFiber(to);
      const tag = to.tag;
      if (
        to !== nearestMounted ||
        (tag !== HostComponent && tag !== HostSingleton && tag !== HostText)
      ) {
        to = null;
      }
    }
  } else {
    // Moving to a node from outside the window.
    from = null;
    to = targetInst;
  }

  if (from === to) {
    // Nothing pertains to our managed components.
    return;
  }

  let SyntheticEventCtor = SyntheticMouseEvent;
  let leaveEventType = 'onMouseLeave';
  let enterEventType = 'onMouseEnter';
  let eventTypePrefix = 'mouse';
  if (domEventName === 'pointerout' || domEventName === 'pointerover') {
    SyntheticEventCtor = SyntheticPointerEvent;
    leaveEventType = 'onPointerLeave';
    enterEventType = 'onPointerEnter';
    eventTypePrefix = 'pointer';
  }

  const fromNode = from == null ? win : getNodeFromInstance(from);
  const toNode = to == null ? win : getNodeFromInstance(to);

  // Create the synthetic events lazily: they are only needed when a matching
  // listener exists on the from/to path.
  // accumulateEnterLeaveTwoPhaseListeners checks that before invoking these
  // factories. mouseout/mouseover fire on every boundary crossing, so most
  // dispatches have no listener and would otherwise allocate (and immediately
  // discard) these events.
  const createLeaveEvent = (): KnownReactSyntheticEvent => {
    const leave: KnownReactSyntheticEvent = new SyntheticEventCtor(
      leaveEventType,
      eventTypePrefix + 'leave',
      from,
      nativeEvent,
      nativeEventTarget,
    );
    leave.target = fromNode;
    leave.relatedTarget = toNode;
    return leave;
  };

  // We should only process this nativeEvent if we are processing
  // the first ancestor. Next time, we will ignore the event.
  const nativeTargetInst = getClosestInstanceFromNode(nativeEventTarget as any);
  const createEnterEvent: null | (() => KnownReactSyntheticEvent) =
    nativeTargetInst === targetInst
      ? (): KnownReactSyntheticEvent => {
          const enter: KnownReactSyntheticEvent = new SyntheticEventCtor(
            enterEventType,
            eventTypePrefix + 'enter',
            to,
            nativeEvent,
            nativeEventTarget,
          );
          enter.target = toNode;
          enter.relatedTarget = fromNode;
          return enter;
        }
      : null;

  accumulateEnterLeaveTwoPhaseListeners(
    dispatchQueue,
    leaveEventType,
    createLeaveEvent,
    enterEventType,
    createEnterEvent,
    from,
    to,
  );
}

export {registerEvents, extractEvents};
