
## Input

```javascript
function component(a) {
  let t = {a};
  function x(p) {
    p.foo();
  }
  x(t);
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(a) {
  const $ = _c(3);
  let t;
  if ($[0] !== a) {
    t = { a };
    let t0;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = function x(p) {
        p.foo();
      };
      $[2] = t0;
    } else {
      t0 = $[2];
    }
    const x = t0;

    x(t);
    $[0] = a;
    $[1] = t;
  } else {
    t = $[1];
  }
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      