
## Input

```javascript
import {mutate} from 'shared-runtime';

/**
 * Similar fixture to `align-scopes-nested-block-structure`, but
 * a simpler case.
 */
function useFoo(cond) {
  let s = null;
  if (cond) {
    s = {};
  } else {
    return null;
  }
  mutate(s);
  return s;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";

/**
 * Similar fixture to `align-scopes-nested-block-structure`, but
 * a simpler case.
 */
function useFoo(cond) {
  const $ = _c(3);
  let s;
  let t0;
  if ($[0] !== cond) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      if (cond) {
        s = {};
      } else {
        t0 = null;
        break bb0;
      }

      mutate(s);
    }
    $[0] = cond;
    $[1] = t0;
    $[2] = s;
  } else {
    t0 = $[1];
    s = $[2];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  return s;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```
      
### Eval output
(kind: ok) {"wat0":"joe"}