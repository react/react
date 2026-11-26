# SSR Fixtures

A set of test cases for quickly identifying issues with server-side rendering.

## Setup

To reference a local build of React, first run `npm run build` at the root
of the React project. Then:

```
cd fixtures/ssr2
yarn
yarn dev
```

The `dev` command runs a webpack dev server and a server-side rendering server in development mode with hot reloading.

**Note: whenever you make changes to React and rebuild it, restart the fixture.**
The `predev` and `prestart` scripts copy the local experimental build into this
fixture's `node_modules` before starting it.

If you want to try the production mode instead run:

```
yarn start
```

This will pre-build all static resources and then start a server-side rendering HTTP server that hosts the React app and service the static resources (without hot reloading).
