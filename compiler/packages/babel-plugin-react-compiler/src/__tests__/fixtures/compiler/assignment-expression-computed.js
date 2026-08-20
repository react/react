function Component(props) {
  const x = [props.x];
  const index = 0;
  x[index] *= 2;
  x['0'] += 3;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 2}],
  isComponent: false,
};
