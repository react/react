import {makeObject_Primitives, mutate} from 'shared-runtime';

function Component() {
  // a's mutable range should be the same as x's mutable range,
  // since a is captured into x (which gets mutated later)
  let a = makeObject_Primitives();

  let x = [];
  x.push(a);

  mutate(x);
  return [x, a];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
