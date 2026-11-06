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
import hasOwnProperty from 'shared/hasOwnProperty';

interface MightBeFlushable {
  flush?: () => void;
  writableObjectMode?: boolean;
}

export type Destination = Writable & MightBeFlushable;

export type PrecomputedChunk = Uint8Array;
export opaque type Chunk = string;
export type BinaryChunk = Uint8Array;

const supportsArrayBufferDetached = hasOwnProperty.call(
  ArrayBuffer.prototype,
  'detached',
);
let didWarnAboutMissingArrayBufferDetached = false;

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

// A chunk larger than VIEW_SIZE is written to the destination as is. A smaller
// chunk is copied into currentView, which React allocates and owns, so that the
// destination receives fewer and larger writes.
const VIEW_SIZE = 4096;
let currentView = null;
let writtenBytes = 0;
let destinationHasCapacity = true;

// An object-mode destination receives strings as strings. Small strings are
// joined into pendingString so the destination still receives fewer writes.
// Strings and views are flushed in write order, so at most one of
// pendingString and currentView holds data at a time.
let destinationIsObjectMode = false;
let pendingString = '';

export function beginWriting(destination: Destination) {
  currentView = new Uint8Array(VIEW_SIZE);
  writtenBytes = 0;
  destinationHasCapacity = true;
  destinationIsObjectMode = destination.writableObjectMode === true;
  pendingString = '';
}

function flushPendingString(destination: Destination) {
  if (pendingString.length > 0) {
    writeToDestination(destination, pendingString);
    pendingString = '';
  }
}

function flushCurrentView(destination: Destination) {
  if (writtenBytes > 0) {
    writeToDestination(
      destination,
      (currentView as any as Uint8Array).subarray(0, writtenBytes),
    );
    currentView = new Uint8Array(VIEW_SIZE);
    writtenBytes = 0;
  }
}

function writeStringChunk(destination: Destination, stringChunk: string) {
  if (stringChunk.length === 0) {
    return;
  }
  if (destinationIsObjectMode) {
    flushCurrentView(destination);
    if (stringChunk.length * 3 > VIEW_SIZE) {
      flushPendingString(destination);
      writeToDestination(destination, stringChunk);
      return;
    }
    pendingString += stringChunk;
    if (pendingString.length * 3 > VIEW_SIZE) {
      flushPendingString(destination);
    }
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
    if (supportsArrayBufferDetached) {
      // $FlowFixMe[prop-missing] -- supportsArrayBufferDetached implies it does exist.
      if (chunk.buffer.detached) {
        throw new Error(
          'Cannot transport a detached buffer. ' +
            'This usually happens when trying to transport multiple buffer-spanning views on the same underyling buffer. ' +
            'Either reuse the exact same view by identity or copy the underlying buffer manually via `view.slice()`.',
        );
      }
    } else if (__DEV__) {
      if (!didWarnAboutMissingArrayBufferDetached) {
        console.error(
          'React encountered an empty buffer when writing in an environment that ' +
            'does not support ArrayBuffer.prototype.detached. ' +
            'This could be a security issue if the buffer was not actually empty. ' +
            'Please upgrade to a Node.js version that supports ArrayBuffer.prototype.detached.',
        );
        didWarnAboutMissingArrayBufferDetached = true;
      }
    }

    return;
  }
  if (destinationIsObjectMode) {
    flushPendingString(destination);
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

// The reader frames this chunk by length, so an object-mode destination must
// receive it as written: not joined with other chunks.
export function writeStandaloneChunkAndReturn(
  destination: Destination,
  chunk: PrecomputedChunk | Chunk | BinaryChunk,
): boolean {
  if (destinationIsObjectMode && typeof chunk === 'string') {
    if (chunk.length > 0) {
      flushCurrentView(destination);
      flushPendingString(destination);
      writeToDestination(destination, chunk);
    }
    return destinationHasCapacity;
  }
  writeChunk(destination, chunk);
  return destinationHasCapacity;
}

export function completeWriting(destination: Destination) {
  if (pendingString.length > 0) {
    destination.write(pendingString);
    pendingString = '';
  }
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
  const view = new Uint8Array(
    content.buffer,
    content.byteOffset,
    content.byteLength,
  );
  // A byte stream transfers, and thereby detaches, the whole ArrayBuffer of
  // every chunk it receives. React writes a chunk larger than VIEW_SIZE
  // directly to the destination, so such a chunk must own its whole buffer.
  //
  // The render consumes a typed array that spans its whole buffer, in the same
  // way that it consumes a one shot iterable.
  //
  // React copies a view into a part of a buffer, because the rest of that
  // buffer does not belong to this chunk. Node serves an allocation below
  // `Buffer.poolSize >>> 1` from its own internal view that it shares between unrelated
  // Buffers, so a Buffer of that size is such a view.
  if (content.byteLength > VIEW_SIZE) {
    // TODO: We should not slice if the Destination does not detach the underlying buffer.
    // Then we can also add a dev warning if we see the same underlying buffer
    // in multiple buffer-spanning views.

    // As a heuristic we assume partial views mean multiple views on the same
    // underlying buffer are being transported. We slice to avoid buffer detachment.
    const isViewBufferSpanning =
      content.byteOffset === 0 &&
      content.byteLength === content.buffer.byteLength;
    if (
      !isViewBufferSpanning ||
      // To allow resizing buffers after they have been transported.
      // Also as a precaution in case the underlying buffer gets resized between
      // render and write.
      // $FlowFixMe[prop-missing] prop missing in older envs = not resizable
      content.buffer.resizable
    ) {
      return view.slice();
    }
    if (!supportsArrayBufferDetached) {
      // We're defensively slicing for older environments where we can't reliably
      // check later if the ArrayBuffer became detached.
      if (__DEV__) {
        if (!didWarnAboutMissingArrayBufferDetached) {
          console.error(
            'React copied a partial view into a fresh buffer as a safety precaution ' +
              'because the environment does not implement ArrayBuffer.prototype.detached. ' +
              'This negatively impacts performance. ' +
              'Please upgrade to a modern Node.js version.',
          );
          didWarnAboutMissingArrayBufferDetached = true;
        }
      }
      return view.slice();
    }
  }
  // These are likely unique views on the underlying buffer so we can transfer them safely.
  // We'll check again when writing if the underlying buffer became detached.
  return view;
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
