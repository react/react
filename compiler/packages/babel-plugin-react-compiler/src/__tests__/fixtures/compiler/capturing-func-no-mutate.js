function Component({a, b}) {
  let z = {a};
  let y = {b};
  let x = function () {
    z.a = 2;
    return Math.max(y.b, 0);
  };
  x();
  return z;
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
