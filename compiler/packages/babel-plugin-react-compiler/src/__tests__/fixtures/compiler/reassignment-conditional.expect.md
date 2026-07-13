
## Input

```javascript
function Component(props) {
  let x = [];
  x.push(props.p0);
  let y = x;

  if (props.p1) {
    x = [];
  }

  y.push(props.p2);

  return <Component x={x} y={y} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.p0 || $[1] !== props.p1 || $[2] !== props.p2) {
    let x = [];
    x.push(props.p0);
    const y = x;
    if (props.p1) {
      let t1;
      if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = [];
        $[4] = t1;
      } else {
        t1 = $[4];
      }
      x = t1;
    }
    y.push(props.p2);
    t0 = <Component x={x} y={y} />;
    $[0] = props.p0;
    $[1] = props.p1;
    $[2] = props.p2;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

```
      