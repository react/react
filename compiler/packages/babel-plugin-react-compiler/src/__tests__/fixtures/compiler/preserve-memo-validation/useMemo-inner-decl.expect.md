
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(data) {
  return useMemo(() => {
    const temp = identity(data.a);
    return {temp};
  }, [data.a]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";
import { identity } from "shared-runtime";

function useFoo(data) {
  const $ = _c(4);
  let t0;
  if ($[0] !== data.a) {
    t0 = identity(data.a);
    $[0] = data.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const temp = t0;
  let t1;
  if ($[2] !== temp) {
    t1 = { temp };
    $[2] = temp;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: 2 }],
};

```
      
### Eval output
(kind: ok) {"temp":2}