function Component(props) {
  let x;
  for (let i = props.init; i < 10; i++) {
    if (i === 0) {
      x = 0;
      break;
    } else {
      x = 1;
      break;
    }
  }
  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" variable `i`, whose initial value `props.init` is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {init: 0},
    {init: 0},
    {init: 10},
    {init: 10},
    {init: 0},
    {init: 10},
    {init: 0},
    {init: 10},
  ],
};
