
## Input

```javascript
function sequence(props) {
  let x = (null, Math.max(1, 2), foo());
  while ((foo(), true)) {
    x = (foo(), 2);
  }
  return x;
}

function foo() {}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function sequence(props) {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = (Math.max(1, 2), foo());
    while ((foo(), true)) {
      x = (foo(), 2);
    }
    $[0] = x;
  } else {
    x = $[0];
  }

  return x;
}

function foo() {}

```
      