
## Input

```javascript
import {useEffect, useState} from 'react';

/**
 * Example of a function expression whose return value shouldn't have
 * a "freeze" effect on all operands.
 *
 * This is because the function expression is passed to `useEffect` and
 * thus is not a render function. `cleanedUp` is also created within
 * the effect and is not a render variable.
 */
function Component({prop}) {
  const [cleanupCount, setCleanupCount] = useState(0);

  useEffect(() => {
    let cleanedUp = false;
    setTimeout(() => {
      if (!cleanedUp) {
        cleanedUp = true;
        setCleanupCount(c => c + 1);
      }
    }, 0);
    // This return value should not have freeze effects
    // on its operands
    return () => {
      if (!cleanedUp) {
        cleanedUp = true;
        setCleanupCount(c => c + 1);
      }
    };
  }, [prop]);
  return <div>{cleanupCount}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: 5}],
  sequentialRenders: [{prop: 5}, {prop: 5}, {prop: 6}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useState } from "react";

/**
 * Example of a function expression whose return value shouldn't have
 * a "freeze" effect on all operands.
 *
 * This is because the function expression is passed to `useEffect` and
 * thus is not a render function. `cleanedUp` is also created within
 * the effect and is not a render variable.
 */
function Component(t0) {
  const $ = _c(5);
  const { prop } = t0;
  const [cleanupCount, setCleanupCount] = useState(0);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      let cleanedUp = false;
      setTimeout(
        () => {
          if (!cleanedUp) {
            cleanedUp = true;
            setCleanupCount(_temp);
          }
        },

        0,
      );

      return () => {
        if (!cleanedUp) {
          cleanedUp = true;
          setCleanupCount(_temp2);
        }
      };
    };
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  let t2;
  if ($[1] !== prop) {
    t2 = [prop];
    $[1] = prop;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  useEffect(t1, t2);
  let t3;
  if ($[3] !== cleanupCount) {
    t3 = <div>{cleanupCount}</div>;
    $[3] = cleanupCount;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}
function _temp2(c_0) {
  return c_0 + 1;
}
function _temp(c) {
  return c + 1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ prop: 5 }],
  sequentialRenders: [{ prop: 5 }, { prop: 5 }, { prop: 6 }],
};

```
      
### Eval output
(kind: ok) <div>0</div>
<div>0</div>
<div>1</div>