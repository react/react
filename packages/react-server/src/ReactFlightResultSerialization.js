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
} from './ReactFlightResultSerializationServer';
import type {ReactClientValue} from './ReactFlightResultServer';
import type {Result} from 'shared/ReactFlightResult';
import type {HintQueue} from 'shared/ReactFlightResult';
import type {ResultModel} from 'shared/ReactFlightResultModel';
import {
  getRoot,
  getHintQueue,
  waitForHints,
  subscribeToResult,
  getErrorReference,
  getValueReference,
  getCollectionEntries,
  getIteratorEntries,
  getServerReference,
  getTemporaryReferenceSet,
  getModelInfo,
  isHalted,
} from 'shared/ReactFlightResult';
import noop from 'shared/noop';

function subscribeToThenable(
  result: Result<ReactClientValue>,
  thenable: ResultModel<ReactClientValue>,
  reader: InputThenableReader,
): () => void {
  if (isHalted(result, thenable)) {
    reader.halt();
    return noop;
  }
  if (thenable.status === 'fulfilled') {
    reader.resolve(thenable.value as any);
    return noop;
  }
  if (thenable.status === 'rejected') {
    reader.reject(thenable.reason, getErrorReference(result, thenable));
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
