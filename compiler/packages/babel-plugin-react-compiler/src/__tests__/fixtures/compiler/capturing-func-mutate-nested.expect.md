
## Input

```javascript
function component(a) {
  let y = {b: {a}};
  let x = function () {
    y.b.a = 2;
  };
  x();
  return y;
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
  let y;
  if ($[0] !== a) {
    y = { b: { a } };
    const x = function () {
      y.b.a = 2;
    };

    x();
    $[0] = a;
    $[1] = y;
  } else {
    y = $[1];
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      