/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from './ReactElementType';
import type {RenderContext} from './ReactFlightRenderContext';
import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import type {
  TaintEntry,
  RequestCleanupQueue,
} from 'react/src/ReactTaintRegistry';
import noop from './noop';
import {getIteratorFn} from './ReactSymbols';

// A Result is a model whose Server Components run at most once, no matter
// how many consumers read it. The model itself is left alone. For every
// Server Component element a consumer reaches, the Result keeps a task that
// renders it; the serializer and the in-process reader both read the task's
// value instead of calling the component again.
//
// The Result is created on the server and read by consumers in another
// module graph (the SSR bundle), which can't import react-server. The few
// things that need the server's internals, like running a component under
// its hooks dispatcher, are functions the server puts on the Result.

// Result task status. These are the statuses React's use() understands, so a
// consumer can suspend on a task like on any other thenable.
export const PENDING = 'pending';
export const FULFILLED = 'fulfilled';
export const REJECTED = 'rejected';

export type ResultTask = {
  status: 'pending' | 'fulfilled' | 'rejected',
  // The component's return value as is. Each consumer applies its own
  // conventions for thenables and iterators in return position.
  value: any,
  reason: mixed,
  // The element this task renders.
  model: ReactElement,
  ping: () => void,
  thenableState: mixed,
  _listeners: null | Array<[(value: any) => mixed, (reason: mixed) => mixed]>,
  then(resolve: (value: any) => mixed, reject: (reason: mixed) => mixed): void,
};

// $FlowFixMe[missing-this-annot]
function ResultTask(model: ReactElement, ping: () => void) {
  this.status = PENDING;
  this.value = undefined;
  this.reason = undefined;
  this.model = model;
  this.ping = ping;
  this.thenableState = null;
  this._listeners = null;
}
// We subclass Promise.prototype so that we get other methods like .catch
ResultTask.prototype = Object.create(Promise.prototype) as any;
// TODO: This doesn't return a new Promise chain unlike the real .then
function resultTaskThen(
  this: ResultTask,
  resolve: (value: any) => mixed,
  reject: (reason: mixed) => mixed,
) {
  const task: ResultTask = this;
  switch (task.status) {
    case FULFILLED:
      resolve(task.value);
      break;
    case REJECTED:
      reject(task.reason);
      break;
    default: {
      let listeners = task._listeners;
      if (listeners === null) {
        task._listeners = listeners = [];
      }
      listeners.push([resolve, reject]);
    }
  }
}
Object.defineProperty(ResultTask.prototype, 'then', {
  writable: true,
  enumerable: true,
  configurable: true,
  value: resultTaskThen,
});

export function createResultTask(
  result: Result<any>,
  model: ReactElement,
): ResultTask {
  // $FlowFixMe[invalid-constructor]
  const task: ResultTask = new ResultTask(model, () =>
    result.retryTask(result, task),
  );
  return task;
}

export function fulfillResultTask(task: ResultTask, value: mixed): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = FULFILLED;
  task.value = value;
  const listeners = task._listeners;
  if (listeners !== null) {
    task._listeners = null;
    for (let i = 0; i < listeners.length; i++) {
      listeners[i][0](value);
    }
  }
}

export function rejectResultTask(task: ResultTask, reason: mixed): void {
  if (task.status !== PENDING) {
    return;
  }
  task.status = REJECTED;
  task.reason = reason;
  const listeners = task._listeners;
  if (listeners !== null) {
    task._listeners = null;
    for (let i = 0; i < listeners.length; i++) {
      listeners[i][1](reason);
    }
  }
}

const RESULT_TYPE = Symbol.for('react.flight.result');

// The server's taint registries, for the in-process reader to reject a
// tainted value with. They're keyed by the values themselves, so the
// reader can use them from its own module graph.
export type TaintRegistries = {
  objects: WeakMap<{...} | Function, string>,
  values: Map<string | bigint, TaintEntry>,
  byteLengths: Set<number>,
  pendingRequests: Set<RequestCleanupQueue>,
};

export type Result<T> = {
  $$typeof: symbol,
  model: T,
  context: RenderContext,
  tasks: WeakMap<ReactElement, ResultTask>,
  // Server-owned. Runs a task's Server Component, under the Result's render
  // context and hooks dispatcher.
  retryTask: (result: Result<any>, task: ResultTask) => void,
  // Tasks whose component hasn't returned yet, to reject if the Result is
  // aborted.
  abortableTasks: Set<ResultTask>,
  // Aborted when the Result is. Every consumer listens to it. The cache
  // signal is a different one, since it also ends once the last consumer is
  // done, and a consumer may start after that.
  abortController: AbortController,
  // How many consumers are reading the Result. The cache signal stays open
  // until the last one is done.
  consumers: number,
  // Single-shot iterators, streams and async iterables found in the model,
  // read once and served to every consumer.
  iteratorEntries: null | WeakMap<Object, Array<mixed>>,
  replays: null | WeakMap<Object, Replay>,
  onError: (error: mixed) => ?string,
  // The digest each error was reported with, by the first consumer to see
  // it. The others use the same digest without reporting it again, so an
  // error in a Server Component is reported once per Result, like once per
  // request on the wire.
  errorDigests: WeakMap<Object, string>,
  temporaryReferences: void | TemporaryReferenceSet,
  // Server-owned. Null unless enableTaint.
  taintRegistries: TaintRegistries,
  // DEV-only
  environmentName: () => string,
  filterStackFrame: (
    url: string,
    functionName: string,
    lineNumber: number,
    columnNumber: number,
  ) => boolean,
};

export function isResult(value: mixed): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as any).$$typeof === RESULT_TYPE
  );
}

// Allocated through a constructor for the same reason the render context
// is: a Result lives for a whole render, and an object literal that always
// survives gets pretenured, after which it pins every task's output in old
// space until a major GC.
// $FlowFixMe[missing-this-annot]
function ResultInstance(
  model: any,
  context: RenderContext,
  retryTask: (result: Result<any>, task: ResultTask) => void,
  onError: (error: mixed) => ?string,
  temporaryReferences: void | TemporaryReferenceSet,
) {
  this.$$typeof = RESULT_TYPE;
  this.model = model;
  this.context = context;
  this.tasks = new WeakMap();
  this.retryTask = retryTask;
  this.abortableTasks = new Set();
  this.abortController = new AbortController();
  this.consumers = 0;
  this.iteratorEntries = null;
  this.replays = null;
  this.onError = onError;
  this.errorDigests = new WeakMap();
  this.temporaryReferences = temporaryReferences;
  this.taintRegistries = null;
  this.environmentName = null;
  this.filterStackFrame = null;
}

export function createResultObject<T>(
  model: T,
  context: RenderContext,
  retryTask: (result: Result<any>, task: ResultTask) => void,
  onError: (error: mixed) => ?string,
  temporaryReferences: void | TemporaryReferenceSet,
): Result<T> {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new ResultInstance(
    model,
    context,
    retryTask,
    onError,
    temporaryReferences,
  );
}

// The task rendering this Server Component element. The first consumer to
// reach the element starts it; every consumer after that gets the same task.
export function getResultTask(
  result: Result<any>,
  element: ReactElement,
): ResultTask {
  const tasks = result.tasks;
  let task = tasks.get(element);
  if (task === undefined) {
    task = createResultTask(result, element);
    tasks.set(element, task);
    result.retryTask(result, task);
  }
  return task;
}

export function retainResult(result: Result<any>): void {
  result.consumers++;
}

// Once the last consumer is done, the cache signal aborts so that any
// pending work tied to it can clean up, like at the end of a request.
export function releaseResult(result: Result<any>, reason: mixed): void {
  if (--result.consumers === 0) {
    result.context.cacheController.abort(reason);
  }
}

// A ReadableStream or async iterable in the model can only be read once, but
// every consumer of the Result needs its values. The first consumer to reach
// one starts pulling it into a replay buffer owned by the Result. Each
// consumer then reads a fresh stream or iterable fed from that buffer. The
// original is cancelled if the Result aborts, as it would be when a request
// aborts. The last consumer finishing doesn't cancel it: a consumer that
// starts later still needs the rest of it.

export type ReplayEntry = {+value: mixed, +done: boolean};

// Replay status
export const REPLAY_OPEN = 0;
export const REPLAY_CLOSED = 1;
export const REPLAY_ERRORED = 2;

export type Replay = {
  entries: Array<ReplayEntry>,
  status: 0 | 1 | 2,
  error: mixed,
  // Whether the original stream was a byte stream, in which case the copies
  // are byte streams too.
  isByteStream: boolean,
  // Whether the original async iterable was its own iterator, in which case
  // it is single-shot and the copies are iterators too.
  isIterator: boolean,
  listeners: null | Array<() => void>,
};

function createReplay(isByteStream: boolean, isIterator: boolean): Replay {
  return {
    entries: [],
    status: REPLAY_OPEN,
    error: undefined,
    isByteStream,
    isIterator,
    listeners: null,
  };
}

function wakeReplay(replay: Replay): void {
  const listeners = replay.listeners;
  if (listeners !== null) {
    replay.listeners = null;
    for (let i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  }
}

// Calls back once the replay has something at `index`, or has closed or
// errored.
export function waitForReplay(
  replay: Replay,
  index: number,
  listener: () => void,
): void {
  if (index < replay.entries.length || replay.status !== REPLAY_OPEN) {
    listener();
    return;
  }
  let listeners = replay.listeners;
  if (listeners === null) {
    replay.listeners = listeners = [];
  }
  listeners.push(listener);
}

function pushReplayEntry(replay: Replay, value: mixed, done: boolean): void {
  if (replay.status !== REPLAY_OPEN) {
    return;
  }
  replay.entries.push({value, done});
  if (done) {
    replay.status = REPLAY_CLOSED;
  }
  wakeReplay(replay);
}

function errorReplay(replay: Replay, error: mixed): void {
  if (replay.status !== REPLAY_OPEN) {
    return;
  }
  replay.status = REPLAY_ERRORED;
  replay.error = error;
  wakeReplay(replay);
}

export function getStreamReplay(
  result: Result<any>,
  stream: ReadableStream,
): Replay {
  let replays = result.replays;
  if (replays === null) {
    result.replays = replays = new WeakMap();
  }
  const existing = replays.get(stream);
  if (existing !== undefined) {
    return existing;
  }
  // Detect if this is a BYOB stream. BYOB streams should be able to be read as bytes on the
  // receiving side. It also implies that different chunks can be split up or merged as opposed
  // to a readable stream that happens to have Uint8Array as the type which might expect it to be
  // received in the same slices.
  // $FlowFixMe[prop-missing]: This is a Node.js extension.
  let supportsBYOB: void | boolean = stream.supportsBYOB;
  if (supportsBYOB === undefined) {
    try {
      // $FlowFixMe[extra-arg]: This argument is accepted.
      stream.getReader({mode: 'byob'}).releaseLock();
      supportsBYOB = true;
    } catch (x) {
      supportsBYOB = false;
    }
  }
  const replay = createReplay(supportsBYOB === true, false);
  replays.set(stream, replay);
  const reader = stream.getReader();
  const signal = result.abortController.signal;
  function progress(entry: {done: boolean, value: mixed, ...}) {
    if (replay.status !== REPLAY_OPEN) {
      return;
    }
    pushReplayEntry(replay, entry.value, entry.done);
    if (entry.done) {
      signal.removeEventListener('abort', abortStream);
    } else {
      reader.read().then(progress, error);
    }
  }
  function error(reason: mixed) {
    if (replay.status !== REPLAY_OPEN) {
      return;
    }
    signal.removeEventListener('abort', abortStream);
    errorReplay(replay, reason);
    // $FlowFixMe[incompatible-type] should be able to pass mixed
    reader.cancel(reason).then(noop, noop);
  }
  function abortStream() {
    error(signal.reason);
  }
  signal.addEventListener('abort', abortStream);
  reader.read().then(progress, error);
  return replay;
}

export function getAsyncIterableReplay(
  result: Result<any>,
  iterable: Object,
  getAsyncIterator: () => $AsyncIterator<any, any, any>,
): Replay {
  let replays = result.replays;
  if (replays === null) {
    result.replays = replays = new WeakMap();
  }
  const existing = replays.get(iterable);
  if (existing !== undefined) {
    return existing;
  }
  const iterator = getAsyncIterator.call(iterable);
  // Generators/Iterators are Iterables but they're also their own iterator
  // functions. If that's the case, we treat them as single-shot.
  const replay = createReplay(false, iterator === iterable);
  replays.set(iterable, replay);
  const signal = result.abortController.signal;
  function progress(
    entry: {done: false, +value: mixed, ...} | {done: true, +value: mixed, ...},
  ) {
    if (replay.status !== REPLAY_OPEN) {
      return;
    }
    pushReplayEntry(replay, entry.value, entry.done);
    if (entry.done) {
      signal.removeEventListener('abort', abortIterable);
    } else {
      iterator.next().then(progress, error);
    }
  }
  function error(reason: mixed) {
    if (replay.status !== REPLAY_OPEN) {
      return;
    }
    signal.removeEventListener('abort', abortIterable);
    errorReplay(replay, reason);
    if (typeof (iterator as any).throw === 'function') {
      // The iterator protocol doesn't necessarily include this but a generator do.
      // $FlowFixMe[prop-missing] should be able to pass mixed
      iterator.throw(reason).then(noop, noop);
    }
  }
  function abortIterable() {
    error(signal.reason);
  }
  signal.addEventListener('abort', abortIterable);
  iterator.next().then(progress, error);
  return replay;
}

// A fresh ReadableStream over the replay.
export function createReplayReadableStream(replay: Replay): ReadableStream {
  let index = 0;
  function pull(controller: any): Promise<void> {
    return new Promise(resolve => {
      waitForReplay(replay, index, () => {
        if (index < replay.entries.length) {
          const entry = replay.entries[index++];
          if (entry.done) {
            controller.close();
          } else if (replay.isByteStream) {
            // Enqueuing into a byte stream detaches the buffer, and the other
            // consumers hold the same view, so each one gets a copy.
            const view: $ArrayBufferView = entry.value as any;
            controller.enqueue(
              new Uint8Array(
                view.buffer.slice(
                  view.byteOffset,
                  view.byteOffset + view.byteLength,
                ),
              ),
            );
          } else {
            controller.enqueue(entry.value);
          }
        } else if (replay.status === REPLAY_ERRORED) {
          controller.error(replay.error);
        } else {
          controller.close();
        }
        resolve();
      });
    });
  }
  if (replay.isByteStream) {
    // $FlowFixMe[incompatible-call]
    return new ReadableStream({type: 'bytes', pull});
  }
  return new ReadableStream({pull});
}

function asyncIterator(this: $AsyncIterator<any, any, void>) {
  return this;
}

// A fresh async iterable over the replay, or an async iterator if the
// original was single-shot.
export function createReplayAsyncIterable(
  replay: Replay,
): $AsyncIterable<any, any, void> {
  const iterable: any = {};
  iterable[Symbol.asyncIterator] = () => {
    let index = 0;
    const iterator: any = {
      next(arg: void): Promise<IteratorResult<any, any>> {
        if (arg !== undefined) {
          throw new Error(
            'Values cannot be passed to next() of AsyncIterables passed to Client Components.',
          );
        }
        return new Promise((resolve, reject) => {
          waitForReplay(replay, index, () => {
            if (index < replay.entries.length) {
              const entry = replay.entries[index++];
              resolve({done: entry.done, value: entry.value} as any);
            } else if (replay.status === REPLAY_ERRORED) {
              reject(replay.error);
            } else {
              resolve({done: true, value: undefined});
            }
          });
        });
      },
    };
    iterator[Symbol.asyncIterator] = asyncIterator;
    return iterator;
  };
  return replay.isIterator ? iterable[Symbol.asyncIterator]() : iterable;
}

// Whether an iterator is its own iterable, like a generator object, and so
// can only be iterated once.
export function isSingleShotIterator(iterator: any): boolean {
  if (typeof iterator.next !== 'function') {
    return false;
  }
  const iteratorFn = getIteratorFn(iterator);
  return (
    typeof iteratorFn === 'function' && iteratorFn.call(iterator) === iterator
  );
}

// A single-shot iterator in the model is drained by the first consumer to
// reach it; every consumer reads the entries.
export function getIteratorEntries(
  result: Result<any>,
  iterator: Object,
): Array<mixed> {
  let entries = result.iteratorEntries;
  if (entries === null) {
    result.iteratorEntries = entries = new WeakMap();
  }
  let items = entries.get(iterator);
  if (items === undefined) {
    items = Array.from(iterator as any);
    entries.set(iterator, items);
  }
  return items;
}
