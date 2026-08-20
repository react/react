function Foo(props) {
  // can't remove `unused` since it affects which properties are copied into `rest`
  const {unused, ...rest} = props.a;
  return rest;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
