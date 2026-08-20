// When a conditional dependency `props.a.b.c` has no unconditional dependency
// in its subpath or superpath, we should find the nearest unconditional access

import {identity} from 'shared-runtime';

// and promote it to an unconditional dependency.
function usePromoteUnconditionalAccessToDependency(props, other) {
  const x = {};
  x.a = props.a.a.a;
  if (identity(other)) {
    x.c = props.a.b.c;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: usePromoteUnconditionalAccessToDependency,
  params: [{a: {a: {a: 3}}}, false],
};
