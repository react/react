function foo(a, b) {
  let x = 0;
  while (a.b.c) {
    x += b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
