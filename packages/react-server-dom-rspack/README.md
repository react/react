# react-server-dom-rspack

React Server Components (RSC) runtime bindings for Rspack, intended for integration into frameworks and build tools.

## When to use

If you are building an application, we recommend using a framework or integration that provides RSC support with Rspack:

- [**TanStack Start**](https://tanstack.com/start/latest/docs/framework/react/guide/server-components) — using its Rsbuild integration.
- [**React Router with Rsbuild**](https://github.com/rstackjs/rsbuild-plugin-react-router) — through `rsbuild-plugin-react-router`.
- [**Modern.js**](https://modernjs.dev/guides/basic-features/render/rsc.html) — using its built-in RSC support.

Follow your framework's documentation for setup, supported dependency versions, and current RSC limitations.

## Framework integration

Use this package directly when building or maintaining an RSC framework or build-tool integration with Rspack. It provides runtime APIs for rendering and decoding RSC payloads and working with Server Functions.

For a complete integration with development and production configurations, see [rsbuild-plugin-rsc](https://github.com/rstackjs/rsbuild-plugin-rsc) and its [examples](https://github.com/rstackjs/rsbuild-plugin-rsc/tree/main/examples).

## Stability and versioning

This package is experimental. The underlying APIs used to implement RSC bundlers and frameworks may change between React minor releases. See the [React documentation on RSC framework support](https://react.dev/reference/rsc/server-components#how-do-i-build-support-for-server-components).

Use versions of `react`, `react-dom`, and `react-server-dom-rspack` that are supported by your framework or integration, and commit your lockfile. Keep the server and client RSC runtimes on the same version.
