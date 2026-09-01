
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
function Component(props) {
  return (
    useMemo(() => {
      return [props.value];
    }) || []
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.value) {
    t0 = (() => [props.value])() || [];
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 1 }],
};

```
      
### Eval output
(kind: ok) [1]