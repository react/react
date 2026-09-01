
## Input

```javascript
function bar(a) {
  let x = [a];
  let y = {};
  (function () {
    y = x[0];
  })();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: ['TodoAdd'],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function bar(a) {
  const $ = _c(4);
  let t0;
  if ($[0] !== a) {
    t0 = [a];
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let y;
  if ($[2] !== x[0]) {
    y = {};

    y = x[0];
    $[2] = x[0];
    $[3] = y;
  } else {
    y = $[3];
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: ["TodoAdd"],
};

```
      
### Eval output
(kind: ok) "TodoAdd"