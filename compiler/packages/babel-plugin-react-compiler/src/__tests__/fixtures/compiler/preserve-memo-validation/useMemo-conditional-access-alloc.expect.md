
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function Component({propA, propB}) {
  return useMemo(() => {
    return {
      value: identity(propB?.x.y),
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
import { identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(5);
  const { propA, propB } = t0;

  const t1 = propB?.x.y;
  let t2;
  if ($[0] !== t1) {
    t2 = identity(t1);
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if ($[2] !== propA || $[3] !== t2) {
    t3 = { value: t2, other: propA };
    $[2] = propA;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propA: 2, propB: { x: { y: [] } } }],
};

```
      
### Eval output
(kind: ok) {"value":[],"other":2}