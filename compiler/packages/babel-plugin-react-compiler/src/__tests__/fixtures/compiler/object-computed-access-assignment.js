function foo(a, b, c) {
  const x = {...a};
  x[b] = c[b];
  x[1 + 2] = c[b * 4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
