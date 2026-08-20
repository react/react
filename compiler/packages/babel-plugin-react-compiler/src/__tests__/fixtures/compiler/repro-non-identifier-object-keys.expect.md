
## Input

```javascript
function Foo() {
  return {
    'a.b': 1,
    'a\b': 2,
    'a/b': 3,
    'a+b': 4,
    'a b': 5,
  };
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
    t0 = { "a.b": 1, "a\b": 2, "a/b": 3, "a+b": 4, "a b": 5 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a.b":1,"a\b":2,"a/b":3,"a+b":4,"a b":5}