
## Input

```javascript
// A function declaration that shadows a parameter is fine to lower as a
// reassignment when nothing observes the parameter before the declaration.
function Component(props) {
  function props() {}
  return <p>{typeof props}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // A function declaration that shadows a parameter is fine to lower as a
// reassignment when nothing observes the parameter before the declaration.
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = function props() {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  props = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <p>{typeof props}</p>;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 1 }],
};

```
      
### Eval output
(kind: ok) <p>function</p>