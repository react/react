/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  ReactDebugInfo,
  ReactComponentInfo,
  ReactStackTrace,
} from 'shared/ReactTypes';

export const IO_NODE = 0;
export const PROMISE_NODE = 1;
export const AWAIT_NODE = 2;
export const UNRESOLVED_PROMISE_NODE = 3;
export const UNRESOLVED_AWAIT_NODE = 4;

type PromiseWithDebugInfo = interface extends Promise<any> {
  _debugInfo?: ReactDebugInfo,
};

export type IONode = {
  tag: 0,
  owner: null | ReactComponentInfo,
  stack: null | ReactStackTrace, // callsite that spawned the I/O
  start: number, // start time when the first part of the I/O sequence started
  end: number, // we typically don't use this. only when there's no promise intermediate.
  promise: null, // not used on I/O
  awaited: null, // I/O is only blocked on external.
  previous: null | AwaitNode | UnresolvedAwaitNode, // the preceeding await that spawned this new work
};

export type PromiseNode = {
  tag: 1,
  owner: null | ReactComponentInfo,
  stack: null | ReactStackTrace, // callsite that created the Promise
  start: number, // start time when the Promise was created
  end: number, // end time when the Promise was resolved.
  promise: WeakRef<PromiseWithDebugInfo>, // a reference to this Promise if still referenced
  awaited: null | AsyncSequence, // the thing that ended up resolving this promise
  previous: null | AsyncSequence, // represents what the last return of an async function depended on before returning
};

export type AwaitNode = {
  tag: 2,
  owner: null | ReactComponentInfo,
  stack: null | ReactStackTrace, // callsite that awaited (using await, .then(), Promise.all(), ...)
  start: number, // when we started blocking. This might be later than the I/O started.
  end: number, // when we unblocked. This might be later than the I/O resolved if there's CPU time.
  promise: WeakRef<PromiseWithDebugInfo>, // a reference to this Promise if still referenced
  awaited: null | AsyncSequence, // the promise we were waiting on
  previous: null | AsyncSequence, // the sequence that was blocking us from awaiting in the first place
};

export type UnresolvedPromiseNode = {
  tag: 3,
  owner: null | ReactComponentInfo,
  stack: null | ReactStackTrace, // callsite that created the Promise
  start: number, // start time when the Promise was created
  end: -1.1, // set when we resolve.
  promise: WeakRef<PromiseWithDebugInfo>, // a reference to this Promise if still referenced
  awaited: null | AsyncSequence, // the thing that ended up resolving this promise
  previous: null, // where we created the promise is not interesting since creating it doesn't mean waiting.
};

export type UnresolvedAwaitNode = {
  tag: 4,
  owner: null | ReactComponentInfo,
  stack: null | ReactStackTrace, // callsite that awaited (using await, .then(), Promise.all(), ...)
  start: number, // when we started blocking. This might be later than the I/O started.
  end: -1.1, // set when we resolve.
  promise: WeakRef<PromiseWithDebugInfo>, // a reference to this Promise if still referenced
  awaited: null | AsyncSequence, // the promise we were waiting on
  previous: null | AsyncSequence, // the sequence that was blocking us from awaiting in the first place
};

export type AsyncSequence =
  | IONode
  | PromiseNode
  | AwaitNode
  | UnresolvedPromiseNode
  | UnresolvedAwaitNode;
