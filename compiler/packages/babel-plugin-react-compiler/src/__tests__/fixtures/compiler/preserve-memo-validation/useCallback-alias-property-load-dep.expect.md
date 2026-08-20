
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {sum} from 'shared-runtime';

function Component({propA, propB}) {
  const x = propB.x.y;
  return useCallback(() => {
    return sum(propA.x, x);
  }, [propA.x, x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: {x: 2}, propB: {x: {y: 3}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";
import { sum } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { propA, propB } = t0;
  const x = propB.x.y;
  let t1;
  if ($[0] !== propA.x || $[1] !== x) {
    t1 = () => sum(propA.x, x);
    $[0] = propA.x;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ propA: { x: 2 }, propB: { x: { y: 3 } } }],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"