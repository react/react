function Component(props) {
  const {x: {y} = {y: 'default'}} = props.y;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
