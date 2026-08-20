
## Input

```javascript
const {getNumber, identity} = require('shared-runtime');

function Component(props) {
  // Two scopes: one for `getNumber()`, one for the object literal.
  // Neither has dependencies so they should merge
  return {a: getNumber(), b: identity(props.id), c: ['static']};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{id: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { getNumber, identity } = require("shared-runtime");

function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = getNumber();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let t1;
  if ($[1] !== props.id) {
    t1 = identity(props.id);
    $[1] = props.id;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = ["static"];
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== t1) {
    t3 = { a: t0, b: t1, c: t2 };
    $[4] = t1;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ id: 42 }],
};

```
      
### Eval output
(kind: ok) {"a":4,"b":42,"c":["static"]}