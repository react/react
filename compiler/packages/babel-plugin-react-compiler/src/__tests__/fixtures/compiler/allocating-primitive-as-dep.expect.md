
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
// bar(props.b) is an allocating expression that produces a primitive, which means
// that Forget should memoize it.
// Correctness:
//   - y depends on either bar(props.b) or bar(props.b) + 1
function AllocatingPrimitiveAsDep(props) {
  let y = foo(bar(props).b + 1);
  return y;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
// bar(props.b) is an allocating expression that produces a primitive, which means
// that Forget should memoize it.
// Correctness:
//   - y depends on either bar(props.b) or bar(props.b) + 1
function AllocatingPrimitiveAsDep(props) {
  const $ = _c(2);
  const t0 = bar(props).b + 1;
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
      