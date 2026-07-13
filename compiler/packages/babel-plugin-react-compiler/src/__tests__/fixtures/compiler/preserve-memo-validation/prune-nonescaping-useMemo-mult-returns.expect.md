
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(cond) {
  useMemo(() => {
    if (cond) {
      return identity(10);
    } else {
      return identity(5);
    }
  }, [cond]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```

## Code

```javascript
// @validatePreserveExistingMemoizationGuarantees

import { useMemo } from "react";
import { identity } from "shared-runtime";

function useFoo(cond) {
  let t0;
  if (cond) {
    t0 = identity(10);
  } else {
    t0 = identity(5);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```
      
### Eval output
(kind: ok) 