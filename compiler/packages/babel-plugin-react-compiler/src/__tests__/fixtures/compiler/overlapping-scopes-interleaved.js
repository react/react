function foo(a, b) {
  let x = [];
  let y = [];
  x.push(a);
  y.push(b);
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
