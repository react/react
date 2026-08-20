
## Input

```javascript
function component(a, b) {
  let y = {b};
  let z = {a};
  let x = function () {
    z.a = 2;
    y.b;
  };
  x();
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{a: 'val1', b: 'val2'}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(a, b) {
  const $ = _c(2);
  let z;
  if ($[0] !== a) {
    z = { a };
    const x = function () {
      z.a = 2;
    };

    x();
    $[0] = a;
    $[1] = z;
  } else {
    z = $[1];
  }
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{ a: "val1", b: "val2" }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":2}