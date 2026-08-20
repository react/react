
## Input

```javascript
function foo(x, y, z) {
  const items = [z];
  items.push(x);

  const items2 = [];
  if (x) {
    items2.push(y);
  }

  if (y) {
    items.push(x);
  }

  return items2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(x, y, z) {
  const $ = _c(3);
  const items = [z];
  items.push(x);
  let items2;
  if ($[0] !== x || $[1] !== y) {
    items2 = [];
    if (x) {
      items2.push(y);
    }
    $[0] = x;
    $[1] = y;
    $[2] = items2;
  } else {
    items2 = $[2];
  }

  if (y) {
    items.push(x);
  }

  return items2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      