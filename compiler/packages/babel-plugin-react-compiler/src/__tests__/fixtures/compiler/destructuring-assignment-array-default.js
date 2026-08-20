function Component(props) {
  let x;
  if (props.cond) {
    [[x] = ['default']] = props.y;
  } else {
    x = props.fallback;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
