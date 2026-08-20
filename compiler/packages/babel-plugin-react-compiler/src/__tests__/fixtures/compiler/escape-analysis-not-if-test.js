function Component(props) {
  const x = [props.a];
  let y;
  if (x) {
    y = props.b;
  } else {
    y = props.c;
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
