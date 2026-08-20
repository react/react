import {makeArray} from 'shared-runtime';

function Component(props) {
  const x = makeArray(...props.a, null, ...props.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: [1, 2], b: [2, 3, 4]}],
};
