
## Input

```javascript
function mutate() {}
function foo() {
  let a = {};
  let b = {};
  let c = {};
  a = b;
  b = c;
  c = a;
  mutate(a, b);
  return c;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function mutate() {}
function foo() {
  const $ = _c(2);
  let a;
  let c;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let b = {};
    c = {};
    a = b;
    b = c;
    c = a;
    mutate(a, b);
    $[0] = c;
    $[1] = a;
  } else {
    c = $[0];
    a = $[1];
  }
  return c;
}

```
      