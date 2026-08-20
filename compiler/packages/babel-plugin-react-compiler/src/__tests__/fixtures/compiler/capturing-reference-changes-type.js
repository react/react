import {mutate} from 'shared-runtime';
function Component({a}) {
  let x = {a};
  let y = 1;
  (function () {
    y = x;
  })();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2}],
  sequentialRenders: [{a: 2}, {a: 2}, {a: 3}],
};
