import {makeArray} from 'shared-runtime';

const other = [0, 1];
function Component({}) {
  const items = makeArray(0, 1, 2, null, 4, false, 6);
  const max = Math.max(2, items.push(5), ...other);
  return max;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
