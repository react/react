/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type SourceParsingStatus = {
  pending: number,
  completed: number,
  mapped: number,
  unmapped: number,
  dropped: number,
};
export const EMPTY_SOURCE_PARSING_STATUS: SourceParsingStatus = {
  pending: 0,
  completed: 0,
  mapped: 0,
  unmapped: 0,
  dropped: 0,
};

type Task<T> = {
  run: (() => boolean) => Promise<T>,
  resolve: (T | null) => void,
  cancelled: boolean,
};

// One running task plus a bounded FIFO. Yield to the browser before starting
// work, so all effects in a commit can enqueue and source priority takes effect.
export default function createSourceMapTaskQueue<T>(
  limit: number = 32,
  onStatusChange: () => void = () => {},
) {
  const pendingTasks = new WeakMap();
  let active: Task<T> | null = null;
  let waiting: Array<Task<T>> = [];
  let scheduled = null;
  let status: SourceParsingStatus = EMPTY_SOURCE_PARSING_STATUS;
  function updateStatus(changes: $Shape<SourceParsingStatus> = {}) {
    status = {
      ...status,
      ...changes,
      pending: waiting.length + (active === null ? 0 : 1),
    };
    onStatusChange();
  }

  function drain() {
    if (active !== null || scheduled !== null || waiting.length === 0) return;
    scheduled = setTimeout(() => {
      scheduled = null;
      const task = waiting.shift();
      active = task;
      Promise.resolve()
        .then(() => (task.cancelled ? null : task.run(() => !task.cancelled)))
        .then(
          result => finish(task, result),
          () => finish(task, null),
        );
    }, 0);
  }

  function finish(task: Task<T>, result: T | null) {
    task.resolve(task.cancelled ? null : result);
    if (active === task) {
      active = null;
      updateStatus({
        completed: status.completed + 1,
        mapped: status.mapped + (result === null ? 0 : 1),
        unmapped: status.unmapped + (result === null ? 1 : 0),
      });
      drain();
    }
  }

  return {
    getStatus: () => status,
    enqueue(
      run: (() => boolean) => Promise<T>,
      priority: boolean = false,
    ): Promise<T | null> {
      const capacity = active === null ? limit + 1 : limit;
      if (waiting.length >= capacity) {
        if (!priority || waiting.length === 0) {
          updateStatus({dropped: status.dropped + 1});
          return Promise.resolve(null);
        }
        const dropped = waiting.pop();
        dropped.cancelled = true;
        dropped.resolve(null);
        updateStatus({dropped: status.dropped + 1});
      }
      let task;
      const promise = new Promise(resolve => {
        task = {run, resolve, cancelled: false};
        if (priority) waiting.unshift(task);
        else waiting.push(task);
        updateStatus();
        drain();
      });
      pendingTasks.set(promise, task);
      return promise;
    },
    promote(promise: Promise<T | null>): boolean {
      const task = pendingTasks.get(promise);
      if (task == null || task.cancelled) return false;
      if (active === task) return true;
      const index = waiting.indexOf(task);
      if (index < 0) return false;
      waiting.splice(index, 1);
      waiting.unshift(task);
      return true;
    },
    cancel() {
      clearTimeout(scheduled);
      scheduled = null;
      if (active !== null) {
        active.cancelled = true;
        active.resolve(null);
        active = null;
      }
      waiting.forEach(task => {
        task.cancelled = true;
        task.resolve(null);
      });
      waiting = [];
      status = EMPTY_SOURCE_PARSING_STATUS;
      onStatusChange();
    },
  };
}
