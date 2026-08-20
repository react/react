
## Input

```javascript
function foo() {
  const {'data-foo-bar': t} = {'data-foo-bar': 1};
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { "data-foo-bar": 1 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const { "data-foo-bar": t } = t0;
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 1