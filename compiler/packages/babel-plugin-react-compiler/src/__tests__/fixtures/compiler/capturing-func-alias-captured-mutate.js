import {mutate} from 'shared-runtime';

function Component({foo, bar}) {
  let x = {foo};
  let y = {bar};
  const f0 = function () {
    let a = [y];
    let b = x;
    // this writes y.x = x
    a[0].x = b;
  };
  f0();
  mutate(y.x);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 3, bar: 4}],
  sequentialRenders: [
    {foo: 3, bar: 4},
    {foo: 3, bar: 5},
  ],
};
