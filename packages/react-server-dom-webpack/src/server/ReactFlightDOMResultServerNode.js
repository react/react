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
import type {TemporaryReferenceSet} from 'react-server/src/ReactFlightServerTemporaryReferences';
import {registerServerReference} from '../ReactFlightWebpackReferences';
import noop from 'shared/noop';
import type {Result} from 'shared/ReactFlightResult';
import type {
  Options as SerializationOptions,
  PipeableStream,
} from './ReactFlightDOMResultSerializationServerNode';
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

// $FlowFixMe[method-unbinding]
const FunctionBind = Function.prototype.bind;
// $FlowFixMe[method-unbinding]
const ArraySlice = Array.prototype.slice;

function createServerReference(
  reference: Function,
  bound: Promise<Array<any>>,
): Function {
  // $FlowFixMe[incompatible-type]
  const copy = FunctionBind.call(reference, null);
  registerServerReference(copy, (reference as any).$$id, null);
  Object.defineProperties(copy, {
    $$bound: {value: bound},
    bind: {value: bindServerReference},
  });
  return copy;
}

function bindServerReference(this: any): Function {
  if (__DEV__) {
    if (arguments[0] != null) {
      console.error(
        'Cannot bind "this" of a Server Action. Pass null or undefined as the first argument to .bind().',
      );
    }
  }
  // $FlowFixMe[incompatible-type]
  const copy = FunctionBind.apply(this, arguments);
  const args = ArraySlice.call(arguments, 1);
  const bound = Promise.resolve(this.$$bound).then(values =>
    values.concat(args),
  );
  bound.catch(noop);
  registerServerReference(copy, this.$$id, null);
  Object.defineProperties(copy, {
    $$bound: {value: bound},
    bind: {value: bindServerReference},
  });
  return copy;
}

type Options = {
  onError?: mixed => ?string,
  signal?: AbortSignal,
  identifierPrefix?: string,
  temporaryReferences?: TemporaryReferenceSet,
  environmentName?: string | (() => string),
  filterStackFrame?: (url: string, functionName: string) => boolean,
  startTime?: number,
};

export function renderToResult(
  model: ReactClientValue,
  options?: Options,
): Result<ReactClientValue> {
  const request = createRequest(
    model,
    options ? options.onError : undefined,
    options ? options.identifierPrefix : undefined,
    options ? options.temporaryReferences : undefined,
    createServerReference,
    __DEV__ && options ? options.environmentName : undefined,
    __DEV__ && options ? options.filterStackFrame : undefined,
    __DEV__ && options ? options.startTime : undefined,
  );
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
      options ? options.identifierPrefix : undefined,
      options ? options.temporaryReferences : undefined,
      createServerReference,
      __DEV__ && options ? options.environmentName : undefined,
      __DEV__ && options ? options.filterStackFrame : undefined,
      __DEV__ && options ? options.startTime : undefined,
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
  options?: SerializationOptions,
): PipeableStream {
  const input = createInput(result);
  return renderToPipeableStream(input, webpackMap, options);
}

export function renderResultToReadableStream(
  result: mixed,
  webpackMap: mixed,
  options?: mixed,
): empty {
  throw new Error('Not implemented.');
}
