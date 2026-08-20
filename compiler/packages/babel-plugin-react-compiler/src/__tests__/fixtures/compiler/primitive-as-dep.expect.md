
## Input

```javascript
// props.b + 1 is an non-allocating expression, which means Forget can
// emit it trivially and repeatedly (e.g. no need to memoize props.b + 1
// separately from props.b)
// Correctness:
//   y depends on either props.b or props.b + 1
function PrimitiveAsDep(props) {
  let y = foo(props.b + 1);
  return y;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // props.b + 1 is an non-allocating expression, which means Forget can
// emit it trivially and repeatedly (e.g. no need to memoize props.b + 1
// separately from props.b)
// Correctness:
//   y depends on either props.b or props.b + 1
function PrimitiveAsDep(props) {
  const $ = _c(2);
  const t0 = props.b + 1;
  let t1;
  if ($[0] !== t0) {
    t1 = foo(t0);
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const y = t1;
  return y;
}

```
      