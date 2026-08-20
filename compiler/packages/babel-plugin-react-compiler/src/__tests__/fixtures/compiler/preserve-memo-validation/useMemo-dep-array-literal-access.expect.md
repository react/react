
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {makeArray} from 'shared-runtime';

// We currently only recognize "hoistable" values (e.g. variable reads
// and property loads from named variables) in the source depslist.
// This makes validation logic simpler and follows the same constraints
// from the eslint react-hooks-deps plugin.
function Foo(props) {
  const x = makeArray(props);
  // react-hooks-deps lint would already fail here
  return useMemo(() => [x[0]], [x[0]]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{val: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import { useMemo } from "react";
import { makeArray } from "shared-runtime";

// We currently only recognize "hoistable" values (e.g. variable reads
// and property loads from named variables) in the source depslist.
// This makes validation logic simpler and follows the same constraints
// from the eslint react-hooks-deps plugin.
function Foo(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props) {
    t0 = makeArray(props);
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== x[0]) {
    t1 = [x[0]];
    $[2] = x[0];
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ val: 1 }],
};

```
      
### Eval output
(kind: ok) [{"val":1}]