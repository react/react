// props.a.b should NOT be added as a unconditional dependency to the reactive
// scope that produces x if it is not accessed in the default case.

import {identity} from 'shared-runtime';

function useCondDepInSwitchMissingDefault(props, other) {
  const x = {};
  switch (identity(other)) {
    case 1:
      x.a = props.a.b;
      break;
    case 2:
      x.b = props.a.b;
      break;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInSwitchMissingDefault,
  params: [{a: {b: 2}}, 3],
};
