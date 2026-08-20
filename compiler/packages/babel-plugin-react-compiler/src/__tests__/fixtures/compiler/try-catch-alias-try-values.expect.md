
## Input

```javascript
const {throwInput} = require('shared-runtime');

function Component(props) {
  let y;
  let x = [];
  try {
    // throws x
    throwInput(x);
  } catch (e) {
    // e = x
    y = e; // y = x
  }
  y.push(null);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { throwInput } = require("shared-runtime");

function Component(props) {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let y;
    x = [];
    try {
      throwInput(x);
    } catch (t0) {
      const e = t0;

      y = e;
    }

    y.push(null);
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [null]