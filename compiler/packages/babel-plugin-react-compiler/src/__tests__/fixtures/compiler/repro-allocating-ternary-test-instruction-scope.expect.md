
## Input

```javascript
import {identity, makeObject_Primitives} from 'shared-runtime';

function useHook() {}

function useTest({cond}) {
  const val = makeObject_Primitives();

  useHook();
  /**
   * We don't technically need a reactive scope for this ternary as
   * it cannot produce newly allocated values.
   * While identity(...) may allocate, we can teach the compiler that
   * its result is only used as as a test condition
   */
  const result = identity(cond) ? val : null;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, makeObject_Primitives } from "shared-runtime";

function useHook() {}

function useTest(t0) {
  const $ = _c(3);
  const { cond } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = makeObject_Primitives();
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const val = t1;

  useHook();
  let t2;
  if ($[1] !== cond) {
    t2 = identity(cond) ? val : null;
    $[1] = cond;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const result = t2;
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useTest,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) {"a":0,"b":"value1","c":true}