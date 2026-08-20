
## Input

```javascript
const {getNumber} = require('shared-runtime');

function Component(props) {
  let x;
  // Two scopes: one for `getNumber()`, one for the object literal.
  // Neither has dependencies so they should merge
  if (props.cond) {
    x = {session_id: getNumber()};
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { getNumber } = require("shared-runtime");

function Component(props) {
  const $ = _c(1);
  let x;

  if (props.cond) {
    let t0;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = { session_id: getNumber() };
      $[0] = t0;
    } else {
      t0 = $[0];
    }
    x = t0;
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) {"session_id":4}