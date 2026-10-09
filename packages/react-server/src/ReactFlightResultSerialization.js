/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Input} from './ReactFlightResultSerializationServer';
import type {ReactClientValue} from './ReactFlightResultServer';
import type {Result} from 'shared/ReactFlightResult';
import type {HintQueue} from 'shared/ReactFlightResult';
import {
  getRoot,
  getHintQueue,
  waitForHints,
  subscribeToResult,
} from 'shared/ReactFlightResult';
import noop from 'shared/noop';

export function createInput(result: Result<ReactClientValue>): Input {
  return {
    root: getRoot(result),
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
