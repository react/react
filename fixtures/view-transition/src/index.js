import React from 'react';
import {hydrateRoot} from 'react-dom/client';

import App from './components/App.js';

hydrateRoot(
  document,
  <App
    assets={window.assetManifest}
    initialURL={document.location.pathname + document.location.search}
  />
);
