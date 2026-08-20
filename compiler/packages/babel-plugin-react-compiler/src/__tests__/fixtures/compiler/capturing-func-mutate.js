import {mutate} from 'shared-runtime';

function Component({a, b}) {
  let z = {a};
  let y = {b: {b}};
  let x = function () {
    z.a = 2;
    mutate(y.b);
  };
  x();
  return [y, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 4, b: 3},
    {a: 4, b: 5},
  ],
};
