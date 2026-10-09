/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Input,
  InputThenableReader,
  InputSequenceReader,
  InputAsyncIterableReader,
} from './ReactFlightResultSerializationServer';
import type {ReactClientValue} from './ReactFlightResultServer';
import type {AsyncIterableController} from 'shared/ReactFlightResultAsyncIterable';
import type {ResultStreamController} from 'shared/ReactFlightResultReadableStream';
import type {ErrorReference, Result} from 'shared/ReactFlightResult';
import type {HintQueue} from 'shared/ReactFlightResult';
import type {Thenable} from 'shared/ReactTypes';
import {getResultModelStatus} from 'shared/ReactFlightResultModel';
import {
  getRoot,
  getHintQueue,
  waitForHints,
  subscribeToResult,
  getErrorReference,
  getValueReference,
  getCollectionEntries,
  getAsyncIterable,
  getReadableStream,
  getIteratorEntries,
  getServerReference,
  getTemporaryReferenceSet,
  getModelInfo,
  isHalted,
} from 'shared/ReactFlightResult';
import noop from 'shared/noop';

function subscribeToThenable(
  result: Result<ReactClientValue>,
  thenable: Thenable<ReactClientValue> | Promise<ReactClientValue>,
  reader: InputThenableReader,
): () => void {
  if (isHalted(result, thenable)) {
    reader.halt();
    return noop;
  }
  const status = getResultModelStatus(thenable);
  if (status === 'fulfilled') {
    reader.resolve((thenable as any).value);
    return noop;
  }
  if (status === 'rejected') {
    reader.reject(
      (thenable as any).reason,
      getErrorReference(result, thenable),
    );
    return noop;
  }
  const subscription: {
    result: null | Result<ReactClientValue>,
    reader: null | InputThenableReader,
  } = {result, reader};
  let unsubscribe = noop;
  function detach(): void {
    subscription.result = null;
    subscription.reader = null;
    unsubscribe();
  }
  unsubscribe = subscribeToResult(result, () => {
    const current = subscription.reader;
    const source = subscription.result;
    if (current !== null && source !== null && isHalted(source, thenable)) {
      detach();
      current.halt();
    }
  });
  if (subscription.reader !== null) {
    thenable.then(
      value => {
        const current = subscription.reader;
        if (current !== null) {
          detach();
          current.resolve(value);
        }
      },
      error => {
        const current = subscription.reader;
        const source = subscription.result;
        if (current !== null && source !== null) {
          const reference = getErrorReference(source, thenable);
          detach();
          if (isHalted(source, thenable)) {
            current.halt();
          } else {
            current.reject(error, reference);
          }
        }
      },
    );
  }
  return detach;
}

export function createInput(result: Result<ReactClientValue>): Input {
  return {
    root: getRoot(result),
    temporaryReferences: getTemporaryReferenceSet(result),
    getReadableStream(value) {
      const source = getReadableStream(result, value);
      return source === undefined
        ? undefined
        : {
            isByteStream: source.isByteStream,
            subscribe: reader =>
              subscribeToSequence(result, value, source, reader),
          };
    },
    getAsyncIterable(value) {
      const source = getAsyncIterable(result, value);
      return source === undefined
        ? undefined
        : {
            isIterator: source.isIterator,
            subscribe: reader =>
              subscribeToAsyncIterable(result, value, source, reader),
          };
    },
    getIteratorEntries: value => getIteratorEntries(result, value),
    getServerReference: value => getServerReference(result, value),
    getValueReference: value => getValueReference(result, value),
    getModelInfo: value => getModelInfo(result, value),
    getCollectionEntries: value => getCollectionEntries(result, value),
    subscribeToThenable: (thenable, reader) =>
      subscribeToThenable(result, thenable, reader),
    subscribe(reader) {
      const subscription: {
        queue: null | HintQueue,
        reader: null | typeof reader,
      } = {queue: getHintQueue(result), reader};
      let nextHintIndex = 0;
      let unsubscribe = noop;
      function detach(): void {
        subscription.queue = null;
        subscription.reader = null;
        unsubscribe();
      }
      function flushHints(): void {
        const queue = subscription.queue;
        const current = subscription.reader;
        if (queue === null || current === null) {
          return;
        }
        const hints = queue.completedHints;
        while (nextHintIndex < hints.length && subscription.reader !== null) {
          const hint = hints[nextHintIndex++];
          current.hint(hint.code, hint.model);
        }
        if (!queue.closed) {
          waitForHints(queue).then(flushHints);
        }
      }
      unsubscribe = subscribeToResult(result, () => {
        const current = subscription.reader;
        if (current !== null) {
          flushHints();
          detach();
          current.complete();
        }
      });
      flushHints();
      return detach;
    },
  };
}

function subscribeToSequence(
  result: Result<any>,
  model: Object,
  source: ResultStreamController<any>,
  reader: InputSequenceReader,
): () => void {
  const entries: Array<Promise<any>> = [];
  let nextEntryIndex = 0;
  let reading = false;
  let draining = false;
  let active = true;
  let finish: null | (() => void) = null;
  let unsubscribeSource = noop;
  let unsubscribeEntry = noop;

  function detach(): void {
    active = false;
    entries.length = 0;
    unsubscribeSource();
    unsubscribeEntry();
  }

  function error(reason: mixed, reference: void | ErrorReference): void {
    if (active) {
      detach();
      reader.error(reason, reference);
    }
  }

  function halt(): void {
    if (active) {
      detach();
      reader.halt();
    }
  }

  function readNext(): void {
    if (!active || reading || draining) {
      return;
    }
    draining = true;
    try {
      while (active && !reading) {
        if (nextEntryIndex >= entries.length) {
          if (finish !== null) {
            finish();
          }
          break;
        }
        const entry = entries[nextEntryIndex++];
        if (nextEntryIndex === entries.length) {
          entries.length = 0;
          nextEntryIndex = 0;
        }
        reading = true;
        const unsubscribe = subscribeToThenable(result, entry, {
          resolve(value) {
            if (!active) {
              return;
            }
            reading = false;
            unsubscribeEntry = noop;
            reader.progress({value});
            readNext();
          },
          reject(reason, reference) {
            if (!active) {
              return;
            }
            reading = false;
            unsubscribeEntry = noop;
            reader.rejectEntry(reason, reference);
            readNext();
          },
          halt,
        });
        if (!active || !reading) {
          unsubscribe();
        } else {
          unsubscribeEntry = unsubscribe;
        }
      }
    } finally {
      draining = false;
    }
  }

  unsubscribeSource = source.subscribe({
    enqueue(entry) {
      if (active) {
        entries.push(entry);
        readNext();
      }
    },
    close() {
      finish = () => {
        detach();
        reader.progress({done: true, value: undefined});
      };
      readNext();
    },
    error(reason) {
      finish = () => error(reason, getErrorReference(result, model));
      readNext();
    },
    halt() {
      finish = halt;
      readNext();
    },
  });
  if (!active) {
    unsubscribeSource();
  }
  return detach;
}

function subscribeToAsyncIterable(
  result: Result<any>,
  model: Object,
  source: AsyncIterableController<any>,
  reader: InputAsyncIterableReader,
): () => void {
  return source.subscribe({
    enqueue: reader.enqueue,
    close: reader.close,
    error: reason => reader.error(reason, getErrorReference(result, model)),
    halt: reader.halt,
  });
}
