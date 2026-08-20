import {makeArray} from 'shared-runtime';

// @flow
function Component() {
  const items = makeArray(0, 1, 2);
  let item;
  let sum = 0;
  while ((item = items.pop())) {
    sum += item;
  }
  return [items, sum];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
