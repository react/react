/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {AsyncLocalStorage, AsyncResource} from 'async_hooks';

import type {Request, RequestContext} from 'react-server/src/ReactFlightServer';
import type {ReactComponentInfo} from 'shared/ReactTypes';

export * from 'react-server-dom-parcel/src/server/ReactFlightServerConfigParcelBundler';
export * from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

export const supportsRequestStorage = true;
export const requestStorage: AsyncLocalStorage<Request | void> =
  new AsyncLocalStorage();

// Captures the caller's async context with the request's own store set, so
// work Flight schedules later (such as a retry after a ping) runs there instead
// of in the context of whatever resolved the thenable. Where snapshot() isn't
// available, a bound resource captures the same context.
export function captureRequestContext(request: Request): RequestContext {
  if (typeof AsyncLocalStorage.snapshot === 'function') {
    return requestStorage.run(request, () => AsyncLocalStorage.snapshot());
  }
  return requestStorage.run(request, () =>
    AsyncResource.bind(<R>(callback: (req: Request) => R, req: Request): R =>
      callback(req),
    ),
  );
}

export const supportsComponentStorage = __DEV__;
export const componentStorage: AsyncLocalStorage<ReactComponentInfo | void> =
  supportsComponentStorage ? new AsyncLocalStorage() : (null as any);

export * from '../ReactFlightServerConfigDebugNode';

export * from '../ReactFlightStackConfigV8';
export * from '../ReactServerConsoleConfigServer';
