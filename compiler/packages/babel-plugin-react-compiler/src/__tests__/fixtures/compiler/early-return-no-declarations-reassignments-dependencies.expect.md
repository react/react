
## Input

```javascript
import {makeArray} from 'shared-runtime';

/**
 * This fixture tests what happens when a reactive has no declarations (other than an early return),
 * no reassignments, and no dependencies. In this case the only thing we can use to decide if we
 * should take the if or else branch is the early return declaration. But if that uses the same
 * sentinel as the memo cache sentinel, then if the previous execution did not early return it will
 * look like we didn't execute the memo block yet, and we'll needlessly re-execute instead of skipping
 * to the else branch.
 *
 * We have to use a distinct sentinel for the early return value.
 *
 * Here the fixture will always take the "else" branch and never early return. Logging (not included)
 * confirms that the scope for `x` only executes once, on the first render of the component.
 */
let ENABLE_FEATURE = false;

function Component(props) {
  let x = [];
  if (ENABLE_FEATURE) {
    x.push(42);
    return x;
  } else {
    console.log('fallthrough');
  }
  return makeArray(props.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {a: 42},
    {a: 42},
    {a: 3.14},
    {a: 3.14},
    {a: 42},
    {a: 3.14},
    {a: 42},
    {a: 3.14},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray } from "shared-runtime";

/**
 * This fixture tests what happens when a reactive has no declarations (other than an early return),
 * no reassignments, and no dependencies. In this case the only thing we can use to decide if we
 * should take the if or else branch is the early return declaration. But if that uses the same
 * sentinel as the memo cache sentinel, then if the previous execution did not early return it will
 * look like we didn't execute the memo block yet, and we'll needlessly re-execute instead of skipping
 * to the else branch.
 *
 * We have to use a distinct sentinel for the early return value.
 *
 * Here the fixture will always take the "else" branch and never early return. Logging (not included)
 * confirms that the scope for `x` only executes once, on the first render of the component.
 */
let ENABLE_FEATURE = false;

function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const x = [];
      if (ENABLE_FEATURE) {
        x.push(42);
        t0 = x;
        break bb0;
      } else {
        console.log("fallthrough");
      }
    }
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  let t1;
  if ($[1] !== props.a) {
    t1 = makeArray(props.a);
    $[1] = props.a;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    { a: 42 },
    { a: 42 },
    { a: 3.14 },
    { a: 3.14 },
    { a: 42 },
    { a: 3.14 },
    { a: 42 },
    { a: 3.14 },
  ],
};

```
      