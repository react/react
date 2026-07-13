
## Input

```javascript
const {throwInput} = require('shared-runtime');

function Component(props) {
  let x = [];
  try {
    // foo could throw its argument...
    throwInput(x);
  } catch (e) {
    // ... in which case this could be mutating `x`!
    e.push(null);
    return e;
  }
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
  const $ = _c(2);
  let t0;
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      try {
        throwInput(x);
      } catch (t1) {
        const e = t1;
        e.push(null);
        t0 = e;
        break bb0;
      }
    }
    $[0] = t0;
    $[1] = x;
  } else {
    t0 = $[0];
    x = $[1];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
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