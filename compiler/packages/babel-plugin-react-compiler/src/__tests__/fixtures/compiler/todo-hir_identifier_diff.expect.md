
## Input

```javascript
// HIR Pattern: IDENTIFIER_DIFF (20 files, 6%)
// Extra identifier in Rust's context/params for jest.mock factory functions

/**
 * @flow strict-local
 */
/* eslint-disable no-shadow */
jest.mock('RouterRootContextFactory.react', () => {
  const React = require('react');
  const tracePolicyCtxMod: any = jest.requireActual();
  return function MockRouterRootContextFactory(props: {
    children: React.Node,
    routeInfo: {},
  }) {
    return <div>{props.children}</div>;
  };
});

```

## Code

```javascript
import { c as mock_c } from "react/compiler-runtime"; // HIR Pattern: IDENTIFIER_DIFF (20 files, 6%)
// Extra identifier in Rust's context/params for jest.mock factory functions

/**
 * @flow strict-local
 */
/* eslint-disable no-shadow */
jest.mock("RouterRootContextFactory.react", () => {
  const $ = mock_c(1);
  require("react");
  jest.requireActual();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function MockRouterRootContextFactory(props) {
      return <div>{props.children}</div>;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
});

```
      