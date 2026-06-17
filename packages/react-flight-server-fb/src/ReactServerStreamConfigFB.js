/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Fork of ReactServerStreamConfigNode for the FB Flight server.
// Avoids importing from 'util' and 'crypto'. Uses the global TextEncoder
// and stubs createFastHash.

import type {Writable} from 'stream';

import type {TextEncoder as TextEncoderType} from 'util';

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

export function scheduleMicrotask(callback: () => void) {
  Promise.resolve().then(callback);
}

export function flushBuffered(destination: Destination) {
  // If we don't have any more data to send right now.
  // Flush whatever is in the buffer to the wire.
  if (typeof destination.flush === 'function') {
    // By convention the Zlib streams provide a flush function for this purpose.
    // For Express, compression middleware adds this method.
    destination.flush();
  }
}

const VIEW_SIZE = 4096;
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
    if (allowableBytes === 0) {
      writeToDestination(destination, currentView as any);
    } else {
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

export const textEncoder: TextEncoderType = new TextEncoder() as any;

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

export function createFastHash(_input: string): string | number {
  throw new Error('createFastHash is not supported in this environment.');
}

export function readAsDataURL(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then(arrayBuffer => {
    const encoded = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'application/octet-stream';
    return 'data:' + mimeType + ';base64,' + encoded;
  });
}
