function foo(a, b, c) {
  const x = [];
  const y = [];

  if (x) {
  }

  y.push(a);
  x.push(b);
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
