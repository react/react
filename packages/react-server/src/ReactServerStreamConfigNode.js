/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Writable} from 'stream';

import {TextEncoder} from 'util';
import {createHash} from 'crypto';

interface MightBeFlushable {
  flush?: () => void;
}

export type Destination = Writable & MightBeFlushable;

export type PrecomputedChunk = Uint8Array;
export opaque type Chunk = string;
export type BinaryChunk = Uint8Array;

export function scheduleWork(callback: () => void) {
  setImmediate(callback);
}

export const scheduleMicrotask = queueMicrotask;

export function flushBuffered(destination: Destination) {
  // If we don't have any more data to send right now.
  // Flush whatever is in the buffer to the wire.
  if (typeof destination.flush === 'function') {
    // By convention the Zlib streams provide a flush function for this purpose.
    // For Express, compression middleware adds this method.
    destination.flush();
  }
}

// Chunks larger than VIEW_SIZE are written directly, without copying into the
// internal view buffer. This must be at least half of Node's internal Buffer
// pool size (8192) to avoid corrupting the pool when using
// renderToReadableStream, which uses a byte stream that detaches ArrayBuffers.
// 32 kB views: a typical document is 50-200 kB, so 4 kB views meant dozens
// of destination.write() calls (each a trip through the Writable machinery
// and ultimately writev) per request. Larger views trade slightly larger
// buffer allocations for ~8x fewer stream writes; output bytes are
// unchanged, only enqueued chunk boundaries move, and flush timing is
// still governed by completeWriting at the end of each flush cycle.
const VIEW_SIZE = 32768;
let currentView = null;
let writtenBytes = 0;
let destinationHasCapacity = true;

export function beginWriting(destination: Destination) {
  currentView = new Uint8Array(VIEW_SIZE);
  writtenBytes = 0;
  destinationHasCapacity = true;
}

function writeStringChunk(destination: Destination, stringChunk: string) {
  if (stringChunk.length === 0) {
    return;
  }
  // maximum possible view needed to encode entire string
  if (stringChunk.length * 3 > VIEW_SIZE) {
    if (writtenBytes > 0) {
      writeToDestination(
        destination,
        (currentView as any as Uint8Array).subarray(0, writtenBytes),
      );
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }
    // Write the raw string chunk and let the consumer handle the encoding.
    writeToDestination(destination, stringChunk);
    return;
  }

  let target: Uint8Array = currentView as any;
  if (writtenBytes > 0) {
    target = (currentView as any as Uint8Array).subarray(writtenBytes);
  }
  const {read, written} = textEncoder.encodeInto(stringChunk, target);
  writtenBytes += written;

  if (read < stringChunk.length) {
    writeToDestination(
      destination,
      (currentView as any).subarray(0, writtenBytes),
    );
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = textEncoder.encodeInto(
      stringChunk.slice(read),
      currentView as any,
    ).written;
  }

  if (writtenBytes === VIEW_SIZE) {
    writeToDestination(destination, currentView as any);
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
}

function writeViewChunk(
  destination: Destination,
  chunk: PrecomputedChunk | BinaryChunk,
) {
  if (chunk.byteLength === 0) {
    return;
  }
  if (chunk.byteLength > VIEW_SIZE) {
    // this chunk may overflow a single view which implies it was not
    // one that is cached by the streaming renderer. We will enqueu
    // it directly and expect it is not re-used
    if (writtenBytes > 0) {
      writeToDestination(
        destination,
        (currentView as any as Uint8Array).subarray(0, writtenBytes),
      );
      currentView = new Uint8Array(VIEW_SIZE);
      writtenBytes = 0;
    }
    writeToDestination(destination, chunk);
    return;
  }

  let bytesToWrite = chunk;
  const allowableBytes =
    (currentView as any as Uint8Array).length - writtenBytes;
  if (allowableBytes < bytesToWrite.byteLength) {
    // this chunk would overflow the current view. We enqueue a full view
    // and start a new view with the remaining chunk
    if (allowableBytes === 0) {
      // the current view is already full, send it
      writeToDestination(destination, currentView as any);
    } else {
      // fill up the current view and apply the remaining chunk bytes
      // to a new view.
      (currentView as any as Uint8Array).set(
        bytesToWrite.subarray(0, allowableBytes),
        writtenBytes,
      );
      writtenBytes += allowableBytes;
      writeToDestination(destination, currentView as any);
      bytesToWrite = bytesToWrite.subarray(allowableBytes);
    }
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
  (currentView as any as Uint8Array).set(bytesToWrite, writtenBytes);
  writtenBytes += bytesToWrite.byteLength;

  if (writtenBytes === VIEW_SIZE) {
    writeToDestination(destination, currentView as any);
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
}

export function writeChunk(
  destination: Destination,
  chunk: PrecomputedChunk | Chunk | BinaryChunk,
): void {
  if (typeof chunk === 'string') {
    writeStringChunk(destination, chunk);
  } else {
    writeViewChunk(destination, chunk as any as PrecomputedChunk | BinaryChunk);
  }
}

function writeToDestination(
  destination: Destination,
  view: string | Uint8Array,
) {
  const currentHasCapacity = destination.write(view);
  destinationHasCapacity = destinationHasCapacity && currentHasCapacity;
}

export function writeChunkAndReturn(
  destination: Destination,
  chunk: PrecomputedChunk | Chunk,
): boolean {
  writeChunk(destination, chunk);
  return destinationHasCapacity;
}

export function completeWriting(destination: Destination) {
  if (currentView && writtenBytes > 0) {
    destination.write(currentView.subarray(0, writtenBytes));
  }
  currentView = null;
  writtenBytes = 0;
  destinationHasCapacity = true;
}

export function close(destination: Destination) {
  destination.end();
}

export const textEncoder: TextEncoder = new TextEncoder();

export function stringToChunk(content: string): Chunk {
  return content;
}

export function stringToPrecomputedChunk(content: string): PrecomputedChunk {
  const precomputedChunk = textEncoder.encode(content);

  if (__DEV__) {
    if (precomputedChunk.byteLength > VIEW_SIZE) {
      console.error(
        'precomputed chunks must be smaller than the view size configured for this host. This is a bug in React.',
      );
    }
  }

  return precomputedChunk;
}

export function typedArrayToBinaryChunk(
  content: $ArrayBufferView,
): BinaryChunk {
  // Convert any non-Uint8Array array to Uint8Array. We could avoid this for Uint8Arrays.
  return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
}

export function byteLengthOfChunk(chunk: Chunk | PrecomputedChunk): number {
  return typeof chunk === 'string'
    ? Buffer.byteLength(chunk, 'utf8')
    : chunk.byteLength;
}

export function byteLengthOfBinaryChunk(chunk: BinaryChunk): number {
  return chunk.byteLength;
}

export function closeWithError(destination: Destination, error: mixed): void {
  // $FlowFixMe[incompatible-type]: This is an Error object or the destination accepts other types.
  destination.destroy(error);
}

export function createFastHash(input: string): string | number {
  const hash = createHash('md5');
  hash.update(input);
  return hash.digest('hex');
}

export function readAsDataURL(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then(arrayBuffer => {
    const encoded = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'application/octet-stream';
    return 'data:' + mimeType + ';base64,' + encoded;
  });
}
