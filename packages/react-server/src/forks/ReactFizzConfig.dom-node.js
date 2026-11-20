/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {AsyncLocalStorage} from 'async_hooks';

import type {Request, RequestContext} from 'react-server/src/ReactFizzServer';

export * from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

export * from 'react-client/src/ReactClientConsoleConfigServer';

export const isWorkLoopExternallyDriven = false;
export const supportsRequestStorage = true;
export const requestStorage: AsyncLocalStorage<Request | void> =
  new AsyncLocalStorage();

// Captures the caller's async context with the request's own store set, so
// work Fizz schedules later (such as a retry after a ping) runs there instead
// of in the context of whatever resolved the thenable.
export function captureRequestContext(request: Request): RequestContext {
  return requestStorage.run(request, () => AsyncLocalStorage.snapshot());
}
