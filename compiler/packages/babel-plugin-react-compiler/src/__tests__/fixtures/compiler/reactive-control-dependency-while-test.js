function Component(props) {
  let x;
  let i = 0;
  while (i < props.test) {
    if (i > 10) {
      x = 10;
    } else {
      x = 1;
    }
    i++;
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose value is affected by
  // `props.test` which is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {test: 12},
    {test: 12},
    {test: 1},
    {test: 1},
    {test: 12},
    {test: 1},
    {test: 12},
    {test: 1},
  ],
};
