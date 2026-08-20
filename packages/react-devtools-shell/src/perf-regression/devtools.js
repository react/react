import * as React from 'react';
import {createRoot} from 'react-dom/client';
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

function inject(contentDocument, sourcePath) {
  const script = contentDocument.createElement('script');
  script.src = sourcePath;

  ((contentDocument.body: any): HTMLBodyElement).appendChild(script);
}

function init(
  appSource: string,
  appIframe: HTMLIFrameElement,
  devtoolsContainer: HTMLElement,
  loadDevToolsButton: HTMLButtonElement,
) {
  const {contentDocument, contentWindow} = appIframe;

  initializeBackend(contentWindow);

  inject(contentDocument, appSource);

  loadDevToolsButton.addEventListener('click', () => {
    const DevTools = createDevTools(contentWindow);
    createRoot(devtoolsContainer).render(
      <DevTools
        hookNamesModuleLoaderFunction={hookNamesModuleLoaderFunction}
        showTabBar={true}
      />,
    );
    activateBackend(contentWindow);
  });
}

init(
  'dist/perf-regression-app.js',
  document.getElementById('iframe'),
  document.getElementById('devtools'),
  document.getElementById('load-devtools'),
);
