
## Input

```javascript
let someGlobal = {};
function component(a) {
  let x = {a, someGlobal};
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['value 1'],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
let someGlobal = {};
function component(a) {
  const $ = _c(2);
  let t0;
  if ($[0] !== a) {
    t0 = { a, someGlobal };
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["value 1"],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":"value 1","someGlobal":{}}