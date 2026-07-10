/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import type {Request} from 'react-server/src/ReactFizzServer';

import type {Destination} from 'react-server/src/ReactServerStreamConfig';
import type {BootstrapScriptDescriptor} from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

import {
  createRequest,
  startWork,
  performWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResumableState,
  createRenderState,
  createRootFormatContext,
} from 'react-server/src/ReactFizzConfig';

type Options = {
  identifierPrefix?: string,
  bootstrapScriptContent?: string,
  bootstrapScripts: Array<string>,
  bootstrapModules: Array<string>,
  progressiveChunkSize?: number,
  onError: (error: mixed) => void,
  unstable_externalRuntimeSrc?: string | BootstrapScriptDescriptor,
};

opaque type Stream = {
  destination: Destination,
  request: Request,
};

function renderToStream(children: ReactNodeList, options: Options): Stream {
  const destination: Destination = {
    buffer: '',
    done: false,
    fatal: false,
    error: null,
  };
  const resumableState = createResumableState(
    options ? options.identifierPrefix : undefined,
    options ? options.unstable_externalRuntimeSrc : undefined,
    options ? options.bootstrapScriptContent : undefined,
    options ? options.bootstrapScripts : undefined,
    options ? options.bootstrapModules : undefined,
  );
  const request = createRequest(
    children,
    resumableState,
    createRenderState(
      resumableState,
      undefined,
      options ? options.unstable_externalRuntimeSrc : undefined,
    ),
    createRootFormatContext(undefined),
    options ? options.progressiveChunkSize : undefined,
    options.onError,
    undefined,
    undefined,
  );
  startWork(request);
  if (destination.fatal) {
    throw destination.error;
  }
  return {
    destination,
    request,
  };
}

function abortStream(stream: Stream, reason: mixed): void {
  abort(stream.request, reason);
}

function renderNextChunk(stream: Stream): string {
  const {request, destination} = stream;
  performWork(request);
  startFlowing(request, destination);
  if (destination.fatal) {
    throw destination.error;
  }
  const chunk = destination.buffer;
  destination.buffer = '';
  return chunk;
}

function hasFinished(stream: Stream): boolean {
  return stream.destination.done;
}

function debug(stream: Stream): any {
  // convert to any to silence flow errors from opaque type
  const request = stream.request as any;
  return {
    pendingRootTasks: request.pendingRootTasks,
    clientRenderedBoundaries: request.clientRenderedBoundaries.length,
    completedBoundaries: request.completedBoundaries.length,
    partialBoundaries: request.partialBoundaries.length,
    allPendingTasks: request.allPendingTasks,
    pingedTasks: request.pingedTasks.length,
  };
}

export {renderToStream, renderNextChunk, hasFinished, abortStream, debug};
