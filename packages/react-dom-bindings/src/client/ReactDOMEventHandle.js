/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {DOMEventName} from '../events/DOMEventNames';
import type {ReactScopeInstance} from 'shared/ReactTypes';
import type {
  ReactDOMEventHandle,
  ReactDOMEventHandleListener,
} from './ReactDOMEventHandleTypes';

import {allNativeEvents} from '../events/EventRegistry';
import {
  getEventHandlerListeners,
  setEventHandlerListeners,
  doesTargetHaveEventHandle,
  addEventHandleToTarget,
} from './ReactDOMComponentTree';
import {ELEMENT_NODE} from './HTMLNodeType';
import {listenToNativeEventForNonManagedEventTarget} from '../events/DOMPluginEventSystem';

import {
  enableScopeAPI,
  enableCreateEventHandleAPI,
} from 'shared/ReactFeatureFlags';
import typeof {SyntheticEvent} from '../events/SyntheticEvent';

type EventHandleOptions = {
  capture?: boolean,
};

function isValidEventTarget(target: EventTarget | ReactScopeInstance): boolean {
  return typeof (target as Object).addEventListener === 'function';
}

function isReactScope(target: EventTarget | ReactScopeInstance): boolean {
  return typeof (target as Object).getChildContextValues === 'function';
}

function createEventHandleListener(
  type: DOMEventName,
  isCapturePhaseListener: boolean,
  callback: SyntheticEvent => void,
): ReactDOMEventHandleListener {
  return {
    callback,
    capture: isCapturePhaseListener,
    type,
  };
}

function registerReactDOMEvent(
  target: EventTarget | ReactScopeInstance,
  domEventName: DOMEventName,
  isCapturePhaseListener: boolean,
): void {
  if ((target as any).nodeType === ELEMENT_NODE) {
    // Do nothing. We already attached all root listeners.
  } else if (enableScopeAPI && isReactScope(target)) {
    // Do nothing. We already attached all root listeners.
  } else if (isValidEventTarget(target)) {
    const eventTarget = target as any as EventTarget;
    // These are valid event targets, but they are also
    // non-managed React nodes.
    listenToNativeEventForNonManagedEventTarget(
      domEventName,
      isCapturePhaseListener,
      eventTarget,
    );
  } else {
    throw new Error(
      'ReactDOM.createEventHandle: setter called on an invalid ' +
        'target. Provide a valid EventTarget or an element managed by React.',
    );
  }
}

export function createEventHandle(
  type: string,
  options?: EventHandleOptions,
): ReactDOMEventHandle {
  if (enableCreateEventHandleAPI) {
    const domEventName = type as any as DOMEventName;

    // We cannot support arbitrary native events with eager root listeners
    // because the eager strategy relies on knowing the whole list ahead of time.
    // If we wanted to support this, we'd have to add code to keep track
    // (or search) for all portal and root containers, and lazily add listeners
    // to them whenever we see a previously unknown event. This seems like a lot
    // of complexity for something we don't even have a particular use case for.
    // Unfortunately, the downside of this invariant is that *removing* a native
    // event from the list of known events has now become a breaking change for
    // any code relying on the createEventHandle API.
    if (!allNativeEvents.has(domEventName)) {
      throw new Error(
        `Cannot call unstable_createEventHandle with "${domEventName}", as it is not an event known to React.`,
      );
    }

    let isCapturePhaseListener = false;
    if (options != null) {
      const optionsCapture = options.capture;
      if (typeof optionsCapture === 'boolean') {
        isCapturePhaseListener = optionsCapture;
      }
    }

    const eventHandle: ReactDOMEventHandle = (
      target: EventTarget | ReactScopeInstance,
      callback: SyntheticEvent => void,
    ) => {
      if (typeof callback !== 'function') {
        throw new Error(
          'ReactDOM.createEventHandle: setter called with an invalid ' +
            'callback. The callback must be a function.',
        );
      }

      if (!doesTargetHaveEventHandle(target, eventHandle)) {
        addEventHandleToTarget(target, eventHandle);
        registerReactDOMEvent(target, domEventName, isCapturePhaseListener);
      }
      const listener = createEventHandleListener(
        domEventName,
        isCapturePhaseListener,
        callback,
      );
      let targetListeners = getEventHandlerListeners(target);
      if (targetListeners === null) {
        targetListeners = new Set();
        setEventHandlerListeners(target, targetListeners);
      }
      targetListeners.add(listener);
      return () => {
        (targetListeners as any as Set<ReactDOMEventHandleListener>).delete(
          listener,
        );
      };
    };

    return eventHandle;
  }
  return null as any;
}
