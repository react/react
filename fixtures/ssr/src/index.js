import React from 'react';
import {Profiler} from 'react';
import {hydrateRoot} from 'react-dom/client';

import App from './components/App';

hydrateRoot(
  document,
  <Profiler id="root">
    <App assets={window.assetManifest} />
  </Profiler>
);
