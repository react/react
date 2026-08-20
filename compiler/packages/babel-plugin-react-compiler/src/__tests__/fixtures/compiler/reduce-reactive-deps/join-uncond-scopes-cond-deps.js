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
