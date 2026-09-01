
## Input

```javascript
function component(a) {
  let z = {a};
  let x = function () {
    {
      console.log(z);
    }
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
function component(a) {
  const $ = _c(2);
  let t0;
  if ($[0] !== a) {
    const z = { a };
    t0 = function () {
      console.log(z);
    };
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
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      