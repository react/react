
## Input

```javascript
// @flow @validateRefAccessDuringRender @validatePreserveExistingMemoizationGuarantees

import {useRef} from 'react';

component Foo(cond: boolean, cond2: boolean) {
  const ref = useRef();

  const s = () => {
    return ref.current;
  };

  if (cond) return [s];
  else if (cond2) return {s};
  else return {s: [s]};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: false, cond2: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

import { useRef } from "react";

function Foo(t0) {
  const $ = _c(4);
  const { cond, cond2 } = t0;
  const ref = useRef();
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => ref.current;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  const s = t1;

  if (cond) {
    let t2;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = [s];
      $[1] = t2;
    } else {
      t2 = $[1];
    }
    return t2;
  } else {
    if (cond2) {
      let t2;
      if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = { s };
        $[2] = t2;
      } else {
        t2 = $[2];
      }
      return t2;
    } else {
      let t2;
      if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = { s: [s] };
        $[3] = t2;
      } else {
        t2 = $[3];
      }
      return t2;
    }
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ cond: false, cond2: false }],
};

```
      
### Eval output
(kind: ok) {"s":["[[ function params=0 ]]"]}