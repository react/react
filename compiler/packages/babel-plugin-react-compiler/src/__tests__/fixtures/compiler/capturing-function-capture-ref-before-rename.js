import {mutate} from 'shared-runtime';

function Component({a, b}) {
  let z = {a};
  (function () {
    mutate(z);
  })();
  let y = z;

  {
    // z is shadowed & renamed but the lambda is unaffected.
    let z = {b};
    y = {y, z};
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 2, b: 4},
    {a: 3, b: 4},
  ],
};
