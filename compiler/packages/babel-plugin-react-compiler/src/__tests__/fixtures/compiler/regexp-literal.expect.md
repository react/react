
## Input

```javascript
function Component(props) {
  const pattern = /foo/g;
  const value = makeValue();
  // We treat RegExp instances as mutable objects (bc they are)
  // so by default we assume this could be mutating `value`:
  if (pattern.test(value)) {
    return <div>{value}</div>;
  }
  return <div>Default</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  let value;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const pattern = /foo/g;
    value = makeValue();
    t0 = pattern.test(value);
    $[0] = t0;
    $[1] = value;
  } else {
    t0 = $[0];
    value = $[1];
  }
  if (t0) {
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = <div>{value}</div>;
      $[2] = t1;
    } else {
      t1 = $[2];
    }
    return t1;
  }
  let t1;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>Default</div>;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      