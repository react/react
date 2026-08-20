/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export interface Reference {}

export type TaintEntry = {
  message: string,
  count: number,
};

export const TaintRegistryObjects: WeakMap<Reference, string> = new WeakMap();
export const TaintRegistryValues: Map<string | bigint, TaintEntry> = new Map();
// Byte lengths of all binary values we've ever seen. We don't both refcounting this.
// We expect to see only a few lengths here such as the length of token.
export const TaintRegistryByteLengths: Set<number> = new Set();

// When a value is finalized, it means that it has been removed from any global caches.
// No future requests can get a handle on it but any ongoing requests can still have
// a handle on it. It's still tainted until that happens.
export type RequestCleanupQueue = Array<string | bigint>;
export const TaintRegistryPendingRequests: Set<RequestCleanupQueue> = new Set();
