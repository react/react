/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes.js';
import type {
  Response as FlightResponse,
  FindSourceMapURLCallback,
} from 'react-client/src/ReactFlightClient';
import type {ReactServerValue} from 'react-client/src/ReactFlightReplyClient';

import {
  createResponse,
  getRoot,
  reportGlobalError,
  processBinaryChunk,
  close,
  injectIntoDevTools,
} from 'react-client/src/ReactFlightClient';

import {processReply} from 'react-client/src/ReactFlightReplyClient';

export {
  createServerReference,
  registerServerReference,
} from 'react-client/src/ReactFlightReplyClient';

import type {TemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';

export {createTemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';
export type {TemporaryReferenceSet};

import type {ServerConsumerModuleMap} from '../client/ReactFlightClientConfigBundlerVite';

function startReadingFromStream(
  response: FlightResponse,
  stream: ReadableStream,
): void {
  const reader = stream.getReader();
  function progress({
    done,
    value,
  }: {
    done: boolean,
    value: ?any,
    ...
  }): void | Promise<void> {
    if (done) {
      close(response);
      return;
    }
    const buffer: Uint8Array = (value: any);
    processBinaryChunk(response, buffer);
    return reader.read().then(progress).catch(error);
  }
  function error(e: any) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress).catch(error);
}

type CallServerCallback = <A, T>(string, args: A) => Promise<T>;

export type Options = {
  clientManifest: ServerConsumerModuleMap,
  callServer?: CallServerCallback,
  temporaryReferences?: TemporaryReferenceSet,
  findSourceMapURL?: FindSourceMapURLCallback,
  replayConsoleLogs?: boolean,
  environmentName?: string,
};

export function createFromReadableStream<T>(
  stream: ReadableStream,
  options: Options,
): Thenable<T> {
  const response: FlightResponse = createResponse(
    options.clientManifest,
    null,
    null, // moduleLoading
    options && options.callServer ? options.callServer : undefined,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
  );
  startReadingFromStream(response, stream);
  return getRoot(response);
}

export function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options: Options,
): Thenable<T> {
  const response: FlightResponse = createResponse(
    options.clientManifest,
    null, // serverReferenceConfig
    null, // moduleLoading
    options && options.callServer ? options.callServer : undefined,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
  );
  promiseForResponse.then(
    function (r) {
      startReadingFromStream(response, (r.body: any));
    },
    function (e) {
      reportGlobalError(response, e);
    },
  );
  return getRoot(response);
}

export function encodeReply(
  value: ReactServerValue,
  options?: {temporaryReferences?: TemporaryReferenceSet, signal?: AbortSignal},
): Promise<
  string | URLSearchParams | FormData,
> /* We don't use URLSearchParams yet but maybe */ {
  return new Promise((resolve, reject) => {
    const abort = processReply(
      value,
      '', // formFieldPrefix
      options && options.temporaryReferences
        ? options.temporaryReferences
        : undefined,
      resolve,
      reject,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        abort((signal: any).reason);
      } else {
        const listener = () => {
          abort((signal: any).reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
  });
}

if (__DEV__) {
  injectIntoDevTools();
}
