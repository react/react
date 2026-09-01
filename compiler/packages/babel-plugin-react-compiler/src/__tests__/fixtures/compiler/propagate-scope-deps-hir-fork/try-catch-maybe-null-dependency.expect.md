
## Input

```javascript
// @enablePropagateDepsInHIR
import {identity} from 'shared-runtime';

/**
 * Not safe to hoist read of maybeNullObject.value.inner outside of the
 * try-catch block, as that might throw
 */
function useFoo(maybeNullObject: {value: {inner: number}} | null) {
  const y = [];
  try {
    y.push(identity(maybeNullObject.value.inner));
  } catch {
    y.push('null');
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [null],
  sequentialRenders: [null, {value: 2}, {value: 3}, null],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
import { identity } from "shared-runtime";

/**
 * Not safe to hoist read of maybeNullObject.value.inner outside of the
 * try-catch block, as that might throw
 */
function useFoo(maybeNullObject) {
  const $ = _c(4);
  let y;
  if ($[0] !== maybeNullObject) {
    y = [];
    try {
      let t0;
      if ($[2] !== maybeNullObject.value.inner) {
        t0 = identity(maybeNullObject.value.inner);
        $[2] = maybeNullObject.value.inner;
        $[3] = t0;
      } else {
        t0 = $[3];
      }
      y.push(t0);
    } catch {
      y.push("null");
    }
    $[0] = maybeNullObject;
    $[1] = y;
  } else {
    y = $[1];
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [null],
  sequentialRenders: [null, { value: 2 }, { value: 3 }, null],
};

```
      
### Eval output
(kind: ok) ["null"]
[null]
[null]
["null"]