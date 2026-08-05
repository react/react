/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {AnyNativeEvent} from '../events/PluginModuleType';
import type {
  Container,
  ActivityInstance,
  SuspenseInstance,
} from '../client/ReactFiberConfigDOM';
import type {DOMEventName} from '../events/DOMEventNames';
import type {EventSystemFlags} from './EventSystemFlags';
import type {FiberRoot} from 'react-reconciler/src/ReactInternalTypes';
import type {EventPriority} from 'react-reconciler/src/ReactEventPriorities';

import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
} from 'scheduler';
import {
  getNearestMountedFiber,
  getContainerFromFiber,
  getActivityInstanceFromFiber,
  getSuspenseInstanceFromFiber,
} from 'react-reconciler/src/ReactFiberTreeReflection';
import {
  findInstanceBlockingEvent,
  findInstanceBlockingTarget,
} from './ReactDOMEventListener';
import {setReplayingEvent, resetReplayingEvent} from './CurrentReplayingEvent';
import {
  getInstanceFromNode,
  getClosestInstanceFromNode,
  getFiberCurrentPropsFromNode,
} from '../client/ReactDOMComponentTree';
import {
  HostRoot,
  ActivityComponent,
  SuspenseComponent,
} from 'react-reconciler/src/ReactWorkTags';
import {isHigherEventPriority} from 'react-reconciler/src/ReactEventPriorities';
import {isRootDehydrated} from 'react-reconciler/src/ReactFiberShellHydration';
import {dispatchReplayedFormAction} from './plugins/FormActionEventPlugin';
import {
  resolveUpdatePriority,
  runWithPriority as attemptHydrationAtPriority,
} from '../client/ReactDOMUpdatePriority';

import {
  attemptContinuousHydration,
  attemptHydrationAtCurrentPriority,
} from 'react-reconciler/src/ReactFiberReconciler';

import {enableHydrationChangeEvent} from 'shared/ReactFeatureFlags';

// TODO: Upgrade this definition once we're on a newer version of Flow that
// has this definition built-in.
type PointerEventType = Event & {
  pointerId: number,
  relatedTarget: EventTarget | null,
  ...
};

type QueuedReplayableEvent = {
  blockedOn: null | Container | ActivityInstance | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  nativeEvent: AnyNativeEvent,
  targetContainers: Array<EventTarget>,
};

let hasScheduledReplayAttempt = false;

// The last of each continuous event type. We only need to replay the last one
// if the last target was dehydrated.
let queuedFocus: null | QueuedReplayableEvent = null;
let queuedDrag: null | QueuedReplayableEvent = null;
let queuedMouse: null | QueuedReplayableEvent = null;
// For pointer events there can be one latest event per pointerId.
const queuedPointers: Map<number, QueuedReplayableEvent> = new Map();
const queuedPointerCaptures: Map<number, QueuedReplayableEvent> = new Map();
// We could consider replaying selectionchange and touchmoves too.

const queuedChangeEventTargets: Array<EventTarget> = [];

type QueuedHydrationTarget = {
  blockedOn: null | Container | ActivityInstance | SuspenseInstance,
  target: Node,
  priority: EventPriority,
};
const queuedExplicitHydrationTargets: Array<QueuedHydrationTarget> = [];

const discreteReplayableEvents: Array<DOMEventName> = [
  'mousedown',
  'mouseup',
  'touchcancel',
  'touchend',
  'touchstart',
  'auxclick',
  'dblclick',
  'pointercancel',
  'pointerdown',
  'pointerup',
  'dragend',
  'dragstart',
  'drop',
  'compositionend',
  'compositionstart',
  'keydown',
  'keypress',
  'keyup',
  'input',
  'textInput', // Intentionally camelCase
  'copy',
  'cut',
  'paste',
  'click',
  'change',
  'contextmenu',
  'reset',
  // 'submit', // stopPropagation blocks the replay mechanism
];

export function isDiscreteEventThatRequiresHydration(
  eventType: DOMEventName,
): boolean {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

function createQueuedReplayableEvent(
  blockedOn: null | Container | ActivityInstance | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): QueuedReplayableEvent {
  return {
    blockedOn,
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetContainers: [targetContainer],
  };
}

// Resets the replaying for this type of continuous event to no event.
export function clearIfContinuousEvent(
  domEventName: DOMEventName,
  nativeEvent: AnyNativeEvent,
): void {
  switch (domEventName) {
    case 'focusin':
    case 'focusout':
      queuedFocus = null;
      break;
    case 'dragenter':
    case 'dragleave':
      queuedDrag = null;
      break;
    case 'mouseover':
    case 'mouseout':
      queuedMouse = null;
      break;
    case 'pointerover':
    case 'pointerout': {
      const pointerId = (nativeEvent as any as PointerEventType).pointerId;
      queuedPointers.delete(pointerId);
      break;
    }
    case 'gotpointercapture':
    case 'lostpointercapture': {
      const pointerId = (nativeEvent as any as PointerEventType).pointerId;
      queuedPointerCaptures.delete(pointerId);
      break;
    }
  }
}

function accumulateOrCreateContinuousQueuedReplayableEvent(
  existingQueuedEvent: null | QueuedReplayableEvent,
  blockedOn: null | Container | ActivityInstance | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): QueuedReplayableEvent {
  if (
    existingQueuedEvent === null ||
    existingQueuedEvent.nativeEvent !== nativeEvent
  ) {
    const queuedEvent = createQueuedReplayableEvent(
      blockedOn,
      domEventName,
      eventSystemFlags,
      targetContainer,
      nativeEvent,
    );
    if (blockedOn !== null) {
      const fiber = getInstanceFromNode(blockedOn);
      if (fiber !== null) {
        // Attempt to increase the priority of this target.
        attemptContinuousHydration(fiber);
      }
    }
    return queuedEvent;
  }
  // If we have already queued this exact event, then it's because
  // the different event systems have different DOM event listeners.
  // We can accumulate the flags, and the targetContainers, and
  // store a single event to be replayed.
  existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
  const targetContainers = existingQueuedEvent.targetContainers;
  if (
    // $FlowFixMe[invalid-compare]
    targetContainer !== null &&
    targetContainers.indexOf(targetContainer) === -1
  ) {
    targetContainers.push(targetContainer);
  }
  return existingQueuedEvent;
}

export function queueIfContinuousEvent(
  blockedOn: null | Container | ActivityInstance | SuspenseInstance,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  targetContainer: EventTarget,
  nativeEvent: AnyNativeEvent,
): boolean {
  // These set relatedTarget to null because the replayed event will be treated as if we
  // moved from outside the window (no target) onto the target once it hydrates.
  // Instead of mutating we could clone the event.
  switch (domEventName) {
    case 'focusin': {
      const focusEvent = nativeEvent as any as FocusEvent;
      queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedFocus,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        focusEvent,
      );
      return true;
    }
    case 'dragenter': {
      const dragEvent = nativeEvent as any as DragEvent;
      queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedDrag,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        dragEvent,
      );
      return true;
    }
    case 'mouseover': {
      const mouseEvent = nativeEvent as any as MouseEvent;
      queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
        queuedMouse,
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        mouseEvent,
      );
      return true;
    }
    case 'pointerover': {
      const pointerEvent = nativeEvent as any as PointerEventType;
      const pointerId = pointerEvent.pointerId;
      queuedPointers.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointers.get(pointerId) || null,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          pointerEvent,
        ),
      );
      return true;
    }
    case 'gotpointercapture': {
      const pointerEvent = nativeEvent as any as PointerEventType;
      const pointerId = pointerEvent.pointerId;
      queuedPointerCaptures.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointerCaptures.get(pointerId) || null,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          pointerEvent,
        ),
      );
      return true;
    }
  }
  return false;
}

// Check if this target is unblocked. Returns true if it's unblocked.
function attemptExplicitHydrationTarget(
  queuedTarget: QueuedHydrationTarget,
): void {
  // TODO: This function shares a lot of logic with findInstanceBlockingEvent.
  // Try to unify them. It's a bit tricky since it would require two return
  // values.
  const targetInst = getClosestInstanceFromNode(queuedTarget.target);
  if (targetInst !== null) {
    const nearestMounted = getNearestMountedFiber(targetInst);
    if (nearestMounted !== null) {
      const tag = nearestMounted.tag;
      if (tag === SuspenseComponent) {
        const instance = getSuspenseInstanceFromFiber(nearestMounted);
        if (instance !== null) {
          // We're blocked on hydrating this boundary.
          // Increase its priority.
          queuedTarget.blockedOn = instance;
          attemptHydrationAtPriority(queuedTarget.priority, () => {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });

          return;
        }
      } else if (tag === ActivityComponent) {
        const instance = getActivityInstanceFromFiber(nearestMounted);
        if (instance !== null) {
          // We're blocked on hydrating this boundary.
          // Increase its priority.
          queuedTarget.blockedOn = instance;
          attemptHydrationAtPriority(queuedTarget.priority, () => {
            attemptHydrationAtCurrentPriority(nearestMounted);
          });

          return;
        }
      } else if (tag === HostRoot) {
        const root: FiberRoot = nearestMounted.stateNode;
        if (isRootDehydrated(root)) {
          queuedTarget.blockedOn = getContainerFromFiber(nearestMounted);
          // We don't currently have a way to increase the priority of
          // a root other than sync.
          return;
        }
      }
    }
  }
  queuedTarget.blockedOn = null;
}

export function queueExplicitHydrationTarget(target: Node): void {
  const updatePriority = resolveUpdatePriority();
  const queuedTarget: QueuedHydrationTarget = {
    blockedOn: null,
    target: target,
    priority: updatePriority,
  };
  let i = 0;
  for (; i < queuedExplicitHydrationTargets.length; i++) {
    // Stop once we hit the first target with lower priority than
    if (
      !isHigherEventPriority(
        updatePriority,
        queuedExplicitHydrationTargets[i].priority,
      )
    ) {
      break;
    }
  }
  queuedExplicitHydrationTargets.splice(i, 0, queuedTarget);
  if (i === 0) {
    attemptExplicitHydrationTarget(queuedTarget);
  }
}

function attemptReplayContinuousQueuedEvent(
  queuedEvent: QueuedReplayableEvent,
): boolean {
  if (queuedEvent.blockedOn !== null) {
    return false;
  }
  const targetContainers = queuedEvent.targetContainers;
  while (targetContainers.length > 0) {
    const nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
    if (nextBlockedOn === null) {
      const nativeEvent = queuedEvent.nativeEvent;
      const nativeEventClone = new nativeEvent.constructor(
        nativeEvent.type,
        nativeEvent as any,
      );
      setReplayingEvent(nativeEventClone);
      nativeEvent.target.dispatchEvent(nativeEventClone);
      resetReplayingEvent();
    } else {
      // We're still blocked. Try again later.
      const fiber = getInstanceFromNode(nextBlockedOn);
      if (fiber !== null) {
        attemptContinuousHydration(fiber);
      }
      queuedEvent.blockedOn = nextBlockedOn;
      return false;
    }
    // This target container was successfully dispatched. Try the next.
    targetContainers.shift();
  }
  return true;
}

function attemptReplayContinuousQueuedEventInMap(
  queuedEvent: QueuedReplayableEvent,
  key: number,
  map: Map<number, QueuedReplayableEvent>,
): void {
  if (attemptReplayContinuousQueuedEvent(queuedEvent)) {
    map.delete(key);
  }
}

function replayChangeEvent(target: EventTarget): void {
  // Dispatch a fake "change" event for the input.
  const element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =
    target as any;
  if (element.nodeName === 'INPUT') {
    if (element.type === 'checkbox' || element.type === 'radio') {
      // Checkboxes always fire a click event regardless of how the change was made.
      const EventCtr =
        typeof PointerEvent === 'function' ? PointerEvent : Event;
      target.dispatchEvent(new EventCtr('click', {bubbles: true}));
      // For checkboxes the input event uses the Event constructor instead of InputEvent.
      target.dispatchEvent(new Event('input', {bubbles: true}));
    } else {
      if (typeof InputEvent === 'function') {
        target.dispatchEvent(new InputEvent('input', {bubbles: true}));
      }
    }
  } else if (element.nodeName === 'TEXTAREA') {
    if (typeof InputEvent === 'function') {
      target.dispatchEvent(new InputEvent('input', {bubbles: true}));
    }
  }
  target.dispatchEvent(new Event('change', {bubbles: true}));
}

function replayUnblockedEvents() {
  hasScheduledReplayAttempt = false;
  // Replay any continuous events.
  if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
    queuedFocus = null;
  }
  if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
    queuedDrag = null;
  }
  if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
    queuedMouse = null;
  }
  queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
  queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  if (enableHydrationChangeEvent) {
    for (let i = 0; i < queuedChangeEventTargets.length; i++) {
      replayChangeEvent(queuedChangeEventTargets[i]);
    }
    queuedChangeEventTargets.length = 0;
  }
}

export function flushEventReplaying(): void {
  // Synchronously flush any event replaying so that it gets observed before
  // any new updates are applied.
  if (hasScheduledReplayAttempt) {
    replayUnblockedEvents();
  }
}

export function queueChangeEvent(target: EventTarget): void {
  if (enableHydrationChangeEvent) {
    queuedChangeEventTargets.push(target);
    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;
    }
  }
}

function scheduleCallbackIfUnblocked(
  queuedEvent: QueuedReplayableEvent,
  unblocked: Container | SuspenseInstance | ActivityInstance,
) {
  if (queuedEvent.blockedOn === unblocked) {
    queuedEvent.blockedOn = null;
    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;
      if (!enableHydrationChangeEvent) {
        // Schedule a callback to attempt replaying as many events as are
        // now unblocked. This first might not actually be unblocked yet.
        // We could check it early to avoid scheduling an unnecessary callback.
        scheduleCallback(NormalPriority, replayUnblockedEvents);
      }
    }
  }
}

type FormAction = FormData => void | Promise<void>;

type FormReplayingQueue = Array<any>; // [form, submitter or action, formData...]

let lastScheduledReplayQueue: null | FormReplayingQueue = null;

function replayUnblockedFormActions(formReplayingQueue: FormReplayingQueue) {
  if (lastScheduledReplayQueue === formReplayingQueue) {
    lastScheduledReplayQueue = null;
  }
  for (let i = 0; i < formReplayingQueue.length; i += 3) {
    const form: HTMLFormElement = formReplayingQueue[i];
    const submitterOrAction:
      | null
      | HTMLInputElement
      | HTMLButtonElement
      | FormAction = formReplayingQueue[i + 1];
    const formData: FormData = formReplayingQueue[i + 2];
    if (typeof submitterOrAction !== 'function') {
      // This action is not hydrated yet. This might be because it's blocked on
      // a different React instance or higher up our tree.
      const blockedOn = findInstanceBlockingTarget(submitterOrAction || form);
      if (blockedOn === null) {
        // We're not blocked but we don't have an action. This must mean that
        // this is in another React instance. We'll just skip past it.
        continue;
      } else {
        // We're blocked on something in this React instance. We'll retry later.
        break;
      }
    }
    const formInst = getInstanceFromNode(form);
    if (formInst !== null) {
      // This is part of our instance.
      // We're ready to replay this. Let's delete it from the queue.
      formReplayingQueue.splice(i, 3);
      i -= 3;
      dispatchReplayedFormAction(formInst, form, submitterOrAction, formData);
      // Continue without incrementing the index.
      continue;
    }
    // This form must've been part of a different React instance.
    // If we want to preserve ordering between React instances on the same root
    // we'd need some way for the other instance to ping us when it's done.
    // We'll just skip this and let the other instance execute it.
  }
}

function scheduleReplayQueueIfNeeded(formReplayingQueue: FormReplayingQueue) {
  // Schedule a callback to execute any unblocked form actions in.
  // We only keep track of the last queue which means that if multiple React oscillate
  // commits, we could schedule more callbacks than necessary but it's not a big deal
  // and we only really except one instance.
  if (lastScheduledReplayQueue !== formReplayingQueue) {
    lastScheduledReplayQueue = formReplayingQueue;
    scheduleCallback(NormalPriority, () =>
      replayUnblockedFormActions(formReplayingQueue),
    );
  }
}

export function retryIfBlockedOn(
  unblocked: Container | SuspenseInstance | ActivityInstance,
): void {
  if (queuedFocus !== null) {
    scheduleCallbackIfUnblocked(queuedFocus, unblocked);
  }
  if (queuedDrag !== null) {
    scheduleCallbackIfUnblocked(queuedDrag, unblocked);
  }
  if (queuedMouse !== null) {
    scheduleCallbackIfUnblocked(queuedMouse, unblocked);
  }
  const unblock = (queuedEvent: QueuedReplayableEvent) =>
    scheduleCallbackIfUnblocked(queuedEvent, unblocked);
  queuedPointers.forEach(unblock);
  queuedPointerCaptures.forEach(unblock);

  for (let i = 0; i < queuedExplicitHydrationTargets.length; i++) {
    const queuedTarget = queuedExplicitHydrationTargets[i];
    if (queuedTarget.blockedOn === unblocked) {
      queuedTarget.blockedOn = null;
    }
  }

  while (queuedExplicitHydrationTargets.length > 0) {
    const nextExplicitTarget = queuedExplicitHydrationTargets[0];
    if (nextExplicitTarget.blockedOn !== null) {
      // We're still blocked.
      break;
    } else {
      attemptExplicitHydrationTarget(nextExplicitTarget);
      if (nextExplicitTarget.blockedOn === null) {
        // We're unblocked.
        queuedExplicitHydrationTargets.shift();
      }
    }
  }

  // Check the document if there are any queued form actions.
  // If there's no ownerDocument, then this is the document.
  const root = unblocked.ownerDocument || unblocked;
  const formReplayingQueue: void | FormReplayingQueue = (root as any)
    .$$reactFormReplay;
  if (formReplayingQueue != null) {
    for (let i = 0; i < formReplayingQueue.length; i += 3) {
      const form: HTMLFormElement = formReplayingQueue[i];
      const submitterOrAction:
        | null
        | HTMLInputElement
        | HTMLButtonElement
        | FormAction = formReplayingQueue[i + 1];
      const formProps = getFiberCurrentPropsFromNode(form);
      if (typeof submitterOrAction === 'function') {
        // This action has already resolved. We're just waiting to dispatch it.
        if (!formProps) {
          // This was not part of this React instance. It might have been recently
          // unblocking us from dispatching our events. So let's make sure we schedule
          // a retry.
          scheduleReplayQueueIfNeeded(formReplayingQueue);
        }
        continue;
      }
      let target: Node = form;
      if (formProps) {
        // This form belongs to this React instance but the submitter might
        // not be done yet.
        let action: null | FormAction = null;
        const submitter = submitterOrAction;
        if (submitter && submitter.hasAttribute('formAction')) {
          // The submitter is the one that is responsible for the action.
          target = submitter;
          const submitterProps = getFiberCurrentPropsFromNode(submitter);
          if (submitterProps) {
            // The submitter is part of this instance.
            action = (submitterProps as any).formAction;
          } else {
            const blockedOn = findInstanceBlockingTarget(target);
            if (blockedOn !== null) {
              // The submitter is not hydrated yet. We'll wait for it.
              continue;
            }
            // The submitter must have been a part of a different React instance.
            // Except the form isn't. We don't dispatch actions in this scenario.
          }
        } else {
          action = (formProps as any).action;
        }
        if (typeof action === 'function') {
          formReplayingQueue[i + 1] = action;
        } else {
          // Something went wrong so let's just delete this action.
          formReplayingQueue.splice(i, 3);
          i -= 3;
        }
        // Schedule a replay in case this unblocked something.
        scheduleReplayQueueIfNeeded(formReplayingQueue);
        continue;
      }
      // Something above this target is still blocked so we can't continue yet.
      // We're not sure if this target is actually part of this React instance
      // yet. It could be a different React as a child but at least some parent is.
      // We must continue for any further queued actions.
    }
  }
}
