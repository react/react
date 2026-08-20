function Component(props) {
  // x is mutated conditionally based on a reactive value,
  // so it needs to be considered reactive
  let x = [];
  if (props.cond) {
    x.push(1);
  }
  // Since x is reactive, y is now reactively controlled too:
  let y = false;
  switch (x[0]) {
    case 1: {
      y = true;
      break;
    }
  }
  // Thus this value should be reactive on `y`:
  return [y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
  ],
};
