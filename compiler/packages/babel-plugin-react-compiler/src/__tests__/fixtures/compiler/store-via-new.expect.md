
## Input

```javascript
function Foo() {
  const x = {};
  const y = new Foo(x);
  y.mutate();
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo() {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = {};
    const y = new Foo(x);
    y.mutate();
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}

```
      