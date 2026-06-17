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
import type {Busboy} from 'busboy';
import type {Writable} from 'stream';
import type {ReactFormState, Thenable} from 'shared/ReactTypes';
import type {
  ServerManifest,
  ServerReferenceId,
} from '../client/ReactFlightClientConfigBundlerParcel';

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
  decodeAction as decodeActionImpl,
  decodeFormState as decodeFormStateImpl,
} from 'react-server/src/ReactFlightActionServer';

import {
  preloadModule,
  requireModule,
  resolveServerReference,
} from '../client/ReactFlightClientConfigBundlerParcel';

export {
  createClientReference,
  registerServerReference,
} from '../ReactFlightParcelReferences';

import {
  createStringDecoder,
  readPartialStringChunk,
  readFinalStringChunk,
} from 'react-client/src/ReactFlightClientStreamConfigNode';

import {textEncoder} from 'react-server/src/ReactServerStreamConfigNode';

import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import type {FileHandle} from 'react-server/src/ReactFlightReplyServer';

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

type Options = {
  debugChannel?: Readable | Writable | Duplex | WebSocket,
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  onError?: (error: mixed) => void,
  identifierPrefix?: string,
  temporaryReferences?: TemporaryReferenceSet,
  startTime?: number,
};

type PipeableStream = {
  abort(reason: mixed): void,
  pipe<T: Writable>(destination: T): T,
};

export function renderToPipeableStream(
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
    model,
    null,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
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
    null,
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

function createFakeWritableFromNodeReadable(readable: any): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return {
    write(chunk: string | Uint8Array) {
      return readable.push(chunk);
    },
    end() {
      readable.push(null);
    },
    destroy(error) {
      readable.destroy(error);
    },
  } as any;
}

type PrerenderOptions = {
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  onError?: (error: mixed) => void,
  identifierPrefix?: string,
  temporaryReferences?: TemporaryReferenceSet,
  signal?: AbortSignal,
  startTime?: number,
};

type StaticResult = {
  prelude: Readable,
};

export function prerenderToNodeStream(
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
      null,
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

export function prerender(
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
        // $FlowFixMe[incompatible-type]
        {highWaterMark: 0},
      );
      resolve({prelude: stream});
    }
    const request = createPrerenderRequest(
      model,
      null,
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

let serverManifest: ServerManifest = {};
export function registerServerActions(manifest: ServerManifest) {
  // This function is called by the bundler to register the manifest.
  serverManifest = manifest;
}

type PendingFile = {
  name: string,
  file: FileHandle,
  complete: boolean,
  // Lazily allocated when a text field arrives after this file's 'file'
  // event but before its (deferred) 'end' event. Stored as flat
  // [name1, value1, name2, value2, ...] pairs.
  queuedFields: null | Array<string>,
  next: null | PendingFile,
};

export function decodeReplyFromBusboy<T>(
  busboyStream: Busboy,
  options?: {
    temporaryReferences?: TemporaryReferenceSet,
    arraySizeLimit?: number,
  },
): Thenable<T> {
  const response = createResponse(
    serverManifest,
    '',
    options ? options.temporaryReferences : undefined,
    undefined,
    options ? options.arraySizeLimit : undefined,
  );

  // Linked list of pending files in arrival (payload) order. Text fields that
  // arrive while a file is in flight are queued on the tail file's
  // `queuedFields` so they can be resolved together when that file completes.
  // Fields that arrive while the list is empty bypass it and resolve
  // immediately. This makes the backing FormData's insertion order match the
  // payload's entry order.
  let head: null | PendingFile = null;
  let tail: null | PendingFile = null;
  let bodyFinished = false;
  let closed = false;

  function flush() {
    while (head !== null) {
      const current = head;
      if (!current.complete) {
        // This file is still streaming. Hold later files and fields until it
        // completes so the backing FormData reflects payload order.
        return;
      }
      try {
        resolveFileComplete(response, current.name, current.file);
        const queuedFields = current.queuedFields;
        if (queuedFields !== null) {
          for (let i = 0; i < queuedFields.length; i += 2) {
            resolveField(response, queuedFields[i], queuedFields[i + 1]);
          }
        }
      } catch (error) {
        busboyStream.destroy(error);
        return;
      }
      head = current.next;
    }
    tail = null;
    if (bodyFinished && !closed) {
      closed = true;
      close(response);
    }
  }

  busboyStream.on('field', (name, value) => {
    if (tail !== null) {
      // A file is in flight; queue the field on the tail (most recent) pending
      // file so it resolves after that file, preserving payload order.
      if (tail.queuedFields === null) {
        tail.queuedFields = [];
      }
      tail.queuedFields.push(name, value);
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
    const file = resolveFileInfo(response, name, filename, mimeType);
    const pendingFile: PendingFile = {
      name,
      file,
      complete: false,
      queuedFields: null,
      next: null,
    };
    if (tail === null) {
      head = pendingFile;
    } else {
      tail.next = pendingFile;
    }
    tail = pendingFile;
    value.on('data', chunk => {
      try {
        resolveFileChunk(response, file, chunk);
      } catch (error) {
        busboyStream.destroy(error);
      }
    });
    value.on('error', error => {
      busboyStream.destroy(error);
    });
    value.on('end', () => {
      pendingFile.complete = true;
      flush();
    });
  });
  busboyStream.on('finish', () => {
    bodyFinished = true;
    flush();
    if (!closed) {
      // Invariant: busboy delays 'finish' until every file's 'end' event has
      // fired, so the flush above should always close the response.
      reportGlobalError(
        response,
        new Error('Reply finished with incomplete file part.'),
      );
    }
  });
  busboyStream.on('error', err => {
    reportGlobalError(
      response,
      // $FlowFixMe[incompatible-type] types Error and mixed are incompatible
      err,
    );
  });
  return getRoot(response);
}

export function decodeReply<T>(
  body: string | FormData,
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
    serverManifest,
    '',
    options ? options.temporaryReferences : undefined,
    body,
    options ? options.arraySizeLimit : undefined,
  );
  const root = getRoot<T>(response);
  close(response);
  return root;
}

export function decodeReplyFromAsyncIterable<T>(
  iterable: AsyncIterable<[string, string | File]>,
  options?: {
    temporaryReferences?: TemporaryReferenceSet,
    arraySizeLimit?: number,
  },
): Thenable<T> {
  const iterator: AsyncIterator<[string, string | File]> =
    iterable[ASYNC_ITERATOR]();

  const response = createResponse(
    serverManifest,
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

export function decodeAction<T>(body: FormData): Promise<() => T> | null {
  return decodeActionImpl(body, serverManifest);
}

export function decodeFormState<S>(
  actionResult: S,
  body: FormData,
): Promise<ReactFormState<S, ServerReferenceId> | null> {
  return decodeFormStateImpl(actionResult, body, serverManifest);
}

export function loadServerAction<F: (...any[]) => any>(id: string): Promise<F> {
  const reference = resolveServerReference<any>(serverManifest, id);
  return Promise.resolve(reference)
    .then(() => preloadModule(reference))
    .then(() => {
      const fn = requireModule(reference);
      if (typeof fn !== 'function') {
        throw new Error('Server actions must be functions');
      }
      return fn;
    });
}
