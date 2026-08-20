
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useState} from 'react';
import {arrayPush} from 'shared-runtime';

// useCallback-produced values can exist in nested reactive blocks, as long
// as their reactive dependencies are a subset of depslist from source
function useFoo(minWidth, otherProp) {
  const [width, setWidth] = useState(1);
  const x = [];
  const style = useCallback(() => {
    return {
      width: Math.max(minWidth, width),
    };
  }, [width, minWidth]);
  arrayPush(x, otherProp);
  return [style, x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [2, 'other'],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback, useState } from "react";
import { arrayPush } from "shared-runtime";

// useCallback-produced values can exist in nested reactive blocks, as long
// as their reactive dependencies are a subset of depslist from source
function useFoo(minWidth, otherProp) {
  const $ = _c(7);
  const [width] = useState(1);
  let t0;
  if ($[0] !== minWidth || $[1] !== otherProp || $[2] !== width) {
    const x = [];
    let t1;
    if ($[4] !== minWidth || $[5] !== width) {
      t1 = () => ({ width: Math.max(minWidth, width) });
      $[4] = minWidth;
      $[5] = width;
      $[6] = t1;
    } else {
      t1 = $[6];
    }
    const style = t1;
    arrayPush(x, otherProp);
    t0 = [style, x];
    $[0] = minWidth;
    $[1] = otherProp;
    $[2] = width;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [2, "other"],
};

```
      
### Eval output
(kind: ok) ["[[ function params=0 ]]",["other"]]