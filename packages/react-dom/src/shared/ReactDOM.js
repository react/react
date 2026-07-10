/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import ReactVersion from 'shared/ReactVersion';

import {isValidContainer} from 'react-dom-bindings/src/client/ReactDOMContainer';
import {createPortal as createPortalImpl} from 'react-reconciler/src/ReactPortal';
import {flushSync} from './ReactDOMFlushSync';

import {
  prefetchDNS,
  preconnect,
  preload,
  preloadModule,
  preinit,
  preinitModule,
} from './ReactDOMFloat';
import {
  requestFormReset,
  useFormStatus,
  useFormState,
} from 'react-dom-bindings/src/shared/ReactDOMFormActions';

if (__DEV__) {
  if (
    typeof Map !== 'function' ||
    // $FlowFixMe[prop-missing] Flow incorrectly thinks Map has no prototype
    Map.prototype == null ||
    typeof Map.prototype.forEach !== 'function' ||
    typeof Set !== 'function' ||
    // $FlowFixMe[prop-missing] Flow incorrectly thinks Set has no prototype
    Set.prototype == null ||
    typeof Set.prototype.clear !== 'function' ||
    typeof Set.prototype.forEach !== 'function'
  ) {
    console.error(
      'React depends on Map and Set built-in types. Make sure that you load a ' +
        'polyfill in older browsers. https://reactjs.org/link/react-polyfills',
    );
  }
}

function batchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  // batchedUpdates is now just a passthrough noop
  return fn(a);
}

function createPortal(
  children: ReactNodeList,
  container: Element | DocumentFragment,
  key: ?string = null,
): React$Portal {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  // TODO: pass ReactDOM portal implementation as third argument
  // $FlowFixMe[incompatible-type] The Flow type is opaque but there's no way to actually create it.
  return createPortalImpl(children, container, null, key);
}

export {
  ReactVersion as version,
  createPortal,
  flushSync,
  batchedUpdates as unstable_batchedUpdates,
  prefetchDNS,
  preconnect,
  preload,
  preloadModule,
  preinit,
  preinitModule,
  requestFormReset,
  useFormStatus,
  useFormState,
};
