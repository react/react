/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import reportGlobalError from 'shared/reportGlobalError';

export default class EventEmitter<Events: Object> {
  listenersMap: Map<string, Array<Function>> = new Map();

  addListener<Event: $Keys<Events>>(
    event: Event,
    listener: (...Events[Event]) => mixed,
  ): void {
    const listeners = this.listenersMap.get(event);
    if (listeners === undefined) {
      this.listenersMap.set(event, [listener]);
    } else {
      const index = listeners.indexOf(listener);
      if (index < 0) {
        listeners.push(listener);
      }
    }
  }

  emit<Event: $Keys<Events>>(event: Event, ...args: Events[Event]): void {
    const listeners = this.listenersMap.get(event);
    if (listeners !== undefined) {
      if (listeners.length === 1) {
        // No need to clone or try/catch
        const listener = listeners[0];
        listener.apply(null, args);
      } else {
        let didThrow = false;
        let caughtError = null;

        const clonedListeners = Array.from(listeners);
        for (let i = 0; i < clonedListeners.length; i++) {
          const listener = clonedListeners[i];
          try {
            listener.apply(null, args);
          } catch (error) {
            if (!didThrow) {
              didThrow = true;
              caughtError = error;
            } else {
              // Continue notifying the remaining listeners, but do not hide
              // additional failures behind the first one.
              reportGlobalError(error);
            }
          }
        }

        if (didThrow) {
          throw caughtError;
        }
      }
    }
  }

  removeAllListeners(): void {
    this.listenersMap.clear();
  }

  removeListener<Event: $Keys<Events>>(
    event: Event,
    listener: (...Events[Event]) => mixed,
  ): void {
    const listeners = this.listenersMap.get(event);
    if (listeners !== undefined) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }
}
