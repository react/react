
## Input

```javascript
/**
 * Assume that only directly returned functions or JSX attributes are invoked.
 * Conservatively estimate that functions wrapped in objects or other containers
 * might never be called (and therefore their property loads are not hoistable).
 */
function useMakeCallback({arr}) {
  return {
    getElement0: () => arr[0].value,
    getElement1: () => arr[1].value,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{arr: [1, 2]}],
  sequentialRenders: [{arr: [1, 2]}, {arr: []}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Assume that only directly returned functions or JSX attributes are invoked.
 * Conservatively estimate that functions wrapped in objects or other containers
 * might never be called (and therefore their property loads are not hoistable).
 */
function useMakeCallback(t0) {
  const $ = _c(2);
  const { arr } = t0;
  let t1;
  if ($[0] !== arr) {
    t1 = { getElement0: () => arr[0].value, getElement1: () => arr[1].value };
    $[0] = arr;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{ arr: [1, 2] }],
  sequentialRenders: [{ arr: [1, 2] }, { arr: [] }],
};

```
      
### Eval output
(kind: ok) {"getElement0":"[[ function params=0 ]]","getElement1":"[[ function params=0 ]]"}
{"getElement0":"[[ function params=0 ]]","getElement1":"[[ function params=0 ]]"}