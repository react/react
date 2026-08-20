
## Input

```javascript
function hoisting() {
  const x = {
    foo() {
      return bar();
    },
  };
  const bar = () => {
    return 1;
  };

  return x.foo(); // OK: bar's value is only accessed outside of its TDZ
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function hoisting() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = {
      foo() {
        return bar();
      },
    };
    const bar = _temp;
    t0 = x.foo();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  return 1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};

```
      
### Eval output
(kind: ok) 1