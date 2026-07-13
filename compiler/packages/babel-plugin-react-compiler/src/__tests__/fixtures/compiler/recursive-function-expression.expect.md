
## Input

```javascript
function Component1() {
  const x = callback(10);
  function callback(x) {
    if (x == 0) {
      return null;
    }
    return callback(x - 1);
  }
  return x;
}

function Component() {
  function callback(x) {
    if (x == 0) {
      return null;
    }
    return callback(x - 1);
  }
  return callback(10);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component1() {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = callback(10);
    function callback(x_0) {
      if (x_0 == 0) {
        return null;
      }

      return callback(x_0 - 1);
    }
    $[0] = x;
  } else {
    x = $[0];
  }

  return x;
}

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    function callback(x) {
      if (x == 0) {
        return null;
      }
      return callback(x - 1);
    }
    t0 = callback(10);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) null