
## Input

```javascript
function Component(props) {
  const x = [{}, [], props.value];
  const y = x.join(() => 'this closure gets stringified, not called');
  foo(y);
  return [x, y];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(7);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    t1 = [];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  let t2;
  if ($[2] !== props.value) {
    t2 = [t0, t1, props.value];
    $[2] = props.value;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const x = t2;
  const y = x.join(_temp);
  foo(y);
  let t3;
  if ($[4] !== x || $[5] !== y) {
    t3 = [x, y];
    $[4] = x;
    $[5] = y;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}
function _temp() {
  return "this closure gets stringified, not called";
}

```
      