function Component(props) {
  const x = [];
  debugger;
  x.push(props.value);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
