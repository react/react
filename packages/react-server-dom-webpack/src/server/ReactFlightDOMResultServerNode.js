/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Request,
  ReactClientValue,
} from 'react-server/src/ReactFlightResultServer';
import type {Result} from 'shared/ReactFlightResult';
import type {PipeableStream} from './ReactFlightDOMResultSerializationServerNode';
import type {ClientManifest} from './ReactFlightServerConfigWebpackBundler';
import {
  createRequest,
  createPrerenderRequest,
  getResult,
  startWork,
  attachAbortSignal,
} from 'react-server/src/ReactFlightResultServer';
import {createInput} from 'react-server/src/ReactFlightResultSerialization';
import {renderToPipeableStream} from './ReactFlightDOMResultSerializationServerNode';

type Options = {onError?: mixed => ?string, signal?: AbortSignal};

export function renderToResult(
  model: ReactClientValue,
  options?: Options,
): Result<ReactClientValue> {
  const request = createRequest(model, options ? options.onError : undefined);
  startWork(request);
  if (options && options.signal) {
    attachAbortSignal(request, options.signal);
  }
  return getResult(request);
}

export function prerenderToResult(
  model: ReactClientValue,
  options?: Options,
): Promise<Result<ReactClientValue>> {
  return new Promise((resolve, reject) => {
    const request: Request = createPrerenderRequest(
      model,
      () => resolve(getResult(request)),
      reject,
      options ? options.onError : undefined,
    );
    startWork(request);
    const signal = options ? options.signal : undefined;
    if (signal) {
      attachAbortSignal(request, signal);
    }
  });
}

export function renderResultToPipeableStream(
  result: Result<ReactClientValue>,
  webpackMap: ClientManifest,
  options?: Options,
): PipeableStream {
  const input = createInput(result);
  return renderToPipeableStream(
    input,
    webpackMap,
    options ? options.onError : undefined,
  );
}

export function renderResultToReadableStream(
  result: mixed,
  webpackMap: mixed,
  options?: mixed,
): empty {
  throw new Error('Not implemented.');
}
