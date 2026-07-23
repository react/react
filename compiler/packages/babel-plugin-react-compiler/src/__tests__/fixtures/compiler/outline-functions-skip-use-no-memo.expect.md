
## Input

```javascript
function Component(props) {
  const optedOut = x => {
    'use no memo';
    const inner = y => y + 1;
    return inner(x);
  };
  const outlined = x => x * 2;
  return [optedOut(props.value), outlined(props.value)];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (x) => {
      "use no memo";

      const inner = (y) => y + 1;
      return inner(x);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const optedOut = t0;

  const outlined = _temp;
  const t1 = optedOut(props.value);
  const t2 = outlined(props.value);
  let t3;
  if ($[1] !== t1 || $[2] !== t2) {
    t3 = [t1, t2];
    $[1] = t1;
    $[2] = t2;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  return t3;
}
function _temp(x_0) {
  return x_0 * 2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) [43,84]