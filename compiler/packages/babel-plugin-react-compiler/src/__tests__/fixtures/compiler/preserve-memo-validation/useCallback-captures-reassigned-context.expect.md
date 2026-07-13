
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';
import {makeArray} from 'shared-runtime';

// This case is fine, as all reassignments happen before the useCallback
function Foo(props) {
  let x = [];
  x.push(props);
  x = makeArray();

  const cb = useCallback(() => [x], [x]);

  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { useCallback } from "react";
import { makeArray } from "shared-runtime";

// This case is fine, as all reassignments happen before the useCallback
function Foo(props) {
  const $ = _c(4);
  let x;
  if ($[0] !== props) {
    x = [];
    x.push(props);
    x = makeArray();
    $[0] = props;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== x) {
    t0 = () => [x];
    $[2] = x;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  x;
  const cb = t0;

  return cb;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"