function foo(props) {
  let x = 0;
  while (x > props.min && x < props.max) {
    x *= 2;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
