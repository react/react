
## Input

```javascript
// @enablePropagateDepsInHIR
// This tests an optimization, NOT a correctness property.
// When propagating reactive dependencies of an inner scope up to its parent,
// we prefer to retain granularity.
//
// In this test, we check that Forget propagates the inner scope's conditional
// dependencies (e.g. props.a.b) instead of only its derived minimal
// unconditional dependencies (e.g. props).
// ```javascript
//  scope @0 (deps=[???] decls=[x, y]) {
//    let y = {};
//    scope @1 (deps=[props] decls=[x]) {
//      let x = {};
//      if (foo) mutate1(x, props.a.b);
//    }
//    mutate2(y, props.a.b);
//  }

import {CONST_TRUE, setProperty} from 'shared-runtime';

function useJoinCondDepsInUncondScopes(props) {
  let y = {};
  let x = {};
  if (CONST_TRUE) {
    setProperty(x, props.a.b);
  }
  setProperty(y, props.a.b);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useJoinCondDepsInUncondScopes,
  params: [{a: {b: 3}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
// This tests an optimization, NOT a correctness property.
// When propagating reactive dependencies of an inner scope up to its parent,
// we prefer to retain granularity.
//
// In this test, we check that Forget propagates the inner scope's conditional
// dependencies (e.g. props.a.b) instead of only its derived minimal
// unconditional dependencies (e.g. props).
// ```javascript
//  scope @0 (deps=[???] decls=[x, y]) {
//    let y = {};
//    scope @1 (deps=[props] decls=[x]) {
//      let x = {};
//      if (foo) mutate1(x, props.a.b);
//    }
//    mutate2(y, props.a.b);
//  }

import { CONST_TRUE, setProperty } from "shared-runtime";

function useJoinCondDepsInUncondScopes(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.a.b) {
    const y = {};
    const x = {};
    if (CONST_TRUE) {
      setProperty(x, props.a.b);
    }
    setProperty(y, props.a.b);
    t0 = [x, y];
    $[0] = props.a.b;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useJoinCondDepsInUncondScopes,
  params: [{ a: { b: 3 } }],
};

```
      
### Eval output
(kind: ok) [{"wat0":3},{"wat0":3}]