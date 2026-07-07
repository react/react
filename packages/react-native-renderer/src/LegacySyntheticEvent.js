/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* globals Event$Init */

/**
 * A bridge event class that extends the W3C Event interface and carries
 * the native event payload. This is used as a compatibility layer during
 * the migration from the legacy SyntheticEvent system to EventTarget-based
 * dispatching.
 */
export default class LegacySyntheticEvent extends Event {
  _nativeEvent: {[string]: mixed};
  _propagationStopped: boolean;

  constructor(
    type: string,
    options: Event$Init,
    nativeEvent: {[string]: mixed},
  ) {
    super(type, options);
    this._nativeEvent = nativeEvent;
    this._propagationStopped = false;
  }

  get nativeEvent(): {[string]: mixed} {
    return this._nativeEvent;
  }

  stopPropagation(): void {
    super.stopPropagation();
    this._propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    super.stopImmediatePropagation();
    this._propagationStopped = true;
  }

  /**
   * No-op for backward compatibility. The legacy SyntheticEvent system
   * used pooling which required calling persist() to keep the event.
   * With EventTarget-based dispatching, events are never pooled.
   */
  persist(): void {
    // No-op
  }

  /**
   * Backward-compatible wrapper for `defaultPrevented`.
   */
  isDefaultPrevented(): boolean {
    return this.defaultPrevented;
  }

  /**
   * Backward-compatible wrapper. Returns true if stopPropagation()
   * has been called.
   */
  isPropagationStopped(): boolean {
    return this._propagationStopped;
  }
}
