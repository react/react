// props.a.b should NOT be added as a unconditional dependency to the reactive
// scope that produces x if it is not accessed in every path

import {identity, getNull} from 'shared-runtime';

function useCondDepInNestedIfElse(props, cond) {
  const x = {};
  if (identity(cond)) {
    if (getNull()) {
      x.a = props.a.b;
    }
  } else {
    x.d = props.a.b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInNestedIfElse,
  params: [{a: {b: 2}}, true],
};
