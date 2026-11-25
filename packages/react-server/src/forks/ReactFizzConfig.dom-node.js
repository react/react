/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {AsyncLocalStorage, AsyncResource} from 'async_hooks';

import type {Request, RequestContext} from 'react-server/src/ReactFizzServer';

export * from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

export * from 'react-client/src/ReactClientConsoleConfigServer';

export const isWorkLoopExternallyDriven = false;
export const supportsRequestStorage = true;
export const requestStorage: AsyncLocalStorage<Request | void> =
  new AsyncLocalStorage();

// Captures the caller's async context with the request's own store set, so
// work Fizz schedules later (such as a retry after a ping) runs there instead
// of in the context of whatever resolved the thenable. Where snapshot() isn't
// available, a bound resource captures the same context.
export function captureRequestContext(request: Request): RequestContext {
  if (typeof AsyncLocalStorage.snapshot === 'function') {
    return requestStorage.run(request, () => AsyncLocalStorage.snapshot());
  }
  return requestStorage.run(request, () =>
    AsyncResource.bind(
      <A, R>(callback: (req: Request, arg: A) => R, req: Request, arg: A): R =>
        callback(req, arg),
    ),
  );
}
