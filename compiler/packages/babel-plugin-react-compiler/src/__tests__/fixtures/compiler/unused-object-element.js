function Foo(props) {
  const {x, y, ...z} = props.a;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
