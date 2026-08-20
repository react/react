
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function Component({propA, propB}) {
  return useMemo(() => {
    if (propA) {
      return {
        value: propB.x.y,
      };
    }
  }, [propA, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: 1, propB: {x: {y: []}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";

function Component(t0) {
  const $ = _c(2);
  const { propA, propB } = t0;
  let t1;
  bb0: {
    if (propA) {
      let t2;
      if ($[0] !== propB.x.y) {
        t2 = { value: propB.x.y };
        $[0] = propB.x.y;
        $[1] = t2;
      } else {
        t2 = $[1];
      }
      t1 = t2;
      break bb0;
    }
    t1 = undefined;
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propA: 1, propB: { x: { y: [] } } }],
};

```
      
### Eval output
(kind: ok) {"value":[]}