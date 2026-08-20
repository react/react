function foo(a, b, c) {
  label: if (a) {
    while (b) {
      if (c) {
        break label;
      }
    }
  }
  return c;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
