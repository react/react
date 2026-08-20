/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This is a host config that's used for the `react-server` package on npm.
// It is only used by third-party renderers.
//
// Its API lets you pass the host config as an argument.
// However, inside the `react-server` we treat host config as a module.
// This file is a shim between two worlds.
//
// It works because the `react-server` bundle is wrapped in something like:
//
// module.exports = function ($$$config) {
//   /* renderer code */
// }
//
// So `$$$config` looks like a global variable, but it's
// really an argument to a top-level wrapping function.

declare const $$$config: any;
export opaque type Destination = mixed;

export opaque type PrecomputedChunk = mixed;
export opaque type Chunk = mixed;
export opaque type BinaryChunk = mixed;

export const scheduleWork = $$$config.scheduleWork;
export const scheduleMicrotask = $$$config.scheduleMicrotask;
export const beginWriting = $$$config.beginWriting;
export const writeChunk = $$$config.writeChunk;
export const writeChunkAndReturn = $$$config.writeChunkAndReturn;
export const completeWriting = $$$config.completeWriting;
export const flushBuffered = $$$config.flushBuffered;
export const close = $$$config.close;
export const closeWithError = $$$config.closeWithError;
export const stringToChunk = $$$config.stringToChunk;
export const stringToPrecomputedChunk = $$$config.stringToPrecomputedChunk;
export const typedArrayToBinaryChunk = $$$config.typedArrayToBinaryChunk;
export const byteLengthOfChunk = $$$config.byteLengthOfChunk;
export const byteLengthOfBinaryChunk = $$$config.byteLengthOfBinaryChunk;
export const createFastHash = $$$config.createFastHash;
export const readAsDataURL = $$$config.readAsDataURL;
