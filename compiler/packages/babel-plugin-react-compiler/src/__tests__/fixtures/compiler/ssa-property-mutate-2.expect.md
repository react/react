
## Input

```javascript
function foo() {
  const x = [];
  const y = {};
  y.x = x;
  mutate(x);
  return y;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo() {
  const $ = _c(1);
  let y;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = [];
    y = {};
    y.x = x;
    mutate(x);
    $[0] = y;
  } else {
    y = $[0];
  }
  return y;
}

```
      