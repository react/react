# react-devtools-facade

Experimental, private package that defines building blocks for querying React runtime state.

The facade installs the `__REACT_DEVTOOLS_GLOBAL_HOOK__` that React looks for at
initialization time — enabling fiber-root tracking without the overhead of the
full DevTools backend — and exposes a small, framework-agnostic library API that
integrators compose into tools.

This package is intentionally low-level. It does **not** install any tool
globals and it does **not** decide how tools are surfaced. It installs the hook,
tracks fiber roots, and hands back building blocks; the integrator (for example,
a `chrome-devtools-mcp` integration) decides everything else — including whether
to expose anything else on globals.

## API

### `installFacade(target = globalThis): Facade`

Installs `__REACT_DEVTOOLS_GLOBAL_HOOK__` on `target` and returns a `Facade`
handle holding the hook plus the runtime state it tracks (`fiberRoots`,
`rendererInternals`, `profilingState`). Building blocks read from the returned
`Facade`; they never reach for globals.

Call this **before** React initializes so the hook captures the first commit:

```js
import {installFacade} from 'react-devtools-facade';

const facade = installFacade();
// ...load React, render your app...
```

`installFacade` installs **only** the DevTools hook. It does not install
`__REACT_TOOLS__`, `__REACT_LLM_TOOLS__`, or any other global. Once the tool
building blocks land, an integrator composes them from the returned `Facade` and
decides whether to expose anything on globals.
