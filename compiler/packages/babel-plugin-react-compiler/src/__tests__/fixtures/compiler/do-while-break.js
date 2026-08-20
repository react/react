function Component(props) {
  do {
    break;
  } while (props.cond);
  return props;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
