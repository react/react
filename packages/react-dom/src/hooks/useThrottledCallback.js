/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useCallback, useEffect, useRef} from 'react';

/**
 * @typedef {Object} ThrottleOptions
 * @property {boolean} [leading=true] - Invoke on the leading edge of the timeout
 * @property {boolean} [trailing=true] - Invoke on the trailing edge of the timeout
 */

/**
 * @typedef {Object} ThrottledCallbackResult
 * @property {Function} callback - The throttled callback function
 * @property {Function} cancel - Cancel any pending trailing invocation
 * @property {Function} flush - Immediately invoke any pending trailing invocation
 * @property {boolean} isPending - Whether a trailing invocation is scheduled
 */

/**
 * useThrottledCallback - A hook that returns a throttled version of a callback.
 *
 * The throttled callback will only be invoked at most once per `delay`
 * milliseconds. Supports leading and trailing edge invocation, cancel/flush
 * API, and tracks pending state.
 *
 * @param {Function} callback - The function to throttle
 * @param {number} delay - Throttle delay in milliseconds
 * @param {ThrottleOptions} [options] - Configuration options
 * @returns {ThrottledCallbackResult} Throttled callback with control methods
 */
export default function useThrottledCallback(
  callback,
  delay,
  options = {},
) {
  const {leading = true, trailing = true} = options;

  // Use refs to always have the latest values without re-creating the throttled fn
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);
  const leadingRef = useRef(leading);
  const trailingRef = useRef(trailing);

  // Mutable state for the throttle mechanism
  const timerIdRef = useRef(null);
  const lastInvokeTimeRef = useRef(0);
  const lastCallArgsRef = useRef(null);
  const lastCallContextRef = useRef(null);
  const isPendingRef = useRef(false);
  const mountedRef = useRef(true);

  // Keep refs in sync with latest values
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  useEffect(() => {
    leadingRef.current = leading;
  }, [leading]);

  useEffect(() => {
    trailingRef.current = trailing;
  }, [trailing]);

  // Track mounted state for cleanup safety
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Invoke the original callback with the most recent arguments.
   * Updates last invoke time and clears pending args.
   */
  const invokeCallback = useCallback(() => {
    const args = lastCallArgsRef.current;
    const context = lastCallContextRef.current;
    lastCallArgsRef.current = null;
    lastCallContextRef.current = null;
    lastInvokeTimeRef.current = Date.now();
    isPendingRef.current = false;
    if (args !== null) {
      callbackRef.current.apply(context, args);
    }
  }, []);

  /**
   * Schedule the trailing edge invocation.
   * Only fires if trailing is enabled and there are pending args.
   */
  const scheduleTrailing = useCallback(() => {
    timerIdRef.current = setTimeout(() => {
      timerIdRef.current = null;
      if (
        trailingRef.current &&
        lastCallArgsRef.current !== null &&
        mountedRef.current
      ) {
        invokeCallback();
        // After trailing invocation, if more calls came in during
        // the trailing wait, we need another cycle
      } else {
        isPendingRef.current = false;
      }
    }, delayRef.current);
  }, [invokeCallback]);

  /**
   * The throttled function. Handles leading/trailing edge logic.
   *
   * Leading edge: invoke immediately if enough time has passed since
   * the last invocation.
   *
   * Trailing edge: schedule a deferred invocation that fires after
   * `delay` ms if no subsequent call occurs.
   */
  const throttledCallback = useCallback(
    function throttled(...args) {
      const now = Date.now();
      const timeSinceLastInvoke = now - lastInvokeTimeRef.current;
      const currentDelay = delayRef.current;

      // Store latest call arguments
      lastCallArgsRef.current = args;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      lastCallContextRef.current = this;

      const isFirstCall = lastInvokeTimeRef.current === 0;
      const enoughTimePassed = timeSinceLastInvoke >= currentDelay;

      if ((isFirstCall || enoughTimePassed) && leadingRef.current) {
        // Leading edge invocation
        // Clear any pending trailing timer since we're invoking now
        if (timerIdRef.current !== null) {
          clearTimeout(timerIdRef.current);
          timerIdRef.current = null;
        }
        invokeCallback();

        // If trailing is also enabled, schedule a trailing check
        // to handle calls that come in during the delay window
        if (trailingRef.current) {
          isPendingRef.current = true;
          scheduleTrailing();
        }
      } else if (timerIdRef.current === null) {
        // No timer running - schedule trailing invocation
        isPendingRef.current = true;
        scheduleTrailing();
      } else {
        // Timer already running - just update pending args (done above)
        isPendingRef.current = true;
      }
    },
    [invokeCallback, scheduleTrailing],
  );

  /**
   * Cancel any pending trailing invocation. Resets all internal state.
   */
  const cancel = useCallback(() => {
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    lastCallArgsRef.current = null;
    lastCallContextRef.current = null;
    isPendingRef.current = false;
  }, []);

  /**
   * Immediately invoke any pending trailing invocation.
   * If there is no pending invocation, this is a no-op.
   */
  const flush = useCallback(() => {
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    if (lastCallArgsRef.current !== null && mountedRef.current) {
      invokeCallback();
    }
  }, [invokeCallback]);

  /**
   * Get whether a trailing invocation is currently pending.
   *
   * @returns {boolean}
   */
  const getIsPending = useCallback(() => {
    return isPendingRef.current;
  }, []);

  // Cleanup on unmount: cancel any pending timers
  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      lastCallArgsRef.current = null;
      lastCallContextRef.current = null;
      isPendingRef.current = false;
    };
  }, []);

  return {
    callback: throttledCallback,
    cancel,
    flush,
    get isPending() {
      return getIsPending();
    },
  };
}
