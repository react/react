
## Input

```javascript
// @enableFunctionOutlining

function Component() {
  const object = {
    method() {
      return false;
    },
    property: () => {
      return true;
    },
  };
  return [object.method(), object.property()];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableFunctionOutlining

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const object = { method: _temp, property: _temp2 };
    t0 = [object.method(), object.property()];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp2() {
  return true;
}
function _temp() {
  return false;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) [false,true]