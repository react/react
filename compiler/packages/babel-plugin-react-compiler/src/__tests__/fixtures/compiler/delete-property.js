function Component(props) {
  const x = {a: props.a, b: props.b};
  delete x.b;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
