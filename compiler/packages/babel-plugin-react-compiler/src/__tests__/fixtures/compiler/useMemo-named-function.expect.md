
## Input

```javascript
// @validateNoSetStateInRender:false @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {makeArray} from 'shared-runtime';

function Component() {
  const x = useMemo(makeArray, []);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInRender:false @enablePreserveExistingMemoizationGuarantees:false
import { useMemo } from "react";
import { makeArray } from "shared-runtime";

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = makeArray();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      