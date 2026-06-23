/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';
import type {LazyComponent} from 'react/src/ReactLazy';
import type {ErrorInfo} from 'react-server/src/ReactFizzServer';

import ReactVersion from 'shared/ReactVersion';

import ReactSharedInternalsServer from 'react-server/src/ReactSharedInternalsServer';
import ReactSharedInternalsClient from 'shared/ReactSharedInternals';

import {
  createRequest as createFlightRequest,
  startWork as startFlightWork,
  startFlowing as startFlightFlowing,
  abort as abortFlight,
} from 'react-server/src/ReactFlightServer';

import {
  createResponse as createFlightResponse,
  createStreamState as createFlightStreamState,
  getRoot as getFlightRoot,
  processStringChunk as processFlightStringChunk,
  close as closeFlight,
} from 'react-client/src/ReactFlightClient';

import {
  createRequest as createFizzRequest,
  startWork as startFizzWork,
  startFlowing as startFizzFlowing,
  abort as abortFizz,
} from 'react-server/src/ReactFizzServer';

import {
  createResumableState,
  createRenderState,
  createRootFormatContext,
} from './ReactFizzConfigMarkup';

type ReactMarkupNodeList =
  // This is the intersection of ReactNodeList and ReactClientValue minus
  // Client/ServerReferences.
  | component(...props: any)
  | LazyComponent<ReactMarkupNodeList, any>
  | React$Element<string>
  | string
  | boolean
  | number
  | symbol
  | null
  | void
  | bigint
  | $AsyncIterable<ReactMarkupNodeList, ReactMarkupNodeList, void>
  | $AsyncIterator<ReactMarkupNodeList, ReactMarkupNodeList, void>
  | Iterable<ReactMarkupNodeList>
  | Iterator<ReactMarkupNodeList>
  | Array<ReactMarkupNodeList>
  | Promise<ReactMarkupNodeList>; // Thenable<ReactMarkupNodeList>

type MarkupOptions = {
  identifierPrefix?: string,
  signal?: AbortSignal,
  onError?: (error: mixed, errorInfo: ErrorInfo) => ?string,
};

function noServerCallOrFormAction() {
  throw new Error(
    'renderToHTML should not have emitted Server References. This is a bug in React.',
  );
}

export function experimental_renderToHTML(
  children: ReactMarkupNodeList,
  options?: MarkupOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const flightResponse = createFlightResponse(
      null,
      null,
      null,
      noServerCallOrFormAction,
      noServerCallOrFormAction,
      undefined,
      undefined,
      false,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
    );
    const streamState = createFlightStreamState(flightResponse, null);
    const flightDestination = {
      push(chunk: string | null): boolean {
        if (chunk !== null) {
          processFlightStringChunk(flightResponse, streamState, chunk);
        } else {
          closeFlight(flightResponse);
        }
        return true;
      },
      destroy(error: mixed): void {
        abortFizz(fizzRequest, error);
        reject(error);
      },
    };
    let buffer = '';
    const fizzDestination = {
      // $FlowFixMe[missing-local-annot]
      push(chunk) {
        if (chunk !== null) {
          buffer += chunk;
        } else {
          // null indicates that we finished
          resolve(buffer);
        }
        return true;
      },
      // $FlowFixMe[missing-local-annot]
      destroy(error) {
        abortFlight(flightRequest, error);
        reject(error);
      },
    };

    let stashErrorIdx = 1;
    const stashedErrors: Map<string, mixed> = new Map();

    function handleFlightError(error: mixed): string {
      // For Flight errors we don't immediately reject, because they might not matter
      // to the output of the HTML. We stash the error with a digest in case we need
      // to get to the original error from the Fizz render.
      const id = '' + stashErrorIdx++;
      stashedErrors.set(id, error);
      return id;
    }

    function handleError(error: mixed, errorInfo: ErrorInfo) {
      if (typeof error === 'object' && error !== null) {
        const id = error.digest;
        // Note that the original error might be `undefined` so we need a has check.
        if (typeof id === 'string' && stashedErrors.has(id)) {
          // Get the original error thrown inside Flight.
          error = stashedErrors.get(id);
        }
      }

      // Any error rejects the promise, regardless of where it happened.
      // Unlike other React SSR we don't want to put Suspense boundaries into
      // client rendering mode because there's no client rendering here.
      reject(error);

      const onError = options && options.onError;
      if (onError) {
        if (__DEV__) {
          const prevGetCurrentStackImpl =
            ReactSharedInternalsServer.getCurrentStack;
          // We're inside a "client" callback from Fizz but we only have access to the
          // "server" runtime so to get access to a stack trace within this callback we
          // need to override it to get it from the client runtime.
          ReactSharedInternalsServer.getCurrentStack =
            ReactSharedInternalsClient.getCurrentStack;
          try {
            onError(error, errorInfo);
          } finally {
            ReactSharedInternalsServer.getCurrentStack =
              prevGetCurrentStackImpl;
          }
        } else {
          onError(error, errorInfo);
        }
      }
    }
    const flightRequest = createFlightRequest(
      // $FlowFixMe[incompatible-type]: This should be a subtype but not everything is typed covariant.
      children,
      null,
      handleFlightError,
      options ? options.identifierPrefix : undefined,
      undefined,
      undefined,
      'Markup',
      undefined,
      false,
    );
    const resumableState = createResumableState(
      options ? options.identifierPrefix : undefined,
      undefined,
    );
    const root = getFlightRoot<ReactNodeList>(flightResponse);
    const fizzRequest = createFizzRequest(
      // $FlowFixMe[incompatible-type]: Thenables as children are supported.
      root,
      resumableState,
      createRenderState(
        resumableState,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ),
      createRootFormatContext(),
      Infinity,
      handleError,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        abortFlight(flightRequest, (signal as any).reason);
        abortFizz(fizzRequest, (signal as any).reason);
      } else {
        const listener = () => {
          abortFlight(flightRequest, (signal as any).reason);
          abortFizz(fizzRequest, (signal as any).reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
    startFlightWork(flightRequest);
    startFlightFlowing(flightRequest, flightDestination);
    startFizzWork(fizzRequest);
    startFizzFlowing(fizzRequest, fizzDestination);
  });
}

export {ReactVersion as version};
