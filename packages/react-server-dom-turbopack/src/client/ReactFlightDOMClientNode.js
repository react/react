/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable, ReactCustomFormAction} from 'shared/ReactTypes.js';

import type {
  DebugChannel,
  FindSourceMapURLCallback,
  Response,
} from 'react-client/src/ReactFlightClient';

import type {
  ServerConsumerModuleMap,
  ModuleLoading,
  ServerManifest,
} from 'react-client/src/ReactFlightClientConfig';

type ServerConsumerManifest = {
  moduleMap: ServerConsumerModuleMap,
  moduleLoading: ModuleLoading,
  serverModuleMap: null | ServerManifest,
};

import type {Readable} from 'stream';

import {AsyncLocalStorage} from 'async_hooks';

import type {RenderResult} from 'react-client/src/ReactFlightClient';

import {
  createResponse,
  createStreamState,
  connectRenderResult,
  provideDispatchScope,
  getRoot,
  reportGlobalError,
  processStringChunk,
  processBinaryChunk,
  close,
} from 'react-client/src/ReactFlightClient';

export * from './ReactFlightDOMClientEdge';

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
  findSourceMapURL?: FindSourceMapURLCallback,
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

function createFromNodeStream<T>(
  stream: Readable,
  serverConsumerManifest: ServerConsumerManifest,
  options?: Options,
): Thenable<T> {
  const debugChannel: void | DebugChannel =
    __DEV__ && options && options.debugChannel !== undefined
      ? {hasReadable: true, callback: null}
      : undefined;

  const response: Response = createResponse(
    serverConsumerManifest.moduleMap,
    serverConsumerManifest.serverModuleMap,
    serverConsumerManifest.moduleLoading,
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    undefined, // TODO: If encodeReply is supported, this should support temporaryReferences
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
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

type InlineDataConsumer = {
  segment: (chunk: string | Uint8Array) => void,
  close: () => void,
  error: (error: mixed) => void,
};

// The contract a Fizz render's inlineData option expects. Declared
// structurally so the two sides stay decoupled the way a framework passing
// the object between them is.
export type InlineDataSource = {
  subscribe: (consumer: InlineDataConsumer) => void,
};

// Segments are capped so each becomes its own inline script in the
// document: script parse and execution happen per segment, interleaved
// with the network while the document streams, instead of as one long
// task at the end. The cap matches the granularity frameworks get today
// from their stream chunking.
const INLINE_SEGMENT_SIZE = 4096;

// A byte stream (any transport, including a remote server tier) adapts by
// decoding text once here so it re-encodes once, into the document; binary
// chunks pass through for the document to carry as base64. A transport may
// split chunks anywhere, so text segments make no row-alignment promises —
// the receiving side parses arbitrary chunking.
function createInlineDataSourceFromStream(stream: Readable): InlineDataSource {
  return {
    subscribe(consumer: InlineDataConsumer): void {
      const decoder = new TextDecoder('utf-8', {fatal: true});
      // Bytes held back from the previous chunk: an incomplete trailing
      // UTF-8 sequence that the next chunk completes. Keeping the carry
      // here instead of inside the decoder means a binary chunk can't
      // silently swallow a text row's trailing bytes.
      let carry: null | Uint8Array = null;
      let pending = '';
      function flushPending(): void {
        while (pending.length > 0) {
          let end = Math.min(pending.length, INLINE_SEGMENT_SIZE);
          const lead = pending.charCodeAt(end - 1);
          if (end < pending.length && lead >= 0xd800 && lead <= 0xdbff) {
            // Don't split a surrogate pair across segments.
            end--;
          }
          consumer.segment(pending.slice(0, end));
          pending = pending.slice(end);
        }
      }
      function incompleteTailLength(chunk: Uint8Array): number {
        // Walk back over up to three continuation bytes to find a lead
        // byte; if the sequence it starts is cut off by the chunk end, the
        // tail is incomplete.
        let i = chunk.length - 1;
        let back = 0;
        while (i >= 0 && back < 3 && (chunk[i] & 0xc0) === 0x80) {
          i--;
          back++;
        }
        if (i < 0) {
          return 0;
        }
        const lead = chunk[i];
        const size =
          (lead & 0x80) === 0
            ? 1
            : (lead & 0xe0) === 0xc0
              ? 2
              : (lead & 0xf0) === 0xe0
                ? 3
                : (lead & 0xf8) === 0xf0
                  ? 4
                  : 1;
        return i + size > chunk.length ? chunk.length - i : 0;
      }
      stream.on('data', (chunk: Buffer | string) => {
        if (typeof chunk === 'string') {
          if (carry !== null) {
            // Bytes held back from the previous chunk precede this text in
            // wire order; they can't be completed by a string.
            const carried = carry;
            carry = null;
            flushPending();
            consumer.segment(carried);
          }
          pending += chunk;
          flushPending();
          return;
        }
        let bytes: Uint8Array = new Uint8Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength,
        );
        if (carry !== null) {
          // Flow cannot refine a closure-captured let across callbacks;
          // snapshot it.
          const carried = carry;
          const joined = new Uint8Array(carried.length + bytes.length);
          joined.set(carried, 0);
          joined.set(bytes, carried.length);
          bytes = joined;
          carry = null;
        }
        const tail = incompleteTailLength(bytes);
        const head =
          tail === 0 ? bytes : bytes.subarray(0, bytes.length - tail);
        if (tail !== 0) {
          carry = bytes.slice(bytes.length - tail);
        }
        try {
          pending += decoder.decode(head);
        } catch (x) {
          // Not valid UTF-8: a binary row's bytes. Ship everything we're
          // holding, in order, and let the document carry it as base64.
          if (pending !== '') {
            consumer.segment(pending);
            pending = '';
          }
          if (carry !== null) {
            const carried = carry;
            const rejoined = new Uint8Array(head.length + carried.length);
            rejoined.set(head, 0);
            rejoined.set(carried, head.length);
            carry = null;
            consumer.segment(rejoined);
          } else {
            consumer.segment(head);
          }
          return;
        }
        flushPending();
      });
      stream.on('end', () => {
        if (carry !== null) {
          // The stream ended mid-sequence; pass the raw bytes through.
          // Snapshot before any calls: Flow drops refinements on
          // closure-captured lets across them.
          const carried = carry;
          carry = null;
          if (pending !== '') {
            consumer.segment(pending);
            pending = '';
          }
          consumer.segment(carried);
        }
        if (pending !== '') {
          consumer.segment(pending);
        }
        consumer.close();
      });
      stream.on('error', (error: mixed) => {
        consumer.error(error);
      });
    },
  };
}

// Wire rows delivered as text (with binary row bodies between them, in
// wire order) need no decoding on this side; segments end at row
// boundaries whenever whole rows fit under the cap, so each document
// script tends to carry complete rows.
function createRowSegmentingConsumer(consumer: InlineDataConsumer): {
  string: (chunk: string) => void,
  bytes: (chunk: $ArrayBufferView) => void,
  close: () => void,
  error: (reason: mixed) => void,
} {
  let pending = '';
  function flushPending(): void {
    // One forward sweep: segments prefer to end at the last row boundary
    // under the cap, and the newline cursor only ever advances, so a large
    // batch costs one scan however its rows fall against the cap.
    let offset = 0;
    let lastBoundary = 0;
    let nextNewline = pending.indexOf('\n');
    while (pending.length - offset > INLINE_SEGMENT_SIZE) {
      const windowEnd = offset + INLINE_SEGMENT_SIZE;
      while (nextNewline !== -1 && nextNewline < windowEnd) {
        lastBoundary = nextNewline + 1;
        nextNewline = pending.indexOf('\n', lastBoundary);
      }
      let end;
      if (lastBoundary > offset) {
        end = lastBoundary;
      } else {
        // A row longer than the cap splits mid-row, which the receiving
        // side parses fine.
        end = windowEnd;
        const lead = pending.charCodeAt(end - 1);
        if (lead >= 0xd800 && lead <= 0xdbff) {
          // Don't split a surrogate pair across segments.
          end--;
        }
      }
      consumer.segment(pending.slice(offset, end));
      offset = end;
    }
    if (offset < pending.length) {
      consumer.segment(offset === 0 ? pending : pending.slice(offset));
    }
    pending = '';
  }
  return {
    string(chunk: string): void {
      pending += chunk;
      flushPending();
    },
    bytes(chunk: $ArrayBufferView): void {
      flushPending();
      consumer.segment(
        chunk instanceof Uint8Array
          ? chunk
          : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
      );
    },
    close(): void {
      flushPending();
      consumer.close();
    },
    error(reason: mixed): void {
      consumer.error(reason);
    },
  };
}

// A render result from this process delivers its wire output through the
// rows door: the producer's own row strings, batched per flush.
function createInlineDataSourceFromRender(
  result: RenderResult,
): InlineDataSource {
  return {
    subscribe(consumer: InlineDataConsumer): void {
      result._subscribeRows(createRowSegmentingConsumer(consumer));
    },
  };
}

// An object-mode stream is a rows transport: strings are wire text and
// buffers are binary row bodies, already split on row boundaries by the
// producer (e.g. a replayable tee of a render's rows door).
function createInlineDataSourceFromRowStream(
  stream: Readable,
): InlineDataSource {
  return {
    subscribe(consumer: InlineDataConsumer): void {
      const rows = createRowSegmentingConsumer(consumer);
      stream.on('data', (chunk: Buffer | string) => {
        if (typeof chunk === 'string') {
          rows.string(chunk);
        } else {
          rows.bytes(chunk);
        }
      });
      stream.on('end', () => {
        rows.close();
      });
      stream.on('error', (error: mixed) => {
        rows.error(error);
      });
    },
  };
}

// Adapts a Flight render into an inline data source for a Fizz render with
// inlineData: the document carries the payload alongside the HTML, and a
// paired createFromInlineData reads it back out on the other side.
function createInlineDataSource(
  source: Readable | RenderResult,
): InlineDataSource {
  if (typeof (source as any)._subscribeRows === 'function') {
    // An in-process render result: take its rows directly.
    return createInlineDataSourceFromRender(source as any);
  }
  if ((source as any).readableObjectMode === true) {
    return createInlineDataSourceFromRowStream(source as any);
  }
  return createInlineDataSourceFromStream(source as any);
}

// Shadows the Edge implementation re-exported above with one that follows
// this entry point's conventions: the manifest is positional, like
// createFromNodeStream's.
function createFromRender<T>(
  result: RenderResult,
  serverConsumerManifest: ServerConsumerManifest,
  options?: Options,
): Thenable<T> {
  const response: Response = createResponse(
    serverConsumerManifest.moduleMap,
    serverConsumerManifest.serverModuleMap,
    serverConsumerManifest.moduleLoading,
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    undefined, // TODO: If encodeReply is supported, this should support temporaryReferences
    options && options.unstable_allowPartialStream
      ? options.unstable_allowPartialStream
      : false,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
    __DEV__ && options && options.startTime != null
      ? options.startTime
      : undefined,
    __DEV__ && options && options.endTime != null ? options.endTime : undefined,
    undefined, // debugChannel: debug rows arrive through the result itself
  );
  const streamState = createStreamState(response, result);
  connectRenderResult(response, result, streamState);
  const root = getRoot<T>(response);
  let scopeCaptured = false;
  return {
    then(resolve: any, reject: any) {
      if (!scopeCaptured) {
        scopeCaptured = true;
        // Module preinits and hints must land in whatever request consumes
        // this response. A byte stream gets this implicitly: its
        // subscription callbacks inherit the consumer's async scope. For an
        // in-process render, capture the scope of the first read — the
        // consuming renderer's — and route every dispatch through it.
        provideDispatchScope(response, AsyncLocalStorage.snapshot());
      }
      return (root as any).then(resolve, reject);
    },
  } as any;
}

export {createFromNodeStream, createFromRender, createInlineDataSource};
