
## Input

```javascript
function bar(a, b) {
  let x = [a, b];
  let y = {};
  let t = {};
  const f0 = function () {
    y = x[0][1];
    t = x[1][0];
  };
  f0();

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: [
    [1, 2],
    [2, 3],
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function bar(a, b) {
  const $ = _c(3);
  let y;
  if ($[0] !== a || $[1] !== b) {
    const x = [a, b];
    y = {};
    let t = {};
    const f0 = function () {
      y = x[0][1];
      t = x[1][0];
    };

    f0();
    $[0] = a;
    $[1] = b;
    $[2] = y;
  } else {
    y = $[2];
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: bar,
  params: [
    [1, 2],
    [2, 3],
  ],
};

```
      
### Eval output
(kind: ok) 2