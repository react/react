
## Input

```javascript
function component(a, b) {
  let z = {a, b};
  let x = function () {
    console.log(z);
  };
  return x;
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
function component(a, b) {
  const $ = _c(3);
  let t0;
  if ($[0] !== a || $[1] !== b) {
    const z = { a, b };
    t0 = function () {
      console.log(z);
    };
    $[0] = a;
    $[1] = b;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  const x = t0;

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      