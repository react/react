// Import the package source first so it installs the DevTools hook and registers
// the chrome-devtools-mcp tool group BEFORE react-dom evaluates — the hook must
// be in place when React's renderer injects on the first commit.
import '../../src/index.js';

import * as React from 'react';
import {createRoot} from 'react-dom/client';

import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
