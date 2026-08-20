
## Input

```javascript
function Component(props) {
  const x = {};
  const y = props.y;
  return [x, y]; // x is captured here along with a reactive value. this shouldn't make `x` reactive!
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  const y = props.y;
  let t1;
  if ($[1] !== y) {
    t1 = [x, y];
    $[1] = y;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ y: 42 }],
};

```
      
### Eval output
(kind: ok) [{},42]