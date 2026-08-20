// props.a.b should be added as a unconditional dependency to the reactive
// scope that produces x, since it is accessed unconditionally in all cfg
// paths

import {identity} from 'shared-runtime';

function useCondDepInDirectIfElse(props, cond) {
  const x = {};
  if (identity(cond)) {
    x.b = props.a.b;
  } else {
    x.c = props.a.b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInDirectIfElse,
  params: [{a: {b: 2}}, true],
};
