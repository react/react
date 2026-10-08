
## Input

```javascript
function Component(value) {
  return {
    1n: value,
    0x10n: value + 1,
    0o10n: value + 2,
    0b10n: value + 3,
    9007199254740993n: value + 4,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [1],
  isComponent: false,
};
```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(value) {
  const $ = _c(6);

  const t0 = value + 1;
  const t1 = value + 2;
  const t2 = value + 3;
  const t3 = value + 4;
  let t4;
  if (
    $[0] !== t0 ||
    $[1] !== t1 ||
    $[2] !== t2 ||
    $[3] !== t3 ||
    $[4] !== value
  ) {
    t4 = { "1": value, "16": t0, "8": t1, "2": t2, "9007199254740993": t3 };
    $[0] = t0;
    $[1] = t1;
    $[2] = t2;
    $[3] = t3;
    $[4] = value;
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [1],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"1":1,"2":4,"8":3,"16":2,"9007199254740993":5}