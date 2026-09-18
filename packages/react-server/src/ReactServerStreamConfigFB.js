/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type Destination = {
  buffer: string,
  done: boolean,
  fatal: boolean,
  error: mixed,
};

export opaque type PrecomputedChunk = string;
export opaque type Chunk = string;
export opaque type BinaryChunk = string;

export function scheduleMicrotask(callback: () => void) {
  // TODO: Consider unifying this with the FB Flight stream config and
  // adopting its microtask scheduling implementation.
  callback();
}

export function scheduleWork(callback: () => void) {
  // TODO: Consider unifying this with the FB Flight stream config and
  // adopting its work scheduling implementation.
  callback();
}

export function flushBuffered(destination: Destination) {}

export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;

export function beginWriting(destination: Destination) {}

export function writeChunk(
  destination: Destination,
  chunk: Chunk | PrecomputedChunk | BinaryChunk,
): void {
  destination.buffer += chunk;
}

export function writeChunkAndReturn(
  destination: Destination,
  chunk: Chunk | PrecomputedChunk | BinaryChunk,
): boolean {
  destination.buffer += chunk;
  return true;
}

export function completeWriting(destination: Destination) {}

export function close(destination: Destination) {
  destination.done = true;
}

export function stringToChunk(content: string): Chunk {
  return content;
}

export function stringToPrecomputedChunk(content: string): PrecomputedChunk {
  return content;
}

export function typedArrayToBinaryChunk(
  content: $ArrayBufferView,
): BinaryChunk {
  throw new Error('Not implemented.');
}

export const byteLengthOfChunk:
  | null
  | ((chunk: Chunk | PrecomputedChunk) => number) = null;

export function byteLengthOfBinaryChunk(chunk: BinaryChunk): number {
  throw new Error('Not implemented.');
}

export function closeWithError(destination: Destination, error: mixed): void {
  destination.done = true;
  destination.fatal = true;
  destination.error = error;
}

export {createFastHashJS as createFastHash} from './createFastHashJS';

export function readAsDataURL(blob: Blob): Promise<string> {
  throw new Error('Not implemented.');
}
