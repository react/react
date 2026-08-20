function foo(props) {
  const [x, unused, y] = props.a;
  return x + y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
