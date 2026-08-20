
## Input

```javascript
import {createHookWrapper} from 'shared-runtime';
function useHook({a, b}) {
  return {
    x: function () {
      return [a];
    },
    y() {
      return [b];
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{a: 1, b: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper } from "shared-runtime";
function useHook(t0) {
  const $ = _c(5);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = function () {
      return [a];
    };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== b || $[3] !== t1) {
    t2 = {
      x: t1,
      y() {
        return [b];
      },
    };
    $[2] = b;
    $[3] = t1;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ a: 1, b: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"x":{"kind":"Function","result":[1]},"y":{"kind":"Function","result":[2]}},"shouldInvokeFns":true}</div>