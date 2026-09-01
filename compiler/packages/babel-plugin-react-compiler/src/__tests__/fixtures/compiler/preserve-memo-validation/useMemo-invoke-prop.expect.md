
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';

function useFoo({callback}) {
  return useMemo(() => new Array(callback()), [callback]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    {
      callback: () => {
        'use no forget';
        return [1, 2, 3];
      },
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { useMemo } from "react";

function useFoo(t0) {
  const $ = _c(2);
  const { callback } = t0;
  let t1;
  if ($[0] !== callback) {
    t1 = new Array(callback());
    $[0] = callback;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    {
      callback: () => {
        "use no forget";
        return [1, 2, 3];
      },
    },
  ],
};

```
      
### Eval output
(kind: ok) [[1,2,3]]