
## Input

```javascript
import {createHookWrapper} from 'shared-runtime';

function useHook({a, b, c}) {
  return {
    x: [a],
    y() {
      return [b];
    },
    z: {c},
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{a: 1, b: 2, c: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper } from "shared-runtime";

function useHook(t0) {
  const $ = _c(8);
  const { a, b, c } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = [a];
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== b || $[3] !== c || $[4] !== t1) {
    let t3;
    if ($[6] !== c) {
      t3 = { c };
      $[6] = c;
      $[7] = t3;
    } else {
      t3 = $[7];
    }
    t2 = {
      x: t1,
      y() {
        return [b];
      },
      z: t3,
    };
    $[2] = b;
    $[3] = c;
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ a: 1, b: 2, c: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"x":[1],"y":{"kind":"Function","result":[2]},"z":{"c":2}},"shouldInvokeFns":true}</div>