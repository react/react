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
import type {Destination} from 'react-server/src/ReactServerStreamConfigNode';
import type {ServerManifest} from 'react-client/src/forks/ReactFlightClientConfig.dom-node-rspack';
import {
  type ClientManifest,
  setServerActionBoundArgsEncryption,
  encryptServerActionBoundArgs,
  decryptServerActionBoundArgs,
  loadServerAction,
  createServerEntry,
  ensureServerActions,
} from './ReactFlightServerConfigRspackBundler';
import type {Busboy} from 'busboy';
import type {Writable} from 'stream';
import type {Thenable} from 'shared/ReactTypes';

import type {Duplex} from 'stream';

import {Readable} from 'stream';

import {ASYNC_ITERATOR} from 'shared/ReactSymbols';

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
  reportGlobalError,
  close,
  resolveField,
  resolveFile,
  resolveFileInfo,
  resolveFileChunk,
  resolveFileComplete,
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
} from 'react-client/src/ReactFlightClientStreamConfigNode';

import {textEncoder} from 'react-server/src/ReactServerStreamConfigNode';

import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';

export {createTemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';

export type {TemporaryReferenceSet};

function createDrainHandler(destination: Destination, request: Request) {
  return () => startFlowing(request, destination);
}

function createCancelHandler(request: Request, reason: string) {
  return () => {
    stopFlowing(request);
    abort(request, new Error(reason));
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
      const buffer: Uint8Array = (chunk: any);
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
    const ws: WebSocket = (stream: any);
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('message', event => {
      // $FlowFixMe
      onData(event.data);
    });
    ws.addEventListener('error', event => {
      // $FlowFixMe
      onError(event.error);
    });
    ws.addEventListener('close', onClose);
  } else {
    const readable: Readable = (stream: any);
    readable.on('data', onData);
    readable.on('error', onError);
    readable.on('end', onClose);
  }
}

type Options = {
  debugChannel?: Readable | Writable | Duplex | WebSocket,
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  onError?: (error: mixed) => void,
  identifierPrefix?: string,
  temporaryReferences?: TemporaryReferenceSet,
};

type PipeableStream = {
  abort(reason: mixed): void,
  pipe<T: Writable>(destination: T): T,
};

function renderToPipeableStream(
  model: ReactClientValue,
  options?: Options,
): PipeableStream {
  const debugChannel = __DEV__ && options ? options.debugChannel : undefined;
  const debugChannelReadable: void | Readable | WebSocket =
    __DEV__ &&
    debugChannel !== undefined &&
    // $FlowFixMe[method-unbinding]
    (typeof debugChannel.read === 'function' ||
      typeof debugChannel.readyState === 'number')
      ? (debugChannel: any)
      : undefined;
  const debugChannelWritable: void | Writable =
    __DEV__ && debugChannel !== undefined
      ? // $FlowFixMe[method-unbinding]
        typeof debugChannel.write === 'function'
        ? (debugChannel: any)
        : // $FlowFixMe[method-unbinding]
          typeof debugChannel.send === 'function'
          ? createFakeWritableFromWebSocket((debugChannel: any))
          : undefined
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

function createFakeWritableFromWebSocket(webSocket: WebSocket): Writable {
  return ({
    write(chunk: string | Uint8Array) {
      webSocket.send((chunk: any));
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
  }: any);
}

function createFakeWritableFromReadableStreamController(
  controller: ReadableStreamController,
): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return ({
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
  }: any);
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
  options?: Omit<Options, 'debugChannel'> & {
    debugChannel?: {readable?: ReadableStream, writable?: WritableStream, ...},
    signal?: AbortSignal,
  },
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
    {highWaterMark: 0},
  );
  return stream;
}

function createFakeWritableFromNodeReadable(readable: any): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return ({
    write(chunk: string | Uint8Array) {
      return readable.push(chunk);
    },
    end() {
      readable.push(null);
    },
    destroy(error) {
      readable.destroy(error);
    },
  }: any);
}

type PrerenderOptions = {
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  onError?: (error: mixed) => void,
  identifierPrefix?: string,
  temporaryReferences?: TemporaryReferenceSet,
  signal?: AbortSignal,
};

type StaticResult = {
  prelude: Readable,
};

function prerenderToNodeStream(
  model: ReactClientValue,
  options?: PrerenderOptions,
): Promise<StaticResult> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;
    function onAllReady() {
      const readable: Readable = new Readable({
        read() {
          startFlowing(request, writable);
        },
      });
      const writable = createFakeWritableFromNodeReadable(readable);
      resolve({prelude: readable});
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

function prerender(
  model: ReactClientValue,
  options?: Options & {
    signal?: AbortSignal,
  },
): Promise<{
  prelude: ReadableStream,
}> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;
    function onAllReady() {
      let writable: Writable;
      const stream = new ReadableStream(
        {
          type: 'bytes',
          start: (controller): ?Promise<void> => {
            writable =
              createFakeWritableFromReadableStreamController(controller);
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

function decodeReplyFromBusboy<T>(
  busboyStream: Busboy,
  options?: {temporaryReferences?: TemporaryReferenceSet},
): Thenable<T> {
  const response = createResponse(
    __rspack_rsc_manifest__.serverManifest,
    '',
    options ? options.temporaryReferences : undefined,
  );
  let pendingFiles = 0;
  const queuedFields: Array<string> = [];
  busboyStream.on('field', (name, value) => {
    if (pendingFiles > 0) {
      // Because the 'end' event fires two microtasks after the next 'field'
      // we would resolve files and fields out of order. To handle this properly
      // we queue any fields we receive until the previous file is done.
      queuedFields.push(name, value);
    } else {
      try {
        resolveField(response, name, value);
      } catch (error) {
        busboyStream.destroy(error);
      }
    }
  });
  busboyStream.on('file', (name, value, {filename, encoding, mimeType}) => {
    if (encoding.toLowerCase() === 'base64') {
      busboyStream.destroy(
        new Error(
          "React doesn't accept base64 encoded file uploads because we don't expect " +
            "form data passed from a browser to ever encode data that way. If that's " +
            'the wrong assumption, we can easily fix it.',
        ),
      );
      return;
    }
    pendingFiles++;
    const file = resolveFileInfo(response, name, filename, mimeType);
    value.on('data', chunk => {
      resolveFileChunk(response, file, chunk);
    });
    value.on('end', () => {
      try {
        resolveFileComplete(response, name, file);
        pendingFiles--;
        if (pendingFiles === 0) {
          // Release any queued fields
          for (let i = 0; i < queuedFields.length; i += 2) {
            resolveField(response, queuedFields[i], queuedFields[i + 1]);
          }
          queuedFields.length = 0;
        }
      } catch (error) {
        busboyStream.destroy(error);
      }
    });
  });
  busboyStream.on('finish', () => {
    close(response);
  });
  busboyStream.on('error', err => {
    reportGlobalError(
      response,
      // $FlowFixMe[incompatible-call] types Error and mixed are incompatible
      err,
    );
  });
  return getRoot(response);
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

function decodeReplyFromAsyncIterable<T>(
  iterable: AsyncIterable<[string, string | File]>,
  options?: {temporaryReferences?: TemporaryReferenceSet},
): Thenable<T> {
  const iterator: AsyncIterator<[string, string | File]> =
    iterable[ASYNC_ITERATOR]();

  const response = createResponse(
    __rspack_rsc_manifest__.serverManifest,
    '',
    options ? options.temporaryReferences : undefined,
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
    if (typeof (iterator: any).throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe should be able to pass mixed
      iterator.throw(reason).then(error, error);
    }
  }

  iterator.next().then(progress, error);

  return getRoot(response);
}

export {
  renderToReadableStream,
  renderToPipeableStream,
  prerender,
  prerenderToNodeStream,
  decodeReply,
  decodeReplyFromBusboy,
  decodeReplyFromAsyncIterable,
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
