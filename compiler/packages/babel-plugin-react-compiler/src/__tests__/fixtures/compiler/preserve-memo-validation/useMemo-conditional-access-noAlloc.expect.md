
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function Component({propA, propB}) {
  return useMemo(() => {
    return {
      value: propB?.x.y,
      other: propA,
    };
  }, [propA, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: 2, propB: {x: {y: []}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";

function Component(t0) {
  const $ = _c(3);
  const { propA, propB } = t0;

  const t1 = propB?.x.y;
  let t2;
  if ($[0] !== propA || $[1] !== t1) {
    t2 = { value: t1, other: propA };
    $[0] = propA;
    $[1] = t1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propA: 2, propB: { x: { y: [] } } }],
};

```
      
### Eval output
(kind: ok) {"value":[],"other":2}