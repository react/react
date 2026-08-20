function Component(props) {
  debugger;
  if (props.cond) {
    debugger;
  } else {
    while (props.cond) {
      debugger;
    }
  }
  debugger;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
