function Component(props) {
  const x = {};
  const y = Boolean(x);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
