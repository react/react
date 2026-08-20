// When a conditional dependency `props.a` is a subpath of an unconditional
// dependency `props.a.b`, we can access `props.a` while preserving program
// semantics (with respect to nullthrows).
// deps: {`props.a`, `props.a.b`} can further reduce to just `props.a`

import {identity} from 'shared-runtime';

// ordering of accesses should not matter
function useConditionalSubpath1(props, cond) {
  const x = {};
  x.b = props.a.b;
  if (identity(cond)) {
    x.a = props.a;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useConditionalSubpath1,
  params: [{a: {b: 3}}, false],
};
