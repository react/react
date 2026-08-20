import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import {
  activate as activateBackend,
  initialize as initializeBackend,
} from 'react-devtools-inline/backend';
import {initialize as createDevTools} from 'react-devtools-inline/frontend';

// This is a pretty gross hack to make the runtime loaded named-hooks-code work.
// TODO (Webpack 5) Hoepfully we can remove this once we upgrade to Webpack 5.
__webpack_public_path__ = '/dist/'; // eslint-disable-line no-undef

// TODO (Webpack 5) Hopefully we can remove this prop after the Webpack 5 migration.
function hookNamesModuleLoaderFunction() {
  return import('react-devtools-inline/hookNames');
}

function inject(contentDocument, sourcePath, callback) {
  const script = contentDocument.createElement('script');
  script.onload = callback;
  script.src = sourcePath;

  ((contentDocument.body: any): HTMLBodyElement).appendChild(script);
}

function init(appIframe, devtoolsContainer, appSource) {
  const {contentDocument, contentWindow} = appIframe;

  initializeBackend(contentWindow);

  const DevTools = createDevTools(contentWindow);

  inject(contentDocument, appSource, () => {
    ReactDOMClient.createRoot(devtoolsContainer).render(
      <DevTools
        hookNamesModuleLoaderFunction={hookNamesModuleLoaderFunction}
        showTabBar={true}
      />,
    );
  });

  activateBackend(contentWindow);
}

const iframe = document.getElementById('iframe');
const devtoolsContainer = document.getElementById('devtools');

const {protocol, hostname} = window.location;
const port = 8181; // secondary webpack server port
init(
  iframe,
  devtoolsContainer,
  `${protocol}//${hostname}:${port}/dist/e2e-app-regression.js`,
);

// ReactDOM Test Selector APIs used by Playwright e2e tests
window.parent.REACT_DOM_DEVTOOLS =
  'createTestNameSelector' in ReactDOMClient ? ReactDOMClient : ReactDOM;
