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

export type StreamReader<T> = SequenceReader<T>;

export type ResultStreamController<T> = {
  stream: Object,
  isByteStream: boolean,
  subscribe: (StreamReader<T>) => () => void,
  enqueue: (Promise<T>) => void,
  close: () => void,
  error: mixed => void,
  halt: () => void,
};

export function closeReadableStream(
  controller: ReadableStreamController,
  isByteStream: boolean,
): void {
  try {
    controller.close();
    if (isByteStream) {
      const byobRequest: null | {respond(number): void} = (controller as any)
        .byobRequest;
      if (byobRequest !== null) {
        byobRequest.respond(0);
      }
    }
  } catch (error) {
    controller.error(error as any);
  }
}

export function createReadableStream<T>(
  isByteStream: boolean,
): ResultStreamController<T> {
  const sequence = createSequence<T>();
  return {
    stream: sequence.model,
    isByteStream,
    subscribe: sequence.subscribe,
    enqueue: sequence.enqueue,
    close: sequence.close,
    error: sequence.error,
    halt: sequence.halt,
  };
}
