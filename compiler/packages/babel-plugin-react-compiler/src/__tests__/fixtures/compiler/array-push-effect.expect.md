
## Input

```javascript
// arrayInstance.push should have the following effects:
//  - read on all args (rest parameter)
//  - mutate on receiver
function Component(props) {
  const x = foo(props.x);
  const y = {y: props.y};
  const arr = [];
  arr.push({});
  arr.push(x, y);
  return arr;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // arrayInstance.push should have the following effects:
//  - read on all args (rest parameter)
//  - mutate on receiver
function Component(props) {
  const $ = _c(8);
  let t0;
  if ($[0] !== props.x) {
    t0 = foo(props.x);
    $[0] = props.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== props.y) {
    t1 = { y: props.y };
    $[2] = props.y;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const y = t1;
  let arr;
  if ($[4] !== x || $[5] !== y) {
    arr = [];
    let t2;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = {};
      $[7] = t2;
    } else {
      t2 = $[7];
    }
    arr.push(t2);
    arr.push(x, y);
    $[4] = x;
    $[5] = y;
    $[6] = arr;
  } else {
    arr = $[6];
  }
  return arr;
}

```
      