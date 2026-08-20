function Component(props) {
  let x;
  for (let i = 0; i < 10; i += props.update) {
    if (i > 0 && i % 2 === 0) {
      x = 2;
    } else {
      x = 1;
    }
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose possible values are
  // affected by `props.update` which is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {update: 2},
    {update: 2},
    {update: 1},
    {update: 1},
    {update: 2},
    {update: 1},
    {update: 2},
    {update: 1},
  ],
};
