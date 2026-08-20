function Component(props) {
  const x = {};
  const y = String(x);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
