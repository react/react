# react-devtools-cdt-mcp

Integrates React tools with
[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp).

Importing this package **before React** installs the DevTools hook and registers
a React tool group via chrome-devtools-mcp's `devtoolstooldiscovery` / `__dtmcp`
third-party-tool protocol. The React tools then become discoverable and callable
inside a chrome-devtools-mcp session — no separate server.

## Usage

Import the package **before** React so the hook is installed before React
initializes:

```js
import 'react-devtools-cdt-mcp';
import React from 'react';
```

When the page runs under chrome-devtools-mcp, the React tools are listed by
`list_3p_developer_tools` and callable either via
`execute_3p_developer_tool({toolName, params})` or directly via `evaluate_script`
(`window.__dtmcp.executeTool(toolName, params)`).

## Conventions

- **UIDs** — components are identified by a stable uid like `r5`. UIDs
  are consistent across every tool and across re-renders. These UIDs don't survive page reloads.
- **Output** — every tool returns the shape described below as a plain
  JavaScript value. On failure a tool returns `{error: string}` instead.
- **Durations** — profiler durations are in milliseconds, or `null` when the
  build does not collect profiling timing.

## Tools

### `react_get_component_tree`

Snapshot of the component tree.

- **Input:** `depth?` (number, max depth, default 20), `rootUid?` (string,
  start from this component).
- **Output:** `{nodes}` where `nodes` is an array of
  `{uid, type, name, key, firstChild, nextSibling}`. `firstChild` and
  `nextSibling` reference other nodes by uid (or are `null`).

### `react_get_component_by_uid`

Detailed info for a single component.

- **Input:** `uid` (string, required), `includeHooks?` (boolean, default
  `false`).
- **Output:** `{uid, type, name, key?, props?, hooks?}`. `props` excludes
  children and is normalized to a serialization-safe shape; when `includeHooks`
  is true, `hooks` (function, forwardRef, and memo components) is an array of
  `{id, name, value, subHooks}`.

### `react_get_component_by_dom_element`

Detailed info for the React DOM component corresponding to a DOM element.

- **Input:** `element` (object, required). This is an opaque page-side DOM
  element reference. Chrome DevTools MCP clients pass this as
  `{uid: string}`, using an element uid from the page snapshot.
- **Output:** `{uid, type, name, key?, props?, hooks?}`.

### `react_find_components`

Find components by case-insensitive name substring.

- **Input:** `name` (string, required), `rootUid?` (string, limit to subtree),
  `page?` (number, default 1), `pageSize?` (number, default 10).
- **Output:** `{page, pageSize, totalCount, totalPages, results}` where
  `results` is an array of tree nodes (same shape as `react_get_component_tree`).

### `react_get_component_source`

Definition source location of a component.

- **Input:** `uid` (string, required).
- **Output:** `{source: {name, fileName, line, column}}`, or `{source: null}`
  when the location cannot be determined (e.g. host components, production
  builds).

### `react_get_owner_stack_trace`

Raw owner stack trace — the chain of JSX creation locations up to the root.

- **Input:** `uid` (string, required).
- **Output:** `{stack: string}` (DEV-only; empty in production).

### `react_get_owner_stack`

Structured owner list — which components rendered this one.

- **Input:** `uid` (string, required).
- **Output:** an array of `{uid, name, type}`, ordered from immediate owner to
  root ancestor (empty for a root component). DEV-only.

### `react_start_profiling`

Start a profiling session that records per-commit render timing.

- **Input:** `traceName?` (string, trace name; auto-generated if omitted).
- **Output:** `{status: "started", traceName}`.

### `react_stop_profiling`

Stop the active profiling session.

- **Input:** none.
- **Output:** `{status: "stopped", traceName, commits}` (`commits` is the number of
  commits recorded).

### `react_get_trace_overview`

Per-commit overview of a recorded trace.

- **Input:** `traceName` (string, required).
- **Output:** array of
  `{commit, committedAt, renderDuration, layoutDuration, passiveDuration, componentsChanged}`,
  one row per commit.

### `react_get_commit_report`

Detailed report for a single commit.

- **Input:** `traceName` (string, required), `commitIndex` (number, required;
  zero-based).
- **Output:**
  `{committedAt, priority, renderDuration, layoutDuration, passiveDuration, components}`
  where `components` is an array of
  `{uid, name, type, actualDuration, selfDuration}` sorted by `actualDuration`
  descending.
