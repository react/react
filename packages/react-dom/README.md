# `react-dom`

This package serves as the entry point to the DOM and server renderers for React. It is intended to be paired with the generic React package, which is shipped as `react` to npm.

## Installation

```sh
npm install react react-dom
```

## Usage

### In the browser

```js
import { createRoot } from 'react-dom/client';

function App() {
  return <div>Hello World</div>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

### On the server

```js
import { renderToPipeableStream } from 'react-dom/server';

function App() {
  return <div>Hello World</div>;
}

function handleRequest(res) {
  // ... in your server handler ...
  const stream = renderToPipeableStream(<App />, {
    onShellReady() {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');
      stream.pipe(res);
    },
    // ...
  });
}
```

## Debugging hydration mismatches

If you see a hydration mismatch error like "Hydration failed because the server rendered HTML didn't match the client" in the console or via `onRecoverableError`, it usually means the HTML from the server is different from what React renders first in the browser.

### Common causes

- Values that change every time, like `Math.random()` or `Date.now()`.
- Conditional rendering based on browser-only APIs (for example `typeof window !== 'undefined'`) that produces different HTML on server and browser.
- Data is different on the server and browser during the first render.
- Invalid HTML structure that the browser auto-fixes.
- Third-party scripts changing the DOM before hydration finishes.

### Quick debugging checklist

1. Reproduce the issue in development and check the first hydration error in the console.
2. Add `onRecoverableError` to `hydrateRoot` and log `error.message` and `errorInfo.componentStack`.
3. Narrow it down by removing parts of the UI until the error goes away.
4. Replace changing render-time values with fixed values.
5. Move browser-only logic into `useEffect` so the first browser render matches the server HTML.
6. Make sure the initial data on server and browser is the same.

### Problem example

```js
function App() {
  return <div>{Math.random()}</div>;
}
```

This will usually cause a mismatch because server and browser generate different numbers.

### Safer pattern

```js
import { useEffect, useState } from 'react';

function App() {
  const [value, setValue] = useState(null);

  useEffect(() => {
    setValue(Math.random());
  }, []);

  return <div>{value ?? 'Loading...'}</div>;
}
```

### Instrumentation tip

```js
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App />, {
  onRecoverableError(error, errorInfo) {
    console.error('Hydration recoverable error:', error.message);
    console.error(errorInfo.componentStack);
  },
});
```

This helps you find which component caused the mismatch, especially in bigger apps.

## API

### `react-dom`

See https://react.dev/reference/react-dom

### `react-dom/client`

See https://react.dev/reference/react-dom/client

### `react-dom/server`

See https://react.dev/reference/react-dom/server
