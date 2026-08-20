// props.a.b should be added as a unconditional dependency to the reactive
// scope that produces x, since it is accessed unconditionally in all cfg
// paths

import {identity} from 'shared-runtime';

function useCondDepInSwitch(props, other) {
  const x = {};
  switch (identity(other)) {
    case 1:
      x.a = props.a.b;
      break;
    case 2:
      x.b = props.a.b;
      break;
    default:
      x.c = props.a.b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useCondDepInSwitch,
  params: [{a: {b: 2}}, 2],
};
