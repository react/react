function foo(a, b) {
  while (a) {
    break;
  }
  return b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
