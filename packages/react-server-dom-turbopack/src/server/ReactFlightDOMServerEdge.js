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
import type {ClientManifest} from './ReactFlightServerConfigTurbopackBundler';
import type {ServerManifest} from 'react-client/src/ReactFlightClientConfig';

import {ASYNC_ITERATOR} from 'shared/ReactSymbols';

import type {
  RenderResult as FlightRenderResult,
  RenderConsumer,
} from 'react-server/src/ReactFlightServer';

import {
  claimByteStream,
  createRenderResult,
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
  reportGlobalError,
  resolveField,
  resolveFile,
} from 'react-server/src/ReactFlightReplyServer';

import {
  decodeAction,
  decodeFormState,
} from 'react-server/src/ReactFlightActionServer';

export {
  registerServerReference,
  registerClientReference,
  createClientModuleProxy,
} from '../ReactFlightTurbopackReferences';

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
  startTime?: number,
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
    const buffer: Uint8Array = value as any;
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

function renderToReadableStream(
  model: ReactClientValue,
  turbopackMap: ClientManifest,
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
    turbopackMap,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
    options ? options.temporaryReferences : undefined,
    options ? options.startTime : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    debugChannelReadable !== undefined,
  );
  if (options && options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      abort(request, (signal as any).reason);
    } else {
      const listener = () => {
        abort(request, (signal as any).reason);
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
      // $FlowFixMe[incompatible-type]
      {highWaterMark: 0},
    );
    debugStream.pipeTo(debugChannelWritable);
  }
  if (debugChannelReadable !== undefined) {
    startReadingFromDebugChannelReadableStream(request, debugChannelReadable);
  }
  startWork(request);
  return createByteStream(request);
}

// The stream construction is passive: work has already been started by the
// caller, and flowing begins on the first pull.
function createByteStream(request: Request): ReadableStream {
  return new ReadableStream(
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
    // $FlowFixMe[incompatible-type]
    {highWaterMark: 0},
  );
}

type StaticResult = {
  prelude: ReadableStream,
};

function prerender(
  model: ReactClientValue,
  turbopackMap: ClientManifest,
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
        // $FlowFixMe[incompatible-type]
        {highWaterMark: 0},
      );
      resolve({prelude: stream});
    }
    const request = createPrerenderRequest(
      model,
      turbopackMap,
      onAllReady,
      onFatalError,
      options ? options.onError : undefined,
      options ? options.identifierPrefix : undefined,
      options ? options.temporaryReferences : undefined,
      options ? options.startTime : undefined,
      __DEV__ && options ? options.environmentName : undefined,
      __DEV__ && options ? options.filterStackFrame : undefined,
      false,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        const reason = (signal as any).reason;
        abort(request, reason);
      } else {
        const listener = () => {
          const reason = (signal as any).reason;
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
  turbopackMap: ServerManifest,
  options?: {
    temporaryReferences?: TemporaryReferenceSet,
    arraySizeLimit?: number,
  },
): Thenable<T> {
  if (typeof body === 'string') {
    const form = new FormData();
    form.append('0', body);
    body = form;
  }
  const response = createResponse(
    turbopackMap,
    '',
    options ? options.temporaryReferences : undefined,
    body,
    options ? options.arraySizeLimit : undefined,
  );
  const root = getRoot<T>(response);
  close(response);
  return root;
}

function decodeReplyFromAsyncIterable<T>(
  iterable: AsyncIterable<[string, string | File]>,
  turbopackMap: ServerManifest,
  options?: {
    temporaryReferences?: TemporaryReferenceSet,
    arraySizeLimit?: number,
  },
): Thenable<T> {
  const iterator: AsyncIterator<[string, string | File]> =
    iterable[ASYNC_ITERATOR]();

  const response = createResponse(
    turbopackMap,
    '',
    options ? options.temporaryReferences : undefined,
    undefined,
    options ? options.arraySizeLimit : undefined,
  );

  function progress(
    entry:
      | {done: false, +value: [string, string | File], ...}
      | {done: true, +value: void, ...},
  ) {
    if (entry.done) {
      close(response);
    } else {
      const [name, value] = entry.value;
      if (typeof value === 'string') {
        resolveField(response, name, value);
      } else {
        resolveFile(response, name, value);
      }
      iterator.next().then(progress, error);
    }
  }
  function error(reason: Error) {
    reportGlobalError(response, reason);
    if (typeof (iterator as any).throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe[prop-missing] should be able to pass mixed
      iterator.throw(reason).then(error, error);
    }
  }

  iterator.next().then(progress, error);

  return getRoot(response);
}

export type RenderOptions = {
  identifierPrefix?: string,
  signal?: AbortSignal,
  onError?: (error: mixed) => void,
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  temporaryReferences?: TemporaryReferenceSet,
  startTime?: number,
  // DEV-only: debug rows leave on this channel instead of reaching either
  // the byte stream or the in-process consumer.
  debugChannel?: {readable?: ReadableStream, writable?: WritableStream, ...},
};

export type RenderResult = {
  _attach: (consumer: RenderConsumer) => void,
  stream: ReadableStream,
};

// Renders the model without deciding how it will be consumed: pass the
// result to a paired Flight Client's createFromRender to read the render
// back in the same process without going through the wire format, read its
// stream to get the bytes, or both from the same render. A consumer has to
// attach before the render starts emitting, so createFromRender must be
// called synchronously after render().
function render(
  model: ReactClientValue,
  turbopackMap: ClientManifest,
  options?: RenderOptions,
): RenderResult {
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
    turbopackMap,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
    options ? options.temporaryReferences : undefined,
    options ? options.startTime : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    debugChannelReadable !== undefined,
  );
  const result: FlightRenderResult = createRenderResult(request);
  if (options && options.signal) {
    const signal = options.signal;
    if (signal.aborted) {
      // Give the caller a chance to attach a consumer before the abort
      // emits its error rows.
      Promise.resolve().then(() => abort(request, (signal as any).reason));
    } else {
      const listener = () => {
        abort(request, (signal as any).reason);
        signal.removeEventListener('abort', listener);
      };
      signal.addEventListener('abort', listener);
    }
  }
  startWork(request);
  if (debugChannelWritable !== undefined) {
    const debugStream = new ReadableStream(
      {
        type: 'bytes',
        pull: (controller): ?Promise<void> => {
          startFlowingDebug(request, controller);
        },
      },
      // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
      // $FlowFixMe[incompatible-type]
      {highWaterMark: 0},
    );
    debugStream.pipeTo(debugChannelWritable);
  }
  if (debugChannelReadable !== undefined) {
    startReadingFromDebugChannelReadableStream(request, debugChannelReadable);
  }
  return {
    _attach: result._attach,
    // Accessing the stream claims it: an unclaimed byte stream is released
    // once an in-process consumer has received the full render.
    get stream(): ReadableStream {
      claimByteStream(request);
      return createByteStream(request);
    },
  };
}

export {
  render,
  renderToReadableStream,
  prerender,
  decodeReply,
  decodeReplyFromAsyncIterable,
  decodeAction,
  decodeFormState,
};
