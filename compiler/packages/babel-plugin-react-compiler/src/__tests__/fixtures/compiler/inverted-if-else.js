function foo(a, b, c) {
  let x = null;
  label: {
    if (a) {
      x = b;
      break label;
    }
    x = c;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
