/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {batchedUpdates} from './ReactGenericBatching';

import {
  RawEventEmitter,
  dispatchNativeEvent,
} from 'react-native/react-private-interface';
import {getPublicInstance} from './ReactFiberConfigFabric';

export function dispatchEvent(
  target: null | Object,
  topLevelType: string,
  nativeEventParam: unknown,
) {
  const nativeEvent =
    nativeEventParam != null && typeof nativeEventParam === 'object'
      ? (nativeEventParam as any)
      : {};

  let eventTarget = null;
  if (target != null) {
    const stateNode = target.stateNode;
    // Guard against Fiber being unmounted
    if (stateNode != null) {
      // $FlowExpectedError[incompatible-type] public instances in Fabric do not implement `EventTarget` yet.
      eventTarget = getPublicInstance(stateNode) as EventTarget;
    }
  }

  batchedUpdates(function () {
    // Emit event to the RawEventEmitter. This is an unused-by-default EventEmitter
    // that can be used to instrument event performance monitoring (primarily - could be useful
    // for other things too).
    //
    // NOTE: this merely emits events into the EventEmitter below.
    // If *you* do not add listeners to the `RawEventEmitter`,
    // then all of these emitted events will just blackhole and are no-ops.
    // It is available (although not officially supported... yet) if you want to collect
    // perf data on event latency in your application, and could also be useful for debugging
    // low-level events issues.
    //
    // If you do not have any event perf monitoring and are extremely concerned about event perf,
    // it is safe to disable these "emit" statements; it will prevent checking the size of
    // an empty array twice and prevent two no-ops. Practically the overhead is so low that
    // we don't think it's worth thinking about in prod; your perf issues probably lie elsewhere.
    //
    // We emit two events here: one for listeners to this specific event,
    // and one for the catchall listener '*', for any listeners that want
    // to be notified for all events.
    // Note that extracted events are *not* emitted,
    // only events that have a 1:1 mapping with a native event, at least for now.
    const event = {eventName: topLevelType, nativeEvent};
    RawEventEmitter.emit(topLevelType, event);
    RawEventEmitter.emit('*', event);

    dispatchNativeEvent(eventTarget, topLevelType, nativeEvent);
  });
  // React Native doesn't use ReactControlledComponent but if it did, here's
  // where it would do it.
}
