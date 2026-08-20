
## Input

```javascript
function hoisting() {
  const foo = () => {
    return bar + baz;
  };
  const bar = 3;
  const baz = 2;
  return foo(); // OK: called outside of TDZ for bar/baz
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function hoisting() {
  const $ = _c(1);
  let foo;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    foo = () => bar + baz;

    const bar = 3;
    const baz = 2;
    $[0] = foo;
  } else {
    foo = $[0];
  }
  return foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 5