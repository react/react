
## Input

```javascript
function component(t) {
  let {a} = t;
  let y = {a};
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{a: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(t) {
  const $ = _c(2);
  const { a } = t;
  let t0;
  if ($[0] !== a) {
    t0 = { a };
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const y = t0;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{ a: 42 }],
};

```
      
### Eval output
(kind: ok) {"a":42}