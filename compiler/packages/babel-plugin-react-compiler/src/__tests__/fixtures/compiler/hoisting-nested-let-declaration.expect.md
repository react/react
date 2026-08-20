
## Input

```javascript
function hoisting() {
  let qux = () => {
    let result;
    {
      result = foo();
    }
    return result;
  };
  let foo = () => {
    return bar + baz;
  };
  let bar = 3;
  const baz = 2;
  return qux(); // OK: called outside of TDZ
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
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const qux = () => {
      let result;
      result = foo();
      return result;
    };
    let foo = () => bar + baz;
    let bar = 3;
    const baz = 2;
    t0 = qux();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 5