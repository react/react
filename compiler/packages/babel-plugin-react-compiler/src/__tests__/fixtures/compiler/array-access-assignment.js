function Component({a, b, c}) {
  const x = [a];
  const y = [null, b];
  const z = [[], [], [c]];
  x[0] = y[1];
  z[0][0] = x[0];
  return [x, z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 20, c: 300}],
  sequentialRenders: [
    {a: 2, b: 20, c: 300},
    {a: 3, b: 20, c: 300},
    {a: 3, b: 21, c: 300},
    {a: 3, b: 22, c: 300},
    {a: 3, b: 22, c: 301},
  ],
};
