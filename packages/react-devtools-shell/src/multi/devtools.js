/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  activate as activateBackend,
  createBridge as createBackendBridge,
  initialize as initializeBackend,
} from 'react-devtools-inline/backend';
import {
  createBridge as createFrontendBridge,
  createStore,
  initialize as createDevTools,
} from 'react-devtools-inline/frontend';
import {__DEBUG__} from 'react-devtools-shared/src/constants';

function inject(contentDocument, sourcePath, callback) {
  const script = contentDocument.createElement('script');
  script.onload = callback;
  script.src = sourcePath;

  ((contentDocument.body: any): HTMLBodyElement).appendChild(script);
}

function init(appIframe, devtoolsContainer, appSource) {
  const {contentDocument, contentWindow} = appIframe;

  // Wire each DevTools instance directly to its app.
  // By default, DevTools dispatches "message" events on the window,
  // but this means that only one instance of DevTools can live on a page.
  const wall = {
    _listeners: [],
    listen(listener) {
      if (__DEBUG__) {
        console.log('[Shell] Wall.listen()');
      }

      wall._listeners.push(listener);
      return () => {
        const index = wall._listeners.indexOf(listener);
        if (index !== -1) {
          wall._listeners.splice(index, 1);
        }
      };
    },
    send(event, payload) {
      if (__DEBUG__) {
        console.log('[Shell] Wall.send()', {event, payload});
      }

      wall._listeners.forEach(listener => listener({event, payload}));
    },
  };

  const backendBridge = createBackendBridge(contentWindow, wall);

  initializeBackend(contentWindow);

  const frontendBridge = createFrontendBridge(contentWindow, wall);
  const store = createStore(frontendBridge);
  const DevTools = createDevTools(contentWindow, {
    bridge: frontendBridge,
    store,
  });

  inject(contentDocument, appSource, () => {
    createRoot(devtoolsContainer).render(<DevTools />);
  });

  activateBackend(contentWindow, {bridge: backendBridge});
}

const appIframeLeft = document.getElementById('iframe-left');
const appIframeRight = document.getElementById('iframe-right');
const devtoolsContainerLeft = document.getElementById('devtools-left');
const devtoolsContainerRight = document.getElementById('devtools-right');

init(appIframeLeft, devtoolsContainerLeft, 'dist/multi-left.js');
init(appIframeRight, devtoolsContainerRight, 'dist/multi-right.js');
