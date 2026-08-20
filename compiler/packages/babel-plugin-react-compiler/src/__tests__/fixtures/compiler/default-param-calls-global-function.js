import {identity} from 'shared-runtime';

function Component(x = identity([() => {}, true, 42, 'hello'])) {
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
