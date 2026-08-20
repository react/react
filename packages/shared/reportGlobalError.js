/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const reportGlobalError: (error: mixed) => void =
  typeof reportError === 'function'
    ? // In modern browsers, reportError will dispatch an error event,
      // emulating an uncaught JavaScript error.
      reportError
    : error => {
        if (
          typeof window === 'object' &&
          typeof window.ErrorEvent === 'function'
        ) {
          // Browser Polyfill
          const message =
            typeof error === 'object' &&
            error !== null &&
            typeof error.message === 'string'
              ? // eslint-disable-next-line react-internal/safe-string-coercion
                String(error.message)
              : // eslint-disable-next-line react-internal/safe-string-coercion
                String(error);
          const event = new window.ErrorEvent('error', {
            bubbles: true,
            cancelable: true,
            message: message,
            error: error,
          });
          const shouldLog = window.dispatchEvent(event);
          if (!shouldLog) {
            return;
          }
        } else if (
          typeof process === 'object' &&
          // $FlowFixMe[method-unbinding]
          typeof process.emit === 'function'
        ) {
          // Node Polyfill
          process.emit('uncaughtException', error);
          return;
        }
        console['error'](error);
      };

export default reportGlobalError;
