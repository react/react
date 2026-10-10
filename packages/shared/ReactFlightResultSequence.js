/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type SequenceReader<T> = {
  enqueue: (Promise<T>, boolean) => void,
  close: () => void,
  error: mixed => void,
  halt: () => void,
};

export type SequenceController<T> = {
  model: Object,
  subscribe: (SequenceReader<T>) => () => void,
  enqueue: (Promise<T>, done?: boolean) => void,
  close: () => void,
  error: mixed => void,
  halt: () => void,
};

const SequencePrototype = {};

export function createSequence<T>(): SequenceController<T> {
  const models: Array<{model: Promise<T>, done: boolean}> = [];
  const readers: Set<SequenceReader<T>> = new Set();
  let status = 0;
  let errorReason: mixed;
  function finish(nextStatus: number, reason: mixed): void {
    if (status !== 0) {
      return;
    }
    status = nextStatus;
    errorReason = reason;
    readers.forEach(reader => {
      if (status === 1) {
        reader.close();
      } else if (status === 2) {
        reader.error(reason);
      } else {
        reader.halt();
      }
    });
    readers.clear();
  }
  return {
    model: Object.create(SequencePrototype),
    subscribe(reader) {
      for (let i = 0; i < models.length; i++) {
        const entry = models[i];
        reader.enqueue(entry.model, entry.done);
      }
      if (status === 0) {
        readers.add(reader);
      } else if (status === 1) {
        reader.close();
      } else if (status === 2) {
        reader.error(errorReason);
      } else {
        reader.halt();
      }
      return () => {
        readers.delete(reader);
      };
    },
    enqueue(model, done = false) {
      if (status === 0) {
        models.push({model, done});
        readers.forEach(reader => reader.enqueue(model, done));
      }
    },
    close() {
      finish(1, undefined);
    },
    error(reason) {
      finish(2, reason);
    },
    halt() {
      finish(3, undefined);
    },
  };
}
