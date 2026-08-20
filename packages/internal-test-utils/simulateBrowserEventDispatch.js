const DOMException = require('domexception/webidl2js-wrapper');
const {nodeRoot} = require('jsdom/lib/jsdom/living/helpers/node');
const reportException = require('jsdom/lib/jsdom/living/helpers/runtime-script-errors');
const {
  isNode,
  isShadowRoot,
  isSlotable,
  getEventTargetParent,
  isShadowInclusiveAncestor,
  retarget,
} = require('jsdom/lib/jsdom/living/helpers/shadow-dom');

const {waitForMicrotasks} = require('./ReactInternalTestUtils');

const EVENT_PHASE = {
  NONE: 0,
  CAPTURING_PHASE: 1,
  AT_TARGET: 2,
  BUBBLING_PHASE: 3,
};

// Hack to get Symbol(wrapper) for target nodes.
let wrapperSymbol;
function wrapperForImpl(impl) {
  if (impl == null) {
    return null;
  }

  return impl[wrapperSymbol];
}

// This is a forked implementation of the jsdom dispatchEvent. The goal of
// this fork is to match the actual browser behavior of user events more closely.
// Real browser events yield to microtasks in-between event handlers, which is
// different from programmatically calling dispatchEvent (which does not yield).
// JSDOM correctly implements programmatic dispatchEvent, but sometimes we need
// to test the behavior of real user interactions, so we simulate it.
//
// It's async because we need to wait for microtasks between event handlers.
//
// Taken from:
// https://github.com/jsdom/jsdom/blob/2f8a7302a43fff92f244d5f3426367a8eb2b8896/lib/jsdom/living/events/EventTarget-impl.js#L88
async function simulateEventDispatch(eventImpl) {
  if (eventImpl._dispatchFlag || !eventImpl._initializedFlag) {
    throw DOMException.create(this._globalObject, [
      'Tried to dispatch an uninitialized event',
      'InvalidStateError',
    ]);
  }
  if (eventImpl.eventPhase !== EVENT_PHASE.NONE) {
    throw DOMException.create(this._globalObject, [
      'Tried to dispatch a dispatching event',
      'InvalidStateError',
    ]);
  }

  eventImpl.isTrusted = false;

  await _dispatch.call(this, eventImpl);
}

async function _dispatch(eventImpl, legacyTargetOverrideFlag) {
  // Hack: save the wrapper Symbol.
  wrapperSymbol = Object.getOwnPropertySymbols(eventImpl)[0];

  let targetImpl = this;
  let clearTargets = false;
  let activationTarget = null;

  eventImpl._dispatchFlag = true;

  const targetOverride = legacyTargetOverrideFlag
    ? wrapperForImpl(targetImpl._globalObject._document)
    : targetImpl;
  let relatedTarget = retarget(eventImpl.relatedTarget, targetImpl);

  if (targetImpl !== relatedTarget || targetImpl === eventImpl.relatedTarget) {
    const touchTargets = [];

    appendToEventPath(
      eventImpl,
      targetImpl,
      targetOverride,
      relatedTarget,
      touchTargets,
      false,
    );

    const isActivationEvent = false; // TODO Not ported in fork.

    if (isActivationEvent && targetImpl._hasActivationBehavior) {
      activationTarget = targetImpl;
    }

    let slotInClosedTree = false;
    let slotable =
      isSlotable(targetImpl) && targetImpl._assignedSlot ? targetImpl : null;
    let parent = getEventTargetParent(targetImpl, eventImpl);

    // Populate event path
    // https://dom.spec.whatwg.org/#event-path
    while (parent !== null) {
      if (slotable !== null) {
        if (parent.localName !== 'slot') {
          throw new Error(`JSDOM Internal Error: Expected parent to be a Slot`);
        }

        slotable = null;

        const parentRoot = nodeRoot(parent);
        if (isShadowRoot(parentRoot) && parentRoot.mode === 'closed') {
          slotInClosedTree = true;
        }
      }

      if (isSlotable(parent) && parent._assignedSlot) {
        slotable = parent;
      }

      relatedTarget = retarget(eventImpl.relatedTarget, parent);

      if (
        (isNode(parent) &&
          isShadowInclusiveAncestor(nodeRoot(targetImpl), parent)) ||
        wrapperForImpl(parent).constructor.name === 'Window'
      ) {
        if (
          isActivationEvent &&
          eventImpl.bubbles &&
          activationTarget === null &&
          parent._hasActivationBehavior
        ) {
          activationTarget = parent;
        }

        appendToEventPath(
          eventImpl,
          parent,
          null,
          relatedTarget,
          touchTargets,
          slotInClosedTree,
        );
      } else if (parent === relatedTarget) {
        parent = null;
      } else {
        targetImpl = parent;

        if (
          isActivationEvent &&
          activationTarget === null &&
          targetImpl._hasActivationBehavior
        ) {
          activationTarget = targetImpl;
        }

        appendToEventPath(
          eventImpl,
          parent,
          targetImpl,
          relatedTarget,
          touchTargets,
          slotInClosedTree,
        );
      }

      if (parent !== null) {
        parent = getEventTargetParent(parent, eventImpl);
      }

      slotInClosedTree = false;
    }

    let clearTargetsStructIndex = -1;
    for (
      let i = eventImpl._path.length - 1;
      i >= 0 && clearTargetsStructIndex === -1;
      i--
    ) {
      if (eventImpl._path[i].target !== null) {
        clearTargetsStructIndex = i;
      }
    }
    const clearTargetsStruct = eventImpl._path[clearTargetsStructIndex];

    clearTargets =
      (isNode(clearTargetsStruct.target) &&
        isShadowRoot(nodeRoot(clearTargetsStruct.target))) ||
      (isNode(clearTargetsStruct.relatedTarget) &&
        isShadowRoot(nodeRoot(clearTargetsStruct.relatedTarget)));

    if (
      activationTarget !== null &&
      activationTarget._legacyPreActivationBehavior
    ) {
      activationTarget._legacyPreActivationBehavior();
    }

    for (let i = eventImpl._path.length - 1; i >= 0; --i) {
      const struct = eventImpl._path[i];

      if (struct.target !== null) {
        eventImpl.eventPhase = EVENT_PHASE.AT_TARGET;
      } else {
        eventImpl.eventPhase = EVENT_PHASE.CAPTURING_PHASE;
      }

      await invokeEventListeners(struct, eventImpl, 'capturing');
    }

    for (let i = 0; i < eventImpl._path.length; i++) {
      const struct = eventImpl._path[i];

      if (struct.target !== null) {
        eventImpl.eventPhase = EVENT_PHASE.AT_TARGET;
      } else {
        if (!eventImpl.bubbles) {
          continue;
        }

        eventImpl.eventPhase = EVENT_PHASE.BUBBLING_PHASE;
      }

      await invokeEventListeners(struct, eventImpl, 'bubbling');
    }
  }

  eventImpl.eventPhase = EVENT_PHASE.NONE;

  eventImpl.currentTarget = null;
  eventImpl._path = [];
  eventImpl._dispatchFlag = false;
  eventImpl._stopPropagationFlag = false;
  eventImpl._stopImmediatePropagationFlag = false;

  if (clearTargets) {
    eventImpl.target = null;
    eventImpl.relatedTarget = null;
  }

  if (activationTarget !== null) {
    if (!eventImpl._canceledFlag) {
      activationTarget._activationBehavior(eventImpl);
    } else if (activationTarget._legacyCanceledActivationBehavior) {
      activationTarget._legacyCanceledActivationBehavior();
    }
  }

  return !eventImpl._canceledFlag;
}

async function invokeEventListeners(struct, eventImpl, phase) {
  const structIndex = eventImpl._path.indexOf(struct);
  for (let i = structIndex; i >= 0; i--) {
    const t = eventImpl._path[i];
    if (t.target) {
      eventImpl.target = t.target;
      break;
    }
  }

  eventImpl.relatedTarget = wrapperForImpl(struct.relatedTarget);

  if (eventImpl._stopPropagationFlag) {
    return;
  }

  eventImpl.currentTarget = wrapperForImpl(struct.item);

  const listeners = struct.item._eventListeners;
  await innerInvokeEventListeners(
    eventImpl,
    listeners,
    phase,
    struct.itemInShadowTree,
  );
}

async function innerInvokeEventListeners(
  eventImpl,
  listeners,
  phase,
  itemInShadowTree,
) {
  let found = false;

  const {type, target} = eventImpl;
  const wrapper = wrapperForImpl(target);

  if (!listeners || !listeners[type]) {
    return found;
  }

  // Copy event listeners before iterating since the list can be modified during the iteration.
  const handlers = listeners[type].slice();

  for (let i = 0; i < handlers.length; i++) {
    const listener = handlers[i];
    const {capture, once, passive} = listener.options;

    // Check if the event listener has been removed since the listeners has been cloned.
    if (!listeners[type].includes(listener)) {
      continue;
    }

    found = true;

    if (
      (phase === 'capturing' && !capture) ||
      (phase === 'bubbling' && capture)
    ) {
      continue;
    }

    if (once) {
      listeners[type].splice(listeners[type].indexOf(listener), 1);
    }

    let window = null;
    if (wrapper && wrapper._document) {
      // Triggered by Window
      window = wrapper;
    } else if (target._ownerDocument) {
      // Triggered by most webidl2js'ed instances
      window = target._ownerDocument._defaultView;
    } else if (wrapper._ownerDocument) {
      // Currently triggered by some non-webidl2js things
      window = wrapper._ownerDocument._defaultView;
    }

    let currentEvent;
    if (window) {
      currentEvent = window._currentEvent;
      if (!itemInShadowTree) {
        window._currentEvent = eventImpl;
      }
    }

    if (passive) {
      eventImpl._inPassiveListenerFlag = true;
    }

    try {
      listener.callback.call(eventImpl.currentTarget, eventImpl);
    } catch (e) {
      if (window) {
        reportException(window, e);
      }
      // Errors in window-less documents just get swallowed... can you think of anything better?
    }

    eventImpl._inPassiveListenerFlag = false;

    if (window) {
      window._currentEvent = currentEvent;
    }

    if (eventImpl._stopImmediatePropagationFlag) {
      return found;
    }

    // IMPORTANT: Flush microtasks
    await waitForMicrotasks();
  }

  return found;
}

function appendToEventPath(
  eventImpl,
  target,
  targetOverride,
  relatedTarget,
  touchTargets,
  slotInClosedTree,
) {
  const itemInShadowTree = isNode(target) && isShadowRoot(nodeRoot(target));
  const rootOfClosedTree = isShadowRoot(target) && target.mode === 'closed';

  eventImpl._path.push({
    item: target,
    itemInShadowTree,
    target: targetOverride,
    relatedTarget,
    touchTargets,
    rootOfClosedTree,
    slotInClosedTree,
  });
}

export default simulateEventDispatch;
