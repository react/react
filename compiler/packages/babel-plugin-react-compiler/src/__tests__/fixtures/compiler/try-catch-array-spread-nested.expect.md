
## Input

```javascript
function foo() {
  'use memo';
  try {
    try {
      return [...null];
    } catch {
      return [...undefined];
    }
  } catch {
    return 'outer catch';
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo() {
  "use memo";
  const $ = _c(2);

  try {
    try {
      let t0;
      if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [...null];
        $[0] = t0;
      } else {
        t0 = $[0];
      }
      return t0;
    } catch {
      let t0;
      if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [...undefined];
        $[1] = t0;
      } else {
        t0 = $[1];
      }
      return t0;
    }
  } catch {
    return "outer catch";
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};

```
      
### Eval output
(kind: ok) "outer catch"