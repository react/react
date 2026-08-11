/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactCustomFormAction} from 'shared/ReactTypes.js';
import type {DebugChannel, Response} from 'react-client/src/ReactFlightClient';
import type {Readable} from 'stream';

import {
  createResponse,
  createStreamState,
  getRoot,
  reportGlobalError,
  processStringChunk,
  processBinaryChunk,
  close,
} from 'react-client/src/ReactFlightClient';

export * from './ReactFlightDOMClientEdge';

function findSourceMapURL(filename: string, environmentName: string) {
  const devServer = parcelRequire.meta.devServer;
  if (devServer != null) {
    const qs = new URLSearchParams();
    qs.set('filename', filename);
    qs.set('env', environmentName);
    return devServer + '/__parcel_source_map?' + qs.toString();
  }
  return null;
}

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

type EncodeFormActionCallback = <A>(
  id: any,
  args: Promise<A>,
) => ReactCustomFormAction;

export type Options = {
  nonce?: string,
  encodeFormAction?: EncodeFormActionCallback,
  unstable_allowPartialStream?: boolean,
  replayConsoleLogs?: boolean,
  environmentName?: string,
  startTime?: number,
  endTime?: number,
  // For the Node.js client we only support a single-direction debug channel.
  debugChannel?: Readable,
};

function startReadingFromStream(
  response: Response,
  stream: Readable,
  onEnd: () => void,
): void {
  const streamState = createStreamState(response, stream);

  stream.on('data', chunk => {
    if (typeof chunk === 'string') {
      processStringChunk(response, streamState, chunk);
    } else {
      processBinaryChunk(response, streamState, chunk);
    }
  });

  stream.on('error', error => {
    reportGlobalError(response, error);
  });

  stream.on('end', onEnd);
}

export function createFromNodeStream<T>(
  stream: Readable,
  options?: Options,
): Thenable<T> {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {hasReadable: true, callback: null}
      : undefined;

  const response: Response = createResponse(
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    undefined, // TODO: If encodeReply is supported, this should support temporaryReferences
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ ? findSourceMapURL : undefined,
    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
    __DEV__ && options && options.startTime != null
      ? options.startTime
      : undefined,
    __DEV__ && options && options.endTime != null ? options.endTime : undefined,
    debugChannel,
  );

  if (__DEV__ && options && options.debugChannel) {
    let streamEndedCount = 0;
    const handleEnd = () => {
      if (++streamEndedCount === 2) {
        close(response);
      }
    };
    startReadingFromStream(response, options.debugChannel, handleEnd);
    startReadingFromStream(response, stream, handleEnd);
  } else {
    startReadingFromStream(response, stream, close.bind(null, response));
  }

  return getRoot(response);
}
