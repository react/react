
## Input

```javascript
const {shallowCopy, throwInput} = require('shared-runtime');

function Component(props) {
  let x = [];
  try {
    const y = shallowCopy({});
    if (y == null) {
      return;
    }
    x.push(throwInput(y));
  } catch {
    return null;
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
const { shallowCopy, throwInput } = require("shared-runtime");

function Component(props) {
  const $ = _c(2);
  let t0;
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      try {
        const y = shallowCopy({});
        if (y == null) {
          t0 = undefined;
          break bb0;
        }

        x.push(throwInput(y));
      } catch {
        t0 = null;
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
(kind: ok) null