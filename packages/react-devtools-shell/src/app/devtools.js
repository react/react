/** @flow */

import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {
  activate as activateBackend,
  initialize as initializeBackend,
} from 'react-devtools-inline/backend';
import {initialize as initializeFrontend} from 'react-devtools-inline/frontend';
import {initDevTools} from 'react-devtools-shared/src/devtools';

// This is a pretty gross hack to make the runtime loaded named-hooks-code work.
// TODO (Webpack 5) Hopefully we can remove this once we upgrade to Webpack 5.
// $FlowFixMe[cannot-resolve-name]
__webpack_public_path__ = '/dist/'; // eslint-disable-line no-undef

const iframe = document.getElementById('target') as any as HTMLIFrameElement;

const {contentDocument, contentWindow} = iframe;

// Helps with positioning Overlay UI.
contentWindow.__REACT_DEVTOOLS_TARGET_WINDOW__ = window;

initializeBackend(contentWindow);

// Initialize the front end and activate the backend early so that we are able
// to pass console settings in local storage to the backend before initial render
const DevTools = initializeFrontend(contentWindow);

// Activate the backend only once the DevTools frontend Store has been initialized.
// Otherwise the Store may miss important initial tree op codes.
activateBackend(contentWindow);

const container = document.getElementById('devtools') as any as HTMLElement;

let isTestAppMounted = true;

const mountButton = document.getElementById(
  'mountButton',
) as any as HTMLButtonElement;
mountButton.addEventListener('click', function () {
  if (isTestAppMounted) {
    if (typeof window.unmountTestApp === 'function') {
      window.unmountTestApp();
      mountButton.innerText = 'Mount test app';
      isTestAppMounted = false;
    }
  } else {
    if (typeof window.mountTestApp === 'function') {
      window.mountTestApp();
      mountButton.innerText = 'Unmount test app';
      isTestAppMounted = true;
    }
  }
});

// TODO (Webpack 5) Hopefully we can remove this prop after the Webpack 5 migration.
function hookNamesModuleLoaderFunction() {
  return import('react-devtools-inline/hookNames');
}

inject('dist/app-index.js', () => {
  initDevTools({
    connect(cb) {
      const root = createRoot(container);
      root.render(
        createElement(DevTools, {
          browserTheme: 'light',
          enabledInspectedElementContextMenu: true,
          hookNamesModuleLoaderFunction,
          showTabBar: true,
          warnIfLegacyBackendDetected: true,
          warnIfUnsupportedVersionDetected: true,
        }),
      );
    },

    onReload(reloadFn) {
      iframe.onload = reloadFn;
    },
  });
});

function inject(sourcePath: string, callback: () => void) {
  const script = contentDocument.createElement('script');
  script.onload = callback;
  script.src = sourcePath;

  (contentDocument.body as any as HTMLBodyElement).appendChild(script);
}
