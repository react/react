function foo(a, b) {
  let x = [];
  if (a) {
    x = 1;
  }

  let y = x;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
