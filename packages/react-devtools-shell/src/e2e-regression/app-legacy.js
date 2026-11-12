/** @flow */

// This test harness mounts each test app as a separate root to test multi-root applications.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import ListApp from '../e2e-apps/ListApp';
import ListAppLegacy from '../e2e-apps/ListAppLegacy';
import {gte} from 'react-devtools-shared/src/backend/utils';

const version = process.env.E2E_APP_REACT_VERSION;

function mountApp(App: () => React$Node) {
  const container = document.createElement('div');

  (document.body as any as HTMLBodyElement).appendChild(container);

  // $FlowFixMe[prop-missing]: These are removed in 19.
  ReactDOM.render(<App />, container);
}
function mountTestApp() {
  // ListApp has hooks, which aren't available until 16.8.0
  mountApp(gte(version, '16.8.0') ? ListApp : ListAppLegacy);
}

mountTestApp();

// ReactDOM Test Selector APIs used by Playwright e2e tests
// If they don't exist, we mock them
window.parent.REACT_DOM_APP = {
  createTestNameSelector: name => `[data-testname="${name}"]`,
  findAllNodes: (container, nodes) =>
    container.querySelectorAll(nodes.join(' ')),
  ...ReactDOM,
};
