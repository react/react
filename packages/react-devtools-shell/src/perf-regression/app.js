/** @flow */

// This test harness mounts each test app as a separate root to test multi-root applications.

import * as React from 'react';
import {createRoot} from 'react-dom/client';
import App from './apps/index';

function mountApp() {
  const container = document.createElement('div');

  (document.body as any as HTMLBodyElement).appendChild(container);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

mountApp();
