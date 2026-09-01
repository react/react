
## Input

```javascript
import * as SharedRuntime from 'shared-runtime';
import {makeArray} from 'shared-runtime';

/**
 * Here, we don't need to memoize SharedRuntime.Stringify as it is a PropertyLoad
 * off of a global.
 * TODO: in PropagateScopeDeps (hir), we should produce a sidemap of global rvals
 * and avoid adding them to `temporariesUsedOutsideDefiningScope`.
 */
function Component({num}: {num: number}) {
  const arr = makeArray(num);
  return (
    <SharedRuntime.Stringify value={arr.push(num)}></SharedRuntime.Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{num: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import * as SharedRuntime from "shared-runtime";
import { makeArray } from "shared-runtime";

/**
 * Here, we don't need to memoize SharedRuntime.Stringify as it is a PropertyLoad
 * off of a global.
 * TODO: in PropagateScopeDeps (hir), we should produce a sidemap of global rvals
 * and avoid adding them to `temporariesUsedOutsideDefiningScope`.
 */
function Component(t0) {
  const $ = _c(6);
  const { num } = t0;
  let T0;
  let t1;
  if ($[0] !== num) {
    const arr = makeArray(num);
    T0 = SharedRuntime.Stringify;
    t1 = arr.push(num);
    $[0] = num;
    $[1] = T0;
    $[2] = t1;
  } else {
    T0 = $[1];
    t1 = $[2];
  }
  let t2;
  if ($[3] !== T0 || $[4] !== t1) {
    t2 = <T0 value={t1} />;
    $[3] = T0;
    $[4] = t1;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ num: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"value":2}</div>