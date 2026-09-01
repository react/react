
## Input

```javascript
function Component(props) {
  let x = [];
  x.push(props.p0);
  let y = x;

  x = [];
  let _ = <Component x={x} />;

  y.push(props.p1);

  return <Component x={x} y={y} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.p0 || $[1] !== props.p1) {
    let x = [];
    x.push(props.p0);
    const y = x;
    let t1;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = [];
      $[3] = t1;
    } else {
      t1 = $[3];
    }
    x = t1;
    y.push(props.p1);
    t0 = <Component x={x} y={y} />;
    $[0] = props.p0;
    $[1] = props.p1;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

```
      