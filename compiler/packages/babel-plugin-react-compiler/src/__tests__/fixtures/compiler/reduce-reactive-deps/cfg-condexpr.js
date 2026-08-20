// props.a.b should be added as a unconditional dependency to the reactive
// scope that produces x, since it is accessed unconditionally in all cfg
// paths

import {identity, addOne} from 'shared-runtime';

function useCondDepInConditionalExpr(props, cond) {
  const x = identity(cond) ? addOne(props.a.b) : identity(props.a.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInConditionalExpr,
  params: [{a: {b: 2}}, true],
};
