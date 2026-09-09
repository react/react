/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';
import type {
  BootstrapScriptDescriptor,
  HeadersDescriptor,
} from 'react-dom-bindings/src/server/ReactFizzConfigDOM';
import type {PostponedState, ErrorInfo} from 'react-server/src/ReactFizzServer';
import type {ImportMap} from '../shared/ReactDOMTypes';

import {Writable, Readable} from 'stream';

import ReactVersion from 'shared/ReactVersion';

import {
  createPrerenderRequest,
  resumeAndPrerenderRequest,
  startWork,
  startFlowing,
  stopFlowing,
  abort,
  attachAbortSignal,
  getPostponedState,
  getFinalizedPostponedState,
} from 'react-server/src/ReactFizzServer';

import {
  createResumableState,
  createRenderState,
  resumeRenderState,
  createRootFormatContext,
} from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

import {textEncoder} from 'react-server/src/ReactServerStreamConfigNode';

import {ensureCorrectIsomorphicReactVersion} from '../shared/ensureCorrectIsomorphicReactVersion';
ensureCorrectIsomorphicReactVersion();

type NonceOption =
  | string
  | {
      script?: string,
      style?: string,
    };

type Options = {
  identifierPrefix?: string,
  namespaceURI?: string,
  bootstrapScriptContent?: string,
  bootstrapScripts?: Array<string | BootstrapScriptDescriptor>,
  bootstrapModules?: Array<string | BootstrapScriptDescriptor>,
  progressiveChunkSize?: number,
  signal?: AbortSignal,
  onError?: (error: mixed, errorInfo: ErrorInfo) => ?string,
  onBrowserBailout?: (error: mixed, errorInfo: ErrorInfo) => void,
  unstable_externalRuntimeSrc?: string | BootstrapScriptDescriptor,
  importMap?: ImportMap,
  onHeaders?: (headers: HeadersDescriptor) => void,
  maxHeadersLength?: number,
};

type StaticResultNode = {
  postponed: null | PostponedState,
  prelude: Readable,
};

type StaticResultWeb = {
  postponed: null | PostponedState,
  prelude: ReadableStream,
};

function createFakeWritableFromReadableStreamController(
  controller: ReadableStreamController,
): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return {
    write(chunk: string | Uint8Array) {
      if (typeof chunk === 'string') {
        chunk = textEncoder.encode(chunk);
      }
      controller.enqueue(chunk);
      // in web streams there is no backpressure so we can alwas write more
      return true;
    },
    end() {
      controller.close();
    },
    destroy(error) {
      // $FlowFixMe[method-unbinding]
      if (typeof controller.error === 'function') {
        // $FlowFixMe[incompatible-call]: This is an Error object or the destination accepts other types.
        controller.error(error);
      } else {
        controller.close();
      }
    },
  } as any;
}

function createFakeWritableFromReadable(readable: any): Writable {
  // The current host config expects a Writable so we create
  // a fake writable for now to push into the Readable.
  return {
    write(chunk) {
      return readable.push(chunk);
    },
    end() {
      readable.push(null);
    },
    destroy(error) {
      readable.destroy(error);
    },
  } as any;
}

function prerenderToNodeStream(
  children: ReactNodeList,
  options?: Options,
): Promise<StaticResultNode> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;

    function onAllReady() {
      const readable: Readable = new Readable({
        read() {
          startFlowing(request, writable);
        },
      });
      const writable = createFakeWritableFromReadable(readable);

      const result: StaticResultNode = {
        postponed: null,
        prelude: readable,
      };

      const postponed = getPostponedState(request);
      if (postponed !== null) {
        Object.defineProperty(result, 'postponed', {
          get: getFinalizedPostponedState.bind(null, request, postponed),
        });
      }

      resolve(result);
    }
    const resumableState = createResumableState(
      options ? options.identifierPrefix : undefined,
      options ? options.unstable_externalRuntimeSrc : undefined,
      options ? options.bootstrapScriptContent : undefined,
      options ? options.bootstrapScripts : undefined,
      options ? options.bootstrapModules : undefined,
    );
    const request = createPrerenderRequest(
      children,
      resumableState,
      createRenderState(
        resumableState,
        undefined, // nonce is not compatible with prerendered bootstrap scripts
        options ? options.unstable_externalRuntimeSrc : undefined,
        options ? options.importMap : undefined,
        options ? options.onHeaders : undefined,
        options ? options.maxHeadersLength : undefined,
      ),
      createRootFormatContext(options ? options.namespaceURI : undefined),
      options ? options.progressiveChunkSize : undefined,
      options ? options.onError : undefined,
      options ? options.onBrowserBailout : undefined,
      onAllReady,
      undefined,
      undefined,
      onFatalError,
    );
    if (options && options.signal) {
      attachAbortSignal(request, options.signal);
    }
    startWork(request);
  });
}

function prerender(
  children: ReactNodeList,
  options?: Omit<Options, 'onHeaders'> & {
    onHeaders?: (headers: Headers) => void,
  },
): Promise<StaticResultWeb> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;

    function onAllReady() {
      let writable: Writable;
      const stream = new ReadableStream(
        {
          type: 'bytes',
          start: (controller): ?Promise<void> => {
            writable =
              createFakeWritableFromReadableStreamController(controller);
          },
          pull: (controller): ?Promise<void> => {
            startFlowing(request, writable);
          },
          cancel: (reason): ?Promise<void> => {
            stopFlowing(request);
            abort(request, reason);
          },
        },
        // $FlowFixMe[incompatible-type]
        {highWaterMark: 0},
      );

      const result: StaticResultWeb = {
        postponed: null,
        prelude: stream,
      };

      const postponed = getPostponedState(request);
      if (postponed !== null) {
        Object.defineProperty(result, 'postponed', {
          get: getFinalizedPostponedState.bind(null, request, postponed),
        });
      }

      resolve(result);
    }

    const onHeaders = options ? options.onHeaders : undefined;
    let onHeadersImpl;
    if (onHeaders) {
      onHeadersImpl = (headersDescriptor: HeadersDescriptor) => {
        onHeaders(new Headers(headersDescriptor));
      };
    }
    const resources = createResumableState(
      options ? options.identifierPrefix : undefined,
      options ? options.unstable_externalRuntimeSrc : undefined,
      options ? options.bootstrapScriptContent : undefined,
      options ? options.bootstrapScripts : undefined,
      options ? options.bootstrapModules : undefined,
    );
    const request = createPrerenderRequest(
      children,
      resources,
      createRenderState(
        resources,
        undefined, // nonce is not compatible with prerendered bootstrap scripts
        options ? options.unstable_externalRuntimeSrc : undefined,
        options ? options.importMap : undefined,
        onHeadersImpl,
        options ? options.maxHeadersLength : undefined,
      ),
      createRootFormatContext(options ? options.namespaceURI : undefined),
      options ? options.progressiveChunkSize : undefined,
      options ? options.onError : undefined,
      options ? options.onBrowserBailout : undefined,
      onAllReady,
      undefined,
      undefined,
      onFatalError,
    );
    if (options && options.signal) {
      attachAbortSignal(request, options.signal);
    }
    startWork(request);
  });
}

type ResumeOptions = {
  nonce?: NonceOption,
  signal?: AbortSignal,
  onError?: (error: mixed, errorInfo: ErrorInfo) => ?string,
  onBrowserBailout?: (error: mixed, errorInfo: ErrorInfo) => void,
};

function resumeAndPrerenderToNodeStream(
  children: ReactNodeList,
  postponedState: PostponedState,
  options?: Omit<ResumeOptions, 'nonce'>,
): Promise<StaticResultNode> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;

    function onAllReady() {
      const readable: Readable = new Readable({
        read() {
          startFlowing(request, writable);
        },
      });
      const writable = createFakeWritableFromReadable(readable);

      const result: StaticResultNode = {
        postponed: null,
        prelude: readable,
      };

      const postponed = getPostponedState(request);
      if (postponed !== null) {
        Object.defineProperty(result, 'postponed', {
          get: getFinalizedPostponedState.bind(null, request, postponed),
        });
      }

      resolve(result);
    }
    const request = resumeAndPrerenderRequest(
      children,
      postponedState,
      resumeRenderState(postponedState.resumableState, undefined),
      options ? options.onError : undefined,
      options ? options.onBrowserBailout : undefined,
      onAllReady,
      undefined,
      undefined,
      onFatalError,
    );
    if (options && options.signal) {
      attachAbortSignal(request, options.signal);
    }
    startWork(request);
  });
}

function resumeAndPrerender(
  children: ReactNodeList,
  postponedState: PostponedState,
  options?: Omit<ResumeOptions, 'nonce'>,
): Promise<StaticResultWeb> {
  return new Promise((resolve, reject) => {
    const onFatalError = reject;

    function onAllReady() {
      let writable: Writable;
      const stream = new ReadableStream(
        {
          type: 'bytes',
          start: (controller): ?Promise<void> => {
            writable =
              createFakeWritableFromReadableStreamController(controller);
          },
          pull: (controller): ?Promise<void> => {
            startFlowing(request, writable);
          },
          cancel: (reason): ?Promise<void> => {
            stopFlowing(request);
            abort(request, reason);
          },
        },
        // $FlowFixMe[incompatible-type] size() methods are not allowed on byte streams.
        {highWaterMark: 0},
      );

      const result: StaticResultWeb = {
        postponed: null,
        prelude: stream,
      };

      const postponed = getPostponedState(request);
      if (postponed !== null) {
        Object.defineProperty(result, 'postponed', {
          get: getFinalizedPostponedState.bind(null, request, postponed),
        });
      }

      resolve(result);
    }

    const request = resumeAndPrerenderRequest(
      children,
      postponedState,
      resumeRenderState(postponedState.resumableState, undefined),
      options ? options.onError : undefined,
      options ? options.onBrowserBailout : undefined,
      onAllReady,
      undefined,
      undefined,
      onFatalError,
    );
    if (options && options.signal) {
      attachAbortSignal(request, options.signal);
    }
    startWork(request);
  });
}

export {
  prerender,
  prerenderToNodeStream,
  resumeAndPrerender,
  resumeAndPrerenderToNodeStream,
  ReactVersion as version,
};
