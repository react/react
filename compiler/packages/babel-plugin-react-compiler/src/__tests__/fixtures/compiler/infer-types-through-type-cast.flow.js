// @flow
import {getNumber} from 'shared-runtime';

function Component(props) {
  // We can infer that `x` is a primitive bc it is aliased to `y`,
  // which is used in a binary expression
  const x = getNumber();
  const y = (x: any);
  y + 1;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};
