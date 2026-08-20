
## Input

```javascript
function Foo() {
  return (function t() {
    let x = {};
    return function a(x = () => {}) {
      return x;
    };
  })();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function a(t1) {
      const x_0 = t1 === undefined ? _temp : t1;
      return x_0;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: false,
};

```
      