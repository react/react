/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Writable} from 'stream';
import type {
  Input,
  Request,
} from 'react-server/src/ReactFlightResultSerializationServer';
import {
  createRequest,
  startWork,
  startFlowing,
  stopFlowing,
  abort,
} from 'react-server/src/ReactFlightResultSerializationServer';

export type PipeableStream = {
  pipe<T: Writable>(destination: T): T,
  abort(reason: mixed): void,
};

function createDrainHandler(destination: Writable, request: Request) {
  return () => startFlowing(request, destination);
}

function createCancelHandler(request: Request, reason: string) {
  return () => {
    stopFlowing(request);
    abort(request, new Error(reason));
  };
}

export function renderToPipeableStream(input: Input): PipeableStream {
  const request = createRequest(input);
  let hasStartedFlowing = false;
  startWork(request);
  return {
    pipe<T: Writable>(destination: T): T {
      if (hasStartedFlowing) {
        throw new Error(
          'React currently only supports piping to one writable stream.',
        );
      }
      hasStartedFlowing = true;
      startFlowing(request, destination);
      destination.on('drain', createDrainHandler(destination, request));
      destination.on(
        'error',
        createCancelHandler(
          request,
          'The destination stream errored while writing data.',
        ),
      );
      destination.on(
        'close',
        createCancelHandler(request, 'The destination stream closed early.'),
      );
      return destination;
    },
    abort(reason: mixed) {
      abort(request, reason);
    },
  };
}
