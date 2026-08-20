function Component(props) {
  const index = 'foo';
  const x = {};
  x[index] = x[index] + x['bar'];
  x[index](props.foo);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
