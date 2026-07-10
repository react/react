# Fixture app

A small React app for manually exercising the `react-devtools-cdt-mcp` tools with
[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp).
Not part of the published package.

It renders a variety of components so every tool has something to inspect:
function/host/context/memo/forwardRef nodes, a custom hook (nested `subHooks`),
keyed list items, and timer/button components that re-render (for profiling).

Like `react-devtools-shell`, React (and the DevTools backend dependencies the
facade uses) are resolved from the monorepo build output via webpack aliases, so
the fixture runs against React from source — no CDN copy, and
`react_get_component_by_uid` hooks inspection matches the build exactly.

## Run

1. Build React for DevTools from the repo root (populates
   `build/oss-experimental/`):

   ```sh
   yarn build-for-devtools
   ```

2. Start the fixture dev server (bundles the package source + this app):

   ```sh
   cd packages/react-devtools-cdt-mcp/fixtures/app
   yarn start
   ```

   This opens `http://localhost:8080/`.

3. Point chrome-devtools-mcp at the page. The React tool group is discovered
   automatically — list it with `list_3p_developer_tools` and call the tools with
   `execute_3p_developer_tool({toolName, params})`.

## Test with the chrome-devtools-mcp CLI

With the dev server running, drive the tools end-to-end from the CLI:

1. Start chrome-devtools-mcp with experimental third-party tools enabled:

   ```sh
   chrome-devtools start --categoryExperimentalThirdParty=true
   ```

2. Navigate to the fixture page:

   ```sh
   chrome-devtools navigate_page --url http://localhost:8080
   ```

3. Run a React tool by name:

   ```sh
   chrome-devtools execute_3p_developer_tool <react-tool-name>
   ```
