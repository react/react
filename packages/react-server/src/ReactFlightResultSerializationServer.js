/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ResultModel} from 'shared/ReactFlightResultModel';
import type {
  ReactClientValue,
  ReactClientObject,
} from './ReactFlightResultServer';
import type {ReactElement} from 'shared/ReactElementType';
import type {Chunk, Destination} from './ReactServerStreamConfig';
import {
  beginWriting,
  writeChunkAndReturn,
  completeWriting,
  flushBuffered,
  close,
  closeWithError,
  stringToChunk,
} from './ReactServerStreamConfig';
import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';
import isArray from 'shared/isArray';
import hasOwnProperty from 'shared/hasOwnProperty';

const OPENING = 10;
const CLOSING = 13;
const CLOSED = 14;

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | Array<ReactClientValue>
  | ReactClientObject;
type ModelParent = ReactClientObject | $ReadOnlyArray<ReactClientValue>;

export type Input = {+root: ResultModel<ReactClientValue>};
export type Request = {
  input: Input,
  destination: null | Destination,
  status: 10 | 13 | 14,
  fatalError: mixed,
  completedRegularChunks: Array<Chunk>,
  pendingChunks: number,
};

function RequestInstance(this: any, input: Input) {
  this.input = input;
  this.destination = null;
  this.status = OPENING;
  this.fatalError = null;
  this.completedRegularChunks = [];
  this.pendingChunks = 1;
}

export function createRequest(input: Input): Request {
  // $FlowFixMe[invalid-constructor] Flow doesn't support functions as constructors
  return new RequestInstance(input);
}

function renderClientElement(
  type: string,
  key: null | string,
  props: ReactClientValue,
  validated: number,
): ReactJSONValue {
  return __DEV__
    ? [REACT_ELEMENT_TYPE, type, key, props, null, null, validated]
    : [REACT_ELEMENT_TYPE, type, key, props];
}

function serializeNumber(number: number): string | number {
  if (Number.isFinite(number)) {
    if (number === 0 && 1 / number === -Infinity) {
      return '$-0';
    } else {
      return number;
    }
  } else {
    if (number === Infinity) {
      return '$Infinity';
    } else if (number === -Infinity) {
      return '$-Infinity';
    } else {
      return '$NaN';
    }
  }
}

function serializeUndefined(): string {
  return '$undefined';
}

function renderModelDestructive(
  request: Request,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
): ReactJSONValue {
  if (value === null) {
    return null;
  }
  if (typeof value === 'object') {
    if ((value as any).$$typeof === REACT_ELEMENT_TYPE) {
      const element: ReactElement = value as any;
      return renderClientElement(
        element.type,
        element.key,
        element.props,
        __DEV__ ? element._store.validated : 0,
      );
    }
    return value as any;
  }
  if (typeof value === 'string') {
    return value[0] === '$' ? '$' + value : value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  if (typeof value === 'undefined') {
    return serializeUndefined();
  }
  if (
    value === REACT_ELEMENT_TYPE &&
    parentPropertyName === '0' &&
    isArray(parent)
  ) {
    return '$';
  }
  throw new Error('Not implemented.');
}

function resolveModel(
  request: Request,
  parent: ModelParent,
  parentPropertyName: string,
  value: ReactClientValue,
): ReactJSONValue {
  const rendered = renderModelDestructive(
    request,
    parent,
    parentPropertyName,
    value,
  );
  if (rendered === null || typeof rendered !== 'object') {
    return rendered;
  }
  if (isArray(rendered)) {
    let resolved: null | Array<ReactClientValue> = null;
    for (let i = 0; i < rendered.length; i++) {
      const child = rendered[i];
      const resolvedValue = resolveModel(request, rendered, '' + i, child);
      if (resolved === null && resolvedValue !== child) {
        resolved = i === 0 ? [] : rendered.slice(0, i);
      }
      if (resolved !== null) {
        resolved[i] = resolvedValue;
      }
    }
    return resolved === null ? rendered : resolved;
  }
  let resolved: null | {[key: string]: ReactClientValue} = null;
  for (const key in rendered) {
    if (hasOwnProperty.call(rendered, key)) {
      const child = rendered[key];
      const resolvedValue = resolveModel(request, rendered, key, child);
      if (resolved === null && resolvedValue !== child) {
        resolved = {} as {[key: string]: ReactClientValue};
        for (const previousKey in rendered) {
          if (previousKey === key) {
            break;
          }
          if (hasOwnProperty.call(rendered, previousKey)) {
            if (previousKey === '__proto__') {
              Object.defineProperty(resolved, previousKey, {
                value: rendered[previousKey],
                enumerable: true,
                writable: true,
                configurable: true,
              });
            } else {
              resolved[previousKey] = rendered[previousKey];
            }
          }
        }
      }
      if (resolved !== null) {
        if (key === '__proto__') {
          Object.defineProperty(resolved, key, {
            value: resolvedValue,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        } else {
          resolved[key] = resolvedValue;
        }
      }
    }
  }
  return resolved === null ? rendered : resolved;
}

function emitModelChunk(request: Request, id: number, json: string): void {
  const row = id.toString(16) + ':' + json + '\n';
  const processedChunk = stringToChunk(row);
  request.completedRegularChunks.push(processedChunk);
}

function fatalError(request: Request, error: mixed): void {
  const destination = request.destination;
  if (destination !== null) {
    request.status = CLOSED;
    closeWithError(destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
  }
}

function flushCompletedChunks(request: Request): void {
  const destination = request.destination;
  if (destination === null) {
    return;
  }
  beginWriting(destination);
  try {
    const regularChunks = request.completedRegularChunks;
    let i = 0;
    for (; i < regularChunks.length; i++) {
      request.pendingChunks--;
      const keepWriting = writeChunkAndReturn(destination, regularChunks[i]);
      if (!keepWriting) {
        request.destination = null;
        i++;
        break;
      }
    }
    regularChunks.splice(0, i);
  } finally {
    completeWriting(destination);
  }
  flushBuffered(destination);
  if (request.pendingChunks === 0) {
    request.status = CLOSED;
    close(destination);
  }
}

export function startWork(request: Request): void {
  request.input.root.then(
    model => {
      if (request.status === CLOSED) {
        return;
      }
      try {
        const resolvedModel = resolveModel(request, {'': model}, '', model);
        const json = JSON.stringify(resolvedModel);
        emitModelChunk(request, 0, json);
        flushCompletedChunks(request);
      } catch (error) {
        fatalError(request, error);
      }
    },
    error => fatalError(request, error),
  );
}

export function startFlowing(request: Request, destination: Destination): void {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }
  if (request.status === CLOSED || request.destination !== null) {
    return;
  }
  request.destination = destination;
  try {
    flushCompletedChunks(request);
  } catch (error) {
    fatalError(request, error);
  }
}

export function stopFlowing(request: Request): void {
  request.destination = null;
}

export function abort(request: Request, reason: mixed): void {
  if (request.status !== CLOSED) {
    fatalError(request, reason);
  }
}
