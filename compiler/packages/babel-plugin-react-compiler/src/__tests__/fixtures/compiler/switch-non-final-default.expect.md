
## Input

```javascript
function Component(props) {
  let x = [];
  let y;
  switch (props.p0) {
    case 1: {
      break;
    }
    case true: {
      x.push(props.p2);
      y = [];
    }
    default: {
      break;
    }
    case false: {
      y = x;
      break;
    }
  }
  const child = <Component data={x} />;
  y.push(props.p4);
  return <Component data={y}>{child}</Component>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(8);
  let t0;
  let y;
  if ($[0] !== props.p0 || $[1] !== props.p2) {
    const x = [];
    bb0: switch (props.p0) {
      case 1: {
        break bb0;
      }
      case true: {
        x.push(props.p2);
        let t1;
        if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
          t1 = [];
          $[4] = t1;
        } else {
          t1 = $[4];
        }
        y = t1;
      }
      default: {
        break bb0;
      }
      case false: {
        y = x;
      }
    }
    t0 = <Component data={x} />;
    $[0] = props.p0;
    $[1] = props.p2;
    $[2] = t0;
    $[3] = y;
  } else {
    t0 = $[2];
    y = $[3];
  }
  const child = t0;
  y.push(props.p4);
  let t1;
  if ($[5] !== child || $[6] !== y) {
    t1 = <Component data={y}>{child}</Component>;
    $[5] = child;
    $[6] = y;
    $[7] = t1;
  } else {
    t1 = $[7];
  }
  return t1;
}

```
      