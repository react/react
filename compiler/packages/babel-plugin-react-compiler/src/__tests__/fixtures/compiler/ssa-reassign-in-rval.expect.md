
## Input

```javascript
// Forget should call the original x (x = foo()) to compute result
function Component() {
  let x = foo();
  let result = x((x = bar()), 5);
  return [result, x];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Forget should call the original x (x = foo()) to compute result
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let x = foo();
    const result = x((x = bar()), 5);
    t0 = [result, x];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      