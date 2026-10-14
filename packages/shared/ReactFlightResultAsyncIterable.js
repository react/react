/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {SequenceReader} from './ReactFlightResultSequence';
import {createSequence} from './ReactFlightResultSequence';

export type AsyncIterableController<T> = {
  iterable: Object,
  isIterator: boolean,
  subscribe: (SequenceReader<T>) => () => void,
  enqueue: (Promise<T>) => void,
  close: (Promise<T>) => void,
  error: mixed => void,
  halt: () => void,
};

export function createAsyncIterable<T>(
  isIterator: boolean,
): AsyncIterableController<T> {
  const sequence = createSequence<T>();
  return {
    iterable: sequence.model,
    isIterator,
    subscribe: sequence.subscribe,
    enqueue: sequence.enqueue,
    close(model) {
      sequence.enqueue(model, true);
      sequence.close();
    },
    error: sequence.error,
    halt: sequence.halt,
  };
}
