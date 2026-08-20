function t(props) {
  let [foo, bar, ,] = props;
  return foo;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
