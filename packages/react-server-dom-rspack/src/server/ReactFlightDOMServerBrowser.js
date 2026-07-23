/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Request,
  ReactClientValue,
} from 'react-server/src/ReactFlightServer';
import type {Thenable} from 'shared/ReactTypes';
import {
  type ClientManifest,
  setServerActionBoundArgsEncryption,
  encryptServerActionBoundArgs,
  decryptServerActionBoundArgs,
  loadServerAction,
  createServerEntry,
  ensureServerActions,
} from './ReactFlightServerConfigRspackBundler';
import type {ServerManifest} from 'react-client/src/ReactFlightClientConfig';

import {
  createRequest,
  createPrerenderRequest,
  startWork,
  startFlowing,
  startFlowingDebug,
  stopFlowing,
  abort,
  resolveDebugMessage,
  closeDebugChannel,
} from 'react-server/src/ReactFlightServer';

import {
  createResponse,
  close,
  getRoot,
} from 'react-server/src/ReactFlightReplyServer';

import {
  decodeAction,
  decodeFormState,
} from 'react-server/src/ReactFlightActionServer';

export {
  registerServerReference,
  registerClientReference,
} from '../ReactFlightRspackReferences';

import {
  createStringDecoder,
  readPartialStringChunk,
  readFinalStringChunk,
} from 'react-client/src/ReactFlightClientStreamConfigWeb';

import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';

export {createTemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';

export type {TemporaryReferenceSet};

type Options = {
  debugChannel?: {readable?: ReadableStream, writable?: WritableStream, ...},
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  identifierPrefix?: string,
  signal?: AbortSignal,
  temporaryReferences?: TemporaryReferenceSet,
  onError?: (error: mixed) => void,
};

function startReadingFromDebugChannelReadableStream(
  request: Request,
  stream: ReadableStream,
): void {
  const reader = stream.getReader();
  const stringDecoder = createStringDecoder();
  let stringBuffer = '';
  function progress({
    done,
    value,
  }: {
    done: boolean,
    value: ?any,
    ...
  }): void | Promise<void> {
    const buffer: Uint8Array = (value: any);
    stringBuffer += done
      ? readFinalStringChunk(stringDecoder, new Uint8Array(0))
      : readPartialStringChunk(stringDecoder, buffer);
    const messages = stringBuffer.split('\n');
    for (let i = 0; i < messages.length - 1; i++) {
      resolveDebugMessage(request, messages[i]);
    }
    stringBuffer = messages[messages.length - 1];
    if (done) {
      closeDebugChannel(request);
      return;
    }
    return reader.read().then(progress).catch(error);
  }
  function error(e: any) {
    abort(
      request,
      new Error('Lost connection to the Debug Channel.', {
        cause: e,
      }),
    );
  }
  reader.read().then(progress).catch(error);
}

declare const __rspack_rsc_manifest__: {
  clientManifest: ClientManifest,
  serverManifest: ServerManifest,
};

function renderToReadableStream(
  model: ReactClientValue,
  options?: Options,
): ReadableStream {
  const debugChannelReadable =
    __DEV__ && options && options.debugChannel
      ? options.debugChannel.readable
      : undefined;
  const debugChannelWritable =
    __DEV__ && options && options.debugChannel
      ? options.debugChannel.writable
      : undefined;
  const request = createRequest(
    model,
    __rspack_rsc_manifest__.clientManifest,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
    options ? options.temporaryReferences : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    debugChannelReadable !== undefined,
  );
  if (options && options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      abort(request, (signal: any).reason);
    } else {
      const listener = () => {
        abort(request, (signal: any).reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  if (debugChannelWritable !== undefined) {
    const debugStream = new ReadableStream(
      {
        type: 'bytes',
        pull: (controller): ?Promise<void> => {
          startFlowingDebug(request, controller);
        },
      },
      // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
      {highWaterMark: 0},
    );
    debugStream.pipeTo(debugChannelWritable);
  }
  if (debugChannelReadable !== undefined) {
    startReadingFromDebugChannelReadableStream(request, debugChannelReadable);
  }
  const stream = new ReadableStream(
    {
      type: 'bytes',
      start: (controller): ?Promise<void> => {
        startWork(request);
      },
      pull: (controller): ?Promise<void> => {
        startFlowing(request, controller);
      },
      cancel: (reason): ?Promise<void> => {
        stopFlowing(request);
        abort(request, reason);
      },
    },
    // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
    {highWaterMark: 0},
  );
  return stream;
}

type StaticResult = {
  prelude: ReadableStream,
};

function prerender(
  model: ReactClientValue,
  options?: Options,
): Promise<StaticResult> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;
    function onAllReady() {
      const stream = new ReadableStream(
        {
          type: 'bytes',
          pull: (controller): ?Promise<void> => {
            startFlowing(request, controller);
          },
          cancel: (reason): ?Promise<void> => {
            stopFlowing(request);
            abort(request, reason);
          },
        },
        // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
        {highWaterMark: 0},
      );
      resolve({prelude: stream});
    }
    const request = createPrerenderRequest(
      model,
      __rspack_rsc_manifest__.clientManifest,
      onAllReady,
      onFatalError,
      options ? options.onError : undefined,
      options ? options.identifierPrefix : undefined,
      options ? options.temporaryReferences : undefined,
      __DEV__ && options ? options.environmentName : undefined,
      __DEV__ && options ? options.filterStackFrame : undefined,
      false,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        const reason = (signal: any).reason;
        abort(request, reason);
      } else {
        const listener = () => {
          const reason = (signal: any).reason;
          abort(request, reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
    startWork(request);
  });
}

function decodeReply<T>(
  body: string | FormData,
  options?: {temporaryReferences?: TemporaryReferenceSet},
): Thenable<T> {
  if (typeof body === 'string') {
    const form = new FormData();
    form.append('0', body);
    body = form;
  }
  const response = createResponse(
    __rspack_rsc_manifest__.serverManifest,
    '',
    options ? options.temporaryReferences : undefined,
    body,
  );
  const root = getRoot<T>(response);
  close(response);
  return root;
}

export {
  renderToReadableStream,
  prerender,
  decodeReply,
  decodeAction,
  decodeFormState,

  // server action bound args encryption
  setServerActionBoundArgsEncryption,
  encryptServerActionBoundArgs,
  decryptServerActionBoundArgs,

  // Rspack specific
  loadServerAction,
  createServerEntry,
  ensureServerActions,
};
