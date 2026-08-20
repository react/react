/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Re-exported just because we always type check react-reconciler even in
// dimensions where it's not used.
export * from 'react-dom-bindings/src/client/ReactFiberConfigDOM';
export * from 'react-client/src/ReactClientConsoleConfigBrowser';

// eslint-disable-next-line react-internal/prod-error-codes
throw new Error('Fiber is not used in react-markup');
