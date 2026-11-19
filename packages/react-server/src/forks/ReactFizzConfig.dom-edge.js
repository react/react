/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type {Request, RequestContext} from 'react-server/src/ReactFizzServer';

export * from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

export * from 'react-client/src/ReactClientConsoleConfigServer';

export const isWorkLoopExternallyDriven = false;

// For now, we get this from the global scope, but this will likely move to a module.
export const supportsRequestStorage = typeof AsyncLocalStorage === 'function';
export const requestStorage: AsyncLocalStorage<Request | void> =
  supportsRequestStorage ? new AsyncLocalStorage() : (null as any);

// Captures the caller's async context with the request's own store set, so
// work Fizz schedules later (such as a retry after a ping) runs there instead
// of in the context of whatever resolved the thenable. Where snapshot() isn't
// available, only the request's own store is restored.
export function captureRequestContext(request: Request): RequestContext {
  if (typeof AsyncLocalStorage.snapshot === 'function') {
    return requestStorage.run(request, () => AsyncLocalStorage.snapshot());
  }
  return (callback, req, arg) =>
    requestStorage.run(request, callback, req, arg);
}
