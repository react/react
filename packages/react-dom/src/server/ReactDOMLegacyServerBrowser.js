/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import {version, renderToStringImpl} from './ReactDOMLegacyServerImpl';

type ServerOptions = {
  identifierPrefix?: string,
};

function renderToString(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(
    children,
    options,
    false,
    'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server',
  );
}

function renderToStaticMarkup(
  children: ReactNodeList,
  options?: ServerOptions,
): string {
  return renderToStringImpl(
    children,
    options,
    true,
    'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server',
  );
}

export {renderToString, renderToStaticMarkup, version};
