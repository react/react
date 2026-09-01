
## Input

```javascript
function Component() {
  const x = {};
  {
    const x = [];
    const fn = function () {
      mutate(x);
    };
    fn();
  }
  return x; // should return {}
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;

  const x_0 = [];
  const fn = function () {
    mutate(x_0);
  };

  fn();

  return x;
}

```
      