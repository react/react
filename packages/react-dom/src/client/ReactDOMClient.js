/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createRoot, hydrateRoot} from './ReactDOMRoot';

import {
  injectIntoDevTools,
  findHostInstance,
} from 'react-reconciler/src/ReactFiberReconciler';
import {canUseDOM} from 'shared/ExecutionEnvironment';
import ReactVersion from 'shared/ReactVersion';

import Internals from 'shared/ReactDOMSharedInternals';

import {ensureCorrectIsomorphicReactVersion} from '../shared/ensureCorrectIsomorphicReactVersion';
ensureCorrectIsomorphicReactVersion();

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
        'polyfill in older browsers. https://react.dev/link/react-polyfills',
    );
  }
}

function findDOMNode(
  componentOrElement: component(...props: any),
): null | Element | Text {
  return findHostInstance(componentOrElement);
}

// Expose findDOMNode on internals
Internals.findDOMNode = findDOMNode;

export {ReactVersion as version, createRoot, hydrateRoot};

const foundDevTools = injectIntoDevTools();

if (__DEV__) {
  if (!foundDevTools && canUseDOM && window.top === window.self) {
    // If we're in Chrome or Firefox, provide a download link if not installed.
    if (
      (navigator.userAgent.indexOf('Chrome') > -1 &&
        navigator.userAgent.indexOf('Edge') === -1) ||
      navigator.userAgent.indexOf('Firefox') > -1
    ) {
      const protocol = window.location.protocol;
      // Don't warn in exotic cases like chrome-extension://.
      if (/^(https?|file):$/.test(protocol)) {
        // eslint-disable-next-line react-internal/no-production-logging
        console.info(
          '%cDownload the React DevTools ' +
            'for a better development experience: ' +
            'https://react.dev/link/react-devtools' +
            (protocol === 'file:'
              ? '\nYou might need to use a local HTTP server (instead of file://): ' +
                'https://react.dev/link/react-devtools-faq'
              : ''),
          'font-weight:bold',
        );
      }
    }
  }
}
