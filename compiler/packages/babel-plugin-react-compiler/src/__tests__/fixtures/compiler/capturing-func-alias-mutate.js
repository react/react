import {mutate} from 'shared-runtime';
function Component({a}) {
  let x = {a};
  let y = {};
  const f0 = function () {
    y.x = x;
  };
  f0();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2}],
  sequentialRenders: [{a: 2}, {a: 2}, {a: 3}],
};
