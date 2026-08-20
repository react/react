
## Input

```javascript
function component(a) {
  let x = {a};
  (function () {
    let q = x;
    (function () {
      q.b = 1;
    })();
  })();

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [2],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(a) {
  const $ = _c(2);
  let x;
  if ($[0] !== a) {
    x = { a };

    const q = x;
    (function () {
      q.b = 1;
    })();
    $[0] = a;
    $[1] = x;
  } else {
    x = $[1];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [2],
};

```
      
### Eval output
(kind: ok) {"a":2,"b":1}