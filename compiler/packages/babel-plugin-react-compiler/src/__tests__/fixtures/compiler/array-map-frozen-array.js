function Component(props) {
  const x = [];
  <dif>{x}</dif>;
  const y = x.map(item => item);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  isComponent: false,
};
