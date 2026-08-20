import {makeArray} from 'shared-runtime';

function Component() {
  let x,
    y = (x = {});
  const foo = () => {
    x = makeArray();
  };
  foo();
  return [y, x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
