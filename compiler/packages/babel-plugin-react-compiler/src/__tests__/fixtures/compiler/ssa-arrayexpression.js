function Component(props) {
  const a = 1;
  const b = 2;
  const x = [a, b];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
