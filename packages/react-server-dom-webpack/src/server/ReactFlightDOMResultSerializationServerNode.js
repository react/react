/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Writable, Duplex} from 'stream';
import {Readable} from 'stream';
import {textEncoder} from 'react-server/src/ReactServerStreamConfigNode';
import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import type {ClientManifest} from './ReactFlightServerConfigWebpackBundler';
import type {
  Input,
  Request,
} from 'react-server/src/ReactFlightResultSerializationServer';
import {
  createRequest,
  startWork,
  startFlowing,
  startFlowingDebug,
  stopFlowing,
  abort,
  attachAbortSignal,
  resolveDebugMessage,
  closeDebugChannel,
} from 'react-server/src/ReactFlightResultSerializationServer';

import {
  createStringDecoder,
  readPartialStringChunk,
  readFinalStringChunk,
} from 'react-client/src/ReactFlightClientStreamConfigNode';

export type Options = {
  onError?: mixed => ?string,
  debugChannel?: Readable | Writable | Duplex | WebSocket,
  temporaryReferences?: TemporaryReferenceSet,
  startTime?: number,
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
};

export type PipeableStream = {
  pipe<T: Writable>(destination: T): T,
  abort(reason: mixed): void,
};

function createDrainHandler(destination: Writable, request: Request) {
  return () => startFlowing(request, destination);
}

function createCancelHandler(request: Request, reason: string) {
  return () => {
    stopFlowing(request);
    abort(request, new Error(reason));
  };
}

export function renderToPipeableStream(
  input: Input,
  webpackMap: ClientManifest,
  options?: Options,
): PipeableStream {
  const debugChannel = __DEV__ && options ? options.debugChannel : undefined;
  const debugChannelReadable: void | Readable | WebSocket =
    __DEV__ &&
    debugChannel !== undefined &&
    // $FlowFixMe[method-unbinding]
    (typeof debugChannel.read === 'function' ||
      typeof debugChannel.readyState === 'number')
      ? (debugChannel as any)
      : undefined;
  const debugChannelWritable: void | Writable =
    __DEV__ && debugChannel !== undefined
      ? // $FlowFixMe[method-unbinding]
        typeof debugChannel.write === 'function'
        ? (debugChannel as any)
        : // $FlowFixMe[method-unbinding]
          typeof debugChannel.send === 'function'
          ? createFakeWritableFromWebSocket(debugChannel as any)
          : undefined
      : undefined;
  const request = createRequest(
    input,
    webpackMap,
    options ? options.onError : undefined,
    options ? options.temporaryReferences : undefined,
    options ? options.startTime : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    debugChannelReadable !== undefined,
  );
  let hasStartedFlowing = false;
  startWork(request);
  if (debugChannelWritable !== undefined) {
    startFlowingDebug(request, debugChannelWritable);
  }
  if (debugChannelReadable !== undefined) {
    startReadingFromDebugChannelReadable(request, debugChannelReadable);
  }
  return {
    pipe<T: Writable>(destination: T): T {
      if (hasStartedFlowing) {
        throw new Error(
          'React currently only supports piping to one writable stream.',
        );
      }
      hasStartedFlowing = true;
      startFlowing(request, destination);
      destination.on('drain', createDrainHandler(destination, request));
      destination.on(
        'error',
        createCancelHandler(
          request,
          'The destination stream errored while writing data.',
        ),
      );
      // We don't close until the debug channel closes.
      if (!__DEV__ || debugChannelReadable === undefined) {
        destination.on(
          'close',
          createCancelHandler(request, 'The destination stream closed early.'),
        );
      }
      return destination;
    },
    abort(reason: mixed) {
      abort(request, reason);
    },
  };
}

function startReadingFromDebugChannelReadable(
  request: Request,
  stream: Readable | WebSocket,
): void {
  const stringDecoder = createStringDecoder();
  let lastWasPartial = false;
  let stringBuffer = '';
  function onData(chunk: string | Uint8Array) {
    if (typeof chunk === 'string') {
      if (lastWasPartial) {
        stringBuffer += readFinalStringChunk(stringDecoder, new Uint8Array(0));
        lastWasPartial = false;
      }
      stringBuffer += chunk;
    } else {
      const buffer: Uint8Array = chunk as any;
      stringBuffer += readPartialStringChunk(stringDecoder, buffer);
      lastWasPartial = true;
    }
    const messages = stringBuffer.split('\n');
    for (let i = 0; i < messages.length - 1; i++) {
      resolveDebugMessage(request, messages[i]);
    }
    stringBuffer = messages[messages.length - 1];
  }
  function onError(error: mixed) {
    abort(
      request,
      new Error('Lost connection to the Debug Channel.', {
        cause: error,
      }),
    );
  }
  function onClose() {
    closeDebugChannel(request);
  }
  if (
    // $FlowFixMe[method-unbinding]
    typeof stream.addEventListener === 'function' &&
    // $FlowFixMe[method-unbinding]
    typeof stream.binaryType === 'string'
  ) {
    const ws: WebSocket = stream as any;
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('message', event => {
      // $FlowFixMe[incompatible-type]
      onData(event.data);
    });
    ws.addEventListener('error', event => {
      // $FlowFixMe[prop-missing]
      onError(event.error);
    });
    ws.addEventListener('close', onClose);
  } else {
    const readable: Readable = stream as any;
    readable.on('data', onData);
    readable.on('error', onError);
    readable.on('end', onClose);
  }
}

function createFakeWritableFromWebSocket(webSocket: WebSocket): Writable {
  return {
    write(chunk: string | Uint8Array) {
      webSocket.send(chunk as any);
      return true;
    },
    end() {
      webSocket.close();
    },
    destroy(reason) {
      if (typeof reason === 'object' && reason !== null) {
        reason = reason.message;
      }
      if (typeof reason === 'string') {
        webSocket.close(1011, reason);
      } else {
        webSocket.close(1011);
      }
    },
  } as any;
}

export type ReadableStreamOptions = Omit<Options, 'debugChannel'> & {
  debugChannel?: {readable?: ReadableStream, writable?: WritableStream, ...},
  signal?: AbortSignal,
};

function createFakeWritableFromReadableStreamController(
  controller: ReadableStreamController,
): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return {
    write(chunk: string | Uint8Array) {
      if (typeof chunk === 'string') {
        chunk = textEncoder.encode(chunk);
      }
      controller.enqueue(chunk);
      // in web streams there is no backpressure so we can always write more
      return true;
    },
    end() {
      controller.close();
    },
    destroy(error) {
      // $FlowFixMe[method-unbinding]
      if (typeof controller.error === 'function') {
        // $FlowFixMe[incompatible-call]: This is an Error object or the destination accepts other types.
        controller.error(error);
      } else {
        controller.close();
      }
    },
  } as any;
}

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

export function renderToReadableStream(
  input: Input,
  webpackMap: ClientManifest,
  options?: ReadableStreamOptions,
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
    input,
    webpackMap,
    options ? options.onError : undefined,
    options ? options.temporaryReferences : undefined,
    options ? options.startTime : undefined,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    debugChannelReadable !== undefined,
  );
  if (options && options.signal) {
    attachAbortSignal(request, options.signal);
  }
  if (debugChannelWritable !== undefined) {
    let debugWritable: Writable;
    const debugStream = new ReadableStream(
      {
        type: 'bytes',
        start: (controller): ?Promise<void> => {
          debugWritable =
            createFakeWritableFromReadableStreamController(controller);
        },
        pull: (controller): ?Promise<void> => {
          startFlowingDebug(request, debugWritable);
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
  let writable: Writable;
  const stream = new ReadableStream(
    {
      type: 'bytes',
      start: (controller): ?Promise<void> => {
        writable = createFakeWritableFromReadableStreamController(controller);
        startWork(request);
      },
      pull: (controller): ?Promise<void> => {
        startFlowing(request, writable);
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
  return stream;
}
