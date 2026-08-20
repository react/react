
## Input

```javascript
function Component(props) {
  const x = foo[props.method](...props.a, null, ...props.b);
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.a || $[1] !== props.b || $[2] !== props.method) {
    t0 = foo[props.method](...props.a, null, ...props.b);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.method;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  const x = t0;
  return x;
}

```
      