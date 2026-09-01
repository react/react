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
import type {Thenable} from 'shared/ReactTypes';

import type {Duplex} from 'stream';

import {Readable} from 'stream';

import {
  createRequest,
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
} from '../ReactFlightFBReferences';

// Buffer-based string decoder helpers. The FB server environment does not
// have TextDecoder, so we use Buffer.toString('utf8') instead.
type BufferDecoder = {_pendingBytes: Array<Uint8Array>};

function createStringDecoder(): BufferDecoder {
  return {_pendingBytes: []};
}

function readPartialStringChunk(
  decoder: BufferDecoder,
  buffer: Uint8Array,
): string {
  return Buffer.from(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  ).toString('utf8');
}

function readFinalStringChunk(
  decoder: BufferDecoder,
  buffer: Uint8Array,
): string {
  return Buffer.from(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  ).toString('utf8');
}

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

function decodeReplyFromBusboy<T>(
  busboyStream: Busboy,
  options?: {
    temporaryReferences?: TemporaryReferenceSet,
    arraySizeLimit?: number,
  },
): Thenable<T> {
  const response = createResponse(
    null,
    '',
    options ? options.temporaryReferences : undefined,
    undefined,
    options ? options.arraySizeLimit : undefined,
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
      // $FlowFixMe[incompatible-type] types Error and mixed are incompatible
      err,
    );
  });
  return getRoot(response);
}

function decodeReply<T>(
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
    null,
    '',
    options ? options.temporaryReferences : undefined,
    body,
    options ? options.arraySizeLimit : undefined,
  );
  const root = getRoot<T>(response);
  close(response);
  return root;
}

export {
  renderToPipeableStream,
  decodeReply,
  decodeReplyFromBusboy,
  decodeAction,
  decodeFormState,
};
