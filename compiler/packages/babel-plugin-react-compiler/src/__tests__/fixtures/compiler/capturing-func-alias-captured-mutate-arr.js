import {mutate} from 'shared-runtime';
function Component({foo, bar}) {
  let x = {foo};
  let y = {bar};
  const f0 = function () {
    let a = [y];
    let b = x;
    a.x = b;
  };
  f0();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 2, bar: 3}],
  sequentialRenders: [
    {foo: 2, bar: 3},
    {foo: 2, bar: 3},
    {foo: 2, bar: 4},
    {foo: 3, bar: 4},
  ],
};
