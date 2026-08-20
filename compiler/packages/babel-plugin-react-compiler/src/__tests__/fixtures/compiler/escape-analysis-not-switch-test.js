function Component(props) {
  const a = [props.a];
  let x = props.b;
  switch (a) {
    case true: {
      x = props.c;
    }
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
