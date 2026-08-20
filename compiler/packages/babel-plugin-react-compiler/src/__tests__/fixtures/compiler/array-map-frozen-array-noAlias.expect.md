
## Input

```javascript
function Component(props) {
  const x = [];
  <dif>{x}</dif>;
  const y = x.map(item => item);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    const y = x.map(_temp);
    t1 = [x, y];
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(item) {
  return item;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [[],[]]