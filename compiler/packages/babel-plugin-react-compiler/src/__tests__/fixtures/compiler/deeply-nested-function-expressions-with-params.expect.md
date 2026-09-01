
## Input

```javascript
function Foo() {
  return (function t() {
    let x = {};
    let y = {};
    return function a(x = () => {}) {
      return (function b(y = []) {
        return [x, y];
      })();
    };
  })();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
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
      return (function b(t2) {
        const y_0 = t2 === undefined ? [] : t2;
        return [x_0, y_0];
      })();
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
};

```
      