
## Input

```javascript
// @enablePropagateDepsInHIR
import {identity, useIdentity} from 'shared-runtime';

function useFoo({arg, cond}: {arg: number; cond: boolean}) {
  const maybeObj = useIdentity({value: arg});
  const {value} = maybeObj;
  useIdentity(null);
  /**
   * maybeObj.value should be inferred as the dependency of this scope
   * since we know that maybeObj is safe to read from (i.e. non-null)
   * due to the above destructuring instruction
   */
  const arr = [];
  if (cond) {
    arr.push(identity(maybeObj.value));
  }
  return {arr, value};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{arg: 2, cond: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { identity, useIdentity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(10);
  const { arg, cond } = t0;
  let t1;
  if ($[0] !== arg) {
    t1 = { value: arg };
    $[0] = arg;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const maybeObj = useIdentity(t1);
  const { value } = maybeObj;
  useIdentity(null);
  let arr;
  if ($[2] !== cond || $[3] !== maybeObj.value) {
    arr = [];
    if (cond) {
      let t2;
      if ($[5] !== maybeObj.value) {
        t2 = identity(maybeObj.value);
        $[5] = maybeObj.value;
        $[6] = t2;
      } else {
        t2 = $[6];
      }
      arr.push(t2);
    }
    $[2] = cond;
    $[3] = maybeObj.value;
    $[4] = arr;
  } else {
    arr = $[4];
  }
  let t2;
  if ($[7] !== arr || $[8] !== value) {
    t2 = { arr, value };
    $[7] = arr;
    $[8] = value;
    $[9] = t2;
  } else {
    t2 = $[9];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ arg: 2, cond: false }],
};

```
      
### Eval output
(kind: ok) {"arr":[],"value":2}